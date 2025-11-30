# Deployment Guide — Vercel

This guide walks you through deploying the LPU Attendance app to Vercel.

## Prerequisites

- A GitHub account (or GitLab/Bitbucket)
- A Vercel account (free tier available at https://vercel.com)
- Your project pushed to a Git repository

## Step 1: Push to GitHub

```powershell
# In your project directory
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lpu-attendance.git
git push -u origin main
```

## Step 2: Create a Vercel Account & Import Project

1. Go to https://vercel.com and sign up (free tier).
2. Click **"New Project"**.
3. Select **GitHub** (or GitLab/Bitbucket).
4. Authorize Vercel to access your repositories.
5. Find and select `lpu-attendance`.
6. Click **"Import"**.

## Step 3: Configure Environment Variables

In the Vercel dashboard for your project:

1. Go to **Settings** > **Environment Variables**.
2. Add the following variables:
   - `ADMIN_USER` = `admin` (or your preferred username)
   - `ADMIN_PASS` = `admin` (or your preferred password) — **change this to something secure!**
   - `VITE_SERVER_URL` = Leave blank (defaults to your Vercel domain)

3. Click **"Save"**.

## Step 4: Deploy

- Click **"Deploy"** button.
- Vercel will build and deploy your app automatically.
- You'll get a URL like `https://lpu-attendance-abc123.vercel.app`.

## Step 5: Access Your App

- **Frontend**: https://lpu-attendance-abc123.vercel.app
- **Admin Logs**: https://lpu-attendance-abc123.vercel.app/api/admin
  - Log in with the username and password you set in Step 3.

## Testing the Flow

1. Open the app in your browser.
2. Enter a reg ID and password.
3. Check "Share reg ID with server".
4. Click **Login**.
5. Open `/api/admin` in a new tab and log in with your admin credentials.
6. You should see your reg ID in the logs.

## Limitations on Vercel (Free Tier)

- **Temporary Storage**: Logs are stored in `/tmp`, which is wiped when the serverless function is idle. This means:
  - Logs persist during active use (within the same deployment).
  - After a few minutes of inactivity, logs are cleared.
  - **Solution**: For production, use a database (PostgreSQL, MongoDB, etc.) instead of file storage.

## Recommended: Add a Database

For persistent log storage, add a database:

### Option A: PostgreSQL on Render or Railway
1. Create a free PostgreSQL database on Render or Railway.
2. Update `api/log-login.js` and `api/admin.js` to use the database instead of files.

### Option B: MongoDB Atlas (Free)
1. Create a free MongoDB cluster at https://www.mongodb.com/cloud/atlas.
2. Use a MongoDB driver to store and retrieve logs.

### Option C: Supabase (PostgreSQL + Auth)
1. Create a free Supabase project at https://supabase.com.
2. Set up a `logins` table and use the Supabase client to log entries.

## Automatic Deployments

Every time you push to GitHub:
```powershell
git add .
git commit -m "Your message"
git push origin main
```

Vercel automatically detects the push and redeploys your app.

## Troubleshooting

### Logs not persisting after inactivity
- This is normal on Vercel's free tier. Use a database for persistent storage.

### Admin login not working
- Check that `ADMIN_USER` and `ADMIN_PASS` environment variables are set in Vercel dashboard.
- Restart the deployment if you just added them.

### Frontend can't reach the API
- Check CORS headers in `api/log-login.js` (already configured to allow all origins).
- Verify the app is sending requests to the correct domain (should be relative URLs like `/api/log-login`).

### VITE_SERVER_URL not working
- For Vercel deployments, leave `VITE_SERVER_URL` blank and use relative URLs (`/api/...`).
- For local dev, set it to `http://127.0.0.1:3001` or your server URL.

## Security Notes

1. **Change Admin Credentials**: The defaults are `admin`/`admin`. Change these in Vercel environment variables.
2. **Use HTTPS**: Vercel provides free HTTPS. All traffic is encrypted.
3. **Don't Send Passwords**: The app only sends `regNo`, not passwords. Keep it that way.
4. **Use a Database**: File-based logging is temporary on Vercel. Move to a database for production.

## Next Steps

- Upgrade to a paid Vercel plan for persistent storage and better performance.
- Add a database for production-grade log persistence.
- Set up custom domain (in Vercel dashboard > Domains).
- Add authentication to the admin panel (optional, currently uses basic auth).

---

**Need help?** Check the Vercel docs: https://vercel.com/docs
