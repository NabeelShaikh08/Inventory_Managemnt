# Inventory Management System — Project Context for Claude

## What This Project Is

A full-stack inventory management system built as a **take-home interview project** for **Al Yafour General Contracting** (Dubai construction company). Nabeel applied for a Full-Stack Developer + UI/UX role there.

**GitHub repo:** https://github.com/NabeelShaikh08/Inventory_Managemnt  
**Deadline:** ~2026-10-14 (2 days from receiving the brief on 2026-10-12)  
**Working directory:** `C:\Users\nabeel\inventory management`

---

## What the Company Actually Asked For (the brief from WhatsApp images)

This is the evaluation criteria. Build this and build it well.

### Backend — Django + Django REST Framework
1. Models: `Category(name)` and `Product(name, price, stock, category, is_active, created_at)`
2. Full CRUD API using DRF ViewSets + Serializers
3. Pagination, filtering by category, search by product name
4. Validation: price > 0, stock cannot be negative
5. JWT or Token authentication
6. Seed data / fixtures with at least 20 products across several categories

### Frontend — React + TypeScript
1. Login page connected to backend JWT auth
2. Products table with pagination, category filter, debounced search
3. Add/Edit product form with validation and clear error messages
4. Delete product with confirmation step
5. Loading, error, empty states throughout
6. Responsive design (desktop + mobile)

### Bonus (optional, all implemented)
- Docker Compose setup
- Unit tests (pytest backend)
- TanStack Query for data fetching
- README with setup, credentials, decisions, improvements

### Deliverables
- Public GitHub repo with clear commit history (NOT a single commit — the company explicitly said this)
- README with: setup instructions, test login credentials, key technical decisions, what to improve

---

## What Has Been Built and Is On GitHub (3 commits)

### Commit 1: Backend
- `Category` + `Product` Django models
- Full CRUD via `ModelViewSet` + `Serializers`
- JWT auth via `djangorestframework-simplejwt`
- Pagination (10/page), `?search=`, `?category=` filter
- Validation: price > 0, stock ≥ 0
- **35 real Dubai construction materials** as seed data across 10 categories
- 17 pytest tests — all passing

### Commit 2: Frontend
- Login page with JWT auth, Zod validation, show/hide password
- Products table: TanStack Query, 300ms debounced search, category filter, pagination with ellipsis
- Add/Edit modal: Zod + react-hook-form, inline errors, API error mapping
- Delete confirmation dialog
- Loading skeleton rows, error+retry, empty state
- Responsive with Tailwind CSS
- Token refresh interceptor (silently renews expired tokens)

### Commit 3: Docker + README
- `Dockerfile` for backend (python:3.11-slim) and frontend (nginx multi-stage)
- `docker-compose.yml` — one command to run everything
- Comprehensive README (setup, credentials, API reference, technical decisions, improvements)

---

## Tech Stack (what is actually in the code)

| Layer | Technology |
|---|---|
| Backend language | Python 3.11 |
| Backend framework | Django 5.2 + Django REST Framework 3.18 |
| Authentication | JWT via `djangorestframework-simplejwt` (Bearer tokens, 8h access / 1d refresh) |
| Database | **SQLite** (`backend/db.sqlite3`) — file-based, fine for demo/dev |
| Frontend framework | React 19 + TypeScript (Vite) |
| Data fetching | TanStack Query (React Query v5) |
| Forms + validation | react-hook-form + Zod |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Icons | lucide-react |
| HTTP client | axios (with JWT interceptor) |
| Backend tests | pytest + pytest-django |
| Containerisation | Docker + Docker Compose |

---

## Test Credentials (in the running database and in README)

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | Superuser — can use Django Admin at /admin/ |
| `storekeeper` | `Store@123` | Standard user |

Both users can do everything in the app (login, view, add, edit, delete products). There is **no role-based access control** in the current build — see the gap analysis below.

---

## How to Run Locally

