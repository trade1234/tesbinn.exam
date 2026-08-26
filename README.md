# Online Examination System

Production-oriented MERN online examination system with JWT authentication, role-based admin/student portals, exam attempts, auto-save answers, result analytics, PDF export, and Excel export.

## Setup

```bash
npm run install:all
npm run dev
```

The API runs on `http://localhost:5000` and the Vite client runs on `http://localhost:5173`.

Read-only third-party Data Analytics integration: [docs/data-analytics-api.md](docs/data-analytics-api.md).

## Environment

The backend reads `server/.env`. Update `JWT_SECRET` before production deployment.

