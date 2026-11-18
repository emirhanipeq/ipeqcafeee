require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'ipeqcafeee-development-secret';
const QR_SECRET = process.env.QR_SECRET || 'ipeqcafeee-qr-development-secret';
let db;

const response = (res, status, data, error) => res.status(status).json({ success: status < 400, data: data ?? null, error: error ?? null });
const uid = () => crypto.randomUUID();
const rows = (sql, params = []) => db.exec(sql, params).flatMap(r => r.values.map(v => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))));
const run = (sql, params = []) => { db.run(sql, params); };

async function initDb() {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run(`
    CREATE TABLE users (id TEXT PRIMARY KEY, phone_number TEXT UNIQUE NOT NULL, full_name TEXT, email TEXT, role TEXT DEFAULT 'CUSTOMER', preferences TEXT, created_at TEXT);
    CREATE TABLE subscriptions (id TEXT PRIMARY KEY, user_id TEXT, plan_type TEXT, remaining_credits INTEGER, status TEXT, started_at TEXT, expires_at TEXT);
    CREATE TABLE shops (id TEXT PRIMARY KEY, name TEXT, address TEXT, latitude REAL, longitude REAL, rating REAL, is_open INTEGER, open_hours TEXT, image TEXT);
    CREATE TABLE products (id TEXT PRIMARY KEY, shop_id TEXT, name TEXT, category TEXT, price REAL, description TEXT);
    CREATE TABLE orders (id TEXT PRIMARY KEY, user_id TEXT, shop_id TEXT, product_id TEXT, size TEXT, sugar TEXT, milk TEXT, extra_shot INTEGER, status TEXT, qr_data TEXT, signature TEXT, created_at TEXT);
  `);

  const plans = ['Starter','Premium','Unlimited'];
  plans.forEach((name, i) => run('INSERT INTO subscriptions (id,user_id,plan_type,remaining_credits,status,started_at,expires_at) VALUES (?,?,?,?,?,?,?)', [`plan-${i+1}`,'',name,[10,20,-1][i],'AVAILABLE','', '']));

  const shopSeed = [
    ['İpeqcafeee Adapazarı','Orta Mah. Atatürk Bulvarı No:18, Adapazarı',40.7790,30.4020,4.8,1,'08:00–23:00','https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'],
    ['İpeqcafeee Serdivan','Meşelik Mah. Üniversite Cd. No:42, Serdivan',40.7885,30.3778,4.7,1,'07:30–22:30','https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800'],
    ['İpeqcafeee Sapanca','İstanbul Cd. No:75, Sapanca',40.6920,30.2667,4.9,1,'08:30–22:00','https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800'],
    ['İpeqcafeee AKM','Milli Egemenlik Cd. No:10, Adapazarı',40.7837,30.3972,4.6,1,'08:00–24:00','https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800'],
    ['İpeqcafeee Erenler','Erenler Merkez, Sakarya',40.7550,30.4140,4.5,0,'08:30–21:00','https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800'],
    ['İpeqcafeee Arifiye','İstasyon Mah. Sakarya Cd. No:21, Arifiye',40.7130,30.3560,4.7,1,'08:00–22:30','https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'],
    ['İpeqcafeee Kadıköy','Mühürdar Cd. No:12, Kadıköy',40.9881,29.0247,4.8,1,'08:00–23:00','https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'],
    ['İpeqcafeee Beşiktaş','Sinanpaşa Mah. Beşiktaş',41.0422,29.0053,4.6,1,'07:30–22:30','https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800'],
    ['İpeqcafeee Taksim','İstiklal Cd. No:25, Beyoğlu',41.0370,28.9834,4.7,1,'08:00–24:00','https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800']
  ];
  shopSeed.forEach((s, i) => run('INSERT INTO shops VALUES (?,?,?,?,?,?,?,?,?)', [`shop-${i+1}`,...s]));

  const products = [
    ['Espresso','Espresso',65,'Yoğun ve dengeli'],['Americano','Sıcak İçecek',75,'Hafif kavrulmuş çekirdek'],['Latte','Sütlü Kahve',95,'Kadifemsi sütlü'],['Flat White','Sütlü Kahve',105,'İki kat espresso'],['Cold Brew','Soğuk İçecek',110,'18 saat demleme'],['Türk Kahvesi','Geleneksel',70,'Mişli sert köpük']
  ];
  for (let i=1;i<=5;i++) products.forEach((p,j)=>run('INSERT INTO products VALUES (?,?,?,?,?,?)',[`product-${i}-${j+1}`,`shop-${i}`,p[0],p[1],p[2],p[3]]));
}

