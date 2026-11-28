/* Dashboard Lành: chiến dịch, đơn từ mọi nguồn, đối soát kế hoạch và thực nhận, chi phí.
   2B (27/11/2026): nối Sơn Nga Family: vốn và tài khoản, xin vốn, chặn chi khi thiếu vốn, Tiền khách về, Phí ship trả bằng, trạng thái đồng bộ.
   Dữ liệu qua /api/bo (Supabase bo2_*). Thêm ?demo=1 để xem bằng số liệu minh hoạ, không gọi máy chủ. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tz={timeZone:'Asia/Ho_Chi_Minh'};
const dayKey=d=>new Date(d).toLocaleDateString('en-CA',tz);
const today=()=>dayKey(new Date());
const NF=new Intl.NumberFormat('vi-VN');
const vnd=n=>n==null||!isFinite(n)?'—':(n<0?'−':'')+NF.format(Math.abs(Math.round(n)))+'đ';
const dv=n=>n>0?'+'+vnd(n):vnd(n);
const tr=n=>{if(n==null||!isFinite(n))return '—';const a=Math.abs(n);if(a<1e6)return vnd(n);const v=a/1e6;
  const t=v>=100?String(Math.round(v)):String(Math.round(v*10)/10).replace('.',',');return (n<0?'−':'')+t+' tr'};
const pct=r=>r==null||!isFinite(r)?'—':Math.round(r*100)+'%';
const ymd=s=>/^(\d{4})-(\d{2})-(\d{2})/.exec(s||'');
const fd=s=>{const m=ymd(s);return m?m[3]+'/'+m[2]+'/'+m[1]:'—'};
const ft=s=>{const d=new Date(s),p=d.toLocaleString('en-GB',{...tz,hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',hour12:false}).replace(',','');const m=/^(\d{2})\/(\d{2}) (\d{2}:\d{2})/.exec(p);return m?m[1]+'/'+m[2]+' '+m[3]:p};
const phoneFmt=p=>p?String(p).replace(/^(\d{4})(\d{3})(\d{3,4})$/,'$1 $2 $3'):'';
const sum=(a,f)=>a.reduce((t,x)=>t+(+f(x)||0),0);
const daysTo=s=>{const m=ymd(s);if(!m)return null;return Math.round((Date.parse(m[0]+'T00:00:00+07:00')-Date.parse(today()+'T00:00:00+07:00'))/864e5)};
const slug=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
/* "30k", "1,2tr", "1.228.000", "30" (dưới 1.000 hiểu là nghìn): trả số, null khi trống, NaN khi sai */
function money(raw){let t=String(raw==null?'':raw).trim().toLowerCase().replace(/\s|đ|₫|vnd/g,'');if(t==='')return null;
  let m=1;if(/(tr|triệu|m)$/.test(t)){m=1e6;t=t.replace(/(tr|triệu|m)$/,'').replace(',','.')}else if(/k$/.test(t)){m=1e3;t=t.slice(0,-1).replace(',','.')}else t=t.replace(/[.,]/g,'');
  if(!/^\d+(\.\d+)?$/.test(t))return NaN;let v=Math.round(parseFloat(t)*m);if(m===1&&v>0&&v<1000)v*=1000;return v}
const mfmt=n=>n==null||isNaN(n)?'':NF.format(n);

const ST=[['moi','Mới'],['da-xac-nhan','Đã xác nhận'],['dang-giao','Đang giao'],['da-giao','Đã giao'],['da-nhan-tien','Đã nhận tiền'],['huy','Huỷ'],['hoan-hang','Hoàn hàng']];
const SN=Object.fromEntries(ST);
const FLOW=['moi','da-xac-nhan','dang-giao','da-giao','da-nhan-tien'];
const FLOWS={'moi':'Mới','da-xac-nhan':'Xác nhận','dang-giao':'Đang giao','da-giao':'Đã giao','da-nhan-tien':'Nhận tiền'};
const CATS=[['nhap','Nhập hàng'],['baobi','Bao bì, thiệp'],['quangcao','Quảng cáo'],['vanchuyen','Vận chuyển'],['khac','Khác']];
const CN=Object.fromEntries(CATS);
const CS=[['draft','Nháp'],['running','Đang bán'],['closed','Ngừng bán'],['settled','Đã quyết toán']];
const CSN=Object.fromEntries(CS);
const ZN={hcm:'Nội thành TP.HCM',tinh:'Tỉnh khác'},ZS={hcm:'nội thành',tinh:'đi tỉnh'};
const PAY=[['cod','COD'],['ck','Chuyển khoản'],['tien-mat','Tiền mặt']],PN=Object.fromEntries(PAY);
const SHIP={hcm:30000,tinh:50000};
const shipRule=(n,z)=>z&&SHIP[z]?Math.ceil(n/2)*SHIP[z]:0;
const PEAK=[Date.parse('2027-01-30T00:00:00+07:00'),Date.parse('2027-02-11T00:00:00+07:00')],peak=()=>{const t=Date.now();return t>=PEAK[0]&&t<PEAK[1]};
const CARRIERS=['Ahamove','Grab','Lalamove','GHTK','GHN','Viettel Post','Bưu điện','Tự giao'];
const COLORS=['#B5281C','#D9A441','#1F5A40','#1E4A7A','#F28C1E','#8E1B12','#7A6656','#5E8C6A','#C9826B','#3E6E8E','#A88B5A','#4A3628'];
const DONE=s=>s==='da-nhan-tien'||s==='hoan-hang';
/* 2B: nối Sơn Nga Family. Vốn vào TK KINH DOANH LÀNH do Sơn Nga ghi (sn_capital); Lành tự trừ chi đã trả và phí ship trả từ tài khoản này. */
const SN_URL='https://sonngafamily.com/kinh-doanh-dau-tu?mang=lanh-gift';
const linked=c=>!!(c&&c.sn_id);
const shipBy=o=>{const k=o.ship_cost||0;if(k<=0)return 'none';if(o.status==='hoan-hang')return 'tk-kd';const b=o.ship_paid_by||(o.pay_method==='cod'?'tru-cod':'tk-kd');return b==='tru-cod'&&(o.got_amount||0)>=k?'tru-cod':'tk-kd'};
const thuOf=o=>Math.max(0,(o.got_amount||0)-(shipBy(o)==='tru-cod'?o.ship_cost||0:0));
const kdOut=c=>sum(D.expenses.filter(e=>e.campaign_id===c.id&&e.paid),e=>e.amount)+sum(D.orders.filter(o=>o.campaign_id===c.id&&DONE(o.status)&&shipBy(o)==='tk-kd'),o=>o.ship_cost);
const capLeft=c=>linked(c)&&c.sn_capital!=null?c.sn_capital-kdOut(c):null;
const pendReq=c=>D.capital_requests.find(r=>r.campaign_id===c.id&&r.status==='cho-duyet')||null;
const MTO=[['hkd','TK HỘ KINH DOANH'],['rieng','Ví riêng Sơn']],SBY=[['tru-cod','Hãng trừ vào COD'],['tk-kd','TK KINH DOANH LÀNH']];
const RQS={'cho-duyet':'Chờ Sơn Nga duyệt','da-duyet':'Đã duyệt','tu-choi':'Từ chối','huy':'Đã huỷ'};
const ERR={invalid_items:'Chọn ít nhất một set, số lượng từ 1.',invalid_name:'Tên cần từ 2 ký tự.',invalid_phone:'Số điện thoại chưa đúng.',invalid_address:'Địa chỉ chưa đúng.',
  invalid_money:'Số tiền chưa đúng, ví dụ 30000 hoặc 30k.',invalid_amount:'Nhập số tiền chi.',invalid_campaign:'Chưa có chiến dịch đang bán. Tạo hoặc mở một chiến dịch trước.',
  invalid_date:'Ngày chưa đúng.',plan_locked:'Đơn đã đối soát nên kế hoạch đã khoá. Đưa đơn về Đã giao rồi sửa.',locked:'Chiến dịch đã quyết toán, sổ đã khoá.',
  code_taken:'Tên chiến dịch này đã có, đổi tên khác.',invalid_sets:'Danh sách set chưa đúng.',invalid_budget:'Ngân sách chưa đúng.',invalid_channel:'Nguồn đơn chưa đúng.',
  invalid_source:'Tên nguồn chưa đúng.',invalid_status:'Trạng thái chưa đúng.',upstream:'Máy chủ đang bận, thử lại.',bad_input:'Dữ liệu chưa đúng.',not_found:'Không còn dòng này, tải lại trang.',
  no_capital:'TK KINH DOANH LÀNH không đủ vốn cho khoản này. Lưu Chưa trả rồi xin thêm vốn.',sn_controls:'Chiến dịch đã nối Sơn Nga Family: quyết toán, mở lại, đổi mã làm ở Sơn Nga.',
  wait_capital:'Chiến dịch đang chờ Sơn Nga duyệt vốn, chưa mở bán được.',invalid_money_to:'Chọn tài khoản tiền khách về.',invalid_ship_by:'Chọn cách trả phí ship.'};
const errText=e=>e&&e.message==='login'?'':ERR[e&&e.message]||'Chưa lưu được, thử lại.';

const P=(d,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={gift:'<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8c-1.5-3-5-3.5-5-1s3 1 5 1c2 0 5 .5 5-1s-3.5-2-5 1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  check:'<path d="M5 12l5 5 9-10"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};

const DEMO=new URLSearchParams(location.search).has('demo');
let D={campaigns:[],sources:[],orders:[],expenses:[],capital_requests:[],sync_items:[],sync_runs:[]};
const S={tab:'tong-quan',camp:null,f:'can',q:'',src:'all'};
let seen=new Set(),first=true,timer=0,audio=null,DB=null;

function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2800)}

/* ---------------- máy chủ ---------------- */
async function api(method,body){
  if(DEMO)return demoApi(method,body);
  const r=await fetch('/api/bo',{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(r.status===401){showLogin();throw new Error('login')}
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const er=new Error(j.error||'upstream');er.data=j;throw er}
  return j;
}
function upsert(list,row){const i=list.findIndex(x=>x.id===row.id);if(i>=0)list[i]=row;else list.unshift(row);return row}
async function save(action,id,data){
  const j=await api('POST',{action,id,data});
  if(action==='order'){upsert(D.orders,j.row);D.orders.sort((a,b)=>b.created_at.localeCompare(a.created_at));seen.add(j.row.id)}
  else if(action==='expense'){upsert(D.expenses,j.row);D.expenses.sort((a,b)=>b.spent_on.localeCompare(a.spent_on)||b.id-a.id)}
  else if(action==='campaign'){upsert(D.campaigns,j.row);D.campaigns.sort((a,b)=>a.id-b.id)}
  else if(action==='expense-delete')D.expenses=D.expenses.filter(e=>e.id!==j.id);
  else if(action==='sources')D.sources=j.sources;
  else if(action==='capreq'){upsert(D.capital_requests,j.row);D.capital_requests.sort((a,b)=>b.id-a.id)}
  else if(action==='capreq-cancel'){const r=D.capital_requests.find(x=>x.id===j.id);if(r)r.status='huy'}
  render();
  return j.row||j;
}
async function load(){
  try{
    const j=await api('GET');
    D={campaigns:j.campaigns||[],sources:j.sources||[],orders:j.orders||[],expenses:j.expenses||[],capital_requests:j.capital_requests||[],sync_items:j.sync_items||[],sync_runs:j.sync_runs||[]};
    const fresh=D.orders.filter(o=>!seen.has(o.id));
    if(!first&&fresh.length){const web=fresh.filter(o=>o.origin==='web');if(web.length)alertNew(web)}
    fresh.forEach(o=>{o._new=!first;seen.add(o.id)});first=false;
    D.orders.forEach(o=>{if(o._new===undefined)o._new=false});
    if(S.camp==null||!D.campaigns.some(c=>c.id===S.camp))S.camp=defaultCamp();
    if($('app').hidden)showApp();
    $('sync').textContent=(DEMO?'Bản minh hoạ · ':'')+'Cập nhật '+new Date().toLocaleTimeString('vi-VN',{...tz,hour:'2-digit',minute:'2-digit'});
    render();
    if(pendAct){const a=pendAct;pendAct=null;const c=camp();if(c&&c.status!=='settled')a==='new-order'?newOrderSheet():expSheet(null);else toast('Tạo chiến dịch trước khi ghi.')}
  }catch(e){if(e.message!=='login')$('sync').textContent='Lỗi tải dữ liệu, sẽ thử lại'}
}
function start(){load();clearInterval(timer);if(!DEMO)timer=setInterval(()=>{if(!document.hidden)load()},20000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){document.title='Lành · Quản lý bán hàng';if(!$('app').hidden&&!DEMO)load()}});
function beep(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const t=audio.currentTime;
  [880,1175].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;o.type='sine';g.gain.setValueAtTime(0,t+i*.18);g.gain.linearRampToValueAtTime(.25,t+i*.18+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.18+.3);o.connect(g).connect(audio.destination);o.start(t+i*.18);o.stop(t+i*.18+.32)})}catch(e){}}
function alertNew(list){beep();document.title='('+list.length+') Đơn mới · Lành';
  if('Notification' in window&&Notification.permission==='granted'){const o=list[0],t='Đơn mới '+o.code,opt={body:label(o)+' · '+vnd(pGot(o))+'\n'+o.name+' · '+phoneFmt(o.phone)+' · '+srcName(o.channel),icon:'/quan-ly/icons/icon-192.png',badge:'/quan-ly/icons/icon-192.png',tag:'don-'+o.code};
    const plain=()=>{try{new Notification(t,opt)}catch(e){}};
    if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration('/quan-ly').then(r=>r?r.showNotification(t,opt):plain()).catch(plain);else plain()}}

