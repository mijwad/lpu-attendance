import fs from 'fs';
import path from 'path';

// Use a temp directory or in-memory store (Vercel serverless doesn't have persistent local storage)
// For production, use a database instead
const LOG_DIR = '/tmp';
const LOG_FILE = path.join(LOG_DIR, 'logins.ndjson');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { regNo, timestamp, origin } = req.body || {};
    if (!regNo) {
      return res.status(400).json({ error: 'regNo required' });
    }

    const entry = {
      regNo: String(regNo),
      timestamp: timestamp || new Date().toISOString(),
      origin: origin || req.headers['x-forwarded-for'] || 'unknown',
    };

    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
      return res.json({ ok: true });
    } catch (err) {
      console.error('Failed to write log:', err);
      return res.status(500).json({ error: 'failed to write log' });
    }
  }

  if (req.method === 'GET') {
    try {
      const data = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
      res.setHeader('Content-Type', 'text/plain');
      return res.send(data);
    } catch (err) {
      console.error('Failed to read log:', err);
      return res.status(500).json({ error: 'failed to read log' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
