"""
Seed the database with realistic test data for the WMS.

Run automatically by run.py on first start (tables are empty).
"""
import random
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models.check_in import CheckIn
from app.models.gamification import Badge, PointTransaction, Streak, UserBadge
from app.models.location import Location
from app.models.shift import Shift
from app.models.user import User
from app.services.gamification_service import (
    CRITERIA_COMPLETED_SHIFTS,
    CRITERIA_GPS_CHECKINS,
    CRITERIA_GPS_VERIFIED_SHIFTS,
    CRITERIA_STREAK_DAYS,
)

# ---------------------------------------------------------------------------
# Seed badges (static catalogue)
# ---------------------------------------------------------------------------
BADGE_DEFINITIONS = [
    {
        'name': 'First Shift',
        'description': 'Complete your very first shift.',
        'icon': '🌟',
        'criteria_type': CRITERIA_COMPLETED_SHIFTS,
        'criteria_value': 1,
    },
    {
        'name': 'Perfect Week',
        'description': 'Complete 5 GPS-verified shifts within any 7-day window.',
        'icon': '📅',
        'criteria_type': CRITERIA_GPS_VERIFIED_SHIFTS,
        'criteria_value': 5,
    },
    {
        'name': 'GPS Veteran',
        'description': 'Complete 10 GPS-verified check-ins.',
        'icon': '🐦',
        'criteria_type': CRITERIA_GPS_CHECKINS,
        'criteria_value': 10,
    },
    {
        'name': 'Dedicated Worker',
        'description': 'Complete 30 shifts.',
        'icon': '💪',
        'criteria_type': CRITERIA_COMPLETED_SHIFTS,
        'criteria_value': 30,
    },
    {
        'name': 'Team Player',
        'description': 'Complete 100 shifts.',
        'icon': '🤝',
        'criteria_type': CRITERIA_COMPLETED_SHIFTS,
        'criteria_value': 100,
    },
    {
        'name': 'GPS Pro',
        'description': 'Complete 50 GPS-verified check-ins.',
        'icon': '📍',
        'criteria_type': CRITERIA_GPS_CHECKINS,
        'criteria_value': 50,
    },
    {
        'name': 'Streak Master',
        'description': 'Achieve a 7-day consecutive work streak.',
        'icon': '🔥',
        'criteria_type': CRITERIA_STREAK_DAYS,
        'criteria_value': 7,
    },
    {
        'name': 'Night Owl',
        'description': 'Complete a shift starting after 18:00',
        'icon': '🦉',
        'criteria_type': 'night_shifts',
        'criteria_value': 1,
    },
    {
        'name': 'Early Bird',
        'description': 'Complete a shift starting before 08:00',
        'icon': '🌅',
        'criteria_type': 'early_shifts',
        'criteria_value': 1,
    },
    {
        'name': 'Overtime Hero',
        'description': 'Accumulate 10+ overtime hours',
        'icon': '⚡',
        'criteria_type': 'overtime_hours',
        'criteria_value': 10,
    },
    {
        'name': 'Reliability Star',
        'description': 'Complete 20 shifts with GPS verified check-in',
        'icon': '⭐',
        'criteria_type': CRITERIA_GPS_VERIFIED_SHIFTS,
        'criteria_value': 20,
    },
    {
        'name': 'Century Club',
        'description': 'Earn 100 points',
        'icon': '💯',
        'criteria_type': 'total_points',
        'criteria_value': 100,
    },
]

# ---------------------------------------------------------------------------
# Leicester-area UK care home locations (realistic lat/lon)
# ---------------------------------------------------------------------------
LOCATION_DATA = [
    {
        'name': 'Beaumont Lodge Care Home',
        'address': '15 Beaumont Leys Lane, Leicester LE4 0JP',
        'latitude': 52.6620, 'longitude': -1.1590, 'radius': 0.1,
    },
    {
        'name': 'Stoneygate Residential Care',
        'address': '42 London Road, Stoneygate, Leicester LE2 0QB',
        'latitude': 52.6170, 'longitude': -1.1070, 'radius': 0.1,
    },
    {
        'name': 'Evington Valley Nursing Home',
        'address': '8 Evington Valley Road, Leicester LE5 5LJ',
        'latitude': 52.6240, 'longitude': -1.0830, 'radius': 0.1,
    },
    {
        'name': 'Oadby Manor Care Centre',
        'address': '27 Wigston Road, Oadby, Leicester LE2 5QG',
        'latitude': 52.5970, 'longitude': -1.0800, 'radius': 0.1,
    },
    {
        'name': 'Braunstone Court Care Home',
        'address': '3 Braunstone Lane, Leicester LE3 2FG',
        'latitude': 52.6280, 'longitude': -1.1760, 'radius': 0.1,
    },
    {
        'name': 'Rushey Mead Nursing Centre',
        'address': '54 Rushey Mead Road, Leicester LE4 7JD',
        'latitude': 52.6580, 'longitude': -1.1210, 'radius': 0.1,
    },
    {
        'name': 'Wigston Fields Residential Home',
        'address': '18 Newton Lane, Wigston, Leicester LE18 3PB',
        'latitude': 52.5800, 'longitude': -1.1100, 'radius': 0.1,
    },
    {
        'name': 'Glen Parva Care Village',
        'address': '9 Enderby Road, Glen Parva, Leicester LE2 9JP',
        'latitude': 52.5880, 'longitude': -1.1470, 'radius': 0.15,
    },
]

