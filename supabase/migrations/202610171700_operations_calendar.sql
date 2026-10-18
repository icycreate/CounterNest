begin;
-- Scheduling belongs to the original batch. Existing date and assignee fields remain authoritative.
alter table public.production_batches add column scheduled_start_at timestamptz,add column expected_end_at timestamptz;
alter table public.production_batches add constraint production_calendar_interval check(expected_end_at is null or scheduled_start_at is not null and expected_end_at>scheduled_start_at);
create index production_calendar_start on public.production_batches(shop_id,scheduled_start_at) where scheduled_start_at is not null;
create index production_calendar_end on public.production_batches(shop_id,expected_end_at) where expected_end_at is not null;
create index scheduled_order_calendar_pickup on public.scheduled_customer_orders(shop_id,pickup_at);
create index scheduled_order_calendar_event on public.scheduled_customer_orders(shop_id,(coalesce(pickup_at,case when kind='cake' then production_deadline end)));
create index scheduled_order_calendar_deadline on public.scheduled_customer_orders(shop_id,production_deadline);
create index ingredient_po_calendar_date on public.ingredient_purchase_orders(shop_id,expected_date);
create index legacy_po_calendar_date on public.purchase_orders(shop_id,expected_date);

create function public.calendar_can_read(p_source text) returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(select 1 from staff_profiles where user_id=auth.uid() and shop_id=current_shop_id() and active and not must_change_password)
 and not exists(select 1 from workspace_recovery where shop_id=current_shop_id() and pending_at is not null)
 and case p_source when 'order' then current_workspace_role() in('admin','manager','cashier')
 when 'batch' then current_workspace_role() in('admin','manager','production') and ops_has_permission('operations_view')
 when 'ingredient_po' then current_workspace_role() in('admin','manager','inventory') and ops_has_permission('operations_view')
 when 'legacy_po' then current_workspace_role() in('admin','manager','inventory') and ops_has_permission('operations_view') else false end
$$;
create function public.calendar_zone() returns text language sql stable security definer set search_path=public as $$
 select coalesce((select s.timezone from shops s where s.id=current_shop_id() and exists(select 1 from pg_timezone_names z where z.name=s.timezone)),'UTC')
$$;
create function public.calendar_schedule(p_source text,p_row jsonb) returns jsonb language sql immutable set search_path=public as $$
 select case p_source when 'batch' then jsonb_build_object('scheduled_date',p_row->'scheduled_date','scheduled_start_at',p_row->'scheduled_start_at','expected_end_at',p_row->'expected_end_at','ux_assignee',p_row->'ux_assignee')
 when 'order' then jsonb_build_object('pickup_at',p_row->'pickup_at','production_deadline',p_row->'production_deadline')
 else jsonb_build_object('expected_date',p_row->'expected_date') end
$$;

