# RSS Aggregator API (Express + MongoDB)

## Setup
1. Copy `env.example` to `.env` and set secrets (do not commit real values).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the API:
   ```bash
   npm run dev
   ```

## Environment
- `MONGODB_URI` — Mongo connection string (use env, never hardcode).
- `SESSION_SECRET` / `JWT_SECRET` — secrets for sessions/tokens.
- `FRONTEND_ORIGIN` — allowed CORS origin (e.g., `http://localhost:5173`).
- Guest gating: up to 10 posts total and 3 per feed for guests (hardcoded).
- `LEGACY_FEED_BASE` — optional base URL for existing XML feeds (e.g., GitHub Pages).

## Scripts
- `npm start` — start server.
- `npm run dev` — nodemon for local dev.
- `npm run ingest` — one-off ingest of enabled feeds into Mongo.

## API routes (summary)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/feeds` — per-user feed management.
- `GET /api/posts` — paginated posts (supports `feed`, `search`, `page`, `limit`), guest gated with `showSignInGate`.

