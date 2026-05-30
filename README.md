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

## Features

- JWT authentication with protected routes
- Create and join rooms with unique room codes
- Real-time lobby, gameplay, and chat over Socket.io
- Server-authoritative bluff logic and turn validation
- Reconnect support using token-backed socket sessions
- Match history and player statistics
