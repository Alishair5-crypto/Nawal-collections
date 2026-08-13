# NAWAL COLLECTIONS — WhatsApp Cart Ecommerce

## Included
- Premium responsive storefront
- Product catalog, search, category filters
- Wishlist and persistent cart using browser localStorage
- Functional checkout form
- Order creation and order-status management
- Admin dashboard
- Product add/edit/delete
- Product image URL replacement
- Inventory/stock fields
- Customer/order overview
- Mobile navigation
- SEO-ready HTML metadata
- Vercel/Vite deployment configuration

## Run locally
npm install
npm run dev

## Production build
npm run build

## Vercel
Import the GitHub repository into Vercel. Framework: Vite. Build: `npm run build`. Output: `dist`.

## Important production integration
This build intentionally does not fake a payment provider or cloud database. For a real multi-user store, connect a database/auth service and a payment gateway. The UI and local working flows are already wired so those services can be attached without redesigning the storefront.

\n## WhatsApp Cart
Default WhatsApp order number: `923046093592`.
Customers add products to cart and click **ORDER CART ON WHATSAPP**. A pre-filled cart message opens in WhatsApp. The client can change the number from Admin → Store Settings.
\n## Client handover
The Admin panel includes editable Store Settings and Product Editor. Replace brand name, WhatsApp number, copyright, product data and product image URLs after the trial.
