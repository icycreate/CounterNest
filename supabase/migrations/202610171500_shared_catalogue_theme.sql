-- Publish visual values only after the existing catalogue authorization/freeze checks succeed.
begin;
alter function public.get_commercial_catalogue(text) rename to get_commercial_catalogue_before_shared_theme;
revoke all on function public.get_commercial_catalogue_before_shared_theme(text) from public,anon,authenticated;
create function public.get_commercial_catalogue(p_token text default null) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare payload jsonb; tenant uuid; visual jsonb;
begin
 payload:=get_commercial_catalogue_before_shared_theme(p_token);
 if p_token is null then tenant:=current_shop_id();
 else select shop_id into tenant from customer_display_configs where access_token=p_token and enabled;end if;
 if tenant is null then raise exception 'Catalogue unavailable';end if;
 select jsonb_build_object(
  'primary',case when theme->>'primary' ~ '^#[0-9a-fA-F]{6}$' then theme->>'primary' else '#ad4b20' end,
  'background',case when theme->>'background' ~ '^#[0-9a-fA-F]{6}$' then theme->>'background' else '#fbf7f2' end,
  'text',case when theme->>'text' ~ '^#[0-9a-fA-F]{6}$' then theme->>'text' else '#33251e' end,
  'appearance',case when theme->>'appearance' in('light','dark','system') then theme->>'appearance' else 'system' end
 ) into visual from shops where id=tenant;
 return payload||jsonb_build_object('theme',visual);
end$$;
revoke all on function public.get_commercial_catalogue(text) from public;
grant execute on function public.get_commercial_catalogue(text) to anon,authenticated;

-- An administrator's appearance choice also sets the business catalogue default.
-- Other employees retain a private per-user preference without changing public branding.
alter function public.ux_save_preferences(jsonb) rename to ux_save_preferences_before_shared_theme;
revoke all on function public.ux_save_preferences_before_shared_theme(jsonb) from public,anon,authenticated;
create function public.ux_save_preferences(p_preferences jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 result:=ux_save_preferences_before_shared_theme(p_preferences);
 if p_preferences ? 'appearance' and current_workspace_role()='admin' then
  update shops set theme=theme||jsonb_build_object('appearance',p_preferences->>'appearance') where id=current_shop_id();
 end if;
 return result;
end$$;
revoke all on function public.ux_save_preferences(jsonb) from public,anon;
grant execute on function public.ux_save_preferences(jsonb) to authenticated;
commit;
