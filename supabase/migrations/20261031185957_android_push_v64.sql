-- Android transport on the existing device/event/delivery outbox. No historical backfill.
begin;
alter table public.order_push_devices add column transport text not null default 'web' check(transport in('web','android'));
alter table public.order_push_devices add column installation_id uuid;
alter table public.order_push_devices add column session_id uuid;
alter table public.order_push_devices add column revoked_at timestamptz;
create unique index android_installation on public.order_push_devices(installation_id) where transport='android';
alter table public.order_push_deliveries add column android_lease uuid;
alter table public.order_push_deliveries add column next_attempt_at timestamptz not null default now();
create table public.android_push_settings(shop_id uuid primary key references public.shops(id) on delete cascade,enabled boolean not null default false,new_preorder boolean not null default true,revision bigint not null default 1);
create table public.android_push_attempts(id uuid primary key default gen_random_uuid(),event_id uuid,device_id uuid,shop_id uuid not null,lease uuid,attempt int not null default 1,state text not null,created_at timestamptz not null default now(),finished_at timestamptz,provider_id text);
alter table public.android_push_settings enable row level security;
alter table public.android_push_attempts enable row level security;
revoke all on public.android_push_settings,public.android_push_attempts from public,anon,authenticated;
-- Browser push workers must never consume native device jobs.
do $$declare d text;begin d:=pg_get_functiondef('public.lease_order_push()'::regprocedure);if position('where (q.state' in d)=0 then raise exception 'Unexpected web push lease definition';end if;execute replace(d,'where (q.state','where d.transport=''web'' and (q.state');end$$;
create function public.register_android_device(p_installation uuid,p_token text,p_language text,p_label text) returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v uuid;sid uuid:=(auth.jwt()->>'session_id')::uuid;
begin
 if auth.uid() is null or not public.can_handle_order_requests() or sid is null or not exists(select 1 from auth.sessions where id=sid and user_id=auth.uid() and (not_after is null or not_after>now())) then raise exception 'Order access required';end if;
 if p_installation is null or p_token is null or p_language is null or length(p_token) not between 30 and 4096 or p_token ~ '[[:space:]]' or p_language not in('en','es','zh-TW','zh-CN') then raise exception 'Invalid device';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_installation::text,0));
 if exists(select 1 from public.order_push_devices where installation_id=p_installation and user_id<>auth.uid() and revoked_at is null) then raise exception 'Remove previous device binding first';end if;
 if (select count(*) from public.order_push_devices where user_id=auth.uid() and transport='android' and installation_id<>p_installation and revoked_at is null)>=20 then raise exception 'Device limit reached';end if;
 select id into v from public.order_push_devices where installation_id=p_installation;
 if v is not null then
 if exists(select 1 from public.order_push_devices where id=v and (subscription->>'token' is distinct from p_token or shop_id is distinct from public.current_shop_id() or user_id is distinct from auth.uid())) then
 update public.order_push_deliveries set state='failed',last_error='Device registration replaced' where device_id=v and state in('pending','sending');end if;
 update public.order_push_devices set shop_id=public.current_shop_id(),user_id=auth.uid(),session_id=sid,subscription=jsonb_build_object('token',p_token),preferences=jsonb_build_object('language',p_language,'device_label',left(p_label,80),'push',true,'preorder',true,'catalogue',false),revoked_at=null,updated_at=now() where id=v;
 else insert into public.order_push_devices(shop_id,user_id,endpoint,subscription,preferences,transport,installation_id,session_id) values(public.current_shop_id(),auth.uid(),'android:'||p_installation,jsonb_build_object('token',p_token),jsonb_build_object('language',p_language,'device_label',left(p_label,80),'push',true,'preorder',true,'catalogue',false),'android',p_installation,sid) returning id into v;end if;
 return v;
end$$;
create function public.revoke_android_device(p_installation uuid) returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$begin
 update public.order_push_devices set revoked_at=now(),subscription='{}',preferences=preferences||'{"push":false}'::jsonb where installation_id=p_installation and user_id=auth.uid() and transport='android';
end$$;
create function public.get_android_push_settings() returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$begin
 if not public.can_handle_order_requests() then raise exception 'Order access required';end if;
 return jsonb_build_object('settings',coalesce((select to_jsonb(s) from public.android_push_settings s where shop_id=public.current_shop_id()),jsonb_build_object('enabled',false,'new_preorder',true,'revision',0)),'devices',coalesce((select jsonb_agg(jsonb_build_object('installation_id',installation_id,'label',preferences->>'device_label','updated_at',updated_at,'revoked',revoked_at is not null)) from public.order_push_devices where user_id=auth.uid() and shop_id=public.current_shop_id() and transport='android'),'[]'::jsonb));
end$$;
create function public.save_android_push_settings(p_revision bigint,p_enabled boolean,p_new_preorder boolean) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$begin
 if public.current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 if p_enabled is null or p_new_preorder is null then raise exception 'Invalid settings';end if;
 insert into public.android_push_settings(shop_id) values(public.current_shop_id()) on conflict do nothing;
 update public.android_push_settings set enabled=p_enabled,new_preorder=p_new_preorder,revision=revision+1 where shop_id=public.current_shop_id() and (revision=p_revision or p_revision=0 and revision=1);
 if not found then raise exception 'Settings changed; refresh';end if;
 if not p_enabled or not p_new_preorder then update public.order_push_deliveries q set state='failed',last_error='Business push disabled' from public.order_push_devices d where d.id=q.device_id and d.shop_id=public.current_shop_id() and d.transport='android' and q.state in('pending','sending');end if;
 return public.get_android_push_settings();
