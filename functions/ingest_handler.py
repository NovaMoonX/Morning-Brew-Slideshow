from datetime import datetime

import http_client
from firebase_db import PROJECT_ID, get_db
from parser import MorningBrewParser
from slide_builder import SlideBuilder

ARCHIVE_BASE_URL = "https://www.morningbrew.com"
LATEST_ISSUE_URL = f"{ARCHIVE_BASE_URL}/issues/latest"
FIRESTORE_TIMEOUT_SEC = 30


def _log(message: str) -> None:
    print(f"[ingest] {message}", flush=True)


def handle_ingest_issue(req) -> tuple[str, int]:
    """Download the latest Morning Brew newsletter and compile slides."""
    date_param = req.args.get('date')  # YYYY-MM-DD
    force_write = req.args.get('force') == 'true'

    target_date = date_param
    url = LATEST_ISSUE_URL
    if date_param:
        url = f"{ARCHIVE_BASE_URL}/issues/{date_param}"

    try:
        _log(f"Firestore project: {PROJECT_ID}")
        _log(f"Fetching newsletter from {url}")
        response = http_client.get(url, timeout=15)
        if response.status_code != 200:
            return (
                f"Failed to fetch Morning Brew newsletter from {url}. Status: {response.status_code}",
                500,
            )

        _log("Parsing issue HTML")
        parser = MorningBrewParser()
        issue = parser.parse_issue(response.text, target_date)
        actual_date = issue.id  # YYYY-MM-DD
        _log(f"Parsed issue {actual_date}: {issue.title!r}")

        if not force_write:
            _log(f"Checking Firestore for existing issue {actual_date}")
            doc_ref = get_db().collection('issues').document(actual_date)
            try:
                exists = doc_ref.get(timeout=FIRESTORE_TIMEOUT_SEC).exists
            except Exception as firestore_err:
                _log(f"Firestore read failed: {firestore_err}")
                return (
                    "Ingest failed: could not reach Firestore. "
                    "Run `gcloud auth application-default login` and retry.",
                    500,
                )
            if exists:
                return f"Issue {actual_date} already exists. Skipping.", 200

        _log("Building slides")
        builder = SlideBuilder()
        issue.slides = builder.build_slides(issue)

        _log(f"Writing issue {actual_date} to Firestore ({len(issue.slides)} slides)")
        try:
            get_db().collection('issues').document(actual_date).set(
                issue.to_dict(), timeout=FIRESTORE_TIMEOUT_SEC
            )
            get_db().collection('issue_index').document(actual_date).set({
                'id': actual_date,
                'date': issue.date,
                'title': issue.title,
                'primary_image_url': issue.primary_image_url,
                'status': 'ready',
                'fetched_at': datetime.utcnow().isoformat()
            }, timeout=FIRESTORE_TIMEOUT_SEC)
        except Exception as firestore_err:
            _log(f"Firestore write failed: {firestore_err}")
            return (
                "Ingest failed: could not write to Firestore. "
                "Run `gcloud auth application-default login` and retry.",
                500,
            )

        _log(f"Done — ingested {actual_date}")
        return (
            f"Successfully ingested issue {actual_date}. Total slides: {len(issue.slides)}",
            200,
        )
    except Exception as e:
        _log(f"Failed: {e}")
        return f"Ingest failed: {str(e)}", 500
