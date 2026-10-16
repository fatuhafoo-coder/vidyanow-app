# VidyaNow: students, tutors and admin on one live database

## Put it online (about 20 minutes)
1. **Supabase**: create a free project at supabase.com. Open SQL Editor, paste all of `supabase/schema.sql`, click Run.
2. **Email code**: Supabase > Authentication > Email Templates. In both "Magic Link" and "Confirm signup", replace the body with
   `<h2>Your VidyaNow code</h2><p>{{ .Token }}</p>` so users get a code instead of a link.
   Before real launch, add a free custom SMTP (Resend or Brevo) under Authentication > SMTP, because the built-in sender allows only a few emails per hour.
3. **Keys**: Project Settings > API. Copy the Project URL and the anon public key.
4. **GitHub**: create a repo and upload this whole folder.
5. **Vercel**: vercel.com > Add New Project > import the repo. Under Environment Variables add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then Deploy.
6. **Make yourself admin**: open `your-site.vercel.app/admin`, sign in with your email (this creates your user), then run in SQL Editor:
   ```sql
   insert into profiles (id, role, name, email)
   select id, 'admin', 'Admin', email from auth.users where email = 'YOU@EXAMPLE.COM';
   ```
   Reload /admin.

## Run locally
`npm install`, copy `.env.example` to `.env.local` and fill it, then `npm run dev`.

## How it connects
- Student books, so a row appears in `bookings`. Approved tutors teaching that class see it instantly (realtime).
- First tutor to tap Accept gets it. The student's screen switches to "tutor on the way" with the tutor's phone and a start code.
- Tutor types the start code (checked on the server), the class timer starts, and the same flow ends with the end code.
- Admin approves tutors (after viewing their uploaded documents) and edits prices. Both take effect immediately for everyone.
- Documents are in a private bucket. Only the owner and the admin can open them.
