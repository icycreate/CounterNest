begin;
-- Preserve historical joins while excluding deactivated customers from new picker lists.
alter table public.customers add column active boolean not null default true;
create index customers_active_names on public.customers(shop_id,active,name);
update public.workspace_backup_tables set columns=array_append(columns,'active') where table_name='customers' and not ('active'=any(columns));

create function public.master_removal_authorized() returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and current_workspace_role()='admin'
 and exists(select 1 from staff_profiles where user_id=auth.uid() and shop_id=current_shop_id() and active and not must_change_password)
 and not exists(select 1 from workspace_recovery where shop_id=current_shop_id() and pending_at is not null)
$$;
-- Check every public single-column foreign key, including cascading/set-null references.
-- A dependency is deliberately treated conservatively: archive rather than erase it.
create function public.master_record_linked(p_table regclass,p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare r record;found boolean;
begin
 if p_table not in ('public.products'::regclass,'public.customers'::regclass) then raise exception 'Unsupported record type';end if;
 for r in select ns.nspname,cl.relname,a.attname from pg_constraint c join pg_class cl on cl.oid=c.conrelid join pg_namespace ns on ns.oid=cl.relnamespace join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1] join pg_attribute dest on dest.attrelid=c.confrelid and dest.attnum=c.confkey[1]
 where c.contype='f' and c.confrelid=p_table and ns.nspname='public' and cardinality(c.conkey)=1 and cardinality(c.confkey)=1 and dest.attname='id'
 loop
  execute format('select exists(select 1 from %I.%I where %I=$1)',r.nspname,r.relname,r.attname) into found using p_id;if found then return true;end if;
 end loop;
 if p_table='public.products'::regclass then
  if exists(select 1 from products where id=p_id and stock<>0) then return true;end if;
  if exists(select 1 from scheduled_customer_orders where items @> jsonb_build_array(jsonb_build_object('product_id',p_id)) or normalized_items @> jsonb_build_array(jsonb_build_object('product_id',p_id))) then return true;end if;
 else
  if exists(select 1 from customers where id=p_id and (visits>0 or total_spent<>0)) then return true;end if;
 end if;
 return false;
end $$;

create function public.get_master_removal_policy(p_entity text,p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb;target regclass;linked boolean;
begin
 if not master_removal_authorized() then raise exception 'Administrator access required';end if;
 target:=case p_entity when 'product' then 'public.products'::regclass when 'customer' then 'public.customers'::regclass else null end;
 if target is null then raise exception 'Unsupported record type';end if;
 execute format('select to_jsonb(r) from %s r where id=$1 and shop_id=$2',target) into item using p_id,current_shop_id();
 if item is null then raise exception 'Record not found';end if;
 linked:=master_record_linked(target,p_id);
 return jsonb_build_object('entity',p_entity,'id',p_id,'name',item->>'name','action',case when linked then 'archive' else 'delete' end,'has_history',linked);
end $$;

create function public.remove_master_record(p_entity text,p_id uuid,p_expected_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb;target regclass;decision text;
begin
 if not master_removal_authorized() then raise exception 'Administrator access required';end if;
 target:=case p_entity when 'product' then 'public.products'::regclass when 'customer' then 'public.customers'::regclass else null end;
 if target is null then raise exception 'Unsupported record type';end if;
 execute format('select to_jsonb(r) from %s r where id=$1 and shop_id=$2 for update',target) into item using p_id,current_shop_id();
 if item is null then raise exception 'Record not found';end if;
 decision:=case when master_record_linked(target,p_id) then 'archive' else 'delete' end;
 if p_expected_action is distinct from decision then raise exception 'Removal policy changed. Reopen and review the action.';end if;
 perform set_config('counternest.removal_rpc','true',true);
 if decision='archive' then execute format('update %s set active=false where id=$1 and shop_id=$2',target) using p_id,current_shop_id();
 else execute format('delete from %s where id=$1 and shop_id=$2',target) using p_id,current_shop_id();end if;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),p_entity,p_id,'record_'||decision,jsonb_build_object('old_active',item->'active','new_active',case when decision='archive' then 'false'::jsonb else 'null'::jsonb end,'policy','preserve_linked_history'),auth.uid());
 return jsonb_build_object('action',decision,'id',p_id);
end $$;

-- Direct API deletes cannot bypass the same history protection or erase linked rows by cascade.
create function public.master_history_delete_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from shops where id=old.shop_id) then return old;end if;
 if current_setting('role',true)='authenticated' and (not master_removal_authorized() or old.shop_id is distinct from current_shop_id()) then raise exception 'Administrator access required';end if;
 if master_record_linked(tg_relid,old.id) then raise exception 'Linked records must be archived, not deleted.';end if;
 return old;
end $$;
create trigger master_product_delete_guard before delete on public.products for each row execute function master_history_delete_guard();
create trigger master_customer_delete_guard before delete on public.customers for each row execute function master_history_delete_guard();
create function public.customer_activation_audit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.active is distinct from new.active and auth.uid() is not null then
  if current_setting('role',true)='authenticated' and not master_removal_authorized() then raise exception 'Administrator access required';end if;
  insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(new.shop_id,'customer',new.id,'activation_changed',jsonb_build_object('old_active',old.active,'new_active',new.active),auth.uid());
 end if;return new;
end $$;
create trigger customer_activation_audit after update of active on public.customers for each row execute function customer_activation_audit();

revoke all on function master_removal_authorized(),master_record_linked(regclass,uuid),master_history_delete_guard(),customer_activation_audit() from public,anon,authenticated;
revoke all on function get_master_removal_policy(text,uuid),remove_master_record(text,uuid,text) from public,anon;
grant execute on function get_master_removal_policy(text,uuid),remove_master_record(text,uuid,text) to authenticated;
create function public.customer_delete_audit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_setting('counternest.removal_rpc',true),'')<>'true' and auth.uid() is not null and exists(select 1 from shops where id=old.shop_id) then insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(old.shop_id,'customer',old.id,'record_delete',jsonb_build_object('old_active',old.active),auth.uid());end if;return old;
end $$;
create trigger customer_delete_audit after delete on public.customers for each row execute function customer_delete_audit();
revoke all on function customer_delete_audit() from public,anon,authenticated;
-- Customer edits remain available to staff; permanent removal goes through the authorized RPC.
revoke delete on public.customers from authenticated;

create function public.archived_customer_order_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_setting('workspace.lifecycle_mode',true),'') in('restore','purge') then return new;end if;
 if new.customer_id is not null and (tg_op='INSERT' or new.customer_id is distinct from old.customer_id) and exists(select 1 from customers where id=new.customer_id and not active) then raise exception 'Archived customers cannot be used for new orders.';end if;
 return new;
end $$;
create trigger archived_customer_scheduled_guard before insert or update of customer_id on public.scheduled_customer_orders for each row execute function archived_customer_order_guard();
create trigger archived_customer_sale_guard before insert or update of customer_id on public.sales for each row execute function archived_customer_order_guard();
revoke all on function archived_customer_order_guard() from public,anon,authenticated;
-- Preserve every current role guard and historic order join; change only the new-customer picker.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.get_scheduled_orders()'::regprocedure);
 if position('from customers where shop_id=current_shop_id()' in definition)=0 then raise exception 'Expected current scheduled-order customer projection';end if;
 definition:=replace(definition,'from customers where shop_id=current_shop_id()','from customers where shop_id=current_shop_id() and active');
 execute definition;
end $$;
commit;
