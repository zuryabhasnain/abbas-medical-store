#!/usr/bin/env python3
import re
import subprocess
import sys
import time
import threading
import urllib.request

URL_FILE = "LIVE_URL.txt"

def keep_alive_worker(url, stop_event):
    print(f"[KeepAlive] Started pinger for {url}", flush=True)
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
        for _ in range(20):
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
        print("[Tunnel] Spawning localhost.run SSH tunnel...", flush=True)
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
                    print(f"\n=======================================================", flush=True)
                    print(f"🎉 LIVE URL IS READY: {tunnel_url}", flush=True)
                    print(f"=======================================================\n", flush=True)
                    with open(URL_FILE, "w") as f:
                        f.write(tunnel_url + "\n")

                    keepalive_thread = threading.Thread(
                        target=keep_alive_worker,
                        args=(tunnel_url, stop_event),
                        daemon=True
                    )
                    keepalive_thread.start()

            proc.wait()
            print(f"[Tunnel] SSH tunnel exited with code {proc.returncode}", flush=True)
        except Exception as e:
            print(f"[Tunnel] Exception in tunnel manager: {e}", flush=True)
        finally:
            stop_event.set()
            if keepalive_thread and keepalive_thread.is_alive():
                keepalive_thread.join(timeout=2)
            if proc.poll() is None:
                proc.terminate()

        print("[Tunnel] Restarting tunnel in 3 seconds...", flush=True)
        time.sleep(3)

if __name__ == "__main__":
    run_tunnel()
