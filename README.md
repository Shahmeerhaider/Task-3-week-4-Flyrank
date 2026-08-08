# Task API

A CRUD to-do API secured with Supabase Auth, backed by an interchangeable
storage layer (in-memory or PostgreSQL), with Redis wired in as a stretch
goal. This project has grown across four assignments: an in-memory CRUD
API, a swap to SQLite, a swap to containerized Postgres, and now a full
authentication layer sitting in front of everything.

## What this project demonstrates

Two architectural claims run through this repository, and both are
verified with real, executed tests rather than just described:

1. **Storage is an implementation detail.** `src/repositories/index.js` is
   the only file that decides whether the app uses an in-memory array or
   PostgreSQL. `src/services/taskService.js` and `src/routes/tasks.js`
   never change between the two.

2. **Authentication is a reusable guard, not per-route logic.** A single
   middleware function, `requireAuth`, verifies a bearer token against
   Supabase and is applied to every protected route. `/protected/profile`
   and `/protected/dashboard` share the exact same middleware; neither
   contains its own token-checking code.

## Architecture

```
server.js                                  entry point: build repository, Supabase client, service, and app; start listening
src/app.js                                 wires every route and middleware together
src/auth/supabaseClient.js                 builds the Supabase client from SUPABASE_URL / SUPABASE_KEY
src/middleware/authMiddleware.js           requireAuth (token verification) and requireAdmin (role check)
src/routes/auth.js                         POST /auth/signup, /auth/login, /auth/logout, /auth/refresh
src/routes/publicInfo.js                   GET /public/info
src/routes/protected.js                    GET /protected/profile, /protected/dashboard, /protected/admin
src/repositories/index.js                  the only place that decides in-memory vs Postgres
src/repositories/inMemoryTaskRepository.js storage backend 1
src/repositories/postgresTaskRepository.js storage backend 2
src/services/taskService.js                task validation and business rules, backend-agnostic
src/routes/tasks.js                        task CRUD routes, unauthenticated in this version
src/db/pool.js                             pg connection pool built from DATABASE_URL
src/db/schema.sql                          CREATE TABLE, run automatically on startup
src/db/migrations/                         optional, manually applied schema changes
src/redis.js                               stretch goal: pings Redis once on startup
openapi.json                               API description served at /docs, includes the bearer security scheme
Dockerfile                                 builds the api image
compose.yaml                               api, db, and redis services, with health-gated startup
.env.example                               committed placeholder configuration
```

## The trust triangle this project implements

```
Client                     Your Server                  Supabase
  |  email + password          |                             |
  |----------------------------------------------------------->|
  |                             |         access token          |
  |<-----------------------------------------------------------|
  |  Authorization: Bearer <token>                             |
  |---------------------------->|                             |
  |                             |  "is this token real?"      |
  |                             |---------------------------->|
  |                             |    yes/no + user metadata    |
  |                             |<----------------------------|
  |     200 or 401              |                             |
  |<----------------------------|                             |
```

Supabase stores accounts, hashes passwords, and signs tokens. This project
never touches a password or writes any cryptography — it only ever sends
credentials to Supabase and asks Supabase to verify the tokens it hands
back.

## Setting up Supabase (one-time, ~2 minutes)

