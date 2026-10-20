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

StudyEco is a student workspace. The AI Tutor answers study questions in a streamed conversation, supports follow-up turns, and saves chat history in the current browser, scoped to the signed-in user's ID. Logging out clears that user's local chat history by design. Chat history is not stored in the database.

The tutor uses the Google provider by default and can use a configured fallback provider when Google is out of quota. Other roadmap items shown in the dashboard are not built yet.

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | React, Tailwind CSS |
| Auth | Supabase email/password |
| AI | AI SDK with Google Gemini and optional Groq fallback |
| Deployment | Vercel |

## Tutor implementation

- [Chat API route](app/api/chat/route.ts)
- [Tutor chat UI](components/tutor/Chat.tsx)
- [AI provider configuration](lib/ai-config.ts)

## Getting Started

### Requirements

- Node.js LTS and npm
- A Supabase project with email/password authentication enabled
- A Google Generative AI API key; optionally a Groq API key

### Run locally

1. Install packages with `npm install`.
2. Create `.env.local` in the project root and set the environment variables listed below.
3. Apply the chat rate-limit migration in `supabase/migrations/20261020010000_chat_rate_limit.sql` to your Supabase project.
4. Start the app with `npm run dev`.
5. Open [http://localhost:3000](http://localhost:3000).

The Supabase URL and anon key are the project's public client values. Keep AI provider keys and demo credentials server-only. Never commit `.env.local` or put server secrets in a `NEXT_PUBLIC_` variable.

### Environment variable names

Set these names in `.env.local` locally and in Vercel for each environment you deploy. Never put values in source control.

| Variable | Use | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key | Public |
| `DEMO_EMAIL` | Shared reviewer/demo account email | Server-only |
| `DEMO_PASSWORD` | Shared reviewer/demo account password | Server-only |
| `AI_PROVIDER` | `google` (default) or `groq` | Server-only |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API credential | Server-only |
| `GOOGLE_MODEL` | Optional Google primary model override | Server-only |
| `GOOGLE_FALLBACK_MODEL` | Optional Google fallback model override | Server-only |
| `GROQ_API_KEY` | Optional Groq credential/fallback | Server-only |

Select Google with `AI_PROVIDER=google` (the default). Set a Google model override only when needed. A Groq key is optional and allows the Google flow to fall back to Groq if configured; `AI_PROVIDER=groq` selects Groq directly. Model availability and free-tier limits can change.

## Deploy to Vercel

1. In Vercel, choose **Add New → Project**, import `waizaattique/StudyEco`, and keep the detected Next.js build settings.
2. Under **Project Settings → Environment Variables**, add all nine names from the table above for the environments you intend to use. Only the two `NEXT_PUBLIC_` Supabase values are public. Do not prefix demo or AI credentials with `NEXT_PUBLIC_`. The demo variables are needed only if the shared demo sign-in is enabled.
3. The streaming API route is [app/api/chat/route.ts](app/api/chat/route.ts) and exports `maxDuration = 60`. Current [Vercel function duration documentation](https://vercel.com/docs/functions/configuring-functions/duration) lists 300 seconds as the default and maximum on Hobby with Fluid compute, and a 300-second default / 800-second maximum on Pro and Enterprise (with longer Enterprise/Beta options). Sixty seconds remains an intentional bound for this route; raise it only if observed response duration requires it and the selected plan allows it.
4. Deploy the project. Wait for the deployment to finish, then copy its production domain.
5. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to the production Vercel URL. Add the exact production URL to **Redirect URLs**. Keep `http://localhost:3000/**` allowed for local development; add any preview domain patterns only if you use them.
6. Apply the SQL migration in `supabase/migrations/20261020010000_chat_rate_limit.sql` to the Supabase project if it has not already been applied.
7. Confirm production authentication, tutor streaming, and error states using the post-deploy checklist below.

Vercel function limits and plan defaults can change; check the current duration docs and the project's plan before changing the route's 60-second `maxDuration`.

### Post-deploy checks

- Sign in with a valid account and open the dashboard and AI Tutor.
- Send a study question and confirm the response streams; send follow-ups and refresh to confirm browser-local history remains.
- Pin a chat, verify it appears pinned, then log out and confirm that account's local history was cleared.
- Open `/dashboard` and `/ai-tutor` in a logged-out browser and confirm each redirects to login.
- Confirm invalid chat requests receive readable errors and valid requests still work.
- Check a narrow mobile viewport and open/close the navigation menu.
- Verify the deployed response includes the configured security headers.

### Service limits to plan for

Supabase free projects may pause after inactivity; a paused project interrupts sign-in and tutor requests until restored. See [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing) and the current plan details.

Google Gemini free-tier quotas vary by model and can change. Quota exhaustion can make responses fail or trigger the configured fallback; check current [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) before sharing the app widely.

## Reviewer access

Credentials are provided in the submission notes.

## Author

**Waiza Attique Khan**
BS Computer Science Student · Frontend & AI Engineering

GitHub: [@waizaattique](https://github.com/waizaattique)

---

<div align="center">

**Study smarter, not harder.**

</div>
