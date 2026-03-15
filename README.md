# StudyHub

A modern dashboard for Canvas LMS that gives students better visibility into their courses, grades, assignments, and study habits.

Built with Next.js, React, and TypeScript. Connects to your Canvas instance via API token.

## Features

- **Dashboard** — At-a-glance view of grades, completion stats, workload chart, and upcoming assignments
- **Assignments** — Browse all assignments with status tracking (submitted, graded, missing, upcoming)
- **AI Assignment Analysis** — Get breakdowns of what's being asked, key requirements, time estimates, and common mistakes (powered by OpenAI-compatible API)
- **Weekly Calendar** — Color-coded calendar view of due dates by course
- **Grades & Trends** — Per-course grade breakdown with trend charts over the semester
- **GPA Calculator** — Weighted GPA calculation across all courses
- **Grade Goal Calculator** — Figure out what score you need on remaining assignments to hit a target grade
- **Smart Priorities** — Automatic priority ranking based on due date, point value, and missing status
- **Pomodoro Timer** — Built-in study timer with course tagging
- **Course Notes** — Quick notes editor per course
- **Assignment Checklists** — AI-generated or manual to-do lists for assignments

## Tech Stack

- **Framework:** Next.js 16 / React 19 / TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Charts:** Recharts
- **Auth/Session:** iron-session (encrypted cookies)
- **AI:** OpenAI SDK (compatible with OpenRouter and other providers)

## Getting Started

### Prerequisites

- Node.js 18+
- A Canvas LMS account with API access
- (Optional) An OpenAI-compatible API key for AI features

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/jackgladowsky/studyhub.git
   cd studyhub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```env
   SESSION_SECRET=<random-32-char-string>

   # Optional — needed for AI features (assignment analysis, checklist generation)
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and connect your Canvas account using your school's Canvas URL and a personal API token.

### Getting a Canvas API Token

1. Log in to your Canvas instance
2. Go to **Account → Settings**
3. Scroll to **Approved Integrations** and click **+ New Access Token**
4. Give it a name (e.g. "StudyHub") and generate

## Deployment

Build for production:

```bash
npm run build
npm start
```

Works with any Node.js hosting platform (Vercel, Railway, Fly.io, etc.).

## License

MIT
