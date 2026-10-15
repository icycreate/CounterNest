create table public.production_shortage_alerts(id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id),kind text not null check(kind in('ingredient','product')),entity_id uuid not null,name text not null,required_quantity numeric not null,available_quantity numeric not null,shortage_quantity numeric not null,jobs jsonb not null default '[]',supplier text,last_price numeric,severity text not null,status text not null default 'open' check(status in('open','resolved','dismissed')),updated_at timestamptz not null default now(),unique(shop_id,kind,entity_id));
alter table production_shortage_alerts enable row level security;
create policy shortages_read on production_shortage_alerts for select to authenticated using(shop_id=current_shop_id() and is_admin());
create function public.refresh_production_shortages() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=current_shop_id();r record;oldrow production_shortage_alerts%rowtype;v_id uuid;v_short numeric;v_status text;
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 for r in
 with demand as(select ri.ingredient_id,sum(ri.quantity_required*pb.planned_quantity/(pr.batch_yield*(1-pr.expected_waste_percent/100))) required,jsonb_agg(jsonb_build_object('batch',pb.batch_number,'date',pb.scheduled_date,'product',pb.product_name)) jobs from production_batches pb join product_recipes pr on pr.product_id=pb.product_id and pr.shop_id=pb.shop_id and pr.active join recipe_items ri on ri.recipe_id=pr.id where pb.shop_id=v_shop and pb.status='scheduled' group by ri.ingredient_id)
 select 'ingredient'::text kind,i.id,i.name,greatest(coalesce(d.required,0),i.reorder_level) required,least(i.current_quantity,coalesce((select sum(remaining_quantity) from ingredient_lots l where l.ingredient_id=i.id and l.shop_id=v_shop and l.status='active' and(l.expires_on is null or l.expires_on>=current_date)),0)) available,coalesce(d.jobs,'[]') jobs,s.name supplier,(select unit_cost_snapshot from ingredient_lots where ingredient_id=i.id and shop_id=v_shop order by received_at desc limit 1) price
 from ingredients i left join demand d on d.ingredient_id=i.id left join suppliers s on s.id=coalesce(i.preferred_supplier_id,(select supplier_id from ingredient_lots where ingredient_id=i.id and shop_id=v_shop order by received_at desc limit 1)) where i.shop_id=v_shop and i.active
 union all
 select 'product',p.id,p.name,p.low_stock_at,least(p.stock,coalesce((select sum(remaining_quantity) from finished_product_batches where product_id=p.id and shop_id=v_shop and status='active' and(best_before_on is null or best_before_on>=current_date)),0)),'[]',null,p.cost_price from products p where p.shop_id=v_shop and p.active
 loop
 v_short:=greatest(r.required-r.available,0);select * into oldrow from production_shortage_alerts where shop_id=v_shop and kind=r.kind and entity_id=r.id for update;
 v_status:=case when v_short=0 then 'resolved' when oldrow.status='dismissed' and oldrow.shortage_quantity=v_short and oldrow.jobs=r.jobs then 'dismissed' else 'open' end;
 if v_short>0 or oldrow.id is not null then
 insert into production_shortage_alerts(shop_id,kind,entity_id,name,required_quantity,available_quantity,shortage_quantity,jobs,supplier,last_price,severity,status)
 values(v_shop,r.kind,r.id,r.name,r.required,r.available,v_short,r.jobs,r.supplier,r.price,case when r.available=0 then 'critical' else 'warning' end,v_status)
 on conflict(shop_id,kind,entity_id) do update set required_quantity=excluded.required_quantity,available_quantity=excluded.available_quantity,shortage_quantity=excluded.shortage_quantity,jobs=excluded.jobs,supplier=excluded.supplier,last_price=excluded.last_price,severity=excluded.severity,status=excluded.status,updated_at=now() returning id into v_id;
 if oldrow.id is null or oldrow.status is distinct from v_status or oldrow.shortage_quantity is distinct from v_short then insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(v_shop,'shortage',v_id,'refreshed',jsonb_build_object('status',v_status,'shortage',v_short),auth.uid());end if;
 end if;end loop;
 return (select coalesce(jsonb_agg(to_jsonb(a) order by status,severity,name),'[]') from production_shortage_alerts a where shop_id=v_shop);
end $$;
create function public.update_shortage_alert(p_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 if p_status not in('resolved','dismissed','open') or nullif(trim(p_reason),'') is null then raise exception 'Status and reason required';end if;
 perform refresh_production_shortages();
 update production_shortage_alerts set status=p_status,updated_at=now() where id=p_id and shop_id=current_shop_id() and(p_status<>'resolved' or shortage_quantity=0);
 if not found then raise exception 'Shortage is still present; use Dismiss with a reason instead';end if;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'shortage',p_id,p_status,jsonb_build_object('reason',p_reason),auth.uid());
end $$;
revoke all on function public.refresh_production_shortages(),public.update_shortage_alert(uuid,text,text) from public;
grant execute on function public.refresh_production_shortages(),public.update_shortage_alert(uuid,text,text) to authenticated;
