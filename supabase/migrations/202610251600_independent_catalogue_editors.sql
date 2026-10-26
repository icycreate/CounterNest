begin;
alter table customer_display_configs add column if not exists home_page jsonb,add column if not exists home_revision integer not null default 0,add column if not exists home_updated_at timestamptz,add column if not exists home_updated_by uuid references auth.users(id);
alter table categories add column if not exists presentation jsonb,add column if not exists presentation_revision integer not null default 0,add column if not exists presentation_updated_at timestamptz,add column if not exists presentation_updated_by uuid references auth.users(id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalogue-home','catalogue-home',false,12582912,array['image/jpeg','image/png','image/webp']),('catalogue-categories','catalogue-categories',false,12582912,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create or replace function public.catalogue_editor_image_public(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path=public as $$
 select case when p_bucket='catalogue-home' then exists(select 1 from customer_display_configs c,jsonb_array_elements(coalesce(c.home_page->'media','[]')) m where c.enabled and coalesce((c.home_page->>'hero_visible')::boolean,true) and (m->>'path'=p_path or m->>'original'=p_path)) when p_bucket='catalogue-categories' then exists(select 1 from categories c join customer_display_configs d on d.shop_id=c.shop_id,jsonb_array_elements(coalesce(c.presentation->'media','[]')) m where d.enabled and c.active and coalesce((c.presentation->>'visible')::boolean,true) and (m->>'path'=p_path or m->>'original'=p_path)) else false end
$$;
revoke all on function catalogue_editor_image_public(text,text) from public;
grant execute on function catalogue_editor_image_public(text,text) to anon,authenticated;
create policy catalogue_editors_read on storage.objects for select to anon,authenticated using(bucket_id in('catalogue-home','catalogue-categories') and (catalogue_editor_image_public(bucket_id,name) or ((storage.foldername(name))[1]=current_shop_id()::text and current_workspace_role()='admin')));
create policy catalogue_editors_upload on storage.objects for insert to authenticated with check(bucket_id in('catalogue-home','catalogue-categories') and (storage.foldername(name))[1]=current_shop_id()::text and current_workspace_role()='admin');
-- Immutable uploads: no client delete/overwrite policy; publication never deletes another section's image.
create or replace function public.validate_catalogue_editor(p_value jsonb,p_bucket text,p_shop uuid) returns void language plpgsql security definer set search_path=public as $$
declare l text;k text;m jsonb;v jsonb;asset text;
begin
 if jsonb_typeof(p_value) is distinct from 'object' or octet_length(p_value::text)>90000 or coalesce(p_value->>'default_language','') not in('en','es','zh-TW','zh-CN') or jsonb_typeof(p_value->'translations') is distinct from 'object' or jsonb_typeof(p_value->'media') is distinct from 'array' then raise exception 'Invalid catalogue content';end if;
 for l,v in select * from jsonb_each(p_value->'translations') loop
  if l not in('en','es','zh-TW','zh-CN') or jsonb_typeof(v) is distinct from 'object' then raise exception 'Invalid content language';end if;
  for k in select jsonb_object_keys(v) loop if k not in('heading','welcome','subtitle','promo','cta','name','description') or jsonb_typeof(v->k) is distinct from 'string' or length(v->>k)>2000 then raise exception 'Invalid catalogue text';end if;end loop;
 end loop;
 if p_bucket='catalogue-home' then
  if coalesce(p_value->>'cta_target','') not in('categories','contact','about','orders') or coalesce(p_value->>'desktop_fit','') not in('cover','contain') or coalesce(p_value->>'mobile_fit','') not in('cover','contain') then raise exception 'Invalid home display settings';end if;
  foreach k in array array['hero_visible','links_visible','products_visible'] loop if jsonb_typeof(p_value->k) is distinct from 'boolean' then raise exception 'Invalid visibility setting';end if;end loop;
 elsif jsonb_typeof(p_value->'visible') is distinct from 'boolean' then raise exception 'Invalid visibility setting';end if;
 if jsonb_array_length(p_value->'media')>(case when p_bucket='catalogue-home' then 8 else 1 end) then raise exception 'Too many images';end if;
 for m in select value from jsonb_array_elements(p_value->'media') loop
  if jsonb_typeof(m) is distinct from 'object' or length(coalesce(m->>'id',''))>80 or coalesce(m->>'id','')='' or jsonb_typeof(m->'captions') is distinct from 'object' then raise exception 'Invalid image reference';end if;
  for l,v in select * from jsonb_each(m->'captions') loop if l not in('en','es','zh-TW','zh-CN') or jsonb_typeof(v) is distinct from 'string' or length(v#>>'{}')>300 then raise exception 'Invalid image caption';end if;end loop;
  foreach k in array array['path','original'] loop asset:=m->>k;if asset is null or asset not like p_shop::text||'/%' or not exists(select 1 from storage.objects where bucket_id=p_bucket and name=asset) then raise exception 'Invalid image reference';end if;end loop;
 end loop;
end$$;
create or replace function public.catalogue_editor_write_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='categories' then
  if tg_op='UPDATE' and new.presentation is not distinct from old.presentation and new.name=old.name and new.sort_order=old.sort_order then new.presentation_revision:=old.presentation_revision;return new;end if;
  if new.presentation is null and tg_op='INSERT' then return new;end if;
 else
  if tg_op='UPDATE' and new.home_page is not distinct from old.home_page then new.home_revision:=old.home_revision;return new;end if;
  if new.home_page is null and tg_op='INSERT' then return new;end if;
 end if;
 if coalesce(current_workspace_role(),'')<>'admin' or new.shop_id is distinct from current_shop_id() then raise exception 'Administrator access required';end if;
 if tg_table_name='categories' then if new.presentation is not null then perform validate_catalogue_editor(new.presentation,'catalogue-categories',new.shop_id);end if;new.presentation_revision:=case when tg_op='INSERT' then 1 else old.presentation_revision+1 end;new.presentation_updated_at:=now();new.presentation_updated_by:=auth.uid();
 else perform validate_catalogue_editor(new.home_page,'catalogue-home',new.shop_id);new.home_revision:=case when tg_op='INSERT' then 1 else old.home_revision+1 end;new.home_updated_at:=now();new.home_updated_by:=auth.uid();end if;return new;
end$$;
create trigger catalogue_home_guard before insert or update on customer_display_configs for each row execute function catalogue_editor_write_guard();
create trigger catalogue_category_guard before insert or update on categories for each row execute function catalogue_editor_write_guard();
create or replace function public.get_catalogue_editors() returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 perform ensure_customer_display_config();
 return jsonb_build_object('shop_id',current_shop_id(),'home',(select jsonb_build_object('value',home_page,'revision',home_revision) from customer_display_configs where shop_id=current_shop_id()),'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'sort_order',sort_order,'value',presentation,'revision',presentation_revision) order by sort_order,name),'[]') from categories where shop_id=current_shop_id()));
end$$;
create or replace function public.save_catalogue_home(p_value jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare c customer_display_configs;
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 select * into strict c from customer_display_configs where shop_id=current_shop_id() for update;
 if c.home_revision is distinct from p_revision then raise exception 'Content changed elsewhere. Reload before saving.';end if;
 update customer_display_configs set home_page=p_value where shop_id=c.shop_id;
 return get_catalogue_editors()->'home';
end$$;
create or replace function public.save_catalogue_categories(p_rows jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare row jsonb;c categories;position integer:=0;
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>300 then raise exception 'Invalid categories';end if;
 perform pg_advisory_xact_lock(hashtextextended(current_shop_id()::text||'categories',0));
 for row in select value from jsonb_array_elements(p_rows) loop
  if length(trim(coalesce(row->>'name',''))) not between 1 and 100 then raise exception 'Category name required';end if;
  select * into c from categories where id=(row->>'id')::uuid for update;
  if found then
   if c.shop_id<>current_shop_id() or c.presentation_revision is distinct from (row->>'revision')::integer then raise exception 'Content changed elsewhere. Reload before saving.';end if;
   update categories set name=trim(row->>'name'),sort_order=position,presentation=row->'value' where id=c.id;
  else
   if (row->>'revision')::integer<>0 then raise exception 'Category unavailable';end if;
   insert into categories(id,shop_id,name,sort_order,presentation) values((row->>'id')::uuid,current_shop_id(),trim(row->>'name'),position,row->'value');
  end if;position:=position+1;
 end loop;
 return get_catalogue_editors()->'categories';
end$$;
-- Preserve the current catalogue implementation; expose only public presentation, and filter only public products.
alter function get_commercial_catalogue(text) rename to get_commercial_catalogue_before_editors;
revoke all on function get_commercial_catalogue_before_editors(text) from public,anon,authenticated;
create function get_commercial_catalogue(p_token text default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare data jsonb;s uuid;visible_products jsonb;category_data jsonb;
begin
 data:=get_commercial_catalogue_before_editors(p_token);
 if p_token is null then return data;end if;
 select shop_id into s from customer_display_configs where access_token=p_token and enabled;
 if s is null then raise exception 'Catalogue unavailable';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'sort_order',sort_order,'value',presentation) order by sort_order,name),'[]') into category_data from categories where shop_id=s and active and coalesce((presentation->>'visible')::boolean,true);
 select coalesce(jsonb_agg(p),'[]') into visible_products from jsonb_array_elements(data->'products') p where nullif(p->>'category_id','') is null or exists(select 1 from categories c where c.id=(p->>'category_id')::uuid and c.shop_id=s and c.active and coalesce((c.presentation->>'visible')::boolean,true));
 return data||jsonb_build_object('home_page',(select home_page from customer_display_configs where shop_id=s),'category_presentations',category_data,'products',visible_products);
end$$;
revoke all on function validate_catalogue_editor(jsonb,text,uuid),catalogue_editor_write_guard(),get_catalogue_editors(),save_catalogue_home(jsonb,integer),save_catalogue_categories(jsonb),get_commercial_catalogue(text) from public,anon,authenticated;
grant execute on function get_catalogue_editors(),save_catalogue_home(jsonb,integer),save_catalogue_categories(jsonb) to authenticated;
grant execute on function get_commercial_catalogue(text) to anon,authenticated;
create or replace function acknowledge_all_order_alerts() returns void language plpgsql security definer set search_path=public as $$
begin
 if not can_handle_order_requests() then raise exception 'Order handling access required';end if;
 insert into order_alert_acknowledgements(event_id,user_id) select id,auth.uid() from order_alert_events where shop_id=current_shop_id() on conflict do nothing;
end$$;
revoke all on function acknowledge_all_order_alerts() from public,anon;
grant execute on function acknowledge_all_order_alerts() to authenticated;

alter function get_order_alert_inbox() rename to get_order_alert_inbox_before_editors;
revoke all on function get_order_alert_inbox_before_editors() from public,anon,authenticated;
create function get_order_alert_inbox() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare data jsonb;events jsonb;
begin
 data:=get_order_alert_inbox_before_editors();
 select coalesce(jsonb_agg(e||coalesce((select jsonb_build_object('request_number',r.request_number,'customer_name',r.customer_name,'preferred_method',r.preferred_method,'item_count',(select sum((x->>'qty')::numeric) from jsonb_array_elements(r.summary)x)) from catalogue_preorder_requests r where r.id=(e->>'record_id')::uuid and r.shop_id=current_shop_id()),'{}')),'[]') into events from jsonb_array_elements(data->'events')e;
 return data||jsonb_build_object('events',events);
end$$;
revoke all on function get_order_alert_inbox() from public,anon;
grant execute on function get_order_alert_inbox() to authenticated;
create policy order_alert_realtime_read on order_alert_events for select to authenticated using(shop_id=current_shop_id() and can_handle_order_requests());
grant select on order_alert_events to authenticated;
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='order_alert_events') then alter publication supabase_realtime add table public.order_alert_events;end if;end$$;

commit;
