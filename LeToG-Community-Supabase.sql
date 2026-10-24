-- LeToG Community setup for Supabase (run once in SQL Editor).
-- Requires the existing public.profiles table created for LeToG.
-- This creates a public community feed with authenticated posting, likes, comments and file attachments.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  title text,
  file_url text,
  file_path text,
  file_name text,
  media_type text check (media_type is null or media_type in ('image','video','file')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_content_check check (length(trim(body)) > 0 or file_url is not null)
);

create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx on public.community_posts(created_at desc);
create index if not exists community_posts_user_id_idx on public.community_posts(user_id);
create index if not exists community_comments_post_id_idx on public.community_comments(post_id, created_at);

alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_comments enable row level security;

drop policy if exists "Community posts are publicly readable" on public.community_posts;
drop policy if exists "Community posts are publicly readable" on public.community_posts;
create policy "Community posts are publicly readable" on public.community_posts for select using (true);
drop policy if exists "Signed-in users can create own posts" on public.community_posts;
drop policy if exists "Signed-in users can create own posts" on public.community_posts;
create policy "Signed-in users can create own posts" on public.community_posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Authors can update own posts" on public.community_posts;
drop policy if exists "Authors can update own posts" on public.community_posts;
create policy "Authors can update own posts" on public.community_posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Authors can delete own posts" on public.community_posts;
drop policy if exists "Authors can delete own posts" on public.community_posts;
create policy "Authors can delete own posts" on public.community_posts for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Community likes are publicly readable" on public.community_likes;
drop policy if exists "Community likes are publicly readable" on public.community_likes;
create policy "Community likes are publicly readable" on public.community_likes for select using (true);
drop policy if exists "Signed-in users can like as themselves" on public.community_likes;
drop policy if exists "Signed-in users can like as themselves" on public.community_likes;
create policy "Signed-in users can like as themselves" on public.community_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own likes" on public.community_likes;
drop policy if exists "Users can remove their own likes" on public.community_likes;
create policy "Users can remove their own likes" on public.community_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Community comments are publicly readable" on public.community_comments;
drop policy if exists "Community comments are publicly readable" on public.community_comments;
create policy "Community comments are publicly readable" on public.community_comments for select using (true);
drop policy if exists "Signed-in users can comment as themselves" on public.community_comments;
drop policy if exists "Signed-in users can comment as themselves" on public.community_comments;
create policy "Signed-in users can comment as themselves" on public.community_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Authors can delete own comments" on public.community_comments;
drop policy if exists "Authors can delete own comments" on public.community_comments;
create policy "Authors can delete own comments" on public.community_comments for delete to authenticated using (auth.uid() = user_id);

-- Public bucket for posts and study-note attachments. Public means anyone with a file URL can view/download it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('letog-media', 'letog-media', true, 52428800,
  array['image/jpeg','image/png','image/gif','image/webp','image/avif','video/mp4','video/webm','video/quicktime','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain'])
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "Public can view LeToG media" on storage.objects;
drop policy if exists "Public can view LeToG media" on storage.objects;
create policy "Public can view LeToG media" on storage.objects for select using (bucket_id = 'letog-media');
drop policy if exists "Users upload media into their own folder" on storage.objects;
drop policy if exists "Users upload media into their own folder" on storage.objects;
create policy "Users upload media into their own folder" on storage.objects for insert to authenticated with check (bucket_id = 'letog-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete media from their own folder" on storage.objects;
drop policy if exists "Users delete media from their own folder" on storage.objects;
create policy "Users delete media from their own folder" on storage.objects for delete to authenticated using (bucket_id = 'letog-media' and (storage.foldername(name))[1] = auth.uid()::text);



-- Multiple media attachments per post (for carousel posts). Safe to run on existing projects.
create table if not exists public.community_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_url text not null,
  file_path text not null,
  file_name text not null,
  media_type text not null check (media_type in ('image','video')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists community_post_media_post_position_idx on public.community_post_media(post_id, position);
alter table public.community_post_media enable row level security;
drop policy if exists "Community post media is publicly readable" on public.community_post_media;
drop policy if exists "Community post media is publicly readable" on public.community_post_media;
create policy "Community post media is publicly readable" on public.community_post_media for select using (true);
drop policy if exists "Signed-in users can add media to own posts" on public.community_post_media;
drop policy if exists "Signed-in users can add media to own posts" on public.community_post_media;
create policy "Signed-in users can add media to own posts" on public.community_post_media for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.community_posts p where p.id = post_id and p.user_id = auth.uid()));
drop policy if exists "Authors can delete media from own posts" on public.community_post_media;
drop policy if exists "Authors can delete media from own posts" on public.community_post_media;
create policy "Authors can delete media from own posts" on public.community_post_media for delete to authenticated using (auth.uid() = user_id);

