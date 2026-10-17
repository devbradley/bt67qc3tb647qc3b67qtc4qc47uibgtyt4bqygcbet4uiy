"""Local-only development server for ucord with security response headers."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import os


ROOT = Path(__file__).resolve().parent
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; "
    "frame-ancestors 'none'; frame-src 'none'; script-src 'self'; "
    "style-src 'self' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; "
    "media-src 'self' blob:; connect-src 'self' https://ucord-5cc47-default-rtdb.firebaseio.com stun:; "
    "upgrade-insecure-requests"
)


class UcordHandler(SimpleHTTPRequestHandler):
    server_version = "ucord"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        # Avoid logging invite query parameters and user supplied paths.
        return

    def _allowed_path(self):
        requested = unquote(urlsplit(self.path).path)
        if "\x00" in requested or "\\" in requested:
            return False
        relative = Path(requested.lstrip("/"))
        if any(part.startswith(".") for part in relative.parts):
            return False
        resolved = (ROOT / relative).resolve()
        try:
            resolved.relative_to(ROOT)
        except ValueError:
            return False
        if resolved == ROOT or resolved == ROOT / "index.html":
            return True
        if resolved.parent == ROOT / "src" and resolved.suffix in {".js", ".css"}:
            return True
        return False

    def do_GET(self):
        if not self._allowed_path():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if not self._allowed_path():
            self.send_error(404)
            return
        super().do_HEAD()

    def end_headers(self):
        self.send_header("Content-Security-Policy", CONTENT_SECURITY_POLICY)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "microphone=(self), camera=(), geolocation=(), payment=(), usb=()")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    address = ("127.0.0.1", int(os.environ.get("UCORD_PORT", "4173")))
    print(f"ucord development server: http://{address[0]}:{address[1]}")
    ThreadingHTTPServer(address, UcordHandler).serve_forever()
