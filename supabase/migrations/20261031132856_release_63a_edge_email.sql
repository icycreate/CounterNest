-- Release 6.3A only. Existing production email schema is adopted, not recreated.
begin;
DO $bootstrap$ BEGIN IF to_regclass('public.preorder_email_settings') IS NULL THEN EXECUTE $schema$-- RC32: email channel on the existing trusted order event; no historical backfill.

create table public.preorder_email_settings(
 shop_id uuid primary key references shops(id) on delete cascade,
 recipient text not null check(length(recipient)<=254 and recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 app_origin text not null check(app_origin ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$'),
 enabled boolean not null default false,new_preorder boolean not null default true,
 revision bigint not null default 1,updated_at timestamptz not null default now()
);
create table public.preorder_email_jobs(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id) on delete cascade,
 event_id uuid references order_alert_events(id) on delete cascade,order_id uuid references catalogue_preorder_requests(id) on delete cascade,
 kind text not null check(kind in('new_preorder','test')),test_key uuid,
 recipient text not null,settings_revision bigint not null,
 state text not null default 'pending' check(state in('pending','processing','retry','submitted','failed','unknown','cancelled')),
 attempts int not null default 0,lease_token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),first_attempt_at timestamptz,
 provider text not null default 'unassigned' check(provider in('unassigned','mock','resend')),provider_payload jsonb,provider_id text,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),submitted_at timestamptz,
 unique(shop_id,event_id,kind,recipient),unique(shop_id,test_key),
 check((kind='new_preorder' and event_id is not null and order_id is not null and test_key is null) or (kind='test' and event_id is null and order_id is null and test_key is not null))
);
create table public.preorder_email_attempts(
 job_id uuid not null references preorder_email_jobs(id) on delete cascade,attempt int not null,lease_token uuid not null,
 started_at timestamptz not null default now(),finished_at timestamptz,outcome text not null default 'processing',error_code text,provider_id text,
 primary key(job_id,attempt)
);
create index preorder_email_jobs_shop_time on preorder_email_jobs(shop_id,created_at desc);
create index preorder_email_jobs_order on preorder_email_jobs(order_id);
create index preorder_email_jobs_event on preorder_email_jobs(event_id);
create index preorder_email_jobs_due on preorder_email_jobs(next_attempt_at,created_at) where state in('pending','retry','processing');
alter table preorder_email_settings enable row level security;
alter table preorder_email_jobs enable row level security;
alter table preorder_email_attempts enable row level security;
revoke all on preorder_email_settings,preorder_email_jobs,preorder_email_attempts from public,anon,authenticated;

-- Trusted operator provisions verified recipient + canonical origin, never the browser.
create function public.provision_preorder_email(p_shop uuid,p_recipient text,p_origin text) returns void language plpgsql security definer set search_path=public as $$
begin
 insert into preorder_email_settings(shop_id,recipient,app_origin) values(p_shop,lower(trim(p_recipient)),p_origin)
 on conflict(shop_id) do update set recipient=excluded.recipient,app_origin=excluded.app_origin,enabled=false,revision=preorder_email_settings.revision+1,updated_at=now();
end$$;
create function public.get_preorder_email_settings() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s preorder_email_settings%rowtype; result jsonb;
begin
 if current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 select * into s from preorder_email_settings where shop_id=current_shop_id();
 result:=case when found then jsonb_build_object('configured',true,'recipient',s.recipient,'enabled',s.enabled,'new_preorder',s.new_preorder,'revision',s.revision) else jsonb_build_object('configured',false,'recipient','','enabled',false,'new_preorder',true,'revision',0) end;
 return result||jsonb_build_object('last_test',(select jsonb_build_object('state',state,'created_at',created_at,'submitted_at',submitted_at,'last_error',last_error) from preorder_email_jobs where shop_id=current_shop_id() and kind='test' order by created_at desc limit 1),
 'recent',coalesce((select jsonb_agg(to_jsonb(j)) from(select id,kind,state,provider,attempts,created_at,submitted_at,last_error from preorder_email_jobs where shop_id=current_shop_id() order by created_at desc limit 10)j),'[]'));
