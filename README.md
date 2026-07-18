# CareerPilot — AI Resume Fit Analyzer

CareerPilot is a web app that compares your resume against a job description and gives
you an AI-generated breakdown of your fit: a keyword match score, your strengths, gaps,
and concrete suggestions to improve your resume for that specific role.

## How it works

1. Sign up for an account, then log in.
2. Upload your resume as a PDF or DOCX file, and paste the job description into the text box.
3. Click **Analyze Fit**.
4. The backend extracts your resume's text, sends both it and the job description to
   Google's Gemini AI, and displays the structured result — Match Score, Matched/Missing
   Keywords, Overall Fit, Strengths, Gaps, and Suggestions.

## Built with

- **FastAPI** (Python) — backend web framework
- **Vanilla HTML / CSS / JavaScript** — frontend, no framework
- **Google Gemini API** — the AI model that performs the actual analysis
- **pypdf / python-docx** — extract text from uploaded PDF/DOCX resumes
- **SQLite + bcrypt** — user accounts, with hashed (never plain-text) passwords

## Running locally

1. Clone this repo and move into the `Static/` folder:
   ```
   cd Static
   ```
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file in `Static/` with:
   ```
   GEMINI_API_KEY=your_key_from_aistudio.google.com
   SESSION_SECRET_KEY=any_random_string
   ```
4. Run the server:
   ```
   python3 -m uvicorn main:app --port 8000
   ```
5. Open `http://127.0.0.1:8000` in your browser, sign up, and try it out.

## Project structure

- `Static/main.py` — the entire backend: signup/login, session handling, and the
  `/analyze` endpoint that calls Gemini
- `Static/index.html`, `Static/script.js`, `Static/Style.css` — the frontend
- `prompts/` — saved versions of the AI prompt, with notes on what changed and why
- `LEARNINGS.md` — findings from testing, model selection notes, and known limitations