function showLogin(){$('app').hidden=true;$('login').hidden=false;$('out').hidden=true;$('bell').hidden=true;$('rf').hidden=true;$('sync').textContent='Cần đăng nhập';clearInterval(timer)}
function showApp(){$('login').hidden=true;$('app').hidden=false;$('out').hidden=DEMO;$('rf').hidden=false;$('out2').hidden=DEMO;if(!DEMO&&!$('who').textContent)whoAmI();$('bell').hidden=DEMO||!('Notification' in window)||Notification.permission==='granted'}
/* Đăng nhập bằng Google: /quan-ly/google chuyển sang Google rồi quay về đây; lỗi trả về qua ?loi= */
const LOI={'huy':'Bạn đã huỷ đăng nhập Google.','khong-duoc-phep':'Tài khoản Google này chưa được cấp quyền vào trang quản lý của Lành.','het-han':'Phiên đăng nhập đã hết hạn, bấm đăng nhập lại.','chua-cai':'Đăng nhập Google chưa được cài trên máy chủ.','loi':'Không đăng nhập được bằng Google, thử lại.'};
(()=>{const k=new URLSearchParams(location.search).get('loi');if(!k)return;$('lerr').textContent=LOI[k]||LOI.loi;history.replaceState(null,'',location.pathname+location.hash)})();
$('go').addEventListener('click',()=>{$('go').classList.add('is-busy');setTimeout(()=>$('go').classList.remove('is-busy'),8000)});
async function whoAmI(){try{const r=await fetch('/api/bo-login',{cache:'no-store'});if(r.ok){const j=await r.json();if(j.email){$('who').textContent='Đang đăng nhập: '+j.email;$('who').hidden=false}}}catch(e){}}
const logout=async()=>{await fetch('/api/bo-login',{method:'DELETE'});$('who').textContent='';$('who').hidden=true;if('clearAppBadge' in navigator)navigator.clearAppBadge().catch(()=>{});showLogin()};
$('out').addEventListener('click',logout);$('out2').addEventListener('click',logout);
async function refresh(){const b=$('rf');if(b.classList.contains('spin'))return;b.classList.add('spin');try{await load()}finally{b.classList.remove('spin')}}
$('rf').addEventListener('click',refresh);
/* Chạy như app (đã thêm vào màn hình chính): kéo xuống ở đầu trang để tải lại */
const PWA=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(PWA)document.documentElement.classList.add('pwa');
(()=>{if(!PWA)return;const el=$('ptr');let y0=null,p=0;
  const reset=()=>{el.classList.remove('on','go');el.style.setProperty('--p',0)};
  addEventListener('touchstart',e=>{y0=null;if(window.scrollY>2||document.body.classList.contains('lock')||$('app').hidden||e.touches.length>1)return;y0=e.touches[0].clientY;p=0},{passive:true});
  addEventListener('touchmove',e=>{if(y0==null)return;p=Math.max(0,Math.min(110,(e.touches[0].clientY-y0)*.55));el.style.setProperty('--p',p.toFixed(1));el.classList.toggle('on',p>6);el.classList.toggle('go',p>70)},{passive:true});
  addEventListener('touchend',async()=>{if(y0==null)return;y0=null;const go=p>70;p=0;reset();if(!go)return;el.classList.add('spin');try{await refresh()}finally{el.classList.remove('spin')}},{passive:true});
  addEventListener('touchcancel',()=>{y0=null;p=0;reset()},{passive:true});
})();
/* Bàn phím mở (ô tìm đơn): giấu thanh dưới cho khỏi che */
document.addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches('input,textarea,select')&&!e.target.closest('#sheet-root'))document.body.classList.add('kb')});
document.addEventListener('focusout',()=>setTimeout(()=>{const a=document.activeElement;if(!a||!a.matches||!a.matches('input,textarea,select'))document.body.classList.remove('kb')},60));
if('serviceWorker' in navigator)navigator.serviceWorker.register('/quan-ly-sw.js',{scope:'/quan-ly'}).catch(()=>{});
$('bell').addEventListener('click',async()=>{beep();if('Notification' in window){const p=await Notification.requestPermission();if(p==='granted'){$('bell').hidden=true;toast('Đã bật báo đơn mới')}}});

/* ---------------- tính toán ---------------- */
const pGot=o=>o.total+(o.ship_fee||0),pCost=o=>o.ship_fee||0,pNet=o=>o.total;
const aGot=o=>DONE(o.status)?(o.got_amount||0):pGot(o),aCost=o=>DONE(o.status)?(o.ship_cost||0):pCost(o),aNet=o=>aGot(o)-aCost(o);
const itemsOf=o=>Array.isArray(o.items)&&o.items.length?o.items:[{code:o.set_code,name:o.set_name,qty:o.qty,price:o.unit_price}];
const label=o=>itemsOf(o).map(i=>i.name+' × '+i.qty).join(' + ');
const srcName=k=>{const s=D.sources.find(x=>x.key===k);return s?s.label:(k||'Chưa rõ nguồn')};
const camp=()=>D.campaigns.find(c=>c.id===S.camp)||null;
const runningId=()=>{const r=D.campaigns.filter(c=>c.status==='running').sort((a,b)=>(b.start_date||'').localeCompare(a.start_date||'')||b.id-a.id);return r[0]?r[0].id:null};
function defaultCamp(){const r=runningId();if(r)return r;const l=D.campaigns.slice().sort((a,b)=>b.id-a.id)[0];return l?l.id:null}
function view(c){
  const all=D.orders.filter(o=>o.campaign_id===c.id),live=all.filter(o=>o.status!=='huy'),sold=live.filter(o=>o.status!=='hoan-hang');
  const ex=D.expenses.filter(e=>e.campaign_id===c.id),done=live.filter(o=>DONE(o.status)),open=live.filter(o=>!DONE(o.status));
  const v={c,all,live,sold,ex,done,open};
  v.revenue=sum(sold,o=>o.total);v.units=sum(sold,o=>o.qty);
  v.pGot=sum(live,pGot);v.pCost=sum(live,pCost);v.pNet=sum(live,pNet);
  v.aGot=sum(live,aGot);v.aCost=sum(live,aCost);v.aNet=sum(live,aNet);
  v.got=sum(done,aNet);v.wait=sum(open,pNet);
  v.cost=sum(ex,e=>e.amount);v.unpaid=sum(ex.filter(e=>!e.paid),e=>e.amount);
  v.budget=sum(Object.values(c.budget||{}),x=>x);
  v.profit=v.aNet-v.cost;
  const n=s=>open.filter(o=>o.status===s).length;
  v.noShip=open.filter(o=>o.zone&&o.ship_fee==null);
  v.todo={moi:n('moi'),xn:n('da-xac-nhan'),dg:n('dang-giao'),dga:n('da-giao'),noShip:v.noShip.length};
  const m=new Map();(c.sets||[]).forEach(s=>m.set(s.code,{code:s.code,name:s.name,price:s.price,qty:s.qty,sold:0,rev:0}));
  sold.forEach(o=>itemsOf(o).forEach(i=>{if(!m.has(i.code))m.set(i.code,{code:i.code,name:i.name,price:i.price,qty:null,sold:0,rev:0});const x=m.get(i.code);x.sold+=i.qty;x.rev+=i.qty*i.price}));
  v.sets=[...m.values()];
  const ch=new Map();sold.forEach(o=>{const k=o.channel||'?';const x=ch.get(k)||{key:k,n:0,units:0,rev:0};x.n++;x.units+=o.qty;x.rev+=o.total;ch.set(k,x)});
  v.channels=[...ch.values()].sort((a,b)=>b.rev-a.rev);
  v.cats=CATS.map(([k,l])=>({k,l,plan:+((c.budget||{})[k])||0,used:sum(ex.filter(e=>e.cat===k),e=>e.amount)})).filter(x=>x.plan||x.used);
  v.diffs=done.map(o=>({o,d:aNet(o)-pNet(o)})).filter(x=>x.d!==0).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  v.days=daysTo(c.end_date);
  return v;
}
const dcls=n=>n>0?'pos':n<0?'neg':'';

/* ---------------- khung chung ---------------- */
const TABS=[['tong-quan','Tổng quan'],['don','Đơn hàng','Đơn'],['chi','Chi phí'],['chien-dich','Chiến dịch']];
/* App trên điện thoại: thanh điều hướng dưới, nút Ghi đơn nổi ở giữa */
const BN=[['tong-quan','Tổng quan','<path d="M3.5 11 12 4l8.5 7M5.5 9.5v10h13v-10"/><path d="M10 19.5v-5h4v5"/>'],
  ['don','Đơn','<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>'],null,
  ['chi','Chi phí','<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M15 15h3"/>'],
  ['chien-dich','Chiến dịch','<path d="M5.5 21V4M5.5 4.5h11.5l-2.2 3.7 2.2 3.8H5.5"/>']];
function rNav(c,todo){const can=!!c&&c.status!=='settled';
  $('bn').innerHTML=BN.map(x=>x?`<button type="button" data-tab="${x[0]}"${S.tab===x[0]?' aria-current="page"':''}${x[0]==='don'&&todo?` aria-label="Đơn, ${todo} việc cần làm"`:''}><span class="bn__ic"><svg viewBox="0 0 24 24" aria-hidden="true">${x[2]}</svg></span>${x[1]}${x[0]==='don'&&todo?`<span class="n" aria-hidden="true">${todo>99?'99+':todo}</span>`:''}</button>`
    :`<button type="button" class="bn__add" data-act="${can?'new-order':'no-order'}" aria-disabled="${!can}"><span class="bn__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span>Ghi đơn</button>`).join('');
  if(!DEMO&&'setAppBadge' in navigator){(todo?navigator.setAppBadge(todo):navigator.clearAppBadge()).catch(()=>{})}}
function render(){
  const c=camp(),v=c?view(c):null;
  const todo=v?v.todo.moi+v.todo.dga+v.todo.noShip:0;
  $('tabs').innerHTML=TABS.map(([k,t,sm])=>`<button type="button" class="tab" data-tab="${k}"${S.tab===k?' aria-current="page"':''}>${sm?`<span class="lg">${t}</span><span class="sm">${sm}</span>`:t}${k==='don'&&todo?`<span class="n" aria-label="${todo} việc cần làm">${todo}</span>`:''}</button>`).join('');
  $('pick').innerHTML=D.campaigns.slice().sort((a,b)=>({running:0,draft:1,closed:2,settled:3}[a.status]-{running:0,draft:1,closed:2,settled:3}[b.status])||b.id-a.id).map(x=>
    `<button type="button" class="cp" data-camp="${x.id}" aria-pressed="${x.id===S.camp}"><b>${esc(x.name)}</b><span class="xs">${CSN[x.status]}${x.status==='running'&&daysTo(x.end_date)!=null?' · còn '+Math.max(0,daysTo(x.end_date))+' ngày':''}</span></button>`).join('')+
    `<button type="button" class="cp cp--add" data-act="new-camp"><b>+ Tạo chiến dịch</b></button>`;
  rNav(c,todo);
  const fn={'tong-quan':rOverview,'don':rOrders,'chi':rExpenses,'chien-dich':rCampaigns}[S.tab];
  if(S.tab==='don'&&$('oq')&&$('view').dataset.tab==='don'&&$('view').dataset.camp==String(S.camp)){rOrderList();return}
  $('view').dataset.tab=S.tab;$('view').dataset.camp=String(S.camp);
  $('view').innerHTML=fn(c,v);
  if(S.tab==='don')rOrderList();
  $('foot').textContent=DEMO?'Đây là bản minh hoạ. Đóng trang hoặc tải lại là mất các thay đổi.':'Tự cập nhật mỗi 20 giây khi trang đang mở. Đơn web mới có tiếng báo nếu bạn đã bật báo đơn.';
}
function setTab(t){S.tab=t;history.replaceState(null,'',(DEMO?'?demo=1':location.pathname)+(t==='tong-quan'?'':'#'+t));render();window.scrollTo({top:0})}
const noCamp=()=>`<section class="cd"><h3>Chưa có chiến dịch</h3><p class="s">Tạo chiến dịch để bắt đầu: tên, ngày bán, set quà, mục tiêu và ngân sách. Đơn web tự vào chiến dịch đang bán.</p><div class="acts"><button class="b b--do" data-act="new-camp">+ Tạo chiến dịch</button></div></section>`;