-- Study notes uploaded through the separate Upload Study Notes page.
create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null,
  difficulty text not null default 'Beginner',
  description text not null,
  tags text[] not null default '{}',
  file_url text not null,
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists study_notes_created_at_idx on public.study_notes(created_at desc);
create index if not exists study_notes_user_id_idx on public.study_notes(user_id);
alter table public.study_notes enable row level security;
drop policy if exists "Study notes are publicly readable" on public.study_notes;
drop policy if exists "Study notes are publicly readable" on public.study_notes;
create policy "Study notes are publicly readable" on public.study_notes for select using (true);
drop policy if exists "Signed-in users can upload their own study notes" on public.study_notes;
drop policy if exists "Signed-in users can upload their own study notes" on public.study_notes;
create policy "Signed-in users can upload their own study notes" on public.study_notes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Authors can delete their own study notes" on public.study_notes;
drop policy if exists "Authors can delete their own study notes" on public.study_notes;
create policy "Authors can delete their own study notes" on public.study_notes for delete to authenticated using (auth.uid() = user_id);


-- Social interactions for study-note uploads shown on the home feed.
create table if not exists public.study_note_likes (
  note_id uuid not null references public.study_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);
create table if not exists public.study_note_comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.study_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists study_note_comments_note_id_created_idx on public.study_note_comments(note_id, created_at);
alter table public.study_note_likes enable row level security;
alter table public.study_note_comments enable row level security;
drop policy if exists "Study note likes are publicly readable" on public.study_note_likes;
drop policy if exists "Study note likes are publicly readable" on public.study_note_likes;
create policy "Study note likes are publicly readable" on public.study_note_likes for select using (true);
drop policy if exists "Signed-in users can like notes as themselves" on public.study_note_likes;
drop policy if exists "Signed-in users can like notes as themselves" on public.study_note_likes;
create policy "Signed-in users can like notes as themselves" on public.study_note_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own study note likes" on public.study_note_likes;
drop policy if exists "Users can remove their own study note likes" on public.study_note_likes;
create policy "Users can remove their own study note likes" on public.study_note_likes for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "Study note comments are publicly readable" on public.study_note_comments;
drop policy if exists "Study note comments are publicly readable" on public.study_note_comments;
create policy "Study note comments are publicly readable" on public.study_note_comments for select using (true);
drop policy if exists "Signed-in users can comment on notes as themselves" on public.study_note_comments;
drop policy if exists "Signed-in users can comment on notes as themselves" on public.study_note_comments;
create policy "Signed-in users can comment on notes as themselves" on public.study_note_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own study note comments" on public.study_note_comments;
drop policy if exists "Users can delete their own study note comments" on public.study_note_comments;
create policy "Users can delete their own study note comments" on public.study_note_comments for delete to authenticated using (auth.uid() = user_id);


-- Post-owner editing and deletion permissions (safe to re-run).
alter table public.community_posts enable row level security;
drop policy if exists "Authors can update their own community posts" on public.community_posts;
drop policy if exists "Authors can update their own community posts" on public.community_posts;
create policy "Authors can update their own community posts" on public.community_posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Authors can delete their own community posts" on public.community_posts;
drop policy if exists "Authors can delete their own community posts" on public.community_posts;
create policy "Authors can delete their own community posts" on public.community_posts for delete to authenticated using (auth.uid() = user_id);

