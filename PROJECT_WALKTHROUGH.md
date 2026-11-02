# PlanBDeal — Project Walkthrough & Explanation Notes

A reference doc to help explain this project in an interview or write-up. Organized as: tech stack → seller flow →
buyer flow → architecture/file guide → challenges faced → talking points.

---

## 1. What PlanBDeal is (one paragraph)

Imagine you book movie tickets for yourself and your friends for a Saturday evening. Later, you get an urgent
meeting or some unexpected work comes up, and you can no longer attend. In many cases a refund isn't possible, so
the ticket would otherwise go to waste — and the usual fallback (asking friends, posting in a WhatsApp group, or
sharing it on Instagram) gives no guarantee that the right person, looking for that exact movie, theatre, and
showtime, ever sees it. PlanBDeal is a peer-to-peer marketplace built specifically to solve that: sellers list
their unused tickets with the movie name, theatre, showtime, quantity, and price, and buyers search for a
suitable show and request tickets directly through the platform. Once the seller accepts a request, both users
can communicate through real-time chat and in-app voice calls without ever sharing their personal phone numbers,
then coordinate the actual handover using a transfer method supported by the ticket provider. PlanBDeal focuses on
connecting people and facilitating that communication — it deliberately does not process payments and does not
claim to perform or verify the ticket transfer itself.

---

## 2. Tech stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hook Form + Zod, Lucide icons,
Socket.IO client, native WebRTC API.

**Backend:** Node.js, Express, TypeScript, Prisma ORM, Zod, Socket.IO server, Argon2 (password hashing),
jsonwebtoken, Helmet, express-rate-limit, cookie-parser.

**Database:** PostgreSQL, hosted on Supabase.

**Testing:** Jest + Supertest (integration tests against a real Postgres instance, not mocks).

**Why this stack:** React/Express/Postgres/Prisma is a standard, well-understood full-stack combination that's easy
for an interviewer to reason about, while Socket.IO + WebRTC demonstrate real-time systems knowledge beyond basic
CRUD, and Prisma's transaction API is what enables the concurrency-safety story.

---

## 3. Seller flow (step by step)

1. **Register/Login** — creates an account (Argon2id-hashed password), receives a short-lived JWT in an httpOnly
   cookie plus a readable CSRF cookie.
2. **List a Ticket** (`/listings/new`) — fills in movie title, language, theatre, city, show date/time, ticket
   count, original price, asking price, provider, transfer method, and whether it's eligible for transfer.
   Submission hits `POST /api/v1/listings`.
3. **Server-side validation** (`listing.validators.ts` + `listing.service.ts`) — rejects past show dates, negative
   prices, missing required fields, and asking prices that exceed original price by more than 10% (a simple
   anti-scalping guard), **regardless of what the frontend already validated**.
4. The listing is published immediately as `ACTIVE` (no manual review queue in this build) — but only if marked
   eligible for a supported transfer method; otherwise it's auto-set to `CANCELLED` with no listing created in a
   misleading "live" state.
