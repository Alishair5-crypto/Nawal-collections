-- Run once in Supabase SQL Editor to publish the original starter catalogue.
-- This creates real UUID-backed product rows; there are no client-side fake IDs.
insert into public.products (name, description, category, price, sale_price, stock, image_url, badge, is_active)
select * from (values
('Lawn Signature 3 Piece','Original starter catalogue piece','Lawn 3PC',4399,2799,18,'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=88','20% OFF',true),
('Embroidered Summer Set','Original starter catalogue piece','Lawn 3PC',4599,3199,12,'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=88','NEW',true),
('Printed Luxe Shirt','Original starter catalogue piece','Shirts',2499,1899,26,'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=88','BEST SELLER',true),
('Ready To Wear Ensemble','Original starter catalogue piece','Ready To Wear',2999,2499,9,'https://images.unsplash.com/photo-1585488433779-8c0f0b0b0a74?auto=format&fit=crop&w=1000&q=88','20% OFF',true),
('Luxury Embroidered Set','Original starter catalogue piece','Luxury',5499,4299,7,'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=1000&q=88','EXCLUSIVE',true),
('Premium Linen 2 Piece','Original starter catalogue piece','Winter',3499,2899,15,'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=88','NEW',true)
) as v(name,description,category,price,sale_price,stock,image_url,badge,is_active)
where not exists (select 1 from public.products limit 1);
update public.store_settings set whatsapp_number='923039249849' where id=1;
