CERTIFLOW FRONTEND — SETUP
===========================

This is a responsive HTML/CSS/JavaScript UI for your existing FastAPI project.
It uses these backend routes:
  POST /jobs
  GET /jobs/{job_id}
  GET /jobs/certificates/{certificate_id}
  GET /health (connection indicator)

FILES
  index.html  Page layout
  styles.css  Responsive visual design
  app.js      CSV import, API calls, progress polling and PDF downloads

1. Extract certiflow-frontend.zip and open the extracted folder in VS Code.
2. Start your existing backend from its project folder:
     uvicorn app.main:app --reload
   Check http://127.0.0.1:8000/docs.
3. Serve this frontend using VS Code Live Server (right-click index.html > Open with Live Server).
   Alternatively, open a terminal in this folder and run:
     python -m http.server 5500
   Then visit http://127.0.0.1:5500.
   Do not double-click index.html to open it as a file.

CORS (only if browser Console reports a CORS error)
Add this to app/main.py after `app = FastAPI(...)` and before router registrations.
Keep your existing app and router setup; do not create another FastAPI instance.

  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "http://127.0.0.1:5500", "http://localhost:5500",
          "http://127.0.0.1:5501", "http://localhost:5501"
      ],
      allow_credentials=False,
      allow_methods=["*"],
      allow_headers=["*"],
  )

If your Live Server uses a different port, add its exact origin to allow_origins.
The frontend expects API_BASE = "http://127.0.0.1:8000" in app.js. Change that constant if needed.

USAGE
- Enter a course/achievement name.
- Edit the sample recipients, click Add recipient, or upload CSV.
- CSV needs headers named `name,email`, then one recipient per row.
- Click Generate certificates. Progress refreshes every 1.5 seconds.
- Use Download PDF beside each completed recipient.

API EXPECTATIONS
POST /jobs body: {"course_name":"...","recipients":[{"name":"...","email":"..."}]}
GET /jobs/{job_id} should return a certificates array containing id, recipient_name,
recipient_email, status, and optionally download_url and error_message.
The frontend falls back to /jobs/certificates/{certificate_id} for completed certificates.

Job activity is held in browser memory for the current page session only; it is not permanent
database history. Keep this page open during progress polling. API/backend errors appear on screen.
