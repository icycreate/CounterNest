-- CounterNest POS Phase 30.1: make pgcrypto available to manager-PIN routines.
-- Supabase commonly installs pgcrypto in the extensions schema, while these
-- security-definer routines previously limited their search path to public.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter function public.set_my_manager_pin(text)
  set search_path = public, extensions;

alter function public.process_sale_adjustment(uuid, text, jsonb, boolean, text, text, text)
  set search_path = public, extensions;

comment on function public.set_my_manager_pin(text) is
  'Sets the authenticated administrator manager PIN using pgcrypto bcrypt hashing.';
