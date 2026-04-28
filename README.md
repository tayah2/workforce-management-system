# Workforce Management System (WMS)

**Author:** Tayah Brown  
**Degree:** BSc Computer Science  
**Submission Year:** 2026  

A full-stack web application designed for care agency workforce management. The system provides GPS-verified attendance tracking, automated payroll processing, shift scheduling, training management, internal messaging, document storage, absence tracking, gamification, and an AI assistant — all behind a JWT-authenticated REST API.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Complete File Listing](#2-complete-file-listing)
3. [Third-Party Dependencies](#3-third-party-dependencies)
4. [Installation Guide](#4-installation-guide)
5. [Running the Application](#5-running-the-application)
6. [Running the Tests](#6-running-the-tests)
7. [Demo Accounts](#7-demo-accounts)
8. [System Features](#8-system-features)
9. [API Reference](#9-api-reference)
10. [Database Schema](#10-database-schema)
11. [Configuration](#11-configuration)

---

## 1. System Requirements

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

No internet connection is required to run the application after dependencies are installed, except for the optional AI Chat feature which requires an Anthropic API key.

### Checking Installed Versions

```bash
python --version        # Must be 3.8 or later
pip --version
node --version          # Must be 18 or later
npm --version
```

---

## 2. Complete File Listing

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
        ├── App.jsx                     # Router configuration and route definitions
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

## 3. Third-Party Dependencies

### Backend Python Packages (`backend/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| flask | 3.0.0 | Web framework |
| flask-sqlalchemy | 3.1.1 | ORM / database abstraction |
| flask-jwt-extended | 4.6.0 | JWT authentication |
| flask-cors | 4.0.0 | Cross-Origin Resource Sharing |
| werkzeug | 3.0.1 | Password hashing, WSGI utilities |
| pandas | 2.1.4 | DataFrame creation for Excel export |
| openpyxl | 3.1.2 | Excel (.xlsx) file generation |
| python-dotenv | 1.0.0 | Load environment variables from .env |
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
| axios | 1.6.2 | HTTP client |
| recharts | 2.10.3 | Chart components |
| vite | 5.0.8 | Build tool and dev server |
| @vitejs/plugin-react | 4.2.1 | Vite React plugin |

All dependencies are installed automatically via `npm install`.

---

## 4. Installation Guide

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

This installs all Python packages listed in `requirements.txt`. If you have both Python 2 and Python 3 installed, use `pip3` instead of `pip`.

### Step 3 — Install frontend dependencies

Open a second terminal window in the project root:

```bash
cd frontend
npm install
```

This reads `package-lock.json` and installs the exact same dependency versions used during development. The `node_modules` folder will be created (approximately 200 MB).

### Step 4 — (Optional) Configure environment variables

Copy the example environment file and edit it if needed:

```bash
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

The application runs without any changes to `.env`. The only setting that requires a real value is `ANTHROPIC_API_KEY` if you want the AI Chat feature to work.

No database setup is required. SQLite creates the database file (`instance/wms.db`) automatically when the server starts for the first time.

---

## 5. Running the Application

Both the backend and frontend must be running at the same time in separate terminal windows.

### Terminal 1 — Start the backend server

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

The backend is available at **http://localhost:5000**

On first run, the database is created and seeded automatically with:
- 1 admin account and 10 employee accounts
- 8 Leicester-area care home locations
- 30 days of sample attendance history
- Training modules, company documents, messages, and absence records

> **Windows note:** If Python is not on your PATH, use `py run.py` instead of `python run.py`.

### Terminal 2 — Start the frontend

#### Option A — Development server (recommended for examiners)

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

### Accessing the Application

Once both servers are running, open your browser and go to:

```
http://localhost:5173
```

You will see the login page. Use the demo credentials below.

---

## 6. Running the Tests

With the backend dependencies installed:

```bash
cd backend
python -m pytest tests/ -v
```

**Expected result: 42 tests, all passing (100% pass rate)**

```
tests/test_attendance.py::TestCheckIn::test_checkin_valid_gps PASSED
tests/test_attendance.py::TestCheckIn::test_checkin_outside_radius PASSED
... (42 total)
======================= 42 passed in 2.51s =======================
```

The tests use an isolated in-memory SQLite database and do not affect the development database.

To run a specific test file:

```bash
python -m pytest tests/test_auth.py -v        # Authentication tests (17 tests)
python -m pytest tests/test_attendance.py -v  # Attendance tests (12 tests)
python -m pytest tests/test_gamification.py -v # Gamification tests (13 tests)
```

---

## 7. Demo Accounts

All employee accounts share the password `password123`.

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

New employee accounts can be created from the login screen by clicking **Register here**. A company registration code is required: **`CARE2024`**

New accounts are always created with the `employee` role. Admin accounts cannot be self-registered.

---

## 8. System Features

### Employee Features
- GPS check-in and check-out with location verification
- Weekly shift calendar with shift confirmation
- Available shifts board — browse and claim open shifts
- Payroll view with regular and overtime breakdown
- Absence request submission (sick, holiday, emergency, other)
- Mandatory training modules with progress tracking
- Company document library (policies, procedures, H&S)
- Internal inbox and sent messages
- Points, badges, and leaderboard (gamification)
- AI assistant for shift, pay, and policy questions

### Admin Features
- All employee features
- Staff management — create, update, deactivate accounts
- Location management — add/edit care facilities with GPS coordinates
- Full attendance overview with filters
- Full payroll for all employees with Excel export
- Shift scheduling — assign, cancel, post open shifts
- Absence approval/rejection with admin notes
- Attendance and staff analytics reports with Excel export

---

## 9. API Reference

All endpoints are prefixed with `/api`. Protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Register a new employee (requires registration code) |
| POST | `/login` | — | Login — returns access and refresh JWT tokens |
| POST | `/refresh` | Refresh token | Obtain a new access token |
| POST | `/logout` | Required | Blacklist the current token |
| GET | `/me` | Required | Get the authenticated user's profile |

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Required | List all users (admin) or own profile (employee) |
| GET | `/users/:id` | Required | Get a specific user |
| PUT | `/users/:id` | Required | Update user details |
| DELETE | `/users/:id` | Admin | Deactivate a user (soft delete) |

### Attendance — `/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/checkin` | Required | GPS check-in at a care facility |
| POST | `/checkout` | Required | GPS check-out |
| GET | `/attendance` | Required | Attendance records with optional filters |
| GET | `/attendance/current` | Required | Current open check-in |

### Shifts — `/api/shifts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shifts` | Required | List shifts |
| GET | `/shifts/open` | Required | List unclaimed open shifts |
| POST | `/shifts` | Admin | Create a shift |
| PUT | `/shifts/:id` | Required | Update shift status |
| POST | `/shifts/:id/claim` | Employee | Claim an open shift |

### Payroll — `/api/payroll`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payroll` | Required | Payroll summary for a date range |
| GET | `/payroll/export` | Required | Download payroll as Excel (.xlsx) |

### Absences — `/api/absences`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/absences` | Required | List absences (own or all for admin) |
| POST | `/absences` | Required | Submit an absence request |
| PUT | `/absences/:id` | Admin | Approve or reject with admin notes |

### Training — `/api/training`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/training/modules` | Required | List training modules |
| GET | `/training/progress` | Required | Own completion progress |
| POST | `/training/modules/:id/complete` | Required | Mark a module complete |

### Reports — `/api/reports`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports/attendance-summary` | Required | Aggregate attendance statistics |
| GET | `/reports/daily-activity` | Required | Day-by-day breakdown |
| GET | `/reports/location-analytics` | Admin | Per-location stats |
| GET | `/reports/staff-analytics` | Admin | Per-employee stats |
| GET | `/reports/export` | Required | Attendance report as Excel |

---

## 10. Database Schema

The database is SQLite and is created automatically at `backend/instance/wms.db`.

### users
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| username | VARCHAR | Unique |
| email | VARCHAR | Unique |
| password_hash | VARCHAR | Werkzeug PBKDF2-SHA256 |
| first_name | VARCHAR | |
| last_name | VARCHAR | |
| role | VARCHAR | `admin` or `employee` |
| hourly_rate | FLOAT | Used in payroll calculations |
| is_active | BOOLEAN | Soft-delete flag |
| created_at | DATETIME | |

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
| check_out_time | DATETIME | NULL if still on shift |
| check_in_latitude | FLOAT | Actual GPS coordinates recorded |
| check_in_longitude | FLOAT | |
| check_out_latitude | FLOAT | |
| check_out_longitude | FLOAT | |
| is_check_in_verified | BOOLEAN | True if within radius |
| is_check_out_verified | BOOLEAN | |
| break_minutes | INTEGER | Deducted from hours worked |
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
| date | DATE | Start date |
| end_date | DATE | End date for multi-day absences |
| type | VARCHAR | `sick`, `holiday`, `emergency`, `other` |
| reason | TEXT | |
| status | VARCHAR | `pending`, `approved`, `rejected` |
| admin_notes | TEXT | |
| reviewed_by | FK → users | |
| reviewed_at | DATETIME | |

---

## 11. Configuration

Configuration is managed in `backend/app/config.py` and via environment variables in `backend/.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-only-change-me` | Flask session secret — change in production |
| `JWT_SECRET_KEY` | `jwt-dev-only` | JWT signing key — change in production |
| `DATABASE_URL` | `sqlite:///wms.db` | Database connection string |
| `REGISTRATION_CODE` | `CARE2024` | Required code for employee self-registration |
| `ANTHROPIC_API_KEY` | *(empty)* | API key for AI Chat feature (optional) |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |

### GPS Verification

Each care facility has a configurable `radius` (in kilometres). The default is `0.1 km` (100 metres). The Haversine formula is used to calculate the great-circle distance between the employee's reported GPS coordinates and the facility's registered coordinates. If the distance is within the radius, the check-in is marked as GPS-verified.

### Payroll Calculation

1. Hours worked = `(check_out_time − check_in_time)` minus `break_minutes`
2. Regular hours = up to 40 hours per week at standard hourly rate
3. Overtime hours = any hours beyond 40 at **1.5×** the hourly rate
4. Total pay = `(regular_hours × rate) + (overtime_hours × rate × 1.5)`

---

*Workforce Management System — BSc Computer Science Final Year Project*