/* ---------------- Tổng quan ---------------- */
function rOverview(c,v){
  if(!c)return noCamp();
  const t=v.todo,live=c.status!=='settled';
  const dates=c.start_date||c.end_date?`${fd(c.start_date)} → ${fd(c.end_date)}`:'Chưa đặt ngày bán';
  const tag=c.status==='running'&&v.days!=null?(v.days>=0?`Đang bán · còn ${v.days} ngày`:'Đã qua ngày kết thúc'):CSN[c.status];
  const todo=[
    t.moi?`<button type="button" class="td" data-go="moi"><b>${t.moi}</b><span>đơn mới cần gọi xác nhận</span></button>`:'',
    t.noShip?`<button type="button" class="td td--warn" data-go="can"><b>${t.noShip}</b><span>đơn chưa có phí ship báo khách</span></button>`:'',
    t.xn?`<button type="button" class="td" data-go="da-xac-nhan"><b>${t.xn}</b><span>đơn chờ giao đi</span></button>`:'',
    t.dg?`<button type="button" class="td" data-go="dang-giao"><b>${t.dg}</b><span>đơn đang giao</span></button>`:'',
    t.dga?`<button type="button" class="td td--warn" data-go="da-giao"><b>${t.dga}</b><span>đơn đã giao, chờ đối soát tiền</span></button>`:''].join('');
  return `
  <section class="cd hero">
    <span class="hero__ic">${P(I.gift,30)}</span>
    <div class="hero__t"><div class="r1"><h2>${esc(c.name)}</h2><span class="tg cs-${c.status}">${tag}</span></div>
      <p class="s">${dates} · ${v.live.length} đơn · ${v.units} giỏ${c.note?' · '+esc(c.note):''}</p></div>
    <div class="hero__b">${live?`<button type="button" class="b b--do" data-act="new-order">${P(I.plus,16)}Ghi đơn</button><button type="button" class="b b--o" data-act="new-exp">Ghi chi</button>`:''}<button type="button" class="b b--o" data-tab="don">Xem đơn</button></div>
  </section>
  ${c.status==='settled'?`<div class="note"><span>${P(I.info,18)}</span><span>Chiến dịch đã quyết toán, sổ đã khoá. Muốn sửa, mở lại ở tab Chiến dịch.</span></div>`:''}
  <div class="todo">${todo||(v.live.length?`<div class="td td--ok"><b>${P(I.check,20)}</b><span>Không còn đơn tồn cần xử lý.</span></div>`:'')}</div>
  <div class="k4">
    <div class="tl"><span class="cap">Doanh thu</span><b title="${vnd(v.revenue)}">${tr(v.revenue)}</b><span class="xs">tiền quà · ${v.sold.length} đơn · ${v.units} giỏ</span></div>
    <div class="tl tl--la"><span class="cap">Đã về tài khoản</span><b title="${vnd(v.got)}">${tr(v.got)}</b><span class="xs">${v.done.length} đơn đã đối soát · chờ thu ${tr(v.wait)}</span></div>
    <div class="tl"><span class="cap">Chi phí</span><b title="${vnd(v.cost)}">${tr(v.cost)}</b><span class="xs">${v.budget?pct(v.cost/v.budget)+' ngân sách '+tr(v.budget):'Chưa đặt ngân sách'}</span></div>
    <div class="tl tl--do"><span class="cap">Lãi tạm tính</span><b title="${vnd(v.profit)}">${tr(v.profit)}</b><span class="xs">thực nhận − chi phí · ${c.status==='settled'?'đã quyết toán':'chưa quyết toán'}</span></div>
  </div>
  <div class="g2">
    <div class="col">${planCard(v)}${diffCard(v)}</div>
    <div class="col">${setsCard(v)}${budgetCard(v)}${chanCard(v)}</div>
  </div>`;
}
const ptRow=(l,sub,a,b,d,cls)=>`<div${cls?` class="${cls}"`:''}><span>${l}${sub?`<small>${sub}</small>`:''}</span><span>${a}</span><span>${b}</span><span class="${d==null?'':dcls(d)}">${d==null?'':dv(d)}</span></div>`;
const ptHead=l=>`<div class="pt__h"><span>${l}</span><span>Kế hoạch</span><span>Thực tế</span><span>Chênh</span></div>`;
function planCard(v){
  const net=v.aNet-v.pNet;
  return `<section class="cd"><div class="hd"><h3>Kế hoạch và thực nhận</h3><span class="xs">${v.done.length}/${v.live.length} đơn đã đối soát</span></div>
  ${v.live.length?`<div class="pt">${ptHead('Khoản')}
  ${ptRow('Khách trả','tiền quà + ship báo khách',vnd(v.pGot),vnd(v.aGot),v.aGot-v.pGot)}
  ${ptRow('Phí trả hãng ship','kế hoạch = ship thu khách',vnd(v.pCost),vnd(v.aCost),v.pCost-v.aCost)}
  ${ptRow('Thực nhận từ đơn','',vnd(v.pNet),vnd(v.aNet),net,'tot')}</div>
  <p class="xs">Kế hoạch chốt theo từng đơn. Đơn đã nhận tiền lấy số đối soát; ${v.open.length} đơn chưa xong tạm lấy số kế hoạch. Chênh âm là Lành nhận ít hơn kế hoạch. Đơn huỷ không tính, đơn hoàn hàng tính phần mất.</p>`
  :'<p class="empty">Chưa có đơn trong chiến dịch này.</p>'}</section>`;
}
function diffCard(v){
  if(!v.diffs.length)return '';
  const neg=sum(v.diffs.filter(x=>x.d<0),x=>x.d),pos=sum(v.diffs.filter(x=>x.d>0),x=>x.d);
  return `<section class="cd"><div class="hd"><h3>Đơn lệch kế hoạch</h3><span class="xs">${v.diffs.length} đơn · hụt ${vnd(-neg)}${pos?' · dư '+vnd(pos):''}</span></div>
  <div class="lst">${v.diffs.slice(0,6).map(({o,d})=>{const why=[];const g=(o.got_amount||0)-pGot(o),k=pCost(o)-(o.ship_cost||0);
    if(o.status==='hoan-hang')why.push('hoàn hàng');else{if(g)why.push('khách trả '+dv(g));if(k)why.push('ship hãng '+(k<0?'cao hơn ':'thấp hơn ')+vnd(Math.abs(k)))}
    return `<button type="button" class="lr" data-open="${o.id}"><span class="grow"><b class="ell" style="display:block;font-size:14px">${esc(o.code)} · ${esc(o.name)}</b><span class="xs">${why.join(' · ')}${o.carrier?' · '+esc(o.carrier):''}</span></span><b class="num ${dcls(d)}">${dv(d)}</b></button>`}).join('')}</div>
  ${v.diffs.length>6?`<button type="button" class="b b--g" data-go="da-nhan-tien">Xem đơn đã nhận tiền</button>`:''}</section>`;
}
function setsCard(v){
  const c=v.c,tp=c.target_revenue?v.revenue/c.target_revenue:null;
  return `<section class="cd"><div class="hd"><h3>Set quà</h3><span class="xs">đã bán ${v.units} giỏ</span></div>
  ${v.sets.length?v.sets.map(s=>`<div class="setr"><div class="row"><b>${esc(s.name)}</b><span class="xs">${vnd(s.price)}/set</span></div>
    ${s.qty?`<span class="bar bar--l"><i style="width:${Math.min(100,Math.round(s.sold/s.qty*100))}%;background:var(--do)"></i></span>`:''}
    <div class="row" style="font-size:13.5px"><span>Đã bán <b>${s.sold}</b>${s.qty?` / ${s.qty} · ${s.sold>s.qty?`<b class="neg">vượt ${s.sold-s.qty}</b>`:`còn <b>${s.qty-s.sold}</b>`}`:' · chưa đặt số chuẩn bị'}</span><b class="num">${tr(s.rev)}</b></div></div>`).join(''):'<p class="xs">Chưa có set. Thêm ở tab Chiến dịch.</p>'}
  ${c.target_revenue?`<div class="goal"><div class="row" style="font-size:13.5px"><b>Mục tiêu doanh thu</b><span class="num">${tr(v.revenue)} / ${tr(c.target_revenue)} · ${pct(tp)}</span></div><span class="bar"><i style="width:${Math.min(100,Math.round((tp||0)*100))}%;background:linear-gradient(90deg,var(--kim),var(--do))"></i></span></div>`:`<p class="xs">Chưa đặt mục tiêu doanh thu.</p>`}
  </section>`;
}
function budgetCard(v){
  return `<section class="cd"><div class="hd"><h3>Ngân sách chi</h3><span class="xs">${tr(v.cost)}${v.budget?' / '+tr(v.budget):''}</span></div>
  ${v.cats.length?v.cats.map(x=>`<div style="display:flex;flex-direction:column;gap:5px"><div class="row" style="font-size:13.5px"><span>${x.l}</span><span class="num">${tr(x.used)}${x.plan?' / '+tr(x.plan):''}</span></div><span class="bar"><i style="width:${x.plan?Math.min(100,Math.round(x.used/x.plan*100)):x.used?100:0}%;background:${x.plan&&x.used>x.plan?'var(--do)':'var(--kim)'}"></i></span></div>`).join(''):'<p class="xs">Chưa có khoản chi.</p>'}
  ${v.unpaid?`<p class="xs warn">Còn nợ nhà cung cấp ${vnd(v.unpaid)}.</p>`:''}
  <p class="xs">Phí ship từng đơn nằm ở đối soát đơn, không ghi ở đây.</p></section>`;
}
function chanCard(v){
  const tot=v.revenue||1;
  return `<section class="cd"><div class="hd"><h3>Nguồn đơn</h3><span class="xs">theo doanh thu</span></div>
  ${v.channels.length?`<span class="bar bar--l" style="gap:2px;background:transparent">${v.channels.map((x,i)=>`<i style="width:${x.rev/tot*100}%;background:${COLORS[i%COLORS.length]};border-radius:99px"></i>`).join('')}</span>
  <div class="scroll"><table class="tb"><thead><tr><th>Nguồn</th><th>Đơn</th><th>Giỏ</th><th>Doanh thu</th><th>%</th></tr></thead><tbody>
  ${v.channels.map((x,i)=>`<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${COLORS[i%COLORS.length]};margin-right:7px"></i>${esc(srcName(x.key))}</td><td>${x.n}</td><td>${x.units}</td><td>${tr(x.rev)}</td><td>${Math.round(x.rev/tot*100)}%</td></tr>`).join('')}
  </tbody></table></div>`:'<p class="xs">Chưa có đơn.</p>'}
  <p class="xs">Đơn web tự gắn nguồn theo đường khách vào trang (Google, quảng cáo Google, Facebook, Zalo…). Đơn nhập tay chọn nguồn khi ghi.</p></section>`;
}

