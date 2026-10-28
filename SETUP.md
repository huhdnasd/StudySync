# StudySync

StudySync is a student planner for tracking classes, estimating GPA, and keeping assignment due dates in view. Visitors see the public home page first; creating an account or signing in is required to access the planner. It uses Supabase Auth and Postgres; row-level security ensures each student can access only their own data.

## Run locally

### Prerequisites

- Node.js and npm
- A Supabase project

### Configure Supabase

1. In the Supabase SQL Editor for your project, run the contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates the planner tables and enables row-level security.
2. In **Project Settings → API** (or **API Keys**), copy the project URL and the anon/public key or publishable key. Do not use a `service_role` or secret key in this browser app.
3. In **Authentication → Providers**, make sure email/password sign-in is enabled.
4. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:5173` and add `http://localhost:5173` to the allowed redirect URLs.

### Configure and start the app

From the project directory, create `.env.local` from the example:

```sh
cp .env.example .env.local
```

Set the following values in `.env.local` using your own Supabase project details:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Then install dependencies and start the development server:

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). If you change `.env.local` while the server is running, stop and restart `npm run dev` so Vite loads the updated values.

## Deploy to GitHub Pages

The included GitHub Actions workflow builds the Vite app and publishes `dist` whenever you push to `main`. In your repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. The first deployment runs from the **Actions** tab; subsequent pushes to `main` deploy automatically.

The public landing page works without Supabase configuration. To enable account sign-in on Pages, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository Actions variables or secrets. These values are included in the browser build; only use the Supabase anon/publishable key, never a service-role or secret key. Add your GitHub Pages URL to the allowed redirect URLs in Supabase Authentication settings.

## Troubleshooting

- **Supabase URL/key error:** Check that both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env.local`, with no surrounding quotes, then restart the dev server.
- **Can't sign up or sign in:** Confirm email/password auth is enabled. If email confirmation is required, confirm the message sent to your email before signing in.
- **Table or permission errors:** Confirm `supabase/schema.sql` ran successfully in the same Supabase project whose URL and key are in `.env.local`.

Never put a Supabase `service_role` or secret key in frontend code or `.env.local` for this app. Vite exposes `VITE_` variables to the browser.

## GPA

GPA is estimated from course percentage grades on a standard 4.0 scale and weighted by course credits. The percentage bands are A 93-100 (4.0), A- 90-92 (3.7), B+ 87-89 (3.3), B 83-86 (3.0), B- 80-82 (2.7), C+ 77-79 (2.3), C 73-76 (2.0), C- 70-72 (1.7), D+ 67-69 (1.3), D 63-66 (1.0), D- 60-62 (0.7), and F below 60 (0). Schools use different grading policies, so treat this as an estimate.
