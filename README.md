# AI-Powered Educational Management & Learning Platform

An AI-powered, multi-tenant educational management and learning platform designed to help schools manage their academic activities, students, teachers, finances, and online learning from one centralized system.

Each school operates through its own branded website and domain while maintaining independent users, academic records, financial information, and learning content.

## Project Overview

The platform aims to simplify educational management by bringing academic administration, online learning, financial management, communication, and AI-powered assistance into one integrated application.

It is designed for different types of educational institutions, including academic schools and professional skills-training institutions.

The system follows a multi-tenant architecture, allowing multiple schools to use the same platform while keeping their data isolated.

## Main Features

### 1. School Management
- School registration and onboarding.
- Custom school domains and branding.
- School-specific website management.
- Multiple school administrators.
- Role-based access control.

### 2. User Management
- Student management.
- Teacher management.
- School accountant management.
- School administrator management.
- Invitation-based staff account creation.
- School-specific user accounts and permissions.

### 3. Academic Management
- Course management.
- Academic and skill-based programs.
- Academic grade management.
- Student enrollment.
- Student group and class management.
- Teacher assignments.

### 4. Learning Management
- Flexible course and lesson organization.
- Learning materials and resources.
- Online learning content.
- Assignment creation and submission.
- Online assessments and examinations.
- Learning progress tracking.

### 5. Finance and Payment Management
- Student fee management.
- Full and installment payments.
- Partial payment support.
- Online and offline payment processing.
- Payment verification.
- Financial reports and receipts.
- Outstanding balance tracking.

### 6. Live Classes
- Online live teaching.
- Scheduled classes.
- Teacher and student participation.
- Optional class recordings.
- Recording access management.

### 7. AI-Powered Features
- AI student learning assistant.
- AI-assisted teaching content creation.
- Learning recommendations.
- AI-powered learning support.
- AI-assisted assessment and grading suggestions.

### 8. Communication and Notifications
- School announcements.
- Student notifications.
- Assignment and payment reminders.
- Configurable notification preferences.

### 9. Analytics and Reporting
- Student performance reports.
- Academic reports.
- Attendance reports.
- Financial reports.
- Enrollment statistics.
- Role-specific dashboards.

## Architecture

The platform uses a centralized multi-tenant architecture.

Each school has its own isolated environment at the application level, including its users, courses, students, financial records, and website content.

Database-level Row-Level Security (RLS) is planned as an additional tenant-isolation mechanism.

The platform is designed to support both shared hosting and dedicated deployments using the same application codebase.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React |
| Frontend Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend | Node.js |
| Backend Framework | Express.js |
| Backend Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| API Architecture | REST API |
| Authentication | To be finalized during implementation |
| Live Video | Specialized video service (provider to be selected) |
| AI Integration | AI provider integration (to be implemented) |

## Project Structure

```text
education-platform/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── assets/
│       ├── components/
│       ├── modules/
│       ├── hooks/
│       ├── services/
│       ├── utils/
│       ├── types/
│       ├── styles/
│       ├── App.tsx
│       └── main.tsx
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       ├── database/
│       ├── middleware/
│       ├── modules/
│       ├── integrations/
│       ├── jobs/
│       ├── events/
│       ├── security/
│       ├── shared/
│       ├── app.ts
│       └── server.ts
│
├── shared/
│   ├── types/
│   ├── constants/
│   └── schemas/
│
├── .gitignore
├── package.json
└── README.md
```

## User Roles

The platform supports the following school-level roles:

- **School Admin:** Manages school operations, users, academic activities, and permissions.
- **Teacher:** Manages assigned courses, lessons, assignments, assessments, and student learning activities.
- **Student:** Accesses enrolled programs, learning materials, live classes, assignments, and assessments.
- **School Accountant:** Manages student payments, payment verification, receipts, and financial records.

A separate **Platform Super Admin** role manages platform-level operations, tenant provisioning, domains, deployments, and technical support.

## Security and Data Isolation

Security is a fundamental part of the architecture.

Planned security measures include:

- PostgreSQL Row-Level Security (RLS).
- Tenant-aware database relationships and constraints.
- Role-Based Access Control (RBAC).
- Secure authentication and password handling.
- Backend authorization and resource-level access checks.
- Private file storage and controlled access.
- Audit logs for sensitive operations.
- Secure payment verification and transaction handling.

## Development Status

<mark>Under active development</mark>

The project is being developed incrementally, beginning with the application foundation and database architecture before implementing individual business modules.

Features described in this README represent the project scope and planned functionality. They are not necessarily implemented yet.

## Getting Started

Installation instructions will be added as the frontend, backend, and database setup are completed.

## Project Goals

- Simplify school management.
- Improve online learning experiences.
- Support different educational institutions.
- Provide AI-assisted learning and teaching.
- Protect school-specific data and educational content.
- Support flexible school branding and custom domains.
- Provide reliable academic and financial management.

## License

The license has not yet been selected.