end$$;
-- A disabled business must not acquire a delayed notification when enabled later.
create function public.guard_android_push_job() returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$begin
 if exists(select 1 from public.order_push_devices where id=new.device_id and transport='android') and not exists(select 1 from public.order_push_devices d join public.android_push_settings s on s.shop_id=d.shop_id join public.order_alert_events e on e.id=new.event_id where d.id=new.device_id and d.revoked_at is null and s.enabled and s.new_preorder and e.shop_id=d.shop_id and e.kind in('preorder','custom_cake')) then return null;end if;return new;
end$$;
create trigger android_push_job_guard before insert on public.order_push_deliveries for each row execute function public.guard_android_push_job();
create function public.claim_android_push() returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare q public.order_push_deliveries%rowtype;d public.order_push_devices%rowtype;e public.order_alert_events%rowtype;token uuid:=gen_random_uuid();
begin
 select j.* into q from public.order_push_deliveries j join public.order_push_devices x on x.id=j.device_id join public.order_alert_events a on a.id=j.event_id join public.android_push_settings s on s.shop_id=x.shop_id join public.staff_profiles u on u.user_id=x.user_id and u.shop_id=x.shop_id join auth.sessions sess on sess.id=x.session_id and sess.user_id=x.user_id
 where (sess.not_after is null or sess.not_after>now()) and coalesce((x.preferences->>'push')::boolean,false) and coalesce((x.preferences->>'preorder')::boolean,false) and x.transport='android' and x.revoked_at is null and s.enabled and s.new_preorder and a.shop_id=x.shop_id and a.kind in('preorder','custom_cake') and a.created_at>now()-interval '1 day' and x.updated_at>now()-interval '30 days' and u.active and not u.must_change_password and (u.role='admin' or u.workspace_role in('manager','cashier')) and not exists(select 1 from public.workspace_recovery w where w.shop_id=x.shop_id and w.pending_at is not null)
 and j.attempts<5 and j.next_attempt_at<=now() and (j.state='pending' or j.state='sending' and j.lease_until<now()) order by a.created_at for update of j skip locked limit 1;
 if not found then return null;end if;
 select * into d from public.order_push_devices where id=q.device_id;select * into e from public.order_alert_events where id=q.event_id;
 update public.order_push_deliveries set state='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes',android_lease=token where event_id=q.event_id and device_id=q.device_id;
 insert into public.android_push_attempts(event_id,device_id,shop_id,lease,attempt,state) values(q.event_id,q.device_id,d.shop_id,token,q.attempts+1,'sending');
 return jsonb_build_object('event_id',e.id,'record_id',e.record_id,'device_id',d.id,'user_id',d.user_id,'shop_id',d.shop_id,'token',d.subscription->>'token','language',d.preferences->>'language','lease',token);
end$$;
create function public.finish_android_push(p_event uuid,p_device uuid,p_lease uuid,p_state text,p_provider text default null) returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$declare n int;begin
 if p_state not in('sent','retry','invalid','failed') then raise exception 'Invalid outcome';end if;
 update public.order_push_deliveries set state=case when p_state='retry' and attempts<5 then 'pending' when p_state='sent' then 'sent' else 'failed' end,lease_until=null,next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,attempts)::int)),last_error=case when p_state='sent' then null else p_state end where event_id=p_event and device_id=p_device and android_lease=p_lease and state='sending' and lease_until>now();get diagnostics n=row_count;if n=0 then return false;end if;
 update public.android_push_attempts set state=p_state,finished_at=now(),provider_id=left(p_provider,200) where lease=p_lease and device_id=p_device and event_id=p_event;
 if p_state='invalid' then update public.order_push_devices set revoked_at=now(),subscription='{}',preferences=preferences||'{"push":false}'::jsonb where id=p_device;end if;
 return true;
end$$;
create function public.prepare_android_test(p_installation uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$declare d public.order_push_devices%rowtype;t uuid;begin
 if public.current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 select * into d from public.order_push_devices where installation_id=p_installation and user_id=auth.uid() and shop_id=public.current_shop_id() and transport='android' and revoked_at is null for update;
 if not found or not exists(select 1 from auth.sessions where id=d.session_id and user_id=auth.uid() and (not_after is null or not_after>now())) then raise exception 'Registered device required';end if;
 if exists(select 1 from public.android_push_attempts where device_id=d.id and event_id is null and created_at>now()-interval '2 minutes') then raise exception 'Wait before another test';end if;
 insert into public.android_push_attempts(device_id,shop_id,state) values(d.id,d.shop_id,'test_requested') returning id into t;
 return jsonb_build_object('event_id',t,'record_id',t,'user_id',d.user_id,'device_id',d.id,'language',d.preferences->>'language','test','true');
end$$;
-- Test preparation returns metadata only; the authenticated Edge retrieves the token after authorization.
revoke all on function public.register_android_device(uuid,text,text,text),public.revoke_android_device(uuid),public.get_android_push_settings(),public.save_android_push_settings(bigint,boolean,boolean),public.guard_android_push_job(),public.claim_android_push(),public.finish_android_push(uuid,uuid,uuid,text,text),public.prepare_android_test(uuid) from public,anon,authenticated;
grant execute on function public.register_android_device(uuid,text,text,text),public.revoke_android_device(uuid),public.get_android_push_settings(),public.save_android_push_settings(bigint,boolean,boolean) to authenticated;
grant execute on function public.claim_android_push(),public.finish_android_push(uuid,uuid,uuid,text,text),public.prepare_android_test(uuid) to service_role;

grant execute on function public.prepare_android_test(uuid) to authenticated;
grant select,update on public.android_push_attempts to service_role;
commit;
