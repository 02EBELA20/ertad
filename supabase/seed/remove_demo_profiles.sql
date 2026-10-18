-- Removes all demo members created by demo_profiles.sql (profiles, providers, posts cascade).
delete from auth.users where id in (select user_id from public.providers where is_demo);
