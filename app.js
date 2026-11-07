/* منطق الموقع: السلة، المتجر، الدفع، الإرسال */
/* ===== السلة ===== */
let cart = {};
try { cart = JSON.parse(localStorage.getItem('hteen_cart') || '{}'); } catch(e){ cart = {}; }
const save = () => { try { localStorage.setItem('hteen_cart', JSON.stringify(cart)); } catch(e){} };
const $ = s => document.querySelector(s);
const money = n => n.toFixed(2) + ' د.أ';
const priceOf = p => p.offer ?? p.price;

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(()=>t.classList.remove('on'), 1800);
}

const thumb = (p, small) => p.img ? `<img src="${p.img}" alt="${p.name}" style="${small ? 'width:46px;height:46px;border-radius:50%;object-fit:cover' : ''}">` : `<span class="ph${small ? ' sm' : ''}" aria-hidden="true">${p.name[0]}</span>`;

function cardHTML(p){
  return `<article class="card">
    ${p.offer ? `<span class="badge">عرض</span>` : ''}
    <div class="pic">${thumb(p)}</div>
    <div class="body">
      <h3>${p.name}</h3><small>${p.desc}</small>
      <div class="price">${p.offer ? `<s>${money(p.price)}</s>` : ''}${money(priceOf(p))} <small>/ للحبة</small></div>
      <button class="add" onclick="addToCart(${p.id})">أضف إلى السلة</button>
    </div></article>`;
}

function addToCart(id){
  cart[id] = (cart[id] || 0) + 1; save(); updateCount();
  toast('تمت الإضافة إلى السلة: ' + PRODUCTS.find(p=>p.id===id).name);
  if ($('#cartItems')) renderCart();
}
function changeQty(id, d){
  cart[id] = (cart[id] || 0) + d;
  if (cart[id] <= 0) delete cart[id];
  save(); updateCount(); renderCart();
}
function removeItem(id){ delete cart[id]; save(); updateCount(); renderCart(); }
function updateCount(){ $('#count').textContent = Object.values(cart).reduce((a,b)=>a+b,0); }

function renderCart(){
  const ids = Object.keys(cart), co = $('#checkout');
  if (!ids.length){
    $('#cartItems').innerHTML = `<div class="empty"><p>السلة فارغة. اختر منتجاتك من المتجر لتظهر هنا.</p><a class="btn" href="shop.html">اذهب إلى المتجر</a></div>`;
    co.hidden = true; return;
  }
  let total = 0;
  const rows = ids.map(id => {
    const p = PRODUCTS.find(x => x.id == id), q = cart[id], line = priceOf(p) * q; total += line;
    return `<div class="cart-row">
      <div>${thumb(p,true)}</div>
      <div><b>${p.name}</b><br><small>${money(priceOf(p))} للحبة</small></div>
      <div class="qty"><button onclick="changeQty(${id},-1)" aria-label="إنقاص">−</button><b>${q}</b><button onclick="changeQty(${id},1)" aria-label="زيادة">+</button></div>
      <div class="line-total"><b>${money(line)}</b></div>
      <button class="rm" onclick="removeItem(${id})" aria-label="حذف ${p.name}">×</button>
    </div>`;
  }).join('');
  $('#cartItems').innerHTML = rows;
  $('#payTotal').textContent = money(total);
  co.hidden = false;
}

