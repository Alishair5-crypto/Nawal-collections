import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Truck, RotateCcw, Settings, Package, Users, Image as ImageIcon, LogOut, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabase';
import './styles.css';

const money = n => `PKR ${Number(n || 0).toLocaleString()}`;
const WA_DEFAULT = '923039249849';
const CATALOG = [
  {name:'Summer 26', children:['Lawn 3PC','2Pcs Plain Trouser','Ready To Wear','Shirt & 2Pcs']},
  {name:'Lawn 3PC', children:['SANAM','Kashish','Afsana','Laraib','DilKash','JANNAT','Delnaz','Noor','Zulaykha','Makhmal','FARIS','ZARA','Gulabo','Kismat','ISHARA','JANAN','Didar','Aizal','GULL RUKH','Husna','Sapna','GULAAL','Gul Bahar','Suhana','Gull e Zahra','Mahtab','LAAL','Noor Jahan','Gul e Khaas','Guluna','Kahani','LARA','Gul Nar','Gul Badan','Luxury']},
  {name:'Luxury', children:['Gulbahar','Gulshan','Surkhaab','Nayab','Resham','Layla','Jazmin','Aura','Darshan']},
  {name:'Stitched', children:[]},
  {name:'Winter', children:['KHADDAR','Golden Shamray','Linen Bana Dora','LINEN 2Pcs']}
];
const validUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const productFromRow = r => ({
  id:r.id,name:r.name,category:r.category||'Uncategorized',description:r.description||'',
  price:Number(r.sale_price ?? r.price ?? 0),regularPrice:Number(r.price ?? 0),stock:Number(r.stock ?? 0),
  badge:r.badge||'',img:r.image_url||'',images:Array.isArray(r.images)?r.images:[]
});

