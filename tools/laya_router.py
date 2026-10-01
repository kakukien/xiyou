# -*- coding: utf-8 -*-
"""laya_router · gpt6.mjs 的本地前置路由 sidecar

常驻 127.0.0.1:8123，加载一次 multilingual 检查点（~22s），之后每次分类 ~0.4s。
POST /route  {"text": "..."}  ->  {"lane":"local|mid|heavy","prob":f,"conf":f,"ms":int}
GET  /health -> {"ok":true,"model":"multilingual"}

启动： layavenv/Scripts/python.exe laya_router.py
权重首次下载需 HF_ENDPOINT=https://hf-mirror.com（国内）。
"""
import io
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8123
STATE_MAX_CHARS = 1500  # 只看头部就够判断量级；长文省时间

QUESTIONS = {
    "lane": {
        "type": "choice",
        "instructions": "这个请求该由哪一档模型处理？只按任务量级分，不看礼貌程度。",
        "criteria": {
            "local": "闲聊、翻译、摘要、问答、格式转换等短文本任务，不需要写代码",
            "mid": "小段代码补全、修一个报错、解释一段代码、几十行以内的片段",
            "heavy": "生成完整文件或模块、多文件架构、按详细规格写实现、需要长输出的任务",
        },
    }
}

print("[laya_router] loading multilingual checkpoint...", file=sys.stderr, flush=True)
_t0 = time.time()
from laya import Router  # noqa: E402

router = Router()
router.predict("warmup", QUESTIONS, model="multilingual")
print("[laya_router] ready in %.1fs, listening on 127.0.0.1:%d" % (time.time() - _t0, PORT),
      file=sys.stderr, flush=True)


class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):  # 静默 access log
        pass

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"ok": True, "model": "multilingual"})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/route":
            self._send(404, {"error": "not found"})
            return
        try:
            n = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(n) or b"{}")
            text = str(payload.get("text") or "")[:STATE_MAX_CHARS]
            t = time.time()
            r = router.predict(text, QUESTIONS, model="multilingual")
            a = r["answers"]["lane"]
            self._send(200, {
                "lane": a["choice"],
                "prob": a.get("answer_confidence") or a.get("probabilities", {}).get(a["choice"]),
                "conf": a.get("confidence"),
                "ms": int((time.time() - t) * 1000),
            })
        except Exception as exc:
            self._send(500, {"error": "%s: %s" % (type(exc).__name__, exc)})


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", PORT), H).serve_forever()
