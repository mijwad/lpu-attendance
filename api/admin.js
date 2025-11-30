import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp';
const LOG_FILE = path.join(LOG_DIR, 'logins.ndjson');

// Basic Auth middleware
function basicAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth) return false;
  const match = auth.match(/^Basic (.+)$/);
  if (!match) return false;
  const creds = Buffer.from(match[1], 'base64').toString('utf8');
  const [user, pass] = creds.split(':');
  // Hardcoded defaults; use env vars for production
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    if (!basicAuth(req)) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
      return res.status(401).send('Authentication required');
    }

    try {
      const data = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
      const entries = [];
      if (data) {
        const lines = data.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            entries.push(JSON.parse(line));
          } catch (e) {
            // ignore parse errors
          }
        }
      }

      entries.reverse(); // latest first

      const rows = entries
        .map(e => `\n<tr><td>${escapeHtml(e.regNo)}</td><td>${escapeHtml(e.timestamp)}</td><td>${escapeHtml(e.origin || '')}</td></tr>`)
        .join('');

      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Login Logs</title>
<style>body{font-family:Segoe UI,Arial;padding:20px;background:#0f172a;color:#e6eef8}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)}th{background:linear-gradient(90deg,#2563eb,#1e40af);color:#fff;text-align:left}</style>
</head><body>
<h1>Recent Logins</h1>
<p>Showing ${entries.length} entries (latest first)</p>
<table><thead><tr><th>RegNo</th><th>Timestamp</th><th>Origin</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (err) {
      console.error('Failed to read log:', err);
      return res.status(500).send('Error reading logs');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