alter table public.study_notes enable row level security;
drop policy if exists "Authors can update their own study notes" on public.study_notes;
drop policy if exists "Authors can update their own study notes" on public.study_notes;
create policy "Authors can update their own study notes" on public.study_notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Authors can delete their own study notes" on public.study_notes;
drop policy if exists "Authors can delete their own study notes" on public.study_notes;
create policy "Authors can delete their own study notes" on public.study_notes for delete to authenticated using (auth.uid() = user_id);


-- Member follows and private direct messages. Run this updated SQL in Supabase SQL Editor.
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);
create index if not exists user_follows_following_idx on public.user_follows(following_id);
alter table public.user_follows enable row level security;
drop policy if exists "Follows are publicly readable" on public.user_follows;
drop policy if exists "Follows are publicly readable" on public.user_follows;
create policy "Follows are publicly readable" on public.user_follows for select to authenticated using (true);
drop policy if exists "Users can follow as themselves" on public.user_follows;
drop policy if exists "Users can follow as themselves" on public.user_follows;
create policy "Users can follow as themselves" on public.user_follows for insert to authenticated with check (auth.uid() = follower_id and follower_id <> following_id);
drop policy if exists "Users can unfollow as themselves" on public.user_follows;
drop policy if exists "Users can unfollow as themselves" on public.user_follows;
create policy "Users can unfollow as themselves" on public.user_follows for delete to authenticated using (auth.uid() = follower_id);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  file_path text,
  created_at timestamptz not null default now(),
  constraint direct_messages_content_check check ((length(trim(body)) > 0 and length(body) <= 5000) or file_path is not null),
  constraint direct_messages_no_self_message check (sender_id <> recipient_id)
);
create index if not exists direct_messages_pair_created_idx on public.direct_messages(sender_id, recipient_id, created_at);
alter table public.direct_messages enable row level security;
drop policy if exists "Users can read messages they sent or received" on public.direct_messages;
drop policy if exists "Users can read messages they sent or received" on public.direct_messages;
create policy "Users can read messages they sent or received" on public.direct_messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Users can send messages as themselves" on public.direct_messages;
drop policy if exists "Users can send messages as themselves" on public.direct_messages;
create policy "Users can send messages as themselves" on public.direct_messages for insert to authenticated with check (auth.uid() = sender_id and sender_id <> recipient_id);
drop policy if exists "Senders can delete their own messages" on public.direct_messages;
drop policy if exists "Senders can delete their own messages" on public.direct_messages;
create policy "Senders can delete their own messages" on public.direct_messages for delete to authenticated using (auth.uid() = sender_id);


-- Follow notifications shown on the recipient's profile page.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'follow',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint user_notifications_no_self check (recipient_id <> actor_id)
);
create index if not exists user_notifications_recipient_created_idx on public.user_notifications(recipient_id, created_at desc);
alter table public.user_notifications enable row level security;
drop policy if exists "Users can read their own notifications" on public.user_notifications;
drop policy if exists "Users can read their own notifications" on public.user_notifications;
create policy "Users can read their own notifications" on public.user_notifications for select to authenticated using (auth.uid() = recipient_id);
drop policy if exists "Users can mark their own notifications read" on public.user_notifications;
drop policy if exists "Users can mark their own notifications read" on public.user_notifications;
create policy "Users can mark their own notifications read" on public.user_notifications for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
drop policy if exists "No direct notification inserts by users" on public.user_notifications;
drop policy if exists "No direct notification inserts by users" on public.user_notifications;
create policy "No direct notification inserts by users" on public.user_notifications for insert to authenticated with check (false);
create or replace function public.notify_on_new_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_notifications(recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;
drop trigger if exists user_follow_notification_trigger on public.user_follows;
create trigger user_follow_notification_trigger
after insert on public.user_follows
for each row execute function public.notify_on_new_follow();



-- Notify recipients when a new private direct message arrives.
create or replace function public.notify_on_new_direct_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_notifications(recipient_id, actor_id, type)
  values (new.recipient_id, new.sender_id, 'message');
  return new;
end;
$$;
drop trigger if exists direct_message_notification_trigger on public.direct_messages;
create trigger direct_message_notification_trigger
after insert on public.direct_messages
for each row execute function public.notify_on_new_direct_message();


-- PRIVATE COMMUNITY SPACES migration. Community posts/messages are not global feed content.
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  description text not null default '',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (community_id,user_id)
);
alter table public.communities add column if not exists category text not null default 'Other';
alter table public.communities add column if not exists invite_code text;
update public.communities set invite_code=gen_random_uuid()::text where invite_code is null;
create unique index if not exists communities_invite_code_unique on public.communities(invite_code);

