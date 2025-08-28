# Sainik Shifa Setu – Frontend + Backends

Run the frontend (Vite), Node.js backend (Express), and Python backend (FastAPI).

Frontend
- Install deps: `npm ci`
- Dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

Node.js backend (Express)
- Path: `server/`
- Install deps: `npm ci --prefix server`
- Start: `npm start --prefix server`
- URL: `http://localhost:4000`
- Health: `GET /api/health`

Python backend (FastAPI)
- Path: `pyapi/`
- Create venv (optional): `python3 -m venv .venv && source .venv/bin/activate`
- Install deps: `pip install -r pyapi/requirements.txt`
- Start: `uvicorn pyapi.main:app --reload --port 5001`
- URL: `http://localhost:5001`
- Health: `GET /api/health`

Notes
- Frontend currently uses localStorage. You can wire frontend calls to the backends via `/api/*` when ready.
- The CSD cart, grievance tickets, and schemes hub work on the client; backends provide scaffolds for future persistence and recommendation logic.