-- Optional localized highlighted statement; existing RC22 records remain valid.
begin;
create or replace function public.validate_catalogue_about() returns trigger language plpgsql security definer set search_path=public as $$
declare v jsonb; c jsonb; k text; lang text; image text;
begin
 if tg_op='UPDATE' and new.about_us is not distinct from old.about_us then
  new.about_us_revision:=old.about_us_revision;return new;
 end if;
 if new.about_us is null and tg_op='INSERT' then new.about_us_revision:=0;return new;end if;
 if coalesce(current_workspace_role(),'')<>'admin' or new.shop_id is distinct from current_shop_id() then raise exception 'Administrator access is required.';end if;
 v:=new.about_us;
 if v is null or jsonb_typeof(v)<>'object' or octet_length(v::text)>180000 or jsonb_typeof(v->'enabled') is distinct from 'boolean'
 or coalesce(v->>'default_language','') not in('en','es','zh-TW','zh-CN') or jsonb_typeof(v->'copy') is distinct from 'object' or jsonb_typeof(v->'translations') is distinct from 'object' then raise exception 'Invalid About Us content.';end if;
 for k in select jsonb_object_keys(v) loop if k not in('enabled','default_language','copy','translations','image_path') then raise exception 'Invalid About Us field.';end if;end loop;
 for lang in select jsonb_object_keys(v->'translations') loop
  if lang not in('en','es','zh-TW','zh-CN') or jsonb_typeof(v->'translations'->lang) is distinct from 'object' then raise exception 'Invalid About Us language.';end if;
 end loop;
 for c in select v->'copy' union all select value from jsonb_each(v->'translations') loop
  for k in select jsonb_object_keys(c) loop if k not in('heading','intro','story','alt','highlight') then raise exception 'Invalid About Us field.';end if;end loop;
  if c ? 'highlight' and (jsonb_typeof(c->'highlight') is distinct from 'string' or length(c->>'highlight')>1000) then raise exception 'Invalid About Us text length.';end if;
  foreach k in array array['heading','intro','story','alt'] loop
   if jsonb_typeof(c->k) is distinct from 'string' or length(c->>k)>(case when k='story' then 10000 when k='intro' then 600 else 200 end) then raise exception 'Invalid About Us text length.';end if;
  end loop;
 end loop;
 if (v->>'enabled')::boolean and btrim(v->'copy'->>'heading')='' then raise exception 'Enter an About Us heading.';end if;
 image:=nullif(v->>'image_path','');
 if image is not null and (image not like new.shop_id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='catalogue-about' and name=image)) then raise exception 'Invalid About Us image.';end if;
 new.about_us_revision:=case when tg_op='INSERT' then 1 else old.about_us_revision+1 end;
 return new;
end$$;
commit;