end$$;
create function public.save_preorder_email_settings(p_revision bigint,p_enabled boolean,p_new_preorder boolean) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 if p_enabled is null or p_new_preorder is null then raise exception 'Invalid email settings';end if;
 update preorder_email_settings set enabled=p_enabled,new_preorder=p_new_preorder,revision=revision+case when enabled is distinct from p_enabled or new_preorder is distinct from p_new_preorder then 1 else 0 end,updated_at=now() where shop_id=current_shop_id() and revision=p_revision;
 if not found then raise exception 'Email settings changed or require configuration';end if;
 return get_preorder_email_settings();
end$$;
create function public.request_preorder_test_email(p_key uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare s preorder_email_settings%rowtype; job uuid;
begin
 if current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 if p_key is null then raise exception 'Test request key required';end if;
 select * into s from preorder_email_settings where shop_id=current_shop_id() for update;
 if not found then raise exception 'Email configuration required';end if;
 select id into job from preorder_email_jobs where shop_id=s.shop_id and test_key=p_key;
 if found then return job;end if;
 if exists(select 1 from preorder_email_jobs where shop_id=s.shop_id and kind='test' and created_at>now()-interval '2 minutes') or (select count(*) from preorder_email_jobs where shop_id=s.shop_id and kind='test' and created_at>now()-interval '1 day')>=5 then raise exception 'Email test limit reached. Try again later.';end if;
 insert into preorder_email_jobs(shop_id,kind,test_key,recipient,settings_revision) values(s.shop_id,'test',p_key,s.recipient,s.revision) returning id into job;
 return job;
end$$;
create function public.queue_preorder_email() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.kind not in('preorder','custom_cake') then return new;end if;
 insert into preorder_email_jobs(shop_id,event_id,order_id,kind,recipient,settings_revision)
 select new.shop_id,new.id,r.id,'new_preorder',s.recipient,s.revision from preorder_email_settings s join catalogue_preorder_requests r on r.id=new.record_id and r.shop_id=s.shop_id
 where s.shop_id=new.shop_id and s.enabled and s.new_preorder
 on conflict do nothing;
 return new;
end$$;
create trigger preorder_email_from_existing_event after insert on order_alert_events for each row execute function queue_preorder_email();

create function public.claim_preorder_email(p_job uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare j preorder_email_jobs%rowtype;s preorder_email_settings%rowtype;r catalogue_preorder_requests%rowtype;b shops%rowtype;
begin
 -- Resend's idempotency retention is 24h; never blindly resend beyond 23h.
 update preorder_email_jobs set state='unknown',last_error='Reconciliation required',updated_at=now() where state in('retry','processing') and first_attempt_at<now()-interval '23 hours';
 update preorder_email_attempts a set outcome='unknown',finished_at=now(),error_code='Reconciliation required' from preorder_email_jobs expired_job where expired_job.id=a.job_id and expired_job.state='unknown' and a.outcome='processing';
 select * into j from preorder_email_jobs where (p_job is null or id=p_job) and
 ((state in('pending','retry') and next_attempt_at<=now()) or (state='processing' and lease_until<now())) order by created_at,id for update skip locked limit 1;
 if not found then return null;end if;
 select * into s from preorder_email_settings where shop_id=j.shop_id;
 if not found or s.revision<>j.settings_revision or s.recipient<>j.recipient or (j.kind='new_preorder' and (not s.enabled or not s.new_preorder)) then
 update preorder_email_jobs set state='cancelled',updated_at=now(),last_error='Configuration changed' where id=j.id;return null;end if;
 if exists(select 1 from workspace_recovery where shop_id=j.shop_id and pending_at is not null) then
 update preorder_email_jobs set state='cancelled',updated_at=now(),last_error='Workspace unavailable' where id=j.id;return null;end if;
 if j.attempts>=5 then update preorder_email_jobs set state='unknown',last_error='Reconciliation required',updated_at=now() where id=j.id;return null;end if;
 if j.kind='new_preorder' then
 select r0.* into r from catalogue_preorder_requests r0 join order_alert_events e on e.id=j.event_id and e.record_id=r0.id and e.shop_id=r0.shop_id where r0.id=j.order_id and r0.shop_id=j.shop_id;
 if not found then update preorder_email_jobs set state='failed',last_error='Order unavailable',updated_at=now() where id=j.id;return null;end if;
 end if;
 select * into b from shops where id=j.shop_id;
 update preorder_email_attempts set outcome='unknown',finished_at=now(),error_code='Lease expired' where job_id=j.id and outcome='processing';
 update preorder_email_jobs set state='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(first_attempt_at,now()),updated_at=now() where id=j.id returning * into j;
 insert into preorder_email_attempts(job_id,attempt,lease_token) values(j.id,j.attempts,j.lease_token);
 return jsonb_build_object('id',j.id,'shop_id',j.shop_id,'kind',j.kind,'recipient',j.recipient,'lease_token',j.lease_token,'attempts',j.attempts,'provider_payload',j.provider_payload,'business',b.name,'timezone',b.timezone,'origin',s.app_origin,'order_id',j.order_id,'number',r.request_number,'status',r.status,'snapshot',r.submission_snapshot);
end$$;
create function public.prepare_preorder_email(p_job uuid,p_token uuid,p_payload jsonb,p_delivery_provider text default 'resend') returns jsonb language plpgsql security definer set search_path=public as $$
declare j preorder_email_jobs%rowtype;s preorder_email_settings%rowtype;
begin
 select * into j from preorder_email_jobs where id=p_job and lease_token=p_token and state='processing' and lease_until>now() for update;
 if not found then raise exception 'Email lease unavailable';end if;
 select * into s from preorder_email_settings where shop_id=j.shop_id;
 if not found or s.revision<>j.settings_revision or s.recipient<>j.recipient or (j.kind='new_preorder' and (not s.enabled or not s.new_preorder)) then raise exception 'Email configuration changed';end if;
 if p_delivery_provider is null or p_delivery_provider not in('mock','resend') then raise exception 'Invalid email provider';end if;
 if j.provider_payload is not null then
 if j.provider<>p_delivery_provider then raise exception 'Email provider changed';end if;return j.provider_payload;end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->'to' is distinct from jsonb_build_array(j.recipient) or length(p_payload::text)>100000 or coalesce(p_payload->>'from','')='' then raise exception 'Invalid email payload';end if;
 update preorder_email_jobs set provider_payload=p_payload,provider=p_delivery_provider where id=j.id;
 return p_payload;
end$$;
create function public.finish_preorder_email(p_job uuid,p_token uuid,p_state text,p_provider text default null,p_error text default null) returns boolean language plpgsql security definer set search_path=public as $$
declare j preorder_email_jobs%rowtype;target text;
begin
 if p_state is null or p_state not in('submitted','retry','failed','unknown','cancelled') or (p_state='submitted' and nullif(p_provider,'') is null) then raise exception 'Invalid email outcome';end if;
 select * into j from preorder_email_jobs where id=p_job and lease_token=p_token and state='processing' for update;
 if not found then return false;end if;
 target:=case when p_state='retry' and (j.attempts>=5 or j.first_attempt_at<now()-interval '23 hours') then 'unknown' else p_state end;
 update preorder_email_jobs set state=target,provider_id=left(p_provider,200),last_error=left(p_error,120),submitted_at=case when target='submitted' then now() else null end,lease_until=null,next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,j.attempts)::int)),updated_at=now() where id=j.id;
 update preorder_email_attempts set outcome=target,provider_id=left(p_provider,200),error_code=left(p_error,120),finished_at=now() where job_id=j.id and lease_token=p_token;
 return true;