```bash
# Terminal 1 — Backend
cd "C:\Users\nabeel\inventory management\backend"
python manage.py runserver
# → http://localhost:8000

# Terminal 2 — Frontend
cd "C:\Users\nabeel\inventory management\frontend"
npm run dev
# → http://localhost:5173
```

Or with Docker:
```bash
cd "C:\Users\nabeel\inventory management"
docker compose up --build
```

Python path on this machine: `C:\Users\nabeel\AppData\Local\Programs\Python\Python311\python`  
Node path: `/c/Program Files/nodejs` (must be in PATH when using bash: `export PATH="/c/Program Files/nodejs:$PATH"`)

---

## HONEST GAP ANALYSIS — What the PRD v2 Describes vs What Was Built

The PRD v2 (`C:\Users\nabeel\Downloads\PRD v2.docx`) describes a **much larger, enterprise-grade system** with multiple phases. The company brief from WhatsApp asks for a **simplified "Mini Inventory System"**. Here is the honest gap:

### What the PRD has that we did NOT build (by design for Phase 1 of the interview)

#### 1. Maker-Checker-SuperAdmin role system
The PRD defines 3 distinct roles:
- **Maker** (storekeeper) — proposes changes, never writes directly to inventory
- **Checker** (supervisor) — reviews and approves/rejects Maker requests
- **SuperAdmin** — full control, settings, user management

**What we built:** Two plain Django users (`admin`, `storekeeper`) with no role enforcement. Any logged-in user can do everything. The company brief only asked for "simple authentication" — not the full Maker-Checker workflow.

**To implement properly:** Add a `role` field to a UserProfile model, enforce it in DRF permission classes, build the request/approval queue, and add Checker approval screens in the frontend.

#### 2. Maker-Checker approval workflow
The PRD's core principle: a Maker never writes to live inventory. Every change is a "Request" with status Pending → Approved/Rejected. The Checker decides line by line. Only on approval does stock actually change.

**What we built:** Direct CRUD — any user edits the database immediately. No request queue, no approval step.

#### 3. SKU code system
The PRD defines auto-generated SKU codes like `CEM-0001`, `STL-0003` assigned at Checker approval.

**What we built:** Products have IDs (integers) and category codes, but no auto-generated SKU code field on the product itself.

#### 4. Product images / photos
The PRD requires at least 1 photo per new SKU, stored with original + display copy + thumbnail. The Checker sees the photo before approving.

**What we built:** No image/photo upload support at all. The company brief didn't mention images either.

#### 5. Stock ledger (append-only)
The PRD uses a `StockLedger` table where on-hand = sum of all ledger entries. No direct quantity edits — only ledger entries.

**What we built:** A simple `stock` integer field on Product. Direct edits are allowed.

#### 6. Audit trail
The PRD requires an append-only audit log with hash chaining (tamper-evident).

**What we built:** `created_at` and `updated_at` timestamps only. No audit log.

#### 7. Bilingual (English + Arabic)
The PRD requires full RTL Arabic support, dual item names, Arabic-normalised search.

**What we built:** English only.

#### 8. Bulk CSV upload
The PRD allows Makers to upload a CSV of multiple stock-in lines at once.

**What we built:** Single-product form only.

#### 9. Smart search / AI Checker copilot
Part 7 of the PRD describes AI-assisted search and a Checker review summary.

**What we built:** Standard DRF `SearchFilter` (keyword matching on name/description/category).

---

## What Was Deliberately Scoped to Match the Company Brief

The company brief (WhatsApp images) asked for exactly:
- Category + Product models ✅
- Full CRUD API ✅
- Pagination + filter + search ✅
- Price > 0, stock ≥ 0 validation ✅
- JWT authentication ✅
- 20+ seed products ✅ (35 real items)
- Login page ✅
- Products table with filter/search/pagination ✅
- Add/Edit form with validation ✅
- Delete with confirmation ✅
- Loading/error/empty states ✅
- Responsive design ✅
- Docker Compose ✅ (bonus)
- pytest tests ✅ (bonus, 17 passing)
- TanStack Query ✅ (bonus)
- README ✅

