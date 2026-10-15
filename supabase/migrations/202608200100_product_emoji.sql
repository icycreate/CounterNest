-- CounterNest POS Phase 30.4: optional product food icon / emoji.

alter table public.products
  add column if not exists icon_emoji text;

alter table public.products
  drop constraint if exists products_icon_emoji_length;

alter table public.products
  add constraint products_icon_emoji_length
  check (icon_emoji is null or char_length(icon_emoji) between 1 and 16);
