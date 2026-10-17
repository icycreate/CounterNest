-- RC4: normalize new phone writes; preserve existing historical values until edited.
-- No table rewrites, deletes or changes to access policies.
begin;
create function public.normalize_international_phone(p_value text) returns text
language plpgsql immutable set search_path=public as $$
declare value text:=nullif(btrim(p_value),''); digits text;
begin
 if value is null then return null;end if;
 if value !~ '^([+]|00)' or value !~ '^[+0-9(). /-]+$' then raise exception 'Enter an international phone number with a country code.';end if;
 if value like '00%' then value:='+'||substr(value,3);end if;
 digits:=regexp_replace(value,'[^0-9]','','g');
 if digits !~ '^[1-9][0-9]{5,14}$' then raise exception 'Enter a valid international phone number.';end if;
 return '+'||digits;
end $$;
create function public.normalize_phone_write() returns trigger
language plpgsql set search_path=public as $$
begin
 if tg_table_name='catalogue_preorder_requests' then
  if new.preferred_method in ('phone','whatsapp','sms') and (tg_op='INSERT' or new.contact_value is distinct from old.contact_value or new.preferred_method is distinct from old.preferred_method) then
   new.contact_value:=public.normalize_international_phone(new.contact_value);
  end if;
 elsif tg_op='INSERT' or new.phone is distinct from old.phone then
  new.phone:=public.normalize_international_phone(new.phone);
 end if;
 return new;
end $$;
create trigger normalize_shop_phone before insert or update of phone on public.shops for each row execute function public.normalize_phone_write();
create trigger normalize_customer_phone before insert or update of phone on public.customers for each row execute function public.normalize_phone_write();
create trigger normalize_supplier_phone before insert or update of phone on public.suppliers for each row execute function public.normalize_phone_write();
create trigger normalize_request_phone before insert or update of contact_value,preferred_method on public.catalogue_preorder_requests for each row execute function public.normalize_phone_write();
-- Normalize before rate limiting and idempotency comparisons, including anonymous requests.
alter function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) rename to submit_catalogue_preorder_rc3;
revoke all on function public.submit_catalogue_preorder_rc3(text,uuid,jsonb,jsonb) from public,anon,authenticated;
create function public.submit_catalogue_preorder(p_token text,p_key uuid,p_items jsonb,p_customer jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare prior_contact text;canonical text;
begin
 if jsonb_typeof(p_customer)='object' and p_customer->>'method' in ('phone','whatsapp','sms') then
  -- Retain exact pre-upgrade payload spelling for an already-existing replay key.
  -- The original routine still checks the token and every other immutable payload field.
  select r.payload->>'contact' into prior_contact from catalogue_preorder_requests r
   join customer_display_configs c on c.id=r.display_config_id where c.access_token=p_token and r.client_key=p_key;
  if prior_contact is not null and prior_contact=p_customer->>'contact' then
   return public.submit_catalogue_preorder_rc3(p_token,p_key,p_items,p_customer);
  end if;
  canonical:=public.normalize_international_phone(p_customer->>'contact');
  if prior_contact ~ '^([+]|00)' and public.normalize_international_phone(prior_contact)=canonical then
   p_customer:=jsonb_set(p_customer,'{contact}',to_jsonb(prior_contact));
  else
   p_customer:=jsonb_set(p_customer,'{contact}',to_jsonb(canonical));
  end if;
 end if;
 return public.submit_catalogue_preorder_rc3(p_token,p_key,p_items,p_customer);
end $$;
revoke all on function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) from public;
grant execute on function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) to anon,authenticated;
-- Keep the accepted-receipt authorization in the existing implementation.
alter function public.get_catalogue_preorder_receipt(uuid) rename to get_catalogue_preorder_receipt_rc3;
revoke all on function public.get_catalogue_preorder_receipt_rc3(uuid) from public,anon,authenticated;
create function public.get_catalogue_preorder_receipt(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb; branding jsonb;
begin
 result:=public.get_catalogue_preorder_receipt_rc3(p_id);
 select jsonb_build_object('address',s.address,'phone',s.phone,'email',s.email) into branding
 from shops s join catalogue_preorder_requests r on r.shop_id=s.id where r.id=p_id;
 return result||coalesce(branding,'{}'::jsonb);
end $$;
revoke all on function public.normalize_international_phone(text),public.normalize_phone_write(),public.get_catalogue_preorder_receipt(uuid) from public,anon;
grant execute on function public.normalize_international_phone(text),public.get_catalogue_preorder_receipt(uuid) to authenticated;

-- Alternate phone destinations use the same canonical format; permission/reason/audit stay in the original routine.
alter function public.prepare_catalogue_contact(uuid,text,text,text) rename to prepare_catalogue_contact_rc3;
revoke all on function public.prepare_catalogue_contact_rc3(uuid,text,text,text) from public,anon,authenticated;
create function public.prepare_catalogue_contact(p_id uuid,p_method text,p_override_reason text default null,p_override_destination text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
 if p_method in ('phone','whatsapp','sms') and nullif(btrim(p_override_destination),'') is not null then
  p_override_destination:=public.normalize_international_phone(p_override_destination);
 end if;
 return public.prepare_catalogue_contact_rc3(p_id,p_method,p_override_reason,p_override_destination);
end $$;
revoke all on function public.prepare_catalogue_contact(uuid,text,text,text) from public,anon;
grant execute on function public.prepare_catalogue_contact(uuid,text,text,text) to authenticated;

-- Business contact and timezone are public catalogue metadata used only to choose the phone country default.
alter function public.get_commercial_catalogue(text) rename to get_commercial_catalogue_before_phone_defaults;
revoke all on function public.get_commercial_catalogue_before_phone_defaults(text) from public,anon,authenticated;
create function public.get_commercial_catalogue(p_token text default null) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb; metadata jsonb;
begin
 result:=public.get_commercial_catalogue_before_phone_defaults(p_token);
 if p_token is null then
  select jsonb_build_object('shop_phone',s.phone,'shop_timezone',s.timezone) into metadata from shops s where s.id=current_shop_id();
 else
  select jsonb_build_object('shop_phone',s.phone,'shop_timezone',s.timezone) into metadata from shops s join customer_display_configs c on c.shop_id=s.id where c.access_token=p_token and c.enabled;
 end if;
 return result||coalesce(metadata,'{}'::jsonb);
end $$;
revoke all on function public.get_commercial_catalogue(text) from public;
grant execute on function public.get_commercial_catalogue(text) to anon,authenticated;
commit;

