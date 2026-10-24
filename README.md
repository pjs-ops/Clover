
# 🍀 Clover — Your AI Study Buddy

<p align="center">
  <strong>Learn smarter. Understand better. Grow every day.</strong>
</p>

<p align="center">
  An AI-powered study companion designed to make learning simpler, more interactive, and accessible.
</p>

---

## 📖 About Clover

Clover is an AI-powered study companion that helps students explore concepts, simplify complex topics, summarize information, and brainstorm ideas through conversational AI.

Built with a modern web stack and integrated with Google's Gemini API, Clover offers a clean, nature-inspired interface designed to make AI-assisted learning approachable and intuitive.

Whether you're revising academic concepts, exploring a new subject, or developing creative ideas, Clover provides a conversational space to support your learning journey.

## ✨ Features

- **AI-Powered Chat** — Ask questions and explore topics through conversational AI.
- **Explain Simply** — Understand complex concepts through clear, accessible explanations.
- **Smart Summarization** — Condense information into concise summaries.
- **Quiz Generation** — Use study shortcuts to support revision and practice.
- **Creative Brainstorming** — Generate ideas, writing prompts, and project inspiration.
- **Conversation Management** — Start new chats and revisit recent conversations.
- **Personal API Configuration** — Connect your own API key through Provider Settings.
- **Provider Selection** — Choose supported AI providers and models.
- **Connection Testing** — Test provider connectivity before saving the configuration.
- **Nature-Inspired UI** — A calm green-and-cream interface with Clover branding.

*Available features depend on the current application configuration and supported provider capabilities.*

## 🎨 Design Philosophy

Clover's visual identity draws inspiration from the four-leaf clover, symbolizing growth, curiosity, and discovery.

| Design Element | Color | Hex Code |
|---|---|---|
| Main background | Warm Cream | `#FDFBF5` |
| Soft accent | Soft Mint | `#E7F0D5` |
| Primary accent | Sage Green | `#A8C686` |
| Interactive elements | Leaf Green | `#638653` |
| Primary text | Forest Green | `#355342` |
| Highlight surfaces | Pale Sage | `#F1F3E5` |

The interface prioritizes readability, simplicity, and a distraction-conscious learning experience.

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| AI Integration | Google Gemini API |
| Frontend Dependencies | npm |
| Backend Dependencies | pip |
| Configuration | Environment variables, python-dotenv |
| API Documentation | FastAPI / Swagger UI |

## 🏗️ Application Architecture

```text
┌──────────────────────────────────┐
│          Clover Frontend         │
│        React + TypeScript        │
│                                  │
│  Chat · History · Study Tools    │
│       Provider Settings          │
└────────────────┬─────────────────┘
                 │ HTTP requests
                 ▼
┌──────────────────────────────────┐
│          FastAPI Backend         │
│                                  │
│  Request Handling                │
│  AI Provider Integration         │
│  Configuration & Error Handling │
└────────────────┬─────────────────┘
                 │ Authenticated API requests
                 ▼
┌──────────────────────────────────┐
│          Google Gemini API       │
│                                  │
│       AI-Generated Responses     │
└──────────────────────────────────┘
```

The frontend manages user interactions, while the backend handles requests to the configured AI provider. API credentials should not be embedded in frontend source code.

## 📋 Prerequisites

Before running Clover locally, ensure you have:

