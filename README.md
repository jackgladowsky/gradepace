# GradePace

A better dashboard for Canvas LMS. See your grades, assignments, and deadlines in one place — without the clutter.

Built for Northeastern students, works with any Canvas instance.

## Features

- **Dashboard** — Grades, completion stats, workload chart, and upcoming assignments at a glance
- **Assignments** — All your assignments with status tracking (submitted, graded, missing, upcoming)
- **Grades** — Per-course grade breakdown with trend charts over the semester
- **Calendar** — Color-coded weekly view of due dates by course
- **GPA Calculator** — Weighted GPA calculation across all courses
- **Grade Goal Calculator** — Figure out what you need on remaining assignments to hit a target grade
- **Priorities** — Auto-ranked assignments based on due date, point value, and missing status
- **Pomodoro Timer** — Built-in study timer with course tagging
- **Course Notes** — Quick notes per course
- **Assignment Checklists** — Break assignments into subtasks

## Getting Started

### Prerequisites

- Node.js 18+
- A Canvas LMS account with API access

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
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and connect your Canvas account.

### Getting a Canvas API Token

1. Log in to Canvas
2. Go to **Account > Settings**
3. Scroll to **Approved Integrations** and click **+ New Access Token**
4. Give it a name (e.g. "GradePace") and generate

## Tech Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4 + shadcn/ui
- Recharts
- iron-session (encrypted cookies)

## Deployment

```bash
npm run build
npm start
```

Works with any Node.js hosting platform (Vercel, Railway, Fly.io, etc.).

## License

MIT