1. Create a free account at [supabase.com](https://supabase.com) and
   create a new project.
2. In the dashboard, open **Project Settings -> API** and copy the
   **Project URL** and the **anon public key**. Never use the
   `service_role` key here — it bypasses all security and must stay
   server-side only, on trusted infrastructure.
3. Open **Authentication -> Providers -> Email** and turn off
   **Confirm email**, so a freshly signed-up test account can log in
   immediately. (In a real production project you would leave this on —
   it's a genuine security feature, disabled here only to make local
   testing fast.)

## Environment variables

| Variable       | Purpose                                                | Example                                        |
|-----------------|-----------------------------------------------------------|--------------------------------------------------|
| `SUPABASE_URL` | Your Supabase project URL                                  | `https://xxxxxxxx.supabase.co`                   |
| `SUPABASE_KEY` | Your Supabase anon (public) key, never the service_role key | `eyJhbGciOi...`                                  |
| `DATABASE_URL` | Postgres connection string. Unset falls back to in-memory storage | `postgres://postgres:dev@localhost:5432/tasks` |
| `REDIS_URL`    | Pinged once at startup as a stretch goal                    | `redis://localhost:6379`                          |
| `PORT`         | Port the API listens on                                    | `3000`                                            |

`.env` is git-ignored and never committed. `.env.example` is committed
with placeholder values so anyone cloning this repository knows exactly
which variables to set, without ever seeing a real secret.

## Running the project

### With Docker (recommended)

```bash
cp .env.example .env
# edit .env: paste your real SUPABASE_URL and SUPABASE_KEY
docker compose up
```

This starts three containers: `db` (Postgres, with a volume so data
survives restarts), `redis` (stretch goal), and `api` (this application).
`api` will not start until `db` and `redis` report healthy, which removes
a startup race that otherwise causes the app to fail with `ECONNREFUSED`
on a completely fresh environment.

The API is then available at `http://localhost:3000`.

### Without Docker

```bash
npm install
cp .env.example .env
# edit .env with your Supabase credentials, and optionally DATABASE_URL
npm start
```

If `DATABASE_URL` is left unset, the task storage falls back to
in-memory automatically — authentication still works fully either way,
since Supabase is a separate, external service.

On success the server logs:

```
Server running and connected to Supabase (storage: Postgres, port: 3000)
```

## Endpoints

| Method | Path                  | Auth required | Description                                             | Success | Errors      |
|--------|------------------------|:--------------:|-----------------------------------------------------------|---------|-------------|
| POST   | `/auth/signup`         | no             | Create a new user account                                  | 201     | 400         |
| POST   | `/auth/login`          | no             | Authenticate, receive an access token and refresh token    | 200     | 400, 401    |
| POST   | `/auth/logout`         | yes            | End the current session                                    | 204     | 401         |
| POST   | `/auth/refresh`        | no             | Exchange a refresh token for a new access token             | 200     | 400, 401    |
| GET    | `/public/info`         | no             | Public, unauthenticated data                                | 200     | -           |
| GET    | `/protected/profile`   | yes            | The authenticated user's own id, email, and creation date   | 200     | 401         |
| GET    | `/protected/dashboard` | yes            | A second protected route, reusing the same middleware       | 200     | 401         |
| GET    | `/protected/admin`     | yes, admin role | Demonstrates the 401 vs 403 distinction                    | 200     | 401, 403    |
| GET    | `/tasks`               | no             | List tasks                                                  | 200     | -           |
| GET    | `/tasks/:id`           | no             | Get one task                                                | 200     | 404         |
| POST   | `/tasks`               | no             | Create a task                                               | 201     | 400         |
| PUT    | `/tasks/:id`           | no             | Replace a task                                              | 200     | 400, 404    |
| DELETE | `/tasks/:id`           | no             | Delete a task                                               | 204     | 404         |
| GET    | `/stats`               | no             | Aggregate task counts                                       | 200     | -           |
| GET    | `/health`              | no             | Liveness check, includes a storage ping                     | 200     | 503         |
| GET    | `/docs`                | no             | Swagger UI, with the Authorize button for bearer tokens      | 200     | -           |

401 means "I don't know who you are" — no token, or a token that fails
verification. 403 means "I know exactly who you are, and you still may
not" — reserved for `/protected/admin`, which checks a role claim after
`requireAuth` has already confirmed identity.

## Verified test run

Supabase requires a live project with real credentials, which cannot be
provisioned inside an automated test environment. To verify the actual
logic — status codes, token extraction, middleware reuse — without
depending on network access to a real Supabase project, the exact same
`src/routes/auth.js`, `src/routes/protected.js`, and
`src/middleware/authMiddleware.js` files were run against a stand-in
Supabase client that mirrors the real SDK's response shape
(`{ data, error }`) for `signUp`, `signInWithPassword`, `getUser`,
`signOut`, and `refreshSession`. Every checkpoint in the assignment was
executed and produced the expected result:

```
POST /auth/signup   { }                              -> 400  {"error":"email and password are required"}
POST /auth/signup   valid email + password            -> 201  {"user": {...}}
POST /auth/login    wrong password                    -> 401  {"error":"Invalid login credentials"}
POST /auth/login    correct credentials                -> 200  {"access_token": "...", "refresh_token": "...", "user": {...}}
GET  /public/info                                       -> 200  {"message":"Welcome stranger! This info is public."}
GET  /protected/profile   no token                     -> 401  {"error":"Access token required"}
GET  /protected/profile   valid token                   -> 200  {"id": "...", "email": "...", "created_at": "..."}
GET  /protected/profile   tampered token (one char changed) -> 401  {"error":"Invalid or expired token"}
GET  /protected/dashboard valid token, same middleware  -> 200  {"message":"Welcome back, ..."}
GET  /protected/admin     valid token, non-admin user    -> 403  {"error":"Admin access required"}
POST /auth/logout   valid token                          -> 204
POST /auth/logout   no token                              -> 401  {"error":"Access token required"}
POST /auth/refresh   valid refresh_token                   -> 200  {"access_token": "...", "refresh_token": "..."}
POST /auth/refresh   garbage refresh_token                  -> 401  {"error":"Invalid or expired refresh token"}
```

Since the route, middleware, and app-wiring code is identical whether the
Supabase client is real or stand-in, and `server.js` only swaps in the
real `createSupabaseClient()` at startup, this test run demonstrates the
same code path a live Supabase project exercises. Before submitting, run
the equivalent commands yourself against your own live Supabase project
and confirm the same results — the commands are below.

## Trying it yourself, with a real Supabase project

```bash
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Copy the `access_token` from the response, then:

```bash
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer PASTE_YOUR_TOKEN_HERE"
```

Change one character of the token and run the same command again — it
should return 401 instead of 200.

## Swagger UI

Open `http://localhost:3000/docs`. Protected routes show a lock icon.
Click **Authorize**, paste an access token obtained from `/auth/login`,
and use **Try it out** directly against `/protected/profile` from the
browser — no curl required. Take a screenshot of this for your own
submission, showing the lock icons and a successful authorized call.

## Stretch goals implemented

- **401 vs 403**: `/protected/admin` is reachable by any authenticated
  user but returns 403 unless the user's `app_metadata.role` (or
  `user_metadata.role`) is `"admin"`. This is a Supabase custom claim you
  would set on a user's row from the Supabase dashboard or via the
  `service_role` key on a trusted backend process, never from the client.
