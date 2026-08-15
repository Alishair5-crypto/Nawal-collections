# NAWAL COLLECTIONS — Clean Production Candidate

This package keeps the existing storefront architecture and adds the BinNoor-style buying flow without demo products.

## Vercel environment variables already required
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Included behavior
- Browse without customer login.
- Product details → Add to Bag → Cart → Checkout.
- Customer login/create account appears at checkout when required.
- After authentication, checkout remains open so entered checkout data is preserved.
- Order + order items are written to Supabase before WhatsApp opens.
- WhatsApp destination is 923039249849 (03039249849).
- Stock is decremented through `decrement_product_stock` RPC.
- Stock 0 displays SOLD OUT and disables Add to Bag.
- Admin can add/edit/delete products and upload a product image.
- Admin Orders and Customers tabs read from Supabase.
- No seed/demo product insertion.
- No placeholder image URLs.
- No localhost URLs or service-role/secret key in the frontend.

## Required one-time Supabase migration
Run `supabase/production_migration.sql` in Supabase SQL Editor. It creates the secure stock-decrement RPC and updates `store_settings.whatsapp_number` to 923039249849.

Keep RLS enabled.