/* ---------------- Đơn hàng ---------------- */
const FILT=[['can','Cần xử lý',o=>['moi','da-xac-nhan','dang-giao','da-giao'].includes(o.status)],['moi','Mới'],['da-xac-nhan','Đã xác nhận'],['dang-giao','Đang giao'],['da-giao','Đã giao'],['da-nhan-tien','Đã nhận tiền'],['huy-hoan','Huỷ, hoàn',o=>o.status==='huy'||o.status==='hoan-hang'],['all','Tất cả',()=>true]];
const fOf=k=>{const f=FILT.find(x=>x[0]===k);return f&&f[2]?f[2]:o=>o.status===k};
function rOrders(c){
  if(!c)return noCamp();
  return `<section class="cd"><div class="ob__top">
    <input id="oq" type="search" placeholder="Tìm tên, số điện thoại, mã đơn" aria-label="Tìm đơn" value="${esc(S.q)}" autocomplete="off">
    <select id="osrc" aria-label="Lọc theo nguồn"><option value="all">Mọi nguồn</option>${D.sources.map(s=>`<option value="${esc(s.key)}"${S.src===s.key?' selected':''}>${esc(s.label)}</option>`).join('')}</select>
    ${c.status!=='settled'?`<button type="button" class="b b--do" data-act="new-order">${P(I.plus,16)}Ghi đơn</button>`:''}</div>
    <div class="chips" id="ofil" role="group" aria-label="Lọc theo trạng thái"></div></section>
  <div id="owarn"></div><div class="ol" id="olist" aria-live="polite"></div><div class="olf"><button type="button" class="b b--o b--sm" data-act="csv">Xuất CSV đơn của chiến dịch</button></div>`;
}
function rOrderList(){
  const c=camp();if(!c||!$('olist'))return;
  const mine=D.orders.filter(o=>o.campaign_id===c.id);
  $('ofil').innerHTML=FILT.map(([k,t])=>`<button type="button" class="chip" data-f="${k}" aria-pressed="${S.f===k}">${t}<i>${mine.filter(fOf(k)).length}</i></button>`).join('');
  const orphan=D.orders.filter(o=>o.campaign_id==null);
  $('owarn').innerHTML=orphan.length?`<div class="note note--do"><span>${P(I.alert,18)}</span><span><b>${orphan.length} đơn chưa gắn chiến dịch</b> (lúc đặt không có chiến dịch Đang bán).${c.status!=='settled'?`<br><button type="button" class="b b--o b--sm" data-act="adopt">Gắn vào ${esc(c.name)}</button>`:''}</span></div>`:'';
  const q=S.q.trim().toLowerCase(),qd=q.replace(/\D/g,'');
  const rows=mine.filter(fOf(S.f)).filter(o=>S.src==='all'||o.channel===S.src).filter(o=>!q||String(o.name).toLowerCase().includes(q)||o.code.toLowerCase().includes(q)||(qd.length>=3&&o.phone&&o.phone.includes(qd)));
  $('olist').innerHTML=rows.length?rows.map(card).join(''):`<p class="empty">${mine.length?'Không có đơn trong mục này.':'Chưa có đơn. Đơn khách đặt trên lanhgift.com sẽ tự hiện ở đây; đơn qua Zalo, Facebook, người quen bấm Ghi đơn.'}</p>`;
}
function nextOf(o){return {moi:{t:'Xác nhận',to:'da-xac-nhan'},'da-xac-nhan':{t:'Đã giao cho ship',to:'dang-giao'},'dang-giao':{t:'Khách đã nhận hàng',to:'da-giao'},'da-giao':{t:'Đối soát tiền',sheet:1}}[o.status]||null}
function moneyTag(o){
  if(DONE(o.status)){const d=aNet(o)-pNet(o);return `<span class="tg tg--pos">Thực nhận ${vnd(aNet(o))}</span>${d?`<span class="tg ${d<0?'tg--neg':'tg--pos'}">${dv(d)}</span>`:''}`}
  if(o.zone&&o.ship_fee==null)return `<span class="tg tg--warn">Chưa có phí ship</span>`;
  return `<span class="tg">${o.pay_method==='cod'?'Thu COD':'Khách trả'} ${vnd(pGot(o))}</span>`;
}
function card(o){
  const n=nextOf(o);
  return `<article class="od${o._new?' is-new':''}${o.status==='huy'?' st-huy':''}" data-id="${o.id}">
  <button type="button" class="od__main" data-open="${o.id}" aria-label="Mở đơn ${esc(o.code)}">
    <span class="od__h"><b class="od__code">${esc(o.code)}</b><span class="xs">${ft(o.created_at)}</span><span class="tg st-${o.status}">${SN[o.status]||esc(o.status)}</span></span>
    <span class="od__set"><span>${esc(label(o))}</span><b>${vnd(o.total)}</b></span>
    <span class="od__who">${esc(o.name)}${o.phone?' · '+phoneFmt(o.phone):''}${o.zone?' · '+ZS[o.zone]:''}</span>
    <span class="od__meta"><span class="tg tg--src">${esc(srcName(o.channel))}</span>${o.origin==='tay'?'<span class="tg">Nhập tay</span>':''}${moneyTag(o)}</span>
  </button>
  <div class="od__acts">${n?`<button type="button" class="b b--do b--sm" data-next="${o.id}">${n.t}</button>`:''}${o.phone?`<a class="b b--o b--sm" href="tel:${esc(o.phone)}">Gọi</a><a class="b b--o b--sm" href="https://zalo.me/${esc(o.phone)}" target="_blank" rel="noopener">Zalo</a>`:''}</div>
  </article>`;
}
async function nextStep(id,btn){
  const o=D.orders.find(x=>x.id===id);if(!o)return;const n=nextOf(o);if(!n)return;
  if(n.sheet||(n.to==='da-xac-nhan'&&o.zone&&o.ship_fee==null))return orderSheet(id);
  btn.classList.add('is-busy');
  try{await save('order',id,{status:n.to});toast(o.code+': '+SN[n.to])}catch(e){const t=errText(e);if(t)toast(t)}finally{btn.classList.remove('is-busy')}
}
function csv(){
  const c=camp();if(!c)return;const list=D.orders.filter(o=>o.campaign_id===c.id);
  const head=['Mã đơn','Thời gian','Trạng thái','Nguồn','Kiểu','Hàng','Số giỏ','Tiền quà','Nơi giao','Phí ship báo khách','Khách trả (kế hoạch)','Khách trả (thực tế)','Phí trả hãng (thực tế)','Thực nhận','Chênh','Hãng ship','Thanh toán','Tên','Điện thoại','Địa chỉ','Ghi chú','Ghi chú đối soát'];
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const lines=[head.map(q).join(',')].concat(list.map(o=>[o.code,ft(o.created_at),SN[o.status],srcName(o.channel),o.origin==='tay'?'Nhập tay':'Web',label(o),o.qty,o.total,ZN[o.zone]||'',o.ship_fee,pGot(o),
    DONE(o.status)?o.got_amount:'',DONE(o.status)?o.ship_cost:'',o.status==='huy'?'':aNet(o),DONE(o.status)?aNet(o)-pNet(o):'',o.carrier,PN[o.pay_method],o.name,o.phone?"'"+o.phone:'',o.address,o.note,o.recon_note].map(q).join(',')));
  const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='don-'+slug(c.name)+'-'+today()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

/* ---------------- Chi phí ---------------- */
function rExpenses(c,v){
  if(!c)return noCamp();
  const live=c.status!=='settled';
  return `<section class="cd"><div class="hd"><div><h3>Chi phí ${esc(c.name)}</h3><p class="s">${tr(v.cost)}${v.budget?' / ngân sách '+tr(v.budget)+' · '+pct(v.cost/v.budget):''}${v.unpaid?' · còn nợ '+tr(v.unpaid):''}</p></div>
    ${live?`<button type="button" class="b b--do" data-act="new-exp">${P(I.plus,16)}Ghi chi</button>`:''}</div>
    ${v.cats.length?`<div class="k4">${v.cats.map(x=>`<div class="tl"><span class="cap">${x.l}</span><b>${tr(x.used)}</b><span class="bar"><i style="width:${x.plan?Math.min(100,Math.round(x.used/x.plan*100)):x.used?100:0}%;background:${x.plan&&x.used>x.plan?'var(--do)':'var(--kim)'}"></i></span><span class="xs">${x.plan?'ngân sách '+tr(x.plan):'chưa đặt ngân sách'}</span></div>`).join('')}</div>`:''}
  </section>
  <section class="cd"><div class="hd"><h3>Sổ chi</h3><span class="xs">${v.ex.length} dòng · mới nhất trước</span></div>
  ${v.ex.length?`<div class="lst">${v.ex.map(e=>{const m=ymd(e.spent_on);return `<button type="button" class="lr" data-exp="${e.id}"><span class="dt"><b>${m?m[3]:'—'}</b><small>Th${m?+m[2]:''}</small></span><span class="grow"><b class="ell" style="display:block;font-size:14px">${esc(e.name)}</b><span class="xs">${CN[e.cat]}${e.units?' · '+e.units+' cái':''}${e.vendor?' · '+esc(e.vendor):''}</span></span><span style="text-align:right"><b class="num" style="display:block">${vnd(e.amount)}</b>${e.paid?'':'<span class="tg tg--warn">Chưa trả</span>'}</span></button>`}).join('')}</div>`:'<p class="empty">Chưa có khoản chi. Nhập hàng, bao bì, quảng cáo… ghi ở đây.</p>'}
  </section>`;
}

/* ---------------- Chiến dịch ---------------- */
function rCampaigns(c){
  const run=D.campaigns.filter(x=>x.status==='running');
  const rows=D.campaigns.slice().sort((a,b)=>b.id-a.id).map(x=>({x,v:view(x)}));
  const tot=rows.filter(r=>r.x.status!=='draft');
  return `${run.length>1?`<div class="note"><span>${P(I.alert,18)}</span><span>Có ${run.length} chiến dịch Đang bán. Đơn web mới vào chiến dịch bắt đầu muộn nhất: <b>${esc((D.campaigns.find(x=>x.id===runningId())||{}).name)}</b>.</span></div>`:''}
  ${!run.length&&D.campaigns.length?`<div class="note note--do"><span>${P(I.alert,18)}</span><span>Không có chiến dịch Đang bán: đơn web mới sẽ chưa gắn chiến dịch.</span></div>`:''}
  ${capCard(c)}${syncCard(c)}
  <section class="cd"><div class="hd"><h3>Báo cáo theo chiến dịch</h3><button type="button" class="b b--do b--sm" data-act="new-camp">${P(I.plus,16)}Tạo chiến dịch</button></div>
  ${rows.length?`<div class="lst ph">${rows.map(({x,v})=>`<button type="button" class="lr" data-camp="${x.id}"><span class="grow"><b style="display:block;font-size:14px">${esc(x.name)}</b><span class="xs">${CSN[x.status]} · ${v.live.length} đơn · doanh thu ${tr(v.revenue)} · chi ${tr(v.cost)}</span></span><span style="text-align:right"><b class="num ${dcls(v.profit)}" style="display:block">${tr(v.profit)}</b><span class="xs">${x.status==='settled'?'lãi':'lãi tạm tính'}</span></span></button>`).join('')}</div><div class="scroll pc"><table class="tb"><thead><tr><th>Chiến dịch</th><th>Đơn</th><th>Doanh thu</th><th>Thực nhận</th><th>Chi phí</th><th>Lãi</th></tr></thead><tbody>
  ${rows.map(({x,v})=>`<tr data-camp="${x.id}"><td><b>${esc(x.name)}</b> <span class="tg cs-${x.status}">${CSN[x.status]}</span><small>${fd(x.start_date)} → ${fd(x.end_date)}</small></td><td>${v.live.length}</td><td>${tr(v.revenue)}</td><td>${tr(v.aNet)}</td><td>${tr(v.cost)}</td><td class="${dcls(v.profit)}"><b>${tr(v.profit)}</b>${x.status!=='settled'?'<small>tạm tính</small>':''}</td></tr>`).join('')}
  <tr class="tot"><td>Cộng</td><td>${sum(tot,r=>r.v.live.length)}</td><td>${tr(sum(tot,r=>r.v.revenue))}</td><td>${tr(sum(tot,r=>r.v.aNet))}</td><td>${tr(sum(tot,r=>r.v.cost))}</td><td>${tr(sum(tot,r=>r.v.profit))}</td></tr>
  </tbody></table></div><p class="xs">Bấm một dòng để mở chiến dịch. Lãi = thực nhận từ đơn − chi phí. Đơn chưa đối soát tính theo kế hoạch.</p>`:'<p class="empty">Chưa có chiến dịch.</p>'}</section>
  ${c?`<section class="cd"><div class="hd"><h3>${esc(c.name)}</h3><button type="button" class="b b--o b--sm" data-act="edit-camp">Sửa chiến dịch</button></div>
    <dl class="kv"><dt>Trạng thái</dt><dd>${CSN[c.status]}${c.settled_at?' · '+fd(dayKey(c.settled_at)):''}</dd><dt>Ngày bán</dt><dd>${fd(c.start_date)} → ${fd(c.end_date)}</dd>
    <dt>Mục tiêu</dt><dd>${c.target_revenue?vnd(c.target_revenue):'Chưa đặt'}</dd><dt>Ngân sách</dt><dd>${Object.keys(c.budget||{}).length?CATS.filter(([k])=>c.budget[k]).map(([k,l])=>l+' '+tr(c.budget[k])).join(' · '):'Chưa đặt'}</dd>
    <dt>Set quà</dt><dd>${(c.sets||[]).map(s=>esc(s.name)+' '+vnd(s.price)+(s.qty?' · '+s.qty+' cái':'')).join('<br>')||'Chưa có'}</dd></dl></section>`:''}
  <section class="cd"><div class="hd"><h3>Nguồn đơn</h3><button type="button" class="b b--o b--sm" data-act="sources">Sửa danh sách</button></div>
    <div class="chips">${D.sources.filter(s=>s.active).map(s=>`<span class="tg tg--src">${esc(s.label)}${s.auto?' · tự gắn':''}</span>`).join('')}</div>
    <p class="xs">Web, Google, Google Ads, Facebook, Zalo, Instagram, TikTok được nhận ra tự động khi khách đặt trên web. Mọi nguồn đều chọn được khi ghi đơn tay.</p></section>`;
}

/* --- 2B: Vốn và tài khoản, yêu cầu cấp vốn, đồng bộ với Sơn Nga (bản vẽ "Lành ↔ Sơn Nga · đồng bộ (2B)", Sơn duyệt 27/11/2026) --- */
function reqRow(r){
  const m=ymd(dayKey(r.created_at)),dec=r.status==='da-duyet'&&r.decided_amount!=null&&r.decided_amount!==r.amount;
  return `<div class="lr lr--req"><span class="dt"><b>${m?m[3]:''}</b><small>Th${m?+m[2]:''}</small></span><span class="grow"><b style="display:block;font-size:14px">${r.kind==='tao'?'Vốn mở chiến dịch':'Xin thêm'} ${tr(r.amount)}${dec?' · được duyệt '+tr(r.decided_amount):''}</b>
    <span class="xs">${esc(r.reply?'Sơn Nga ghi: '+r.reply:r.note||'')}${r.status==='cho-duyet'?(r.note?' · ':'')+'gửi '+ft(r.created_at):''}</span></span>
    <span class="tg rq-${r.status}">${RQS[r.status]||r.status}</span>${r.status==='cho-duyet'?`<button type="button" class="b b--o b--sm" data-capcancel="${r.id}">Huỷ yêu cầu</button>`:''}</div>`;
}
function capCard(c){
  if(!c)return '';
  const reqs=D.capital_requests.filter(r=>r.campaign_id===c.id).slice(0,6),pend=pendReq(c),live=c.status!=='settled';
  const list=reqs.length?`<div class="fl"><span class="cap">Yêu cầu cấp vốn</span><div class="lst">${reqs.map(reqRow).join('')}</div></div>`:'';
  if(!linked(c))return `<section class="cd"><div class="hd"><div><h3>Vốn và tài khoản</h3><p class="s">Chưa nối Sơn Nga Family. ${pend?'Đang chờ Sơn Nga duyệt vốn.':'Gửi yêu cầu cấp vốn: Sơn Nga duyệt thì tạo chiến dịch bên đó, ghi vốn và nối hai bên.'}</p></div>
    ${live?`<button type="button" class="b b--do" data-act="capreq">${pend?'Sửa yêu cầu vốn':'Xin vốn'}</button>`:''}</div>${list}</section>`;
  const v=view(c),left=capLeft(c),out=kdOut(c),hk=v.done.filter(o=>(o.money_to||'hkd')==='hkd'),rieng=v.done.filter(o=>o.money_to==='rieng'),unpaid=v.ex.filter(e=>!e.paid);
  const low=left!=null&&left<Math.max(1000000,(c.sn_capital||0)*0.1);
  return `<section class="cd"><div class="hd"><div><h3>Vốn và tài khoản</h3><p class="s">Vốn theo sổ Sơn Nga Family${c.sn_synced_at?', đồng bộ lúc '+ft(c.sn_synced_at):''} · còn lại tính theo chi đã trả ở Lành</p></div>
    <div class="acts">${live?`<button type="button" class="b b--do" data-act="capreq">${pend?'Sửa yêu cầu vốn':'Xin thêm vốn'}</button>`:''}<a class="b b--o" href="${SN_URL}" target="_blank" rel="noopener">Mở Sơn Nga Family</a></div></div>
    <div class="k4">
      <div class="tl"><span class="cap">Vốn đã cấp</span><b>${tr(c.sn_capital||0)}</b><span class="xs">ghi ở Sơn Nga Family</span></div>
      <div class="tl${low?' tl--kim':''}"><span class="cap">Còn trong TK KINH DOANH LÀNH</span><b>${tr(left)}</b><span class="xs">vốn − chi đã trả ${tr(out)}${low?' · sắp hết':''}</span></div>
      <div class="tl tl--la"><span class="cap">Đã về TK HỘ KINH DOANH</span><b>${tr(sum(hk,thuOf))}</b><span class="xs">${hk.length} đơn đã nhận tiền</span></div>
      <div class="tl${unpaid.length?' tl--do':''}"><span class="cap">Chi chưa trả</span><b>${tr(sum(unpaid,e=>e.amount))}</b><span class="xs">${unpaid.length?unpaid.length+' khoản · chờ vốn':'không có'}</span></div>
    </div>
    ${rieng.length?`<div class="note"><span>${P(I.alert,18)}</span><span>${rieng.length} đơn tiền về Ví riêng Sơn (${tr(sum(rieng,thuOf))}). Chuyển sang TK HỘ KINH DOANH rồi sửa ô Tiền khách về trước khi quyết toán.</span></div>`:''}
    ${list}</section>`;
}
function syncCard(c){
  if(!linked(c))return '';
  const v=view(c),by=new Map(D.sync_items.map(i=>[i.ref,i]));
  const want=[...v.done.map(o=>'O:'+o.code),...v.ex.filter(e=>e.paid).map(e=>'E:'+e.id)],ws=new Set(want);
  const ok=want.filter(r=>by.has(r)&&by.get(r).state==='ok'),nO=ok.filter(r=>r[0]==='O').length;
  const fresh=want.filter(r=>!by.has(r)),gone=D.sync_items.filter(i=>i.campaign_id===c.id&&!ws.has(i.ref));
  const bad=D.sync_items.filter(i=>i.campaign_id===c.id&&i.state!=='ok'&&ws.has(i.ref)),run=D.sync_runs[0];
  const nameOf=ref=>{if(ref[0]==='O'){const o=D.orders.find(x=>x.code===ref.slice(2));return o?{t:'Đơn '+o.code+' · '+vnd(thuOf(o)),a:`data-open="${o.id}"`,b:'Mở đơn'}:{t:'Đơn '+ref.slice(2)}}
    const e=D.expenses.find(x=>x.id===+ref.slice(2));return e?{t:'Chi · '+e.name+' · '+tr(e.amount),a:`data-exp="${e.id}"`,b:'Mở khoản chi'}:{t:'Khoản chi '+ref.slice(2)}};
  return `<section class="cd"><div class="hd"><div><h3>Đồng bộ với Sơn Nga Family</h3><p class="s">${run?'Lần gần nhất '+ft(run.at):'Chưa đồng bộ lần nào'} · Sơn Nga đọc khi mở tab Lành Gift, khi bấm Đồng bộ và mỗi sáng 8:00</p></div><span class="tg tg--la">Đang nối</span></div>
    <div class="k3">
      <div class="tl tl--la"><span class="cap">Đã sang Sơn Nga</span><b>${ok.length} mục</b><span class="xs">${nO} đơn · ${ok.length-nO} khoản chi</span></div>
      <div class="tl"><span class="cap">Chờ lần đồng bộ sau</span><b>${fresh.length+gone.length} mục</b><span class="xs">${fresh.length} mới${gone.length?' · '+gone.length+' huỷ, Sơn Nga sẽ xoá dòng':''}</span></div>
      <div class="tl${bad.length?' tl--do':''}"><span class="cap">Cần xử lý</span><b>${bad.length} việc</b><span class="xs">${bad.length?'xem bên dưới':'không có'}</span></div>
    </div>
    ${bad.length?`<div class="lst">${bad.map(i=>{const n=nameOf(i.ref);return `<div class="lr ${i.state==='cho-von'?'lr--do':'lr--kim'}"><span class="grow"><b style="display:block;font-size:14px">${esc(n.t)}</b><span class="xs">${i.state==='cho-von'?'Chờ vốn':'Chưa ghi được'}${i.message?': '+esc(i.message):''}</span></span>${n.a?`<button type="button" class="b b--o b--sm" ${n.a}>${n.b}</button>`:''}</div>`}).join('')}</div>`:''}
    <p class="xs" style="margin:0;padding:12px 14px;border-radius:14px;background:var(--kem2);line-height:1.5">Chỉ đơn <b>Đã nhận tiền</b> (và đơn hoàn hàng) cùng khoản chi <b>Đã trả</b> mới sang Sơn Nga, mỗi dòng mang mã đơn hoặc mã khoản chi. Sửa ở Lành thì dòng bên Sơn Nga sửa theo; huỷ đơn, xoá chi thì dòng bên Sơn Nga được xoá, tiền về lại đúng tài khoản. Vốn, quyết toán làm ở Sơn Nga; quyết toán xong chiến dịch ở Lành tự khoá sổ.</p></section>`;
}
function capSheet(c,pre){
  pre=pre||{};
  const pend=pendReq(c),v=view(c),left=capLeft(c),unpaid=v.ex.filter(e=>!e.paid),lk=linked(c);
  const short=lk?Math.max(0,sum(unpaid,e=>e.amount)-Math.max(0,left||0)):0;
  const amt=pre.amount||(pend?pend.amount:short||null);
  const sel=new Set(pre.expense_ids||(pend?pend.expense_ids||[]:unpaid.map(e=>e.id)));
  const chips=[short?[short,'Đúng số thiếu '+tr(short)]:null,[5e6,'5 tr'],[10e6,'10 tr'],[20e6,'20 tr']].filter(Boolean);
  openSheet({key:'capreq-'+c.id,title:pend?'Sửa yêu cầu vốn':lk?'Xin thêm vốn':'Xin vốn',sub:esc(c.name)+' · gửi Sơn Nga Family duyệt',
    body:`${lk?`<div class="box box--be"><div class="kvr"><span>Vốn đã cấp</span><b>${tr(c.sn_capital||0)}</b></div><div class="kvr"><span>Chi đã trả</span><b>${tr(kdOut(c))}</b></div>
        <div class="kvr"><span>Còn trong TK KINH DOANH LÀNH</span><b>${tr(left)}</b></div>${unpaid.length?`<div class="kvr kvr--do"><span>Chi chưa trả</span><b>${tr(sum(unpaid,e=>e.amount))}</b></div>`:''}</div>`
      :`<div class="note"><span>${P(I.info,18)}</span><span>Chiến dịch chưa nối Sơn Nga. Sơn Nga duyệt thì tạo chiến dịch bên đó, ghi vốn và nối hai bên${c.status==='draft'?'; lúc đó mới mở bán được':''}.</span></div>`}
      <label class="fl"><span>Số tiền xin${lk?' thêm':''}</span>${moneyIn('amount',amt,'VD 5tr',' data-autofocus')}</label>
      <div class="chips" data-chipamt>${chips.map(([n,t])=>`<button type="button" class="chip" data-n="${n}" aria-pressed="${n===amt}">${t}</button>`).join('')}</div>
      <label class="fl"><span>Dùng cho việc gì</span><textarea class="in" name="note" rows="3" maxlength="300" style="resize:none">${esc(pre.note!=null?pre.note:pend?pend.note||'':'')}</textarea></label>
      ${unpaid.length?`<div class="fl"><span>Đính kèm khoản chờ vốn</span><div class="lst">${unpaid.slice(0,20).map(e=>`<label class="ck"><input type="checkbox" name="ex" value="${e.id}"${sel.has(e.id)?' checked':''}><span class="grow">${esc(e.name)}</span><b>${tr(e.amount)}</b></label>`).join('')}</div></div>`:''}
      <div class="box box--be"><span class="cap">Sau khi gửi</span><span class="xs">Sơn Nga thấy yêu cầu ở lần đồng bộ tới. Duyệt và chuyển tiền xong, ô Vốn đã cấp tăng, khoản chờ vốn mở được Đã trả.</span></div>`,
    foot:`<p class="err" role="alert"></p><button type="button" class="b b--do b--w" data-save>${pend?'Lưu yêu cầu':'Gửi yêu cầu'}${amt?' '+tr(amt):''}</button>`,
    bind(el){
      bindMoney(el);
      const inp=el.querySelector('[name=amount]'),sv=el.querySelector('[data-save]');
      const lab=()=>{const n=money(inp.value);sv.textContent=(pend?'Lưu yêu cầu':'Gửi yêu cầu')+(n&&!isNaN(n)?' '+tr(n):'');el.querySelectorAll('[data-chipamt] .chip').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.n===n)))};
      inp.addEventListener('input',lab);
      el.addEventListener('click',async ev=>{
        const ch=ev.target.closest('[data-chipamt] .chip');if(ch){inp.value=mfmt(+ch.dataset.n);lab();return}
        if(!ev.target.closest('[data-save]'))return;
        const n=money(inp.value);if(n==null||isNaN(n)||n<1000)return fieldErr(el,ERR.invalid_money);
        const data={campaign_id:c.id,amount:n,note:el.querySelector('[name=note]').value,expense_ids:[...el.querySelectorAll('[name=ex]:checked')].map(x=>+x.value)};
        fieldErr(el,'');
        await busy(sv,async()=>{try{await save('capreq',null,data);toast((pend?'Đã sửa':'Đã gửi')+' yêu cầu '+tr(n));closeSheet()}catch(err){fieldErr(el,errText(err))}});
      });
    }});
}

