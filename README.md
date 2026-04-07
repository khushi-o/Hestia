# Hestia

Hestia is a freelancer-focused workspace for managing **projects**, **clients**, **invoices**, **per-project messages**, **files**, and **notifications**. The app is a split **React (Vite)** frontend and **Node.js (Express)** API with **MongoDB** and **Socket.io** for live project chat.

## Features

- **Auth** — Register, login, JWT-protected API and socket handshake.
- **Dashboard** — Overview of activity and quick stats.
- **Projects & clients** — Organize work and contacts.
- **Invoices** — Create and track invoices (including PDF export on the client where supported).
- **Messages** — Per-**project** threads (not DMs). New messages persist via REST; the server broadcasts **`receive_message`** after save. Users can **delete their own** messages; **`message_deleted`** syncs other tabs.
- **Files** — Uploads tied to projects; downloads go through **authenticated** routes (not a public `/uploads` static folder).
- **Notifications** — In-app notification list.
- **Search** — Global search (⌘/Ctrl+K from the sidebar).
- **Themes** — Accent and light/dark-style modes (stored in client state).

## Repository layout

```
client/          # Vite + React 19, Zustand, React Router, Socket.io client, Lucide icons
server/          # Express 5, Mongoose, Socket.io, Multer, JWT, rate limits on auth
docs/            # Extra architecture notes (optional)
```

## Prerequisites

- **Node.js** 20+ recommended  
- **MongoDB** (local URI or Atlas)  
- **npm** (or pnpm/yarn if you adapt the commands)

## Environment variables

### Server (`server/.env`)

Copy from `server/.env.example`:

| Variable | Purpose |
| -------- | ------- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (use a long random value in production) |
| `PORT` | HTTP port (default `5000`) |
| `CLIENT_ORIGIN` | Comma-separated origins for CORS + Socket.io (no spaces) |
| `DNS_SERVERS` | Optional; helps some Windows setups with `mongodb+srv` resolution |

### Client (`client/.env.local` or `client/.env`)

Copy from `client/.env.example`:

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_URL` | API base URL including `/api`, e.g. `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Optional; Socket.io server origin if it differs from the API host |

> Vite inlines `VITE_*` at **build** time. Set production values in your host (e.g. Vercel) before building the client.

## Local development

**Terminal 1 — API**

```bash
cd server
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
npm install
npm run dev
```

**Terminal 2 — Client**

```bash
cd client
cp .env.example .env.local
# Point VITE_API_URL at your API
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Production deploy (typical)

1. Deploy **server** to a Node host (e.g. Railway, Render, Fly). Set env vars there; ensure `CLIENT_ORIGIN` includes your frontend URL(s).
2. Deploy **client** as a static site (e.g. Vercel, Netlify). Set `VITE_API_URL` to your deployed API + `/api`, and `VITE_SOCKET_URL` if needed.
3. Redeploy both when changing env or API/socket behaviour.

## API overview

- REST routes live under `/api/*` (see `server/server.js`).
- Project-scoped resources use middleware that checks **project ownership** where applicable (see `server/middleware/projectAccess.middleware.js`).
- Socket.io: after connecting with `{ auth: { token } }`, clients **`join_project`** with a project id they own. Realtime events include **`receive_message`** and **`message_deleted`**.

## Security notes (high level)

Recent work includes stricter **project access** on messages and files, **JWT on sockets**, **rate limiting** on auth routes, and **no public** serving of upload directories. For a fuller hardening pass, track separately: systematic request validation, password reset with expiring tokens, structured logging and alerting, global API rate limits, and error monitoring (e.g. Sentry).

## License

Specify your license in this repository (e.g. MIT) if you open-source the project.
