#!/usr/bin/env python3
"""带 no-cache 头的静态文件服务器，防止浏览器缓存 ES 模块（复用占地之王方案）"""
import http.server
import socketserver
import os
import sys

PORT = 8892
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        path_only = self.path.split('?', 1)[0]
        if path_only in ('/', ''):
            self.send_response(302)
            self.send_header('Location', '/preview/index.html')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        return super().do_GET()

    def log_message(self, format, *args):
        sys.stdout.write(f"  {self.address_string()} - {format % args}\n")
        sys.stdout.flush()


if __name__ == '__main__':
    os.chdir(DIRECTORY)
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        print(f"[Server] http://localhost:{PORT}/preview/index.html")
        print(f"[Server] Serving from: {DIRECTORY}")
        print(f"[Server] Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[Server] Stopped.")
