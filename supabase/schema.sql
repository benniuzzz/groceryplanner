-- Grocery Planner schema
-- Paste this entire file into Supabase: SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists items_name_lower_uniq on items (lower(name));

create table if not exists stock_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  quantity double precision not null check (quantity > 0),
  unit text not null,
  expiry_date date,
  added_at timestamptz not null default now()
);

create index if not exists stock_entries_item_idx on stock_entries (item_id);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day integer not null check (day between 0 and 6),
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner')),
  cooked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists allocations (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  unit text not null,
  quantity double precision not null check (quantity > 0),
  unique (meal_id, item_id, unit)
);

-- Returns the item id for a name, creating the item if it does not exist yet.
create or replace function get_or_create_item(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from items where lower(name) = lower(trim(p_name));
  if v_id is null then
    insert into items (name) values (trim(p_name)) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Marks a meal as cooked and deducts its allocated amounts from stock,
-- consuming entries that expire soonest first.
create or replace function cook_meal(p_meal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  e record;
  remaining double precision;
  take double precision;
begin
  update meals set cooked = true where id = p_meal_id and cooked = false;

  for a in
    select item_id, unit, quantity
    from allocations
    where meal_id = p_meal_id
  loop
    remaining := a.quantity;
    for e in
      select id, quantity
      from stock_entries
      where item_id = a.item_id and unit = a.unit
      order by expiry_date asc nulls last, added_at asc
      for update
    loop
      exit when remaining <= 0;
      take := least(e.quantity, remaining);
      if take >= e.quantity then
        delete from stock_entries where id = e.id;
      else
        update stock_entries set quantity = quantity - take where id = e.id;
      end if;
      remaining := remaining - take;
    end loop;
  end loop;
end;
$$;

grant execute on function get_or_create_item(text) to anon, authenticated;
grant execute on function cook_meal(uuid) to anon, authenticated;
