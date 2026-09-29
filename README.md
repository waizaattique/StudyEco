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

<!-- Add a screenshot or GIF of the app here:
![StudyEco preview](./public/preview.png)
-->

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
| AI | AI SDK / Claude (AI Tutor and streaming responses) |
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

Some AI functionality requires server-side environment variables. Create a `.env.local` file in the project root:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

> ⚠️ Never commit API keys or other secrets to GitHub. Make sure `.env.local` is listed in your `.gitignore`.

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
