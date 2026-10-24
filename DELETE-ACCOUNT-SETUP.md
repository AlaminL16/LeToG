# Enable LeToG account deletion

Account deletion uses a Supabase Edge Function because the service-role key must never be placed in browser code.

1. Install Node.js and the Supabase CLI, then sign in: `npx supabase login`.
2. From the `Main` folder, link the exact project used by `supabase-config.js`: `npx supabase link --project-ref YOUR_PROJECT_REF`.
3. Deploy the function: `npx supabase functions deploy delete-account`.
4. In Supabase Dashboard → Edge Functions → `delete-account` → Secrets, confirm `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are available. Never put the service-role key in GitHub or browser files.
5. Test with a disposable account first. In Settings, choose Delete account and type `DELETE` exactly.

The function deletes the account's study notes and community posts, associated comments/likes where supported, follows, notifications, profile, common user-owned storage objects, and finally the Supabase Auth user. If your database uses different table/column names or restrictive foreign keys, the function reports an error instead of claiming success; adjust the schema-specific cleanup before using with real accounts. Storage cleanup only removes objects in paths under the user's ID, so files stored elsewhere may need a project-specific cleanup.

If you see `Function not found`/404, deploy the function to the same Supabase project as the website. If you see a foreign-key/table error, share the exact error and table schema so cleanup can be matched safely. Do not expose the service-role key.
