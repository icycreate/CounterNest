-- PROPOSAL ONLY: not applied. Review current Storage policies/global limit and
-- remaining quota; obtain explicit approval before running.
-- Uploads are restricted to trusted platform release administrators using the
-- protected Supabase dashboard/publishing environment. Business admins and
-- ordinary authenticated POS users cannot publish installers.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('app-releases','app-releases',true,52428800,array['application/vnd.android.package-archive'])
on conflict (id) do nothing;
-- RESTRICTIVE policies also block access granted by unrelated permissive policies.
-- Never change policies for other buckets.
create policy "app releases deny client insert" on storage.objects as restrictive
for insert to anon, authenticated with check (bucket_id <> 'app-releases');
create policy "app releases deny client update" on storage.objects as restrictive
for update to anon, authenticated using (bucket_id <> 'app-releases') with check (bucket_id <> 'app-releases');
create policy "app releases deny client delete" on storage.objects as restrictive
for delete to anon, authenticated using (bucket_id <> 'app-releases');
commit;
-- No client upload UI or service-role credential is shipped in the app.
-- Do not upload drafts to this public bucket. Use immutable version paths,
-- upsert=false, and publish only a reviewed/tested APK. New builds get new paths.
