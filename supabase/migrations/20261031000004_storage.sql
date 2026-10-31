-- Storage buckets & policies for user media (Supabase Storage).
-- Path convention: <auth.uid()>/<uuid>.<ext>. Users can only write into their own folder.
-- NOTE: the bucket is public-read so CDN URLs work; media of private accounts is protected by
-- unguessable paths only. Move to signed URLs before enabling private accounts in production.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('post-media', 'post-media', true, 104857600, array['image/jpeg','image/png','image/webp','video/mp4','video/webm','text/vtt'])
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do nothing;

    execute $p$create policy "media upload own folder" on storage.objects for insert to authenticated
      with check (bucket_id in ('post-media','avatars') and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "media update own" on storage.objects for update to authenticated
      using (bucket_id in ('post-media','avatars') and owner = auth.uid())$p$;
    execute $p$create policy "media delete own" on storage.objects for delete to authenticated
      using (bucket_id in ('post-media','avatars') and owner = auth.uid())$p$;
  end if;
end $$;