-- One row per source record. A cake's due date is used only when its pickup is not assigned.
create function public.calendar_rows(p_from date,p_to date) returns table(
 source text,source_id uuid,kind text,title text,reference text,day date,starts_at timestamptz,ends_at timestamptz,
 status text,quantity numeric,assigned_id uuid,assigned_name text,customer text,order_id uuid,deadline timestamptz,flags jsonb
) language sql stable security definer set search_path=public as $$
 select 'order',o.id,case when o.kind='cake' then 'cake' else 'pickup' end,
 coalesce((select string_agg(coalesce(i->>'name','')||' × '||coalesce(i->>'qty','1'),', ') from jsonb_array_elements(o.items)i),''),
 case when o.kind='cake' then 'CAKE-' else 'ORDER-' end||o.order_number,
 (coalesce(o.pickup_at,case when o.kind='cake' then o.production_deadline end) at time zone calendar_zone())::date,
 coalesce(o.pickup_at,case when o.kind='cake' then o.production_deadline end),null,o.status,
 (select sum(coalesce((i->>'qty')::numeric,1)) from jsonb_array_elements(o.items)i),null,null,c.name,o.id,o.production_deadline,
 jsonb_build_object('pickup_before_completion',calendar_can_read('batch') and exists(select 1 from production_batches b where b.shop_id=o.shop_id and b.scheduled_order_id=o.id and b.status='scheduled' and b.expected_end_at>o.pickup_at),'deadline_overdue',o.kind='cake' and o.status in('confirmed','preparing') and o.production_deadline<now())
 from scheduled_customer_orders o join customers c on c.id=o.customer_id and c.shop_id=o.shop_id
 where o.shop_id=current_shop_id() and calendar_can_read('order') and o.status<>'cancelled'
 and coalesce(o.pickup_at,case when o.kind='cake' then o.production_deadline end)>=p_from::timestamp at time zone calendar_zone()
 and coalesce(o.pickup_at,case when o.kind='cake' then o.production_deadline end)<(p_to+1)::timestamp at time zone calendar_zone()
 union all
 select 'batch',b.id,'production',b.product_name,'BATCH-'||b.batch_number,b.scheduled_date,b.scheduled_start_at,b.expected_end_at,
 case when b.status='scheduled' then b.ux_stage else b.status end,b.planned_quantity,b.ux_assignee,sp.display_name,null,b.scheduled_order_id,null,
 jsonb_build_object('shortage',b.status='scheduled' and exists(select 1 from production_reservations r join ingredients i on i.id=r.ingredient_id and i.shop_id=r.shop_id where r.shop_id=b.shop_id and r.source_type='batch' and r.source_id=b.id and i.current_quantity<(select sum(x.quantity) from production_reservations x where x.shop_id=r.shop_id and x.ingredient_id=r.ingredient_id)),
 'late_delivery',calendar_can_read('ingredient_po') and b.status='scheduled' and exists(select 1 from production_reservations r join ingredient_purchase_order_items li on li.ingredient_id=r.ingredient_id and li.shop_id=r.shop_id join ingredient_purchase_orders po on po.id=li.order_id and po.shop_id=r.shop_id where r.source_id=b.id and r.source_type='batch' and r.shop_id=b.shop_id and po.status in('ordered','partially_received') and po.expected_date>b.scheduled_date and li.ordered_quantity>li.received_quantity))
 from production_batches b left join staff_profiles sp on sp.user_id=b.ux_assignee and sp.shop_id=b.shop_id
 where b.shop_id=current_shop_id() and calendar_can_read('batch') and b.status<>'cancelled'
 and (b.scheduled_date between p_from and p_to or b.scheduled_start_at<(p_to+1)::timestamp at time zone calendar_zone() and b.expected_end_at>=p_from::timestamp at time zone calendar_zone())
 union all
 select 'ingredient_po',po.id,'delivery',sp.name,'IPO-'||po.order_number,po.expected_date,null,null,po.status,
 (select sum(ordered_quantity-received_quantity) from ingredient_purchase_order_items li where li.order_id=po.id and li.shop_id=po.shop_id),null,null,null,null,null,
 jsonb_build_object('overdue',po.expected_date<(now() at time zone calendar_zone())::date and po.status in('ordered','partially_received'))
 from ingredient_purchase_orders po join suppliers sp on sp.id=po.supplier_id and sp.shop_id=po.shop_id
 where po.shop_id=current_shop_id() and calendar_can_read('ingredient_po') and po.status<>'cancelled' and po.expected_date between p_from and p_to
 union all
 select 'legacy_po',po.id,'delivery',sp.name,'PO-'||po.order_number,po.expected_date,null,null,po.status,
 (select sum(quantity) from purchase_order_items li where li.order_id=po.id and li.shop_id=po.shop_id),null,null,null,null,null,
 jsonb_build_object('overdue',po.expected_date<(now() at time zone calendar_zone())::date and po.status='ordered')
 from purchase_orders po join suppliers sp on sp.id=po.supplier_id and sp.shop_id=po.shop_id
 where po.shop_id=current_shop_id() and calendar_can_read('legacy_po') and po.status<>'cancelled' and po.expected_date between p_from and p_to
