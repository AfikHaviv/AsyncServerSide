# Cost Manager — Microservices Final Project

A distributed cost tracking system built with Node.js, Express, and MongoDB. The system is composed of four independent microservices that communicate over HTTP and share a single MongoDB Atlas cluster.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Services](#services)
  - [Users Service](#users-service-port-3001)
  - [Costs Service](#costs-service-port-3002)
  - [Admin Service](#admin-service-port-3003)
  - [Logs Service](#logs-service-port-3004)
- [Tech Stack](#tech-stack)
- [Data Models](#data-models)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Design Patterns](#design-patterns)
- [Testing](#testing)
- [Deployment](#deployment)
- [Team](#team)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client / Tests                       │
└────────┬───────────┬──────────────┬──────────────┬──────────┘
         │           │              │              │
         ▼           ▼              ▼              ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  Users   │ │  Costs   │ │  Admin   │ │  Logs    │
   │ :3001    │ │ :3002    │ │ :3003    │ │ :3004    │
   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
        │             │            │             │
        │   ◄─────────┘ (HTTP)     │             │
        │                          │             │
        └──────────┬───────────────┘─────────────┘
                   ▼
          ┌─────────────────┐
          │  MongoDB Atlas  │
          │  cost-manager-db│
          └─────────────────┘
           users | costs | reports | logs
```

- Each service is independently deployable and maintains its own Express app.
- The **Costs Service** calls the **Users Service** over HTTP to validate that a user exists before adding a cost.
- All services write structured HTTP logs to a shared `logs` collection in MongoDB via `pino-mongodb`.
- The **Logs Service** exposes those logs through a query API.

---

## Services

### Users Service (Port 3001)

Manages user accounts and aggregates per-user total spending.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/add` | Create a new user |
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:id` | Get a user with their total costs |
| `GET` | `/` | Health check |

---

### Costs Service (Port 3002)

Handles expense entries and generates monthly spending reports.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/add` | Add a new cost entry |
| `GET` | `/api/report` | Get monthly report (`?id=&year=&month=`) |
| `GET` | `/` | Health check |

**Supported categories:** `food`, `health`, `housing`, `sports`, `education`

---

### Admin Service (Port 3003)

Returns static information about the development team.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/about` | Get team member details |
| `GET` | `/` | Health check |

---

### Logs Service (Port 3004)

Retrieves all HTTP request logs written by every service.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/logs` | Fetch all logged HTTP requests |
| `GET` | `/` | Health check |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (CommonJS) |
| Framework | Express 5 |
| Database | MongoDB Atlas via Mongoose 9 |
| Logging | Pino + pino-http + pino-mongodb |
| HTTP client | Axios (costs-service → users-service) |
| Testing | Jest + Supertest |
| Dev server | Nodemon (admin-service) |
| Deployment | Render |

---

## Data Models

### User

```js
{
  id:         Number,   // unique, required
  first_name: String,   // required, trimmed
  last_name:  String,   // required, trimmed
  birthday:   Date      // required
}
```

### Cost

```js
{
  userid:      Number,  // required — must match an existing user
  description: String,  // required, trimmed
  category:    String,  // required — food | health | housing | sports | education
  sum:         Number,  // required, > 0
  created_at:  Date     // optional, defaults to now — cannot be a past date
}
```

### Report (cache)

```js
{
  userid:     Number,   // required
  year:       Number,   // required
  month:      Number,   // 1–12, required
  data:       Object,   // cached report payload
  created_at: Date      // auto-set to now
  // unique index on (userid, year, month)
}
```

### Log (auto-created by pino-mongodb)

```js
{
  service:        String,
  method:         String,
  url:            String,
  statusCode:     Number,
  responseTimeMs: Number,
  time:           String  // ISO timestamp
}
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Access to the shared MongoDB Atlas cluster (see [Environment Variables](#environment-variables))

### Install & run each service

```bash
# Clone the repo
git clone <repo-url>
cd final_project

# Users Service
cd users-service && npm install && npm start

# Costs Service (new terminal)
cd costs-service && npm install && npm start

# Admin Service (new terminal)
cd admin-service && npm install && npm start

# Logs Service (new terminal)
cd logs-service && npm install && npm start
```

Services start on ports **3001–3004** by default (overridable via the `PORT` env var).

---

## Environment Variables

Create a `.env` file inside each service directory. All services share the same MongoDB URI.

### All services

```env
PORT=3001                          # Adjust per service: 3001–3004
SERVICE_NAME=Users-Service         # Identifier used in log entries
MONGODB_URI=URI_HERE                     # MongoDB Atlas connection string
```

### Costs Service only

```env
USERS_SERVICE_URL=http://localhost:3001   # Base URL of the users-service
```

> In production/Render deployments, replace `localhost` URLs with the actual service URLs.

---

## API Reference

### POST /api/add — Users Service

Creates a new user.

**Request body:**
```json
{
  "id": 123,
  "first_name": "Jane",
  "last_name": "Doe",
  "birthday": "1995-06-15"
}
```

**Success (201):**
```json
{
  "id": 123,
  "first_name": "Jane",
  "last_name": "Doe",
  "birthday": "1995-06-15T00:00:00.000Z"
}
```

---

### GET /api/users/:id — Users Service

Returns a user and the sum of all their recorded costs.

**Success (200):**
```json
{
  "id": 123,
  "first_name": "Jane",
  "last_name": "Doe",
  "total": 540.5
}
```

---

### POST /api/add — Costs Service

Adds a cost entry. Calls the Users Service to verify the user exists.

**Request body:**
```json
{
  "userid": 123,
  "description": "Weekly groceries",
  "category": "food",
  "sum": 85.50,
  "created_at": "2025-03-10"
}
```

**Success (201):** Returns the saved cost document.

---

### GET /api/report — Costs Service

Returns a monthly breakdown grouped by category.

**Query params:** `id`, `year`, `month`

**Example:** `GET /api/report?id=123&year=2025&month=3`

**Success (200):**
```json
{
  "userid": 123,
  "year": 2025,
  "month": 3,
  "costs": {
    "food":     [{ "description": "Weekly groceries", "sum": 85.50, "day": 10 }],
    "health":   [],
    "housing":  [],
    "sports":   [],
    "education":[]
  }
}
```

---

### GET /api/about — Admin Service

**Success (200):**
```json
[
  { "first_name": "Afik",  "last_name": "Haviv" },
  { "first_name": "Eden",  "last_name": "Shmatman" },
  { "first_name": "Mor",   "last_name": "Sigman" }
]
```

---

### GET /api/logs — Logs Service

**Success (200):** Array of all log documents stored in the `logs` collection.

---

## Error Handling

All errors follow a consistent shape:

```json
{ "id": "ERROR_CODE", "message": "Human-readable description" }
```

| Code | HTTP | Meaning |
|------|------|---------|
| `MISSING_ID` | 400 | Required `id` parameter not provided |
| `INVALID_ID` | 400 | `id` is not a valid number |
| `USER_EXISTS` | 409 | A user with this `id` already exists |
| `USER_NOT_FOUND` | 404 | No user found for the given `id` |
| `MISSING_FIELDS` | 400 | One or more required body fields are absent |
| `INVALID_CATEGORY` | 400 | Category is not one of the five allowed values |
| `PAST_DATE_NOT_ALLOWED` | 400 | `created_at` date is in the past |
| `LOGS_FETCH_ERROR` | 500 | Failed to retrieve logs from MongoDB |
| `SERVER_ERROR` / `INTERNAL_ERROR` | 500 | Unexpected server-side error |

---

## Design Patterns

### Computed (Report Caching)

Monthly reports for **past months** are computed once and stored in the `reports` collection. Subsequent requests for the same `(userid, year, month)` return the cached document without re-querying the `costs` collection.

Reports for the **current month** are always recomputed on demand, since new costs may still be added.

### Centralized Logging

Every service includes the same `logger.js` file, which wires `pino-http` middleware to write structured log entries (method, URL, status code, response time) to a shared MongoDB `logs` collection. In `NODE_ENV=test`, the transport is switched to stdout to avoid MongoDB connections during unit tests.

### Service-to-Service HTTP Calls

The Costs Service validates user existence by making a `GET /api/users/:id` call to the Users Service before persisting a new cost. This keeps each service's data authoritative while allowing cross-service business rules.

---

## Testing

Each service contains a `tests/` directory with Jest + Supertest specs. Mongoose models and Axios calls are mocked so tests run without a live database or network.

```bash
# Run tests for a specific service
cd users-service && npm test
cd costs-service && npm test
cd admin-service && npm test
cd logs-service && npm test
```

An end-to-end integration script is also available:

```bash
# Tests against the live Render deployments
python test.py
```

The script exercises the full flow: fetch team info → get a report → add a cost → verify the report updates.

---

## Deployment

All services are deployed on **Render**.

| Service | URL |
|---------|-----|
| Users | `https://user-service-asyncserverside.onrender.com` |
| Costs | `https://costs-service-asyncserverside.onrender.com` |
| Admin | `https://asyncserverside.onrender.com` |
| Logs | `https://logs-service-asyncserverside.onrender.com` |

Each service is deployed independently. Update `USERS_SERVICE_URL` in the Costs Service environment to point to the deployed Users Service URL when running in production.

---

## Team

| Name | Last Name |
|------|-----------|
| Afik | Haviv |
| Eden | Shmatman |
| Mor | Sigman |
