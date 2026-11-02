# PlanBDeal — Peer-to-Peer Movie Ticket Marketplace

PlanBDeal connects people who can no longer use a movie ticket with people looking for one — browse listings,
send a request, and once the seller accepts you get a real-time chat and in-app voice call (no phone numbers
ever exchanged) to coordinate the actual transfer through your ticket provider's own permitted method.

This is a portfolio/demo project. **PlanBDeal never processes payments and never claims that a screenshot, QR
code, or PDF constitutes a valid ticket transfer.**

## Features

- Browse & search tickets by movie, city, theatre, language, and price (server-side filtering + pagination)
- Secure auth: Argon2id password hashing, JWT in httpOnly cookies, CSRF double-submit protection, rate limiting
- Create & manage ticket listings with server-side validation (future show date, positive quantity, non-negative prices)
- Request-to-connect workflow with **concurrency-safe acceptance** — inventory can never be oversold even if two
  buyers are accepted at the same instant
- Real-time chat (Socket.IO) between buyer and seller, unlocked only after a request is accepted
- In-app **voice calling** over WebRTC, signaled through the same socket connection — no phone numbers are ever shared
- Lightweight notifications (new request, accepted/rejected, new message, listing expired) with an unread badge
- Automatic listing expiry sweep for past showtimes

## Architecture

```
client/   React + TypeScript + Vite + Tailwind CSS, talks to the API via an Axios instance (cookie-based auth)
server/   Node + Express + TypeScript REST API under /api/v1, Prisma ORM, Socket.IO for chat + call signaling
```

- Auth: short-lived JWT stored in an httpOnly `accessToken` cookie. A companion non-httpOnly `csrfToken` cookie
  is mirrored into an `X-CSRF-Token` header by the client on every mutating request (double-submit CSRF pattern).
- Realtime: Socket.IO handshake re-verifies the same `accessToken` cookie, so socket connections are authenticated
  the same way as REST calls. Every socket user joins a personal `user:{id}` room for notifications and call
  signaling, and a `chat:{threadId}` room (only after a participant check) for messages.
- Concurrency safety: accepting a request uses an atomic conditional `updateMany` (`availableQuantity >= quantity`)
  inside a Prisma transaction, so two simultaneous accepts on the last ticket can never both succeed.
- Voice calls: plain WebRTC (`RTCPeerConnection`), audio-only, with the server only relaying SDP offers/answers and
  ICE candidates between the two chat participants — it never touches the media itself.

## Tech stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hook Form + Zod, Lucide icons, Socket.IO client
**Backend:** Node.js, Express, TypeScript, Prisma ORM, Zod, Socket.IO, Argon2, JWT, Helmet, express-rate-limit
**Database:** PostgreSQL (hosted on Supabase in this setup)
**Testing:** Jest + Supertest

## Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database — this project is configured for a [Supabase](https://supabase.com) Postgres instance

## Environment variables

Copy the example files and fill in real values:

```
server/.env.example  -> server/.env
client/.env.example  -> client/.env
```

### `server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase **pooled** connection string (port 6543, `?pgbouncer=true`) — used at runtime |
| `DIRECT_URL` | Supabase **direct** connection string (port 5432) — used only for Prisma migrations |
| `JWT_SECRET` | Long random secret used to sign access tokens |
| `CSRF_SECRET` | Long random secret (reserved for future CSRF token signing) |
| `PORT` | API server port (default `4000`) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_ORIGIN` | Origin allowed by CORS, e.g. `http://localhost:5173` |

Get both connection strings from your Supabase project: **Settings → Database → Connection string** (choose the
"Transaction pooler" variant for `DATABASE_URL` and the "Direct connection" variant for `DIRECT_URL`).

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_SOCKET_URL` | Only used if you bypass the Vite dev proxy; normally not needed in local dev |

## Setup

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment variables (see above)
cp server/.env.example server/.env   # then edit with real values
cp client/.env.example client/.env

# 3. Run database migrations
cd server
npx prisma migrate dev

# 4. Seed demo data
npm run seed

# 5. Start the backend (http://localhost:4000)
npm run dev

# 6. In a second terminal, start the frontend (http://localhost:5173)
cd ../client
npm run dev
```

The Vite dev server proxies `/api` and `/socket.io` to the Express server, so cookies stay same-origin in
development without any extra CORS configuration.

## Tests

```bash
cd server
npm test
```

The suite runs against your configured `DATABASE_URL` and cleans up its own test data (all seeded users use
`@planbdeal.test` email addresses). It covers:

- Registration/login, generic invalid-credential errors, `/me` auth guard
- Listing ownership checks and server-side validation (past dates, negative prices)
- Self-request prevention, over-quantity requests, expired-listing requests
- **Concurrency race test**: two buyers request the last ticket on a `totalQuantity: 1` listing, the seller
  accepts both at the same instant — exactly one `200`, exactly one `409`, final inventory is `0`
- Chat access control: only thread participants can read message history

## Demo credentials

After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Seller | `seller@planbdeal.dev` | `Password123!` |
| Seller (second persona) | `seller2@planbdeal.dev` | `Password123!` |
| Buyer | `buyer@planbdeal.dev` | `Password123!` |

**Never reuse these credentials in a production deployment.**

The seed data includes 8 listings across different cities/languages/prices, one `totalQuantity: 1` listing
(useful for manually reproducing the concurrency race from two browser profiles), one already-`EXPIRED` listing,
and a couple of pending requests.

## Manually verifying the key flows

1. Register two accounts (or use the seeded buyer/seller).
2. As the seller, create a listing (or use a seeded one).
3. As the buyer, open the listing and click **Request Ticket**.
4. As the seller, go to **My Activity → My Requests → Received** and **Accept** — this unlocks a chat thread.
5. Open the chat as both users (two browser profiles/incognito windows) and exchange messages in real time.
6. Click **Call** from either side, accept on the other, and confirm two-way audio connects.
7. On the seeded `totalQuantity: 1` listing, send two requests from two buyers and try accepting both at once
   (e.g. two browser tabs clicking Accept within the same second) — only one should succeed.

## Known limitations

- **No TURN server** — voice calls use only a public STUN server, so calls may fail on restrictive networks
  (corporate Wi-Fi, some mobile carriers, symmetric NAT). A TURN relay would fix this but isn't included.
- **Single-instance realtime** — the userId→socket room mapping lives in process memory, so this doesn't scale
  horizontally without adding a shared Socket.IO adapter (e.g. Redis).
- **No payments** — PlanBDeal does not collect or hold money. The UI displays a clear "payments not processed"
  notice; a real-money version would need a dedicated payment integration, refund handling, and dispute flows.
- **No admin console, reviews, or reports** — intentionally out of scope for this build to focus depth on
  auth, concurrency-safe inventory, and real-time chat/calling.
- **No email delivery** — registration does not send a verification email; there is no password-reset flow.
- **Transfer is never verified by the app** — PlanBDeal tracks listing/request status only. The actual ticket
  handoff always happens through the real ticket provider's own supported transfer process.

## Security considerations

- Passwords hashed with Argon2id; JWT access tokens are short-lived (15 min) and stored in httpOnly cookies —
  never in `localStorage`.
- CSRF protection via the double-submit cookie pattern: a readable `csrfToken` cookie must match the
  `X-CSRF-Token` header on every mutating request (register/login are exempt since no session exists yet).
- Rate limiting on auth and listing/request-creation endpoints.
- Helmet security headers; CORS restricted to the configured client origin.
- All ownership/ACL checks (listing owner, request owner, chat participant) are enforced server-side regardless
  of what the client sends.
- Errors never leak stack traces outside of development mode.
