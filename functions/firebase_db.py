from firebase_admin import initialize_app, firestore

initialize_app()

_db_client = None


def get_db():
    global _db_client
    if _db_client is None:
        _db_client = firestore.client()
    return _db_client
