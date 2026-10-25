begin;
alter table public.customer_display_configs add column about_us jsonb;
alter table public.customer_display_configs add column about_us_revision integer not null default 0;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogue-about','catalogue-about',false,2097152,array['image/jpeg','image/png','image/webp']);

create function public.catalogue_about_image_published(p_name text) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from customer_display_configs where enabled and about_us->>'enabled'='true' and about_us->>'image_path'=p_name)
$$;
revoke all on function public.catalogue_about_image_published(text) from public;
grant execute on function public.catalogue_about_image_published(text) to anon,authenticated;
create policy catalogue_about_read on storage.objects for select to anon,authenticated using(
 bucket_id='catalogue-about' and (public.catalogue_about_image_published(name) or
 ((storage.foldername(name))[1]=public.current_shop_id()::text and public.current_workspace_role()='admin')));
create policy catalogue_about_insert on storage.objects for insert to authenticated with check(
 bucket_id='catalogue-about' and (storage.foldername(name))[1]=public.current_shop_id()::text and public.current_workspace_role()='admin');
-- No client UPDATE or DELETE policies: uploads are immutable, including superseded images.

create function public.validate_catalogue_about() returns trigger language plpgsql security definer set search_path=public as $$
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
  for k in select jsonb_object_keys(c) loop if k not in('heading','intro','story','alt') then raise exception 'Invalid About Us field.';end if;end loop;
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
create trigger catalogue_about_validate before insert or update on public.customer_display_configs for each row execute function public.validate_catalogue_about();

create function public.get_catalogue_about_admin() returns jsonb language plpgsql security definer set search_path=public as $$
declare c customer_display_configs;
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access is required.';end if;
 perform ensure_customer_display_config();
 select * into strict c from customer_display_configs where shop_id=current_shop_id();
 return jsonb_build_object('shop_id',c.shop_id,'revision',c.about_us_revision,'value',coalesce(c.about_us,'{"enabled":false,"default_language":"en","copy":{"heading":"","intro":"","story":"","alt":""},"translations":{},"image_path":null}'::jsonb));
end$$;
create function public.save_catalogue_about(p_value jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare c customer_display_configs;
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access is required.';end if;
 select * into strict c from customer_display_configs where shop_id=current_shop_id() for update;
 if c.about_us_revision is distinct from p_revision then raise exception 'About Us changed elsewhere. Reopen the editor before saving.';end if;
 update customer_display_configs set about_us=p_value where shop_id=c.shop_id;
 return get_catalogue_about_admin();
end$$;
create function public.get_catalogue_about(p_token text) returns jsonb language sql stable security definer set search_path=public as $$
 select about_us from customer_display_configs where access_token=p_token and enabled and about_us->>'enabled'='true'
$$;
revoke all on function public.get_catalogue_about_admin(),public.save_catalogue_about(jsonb,integer),public.get_catalogue_about(text),public.validate_catalogue_about() from public,anon,authenticated;
grant execute on function public.get_catalogue_about_admin(),public.save_catalogue_about(jsonb,integer) to authenticated;
grant execute on function public.get_catalogue_about(text) to anon,authenticated;
commit;
