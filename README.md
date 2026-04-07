# Hestia

Hestia is a freelancer-focused workspace for **projects**, **CRM contacts**, **invoices**, **per-project messaging**, **files**, and **notifications**. It includes a **client portal**: people with the `client` role sign in and only see **projects they are invited to**, **invoices sent to their email**, and can **reply in the same message threads** as the agency.

Stack: **React (Vite)** + **Node (Express)** + **MongoDB** + **Socket.io**.

## Feature list

| Area | Freelancer / agency (`agency`) | Client portal (`client`) |
| ---- | ------------------------------- | ------------------------- |
| Dashboard | Stats, charts, quick actions | Focused stats, shortcuts to messages & files |
| Projects | Create, edit, delete; **invite clients by their login email** | View shared projects only (read-only) |
| Clients | CRM list (contacts) | _Hidden_ |
| Invoices | Full CRUD, PDF | **View & download** invoices addressed to their email |
| Messages | All owned projects + invited projects | Threads for **invited projects** only |
| Files | Upload, download, **delete** | Upload & download; **no delete** (owner-only) |
| Search (⌘K) | Projects, CRM contacts, invoices | Projects & invoices visible to them |

**Realtime:** Messages are saved with `POST /api/messages/:projectId`, then broadcast as `receive_message`. **`join_project`** allows access if the user **owns** the project **or** is listed in `project.clients`.

## Screenshots (add your own)

Place images under `docs/screenshots/` (not committed if you prefer) and link them here for your portfolio README:

1. `docs/screenshots/01-landing.png` — Landing page  
2. `docs/screenshots/02-dashboard-agency.png` — Agency dashboard  
3. `docs/screenshots/03-dashboard-client.png` — Client portal dashboard  
4. `docs/screenshots/04-messages.png` — Shared project thread  
5. `docs/screenshots/05-invoices.png` — Invoice list / PDF  

## Try the demo (local or hosted)

1. Configure `server/.env` with `MONGO_URI` and `JWT_SECRET`.  
2. Seed demo users and sample data:

```bash
cd server
npm install
npm run seed:demo
```

3. Log in from the **login** screen using **Try the demo**:

| Role | Email | Password |
| ---- | ----- | -------- |
| Freelancer | `demo@hestia.app` | `Demo123!` |
| Client | `client@hestia.app` | `Demo123!` |

The client is pre-linked to the demo project and has a sample invoice. After seeding, open **Projects → Invite clients** (or use the demo project) to add more `client` accounts by **the email they used to register**.

## Repository layout

```
client/          # Vite + React 19, Zustand, Lucide, Socket.io client
server/          # Express 5, Mongoose, Socket.io, Multer, JWT
server/scripts/  # seed-demo.js
docs/            # Optional architecture notes
```

## Prerequisites

- **Node.js** 20+  
- **MongoDB**  
- **npm**

## Environment variables

### Server (`server/.env`)

| Variable | Purpose |
| -------- | ------- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for JWT |
| `PORT` | Default `5000` |
| `CLIENT_ORIGIN` | Comma-separated origins for CORS + Socket.io (no spaces) |
| `DNS_SERVERS` | Optional; some Windows `mongodb+srv` setups |

### Client (`client/.env.local`)

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_URL` | e.g. `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Optional Socket.io origin |

## Local development

**API**

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

**Client**

```bash
cd client
cp .env.example .env.local
npm install
npm run dev
```

## Production deploy

1. Deploy **server** (Railway, Render, etc.): set `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`.  
2. Deploy **client** (Vercel, etc.): set `VITE_API_URL` / `VITE_SOCKET_URL` at build time.  
3. Run **`npm run seed:demo`** once against production **only if** you want public demo logins (optional; rotate or remove demo users for real productions).

`client/vercel.json` includes SPA rewrites so client-side routes work on refresh.

## Roadmap: dual AI layer (next epic)

Planned enhancements on top of this product surface:

- **Freelancer:** AI-assisted **proposal** generator from project/client context.  
- **Client portal:** AI **project status** summary (read-only narrative).  
- **Both:** **Natural-language search** across projects (semantic/RAG on owned/visible data).

These require an LLM provider, budgeting, and careful prompt/permission boundaries (especially for client-visible text).

## Security (high level)

JWT on REST and sockets, project scoping via **`requireProjectAccess`** (owner or `clients` array), rate limits on auth, authenticated file downloads. Further hardening: validation on all writes, password reset, structured logging, global rate limits, Sentry.

## License

Add your license (e.g. MIT) when you publish.
