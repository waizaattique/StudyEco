<div align="center">

# StudyEco

### Study smarter, not harder.

An all-in-one student workspace to learn, organize, and stay on track.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

![Status](https://img.shields.io/badge/status-in%20active%20development-orange?style=flat-square)

</div>

---

## About

StudyEco brings everyday study tools together with AI-powered features, so studying feels more structured and less overwhelming.

Instead of switching between separate apps for notes, planning, tasks, reminders, and learning support, students get everything in one workspace.


## Features

| | Feature | Description |
|---|---|---|
| 📝 | **AI Notes** | Turn messy or unstructured notes into clean, organized study material. |
| 🤖 | **AI Tutor** | Ask questions, understand difficult concepts, revise topics, and learn through interactive conversations. |
| 📋 | **Planner** | Organize your study schedule and plan what needs to be done. |
| ✅ | **Tasks** | Keep track of study tasks and smaller actions. |
| ⏰ | **Reminders** | Get reminders for study sessions, breaks, hydration, and other routines. |
| 🎯 | **Focus Tools** | Support focused study sessions and better study habits. |
| 📊 | **Student Dashboard** | Keep your whole study workspace organized in one place. |

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| UI | React, Tailwind CSS |
| AI | AI SDK with Google Gemini and Groq providers |
| Deployment | Vercel |

## Current Development

StudyEco is actively being developed, and some features may change as the project evolves.

**Current focus**

- [ ] AI Tutor interface
- [ ] Streaming AI responses
- [ ] Responsive chat experience
- [ ] Student workspace UI
- [ ] AI-powered note organization
- [ ] Planner and task experience

## Project Structure

```text
studyeco/
├── app/          # Routes, layouts, and pages
├── components/   # Reusable UI components
├── lib/          # Helpers and shared logic
├── public/       # Static assets
└── ...
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/waizaattique/studyeco.git
   ```

2. **Move into the project**

   ```bash
   cd studyeco
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Set up environment variables** (see below)

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open the app** at [http://localhost:3000](http://localhost:3000)

## Environment Variables

The AI Tutor supports Google Gemini and Groq. Copy `.env.example` to `.env.local` in the project root and fill in the key for your selected provider:

```env
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=
GOOGLE_MODEL=
GOOGLE_FALLBACK_MODEL=
GROQ_API_KEY=
```

`AI_PROVIDER` defaults to `google`; set it to `groq` to use Groq. Google uses `gemini-3.8-flash` by default and can fall back to `gemini-2.5-flash-lite`; set either model variable to override the corresponding default. Groq uses `llama-3.3-70b-versatile`. Only the selected provider's API key is needed (Groq's key is also used as a fallback when Google quota is exhausted).

> Never commit API keys or other secrets to GitHub. `.env.local` is ignored by Git; `.env.example` is a blank template safe to track.

## Project Goal

StudyEco is being built as a frontend-focused AI engineering capstone, with the AI Tutor as one of its central interactive experiences. The goal is a student-first workspace that combines organization tools with AI-assisted learning.

## Author

**Waiza Attique Khan**
BS Computer Science Student · Frontend & AI Engineering

GitHub: [@waizaattique](https://github.com/waizaattique)

---

<div align="center">

**Study smarter, not harder.**

</div>