/* ---------------- hộp ghi ---------------- */
let SH=null;
function openSheet(o){
  const root=$('sheet-root'),again=!!SH&&root.classList.contains('on');
  const html=`<div class="ov" data-close></div><div class="sh" role="dialog" aria-modal="true" aria-labelledby="sh-t">
    <div class="sh__h"><span class="grab" aria-hidden="true"></span><div class="sh__hr"><div class="grow"><h2 id="sh-t">${o.title}</h2>${o.sub?`<p class="xs">${o.sub}</p>`:''}</div><button class="x" type="button" data-close aria-label="Đóng">${P(I.x,18)}</button></div></div>
    <div class="sh__b">${o.body}</div>${o.foot?`<div class="sh__f">${o.foot}</div>`:''}</div>`;
  const keep=again?root.querySelector('.sh__b').scrollTop:0;
  root.innerHTML=html;
  SH={back:again?SH.back:document.activeElement,key:o.key};
  document.body.classList.add('lock');
  if(again)root.querySelector('.sh__b').scrollTop=keep;else{void root.offsetWidth;root.classList.add('on')}
  const el=root.querySelector('.sh');
  if(o.bind)o.bind(el);
  if(!again)setTimeout(()=>{const f=el.querySelector(o.focus||'[data-autofocus]')||el.querySelector('.x');if(f)f.focus({preventScroll:true})},60);
}
function closeSheet(){
  const root=$('sheet-root');if(!SH)return;
  const back=SH.back;SH=null;root.classList.remove('on');document.body.classList.remove('lock');
  setTimeout(()=>{if(!SH)root.innerHTML=''},320);
  if(back&&back.isConnected&&back.focus)back.focus({preventScroll:true});
}
document.addEventListener('keydown',e=>{
  if(!SH)return;
  if(e.key==='Escape'){e.preventDefault();closeSheet();return}
  if(e.key==='Tab'){const f=[...$('sheet-root').querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')].filter(x=>x.offsetParent!==null);
    if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});
const seg=(name,val,opts)=>`<div class="seg" role="group" data-seg="${name}" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map(([k,t])=>`<button type="button" data-v="${k}" aria-pressed="${String(val)===String(k)}">${t}</button>`).join('')}</div>`;
const segVal=(el,name)=>{const b=el.querySelector(`[data-seg="${name}"] [aria-pressed="true"]`);return b?b.dataset.v:''};
function bindSeg(el,cb){el.addEventListener('click',e=>{const b=e.target.closest('[data-seg] button');if(!b)return;b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));cb&&cb(b.parentNode.dataset.seg,b.dataset.v)})}
function bindMoney(el){el.addEventListener('focusout',e=>{const i=e.target.closest('[data-money]');if(!i)return;const v=money(i.value);if(v!=null&&!isNaN(v))i.value=mfmt(v)})}
const moneyIn=(name,val,ph,extra)=>`<input class="in" data-money name="${name}" inputmode="numeric" autocomplete="off" value="${val==null?'':mfmt(val)}" placeholder="${ph||'0'}"${extra||''}>`;
function fieldErr(el,t){const e=el.querySelector('.sh__f .err')||el.querySelector('.err');if(e)e.textContent=t||''}
async function busy(btn,fn){if(btn)btn.classList.add('is-busy');try{return await fn()}finally{if(btn)btn.classList.remove('is-busy')}}

/* --- bảng chọn set dùng chung cho ghi đơn và sửa đơn --- */
function itemsEditor(c,items){
  const cur=new Map((items||[]).map(i=>[i.code,i]));
  const sets=(c&&c.sets||[]).slice();
  (items||[]).forEach(i=>{if(!sets.some(s=>s.code===i.code))sets.push({code:i.code,name:i.name,price:i.price})});
  if(!sets.length)return '<p class="note">Chiến dịch chưa có set quà. Thêm set ở tab Chiến dịch trước.</p>';
  const v=c?view(c):null;
  return `<div class="lst" data-items>${sets.map(s=>{const i=cur.get(s.code),q=i?i.qty:0,sold=v?(v.sets.find(x=>x.code===s.code)||{}).sold||0:0;
    return `<div class="itr${q?' on':''}" data-code="${esc(s.code)}" data-name="${esc(s.name)}"><div class="grow"><b style="display:block;font-size:14.5px">${esc(s.name)}</b><span class="xs">${s.qty?`đã bán ${sold}/${s.qty}`:`đã bán ${sold}`}</span></div>
      <input class="in" data-money data-price inputmode="numeric" aria-label="Giá bán ${esc(s.name)}" value="${mfmt(i?i.price:s.price)}">
      <div class="stp"><button type="button" data-dec aria-label="Bớt ${esc(s.name)}">−</button><input data-qty inputmode="numeric" aria-label="Số lượng ${esc(s.name)}" value="${q}"><button type="button" data-inc aria-label="Thêm ${esc(s.name)}">+</button></div></div>`}).join('')}</div>`;
}
function readItems(el){return [...el.querySelectorAll('[data-items] .itr')].map(r=>({code:r.dataset.code,name:r.dataset.name,price:money(r.querySelector('[data-price]').value),qty:parseInt(r.querySelector('[data-qty]').value.replace(/\D/g,'')||'0',10)})).filter(i=>i.qty>0)}
function bindItems(el,cb){
  el.addEventListener('click',e=>{const b=e.target.closest('[data-inc],[data-dec]');if(!b)return;const r=b.closest('.itr'),q=r.querySelector('[data-qty]');let n=parseInt(q.value.replace(/\D/g,'')||'0',10);n=Math.max(0,Math.min(5000,n+(b.hasAttribute('data-inc')?1:-1)));q.value=n;r.classList.toggle('on',n>0);cb&&cb()});
  el.addEventListener('input',e=>{if(e.target.closest('[data-items]')){const r=e.target.closest('.itr');if(r)r.classList.toggle('on',parseInt(r.querySelector('[data-qty]').value.replace(/\D/g,'')||'0',10)>0);cb&&cb()}});
}

