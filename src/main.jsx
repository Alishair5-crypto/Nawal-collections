import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search, ShoppingBag, Heart, User, Menu, X, Plus, Minus, Trash2,
  ArrowRight, ShieldCheck, Truck, RotateCcw, Settings, Package, Users,
  Image as ImageIcon, LogOut, Lock, UserPlus, ChevronDown, CheckCircle2,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { supabase } from './lib/supabase';
import './styles.css';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const money=(n)=>`PKR ${Number(n||0).toLocaleString()}`;
const isUUID=(v)=>UUID_RE.test(String(v||''));
const normalizeProduct=(p)=>({
  id:p.id,
  name:p.name,
  cat:p.category||'Uncategorized',
  price:Number(p.sale_price ?? p.price ?? 0),
  old:Number(p.sale_price!=null ? p.price : 0),
  stock:Number(p.stock||0),
  badge:p.badge||'',
  img:p.image_url||p.images?.[0]||'',
  images:Array.isArray(p.images)?p.images:[],
  description:p.description||''
});
const orderNumber=()=>`NC-${Date.now().toString().slice(-8)}`;

function App(){
  const [products,setProducts]=useState([]);
  const [settings,setSettings]=useState({brand_name:'NAWAL COLLECTIONS',whatsapp_number:'923046093592'});
  const [user,setUser]=useState(null),[profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('All');
  const [menu,setMenu]=useState(false),[cartOpen,setCartOpen]=useState(false),[authOpen,setAuthOpen]=useState(false),[authMode,setAuthMode]=useState('login');
  const [selected,setSelected]=useState(null),[checkout,setCheckout]=useState(false),[adminOpen,setAdminOpen]=useState(false);
  const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('nawal_cart')||'[]').filter(x=>isUUID(x.id));}catch{return[];}});
  const [wish,setWish]=useState(()=>{try{return JSON.parse(localStorage.getItem('nawal_wish')||'[]').filter(isUUID);}catch{return[];}});
  const [orders,setOrders]=useState([]);

  useEffect(()=>{localStorage.setItem('nawal_cart',JSON.stringify(cart));},[cart]);
  useEffect(()=>{localStorage.setItem('nawal_wish',JSON.stringify(wish));},[wish]);
  useEffect(()=>{
    const lock=selected||checkout||authOpen||adminOpen;
    document.body.style.overflow=lock?'hidden':'';
    return()=>{document.body.style.overflow=''};
  },[selected,checkout,authOpen,adminOpen]);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!mounted)return;
        setUser(session?.user||null);
        if(session?.user) await refreshProfile(session.user.id);
        await Promise.all([loadSettings(),loadProducts()]);
      }catch(e){if(mounted)setError(e.message||'Unable to load store.');}
      finally{if(mounted)setLoading(false);}
    })();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,session)=>{
      setUser(session?.user||null);
      if(session?.user) await refreshProfile(session.user.id); else setProfile(null);
    });
    return()=>{mounted=false;subscription.unsubscribe();};
  },[]);

  async function refreshProfile(id){
    const {data,error}=await supabase.from('profiles').select('*').eq('id',id).maybeSingle();
    if(error) console.warn(error); setProfile(data||null); return data||null;
  }
  async function loadSettings(){
    const {data,error}=await supabase.from('store_settings').select('*').eq('id',1).maybeSingle();
    if(!error&&data)setSettings(s=>({...s,...data}));
  }
  async function loadProducts(){
    setError('');
    const {data,error}=await supabase.from('products').select('*').eq('is_active',true).order('created_at',{ascending:false});
    if(error){setError(error.message);setProducts([]);return;}
    const mapped=(data||[]).map(normalizeProduct).filter(p=>isUUID(p.id));
    setProducts(mapped);
    setCart(c=>c.filter(item=>mapped.some(p=>p.id===item.id)).map(item=>{
      const p=mapped.find(x=>x.id===item.id); return {...p,q:Math.min(Math.max(1,Number(item.q)||1),Math.max(1,p.stock))};
    }));
  }
  async function ensureAdmin(){
    if(!user){setAuthMode('login');setAuthOpen(true);return false;}
    const p=profile||await refreshProfile(user.id);
    if(p?.role!=='admin'){alert('Admin access is only available to an authorized administrator.');return false;}
    return true;
  }

  const categories=useMemo(()=>['All',...Array.from(new Set(products.map(p=>p.cat).filter(Boolean))), 'Sale'].filter((x,i,a)=>a.indexOf(x)===i),[products]);
  const shown=useMemo(()=>products.filter(p=>{
    const q=!query||p.name.toLowerCase().includes(query.toLowerCase())||p.cat.toLowerCase().includes(query.toLowerCase());
    const f=filter==='All'||(filter==='Sale'?p.old>p.price:p.cat===filter);
    return q&&f;
  }),[products,query,filter]);
  const total=cart.reduce((s,p)=>s+p.price*p.q,0),count=cart.reduce((s,p)=>s+p.q,0);

  function goShop(next='All'){
    setFilter(next);setMenu(false);setSelected(null);
    setTimeout(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
  }
  function openProduct(p){setSelected(p);}
  function addToCart(p){
    if(!isUUID(p.id)) return;
    if(p.stock<=0){alert('This product is sold out.');return;}
    setCart(c=>{const old=c.find(x=>x.id===p.id);return old?c.map(x=>x.id===p.id?{...x,q:Math.min(x.q+1,p.stock)}:x):[...c,{...p,q:1}];});
    setCartOpen(true);
  }
  function changeQty(id,delta){setCart(c=>c.map(x=>x.id===id?{...x,q:Math.max(1,Math.min(x.stock,x.q+delta))}:x));}

  async function placeOrder(form){
    if(!user){setAuthMode('login');setAuthOpen(true);return;}
    if(!cart.length)return;
    const snapshot=cart.map(p=>({...p}));
    const subtotal=snapshot.reduce((s,p)=>s+p.price*p.q,0);
    const payload={order_number:orderNumber(),customer_id:user.id,customer_name:form.name,customer_phone:form.phone,customer_email:user.email||null,city:form.city,address:form.address,notes:form.notes||null,subtotal,shipping:0,total:subtotal,payment_method:form.payment||'cash_on_delivery',status:'new'};
    setError('');
    const {data:order,error:orderError}=await supabase.from('orders').insert(payload).select().single();
    if(orderError){setError(orderError.message);return;}
    const items=snapshot.map(p=>({order_id:order.id,product_id:p.id,product_name:p.name,product_image:p.img||null,price:p.price,quantity:p.q,total:p.price*p.q}));
    const {error:itemError}=await supabase.from('order_items').insert(items);
    if(itemError){setError(itemError.message);return;}
    // Best-effort stock update. RLS may restrict this; the order remains recorded safely.
    for(const p of snapshot){
      const remaining=Math.max(0,p.stock-p.q);
      const r=await supabase.from('products').update({stock:remaining}).eq('id',p.id).eq('stock',p.stock);
      if(r.error) console.warn('Stock update:',r.error.message);
    }
    const lines=snapshot.map((p,i)=>`${i+1}. ${p.name} x ${p.q} — ${money(p.price*p.q)}`).join('\n');
    const message=`${settings.brand_name||'NAWAL COLLECTIONS'} — Order ${order.order_number}\n\n${lines}\n\nTotal: ${money(subtotal)}\n\nName: ${form.name}\nPhone: ${form.phone}\nCity: ${form.city}\nAddress: ${form.address}\nPayment: ${form.payment||'cash_on_delivery'}\nNotes: ${form.notes||'-'}\n\nPlease confirm my order.`;
    setCart([]);setCheckout(false);setCartOpen(false);await loadProducts();
    window.location.href=`https://wa.me/${String(settings.whatsapp_number||'923046093592').replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
  }

  async function signOut(){await supabase.auth.signOut();setAdminOpen(false);}
  async function openAdmin(){if(await ensureAdmin()){await loadAdminOrders();setAdminOpen(true);}}
  async function loadAdminOrders(){
    const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false});
    if(!error)setOrders(data||[]); else setError(error.message);
  }
  async function deleteProduct(id){
    if(!await ensureAdmin())return;
    const {error}=await supabase.from('products').update({is_active:false}).eq('id',id);
    if(error)alert(error.message);else await loadProducts();
  }
  async function saveProduct(form,file){
    if(!(await ensureAdmin()))return;
    let imageUrl=form.img||null;
    if(file){
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`products/${crypto.randomUUID()}.${ext}`;
      const {error}=await supabase.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type});
      if(error){alert(error.message);return;}
      imageUrl=supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }
    const payload={name:form.name.trim(),category:form.cat,description:form.description||null,price:Number(form.old||form.price||0),sale_price:Number(form.price||form.old||0),stock:Number(form.stock||0),image_url:imageUrl,badge:form.badge||null,is_active:true};
    let result;
    if(isUUID(form.id)) result=await supabase.from('products').update(payload).eq('id',form.id);
    else result=await supabase.from('products').insert(payload);
    if(result.error){alert(result.error.message);return;}
    await loadProducts();
  }
  async function updateOrderStatus(id,status){
    if(!(await ensureAdmin()))return;
    const {error}=await supabase.from('orders').update({status}).eq('id',id);
    if(!error)setOrders(os=>os.map(o=>o.id===id?{...o,status}:o));else alert(error.message);
  }
  async function saveSettings(values){
    if(!(await ensureAdmin()))return;
    const {error}=await supabase.from('store_settings').update({brand_name:values.brand_name,whatsapp_number:values.whatsapp_number,phone:values.phone||null,email:values.email||null,address:values.address||null,instagram_url:values.instagram_url||null,facebook_url:values.facebook_url||null}).eq('id',1);
    if(error)alert(error.message);else{setSettings(s=>({...s,...values}));alert('Store settings saved.');}
  }

  return <>
    <header>
      <button className="mobile icon" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
      <button className="logo" onClick={()=>goShop('All')}>{settings.brand_name||'NAWAL COLLECTIONS'}</button>
      <nav className={menu?'open':''}>
        <button onClick={()=>goShop('All')}>SHOP</button>
        <button onClick={()=>goShop('Luxury')}>LUXURY</button>
        <button onClick={()=>goShop('Lawn 3PC')}>LAWN 3PC</button>
        <button onClick={()=>goShop('Sale')}>SALE</button>
      </nav>
      <div className="actions">
        <div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products"/></div>
        <button className="icon" aria-label="Account" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><User/></button>
        <button className="icon" aria-label="Wishlist" onClick={()=>alert(`${wish.length} saved item(s)`)}><Heart/><b>{wish.length}</b></button>
        <button className="icon" aria-label="Bag" onClick={()=>setCartOpen(true)}><ShoppingBag/><b>{count}</b></button>
        <button className="adminBtn" onClick={openAdmin}><Settings size={16}/></button>
      </div>
    </header>
    {error&&<div className="errorBar"><AlertTriangle size={14}/>{error}<button onClick={()=>setError('')}><X size={13}/></button></div>}
    <main>
      <section className="hero"><div><p className="eyebrow">THE NEW STANDARD OF MODEST LUXURY</p><h1>Timeless.<br/><em>Elegant.</em><br/>Nawal.</h1><p>Curated Pakistani fashion for women who value quality, detail and effortless grace.</p><button className="primary" onClick={()=>goShop('All')}>SHOP COLLECTION <ArrowRight size={16}/></button></div></section>
      <section className="intro"><p className="eyebrow">DISCOVER NAWAL</p><h2>Luxury Made Personal.</h2><p>Thoughtfully selected pieces, beautiful finishing and a shopping experience designed around you.</p><button className="outlineDark" onClick={()=>goShop('Luxury')}>EXPLORE LUXURY <ArrowRight size={16}/></button></section>
      <section id="shop" className="shop"><div className="sectionHead"><div><p className="eyebrow">THE COLLECTION</p><h2>{filter==='All'?'Featured Collection':filter}</h2></div><div className="filters">{categories.map(c=><button key={c} className={filter===c?'active':''} onClick={()=>setFilter(c)}>{c}</button>)}</div></div>
        {loading?<div className="emptyCollection"><RefreshCw className="spin"/><p>Loading collection…</p></div>:<div className="grid">{shown.map(p=><article className="card" key={p.id} onClick={()=>openProduct(p)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')openProduct(p)}}><div className="pic">{p.img?<img src={p.img} alt={p.name}/>:<div className="noImage">No image</div>}<span className="badge">{p.stock<=0?'SOLD OUT':(p.badge||'')}</span><button className="wish" onClick={e=>{e.stopPropagation();setWish(w=>w.includes(p.id)?w.filter(x=>x!==p.id):[...w,p.id])}}>{wish.includes(p.id)?'♥':'♡'}</button>{p.stock>0&&<button className="quick" onClick={e=>{e.stopPropagation();addToCart(p)}}>ADD TO BAG</button>}</div><div className="meta"><span>{p.cat}</span><h3>{p.name}</h3><strong>{money(p.price)}</strong>{p.old>p.price&&<del>{money(p.old)}</del>}<small>{p.stock>0?`${p.stock} available`:'Sold out'}</small></div></article>)}{shown.length===0&&<div className="emptyCollection"><h3>No products found.</h3><p>Try another category or search.</p></div>}</div>}
      </section>
      <section className="trust"><div><Truck/><b>Fast Delivery</b><span>Nationwide shipping</span></div><div><ShieldCheck/><b>Secure Checkout</b><span>Protected order data</span></div><div><RotateCcw/><b>Easy Returns</b><span>Simple return process</span></div></section>
      <section className="feature"><div><p className="eyebrow">THE LUXURY EDIT</p><h2>Pieces that stay with you.</h2><p>Explore elevated silhouettes and refined details designed to be worn, loved and remembered.</p><button className="outline" onClick={()=>goShop('Luxury')}>EXPLORE LUXURY <ArrowRight size={16}/></button></div></section>
      <section className="categories"><p className="eyebrow">SHOP BY CATEGORY</p><h2>Find your signature.</h2><div className="catgrid">{['Lawn 3PC','Luxury','Ready To Wear','Winter'].map(c=><button key={c} onClick={()=>goShop(c)}><div className="catFallback"><span>{c}</span><ArrowRight size={16}/></div></button>)}</div></section>
      <section className="newsletter"><p className="eyebrow">JOIN THE NAWAL EDIT</p><h2>New arrivals. Private drops. First access.</h2><div><input placeholder="Your email address"/><button className="primary" onClick={()=>alert('Thank you for joining the Nawal Edit.')}>SUBSCRIBE</button></div></section>
    </main>
    <footer><div><h4>{settings.brand_name||'NAWAL COLLECTIONS'}</h4><p>Curated Pakistani fashion and timeless elegance.</p></div><div><h4>SHOP</h4><button className="footerLink" onClick={()=>goShop('All')}>All Products</button><button className="footerLink" onClick={()=>goShop('Luxury')}>Luxury</button><button className="footerLink" onClick={()=>goShop('Sale')}>Sale</button></div><div><h4>SUPPORT</h4><button className="footerLink" onClick={()=>alert('WhatsApp: '+settings.whatsapp_number)}>Contact</button><button className="footerLink" onClick={()=>alert('Returns are handled case-by-case via WhatsApp.')}>Returns</button></div><div><h4>ACCOUNT</h4><button className="footerLink" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}>Login</button><button className="footerLink" onClick={openAdmin}>Admin</button></div><small>© {new Date().getFullYear()} {settings.brand_name||'NAWAL COLLECTIONS'}</small></footer>

    {cartOpen&&<CartDrawer cart={cart} total={total} onClose={()=>setCartOpen(false)} onCheckout={()=>{setCartOpen(false);setCheckout(true)}} onChangeQty={changeQty} onRemove={id=>setCart(c=>c.filter(x=>x.id!==id))}/>}    
    {selected&&<ProductDetail p={selected} onClose={()=>setSelected(null)} onAdd={addToCart}/>}    
    {checkout&&<Checkout total={total} profile={profile} onClose={()=>setCheckout(false)} onSubmit={placeOrder}/>}    
    {authOpen&&<AuthModal mode={authMode} setMode={setAuthMode} onClose={()=>setAuthOpen(false)}/>}    
    {adminOpen&&<AdminPanel products={products} orders={orders} settings={settings} onClose={()=>setAdminOpen(false)} onLogout={signOut} onDelete={deleteProduct} onSaveProduct={saveProduct} onStatus={updateOrderStatus} onSaveSettings={saveSettings}/>}  
  </>;
}

function CartDrawer({cart,total,onClose,onCheckout,onChangeQty,onRemove}){return <><div className="shade" onClick={onClose}/><aside className="drawer"><div className="drawerHead"><h2>Your Bag</h2><button className="icon" onClick={onClose}><X/></button></div>{!cart.length?<div className="empty"><ShoppingBag size={34}/><p>Your bag is empty.</p></div>:<><div className="bagList">{cart.map(p=><div className="line" key={p.id}><img src={p.img} alt={p.name}/><div><h4>{p.name}</h4><p>{money(p.price)}</p><div className="qty"><button onClick={()=>onChangeQty(p.id,-1)}><Minus size={14}/></button><span>{p.q}</span><button onClick={()=>onChangeQty(p.id,1)}><Plus size={14}/></button><button onClick={()=>onRemove(p.id)}><Trash2 size={14}/></button></div></div></div>)}</div><div className="checkout"><div><span>Subtotal</span><b>{money(total)}</b></div><button className="primary full" onClick={onCheckout}>CHECKOUT <ArrowRight size={17}/></button></div></>}</aside></>}

function ProductDetail({p,onClose,onAdd}){return <div className="modalShade" onClick={onClose}><div className="modal productDetail" onClick={e=>e.stopPropagation()}><div className="modalHead"><h2>Product Details</h2><button className="icon" onClick={onClose}><X/></button></div><div className="productDetailGrid"><div>{p.img?<img className="detailImage" src={p.img} alt={p.name}/>:<div className="noImage large">No image</div>}</div><div className="detailInfo"><span className="detailBadge">{p.stock<=0?'SOLD OUT':(p.badge||p.cat)}</span><p className="eyebrow">{p.cat}</p><h2>{p.name}</h2><div className="detailPrice"><strong>{money(p.price)}</strong>{p.old>p.price&&<del>{money(p.old)}</del>}</div><p>{p.description||'A carefully selected Nawal Collection piece with refined finishing.'}</p><p className="detailStock">{p.stock>0?`${p.stock} available`: 'Currently sold out'}</p><button className="primary full" disabled={p.stock<=0} onClick={()=>{onAdd(p);onClose();}}>{p.stock>0?'ADD TO BAG':'SOLD OUT'}</button></div></div></div></div>}

function Checkout({total,profile,onClose,onSubmit}){const[f,setF]=useState({name:profile?.full_name||'',phone:profile?.phone||'',city:'',address:'',payment:'cash_on_delivery',notes:''});const ok=f.name.trim()&&f.phone.trim()&&f.city.trim()&&f.address.trim();return <div className="modalShade"><div className="modal"><div className="modalHead"><h2>Checkout</h2><button className="icon" onClick={onClose}><X/></button></div><p className="hint">Complete your delivery details. Your order will be saved first, then opened in WhatsApp for confirmation.</p><div className="formGrid">{[['name','Full name'],['phone','Mobile / WhatsApp'],['city','City'],['address','Complete delivery address']].map(([k,l])=><label key={k}>{l}<input value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}</div><label>Payment<select value={f.payment} onChange={e=>setF({...f,payment:e.target.value})}><option value="cash_on_delivery">Cash on Delivery</option><option value="jazzcash">JazzCash</option><option value="easypaisa">Easypaisa</option><option value="bank_transfer">Bank Transfer</option></select></label><label>Order notes<textarea value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label><div className="totalRow"><b>Total</b><strong>{money(total)}</strong></div><button className="primary full" disabled={!ok} onClick={()=>onSubmit(f)}>PLACE ORDER <ArrowRight size={16}/></button></div></div>}

function AuthModal({mode,setMode,onClose}){const[f,setF]=useState({email:'',password:'',full_name:'',phone:''});const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);async function submit(){setBusy(true);setMsg('');try{if(mode==='signup'){const{error}=await supabase.auth.signUp({email:f.email,password:f.password,options:{data:{full_name:f.full_name,phone:f.phone},emailRedirectTo:window.location.origin}});if(error)throw error;setMsg('Account created. Check your email if confirmation is enabled.');setMode('login');}else{const{error}=await supabase.auth.signInWithPassword({email:f.email,password:f.password});if(error)throw error;onClose();}}catch(e){setMsg(e.message||'Authentication failed.')}finally{setBusy(false)}}return <div className="modalShade"><div className="modal authModal"><div className="modalHead"><h2>{mode==='login'?'Customer Login':'Create Account'}</h2><button className="icon" onClick={onClose}><X/></button></div>{mode==='signup'&&<><label>Full name<input value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/></label><label>Mobile / WhatsApp<input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label></>}<label>Email<input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label><label>Password<input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></label>{msg&&<div className="hint">{msg}</div>}<button className="primary full" disabled={busy||!f.email||!f.password} onClick={submit}>{busy?'PLEASE WAIT':mode==='login'?'LOGIN':'CREATE ACCOUNT'}</button><button className="linkBtn" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?<><UserPlus size={15}/> Create a new account</>:<><Lock size={15}/> Already have an account? Login</>}</button></div></div>}

function AdminPanel({products,orders,settings,onClose,onLogout,onDelete,onSaveProduct,onStatus,onSaveSettings}){
  const [tab,setTab]=useState('dashboard');const [edit,setEdit]=useState(null);
  const customers=[...new Map(orders.map(o=>[o.customer_phone,{name:o.customer_name,phone:o.customer_phone,city:o.city}])).values()];
  const blank={id:null,name:'',cat:'Lawn 3PC',price:0,old:0,stock:0,badge:'',img:'',description:''};
  return <div className="adminShade"><div className="admin"><aside className="adminSide"><div className="logo">{settings.brand_name}</div><button onClick={()=>setTab('dashboard')}><Package/>Dashboard</button><button onClick={()=>setTab('products')}><ImageIcon/>Products</button><button onClick={()=>setTab('orders')}><ShoppingBag/>Orders</button><button onClick={()=>setTab('customers')}><Users/>Customers</button><button onClick={()=>setTab('settings')}><Settings/>Settings</button><button onClick={onLogout}><LogOut/>Logout</button><button onClick={onClose}><X/>Close</button></aside><section className="adminMain"><div className="adminTop"><h1>{tab[0].toUpperCase()+tab.slice(1)}</h1><button className="icon" onClick={onClose}><X/></button></div>{tab==='dashboard'&&<div className="stats"><div><b>{products.length}</b><span>Active products</span></div><div><b>{orders.length}</b><span>Orders</span></div><div><b>{products.reduce((s,p)=>s+p.stock,0)}</b><span>Units in stock</span></div><div><b>{money(orders.reduce((s,o)=>s+Number(o.total||0),0))}</b><span>Order value</span></div></div>}{tab==='products'&&<><button className="primary" onClick={()=>setEdit(blank)}>+ ADD PRODUCT</button><div className="table">{products.map(p=><div className="tr" key={p.id}><img src={p.img} alt=""/><span><b>{p.name}</b><small>{p.cat} · {money(p.price)} · {p.stock>0?`${p.stock} stock`:'SOLD OUT'}</small></span><button onClick={()=>setEdit({...p})}>Edit</button><button className="danger" onClick={()=>onDelete(p.id)}>Archive</button></div>)}{products.length===0&&<div className="emptyAdmin">No products yet. Add your first product.</div>}</div></>}{tab==='orders'&&<div className="table">{orders.length?orders.map(o=><div className="tr" key={o.id}><span><b>{o.order_number}</b><small>{o.customer_name} · {o.customer_phone} · {new Date(o.created_at).toLocaleString()}</small></span><strong>{money(o.total)}</strong><select value={o.status} onChange={e=>onStatus(o.id,e.target.value)}><option value="new">New</option><option value="confirmed">Confirmed</option><option value="packed">Packed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>):<div className="emptyAdmin">No orders yet.</div>}</div>}{tab==='customers'&&<div className="table">{customers.length?customers.map(c=><div className="tr" key={c.phone}><span><b>{c.name||'Customer'}</b><small>{c.phone} · {c.city||''}</small></span></div>):<div className="emptyAdmin">No customers from orders yet.</div>}</div>}{tab==='settings'&&<StoreSettings settings={settings} onSave={onSaveSettings}/>}</section></div>{edit&&<ProductEditor data={edit} onClose={()=>setEdit(null)} onSave={async(form,file)=>{await onSaveProduct(form,file);setEdit(null)}}/>}</div>
}

function ProductEditor({data,onClose,onSave}){const[f,setF]=useState(data);const[file,setFile]=useState(null);return <div className="adminShade" style={{zIndex:300}}><div className="modal"><div className="modalHead"><h2>{f.id?'Edit Product':'Add Product'}</h2><button className="icon" onClick={onClose}><X/></button></div><div className="formGrid"><label>Product name<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>Category<input value={f.cat} onChange={e=>setF({...f,cat:e.target.value})}/></label><label>Regular price<input type="number" value={f.old} onChange={e=>setF({...f,old:e.target.value})}/></label><label>Sale price<input type="number" value={f.price} onChange={e=>setF({...f,price:e.target.value})}/></label><label>Stock<input type="number" min="0" value={f.stock} onChange={e=>setF({...f,stock:e.target.value})}/></label><label>Badge<input value={f.badge||''} onChange={e=>setF({...f,badge:e.target.value})}/></label></div><label>Description<textarea value={f.description||''} onChange={e=>setF({...f,description:e.target.value})}/></label><label>Product image<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><p className="hint">Stock 0 automatically shows SOLD OUT and disables Add to Bag.</p><button className="primary full" onClick={()=>onSave(f,file)}>SAVE PRODUCT</button></div></div>}
function StoreSettings({settings,onSave}){const[f,setF]=useState(settings);return <div className="settingsPanel"><h2>Store Settings</h2><label>Brand name<input value={f.brand_name||''} onChange={e=>setF({...f,brand_name:e.target.value})}/></label><label>WhatsApp number<input value={f.whatsapp_number||''} onChange={e=>setF({...f,whatsapp_number:e.target.value})}/></label><label>Phone<input value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/></label><label>Email<input value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/></label><label>Address<input value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/></label><label>Instagram<input value={f.instagram_url||''} onChange={e=>setF({...f,instagram_url:e.target.value})}/></label><label>Facebook<input value={f.facebook_url||''} onChange={e=>setF({...f,facebook_url:e.target.value})}/></label><button className="primary" onClick={()=>onSave(f)}>SAVE SETTINGS</button></div>}

createRoot(document.getElementById('root')).render(<App/>);