alter table public.community_posts add column if not exists community_id uuid references public.communities(id) on delete cascade;
create index if not exists community_posts_community_created_idx on public.community_posts(community_id,created_at desc);
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  file_path text,
  file_name text,
  media_type text check (media_type is null or media_type in ('image','video','file')),
  created_at timestamptz not null default now(),
  constraint community_messages_content_check check (length(trim(body)) > 0 or file_path is not null)
);
create index if not exists community_messages_room_created_idx on public.community_messages(community_id,created_at);
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;

drop policy if exists "Communities visible to signed-in users" on public.communities;
drop policy if exists "Communities visible to signed-in users" on public.communities;
create policy "Communities visible to signed-in users" on public.communities for select to authenticated using (true);
drop policy if exists "Signed-in users create communities" on public.communities;
drop policy if exists "Signed-in users create communities" on public.communities;
create policy "Signed-in users create communities" on public.communities for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Community admins update community" on public.communities;
drop policy if exists "Community admins update community" on public.communities;
create policy "Community admins update community" on public.communities for update to authenticated using (exists(select 1 from public.community_members m where m.community_id=id and m.user_id=auth.uid() and m.role='admin')) with check (exists(select 1 from public.community_members m where m.community_id=id and m.user_id=auth.uid() and m.role='admin'));
drop policy if exists "Community members visible to members" on public.community_members;
drop policy if exists "Community members can see own membership" on public.community_members;
create policy "Community members can see own membership" on public.community_members for select to authenticated using (auth.uid()=user_id);
create or replace function public.is_community_admin(_community_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from public.community_members m where m.community_id=_community_id and m.user_id=auth.uid() and m.role='admin');
$$;

drop policy if exists "Users join as themselves" on public.community_members;
create policy "Users join as themselves" on public.community_members for insert to authenticated with check (
 (auth.uid()=user_id and (role='member' or (role='admin' and exists(select 1 from public.communities c where c.id=community_id and c.created_by=auth.uid()))))
 or (role='member' and public.is_community_admin(community_id))
);
drop policy if exists "Users leave own communities" on public.community_members;
drop policy if exists "Users leave own communities" on public.community_members;
create policy "Users leave own communities" on public.community_members for delete to authenticated using (auth.uid()=user_id or exists(select 1 from public.community_members m where m.community_id=community_members.community_id and m.user_id=auth.uid() and m.role='admin'));

-- Remove the old public-feed policies. Legacy posts without a community_id become inaccessible.
drop policy if exists "Community posts are publicly readable" on public.community_posts;
drop policy if exists "Signed-in users can create own posts" on public.community_posts;
drop policy if exists "Authors can update own posts" on public.community_posts;
drop policy if exists "Authors can delete own posts" on public.community_posts;
drop policy if exists "Members can read posts in their communities" on public.community_posts;
create policy "Members can read posts in their communities" on public.community_posts for select to authenticated using (community_id is not null and exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid()));
drop policy if exists "Members can create posts in their communities" on public.community_posts;
create policy "Members can create posts in their communities" on public.community_posts for insert to authenticated with check (auth.uid()=user_id and community_id is not null and exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid()));
drop policy if exists "Authors can update posts in their communities" on public.community_posts;
create policy "Authors can update posts in their communities" on public.community_posts for update to authenticated using (auth.uid()=user_id and exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid())) with check (auth.uid()=user_id and exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid()));
drop policy if exists "Authors can delete posts in their communities" on public.community_posts;
create policy "Authors can delete posts in their communities" on public.community_posts for delete to authenticated using (auth.uid()=user_id and exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid()));