$$;

create function public.get_operations_calendar(p_from date,p_to date,p_kind text default 'all',p_status text default '',p_staff uuid default null,p_query text default '',p_offset int default 0,p_limit int default 200) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare s uuid:=current_shop_id(); result jsonb; unscheduled jsonb; staff jsonb; total int; lim int:=least(greatest(coalesce(p_limit,200),1),200);
begin
 if not(calendar_can_read('order') or calendar_can_read('batch') or calendar_can_read('ingredient_po')) then raise exception 'Calendar access required';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>62 or p_offset is null or p_offset<0 or p_offset>10000 or length(coalesce(p_query,''))>100 or p_kind is null or p_kind not in('all','pickup','cake','production','delivery') then raise exception 'Invalid calendar range or filters';end if;
 with filtered as(select * from calendar_rows(p_from,p_to) e where (p_kind='all' or e.kind=p_kind) and(coalesce(p_status,'')='' or e.status=p_status) and(p_staff is null or e.assigned_id=p_staff) and (coalesce(p_query,'')='' or concat_ws(' ',e.title,e.reference,e.customer,e.assigned_name) ilike '%'||p_query||'%')),
 page as(select * from filtered order by day,starts_at nulls first,reference,source_id limit lim offset p_offset)
 select coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('id',x.source||':'||x.source_id) order by x.day,x.starts_at nulls first,x.reference,x.source_id) from page x),'[]'),(select count(*) from filtered) into result,total;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into unscheduled from(select o.id,o.kind,o.order_number,c.name as customer,o.status from scheduled_customer_orders o join customers c on c.id=o.customer_id and c.shop_id=s where o.shop_id=s and calendar_can_read('order') and o.status in('confirmed','preparing','ready') and o.pickup_at is null and (o.kind='preorder' or o.production_deadline is null) order by o.created_at desc limit 25)x;
 select coalesce(jsonb_agg(jsonb_build_object('id',sp.user_id,'name',sp.display_name) order by sp.display_name),'[]') into staff from staff_profiles sp where sp.shop_id=s and sp.active and not sp.must_change_password and calendar_can_read('batch');
 return jsonb_build_object('events',result,'total',total,'offset',p_offset,'has_more',p_offset+lim<total,'unscheduled',unscheduled,'unscheduled_total',(select count(*) from scheduled_customer_orders where shop_id=s and calendar_can_read('order') and status in('confirmed','preparing','ready') and pickup_at is null and(kind='preorder' or production_deadline is null)),
 'staff',staff,'timezone',calendar_zone(),'today',(now() at time zone calendar_zone())::date,'can_schedule',calendar_can_read('batch') and ops_has_permission('production_manage'),'can_create_production',current_workspace_role()='admin','can_create_orders',current_workspace_role()='admin','can_create_purchase',ops_has_permission('purchase_create') and current_workspace_role() in('admin','manager','inventory','production'));
end$$;