# ---------------------------------------------------------------------------
# Employee seed data  (10 realistic UK care workers)
# ---------------------------------------------------------------------------
EMPLOYEE_DATA = [
    {'username': 'jsmith',   'email': 'john.smith@careagency.com',   'password': 'password123', 'first_name': 'John',    'last_name': 'Smith',    'hourly_rate': 13.00},
    {'username': 'ejones',   'email': 'emily.jones@careagency.com',  'password': 'password123', 'first_name': 'Emily',   'last_name': 'Jones',    'hourly_rate': 12.50},
    {'username': 'mwilson',  'email': 'michael.wilson@careagency.com','password': 'password123', 'first_name': 'Michael', 'last_name': 'Wilson',   'hourly_rate': 14.00},
    {'username': 'sbrown',   'email': 'sarah.brown@careagency.com',  'password': 'password123', 'first_name': 'Sarah',   'last_name': 'Brown',    'hourly_rate': 12.00},
    {'username': 'dlee',     'email': 'david.lee@careagency.com',    'password': 'password123', 'first_name': 'David',   'last_name': 'Lee',      'hourly_rate': 13.50},
    {'username': 'apatel',   'email': 'amira.patel@careagency.com',  'password': 'password123', 'first_name': 'Amira',   'last_name': 'Patel',    'hourly_rate': 12.75},
    {'username': 'cthomas',  'email': 'claire.thomas@careagency.com','password': 'password123', 'first_name': 'Claire',  'last_name': 'Thomas',   'hourly_rate': 13.25},
    {'username': 'rchoudry', 'email': 'raj.choudry@careagency.com',  'password': 'password123', 'first_name': 'Raj',     'last_name': 'Choudry',  'hourly_rate': 12.50},
    {'username': 'lbailey',  'email': 'laura.bailey@careagency.com', 'password': 'password123', 'first_name': 'Laura',   'last_name': 'Bailey',   'hourly_rate': 14.50},
    {'username': 'omurphy',  'email': 'oliver.murphy@careagency.com','password': 'password123', 'first_name': 'Oliver',  'last_name': 'Murphy',   'hourly_rate': 11.75},
]


