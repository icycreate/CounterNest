-- CounterNest POS Phase 30.1: persist administrator-friendly loyalty rule choices.
-- Checkout continues using points_per_currency, which the UI derives from the
-- selected percentage or per-currency rule. Existing stamp columns already
-- support threshold-per-sale and repeated amount-based earning.

alter table public.loyalty_programs
  add column if not exists points_rule_mode text not null default 'percentage'
    check (points_rule_mode in ('percentage','per_currency')),
  add column if not exists points_rule_value numeric(10,4) not null default 5
    check (points_rule_value >= 0 and points_rule_value <= 1000);

update public.loyalty_programs
set points_rule_mode='percentage',
    points_rule_value=round(points_per_currency*100,4)
where points_rule_mode='percentage' and points_rule_value=5 and points_per_currency<>0.05;

comment on column public.loyalty_programs.points_rule_mode is
  'UI rule representation; percentage divides points_rule_value by 100 into points_per_currency.';
comment on column public.loyalty_programs.points_rule_value is
  'Administrator-entered percentage or points-per-currency value.';