create function public.get_calendar_record(p_source text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s uuid:=current_shop_id(); row jsonb; lines jsonb; d date; event jsonb; reschedule boolean:=false;
begin
 if not calendar_can_read(p_source) then raise exception 'Calendar record access required';end if;
 case p_source
 when 'batch' then
 select to_jsonb(b),b.scheduled_date into row,d from production_batches b where b.id=p_id and b.shop_id=s;
 select coalesce(jsonb_agg(jsonb_build_object('name',i.name,'quantity',r.quantity,'unit',i.base_unit,'on_hand',i.current_quantity)),'[]') into lines from production_reservations r join ingredients i on i.id=r.ingredient_id and i.shop_id=s where r.source_type='batch' and r.source_id=p_id and r.shop_id=s;
 reschedule:=ops_has_permission('production_manage') and row->>'status'='scheduled';
 when 'order' then
 select to_jsonb(o),(coalesce(o.pickup_at,o.production_deadline) at time zone calendar_zone())::date into row,d from scheduled_customer_orders o where o.id=p_id and o.shop_id=s;
 select coalesce(jsonb_agg(jsonb_build_object('name',i->>'name','quantity',i->'qty')),'[]') into lines from jsonb_array_elements(coalesce(row->'items','[]'))i;
 reschedule:=current_workspace_role()='admin' and row->>'status' in('confirmed','preparing','ready');
 when 'ingredient_po' then
 select to_jsonb(o),o.expected_date into row,d from ingredient_purchase_orders o where o.id=p_id and o.shop_id=s;
 select coalesce(jsonb_agg(jsonb_build_object('name',ingredient_name,'quantity',ordered_quantity,'received',received_quantity,'unit',base_unit)),'[]') into lines from ingredient_purchase_order_items where order_id=p_id and shop_id=s;
 reschedule:=ops_has_permission('purchase_create') and row->>'status' in('ordered','partially_received');
 when 'legacy_po' then
 select to_jsonb(o),o.expected_date into row,d from purchase_orders o where o.id=p_id and o.shop_id=s;
 select coalesce(jsonb_agg(jsonb_build_object('name',product_name,'quantity',quantity)),'[]') into lines from purchase_order_items where order_id=p_id and shop_id=s;
 reschedule:=ops_has_permission('purchase_create') and row->>'status'='ordered';
 else raise exception 'Invalid calendar source';end case;
 if row is null then raise exception 'Calendar record unavailable';end if;
 select to_jsonb(e)||jsonb_build_object('id',e.source||':'||e.source_id) into event from calendar_rows(coalesce(d,current_date),coalesce(d,current_date)) e where e.source=p_source and e.source_id=p_id;
 if event is null then event:=jsonb_build_object('id',p_source||':'||p_id,'source',p_source,'source_id',p_id,'kind',case when p_source='batch' then 'production' when p_source in('ingredient_po','legacy_po') then 'delivery' when row->>'kind'='cake' then 'cake' else 'pickup' end,'reference',case when p_source='batch' then 'BATCH-'||coalesce(row->>'batch_number','') when p_source='ingredient_po' then 'IPO-'||coalesce(row->>'order_number','') when p_source='legacy_po' then 'PO-'||coalesce(row->>'order_number','') else case when row->>'kind'='cake' then 'CAKE-' else 'ORDER-' end||coalesce(row->>'order_number','') end,'title',coalesce(row->>'product_name',''),'status',row->>'status','customer',(select name from customers where id=(row->>'customer_id')::uuid and shop_id=s),'day',null,'starts_at',null,'flags','{}'::jsonb);end if;
 return jsonb_build_object('event',event,'schedule',calendar_schedule(p_source,row),'lines',coalesce(lines,'[]'),'timezone',calendar_zone(),'can_open_source',case p_source when 'order' then current_workspace_role() in('admin','cashier') when 'batch' then current_workspace_role() in('admin','production') else true end,'can_reschedule',reschedule,'staff',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',display_name) order by display_name),'[]') from staff_profiles where shop_id=s and active and not must_change_password and p_source='batch'));
end$$;

create function public.calendar_audit_schedule() returns trigger language plpgsql security definer set search_path=public as $$
declare source text:=case TG_TABLE_NAME when 'production_batches' then 'batch' when 'scheduled_customer_orders' then 'order' when 'ingredient_purchase_orders' then 'ingredient_po' else 'legacy_po' end; before_value jsonb; after_value jsonb;
begin
 before_value:=calendar_schedule(source,to_jsonb(old));after_value:=calendar_schedule(source,to_jsonb(new));
 if before_value is distinct from after_value then insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(new.shop_id,source,new.id,'schedule_changed',jsonb_build_object('old',before_value,'new',after_value,'reason',nullif(current_setting('counternest.schedule_reason',true),'')),auth.uid());end if;
 return new;
end$$;
create trigger calendar_batch_audit after update of scheduled_date,scheduled_start_at,expected_end_at,ux_assignee on production_batches for each row execute function calendar_audit_schedule();
create trigger calendar_order_audit after update of pickup_at,production_deadline on scheduled_customer_orders for each row execute function calendar_audit_schedule();
create trigger calendar_ingredient_po_audit after update of expected_date on ingredient_purchase_orders for each row execute function calendar_audit_schedule();
create trigger calendar_legacy_po_audit after update of expected_date on purchase_orders for each row execute function calendar_audit_schedule();

create function public.reschedule_operations_calendar(p_source text,p_id uuid,p_expected jsonb,p_values jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path=public as $$
declare row jsonb; s uuid:=current_shop_id(); zone text:=calendar_zone(); start_time timestamptz; end_time timestamptz; pickup timestamptz; due timestamptz; who uuid; target_date date;
begin
 if not calendar_can_read(p_source) then raise exception 'Schedule access required';end if;
 if jsonb_typeof(p_values) is distinct from 'object' or p_expected is null or length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>500 then raise exception 'Schedule values and a reason are required';end if;
 perform set_config('counternest.schedule_reason',trim(p_reason),true);
 case p_source
 when 'batch' then
 if not ops_has_permission('production_manage') then raise exception 'Production scheduling permission required';end if;
 select to_jsonb(b) into row from production_batches b where b.id=p_id and b.shop_id=s and b.status='scheduled' for update;
 target_date:=(p_values->>'scheduled_date')::date;
 start_time:=nullif(p_values->>'start_local','')::timestamp at time zone zone;end_time:=nullif(p_values->>'end_local','')::timestamp at time zone zone;who:=nullif(p_values->>'assigned_id','')::uuid;
 if target_date is null or start_time is not null and (start_time at time zone zone)::date<>target_date or end_time is not null and (start_time is null or end_time<=start_time) then raise exception 'Invalid production schedule';end if;
 if start_time is not null and (start_time at time zone zone) is distinct from (p_values->>'start_local')::timestamp or end_time is not null and(end_time at time zone zone) is distinct from (p_values->>'end_local')::timestamp then raise exception 'Invalid local time in business timezone';end if;
 if who is not null and not exists(select 1 from staff_profiles where shop_id=s and user_id=who and active and not must_change_password) then raise exception 'Invalid assigned staff';end if;
 if row is null or calendar_schedule(p_source,row) is distinct from p_expected then raise exception 'Schedule changed or record unavailable; refresh';end if;
 update production_batches set scheduled_date=target_date,scheduled_start_at=start_time,expected_end_at=end_time,ux_assignee=who where id=p_id and shop_id=s;
 when 'order' then
 if current_workspace_role()<>'admin' then raise exception 'Administrator scheduling access required';end if;
 select to_jsonb(o) into row from scheduled_customer_orders o where o.id=p_id and o.shop_id=s and o.status in('confirmed','preparing','ready') for update;
 pickup:=nullif(p_values->>'pickup_local','')::timestamp at time zone zone;due:=nullif(p_values->>'deadline_local','')::timestamp at time zone zone;
 if pickup is not null and due is not null and due>pickup then raise exception 'Production deadline must not be after pickup';end if;
 if pickup is not null and(pickup at time zone zone) is distinct from (p_values->>'pickup_local')::timestamp or due is not null and(due at time zone zone) is distinct from (p_values->>'deadline_local')::timestamp then raise exception 'Invalid local time in business timezone';end if;
 if row is null or calendar_schedule(p_source,row) is distinct from p_expected then raise exception 'Schedule changed or record unavailable; refresh';end if;
 update scheduled_customer_orders set pickup_at=pickup,production_deadline=due,updated_at=now() where id=p_id and shop_id=s;
 when 'ingredient_po','legacy_po' then
 if not ops_has_permission('purchase_create') then raise exception 'Purchase scheduling permission required';end if;
 target_date:=(p_values->>'expected_date')::date;if target_date is null then raise exception 'Expected date required';end if;
 if p_source='ingredient_po' then select to_jsonb(o) into row from ingredient_purchase_orders o where o.id=p_id and o.shop_id=s and o.status in('ordered','partially_received') for update;
 else select to_jsonb(o) into row from purchase_orders o where o.id=p_id and o.shop_id=s and o.status='ordered' for update;end if;
 if row is null or calendar_schedule(p_source,row) is distinct from p_expected then raise exception 'Schedule changed or record unavailable; refresh';end if;
 if p_source='ingredient_po' then update ingredient_purchase_orders set expected_date=target_date where id=p_id and shop_id=s;else update purchase_orders set expected_date=target_date where id=p_id and shop_id=s;end if;
 else raise exception 'Invalid calendar source';end case;
 perform set_config('counternest.schedule_reason','',true);
 return get_calendar_record(p_source,p_id);
end$$;

create function public.get_calendar_notifications() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(
 select 'calendar:'||e.source||':'||e.source_id||':'||e.day||':'||n.label as id,n.label as title_key,e.reference||' · '||e.title as business_label,n.label||' · '||e.reference as title,case when e.flags->>'overdue'='true' then 'warning' else 'info' end as severity,
 now() as created_at,'calendar' as page,e.source_id as record_id,e.source as calendar_source
 from calendar_rows((now() at time zone calendar_zone())::date-30,(now() at time zone calendar_zone())::date+1)e
 cross join lateral(select case when e.kind='production' and e.status not in('completed','cancelled') and e.starts_at between now() and now()+interval '1 hour' then 'Production starts within an hour'
 when e.kind='pickup' and e.day=(now() at time zone calendar_zone())::date and e.status<>'completed' then 'Pre-order pickup today'
 when e.kind='cake' and e.day=(now() at time zone calendar_zone())::date and e.status<>'completed' then 'Custom cake due today'
 when e.kind='delivery' and e.flags->>'overdue'='true' then 'Supplier delivery overdue' end as label)n
 where n.label is not null order by e.day,e.starts_at nulls first,e.reference limit 30
 )x
$$;
alter function public.ux_workspace() rename to ux_workspace_before_calendar;
revoke all on function public.ux_workspace_before_calendar() from public,anon,authenticated;
create function public.ux_workspace() returns jsonb language plpgsql security definer set search_path=public as $$
declare data jsonb; notices jsonb;
begin
 data:=ux_workspace_before_calendar();
 select coalesce(jsonb_agg(v),'[]') into notices from(select distinct on(v->>'id') v from jsonb_array_elements(coalesce(data->'notifications','[]')||get_calendar_notifications())v order by v->>'id')x;
 return data||jsonb_build_object('notifications',notices);
end$$;
revoke all on function public.calendar_can_read(text),public.calendar_zone(),public.calendar_schedule(text,jsonb),public.calendar_rows(date,date),public.calendar_audit_schedule() from public,anon,authenticated;
revoke all on function public.get_operations_calendar(date,date,text,text,uuid,text,int,int),public.get_calendar_record(text,uuid),public.reschedule_operations_calendar(text,uuid,jsonb,jsonb,text),public.get_calendar_notifications(),public.ux_workspace() from public,anon;
grant execute on function public.get_operations_calendar(date,date,text,text,uuid,text,int,int),public.get_calendar_record(text,uuid),public.reschedule_operations_calendar(text,uuid,jsonb,jsonb,text),public.get_calendar_notifications(),public.ux_workspace() to authenticated;
commit;
