import json
import os
from pathlib import Path

from firebase_admin import firestore, initialize_app

_db_client = None


def resolve_project_id() -> str:
    """Use explicit project ID so local ADC does not write to the wrong GCP project."""
    env_project = os.environ.get('GCLOUD_PROJECT') or os.environ.get('GOOGLE_CLOUD_PROJECT')
    if env_project:
        return env_project

    firebaserc = Path(__file__).resolve().parent.parent / '.firebaserc'
    if firebaserc.is_file():
        data = json.loads(firebaserc.read_text(encoding='utf-8'))
        project = data.get('projects', {}).get('default')
        if project:
            return project

    raise RuntimeError(
        'Could not determine Firebase project ID. Set GCLOUD_PROJECT or add projects.default to .firebaserc.'
    )


PROJECT_ID = resolve_project_id()
initialize_app(options={'projectId': PROJECT_ID})


def get_db():
    global _db_client
    if _db_client is None:
        _db_client = firestore.client()
    return _db_client
