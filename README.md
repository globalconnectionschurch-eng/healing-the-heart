# Healing the Heart

Astro + Cloudflare Workers site for Healing the Heart.

## Live backend

The application is prepared for:

- Cloudflare D1 class, session, student, registration, template, and email-log storage.
- Secure admin sessions using `ADMIN_PASSWORD` + signed `ADMIN_SESSION_SECRET` Cloudflare secrets.
- Resend transactional email sending through `RESEND_API_KEY`.
- Automatic exclusion of classes after their end date from public registration/upcoming views.
- Admin class creation, student registration lists, manual student adds, editable email templates, and bulk class email sending.

## Cloudflare setup

1. Create a D1 database named `healing-the-heart` in Cloudflare.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the database ID.
3. Apply the migration with `npm run db:migrate`.
4. Add Worker secrets:
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `RESEND_API_KEY`
5. Verify `healingtheheart.ca` as a sending domain in Resend and change `FROM_EMAIL` in `wrangler.jsonc` to the verified address.
6. Deploy with `npx wrangler deploy` after `npm run build`.

Never put real passwords or API keys in GitHub. Use Cloudflare Worker secrets.

## Email templates

The three supplied Healing the Heart templates are seeded into D1 the first time the admin template screen loads. They can then be edited in `/admin/templates`, and new templates can be created there.
