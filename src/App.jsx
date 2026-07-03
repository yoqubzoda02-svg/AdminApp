import { useState, useEffect, useRef } from "react";
import { db } from './firebase.js';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, setDoc, getDoc, getDocs, where } from 'firebase/firestore';

// ── THEME ─────────────────────────────────────────────────────
const BG    = '#0F0D0B';
const CARD  = '#1C1814';
const CARD2 = '#241F1A';
const INK   = '#F2EDE4';
const GOLD  = '#C9952A';
const GOLDD = '#A07820';
const MUTED = '#7A6A5A';
const LINE  = '#2E2520';
const GREEN = '#2E9B5C';
const RED   = '#C24E4E';
const BLUE  = '#3E76A8';

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n||0));
const nowStr = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0,10);

const S = {
  btn:   (c=GOLD)=>({ background:c, border:'none', borderRadius:12, padding:'13px 18px', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', width:'100%', fontFamily:'inherit' }),
  btnSm: (c=GOLD)=>({ background:'none', border:`1.5px solid ${c}`, borderRadius:8, padding:'7px 13px', color:c, fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }),
  input: { background:CARD2, border:`1.5px solid ${LINE}`, borderRadius:10, padding:'12px 13px', color:INK, fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  card:  { background:CARD, borderRadius:14, border:`1px solid ${LINE}`, overflow:'hidden' },
  row:   { display:'flex', alignItems:'center', gap:8 },
};

// ── PIN LOCK ──────────────────────────────────────────────────
const getAdminPin = () => {
  try { return JSON.parse(localStorage.getItem('qs_admin_settings')||'{}').pin||'1234'; }
  catch { return '1234'; }
};

function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);

  const press = (d) => {
    const next = pin + d;
    setErr(false);
    if(next.length < 4) { setPin(next); return; }
    if(next === getAdminPin()) { onUnlock(); }
    else { setErr(true); setPin(''); }
  };

  return (
    <div style={{ background:BG, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLDD})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:900, color:'#fff', marginBottom:20 }}>QS</div>
      <div style={{ fontFamily:"Georgia,serif", fontSize:22, color:GOLD, letterSpacing:2, marginBottom:4 }}>QUEEN STAR</div>
      <div style={{ fontSize:11, color:MUTED, letterSpacing:2, marginBottom:36 }}>ADMIN PANEL</div>
      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{ width:14, height:14, borderRadius:'50%', background:pin.length>i?GOLD:LINE, transition:'background 0.15s' }}/>
        ))}
      </div>
      {err && <div style={{ color:RED, fontSize:13, marginBottom:12, fontWeight:600 }}>Неверный PIN</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,72px)', gap:12 }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d,i)=>(
          <button key={i} onClick={()=>d==='⌫'?setPin(p=>p.slice(0,-1)):d&&press(d)}
            style={{ height:72, borderRadius:14, border:'none', background:d?CARD2:'transparent', color:INK, fontSize:22, fontWeight:600, cursor:d?'pointer':'default', fontFamily:'inherit', ...(d==='⌫'?{color:MUTED}:{}) }}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ toasts }) {
  if(!toasts.length) return null;
  return (
    <div style={{ position:'fixed', top:60, left:0, right:0, zIndex:999, padding:'0 14px', pointerEvents:'none' }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.color||GOLD, color:'#fff', borderRadius:10, padding:'11px 15px', marginBottom:7, fontSize:13, fontWeight:600, boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}>{t.msg}</div>
      ))}
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function BottomNav({ tab, setTab, unreadOrders, unreadChats }) {
  const tabs = [
    { id:'dash',     icon:'🏠', label:'Главная' },
    { id:'orders',   icon:'📦', label:'Заказы',  badge:unreadOrders },
    { id:'products', icon:'👟', label:'Товары' },
    { id:'customers',icon:'👥', label:'Клиенты' },
    { id:'chat',     icon:'💬', label:'Чат',     badge:unreadChats },
    { id:'settings', icon:'⚙️', label:'Настройки' },
  ];
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, background:CARD, borderTop:`1px solid ${LINE}`, display:'flex', zIndex:50 }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)}
          style={{ flex:1, padding:'10px 0 12px', background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, position:'relative' }}>
          <div style={{ fontSize:20 }}>{t.icon}</div>
          <div style={{ fontSize:9, color:tab===t.id?GOLD:MUTED, fontWeight:tab===t.id?700:400, fontFamily:'inherit' }}>{t.label}</div>
          {t.badge>0 && <div style={{ position:'absolute', top:6, right:'calc(50% - 18px)', background:RED, color:'#fff', borderRadius:'50%', fontSize:9, fontWeight:700, width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center' }}>{t.badge}</div>}
          {tab===t.id && <div style={{ position:'absolute', bottom:0, left:'25%', right:'25%', height:2, background:GOLD, borderRadius:2 }}/>}
        </button>
      ))}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ orders, customers, products }) {
  const todayOrders = orders.filter(o=>o.date?.startsWith(todayStr()));
  const todayRevenue = todayOrders.filter(o=>o.status==='done').reduce((s,o)=>s+o.total,0);
  const newOrders = orders.filter(o=>o.status==='new').length;
  const inDelivery = orders.filter(o=>o.status==='delivery').length;
  const totalStock = products.reduce((s,p)=>s+(p.qty-(p.reserved||0)),0);

  return (
    <div style={{ padding:'14px 14px 80px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLDD})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#fff' }}>QS</div>
        <div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:17, color:GOLD }}>Queen Star Admin</div>
          <div style={{ fontSize:11, color:MUTED }}>{new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        {[
          { label:'Выручка сегодня', value:fmt(todayRevenue)+' сом', color:GOLD, icon:'💰' },
          { label:'Новых заказов', value:newOrders, color:newOrders>0?RED:MUTED, icon:'📦' },
          { label:'В доставке', value:inDelivery, color:BLUE, icon:'🚚' },
          { label:'Товар на складе', value:totalStock+' пар', color:GREEN, icon:'👟' },
        ].map((s,i)=>(
          <div key={i} style={{ ...S.card, padding:14 }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {newOrders>0 && (
        <div style={{ ...S.card, padding:14, borderColor:RED+'55', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:RED, marginBottom:8 }}>🔴 Новые заказы — нужно обработать</div>
          {orders.filter(o=>o.status==='new').slice(0,3).map(o=>(
            <div key={o.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${LINE}` }}>
              <div>
                <div style={{ fontSize:13, color:INK, fontWeight:600 }}>{o.customerName}</div>
                <div style={{ fontSize:11, color:MUTED }}>{o.productName} · р.{o.size}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:GOLD }}>{fmt(o.total)} сом</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...S.card, padding:14 }}>
        <div style={{ fontSize:12, color:MUTED, fontWeight:700, marginBottom:10 }}>📊 ЗА СЕГОДНЯ</div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ fontSize:13, color:MUTED }}>Всего заказов</div>
          <div style={{ fontSize:13, fontWeight:700, color:INK }}>{todayOrders.length}</div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ fontSize:13, color:MUTED }}>Выполнено</div>
          <div style={{ fontSize:13, fontWeight:700, color:GREEN }}>{todayOrders.filter(o=>o.status==='done').length}</div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontSize:13, color:MUTED }}>Клиентов в базе</div>
          <div style={{ fontSize:13, fontWeight:700, color:INK }}>{customers.length}</div>
        </div>
      </div>
    </div>
  );
}

// ── ORDERS ────────────────────────────────────────────────────
const STATUS = {
  new:       { l:'Новый',      c:RED,   next:'delivery', nextL:'🚚 Отправить' },
  delivery:  { l:'В доставке', c:BLUE,  next:'done',     nextL:'✓ Выдан' },
  done:      { l:'Выдан',      c:GREEN, next:null,       nextL:null },
  cancelled: { l:'Отменён',    c:MUTED, next:null,       nextL:null },
};

function Orders({ orders, addToast }) {
  const [filter, setFilter] = useState('new');
  const [search, setSearch] = useState('');

  const changeStatus = async (id, next) => {
    try {
      await updateDoc(doc(db,'shop_orders',id), { status: next });
      addToast(next==='delivery'?'🚚 Заказ отправлен':next==='done'?'✅ Заказ выдан':'Статус обновлён', next==='done'?GREEN:BLUE);
    } catch { addToast('Ошибка обновления', RED); }
  };

  const cancel = async (id) => {
    try { await updateDoc(doc(db,'shop_orders',id), { status:'cancelled' }); addToast('Заказ отменён', MUTED); }
    catch { addToast('Ошибка', RED); }
  };

  const filtered = orders
    .filter(o => filter==='all' || o.status===filter)
    .filter(o => !search || o.customerName?.toLowerCase().includes(search.toLowerCase()) || o.productName?.toLowerCase().includes(search.toLowerCase()) || o.customerPhone?.includes(search));

  const counts = { new:orders.filter(o=>o.status==='new').length, delivery:orders.filter(o=>o.status==='delivery').length, done:orders.filter(o=>o.status==='done').length, all:orders.length };

  return (
    <div style={{ padding:'14px 14px 80px' }}>
      <div style={{ fontSize:18, fontWeight:700, color:INK, marginBottom:14 }}>📦 Заказы</div>
      <input style={{ ...S.input, marginBottom:12 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по имени, товару, телефону..."/>
      <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:14, paddingBottom:2 }}>
        {[['new','Новые',RED],['delivery','В пути',BLUE],['done','Выданы',GREEN],['all','Все',MUTED]].map(([id,l,c])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{ ...S.btnSm(filter===id?c:MUTED), ...(filter===id?{background:c,color:'#fff'}:{}), flexShrink:0 }}>
            {l} {counts[id]>0&&`(${counts[id]})`}
          </button>
        ))}
      </div>
      {filtered.length===0 && <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>Заказов нет</div>}
      {filtered.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(o=>{
        const st = STATUS[o.status]||STATUS.new;
        return (
          <div key={o.id} style={{ ...S.card, padding:15, marginBottom:11 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:INK }}>{o.customerName}</div>
                <div style={{ fontSize:11, color:MUTED, marginTop:1 }}>📞 {o.customerPhone}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:16, fontWeight:800, color:GOLD }}>{fmt(o.total)} сом</div>
                <div style={{ fontSize:10, color:st.c, fontWeight:700, marginTop:2 }}>● {st.l}</div>
              </div>
            </div>
            <div style={{ background:CARD2, borderRadius:9, padding:'9px 11px', marginBottom:10 }}>
              <div style={{ fontSize:13, color:INK, fontWeight:600 }}>{o.productName}</div>
              <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>Размер {o.size} · {o.qty||1} шт · {o.payment==='transfer'?'💳 Перевод':'💵 Наличные'}</div>
              {o.address&&<div style={{ fontSize:11, color:BLUE, marginTop:3 }}>📍 {o.address}</div>}
            </div>
            <div style={{ fontSize:10, color:MUTED, marginBottom:10 }}>{new Date(o.date).toLocaleString('ru-RU')}</div>
            {o.status!=='done'&&o.status!=='cancelled'&&(
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ ...S.btn(st.c), flex:3, padding:'10px' }} onClick={()=>changeStatus(o.id,st.next)}>{st.nextL}</button>
                <button style={{ ...S.btn(LINE), flex:1, padding:'10px', color:MUTED }} onClick={()=>cancel(o.id)}>✕</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── PRODUCTS (FULL FORM) ──────────────────────────────────────
const SIZES_LIST = ['35','36','37','38','39','40','41','42','43'];
const EMPTY_PRODUCT = {
  id:'', name:'', description:'', price:'', cost:'',
  qty:'', region:'both', delivery:'1-2 дня',
  color:'', material:'', brand:'Queen Star',
  sizes:{}, videoUrl:'', photos:[]
};

function ImageUploader({ photos, onChange }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const addPhotos = (files) => {
    setLoading(true);
    const readers = Array.from(files).slice(0, 10 - photos.length).map(file =>
      new Promise(res=>{
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(file);
      })
    );
    Promise.all(readers).then(results=>{
      onChange([...photos, ...results].slice(0,10));
      setLoading(false);
    });
  };

  return (
    <div>
      <div style={{ fontSize:11, color:MUTED, fontWeight:700, marginBottom:8 }}>ФОТО ({photos.length}/10)</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
        {photos.map((ph,i)=>(
          <div key={i} style={{ position:'relative', width:72, height:72 }}>
            <img src={ph} style={{ width:72, height:72, borderRadius:8, objectFit:'cover', border:`1px solid ${LINE}` }}/>
            <button onClick={()=>onChange(photos.filter((_,idx)=>idx!==i))}
              style={{ position:'absolute', top:-6, right:-6, background:RED, border:'none', borderRadius:'50%', width:20, height:20, color:'#fff', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            {i===0 && <div style={{ position:'absolute', bottom:2, left:2, background:GOLD, borderRadius:4, fontSize:8, color:'#fff', padding:'1px 4px', fontWeight:700 }}>ГЛАВНОЕ</div>}
          </div>
        ))}
        {photos.length<10 && (
          <button onClick={()=>fileRef.current?.click()}
            style={{ width:72, height:72, borderRadius:8, border:`2px dashed ${LINE}`, background:'none', color:MUTED, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
            <span style={{ fontSize:22 }}>📷</span>
            <span style={{ fontSize:9 }}>{loading?'...':'Добавить'}</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=>addPhotos(e.target.files)}/>
      <div style={{ fontSize:10, color:MUTED }}>Первое фото — главное. Перетащи чтобы изменить порядок.</div>
    </div>
  );
}

function SizePicker({ sizes, onChange }) {
  return (
    <div>
      <div style={{ fontSize:11, color:MUTED, fontWeight:700, marginBottom:8 }}>РАЗМЕРЫ И ОСТАТОК</div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {SIZES_LIST.map(s=>{
          const qty = sizes[s];
          const active = qty !== undefined;
          return (
            <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div onClick={()=>{
                const next = {...sizes};
                if(active) delete next[s]; else next[s]=1;
                onChange(next);
              }} style={{ width:42, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:13, fontWeight:700,
                background:active?GOLD:CARD2, color:active?'#fff':MUTED, border:`1.5px solid ${active?GOLD:LINE}` }}>
                {s}
              </div>
              {active && (
                <input type="number" min="0" value={qty} onChange={e=>onChange({...sizes,[s]:Number(e.target.value)})}
                  style={{ width:42, background:CARD2, border:`1px solid ${LINE}`, borderRadius:6, padding:'3px 4px', color:INK, fontSize:11, textAlign:'center', outline:'none' }}/>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:10, color:MUTED, marginTop:6 }}>Нажми на размер → выбери, введи кол-во пар</div>
    </div>
  );
}

function Products({ products, addToast }) {
  const [view, setView]     = useState('list'); // list | add | edit
  const [f, setF]           = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setF(prev=>({...prev, [k]:v}));

  const openEdit = async (product) => {
    // Load existing photos
    const pSnap = await getDoc(doc(db,'qs','photos'));
    const photosObj = pSnap.exists() ? JSON.parse(pSnap.data().v||'{}') : {};
    const ph = photosObj[product.id];
    const photoArr = Array.isArray(ph) ? ph : ph ? [ph] : [];
    setF({ ...EMPTY_PRODUCT, ...product, price:String(product.price||''), cost:String(product.cost||''), qty:String(product.qty||''), photos:photoArr, sizes:product.sizes||{}, description:product.description||'', delivery:product.delivery||'1-2 дня', color:product.color||'', material:product.material||'', videoUrl:product.videoUrl||'' });
    setView('edit');
  };

  const save = async () => {
    if(!f.id.trim()||!f.name.trim()||!f.price){ addToast('Заполни SKU, название и цену', RED); return; }
    setSaving(true);
    try {
      // 1. Save product data
      const pSnap = await getDoc(doc(db,'qs','products'));
      const list = pSnap.exists() ? JSON.parse(pSnap.data().v) : [];
      const totalQty = Object.values(f.sizes).reduce((s,n)=>s+n,0) || Number(f.qty)||0;
      const newProd = {
        id: f.id.trim().toUpperCase(),
        name: f.name.trim(),
        description: f.description.trim(),
        price: Number(f.price),
        cost: Number(f.cost)||0,
        qty: totalQty,
        sizes: f.sizes,
        reserved: 0,
        transit: false,
        region: f.region,
        delivery: f.delivery,
        color: f.color,
        material: f.material,
        brand: f.brand||'Queen Star',
        videoUrl: f.videoUrl,
      };
      const idx = list.findIndex(p=>p.id===newProd.id);
      if(idx>=0) list[idx]={...list[idx],...newProd};
      else list.push(newProd);
      await setDoc(doc(db,'qs','products'),{v:JSON.stringify(list),ts:Date.now()},{merge:true});

      // 2. Save photos
      if(f.photos.length>0){
        const phSnap = await getDoc(doc(db,'qs','photos'));
        const photosObj = phSnap.exists() ? JSON.parse(phSnap.data().v||'{}') : {};
        photosObj[newProd.id] = f.photos.length===1 ? f.photos[0] : f.photos;
        await setDoc(doc(db,'qs','photos'),{v:JSON.stringify(photosObj),ts:Date.now()},{merge:true});
      }

      addToast('✅ Товар сохранён на сайте!', GREEN);
      setF(EMPTY_PRODUCT);
      setView('list');
    } catch(e){ addToast('Ошибка: '+e.message, RED); }
    setSaving(false);
  };

  if(view==='list') return (
    <div style={{ padding:'14px 14px 80px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:18, fontWeight:700, color:INK }}>👟 Товары ({products.filter(p=>!p.transit).length})</div>
        <button style={{ ...S.btnSm(GOLD), background:GOLD, color:'#fff' }} onClick={()=>{ setF(EMPTY_PRODUCT); setView('add'); }}>+ Добавить</button>
      </div>
      {products.filter(p=>!p.transit).map(p=>(
        <div key={p.id} onClick={()=>openEdit(p)} style={{ ...S.card, padding:13, marginBottom:9, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
          <div>
            <div style={{ fontSize:10, color:GOLD, fontWeight:700, marginBottom:2 }}>{p.id}</div>
            <div style={{ fontSize:14, fontWeight:600, color:INK }}>{p.name}</div>
            <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>В наличии: {p.qty-(p.reserved||0)} пар · {p.delivery||'—'}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:16, fontWeight:800, color:GOLD }}>{fmt(p.price)}</div>
            <div style={{ fontSize:10, color:MUTED }}>сом</div>
            <div style={{ fontSize:10, color:BLUE, marginTop:4 }}>Редактировать →</div>
          </div>
        </div>
      ))}
    </div>
  );

  // Add / Edit form
  return (
    <div style={{ padding:'14px 14px 80px', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <button onClick={()=>setView('list')} style={{ background:'none', border:'none', color:GOLD, fontSize:14, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>← Назад</button>
        <div style={{ fontSize:16, fontWeight:700, color:INK }}>{view==='add'?'Новый товар':'Редактировать'}</div>
        <div style={{ width:60 }}/>
      </div>

      {/* Photos */}
      <div style={{ ...S.card, padding:14, marginBottom:12 }}>
        <ImageUploader photos={f.photos} onChange={v=>set('photos',v)}/>
      </div>

      {/* Video URL */}
      <div style={{ ...S.card, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:11, color:MUTED, fontWeight:700, marginBottom:8 }}>🎥 ВИДЕО (ссылка YouTube / Google Drive)</div>
        <input style={S.input} value={f.videoUrl} onChange={e=>set('videoUrl',e.target.value)} placeholder="https://youtube.com/watch?v=..."/>
      </div>

      {/* Basic info */}
      <div style={{ ...S.card, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:11, color:MUTED, fontWeight:700, marginBottom:12 }}>ОСНОВНАЯ ИНФОРМАЦИЯ</div>
        {[
          ['id',      'SKU (напр. ЖМ-005)', 'text'],
          ['name',    'Название товара', 'text'],
          ['brand',   'Бренд', 'text'],
          ['color',   'Цвет', 'text'],
          ['material','Материал', 'text'],
        ].map(([k,ph,t])=>(
          <div key={k} style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:MUTED, marginBottom:4 }}>{ph.toUpperCase()}</div>
            <input style={S.input} type={t} value={f[k]||''} onChange={e=>set(k,e.target.value)} placeholder={ph}/>
          </div>
        ))}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:MUTED, marginBottom:4 }}>ОПИСАНИЕ</div>
          <textarea value={f.description} onChange={e=>set('description',e.target.value)}
            placeholder="Опиши товар — материал, особенности, уход..."
            style={{ ...S.input, minHeight:90, resize:'vertical' }}/>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ ...S.card, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:11, color:MUTED, fontWeight:700, marginBottom:12 }}>ЦЕНА И ЗАКУПКА</div>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:MUTED, marginBottom:4 }}>ЦЕНА ПРОДАЖИ (СОМ)</div>
            <input style={S.input} type="number" value={f.price} onChange={e=>set('price',e.target.value)} placeholder="150"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:MUTED, marginBottom:4 }}>СЕБЕСТОИМОСТЬ (СОМ)</div>
            <input style={S.input} type="number" value={f.cost} onChange={e=>set('cost',e.target.value)} placeholder="70"/>
          </div>
        </div>
        {f.price&&f.cost&&Number(f.price)>Number(f.cost)&&(
          <div style={{ background:GREEN+'22', borderRadius:8, padding:'8px 12px', fontSize:12, color:GREEN, fontWeight:600 }}>
            💰 Маржа: {fmt(Number(f.price)-Number(f.cost))} сом ({Math.round((Number(f.price)-Number(f.cost))/Number(f.price)*100)}%)
          </div>
        )}
      </div>

      {/* Sizes */}
      <div style={{ ...S.card, padding:14, marginBottom:12 }}>
        <SizePicker sizes={f.sizes} onChange={v=>set('sizes',v)}/>
        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:MUTED, marginBottom:4 }}>ИЛИ ОБЩЕЕ КОЛ-ВО (если без размеров)</div>
            <input style={S.input} type="number" value={f.qty} onChange={e=>set('qty',e.target.value)} placeholder="10"/>
          </div>
        </div>
      </div>

      {/* Delivery & Region */}
      <div style={{ ...S.card, padding:14, marginBottom:16 }}>
        <div style={{ fontSize:11, color:MUTED, fontWeight:700, marginBottom:12 }}>ДОСТАВКА И РЕГИОН</div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:MUTED, marginBottom:4 }}>СРОК ДОСТАВКИ</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['1-2 дня','2-3 дня','3-5 дней','7-10 дней'].map(d=>(
              <button key={d} onClick={()=>set('delivery',d)}
                style={{ ...S.btnSm(f.delivery===d?GOLD:MUTED), ...(f.delivery===d?{background:GOLD,color:'#fff'}:{}) }}>
                {d}
              </button>
            ))}
          </div>
          <input style={{ ...S.input, marginTop:8 }} value={f.delivery} onChange={e=>set('delivery',e.target.value)} placeholder="Или напиши сам..."/>
        </div>
        <div>
          <div style={{ fontSize:10, color:MUTED, marginBottom:6 }}>РЕГИОН ПРОДАЖИ</div>
          {[['both','🌍 Везде (Душанбе + Россия)'],['dushanbe','🇹🇯 Только Душанбе'],['russia','🇷🇺 Только Россия']].map(([v,l])=>(
            <div key={v} onClick={()=>set('region',v)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', marginBottom:6, borderRadius:9, cursor:'pointer',
                background:f.region===v?GOLD+'22':CARD2, border:`1.5px solid ${f.region===v?GOLD:LINE}` }}>
              <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${f.region===v?GOLD:MUTED}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {f.region===v&&<div style={{ width:8, height:8, borderRadius:'50%', background:GOLD }}/>}
              </div>
              <div style={{ fontSize:13, color:f.region===v?INK:MUTED, fontWeight:f.region===v?600:400 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <button style={{ ...S.btn(), ...(saving?{opacity:0.7}:{}) }} onClick={save} disabled={saving}>
        {saving?'Сохраняем...':'💾 Сохранить товар на сайте'}
      </button>
    </div>
  );
}


// ── CUSTOMERS ─────────────────────────────────────────────────
function Customers({ customers, orders }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = customers.filter(c=>!search||c.name?.toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search));

  if(selected){
    const custOrders = orders.filter(o=>o.customerPhone===selected.phone||o.customerId===selected.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const spent = custOrders.filter(o=>o.status==='done').reduce((s,o)=>s+o.total,0);
    return (
      <div style={{ padding:'14px 14px 80px' }}>
        <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:GOLD, fontSize:14, cursor:'pointer', marginBottom:14, fontFamily:'inherit', fontWeight:600 }}>← Назад</button>
        <div style={{ ...S.card, padding:16, marginBottom:14 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLDD})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', fontWeight:700, marginBottom:10 }}>{selected.name?.[0]?.toUpperCase()||'?'}</div>
          <div style={{ fontSize:18, fontWeight:700, color:INK }}>{selected.name}</div>
          <div style={{ fontSize:13, color:MUTED, marginTop:3 }}>{selected.phone}</div>
          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <div style={{ flex:1, background:CARD2, borderRadius:10, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:GOLD }}>{custOrders.length}</div>
              <div style={{ fontSize:10, color:MUTED }}>заказов</div>
            </div>
            <div style={{ flex:1, background:CARD2, borderRadius:10, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:GREEN }}>{fmt(spent)}</div>
              <div style={{ fontSize:10, color:MUTED }}>сом потрачено</div>
            </div>
            <div style={{ flex:1, background:CARD2, borderRadius:10, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:BLUE }}>{selected.loyaltyPoints||0}</div>
              <div style={{ fontSize:10, color:MUTED }}>кешбек сом</div>
            </div>
          </div>
          <a href={`tel:${selected.phone}`} style={{ ...S.btn(GREEN), display:'block', textDecoration:'none', textAlign:'center', marginTop:14 }}>📞 Позвонить</a>
          <a href={`https://wa.me/${(selected.phone||'').replace(/\D/g,'')}`} target="_blank" style={{ ...S.btn(CARD2), display:'block', textDecoration:'none', textAlign:'center', marginTop:8, color:INK }}>💬 WhatsApp</a>
        </div>
        <div style={{ fontSize:12, color:MUTED, fontWeight:700, marginBottom:10 }}>ИСТОРИЯ ЗАКАЗОВ</div>
        {custOrders.map(o=>(
          <div key={o.id} style={{ ...S.card, padding:13, marginBottom:9 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, fontWeight:600, color:INK }}>{o.productName}</div>
              <div style={{ fontSize:14, fontWeight:700, color:GOLD }}>{fmt(o.total)} сом</div>
            </div>
            <div style={{ fontSize:11, color:MUTED, marginTop:4 }}>р.{o.size} · {new Date(o.date).toLocaleDateString('ru-RU')} · <span style={{color:(STATUS[o.status]||STATUS.new).c}}>{(STATUS[o.status]||STATUS.new).l}</span></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding:'14px 14px 80px' }}>
      <div style={{ fontSize:18, fontWeight:700, color:INK, marginBottom:14 }}>👥 Клиенты ({customers.length})</div>
      <input style={{ ...S.input, marginBottom:12 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по имени или телефону..."/>
      {filtered.length===0&&<div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>Клиентов нет</div>}
      {filtered.map(c=>{
        const co=orders.filter(o=>o.customerPhone===c.phone||o.customerId===c.id);
        return(
          <div key={c.id} onClick={()=>setSelected(c)} style={{ ...S.card, padding:14, marginBottom:9, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLDD})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:700, flexShrink:0 }}>{c.name?.[0]?.toUpperCase()||'?'}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:INK }}>{c.name}</div>
                <div style={{ fontSize:11, color:MUTED }}>{c.phone}</div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:13, fontWeight:700, color:GOLD }}>{co.length} заказ</div>
              <div style={{ fontSize:10, color:MUTED, marginTop:2 }}>→</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ── CHAT (FIXED) ──────────────────────────────────────────────
function Chat({ addToast }) {
  const [messages, setMessages] = useState([]);
  const [active, setActive]     = useState(null); // customer name
  const [reply, setReply]       = useState('');
  const bottomRef = useRef(null);

  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,'consultant_chat'), orderBy('time','asc')),
      snap => setMessages(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>unsub();
  },[]);

  useEffect(()=>{
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100);
  },[messages, active]);

  // Group messages by customer (threadId = customer name)
  const threads = {};
  messages.forEach(m=>{
    const key = m.from==='admin' ? (m.threadId||'admin') : (m.name||'Анонимный');
    if(!threads[key]) threads[key]={name:key, msgs:[], lastTime:m.time, unread:0};
    threads[key].msgs.push(m);
    if(m.time > threads[key].lastTime) threads[key].lastTime = m.time;
    if(m.from!=='admin' && !m.read) threads[key].unread++;
  });

  // Build thread list sorted by last message time
  const threadList = Object.values(threads)
    .filter(t=>t.name!=='admin')
    .sort((a,b)=>b.lastTime.localeCompare(a.lastTime));

  const send = async () => {
    const text = reply.trim();
    if(!text || !active) return;
    setReply('');
    try {
      await addDoc(collection(db,'consultant_chat'),{
        from:'admin', name:'Queen Star', threadId:active,
        text, time:new Date().toISOString(), read:true
      });
    } catch(e){ setReply(text); addToast('Ошибка: '+e.message, RED); }
  };

  if(active){
    // Show all messages in this thread (from customer + admin replies to this customer)
    const threadMsgs = messages.filter(m=>
      (m.from!=='admin' && m.name===active) ||
      (m.from==='admin' && m.threadId===active)
    ).sort((a,b)=>a.time.localeCompare(b.time));

    return(
      <div style={{ position:'fixed', inset:0, background:BG, display:'flex', flexDirection:'column' }}>
        <div style={{ background:CARD, borderBottom:`1px solid ${LINE}`, padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>setActive(null)} style={{ background:'none', border:'none', color:GOLD, fontSize:20, cursor:'pointer' }}>←</button>
          <div style={{ width:36, height:36, borderRadius:'50%', background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700 }}>{active[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:INK }}>{active}</div>
            <div style={{ fontSize:11, color:MUTED }}>{(()=>{
                const lm=messages.filter(m=>m.name===active&&m.from!=='admin').slice(-1)[0];
                if(!lm) return 'нет сообщений';
                const mins=Math.round((Date.now()-new Date(lm.time))/60000);
                if(mins<2) return '● только что';
                if(mins<60) return `● ${mins} мин. назад`;
                return `● ${Math.round(mins/60)} ч. назад`;
              })()}</div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
          {threadMsgs.length===0&&<div style={{ textAlign:'center', padding:40, color:MUTED }}>Нет сообщений</div>}
          {threadMsgs.map(m=>(
            <div key={m.id} style={{ display:'flex', justifyContent:m.from==='admin'?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'80%', background:m.from==='admin'?GOLD:CARD2, color:'#fff', borderRadius:m.from==='admin'?'14px 4px 14px 14px':'4px 14px 14px 14px', padding:'10px 13px', fontSize:13 }}>
                {m.text}
                <div style={{ fontSize:9, opacity:0.7, marginTop:4 }}>
                  {new Date(m.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                  {m.from==='admin'&&' · Вы'}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div style={{ background:CARD, borderTop:`1px solid ${LINE}`, padding:'10px 14px', display:'flex', gap:8 }}>
          <input style={{ ...S.input, flex:1, padding:'11px 13px' }}
            value={reply} onChange={e=>setReply(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&e.target.value.trim()){e.preventDefault();send();}}}
            placeholder={`Написать ${active}...`}/>
          <button style={{ ...S.btn(reply.trim()?GOLD:MUTED), width:'auto', padding:'11px 20px' }} onClick={send} disabled={!reply.trim()}>➤</button>
        </div>
      </div>
    );
  }

  const totalUnread = threadList.reduce((s,t)=>s+t.unread,0);
  return(
    <div style={{ padding:'14px 14px 80px' }}>
      <div style={{ fontSize:18, fontWeight:700, color:INK, marginBottom:14 }}>
        💬 Чат {totalUnread>0&&<span style={{color:RED,fontSize:14}}>· {totalUnread} новых</span>}
      </div>
      {threadList.length===0&&<div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
        <div style={{ fontSize:36, marginBottom:12 }}>💬</div>
        Сообщений от покупателей пока нет
      </div>}
      {threadList.map(t=>{
        const last = t.msgs[t.msgs.length-1];
        return(
          <div key={t.name} onClick={()=>setActive(t.name)}
            style={{ ...S.card, padding:14, marginBottom:9, display:'flex', alignItems:'center', gap:12, cursor:'pointer', ...(t.unread>0?{borderColor:RED+'55'}:{}) }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:t.unread>0?RED:CARD2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:t.unread>0?14:18, color:'#fff', fontWeight:700, flexShrink:0 }}>
              {t.unread>0?t.unread:t.name[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:t.unread>0?700:500, color:INK }}>{t.name}</div>
              <div style={{ fontSize:12, color:MUTED, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {last?.from==='admin'?'Вы: ':''}{last?.text}
              </div>
            </div>
            <div style={{ fontSize:10, color:MUTED, flexShrink:0 }}>
              {last&&new Date(last.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────
const SETTINGS_KEY = 'qs_admin_settings';
const defaultSettings = { pin:'1234', waNumber:'992876982424', tgToken:'', tgChatId:'', storeName:'Queen Star', deliveryPrice:'30', openHours:'09:00–21:00' };

function Settings({ addToast }) {
  const [s, setS] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'); }catch{ return {}; }
  });
  const [saved, setSaved] = useState(false);

  const f = {...defaultSettings, ...s};
  const set = (k,v) => setS(p=>({...p,[k]:v}));

  const save = () => {
    try{
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({...defaultSettings,...s}));
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
      addToast('✅ Настройки сохранены', GREEN);
    }catch{ addToast('Ошибка сохранения', RED); }
  };

  const exportOrders = async () => {
    try {
      const snap = await getDocs(collection(db,'shop_orders'));
      const rows = [['Дата','Клиент','Телефон','Товар','Размер','Кол-во','Сумма','Статус','Адрес','Оплата']];
      snap.docs.forEach(d=>{
        const o=d.data();
        rows.push([o.date?.slice(0,10),o.customerName,o.customerPhone,o.productName,o.size,o.qty,o.total,(STATUS[o.status]||STATUS.new).l,o.address,o.payment]);
      });
      const csv = rows.map(r=>r.map(v=>`"${v||''}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='orders.csv'; a.click();
      addToast('✅ Заказы экспортированы', GREEN);
    }catch(e){ addToast('Ошибка экспорта', RED); }
  };

  const exportProducts = async () => {
    try {
      const snap = await getDoc(doc(db,'qs','products'));
      const products = snap.exists() ? JSON.parse(snap.data().v) : [];
      const rows = [['SKU','Название','Цена','Себестоимость','Остаток','Регион']];
      products.forEach(p=>rows.push([p.id,p.name,p.price,p.cost,p.qty-(p.reserved||0),p.region||'both']));
      const csv = rows.map(r=>r.map(v=>`"${v||''}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='products.csv'; a.click();
      addToast('✅ Товары экспортированы', GREEN);
    }catch(e){ addToast('Ошибка экспорта', RED); }
  };

  const exportCustomers = async () => {
    try {
      const snap = await getDocs(collection(db,'shop_customers'));
      const rows = [['Имя','Телефон','Дата регистрации','Кешбек']];
      snap.docs.forEach(d=>{ const c=d.data(); rows.push([c.name,c.phone,c.createdAt?.slice(0,10),c.loyaltyPoints||0]); });
      const csv = rows.map(r=>r.map(v=>`"${v||''}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='customers.csv'; a.click();
      addToast('✅ Клиенты экспортированы', GREEN);
    }catch(e){ addToast('Ошибка экспорта', RED); }
  };

  return (
    <div style={{ padding:'14px 14px 80px' }}>
      <div style={{ fontSize:18, fontWeight:700, color:INK, marginBottom:16 }}>⚙️ Настройки</div>

      {/* Security */}
      <div style={{ ...S.card, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:12, color:MUTED, fontWeight:700, marginBottom:12 }}>🔐 БЕЗОПАСНОСТЬ</div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>PIN-код (4 цифры)</div>
          <input style={S.input} type="password" maxLength={4} value={s.pin||''} onChange={e=>set('pin',e.target.value)} placeholder="1234"/>
        </div>
      </div>

      {/* Contacts */}
      <div style={{ ...S.card, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:12, color:MUTED, fontWeight:700, marginBottom:12 }}>📞 КОНТАКТЫ</div>
        {[
          ['waNumber','WhatsApp номер (без +)','992876982424'],
          ['storeName','Название магазина','Queen Star'],
          ['openHours','Часы работы','09:00–21:00'],
          ['deliveryPrice','Стоимость доставки (сом)','30'],
        ].map(([k,l,ph])=>(
          <div key={k} style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>{l.toUpperCase()}</div>
            <input style={S.input} value={s[k]||''} onChange={e=>set(k,e.target.value)} placeholder={ph}/>
          </div>
        ))}
      </div>

      {/* Telegram */}
      <div style={{ ...S.card, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:12, color:MUTED, fontWeight:700, marginBottom:12 }}>📱 TELEGRAM БОТ</div>
        <div style={{ fontSize:12, color:MUTED, marginBottom:12, lineHeight:1.7 }}>
          Получай уведомления о новых заказах в Telegram. Создай бота через @BotFather.
        </div>
        {[['tgToken','Токен бота (от @BotFather)'],['tgChatId','Твой Chat ID']].map(([k,l])=>(
          <div key={k} style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>{l.toUpperCase()}</div>
            <input style={S.input} value={s[k]||''} onChange={e=>set(k,e.target.value)} placeholder={k==='tgToken'?'8999492797:AAH...':'123456789'}/>
          </div>
        ))}
      </div>

      {/* Export */}
      <div style={{ ...S.card, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:12, color:MUTED, fontWeight:700, marginBottom:12 }}>📊 ЭКСПОРТ ДАННЫХ (CSV)</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button style={S.btn(BLUE)} onClick={exportOrders}>📦 Экспорт заказов</button>
          <button style={S.btn(GREEN)} onClick={exportProducts}>👟 Экспорт товаров</button>
          <button style={S.btn(GOLDD)} onClick={exportCustomers}>👥 Экспорт клиентов</button>
        </div>
        <div style={{ fontSize:11, color:MUTED, marginTop:10 }}>Файл CSV откроется в Excel</div>
      </div>

      <button style={{ ...S.btn(saved?GREEN:GOLD) }} onClick={save}>
        {saved?'✓ Сохранено!':'💾 Сохранить настройки'}
      </button>
    </div>
  );
}



// ── MAIN APP ─────────────────────────────────────────────────
export default function AdminApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab]           = useState('dash');
  const [orders, setOrders]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [toasts, setToasts]     = useState([]);
  const prevOrderCount = useRef(0);

  const addToast = (msg, color=GOLD) => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,color}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  };

  useEffect(()=>{
    if(!unlocked) return;

    // Orders - real time
    const unsubOrders = onSnapshot(
      query(collection(db,'shop_orders'), orderBy('date','desc')),
      snap=>{
        const list = snap.docs.map(d=>({id:d.id,...d.data()}));
        const newCount = list.filter(o=>o.status==='new').length;
        if(prevOrderCount.current>0 && newCount>prevOrderCount.current){
          addToast('🔔 Новый заказ!', RED);
        }
        prevOrderCount.current = newCount;
        setOrders(list);
      }
    );

    // Customers
    const unsubCust = onSnapshot(collection(db,'shop_customers'), snap=>{
      setCustomers(snap.docs.map(d=>({id:d.id,...d.data()})));
    });

    // Products
    const unsubProd = onSnapshot(doc(db,'qs','products'), snap=>{
      if(snap.exists()) try{ setProducts(JSON.parse(snap.data().v)); }catch{}
    });

    return()=>{ unsubOrders(); unsubCust(); unsubProd(); };
  },[unlocked]);

  if(!unlocked) return <PinScreen onUnlock={()=>setUnlocked(true)}/>;

  const unreadOrders = orders.filter(o=>o.status==='new').length;

  return(
    <div style={{ background:BG, minHeight:'100vh', color:INK, fontFamily:"-apple-system,'Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input::placeholder,textarea::placeholder{color:${MUTED};}select{appearance:none;}`}</style>
      <Toast toasts={toasts}/>
      <div style={{ paddingTop:8 }}>
        {tab==='dash'     && <Dashboard orders={orders} customers={customers} products={products}/>}
        {tab==='orders'   && <Orders orders={orders} addToast={addToast}/>}
        {tab==='products' && <Products products={products} addToast={addToast}/>}
        {tab==='customers'&& <Customers customers={customers} orders={orders}/>}
        {tab==='chat'     && <Chat addToast={addToast}/>}
        {tab==='settings' && <Settings addToast={addToast}/>}
      </div>
      <BottomNav tab={tab} setTab={setTab} unreadOrders={unreadOrders} unreadChats={0}/>
    </div>
  );
}
