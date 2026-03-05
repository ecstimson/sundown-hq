-- Migration 009: Storage policies for observation photos
-- Note: Bucket creation must be done via Supabase Dashboard or CLI.

-- Drop existing policies if they were partially applied
drop policy if exists "upload_observation_photos" on storage.objects;
drop policy if exists "view_observation_photos" on storage.objects;
drop policy if exists "delete_observation_photos" on storage.objects;

-- Observation photo upload: authenticated users can upload
create policy "upload_observation_photos" on storage.objects
  for insert with check (
    bucket_id = 'observation-photos'
    and auth.role() = 'authenticated'
  );

-- Observation photo viewing: anyone can view (public bucket)
create policy "view_observation_photos" on storage.objects
  for select using (bucket_id = 'observation-photos');

-- Observation photo deletion: admin/super_admin only
create policy "delete_observation_photos" on storage.objects
  for delete using (
    bucket_id = 'observation-photos'
    and (select role from public.employees where id = auth.uid()) in ('admin', 'super_admin')
  );