/* --- Ghi đơn nhập tay --- */
function newOrderSheet(){
  const c=camp();
  if(!c||c.status==='settled'){toast(c?ERR.locked:ERR.invalid_campaign);return}
  const src=D.sources.filter(s=>s.active).sort((a,b)=>(a.auto-b.auto)||a.sort-b.sort);
  openSheet({key:'new-order',title:'Ghi đơn',sub:`${esc(c.name)} · đơn qua Zalo, Facebook, người quen, doanh nghiệp…`,
    body:`${itemsEditor(c,[])}
      <div class="fl"><span>Nguồn đơn</span><div class="chips" data-chips="channel">${src.map((s,i)=>`<button type="button" class="chip" data-v="${esc(s.key)}" aria-pressed="${i===0}">${esc(s.label)}</button>`).join('')}</div></div>
      <div class="two"><label class="fl"><span>Tên khách</span><input class="in" name="name" autocomplete="off" placeholder="Khách lẻ"></label>
        <label class="fl"><span>Điện thoại <small>không bắt buộc</small></span><input class="in" name="phone" inputmode="tel" autocomplete="off"></label></div>
      <div class="fl"><span>Nơi giao</span>${seg('zone','hcm',[['hcm','Nội thành'],['tinh','Đi tỉnh'],['','Không giao']])}</div>
      <label class="fl" data-addr><span>Địa chỉ</span><input class="in" name="address" autocomplete="off"></label>
      <div class="two"><label class="fl"><span>Phí ship báo khách <small data-shiphint></small></span>${moneyIn('ship_fee',0)}</label>
        <div class="fl"><span>Thanh toán</span>${seg('pay','cod',[['cod','COD'],['ck','CK'],['tien-mat','Tiền mặt']])}</div></div>
      <div class="fl"><span>Trạng thái</span>${seg('status','da-xac-nhan',[['moi','Mới'],['da-xac-nhan','Đã xác nhận'],['da-nhan-tien','Đã nhận tiền']])}<span class="xs">Đã nhận tiền: bán trực tiếp, khách trả đủ ngay.</span></div>
      <div class="two"><label class="fl"><span>Ngày</span><input class="in" type="date" name="date" value="${today()}" max="${today()}"></label>
        <label class="fl"><span>Ghi chú</span><input class="in" name="note" autocomplete="off"></label></div>
      <div class="sum"><span><span class="cap" style="color:var(--do-d)">Khách trả</span><span class="xs" data-sumx style="display:block"></span></span><b data-sum>0đ</b></div>`,
    foot:`<p class="err" role="alert"></p><button type="button" class="b b--do b--w" data-save="0">Lưu đơn</button><button type="button" class="b b--o b--w" data-save="1">Lưu và ghi đơn tiếp</button>`,
    focus:'[data-items] [data-inc]',
    bind(el){
      let touched=false;
      const upd=()=>{const it=readItems(el),n=sum(it,i=>i.qty),z=segVal(el,'zone'),goods=sum(it,i=>(i.price||0)*i.qty);
        const f=el.querySelector('[name=ship_fee]');if(!touched)f.value=mfmt(shipRule(n,z));
        const sh=money(f.value)||0;el.querySelector('[data-sum]').textContent=vnd(goods+sh);
        el.querySelector('[data-sumx]').textContent=n?`${n} giỏ · tiền quà ${vnd(goods)} + ship ${vnd(sh)}`:'Chọn set và số lượng';
        el.querySelector('[data-shiphint]').textContent=peak()?'cao điểm Tết: nhập số đã báo':z?'theo bảng, sửa được':'';
        el.querySelector('[data-addr]').hidden=!z};
      bindItems(el,upd);bindMoney(el);
      bindSeg(el,(n)=>{if(n==='zone')upd()});
      el.querySelector('[name=ship_fee]').addEventListener('input',()=>{touched=true;upd()});
      el.querySelector('[data-chips]').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;b.parentNode.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
      upd();
      el.addEventListener('click',async e=>{const b=e.target.closest('[data-save]');if(!b)return;
        const it=readItems(el);if(!it.length)return fieldErr(el,ERR.invalid_items);
        if(it.some(i=>i.price==null||isNaN(i.price)))return fieldErr(el,'Giá bán chưa đúng.');
        const ship=money(el.querySelector('[name=ship_fee]').value);if(ship!=null&&isNaN(ship))return fieldErr(el,ERR.invalid_money);
        const z=segVal(el,'zone'),ph=el.querySelector('[name=phone]').value.replace(/\D/g,'');
        if(ph&&!/^0\d{9,10}$/.test(ph))return fieldErr(el,ERR.invalid_phone);
        const nm=el.querySelector('[name=name]').value.trim();if(nm&&nm.length<2)return fieldErr(el,ERR.invalid_name);
        const ch=el.querySelector('[data-chips] [aria-pressed="true"]');
        const data={campaign_id:c.id,items:it,name:nm||'Khách lẻ',phone:ph,zone:z,address:z?el.querySelector('[name=address]').value.trim():'',ship_fee:z?ship||0:0,
          channel:ch?ch.dataset.v:'khac',pay_method:segVal(el,'pay'),status:segVal(el,'status'),date:el.querySelector('[name=date]').value,note:el.querySelector('[name=note]').value};
        fieldErr(el,'');
        await busy(b,async()=>{try{const row=await save('order',null,data);toast('Đã lưu đơn '+row.code);
          if(b.dataset.save==='1')newOrderSheet();else closeSheet()}catch(err){fieldErr(el,errText(err))}});
      });
    }});
}

