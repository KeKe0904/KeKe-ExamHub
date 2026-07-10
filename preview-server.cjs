// 简易预览服务器：提供前端静态文件 + 代理 /api 到后端 3000
const http = require("http");
const fs = require("fs");
const path = require("path");
const httpProxy = require("http-proxy");

const DIST_DIR = "/workspace/dist";
const API_TARGET = "http://127.0.0.1:3000";
const PORT = 8000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const proxy = httpProxy.createProxyServer({ target: API_TARGET, changeOrigin: true });

proxy.on("error", (err, req, res) => {
  console.error("[proxy error]", err.message);
  if (res.writeHead) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "后端服务不可用", code: "BAD_GATEWAY" }));
  }
});

const server = http.createServer((req, res) => {
  // API 请求代理到后端
  if (req.url.startsWith("/api/")) {
    proxy.web(req, res);
    return;
  }

  // 静态文件服务 + SPA fallback
  let filePath = path.join(DIST_DIR, decodeURIComponent(req.url.split("?")[0]));
  if (req.url === "/" || req.url === "") filePath = path.join(DIST_DIR, "index.html");

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA 回退到 index.html
      filePath = path.join(DIST_DIR, "index.html");
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Preview server running at http://0.0.0.0:${PORT}`);
  console.log(`Frontend: /workspace/dist`);
  console.log(`API proxy: ${API_TARGET}`);
});
