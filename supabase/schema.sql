-- Grocery Planner schema
-- Paste this entire file into Supabase: SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists items_name_lower_uniq on items (lower(name));

-- Curated list of item names the user allows in the Shopping page, each with
-- its fixed unit. Deleting a row here never touches inventory/history; it only
-- stops that item from being added to future shopping trips.
create table if not exists allowed_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists allowed_items_name_lower_uniq on allowed_items (lower(name));

-- Shared household dataset, no per-user auth: RLS off on all tables.
alter table items disable row level security;
alter table stock_entries disable row level security;
alter table meals disable row level security;
alter table allocations disable row level security;
alter table allowed_items disable row level security;

create table if not exists stock_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  quantity double precision not null check (quantity > 0),
  unit text not null,
  expiry_date date,
  cost numeric(10, 2) check (cost >= 0),
  added_at timestamptz not null default now()
);

create index if not exists stock_entries_item_idx on stock_entries (item_id);

alter table stock_entries add column if not exists cost numeric(10, 2);
alter table stock_entries drop constraint if exists stock_entries_cost_check;
alter table stock_entries add constraint stock_entries_cost_check check (cost >= 0);

-- Soft-delete columns: cooking a meal or manually removing stock sets one of
-- these instead of deleting the row, so purchase history is preserved.
alter table stock_entries add column if not exists consumed_at timestamptz;
alter table stock_entries add column if not exists deleted_at timestamptz;
alter table stock_entries add column if not exists deleted_why text;

create index if not exists stock_entries_active_idx on stock_entries (consumed_at)
  where consumed_at is null and deleted_at is null;

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
  cost numeric(10, 2),
  added_at timestamptz not null default now(),
  consumed_at timestamptz not null default now()
);

