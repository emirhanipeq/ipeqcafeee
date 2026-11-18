import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { QRCodeSVG } from 'qrcode.react';
import { Coffee, MapPin, Clock3, Search, ShoppingBag, Bell, Star, X, Check } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const API=`http://${window.location.hostname}:4000/api/v1`;
const plans=[
 {id:'starter',name:'Starter',price:'89,99',credits:'10 kahve',color:'sage'},
 {id:'premium',name:'Premium',price:'149,99',credits:'20 kahve',color:'cream'},
 {id:'unlimited',name:'Unlimited',price:'249,99',credits:'Sınırsız',color:'dark'}
];
const fallbackShops=[
 {id:'shop-1',name:'İpeqcafeee Adapazarı',address:'Orta Mah. Atatürk Bulvarı No:18, Adapazarı',latitude:40.7790,longitude:30.4020,rating:4.8,distance:0.7,is_open:1,open_hours:'08:00–23:00',image:'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=700'},
 {id:'shop-2',name:'İpeqcafeee Serdivan',address:'Meşelik Mah. Üniversite Cd. No:42, Serdivan',latitude:40.7885,longitude:30.3778,rating:4.7,distance:2.1,is_open:1,open_hours:'07:30–22:30',image:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700'},
 {id:'shop-3',name:'İpeqcafeee Sapanca',address:'İstanbul Cd. No:75, Sapanca',latitude:40.6920,longitude:30.2667,rating:4.9,distance:10.8,is_open:1,open_hours:'08:30–22:00',image:'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=700'},
 {id:'shop-4',name:'İpeqcafeee AKM',address:'Milli Egemenlik Cd. No:10, Adapazarı',latitude:40.7837,longitude:30.3972,rating:4.6,distance:1.2,is_open:1,open_hours:'08:00–24:00',image:'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=700'},
 {id:'shop-5',name:'İpeqcafeee Erenler',address:'Erenler Merkez, Sakarya',latitude:40.7550,longitude:30.4140,rating:4.5,distance:3.4,is_open:0,open_hours:'08:30–21:00',image:'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=700'},
 {id:'shop-6',name:'İpeqcafeee Arifiye',address:'İstasyon Mah. Sakarya Cd. No:21, Arifiye',latitude:40.7130,longitude:30.3560,rating:4.7,distance:8.1,is_open:1,open_hours:'08:00–22:30',image:'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=700'},
 {id:'shop-7',name:'İpeqcafeee Kadıköy',address:'Mühürdar Cd. No:12, Kadıköy',latitude:40.9881,longitude:29.0247,rating:4.8,distance:0.8,is_open:1,open_hours:'08:00–23:00',image:'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=700'},
 {id:'shop-8',name:'İpeqcafeee Beşiktaş',address:'Sinanpaşa Mah. Beşiktaş',latitude:41.0422,longitude:29.0053,rating:4.6,distance:3.2,is_open:1,open_hours:'07:30–22:30',image:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700'},
 {id:'shop-9',name:'İpeqcafeee Taksim',address:'İstiklal Cd. No:25, Beyoğlu',latitude:41.0370,longitude:28.9834,rating:4.7,distance:5.4,is_open:1,open_hours:'08:00–24:00',image:'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=700'}
];
const products=[
 {id:'product-1',name:'Espresso',category:'Espresso',price:65,description:'Yoğun ve dengeli'},
 {id:'product-2',name:'Americano',category:'Sıcak İçecek',price:75,description:'Hafif kavrulmuş çekirdek'},
 {id:'product-3',name:'Latte',category:'Sütlü Kahve',price:95,description:'Kadifemsi sütlü'},
 {id:'product-4',name:'Cold Brew',category:'Soğuk İçecek',price:110,description:'18 saat demleme'}
];

async function api(path:string,options:any={}){
 const token=localStorage.getItem('kc_token');
 const r=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}),...options.headers}});
 const j=await r.json(); if(!r.ok) throw new Error(j.error||'İstek başarısız'); return j.data;
}

