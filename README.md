# Workforce Management System (WMS)

**Author:** Tayah Brown | **Degree:** BSc Computer Science | **Submission Year:** 2026

A full-stack workforce management platform built for UK care agencies. The system provides GPS-verified attendance tracking, automated payroll, shift scheduling, training management, internal messaging, absence workflows, gamification, and an AI assistant — all secured behind a JWT-authenticated REST API.

**Tech Stack:**
[Python 3.8+] | [Flask 3.0] | [SQLite] | [React 18] | [Vite 5] | [JWT Auth] | [Anthropic Claude]

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Feature Summary](#3-feature-summary)
4. [System Requirements](#4-system-requirements)
5. [Complete File Listing](#5-complete-file-listing)
6. [Third-Party Dependencies](#6-third-party-dependencies)
7. [Installation Guide](#7-installation-guide)
8. [Running the Application](#8-running-the-application)
9. [Running the Tests](#9-running-the-tests)
10. [Demo Accounts](#10-demo-accounts)
11. [System Features — Detailed](#11-system-features--detailed)
12. [API Reference](#12-api-reference)
13. [Database Schema](#13-database-schema)
14. [Configuration](#14-configuration)
15. [Security](#15-security)
16. [Known Limitations](#16-known-limitations)

---

## 1. Project Overview

The Workforce Management System (WMS) is a single-page web application designed to reduce administrative overhead for care agency managers while giving employees real-time visibility over their schedules, pay, and compliance records.

### Problem Solved

Care agencies face recurring challenges with:
- **Attendance verification** — paper timesheets are easily falsified and slow to process
- **Payroll accuracy** — manual overtime calculations across shift workers are error-prone
- **Compliance tracking** — mandatory training completions and policy acknowledgements are hard to audit
- **Staff communication** — phone/WhatsApp chains create compliance gaps and ignored messages

WMS addresses each of these with purpose-built digital workflows.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite over PostgreSQL** | Zero-configuration setup; sufficient for single-agency scale; easy examiner deployment |
| **JWT stateless auth** | Scales horizontally; no server-side session storage required |
| **GPS Haversine verification** | Industry-standard formula; works without proprietary geofencing APIs |
| **React SPA + Flask API** | Clean separation of concerns; API-first design enables future mobile app |
| **Claude Haiku for AI chat** | Low latency and cost for conversational queries; contextually aware via system prompt |
| **Gamification** | Evidence-based engagement technique; reduces absenteeism in shift-work environments |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React 18 SPA (Vite 5)  ·  port 5173 (dev) / 4173 (prod)  │
│                                                             │
│  AuthContext  →  JWT stored in localStorage                 │
│  Axios client →  Bearer token on every request             │
│  React Router →  22 client-side routes                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / JSON
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Flask REST API · port 5000                │
│                                                             │
│  14 Blueprints  →  /api/auth, /api/users, /api/shifts …    │
│  flask-jwt-extended  →  access (1 h) + refresh (30 d) tokens│
│  flask-cors  →  CORS allowed for FRONTEND_URL              │
│                                                             │
│  Services layer:                                            │
│    gps_service.py      Haversine distance calculation       │
│    payroll_service.py  Overtime at 1.5× after 40 h/week    │
│    gamification_service.py  Points, badges, streaks        │
│    export_service.py   pandas + openpyxl → .xlsx           │
└───────────────┬─────────────────────┬───────────────────────┘
                │ SQLAlchemy ORM      │ Anthropic SDK (optional)
                ▼                    ▼
┌──────────────────────┐   ┌────────────────────────────┐
│  SQLite              │   │  Claude Haiku (claude.ai)  │
│  backend/instance/   │   │  /api/chat endpoint        │
│  wms.db              │   │  Context: user's shifts,   │
│  11 tables           │   │  pay, and policies         │
└──────────────────────┘   └────────────────────────────┘
```

### Request Lifecycle

1. React component calls a function in `src/api/client.js`
2. Axios interceptor attaches `Authorization: Bearer <token>`
3. Flask route validates the JWT via `@jwt_required()` or `@admin_required`
4. Business logic runs in the services layer
5. SQLAlchemy commits changes; route returns JSON
6. On `401`, Axios response interceptor clears localStorage and redirects to `/login`

---

## 3. Feature Summary

### Employee-Facing Features

| Feature | Description |
|---------|-------------|
| GPS Check-In / Check-Out | Submit GPS coordinates; server verifies against care facility radius using Haversine formula |
| Attendance History | Paginated record of all shifts with verification status, break time, and hours worked |
| Shift Calendar | Weekly calendar view of assigned shifts; one-click confirmation |
| Open Shift Board | Browse unclaimed shifts and claim them instantly |
| Payroll Dashboard | Breakdown of regular and overtime earnings for any date range; Excel export |
| Absence Requests | Submit sick, holiday, emergency, or other absences; track approval status |
| Training Modules | Mandatory learning content with progress tracking and completion certificates |
| Document Library | Searchable company policies, procedures, and H&S documents |
| Internal Messaging | Threaded inbox and sent messages with read receipts |
| Gamification | Earn points for each shift; unlock badges for milestones; view leaderboard |
| AI Assistant | Chat with Claude Haiku for instant answers about shifts, pay, and company policy |

### Admin-Facing Features

| Feature | Description |
|---------|-------------|
| Staff Management | Create, edit, deactivate employee accounts; set hourly rates |
| Location Management | Add/edit care facilities with GPS coordinates and radius tolerance |
| Shift Scheduling | Assign shifts to employees or post as open; cancel shifts |
| Absence Review | Approve or reject absence requests with written admin notes |
| Attendance Overview | Full attendance across all staff with date/location filters |
| Payroll Processing | View payroll for all employees; export to Excel for payroll providers |
| Reports & Analytics | Attendance summaries, daily activity, per-location and per-employee analytics; Excel export |
| Badge Management | Create and manage gamification badges and criteria |
| Notifications | Broadcast notifications to all staff |

---

## 4. System Requirements

### Operating System

The application is cross-platform and has been tested on:
- **Windows 10 / Windows 11** (primary development environment)
- **macOS 12 Monterey or later**
- **Ubuntu 20.04 LTS or later**

### Required Software

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| **Python** | 3.8 | Backend server runtime |
| **pip** | 21.0 | Python package manager |
| **Node.js** | 18.0 | Frontend build toolchain |
| **npm** | 9.0 | Node package manager |
| **Git** | 2.30 | Version control (for cloning) |

No database server installation is required. The application uses **SQLite**, which is embedded in Python's standard library and creates the database file automatically on first run.

No internet connection is required after dependencies are installed, except for the optional AI Chat feature which requires an Anthropic API key.

### Checking Installed Versions

```bash
python --version        # Must be 3.8 or later
pip --version
node --version          # Must be 18 or later
npm --version
```

---

## 5. Complete File Listing

```
workforce-management-system/
│
├── README.md                           # This file
├── .gitignore                          # Git exclusion rules
│
├── backend/                            # Flask REST API
│   ├── run.py                          # Entry point — starts the server
│   ├── wsgi.py                         # WSGI entry point for production
│   ├── requirements.txt                # All Python dependencies with versions
│   ├── .env.example                    # Template for environment variables
│   │
│   ├── app/                            # Main application package
│   │   ├── __init__.py                 # App factory (create_app function)
│   │   ├── config.py                   # Development / production configuration
│   │   ├── extensions.py               # SQLAlchemy, JWT, CORS singleton objects
│   │   ├── seeds.py                    # Database seeder with realistic sample data
│   │   │
│   │   ├── models/                     # SQLAlchemy ORM database models
│   │   │   ├── __init__.py
│   │   │   ├── user.py                 # Employee and admin accounts
│   │   │   ├── location.py             # Care facility locations with GPS coords
│   │   │   ├── check_in.py             # Attendance records with GPS verification
│   │   │   ├── shift.py                # Scheduled and open shifts
│   │   │   ├── absence.py              # Absence requests and approvals
│   │   │   ├── message.py              # Internal messages between users
│   │   │   ├── document.py             # Company policy and procedure documents
│   │   │   ├── training.py             # Training modules and completion records
│   │   │   ├── gamification.py         # Badges, points, and streaks
│   │   │   └── notification.py         # In-app notifications
│   │   │
│   │   ├── routes/                     # Flask blueprints — one per feature area
│   │   │   ├── __init__.py             # Exports all blueprints
│   │   │   ├── auth.py                 # /api/auth — register, login, logout
│   │   │   ├── users.py                # /api/users — user management
│   │   │   ├── locations.py            # /api/locations — care facility CRUD
│   │   │   ├── attendance.py           # /api/checkin, /api/checkout
│   │   │   ├── shifts.py               # /api/shifts — scheduling + open shifts
│   │   │   ├── payroll.py              # /api/payroll — earnings + Excel export
│   │   │   ├── absences.py             # /api/absences — requests + admin review
│   │   │   ├── documents.py            # /api/documents — policy library
│   │   │   ├── training.py             # /api/training — modules + progress
│   │   │   ├── messages.py             # /api/messages — inbox and sent
│   │   │   ├── gamification.py         # /api/gamification — points and badges
│   │   │   ├── reports.py              # /api/reports — analytics + Excel export
│   │   │   ├── dashboard.py            # /api/dashboard — summary statistics
│   │   │   ├── notifications.py        # /api/notifications
│   │   │   └── chat.py                 # /api/chat — AI assistant
│   │   │
│   │   ├── services/                   # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── gamification_service.py # Point award and badge unlock logic
│   │   │   ├── gps_service.py          # Haversine GPS distance calculation
│   │   │   ├── payroll_service.py      # Payroll calculation logic
│   │   │   └── export_service.py       # Excel file generation
│   │   │
│   │   └── utils/                      # Shared utilities
│   │       ├── __init__.py
│   │       └── decorators.py           # @admin_required route decorator
│   │
│   └── tests/                          # pytest test suite
│       ├── __init__.py
│       ├── conftest.py                 # Fixtures and test database setup
│       ├── test_auth.py                # 17 tests — registration, login, tokens
│       ├── test_attendance.py          # 12 tests — check-in, check-out, GPS
│       └── test_gamification.py        # 13 tests — points, badges, leaderboard
│
└── frontend/                           # React single-page application
    ├── index.html                      # Vite HTML entry point
    ├── vite.config.js                  # Vite build configuration
    ├── package.json                    # Node dependencies and scripts
    ├── package-lock.json               # Locked dependency versions
    │
    ├── public/                         # Static assets served as-is
    │   ├── manifest.json               # PWA manifest
    │   ├── sw.js                       # Service worker
    │   └── icons/
    │       └── icon-192.svg            # App icon
    │
    └── src/                            # React source code
        ├── main.jsx                    # React root — mounts App with providers
        ├── App.jsx                     # Router configuration (22 routes)
        ├── index.css                   # Global styles and CSS custom properties
        │
        ├── api/
        │   └── client.js               # Axios instance and all API call functions
        │
        ├── context/
        │   └── AuthContext.jsx         # Authentication state (user, login, logout)
        │
        ├── components/                 # Reusable UI components
        │   ├── Layout.jsx              # Sidebar navigation and page shell
        │   ├── ProtectedRoute.jsx      # Redirects unauthenticated users to login
        │   ├── Modal.jsx               # Accessible modal dialog component
        │   ├── StatCard.jsx            # Dashboard metric tile
        │   ├── LoadingSpinner.jsx      # Loading indicator
        │   └── Toast.jsx               # Toast notification system
        │
        ├── pages/                      # One component per application page
        │   ├── Login.jsx               # Sign-in and employee self-registration
        │   ├── Dashboard.jsx           # Overview statistics
        │   ├── CheckIn.jsx             # GPS check-in / check-out
        │   ├── Attendance.jsx          # Attendance history table
        │   ├── Schedule.jsx            # Weekly shift calendar
        │   ├── AvailableShifts.jsx     # Open shift board for employees
        │   ├── Payroll.jsx             # Earnings breakdown and Excel export
        │   ├── Absence.jsx             # Absence request submission and tracking
        │   ├── Messages.jsx            # Internal inbox and sent messages
        │   ├── Documents.jsx           # Company policy document library
        │   ├── Training.jsx            # Training modules with progress tracking
        │   ├── Gamification.jsx        # Points, badges, and leaderboard
        │   ├── Chat.jsx                # AI assistant chat interface
        │   └── admin/                  # Admin-only pages
        │       ├── AbsenceAdmin.jsx    # Review and approve/reject absence requests
        │       ├── Achievements.jsx    # Badge management
        │       ├── DocumentAdmin.jsx   # Create and manage company documents
        │       ├── Locations.jsx       # Care facility management
        │       ├── NotificationsAdmin.jsx  # Send notifications to staff
        │       ├── Reports.jsx         # Analytics and Excel exports
        │       └── Users.jsx           # Employee account management
        │
        └── utils/
            └── formatters.js           # Date, time, currency formatting helpers
```

**Total files committed:** 88 source files

---

## 6. Third-Party Dependencies

### Backend Python Packages (`backend/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| flask | 3.0.0 | Web framework |
| flask-sqlalchemy | 3.1.1 | ORM / database abstraction |
| flask-jwt-extended | 4.6.0 | JWT authentication |
| flask-cors | 4.0.0 | Cross-Origin Resource Sharing |
| werkzeug | 3.0.1 | Password hashing (PBKDF2-SHA256), WSGI utilities |
| pandas | 2.1.4 | DataFrame creation for Excel export |
| openpyxl | 3.1.2 | Excel (.xlsx) file generation |
| python-dotenv | 1.0.0 | Load environment variables from `.env` |
| pytest | 7.4.4 | Test framework |
| pytest-flask | 1.3.0 | Flask integration for pytest |
| anthropic | ≥0.40.0 | Anthropic Claude API client (AI chat) |

All dependencies are installed automatically via `pip install -r requirements.txt`.

### Frontend Node Packages (`frontend/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.2.0 | UI library |
| react-dom | 18.2.0 | React DOM renderer |
| react-router-dom | 6.21.0 | Client-side routing |
| axios | 1.6.2 | HTTP client with interceptors |
| recharts | 2.10.3 | Chart components for analytics pages |
| vite | 5.0.8 | Build tool and dev server |
| @vitejs/plugin-react | 4.2.1 | Vite React plugin |

All dependencies are installed automatically via `npm install`.

---

## 7. Installation Guide

Follow these steps exactly, in order, on a fresh machine.

### Step 1 — Clone the repository

```bash
git clone https://github.com/tayah2/workforce-management-system.git
cd workforce-management-system
```

### Step 2 — Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

> If you have both Python 2 and Python 3 installed, use `pip3` instead of `pip`.

### Step 3 — Install frontend dependencies

Open a second terminal window in the project root:

```bash
cd frontend
npm install
```

`npm install` reads `package-lock.json` and installs the exact same dependency versions used during development. The `node_modules` folder will be approximately 200 MB.

### Step 4 — (Optional) Configure environment variables

```bash
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

The application runs without any changes to `.env` — all defaults are pre-configured for local development. The only setting that requires a real value is `ANTHROPIC_API_KEY` if you want the AI Chat feature to be functional.

No database setup is required. SQLite creates `backend/instance/wms.db` automatically when the server starts for the first time.

---

## 8. Running the Application

Both the backend and frontend must be running simultaneously in separate terminal windows.

### Terminal 1 — Backend server

```bash
cd backend
python run.py
```

Expected output:
```
Seeding database...
Database seeded successfully.
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

> **Windows:** If Python is not on your PATH, use `py run.py` instead.

The backend API is available at `http://localhost:5000`.

On first run, the database is created and seeded automatically with:
- 1 admin account and 10 employee accounts
- 8 Leicester-area care home locations with GPS coordinates
- 30 days of sample attendance history
- Training modules, company documents, messages, and absence records

### Terminal 2 — Frontend

#### Option A — Development server (recommended)

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

#### Option B — Production build (pre-compiled)

```bash
cd frontend
npm run build
npm run preview
```

Open **http://localhost:4173** in your browser.

### Quick Verification

| Check | Expected |
|-------|----------|
| `http://localhost:5000/api/auth/me` | `{"msg": "Missing Authorization Header"}` |
| `http://localhost:5173` | WMS login page |
| Login with `admin` / `admin123` | Admin dashboard with statistics |

---

## 9. Running the Tests

With backend dependencies installed:

```bash
cd backend
python -m pytest tests/ -v
```

**Expected result: 42 tests, all passing**

```
tests/test_auth.py::TestRegister::test_register_valid PASSED
tests/test_auth.py::TestLogin::test_login_valid PASSED
...
tests/test_attendance.py::TestCheckIn::test_checkin_valid_gps PASSED
tests/test_attendance.py::TestCheckIn::test_checkin_outside_radius PASSED
...
tests/test_gamification.py::TestGamification::test_award_points PASSED
...
======================= 42 passed in 2.51s =======================
```

The tests use an isolated in-memory SQLite database and do not affect the development database (`instance/wms.db`).

### Running individual test files

```bash
python -m pytest tests/test_auth.py -v        # 17 tests — registration, login, token refresh
python -m pytest tests/test_attendance.py -v  # 12 tests — check-in, check-out, GPS radius
python -m pytest tests/test_gamification.py -v # 13 tests — points, badges, leaderboard
```

### Test Coverage Areas

| File | Tests | What is covered |
|------|-------|----------------|
| `test_auth.py` | 17 | Registration with/without valid code; login success/failure; JWT access and refresh tokens; logout + token blacklisting |
| `test_attendance.py` | 12 | GPS check-in within radius; check-in outside radius; double check-in prevention; check-out; break minute deduction |
| `test_gamification.py` | 13 | Point award on check-out; badge unlock on milestone; leaderboard ordering; streak tracking |

---

## 10. Demo Accounts

All accounts are pre-seeded on first run.

| Role | Username | Password | Name |
|------|----------|----------|------|
| **Admin** | `admin` | `admin123` | Admin User |
| Employee | `jsmith` | `password123` | John Smith |
| Employee | `ejones` | `password123` | Emily Jones |
| Employee | `mwilson` | `password123` | Michael Wilson |
| Employee | `sbrown` | `password123` | Sarah Brown |
| Employee | `dlee` | `password123` | David Lee |
| Employee | `apatel` | `password123` | Amira Patel |
| Employee | `cthomas` | `password123` | Claire Thomas |
| Employee | `rchoudry` | `password123` | Raj Choudry |
| Employee | `lbailey` | `password123` | Laura Bailey |
| Employee | `omurphy` | `password123` | Oliver Murphy |

### Self-Registration

New employee accounts can be created from the login screen by clicking **Register here**. The company registration code is: **`CARE2024`**

New accounts are always created with the `employee` role. Admin accounts cannot be self-registered.

---

## 11. System Features — Detailed

### GPS Check-In / Check-Out

Employees submit their current GPS coordinates when checking in or out. The server calculates the Haversine (great-circle) distance between the submitted coordinates and the care facility's registered coordinates. If the distance is within the facility's `radius` field (default 100 metres), the record is marked `is_check_in_verified = true`.

```
distance = 2r · arcsin(√(sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)))
```

This approach works without proprietary geofencing services and requires no external API calls.

**Edge cases handled:**
- Employee already has an open check-in → 409 conflict
- Employee tries to check out without a check-in → 404
- GPS coordinates not submitted → check-in accepted but `is_verified = false`

---

### Payroll Calculation

Earnings are calculated server-side for the requested date range:

1. For each check-in record: `hours_worked = (check_out_time − check_in_time) − (break_minutes / 60)`
2. Total weekly hours are summed per ISO week
3. Up to 40 hours/week: billed at the employee's `hourly_rate`
4. Hours beyond 40/week: billed at `hourly_rate × 1.5` (overtime premium)
5. Results are returned as a breakdown by date, with weekly and period totals

**Excel export** uses `pandas` to structure the data and `openpyxl` to produce a formatted `.xlsx` file streamed directly to the browser.

---

### Gamification System

Points and badges are awarded automatically on check-out:

| Trigger | Points |
|---------|--------|
| Completing any shift | 10 pts |
| GPS-verified check-in | +5 pts bonus |
| Completing a training module | 20 pts |

**Badges** are unlocked when a numeric threshold is crossed:

| Badge | Criteria |
|-------|----------|
| First Shift | Complete 1 shift |
| Reliable | Complete 10 shifts |
| GPS Star | 5 GPS-verified check-ins |
| Streak — 7 Days | Work 7 consecutive days |
| Streak — 30 Days | Work 30 consecutive days |

The leaderboard is ranked by total points. Streaks are recalculated on each check-out by comparing `last_work_date` against the current date.

---

### AI Assistant

The `/api/chat` endpoint integrates the Anthropic Claude Haiku model. The system prompt is constructed at request time and includes:
- The authenticated user's name and role
- Their upcoming shifts for the next 7 days
- Their most recent payslip summary
- A list of company policy document titles

This context allows the assistant to answer specific questions like "What time do I start on Thursday?" or "How is overtime calculated?" without requiring the employee to navigate to multiple pages.

The `ANTHROPIC_API_KEY` environment variable must be set for this feature to work. If it is missing, the endpoint returns a `503` with an appropriate message.

---

### Absence Management Workflow

```
Employee submits request (status: pending)
        │
        ▼
Admin reviews in Absence Admin panel
        │
   ┌────┴────┐
   ▼         ▼
Approved   Rejected
(with optional admin note)
        │
        ▼
Employee sees updated status in their Absence page
```

Absence types: `sick`, `holiday`, `emergency`, `other`.
Multi-day absences are supported via `date` (start) and `end_date` fields.

---

## 12. API Reference

All endpoints are prefixed with `/api`. Protected endpoints require:

```
Authorization: Bearer <access_token>
```

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Register a new employee (requires `registration_code`) |
| POST | `/login` | — | Login — returns `access_token` and `refresh_token` |
| POST | `/refresh` | Refresh token | Obtain a new access token |
| POST | `/logout` | Required | Blacklist the current token |
| GET | `/me` | Required | Get the authenticated user's profile |

**Login request body:**
```json
{
  "username": "jsmith",
  "password": "password123"
}
```

**Login response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": 2,
    "username": "jsmith",
    "role": "employee",
    "first_name": "John",
    "last_name": "Smith"
  }
}
```

---

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Required | List all users (admin) or own profile (employee) |
| GET | `/users/:id` | Required | Get a specific user |
| PUT | `/users/:id` | Required | Update user details |
| DELETE | `/users/:id` | Admin | Deactivate a user (soft delete — sets `is_active = false`) |

---

### Attendance — `/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/checkin` | Required | GPS check-in at a care facility |
| POST | `/checkout` | Required | GPS check-out |
| GET | `/attendance` | Required | Attendance records with optional date/location filters |
| GET | `/attendance/current` | Required | Current open check-in (if any) |

**Check-in request body:**
```json
{
  "location_id": 1,
  "latitude": 52.6369,
  "longitude": -1.1398
}
```

---

### Shifts — `/api/shifts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shifts` | Required | List shifts (own for employee, all for admin) |
| GET | `/shifts/open` | Required | List unclaimed open shifts |
| POST | `/shifts` | Admin | Create a shift |
| PUT | `/shifts/:id` | Required | Update shift (status, notes) |
| DELETE | `/shifts/:id` | Admin | Cancel a shift |
| POST | `/shifts/:id/claim` | Employee | Claim an open shift |

---

### Payroll — `/api/payroll`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payroll` | Required | Payroll summary for a date range (`?start=YYYY-MM-DD&end=YYYY-MM-DD`) |
| GET | `/payroll/export` | Required | Download payroll as Excel (.xlsx) |

---

### Absences — `/api/absences`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/absences` | Required | List absences (own for employee, all for admin) |
| POST | `/absences` | Required | Submit an absence request |
| PUT | `/absences/:id` | Admin | Approve or reject with optional `admin_notes` |

---

### Training — `/api/training`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/training/modules` | Required | List training modules |
| GET | `/training/progress` | Required | Own completion progress |
| POST | `/training/modules/:id/complete` | Required | Mark a module as completed |

---

### Documents — `/api/documents`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/documents` | Required | List company documents |
| GET | `/documents/:id` | Required | Get document content |
| POST | `/documents` | Admin | Create a new document |
| PUT | `/documents/:id` | Admin | Update a document |
| DELETE | `/documents/:id` | Admin | Delete a document |

---

### Messages — `/api/messages`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/messages/inbox` | Required | List received messages |
| GET | `/messages/sent` | Required | List sent messages |
| POST | `/messages` | Required | Send a new message |
| PUT | `/messages/:id/read` | Required | Mark message as read |

---

### Gamification — `/api/gamification`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/gamification/profile` | Required | Own points, badges, and streak |
| GET | `/gamification/leaderboard` | Required | Top-ranked employees by points |
| GET | `/gamification/badges` | Required | All available badges |
| POST | `/gamification/badges` | Admin | Create a new badge |
| PUT | `/gamification/badges/:id` | Admin | Update a badge |

---

### Reports — `/api/reports`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports/attendance-summary` | Required | Aggregate totals for a date range |
| GET | `/reports/daily-activity` | Required | Day-by-day breakdown |
| GET | `/reports/location-analytics` | Admin | Per-location statistics |
| GET | `/reports/staff-analytics` | Admin | Per-employee statistics |
| GET | `/reports/export` | Required | Full attendance report as Excel |

---

### Dashboard — `/api/dashboard`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | Required | Summary stats (hours this week, points, badges, next shift) |

---

### Notifications — `/api/notifications`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Required | List notifications for the authenticated user |
| POST | `/notifications` | Admin | Broadcast a notification to all employees |
| PUT | `/notifications/:id/read` | Required | Mark notification as read |

---

### Chat — `/api/chat`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/chat` | Required | Send a message to the AI assistant; returns a streamed or full reply |

**Request body:**
```json
{
  "message": "What time does my next shift start?"
}
```

Requires `ANTHROPIC_API_KEY` in environment. Returns `503` if not configured.

---

## 13. Database Schema

The database is SQLite created automatically at `backend/instance/wms.db`. No migration tool is used; Flask-SQLAlchemy generates the schema from model classes on startup.

### users

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| username | VARCHAR | Unique, indexed |
| email | VARCHAR | Unique, indexed |
| password_hash | VARCHAR | Werkzeug PBKDF2-SHA256 |
| first_name | VARCHAR | |
| last_name | VARCHAR | |
| role | VARCHAR | `admin` or `employee` |
| hourly_rate | FLOAT | Used in payroll calculations |
| is_active | BOOLEAN | Soft-delete flag; inactive users cannot log in |
| created_at | DATETIME | Server UTC timestamp |

### locations

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | VARCHAR | Care home name |
| address | VARCHAR | |
| latitude | FLOAT | WGS-84 decimal degrees |
| longitude | FLOAT | WGS-84 decimal degrees |
| radius | FLOAT | GPS tolerance in km (default 0.1) |
| is_active | BOOLEAN | |

### check_ins

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | |
| location_id | FK → locations | |
| check_in_time | DATETIME | |
| check_out_time | DATETIME | NULL if shift is still in progress |
| check_in_latitude | FLOAT | Recorded GPS at check-in |
| check_in_longitude | FLOAT | |
| check_out_latitude | FLOAT | Recorded GPS at check-out |
| check_out_longitude | FLOAT | |
| is_check_in_verified | BOOLEAN | True if within facility radius |
| is_check_out_verified | BOOLEAN | |
| break_minutes | INTEGER | Subtracted from hours worked |
| notes | TEXT | |

### shifts

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | NULL for open/unclaimed shifts |
| location_id | FK → locations | |
| scheduled_start | DATETIME | |
| scheduled_end | DATETIME | |
| status | VARCHAR | `scheduled`, `confirmed`, `cancelled`, `completed` |
| notes | TEXT | |
| created_by | FK → users | Admin who created the shift |

### absences

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | |
| date | DATE | Start date of absence |
| end_date | DATE | End date (for multi-day absences) |
| type | VARCHAR | `sick`, `holiday`, `emergency`, `other` |
| reason | TEXT | Employee-provided explanation |
| status | VARCHAR | `pending`, `approved`, `rejected` |
| admin_notes | TEXT | Admin feedback on approval/rejection |
| reviewed_by | FK → users | |
| reviewed_at | DATETIME | |

### messages

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| from_user_id | FK → users | |
| to_user_id | FK → users | |
| subject | VARCHAR | |
| body | TEXT | |
| is_read | BOOLEAN | |
| parent_id | FK → messages | NULL for top-level; set for replies |
| created_at | DATETIME | |

### training_modules

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| title | VARCHAR | |
| description | TEXT | |
| content | TEXT | Module body (markdown or plain text) |
| category | VARCHAR | e.g. `health_and_safety`, `manual_handling` |
| estimated_minutes | INTEGER | Estimated completion time |
| is_mandatory | BOOLEAN | |

### training_completions

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | |
| module_id | FK → training_modules | |
| completed_at | DATETIME | |

### point_transactions

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | |
| points | INTEGER | Positive (award) or negative (deduction) |
| reason | VARCHAR | Human-readable reason |
| created_at | DATETIME | |

### badges

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | VARCHAR | |
| description | TEXT | |
| icon | VARCHAR | Emoji or icon identifier |
| criteria_type | VARCHAR | `shifts_completed`, `gps_verified`, `streak_days`, etc. |
| criteria_value | INTEGER | Threshold to unlock the badge |

### user_badges

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | |
| badge_id | FK → badges | |
| earned_at | DATETIME | |

### streaks

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | Unique per user |
| current_streak | INTEGER | Consecutive days worked |
| longest_streak | INTEGER | All-time record |
| last_work_date | DATE | Date of last completed shift |

### notifications

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | FK → users | Target recipient |
| title | VARCHAR | |
| body | TEXT | |
| is_read | BOOLEAN | |
| created_at | DATETIME | |

---

## 14. Configuration

Configuration is managed in `backend/app/config.py` and via environment variables in `backend/.env`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-only-change-me` | Flask session secret — **change this in production** |
| `JWT_SECRET_KEY` | `jwt-dev-only` | JWT signing key — **change this in production** |
| `DATABASE_URL` | `sqlite:///wms.db` | SQLAlchemy database URL |
| `REGISTRATION_CODE` | `CARE2024` | Required for employee self-registration |
| `ANTHROPIC_API_KEY` | *(empty)* | Enables the AI Chat feature |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |

### Configuration Classes (`backend/app/config.py`)

| Class | `DEBUG` | Access token TTL | Refresh token TTL |
|-------|---------|-----------------|-------------------|
| `DevelopmentConfig` | `True` | 1 hour | 30 days |
| `ProductionConfig` | `False` | 30 minutes | 30 days |

The environment variable `FLASK_ENV` selects the config class. Defaults to `development`.

### GPS Verification

Each care facility has a configurable `radius` (in kilometres). The default is `0.1 km` (100 metres). The Haversine formula calculates the great-circle distance between the employee's submitted GPS coordinates and the facility's registered coordinates. If the distance is within the radius, `is_check_in_verified` is set to `true`.

To increase the allowed radius for a facility, update the `radius` field via the Locations admin panel.

### Payroll Calculation

1. **Hours worked** = `(check_out_time − check_in_time) − (break_minutes ÷ 60)`
2. **Regular hours** = up to 40 hours per ISO week at the employee's `hourly_rate`
3. **Overtime hours** = any hours beyond 40 at `hourly_rate × 1.5`
4. **Total pay** = `(regular_hours × rate) + (overtime_hours × rate × 1.5)`

The calculation is re-run on every payroll request — there is no cached payroll record. This ensures accuracy if check-in records are edited by an admin.

---

## 15. Security

### Authentication

- Passwords are hashed with **Werkzeug PBKDF2-SHA256** (never stored in plaintext)
- JWT access tokens expire after **1 hour** (development) / **30 minutes** (production)
- Logout adds the token's JTI to an in-memory blacklist — blacklist is lost on server restart (acceptable for the project scope; a Redis-backed blacklist would be needed in production)
- All `/api/*` routes except `/auth/register` and `/auth/login` require a valid access token

### Authorisation

- The `@admin_required` decorator on admin routes verifies `current_user.role == "admin"`
- Employees can only read and modify their own records; the backend enforces this per-endpoint, not only via the frontend

### Input Validation

- All user-supplied values are validated before database writes
- GPS coordinates are cast to `float` — non-numeric values return `400`
- Date fields use Python's `datetime.strptime` with explicit formats — malformed dates return `400`

### CORS

- Flask-CORS restricts cross-origin requests to the URL specified in `FRONTEND_URL`
- In development this is `http://localhost:5173`

### Production Considerations

Before deploying this application in a production environment:

1. Set `SECRET_KEY` and `JWT_SECRET_KEY` to long, randomly generated strings
2. Use a production WSGI server (`gunicorn` via `backend/wsgi.py`) rather than Flask's development server
3. Replace the in-memory token blacklist with Redis or a database table
4. Switch `DATABASE_URL` to PostgreSQL or another production-grade database
5. Set `FLASK_ENV=production` to disable debug mode and shorten token TTLs
6. Serve the frontend `dist/` folder via a CDN or nginx, not `npm run preview`

---

## 16. Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| In-memory JWT blacklist | Logged-out tokens are valid again after server restart | Low risk in development; use Redis in production |
| No real-time push | New messages and notifications require a page refresh | WebSocket layer (e.g. Flask-SocketIO) would resolve this |
| SQLite single-writer lock | Concurrent writes block each other | Acceptable for single-agency; switch to PostgreSQL for multi-agency SaaS |
| Browser GPS required | GPS check-in fails if the browser denies location access | Fallback to manual location selection is not yet implemented |
| No email notifications | Absence approval/rejection is visible only within the app | SMTP integration (e.g. Flask-Mail) would send email confirmations |

---

*Workforce Management System — BSc Computer Science Final Year Project — Tayah Brown — 2026*