The PRD is Nabeel's extended vision for what the full production system would eventually become. The company brief is what the interview evaluates.

---

## What storekeeper vs admin Means in Current Build

**Right now there is NO functional difference** between `admin` and `storekeeper` in the app UI. Both can log in and do full CRUD. The only difference is:
- `admin` has `is_superuser=True` → can access `/admin/` Django admin panel
- `storekeeper` has `is_superuser=False` → cannot access `/admin/`

To align with the PRD's Maker-Checker model in a future session, the roles should be:
- `storekeeper` → Maker (proposes stock changes, cannot approve)
- `checker` → Checker (approves/rejects requests)
- `admin` → SuperAdmin (all permissions)

---

## Files of Note

```
inventory management/
├── CLAUDE.md                          ← this file
├── README.md                          ← user-facing docs
├── docker-compose.yml
├── backend/
│   ├── config/
│   │   ├── settings.py               ← Django settings, JWT config, CORS
│   │   └── urls.py                   ← API routes
│   ├── inventory/
│   │   ├── models.py                 ← Category + Product models
│   │   ├── serializers.py            ← Validation (price, stock)
│   │   ├── filters.py                ← django-filter (category, price range)
│   │   ├── views.py                  ← CategoryViewSet + ProductViewSet
│   │   ├── urls.py                   ← DRF router
│   │   ├── admin.py                  ← Django admin registration
│   │   ├── tests.py                  ← 17 pytest tests
│   │   ├── fixtures/initial_data.json ← 35 seed products + 10 categories
│   │   └── management/commands/seed_users.py ← creates admin + storekeeper
│   ├── requirements.txt
│   ├── pytest.ini
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── App.tsx                   ← BrowserRouter, QueryClient, AuthProvider, routes
    │   ├── main.tsx                  ← entry point
    │   ├── index.css                 ← Tailwind import
    │   ├── api/
    │   │   ├── axios.ts              ← axios instance + JWT interceptor + refresh logic
    │   │   ├── auth.ts               ← login()
    │   │   ├── products.ts           ← getProducts, createProduct, updateProduct, deleteProduct
    │   │   └── categories.ts         ← getCategories
    │   ├── components/
    │   │   ├── Navbar.tsx            ← top nav with username + logout
    │   │   ├── ProductForm.tsx       ← Add/Edit modal (Zod + react-hook-form)
    │   │   └── DeleteConfirmDialog.tsx ← delete confirmation modal
    │   ├── context/
    │   │   └── AuthContext.tsx       ← isAuthenticated, login(), logout(), username
    │   ├── hooks/
    │   │   └── useDebounce.ts        ← 300ms debounce for search input
    │   ├── pages/
    │   │   ├── LoginPage.tsx         ← login form with server error display
    │   │   └── ProductsPage.tsx      ← main table with search/filter/pagination
    │   └── types/
    │       └── index.ts              ← Category, Product, PaginatedResponse, etc.
    ├── .env.example                  ← VITE_API_URL=http://localhost:8000/api
    ├── vite.config.ts
    ├── package.json
    └── Dockerfile
```

---

## Reference Documents (in C:\Users\nabeel\Downloads\)

- `PRD v2.docx` — Full product requirements document (8 parts, enterprise-grade vision)
- `System Architecture.docx` — Architecture notes and engineering decisions
- `Enginerring marvel.xlsx` — 7 "engineering showcase" demonstrations for interviews
- `dubai_construction_inventory_catalogue.xlsx` — 546 real Dubai construction items (used as seed data source)

---

## Important Rules for This Project

1. **Never add Claude as co-author in git commits** — commits must look like Nabeel's own work
2. **Commit module by module** — not in a single giant commit (company evaluates commit history)
3. Database is **SQLite** (file at `backend/db.sqlite3`) — do NOT switch to PostgreSQL without asking
4. The company brief (WhatsApp images) is the evaluation criteria, not the full PRD
5. The PRD is the roadmap for what to build AFTER the interview if Nabeel gets the job
