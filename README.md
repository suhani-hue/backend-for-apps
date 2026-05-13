# backend_for_apps

A production-quality **Backend-as-a-Service (BaaS)** built with Node.js 18+, Express, Prisma ORM, SQLite (swappable to PostgreSQL), bcrypt, and JWT auth. Drop it behind any frontend project to get user accounts, authentication, and a per-user JSON key-value store in minutes.

---

## File Tree

```
backend_for_apps/
├── prisma/
│   └── schema.prisma          # DB models: User, RefreshToken, UserData
├── src/
│   ├── controllers/
│   │   ├── authController.js  # register, login, refresh, logout
│   │   └── userController.js  # getMe, getUserData, createUserData, update, delete
│   ├── middleware/
│   │   ├── auth.js            # JWT Bearer token validator
│   │   └── errorHandler.js    # Centralised error → JSON response
│   ├── routes/
│   │   ├── auth.js            # /api/register, /api/login, /api/token/refresh, /api/logout
│   │   └── user.js            # /api/me, /api/me/data (all protected)
│   ├── utils/
│   │   ├── jwt.js             # signAccessToken, verifyAccessToken, generateRefreshToken
│   │   ├── prisma.js          # Singleton PrismaClient (switches DB for tests)
│   │   └── validate.js        # validateEmail, validatePassword
│   ├── app.js                 # Express app factory (importable by tests)
│   └── server.js              # HTTP server entry point + graceful shutdown
├── tests/
│   └── api.test.js            # Jest + supertest integration tests
├── .env.example               # Template — copy to .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js
├── frontend-snippet.js        # Sample browser fetch code
├── nodemon.json
├── package.json
├── postman-collection.json    # Import into Postman for GUI testing
└── README.md
```

---

## Quick Start (Local)

### Prerequisites
- Node.js 18 or later (`node --version`)
- npm 9 or later

### Steps

```bash
# 1. Clone or copy the project
cd backend_for_apps

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Edit .env and set a strong JWT_SECRET (see below)

# 4. Generate the Prisma client
npm run db:generate

# 5. Run the first migration (creates dev.db)
npm run db:migrate
# Prisma will prompt for a migration name — type "init" and press Enter

# 6. Start the dev server (with hot-reload)
npm run dev

# ✅  Server is now running on http://localhost:4000
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Switching from SQLite → PostgreSQL

1. In `.env`, replace:
   ```
   DATABASE_URL="file:./dev.db"
   ```
   with:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
   ```

2. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "sqlite"   # ← change to "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Re-run migrations:
   ```bash
   npm run db:migrate
   ```

That's it — no other code changes needed.

---

## Running Tests

```bash
npm test
```

Tests run against a fresh `test.db` SQLite file that is created and destroyed automatically. All 20+ assertions cover:
- Health check
- Register (happy path, duplicate email, weak password)
- Login (success, wrong password)
- Token refresh (valid, invalid, post-logout)
- GET /api/me (auth required)
- User data CRUD (create, list, update, delete, ownership check)
- Logout (revokes refresh token)

---

## Docker

### Build and run with Docker alone

```bash
# Build image
docker build -t backend_for_apps .

# Run (pass your JWT_SECRET)
docker run -p 4000:4000 \
  -e JWT_SECRET="your_secret_here" \
  -e DATABASE_URL="file:/data/prod.db" \
  -v baas_data:/data \
  backend_for_apps
```

### docker-compose (recommended for local Docker dev)

```bash
# Copy and fill in your secrets
cp .env.example .env

# Build and start
docker compose up --build

# Stop
docker compose down
```

The SQLite database is persisted in a named Docker volume (`db_data`) so your data survives container restarts.

---

## Deploy to a Free Cloud Tier

### Render (https://render.com)

1. Push this repo to GitHub.
2. Create a new **Web Service** on Render, connect the repo.
3. Set **Build Command**: `npm install && npm run db:generate && npm run db:migrate:prod`
4. Set **Start Command**: `npm start`
5. Add environment variables (`JWT_SECRET`, `DATABASE_URL`, etc.) in the Render dashboard.
6. For SQLite: use a **Render Disk** (persistent storage) and set `DATABASE_URL=file:/data/prod.db`.
7. For PostgreSQL: add a free Render PostgreSQL instance and copy the connection string.

### Railway (https://railway.app)

1. Push to GitHub, create a new project on Railway.
2. Add a **PostgreSQL** plugin (free tier available).
3. Railway auto-injects `DATABASE_URL` — just update the Prisma provider to `postgresql`.
4. Set `JWT_SECRET` in Variables, then deploy.

### Heroku

