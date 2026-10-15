-- CounterNest POS Phase 34.6: recipe preparation guides, ordered instructions, approval, and private step photos.

create table if not exists public.recipe_preparation_guides (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  recipe_id uuid not null references public.product_recipes(id) on delete cascade,
  introduction text,
  prep_minutes integer not null default 0 check(prep_minutes between 0 and 10080),
  cook_minutes integer not null default 0 check(cook_minutes between 0 and 10080),
  temperature_value numeric(8,2),
  temperature_unit text not null default 'C' check(temperature_unit in('C','F','none')),
  equipment text,
  allergen_notes text,
  storage_notes text,
  cooling_notes text,
  status text not null default 'draft' check(status in('draft','approved')),
  approved_recipe_version integer,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique(recipe_id)
);

create table if not exists public.recipe_preparation_steps (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  guide_id uuid not null references public.recipe_preparation_guides(id) on delete cascade,
  step_number integer not null check(step_number>0),
  instruction text not null,
  checkpoint boolean not null default false,
  photo_path text,
  note text,
  created_at timestamptz not null default now(),
  unique(guide_id,step_number)
);

create index if not exists recipe_guides_shop_idx on public.recipe_preparation_guides(shop_id,status,updated_at desc);
create index if not exists recipe_steps_guide_idx on public.recipe_preparation_steps(guide_id,step_number);

alter table public.recipe_preparation_guides enable row level security;
alter table public.recipe_preparation_steps enable row level security;