/* طرق الدفع */
function syncPay(){
  const v = document.querySelector('input[name="pay"]:checked').value;
  $('#cardBox').hidden = v !== 'card';
  $('#cliqBox').hidden = v !== 'cliq';
  ['holder','num','exp','cvv'].forEach(n => document.querySelector(`[name="${n}"]`).required = v === 'card');
}
document.querySelectorAll('input[name="pay"]').forEach(r => r.addEventListener('change', syncPay));
$('#orderForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, v = f.elements.pay.value;
  const payName = {cod:'الدفع عند الاستلام', card:'بطاقة بنكية', cliq:'حوالة كليك / محفظة'}[v];
  const no = 'HT-' + Math.floor(10000 + Math.random()*90000);
  let total = 0;
  const lines = Object.keys(cart).map(id => {
    const p = PRODUCTS.find(x => x.id == id), q = cart[id], l = priceOf(p) * q; total += l;
    return `- ${p.name} × ${q} = ${money(l)}`;
  }).join('\n');
  const msg = `طلب جديد من موقع مخبز حطين\nرقم الطلب: ${no}\n\n${lines}\n\nالمجموع: ${money(total)}\nطريقة الدفع: ${payName}\n\nالاسم: ${f.elements.cn.value}\nالهاتف: ${f.elements.cp.value}\nالعنوان: ${f.elements.ca.value}`;
  const note = {cod:'ستدفع نقدًا عند الاستلام.', card:'الدفع بالبطاقة تجريبي حاليًا ولم يتم سحب أي مبلغ.', cliq:'حوّل المبلغ عبر كليك وأرسل صورة الحوالة.'}[v];
  const cust = {n:f.elements.cn.value, p:f.elements.cp.value, a:f.elements.ca.value};
  cart = {}; save(); updateCount(); f.reset(); syncPay();
  $('#checkout').hidden = true;
  $('#cartItems').innerHTML = `<div class="done"><h2>تم تجهيز طلبك</h2>
    <p>رقم الطلب: <b>${no}</b> — المجموع: <b>${money(total)}</b></p><p>${note}</p>
    <p id="sendStatus"><b>جاري إرسال طلبك إلينا...</b></p>
    <a class="btn" href="shop.html" style="margin-top:14px">متابعة التسوق</a></div>`;
  window.scrollTo(0,0);
  const wa = await sendWhatsApp(msg);
  const ok = await sendEmail('طلب جديد ' + no, {
    'رقم الطلب': no, 'الطلب': lines, 'المجموع': money(total), 'طريقة الدفع': payName,
    'الاسم': cust.n, 'الهاتف': cust.p, 'العنوان': cust.a
  });
  $('#sendStatus').innerHTML = (wa === 'auto' || ok)
    ? '<b>وصلنا طلبك وسنتواصل معك قريبًا.</b>'
    : wa === 'manual'
      ? '<b>اضغط "إرسال" في نافذة واتساب التي فُتحت ليصلنا طلبك.</b>'
      : '<b>تعذّر إرسال الطلب.</b> اتصل بنا على 0789710378.';
});

/* ===== المتجر ===== */
let currentCat = 'الكل';
function renderShop(){
  const cats = ['الكل', ...new Set(PRODUCTS.map(p => p.cat))];
  $('#filters').innerHTML = cats.map(c => `<button class="${c===currentCat?'on':''}" onclick="currentCat='${c}';renderShop()">${c}</button>`).join('');
  $('#shopGrid').innerHTML = PRODUCTS.filter(p => currentCat==='الكل' || p.cat===currentCat).map(cardHTML).join('');
}

/* ===== بيانات التواصل ===== */
const waLink = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
const mailLink = (sub, body) => `mailto:${MAIL}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;

function contactMsg(){
  const f = $('#contactForm');
  return `رسالة من موقع مخبز حطين\nالاسم: ${f.elements.n.value}\nالهاتف: ${f.elements.p.value}\nالرسالة: ${f.elements.m.value}`;
}
/* إرسال تلقائي إلى واتساب عبر CallMeBot */
async function sendWhatsApp(text){
  if (!WA_APIKEY){ window.open(waLink(text), '_blank', 'noopener'); return 'manual'; }
  try{
    await fetch(`https://api.callmebot.com/whatsapp.php?phone=%2B${WA}&text=${encodeURIComponent(text)}&apikey=${WA_APIKEY}`, {mode:'no-cors'});
    return 'auto';
  }catch(e){ return false; }
}

/* إرسال تلقائي إلى الإيميل عبر خدمة FormSubmit (بدون سيرفر) */
async function sendEmail(subject, fields){
  try{
    const r = await fetch('https://formsubmit.co/ajax/' + MAIL, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({_subject:subject, _template:'table', _captcha:'false', ...fields})
    });
    const d = await r.json();
    return r.ok && (d.success === true || d.success === 'true');
  }catch(e){ return false; }
}

$('#contactForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = $('#sendBtn');
  btn.disabled = true; btn.textContent = 'جاري الإرسال...';
  const msg = contactMsg();
  const [wa, mail] = await Promise.all([
    sendWhatsApp(msg),
    sendEmail('رسالة جديدة من موقع مخبز حطين', {'الاسم': f.elements.n.value, 'الهاتف': f.elements.p.value, 'الرسالة': f.elements.m.value})
  ]);
  btn.disabled = false; btn.textContent = 'إرسال عبر واتساب';
  if (wa === 'auto' || mail){ f.reset(); toast('وصلتنا رسالتك، سنتواصل معك قريبًا'); }
  else if (wa === 'manual'){ toast('اضغط إرسال في واتساب ليصلنا'); }
  else toast('تعذّر الإرسال، اتصل بنا على 0789710378');
});

/* ===== تشغيل الصفحة الحالية ===== */
updateCount();
const currentPage = document.body.dataset.page;
document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.p === currentPage));
if ($('#shopGrid')) renderShop();
if ($('#cartItems')) { renderCart(); syncPay(); }
