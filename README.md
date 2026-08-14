# NAWAL COLLECTIONS — Stable Production Build

This build fixes the storefront navigation and uses Supabase as the source of truth.

## Vercel environment variables
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Live behavior
- Product card click opens product details.
- Shop / category / Luxury navigation scrolls to the Shop section and applies the selected filter.
- Cart only accepts real UUID-backed database products.
- Checkout creates an order and order items in Supabase, then opens WhatsApp using the store number.
- Stock 0 is shown as SOLD OUT and Add to Bag is disabled.
- Admin product editor supports add/edit/delete and image upload.

## Supabase
Run `supabase/production_migration.sql` once if you want secure server-side stock decrementing. Do not disable RLS.