drop policy if exists "Community likes are publicly readable" on public.community_likes;
drop policy if exists "Signed-in users can like as themselves" on public.community_likes;
drop policy if exists "Users can remove their own likes" on public.community_likes;
drop policy if exists "Members can read likes in their communities" on public.community_likes;
create policy "Members can read likes in their communities" on public.community_likes for select to authenticated using (exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_likes.post_id and m.user_id=auth.uid()));
drop policy if exists "Members can like posts in their communities" on public.community_likes;
create policy "Members can like posts in their communities" on public.community_likes for insert to authenticated with check (auth.uid()=user_id and exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_likes.post_id and m.user_id=auth.uid()));
drop policy if exists "Users can remove own likes in communities" on public.community_likes;
create policy "Users can remove own likes in communities" on public.community_likes for delete to authenticated using (auth.uid()=user_id and exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_likes.post_id and m.user_id=auth.uid()));

drop policy if exists "Community comments are publicly readable" on public.community_comments;
drop policy if exists "Signed-in users can comment as themselves" on public.community_comments;
drop policy if exists "Authors can delete own comments" on public.community_comments;
drop policy if exists "Members can read comments in their communities" on public.community_comments;
create policy "Members can read comments in their communities" on public.community_comments for select to authenticated using (exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_comments.post_id and m.user_id=auth.uid()));
drop policy if exists "Members can comment in their communities" on public.community_comments;
create policy "Members can comment in their communities" on public.community_comments for insert to authenticated with check (auth.uid()=user_id and exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_comments.post_id and m.user_id=auth.uid()));
drop policy if exists "Authors can delete own comments in communities" on public.community_comments;
create policy "Authors can delete own comments in communities" on public.community_comments for delete to authenticated using (auth.uid()=user_id and exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_comments.post_id and m.user_id=auth.uid()));

drop policy if exists "Community post media is publicly readable" on public.community_post_media;
drop policy if exists "Signed-in users can add media to own posts" on public.community_post_media;
drop policy if exists "Authors can delete media from own posts" on public.community_post_media;
drop policy if exists "Members can read media in their communities" on public.community_post_media;
create policy "Members can read media in their communities" on public.community_post_media for select to authenticated using (exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_post_media.post_id and m.user_id=auth.uid()));
drop policy if exists "Members can add media to own community posts" on public.community_post_media;
create policy "Members can add media to own community posts" on public.community_post_media for insert to authenticated with check (auth.uid()=user_id and exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_post_media.post_id and p.user_id=auth.uid() and m.user_id=auth.uid()));
drop policy if exists "Authors can delete media in communities" on public.community_post_media;
create policy "Authors can delete media in communities" on public.community_post_media for delete to authenticated using (auth.uid()=user_id and exists(select 1 from public.community_posts p join public.community_members m on m.community_id=p.community_id where p.id=community_post_media.post_id and m.user_id=auth.uid()));

drop policy if exists "Community messages visible to members" on public.community_messages;
drop policy if exists "Community messages visible to members" on public.community_messages;
create policy "Community messages visible to members" on public.community_messages for select to authenticated using (exists(select 1 from public.community_members m where m.community_id=community_messages.community_id and m.user_id=auth.uid()));
drop policy if exists "Members send community messages" on public.community_messages;
drop policy if exists "Members send community messages" on public.community_messages;
create policy "Members send community messages" on public.community_messages for insert to authenticated with check (auth.uid()=user_id and exists(select 1 from public.community_members m where m.community_id=community_messages.community_id and m.user_id=auth.uid()));
drop policy if exists "Authors delete own community messages" on public.community_messages;
drop policy if exists "Authors delete own community messages" on public.community_messages;
create policy "Authors delete own community messages" on public.community_messages for delete to authenticated using (auth.uid()=user_id and exists(select 1 from public.community_members m where m.community_id=community_messages.community_id and m.user_id=auth.uid()));