def seed_database() -> None:
    """Idempotent seed — safe to call multiple times; only adds missing data."""

    print('Seeding database...')

    # ------------------------------------------------------------------
    # Badges (get-or-create)
    # ------------------------------------------------------------------
    badges = {}
    for bd in BADGE_DEFINITIONS:
        existing = Badge.query.filter_by(name=bd['name']).first()
        if existing:
            badges[bd['name']] = existing
        else:
            badge = Badge(**bd)
            db.session.add(badge)
            db.session.flush()
            badges[bd['name']] = badge

    # ------------------------------------------------------------------
    # Admin user (get-or-create)
    # ------------------------------------------------------------------
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@careagency.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            hourly_rate=0.0,
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.flush()

    # ------------------------------------------------------------------
    # Locations (get-or-create)
    # ------------------------------------------------------------------
    locations = []
    for ld in LOCATION_DATA:
        loc = Location.query.filter_by(name=ld['name']).first()
        if not loc:
            loc = Location(**ld)
            db.session.add(loc)
            db.session.flush()
        locations.append(loc)

    # ------------------------------------------------------------------
    # Employees (get-or-create)
    # ------------------------------------------------------------------
    employees = []
    new_employees = []
    for ed in EMPLOYEE_DATA:
        emp = User.query.filter_by(username=ed['username']).first()
        if not emp:
            emp = User(
                username=ed['username'],
                email=ed['email'],
                first_name=ed['first_name'],
                last_name=ed['last_name'],
                role='employee',
                hourly_rate=ed['hourly_rate'],
            )
            emp.set_password(ed['password'])
            db.session.add(emp)
            db.session.flush()
            new_employees.append(emp)
        employees.append(emp)

    # ------------------------------------------------------------------
    # 30 days of check-ins — only for newly created employees
    # ------------------------------------------------------------------
    rng = random.Random(42)
    now_utc = datetime.now(timezone.utc)
    all_checkins: list[CheckIn] = []

    # Advance rng state to keep deterministic output for existing employees
    for _ in range(30 * len(employees)):
        rng.random()

    seed_targets = new_employees if new_employees else employees if CheckIn.query.count() == 0 else []

    for day_offset in range(30, 0, -1):
        shift_date = now_utc - timedelta(days=day_offset)
        for emp in seed_targets:
            if rng.random() > 0.70:
                continue  # employee didn't work this day

            loc = rng.choice(locations)
            shift_start_hour = rng.randint(7, 10)
            shift_hours = rng.uniform(6.5, 9.5)
            break_minutes = rng.choice([0, 15, 30, 45])

            check_in_time = shift_date.replace(
                hour=shift_start_hour,
                minute=rng.randint(0, 59),
                second=0,
                microsecond=0,
            )
            check_out_time = check_in_time + timedelta(hours=shift_hours)

            # GPS: 80% chance of verified check-in, 75% verified check-out
            gps_verified_in = rng.random() < 0.80
            gps_verified_out = rng.random() < 0.75

            # Place coords exactly on the location to ensure verification
            lat_in = loc.latitude if gps_verified_in else loc.latitude + 1.0
            lon_in = loc.longitude if gps_verified_in else loc.longitude + 1.0
            lat_out = loc.latitude if gps_verified_out else loc.latitude + 1.0
            lon_out = loc.longitude if gps_verified_out else loc.longitude + 1.0

            ci = CheckIn(
                user_id=emp.id,
                location_id=loc.id,
                check_in_time=check_in_time,
                check_out_time=check_out_time,
                check_in_latitude=lat_in,
                check_in_longitude=lon_in,
                check_out_latitude=lat_out,
                check_out_longitude=lon_out,
                is_check_in_verified=gps_verified_in,
                is_check_out_verified=gps_verified_out,
                break_minutes=break_minutes,
                notes='',
            )
            db.session.add(ci)
            all_checkins.append(ci)

    db.session.flush()

    # ------------------------------------------------------------------
    # Gamification: points and streaks (only for new employees)
    # ------------------------------------------------------------------
    for emp in seed_targets:
        emp_checkins = [c for c in all_checkins if c.user_id == emp.id]
        total_points = 0
        streak_counter = 0
        longest_streak = 0
        last_date = None

        for ci in sorted(emp_checkins, key=lambda x: x.check_in_time):
            pts = 10  # base shift
            if ci.is_check_in_verified:
                pts += 5
            if ci.is_check_out_verified:
                pts += 3
            total_points += pts

            txn = PointTransaction(
                user_id=emp.id,
                points=pts,
                reason='Completed shift (seed)',
                created_at=ci.check_out_time,
            )
            db.session.add(txn)

            # Streak
            ci_date = ci.check_in_time.date()
            if last_date is None:
                streak_counter = 1
            elif ci_date == last_date + timedelta(days=1):
                streak_counter += 1
            elif ci_date != last_date:
                streak_counter = 1
            longest_streak = max(longest_streak, streak_counter)
            last_date = ci_date

        streak_obj = Streak(
            user_id=emp.id,
            current_streak=streak_counter,
            longest_streak=longest_streak,
            last_work_date=last_date,
        )
        db.session.add(streak_obj)

        # Award badges based on actual counts
        completed_count = len(emp_checkins)
        gps_in_count = sum(1 for c in emp_checkins if c.is_check_in_verified)
        gps_verified_shift_count = sum(
            1 for c in emp_checkins if c.is_check_in_verified
        )

        def _award(badge_name: str) -> None:
            b = badges.get(badge_name)
            if b:
                ub = UserBadge(
                    user_id=emp.id,
                    badge_id=b.id,
                    earned_at=now_utc - timedelta(days=1),
                )
                db.session.add(ub)

        if completed_count >= 1:
            _award('First Shift')
        if gps_verified_shift_count >= 5:
            _award('Perfect Week')
        if gps_in_count >= 10:
            _award('GPS Veteran')
        if completed_count >= 30:
            _award('Dedicated Worker')
        if completed_count >= 100:
            _award('Team Player')
        if gps_in_count >= 50:
            _award('GPS Pro')
        if longest_streak >= 7:
            _award('Streak Master')

    # ------------------------------------------------------------------
    # Sample upcoming shifts (only for new employees)
    # ------------------------------------------------------------------
    db.session.flush()
    shift_hours_options = [8, 10, 12]
    for day_offset in range(1, 8):
        shift_date = now_utc + timedelta(days=day_offset)
        for emp in seed_targets:
            if rng.random() > 0.80:
                continue  # not every employee works every day
            loc = rng.choice(locations)
            start_hour = rng.choice([7, 8, 9, 14, 19])
            duration = rng.choice(shift_hours_options)
            scheduled_start = shift_date.replace(
                hour=start_hour, minute=0, second=0, microsecond=0
            )
            scheduled_end = scheduled_start + timedelta(hours=duration)
            shift = Shift(
                user_id=emp.id,
                location_id=loc.id,
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_end,
                notes='',
                status='scheduled',
                created_by=admin.id,
            )
            db.session.add(shift)

    # ------------------------------------------------------------------
    # Training modules (get-or-create by title)
    # ------------------------------------------------------------------
    from app.models.training import TrainingModule

    TRAINING_MODULE_DATA = [
        {
            'title': 'Manual Handling & Moving',
            'description': 'Learn safe lifting techniques, TILE assessment framework, and correct use of moving and handling equipment in a care setting.',
            'category': 'health_safety',
            'estimated_minutes': 20,
            'order_num': 1,
            'content': """# Manual Handling & Moving

## Why Manual Handling Matters

Manual handling injuries are one of the most common causes of workplace absence in the care sector. Poor technique when moving or lifting service users can cause serious, long-term back, shoulder, and neck injuries. As a care worker you have a legal duty under the Manual Handling Operations Regulations 1992 to follow safe procedures and use provided equipment.

## The TILE Assessment Framework

Before any manual handling task, carry out a TILE assessment:

- **T — Task**: What exactly needs to be done? Does it involve twisting, stooping, or carrying over a distance?
- **I — Individual**: Are you physically capable of this task? Do you have any existing injuries? Have you been trained?
- **L — Load**: How heavy or bulky is the load? Is it a person, equipment, or supplies? Can it be split into smaller loads?
- **E — Environment**: Is the floor wet or uneven? Is there enough space? Is lighting adequate?

If the risk is unacceptable after assessment, do not proceed without further controls or additional help.

## Safe Lifting Principles

When you must lift manually, follow these steps:
1. Plan the lift and check the route is clear.
2. Stand close to the load with feet shoulder-width apart for a stable base.
3. Bend at the knees and hips — never the lower back alone.
4. Keep the load close to your body throughout the movement.
5. Maintain the natural curve of your spine; do not twist.
6. Lift smoothly using leg muscles, not your back.
7. Lower the load by reversing the process.

## Moving and Handling Equipment

Profiled beds, hoists, slide sheets, transfer belts, and standing aids are provided to reduce manual effort. Always use the appropriate equipment and ensure it is in good working order before use. Report any damaged or missing equipment to your manager immediately. Never attempt a hoist transfer alone — a minimum of two trained staff is required.

## Reporting Injuries and Near Misses

If you sustain a manual handling injury or witness a near miss, report it immediately using the incident reporting system. Under RIDDOR, certain injuries must be formally reported to the HSE. Early reporting protects you, your colleagues, and the people in your care.
""",
        },
        {
            'title': 'Infection Control & Hand Hygiene',
            'description': 'Understand how infections spread in care settings, the correct hand washing technique, proper use of PPE, and isolation procedures.',
            'category': 'health_safety',
            'estimated_minutes': 15,
            'order_num': 2,
            'content': """# Infection Control & Hand Hygiene

## How Infections Spread

Infections in care settings spread through direct contact (touching), droplets (coughing/sneezing), airborne particles, contaminated surfaces (fomites), and faecal-oral routes. Understanding the chain of infection helps us break it at the earliest point.

## The Six Moments of Hand Hygiene

The World Health Organisation identifies six key moments when hand hygiene is essential:
1. **Before** touching a service user.
2. **Before** a clean or aseptic procedure.
3. **After** a body-fluid exposure risk.
4. **After** touching a service user.
5. **After** touching the service user's surroundings.
6. **Before** and after handling food.

## Correct Hand Washing Technique (WHO 7-Step Method)

Use soap and water for at least 20 seconds or an alcohol-based hand rub:
1. Wet hands and apply soap.
2. Rub palms together.
3. Right palm over left dorsum, interlaced fingers — repeat for other hand.
4. Palm to palm with fingers interlaced.
5. Backs of fingers to opposing palms, fingers interlocked.
6. Rotational rubbing of left thumb clasped in right palm — repeat for other thumb.
7. Rotational rubbing with clasped fingers of right hand in left palm — repeat. Rinse and dry thoroughly.

## Personal Protective Equipment (PPE)

Wear the correct PPE for each task:
- **Gloves**: For any contact with body fluids, open wounds, or soiled linen. Change between service users.
- **Aprons**: Disposable aprons for direct care tasks; change between service users.
- **Masks**: FFP3/surgical masks required during aerosol-generating procedures or confirmed respiratory infection.
- **Eye protection**: Required where splashing of body fluids is possible.

Always don PPE before entering and doff (remove) it carefully on exiting, disposing of it in the correct waste stream.

## Isolation Procedures

If a service user has a confirmed or suspected infection (e.g. C. difficile, norovirus, MRSA), they may need to be isolated in a single room with en-suite facilities where possible. Cohort nursing may be used when single rooms are unavailable. Ensure clear signage is displayed, a PPE station is placed outside the room, and that waste is handled as offensive/infectious as appropriate.
""",
        },
        {
            'title': 'Safeguarding Adults',
            'description': 'Understand the principles of adult safeguarding, the types of abuse, your duty to report, and the role of the MASH team.',
            'category': 'policy',
            'estimated_minutes': 25,
            'order_num': 3,
            'content': """# Safeguarding Adults

## What is Safeguarding?

Safeguarding means protecting an adult's right to live in safety, free from abuse and neglect. Under the Care Act 2014, local authorities have a legal duty to enquire into concerns about adult safeguarding. As a care worker you are often the first person to notice a change in a service user's wellbeing, making your role in safeguarding critical.

## The Six Principles of Safeguarding (Care Act 2014)

1. **Empowerment** — People are supported and encouraged to make their own decisions.
2. **Prevention** — It is better to take action before harm occurs.
3. **Proportionality** — The least intrusive response appropriate to the risk.
4. **Protection** — Support and representation for those in greatest need.
5. **Partnership** — Local solutions through services working with communities.
6. **Accountability** — Accountability and transparency in safeguarding practice.

## Types of Abuse

- **Physical abuse**: hitting, slapping, pushing, misuse of medication, restraint.
- **Emotional/psychological abuse**: threats, humiliation, controlling behaviour.
- **Sexual abuse**: any sexual activity without consent.
- **Financial/material abuse**: theft, fraud, exploitation, misuse of assets.
- **Neglect**: failure to provide basic care, food, medication, warmth.
- **Self-neglect**: a person neglects their own health or environment.
- **Discriminatory abuse**: abuse based on protected characteristics (Equality Act 2010).
- **Institutional/organisational abuse**: poor care standards, rigid routines, unsafe practices.
- **Modern slavery**: human trafficking, forced labour, domestic servitude.
- **Domestic abuse**: any abuse by an intimate partner or family member.

## Your Duty to Report

You have a **professional and moral duty** to report any safeguarding concerns. Do not keep concerns to yourself. Follow your organisation's safeguarding policy:
1. Ensure immediate safety — call 999 if someone is in immediate danger.
2. Do not investigate yourself or confront the alleged abuser.
3. Record what you have seen, heard, or been told, using the service user's own words where possible.
4. Report to your line manager and the Designated Safeguarding Lead immediately.
5. If your manager is implicated, report directly to the local authority safeguarding team.

## The Multi-Agency Safeguarding Hub (MASH)

The MASH is the single point of contact for safeguarding referrals in many local areas. It brings together social care, police, health, and education to share information and make coordinated decisions. Your organisation will have the local MASH contact details. Never delay a referral due to uncertainty — it is always better to report and let professionals assess.
""",
        },
        {
            'title': 'Fire Safety at Work',
            'description': 'Learn fire prevention, RACE and PASS procedures, types of fire and correct extinguishers, and your responsibilities during an evacuation.',
            'category': 'health_safety',
            'estimated_minutes': 15,
            'order_num': 4,
            'content': """# Fire Safety at Work

## Fire Prevention in Care Settings

Fire prevention is everyone's responsibility. Common causes of fire in care homes include: faulty electrical equipment, unattended cooking, smoking materials, and arson. To prevent fires:
- Never leave cooking unattended.
- Ensure electrical equipment is PAT-tested and switched off when not in use.
- Keep fire doors closed at all times — they are life-saving barriers.
- Store flammable substances (cleaning chemicals, oxygen) safely and away from ignition sources.
- Report any fire hazards to your manager without delay.

## The RACE Procedure

In the event of a fire, follow RACE:
- **R — Rescue**: Remove anyone in immediate danger if it is safe to do so.
- **A — Alert**: Activate the nearest fire alarm call point. Call 999.
- **C — Contain**: Close all doors and windows to contain the fire and smoke.
- **E — Extinguish/Evacuate**: Only attempt to fight a small, contained fire using the correct extinguisher. If in doubt, evacuate immediately.

## Using a Fire Extinguisher — PASS

Only use a fire extinguisher if you have been trained and the fire is small:
- **P — Pull** the pin.
- **A — Aim** the nozzle at the base of the fire.
- **S — Squeeze** the handle.
- **S — Sweep** from side to side at the base of the flames.

## Fire Classes and Extinguisher Types

| Class | Type of Fire | Correct Extinguisher |
|-------|-------------|---------------------|
| A | Solids (wood, paper, textiles) | Water, Foam, Dry powder |
| B | Flammable liquids | Foam, CO2, Dry powder |
| C | Flammable gases | Dry powder |
| E | Electrical equipment | CO2, Dry powder (never water) |
| F | Cooking oils/fats | Wet chemical |

## Evacuation Procedures

Know your building's evacuation plan, assembly point, and the location of all fire exits. Residents who cannot self-evacuate must be moved using Personal Emergency Evacuation Plans (PEEPs). Carry out a roll call at the assembly point and report to the fire marshal. Never re-enter the building until the fire service gives the all-clear.
""",
        },
        {
            'title': 'GDPR & Data Protection',
            'description': 'Understand what personal and special category data is, your responsibilities under UK GDPR, how to handle data breaches, and Subject Access Requests.',
            'category': 'policy',
            'estimated_minutes': 20,
            'order_num': 5,
            'content': """# GDPR & Data Protection

## What is Personal Data?

Under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, personal data is any information that can identify a living individual. This includes: names, addresses, email addresses, phone numbers, NHS numbers, and photographs.

**Special category data** requires additional protection and includes: health and medical information, racial or ethnic origin, religious beliefs, sexual orientation, genetic and biometric data, and criminal records. In a care setting, you will regularly handle special category data about the people in your care.

## Your Data Protection Responsibilities

As a care worker you must:
- Only access data about service users or colleagues that you need to do your job (**need to know** principle).
- Never share service user information with family members without the service user's explicit consent or a lawful basis.
- Keep physical records secure — filed away, not left on desks or in public areas.
- Use strong passwords and lock your screen when away from a device.
- Never use personal devices to take photographs of service users.
- Report any concerns about data handling to your Data Protection Officer (DPO).

## The Six Principles of UK GDPR

Data must be:
1. **Lawful, fair, and transparent** — processed on a valid legal basis.
2. **Purpose limited** — collected for a specified, explicit, and legitimate purpose.
3. **Data minimised** — only what is necessary.
4. **Accurate** — kept up to date.
5. **Storage limited** — not kept longer than necessary.
6. **Integrity and confidentiality** — kept secure.

## What to Do If There Is a Data Breach

A data breach occurs when personal data is lost, stolen, accessed without authorisation, or accidentally disclosed. If you suspect a breach:
1. Do not try to cover it up.
2. Report immediately to your manager and the DPO.
3. Under UK GDPR, serious breaches must be reported to the Information Commissioner's Office (ICO) within **72 hours**.
4. Document what happened, when, and the data involved.

## Subject Access Requests (SARs)

Any individual has the right to request a copy of the personal data your organisation holds about them. This is a Subject Access Request. You must respond within one calendar month. Always refer SARs to your manager or DPO — never handle them informally.
""",
        },
        {
            'title': 'Medication Awareness',
            'description': 'Understand medication storage requirements, how to use MAR charts correctly, handling of controlled drugs, and what constitutes a never event.',
            'category': 'procedure',
            'estimated_minutes': 20,
            'order_num': 6,
            'content': """# Medication Awareness

## Your Role and Scope

Not all care workers are trained to administer medication. You must only handle medication within your agreed role and competency. If you are not trained and assessed as competent to administer medication, your role is limited to prompting or supervising a service user who is self-administering.

## Medication Storage

Medications must be stored according to the manufacturer's instructions and your organisation's policy:
- Most oral medications should be stored in a locked, dry, room-temperature cabinet.
- Medications requiring refrigeration (e.g. insulin, some eye drops) must be kept in a dedicated, locked medication fridge between 2°C and 8°C.
- Controlled drugs (CDs) must be stored in a locked CD cabinet that is fixed to the wall, with access restricted to authorised staff only.
- Medicines must never be stored alongside food, cleaning products, or personal items.

## Medication Administration Records (MAR Charts)

A MAR chart is the legal record of all medication administered to a service user. You must:
- Sign immediately after administering medication — never in advance.
- Record refusals, omissions, and the reason using the correct code.
- Never use correction fluid (Tipp-Ex) — draw a line through any error and countersign with a senior.
- Check the 5 Rights before every administration: Right **Person**, Right **Medicine**, Right **Dose**, Right **Route**, Right **Time**.

## Controlled Drugs

Controlled drugs (such as morphine, diazepam, and some strong painkillers) are subject to additional legal controls under the Misuse of Drugs Act 1971. Two authorised staff must always be present for the administration and recording of controlled drugs. Any discrepancies in the CD register must be reported immediately to the manager and investigated.

## Medication Never Events

A never event is a serious, largely preventable safety incident. In medication management, never events include:
- Administering medication to the wrong person.
- Administering the wrong medication or dose.
- Administering medication via the wrong route (e.g. oral medication given intravenously).
- Failure to administer a prescribed critical medication.

If you witness or are involved in a medication error, report it immediately, do not administer further doses, observe the service user for adverse effects, and complete an incident report. Transparency and prompt reporting saves lives.
""",
        },
        {
            'title': 'Mental Health First Aid Awareness',
            'description': 'Learn to recognise the signs of common mental health conditions, how to offer initial support to colleagues and service users, and where to signpost for professional help.',
            'category': 'hr',
            'estimated_minutes': 30,
            'order_num': 7,
            'content': """# Mental Health First Aid Awareness

## Why Mental Health Matters in Care

Care workers face high levels of stress, emotional labour, and compassion fatigue. At the same time, many of the people we support live with mental health conditions. Understanding mental health helps us support both the people in our care and ourselves and our colleagues more effectively.

One in four people in the UK will experience a mental health problem each year. Mental health conditions — including depression, anxiety, and psychosis — are as real and as serious as physical health conditions and deserve the same level of care and respect.

## Recognising the Signs

Common signs that someone may be struggling with their mental health include:
- Persistent low mood, tearfulness, or hopelessness.
- Withdrawing from colleagues, friends, or activities they normally enjoy.
- Changes in sleep, appetite, or personal hygiene.
- Difficulty concentrating or making decisions.
- Increased irritability, agitation, or anxiety.
- Expressing feelings of worthlessness, hopelessness, or thoughts of self-harm.

You do not need to diagnose — your role is to notice a change and respond with compassion.

## How to Offer Initial Support

If you are concerned about a colleague or service user:
1. **Choose the right moment** — find a private, calm space.
2. **Ask directly** — "I've noticed you seem a bit down lately. Are you okay?" Asking about mental health does not plant ideas; it opens a door.
3. **Listen actively** — give the person your full attention, don't interrupt, and avoid jumping to solutions.
4. **Avoid minimising** — phrases like "cheer up" or "it could be worse" are unhelpful.
5. **Signpost, don't diagnose** — encourage them to speak to their GP, or offer to help them access support.
6. **Follow up** — check in again in a few days.

## When to Seek Immediate Help

If someone discloses thoughts of suicide or self-harm, take it seriously. Stay with them, listen, and do not leave them alone if risk is imminent. Contact your manager or the on-call clinician immediately, and if there is immediate risk to life, call 999.

## Self-Care for Care Workers

You cannot pour from an empty cup. Protecting your own mental health is not a luxury — it is essential to delivering safe, compassionate care. Practical self-care includes:
- Debriefing with a trusted colleague after a distressing incident.
- Using your organisation's Employee Assistance Programme (EAP) for confidential counselling.
- Taking your breaks and annual leave.
- Setting boundaries between work and personal life.
- Speaking to your manager early if workload becomes unmanageable.

## Key Resources

- **Samaritans**: 116 123 (free, 24/7)
- **Mind**: www.mind.org.uk
- **NHS Every Mind Matters**: www.nhs.uk/every-mind-matters
- **Crisis Text Line**: Text SHOUT to 85258
""",
        },
    ]

    for i, tm_data in enumerate(TRAINING_MODULE_DATA):
        existing_tm = TrainingModule.query.filter_by(title=tm_data['title']).first()
        if not existing_tm:
            module = TrainingModule(
                title=tm_data['title'],
                description=tm_data['description'],
                category=tm_data['category'],
                estimated_minutes=tm_data['estimated_minutes'],
                order_num=tm_data['order_num'],
                content=tm_data['content'],
                is_active=True,
                created_by=admin.id,
            )
            db.session.add(module)

    db.session.flush()

    # ------------------------------------------------------------------
    # Default company documents (get-or-create by title)
    # ------------------------------------------------------------------
    from app.models.document import Document

    DOCUMENT_DATA = [
        {
            'title': 'Code of Conduct',
            'description': 'Our standards of behaviour and professional conduct expected of all staff.',
            'category': 'policy',
            'content': """# Code of Conduct

## Introduction

This Code of Conduct sets out the standards of behaviour expected of all employees at our care agency. It applies to every member of staff in every setting — care homes, community visits, or administrative offices. By accepting employment with us, you agree to uphold these standards at all times.

## Core Values

Our work is guided by five core values:
- **Dignity and Respect**: Treat every service user, colleague, and visitor with the same dignity and respect you would wish to receive yourself.
- **Compassion**: Recognise and respond to the emotional, physical, and social needs of the people in our care.
- **Integrity**: Be honest, transparent, and accountable in everything you do.
- **Excellence**: Strive to deliver the highest standard of care, continuously learning and improving.
- **Inclusion**: Value diversity and ensure that nobody is discriminated against on any grounds.

## Professional Behaviour

All staff are expected to:
- Arrive punctually and in a fit state to work.
- Wear the correct uniform and maintain personal hygiene standards.
- Follow all policies and procedures at all times.
- Maintain professional boundaries with service users and their families. Do not accept gifts, money, or personal favours.
- Keep all information about service users and colleagues confidential in line with GDPR and our Data Protection Policy.
- Declare any conflicts of interest to your line manager immediately.

## Conduct Outside Work

Your conduct outside of work can reflect on our organisation. You must not post content on social media that identifies service users, colleagues, or our premises in a way that could cause harm or bring the organisation into disrepute. Caution should be exercised with personal social media activity given your role as a care professional.

## Breaches of the Code

Any breach of this Code of Conduct may result in disciplinary action up to and including dismissal, and in serious cases may be referred to the relevant professional regulator or the police. Examples of serious breaches include: abuse or neglect of a service user, theft, falsification of records, and working while unfit due to alcohol or drugs.

## Raising Concerns

If you witness behaviour that breaches this Code, you have a duty to report it. You can speak to your line manager, the HR team, or use our confidential whistleblowing procedure. You will not be penalised for raising a genuine, good-faith concern.
""",
        },
        {
            'title': 'Health & Safety Policy',
            'description': 'Our commitment to maintaining a safe working environment and the responsibilities of all staff.',
            'category': 'health_safety',
            'content': """# Health & Safety Policy

## Statement of Intent

Our organisation is committed to providing a safe and healthy working environment for all employees, service users, visitors, and contractors. We will comply with all applicable health and safety legislation, including the Health and Safety at Work etc. Act 1974, the Management of Health and Safety at Work Regulations 1999, and all associated regulations.

## Responsibilities

**Management responsibilities include:**
- Ensuring adequate resources are available for health and safety.
- Conducting and reviewing risk assessments for all significant hazards.
- Providing appropriate health and safety training for all staff.
- Investigating all accidents and near misses and implementing corrective actions.

**Employee responsibilities include:**
- Taking reasonable care for their own health and safety and that of others.
- Following safe working procedures and using provided safety equipment.
- Reporting any hazards, near misses, accidents, or unsafe conditions to their manager.
- Not intentionally misusing or recklessly interfering with safety equipment.

## Risk Assessment

Risk assessments are conducted for all significant activities including manual handling, lone working, COSHH substances, and fire. Risk assessments are documented, reviewed annually, and updated whenever there is a significant change in circumstances.

## Accident and Incident Reporting

All accidents, near misses, dangerous occurrences, and work-related ill health must be recorded in the accident book and reported to the manager. Significant incidents may need to be reported to the Health and Safety Executive (HSE) under the Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013 (RIDDOR).

## Review

This policy is reviewed annually by senior management or sooner if there is a significant change in legislation, our work activities, or following a serious incident.
""",
        },
        {
            'title': 'Absence & Leave Policy',
            'description': 'Guidance on reporting sickness absence, requesting annual leave, and other types of leave available to staff.',
            'category': 'hr',
            'content': """# Absence & Leave Policy

## Sickness Absence

If you are unable to attend work due to illness, you must contact your line manager **before** the start of your shift — not by text message, and not by leaving a voicemail unless specifically agreed. You should call personally unless you are physically unable to do so.

You must provide a self-certification form (SC2) for absences of up to seven calendar days. For absences of eight or more days, you must obtain a fit note from your GP or other authorised healthcare professional.

**Return to Work Meetings**: A return to work meeting will be held after every period of absence. This is a supportive process and not a disciplinary measure. It helps us understand the reason for your absence and whether any reasonable adjustments can be made.

**Triggers for Formal Review**: Frequent short-term absences (e.g. four or more occurrences in a rolling 12-month period, or 8 or more days of absence) or long-term absence (4+ weeks continuously) may trigger a formal attendance review under our Attendance Management Procedure.

## Annual Leave

The leave year runs from 1 April to 31 March. Full-time employees are entitled to 28 days of annual leave including bank holidays. Part-time employees receive leave on a pro-rata basis.

Annual leave requests should be submitted through the WMS portal with a minimum of two weeks' notice. Requests will be approved subject to operational needs. A minimum of two weeks' leave must be taken during the leave year and leave cannot generally be carried over.

## Other Types of Leave

- **Compassionate leave**: Up to 5 paid days for the death of a close family member, subject to manager approval.
- **Emergency dependant leave**: Reasonable unpaid time off to deal with emergencies involving a dependant (Employment Rights Act 1996).
- **Maternity, paternity, and adoption leave**: In line with current statutory entitlements.
- **Study leave**: Available for mandatory training and agreed CPD activity. Discuss with your manager.
- **Public duties**: Reasonable unpaid time off for jury service, magistrate duties, or similar public roles.

## Long-Term Absence

Where absence is likely to be long-term, we will arrange an occupational health referral and explore all reasonable adjustments before considering other options. We are committed to supporting employees back to work wherever possible.
""",
        },
        {
            'title': 'Data Protection Policy',
            'description': 'How we collect, store, process, and protect personal data in compliance with UK GDPR and the Data Protection Act 2018.',
            'category': 'policy',
            'content': """# Data Protection Policy

## Introduction

We are committed to ensuring that all personal data we hold about employees, service users, and other individuals is processed lawfully, fairly, and transparently in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.

## Definitions

- **Personal data**: Any information relating to an identified or identifiable living individual.
- **Special category data**: Sensitive personal data including health information, racial or ethnic origin, religious beliefs, and sexual orientation.
- **Data subject**: The individual whose personal data is being processed.
- **Data controller**: Our organisation, which determines the purposes and means of processing personal data.
- **Data processor**: Any third party that processes data on our behalf.

## Lawful Basis for Processing

We will only process personal data where we have a lawful basis to do so. In the context of employment and care delivery, this typically includes:
- **Legal obligation**: Processing payroll, maintaining care records, safeguarding.
- **Legitimate interests**: Monitoring attendance, managing performance.
- **Consent**: Marketing communications (where applicable).
- **Contract**: Processing data necessary to fulfil our employment or care contracts.

## Your Responsibilities as a Staff Member

All staff must:
- Only access personal data relevant to their job role.
- Keep login credentials confidential and never share passwords.
- Lock computer screens when leaving a workstation unattended.
- Dispose of paper records containing personal data using the confidential waste shredding service.
- Report any actual or suspected data breach to the Data Protection Officer (DPO) immediately.

## Data Retention

Personal data will be retained only for as long as necessary for the purpose for which it was collected, and in accordance with our Data Retention Schedule. Care records are typically retained for a minimum of eight years after the last episode of care (longer for children's records).

## Subject Access Requests

Any individual has the right to request access to the personal data we hold about them. All SARs must be directed to the DPO and responded to within one calendar month. Staff must not process a SAR informally without DPO involvement.

## Data Breaches

A personal data breach is a security incident that leads to accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data. All suspected breaches must be reported to the DPO within 24 hours of discovery. The ICO must be notified within 72 hours if the breach is likely to result in a risk to individuals' rights and freedoms.
""",
        },
        {
            'title': 'Lone Working Policy',
            'description': 'Guidance for staff who work alone, including risk assessment requirements, check-in procedures, and what to do in an emergency.',
            'category': 'procedure',
            'content': """# Lone Working Policy

## What is Lone Working?

Lone working means working in a situation where a staff member cannot be seen or easily reached by a colleague. In our care setting, this commonly includes community carers visiting service users at home, night shift workers in residential care with reduced staffing, and staff travelling between locations.

## Risk Assessment for Lone Working

Before lone working is permitted, a specific risk assessment must be completed for each lone working scenario. This assessment considers:
- The nature of the work and level of client risk (including history of aggression).
- Travel arrangements and environmental risks.
- Communication arrangements and escalation procedures.
- The member of staff's training, experience, and any health conditions relevant to lone working.

Risk assessments are reviewed at least annually and updated whenever circumstances change.

## Responsibilities of Lone Workers

If you are working alone, you must:
- Inform your line manager of your planned schedule, including client visit times and travel routes.
- Carry your work mobile phone and ensure it is fully charged before departure.
- Complete the check-in procedure: contact your manager (or a designated colleague) at the agreed times during your shift.
- Never place yourself in a situation you feel is unsafe — trust your instincts and leave if necessary.
- Report all concerns about your safety, or those of the service user, to your manager immediately.

## Check-In Procedure

Lone workers must use the WMS GPS check-in function at the start and end of each visit. Additionally, for high-risk visits or late evening work, a verbal check-in call to the on-call manager is required. If you fail to check in within 15 minutes of your agreed check-in time, your manager will attempt to contact you. If contact cannot be established within a further 15 minutes, a welfare check will be initiated.

## Dealing with Emergencies

If you feel at risk during a lone working visit:
1. If safe to do so, leave the premises immediately.
2. Call 999 if there is an immediate threat to safety.
3. Contact your manager as soon as you are safe.
4. Do not return to the premises until a risk review has been completed.

Lone workers who are subject to threatening or violent behaviour will be fully supported through our Dignity at Work and Critical Incident Support procedures.

## Unsocial Hours Working

Additional precautions apply for staff working between 22:00 and 06:00. These include mandatory vehicle checks before departure, double check-in frequencies, and a named on-call manager who must be contactable throughout the shift.
""",
        },
    ]

    for doc_data in DOCUMENT_DATA:
        existing_doc = Document.query.filter_by(title=doc_data['title']).first()
        if not existing_doc:
            doc = Document(
                title=doc_data['title'],
                description=doc_data['description'],
                category=doc_data['category'],
                content=doc_data['content'],
                is_active=True,
                uploaded_by=admin.id,
            )
            db.session.add(doc)

    db.session.flush()

    # ------------------------------------------------------------------
    # Welcome notifications for new employees
    # ------------------------------------------------------------------
    from app.models.notification import Notification

    for emp in seed_targets:
        existing_notif = Notification.query.filter_by(
            user_id=emp.id, type='document_added'
        ).first()
        if not existing_notif:
            notif = Notification(
                user_id=emp.id,
                type='document_added',
                title='Welcome to the team! Check out company documents',
                body='Important company policies and procedures are available in the Documents section.',
                is_read=False,
                link='/documents',
            )
            db.session.add(notif)

    # ------------------------------------------------------------------
    # Absences (sample mix of statuses and types)
    # ------------------------------------------------------------------
    from app.models.absence import Absence
    from datetime import date

    if Absence.query.count() == 0 and employees:
        absence_scenarios = [
            # (employee index, days_ago_start, days_duration, type, reason, status, admin_notes)
            (0, 45, 1, 'sick',      'Flu symptoms, fever overnight.',                    'approved',  'Return to work meeting completed.'),
            (1, 30, 3, 'holiday',   'Pre-booked family holiday.',                        'approved',  'Leave approved. Cover arranged.'),
            (2, 20, 1, 'sick',      'Migraine — unable to drive.',                       'approved',  None),
            (3, 15, 1, 'emergency', 'Water leak at home, emergency plumber needed.',     'approved',  'Understood. Hope it was resolved quickly.'),
            (4, 10, 2, 'sick',      'Chest infection, GP recommended rest.',             'approved',  'Fit note received. Get well soon.'),
            (5,  5, 1, 'sick',      'Stomach bug.',                                      'pending',   None),
            (6,  3, 5, 'holiday',   'Annual leave — visiting family abroad.',            'pending',   None),
            (7,  2, 1, 'other',     'Childcare emergency, nursery closed unexpectedly.', 'approved',  'Dependant emergency leave granted.'),
            (8,  1, 1, 'sick',      '',                                                  'pending',   None),
            (9,  8, 1, 'emergency', 'Bereavement — close family member.',               'approved',  'Compassionate leave approved. Our condolences.'),
            (0, 60, 2, 'holiday',   'Long weekend break.',                               'approved',  None),
            (2, 55, 1, 'sick',      'Back pain, unable to stand for long periods.',      'rejected',  'Unable to approve without fit note for this period. Please resubmit.'),
        ]

        for emp_idx, days_ago, duration, abs_type, reason, status, admin_notes in absence_scenarios:
            if emp_idx >= len(employees):
                continue
            emp = employees[emp_idx]
            start_date = (now_utc - timedelta(days=days_ago)).date()
            end_date = (now_utc - timedelta(days=days_ago - duration + 1)).date() if duration > 1 else None
            reviewed_at = now_utc - timedelta(days=max(0, days_ago - 2)) if status != 'pending' else None
            absence = Absence(
                user_id=emp.id,
                date=start_date,
                end_date=end_date,
                type=abs_type,
                reason=reason,
                status=status,
                admin_notes=admin_notes,
                reviewed_by=admin.id if status != 'pending' else None,
                reviewed_at=reviewed_at,
                created_at=now_utc - timedelta(days=days_ago),
            )
            db.session.add(absence)

    # ------------------------------------------------------------------
    # Messages (admin announcements + employee enquiries)
    # ------------------------------------------------------------------
    from app.models.message import Message

    if Message.query.count() == 0 and employees:
        message_scenarios = [
            # (from_idx, to_idx, subject, body, days_ago, is_read)
            # from_idx/to_idx: -1 = admin
            (-1, 0, 'Welcome to the team, John!',
             'Hi John,\n\nWelcome aboard! Please make sure you complete your mandatory training modules within your first two weeks.\n\nIf you have any questions, don\'t hesitate to get in touch.\n\nBest regards,\nAdmin',
             20, True),
            (-1, 1, 'Payroll — April update',
             'Hi Emily,\n\nJust a reminder that April payslips will be processed on the 28th. If you notice any discrepancies with your hours, please get in touch by the 25th.\n\nThanks,\nAdmin',
             5, True),
            (0, -1, 'Question about holiday entitlement',
             'Hi,\n\nI wanted to check — do unused holidays carry over to the next leave year? I have 3 days left and I\'m not sure I can use them before March.\n\nThanks,\nJohn',
             4, True),
            (-1, 0, 'Re: Question about holiday entitlement',
             'Hi John,\n\nGenerally we don\'t allow carry-over, but given the circumstances I\'ve noted 3 days for you. Please try to use them before the 31st if possible.\n\nThanks,\nAdmin',
             3, False),
            (1, -1, 'Shift swap request',
             'Hi,\n\nI was wondering if it would be possible to swap my shift on Saturday 3rd May with Laura Bailey? We\'ve both agreed and it works for our travel arrangements.\n\nKind regards,\nEmily',
             6, True),
            (-1, 1, 'Re: Shift swap request',
             'Hi Emily,\n\nThat\'s fine — I\'ve updated the schedule. Please both confirm your shifts on the system.\n\nThanks,\nAdmin',
             5, True),
            (-1, 2, 'Training reminder — Safeguarding Adults',
             'Hi Michael,\n\nOur records show you haven\'t yet completed the Safeguarding Adults module. This is mandatory and must be finished by Friday. Please log into the Training section to complete it.\n\nThanks,\nAdmin',
             2, False),
            (2, -1, 'Uniform request',
             'Hi,\n\nMy work polo shirt has a small tear. Could I get a replacement please? I\'m a size L.\n\nThanks,\nMichael',
             3, True),
            (-1, 3, 'GPS check-in reminder',
             'Hi Sarah,\n\nWe noticed your GPS check-in wasn\'t verified at Oadby Manor last Tuesday. Please make sure you\'re using the app while on-site. Let me know if you\'re having any technical issues.\n\nThanks,\nAdmin',
             7, True),
            (-1, 4, 'Monthly performance update',
             'Hi David,\n\nJust a quick note to say you\'ve had an excellent month — 100% GPS check-in verification rate and no missed shifts. Keep it up!\n\nBest,\nAdmin',
             10, True),
            (4, -1, 'Overtime this weekend?',
             'Hi,\n\nI noticed there are a couple of open shifts this weekend at Beaumont Lodge. Would I get overtime rates if I pick them up? I\'ve already done 40 hours this week.\n\nThanks,\nDavid',
             1, False),
            (-1, 5, 'Welcome to the team, Amira!',
             'Hi Amira,\n\nWelcome aboard! Your first shift is scheduled for next Monday at Beaumont Lodge Care Home. Please check your schedule in the app.\n\nLooking forward to having you on the team.\n\nBest,\nAdmin',
             14, True),
        ]

        for from_idx, to_idx, subject, body, days_ago, is_read in message_scenarios:
            from_id = admin.id if from_idx == -1 else employees[from_idx].id
            to_id = admin.id if to_idx == -1 else employees[to_idx].id
            msg = Message(
                from_user_id=from_id,
                to_user_id=to_id,
                subject=subject,
                body=body,
                is_read=is_read,
                created_at=now_utc - timedelta(days=days_ago),
            )
            db.session.add(msg)

    db.session.commit()
    print('Database seeded successfully.')
