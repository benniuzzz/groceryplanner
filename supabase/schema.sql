-- Grocery Planner schema
-- Paste this entire file into Supabase: SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists items_name_lower_uniq on items (lower(name));

-- Shared household dataset, no per-user auth: RLS off on all tables.
alter table items disable row level security;
alter table stock_entries disable row level security;
alter table meals disable row level security;
alter table allocations disable row level security;

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

-- Logs exactly what cook_meal deducted from stock, so uncook_meal can
-- restore the original stock_entries (snapshotted attributes). stock_entry_id
-- uses on delete set null so the log survives the entry being deleted.
create table if not exists meal_consumption (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  stock_entry_id uuid references stock_entries(id) on delete set null,
  item_id uuid not null,
  unit text not null,
  quantity double precision not null check (quantity > 0),
  expiry_date date,
  added_at timestamptz not null default now(),
  consumed_at timestamptz not null default now()
);

create index if not exists meal_consumption_meal_idx on meal_consumption (meal_id);

alter table meal_consumption disable row level security;

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
-- consuming entries that expire soonest first. Each deduction is logged to
-- meal_consumption so it can be exactly restored by uncook_meal.
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
      select id, quantity, expiry_date, added_at
      from stock_entries
      where item_id = a.item_id and unit = a.unit
      order by expiry_date asc nulls last, added_at asc
      for update
    loop
      exit when remaining <= 0;
      take := least(e.quantity, remaining);
      insert into meal_consumption
        (meal_id, stock_entry_id, item_id, unit, quantity, expiry_date, added_at)
      values
        (p_meal_id, e.id, a.item_id, a.unit, take, e.expiry_date, e.added_at);
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

-- Marks a meal as uncooked and restores the exact stock entries that
-- cook_meal consumed (same item, unit, quantity, expiry and added_at).
create or replace function uncook_meal(p_meal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  for c in
    select item_id, unit, quantity, expiry_date, added_at
    from meal_consumption
    where meal_id = p_meal_id
  loop
    insert into stock_entries (item_id, unit, quantity, expiry_date, added_at)
    values (c.item_id, c.unit, c.quantity, c.expiry_date, c.added_at);
  end loop;

  delete from meal_consumption where meal_id = p_meal_id;
  update meals set cooked = false where id = p_meal_id and cooked = true;
end;
$$;

grant execute on function get_or_create_item(text) to anon, authenticated;
grant execute on function cook_meal(uuid) to anon, authenticated;
grant execute on function uncook_meal(uuid) to anon, authenticated;
