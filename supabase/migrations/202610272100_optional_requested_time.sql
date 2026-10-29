begin;
-- Extend the existing canonical payload before its replay comparison. No historical rewrites.
do $$declare definition text;anchor text:=$a$v_payload:=jsonb_build_object('items',clean_items,'name',v_name,'method',v_method,'contact',v_contact,'note',v_note);$a$;
begin
 definition:=pg_get_functiondef('public.submit_catalogue_preorder_before_tracking(text,uuid,jsonb,jsonb)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Unexpected intake definition; apply the supplied migration chain first';end if;
 execute replace(definition,anchor,anchor||$a$
 if nullif(p_customer->>'requested_fulfillment_at','') is not null then
  if jsonb_typeof(p_customer->'requested_fulfillment_at')<>'string' or p_customer->>'requested_fulfillment_at' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$' then raise exception 'Invalid requested time';end if;
  if not exists(select 1 from pg_timezone_names where name=p_customer->>'requested_timezone') then raise exception 'Invalid requested timezone';end if;
  v_payload:=v_payload||jsonb_build_object('requested_fulfillment_at',to_char((p_customer->>'requested_fulfillment_at')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'requested_timezone',p_customer->>'requested_timezone');
 end if;
 $a$);
 definition:=pg_get_functiondef('public.capture_preorder_submission()'::regprocedure);
 anchor:=$a$'currency',currency_code);$a$;
 if position(anchor in definition)=0 then raise exception 'Unexpected snapshot definition';end if;
 execute replace(definition,anchor,anchor||$a$
 if new.payload ? 'requested_fulfillment_at' then
  new.submission_snapshot:=new.submission_snapshot||jsonb_build_object('requested_fulfillment_at',new.payload->'requested_fulfillment_at','requested_timezone',new.payload->'requested_timezone');
 end if;
 $a$);
end$$;
commit;
