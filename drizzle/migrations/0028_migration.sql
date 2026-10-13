drop policy if exists "likes readable" on public.post_likes;
create policy "likes readable" on public.post_likes for select
using (
  (select safety.identity_access_allowed((select auth.uid())))
  and (user_id = (select auth.uid()) or not public.is_blocked_pair((select auth.uid()), user_id))
);