-- Private storage for community attachments. File paths start with community_id/user_id/.
insert into storage.buckets (id,name,public,file_size_limit)
values ('letog-community-media','letog-community-media',false,52428800)
on conflict (id) do update set public=false, file_size_limit=52428800;
drop policy if exists "Community members can read room files" on storage.objects;
drop policy if exists "Community members can read room files" on storage.objects;
create policy "Community members can read room files" on storage.objects for select to authenticated using (
 bucket_id='letog-community-media' and exists(
   select 1 from public.community_members m
   where m.community_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid()
 )
);
drop policy if exists "Members upload community files to own folder" on storage.objects;
drop policy if exists "Members upload community files to own folder" on storage.objects;
create policy "Members upload community files to own folder" on storage.objects for insert to authenticated with check (
 bucket_id='letog-community-media' and (storage.foldername(name))[2]=auth.uid()::text and exists(
   select 1 from public.community_members m
   where m.community_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid()
 )
);
drop policy if exists "Members delete own community files" on storage.objects;
drop policy if exists "Members delete own community files" on storage.objects;
create policy "Members delete own community files" on storage.objects for delete to authenticated using (
 bucket_id='letog-community-media' and (storage.foldername(name))[2]=auth.uid()::text and exists(
   select 1 from public.community_members m
   where m.community_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid()
 )
);

-- Posts now store private attachments by storage path instead of public file URL.
alter table public.community_posts drop constraint if exists community_posts_content_check;
alter table public.community_posts add constraint community_posts_content_check check (length(trim(body)) > 0 or file_path is not null or file_url is not null);


-- Community administration: any current admin can update settings and promote/demote members.
drop policy if exists "Community admins can manage member roles" on public.community_members;
create policy "Community admins can manage member roles" on public.community_members
for update to authenticated
using (public.is_community_admin(community_id))
with check (public.is_community_admin(community_id) and role in ('admin','member'));


-- PRIVATE ONE-TO-ONE CHAT ATTACHMENTS (photos, videos, and files).
alter table public.direct_messages alter column body set default '';
alter table public.direct_messages alter column body drop not null;
alter table public.direct_messages add column if not exists file_path text;
alter table public.direct_messages drop constraint if exists direct_messages_body_check;
alter table public.direct_messages drop constraint if exists direct_messages_content_check;
alter table public.direct_messages add constraint direct_messages_content_check check ((body is not null and length(trim(body)) > 0 and length(body) <= 5000) or file_path is not null);

insert into storage.buckets (id, name, public, file_size_limit)
values ('letog-private-messages', 'letog-private-messages', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "Private chat participants upload attachments" on storage.objects;
create policy "Private chat participants upload attachments" on storage.objects for insert to authenticated
with check (bucket_id = 'letog-private-messages' and (storage.foldername(name))[1] = auth.uid()::text and (storage.foldername(name))[2] is not null);
drop policy if exists "Private chat participants read attachments" on storage.objects;
create policy "Private chat participants read attachments" on storage.objects for select to authenticated
using (bucket_id = 'letog-private-messages' and ((storage.foldername(name))[1] = auth.uid()::text or (storage.foldername(name))[2] = auth.uid()::text));
drop policy if exists "Senders delete their private chat attachments" on storage.objects;
create policy "Senders delete their private chat attachments" on storage.objects for delete to authenticated
using (bucket_id = 'letog-private-messages' and (storage.foldername(name))[1] = auth.uid()::text);


-- Profile photo upload permissions (profile photos are stored in the existing public letog-media bucket).
-- Safe to rerun. Users may upload/update only files inside their own profile-pictures/<user-id>/ folder.
insert into storage.buckets (id, name, public)
values ('letog-media', 'letog-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Users upload own LeToG profile photos" on storage.objects;
create policy "Users upload own LeToG profile photos" on storage.objects
for insert to authenticated
with check (bucket_id = 'letog-media' and (storage.foldername(name))[1] = 'profile-pictures' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "Users update own LeToG profile photos" on storage.objects;
create policy "Users update own LeToG profile photos" on storage.objects
for update to authenticated
using (bucket_id = 'letog-media' and (storage.foldername(name))[1] = 'profile-pictures' and (storage.foldername(name))[2] = auth.uid()::text)
with check (bucket_id = 'letog-media' and (storage.foldername(name))[1] = 'profile-pictures' and (storage.foldername(name))[2] = auth.uid()::text);
