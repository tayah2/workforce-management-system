# Workforce Management System (WMS)

A full-stack workforce management application built for care agencies. It handles GPS-verified attendance, shift scheduling, automated payroll, training, documents, internal messaging, absence tracking, and an AI assistant — all behind a JWT-authenticated REST API.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Demo Accounts](#demo-accounts)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Security](#security)
9. [Configuration](#configuration)
10. [Running Tests](#running-tests)

---

## Features

### Employee Features
- **GPS Check-In / Check-Out** — verifies the employee is physically on-site using the Haversine formula
- **My Schedule** — weekly calendar view of assigned shifts; confirm shifts directly
- **Available Shifts** — browse and claim open shifts posted by admin
- **Payroll** — view earnings breakdown (regular + overtime) for any date range
- **Absences** — submit sick leave, holiday, or emergency absence requests; track approval status
- **Training** — read and complete mandatory training modules; progress bar tracks completion
- **Documents** — browse company policies and procedures (Health & Safety, HR, GDPR, etc.)
- **Messages** — internal inbox/sent messaging with admin and colleagues
- **AI Assistant** — chat interface for shift, pay, and policy questions
- **Gamification** — earn points and badges for GPS-verified check-ins and streaks; leaderboard

### Admin Features
- All employee features plus full management views
- **Staff Management** — create, update, deactivate employee accounts; set hourly rates
- **Location Management** — manage care facilities with GPS coordinates and tolerance radius
- **Attendance Overview** — view all staff attendance with date/location filters
- **Full Payroll** — generate payroll for all employees; export to Excel
- **Schedule Management** — create, assign, and cancel shifts; post open shifts
- **Absence Review** — approve or reject absence requests with notes
- **Reports** — attendance summary, daily activity, location analytics, staff analytics; Excel export

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | Flask 3.0 |
| Database | SQLite via SQLAlchemy |
| Auth | Flask-JWT-Extended (access + refresh tokens) |
| CORS | Flask-CORS |
| Payroll export | pandas + openpyxl |
| AI Chat | Anthropic Claude API |
| Testing | pytest + pytest-flask |

### Frontend
| Component | Technology |
|-----------|-----------|
| UI Library | React 18 |
| Router | React Router v6 |
| HTTP client | Axios |
| Charts | Recharts |
| Build tool | Vite 5 |

---

## Project Structure

```
workforce-management-system/
│
├── backend/
│   ├── run.py                  # Entry point — creates app, seeds DB, starts server
│   ├── wsgi.py                 # WSGI entry point for production deployment
│   ├── requirements.txt        # Python dependencies
│   │
│   ├── app/
│   │   ├── __init__.py         # App factory (create_app)
│   │   ├── config.py           # Development / production config classes
│   │   ├── extensions.py       # SQLAlchemy, JWT, CORS extension singletons
│   │   ├── seeds.py            # Database seeder — users, locations, shifts, training, docs
│   │   │
│   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── user.py         # User (employees + admins)
│   │   │   ├── location.py     # Care facility locations
│   │   │   ├── check_in.py     # Attendance records with GPS
│   │   │   ├── shift.py        # Scheduled and open shifts
│   │   │   ├── absence.py      # Absence requests
│   │   │   ├── message.py      # Internal messages
│   │   │   ├── document.py     # Company documents
│   │   │   ├── training.py     # Training modules + completions
│   │   │   ├── gamification.py # Badges, points, streaks
│   │   │   └── notification.py # In-app notifications
│   │   │
│   │   ├── routes/             # Flask blueprints (one per domain)
│   │   │   ├── auth.py         # /api/auth — register, login, refresh, logout, me
│   │   │   ├── users.py        # /api/users — CRUD
│   │   │   ├── locations.py    # /api/locations — CRUD
│   │   │   ├── attendance.py   # /api/checkin, /api/checkout, /api/attendance
│   │   │   ├── shifts.py       # /api/shifts — scheduling + open shifts
│   │   │   ├── payroll.py      # /api/payroll — earnings + Excel export
│   │   │   ├── absences.py     # /api/absences — requests + admin review
│   │   │   ├── documents.py    # /api/documents
│   │   │   ├── training.py     # /api/training — modules + progress
│   │   │   ├── messages.py     # /api/messages — inbox + sent
│   │   │   ├── gamification.py # /api/gamification — profile, leaderboard, badges
│   │   │   ├── reports.py      # /api/reports — analytics + Excel export
│   │   │   ├── dashboard.py    # /api/dashboard/stats
│   │   │   ├── notifications.py# /api/notifications
│   │   │   └── chat.py         # /api/chat — AI assistant
│   │   │
│   │   └── services/
│   │       └── gamification_service.py  # Point and badge award logic
│   │
│   └── tests/
│       └── test_auth.py        # pytest tests for auth endpoints
│
├── frontend/
│   ├── index.html              # Vite HTML entry point
│   ├── vite.config.js          # Vite build configuration
│   ├── package.json
│   │
│   ├── src/
│   │   ├── main.jsx            # React root — mounts App with providers
│   │   ├── App.jsx             # Router setup and route definitions
│   │   ├── index.css           # Global styles and CSS variables
│   │   │
│   │   ├── api/
│   │   │   └── client.js       # Axios instance + all API call functions
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state — user, login(), logout()
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.jsx      # Sidebar + header shell
│   │   │   ├── ProtectedRoute.jsx # Redirects unauthenticated users to /login
│   │   │   ├── Modal.jsx       # Reusable modal dialog
│   │   │   ├── StatCard.jsx    # Dashboard stat tile
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── Toast.jsx       # Toast notification system
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Sign-in + self-registration form
│   │   │   ├── Dashboard.jsx   # Stats overview
│   │   │   ├── CheckIn.jsx     # GPS check-in / check-out
│   │   │   ├── Attendance.jsx  # Attendance history table
│   │   │   ├── Schedule.jsx    # Weekly shift calendar (admin table + employee view)
│   │   │   ├── AvailableShifts.jsx # Open shift board for employees
│   │   │   ├── Payroll.jsx     # Earnings and export
│   │   │   ├── Absence.jsx     # Absence requests
│   │   │   ├── Messages.jsx    # Internal messaging
│   │   │   ├── Documents.jsx   # Policy library
│   │   │   ├── Training.jsx    # Training modules
│   │   │   ├── Gamification.jsx# Points, badges, leaderboard
│   │   │   ├── Chat.jsx        # AI assistant
│   │   │   └── admin/          # Admin-only pages
│   │   │
│   │   └── utils/
│   │       └── formatters.js   # Date, time, currency formatting helpers
│   │
│   └── dist/                   # Production build output (served statically)
│
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.8 or later
- Node.js 18 or later + npm
- A modern browser

### 1 — Backend

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the server (auto-creates and seeds the database on first run)
python run.py
```

The API is available at **http://localhost:5000**

> The database file is created at `backend/instance/wms.db`. To reset it and re-seed from scratch, delete that file and restart.

### 2 — Frontend (development)

```bash
cd frontend

# Install Node dependencies (first time only)
npm install

# Start the Vite dev server with hot reload
npm run dev
```

Open **http://localhost:5173** in your browser.

### 2 — Frontend (production build)

```bash
cd frontend
npm run build      # compiles to frontend/dist/
npm run preview    # serves the built dist on http://localhost:4173
```

---

## Demo Accounts

All employee passwords are `password123`.

| Role | Username | Name | Hourly Rate |
|------|----------|------|-------------|
| Admin | `admin` | Admin User | — |
| Employee | `jsmith` | John Smith | £13.00 |
| Employee | `ejones` | Emily Jones | £12.50 |
| Employee | `mwilson` | Michael Wilson | £14.00 |
| Employee | `sbrown` | Sarah Brown | £12.00 |
| Employee | `dlee` | David Lee | £13.50 |
| Employee | `apatel` | Amira Patel | £12.75 |
| Employee | `cthomas` | Claire Thomas | £13.25 |
| Employee | `rchoudry` | Raj Choudry | £12.50 |
| Employee | `lbailey` | Laura Bailey | £14.50 |
| Employee | `omurphy` | Oliver Murphy | £11.75 |

You can also register a brand-new account from the login screen — new accounts are created as `employee` role.

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register a new employee account |
| POST | `/login` | — | Authenticate and receive JWT tokens |
| POST | `/refresh` | Refresh token | Get a new access token |
| POST | `/logout` | Required | Blacklist the current token |
| GET | `/me` | Required | Get the authenticated user's profile |

### Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Required | List all users (admin) or just self (employee) |
| GET | `/users/:id` | Required | Get a specific user |
| PUT | `/users/:id` | Required | Update user details |
| DELETE | `/users/:id` | Admin | Deactivate a user (soft delete) |

### Locations — `/api/locations`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/locations` | Required | List active locations |
| POST | `/locations` | Admin | Create a new care facility |
| PUT | `/locations/:id` | Admin | Update a location |
| DELETE | `/locations/:id` | Admin | Deactivate a location |

### Attendance — `/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkin` | Required | GPS check-in |
| POST | `/checkout` | Required | GPS check-out |
| GET | `/attendance` | Required | List attendance records (filterable) |
| GET | `/attendance/current` | Required | Get current open check-in |

### Shifts — `/api/shifts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/shifts` | Required | List shifts |
| GET | `/shifts/open` | Required | List unclaimed open shifts |
| POST | `/shifts` | Admin | Create a shift (assign or leave open) |
| PUT | `/shifts/:id` | Required | Update shift (e.g. confirm, cancel) |
| DELETE | `/shifts/:id` | Admin | Delete a shift |
| POST | `/shifts/:id/claim` | Employee | Claim an open shift |
| POST | `/shifts/:id/release` | Employee | Release a claimed shift |

### Payroll — `/api/payroll`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payroll` | Required | Payroll summary for a date range |
| GET | `/payroll/export` | Required | Download payroll as Excel |

### Absences — `/api/absences`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/absences` | Required | List absences (own or all for admin) |
| POST | `/absences` | Required | Submit an absence request |
| PUT | `/absences/:id` | Admin | Approve or reject with notes |

### Documents — `/api/documents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/documents` | Required | List all active documents |
| POST | `/documents` | Admin | Create a document |
| PUT | `/documents/:id` | Admin | Update a document |
| DELETE | `/documents/:id` | Admin | Deactivate a document |

### Training — `/api/training`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/training/modules` | Required | List training modules |
| GET | `/training/progress` | Required | Get own completion progress |
| POST | `/training/modules/:id/complete` | Required | Mark a module as complete |

### Messages — `/api/messages`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/messages/inbox` | Required | Received messages |
| GET | `/messages/sent` | Required | Sent messages |
| POST | `/messages` | Required | Send a message |

### Gamification — `/api/gamification`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/gamification/profile` | Required | Points, badges, and streak for current user |
| GET | `/gamification/leaderboard` | Required | Top employees by points |
| GET | `/gamification/badges` | Required | Badges earned by current user |
| GET | `/gamification/weekly-challenge` | Required | Current weekly challenge |

### Reports — `/api/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports/attendance-summary` | Required | Aggregate stats for a date range |
| GET | `/reports/daily-activity` | Required | Day-by-day breakdown |
| GET | `/reports/location-analytics` | Admin | Per-location stats |
| GET | `/reports/staff-analytics` | Admin | Per-employee stats |
| GET | `/reports/export` | Required | Attendance report as Excel |

### Dashboard — `/api/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard/stats` | Required | Summary stats for admin or employee view |

### AI Chat — `/api/chat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat` | Required | Send message to AI assistant |

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| username | String | Unique |
| email | String | Unique |
| password_hash | String | Werkzeug PBKDF2 |
| first_name | String | |
| last_name | String | |
| role | String | `admin` or `employee` |
| hourly_rate | Float | Used for payroll calculation |
| is_active | Boolean | Soft-delete flag |
| created_at | DateTime | |

### `locations`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| name | String | Care home name |
| address | String | |
| latitude | Float | WGS-84 decimal degrees |
| longitude | Float | WGS-84 decimal degrees |
| radius | Float | Tolerance in km (default 0.1 = 100 m) |
| is_active | Boolean | |

### `check_ins`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → users | |
| location_id | FK → locations | |
| check_in_time | DateTime | |
| check_out_time | DateTime | Null if still on shift |
| check_in_latitude/longitude | Float | Actual GPS coords recorded |
| check_out_latitude/longitude | Float | |
| is_check_in_verified | Boolean | True if within radius |
| is_check_out_verified | Boolean | |
| break_minutes | Integer | Deducted from hours worked |
| notes | Text | |

### `shifts`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → users | Null for open shifts |
| location_id | FK → locations | |
| scheduled_start | DateTime | |
| scheduled_end | DateTime | |
| status | String | `scheduled`, `confirmed`, `cancelled`, `completed` |
| notes | Text | |
| created_by | FK → users | Admin who posted the shift |

### `absences`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → users | |
| date | Date | Start date |
| end_date | Date | End date for multi-day absences |
| type | String | `sick`, `holiday`, `emergency`, `other` |
| reason | Text | |
| status | String | `pending`, `approved`, `rejected` |
| admin_notes | Text | Admin review notes |
| reviewed_by | FK → users | Admin who reviewed |
| reviewed_at | DateTime | |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| from_user_id | FK → users | |
| to_user_id | FK → users | |
| subject | String | |
| body | Text | |
| is_read | Boolean | |
| parent_id | FK → messages | For threaded replies |

### `documents`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| title | String | |
| description | Text | |
| category | String | `policy`, `procedure`, `health_safety`, `hr`, `training`, `general` |
| content | Text | Markdown-formatted body |
| is_active | Boolean | |
| uploaded_by | FK → users | |

### `training_modules`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| title | String | |
| description | Text | |
| category | String | |
| content | Text | Markdown body shown in modal |
| estimated_minutes | Integer | |
| order_num | Integer | Display order |
| is_active | Boolean | |

### `training_completions`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → users | |
| module_id | FK → training_modules | |
| completed_at | DateTime | |

### `badges`, `user_badges`, `point_transactions`, `streaks`
Gamification tables that track earned badges, point history, and consecutive work-day streaks.

---

## Security

- **Password hashing** — Werkzeug PBKDF2-SHA256 (never stored in plain text)
- **JWT access tokens** — 1-hour expiry; signed with `JWT_SECRET_KEY`
- **JWT refresh tokens** — 30-day expiry; used only to obtain new access tokens
- **Token blacklisting** — logout adds the token JTI to an in-memory blacklist
- **Role-based access** — admin-only routes check `user.role == 'admin'` server-side
- **GPS verification** — Haversine formula used to verify the employee is within the configured radius of the facility
- **Input validation** — all API inputs validated and sanitised before hitting the database
- **CORS** — restricted to configured `FRONTEND_URL` (defaults to `*` in development)

> **Production note:** Change `SECRET_KEY` and `JWT_SECRET_KEY` in the config before deploying. Consider switching the database to PostgreSQL and storing the JWT blacklist in Redis.

---

## Configuration

Configuration lives in `backend/app/config.py`. The relevant settings:

```python
# Secret keys — CHANGE THESE IN PRODUCTION
SECRET_KEY = 'wms-secret-key-change-in-production'
JWT_SECRET_KEY = 'jwt-secret-key-change-in-production'

# Token lifetimes
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

# Database
SQLALCHEMY_DATABASE_URI = 'sqlite:///wms.db'

# AI Chat (optional — set ANTHROPIC_API_KEY env var)
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
```

To enable the AI assistant, set your Anthropic API key:

```bash
# Windows
set ANTHROPIC_API_KEY=sk-ant-...

# macOS / Linux
export ANTHROPIC_API_KEY=sk-ant-...
```

### GPS Tolerance
Each location has a configurable `radius` (in km). The default is `0.1` (100 metres). Adjust this per care home via the admin Locations page or directly in the database.

---

## Running Tests

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run a specific file
pytest tests/test_auth.py -v

# Run with coverage (requires pytest-cov)
pip install pytest-cov
pytest tests/ --cov=app --cov-report=term-missing
```

---

## Payroll Calculation

Payroll is calculated per employee for a selected date range:

1. All completed check-ins (with a check-out time) in the period are fetched.
2. Hours worked = `(check_out_time − check_in_time)` minus `break_minutes`.
3. Regular hours = up to 40 hours (standard working week).
4. Overtime hours = any hours beyond 40, paid at **1.5×** the hourly rate.
5. Total pay = `(regular_hours × rate) + (overtime_hours × rate × 1.5)`.

Payroll data can be exported to Excel via the **Export** button on the Payroll page.

---

## Seed Data

On first run, `seeds.py` automatically creates:

- 1 admin account (`admin` / `admin123`)
- 10 employee accounts (all with password `password123`)
- 8 Leicester-area care home locations with real GPS coordinates
- 30 days of randomised attendance history
- 7 upcoming scheduled shifts per active employee
- 7 training modules with full content
- 5 company policy documents
- 12 sample absence requests (mix of statuses)
- 12 sample internal messages
- Gamification data (points, badges, streaks) based on attendance history
- Welcome notifications for each employee

---

*Version 2.0 — Workforce Management System for Care Agencies*
