# NAWAL COLLECTIONS — Original Front + Production Commerce

This build keeps the original ATELIER+ storefront visual design from the project's original baseline and adds a production commerce layer around it.

## Customer flow
1. Browse without login.
2. Open product detail.
3. Choose quantity and Add to Cart / Buy It Now.
4. Cart drawer shows View Cart, Checkout and Continue Shopping.
5. Checkout collects contact, delivery and payment information.
6. Login/Create Account is requested only at the final order-completion step.
7. Order is saved to Supabase before WhatsApp is offered.
8. Order confirmation window provides `ORDER ON WHATSAPP`.
9. Floating WhatsApp button is always available.

WhatsApp: 03039249849 (stored/used as +92 303 9249849 for wa.me URLs).

## Admin
The Admin button requires an authenticated user whose `profiles.role` is `admin`.
Admin features include dashboard KPIs, product add/edit/deactivate, stock control, image URL + additional image URLs, sale price, order status, customer profiles and store settings reference.

## Supabase
Required Vercel environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Run `supabase/production_migration.sql` once in Supabase. It creates the atomic order + stock-decrement RPC and adds the required minimum RLS policies without disabling RLS.

Products must exist in `public.products`; this app does not use fake client-side seed IDs.
