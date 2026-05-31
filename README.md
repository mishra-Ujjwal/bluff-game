# Bluff Royale

Production-ready real-time multiplayer Bluff Card Game built with React, Vite, Node.js, Express, Socket.io, Prisma, and PostgreSQL.

## Run locally

### Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Root shortcut

```bash
npm run dev
```

## Deploy on Render

This repo is now Render-ready with [render.yaml](/Users/ujjwalmishra/Documents/bluff/render.yaml:1).

### Architecture

- `backend` -> Render Web Service
- `frontend` -> Render Static Site
- `DATABASE_URL` -> Neon PostgreSQL

### 1. Push the repo to GitHub

Render deploys from a GitHub repo, so first push this project to GitHub.

### 2. Create the backend service on Render

Use a **Web Service** with these settings:

- Root Directory: `backend`
- Build Command: `npm install && npm run prisma:generate`
- Pre-Deploy Command: `npm run prisma:migrate:deploy`
- Start Command: `npm start`

Environment variables:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_long_random_secret
CLIENT_URL=https://your-frontend-site.onrender.com
```

Important:

- Use your Neon connection string for `DATABASE_URL`
- Keep `sslmode=require` in the Neon URL
- `CLIENT_URL` must be the exact frontend Render URL

### 3. Create the frontend service on Render

Use a **Static Site** with these settings:

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

Environment variables:

```env
VITE_API_URL=https://your-backend-service.onrender.com/api
VITE_SOCKET_URL=https://your-backend-service.onrender.com
VITE_APP_NAME=Bluff Royale
```

### 4. Add SPA rewrite

For the frontend static site, add a rewrite rule:

- Source: `/*`
- Destination: `/index.html`

This is already included in `render.yaml`.

### 5. Deploy order

Because frontend and backend need each other's URLs, the easiest order is:

1. Create backend service
2. Create frontend static site
3. Copy frontend URL into backend `CLIENT_URL`
4. Copy backend URL into frontend `VITE_API_URL` and `VITE_SOCKET_URL`
5. Redeploy both services

### 6. After deploy, test these routes

- Backend health:
  `https://your-backend-service.onrender.com/api/health`
- Frontend:
  `https://your-frontend-site.onrender.com`

### 7. If Prisma migration fails

Make sure your Neon database is reachable and that `DATABASE_URL` is correct. Render runs:

```bash
npm run prisma:migrate:deploy
```

before starting the backend.

## Features

- JWT authentication with protected routes
- Create and join rooms with unique room codes
- Real-time lobby, gameplay, and chat over Socket.io
- Server-authoritative bluff logic and turn validation
- Reconnect support using token-backed socket sessions
- Match history and player statistics
