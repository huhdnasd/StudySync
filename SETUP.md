# StudySync

StudySync is a student planner for tracking classes, estimating GPA, and keeping assignment due dates in view. It uses Supabase Auth and Postgres; each student's rows are protected with row-level security.

## Run locally

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon/publishable key from Supabase project settings.
4. In Supabase Authentication settings, enable email/password sign-in and set the local site URL to `http://localhost:5173`.
5. Run `npm install`, then `npm run dev`.

The anon key is intended for browser use when row-level security is enabled. Never put a Supabase service-role key in the frontend.

## GPA

GPA is estimated from course percentage grades on a standard 4.0 scale and weighted by course credits. The percentage bands are A 93-100 (4.0), A- 90-92 (3.7), B+ 87-89 (3.3), B 83-86 (3.0), B- 80-82 (2.7), C+ 77-79 (2.3), C 73-76 (2.0), C- 70-72 (1.7), D+ 67-69 (1.3), D 63-66 (1.0), D- 60-62 (0.7), and F below 60 (0). Schools use different grading policies, so treat this as an estimate.