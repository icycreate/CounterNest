-- CounterNest POS Phase 30.3: shop-scoped entity translations.
create table if not exists public.entity_translations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  entity_type text not null check (entity_type in ('category','product','reward','expense_category')),
  entity_id uuid not null,
  language_code text not null check (language_code in ('en','es')),
  field_name text not null default 'name' check (field_name in ('name','description')),
  translated_text text not null check (length(trim(translated_text)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id,entity_type,entity_id,language_code,field_name)
);
create index if not exists entity_translations_lookup_idx on public.entity_translations(shop_id,language_code,entity_type,entity_id);
alter table public.entity_translations enable row level security;
drop policy if exists entity_translations_read on public.entity_translations;
create policy entity_translations_read on public.entity_translations for select to authenticated using (shop_id=public.current_shop_id());
drop policy if exists entity_translations_admin_insert on public.entity_translations;
create policy entity_translations_admin_insert on public.entity_translations for insert to authenticated with check (shop_id=public.current_shop_id() and public.is_admin());
drop policy if exists entity_translations_admin_update on public.entity_translations;
create policy entity_translations_admin_update on public.entity_translations for update to authenticated using (shop_id=public.current_shop_id() and public.is_admin()) with check (shop_id=public.current_shop_id() and public.is_admin());
drop policy if exists entity_translations_admin_delete on public.entity_translations;
create policy entity_translations_admin_delete on public.entity_translations for delete to authenticated using (shop_id=public.current_shop_id() and public.is_admin());
grant select,insert,update,delete on public.entity_translations to authenticated;
