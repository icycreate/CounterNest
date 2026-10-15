-- CounterNest POS Phases 35.2-35.3: customer request fulfillment status and supply document review intelligence.

alter table public.customer_selection_requests drop constraint if exists customer_selection_requests_status_check;
alter table public.customer_selection_requests add constraint customer_selection_requests_status_check
check(status in('pending','loaded','preparing','ready','completed','dismissed','cancelled'));
alter table public.customer_selection_requests add column if not exists preparing_at timestamptz;
alter table public.customer_selection_requests add column if not exists ready_at timestamptz;
alter table public.customer_selection_requests add column if not exists completed_at timestamptz;
alter table public.customer_selection_requests add column if not exists status_updated_by uuid references auth.users(id) on delete set null;

create or replace function public.update_customer_selection_status(p_request_id uuid,p_station_label text,p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_row public.customer_selection_requests%rowtype;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Staff sign-in is required'; end if;
  if p_status not in('loaded','preparing','ready','completed','cancelled') then raise exception 'Unsupported request status'; end if;
  select * into v_row from public.customer_selection_requests where id=p_request_id and shop_id=v_shop for update;
  if v_row.id is null then raise exception 'Customer request not found'; end if;
  if lower(v_row.target_station_label)<>lower(trim(coalesce(p_station_label,''))) then raise exception 'This request belongs to a different POS station'; end if;
  if v_row.status in('dismissed','completed','cancelled') then raise exception 'This request is already closed'; end if;
  if p_status='preparing' and v_row.status not in('loaded','preparing') then raise exception 'Load the request before marking it preparing'; end if;
  if p_status='ready' and v_row.status not in('loaded','preparing','ready') then raise exception 'Load the request before marking it ready'; end if;
  if p_status='completed' and v_row.status not in('loaded','preparing','ready') then raise exception 'Load the request before completing it'; end if;
  update public.customer_selection_requests set status=p_status,status_updated_by=auth.uid(),
    preparing_at=case when p_status='preparing' then coalesce(preparing_at,now()) else preparing_at end,
    ready_at=case when p_status='ready' then coalesce(ready_at,now()) else ready_at end,
    completed_at=case when p_status='completed' then coalesce(completed_at,now()) else completed_at end,
    dismissed_at=case when p_status='cancelled' then coalesce(dismissed_at,now()) else dismissed_at end,
    dismissed_by=case when p_status='cancelled' then auth.uid() else dismissed_by end,
    dismiss_reason=case when p_status='cancelled' then coalesce(dismiss_reason,'Cancelled by POS') else dismiss_reason end
  where id=v_row.id;
  return jsonb_build_object('id',v_row.id,'status',p_status,'updated_at',now());
end $$;

create or replace function public.get_customer_selection_status(p_token text,p_request_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_config public.customer_display_configs%rowtype;v_req public.customer_selection_requests%rowtype;
begin
  select * into v_config from public.customer_display_configs where access_token=p_token and enabled limit 1;
  if v_config.id is null then raise exception 'Customer display link is unavailable'; end if;
  select * into v_req from public.customer_selection_requests where id=p_request_id and shop_id=v_config.shop_id and display_config_id=v_config.id;
  if v_req.id is null then raise exception 'Customer request not found'; end if;
  return jsonb_build_object('id',v_req.id,'request_number',v_req.request_number,'target_station_label',v_req.target_station_label,'status',v_req.status,'created_at',v_req.created_at,'loaded_at',v_req.loaded_at,'preparing_at',v_req.preparing_at,'ready_at',v_req.ready_at,'completed_at',v_req.completed_at,'closed',v_req.status in('completed','dismissed','cancelled'));
end $$;

revoke all on function public.update_customer_selection_status(uuid,text,text) from public;
revoke all on function public.get_customer_selection_status(text,uuid) from public;
grant execute on function public.update_customer_selection_status(uuid,text,text) to authenticated;
grant execute on function public.get_customer_selection_status(text,uuid) to anon,authenticated;

-- Supply document review foundation. No stock mutation occurs from these records.
create table if not exists public.supply_document_reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  attachment_id uuid not null references public.inventory_supply_attachments(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','approved','rejected')),
  suggested_fields jsonb not null default '{}'::jsonb,
  supplier_name text,
  reference_number text,
  document_date date,
  document_total numeric(14,2),
  lot_code text,
  expires_on date,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(attachment_id)
);

create index if not exists supply_document_reviews_shop_status_idx on public.supply_document_reviews(shop_id,status,updated_at desc);
alter table public.supply_document_reviews enable row level security;
create policy supply_document_reviews_admin_select on public.supply_document_reviews for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.save_supply_document_review(p_attachment_id uuid,p_fields jsonb,p_status text default 'pending')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_id uuid;v_status text:=coalesce(nullif(p_status,''),'pending');
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if v_status not in('pending','approved','rejected') then raise exception 'Invalid review status'; end if;
  if not exists(select 1 from public.inventory_supply_attachments where id=p_attachment_id and shop_id=v_shop) then raise exception 'Supply attachment not found'; end if;
  insert into public.supply_document_reviews(shop_id,attachment_id,status,suggested_fields,supplier_name,reference_number,document_date,document_total,lot_code,expires_on,review_note,reviewed_by,reviewed_at)
  values(v_shop,p_attachment_id,v_status,coalesce(p_fields->'suggested_fields','{}'::jsonb),nullif(trim(p_fields->>'supplier_name'),''),nullif(trim(p_fields->>'reference_number'),''),nullif(p_fields->>'document_date','')::date,nullif(p_fields->>'document_total','')::numeric,nullif(trim(p_fields->>'lot_code'),''),nullif(p_fields->>'expires_on','')::date,nullif(trim(p_fields->>'review_note'),''),case when v_status in('approved','rejected') then auth.uid() else null end,case when v_status in('approved','rejected') then now() else null end)
  on conflict(attachment_id) do update set status=excluded.status,suggested_fields=excluded.suggested_fields,supplier_name=excluded.supplier_name,reference_number=excluded.reference_number,document_date=excluded.document_date,document_total=excluded.document_total,lot_code=excluded.lot_code,expires_on=excluded.expires_on,review_note=excluded.review_note,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,updated_at=now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.get_supply_document_review_queue() returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.uploaded_at desc),'[]'::jsonb) from(
    select a.id attachment_id,a.source_type,a.source_id,a.storage_path,a.original_name,a.mime_type,a.uploaded_at,
      coalesce(r.status,'pending') review_status,r.id review_id,r.supplier_name,r.reference_number,r.document_date,r.document_total,r.lot_code,r.expires_on,r.review_note,r.suggested_fields,r.reviewed_at
    from public.inventory_supply_attachments a left join public.supply_document_reviews r on r.attachment_id=a.id
    where a.shop_id=v_shop
  )x);