function App(){
  const [products,setProducts]=useState([]); const [cart,setCart]=useState(()=>safeCart());
  const [wish,setWish]=useState(()=>JSON.parse(localStorage.getItem('nawal_wish')||'[]'));
  const [settings,setSettings]=useState({brand_name:'NAWAL COLLECTIONS',whatsapp_number:WA_DEFAULT,copyright_text:'ALISHAIR5'});
  const [session,setSession]=useState(null); const [profile,setProfile]=useState(null);
  const [query,setQuery]=useState(''); const [filter,setFilter]=useState('All');
  const [selected,setSelected]=useState(null); const [cartOpen,setCartOpen]=useState(false);
  const [authOpen,setAuthOpen]=useState(false); const [adminOpen,setAdminOpen]=useState(false); const [checkoutOpen,setCheckoutOpen]=useState(false);
  const [menu,setMenu]=useState(false); const [catalogOpen,setCatalogOpen]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [pendingCheckoutAuth,setPendingCheckoutAuth]=useState(false);

  function safeCart(){
    try { const raw=JSON.parse(localStorage.getItem('nawal_cart')||'[]'); return Array.isArray(raw)?raw.filter(x=>validUuid(x?.id)).map(x=>({...x,variantKey:x.variantKey||`${x.id}|${x.size||'Standard'}|${x.color||'Standard'}`})):[]; } catch { return []; }
  }
  useEffect(()=>localStorage.setItem('nawal_cart',JSON.stringify(cart)),[cart]);
  useEffect(()=>localStorage.setItem('nawal_wish',JSON.stringify(wish)),[wish]);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const {data:{session:s}}=await supabase.auth.getSession();
      if(!alive)return; setSession(s||null);
      if(s) await loadProfile(s.user.id);
      await Promise.all([loadProducts(),loadSettings()]);
      if(alive)setLoading(false);
    })();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_e,s)=>{ setSession(s||null); setProfile(null); if(s) await loadProfile(s.user.id); });
    return ()=>{alive=false;subscription.unsubscribe()};
  },[]);

  async function loadProfile(id){ const {data,error}=await supabase.from('profiles').select('id,full_name,phone,role').eq('id',id).maybeSingle(); if(!error)setProfile(data||null); return data||null; }
  async function loadSettings(){ const {data}=await supabase.from('store_settings').select('*').eq('id',1).maybeSingle(); if(data){const number=(!data.whatsapp_number||String(data.whatsapp_number).replace(/\D/g,'')==='923046093592')?WA_DEFAULT:data.whatsapp_number;setSettings({...data,whatsapp_number:number});} }
  async function loadProducts(){
    const {data,error}=await supabase.from('products').select('*').eq('is_active',true).order('created_at',{ascending:false});
    if(error){setError(error.message);return;}
    const rows=(data||[]).map(productFromRow); setProducts(rows);
    setCart(prev=>prev.filter(i=>rows.some(p=>p.id===i.id)).map(i=>{const p=rows.find(x=>x.id===i.id);return {...p,size:i.size||'Standard',color:i.color||'Standard',variantKey:i.variantKey||`${i.id}|${i.size||'Standard'}|${i.color||'Standard'}`,q:Math.min(i.q,p.stock)};}).filter(i=>i.q>0));
  }
  const categories=useMemo(()=>['All',...Array.from(new Set(products.map(p=>p.category).filter(Boolean)))], [products]);
  const shown=useMemo(()=>products.filter(p=>{
    const f=filter==='Sale' ? p.regularPrice>p.price : filter==='All' ? true : p.category===filter;
    return f && p.name.toLowerCase().includes(query.toLowerCase());
  }),[products,filter,query]);
  const total=cart.reduce((s,p)=>s+p.price*p.q,0); const count=cart.reduce((s,p)=>s+p.q,0);

  const goShop=(next='All')=>{setQuery('');setFilter(next);setMenu(false);setCatalogOpen(false);requestAnimationFrame(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth',block:'start'}));};
  function addToCart(p){
    if(!p?.id || !validUuid(p.id)) return setError('This product is not linked to the database yet.');
    if(p.stock<=0) return;
    const variantKey=`${p.id}|${p.size||'Standard'}|${p.color||'Standard'}`;
    setCart(prev=>{ const f=prev.find(x=>x.variantKey===variantKey); if(f)return prev.map(x=>x.variantKey===variantKey?{...x,q:Math.min(x.q+1,p.stock)}:x); return [...prev,{...p,variantKey,q:1}]; });
    setCartOpen(true); setSelected(null);
  }
  function toggleWish(id){setWish(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);}
  async function openAdmin(){ if(!session){setAuthOpen(true);return;} const p=await loadProfile(session.user.id); const role=p?.role; if(role!=='admin'){setError('This account is not an authorized administrator.');return;} setAdminOpen(true); }

  return <div>
    <div className="announce">FREE SHIPPING ON ORDERS ABOVE PKR 2,500 <span>•</span> EASY RETURNS</div>
    <header>
      <button className="icon mobile" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
      <button className="logo brandButton" onClick={()=>goShop('All')}>{settings.brand_name}<span>+</span></button>
      <nav className={menu?'open':''}>
        <button onClick={()=>goShop('All')}>NEW IN</button>
        <button onClick={()=>{setCatalogOpen(v=>!v);setMenu(false)}}>SUMMER 26 <ChevronDown size={13}/></button>
        <button onClick={()=>{setCatalogOpen(v=>!v);setMenu(false)}}>LAWN 3PC <ChevronDown size={13}/></button>
        <button onClick={()=>{setCatalogOpen(v=>!v);setMenu(false)}}>LUXURY <ChevronDown size={13}/></button>
        <button onClick={()=>goShop('Stitched')}>STITCHED</button>
        <button onClick={()=>{setCatalogOpen(v=>!v);setMenu(false)}}>WINTER <ChevronDown size={13}/></button>
        <button onClick={()=>goShop('Sale')}>SALE</button>
      </nav>
      {catalogOpen&&<div className="megaCatalog"><div className="megaInner">{CATALOG.map(group=><div className="megaGroup" key={group.name}><button className="megaTitle" onClick={()=>{goShop(group.name==='Summer 26'?'All':group.name);setCatalogOpen(false)}}>{group.name}</button>{group.children.map(child=><button key={child} onClick={()=>{setQuery(child);setFilter('All');setCatalogOpen(false);requestAnimationFrame(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth',block:'start'}))}}>{child}</button>)}</div>)}</div></div>}
      <div className="actions"><div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products"/></div><button className="icon" onClick={()=>setAuthOpen(true)}><User/></button><button className="icon" onClick={()=>alert(`${wish.length} saved item(s)`)}><Heart/><b>{wish.length}</b></button><button className="icon" onClick={()=>setCartOpen(true)}><ShoppingBag/><b>{count}</b></button><button className="adminBtn" onClick={openAdmin}><Settings size={16}/></button></div>
    </header>
    {error&&<div className="errorBar"><AlertCircle size={16}/>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
    <main>
      <section className="hero"><div className="heroCopy"><p className="eyebrow">THE NEW SEASON</p><h1>Elegance,<br/><em>reimagined.</em></h1><p>Contemporary Pakistani fashion designed for effortless everyday luxury.</p><button className="primary" onClick={()=>goShop('All')}>SHOP COLLECTION <ArrowRight size={17}/></button></div></section>
      <section className="intro"><p className="eyebrow">CURATED FOR YOU</p><h2>New season. New attitude.</h2><p>Discover refined silhouettes, expressive prints and premium fabrics.</p></section>
      <section id="shop" className="shop"><div className="sectionHead"><div><p className="eyebrow">SHOP</p><h2>Latest Collection</h2></div><div className="filters"><button className={filter==='All'?'active':''} onClick={()=>setFilter('All')}>All</button>{categories.filter(c=>c!=='All').map(c=><button className={filter===c?'active':''} onClick={()=>setFilter(c)} key={c}>{c}</button>)}<button className={filter==='Sale'?'active':''} onClick={()=>setFilter('Sale')}>Sale</button></div></div>
        {loading?<div className="empty">Loading products…</div>:<div className="grid">{shown.length?shown.map(p=><article className="card" key={p.id}><div className="productHit" role="button" tabIndex="0" onClick={()=>setSelected(p)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelected(p)}}><div className="photo"><>{p.img?<img src={p.img} alt={p.name}/>:<div className="imageMissing" aria-label="Product image unavailable">IMAGE NOT AVAILABLE</div>}</>{p.badge&&<span>{p.badge}</span>}{p.stock<=0&&<strong className="soldBadge">SOLD OUT</strong>}<button className="wish overlay" onClick={e=>{e.stopPropagation();toggleWish(p.id)}}>{wish.includes(p.id)?'♥':'♡'}</button></div><div className="meta"><p>{p.category}</p><h3>{p.name}</h3><strong>{money(p.price)}</strong>{p.regularPrice>p.price&&<del>{money(p.regularPrice)}</del>}<small>{p.stock>0?`${p.stock} available`:'Sold out'}</small></div></div><button className="quick" onClick={()=>addToCart(p)} disabled={!p.stock}>{p.stock?'ADD TO BAG':'SOLD OUT'}</button></article>):<div className="emptyCollection"><h3>No products found.</h3><p>Try another collection or search term.</p></div>}</div>}
      </section>
      <section className="trust"><div><Truck/><b>Fast Delivery</b><span>Nationwide shipping</span></div><div><ShieldCheck/><b>Secure Checkout</b><span>Protected order data</span></div><div><RotateCcw/><b>Easy Returns</b><span>Simple return process</span></div></section>
      <section className="feature"><div><p className="eyebrow">THE COLLECTION EDIT</p><h2>Made to be remembered.</h2><p>Statement pieces, considered details and versatile styling for every occasion.</p><button className="outline" onClick={()=>goShop('Luxury')}>EXPLORE LUXURY <ArrowRight size={17}/></button></div></section>
      <section className="categories"><p className="eyebrow">EXPLORE</p><h2>Shop by mood</h2><div className="catgrid">{['Lawn 3PC','Ready To Wear','Luxury','Winter'].map(c=>{const p=products.find(x=>x.category===c);return <button key={c} onClick={()=>goShop(c)}>{p?.img?<img src={p.img} alt={c}/>:<div className="categoryImageMissing">{c}</div>}<span>{c}<ArrowRight size={16}/></span></button>})}</div></section>
      <section className="newsletter"><p className="eyebrow">STAY IN THE LOOP</p><h2>First access to every drop.</h2><div><input aria-label="Email address" placeholder="Email address"/><button className="primary" onClick={()=>window.open(`https://wa.me/${String(settings.whatsapp_number||WA_DEFAULT).replace(/\D/g,'')}?text=${encodeURIComponent('Please add me to the NAWAL COLLECTIONS updates list.')}`,'_blank')}>JOIN ON WHATSAPP</button></div></section>
    </main>
    <footer><div className="logo">{settings.brand_name}<span>+</span></div><div><h4>SHOP</h4><button onClick={()=>goShop('All')}>New In</button><button onClick={()=>goShop('All')}>Collections</button><button onClick={()=>goShop('Sale')}>Sale</button></div><div><h4>HELP</h4><button onClick={()=>window.open(`https://wa.me/${String(settings.whatsapp_number||WA_DEFAULT).replace(/\D/g,'')}?text=${encodeURIComponent('I have a question about shipping.')}`,'_blank')}>Shipping</button><button onClick={()=>window.open(`https://wa.me/${String(settings.whatsapp_number||WA_DEFAULT).replace(/\D/g,'')}?text=${encodeURIComponent('I have a question about returns.')}`,'_blank')}>Returns</button><button onClick={()=>window.open(`https://wa.me/${settings.whatsapp_number||WA_DEFAULT}`,'_blank')}>Contact</button></div><div><h4>FOLLOW</h4><button onClick={()=>settings.instagram_url&&window.open(settings.instagram_url,'_blank')}>Instagram</button><button onClick={()=>settings.facebook_url&&window.open(settings.facebook_url,'_blank')}>Facebook</button><button onClick={()=>window.open(`https://wa.me/${settings.whatsapp_number||WA_DEFAULT}`,'_blank')}>WhatsApp</button></div><small>© 2026 {settings.brand_name}. COPYRIGHT {settings.copyright_text}.</small></footer>

    {selected&&<ProductModal p={selected} onClose={()=>setSelected(null)} onAdd={addToCart}/>} 
    {cartOpen&&<CartDrawer cart={cart} setCart={setCart} total={total} onClose={()=>setCartOpen(false)} onCheckout={()=>{setCheckoutOpen(true);setCartOpen(false)}}/>}
    {checkoutOpen&&<Checkout total={total} user={session?.user} profile={profile} onClose={()=>setCheckoutOpen(false)} cart={cart} settings={settings} onRequireAuth={()=>{setPendingCheckoutAuth(true);setAuthOpen(true)}} onComplete={async order=>{setCart([]);setCheckoutOpen(false);if(order?.wa)window.open(order.wa,'_blank');await loadProducts();}}/>}
    {authOpen&&<AuthModal onClose={()=>setAuthOpen(false)} onSignedIn={async s=>{setSession(s);await loadProfile(s.user.id);setAuthOpen(false);if(pendingCheckoutAuth){setPendingCheckoutAuth(false);setCheckoutOpen(true);}}}/>}
    {adminOpen&&<Admin onClose={()=>setAdminOpen(false)} products={products} setProducts={setProducts} ordersRefresh={async()=>{}} settings={settings} setSettings={setSettings} profile={profile}/>} 
  </div>
}

function ProductModal({p,onClose,onAdd}){const[sz,setSz]=useState('');const[color,setColor]=useState('');const needsSize=/stitched|ready|shirt/i.test(p.category);const options=['S','M','L','XL'];const colors=['Black','White','Blue','Green','Yellow','Pink'];return <div className="modalShade" onClick={onClose}><div className="modal productModal" onClick={e=>e.stopPropagation()}><div className="modalHead"><h2>{p.name}</h2><button className="icon" onClick={onClose}><X/></button></div><div className="productDetailGrid"><div>{p.img?<img className="detailImage" src={p.img} alt={p.name}/>:<div className="detailImage imageMissing">IMAGE NOT AVAILABLE</div>}</div><div className="detailInfo"><p className="eyebrow">{p.category}</p><h2>{p.name}</h2><div className="detailPrice"><strong>{money(p.price)}</strong>{p.regularPrice>p.price&&<del>{money(p.regularPrice)}</del>}</div>{p.badge&&<span className="detailBadge">{p.badge}</span>}<p>{p.description||'Premium fashion piece from NAWAL COLLECTIONS.'}</p>{needsSize&&<label>Size<select value={sz} onChange={e=>setSz(e.target.value)}><option value="">Select size</option>{options.map(x=><option key={x}>{x}</option>)}</select></label>}<label>Color<select value={color} onChange={e=>setColor(e.target.value)}><option value="">Select color</option>{colors.map(x=><option key={x}>{x}</option>)}</select></label><p className="detailStock">{p.stock>0?`${p.stock} available`:'SOLD OUT'}</p><button className="primary full" disabled={!p.stock|| (needsSize&&!sz) || !color} onClick={()=>onAdd({...p,size:sz||'Standard',color:color||'Standard'})}>{p.stock?'ADD TO BAG':'SOLD OUT'}</button></div></div></div></div>}
function CartDrawer({cart,setCart,total,onClose,onCheckout}){return <><div className="shade" onClick={onClose}/><aside className="drawer"><div className="drawerHead"><h2>Your Bag</h2><button className="icon" onClick={onClose}><X/></button></div>{!cart.length?<div className="empty">Your bag is empty.</div>:<><div className="bagList">{cart.map(p=><div className="line" key={p.variantKey||p.id}><img src={p.img} alt=""/><div><h4>{p.name}</h4><p>{money(p.price)}</p><small>{p.size&&p.size!=='Standard'?`Size: ${p.size} · `:''}{p.color&&p.color!=='Standard'?`Color: ${p.color}`:''}</small><div className="qty"><button onClick={()=>setCart(c=>c.map(i=>i.variantKey===p.variantKey?{...i,q:Math.max(1,i.q-1)}:i))}><Minus size={14}/></button><span>{p.q}</span><button onClick={()=>setCart(c=>c.map(i=>i.variantKey===p.variantKey?{...i,q:Math.min(p.stock,i.q+1)}:i))}><Plus size={14}/></button><button onClick={()=>setCart(c=>c.filter(i=>i.id!==p.id))}><Trash2 size={14}/></button></div></div></div>)}</div><div className="checkout"><div><span>Subtotal</span><b>{money(total)}</b></div><button className="primary full" onClick={onCheckout}>CHECKOUT <ArrowRight size={17}/></button></div></>}</aside></>}

function Checkout({total,user,profile,onClose,cart,settings,onRequireAuth,onComplete}){const[f,setF]=useState({name:profile?.full_name||'',phone:profile?.phone||'',city:'',address:'',payment:'Cash on Delivery',notes:''});const[busy,setBusy]=useState(false);const ok=f.name&&f.phone&&f.city&&f.address;
 async function submit(){if(!ok||busy)return;setBusy(true);try{if(!user){onRequireAuth();return;}
const {data:{user:currentUser}}=await supabase.auth.getUser();if(!currentUser) {onRequireAuth();return;}const orderNumber=`NC-${Date.now().toString().slice(-8)}`;const subtotal=total;const payload={order_number:orderNumber,customer_id:currentUser.id,customer_name:f.name,customer_phone:f.phone,customer_email:currentUser.email||null,city:f.city,address:f.address,notes:f.notes||null,subtotal,shipping:0,total,payment_method:f.payment,status:'new'};const {data:order,error}=await supabase.from('orders').insert(payload).select().single();if(error)throw error;const items=cart.map(p=>({order_id:order.id,product_id:p.id,product_name:`${p.name}${p.size&&p.size!=='Standard'?` — Size: ${p.size}`:''}${p.color&&p.color!=='Standard'?` — Color: ${p.color}`:''}`,product_image:p.img,price:p.price,quantity:p.q,total:p.price*p.q}));const {error:itemError}=await supabase.from('order_items').insert(items);if(itemError)throw itemError;for(const p of cart){const {error:stockError}=await supabase.rpc('decrement_product_stock',{p_product_id:p.id,p_quantity:p.q});if(stockError)throw stockError;}const lines=cart.map((p,i)=>`${i+1}. ${p.name}${p.size&&p.size!=='Standard'?` | Size: ${p.size}`:''}${p.color&&p.color!=='Standard'?` | Color: ${p.color}`:''} × ${p.q} — ${money(p.price*p.q)}`).join('\n');const msg=`${settings.brand_name||'NAWAL COLLECTIONS'}\nOrder: ${orderNumber}\n\n${lines}\n\nTotal: ${money(total)}\nName: ${f.name}\nPhone: ${f.phone}\nCity: ${f.city}\nAddress: ${f.address}\nPayment: ${f.payment}\nNotes: ${f.notes||'-'}`;const wa=`https://wa.me/${String(settings.whatsapp_number||WA_DEFAULT).replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;await onComplete({wa});}catch(e){alert(e.message||'Order could not be created.');}finally{setBusy(false)}}
 return <div className="modalShade"><div className="modal"><div className="modalHead"><h2>Checkout</h2><button className="icon" onClick={onClose}><X/></button></div><div className="formGrid">{[['name','Full name'],['phone','Mobile / WhatsApp'],['city','City'],['address','Complete delivery address']].map(([k,l])=><label key={k}>{l}<input value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}</div><label>Payment<select value={f.payment} onChange={e=>setF({...f,payment:e.target.value})}><option>Cash on Delivery</option><option>JazzCash</option><option>Easypaisa</option><option>Bank Transfer</option></select></label><label>Order notes<input value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label><div className="totalRow"><b>Total</b><strong>{money(total)}</strong></div>{!user&&<div className="checkoutAuth"><b>Ready to complete your order?</b><span>Login or create your account here — no login is required to browse or add items.</span><button className="outline full" type="button" onClick={onRequireAuth}>LOGIN / CREATE ACCOUNT</button></div>}<button className="primary full" disabled={!ok||busy} onClick={submit}>{busy?'PLACING ORDER…':!user?'LOGIN / CREATE ACCOUNT':'PLACE ORDER → WHATSAPP'}</button></div></div>}

function AuthModal({onClose,onSignedIn}){const[mode,setMode]=useState('login');const[f,setF]=useState({name:'',phone:'',email:'',password:''});const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);async function submit(){setBusy(true);setMsg('');try{if(mode==='signup'){const {error}=await supabase.auth.signUp({email:f.email,password:f.password,options:{data:{full_name:f.name,phone:f.phone}}});if(error)throw error;setMsg('Account created. Check your email, then login.');setMode('login');}else{const {data,error}=await supabase.auth.signInWithPassword({email:f.email,password:f.password});if(error)throw error;await onSignedIn(data.session);}}catch(e){setMsg(e.message||'Authentication failed.')}finally{setBusy(false)}}return <div className="modalShade"><div className="modal authModal"><div className="modalHead"><h2>{mode==='login'?'Customer Login':'Create Account'}</h2><button className="icon" onClick={onClose}><X/></button></div>{mode==='signup'&&<><label>Full name<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>Mobile / WhatsApp<input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label></>}<label>Email<input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label><label>Password<input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></label>{msg&&<div className="hint">{msg}</div>}<button className="primary full" disabled={busy||!f.email||!f.password} onClick={submit}>{busy?'PLEASE WAIT':mode==='login'?'LOGIN':'CREATE ACCOUNT'}</button><button className="linkBtn" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create a new account':'Already have an account? Login'}</button></div></div>}

function Admin({onClose,products,setProducts,settings,setSettings,profile}){
  const [tab,setTab]=useState('products');
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState(null);
  const [orders,setOrders]=useState([]);
  const [customers,setCustomers]=useState([]);
  const blank={name:'',category:'Lawn 3PC',description:'',price:0,sale_price:0,stock:0,badge:'',image_url:'',is_active:true};
  useEffect(()=>{ if(tab==='orders')loadOrders(); if(tab==='customers')loadCustomers(); },[tab]);
  async function loadOrders(){const{data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false});if(error)alert(error.message);else setOrders(data||[])}
  async function loadCustomers(){const{data,error}=await supabase.from('profiles').select('id,full_name,phone,role,created_at').order('created_at',{ascending:false});if(error)alert(error.message);else setCustomers(data||[])}
  async function save(p,file){setSaving(true);try{let imageUrl=p.image_url||null;if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${crypto.randomUUID()}.${ext}`;const {error:e}=await supabase.storage.from('product-images').upload(path,file,{upsert:false});if(e)throw e;imageUrl=supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;}const payload={name:p.name,category:p.category,description:p.description,price:Number(p.price||0),sale_price:Number(p.sale_price||0),stock:Number(p.stock||0),badge:p.badge||'',image_url:imageUrl,is_active:Boolean(p.is_active)};const res=p.id?await supabase.from('products').update(payload).eq('id',p.id).select().single():await supabase.from('products').insert(payload).select().single();if(res.error)throw res.error;setProducts(prev=>p.id?prev.map(x=>x.id===p.id?productFromRow(res.data):x):[productFromRow(res.data),...prev]);setForm(null);}catch(e){alert(e.message||'Could not save product.')}finally{setSaving(false)}}
  async function del(id){if(!confirm('Delete this product?'))return;const {error}=await supabase.from('products').update({is_active:false}).eq('id',id);if(error)alert(error.message);else setProducts(p=>p.filter(x=>x.id!==id));}
  async function updateOrderStatus(id,status){const{error}=await supabase.from('orders').update({status}).eq('id',id);if(error)alert(error.message);else setOrders(prev=>prev.map(o=>o.id===id?{...o,status}:o));}
  async function signOut(){await supabase.auth.signOut();onClose();}
  return <div className="adminShade"><div className="admin"><aside className="adminSide"><div className="logo">{settings.brand_name}<span>+</span></div><button className={tab==='products'?'active':''} onClick={()=>setTab('products')}><ImageIcon/>Products</button><button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}><Package/>Orders</button><button className={tab==='customers'?'active':''} onClick={()=>setTab('customers')}><Users/>Customers</button><button onClick={signOut}><LogOut/>Logout</button><button onClick={onClose}><X/>Close</button></aside><section className="adminMain"><div className="adminTop"><h1>{tab[0].toUpperCase()+tab.slice(1)}</h1><button className="icon" onClick={onClose}><X/></button></div>{tab==='products'&&<><button className="primary" onClick={()=>setForm(blank)}>+ ADD PRODUCT</button><div className="table">{products.map(p=><div className="tr" key={p.id}>{p.img?<img src={p.img} alt=""/>:<div className="adminImageMissing">IMAGE</div>}<span><b>{p.name}</b><small>{p.category} · {money(p.price)} · {p.stock} stock</small></span><button onClick={()=>setForm({...p,sale_price:p.price,price:p.regularPrice,image_url:p.img})}>Edit</button><button className="danger" onClick={()=>del(p.id)}>Delete</button></div>)}</div></>}{tab==='orders'&&<div className="table">{orders.length?orders.map(o=><div className="tr" key={o.id}><span><b>{o.order_number}</b><small>{o.customer_name} · {o.customer_phone} · {new Date(o.created_at).toLocaleString()}</small></span><strong>{money(o.total)}</strong><select value={o.status} onChange={e=>updateOrderStatus(o.id,e.target.value)}><option>new</option><option>confirmed</option><option>packed</option><option>shipped</option><option>delivered</option><option>cancelled</option></select></div>):<p>No orders yet.</p>}</div>}{tab==='customers'&&<div className="table">{customers.length?customers.map(c=><div className="tr" key={c.id}><span><b>{c.full_name||'Customer'}</b><small>{c.phone||'No phone'} · {c.role}</small></span></div>):<p>No customers yet.</p>}</div>}</section></div>{form&&<ProductEditor p={form} saving={saving} onClose={()=>setForm(null)} onSave={save}/>}</div>
}

function ProductEditor({p,saving,onClose,onSave}){const[x,setX]=useState(p);const[file,setFile]=useState(null);return <div className="modalShade"><div className="modal"><div className="modalHead"><h2>{p.id?'Edit Product':'Add Product'}</h2><button className="icon" onClick={onClose}><X/></button></div><div className="formGrid">{[['name','Product name'],['category','Category'],['price','Regular price'],['sale_price','Sale price'],['stock','Stock'],['badge','Badge']].map(([k,l])=><label key={k}>{l}<input value={x[k]??''} onChange={e=>setX({...x,[k]:['price','sale_price','stock'].includes(k)?Number(e.target.value):e.target.value})}/></label>)}</div><label>Description<textarea value={x.description||''} onChange={e=>setX({...x,description:e.target.value})}/></label><label>Product image<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>{x.image_url&&<img className="editorPreview" src={x.image_url} alt=""/>}<button className="primary full" disabled={saving} onClick={()=>onSave(x,file)}>{saving?'SAVING…':'SAVE PRODUCT'}</button></div></div>}

createRoot(document.getElementById('root')).render(<App/>);
