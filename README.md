
# 🍀 Clover — Your AI Study Buddy

**Learn smarter. Understand better. Grow every day.**

Clover is an AI-powered study companion designed to make learning simpler, more interactive, and accessible. It helps students explore concepts, summarize information, brainstorm ideas, and learn through conversational AI — all within a clean, calming interface.

Built with a modern web stack and powered by Google's Gemini API, Clover combines an intuitive chat experience with customizable AI provider configuration.

---

## ✨ Features

- **AI-Powered Conversations** — Ask questions, explore topics, and receive contextual AI responses.
- **Simplified Explanations** — Break complex concepts into easy-to-understand language.
- **Smart Summarization** — Condense lengthy information into concise summaries.
- **Creative Brainstorming** — Generate ideas, writing prompts, and project inspiration.
- **Interactive Study Shortcuts** — Quick actions such as Explain Simply, Summarize, and Generate Quiz.
- **Conversation Management** — Start new chats and revisit recent conversations.
- **Bring Your Own API Key** — Connect your personal AI provider credentials through Provider Settings.
- **Provider Configuration** — Select supported providers and models and test connectivity.
- **Responsive Interface** — A minimal, pastel-inspired interface designed for focused learning.
- **Error Handling** — Helpful feedback for connection issues, unavailable models, and API failures.

*Feature availability depends on the current application configuration and selected provider.*

## 🎨 Design Philosophy

Clover's visual identity represents growth, clarity, curiosity, and the joy of learning.

- **Brand identity:** Four-leaf clover-inspired logo
- **Primary colors:** Sage green, mint, leafy green, and warm cream
- **Interface:** Minimal, welcoming, and distraction-conscious
- **Experience:** Designed to make AI-assisted learning approachable and intuitive

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| AI Integration | Google Gemini API |
| Dependency Management | npm, pip |
| Configuration | Environment variables, python-dotenv |
| API Documentation | FastAPI / Swagger UI |

## 🏗️ Architecture

```text
              ┌─────────────────────────┐
              │     Clover Frontend     │
              │   React + TypeScript    │
              │                         │
              │  Chat · History · UI    │
              └────────────┬────────────┘
                           │ HTTP requests
                           ▼
              ┌─────────────────────────┐
              │     FastAPI Backend     │
              │                         │
              │  Request Handling       │
              │  Provider Configuration │
              │  Error Handling         │
              └────────────┬────────────┘
                           │ Authenticated API request
                           ▼
              ┌─────────────────────────┐
              │     Google Gemini API   │
              │                         │
              │  AI-Generated Responses │
              └─────────────────────────┘
```

The frontend manages user interactions, while the backend handles requests to the configured AI provider. Provider credentials must not be embedded in frontend source code.

## 📋 Prerequisites

Before running Clover locally, install:

- [Python](https://www.python.org/downloads/)
- [Node.js and npm](https://nodejs.org/)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Git (optional, for cloning the repository)

Use a Python version compatible with the project's dependencies.

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Clover
```

Replace `<YOUR_REPOSITORY_URL>` with your actual repository URL. If you already have the project downloaded, open its root directory instead.

### 2. Set up the backend

Open a terminal and navigate to the backend directory:

```powershell
cd backend
```

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` directory. If `.env.example` exists, use it as your template.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_supported_gemini_model
```

Replace the placeholders with your own credentials and a model identifier supported by your Gemini API access.

**Security note:** Never commit `.env` files or API keys to GitHub. Ensure `.env` is included in `.gitignore`.

### 4. Start the backend server

From the `backend` directory, run:

```powershell
python -m uvicorn main:app --reload
```

This command assumes the FastAPI application is exposed as `app` in `main.py`. Adjust the module path if your project uses a different entry point.

The backend will typically be available at:

- **API:** http://127.0.0.1:8000
- **Interactive API documentation:** http://127.0.0.1:8000/docs

Keep the backend terminal running.

### 5. Set up the frontend

Open a second terminal and navigate to the frontend directory:

```powershell
cd frontend
```

Install the dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the local URL displayed by Vite, usually:

http://localhost:5173

Keep both the frontend and backend running while using Clover locally.

## 🔑 AI Provider Configuration

Clover provides an interface for configuring supported AI providers.

To connect Google Gemini:

1. Generate an API key through [Google AI Studio](https://aistudio.google.com/apikey).
2. Open Clover's **Provider Settings**.
3. Select Google Gemini.
4. Enter your API key.
5. Select a supported model and test the connection.
6. Save the configuration once the test succeeds.

Model availability, usage limits, and billing depend on your provider account.

A successful connection test confirms connectivity at that moment; it does not guarantee uninterrupted service or a specific response speed.

## 🔒 Security and Privacy

- Keep API keys on the backend; never expose them in frontend code.
- Never commit `.env` files, credentials, or other secrets.
- Use HTTPS in production.
- Avoid logging API keys or sensitive conversation content.
- Apply authentication, rate limiting, and session isolation for multi-user deployments.
- Review the provider's privacy and data-handling policies before submitting sensitive information.

Production deployments require appropriate credential storage and access controls. Local prototype configuration should not be assumed to provide production-grade security.

## 🧪 Troubleshooting

| Issue | Suggested action |
|---|---|
| Virtual environment creation fails | Close processes using `.venv`, remove the incomplete environment, and recreate it. |
| Dependencies fail to install | Check your Python version and install from `requirements.txt`. |
| Backend fails to start | Verify the application entry point and inspect terminal errors. |
| Frontend cannot reach the backend | Check that both servers are running and verify API URL and CORS settings. |
| API key is rejected | Verify the key, provider access, and configuration. |
| Model is unavailable | Choose a model supported by your provider account. |
| Requests time out | Check network connectivity, provider availability, quotas, and timeout handling. |
| API returns 429 or 503 | Check rate limits or temporary provider availability and retry appropriately. |

Redact credentials before sharing logs or screenshots when troubleshooting.

## 🗺️ Future Enhancements

Potential future improvements include:

- Streaming AI responses
- Interactive quizzes and practice sessions
- Study-document ingestion and retrieval-augmented generation (RAG)
- Improved conversation search and organization
- Additional AI provider integrations
- Accessibility and responsive design enhancements
- Automated testing and production deployment workflows

These are proposed enhancements and may not be implemented in the current version.

## 📄 License

A license has not yet been specified. Add a `LICENSE` file and update this section once the project's licensing terms have been decided.

## 👩‍💻 Acknowledgements

Clover is built with open-source technologies and Google's Gemini API.

---

<div align="center">

**Clover — Your AI Study Buddy** 🍀

*An AI-powered companion for curiosity, learning, and growth.*

</div>
