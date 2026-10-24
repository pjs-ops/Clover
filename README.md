# ✨ Lumi — Your AI Study Buddy

Lumi is a calming, pastel-themed AI chatbot built with React + FastAPI + Google Gemini. Ask questions, get simple explanations, summaries, quizzes, and more.

![Lumi Logo](frontend/public/lumi-logo.png)

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons |
| Backend | Python 3.11+, FastAPI, Google Gemini API (`google-genai`) |
| Database | SQLite (WAL mode) |

---

## 📦 Prerequisites

- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **Python** 3.11+ — [python.org](https://python.org)
- **Google Gemini API Key** — [aistudio.google.com](https://aistudio.google.com/app/apikey)

---

## 🚀 Installation & Setup (Windows)

### 1. Clone / Download the project

```powershell
cd C:\path\to\LUMI
```

### 2. Set up the Backend

```powershell
# Navigate to backend
cd backend

# Create a virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure API Key

```powershell
# Copy the example .env file
copy .env.example .env

# Open and edit .env — add your Gemini API key
notepad .env
```

Your `backend/.env` should look like:

```
GEMINI_API_KEY=AIza...your_key_here
GEMINI_MODEL=gemini-2.0-flash
```

### 4. Set up the Frontend

```powershell
# Open a new terminal window and navigate to frontend
cd C:\path\to\LUMI\frontend

# Install dependencies
npm install
```

---

## ▶️ Running the Application

You need **two terminal windows** running simultaneously.

### Terminal 1 — Backend

```powershell
cd C:\path\to\LUMI\backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend

```powershell
cd C:\path\to\LUMI\frontend
npm run dev
```

Open your browser at **http://localhost:5173** 🎉

---

## 🧪 Running Tests

```powershell
cd C:\path\to\LUMI\backend
.venv\Scripts\activate
pytest tests/ -v
```

---

## 🎨 Features

- **💬 Multi-turn conversations** — Lumi remembers context within each chat
- **📚 Study shortcuts** — Explain Simply, Summarize, Generate Quiz
- **📄 Document Q&A** — Upload PDF or TXT files and ask questions about them
- **🗂 Persistent chats** — Conversations survive page refreshes (SQLite)
- **✨ Loading splash** — Animated splash screen on first load
- **🌙 Responsive layout** — Works on desktop and mobile
- **🔒 Secure** — API keys stay in backend `.env`, never sent to frontend

---

## 📁 Project Structure

```
LUMI/
├── frontend/                 # React + Vite + Tailwind
│   ├── public/
│   │   └── lumi-logo.png    # Lumi brand logo
│   └── src/
│       ├── components/      # UI components
│       ├── hooks/           # React hooks
│       ├── api.ts           # API client
│       ├── types.ts         # TypeScript types
│       └── App.tsx          # Root component
├── backend/                 # FastAPI + SQLite
│   ├── main.py              # API routes
│   ├── database.py          # SQLite layer
│   ├── gemini_service.py    # Gemini AI integration
│   ├── document_parser.py   # PDF/TXT parsing
│   ├── requirements.txt     # Python deps
│   ├── .env.example         # Config template
│   └── tests/
│       └── test_api.py      # Automated tests
├── .gitignore
└── README.md
```

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` | Check `GEMINI_API_KEY` in `backend/.env` |
| `429 Quota exceeded` | Wait for quota reset or upgrade Gemini plan |
| Frontend can't reach backend | Ensure backend is running on port 8000 |
| `Module not found` errors | Re-run `pip install -r requirements.txt` |
| PDF parsing fails | Install `pypdf`: `pip install pypdf` |

---

## 🔑 Getting a Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key and paste it in `backend/.env`

The free tier supports up to 15 RPM and 1M tokens/day.
"# Clover" 