```bash
heroku create my-baas-app
heroku config:set JWT_SECRET="your_secret"
heroku config:set DATABASE_URL="postgresql://..."  # from Heroku Postgres add-on
git push heroku main
heroku run npm run db:migrate:prod
```

---

## API Reference & curl Examples

> Replace `YOUR_TOKEN` and `YOUR_REFRESH_TOKEN` with values from the login response.

### Health Check
```bash
curl http://localhost:4000/health
```

### Register
```bash
curl -X POST http://localhost:4000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Passw0rd!"}'
# → 201 { "message": "Account created successfully.", "userId": 1 }
```

### Login
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Passw0rd!"}'
# → 200 { "access_token": "eyJ...", "refresh_token": "a3b4...", "token_type": "Bearer" }
```

### Refresh Token
```bash
curl -X POST http://localhost:4000/api/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
# → 200 { "access_token": "eyJ..." }
```

### Get Profile (protected)
```bash
curl http://localhost:4000/api/me \
  -H "Authorization: Bearer YOUR_TOKEN"
# → 200 { "user": { "id": 1, "email": "alice@example.com", "createdAt": "..." } }
```

### Store a value
```bash
curl -X POST http://localhost:4000/api/me/data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"theme","value":"dark"}'
# → 201 { "item": { "id": 1, "key": "theme", "value": "dark" } }
```

### Store a complex JSON value
```bash
curl -X POST http://localhost:4000/api/me/data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"settings","value":{"darkMode":true,"fontSize":16}}'
```

### Get all stored data
```bash
curl http://localhost:4000/api/me/data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update a value
```bash
curl -X PUT http://localhost:4000/api/me/data/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"light"}'
```

### Delete a value
```bash
curl -X DELETE http://localhost:4000/api/me/data/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Logout
```bash
curl -X POST http://localhost:4000/api/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
```

---

## Demo Script (1–2 Minute Video Walkthrough)

Use this script to record a screen demo:

```
0:00  Open terminal. Show: node --version (≥ 18), npm --version.
0:05  cd backend_for_apps && npm install
0:20  cp .env.example .env (show the file briefly)
0:25  npm run db:generate && npm run db:migrate (type "init")
0:35  npm run dev → show "✅ running on http://localhost:4000"
0:40  Open second terminal.
0:42  curl /health → { "status": "ok" }
0:45  curl /api/register → 201
0:48  curl /api/login → copy access_token
0:52  curl /api/me with Bearer token → profile
0:55  curl POST /api/me/data with key/value → 201
0:58  curl GET /api/me/data → list with item
1:02  curl PUT /api/me/data/1 → updated value
1:06  curl DELETE /api/me/data/1 → deleted
1:10  Show npm test → all tests passing (green)
1:20  (Optional) docker compose up --build → show container starting
```

---

## Frontend Snippet

See `frontend-snippet.js` in the project root for a complete example showing:
- `register(email, password)`
- `login(email, password)` → stores tokens in memory
- `refreshAccessToken()` — called automatically on 401
- `authFetch(path, options)` — authenticated wrapper
- `storeValue(key, value)` — stores any JSON
- `logout()` — revokes refresh token

---

## Postman Collection

Import `postman-collection.json` into Postman. The collection:
- Auto-captures `access_token` and `refresh_token` after Login.
- Auto-captures `item_id` after creating a data item.
- Includes test assertions on Register (201) and Login token presence.

---

## College Application Bullets

- **Designed and built a full-stack Backend-as-a-Service (BaaS)** in Node.js/Express with JWT authentication (access + refresh token rotation), bcrypt password hashing, and a generic per-user JSON data store backed by Prisma ORM and SQLite/PostgreSQL.
- **Applied production security practices** including CORS configuration, token expiry and revocation, ownership-verified CRUD operations, and input validation — all covered by a 20+ assertion Jest/supertest integration test suite.
- **Containerised and deployed the service** using Docker (multi-stage build, non-root user), docker-compose, and cloud platforms (Render/Railway/Heroku), writing thorough developer documentation with curl examples and a sample frontend fetch integration.

---

## Security Notes

| Concern | Mitigation |
|---|---|
| Password storage | bcrypt with 12 rounds (≈ 250 ms/hash) |
| Access token leakage | Short 15-minute expiry |
| Refresh token theft | Stored in DB, can be individually revoked |
| Token forgery | HS256 + strong secret |
| Enumeration timing | `bcrypt.compare` runs even when user not found |
| Injection | Prisma uses parameterised queries everywhere |
| CORS | Explicit allowlist, configurable via env |

---

## License

MIT — free to use, modify, and deploy in personal and commercial projects.