function App() {
 const [view,setView]=useState<'discover'|'subscriptions'|'orders'>('discover');
 const [shops,setShops]=useState<any[]>(fallbackShops); const [selected,setSelected]=useState<any>(fallbackShops[0]);
 const [search,setSearch]=useState(''); const [phone,setPhone]=useState('+905'); const [otpOpen,setOtpOpen]=useState(false); const [otp,setOtp]=useState(''); const [userId,setUserId]=useState('');
 const [logged,setLogged]=useState(Boolean(localStorage.getItem('kc_token'))); const [toast,setToast]=useState('');
 const [menuOpen,setMenuOpen]=useState(false); const [selectedProduct,setSelectedProduct]=useState<any>(null); const [order,setOrder]=useState<any>(null);
 const [card] = useState('4242-4242-4242-4242');

 useEffect(()=>{api('/shops?lat=40.7790&lng=30.4020&radius=200').then(setShops).catch(()=>{})},[]);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(t)}},[toast]);

 const sendOtp=async()=>{try{const d=await api('/auth/register',{method:'POST',body:JSON.stringify({phone_number:phone})});setUserId(d.user_id);setOtpOpen(true)}catch(e:any){setToast(e.message)}};
 const verifyOtp=async()=>{try{const d=await api('/auth/verify-otp',{method:'POST',body:JSON.stringify({user_id:userId,otp})});localStorage.setItem('kc_token',d.accessToken);setLogged(true);setOtpOpen(false);setToast('Hoş geldin! Profil hazır.')}catch(e:any){setToast(e.message)}};
 const subscribe=async(plan:any)=>{if(!logged){setOtpOpen(true);return}try{await api('/subscriptions',{method:'POST',body:JSON.stringify({plan_type:plan.id,card_token:card})});setToast(`${plan.name} aboneliğin aktif!`)}catch(e:any){setToast(e.message)}};
 const createOrder=async(product:any)=>{if(!logged){setOtpOpen(true);return}try{const d=await api('/orders',{method:'POST',body:JSON.stringify({shop_id:selected.id,product_id:product.id,size:'M',sugar:'Normal',milk:'Sütlü',extra_shot:0})});setOrder(d);setMenuOpen(false);setToast('Siparişin oluşturuldu')}catch(e:any){setToast(e.message)}};

 return <div className="app-shell">
  <header>
   <button className="brand" onClick={()=>setView('discover')}><span className="brand-mark"><Coffee size={21}/></span><span>İpeqcafeee</span></button>
   <nav><button className={view==='discover'?'active':''} onClick={()=>setView('discover')}>Keşfet</button><button className={view==='subscriptions'?'active':''} onClick={()=>setView('subscriptions')}>Paketler</button><button className={view==='orders'?'active':''} onClick={()=>setView('orders')}>Siparişlerim</button></nav>
   <div className="header-actions"><button className="icon-button"><Bell size={19}/></button>{logged?<button className="avatar">E</button>:<button className="login-button" onClick={()=>setOtpOpen(true)}>Giriş yap</button>}</div>
  </header>

  {view==='discover'&&<main className="discover">
   <section className="map-pane"><MapContainer center={[40.7790,30.4020]} zoom={12} scrollWheelZoom className="map"><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/> {shops.map(s=><Marker key={s.id} position={[s.latitude,s.longitude]} eventHandlers={{click:()=>setSelected(s)}}><Popup><b>{s.name}</b><br/>{s.distance?`${s.distance} km`:'Yakınında'}</Popup></Marker>)}</MapContainer></section>
   <aside className="shops-pane">
    <div className="search-row"><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Dükkân ara"/></div><button className="filter-button">Filtre</button></div>
    <div className="section-heading"><div><span>Yakındaki kahve</span><h1>Anlaşmalı Dükkânlar</h1></div><span className="count">{shops.length} yer</span></div>
    <div className="shop-list">{shops.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())).map(s=><article key={s.id} className={`shop-card ${selected?.id===s.id?'selected':''}`} onClick={()=>setSelected(s)}>
     <img src={s.image} alt={s.name}/><div className="shop-info"><div className="shop-title"><h3>{s.name}</h3><span><Star size={13} fill="currentColor"/> {s.rating}</span></div><p><MapPin size={14}/> {s.address}</p><div className="shop-meta"><span className={s.is_open?'open':'closed'}>{s.is_open?'Açık':'Kapalı'}</span><span><Clock3 size={14}/> {s.open_hours}</span><strong>{s.distance?`${s.distance} km`:'Yakın'}</strong></div></div>
    </article>)}</div>
    {selected&&<div className="selected-actions"><button onClick={()=>setMenuOpen(true)}><ShoppingBag size={18}/> Menü & Sipariş Ver</button></div>}
   </aside>
  </main>}

  {view==='subscriptions'&&<main className="page"><div className="page-heading"><span>İPEQCAFEEE ÜYELİĞİ</span><h1>Her gününü kahveyle güzelleştir</h1><p>Sana uygun paketi seç, anlaşmalı dükkânlarda kahveni önden öde.</p></div><div className="plan-grid">{plans.map(p=><article key={p.id} className={`plan-card ${p.color}`}><span className="plan-name">{p.name}</span>{p.id==='premium'&&<span className="popular">En Popüler</span>}<div className="plan-price"><strong>{p.price}</strong><span> TL<small>/ ay</small></span></div><div className="plan-credit"><Coffee size={18}/> {p.credits}</div><ul><li><Check/> Tüm anlaşmalı dükkânlar</li><li><Check/> Mobil uygulama ile sipariş</li><li><Check/> QR ile hızlı teslimat</li></ul><button onClick={()=>subscribe(p)}>Paketi seç</button></article>)}</div></main>}

  {view==='orders'&&<main className="page orders-page"><div className="page-heading"><span>SİPARİŞLERİM</span><h1>Son durumuna hızlı bak</h1></div>{order?<article className="order-detail"><div><span className="status-pill">Hazırlanıyor</span><h2>{order.product_name||selectedProduct?.name||'Sipariş'}</h2><p>{selected.name} • {order.size||'M'} Boy</p></div><QRCodeSVG value={order.qr_data||'İpeqcafeee'} size={150}/></article>:<div className="empty-state"><ShoppingBag/><h3>Henüz siparişin yok</h3><p>Yakındaki bir dükkândan ilk kahveni sipariş etmeye ne dersin?</p><button onClick={()=>setView('discover')}>Dükkânları keşfet</button></div>}</main>}

  {menuOpen&&<div className="overlay" onMouseDown={()=>setMenuOpen(false)}><section className="modal menu-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span>MENÜ</span><h2>{selected.name}</h2></div><button onClick={()=>setMenuOpen(false)}><X/></button></div><div className="menu-grid">{products.map(p=><button key={p.id} className="product-card" onClick={()=>{setSelectedProduct(p);createOrder(p)}}><div className="cup"><Coffee size={28}/></div><div><h3>{p.name}</h3><p>{p.description}</p><strong>{p.price} TL</strong></div></button>)}</div></section></div>}

  {otpOpen&&<div className="overlay"><section className="modal otp-modal"><button className="close" onClick={()=>setOtpOpen(false)}><X/></button><div className="otp-icon"><Coffee/></div><span>İPEQCAFEEE’E HOŞ GELDİN</span><h2>{otp?'Doğrulama kodunu gir':'Numaranı doğrula'}</h2>{otp? <><p>Demo OTP kodu: <b>1234</b></p><input className="otp-input" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={4} inputMode="numeric"/><button className="primary" onClick={verifyOtp}>Giriş Yap</button></>:<><p>Sana özel paket ve siparişlerini yönetmek için numaranı gir.</p><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX"/><button className="primary" onClick={sendOtp}>Kod Gönder</button></>}</section></div>}

  {toast&&<div className="toast"><Check size={18}/>{toast}</div>}
 </div>
}
export default App;
