const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const LOG_FILE = path.join(__dirname, 'logins.ndjson');

// Basic auth middleware for admin routes. Credentials via env vars or defaults.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

function basicAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }
  const match = auth.match(/^Basic (.+)$/);
  if (!match) return res.status(400).send('Bad authorization format');
  const creds = Buffer.from(match[1], 'base64').toString('utf8');
  const [user, pass] = creds.split(':');
  if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(403).send('Forbidden');
}

app.post('/api/log-login', (req, res) => {
  try {
    const { regNo, timestamp, origin } = req.body || {};
    if (!regNo) return res.status(400).json({ error: 'regNo required' });

    const entry = {
      regNo: String(regNo),
      timestamp: timestamp || new Date().toISOString(),
      origin: origin || req.ip,
    };

    fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', (err) => {
      if (err) {
        console.error('Failed to write log:', err);
        return res.status(500).json({ error: 'failed to write log' });
      }
      res.json({ ok: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/logs', (req, res) => {
  // Return the raw log file (be careful with size in production)
  fs.readFile(LOG_FILE, 'utf8', (err, data) => {
    if (err) return res.status(200).send('');
    res.type('text/plain').send(data);
  });
});

// Admin UI: shows recent logins in a simple HTML table (protected)
app.get('/admin', basicAuth, (req, res) => {
  fs.readFile(LOG_FILE, 'utf8', (err, data) => {
    const entries = [];
    if (!err && data) {
      const lines = data.split('\n').filter(Boolean);
      for (const line of lines) {
        try { entries.push(JSON.parse(line)); } catch (e) { /* ignore parse errors */ }
      }
    }

    // reverse for latest-first
    entries.reverse();

    const rows = entries.map(e => `\n<tr><td>${escapeHtml(e.regNo)}</td><td>${escapeHtml(e.timestamp)}</td><td>${escapeHtml(e.origin || '')}</td></tr>`).join('');
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Login Logs</title>
<style>body{font-family:Segoe UI,Arial;padding:20px;background:#0f172a;color:#e6eef8}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)}th{background:linear-gradient(90deg,#2563eb,#1e40af);color:#fff;text-align:left}</style>
</head><body>
<h1>Recent Logins</h1>
<p>Showing ${entries.length} entries (latest first)</p>
<table><thead><tr><th>RegNo</th><th>Timestamp</th><th>Origin</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
    res.type('html').send(html);
  });
});

// helper to escape HTML
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const START_PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT = START_PORT + 10;

function checkPortFree(port){
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', function(err){
        tester.close();
        resolve(false);
      })
      .once('listening', function(){
        tester.close();
        resolve(true);
      })
      .listen(port, '127.0.0.1');
  });
}

async function startServer(){
  let portToUse = null;
  for(let p = START_PORT; p <= MAX_PORT; p++){
    // eslint-disable-next-line no-await-in-loop
    const free = await checkPortFree(p);
    if(free){ portToUse = p; break; }
  }
  if(!portToUse){
    console.error(`No free port found in range ${START_PORT}-${MAX_PORT}`);
    process.exit(1);
  }

  const server = app.listen(portToUse, '127.0.0.1', () => {
    console.log(`Login logger running on http://127.0.0.1:${portToUse} (bound on ${portToUse})`);
    try { console.log('server.address():', server.address()); } catch(e){}
    console.log('process.pid =', process.pid);
  });

  server.on('close', () => console.log('server closed'));
  server.on('error', (err) => console.error('server error', err));
}

startServer();