-- Groceries a meal needs but that aren't in the inventory yet. Items here are
-- chosen from allowed_items; a meal is cookable only when it has no rows here.
-- Buying them via purchase_wishlist converts each row into a stock entry plus
-- a regular inventory allocation, then deletes the row.
create table if not exists meal_wishlist (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  allowed_item_id uuid not null references allowed_items(id) on delete cascade,
  unit text not null,
  quantity double precision not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists meal_wishlist_meal_item_uniq
  on meal_wishlist (meal_id, allowed_item_id, unit);

alter table meal_wishlist disable row level security;

create index if not exists meal_consumption_meal_idx on meal_consumption (meal_id);

alter table meal_consumption add column if not exists cost numeric(10, 2);

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
-- meal_consumption so it can be exactly restored by uncook_meal. Consumed
-- stock entries are kept (soft-deleted via consumed_at) to preserve history.
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
  if exists (
    select 1 from meal_wishlist where meal_id = p_meal_id
  ) then
    raise exception 'Meal still has wishlist ingredients that have not been bought.';
  end if;

  update meals set cooked = true where id = p_meal_id and cooked = false;

  for a in
    select item_id, unit, quantity
    from allocations
    where meal_id = p_meal_id
  loop
    remaining := a.quantity;
    for e in
      select id, quantity, expiry_date, added_at, cost
      from stock_entries
      where item_id = a.item_id and unit = a.unit
        and consumed_at is null and deleted_at is null
      order by expiry_date asc nulls last, added_at asc
      for update
    loop
      exit when remaining <= 0;
      take := least(e.quantity, remaining);
      insert into meal_consumption
        (meal_id, stock_entry_id, item_id, unit, quantity, expiry_date, cost, added_at)
      values
        (p_meal_id, e.id, a.item_id, a.unit, take, e.expiry_date, e.cost, e.added_at);
      if take >= e.quantity then
        update stock_entries set consumed_at = now() where id = e.id;
      else
        update stock_entries set quantity = quantity - take where id = e.id;
      end if;
      remaining := remaining - take;
    end loop;
  end loop;
end;
$$;

-- Marks a meal as uncooked and restores the exact stock entries that
-- cook_meal consumed. Entries that still exist (possibly partially consumed)
-- are revived by adding back the consumed quantity keyed on stock_entry_id;
-- entries hard-deleted before soft-deletes existed are re-inserted from the
-- snapshotted attributes in meal_consumption.
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
    select
      m.stock_entry_id,
      m.item_id,
      m.unit,
      m.expiry_date,
      m.cost,
      m.added_at,
      sum(m.quantity) as quantity
    from meal_consumption m
    where m.meal_id = p_meal_id
    group by m.stock_entry_id, m.item_id, m.unit, m.expiry_date, m.cost, m.added_at
  loop
    if c.stock_entry_id is null or not exists (select 1 from stock_entries where id = c.stock_entry_id) then
      insert into stock_entries (item_id, unit, quantity, expiry_date, cost, added_at)
      values (c.item_id, c.unit, c.quantity, c.expiry_date, c.cost, c.added_at);
    else
      update stock_entries
      set quantity = quantity + c.quantity,
          consumed_at = null
      where id = c.stock_entry_id;
    end if;
  end loop;

  delete from meal_consumption where meal_id = p_meal_id;
  update meals set cooked = false where id = p_meal_id and cooked = true;
end;
$$;

-- Permanently deletes every stock entry, wiping both current inventory and
-- purchase history. meal_consumption keeps its rows (stock_entry_id is set
-- to null on delete) so cooked meals can still be uncooked.
create or replace function clear_purchase_history()
returns void
language sql
security definer
set search_path = public
as $$
  delete from stock_entries where id is not null;
$$;

-- Converts wishlist rows into stock entries plus regular inventory
-- allocations for each meal. p_ids and p_qtys are parallel arrays: p_qtys[i]
-- is the quantity actually purchased for the wishlist row p_ids[i], so a row
-- can be partially bought (its remaining quantity stays on the wishlist) or
-- over-bought (the surplus lands as free, unallocated stock).
--
-- Per row, with v_bought = p_qtys[i] and v_wish = the row's quantity:
--   stock entry qty = v_bought (the full purchased amount)
--   allocation qty = least(v_bought, v_wish) (the meal only needs v_wish)
--   if v_bought < v_wish the wishlist row is reduced to v_wish - v_bought,
--   otherwise it is deleted. Cooking later deducts only the allocation, so any
--   over-purchased excess stays in household inventory.
--
-- The supplied cost is treated as the TOTAL for all purchased rows and is split
-- proportionally by the purchased (not wishlist) quantity; the last row absorbs
-- rounding so the shares always sum exactly to the total.
create or replace function purchase_wishlist(p_ids uuid[], p_qtys double precision[], p_expiry date, p_cost numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  v_item_id uuid;
  v_bought double precision;
  v_alloc double precision;
  v_total_qty double precision := 0;
  v_rows bigint := 0;
  v_i bigint := 0;
  v_spent numeric := 0;
  v_share numeric;
begin
  if array_length(p_qtys, 1) is null or array_length(p_ids, 1) is null then
    return;
  end if;
  if array_length(p_qtys, 1) <> array_length(p_ids, 1) then
    raise exception 'purchase_wishlist: p_ids and p_qtys must have the same length.';
  end if;

  -- Total purchased quantity and number of processable rows (bought > 0),
  -- used to split p_cost proportionally by purchased quantity. Computed once
  -- so the per-row denominator is stable; the last processable row absorbs
  -- rounding so the shares sum exactly to p_cost.
  with indexed as (
    select mw.id, p_qtys[i] as bought
    from meal_wishlist mw
    cross join unnest(p_ids) with ordinality as u(id, i)
    where mw.id = u.id
  )
  select coalesce(sum(bought), 0), count(*)
  into v_total_qty, v_rows
  from indexed
  where bought is not null and bought > 0;

  for w in
    with indexed as (
      select mw.id, mw.meal_id, mw.unit, mw.quantity, ai.name,
             p_qtys[i] as bought
      from meal_wishlist mw
      join allowed_items ai on ai.id = mw.allowed_item_id
      cross join unnest(p_ids) with ordinality as u(id, i)
      where mw.id = u.id
    )
    select id, meal_id, unit, quantity, name, bought
    from indexed
    order by id
    for update
  loop
    v_bought := w.bought;

    if v_bought is null or v_bought <= 0 then
      -- Skip rows the caller passed with no purchase share; the wishlist row
      -- is left untouched.
      continue;
    end if;

    v_i := v_i + 1;
    v_alloc := least(v_bought, w.quantity);

    select id into v_item_id from items where lower(name) = lower(trim(w.name));
    if v_item_id is null then
      insert into items (name) values (trim(w.name)) returning id into v_item_id;
    end if;

    if p_cost is null then
      v_share := null;
    else
      v_share := round((p_cost * v_bought / nullif(v_total_qty, 0))::numeric, 2);
      if v_i = v_rows then
        v_share := p_cost - v_spent;
      end if;
      v_spent := v_spent + coalesce(v_share, 0);
    end if;

    insert into stock_entries (item_id, unit, quantity, expiry_date, cost)
    values (v_item_id, w.unit, v_bought, p_expiry, v_share);

    insert into allocations (meal_id, item_id, unit, quantity)
    values (w.meal_id, v_item_id, w.unit, v_alloc)
    on conflict (meal_id, item_id, unit) do update
      set quantity = allocations.quantity + excluded.quantity;

    if v_bought < w.quantity then
      update meal_wishlist set quantity = quantity - v_bought where id = w.id;
    else
      delete from meal_wishlist where id = w.id;
    end if;
  end loop;
end;
$$;

grant execute on function get_or_create_item(text) to anon, authenticated;
grant execute on function cook_meal(uuid) to anon, authenticated;
grant execute on function uncook_meal(uuid) to anon, authenticated;
grant execute on function clear_purchase_history() to anon, authenticated;
grant execute on function purchase_wishlist(uuid[], double precision[], date, numeric) to anon, authenticated;
