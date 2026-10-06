# MedAI MVP

React + FastAPI application for patient/claim cases, medical document intake, Groq-powered extraction and clinical analysis, human review, reports, and audit logs.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind
- Backend: FastAPI, SQLAlchemy, Alembic, SQLite (set `DATABASE_URL` later for Postgres)
- AI: Groq (`GROQ_API_KEY`)

## Setup

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` and set `GROQ_API_KEY`. Optionally change `SECRET_KEY`.

```powershell
uvicorn app.main:app --reload --port 8000
```

SQLite is created on first run. Alembic migrations live in `backend/alembic` for a later Postgres move:

```powershell
alembic upgrade head
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Seed users

| Email | Password | Role |
| --- | --- | --- |
| admin@medai.local | Admin123! | admin |
| doctor@medai.local | Doctor123! | doctor |
| reviewer@medai.local | Review123! | insurance_reviewer |
| staff@medai.local | Staff123! | staff |

Staff can create cases and upload documents. They cannot finalize a decision.

## Workflow

Patient/Claim case → upload PDFs/images → OCR/text extraction → Groq structured extraction → clinical analysis and recommendations → human review → report/decision → audit analytics.
