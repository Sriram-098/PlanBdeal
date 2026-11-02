# PlanBDeal — Core Features: Theory, Flow & Implementation

For each feature: **Theory** (what/why) → **Flow** (step by step) → **Implementation** (real code).

---

## 1. Browse & Search Tickets

### Theory
A marketplace is useless if buyers can't find what they want. Rather than loading every listing into the browser and filtering client-side (which doesn't scale and leaks data about listings that shouldn't be shown), filtering, sorting, and pagination all happen **on the server**, against the database directly.

### Flow
1. Buyer opens Explore page, types a movie name / picks a city / sets a max price.
2. Client sends those as query params: `GET /api/v1/listings?city=Mumbai&maxPrice=300&sort=price_asc&page=1`.
3. Server builds a Prisma `where` clause from only the params that were actually provided.
4. Server always force-adds two conditions regardless of what the user asked for: `status = ACTIVE` and `showDateTime > now()` — so sold/cancelled/expired listings can never leak into search results even if a client forgets to filter them out.
5. Results + total count come back together so the client can render pagination controls.

### Implementation
```ts
// server/src/services/listing.service.ts
async explore(query: ListingQueryInput) {
  const where: Prisma.ListingWhereInput = {
    status: 'ACTIVE',
    showDateTime: { gt: new Date() },
  };
  if (query.movieTitle) where.movieTitle = { contains: query.movieTitle, mode: 'insensitive' };
  if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
  if (query.maxPrice !== undefined) where.askingPricePerTicket = { lte: query.maxPrice };
  // ...

  const orderBy = query.sort === 'price_asc' ? { askingPricePerTicket: 'asc' } : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.listing.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}
```
The composite index `@@index([city, movieTitle, showDateTime, status])` on `Listing` exists specifically so this query doesn't scan the whole table as data grows.

---

## 2. List a Ticket

### Theory
Anyone can *claim* anything on the client side — a hidden input, a disabled field, a hacked request. So every rule that actually matters (dates, prices, required fields) must be re-checked on the server, no matter what the frontend already validated. This feature also enforces one specific business rule: **a seller can't ask for more than 10% above what they originally paid** — a simple anti-scalping guard.

### Flow
1. Seller fills the "List a Ticket" form (movie, theatre, city, showtime, quantity, original price, asking price, transfer method, etc.).
2. Client does its own Zod validation first (`listingFormSchema`) purely for instant UX feedback.
3. Submits `POST /api/v1/listings` regardless of what the client thinks is valid.
4. Server re-validates **everything** independently with its own Zod schema, then runs the price-cap business rule.
5. If `transferEligibility` is false, the listing is published straight into `CANCELLED` instead of `ACTIVE` — it's never shown as live if the seller admits it isn't actually transferable.

### Implementation
```ts
// server/src/validators/listing.validators.ts
export const createListingSchema = z.object({
  showDateTime: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: 'Show date/time must be in the future',
  }),
  originalPricePerTicket: z.coerce.number().min(0).max(1_000_000),
  askingPricePerTicket: z.coerce.number().min(0).max(1_000_000),
  // ...
});
```
```ts
// server/src/services/listing.service.ts
async create(sellerId: string, input: CreateListingInput) {
  if (input.askingPricePerTicket > input.originalPricePerTicket * 1.1) {
    // Seller can ask at most 10% more than what they originally paid.
    throw ApiError.badRequest('Asking price cannot exceed the original price by more than 10%');
  }
  return prisma.listing.create({
    data: {
      ...input,
      availableQuantity: input.totalQuantity,
      status: input.transferEligibility ? 'ACTIVE' : 'CANCELLED',
    },
  });
}
```
This same 10% rule is re-applied (against the *merged* old+new values) in `listingService.update()`, so editing a listing can't bypass it either.

---

## 3. Request-to-Connect Flow (FIFO Queue)

### Theory
If every pending buyer were visible to the seller at once, the seller could chat with several interested buyers in parallel for the same ticket — a real trust problem (the seller could informally promise the ticket to more than one person). The fix: treat requests like a **queue**, not a pool. Only the single oldest pending request is ever shown with the buyer's identity and is actionable; everyone else is redacted until it's their turn.