end $$;

revoke all on function public.save_supply_document_review(uuid,jsonb,text) from public;
revoke all on function public.get_supply_document_review_queue() from public;
grant execute on function public.save_supply_document_review(uuid,jsonb,text) to authenticated;
grant execute on function public.get_supply_document_review_queue() to authenticated;

comment on table public.supply_document_reviews is 'Phase 35.3 trusted metadata review for supply photos/documents. Approval never changes inventory automatically.';

create or replace function public.get_customer_fulfillment_queue(p_station_label text)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or v_shop is null then raise exception 'Staff sign-in is required'; end if;
  if nullif(trim(p_station_label),'') is null then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at),'[]'::jsonb) from(
    select r.id,r.request_number,r.target_station_label,r.customer_note,r.total_snapshot,r.status,r.created_at,r.loaded_at,r.preparing_at,r.ready_at,
      (select coalesce(jsonb_agg(jsonb_build_object('product_id',i.product_id,'product_name',i.product_name_snapshot,'unit_price',i.unit_price_snapshot,'quantity',i.quantity) order by i.product_name_snapshot),'[]'::jsonb) from public.customer_selection_items i where i.request_id=r.id) items
    from public.customer_selection_requests r
    where r.shop_id=v_shop and r.status in('loaded','preparing','ready') and lower(r.target_station_label)=lower(trim(p_station_label))
    order by r.created_at
  )q);
end $$;
revoke all on function public.get_customer_fulfillment_queue(text) from public;
grant execute on function public.get_customer_fulfillment_queue(text) to authenticated;
