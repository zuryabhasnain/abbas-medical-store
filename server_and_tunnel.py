#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import time
import threading
import re
import subprocess
import urllib.request

PORT = 3456
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
URL_FILE = os.path.join(BASE_DIR, "LIVE_URL.txt")

class PharmacyHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.json') or path.endswith('.webmanifest'):
            return 'application/json'
        return super().guess_type(path)

    def log_message(self, format, *args):
        sys.stderr.write(f"[HTTP {time.strftime('%H:%M:%S')}] {args[0]} - {args[1]}\n")

def start_http_server():
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.ThreadingTCPServer(('0.0.0.0', PORT), PharmacyHTTPHandler)
    print(f"[Server] Built-in Pharmacy HTTP Server running on 0.0.0.0:{PORT}", flush=True)
    server.serve_forever()

def keep_alive_worker(url, stop_event):
    print(f"[KeepAlive] Health check pinger started for {url}", flush=True)
    while not stop_event.is_set():
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (AbbasMedicalStore-KeepAlive/1.0)"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                _ = resp.read(512)
        except Exception:
            pass
        for _ in range(15):
            if stop_event.is_set():
                break
            time.sleep(1)

def run_tunnel():
    ssh_cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "ServerAliveInterval=15",
        "-o", "ServerAliveCountMax=999",
        "-R", "80:127.0.0.1:3456",
        "nokey@localhost.run"
    ]

    while True:
        print("[Tunnel] Connecting to localhost.run relay...", flush=True)
        proc = subprocess.Popen(
            ssh_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        tunnel_url = None
        stop_event = threading.Event()
        keepalive_thread = None

        try:
            for line in iter(proc.stdout.readline, ''):
                sys.stdout.write(line)
                sys.stdout.flush()

                match = re.search(r'https://[a-zA-Z0-9\-]+\.lhr\.life', line)
                if match and not tunnel_url:
                    tunnel_url = match.group(0)
                    print(f"\n{'='*70}", flush=True)
                    print(f"🎉 ABBAS MEDICAL STORE LIVE PUBLIC LINK IS READY:", flush=True)
                    print(f"👉 {tunnel_url}", flush=True)
                    print(f"{'='*70}\n", flush=True)
                    with open(URL_FILE, "w") as f:
                        f.write(tunnel_url + "\n")

                    keepalive_thread = threading.Thread(
                        target=keep_alive_worker,
                        args=(tunnel_url, stop_event),
                        daemon=True
                    )
                    keepalive_thread.start()

            proc.wait()
            print(f"[Tunnel] Disconnected with code {proc.returncode}", flush=True)
        except Exception as e:
            print(f"[Tunnel] Exception: {e}", flush=True)
        finally:
            stop_event.set()
            if keepalive_thread and keepalive_thread.is_alive():
                keepalive_thread.join(timeout=2)
            if proc.poll() is None:
                proc.terminate()

        print("[Tunnel] Auto-reconnecting in 3 seconds...", flush=True)
        time.sleep(3)

if __name__ == "__main__":
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()
    time.sleep(1)
    run_tunnel()
