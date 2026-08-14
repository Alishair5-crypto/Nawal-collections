# NAWAL COLLECTIONS — Production Store

This build keeps the existing Supabase schema and Vercel deployment model while fixing the store flow:

- Real Supabase product records only; no seed/demo products are inserted by the frontend.
- UUID-safe cart and stale-cart cleanup.
- Product detail modal and reliable collection navigation.
- Shop / Luxury / Lawn 3PC / Sale filtering.
- Add to Bag → Cart → Checkout → Supabase order → WhatsApp.
- Customer signup/login with Supabase Auth.
- Admin access controlled by `profiles.role = 'admin'`.
- Admin product create/edit/archive and image upload to `product-images`.
- Automatic SOLD OUT presentation when stock is zero.
- Admin order status updates and store settings.

## Environment variables

Set these in Vercel for Production and Preview:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (use the Supabase Publishable key)

## Supabase

The existing tables are expected:
`profiles`, `products`, `orders`, `order_items`, `store_settings`.

Keep RLS enabled and expose the required `public` tables through Data API.

For secure stock decrement, run `supabase/production_migration.sql` once in Supabase SQL Editor.

## Important

The frontend does not auto-seed products. Add real products from Admin after deployment.
