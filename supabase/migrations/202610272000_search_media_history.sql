begin;
-- Serialize first-company creation and its retries through the existing bootstrap implementation.
alter function public.bootstrap_business(text,text,text,text) rename to bootstrap_business_before_productivity;
revoke all on function bootstrap_business_before_productivity(text,text,text,text) from public,anon,authenticated;
create function public.bootstrap_business(p_shop_name text,p_phone text,p_address text,p_display_name text default null) returns uuid language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign-in required';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text||'bootstrap'));
 return bootstrap_business_before_productivity(p_shop_name,p_phone,p_address,p_display_name);
end$$;
revoke all on function bootstrap_business(text,text,text,text) from public,anon;grant execute on function bootstrap_business(text,text,text,text) to authenticated;

create index categories_shop_name_search on categories(shop_id,lower(name) text_pattern_ops);
alter function public.ux_search(text) rename to ux_search_before_productivity;
revoke all on function ux_search_before_productivity(text) from public,anon,authenticated;
create function public.ux_search(p_query text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare results jsonb;extra jsonb;q text:=trim(p_query);r text:=current_workspace_role();
begin
 if current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 if length(coalesce(q,''))<2 then return '[]';end if;
 results:=ux_search_before_productivity(q);
 if r in('admin','cashier','employee') then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into extra from(select id::text,name label,'category' kind,'products' page from categories where shop_id=current_shop_id() and active and lower(name) like replace(replace(replace(lower(q),'\','\\'),'%','\%'),'_','\_')||'%' order by lower(name),id limit 6)x;
  results:=results||extra;
 end if;
 return results;
end$$;
alter function public.ux_record(text,uuid) rename to ux_record_before_productivity;
revoke all on function ux_record_before_productivity(text,uuid) from public,anon,authenticated;
create function public.ux_record(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if p_kind<>'category' then return ux_record_before_productivity(p_kind,p_id);end if;
 if coalesce(current_workspace_role(),'') not in('admin','cashier','employee') then raise exception 'Access denied';end if;
 select jsonb_build_object('id',c.id,'kind','category','label',c.name,'details',jsonb_build_object('name',c.name,'active',c.active,'products',(select count(*) from products p where p.category_id=c.id and p.shop_id=c.shop_id and p.active))) into result from categories c where id=p_id and shop_id=current_shop_id();
 if result is null then raise exception 'Record not found';end if;return result;
end$$;
revoke all on function ux_search(text),ux_record(text,uuid) from public,anon;grant execute on function ux_search(text),ux_record(text,uuid) to authenticated;

-- Keep previous published values without making them publicly readable.
create table public.catalogue_publication_history(id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id),kind text not null,value jsonb not null,created_at timestamptz not null default now(),created_by uuid not null references auth.users(id));
create index catalogue_history_shop_kind_date on catalogue_publication_history(shop_id,kind,created_at desc);
alter table catalogue_publication_history enable row level security;revoke all on catalogue_publication_history from public,anon,authenticated;
alter function save_catalogue_home(jsonb,integer) rename to save_catalogue_home_before_history;
alter function save_catalogue_categories(jsonb) rename to save_catalogue_categories_before_history;
alter function save_catalogue_about(jsonb,integer) rename to save_catalogue_about_before_history;
revoke all on function save_catalogue_home_before_history(jsonb,integer),save_catalogue_categories_before_history(jsonb),save_catalogue_about_before_history(jsonb,integer) from public,anon,authenticated;
create function save_catalogue_home(p_value jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path=public as $$declare prior jsonb;result jsonb;begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtext(current_shop_id()::text||'media'));
 prior:=get_catalogue_editors()->'home';result:=save_catalogue_home_before_history(p_value,p_revision);
 insert into catalogue_publication_history(shop_id,kind,value,created_by)values(current_shop_id(),'home',prior,auth.uid());return result;
end$$;
create function save_catalogue_categories(p_rows jsonb) returns jsonb language plpgsql security definer set search_path=public as $$declare prior jsonb;result jsonb;begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtext(current_shop_id()::text||'media'));
 prior:=get_catalogue_editors()->'categories';result:=save_catalogue_categories_before_history(p_rows);
 insert into catalogue_publication_history(shop_id,kind,value,created_by)values(current_shop_id(),'categories',prior,auth.uid());return result;
end$$;
create function save_catalogue_about(p_value jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path=public as $$declare prior jsonb;result jsonb;begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtext(current_shop_id()::text||'media'));
 prior:=get_catalogue_about_admin();result:=save_catalogue_about_before_history(p_value,p_revision);
 insert into catalogue_publication_history(shop_id,kind,value,created_by)values(current_shop_id(),'about',prior,auth.uid());return result;
end$$;
create function public.catalogue_history(p_kind text) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select id,kind,value,created_at from catalogue_publication_history where shop_id=current_shop_id() and kind=p_kind order by created_at desc,id limit 10)x);
end$$;
revoke all on function save_catalogue_home(jsonb,integer),save_catalogue_categories(jsonb),save_catalogue_about(jsonb,integer),catalogue_history(text) from public,anon;
grant execute on function save_catalogue_home(jsonb,integer),save_catalogue_categories(jsonb),save_catalogue_about(jsonb,integer),catalogue_history(text) to authenticated;

create table public.media_organization(shop_id uuid not null references shops(id),bucket text not null,path text not null,title text not null default '',original_path text,uploaded_at timestamptz not null default now(),retired_at timestamptz,primary key(shop_id,bucket,path));
alter table media_organization enable row level security;revoke all on media_organization from public,anon,authenticated;
create function public.media_usage(p_path text) returns text[] language plpgsql stable security definer set search_path=public as $$declare s uuid:=current_shop_id();uses text[]:='{}';begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 if exists(select 1 from customer_display_configs where shop_id=s and position(p_path in coalesce(home_page::text,''))>0) then uses:=uses||array['Home Page'];end if;
 if exists(select 1 from customer_display_configs where shop_id=s and position(p_path in coalesce(about_us::text,''))>0) then uses:=uses||array['About Us'];end if;
 if exists(select 1 from customer_display_configs p where shop_id=s and position(p_path in to_jsonb(p)::text)>0) then uses:=uses||array['Catalogue settings'];end if;
 if exists(select 1 from categories where shop_id=s and position(p_path in coalesce(presentation::text,''))>0) then uses:=uses||array['Categories'];end if;
 if exists(select 1 from products p where shop_id=s and position(p_path in to_jsonb(p)::text)>0) or exists(select 1 from product_variants p where shop_id=s and position(p_path in to_jsonb(p)::text)>0) then uses:=uses||array['Products'];end if;
 if exists(select 1 from shops p where id=s and position(p_path in to_jsonb(p)::text)>0) then uses:=uses||array['Business Profile'];end if;
 if exists(select 1 from media_organization where shop_id=s and original_path=p_path and retired_at is null) then uses:=uses||array['Image originals'];end if;
 if exists(select 1 from editor_drafts where shop_id=s and position(p_path in value::text)>0) then uses:=uses||array['Saved draft'];end if;
 if exists(select 1 from catalogue_publication_history where shop_id=s and position(p_path in value::text)>0) then uses:=uses||array['Publication history'];end if;
 return uses;
end$$;
create function public.media_library(p_bucket text default null,p_query text default '',p_offset integer default 0,p_sort text default 'name') returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select o.bucket_id bucket,o.name path,coalesce(nullif(m.title,''),split_part(o.name,'/',array_length(string_to_array(o.name,'/'),1))) title,m.original_path,o.metadata,m.uploaded_at,m.retired_at,media_usage(o.name) used_by from storage.objects o left join media_organization m on m.shop_id=current_shop_id() and m.bucket=o.bucket_id and m.path=o.name where o.bucket_id in('catalogue-home','catalogue-categories','catalogue-about','catalogue-media','product-images','shop-logos') and (p_bucket is null or o.bucket_id=p_bucket) and split_part(o.name,'/',1)=current_shop_id()::text and (coalesce(p_query,'')='' or position(lower(left(p_query,100)) in lower(coalesce(m.title,'')||o.name))>0) order by case when p_sort='date' then m.uploaded_at end desc nulls last,case when p_sort='type' then o.metadata->>'mimetype' end,lower(coalesce(nullif(m.title,''),o.name)),o.name limit 25 offset greatest(0,least(coalesce(p_offset,0),10000)))x);
end$$;
create function public.organize_media(p_bucket text,p_path text,p_title text,p_retire boolean default false,p_original text default null) returns void language plpgsql security definer set search_path=public as $$begin
 if coalesce(current_workspace_role(),'')<>'admin' or split_part(p_path,'/',1)<>current_shop_id()::text or p_bucket not in('catalogue-home','catalogue-categories','catalogue-about','catalogue-media','product-images','shop-logos') then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtext(current_shop_id()::text||'media'));
 if not exists(select 1 from storage.objects where bucket_id=p_bucket and name=p_path) then raise exception 'Media not found';end if;
 if p_original is not null and (p_original=p_path or split_part(p_original,'/',1)<>current_shop_id()::text or not exists(select 1 from storage.objects where bucket_id=p_bucket and name=p_original) or exists(select 1 from media_organization where shop_id=current_shop_id() and bucket=p_bucket and path=p_original and retired_at is not null)) then raise exception 'Invalid original image';end if;
 if p_title is null or length(p_title)>200 then raise exception 'Invalid media title';end if;
 if p_retire and cardinality(media_usage(p_path))>0 then raise exception 'Media is still in use';end if;
 insert into media_organization(shop_id,bucket,path,title,original_path,retired_at)values(current_shop_id(),p_bucket,p_path,p_title,p_original,case when p_retire then now() end) on conflict(shop_id,bucket,path) do update set title=excluded.title,original_path=coalesce(excluded.original_path,media_organization.original_path),retired_at=coalesce(media_organization.retired_at,excluded.retired_at);
