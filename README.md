# My QR Manager

A starter dynamic QR management application built with Next.js, Supabase and Vercel. It uses original branding and implementation; it is not QRHUB's source code.

## Features in this starter

- Responsive landing page
- Supabase email/password sign-up and login
- User-scoped QR code dashboard
- Create, edit destination, enable/disable and delete QR records
- Search existing records
- Download QR images as PNG
- `/r/CODE` redirect route
- SQL schema with Row Level Security

## 1. Install

Install Node.js 20+ and Git. In this project directory run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## 2. Configure Supabase

1. Create a project at https://supabase.com/.
2. In Project Settings / API, copy the project URL and publishable/anon key.
3. Put them in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
4. In Supabase SQL Editor, run the complete `supabase/schema.sql` file.
5. In Authentication settings, configure your local redirect URL (`http://localhost:3000/**`) and your deployed Vercel URL after deployment.

Never commit `.env.local` or a service-role key.

## 3. Public dynamic redirects

The supplied SQL creates a restricted `resolve_qr_code(p_code)` function. It returns only the destination URL for an active code; anonymous visitors cannot select or list the `qr_codes` table. The `/r/CODE` route calls this function using the public Supabase key and validates the destination protocol before redirecting.

Run `supabase/schema.sql` in the Supabase SQL Editor before testing public scans. Review and test the SQL function and redirect behavior before production use.

## 4. Deploy to GitHub and Vercel

1. Create a new GitHub repository.
2. Upload the project files (do not upload `.env.local`).
3. Import the repository in https://vercel.com/.
4. Add the same three environment variables in Vercel Project Settings.
5. Deploy and test login, create/edit QR, and public scan behavior.

After deployment, set `NEXT_PUBLIC_APP_URL` to the exact Vercel domain and redeploy.

## Current limitations

- This is a functional starter, not a fully audited enterprise platform.
- Bulk CSV import/export, scan analytics, billing, teams, and organization management are not included.
- Public redirect lookup must be configured as described above before public QR scans work.
- Old printed QR codes containing QRHUB URLs cannot be migrated automatically. They continue to use QRHUB unless you control the original redirect domain or print replacement QR codes.

## Suggested tests before production

- Create two users and verify they cannot see each other's QR records.
- Verify duplicate codes are rejected.
- Verify only HTTP/HTTPS destinations are accepted.
- Verify a public scan works without a logged-in session after configuring the RPC.
- Test disable/delete behavior and deploy rollback.
