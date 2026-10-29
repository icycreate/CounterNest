begin;
create table public.business_setup_preferences(
 shop_id uuid primary key references shops(id),business_type text not null default '',
 default_language text not null default 'en' check(default_language in('en','es','zh-TW','zh-CN')),
 payment_methods text[] not null default array['cash','card','qr'],revision integer not null default 0,
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 check(length(business_type)<=100),check(cardinality(payment_methods) between 1 and 3 and payment_methods<@array['cash','card','qr'])
);
alter table business_setup_preferences enable row level security;
revoke all on business_setup_preferences from public,anon,authenticated;
create function public.get_business_setup_preferences() returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if current_workspace_role() is null then raise exception 'Staff sign-in required';end if;
 return coalesce((select to_jsonb(p)-'shop_id'-'updated_by' from business_setup_preferences p where shop_id=current_shop_id()),jsonb_build_object('business_type','','default_language','en','payment_methods',array['cash','card','qr'],'revision',0));
end$$;
create function public.save_business_setup_preferences(p_value jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare s uuid:=current_shop_id();prior business_setup_preferences;m text[];
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 if jsonb_typeof(p_value)<>'object' or jsonb_typeof(p_value->'payment_methods')<>'array' or p_revision is null then raise exception 'Invalid setup preferences';end if;
 select array_agg(distinct value) into m from jsonb_array_elements_text(p_value->'payment_methods');
 if coalesce(cardinality(m),0) not between 1 and 3 or not m<@array['cash','card','qr'] or coalesce(length(p_value->>'business_type'),101)>100 or coalesce(p_value->>'default_language','') not in('en','es','zh-TW','zh-CN') then raise exception 'Invalid setup preferences';end if;
 perform pg_advisory_xact_lock(hashtext(s::text||'setup-preferences'));
 select * into prior from business_setup_preferences where shop_id=s for update;
 if coalesce(prior.revision,0)<>p_revision then raise exception 'Setup changed elsewhere. Reload before saving.' using errcode='40001';end if;
 insert into business_setup_preferences(shop_id,business_type,default_language,payment_methods,revision,updated_by) values(s,p_value->>'business_type',p_value->>'default_language',m,p_revision+1,auth.uid())
 on conflict(shop_id) do update set business_type=excluded.business_type,default_language=excluded.default_language,payment_methods=excluded.payment_methods,revision=excluded.revision,updated_at=now(),updated_by=auth.uid();
 return get_business_setup_preferences();
end$$;
revoke all on function get_business_setup_preferences(),save_business_setup_preferences(jsonb,integer) from public,anon;
grant execute on function get_business_setup_preferences(),save_business_setup_preferences(jsonb,integer) to authenticated;
-- Keep the existing checkout replay branch before the method check. A previously
-- committed payment must remain recoverable after its method is disabled.
do $$declare d text;a text:=$a$v_result:=public.complete_catalogue_sale(p_customer_id,p_payment_method,p_items,p_reward_id,p_request_id);$a$;begin
 d:=pg_get_functiondef('public.complete_pos_checkout(uuid,uuid,text,jsonb,uuid,uuid,numeric)'::regprocedure);
 if position(a in d)=0 then raise exception 'Unexpected checkout definition';end if;
 execute replace(d,a,$a$
 perform pg_advisory_xact_lock(hashtext(v_shop::text||'setup-preferences'));
 if exists(select 1 from business_setup_preferences where shop_id=v_shop and not p_payment_method=any(payment_methods)) then raise exception 'Payment method disabled. Review payment settings.';end if;
 $a$||a);
end$$;
insert into workspace_backup_tables select c.table_name,array_agg(c.column_name order by c.ordinal_position) from information_schema.columns c where c.table_schema='public' and c.table_name='business_setup_preferences' and c.is_generated='NEVER' group by c.table_name on conflict(table_name) do update set columns=excluded.columns;
create function public.save_request_notes_checked(p_id uuid,p_notes text,p_expected timestamptz) returns void language plpgsql security definer set search_path=public as $$declare r catalogue_preorder_requests;begin
 if not can_handle_order_requests() then raise exception 'Access denied';end if;
 select * into r from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Request unavailable';end if;
 if r.updated_at is distinct from p_expected then raise exception 'Request changed. Reload before saving notes.' using errcode='40001';end if;
 perform ux_save_request_notes(p_id,p_notes);
end$$;
revoke all on function save_request_notes_checked(uuid,text,timestamptz) from public,anon;
grant execute on function save_request_notes_checked(uuid,text,timestamptz) to authenticated;
-- Defaults seed only content that has never been published. Existing translations remain untouched.
alter function get_catalogue_editors() rename to get_catalogue_editors_before_setup;
revoke all on function get_catalogue_editors_before_setup() from public,anon,authenticated;
create function get_catalogue_editors() returns jsonb language plpgsql security definer set search_path=public as $$begin
 return get_catalogue_editors_before_setup()||jsonb_build_object('default_language',coalesce((select default_language from business_setup_preferences where shop_id=current_shop_id()),'en'));
end$$;
alter function get_catalogue_about_admin() rename to get_catalogue_about_admin_before_setup;
revoke all on function get_catalogue_about_admin_before_setup() from public,anon,authenticated;
create function get_catalogue_about_admin() returns jsonb language plpgsql security definer set search_path=public as $$declare result jsonb;begin
 result:=get_catalogue_about_admin_before_setup();
 if exists(select 1 from customer_display_configs where shop_id=current_shop_id() and about_us is null) then result:=jsonb_set(result,'{value,default_language}',to_jsonb(coalesce((select default_language from business_setup_preferences where shop_id=current_shop_id()),'en')));end if;
 return result;
end$$;
revoke all on function get_catalogue_editors(),get_catalogue_about_admin() from public,anon;
grant execute on function get_catalogue_editors(),get_catalogue_about_admin() to authenticated;
commit;
