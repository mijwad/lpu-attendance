# Login Logger (local)

This is a minimal Express server that accepts consented registration IDs from the frontend and saves them to `logins.ndjson`.

Setup

1. Open a terminal in this folder:

```powershell
cd "C:\Users\Mijwad\Desktop\lpu-attendance\server"
npm install
```

2. Start the server:

```powershell
npm start
```

The server listens on `http://localhost:3000` by default.

Endpoints

- `POST /api/log-login`  Accepts JSON { regNo, timestamp, origin } and appends a line to `logins.ndjson`.
- `GET /api/logs`  Returns the contents of `logins.ndjson` (plaintext).

Security & Privacy

- This stores plain regNo values. Do NOT store passwords here.
- Only use this with explicit user consent. Keep retention policies and secure the server if you expose it beyond localhost.

Admin UI
--------

A simple admin UI is available at `http://localhost:3000/admin` and lists recent (consented) reg ID logins. The admin page is protected with HTTP Basic Auth.

Credentials
- By default: username `admin` and password `admin`.
- To change, set environment variables before starting the server in PowerShell:

```powershell
$env:ADMIN_USER = 'youruser'; $env:ADMIN_PASS = 'yourpass'; npm start
```

Notes
- This admin page is intentionally minimal for local use only. Do not expose this server to the public internet without adding HTTPS and stronger authentication.
- The server stores logs in `logins.ndjson` in the same folder.
