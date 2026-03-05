# My Home Server

This repository is a home server web app. It contains three top-level folders:

- `web` – React + Vite + Tailwind frontend
- `api` – NestJS backend (TypeORM) connecting to PostgreSQL and MinIO
- `services` – additional services (first service: minio-backed cloud storage)

This initial commit provides:

- Signup / Signin pages (frontend)
- Email OTP activation flow: 4-digit OTP valid for `OTP_TTL_SECONDS` (default 300s) and resend buffer `OTP_RESEND_BUFFER_SECONDS` (default 60s)
- MinIO + Postgres docker-compose configuration
- Storage service scaffold using MinIO with per-user quota configured via `USER_STORAGE_QUOTA_BYTES` (default 20GB)

Getting started (development)

1. Copy `.env.example` to `.env` and set values (especially SMTP, JWT_SECRET).
2. Start Postgres and MinIO:

```powershell
docker-compose up -d
```

3. Backend

Open a terminal in `api` and run:

```powershell
npm install
npm run dev
```

4. Frontend

Open a terminal in `web` and run:

```powershell
npm install
npm run dev
```

You can then open `http://localhost:5173` (Vite default) and it will redirect to the Sign In page.

Notes

- The implementation is intentionally minimal but complete enough to extend. See `api/src` for controllers and services.
- Email requires SMTP settings. For local testing you can use Mailtrap or similar.
- MinIO web UI is available at `http://localhost:9000`.
