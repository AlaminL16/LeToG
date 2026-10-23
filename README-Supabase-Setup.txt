# LeToG - Supabase connection setup

This ZIP preserves the existing vanilla HTML/CSS/JavaScript website and changes the visible brand from NoteHub to LeToG. Signup and login now call Supabase Auth.

## Before testing
1. Open `supabase-config.js`.
2. Replace `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE` with the Project URL from Supabase.
3. Replace `PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE` with the Publishable key (or legacy anon key) from Supabase.
4. Save the file. Do not put a database password or secret/service-role key in this file.
5. Test the website using a local web server or your hosting site, not by double-clicking HTML files.

## Email confirmation
If Supabase requires email confirmation, a signup message will ask the user to check their email before logging in. In Supabase Authentication URL Configuration, add your deployed website URL to Site URL / Redirect URLs as appropriate.

## Profile trigger
The SQL trigger created earlier reads `display_name` from auth user metadata. This signup sends `display_name` as first name + last name. It will create a matching row in `public.profiles`.

## Important
- The existing notes, search, bookmarks and other prototype features are not yet connected to a shared database.
- Google sign-in is not configured by this update.
- Keep Row Level Security enabled. The `profiles` table policies you created allow public profile viewing and users to edit only their own profile.


PROFILE EDITING UPDATE
- profile.html now includes display name, bio, and profile picture URL editing backed by Supabase public.profiles.
- settings.html account section also loads/saves display name, bio, and avatar URL.
- Profile picture URL requires a direct publicly accessible image URL; image file upload/storage is not configured.
- The archive contains hidden placeholder values in supabase-config.js for safety. Restore your own working Project URL and Publishable key before testing. Never use a secret/service-role key in browser code.
- Dark theme toggle and LeToG logo update are included from the previous update.

COMMUNITY FEATURES UPDATE
- New community.html page, linked from the top navigation.
- With Supabase configured and the included LeToG-Community-Supabase.sql run, signed-in users can publish text posts and attach photos, videos, PDF/Word/PowerPoint/text files (maximum 50 MB), like/unlike posts, comment, open/download attachments, share a post link, and delete their own posts.
- The community feed is shared across accounts because posts, likes, comments and files are stored in Supabase, not only in the browser.
- Setup: in Supabase Dashboard > SQL Editor, open/copy all contents of LeToG-Community-Supabase.sql and Run. Then deploy the entire Main folder together and keep your own working Project URL and Publishable key in supabase-config.js.
- Storage bucket `letog-media` is public so shared attachment URLs work. Anyone who has a file URL can access it; do not upload private/sensitive files. The browser code uses only the Publishable key, never a service-role key.
- The website code has been added, but it will not work as a shared community until the SQL is run in your Supabase project. It has not been live-tested against your Supabase project from here.


Study-note upload persistence:
- Run the updated LeToG-Community-Supabase.sql in Supabase SQL Editor (it is safe to run again; it creates the study_notes table and its policies).
- The Upload Study Notes page now uploads the file to the letog-media Storage bucket and stores its metadata in public.study_notes.
- The uploader requires a signed-in account. If upload fails, the page will show the Supabase error instead of a demo success message.


LATEST FIX: HOME FEED AND REAL DATA
- Home page shows actual uploaded study_notes from Supabase, not template notes.
- Likes and comments on uploaded study notes use study_note_likes and study_note_comments. Share copies/shares a link.
- Profile notes and contributor ranking are loaded from real database records. Fake sample notes and contributor counts were removed.
- IMPORTANT: run the complete updated LeToG-Community-Supabase.sql script in Supabase SQL Editor to create the note likes/comments tables and policies. It is safe to rerun because tables/policies use IF NOT EXISTS / DROP POLICY IF EXISTS.
- Confirm the letog-media Storage bucket exists and is public for the current getPublicUrl() upload flow.


PHOTO/VIDEO FEED UPDATE
-----------------------
Run the updated Main/LeToG-Community-Supabase.sql in Supabase SQL Editor. It adds the community_post_media table for multi-photo/video posts. Existing single-media posts remain compatible. Deploy all updated files, including home-social.js, home.html, home.js, home.css, community.html, community.js, community.css, and the updated SQL setup. Browsers autoplay video muted by policy; users can unmute using the video controls. Multi-photo/video posts show a Previous/Next carousel. The home page hero illustration was removed.


FOLLOW, PUBLIC PROFILES AND MESSAGES
1. Open Supabase Dashboard -> SQL Editor.
2. Run the full updated Main/LeToG-Community-Supabase.sql file. It creates user_follows and direct_messages tables and row-level security policies.
3. Deploy the complete Main folder. Search results and post author names link to public member profiles (member.html?id=...).
4. Members can follow/unfollow from feed cards or profiles, view public community posts and study notes, and message a member through Messages.
5. Messages are private to the sender and recipient under the database policies.

FOLLOWERS AND NOTIFICATIONS: Run the updated Main/LeToG-Community-Supabase.sql in Supabase SQL Editor. Home study-note cards and Community posts include Follow controls; Profile shows follower/following lists and notifications for new followers. The recipient sees a follow notification in their Profile > Notifications section when they next visit.
