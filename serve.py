"""Serve this folder on http://localhost:8765 with caching disabled,
so edits to the JS/CSS show up on a normal reload.

    python serve.py [port]
"""
import functools
import http.server
import pathlib
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    root = pathlib.Path(__file__).resolve().parent
    handler = functools.partial(NoCacheHandler, directory=str(root))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving {root} at http://localhost:{port}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