- [Python](https://www.python.org/downloads/)
- [Node.js and npm](https://nodejs.org/)
- A valid Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Git (optional, for cloning the repository)

Use a Python version compatible with the project's dependencies.

## 🚀 Installation and Setup

### 1. Obtain the project

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd Clover
```

Replace `<YOUR_REPOSITORY_URL>` with your actual repository URL.

If you already have the project downloaded, open its root directory instead.

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

Install the required dependencies:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure the AI provider

Clover requires a valid API key for the selected AI provider.

You can obtain a Gemini API key through [Google AI Studio](https://aistudio.google.com/apikey).

**Configure the API key inside Clover:**

1. Start the application using the instructions below.
2. Open Clover in your browser.
3. Click **Provider Settings** in the sidebar.
4. Select **Google Gemini** or another provider supported by your installation.
5. Enter your personal API key in the API key field.
6. Select a model supported by your provider account.
7. Click **Test Connection** to check connectivity.
8. Click **Save Configuration** to apply your settings.

> **Important:** Entering the API key alone is not enough. You must click **Save Configuration** to apply the provider settings before using Clover.

Keep your API key private. Never commit it to GitHub or share it in screenshots, logs, or public messages.

### 4. Start the backend server

From the `backend` directory, run:

```powershell
python -m uvicorn main:app --reload
```

This command assumes the FastAPI application is exposed as `app` in `main.py`. If your project uses a different entry point, adjust the command accordingly.

The backend will typically be available at:

- **API server:** http://127.0.0.1:8000
- **Interactive API documentation:** http://127.0.0.1:8000/docs

Keep this terminal open while using Clover.

### 5. Set up the frontend

Open a second terminal and navigate to the frontend directory:

```powershell
cd frontend
```

Install the frontend dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the local URL displayed in the terminal, usually:

http://localhost:5173

Both the frontend and backend servers must remain running during local development.

## 🔑 API Configuration and Usage

Clover supports personal API configuration through its Provider Settings interface.

### Configuration workflow

1. Open **Provider Settings**.
2. Select the desired supported provider.
3. Enter your API key.
4. Select an available model.
5. Click **Test Connection**.
6. Click **Save Configuration** to apply the settings.

### Important considerations

- You must provide your own valid API key.
- API access, usage limits, model availability, and charges depend on your provider and account.
- A successful connection test does not guarantee uninterrupted service or a specific response speed.
- If a connection fails, verify your credentials, selected model, internet connection, and provider quota.
- Provider-specific configuration may differ depending on the installed implementation.

## 🔒 Security and Privacy

Clover uses API credentials to communicate with external AI services. Handle these credentials carefully.

- Never commit API keys, `.env` files, or other secrets to version control.
- Do not expose provider credentials in frontend source code.
- Use HTTPS in production.
- Avoid logging API keys or sensitive conversation content.
- Apply authentication, rate limiting, and session isolation for multi-user deployments.
- Review the selected AI provider's privacy and data-handling policies before submitting sensitive information.

For production deployments, implement appropriate credential storage, access controls, and secure session management. Local development configurations should not be assumed to provide production-grade security.

## 🧪 Troubleshooting

| Issue | Suggested Action |
|---|---|
| Virtual environment creation fails | Close processes using `.venv`, remove the incomplete environment, and recreate it. |
| Python dependencies fail to install | Verify your Python version and reinstall from `requirements.txt`. |
| Backend fails to start | Check the application entry point and inspect terminal errors. |
| Frontend cannot reach the backend | Confirm both servers are running and check the API URL and CORS configuration. |
| API key is rejected | Verify the key, provider selection, and account access. |
| Configuration is not applied | Reopen Provider Settings, verify the details, and click **Save Configuration**. |
| Model is unavailable | Select a model supported by your provider account. |
| Requests time out | Check network connectivity, provider availability, quotas, and timeout handling. |
| API returns 429 | Check provider rate limits and retry when appropriate. |
| API returns 503 | The provider may be temporarily unavailable; retry later. |

When requesting technical support, share relevant error messages but redact API keys and other sensitive information.

## 🗺️ Future Enhancements

Potential directions for future development include:

- Streaming responses for a more responsive chat experience
- Expanded interactive quizzes and study exercises
- Document ingestion and retrieval-augmented generation (RAG)
- Improved conversation search and organization
- Additional AI provider integrations
- Accessibility and responsive design improvements
- Automated testing and deployment workflows

These are proposed enhancements and are not necessarily implemented in the current version.

## 📄 License

No license has been specified in this README. Add a `LICENSE` file and update this section once the project's licensing terms have been decided.

## 🙏 Acknowledgements

Clover is built with open-source technologies and Google's Gemini API.

---

<p align="center">
  <strong>🍀 Clover — Your AI Study Buddy</strong>
  <br />
  <em>An AI-powered companion for curiosity, learning, and growth.</em>
</p>
