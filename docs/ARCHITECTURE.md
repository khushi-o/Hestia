# Hestia — System Architecture

**Version 1.1 · March 2026**

This document describes the current codebase: requirements-level behavior, structure, and deployment planning. It replaces older specs where they differ (e.g. routing, theme keys, API surface).

---

## 1. System Architecture Overview

Hestia uses a **three-tier** pattern:

| Tier | Technology | Typical role |
|------|------------|----------------|
| Presentation | **React 19** + **Vite 8** | SPA in the browser; dev server port **5173** |
| Application | **Node.js** + **Express 5** + **Socket.io** | REST API + realtime; dev port **5000** |
| Data | **MongoDB** + **Mongoose** | Persistence; local dev often **27017** |

---

## 2. Frontend Architecture

### 2.1 Project structure (`client/src/`)

| Path | Purpose |
|------|---------|
| `pages/` | Route-level screens: `Landing`, `Login`, `Register`, `Dashboard`, `Projects`, `Clients`, `Invoices`, `Messages`, `Files`, `Profile`, `Notifications` |
| `components/` | Shared UI: `Layout`, `Sidebar`, `PageHeader`, `StatCard`, `EmptyState`, `GlobalSearch`, `ThemePicker`, `ThemeTransitionOverlay`, `ConfirmDialog` (themed replaces `window.confirm` where used) |
| `contexts/` | `ThemeChangeContext` — theme changes with animated transition + shortcuts |
| `store/` | Zustand `authStore` (user, token, accent, mode) |
| `api/` | Axios instance + JWT interceptor (`axios.js`) |
| `config/` | `env.js` — `VITE_API_URL`, optional `VITE_SOCKET_URL` |
| `theme.js` | `accents`, `modes`, **`APP_THEMES`** (single list for dashboard + profile) |
| `utils/` | `generatePDF.js`, `recentItems.js` |

### 2.2 State management (Zustand)

| State | Notes |
|-------|--------|
| `user`, `token` | Auth; persisted in `localStorage` via `login` / `logout` |
| `accent` | Key into `theme.accents` (e.g. `earthy`, `cyber`, `sunset`, `violet`, `pink`) |
| `mode` | Key into `theme.modes` (e.g. `earthy`, `dark`, `night`, `light`) |

**Theme presets:** `APP_THEMES` in `theme.js` defines **four** pairs `(modeKey, accentKey)` used everywhere (dashboard header, profile, shortcuts). Labels are **Earthy / Night / Dusk / Day**; keys remain `earthy`, `dark`, `night`, `light` for saved preferences.

### 2.3 Theme change UX

- **Animated transition:** `ThemeTransitionOverlay` (Framer Motion) — a character peeks from the side, a paper “sheet” rips in two, then the new theme applies.
- **Shortcuts:** `Ctrl+Shift+1` … `Ctrl+Shift+4` map to the four `APP_THEMES` entries (ignored while focus is in an input/textarea/select).

### 2.4 Routing (React Router v7)

| Path | Access |
|------|--------|
| `/` | **Landing** (public) |
| `/login`, `/register` | Public |
| `/dashboard`, `/projects`, `/clients`, `/invoices`, `/messages`, `/files`, `/profile`, `/notifications` | **Protected** — `ProtectedRoute` checks Zustand `token` |

`ProtectedRoute` redirects to `/login` if there is no token.

### 2.5 API communication

- Axios `baseURL` comes from **`VITE_API_URL`** (see `config/env.js`), defaulting to `http://localhost:5000/api` in development.
- Request interceptor attaches `Authorization: Bearer <token>` when `localStorage` has a token.

---

## 3. Backend Architecture

### 3.1 Layout (`server/`)

| Item | Role |
|------|------|
| `server.js` | HTTP server, Express, Socket.io (JWT on handshake), CORS from **`CLIENT_ORIGIN`**; file bytes via **`/api/files/download`** only |
| `config/db.js` | Mongo connection |
| `config/cors.config.js` | Parses `CLIENT_ORIGIN` for allowed origins |
| `models/` | Mongoose schemas |
| `controllers/` | Business logic |
| `routes/` | Routers; includes **`/api/search`** (authenticated search) and **`/api/notifications`** |
| `middleware/auth.middleware.js` | JWT verification |

### 3.2 API surface (summary)

Core resources as in your earlier table (auth, projects, clients, invoices, messages, files), plus:

- **Profile:** `GET`/`PUT` `/api/auth/profile`
- **Stats:** `GET` `/api/auth/stats`
- **Notifications:** under `/api/notifications`
- **Search:** `GET` `/api/search?q=` (authenticated)
- **Messages:** `GET`/`POST` `/api/messages/:projectId`, **`DELETE`** `/api/messages/:projectId/:messageId` (sender must match current user; project owner only)

Environment variables (see `server/.env.example`): `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_ORIGIN`.

---

## 4. Realtime (Socket.io)

- Server shares HTTP server with Express; CORS aligned with `CLIENT_ORIGIN`.
- Client `messages` page uses Socket.io URL from **`getSocketUrl()`** (`env.js`).
- Events:
  - **`join_project`** — client joins a project room after ownership is verified. The server leaves the previous project room for that socket (the browser client does not support `socket.leave()`; cleanup is server-side via `socket.data.activeProjectId`).
  - **`receive_message`** — emitted by the server **after** a message is saved in **`POST /api/messages/:projectId`** (single source of truth; no client `send_message` emit).
  - **`message_deleted`** — emitted after **`DELETE /api/messages/:projectId/:messageId`** so all tabs stay in sync.

---

## 5. Security (summary)

- **Authentication:** bcrypt + JWT (`JWT_SECRET`), `protect` middleware on protected routes.
- **Isolation:** Resource queries scoped by `owner` / user id where applicable.

---

## 6. Deployment planning

| Layer | Suggested direction |
|-------|---------------------|
| Frontend | Static hosting (e.g. **Vercel**); set **`VITE_API_URL`** / **`VITE_SOCKET_URL`** at build time |
| Backend | **Railway**, **Render**, or similar; set `MONGO_URI`, `JWT_SECRET`, `PORT`, **`CLIENT_ORIGIN`** to your frontend origin(s) |
| Database | **MongoDB Atlas** |
| Files | Current: local `uploads/`; production: **S3** or similar (planned) |
| CI | `.github/workflows/ci.yml` — client `lint` + `build` |

**Checklist:** HTTPS for both app and API; WebSockets allowed on proxy; secrets only in platform env, not in repo.

---

## 7. Document history

| Version | Notes |
|---------|--------|
| 1.0 | Original spec (partially outdated vs repo) |
| 1.1 | Aligns with routing, theme system, env-based URLs, search/notifications, CI |