const auth = (req,res,next) => {
  const token = req.headers.authorization?.replace('Bearer ','');
  if (!token) return response(res,401,null,'Yetkilendirme gerekli');
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { response(res,401,null,'Geçersiz veya süresi dolmuş token'); }
};

app.get('/', (req,res)=>response(res,200,{name:'İpeqcafeee API',status:'running',frontend:'http://localhost:5173',health:'/api/v1/health'}));
app.get('/api/v1/health', (req,res)=>response(res,200,{status:'ok'}));
app.get('/api/v1/subscriptions/plans',(req,res)=>response(res,200,[
  {id:'starter',name:'Starter',price:89.99,credits:10,description:'Tüm dükkânlarda 10 kahve'},
  {id:'premium',name:'Premium',price:149.99,credits:20,description:'20 kahve + 2 misafir hakkı'},
  {id:'unlimited',name:'Unlimited',price:249.99,credits:-1,description:'Sınırsız kahve + öncelik'}
]));

app.post('/api/v1/auth/register',(req,res)=>{
  const {phone_number,role='CUSTOMER'}=req.body;
  if (!/^\+?\d{10,15}$/.test(phone_number||'')) return response(res,400,null,'Geçerli bir GSM numarası girin');
  let user=rows('SELECT * FROM users WHERE phone_number=?',[phone_number])[0];
  if (!user) { run('INSERT INTO users (id,phone_number,role,created_at) VALUES (?,?,?,?)',[uid(),phone_number,role,new Date().toISOString()]); user=rows('SELECT * FROM users WHERE phone_number=?',[phone_number])[0]; }
  response(res,200,{otp_sent:true,otp:'1234',user_id:user.id});
});

app.post('/api/v1/auth/verify-otp',(req,res)=>{
  const {user_id,otp}=req.body;
  if (otp !== '1234') return response(res,400,null,'OTP kodu hatalı');
  const user=rows('SELECT * FROM users WHERE id=?',[user_id])[0];
  if (!user) return response(res,404,null,'Kullanıcı bulunamadı');
  const accessToken=jwt.sign({sub:user.id,role:user.role,phone:user.phone_number},JWT_SECRET,{expiresIn:'2h'});
  const refreshToken=jwt.sign({sub:user.id},JWT_SECRET,{expiresIn:'7d'});
  response(res,200,{accessToken,refreshToken,user});
});

app.post('/api/v1/auth/refresh',(req,res)=>{
  try { const p=jwt.verify(req.body.refreshToken,JWT_SECRET); const user=rows('SELECT * FROM users WHERE id=?',[p.sub])[0]; response(res,200,{accessToken:jwt.sign({sub:user.id,role:user.role},JWT_SECRET,{expiresIn:'2h'}),user}); }
  catch { response(res,401,null,'Refresh token geçersiz'); }
});

app.patch('/api/v1/users/me',auth,(req,res)=>{
  const {full_name,email,preferences}=req.body;
  run('UPDATE users SET full_name=?,email=?,preferences=? WHERE id=?',[full_name,email,JSON.stringify(preferences||{}),req.user.sub]);
  response(res,200,rows('SELECT * FROM users WHERE id=?',[req.user.sub])[0]);
});

app.post('/api/v1/subscriptions',auth,(req,res)=>{
  const plan=String(req.body.plan_type||'starter').toLowerCase();
  const meta={starter:[10,89.99],premium:[20,149.99],unlimited:[-1,249.99]}[plan];
  if (!meta) return response(res,400,null,'Geçersiz paket');
  if (req.body.card_token !== '4242-4242-4242-4242') return response(res,402,null,'Ödeme başarısız');
  run('DELETE FROM subscriptions WHERE user_id=?',[req.user.sub]);
  const id=uid(), expires=new Date(); expires.setMonth(expires.getMonth()+1);
  run('INSERT INTO subscriptions (id,user_id,plan_type,remaining_credits,status,started_at,expires_at) VALUES (?,?,?,?,?,?,?)',[id,req.user.sub,plan,meta[0],'ACTIVE',new Date().toISOString(),expires.toISOString()]);
  response(res,201,rows('SELECT * FROM subscriptions WHERE id=?',[id])[0]);
});
app.get('/api/v1/subscriptions/me',auth,(req,res)=>response(res,200,rows('SELECT * FROM subscriptions WHERE user_id=?',[req.user.sub])[0]||null));

app.post('/api/v1/payments/process',(req,res)=>{
  const success=req.body.card_token==='4242-4242-4242-4242';
  if (!success) return response(res,402,null,'Kart reddedildi');
  response(res,200,{transaction_id:`TX-${crypto.randomUUID().slice(0,8).toUpperCase()}`,amount:req.body.amount||0,status:'SUCCESS',timestamp:new Date().toISOString()});
});