### Flow
1. Buyer A requests → row created, `status = PENDING`.
2. Buyer B requests the same listing → also `PENDING`, but it's *not* the oldest, so it's invisible to the seller (no name, no message) — just counted.
3. Seller's dashboard shows only Buyer A's request, fully, with Accept/Reject buttons.
4. **Accept**: an atomic conditional update (`availableQuantity -= quantity WHERE availableQuantity >= quantity`) inside a transaction — this is what prevents two accepts from both succeeding on the last ticket. If it sells out, every other still-pending request for that listing is auto-rejected and those buyers are notified why.
5. **Reject**: Buyer A's request closes, and Buyer B's request automatically becomes "the oldest pending one" on the very next read — no extra state needed, it's computed live.
6. Any direct attempt to accept/reject a request that *isn't* the oldest pending one is blocked with a 409 — enforced server-side, not just hidden in the UI.

### Implementation
```ts
// server/src/services/request.service.ts
async function assertIsActiveRequest(tx: Prisma.TransactionClient, listingId: string, requestId: string) {
  const oldestPending = await tx.connectRequest.findFirst({
    where: { listingId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  if (!oldestPending || oldestPending.id !== requestId) {
    throw ApiError.conflict('Another buyer is ahead of this request in the queue for this ticket');
  }
}

async accept(requestId: string, sellerId: string) {
  return prisma.$transaction(async (tx) => {
    // ...ownership + status checks...
    await assertIsActiveRequest(tx, request.listingId, request.id);

    const decremented = await tx.listing.updateMany({
      where: { id: request.listingId, availableQuantity: { gte: request.quantity } },
      data: { availableQuantity: { decrement: request.quantity } },
    });
    if (decremented.count === 0) throw ApiError.conflict('Not enough tickets remain to accept this request');
    // ...flip to SOLD if availableQuantity hits 0, create ChatThread, notify...
  });
}
```
Redaction happens in `annotateQueue()`, which strips `buyer`/`message` off any pending request that isn't the oldest one for its listing before the API response is even built — the data never reaches the client in the first place.

---

## 4. Real-time Chat

### Theory
Chat should feel instant, not "refresh to see new messages." That needs a persistent connection (Socket.IO over WebSockets), not repeated HTTP polling. But it also must stay secure — only the two people in a deal should ever be able to read or send messages in that thread, and a user shouldn't need a second login just for chat.

### Flow
1. Chat only exists after a request is accepted — a `ChatThread` row is created at that moment, tied to exactly that buyer + seller + listing.
2. When either user opens the chat screen, the client emits `chat:join` with the thread ID.
3. Server checks they're actually a participant (`assertParticipant`) before letting them join that Socket.IO room — a stranger calling `chat:join` on someone else's thread id gets rejected.
4. Sending a message emits `message:send`; the server persists it to Postgres, then broadcasts `message:new` to everyone in that thread's room — both sides see it immediately.
5. The recipient also gets a `NEW_MESSAGE` notification if they aren't actively viewing it.

### Implementation
```ts
// server/src/sockets/chat.socket.ts
socket.on('chat:join', async (threadId, ack) => {
  await chatService.assertParticipant(threadId, socket.userId!); // throws if not a participant
  socket.join(`chat:${threadId}`);
  ack?.();
});

socket.on('message:send', async (payload, ack) => {
  const message = await chatService.createMessage(payload.threadId, socket.userId!, payload.content);
  io.to(`chat:${payload.threadId}`).emit('message:new', message); // instant push to both sides
  // ...then create + emit a NEW_MESSAGE notification to the other participant...
});
```
```ts
// server/src/services/chat.service.ts
async assertParticipant(threadId: string, userId: string) {
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) throw ApiError.notFound('Chat thread not found');
  if (thread.buyerId !== userId && thread.sellerId !== userId) {
    throw ApiError.forbidden('You are not part of this conversation');
  }
  return thread;
}
```
The socket connection itself is authenticated the same way as REST — the Socket.IO handshake re-reads and verifies the same httpOnly JWT cookie (`socketAuth.ts`), so there's no separate login just to use chat.

---

## 5. Notifications

### Theory
Users need to know when something happened even if they're not staring at the right screen — a buyer requested their ticket, their own request got accepted/rejected, a message arrived, a listing expired. These need to (a) show up instantly if the user is online, and (b) still be there the next time they log in if they weren't.

### Flow
1. Something happens (new request, accept, reject, message, expiry).
2. A `Notification` row is written to Postgres — this is what makes it durable (survives the user being offline).
3. Immediately after, the server pushes it live over Socket.IO to that specific user's personal room (`user:{id}`), so if they're online, the bell icon updates instantly with no refresh.
4. If they're offline, it's just sitting in the database, and shows up next time they call `GET /notifications`.
5. The bell only *displays* the 10 most recent, but the unread *count* reflects the true total, so nothing is silently lost even if more than 10 pile up.