/* --- Chi tiết đơn: trạng thái, đối soát, thông tin --- */
function orderSheet(id){
  const o=D.orders.find(x=>x.id===id);if(!o){closeSheet();return}
  const c=D.campaigns.find(x=>x.id===o.campaign_id),locked=c&&c.status==='settled',done=DONE(o.status);
  const idx=o.status==='da-nhan-tien'?FLOW.length:FLOW.indexOf(o.status);
  const flow=o.status==='huy'||o.status==='hoan-hang'?`<div class="note note--do"><span>${P(I.alert,18)}</span><span>Đơn ${SN[o.status].toLowerCase()}${o.status==='hoan-hang'?': khách không nhận, hàng quay về. Ghi phí ship đã mất ở dưới.':'.'}</span></div>`:
    `<ol class="flow" aria-label="Tiến trình đơn">${FLOW.map((k,i)=>`<li class="${i<idx?'done':i===idx?'cur':''}"${i===idx?' aria-current="step"':''}><i></i><span>${FLOWS[k]}</span></li>`).join('')}</ol>`;
  const reconFields=(gotDef,costDef)=>`<div class="two"><label class="fl"><span>Khách trả thực tế</span>${moneyIn('got_amount',gotDef)}</label><label class="fl"><span>Phí trả hãng ship</span>${moneyIn('ship_cost',costDef)}</label></div><p class="xs" style="margin-top:-6px">Phí trả hãng gồm cả phí thu hộ COD nếu hãng tính. Khách trả ship thẳng cho tài xế: khách trả ghi tiền quà, phí hãng ghi 0.</p>
    <div class="two"><label class="fl"><span>Hãng / người giao</span><input class="in" name="carrier" list="carriers" value="${esc(o.carrier||'')}" autocomplete="off"></label><label class="fl"><span>Ghi chú đối soát</span><input class="in" name="recon_note" value="${esc(o.recon_note||'')}" autocomplete="off" placeholder="VD khách xin bớt"></label></div>
    <div class="sum"><span><span class="cap" style="color:var(--do-d)">Thực nhận</span><span class="xs" data-rx style="display:block"></span></span><b data-rn></b></div>
    <div class="fl"><span>Tiền khách về</span>${seg('money_to',o.money_to||'hkd',MTO)}</div>
    <div class="fl"><span>Phí ship trả bằng</span>${seg('ship_by',o.ship_paid_by||(o.pay_method==='cod'?'tru-cod':'tk-kd'),SBY)}<span class="xs">Đơn COD mặc định hãng trừ. Đơn chuyển khoản, tiền mặt mặc định trả từ TK KINH DOANH LÀNH.</span></div>
    ${linked(c)?'<div class="box box--la" data-snx></div>':''}`;
  let act='';
  if(locked)act='';
  else if(o.status==='moi')act=`<div class="box box--do">${o.zone?`<label class="fl"><span>Phí ship báo khách <small>${peak()?'cao điểm Tết, nhập số đã báo':'gõ 0 nếu miễn phí'}</small></span>${moneyIn('ship_fee',o.ship_fee,peak()?'VD 80k':'',o.ship_fee==null?' data-autofocus':'')}</label>`:''}
    <div class="acts"><button type="button" class="b b--do" data-st="da-xac-nhan">Xác nhận đơn</button><button type="button" class="b b--o" data-st="huy">Huỷ đơn</button></div><span class="xs">Gọi hoặc nhắn Zalo cho khách trước khi xác nhận.</span></div>`;
  else if(o.status==='da-xac-nhan')act=`<div class="box box--do"><label class="fl"><span>Hãng / người giao</span><input class="in" name="carrier" list="carriers" value="${esc(o.carrier||'')}" autocomplete="off" data-autofocus></label>
    <div class="acts"><button type="button" class="b b--do" data-st="dang-giao">Đã giao cho ship</button><button type="button" class="b b--o" data-st="huy">Huỷ đơn</button></div></div>`;
  else if(o.status==='dang-giao')act=`<div class="box box--do"><div class="acts"><button type="button" class="b b--do" data-st="da-giao">Khách đã nhận hàng</button><button type="button" class="b b--o" data-st="hoan-hang">Hoàn hàng</button></div><span class="xs">Hoàn hàng: khách không nhận, hàng quay về.</span></div>`;
  else if(o.status==='da-giao')act=`<div class="box box--do"><span class="cap" style="color:var(--do-d)">Đối soát tiền</span>${reconFields(o.got_amount!=null?o.got_amount:pGot(o),o.ship_cost!=null?o.ship_cost:pCost(o))}
    <div class="acts"><button type="button" class="b b--la" data-st="da-nhan-tien">Đã nhận tiền</button><button type="button" class="b b--o" data-st="hoan-hang">Hoàn hàng</button></div></div>`;
  else if(done)act=`<details class="more"${o.status==='hoan-hang'?' open':''}><summary>Sửa số đối soát</summary><div class="box">${reconFields(o.got_amount,o.ship_cost)}<div class="acts"><button type="button" class="b b--do" data-st="${o.status}">Lưu đối soát</button><button type="button" class="b b--o" data-st="${o.status==='hoan-hang'?'dang-giao':'da-giao'}">Đưa về ${o.status==='hoan-hang'?'Đang giao':'Đã giao'}</button></div></div></details>`;
  else if(o.status==='huy')act=`<div class="acts"><button type="button" class="b b--o" data-st="moi">Khôi phục đơn</button></div>`;
  const pc=pCost(o),gd=done?o.got_amount-pGot(o):null,cd=done?pc-o.ship_cost:null,nd=done?aNet(o)-pNet(o):null;
  const money_=`<div class="pt">${ptHead('Khoản')}
    ${ptRow('Tiền quà','',vnd(o.total),'',null)}
    ${ptRow('Ship thu khách','',o.ship_fee==null?'<span class="warn">chưa có</span>':vnd(o.ship_fee),'',null)}
    ${ptRow('Khách trả','',vnd(pGot(o)),done?vnd(o.got_amount):'<span class="xs">chưa đối soát</span>',gd)}
    ${ptRow('Phí trả hãng','',vnd(pc),done?vnd(o.ship_cost):'<span class="xs">chưa đối soát</span>',cd)}
    ${ptRow('Thực nhận','',vnd(pNet(o)),done?vnd(aNet(o)):'—',nd,'tot')}</div>`;
  const map=o.address?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.address):'';
  const src=D.sources.filter(s=>s.active||s.key===o.channel);
  openSheet({key:'order-'+id,title:esc(o.code),sub:`${o.origin==='tay'?'Nhập tay':'Đặt trên web'} · ${esc(srcName(o.channel))}${o.ref?' ('+esc(o.ref)+')':''} · ${ft(o.created_at)} · <span class="tg st-${o.status}">${SN[o.status]}</span>`,
    body:`${flow}${locked?`<div class="note"><span>${P(I.info,18)}</span><span>${ERR.locked}</span></div>`:''}${act}
    <dl class="kv"><dt>Khách</dt><dd>${esc(o.name)}${o.phone?' · <a href="tel:'+esc(o.phone)+'">'+phoneFmt(o.phone)+'</a>':''}</dd><dt>Giao</dt><dd>${o.zone?ZN[o.zone]:'Không giao'}${o.address?' · '+esc(o.address):''}</dd>
      <dt>Hàng</dt><dd>${esc(label(o))}</dd><dt>Thanh toán</dt><dd>${PN[o.pay_method]||'COD'}${o.carrier?' · '+esc(o.carrier):''}${done&&o.money_to==='rieng'?' · <b style="color:var(--kim-d)">tiền ở Ví riêng Sơn</b>':''}</dd>${o.note?`<dt>Ghi chú</dt><dd>${esc(o.note)}</dd>`:''}</dl>
    ${money_}
    <div class="acts">${o.phone?`<a class="b b--o b--sm" href="tel:${esc(o.phone)}">Gọi</a><a class="b b--o b--sm" href="https://zalo.me/${esc(o.phone)}" target="_blank" rel="noopener">Zalo</a>`:''}<button type="button" class="b b--o b--sm" data-copy>Chép thông tin giao</button>${map?`<a class="b b--o b--sm" href="${map}" target="_blank" rel="noopener">Bản đồ</a>`:''}</div>
    ${locked?'':`<details class="more"><summary>Sửa thông tin đơn</summary><div class="box" data-edit>
      <div class="two"><label class="fl"><span>Tên khách</span><input class="in" name="e_name" value="${esc(o.name)}" autocomplete="off"></label><label class="fl"><span>Điện thoại</span><input class="in" name="e_phone" inputmode="tel" value="${esc(o.phone||'')}" autocomplete="off"></label></div>
      <label class="fl"><span>Địa chỉ</span><input class="in" name="e_address" value="${esc(o.address||'')}" autocomplete="off"></label>
      <div class="fl"><span>Nơi giao</span>${seg('e_zone',o.zone||'',[['hcm','Nội thành'],['tinh','Đi tỉnh'],['','Không giao']])}</div>
      ${done?'<p class="xs">Hàng và phí ship báo khách đã khoá vì đơn đã đối soát.</p>':`<div class="fl"><span>Hàng</span>${itemsEditor(c,itemsOf(o))}</div><label class="fl"><span>Phí ship báo khách</span>${moneyIn('e_ship',o.ship_fee,'chưa có')}</label>`}
      <div class="two"><label class="fl"><span>Nguồn đơn</span><select class="in" name="e_channel">${src.map(s=>`<option value="${esc(s.key)}"${s.key===o.channel?' selected':''}>${esc(s.label)}</option>`).join('')}</select></label>
        <div class="fl"><span>Thanh toán</span>${seg('e_pay',o.pay_method||'cod',[['cod','COD'],['ck','CK'],['tien-mat','Tiền mặt']])}</div></div>
      <div class="two"><label class="fl"><span>Chiến dịch</span><select class="in" name="e_camp">${D.campaigns.filter(x=>x.status!=='settled'||x.id===o.campaign_id).map(x=>`<option value="${x.id}"${x.id===o.campaign_id?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="fl"><span>Đổi trạng thái</span><select class="in" name="e_status">${ST.map(([k,t])=>`<option value="${k}"${k===o.status?' selected':''}>${t}</option>`).join('')}</select></label></div>
      <label class="fl"><span>Ghi chú</span><input class="in" name="e_note" value="${esc(o.note||'')}" autocomplete="off"></label>
      <button type="button" class="b b--do" data-edit-save>Lưu thông tin</button></div></details>`}
    <datalist id="carriers">${CARRIERS.map(x=>`<option value="${x}">`).join('')}</datalist>
    <p class="err" role="alert"></p>`,
    bind(el){
      bindMoney(el);bindSeg(el,()=>upd());bindItems(el);
      const rn=el.querySelector('[data-rn]');
      const upd=()=>{if(!rn)return;const g=money(el.querySelector('[name=got_amount]').value),k=money(el.querySelector('[name=ship_cost]').value);
        const net=(isNaN(g)||g==null?0:g)-(isNaN(k)||k==null?0:k),d=net-pNet(o);rn.textContent=vnd(net);
        el.querySelector('[data-rx]').innerHTML=`kế hoạch ${vnd(pNet(o))} · chênh <b class="${dcls(d)}">${dv(d)}</b>`;
        const sx=el.querySelector('[data-snx]');if(!sx)return;
        // 2B: dòng sẽ ghi sang Sơn Nga khi đơn Đã nhận tiền
        const gg=isNaN(g)||g==null?0:g,kk=isNaN(k)||k==null?0:k,hoan=o.status==='hoan-hang',tru=!hoan&&segVal(el,'ship_by')==='tru-cod'&&gg>=kk,thu=Math.max(0,gg-(tru?kk:0)),n=itemsOf(o).length;
        const to=segVal(el,'money_to')==='rieng'?'Ví riêng Sơn':'TK HỘ KINH DOANH',parts=[];
        if(thu>0)parts.push(`${n>1?n+' dòng':'1 dòng'} Thu <b>${vnd(thu)}</b> vào ${to}${tru&&kk?' (khách trả − phí ship hãng trừ)':''}`);
        if(!tru&&kk>0)parts.push(`1 dòng Chi vận chuyển <b>${vnd(kk)}</b> từ TK KINH DOANH LÀNH`);
        sx.innerHTML=`<span class="cap" style="color:var(--la)">Sang Sơn Nga thành</span><span class="xs" style="color:var(--la);font-size:13px;line-height:1.5">${parts.length?parts.join('; '):'Không có dòng tiền'}. Mã nguồn LANH:O:${esc(o.code)}.${segVal(el,'money_to')==='rieng'?' Nhớ chuyển sang TK HỘ KINH DOANH trước khi quyết toán.':''}</span>`};
      el.addEventListener('input',e=>{if(e.target.name==='got_amount'||e.target.name==='ship_cost')upd()});upd();
      el.addEventListener('click',async e=>{
        const cp=e.target.closest('[data-copy]');
        if(cp){const t=[o.name,phoneFmt(o.phone),(o.address||'')+(o.zone?' ('+ZN[o.zone]+')':''),label(o),(o.pay_method==='cod'?'Thu hộ COD: ':'Khách trả: ')+(o.zone&&o.ship_fee==null?vnd(o.total)+' + phí ship':vnd(pGot(o))),o.note?'Ghi chú: '+o.note:'','Mã đơn: '+o.code].filter(Boolean).join('\n');
          try{await navigator.clipboard.writeText(t);toast('Đã chép thông tin giao hàng')}catch(err){window.prompt('Chép thông tin giao hàng',t)}return}
        const sb=e.target.closest('[data-st]');
        if(sb){const to=sb.dataset.st,data={status:to};
          const f=el.querySelector('.box [name=ship_fee]');
          if(f){const v=money(f.value);if(to==='da-xac-nhan'&&o.zone&&(v==null||isNaN(v)))return fieldErr(el,'Nhập phí ship đã báo khách (gõ 0 nếu miễn phí).');if(v!=null&&!isNaN(v))data.ship_fee=v}
          const cr=el.querySelector('.box [name=carrier]');if(cr)data.carrier=cr.value;
          const g=el.querySelector('.box [name=got_amount]');
          if(g&&(DONE(to)||to==='da-nhan-tien')){const gv=money(g.value),kv=money(el.querySelector('.box [name=ship_cost]').value);if(isNaN(gv)||isNaN(kv)||gv==null||kv==null)return fieldErr(el,ERR.invalid_money);
            data.got_amount=gv;data.ship_cost=kv;data.recon_note=el.querySelector('.box [name=recon_note]').value;
            const mtv=segVal(el,'money_to');if(mtv){data.money_to=mtv;data.ship_paid_by=segVal(el,'ship_by')}}
          if(to==='huy'&&!window.confirm('Huỷ đơn '+o.code+'?'))return;
          fieldErr(el,'');
          await busy(sb,async()=>{try{await save('order',id,data);toast(o.code+': '+SN[to]);orderSheet(id)}catch(err){fieldErr(el,errText(err))}});return}
        const es=e.target.closest('[data-edit-save]');
        if(es){const box=el.querySelector('[data-edit]'),q=n=>box.querySelector(`[name=${n}]`);
          const data={name:q('e_name').value,phone:q('e_phone').value,address:q('e_address').value,zone:segVal(box,'e_zone'),channel:q('e_channel').value,pay_method:segVal(box,'e_pay'),note:q('e_note').value};
          const cid=+q('e_camp').value;if(cid!==o.campaign_id)data.campaign_id=cid;
          if(q('e_status').value!==o.status)data.status=q('e_status').value;
          if(!done){const it=readItems(box);if(!it.length)return fieldErr(el,ERR.invalid_items);if(it.some(i=>i.price==null||isNaN(i.price)))return fieldErr(el,'Giá bán chưa đúng.');
            if(JSON.stringify(it.map(i=>[i.code,i.qty,i.price]))!==JSON.stringify(itemsOf(o).map(i=>[i.code,i.qty,i.price])))data.items=it;
            const s=money(q('e_ship').value);if(s!=null&&isNaN(s))return fieldErr(el,ERR.invalid_money);if(s!==o.ship_fee)data.ship_fee=s}
          if(data.name.trim().length<2)return fieldErr(el,ERR.invalid_name);
          fieldErr(el,'');
          await busy(es,async()=>{try{await save('order',id,data);toast(o.code+': đã lưu');orderSheet(id)}catch(err){fieldErr(el,errText(err))}})}
      });
    }});
}

/* --- Ghi chi / sửa chi --- */
function expSheet(id){
  const e0=id?D.expenses.find(x=>x.id===id):null,c=e0?D.campaigns.find(x=>x.id===e0.campaign_id):camp();
  if(!c){toast(ERR.invalid_campaign);return}
  const locked=c.status==='settled';
  if(!e0&&locked){toast(ERR.locked);return}
  const e=e0||{cat:'nhap',name:'',amount:null,units:null,vendor:'',paid:true,spent_on:today(),note:''};
  openSheet({key:'exp-'+(id||'new'),title:id?'Sửa khoản chi':'Ghi chi',sub:esc(c.name),
    body:`${locked?`<div class="note"><span>${P(I.info,18)}</span><span>${ERR.locked}</span></div>`:''}
      <div class="fl"><span>Loại chi</span><div class="chips" data-chips="cat">${CATS.map(([k,t])=>`<button type="button" class="chip" data-v="${k}" aria-pressed="${e.cat===k}">${t}</button>`).join('')}</div></div>
      <label class="fl"><span>Nội dung</span><input class="in" name="name" value="${esc(e.name)}" placeholder="VD mứt nho vàng 40 hũ" autocomplete="off" data-autofocus></label>
      <div class="two"><label class="fl"><span>Số tiền</span>${moneyIn('amount',e.amount,'VD 4,5tr')}</label><label class="fl"><span>Số lượng <small>không bắt buộc</small></span><input class="in" name="units" inputmode="numeric" value="${e.units||''}"></label></div>
      <div class="two"><label class="fl"><span>Nơi mua</span><input class="in" name="vendor" value="${esc(e.vendor||'')}" autocomplete="off"></label><label class="fl"><span>Ngày</span><input class="in" type="date" name="spent_on" value="${esc(e.spent_on)}" max="${today()}"></label></div>
      <div class="fl"><span>Thanh toán</span>${seg('paid',e.paid?'1':'0',[['1','Đã trả'],['0','Chưa trả']])}</div>
      <div data-capwarn style="display:contents"></div>
      <label class="fl"><span>Ghi chú</span><input class="in" name="note" value="${esc(e.note||'')}" autocomplete="off"></label>
      <p class="xs">Phí ship từng đơn ghi ở đối soát đơn, không ghi ở đây để khỏi tính hai lần.</p>`,
    foot:locked?'':`<p class="err" role="alert"></p><button type="button" class="b b--do b--w" data-askcap hidden>Xin thêm vốn</button><button type="button" class="b b--do b--w" data-save>Lưu khoản chi</button>${id?'<button type="button" class="b b--o b--w" data-del>Xoá khoản chi</button>':''}`,
    bind(el){
      bindMoney(el);bindSeg(el);
      // 2B: chiến dịch đã nối: chi trả từ TK KINH DOANH LÀNH, chỉ được Đã trả khi phần chiến dịch còn đủ tiền (quy tắc B của Sơn Nga)
      let need=0;
      const chk=()=>{if(locked||!linked(c)||c.sn_capital==null)return;
        const amt=money(el.querySelector('[name=amount]').value),left=capLeft(c)+(e0&&e0.paid&&e0.campaign_id===c.id?e0.amount:0);
        need=amt!=null&&!isNaN(amt)&&amt>left+1000?amt-Math.max(0,left):0;
        const pb=el.querySelector('[data-seg="paid"] [data-v="1"]'),ub=el.querySelector('[data-seg="paid"] [data-v="0"]'),w=el.querySelector('[data-capwarn]'),ask=el.querySelector('[data-askcap]'),sv=el.querySelector('[data-save]');
        if(need){pb.disabled=true;if(pb.getAttribute('aria-pressed')==='true'){pb.setAttribute('aria-pressed','false');ub.setAttribute('aria-pressed','true')}
          w.innerHTML=`<div class="note note--do"><span>${P(I.alert,18)}</span><span>TK KINH DOANH LÀNH còn <b>${tr(Math.max(0,left))}</b>, khoản này <b>${tr(amt)}</b>, thiếu <b>${tr(need)}</b>. Chưa chọn được Đã trả.</span></div>
            <div class="box box--be"><span class="cap">Sau khi lưu</span><span class="xs">Khoản nằm ở mục Chi chưa trả, chưa sang Sơn Nga. Vốn về thì mở lại khoản này và chọn Đã trả.</span></div>`;
          ask.hidden=false;ask.textContent='Xin thêm '+tr(need)+' vốn';sv.textContent='Lưu, chưa trả';sv.className='b b--o b--w'}
        else{pb.disabled=false;w.innerHTML='';ask.hidden=true;sv.textContent='Lưu khoản chi';sv.className='b b--do b--w'}};
      el.querySelector('[name=amount]').addEventListener('input',chk);chk();
      el.querySelector('[data-chips]').addEventListener('click',ev=>{const b=ev.target.closest('.chip');if(!b)return;b.parentNode.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
      el.addEventListener('click',async ev=>{
        const s=ev.target.closest('[data-save],[data-askcap]'),d=ev.target.closest('[data-del]');
        if(s){const q=n=>el.querySelector(`[name=${n}]`),amt=money(q('amount').value),ask=s.hasAttribute('data-askcap');
          if(q('name').value.trim().length<2)return fieldErr(el,'Nhập nội dung chi.');
          if(amt==null||isNaN(amt)||amt<1)return fieldErr(el,ERR.invalid_amount);
          const cat=el.querySelector('[data-chips] [aria-pressed="true"]');
          const data={cat:cat?cat.dataset.v:'khac',name:q('name').value,amount:amt,units:q('units').value.replace(/\D/g,''),vendor:q('vendor').value,spent_on:q('spent_on').value,paid:segVal(el,'paid')==='1',note:q('note').value};
          if(!id)data.campaign_id=c.id;
          fieldErr(el,'');
          if(ask)data.paid=false;
          await busy(s,async()=>{try{const row=await save('expense',id||null,data);
            if(ask){capSheet(c,{amount:need,expense_ids:[row.id],note:row.name});toast('Đã lưu khoản chi, chưa trả');return}
            toast('Đã lưu khoản chi');closeSheet()}catch(err){fieldErr(el,err&&err.message==='no_capital'&&err.data&&err.data.left!=null?'TK KINH DOANH LÀNH còn '+tr(err.data.left)+', chưa đủ cho khoản này. Lưu Chưa trả rồi xin thêm vốn.':errText(err))}})}
        if(d){if(!window.confirm('Xoá khoản chi "'+e.name+'"?'))return;
          await busy(d,async()=>{try{await save('expense-delete',id,{});toast('Đã xoá khoản chi');closeSheet()}catch(err){fieldErr(el,errText(err))}})}
      });
    }});
}

/* --- Tạo / sửa chiến dịch --- */
function campSheet(id){
  const c0=id?D.campaigns.find(x=>x.id===id):null;
  const base=D.campaigns.find(x=>x.status==='running')||D.campaigns[D.campaigns.length-1];
  const c=c0||{name:'',status:'draft',start_date:'',end_date:'',target_revenue:null,budget:{},sets:base?base.sets.map(s=>({...s,qty:null})):[],note:''};
  const setRow=s=>`<div class="csr" data-set="${esc(s.code||'')}" data-web="${s.web?1:0}">
    <input class="in" name="s_name" value="${esc(s.name||'')}" placeholder="Tên set" aria-label="Tên set"${s.web?' disabled':''}>
    <input class="in" data-money name="s_price" value="${s.price==null?'':mfmt(s.price)}" placeholder="Giá" aria-label="Giá"${s.web?' disabled':''}>
    <input class="in" name="s_qty" inputmode="numeric" value="${s.qty==null?'':s.qty}" placeholder="Số chuẩn bị" aria-label="Số set chuẩn bị">
    <button type="button" class="x" data-rm aria-label="Bỏ set">${P(I.x,16)}</button></div>`;
  openSheet({key:'camp-'+(id||'new'),title:id?'Sửa chiến dịch':'Tạo chiến dịch',sub:id?esc(c.name):'Đơn web tự vào chiến dịch Đang bán',
    body:`<label class="fl"><span>Tên chiến dịch</span><input class="in" name="name" value="${esc(c.name)}" placeholder="VD Tết 2027" autocomplete="off" data-autofocus></label>
      <div class="fl"><span>Trạng thái</span>${seg('status',c.status,linked(c0)&&c.status!=='settled'?CS.filter(([k])=>k!=='settled'):CS)}<span class="xs">${linked(c0)?'Đã nối Sơn Nga Family: quyết toán và mở lại làm ở Sơn Nga, Lành tự khoá sổ theo.':'Đã quyết toán: khoá sổ chiến dịch, không sửa đơn và chi được nữa. Mở lại bằng cách chọn trạng thái khác.'}</span></div>
      <div class="two"><label class="fl"><span>Bắt đầu bán</span><input class="in" type="date" name="start_date" value="${esc(c.start_date||'')}"></label><label class="fl"><span>Kết thúc</span><input class="in" type="date" name="end_date" value="${esc(c.end_date||'')}"></label></div>
      <label class="fl"><span>Mục tiêu doanh thu</span>${moneyIn('target_revenue',c.target_revenue,'VD 60tr')}</label>
      ${id?`<div class="note"><span>${P(I.info,18)}</span><span>${linked(c0)?'Đã nối Sơn Nga Family. Vốn do Sơn Nga cấp: thiếu vốn thì bấm Xin thêm vốn ở thẻ Vốn và tài khoản.':'Chưa nối Sơn Nga Family. Xin vốn ở tab Chiến dịch, thẻ Vốn và tài khoản.'}</span></div>`
        :`<div class="box box--do"><label class="fl"><span>Vốn xin cấp <small>gửi Sơn Nga duyệt</small></span>${moneyIn('capital',null,'VD 18tr')}</label><span class="xs" data-capsug>Để trống nếu chưa cần vốn.</span></div>`}
      <div class="fl"><span>Set quà <small>tên · giá · số chuẩn bị</small></span><div class="lst" data-sets>${(c.sets||[]).map(setRow).join('')}</div>
        <button type="button" class="b b--o b--sm" data-addset style="align-self:flex-start">${P(I.plus,16)}Thêm set</button><span class="xs">Giá hai set trên web cố định theo trang web; muốn đổi giá web, nhắn Claude sửa cả trang và máy chủ.</span></div>
      <div class="fl"><span>Ngân sách chi</span><div class="two">${CATS.map(([k,t])=>`<label class="fl"><span>${t}</span>${moneyIn('b_'+k,(c.budget||{})[k],'0')}</label>`).join('')}</div></div>
      <label class="fl"><span>Ghi chú</span><input class="in" name="note" value="${esc(c.note||'')}" autocomplete="off"></label>`,
    foot:`<p class="err" role="alert"></p>${id?'':`<p class="xs" data-campafter style="margin:0">Sau khi lưu: chiến dịch ở Nháp; có vốn xin cấp thì yêu cầu sang Sơn Nga, Sơn Nga duyệt thì chiến dịch được nối hai bên và mở bán được.</p>`}<button type="button" class="b b--do b--w" data-save>${id?'Lưu chiến dịch':'Tạo chiến dịch'}</button>`,
    bind(el){
      bindMoney(el);bindSeg(el);
      if(!id){const ci=el.querySelector('[name=capital]'),sv=el.querySelector('[data-save]'),sg=el.querySelector('[data-capsug]');
        const bt=()=>{let t=0;for(const [k] of CATS){const x=money(el.querySelector('[name=b_'+k+']').value);if(x&&!isNaN(x))t+=x}return t};
        const lab=()=>{const n=money(ci.value),b=bt();sv.textContent=n&&!isNaN(n)?'Lưu và gửi xin vốn':'Tạo chiến dịch';sg.textContent=b?'Gợi ý theo ngân sách: '+tr(b)+'. Để trống nếu chưa cần vốn.':'Để trống nếu chưa cần vốn.'};
        el.addEventListener('input',e=>{if(e.target.name==='capital'||/^b_/.test(e.target.name||''))lab()});lab()}
      el.addEventListener('click',async ev=>{
        if(ev.target.closest('[data-addset]')){el.querySelector('[data-sets]').insertAdjacentHTML('beforeend',setRow({}));el.querySelector('[data-sets] .csr:last-child input').focus();return}
        const rm=ev.target.closest('[data-rm]');if(rm){rm.closest('.csr').remove();return}
        const s=ev.target.closest('[data-save]');if(!s)return;
        const q=n=>el.querySelector(`[name=${n}]`),name=q('name').value.trim();
        if(name.length<2)return fieldErr(el,'Nhập tên chiến dịch.');
        const sets=[];let bad=false;
        el.querySelectorAll('[data-sets] .csr').forEach(r=>{const nm=r.querySelector('[name=s_name]').value.trim(),pr=money(r.querySelector('[name=s_price]').value),qt=r.querySelector('[name=s_qty]').value.replace(/\D/g,'');
          if(!nm&&!r.dataset.set)return;if(!nm||pr==null||isNaN(pr))bad=true;
          let code=r.dataset.set||slug(nm)||'set';while(sets.some(x=>x.code===code))code+='-2';
          sets.push({code,name:nm,price:pr,qty:qt?+qt:null})});
        if(bad)return fieldErr(el,'Mỗi set cần tên và giá.');
        const budget={};for(const [k] of CATS){const v=money(q('b_'+k).value);if(v!=null&&isNaN(v))return fieldErr(el,ERR.invalid_budget);if(v)budget[k]=v}
        const tg=money(q('target_revenue').value);if(tg!=null&&isNaN(tg))return fieldErr(el,ERR.invalid_money);
        const data={name,status:segVal(el,'status'),start_date:q('start_date').value,end_date:q('end_date').value,target_revenue:tg,sets,budget,note:q('note').value};
        if(!id){let code=slug(name)||'chien-dich';if(D.campaigns.some(x=>x.code===code))code=(code+'-'+Date.now().toString(36)).slice(0,40);data.code=code}
        const cap=id?null:money(el.querySelector('[name=capital]').value);if(cap!=null&&(isNaN(cap)||cap<1000))return fieldErr(el,ERR.invalid_money);
        if(c0&&c0.status!=='settled'&&data.status==='settled'&&!window.confirm('Quyết toán và khoá sổ '+name+'? Sau đó không sửa đơn, chi của chiến dịch được nữa.'))return;
        fieldErr(el,'');
        await busy(s,async()=>{try{const row=await save('campaign',id||null,data);S.camp=row.id;
          if(cap){try{await save('capreq',null,{campaign_id:row.id,amount:cap,note:'Vốn mở chiến dịch'});toast('Đã tạo '+row.name+', gửi xin vốn '+tr(cap))}catch(e2){toast('Đã tạo '+row.name+'. Chưa gửi được yêu cầu vốn: '+errText(e2))}}
          else toast(id?'Đã lưu chiến dịch':'Đã tạo '+row.name);
          closeSheet();render()}catch(err){fieldErr(el,errText(err))}});
      });
    }});
}

/* --- Nguồn đơn --- */
function srcSheet(){
  const row=s=>`<div class="srcr" data-key="${esc(s.key||'')}"><input class="in" name="label" value="${esc(s.label||'')}" placeholder="Tên nguồn" aria-label="Tên nguồn"><label class="sw"><input type="checkbox" name="active"${s.active!==false?' checked':''}>Hiện</label></div>`;
  openSheet({key:'sources',title:'Nguồn đơn',sub:'Đổi tên, ẩn hoặc thêm nguồn. Nguồn đã dùng không xoá, chỉ ẩn.',
    body:`<div class="lst" data-src>${D.sources.map(row).join('')}</div><button type="button" class="b b--o b--sm" data-add style="align-self:flex-start">${P(I.plus,16)}Thêm nguồn</button>`,
    foot:`<p class="err" role="alert"></p><button type="button" class="b b--do b--w" data-save>Lưu nguồn đơn</button>`,
    bind(el){el.addEventListener('click',ev=>{
      if(ev.target.closest('[data-add]')){el.querySelector('[data-src]').insertAdjacentHTML('beforeend',row({}));el.querySelector('[data-src] .srcr:last-child input').focus()}
    })}});
}

/* ---------------- sự kiện chung ---------------- */
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-tab],[data-act],[data-open],[data-next],[data-go],[data-camp],[data-close],[data-exp],[data-f]');if(!t)return;
  if(t.hasAttribute('data-close')){closeSheet();return}
  if(t.dataset.tab){setTab(t.dataset.tab);return}
  if(t.dataset.camp&&t.closest('#pick,#view')){S.camp=+t.dataset.camp;if(t.closest('#view'))setTab('tong-quan');else render();return}
  if(t.dataset.go){S.f=t.dataset.go;S.tab='don';setTab('don');return}
  if(t.dataset.f){S.f=t.dataset.f;rOrderList();return}
  if(t.dataset.open){orderSheet(+t.dataset.open);return}
  if(t.dataset.next){nextStep(+t.dataset.next,t);return}
  if(t.dataset.exp){expSheet(+t.dataset.exp);return}
  const a=t.dataset.act;
  if(a==='new-order')newOrderSheet();
  else if(a==='no-order')toast(camp()?'Chiến dịch đã quyết toán, không ghi thêm đơn.':'Tạo chiến dịch trước khi ghi đơn.');
  else if(a==='new-exp')expSheet(null);
  else if(a==='new-camp')campSheet(null);
  else if(a==='edit-camp'&&camp())campSheet(camp().id);
  else if(a==='sources')openSources();
  else if(a==='csv')csv();
  else if(a==='adopt')adopt(t);
  else if(a==='capreq'&&camp())capSheet(camp());
});
// 2B: huỷ yêu cầu vốn đang chờ
document.addEventListener('click',async e=>{const b=e.target.closest('[data-capcancel]');if(!b)return;
  if(!window.confirm('Huỷ yêu cầu cấp vốn này?'))return;
  await busy(b,async()=>{try{await save('capreq-cancel',+b.dataset.capcancel,{});toast('Đã huỷ yêu cầu')}catch(err){toast(errText(err))}})});
document.addEventListener('input',e=>{if(e.target.id==='oq'){S.q=e.target.value;rOrderList()}});
document.addEventListener('change',e=>{if(e.target.id==='osrc'){S.src=e.target.value;rOrderList()}});
async function adopt(btn){
  const c=camp(),list=D.orders.filter(o=>o.campaign_id==null);if(!c||!list.length)return;
  await busy(btn,async()=>{let n=0;for(const o of list){try{await save('order',o.id,{campaign_id:c.id});n++}catch(err){toast(errText(err));break}}toast('Đã gắn '+n+' đơn vào '+c.name)});
}
function openSources(){
  srcSheet();
  const el=$('sheet-root').querySelector('.sh'),fresh=el.querySelector('[data-save]');
  fresh.addEventListener('click',async()=>{
    const list=[];let i=0,bad=false;
    el.querySelectorAll('[data-src] .srcr').forEach(r=>{i++;const lb=r.querySelector('[name=label]').value.trim();if(!lb){if(r.dataset.key)bad=true;return}
      let key=r.dataset.key||slug(lb);if(!key||key.length<2)key='nguon-'+i;if(!r.dataset.key)while(D.sources.some(x=>x.key===key)||list.some(x=>x.key===key))key+='-2';
      list.push({key,label:lb,sort:i*10,active:r.querySelector('[name=active]').checked})});
    if(bad)return fieldErr(el,'Nguồn đang có cần tên; muốn bỏ thì bỏ dấu Hiện.');
    fieldErr(el,'');
    await busy(fresh,async()=>{try{const j=await api('POST',{action:'sources',list});D.sources=j.sources;render();toast('Đã lưu nguồn đơn');closeSheet()}catch(err){fieldErr(el,errText(err))}});
  });
}

/* ---------------- bản minh hoạ ---------------- */
async function demoApi(method,body){
  if(!DB){await new Promise((ok,no)=>{const s=document.createElement('script');s.src='/quan-ly/demo.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});DB=window.LANH_DEMO.create(today())}
  await new Promise(r=>setTimeout(r,DB.first?0:180));DB.first=false;
  return window.LANH_DEMO.handle(DB,method,body);
}

const h=location.hash.replace('#','');if(TABS.some(([k])=>k===h))S.tab=h;
let pendAct=h==='ghi-don'?'new-order':h==='ghi-chi'?'new-exp':null;if(pendAct)history.replaceState(null,'',(DEMO?'?demo=1':location.pathname));
if(DEMO)$('demo').hidden=false;
start();
})();