app.get('/api/v1/shops',(req,res)=>{
  const lat=Number(req.query.lat)||40.9912, lng=Number(req.query.lng)||29.027;
  const radius=Number(req.query.radius)||20;
  const q=String(req.query.q||'').toLowerCase();
  const shops=rows('SELECT * FROM shops').filter(s=>{
    const d=6371*2*Math.asin(Math.sqrt(Math.pow(Math.sin((s.latitude-lat)*Math.PI/360),2)+Math.cos(lat*Math.PI/180)*Math.cos(s.latitude*Math.PI/180)*Math.pow(Math.sin((s.longitude-lng)*Math.PI/360),2)));
    s.distance=Number(d.toFixed(1)); return d<=radius && (!q || s.name.toLowerCase().includes(q));
  }).sort((a,b)=>a.distance-b.distance);
  response(res,200,shops);
});
app.get('/api/v1/shops/:id/menu',(req,res)=>response(res,200,rows('SELECT * FROM products WHERE shop_id=?',[req.params.id])));

app.post('/api/v1/orders',auth,(req,res)=>{
  const sub=rows('SELECT * FROM subscriptions WHERE user_id=? AND status=?',[req.user.sub,'ACTIVE'])[0];
  if (!sub) return response(res,400,null,'Aktif abonelik bulunamadı');
  if (sub.remaining_credits===0) return response(res,400,null,'Aylık kahve hakkınız doldu');
  const {shop_id,product_id,size='M',sugar='Normal',milk='Sütlü',extra_shot=0}=req.body;
  if (!rows('SELECT id FROM shops WHERE id=?',[shop_id])[0]) return response(res,404,null,'Dükkân bulunamadı');
  const id=uid(), created_at=new Date().toISOString();
  const payload={order_id:id,user_id:req.user.sub,shop_id,created_at};
  const signature=crypto.createHmac('sha256',QR_SECRET).update(JSON.stringify(payload)).digest('hex');
  const qr_data=JSON.stringify({...payload,signature});
  run('INSERT INTO orders (id,user_id,shop_id,product_id,size,sugar,milk,extra_shot,status,qr_data,signature,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[id,req.user.sub,shop_id,product_id,size,sugar,milk,extra_shot,'PENDING',qr_data,signature,created_at]);
  if (sub.remaining_credits>0) run('UPDATE subscriptions SET remaining_credits=? WHERE id=?',[sub.remaining_credits-1,sub.id]);
  response(res,201,{...rows('SELECT * FROM orders WHERE id=?',[id])[0],qr_data});
});
app.get('/api/v1/orders/history',auth,(req,res)=>response(res,200,rows('SELECT o.*,s.name shop_name,p.name product_name FROM orders o LEFT JOIN shops s ON s.id=o.shop_id LEFT JOIN products p ON p.id=o.product_id WHERE o.user_id=? ORDER BY o.created_at DESC',[req.user.sub])));
app.get('/api/v1/orders/:id',auth,(req,res)=>{
  const order=rows('SELECT o.*,s.name shop_name,p.name product_name FROM orders o LEFT JOIN shops s ON s.id=o.shop_id LEFT JOIN products p ON p.id=o.product_id WHERE o.id=?',[req.params.id])[0];
  if (!order) return response(res,404,null,'Sipariş bulunamadı');
  response(res,200,order);
});
app.patch('/api/v1/orders/:id/status',auth,(req,res)=>{
  const allowed=['PENDING','ACCEPTED','PREPARING','READY','DELIVERED','CANCELLED'];
  if (!allowed.includes(req.body.status)) return response(res,400,null,'Geçersiz sipariş durumu');
  run('UPDATE orders SET status=? WHERE id=?',[req.body.status,req.params.id]);
  response(res,200,rows('SELECT * FROM orders WHERE id=?',[req.params.id])[0]);
});
app.post('/api/v1/orders/:id/verify',(req,res)=>{
  try { const payload=JSON.parse(req.body.qr_data); const {signature,...base}=payload; const expected=crypto.createHmac('sha256',QR_SECRET).update(JSON.stringify(base)).digest('hex'); response(res,expected===signature?200:400,{verified:expected===signature},expected===signature?null:'QR imzası geçersiz'); } catch { response(res,400,null,'QR verisi okunamadı'); }
});

app.use((req,res)=>response(res,404,null,'Endpoint bulunamadı'));
app.use((err,req,res,next)=>response(res,500,null,'Beklenmeyen bir sunucu hatası'));

initDb().then(()=>app.listen(PORT,()=>console.log(`İpeqcafeee API http://localhost:${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
