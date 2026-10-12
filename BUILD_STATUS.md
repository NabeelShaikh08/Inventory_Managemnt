# Build Status — Inventory Management System

Al Yafour General Contracting · Full-Stack Interview Project

---

## Live URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | https://inventory-managemnt.onrender.com | ✅ Live |
| Backend API | https://alyafour-backend.onrender.com/api/ | ✅ Live |
| Django Admin | https://alyafour-backend.onrender.com/admin/ | ✅ Live |

> **Note:** Render free tier sleeps after 15 min of inactivity. First request after idle takes ~30 seconds to wake up.

---

## Test Credentials

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `storekeeper` | `Store@123` | Maker | Submit & withdraw stock requests, view inventory |
| `checker` | `Checker@123` | Checker | Approve / reject requests, view inventory |
| `admin` | `Admin@123` | Super Admin | Everything — direct CRUD + approval workflow |

---

## What Is Built ✅

### Backend
- [x] `Category` model with code (CEM, STL, AGG, etc.)
- [x] `Product` model with name, price, stock, category, is_active, timestamps
- [x] `UserProfile` model linking Django users to roles (maker / checker / superadmin)
- [x] `StockRequest` model — header with status, document ref, remarks, timestamps
- [x] `RequestLine` model — per-line actions (stock_in / new_product / edit_product)
- [x] Full CRUD API via DRF ModelViewSets
- [x] JWT authentication (8h access / 1d refresh) via SimpleJWT
- [x] `/api/me/` endpoint returning authenticated user + role
- [x] Role-based permission classes (IsMaker, IsChecker, IsSuperAdmin, IsCheckerOrSuperAdmin)
- [x] Four-eyes rule enforced on decide endpoint
- [x] Pagination (10/page), search, category filter
- [x] Price > 0 and stock ≥ 0 validation
- [x] 35 seed products across 10 Dubai construction categories
- [x] 3 seed users with UserProfiles (admin, checker, storekeeper)
- [x] 17 pytest tests — all passing
- [x] Gunicorn + WhiteNoise for production
- [x] Docker + Docker Compose setup
- [x] Deployed on Render

### Frontend
- [x] Login page with JWT auth, Zod validation, show/hide password
- [x] Role-based routing (maker→/maker, checker→/checker, superadmin→/admin)
- [x] Role-aware Navbar with hamburger menu on mobile
- [x] MakerPage — submit requests, withdraw pending, view own history
- [x] CheckerPage — approval queue, per-line approve/reject with reason
- [x] SuperAdminPage — stats dashboard, all requests, full inventory access
- [x] ProductsPage — read-only for Maker/Checker, full CRUD for SuperAdmin
- [x] StockRequestForm — multi-line form (stock_in / new_product / edit_product)
- [x] StockRequestDetail — request viewer + inline decision panel for Checker/Admin
- [x] ProductForm — Add/Edit with Zod + react-hook-form, inline field errors
- [x] DeleteConfirmDialog — confirmation before delete
- [x] TanStack Query — caching, background refetch, stale time 30s
- [x] 300ms debounced search
- [x] JWT refresh interceptor (silent token renewal on 401)
- [x] Loading skeleton rows, error + retry, empty states
- [x] Responsive design — mobile + desktop
- [x] Al Yafour branded logo and orange (#ED7E07) colour scheme
- [x] `_redirects` file for SPA routing on Render
- [x] Deployed on Render Static Site

---

## What Is NOT Built ❌

These are items from the full PRD v2 that were scoped out for the interview submission. They represent the production roadmap.

| Feature | Reason not built |
|---------|-----------------|
| Active / Inactive / **Expired** product states | PRD has 3 states; current build uses boolean is_active only |
| SKU auto-generation (e.g. `CEM-0001`) | PRD Phase 2 feature |
| Product image upload | Not in company brief; PRD Phase 2 |
| Stock ledger (append-only history) | PRD architecture; current build uses direct integer field |
| Audit trail with hash chaining | PRD enterprise requirement |
| Bilingual English + Arabic (RTL) | PRD requirement; not in company brief |
| Bulk CSV stock upload | PRD convenience feature |
| AI Checker copilot / smart search | PRD Part 7 (AI phase) |
| PostgreSQL database | Using SQLite (fine for demo; needs Postgres for production) |
| Persistent data across deploys | Free Render tier has no persistent disk |
| Frontend unit tests | Jest + React Testing Library not yet added |
| Optimistic UI updates | TanStack Query mutation cache not wired up |

---

## Environment Variables

### Backend (Render Web Service)

| Variable | Value | Purpose |
|----------|-------|---------|
| `SECRET_KEY` | `<random string>` | Django secret key |
| `DEBUG` | `False` | Disable debug mode in production |
| `ALLOWED_HOSTS` | `alyafour-backend.onrender.com` | Restrict host headers |
| `CORS_ALLOWED_ORIGINS` | `https://inventory-managemnt.onrender.com` | Allow frontend origin |
| `PYTHON_VERSION` | `3.11.9` | Pin Python version |

### Frontend (Render Static Site)

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://alyafour-backend.onrender.com/api` | Backend API base URL |

---

## Running Locally

```bash
# Backend (Terminal 1)
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata inventory/fixtures/initial_data.json
python manage.py seed_users
python manage.py runserver
# → http://localhost:8000

# Frontend (Terminal 2)
cd frontend
npm install
# .env already set to localhost:8000
npm run dev
# → http://localhost:5173
```

Or with Docker:
```bash
docker compose up --build
```

---

## Running Tests

```bash
cd backend
pytest inventory/tests.py -v
# 17 passed
```

---

## Commit History

| Commit | Description |
|--------|-------------|
| `feat: backend` | Django models, DRF CRUD, JWT, 35 seed products, 17 tests |
| `feat: frontend` | React login, products table, forms, responsive UI |
| `feat: docker + readme` | Docker Compose, comprehensive README |
| `feat: maker-checker-superadmin` | Full role system, approval workflow, logo |
| `fix: new_product approval + admin decide` | Bug fixes for line approval and admin permissions |
| `fix: mobile responsiveness` | Hamburger menu, responsive grids, modal padding |
| `chore: render deployment` | Gunicorn, WhiteNoise, production settings |
| `fix: SPA routing` | `_redirects` for Render static site |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend language | Python | 3.11 |
| Backend framework | Django + DRF | 5.2 + 3.18 |
| Authentication | SimpleJWT | 5.5 |
| Database | SQLite | — |
| Frontend framework | React + TypeScript | 19 + 5 |
| Build tool | Vite | 8 |
| Data fetching | TanStack Query | v5 |
| Forms + validation | react-hook-form + Zod | — |
| Styling | Tailwind CSS | v4 |
| HTTP client | axios | — |
| Icons | lucide-react | — |
| Backend tests | pytest + pytest-django | — |
| Containerisation | Docker + Compose | — |
| Hosting | Render | — |
