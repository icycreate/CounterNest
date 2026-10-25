begin;
create function public.restore_archived_customer(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not master_removal_authorized() then raise exception 'Administrator access required';end if;
 perform 1 from customers where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Customer not found';end if;
 -- The existing activation audit trigger records the change. No replacement record.
 update customers set active=true where id=p_id and shop_id=current_shop_id() and not active;
end$$;
create function public.get_customer_history_rc19(p_customer uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare base jsonb;history jsonb;
begin
 base:=get_customer_commercial_history(p_customer);
 if coalesce(current_workspace_role(),'') not in('admin','manager','cashier') then return base;end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') into history from (
 select 'points' as kind,t.delta,t.transaction_type,t.created_at from loyalty_point_transactions t join loyalty_memberships m on m.id=t.membership_id and m.shop_id=t.shop_id where m.customer_id=p_customer and t.shop_id=current_shop_id()
 union all select 'stamps',t.delta,t.transaction_type,t.created_at from loyalty_stamp_transactions t join loyalty_memberships m on m.id=t.membership_id and m.shop_id=t.shop_id where m.customer_id=p_customer and t.shop_id=current_shop_id()
 order by created_at desc limit 100)x;
 return base||jsonb_build_object('loyalty',history);
end$$;
create table public.whatsapp_order_preferences(
 shop_id uuid primary key references shops(id) on delete cascade,
 enabled boolean not null default false,recipient text not null default '',
 preorder boolean not null default true,catalogue boolean not null default true,
 include_summary boolean not null default true,include_contact boolean not null default false,
 language text not null default 'en' check(language in('en','es','zh-TW','zh-CN')),
 consent_by uuid references auth.users(id),consented_at timestamptz,revision uuid not null default gen_random_uuid(),updated_at timestamptz not null default now()
);
create table public.whatsapp_order_deliveries(
 event_id uuid primary key references order_alert_events(id) on delete cascade,
 shop_id uuid not null references shops(id) on delete cascade,revision uuid not null,
 state text not null default 'pending' check(state in('pending','sending','accepted','failed','unknown','cancelled')),
 attempts int not null default 0,lease_until timestamptz,provider_id text,last_error text,updated_at timestamptz not null default now()
);
alter table whatsapp_order_preferences enable row level security;
alter table whatsapp_order_deliveries enable row level security;
revoke all on whatsapp_order_preferences,whatsapp_order_deliveries from public,anon,authenticated;
create function public.get_whatsapp_order_preferences() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not master_removal_authorized() then raise exception 'Administrator access required';end if;
 return (select to_jsonb(p) from whatsapp_order_preferences p where shop_id=current_shop_id());
end$$;
create function public.save_whatsapp_order_preferences(p_values jsonb,p_consent boolean) returns void language plpgsql security definer set search_path=public as $$
declare enabled boolean;recipient text;prior whatsapp_order_preferences%rowtype;
begin
 if not master_removal_authorized() then raise exception 'Administrator access required';end if;
 if jsonb_typeof(p_values) is distinct from 'object' or exists(select 1 from jsonb_each(p_values) where key not in('enabled','recipient','preorder','catalogue','include_summary','include_contact','language')) then raise exception 'Invalid preferences';end if;
 enabled:=coalesce((p_values->>'enabled')::boolean,false);recipient:=trim(coalesce(p_values->>'recipient',''));
 if recipient<>'' and recipient!~'^\+[1-9][0-9]{5,14}$' then raise exception 'Invalid Phone Number';end if;
 if enabled and (recipient='' or not coalesce(p_consent,false)) then raise exception 'Recipient consent is required';end if;
 select * into prior from whatsapp_order_preferences where shop_id=current_shop_id() for update;
 insert into whatsapp_order_preferences(shop_id,enabled,recipient,preorder,catalogue,include_summary,include_contact,language,consent_by,consented_at)
 values(current_shop_id(),enabled,recipient,coalesce((p_values->>'preorder')::boolean,true),coalesce((p_values->>'catalogue')::boolean,true),coalesce((p_values->>'include_summary')::boolean,true),coalesce((p_values->>'include_contact')::boolean,false),coalesce(p_values->>'language','en'),auth.uid(),case when enabled then now() end)
 on conflict(shop_id) do update set enabled=excluded.enabled,recipient=excluded.recipient,preorder=excluded.preorder,catalogue=excluded.catalogue,include_summary=excluded.include_summary,include_contact=excluded.include_contact,language=excluded.language,consent_by=excluded.consent_by,consented_at=excluded.consented_at,revision=gen_random_uuid(),updated_at=now();
 update whatsapp_order_deliveries set state='cancelled',updated_at=now() where shop_id=current_shop_id() and state='pending';
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'notification_settings',current_shop_id(),'whatsapp_preferences_saved',jsonb_build_object('enabled',enabled,'recipient_changed',prior.recipient is distinct from recipient),auth.uid());
end$$;
create function public.lease_whatsapp_order_alerts() returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 -- Reuse committed order events without adding work/failure paths to customer submission.
 insert into whatsapp_order_deliveries(event_id,shop_id,revision)
 select e.id,e.shop_id,p.revision from order_alert_events e join whatsapp_order_preferences p on p.shop_id=e.shop_id where p.enabled and p.consented_at is not null and e.created_at>=p.consented_at and e.created_at>now()-interval '1 day' and case when e.kind='catalogue' then p.catalogue else p.preorder end on conflict do nothing;
 -- An abandoned send may already have reached Meta. Never blindly retry an ambiguous send.
 update whatsapp_order_deliveries set state='unknown',last_error='Delivery outcome unknown; automatic retry suppressed',updated_at=now() where state='sending' and lease_until<now();
 with eligible as(select d.event_id from whatsapp_order_deliveries d join whatsapp_order_preferences p on p.shop_id=d.shop_id and p.revision=d.revision join order_alert_events e on e.id=d.event_id and e.shop_id=d.shop_id
 join staff_profiles sp on sp.user_id=p.consent_by and sp.shop_id=p.shop_id
 where d.state='pending' and d.attempts<5 and (d.lease_until is null or d.lease_until<now()) and e.created_at>now()-interval '1 day' and p.enabled and p.consented_at is not null and sp.active and not sp.must_change_password and sp.role::text='admin'
 and not exists(select 1 from workspace_recovery w where w.shop_id=d.shop_id and w.pending_at is not null)
 order by e.created_at limit 20 for update of d skip locked), leased as(update whatsapp_order_deliveries d set state='sending',attempts=d.attempts+1,lease_until=now()+interval '5 minutes',updated_at=now() from eligible e where e.event_id=d.event_id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('event_id',d.event_id,'shop_id',d.shop_id,'revision',d.revision,'attempts',d.attempts,'recipient',p.recipient,'language',p.language,'include_summary',p.include_summary,'include_contact',p.include_contact,'kind',e.kind,'record_id',e.record_id,'business',s.name,
 'snapshot',case when e.kind='catalogue' then jsonb_build_object('request_number',c.request_number,'items',(select jsonb_agg(jsonb_build_object('name',i.product_name_snapshot,'qty',i.quantity,'unit_price',i.unit_price_snapshot)) from customer_selection_items i where i.request_id=c.id),'total',c.total_snapshot,'currency',s.currency,'notes',c.customer_note) else r.submission_snapshot end)),'[]') into result
 from leased d join whatsapp_order_preferences p on p.shop_id=d.shop_id join order_alert_events e on e.id=d.event_id join shops s on s.id=d.shop_id left join catalogue_preorder_requests r on r.id=e.record_id and r.shop_id=d.shop_id and e.kind<>'catalogue' left join customer_selection_requests c on c.id=e.record_id and c.shop_id=d.shop_id and e.kind='catalogue';
 return result;
end$$;
revoke all on function restore_archived_customer(uuid),get_customer_history_rc19(uuid),get_whatsapp_order_preferences(),save_whatsapp_order_preferences(jsonb,boolean),lease_whatsapp_order_alerts() from public,anon,authenticated;
grant execute on function restore_archived_customer(uuid),get_customer_history_rc19(uuid),get_whatsapp_order_preferences(),save_whatsapp_order_preferences(jsonb,boolean) to authenticated;
grant execute on function lease_whatsapp_order_alerts() to service_role;
grant select on whatsapp_order_preferences to service_role;
grant select,update on whatsapp_order_deliveries to service_role;
commit;
