"""Local dev server for ingest_issue via functions-framework.

Run: functions-framework --target=ingest_issue --source=dev_server.py --port=8787 --debug
"""
import functions_framework
from flask import Request

from ingest_handler import handle_ingest_issue

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


@functions_framework.http
def ingest_issue(request: Request):
    if request.method == 'OPTIONS':
        return '', 204, CORS_HEADERS

    body, status = handle_ingest_issue(request)
    return body, status, CORS_HEADERS
