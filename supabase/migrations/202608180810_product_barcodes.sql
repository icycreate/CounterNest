-- ChubbyLu Bakery POS v0.8.3 — optional product barcode scanner support
alter table public.products add column if not exists barcode text;

alter table public.products drop constraint if exists products_barcode_format_check;
alter table public.products add constraint products_barcode_format_check
  check (barcode is null or (barcode=trim(barcode) and length(barcode) between 3 and 64 and barcode !~ '[[:space:]]'));

create unique index if not exists products_shop_barcode_unique
  on public.products(shop_id, barcode) where barcode is not null;

comment on column public.products.barcode is
  'Optional shop-unique barcode used by keyboard-wedge USB/Bluetooth scanners and manual barcode entry.';
