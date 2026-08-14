-- Run once after the existing schema is in place.
-- This RPC safely decrements stock for an order without granting clients direct UPDATE access to products.
create or replace function public.decrement_product_stock(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity < 1 then raise exception 'Quantity must be positive'; end if;
  update public.products
  set stock = stock - p_quantity, updated_at = now()
  where id = p_product_id and is_active = true and stock >= p_quantity;
  if not found then raise exception 'Insufficient stock for product %', p_product_id; end if;
end;
$$;
revoke all on function public.decrement_product_stock(uuid, integer) from public;
grant execute on function public.decrement_product_stock(uuid, integer) to authenticated;
