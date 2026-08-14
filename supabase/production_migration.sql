-- NAWAL COLLECTIONS production hardening
-- Run this in Supabase SQL Editor after the base schema is already installed.

create or replace function public.decrement_product_stock(
  p_product_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Invalid quantity';
  end if;

  update public.products
  set stock = stock - p_quantity,
      updated_at = now()
  where id = p_product_id
    and is_active = true
    and stock >= p_quantity
  returning stock into new_stock;

  if new_stock is null then
    raise exception 'Insufficient stock';
  end if;

  return new_stock;
end;
$$;

grant execute on function public.decrement_product_stock(uuid, integer) to authenticated;

-- Product reads are public; writes remain admin-only via existing RLS policies.
-- Keep RLS enabled.
