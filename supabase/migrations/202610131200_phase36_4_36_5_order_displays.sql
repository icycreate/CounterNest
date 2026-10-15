create table public.customer_order_counters(shop_id uuid not null references shops(id),business_date date not null,last_number integer not null,primary key(shop_id,business_date));
alter table public.customer_order_counters enable row level security;
alter table customer_selection_requests add column public_order_number text;
update customer_selection_requests set public_order_number='C-'||request_number::text;
create function public.assign_customer_order_number() returns trigger language plpgsql security definer set search_path=public as $$
declare day date;seq integer;
begin
 select (now() at time zone timezone)::date into day from shops where id=new.shop_id;
 insert into customer_order_counters values(new.shop_id,day,1) on conflict(shop_id,business_date) do update set last_number=customer_order_counters.last_number+1 returning last_number into seq;
 new.public_order_number:=to_char(day,'MMDD')||'-'||lpad(seq::text,greatest(3,length(seq::text)),'0');return new;
end $$;
create trigger customer_order_number before insert on customer_selection_requests for each row execute function assign_customer_order_number();
create function public.get_preparation_orders() returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'number',r.public_order_number,'status',case when r.status in('pending','loaded') then 'received' else r.status end,'station',r.target_station_label,'note',r.customer_note,'created_at',r.created_at,'paid',r.sale_id is not null,'items',(select jsonb_agg(jsonb_build_object('name',i.product_name_snapshot,'option',i.option_label_snapshot,'quantity',i.quantity,'variant',v.name)) from customer_selection_items i left join product_variants v on v.id=i.variant_id where i.request_id=r.id)) order by r.created_at),'[]') from customer_selection_requests r where shop_id=current_shop_id() and status in('pending','loaded','preparing','ready'));
end $$;
create function public.set_preparation_order_status(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare r customer_selection_requests%rowtype;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select * into r from customer_selection_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Order not found';end if;
 if not ((p_status='preparing' and r.status in('pending','loaded')) or (p_status='ready' and r.status='preparing') or (p_status='completed' and r.status='ready' and r.sale_id is not null) or (p_status='cancelled' and r.status in('pending','loaded','preparing','ready') and r.sale_id is null and public.is_admin())) then raise exception 'Invalid order transition; collected orders must be paid and cancellation requires an administrator';end if;
 update customer_selection_requests set status=p_status,status_updated_by=auth.uid(),preparing_at=case when p_status='preparing' then now() else preparing_at end,ready_at=case when p_status='ready' then now() else ready_at end,completed_at=case when p_status='completed' then now() else completed_at end where id=r.id;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(r.shop_id,'customer_order',r.id,p_status,jsonb_build_object('before',r.status),auth.uid());
end $$;
create function public.get_customer_ready_board(p_token text) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid;
begin
 select shop_id into v_shop from customer_display_configs where access_token=p_token and enabled;
 if v_shop is null then raise exception 'Display unavailable';end if;
 return jsonb_build_object('shop_name',(select name from shops where id=v_shop),'orders',(select coalesce(jsonb_agg(jsonb_build_object('number',public_order_number,'status',status,'ready_at',ready_at) order by created_at),'[]') from customer_selection_requests where shop_id=v_shop and status in('preparing','ready')));
end $$;
revoke all on function public.get_preparation_orders(),public.set_preparation_order_status(uuid,text),public.get_customer_ready_board(text) from public;
grant execute on function public.get_preparation_orders(),public.set_preparation_order_status(uuid,text) to authenticated;
grant execute on function public.get_customer_ready_board(text) to anon,authenticated;