drop policy if exists recipe_guides_staff_select on public.recipe_preparation_guides;
create policy recipe_guides_staff_select on public.recipe_preparation_guides for select to authenticated
using(shop_id=public.current_shop_id() and(status='approved' or public.is_admin()));
drop policy if exists recipe_steps_staff_select on public.recipe_preparation_steps;
create policy recipe_steps_staff_select on public.recipe_preparation_steps for select to authenticated
using(shop_id=public.current_shop_id() and exists(select 1 from public.recipe_preparation_guides g where g.id=guide_id and g.shop_id=public.current_shop_id() and(g.status='approved' or public.is_admin())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recipe-steps','recipe-steps',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "recipe steps staff select" on storage.objects;
drop policy if exists "recipe steps admin insert" on storage.objects;
drop policy if exists "recipe steps admin update" on storage.objects;
drop policy if exists "recipe steps admin delete" on storage.objects;
create policy "recipe steps staff select" on storage.objects for select to authenticated
using(bucket_id='recipe-steps' and (storage.foldername(name))[1]=public.current_shop_id()::text);
create policy "recipe steps admin insert" on storage.objects for insert to authenticated
with check(bucket_id='recipe-steps' and public.is_admin() and (storage.foldername(name))[1]=public.current_shop_id()::text);
create policy "recipe steps admin update" on storage.objects for update to authenticated
using(bucket_id='recipe-steps' and public.is_admin() and (storage.foldername(name))[1]=public.current_shop_id()::text)
with check(bucket_id='recipe-steps' and public.is_admin() and (storage.foldername(name))[1]=public.current_shop_id()::text);
create policy "recipe steps admin delete" on storage.objects for delete to authenticated
using(bucket_id='recipe-steps' and public.is_admin() and (storage.foldername(name))[1]=public.current_shop_id()::text);

create or replace function public.save_recipe_preparation(p_recipe_id uuid,p_guide jsonb,p_steps jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_recipe public.product_recipes%rowtype;v_id uuid;v_step record;v_n integer:=0;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_recipe from public.product_recipes where id=p_recipe_id and shop_id=v_shop;
  if v_recipe.id is null then raise exception 'Recipe not found'; end if;
  insert into public.recipe_preparation_guides(shop_id,recipe_id,introduction,prep_minutes,cook_minutes,temperature_value,temperature_unit,equipment,allergen_notes,storage_notes,cooling_notes,status,approved_recipe_version,approved_by,approved_at,updated_by)
  values(v_shop,p_recipe_id,nullif(trim(p_guide->>'introduction'),''),greatest(0,coalesce((p_guide->>'prep_minutes')::integer,0)),greatest(0,coalesce((p_guide->>'cook_minutes')::integer,0)),nullif(p_guide->>'temperature_value','')::numeric,coalesce(nullif(p_guide->>'temperature_unit',''),'C'),nullif(trim(p_guide->>'equipment'),''),nullif(trim(p_guide->>'allergen_notes'),''),nullif(trim(p_guide->>'storage_notes'),''),nullif(trim(p_guide->>'cooling_notes'),''),'draft',null,null,null,auth.uid())
  on conflict(recipe_id) do update set introduction=excluded.introduction,prep_minutes=excluded.prep_minutes,cook_minutes=excluded.cook_minutes,temperature_value=excluded.temperature_value,temperature_unit=excluded.temperature_unit,equipment=excluded.equipment,allergen_notes=excluded.allergen_notes,storage_notes=excluded.storage_notes,cooling_notes=excluded.cooling_notes,status='draft',approved_recipe_version=null,approved_by=null,approved_at=null,updated_by=auth.uid(),updated_at=now()
  returning id into v_id;
  delete from public.recipe_preparation_steps where guide_id=v_id;
  for v_step in select * from jsonb_to_recordset(coalesce(p_steps,'[]'::jsonb)) as x(step_number integer,instruction text,checkpoint boolean,photo_path text,note text) loop
    v_n:=v_n+1;
    if nullif(trim(v_step.instruction),'') is null then raise exception 'Every preparation step requires instructions'; end if;
    if nullif(trim(coalesce(v_step.photo_path,'')),'') is not null and split_part(v_step.photo_path,'/',1)<>v_shop::text then raise exception 'Recipe step photo path must belong to the current shop'; end if;
    insert into public.recipe_preparation_steps(shop_id,guide_id,step_number,instruction,checkpoint,photo_path,note)
    values(v_shop,v_id,coalesce(v_step.step_number,v_n),trim(v_step.instruction),coalesce(v_step.checkpoint,false),nullif(trim(v_step.photo_path),''),nullif(trim(v_step.note),''));
  end loop;
  if v_n=0 then raise exception 'At least one preparation step is required'; end if;
  return v_id;
end $$;

create or replace function public.approve_recipe_preparation(p_recipe_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_recipe public.product_recipes%rowtype;v_guide public.recipe_preparation_guides%rowtype;v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_recipe from public.product_recipes where id=p_recipe_id and shop_id=v_shop and active;
  if v_recipe.id is null then raise exception 'Active recipe not found'; end if;
  select * into v_guide from public.recipe_preparation_guides where recipe_id=v_recipe.id and shop_id=v_shop for update;
  if v_guide.id is null then raise exception 'Preparation guide not found'; end if;
  select count(*) into v_count from public.recipe_preparation_steps where guide_id=v_guide.id;
  if v_count=0 then raise exception 'Preparation guide has no steps'; end if;
  update public.recipe_preparation_guides set status='approved',approved_recipe_version=v_recipe.version,approved_by=auth.uid(),approved_at=now(),updated_by=auth.uid(),updated_at=now() where id=v_guide.id;
  return jsonb_build_object('guide_id',v_guide.id,'recipe_id',v_recipe.id,'recipe_version',v_recipe.version,'approved_at',now());
end $$;

create or replace function public.get_recipe_preparation(p_recipe_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_recipe public.product_recipes%rowtype;v_guide public.recipe_preparation_guides%rowtype;
begin
  if auth.uid() is null then raise exception 'Staff sign-in is required'; end if;
  select * into v_recipe from public.product_recipes where id=p_recipe_id and shop_id=v_shop;
  if v_recipe.id is null then raise exception 'Recipe not found'; end if;
  select * into v_guide from public.recipe_preparation_guides where recipe_id=v_recipe.id and shop_id=v_shop and(status='approved' or public.is_admin());
  if v_guide.id is null then return jsonb_build_object('recipe_id',v_recipe.id,'status','missing','steps','[]'::jsonb); end if;
  return jsonb_build_object(
    'id',v_guide.id,'recipe_id',v_recipe.id,'status',v_guide.status,'recipe_version',v_recipe.version,'approved_recipe_version',v_guide.approved_recipe_version,
    'introduction',v_guide.introduction,'prep_minutes',v_guide.prep_minutes,'cook_minutes',v_guide.cook_minutes,'temperature_value',v_guide.temperature_value,'temperature_unit',v_guide.temperature_unit,
    'equipment',v_guide.equipment,'allergen_notes',v_guide.allergen_notes,'storage_notes',v_guide.storage_notes,'cooling_notes',v_guide.cooling_notes,'approved_at',v_guide.approved_at,
    'steps',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'step_number',s.step_number,'instruction',s.instruction,'checkpoint',s.checkpoint,'photo_path',s.photo_path,'note',s.note) order by s.step_number),'[]'::jsonb) from public.recipe_preparation_steps s where s.guide_id=v_guide.id)
  );
end $$;

create or replace function public.get_recipe_preparation_catalog() returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null then raise exception 'Staff sign-in is required'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.product_name),'[]'::jsonb) from(
    select pr.id recipe_id,pr.version,pr.batch_yield,p.id product_id,p.name product_name,p.image_url,
      coalesce(g.status,'missing') guide_status,g.approved_recipe_version,g.approved_at,
      case when g.id is null then 0 else(select count(*) from public.recipe_preparation_steps s where s.guide_id=g.id) end step_count
    from public.product_recipes pr join public.products p on p.id=pr.product_id
    left join public.recipe_preparation_guides g on g.recipe_id=pr.id
    where pr.shop_id=v_shop and pr.active and p.active and(g.status='approved' or public.is_admin() or g.id is null)
  )x);
end $$;

revoke all on function public.save_recipe_preparation(uuid,jsonb,jsonb) from public;
revoke all on function public.approve_recipe_preparation(uuid) from public;
revoke all on function public.get_recipe_preparation(uuid) from public;
revoke all on function public.get_recipe_preparation_catalog() from public;
grant execute on function public.save_recipe_preparation(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.approve_recipe_preparation(uuid) to authenticated;
grant execute on function public.get_recipe_preparation(uuid) to authenticated;
grant execute on function public.get_recipe_preparation_catalog() to authenticated;