end$$;
-- Retired objects cannot be newly assigned after the reference check, including through direct writes.
create function public.reject_retired_media() returns trigger language plpgsql security definer set search_path=public as $$declare s uuid;begin
 s:=(to_jsonb(new)->>(case when tg_table_name='shops' then 'id' else 'shop_id' end))::uuid;
 perform pg_advisory_xact_lock(hashtext(s::text||'media'));
 if exists(select 1 from media_organization where shop_id=s and retired_at is not null and position(path in to_jsonb(new)::text)>0) then raise exception 'Media was removed. Upload a new image.';end if;return new;
end$$;
create trigger reject_retired_media before insert or update on customer_display_configs for each row execute function reject_retired_media();
create trigger reject_retired_media before insert or update on categories for each row execute function reject_retired_media();
create trigger reject_retired_media before insert or update on products for each row execute function reject_retired_media();
create trigger reject_retired_media before insert or update on product_variants for each row execute function reject_retired_media();
create trigger reject_retired_media before insert or update on shops for each row execute function reject_retired_media();
create trigger reject_retired_media before insert or update on editor_drafts for each row execute function reject_retired_media();
create policy delete_retired_catalogue_media on storage.objects for delete to authenticated using(current_workspace_role()='admin' and exists(select 1 from media_organization where shop_id=current_shop_id() and bucket=bucket_id and path=name and retired_at is not null));
-- The policy uses a definer predicate instead of granting access to private organization metadata.
create function public.media_removal_allowed(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path=public as $$select current_workspace_role()='admin' and exists(select 1 from media_organization where shop_id=current_shop_id() and bucket=p_bucket and path=p_path and retired_at is not null)$$;
drop policy delete_retired_catalogue_media on storage.objects;
create policy delete_retired_catalogue_media on storage.objects for delete to authenticated using(media_removal_allowed(bucket_id,name));
revoke all on function media_usage(text),media_library(text,text,integer,text),organize_media(text,text,text,boolean,text),media_removal_allowed(text,text),reject_retired_media() from public,anon;
grant execute on function media_usage(text),media_library(text,text,integer,text),organize_media(text,text,text,boolean,text),media_removal_allowed(text,text) to authenticated;
insert into workspace_backup_tables select c.table_name,array_agg(c.column_name order by c.ordinal_position) from information_schema.columns c where c.table_schema='public' and c.table_name in('catalogue_publication_history','media_organization') and c.is_generated='NEVER' group by c.table_name on conflict(table_name) do update set columns=excluded.columns;
commit;
