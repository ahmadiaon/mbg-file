import https from 'https';
import http from 'http';
import httpProxy from 'http-proxy';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi
const HTTPS_PORT = 8443;
const HTTP_PORT = 8088;
const TARGET_PORT = 8081; // Backend NestJS MBG-File

// Load SSL certificate
const options = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};

// Create proxy
const proxy = httpProxy.createProxyServer({
  target: `http://localhost:${TARGET_PORT}`,
  changeOrigin: true,
  ws: true
});

// Error handling
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway - Backend service unavailable');
  }
});

// HTTPS Server (port 8443)
const httpsServer = https.createServer(options, (req, res) => {
  console.log(`[HTTPS ${new Date().toISOString()}] ${req.method} ${req.url}`);
  proxy.web(req, res);
});

httpsServer.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`✅ HTTPS Proxy running on port ${HTTPS_PORT}`);
  console.log(`   https://file.mitrabaritogroup.com:${HTTPS_PORT}`);
  console.log(`   Proxying to backend: http://localhost:${TARGET_PORT}`);
});

// HTTP Server (port 8088) - Redirect to HTTPS
const httpServer = http.createServer((req, res) => {
  const host = req.headers.host || 'file.mitrabaritogroup.com';
  const redirectUrl = `https://${host.split(':')[0]}:${HTTPS_PORT}${req.url}`;
  
  console.log(`[HTTP ${new Date().toISOString()}] Redirecting ${req.url} -> ${redirectUrl}`);
  
  res.writeHead(301, {
    'Location': redirectUrl,
    'Content-Type': 'text/plain'
  });
  res.end(`Redirecting to HTTPS: ${redirectUrl}`);
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP Redirect server running on port ${HTTP_PORT}`);
  console.log(`   http://file.mitrabaritogroup.com:${HTTP_PORT} -> HTTPS`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing servers...');
  httpsServer.close();
  httpServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing servers...');
  httpsServer.close();
  httpServer.close();
  process.exit(0);
});

console.log('🚀 Local HTTPS Proxy started');
console.log(`   Target backend: http://localhost:${TARGET_PORT}`);
