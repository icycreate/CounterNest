-- Approved v6.5 storage configuration; applied and verified 2026-11-03.
-- Existing About Us uploader accepts 12 MiB and now retains the source file.
-- Change only this bucket limit; keep MIME restrictions, policies and files intact.
begin;
update storage.buckets
set file_size_limit = 12582912
where id = 'catalogue-about' and file_size_limit = 2097152;
select id, file_size_limit, allowed_mime_types from storage.buckets where id='catalogue-about';
commit;