### Implementation
```ts
// server/src/services/notification.service.ts
async listForUser(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 });
}
async unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } }); // not capped at 10
}
```
```ts
// example from server/src/services/request.service.ts — "DB write" + "live push" always travel together
const notification = await notificationService.create(tx, {
  userId: request.buyerId,
  type: 'REQUEST_ACCEPTED',
  title: 'Request accepted',
  message: `Your request for ${request.listing.movieTitle} was accepted. You can now chat with the seller.`,
});
// ...after the transaction commits...
emitToUser(request.buyerId, 'notification:new', notification);
```
Every notification-producing event in the app follows this exact two-step pattern: persist first, then push — so "real-time" and "reliable" aren't in tension with each other.

---

## 6. Listing Lifecycle

### Theory
A listing shouldn't stay biddable forever — once its showtime has passed, it's physically useless to anyone. Rather than relying on a human to remember to take it down, or a heavyweight external scheduler, the app treats expiry as something the system itself guarantees, with a cheap, in-process mechanism.

### Flow
1. **Defense layer 1 (always-on, zero extra cost):** every browse/search query already filters `showDateTime > now()`, so even a listing whose `status` hasn't been flipped yet can never appear as requestable.
2. **Defense layer 2 (keeps the stored status accurate):** a lightweight sweep runs every 5 minutes in the same Node process, finds any `ACTIVE` listing whose showtime has passed, flips it to `EXPIRED`, and notifies the seller.
3. **Manual control:** the seller can also directly **Cancel** (before anyone's accepted) or **Mark Sold** (after the real-world handoff) — both are explicit status transitions, never something a user can set arbitrarily.
4. **Mark Sold cascade:** if there were still other buyers waiting in the queue when the seller marks it sold, every one of them is automatically rejected and told "this ticket is no longer available" — nobody is left wondering.

### Implementation
```ts
// server/src/services/expiry.service.ts
export async function sweepExpiredListings() {
  const expired = await prisma.listing.findMany({ where: { status: 'ACTIVE', showDateTime: { lt: new Date() } } });
  for (const listing of expired) {
    await prisma.listing.update({ where: { id: listing.id }, data: { status: 'EXPIRED' } });
    const notification = await notificationService.create(prisma, {
      userId: listing.sellerId, type: 'LISTING_EXPIRED', title: 'Listing expired',
      message: `Your listing for ${listing.movieTitle} has expired`,
    });
    getIO()?.to(`user:${listing.sellerId}`).emit('notification:new', notification);
  }
}
export function startExpirySweep() {
  sweepExpiredListings().catch(console.error);
  return setInterval(() => sweepExpiredListings().catch(console.error), 5 * 60 * 1000);
}
```
```ts
// server/src/services/listing.service.ts — manual Mark Sold, with the queue cascade
async markSold(id: string, sellerId: string) {
  return prisma.$transaction(async (tx) => {
    const updatedListing = await tx.listing.update({ where: { id }, data: { status: 'SOLD' } });
    const notifications = await closeOutPendingRequests(
      tx, id, `The ticket for ${listing.movieTitle} is no longer available — the seller marked it as sold.`,
    );
    return { listing: updatedListing, notifications };
  });
}
```
`startExpirySweep()` is kicked off once in [server/src/index.ts](server/src/index.ts) when the server boots — no separate cron service or external job runner needed for this scope.

---

## 7. Frontend Structure & Flow

### Theory
The frontend is organized by **responsibility**, not by feature — so a "page" never contains its own API-calling logic or its own button styling inline; it composes smaller pieces that each do one job. This keeps any single file small and makes it obvious where to look for something.

### Folder structure
```
client/src/
  pages/            One component per route — Home, Explore, TicketDetails, CreateListing, EditListing,
                     Login, Register, Dashboard, ChatThreadPage, StaticPage, NotFound
  components/ui/     Reusable, dumb design-system pieces — Button, Input, Select, Textarea, Card, Badge,
                     Modal, Spinner, EmptyState, Toast, Skeleton. These know nothing about listings/chat/etc.
  components/layout/ Navbar, Footer, ProtectedRoute, NotificationBell — structural pieces every page shares
  components/dashboard/ ListingsTab, RequestsTab, ChatsTab — the three tabs inside Dashboard.tsx
  components/listings/  ListingCard — the poster card reused on Home, Explore, and search results
  hooks/             useAuth (login/session state), useVoiceCall (WebRTC state machine)
  services/          api.ts (one shared Axios instance + CSRF header injection), socket.ts (one shared
                     Socket.IO client)
  utils/             format.ts (currency/date formatting), listingSchema.ts / authSchema.ts (Zod schemas
                     that mirror the backend's validation rules, for instant client-side feedback)
  types/             Shared TypeScript interfaces (Listing, ConnectRequest, ChatThread, Message, ...) —
                     one definition reused everywhere instead of re-declared per component
```

### Flow of a typical screen
1. **`App.tsx`** defines all routes and wraps protected ones in `<ProtectedRoute>`, which redirects to `/login` if `useAuth()` has no user.
2. A **page** (e.g. `Explore.tsx`) owns its own local state (filters, loading, results) and calls `api.get('/listings', { params })` from the shared `services/api.ts` instance.
3. The page renders **UI components** (`ListingCard`, `Spinner`, `EmptyState`) passing them data as props — those components have no idea where the data came from.
4. Real-time updates (new messages, notifications) come from the single shared `services/socket.ts` connection — components subscribe to events with `socket.on(...)` inside a `useEffect` and clean up with `socket.off(...)` on unmount.
5. Forms (`CreateListing`, `EditListing`, `Login`, `Register`) all follow the same pattern: React Hook Form + a Zod schema from `utils/` for validation, submit via `api.post/patch`, show a toast on success/failure via the shared `useToast()`.

---

## 8. Backend Structure & Flow

### Theory
The backend is split into **layers**, where each layer has exactly one job, and a request only ever flows downward through them — a controller never talks to Prisma directly, and a route never contains business logic.

### Folder structure
```
server/src/
  routes/v1/      URL → handler mapping only. One file per resource (auth, listings, requests, chats,
                  notifications, users). No logic lives here beyond wiring middleware + calling a controller.
  controllers/    Thin HTTP layer — parse/validate the request with Zod, call the matching service
                  function, shape the HTTP response. No direct Prisma calls.
  services/       All business logic + every Prisma call lives here — ownership checks, the concurrency-
                  safe accept logic, the FIFO queue, notification creation, etc.
  middleware/      auth.ts (verifies the JWT cookie), csrf.ts (double-submit check), rateLimit.ts,
                  errorHandler.ts (turns thrown ApiErrors into consistent JSON error responses)
  validators/     Zod schemas — the server's own source of truth for what's valid, independent of
                  whatever the client already checked
  sockets/        Socket.IO wiring — socketAuth.ts (handshake auth, same JWT cookie as REST),
                  chat.socket.ts (messaging), call.socket.ts (WebRTC signaling), io.ts (a singleton so
                  services can emit socket events without importing the whole Express app)
  lib/            env.ts, prisma.ts (one shared PrismaClient instance), jwt.ts, cookies.ts
```

### Flow of a typical request (concrete example: accepting a ticket request)
1. **Route** (`request.routes.ts`): `router.post('/requests/:id/accept', requireAuth, asyncHandler(requestController.accept))`
2. **Middleware** (`requireAuth`): reads the `accessToken` cookie, verifies the JWT, attaches `req.user = { id, email }` — or rejects with 401 before the controller ever runs.
3. **Controller** (`requestController.accept`): just calls `requestService.accept(req.params.id, req.user.id)` and sends back whatever it returns as JSON.
4. **Service** (`requestService.accept`): the actual logic — ownership check, FIFO queue check, the atomic inventory update inside a `$transaction`, creating the ChatThread, creating Notifications.
5. **Prisma** translates each `tx.listing.updateMany(...)` / `tx.connectRequest.update(...)` call into real SQL against Postgres.
6. After the transaction commits, the service emits Socket.IO events (`notification:new`, `chat:thread-created`) to the affected users — this happens *after* the DB write succeeds, never before, so a socket push never lies about state that isn't actually saved yet.
7. The response bubbles back up through the controller to the route to the client, which shows a toast and redirects to the chat.

**The one rule that ties both sides together:** the frontend's Zod schemas exist purely for instant UX feedback — every rule that actually matters is re-checked independently in the backend's own validators and services, because the frontend can never be trusted as the real source of truth.