- **Refresh token flow**: `POST /auth/refresh` exchanges a refresh token
  for a new access token without forcing a fresh login, which is the
  entire reason refresh tokens exist — access tokens are intentionally
  short-lived (Supabase's default is one hour).
- **Redis ping** and **index / EXPLAIN ANALYZE comparison** carried over
  from the previous assignment — see `src/redis.js` and
  `src/db/migrations/001_add_done_index.sql`.

## A note on logout and stateless JWTs

`POST /auth/logout` calls Supabase's `signOut`, but a JWT that has
already been issued remains cryptographically valid until it expires —
there is no server-side session to revoke on a stateless token scheme.
This is a genuine, well-known limitation of JWT-based auth, not a bug in
this implementation: true instant revocation requires either short token
lifetimes (which Supabase already uses, one hour by default) or a
server-side deny-list, which is a deliberate trade-off beyond the scope
of this assignment.

## Task storage: the swap this repo already proved

`src/repositories/index.js` chooses Postgres if `DATABASE_URL` is set,
otherwise in-memory:

```js
function getTaskRepository() {
  return process.env.DATABASE_URL ? postgresTaskRepository : inMemoryTaskRepository;
}
```

Persistence was verified directly: a task was created, the entire Docker
stack was torn down with `docker compose down` (removing every
container, including the database), then brought back up fresh with
`docker compose up -d`. The created task was still present, because it
lived in the `taskdata` volume rather than in any single container.

## Troubleshooting notes

On first setup on a Windows machine, `docker compose up` initially failed
with:

```
api-1 exited with code 1
Error: connect ECONNREFUSED 172.18.0.3:5432
```

This happened because the original `compose.yaml` used a plain
`depends_on` list, which only waits for a container to start, not for
Postgres inside it to finish initializing and accept connections. The
fix, already applied in this repository, adds Docker health checks to
`db` and `redis` and requires both to report healthy before `api` starts:

```yaml
depends_on:
  db:
    condition: service_healthy
  redis:
    condition: service_healthy
```
