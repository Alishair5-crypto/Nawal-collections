-- NAWAL COLLECTIONS: production-safe checkout, RLS and stock handling.
-- Run once in Supabase SQL Editor.

create or replace function public.create_order_and_decrement_stock(
  p_order_number text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_city text,
  p_address text,
  p_notes text,
  p_payment_method text,
  p_items jsonb
)
returns table(id uuid, order_number text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_price numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(jsonb_array_length(p_items),0)=0 then raise exception 'Cart is empty'; end if;

  insert into public.orders(order_number,customer_id,customer_name,customer_phone,customer_email,city,address,notes,subtotal,shipping,total,payment_method,status)
  values(p_order_number,auth.uid(),p_customer_name,p_customer_phone,p_customer_email,p_city,p_address,p_notes,0,0,0,p_payment_method,'new')
  returning orders.id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1,(v_item->>'quantity')::integer);
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and is_active=true for update;
    if not found then raise exception 'Product is no longer available'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_price := coalesce(v_product.sale_price,v_product.price);
    v_subtotal := v_subtotal + (v_price*v_qty);

    insert into public.order_items(order_id,product_id,product_name,product_image,price,quantity,total)
    values(v_order_id,v_product.id,v_product.name,v_product.image_url,v_price,v_qty,(v_price*v_qty));

    update public.products set stock = stock - v_qty, updated_at = now() where id=v_product.id;
  end loop;

  update public.orders set subtotal=v_subtotal, shipping=0, total=v_subtotal where id=v_order_id;
  return query select v_order_id,p_order_number,v_subtotal;
end;
$$;

revoke all on function public.create_order_and_decrement_stock(text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_order_and_decrement_stock(text,text,text,text,text,text,text,text,jsonb) to authenticated;

-- RLS policies: keep RLS enabled; these policies only grant the minimum storefront/admin access.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;

-- Products: public storefront can read active items.
do $$begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Public can view active products') then
    create policy "Public can view active products" on public.products for select to anon, authenticated using (is_active=true);
  end if;
end$$;

-- Orders: customer can read own orders; admin can manage.
do $$begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Users can view own orders') then
    create policy "Users can view own orders" on public.orders for select to authenticated using (customer_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='Admins can manage orders') then
    create policy "Admins can manage orders" on public.orders for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
end$$;

-- Order items: customer can view own items; admin can manage.
do $$begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='order_items' and policyname='Users can view own order items') then
    create policy "Users can view own order items" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_items.order_id and o.customer_id=auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='order_items' and policyname='Admins can manage order items') then
    create policy "Admins can manage order items" on public.order_items for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
end$$;

update public.store_settings set whatsapp_number='923039249849' where id=1;