end$$;
revoke all on function provision_preorder_email(uuid,text,text),get_preorder_email_settings(),save_preorder_email_settings(bigint,boolean,boolean),request_preorder_test_email(uuid),queue_preorder_email(),claim_preorder_email(uuid),prepare_preorder_email(uuid,uuid,jsonb,text),finish_preorder_email(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function get_preorder_email_settings(),save_preorder_email_settings(bigint,boolean,boolean),request_preorder_test_email(uuid) to authenticated;
grant execute on function provision_preorder_email(uuid,text,text),claim_preorder_email(uuid),prepare_preorder_email(uuid,uuid,jsonb,text),finish_preorder_email(uuid,uuid,text,text,text) to service_role;
-- Delivery state and recipient provisioning are intentionally excluded from workspace restore.
-- Restoring an old backup must never replay emails or copy another company's recipient.
$schema$; END IF; END $bootstrap$;
CREATE OR REPLACE FUNCTION public.claim_preorder_email(p_job uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j preorder_email_jobs%rowtype;s preorder_email_settings%rowtype;r catalogue_preorder_requests%rowtype;b shops%rowtype;
begin
 -- Resend's idempotency retention is 24h; never blindly resend beyond 23h.
 update preorder_email_jobs set state='unknown',last_error='Reconciliation required',updated_at=now() where state in('retry','processing') and first_attempt_at<now()-interval '23 hours';
 update preorder_email_attempts a set outcome='unknown',finished_at=now(),error_code='Reconciliation required' from preorder_email_jobs expired_job where expired_job.id=a.job_id and expired_job.state='unknown' and a.outcome='processing';
 select * into j from preorder_email_jobs where (p_job is null or id=p_job) and
 ((state in('pending','retry') and next_attempt_at<=now()) or (state='processing' and lease_until<now())) order by created_at,id for update skip locked limit 1;
 if not found then return null;end if;
 select * into s from preorder_email_settings where shop_id=j.shop_id;
 if not found or j.shop_id<>'4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid or not s.enabled or s.revision<>j.settings_revision or s.recipient<>j.recipient or (j.kind='new_preorder' and (not s.enabled or not s.new_preorder)) then
 update preorder_email_jobs set state='cancelled',updated_at=now(),last_error='Configuration changed' where id=j.id;return null;end if;
 if exists(select 1 from workspace_recovery where shop_id=j.shop_id and pending_at is not null) then
 update preorder_email_jobs set state='cancelled',updated_at=now(),last_error='Workspace unavailable' where id=j.id;return null;end if;
 if j.attempts>=5 then update preorder_email_jobs set state='unknown',last_error='Reconciliation required',updated_at=now() where id=j.id;return null;end if;
 if j.kind='new_preorder' then
 select r0.* into r from catalogue_preorder_requests r0 join order_alert_events e on e.id=j.event_id and e.record_id=r0.id and e.shop_id=r0.shop_id where r0.id=j.order_id and r0.shop_id=j.shop_id;
 if not found then update preorder_email_jobs set state='failed',last_error='Order unavailable',updated_at=now() where id=j.id;return null;end if;
 end if;
 select * into b from shops where id=j.shop_id;
 update preorder_email_attempts set outcome='unknown',finished_at=now(),error_code='Lease expired' where job_id=j.id and outcome='processing';
 update preorder_email_jobs set state='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(first_attempt_at,now()),updated_at=now() where id=j.id returning * into j;
 insert into preorder_email_attempts(job_id,attempt,lease_token) values(j.id,j.attempts,j.lease_token);
 return jsonb_build_object('id',j.id,'shop_id',j.shop_id,'kind',j.kind,'recipient',j.recipient,'lease_token',j.lease_token,'attempts',j.attempts,'provider_payload',j.provider_payload,'business',b.name,'timezone',b.timezone,'origin',s.app_origin,'order_id',j.order_id,'number',r.request_number,'status',r.status,'snapshot',r.submission_snapshot);
end$function$
;
CREATE OR REPLACE FUNCTION public.prepare_preorder_email(p_job uuid, p_token uuid, p_payload jsonb, p_delivery_provider text DEFAULT 'resend'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j preorder_email_jobs%rowtype;s preorder_email_settings%rowtype;
begin
 select * into j from preorder_email_jobs where id=p_job and lease_token=p_token and state='processing' and lease_until>now() for update;
 if not found then raise exception 'Email lease unavailable';end if;
 select * into s from preorder_email_settings where shop_id=j.shop_id;
 if not found or j.shop_id<>'4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid or not s.enabled or s.revision<>j.settings_revision or s.recipient<>j.recipient or (j.kind='new_preorder' and (not s.enabled or not s.new_preorder)) then raise exception 'Email configuration changed';end if;
 if p_delivery_provider is null or p_delivery_provider not in('mock','resend') then raise exception 'Invalid email provider';end if;
 if j.provider_payload is not null then
 if j.provider<>p_delivery_provider then raise exception 'Email provider changed';end if;return j.provider_payload;end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->'to' is distinct from jsonb_build_array(j.recipient) or length(p_payload::text)>100000 or coalesce(p_payload->>'from','')='' then raise exception 'Invalid email payload';end if;
 update preorder_email_jobs set provider_payload=p_payload,provider=p_delivery_provider where id=j.id;
 return p_payload;
end$function$
;
CREATE OR REPLACE FUNCTION public.save_preorder_email_settings(p_revision bigint, p_enabled boolean, p_new_preorder boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 if current_shop_id()<>'4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid then raise exception 'Email configuration required';end if;
 if p_enabled is null or p_new_preorder is null then raise exception 'Invalid email settings';end if;
 update preorder_email_settings set enabled=p_enabled,new_preorder=p_new_preorder,revision=revision+1,updated_at=now() where shop_id=current_shop_id() and revision=p_revision;
 if not found then raise exception 'Email settings changed or require configuration';end if;
 update preorder_email_jobs set state='cancelled',updated_at=now(),last_error='Configuration changed' where shop_id=current_shop_id() and state in('pending','retry') and settings_revision<>(select revision from preorder_email_settings where shop_id=current_shop_id());
 return get_preorder_email_settings();
end$function$
;
CREATE OR REPLACE FUNCTION public.request_preorder_test_email(p_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s preorder_email_settings%rowtype; job uuid;
begin
 if current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 if p_key is null then raise exception 'Test request key required';end if;
 select * into s from preorder_email_settings where shop_id=current_shop_id() for update;
 if not found or s.shop_id<>'4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid or not s.enabled then raise exception 'Email configuration required';end if;
 select id into job from preorder_email_jobs where shop_id=s.shop_id and test_key=p_key;
 if found then return job;end if;
 if exists(select 1 from preorder_email_jobs where shop_id=s.shop_id and kind='test' and created_at>now()-interval '2 minutes') or (select count(*) from preorder_email_jobs where shop_id=s.shop_id and kind='test' and created_at>now()-interval '1 day')>=5 then raise exception 'Email test limit reached. Try again later.';end if;
 insert into preorder_email_jobs(shop_id,kind,test_key,recipient,settings_revision) values(s.shop_id,'test',p_key,s.recipient,s.revision) returning id into job;
 return job;
end$function$
;
CREATE OR REPLACE FUNCTION public.get_preorder_email_settings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s preorder_email_settings%rowtype; result jsonb;
begin
 if current_workspace_role() is distinct from 'admin' then raise exception 'Administrator access required';end if;
 select * into s from preorder_email_settings where shop_id=current_shop_id() and shop_id='4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid;
 result:=case when found then jsonb_build_object('configured',true,'recipient',s.recipient,'enabled',s.enabled,'new_preorder',s.new_preorder,'revision',s.revision) else jsonb_build_object('configured',false,'recipient','','enabled',false,'new_preorder',true,'revision',0) end;
 return result||jsonb_build_object('last_test',(select jsonb_build_object('state',state,'created_at',created_at,'submitted_at',submitted_at,'last_error',last_error) from preorder_email_jobs where shop_id=current_shop_id() and kind='test' order by created_at desc limit 1),
 'recent',coalesce((select jsonb_agg(to_jsonb(j)) from(select id,kind,state,provider,attempts,created_at,submitted_at,last_error from preorder_email_jobs where shop_id=current_shop_id() order by created_at desc limit 10)j),'[]'));
end$function$
;
CREATE OR REPLACE FUNCTION public.queue_preorder_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if new.kind not in('preorder','custom_cake') then return new;end if;
 insert into preorder_email_jobs(shop_id,event_id,order_id,kind,recipient,settings_revision)
 select new.shop_id,new.id,r.id,'new_preorder',s.recipient,s.revision from preorder_email_settings s join catalogue_preorder_requests r on r.id=new.record_id and r.shop_id=s.shop_id
 where s.shop_id=new.shop_id and s.shop_id='4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid and s.enabled and s.new_preorder
 on conflict do nothing;
 return new;
end$function$
;
CREATE OR REPLACE FUNCTION public.provision_preorder_email(p_shop uuid,p_recipient text,p_origin text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_shop<>'4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid or not exists(select 1 from preorder_email_settings where shop_id=p_shop and recipient=lower(trim(p_recipient)) and app_origin=p_origin) then raise exception 'Release 6.3A recipient is operator-fixed';end if;
 -- Deliberately cannot replace the approved binding via a provisioning RPC.
end$$;
CREATE OR REPLACE FUNCTION public.submit_preorder_edge(p_token text,p_key uuid,p_items jsonb,p_customer jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;cfg customer_display_configs%rowtype;request catalogue_preorder_requests%rowtype;job uuid;
begin
 select * into cfg from customer_display_configs where access_token=p_token and enabled for update;
 if not found or not cfg.preorder_enabled then raise exception 'Pre-order requests unavailable';end if;
 -- Existing canonical RPC retains prices, token validation, rate limits and replay fingerprints.
 result:=public.submit_catalogue_preorder(p_token,p_key,p_items,p_customer);
 select * into request from catalogue_preorder_requests where shop_id=cfg.shop_id and client_key=p_key;
 select id into job from preorder_email_jobs where shop_id=cfg.shop_id and order_id=request.id and kind='new_preorder' and state in('pending','retry') order by created_at limit 1;
 return jsonb_build_object('confirmation',result,'job_id',job);
end$$;
revoke all on function public.submit_preorder_edge(text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_preorder_edge(text,uuid,jsonb,jsonb) to service_role;
-- Close only the customer pre-order write entry; tracking/read/response RPCs are preserved.
revoke all on function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) to service_role;
-- Do not activate or replay mail as a side effect of migration.
update public.preorder_email_settings set enabled=false,revision=revision+1,updated_at=now();
update public.preorder_email_jobs set state='cancelled',last_error='Release cutover; no historical replay',updated_at=now() where state in('pending','retry');
CREATE OR REPLACE FUNCTION public.get_preorder_email_recovery_job(p_job uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare job uuid;
begin
 if current_workspace_role() is distinct from 'admin' or current_shop_id()<>'4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7'::uuid then raise exception 'Administrator access required';end if;
 select id into job from preorder_email_jobs where shop_id=current_shop_id() and (p_job is null or id=p_job) and ((state in('pending','retry') and next_attempt_at<=now()) or (state='processing' and lease_until<now())) order by created_at limit 1;
 return job;
end$$;
revoke all on function public.get_preorder_email_recovery_job(uuid) from public,anon;
grant execute on function public.get_preorder_email_recovery_job(uuid) to authenticated;
commit;