5. The listing shows up in **Explore Tickets** for anyone browsing, and in the seller's **Dashboard → My Listings**.
6. When a buyer sends a **Request to Connect**, the seller gets a live notification (Socket.IO push + a
   `Notification` row in the DB so it persists even if they're offline).
7. Seller goes to **Dashboard → My Requests → Received**, sees each pending request (quantity + optional message),
   and clicks **Accept** or **Reject**.
8. **Accept** is the most technically interesting step — see the concurrency section below. On success, the
   listing's `availableQuantity` is safely decremented, a `ChatThread` is created automatically, and both sides are
   notified.
9. Seller and buyer now have a **real-time chat** scoped to that specific deal, plus a **Call** button for an
   in-app voice call (WebRTC) — used to agree on a time/place to meet and hand the ticket over physically.
10. Once the ticket has actually been handed over, the seller manually clicks **Mark Sold** on the listing from
    their dashboard. They can also **Cancel** a listing anytime before it's sold.

## 4. Buyer flow (step by step)

1. **Browse as a guest** — homepage hero, search bar, Explore Tickets page with filters (movie, city, theatre,
   language, max price, quantity), sort (newest / lowest price), pagination — all computed **server-side** via
   Prisma `where`/`skip`/`take`, not by loading everything into the browser.
2. Opens a listing's **Ticket Details** page — sees movie/theatre/date/time/price/quantity, but never sees the
   seller's email, booking reference, or any QR code (those are never exposed by the API in the first place).
3. Clicking **Request Ticket** while not logged in redirects to **Login/Register**, then back to the same page.
4. Fills in quantity + an optional message → `POST /api/v1/listings/:id/requests`.
5. Server blocks: requesting your own listing, requesting more than `availableQuantity`, or requesting an
   expired/non-active listing.
6. Request sits as `PENDING` in **Dashboard → My Requests → Sent**. Buyer can **Withdraw** it any time before the
   seller acts on it.
7. Gets a live notification when the seller **Accepts** or **Rejects**.
8. On **Accept**, a chat thread unlocks automatically — buyer can message the seller and start a **voice call**
   directly from the chat screen, all without ever learning the seller's phone number.
9. They agree on where and when to meet, and the seller physically hands over the ticket — the actual exchange
   always happens outside the app.

---

## 5. Architecture & file guide

```
client/src/
  pages/            One file per route (Home, Explore, TicketDetails, CreateListing, Login, Register,
                    Dashboard, ChatThreadPage, StaticPage, NotFound)
  components/ui/    Reusable design-system primitives (Button, Input, Select, Textarea, Card, Badge, Modal,
                    Spinner, EmptyState, Toast, Skeleton)
  components/layout/  Navbar, Footer, ProtectedRoute, NotificationBell
  components/dashboard/  ListingsTab, RequestsTab, ChatsTab (used inside Dashboard.tsx)
  components/listings/   ListingCard (the poster card shown in grids)
  hooks/            useAuth (session/context), useVoiceCall (WebRTC state machine), 
  services/         api.ts (Axios instance + CSRF header injection), socket.ts (Socket.IO client singleton)
  utils/            format.ts (currency/date formatting), listingSchema.ts / authSchema.ts (Zod validation
                    mirrors of the backend schemas, for instant client-side feedback)

server/src/
  app.ts            Express app setup: Helmet, CORS, JSON body parsing, cookie-parser, CSRF middleware, routes
  index.ts           Boots the HTTP server + Socket.IO + the listing-expiry sweep
  routes/v1/        One router per resource (auth, listings, requests, chats, notifications, users)
  controllers/      Thin HTTP handlers — parse/validate input, call the service, shape the response
  services/         All business logic lives here (this is where the concurrency-safe accept logic lives)
  middleware/       auth.ts (JWT cookie verification), csrf.ts (double-submit check), rateLimit.ts, errorHandler.ts
  validators/       Zod schemas used to reject malformed requests server-side
  sockets/          Socket.IO wiring: socketAuth.ts (cookie-based handshake auth), chat.socket.ts (messaging),
                    call.socket.ts (WebRTC signaling relay), io.ts (singleton so REST services can emit events)
  lib/              env.ts, prisma.ts (singleton client), jwt.ts, cookies.ts

server/prisma/
  schema.prisma     All data models (User, Listing, ConnectRequest, ChatThread, Message, Notification)
  seed.ts           Demo data: 3 users, 8 listings across cities/languages/prices, a couple of pending requests

server/tests/
  helpers.ts        Shared test utilities (register+login a user via Supertest agent, build valid listing payloads)
  auth/listings/requests/concurrency/chat.test.ts   One file per feature area
```

**Request lifecycle through the stack (example — sending a connect request):**
`TicketDetails.tsx` (form) → Axios `POST /api/v1/listings/:id/requests` with CSRF header → Express route
(`request.routes.ts`) → `requireAuth` middleware verifies the JWT cookie → `requestController.create` parses body
with Zod → `requestService.create` does the business logic (ownership check, availability check, DB write,
notification creation) → response flows back → client shows a success toast and redirects to the dashboard.

---

## 6. Challenges faced (real-world, relatable ones)

1. **Preventing two buyers from claiming the same remaining ticket simultaneously.** This was the main challenge:
   if a listing has one ticket left and two buyers both get accepted at nearly the same instant, a naive
   check-then-update implementation could let both succeed and oversell a ticket that doesn't exist. Solved with
   an atomic conditional database update inside a transaction, so the availability check and the decrement happen
   as a single indivisible operation. Verified with an integration test that fires two accept requests at the
   same time and asserts that exactly one of them succeeds.
2. **Impatient users double-clicking "Accept."** A seller clicking Accept twice on the same request (or a slow
   connection making them think the first click didn't register) could, in a careless implementation, cause two
   separate updates to run. Because the accept logic is the same atomic check-and-update described above, the
   second click simply gets told "not enough tickets remain" instead of silently corrupting the data — so even
   ordinary impatient clicking can't cause a problem, not just a deliberate attack.
3. **Broken or missing poster images.** Posters are just URLs a seller pastes in — if the link is wrong, expired,
   or the image host is down, a raw broken-image icon would make listing cards look unpolished. Added an `onError`
   fallback on every poster `<img>` that swaps in a clean placeholder graphic instead, so one bad URL never breaks
   the browsing experience.
4. **Users denying microphone access for calls.** Browsers require explicit permission for `getUserMedia`, and
   users often click "Block" by reflex. Without handling it, the call feature would silently fail or throw an
   uncaught error. Wrapped every call-start action in a try/catch that shows a clear toast ("Microphone access is
   required to make a call") instead of a broken, confusing UI.
5. **Keeping form validation messages consistent in two places.** The same rules (required fields, future show
   date, non-negative prices, password length, etc.) need to exist both on the frontend, for instant feedback, and
   on the backend, because the frontend can never be trusted. Keeping both sets of Zod schemas in sync by hand was
   an easy place to introduce mismatches, so each pair of schemas was written to mirror each other field-by-field
   and tested against the same invalid inputs on both sides.
6. **Making one UI work on both a phone and a laptop from day one.** Rather than designing desktop-first and
   patching mobile in later, every layout (navbar, filters bar, listing grid, dashboard tabs) was built with
   Tailwind's responsive breakpoints from the start — e.g. the Explore page's filter grid and card grid collapse
   from four columns down to one, and secondary nav links hide behind the profile menu on small screens instead of
   overflowing.

---

## 7. Suggested interview "elevator pitch" paragraph

"My project is called PlanBDeal. Imagine you book movie tickets for yourself and your friends for a Saturday
evening. Later, you get an urgent meeting or some unexpected work, and you can no longer attend the movie. In many
cases, getting a refund may not be possible, so your ticket could go to waste. Usually, you might ask your
friends, post in a WhatsApp group, or share it on Instagram, but there's no guarantee the right person sees your
post and wants a ticket for that exact movie, theatre, and showtime. That's the problem I wanted to solve with
PlanBDeal — a peer-to-peer marketplace specifically for unused movie tickets. Sellers list their tickets with the
movie name, theatre, showtime, quantity, and price; buyers search for a suitable show and request tickets
directly through the platform. Once the seller accepts a request, both users can communicate through real-time
chat and in-app voice calls without sharing their personal phone numbers, then coordinate the actual handover
using a transfer method supported by the ticket provider. PlanBDeal focuses on connecting users and facilitating
communication rather than processing payments or verifying the ticket transfer itself. From a technical
perspective, I used React and TypeScript for the frontend, Node.js and Express for the backend, PostgreSQL with
Prisma for the database, and Socket.IO for real-time communication. One of the main challenges was preventing two
buyers from claiming the same remaining ticket simultaneously — I handled this using an atomic conditional
database update inside a transaction, and wrote an integration test to verify that, when two requests compete for
one ticket, only one succeeds. That's the main idea behind PlanBDeal: helping people find someone who can use
their unused movie tickets, while solving the real engineering challenges involved in building a reliable
marketplace."

