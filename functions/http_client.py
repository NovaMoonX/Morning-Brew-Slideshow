"""Outbound HTTP helpers for Cloud Functions."""
import requests

# trust_env=False skips macOS system proxy lookup (_scproxy), which can crash
# when fork() runs while gRPC/Firebase threads are active (local emulator on macOS).
_session = requests.Session()
_session.trust_env = False

DEFAULT_HEADERS = {'User-Agent': 'Mozilla/5.0'}


def get(url: str, *, headers: dict | None = None, timeout: int = 15) -> requests.Response:
    return _session.get(url, headers=headers or DEFAULT_HEADERS, timeout=timeout)


def head(
    url: str,
    *,
    headers: dict | None = None,
    timeout: int = 5,
    allow_redirects: bool = True,
) -> requests.Response:
    return _session.head(
        url,
        headers=headers or DEFAULT_HEADERS,
        timeout=timeout,
        allow_redirects=allow_redirects,
    )
