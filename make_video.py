#!/usr/bin/env python3
"""生成「网页 MIUI 化」演示视频：CDP 逐帧截图 + OpenCV 编码 MP4。"""
import base64
import json
import os
import shutil
import subprocess
import time
import urllib.request

import cv2
import websocket

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 9225
FRAMES = 140
FPS = 10
SIZE = (1080, 1440)
TMP = "/tmp/opencode/miui-skin-frames"
PROFILE = "/tmp/opencode/miui-skin-chrome"
FONT_CONF = "/tmp/opencode/fonts/fonts.conf"
OUT = os.path.join(ROOT, "demo.mp4")


def launch():
    shutil.rmtree(PROFILE, ignore_errors=True)
    shutil.rmtree(TMP, ignore_errors=True)
    os.makedirs(TMP, exist_ok=True)
    env = os.environ.copy()
    env["FONTCONFIG_FILE"] = FONT_CONF
    cmd = ["chromium-browser", "--headless", "--no-sandbox", "--disable-gpu",
           "--hide-scrollbars", "--disable-dev-shm-usage",
           "--remote-debugging-port=%d" % PORT, "--user-data-dir=" + PROFILE,
           "--force-device-scale-factor=1", "about:blank"]
    return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)


def page_ws():
    for _ in range(100):
        try:
            data = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=1))
            for t in data:
                if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                    return t["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.15)
    raise RuntimeError("CDP 连接失败")


class CDP:
    def __init__(self, url):
        self.ws = websocket.create_connection(url, suppress_origin=True, timeout=30)
        self.n = 0

    def call(self, method, params=None):
        self.n += 1
        mid = self.n
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result", {})

    def eval(self, expr):
        r = self.call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
        return r.get("result", {}).get("value")


def main():
    proc = launch()
    try:
        cdp = CDP(page_ws())
        cdp.call("Page.enable")
        cdp.call("Emulation.setDeviceMetricsOverride", {
            "width": 1080, "height": 1440, "deviceScaleFactor": 1, "mobile": False
        })
        cdp.call("Page.navigate", {"url": "file://" + os.path.join(ROOT, "demo.html")})
        for _ in range(100):
            if cdp.eval("document.readyState === 'complete' && typeof window.setFrame === 'function'"):
                break
            time.sleep(0.1)
        cdp.eval("document.fonts.ready.then(function(){return true})")
        time.sleep(0.4)
        for i in range(FRAMES):
            cdp.eval("window.setFrame(%d)" % i)
            r = cdp.call("Page.captureScreenshot", {
                "format": "png", "fromSurface": True, "captureBeyondViewport": False
            })
            with open(os.path.join(TMP, "f%04d.png" % i), "wb") as f:
                f.write(base64.b64decode(r["data"]))
        cdp.call("Page.close")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

    writer = cv2.VideoWriter(OUT, cv2.VideoWriter_fourcc(*"mp4v"), FPS, SIZE)
    if not writer.isOpened():
        raise RuntimeError("MP4 编码器不可用")
    for i in range(FRAMES):
        img = cv2.imread(os.path.join(TMP, "f%04d.png" % i), cv2.IMREAD_UNCHANGED)
        if img is None:
            continue
        if img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        if (img.shape[1], img.shape[0]) != SIZE:
            img = cv2.resize(img, SIZE)
        writer.write(img)
    writer.release()
    shutil.rmtree(TMP, ignore_errors=True)
    print("video:", OUT)
    print("bytes:", os.path.getsize(OUT))
    print("duration: %.1fs" % (FRAMES / FPS))


if __name__ == "__main__":
    main()
