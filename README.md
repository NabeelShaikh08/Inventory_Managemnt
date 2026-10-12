# Inventory Management System

A full-stack inventory management application built with **Django REST Framework** and **React + TypeScript**, developed as a take-home project for Al Yafour General Contracting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, Django 5.2, Django REST Framework, SimpleJWT |
| Frontend | React 19, TypeScript, Vite, TanStack Query, Tailwind CSS |
| Auth | JWT (access + refresh tokens) |
| Testing | pytest + pytest-django (backend) |
| Optional | Docker Compose |

---

## Quick Start (without Docker)

### Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations and load seed data
python manage.py migrate
python manage.py loaddata inventory/fixtures/initial_data.json
python manage.py seed_users

# Start the API server
python manage.py runserver
# → http://localhost:8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy the environment file (already set to localhost:8000)
cp .env.example .env

# Start the dev server
npm run dev
# → http://localhost:5173
```

---

## Quick Start (with Docker Compose)

```bash
docker compose up --build
```

- Frontend → http://localhost:5173  
- Backend API → http://localhost:8000/api/  
- Django Admin → http://localhost:8000/admin/

---

## Test Login Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | Superuser (full Django Admin access) |
| `storekeeper` | `Store@123` | Standard user |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Obtain JWT access + refresh tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/categories/` | List all categories |
| GET | `/api/products/` | List products (supports `?search=`, `?category=`, `?page=`) |
| POST | `/api/products/` | Create a product |
| GET | `/api/products/{id}/` | Retrieve a product |
| PATCH | `/api/products/{id}/` | Partially update a product |
| DELETE | `/api/products/{id}/` | Delete a product |

All `/api/products/` and `/api/categories/` endpoints require a `Authorization: Bearer <token>` header.

---

## Running Tests

```bash
cd backend
pytest inventory/tests.py -v
```

17 tests covering: authentication, JWT token flow, category listing, full product CRUD, search, category filter, pagination structure, and all validation rules (price > 0, stock ≥ 0).

---

## Seed Data

35 real construction materials across 10 professional categories drawn from a Dubai construction inventory catalogue:

- **CEM** – Cement & Concrete (OPC 50 kg, Ready-Mix C30, SRC, Non-Shrink Grout)
- **STL** – Steel & Rebar (12 mm, 16 mm, 20 mm rebar, mesh, I-beam)
- **AGG** – Aggregates (washed sand, crushed stone 10/20 mm)
- **MSN** – Masonry (hollow blocks, AAC blocks, clay bricks)
- **ELE** – Electrical (copper cable, PVC conduit, distribution board)
- **PLB** – Plumbing (uPVC pipe, PPR pipe, ball valve)
- **FIN** – Finishes (porcelain tile, emulsion paint, gypsum board, tile adhesive)
- **PPE** – Safety & PPE (helmet, full-body harness, steel-toe boots)
- **TLS** – Tools & Equipment (angle grinder, SDS+ drill, concrete vibrator)
- **FRM** – Formwork (shuttering plywood, adjustable props, H20 timber beam)

---

## Key Technical Decisions

### 1. JWT over Session auth
JWT is stateless and more suitable for a React SPA that calls the API separately. The refresh token interceptor in `axios.ts` silently renews expired access tokens, keeping the UX smooth without forcing re-login mid-session.

### 2. TanStack Query for data fetching
TanStack Query handles caching, background re-fetching, and loading/error state — removing a significant amount of boilerplate. `placeholderData` keeps the previous page visible while a new page loads, preventing layout shifts during pagination.

### 3. Zod + react-hook-form for form validation
Zod schemas are defined once and used for both client-side validation and TypeScript type inference, ensuring the form data types and validation rules never go out of sync. Field-level errors from the API are mapped back to the form with `setError`.

### 4. Debounced search (300 ms)
The search input fires a new API call 300 ms after the user stops typing. This reduces unnecessary requests without making the search feel sluggish.

### 5. Server-side pagination
The backend returns paginated results; the browser never loads the full product list. The pagination component generates page numbers with ellipsis for long lists and resets to page 1 when search or filters change.

### 6. Modular folder structure
```
backend/
  inventory/
    models.py         # Category + Product
    serializers.py    # Validation lives here
    filters.py        # django-filter integration
    views.py          # ViewSets only, no logic
    tests.py          # All pytest tests in one file

frontend/src/
  api/               # One file per resource
  components/        # Reusable UI (form, dialogs, navbar)
  context/           # Auth state
  hooks/             # useDebounce
  pages/             # LoginPage, ProductsPage
  types/             # Shared TypeScript interfaces
```

---

## What I Would Improve With More Time

1. **Frontend tests** – Jest + React Testing Library for the Login page (form validation paths) and the Products table (filter + pagination interactions).
2. **Optimistic updates** – Update the cache immediately on edit/delete instead of waiting for the server round-trip, making the UI feel instant.
3. **Role-based access** – Separate the Django user into `admin` and `viewer` roles; viewers can see but not modify products.
4. **Dashboard / stats card** – A header row showing total products, total stock value (AED), and out-of-stock count gives management a quick snapshot.
5. **PostgreSQL in production** – SQLite is fine for development and the demo, but a production deployment would use PostgreSQL for concurrent writes and proper connection pooling.
6. **Environment-specific settings** – Split `settings.py` into `settings/base.py`, `dev.py`, and `prod.py` to manage secrets, `DEBUG`, and `ALLOWED_HOSTS` cleanly.
