/* Số liệu minh hoạ cho /quan-ly?demo=1. Không phải đơn thật, không gọi máy chủ.
   Bắt chước quy tắc của các hàm Supabase bo2_* để xem thử thao tác. */
window.LANH_DEMO=(()=>{'use strict';
const SRC=[['web','Web',10,true],['google','Google',20,true],['google-ads','Google Ads',30,true],['facebook','Facebook',40,false],['zalo','Zalo',50,false],
  ['instagram','Instagram',60,false],['tiktok','TikTok',70,false],['doanh-nghiep','Doanh nghiệp',80,false],['nguoi-quen','Người quen',90,false],
  ['ban-be','Bạn bè giới thiệu',100,false],['khach-cu','Khách cũ',110,false],['khac','Khác',120,false]].map(([key,label,sort,auto])=>({key,label,sort,active:true,auto}));
const DONE=s=>s==='da-nhan-tien'||s==='hoan-hang';
const WEB={'sum-vay':['Set Sum Vầy',399000],'doan-vien':['Set Đoàn Viên',599000]};
const clone=x=>JSON.parse(JSON.stringify(x));
const err=m=>{throw new Error(m)};

function create(T){
  let seed=20270206;const r=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
  const pick=a=>a[Math.floor(r()*a.length)];
  const at=(daysAgo,h)=>new Date(Date.parse(T+'T00:00:00+07:00')-daysAgo*864e5+h*36e5).toISOString();
  const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00+07:00')+n*864e5).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  const sets=[{code:'sum-vay',name:'Set Sum Vầy',price:399000,qty:80,web:true},{code:'doan-vien',name:'Set Đoàn Viên',price:599000,qty:60,web:true},{code:'dn-logo',name:'Set doanh nghiệp in logo',price:520000,qty:40,web:false}];
  const campaigns=[
    {id:1,code:'trung-thu-minh-hoa',name:'Trung thu (minh hoạ)',status:'settled',start_date:addDays(T,-100),end_date:addDays(T,-64),target_revenue:30000000,budget:{nhap:12000000,baobi:2500000,quangcao:2000000},
     sets:[{code:'hop-trung-thu',name:'Hộp quà Trung thu',price:450000,qty:60,web:false}],note:null,settled_at:at(56,10)},
    {id:2,code:'tet-minh-hoa',name:'Tết 2027 (minh hoạ)',status:'running',start_date:addDays(T,-7),end_date:addDays(T,75),target_revenue:60000000,
     budget:{nhap:22000000,baobi:4000000,quangcao:5000000,vanchuyen:800000,khac:1000000},sets,note:null,settled_at:null}];
  const names=['Chị Hoa','Anh Minh','Chị Thảo','Anh Tuấn','Cô Lan','Chú Hùng','Chị Ngọc','Anh Khoa','Chị Mai','Anh Đức','Chị Vy','Anh Phúc','Chị Trang','Anh Long','Chị Hạnh','Anh Bảo'];
  const aH=['Quận 1, TP.HCM','Quận 3, TP.HCM','Quận 7, TP.HCM','Bình Thạnh, TP.HCM','Phú Nhuận, TP.HCM','TP Thủ Đức, TP.HCM','Gò Vấp, TP.HCM','Tân Bình, TP.HCM'];
  const aT=['TP Biên Hoà, Đồng Nai','TP Thủ Dầu Một, Bình Dương','TP Vũng Tàu','TP Cần Thơ','TP Đà Lạt, Lâm Đồng','Hà Nội'];
  const chW=['web','web','web','google','google','google','google','google-ads','google-ads','google-ads','facebook','facebook','facebook','facebook','facebook','zalo','zalo','zalo','nguoi-quen','nguoi-quen','ban-be','ban-be','khach-cu','instagram'];
  const orders=[];let id=0;
  const mk=(o)=>{const it=o.items,qty=it.reduce((t,i)=>t+i.qty,0),total=it.reduce((t,i)=>t+i.qty*i.price,0);
    const row=Object.assign({id:++id,code:(o.origin==='tay'?'T':'L')+'MH-'+String(1000+id),phone:'09'+String(Math.floor(r()*1e8)).padStart(8,'0'),address:null,zone:null,ship_fee:null,note:null,source:null,ref:null,
      pay_method:'cod',carrier:null,got_amount:null,ship_cost:null,recon_note:null,received_at:null,updated_at:o.created_at},o,
      {qty,total,set_code:it.length>1?'nhieu-set':it[0].code,set_name:it.length>1?it.map(i=>i.name+' × '+i.qty).join(' + '):it[0].name,unit_price:it.length>1?Math.round(total/qty):it[0].price});
    row.cod_total=row.ship_fee==null?null:row.total+row.ship_fee;orders.push(row);return row};
  const N=44;
  for(let i=0;i<N;i++){
    const daysAgo=Math.floor(i*7/N),ch=i===9||i===27?'doanh-nghiep':pick(chW),web=['web','google','google-ads','instagram'].includes(ch)||(ch==='facebook'&&r()<.5);
    let status=i<4?'moi':i<7?'da-xac-nhan':i<11?'dang-giao':i<16?'da-giao':'da-nhan-tien';
    if(i===13||i===30)status='huy';if(i===22)status='hoan-hang';
    let items,zone=r()<.75?'hcm':'tinh',fee;
    if(ch==='doanh-nghiep'){items=[{code:'dn-logo',name:'Set doanh nghiệp in logo',qty:i===9?24:20,price:520000}];zone='hcm';fee=0}
    else{const c=r()<.55?'sum-vay':'doan-vien',q=r()<.7?1:r()<.75?2:3;items=[{code:c,name:WEB[c][0],qty:q,price:WEB[c][1]}];
      if(!web&&r()<.25){const o2=c==='sum-vay'?'doan-vien':'sum-vay';items.push({code:o2,name:WEB[o2][0],qty:1,price:WEB[o2][1]})}
      if(!web&&ch==='nguoi-quen'&&r()<.5)items.forEach(x=>x.price-=20000);
      const n=items.reduce((t,x)=>t+x.qty,0);fee=Math.ceil(n/2)*(zone==='hcm'?30000:50000)}
    if(!web&&ch==='nguoi-quen'&&r()<.3){zone=null;fee=0}
    const o={created_at:at(daysAgo,8+Math.floor(r()*13)+r()),name:ch==='doanh-nghiep'?(i===9?'Công ty Minh hoạ A':'Công ty Minh hoạ B'):pick(names),origin:web?'web':'tay',channel:ch,items,zone,
      address:zone?'Số '+(10+Math.floor(r()*190))+' đường Minh hoạ, '+(zone==='hcm'?pick(aH):pick(aT)):null,ship_fee:fee,status,
      pay_method:web?'cod':ch==='doanh-nghiep'?'ck':pick(['cod','ck','tien-mat']),source:web?pick(['header','bo-suu-tap','kham-pha','cta']):null,
      ref:ch==='google-ads'?'google / cpc / tet':ch==='google'?'google.com':ch==='facebook'&&web?'facebook':null};
    if(status!=='moi')o.carrier=zone==='tinh'?pick(['GHTK','Viettel Post']):zone?pick(['Ahamove','Grab','Lalamove','Tự giao']):null;
    if(DONE(status)){
      const plan=o.items.reduce((t,x)=>t+x.qty*x.price,0)+(fee||0);
      if(status==='hoan-hang'){o.got_amount=0;o.ship_cost=(fee||0)+20000;o.recon_note='Khách không nghe máy, hàng quay về'}
      else{const dc=pick([0,0,0,0,0,5000,8000,12000,-5000]);o.got_amount=plan;o.ship_cost=Math.max(0,(fee||0)+(zone?dc:0));
        if(r()<.08){o.got_amount=plan-20000;o.recon_note='Khách xin bớt 20k'}
        if(zone==='hcm'&&r()<.1){o.got_amount=plan-(fee||0);o.ship_cost=0;o.recon_note='Khách trả ship trực tiếp cho tài xế'}}
      o.received_at=new Date(Date.parse(o.created_at)+864e5).toISOString()}
    o.campaign_id=2;mk(o);
  }
  for(let i=0;i<12;i++){const q=r()<.7?1:2;mk({campaign_id:1,created_at:at(90-i*2,10),name:pick(names),origin:'tay',channel:pick(['facebook','zalo','nguoi-quen','ban-be']),
    items:[{code:'hop-trung-thu',name:'Hộp quà Trung thu',qty:q,price:450000}],zone:'hcm',address:'Số '+(10+i)+' đường Minh hoạ, '+pick(aH),ship_fee:30000,status:'da-nhan-tien',
    carrier:'Ahamove',got_amount:q*450000+30000,ship_cost:30000+(i%4===0?6000:0),received_at:at(89-i*2,10)})}
  orders.sort((a,b)=>b.created_at.localeCompare(a.created_at));
  let eid=0;const ex=(cid,daysAgo,cat,name,amount,units,vendor,paid)=>({id:++eid,campaign_id:cid,spent_on:addDays(T,-daysAgo),cat,name,amount,units:units||null,vendor:vendor||null,paid:paid!==false,note:null});
  const expenses=[
    ex(2,8,'nhap','Mứt nho vàng, kiwi, táo tàu đen (minh hoạ)',9800000,140,'Nhà cung cấp A'),ex(2,8,'nhap','Xí muội mix, trà xanh (minh hoạ)',2600000,60,'Nhà cung cấp B'),
    ex(2,7,'nhap','Giỏ tre đan thủ công (minh hoạ)',4200000,140,'Làng nghề C'),ex(2,7,'baobi','Hũ thuỷ tinh và nắp (minh hoạ)',1900000,400),
    ex(2,6,'baobi','Bao lì xì (minh hoạ)',900000,60,'Xưởng in D',false),ex(2,6,'baobi','Thẻ treo, đai giấy (minh hoạ)',650000,null,'Xưởng in D'),
    ex(2,5,'quangcao','Quảng cáo Facebook tuần 1 (minh hoạ)',1500000),ex(2,3,'quangcao','Google Ads tuần 1 (minh hoạ)',800000),
    ex(2,6,'vanchuyen','Ship nhập hàng (minh hoạ)',220000),ex(2,2,'khac','Băng keo, giấy gói (minh hoạ)',180000),
    ex(1,98,'nhap','Bánh và trà (minh hoạ)',3200000,20),ex(1,97,'baobi','Hộp giấy (minh hoạ)',600000,20),ex(1,95,'quangcao','Quảng cáo (minh hoạ)',500000)
  ].sort((a,b)=>b.spent_on.localeCompare(a.spent_on)||b.id-a.id);
  // 2B: hai chiến dịch đã nối Sơn Nga (minh hoạ). Vốn đặt sao cho còn khoảng 1,9 tr trong TK KINH DOANH LÀNH.
  orders.forEach(o=>{o.money_to='hkd';o.ship_paid_by=null});
  const rieng=orders.find(o=>o.campaign_id===2&&o.status==='da-nhan-tien'&&o.pay_method==='ck');if(rieng)rieng.money_to='rieng';
  const db0={campaigns,orders,expenses};
  campaigns[0].sn_id='CD-0001';campaigns[0].sn_status='settled';campaigns[0].sn_capital=Math.ceil(kdOut(db0,campaigns[0])/1e6)*1e6;campaigns[0].sn_synced_at=at(56,10);
  campaigns[1].sn_id='CD-0002';campaigns[1].sn_status='running';campaigns[1].sn_capital=Math.ceil((kdOut(db0,campaigns[1])+1900000)/1e6)*1e6;campaigns[1].sn_synced_at=new Date(Date.now()-18*6e4).toISOString();
  const unpaid=expenses.find(e=>e.campaign_id===2&&!e.paid);
  const capital_requests=[
    {id:2,campaign_id:2,kind:'them',amount:5000000,note:'In hộp logo cho đơn doanh nghiệp (minh hoạ)',expense_ids:unpaid?[unpaid.id]:[],status:'cho-duyet',decided_amount:null,reply:null,created_at:new Date(Date.now()-35*6e4).toISOString(),decided_at:null},
    {id:1,campaign_id:2,kind:'them',amount:8000000,note:'Nhập thêm mứt và giỏ (minh hoạ)',expense_ids:[],status:'da-duyet',decided_amount:5000000,reply:'Nhập trước 20 set, đợt sau xin tiếp (minh hoạ)',created_at:at(2,10),decided_at:at(2,15)}];
  // Đã sang Sơn Nga: mọi đơn đã nhận tiền / hoàn và chi đã trả, trừ 2 đơn mới nhất (chờ lần đồng bộ sau)
  const doneT=orders.filter(o=>o.campaign_id===2&&DONE(o.status)).sort((a,b)=>b.received_at.localeCompare(a.received_at));
  const sync_items=[...doneT.slice(2).map(o=>({ref:'O:'+o.code,campaign_id:2,state:'ok',message:null,at:new Date().toISOString()})),
    ...expenses.filter(e=>e.campaign_id===2&&e.paid).map(e=>({ref:'E:'+e.id,campaign_id:2,state:'ok',message:null,at:new Date().toISOString()}))];
  const sync_runs=[{id:1,at:new Date(Date.now()-18*6e4).toISOString(),source:'tab',added:3,updated:1,deleted:0,failed:0,pending:0,message:null}];
  return {campaigns,sources:clone(SRC),orders,expenses,capital_requests,sync_items,sync_runs,seq:{o:id,e:eid,c:2,r:2},first:true};
}
const shipBy=o=>{const k=o.ship_cost||0;if(k<=0)return 'none';if(o.status==='hoan-hang')return 'tk-kd';const b=o.ship_paid_by||(o.pay_method==='cod'?'tru-cod':'tk-kd');return b==='tru-cod'&&(o.got_amount||0)>=k?'tru-cod':'tk-kd'};
const kdOut=(db,c,skip)=>db.expenses.filter(e=>e.campaign_id===c.id&&e.paid&&e.id!==skip).reduce((t,e)=>t+e.amount,0)
  +db.orders.filter(o=>o.campaign_id===c.id&&DONE(o.status)&&shipBy(o)==='tk-kd').reduce((t,o)=>t+(o.ship_cost||0),0);

function camp(db,id){return db.campaigns.find(c=>c.id===+id)}
function running(db){const r=db.campaigns.filter(c=>c.status==='running').sort((a,b)=>(b.start_date||'').localeCompare(a.start_date||'')||b.id-a.id);return r[0]?r[0].id:null}
function editable(db,id){const c=camp(db,id);if(c&&c.status==='settled')err('locked')}
const num=(v,max)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);if(!isFinite(n)||n<0||n>max||Math.floor(n)!==n)err('invalid_money');return n};

function saveOrder(db,id,d){
  const isNew=id==null;let o;
  if(isNew){if(!d.items)err('invalid_items');o={id:++db.seq.o,code:'TMH-'+String(2000+db.seq.o),created_at:d.date?new Date(Date.parse(d.date+'T12:00:00+07:00')).toISOString():new Date().toISOString(),
    name:'Khách lẻ',phone:null,address:null,status:'da-xac-nhan',origin:'tay',channel:'khac',pay_method:'cod',campaign_id:running(db),zone:null,ship_fee:null,items:[],note:null,
    carrier:null,got_amount:null,ship_cost:null,recon_note:null,received_at:null,source:null,ref:null}}
  else{const x=db.orders.find(y=>y.id===id);if(!x)err('not_found');editable(db,x.campaign_id);o=clone(x)}
  const was=o.status,wasItems=JSON.stringify(o.items),wasFee=o.ship_fee,wasAt=o.received_at;
  if('campaign_id' in d){if(!camp(db,d.campaign_id))err('invalid_campaign');o.campaign_id=+d.campaign_id}
  if(o.campaign_id==null)err('invalid_campaign');editable(db,o.campaign_id);
  if('items' in d){const c=camp(db,o.campaign_id);if(!Array.isArray(d.items)||!d.items.length)err('invalid_items');
    o.items=d.items.map(i=>{const s=(c.sets||[]).find(x=>x.code===i.code)||{};const q=+i.qty,p=i.price==null?s.price:+i.price,n=i.name||s.name;if(!n||!(q>=1)||!(p>=0))err('invalid_items');return {code:i.code,name:n,qty:q,price:p}});
    o.qty=o.items.reduce((t,i)=>t+i.qty,0);o.total=o.items.reduce((t,i)=>t+i.qty*i.price,0);
    o.set_code=o.items.length>1?'nhieu-set':o.items[0].code;o.set_name=o.items.length>1?o.items.map(i=>i.name+' × '+i.qty).join(' + '):o.items[0].name;o.unit_price=Math.round(o.total/o.qty)}
  if('name' in d){o.name=String(d.name||'').trim().replace(/\s+/g,' ');if(o.name.length<2)err('invalid_name')}
  if('phone' in d){let p=String(d.phone||'').replace(/\D/g,'');if(/^84\d{9}$/.test(p))p='0'+p.slice(2);o.phone=p||null;if(o.phone&&!/^0\d{9,10}$/.test(o.phone))err('invalid_phone')}
  if('address' in d)o.address=String(d.address||'').trim()||null;
  if('zone' in d){o.zone=d.zone||null;if(o.zone&&!['hcm','tinh'].includes(o.zone))err('invalid_zone')}
  ['note','carrier','recon_note'].forEach(k=>{if(k in d)o[k]=String(d[k]||'').trim()||null});
  if('channel' in d){if(!db.sources.some(s=>s.key===d.channel))err('invalid_channel');o.channel=d.channel}
  if('pay_method' in d){if(!['cod','ck','tien-mat'].includes(d.pay_method))err('invalid_pay');o.pay_method=d.pay_method}
  if('ship_fee' in d)o.ship_fee=num(d.ship_fee,2e6);
  if('got_amount' in d)o.got_amount=num(d.got_amount,2e9);
  if('ship_cost' in d)o.ship_cost=num(d.ship_cost,2e6);
  if('status' in d)o.status=d.status;
  if('money_to' in d){if(!['hkd','rieng'].includes(d.money_to))err('invalid_money_to');o.money_to=d.money_to}
  if('ship_paid_by' in d){o.ship_paid_by=d.ship_paid_by||null;if(o.ship_paid_by&&!['tru-cod','tk-kd'].includes(o.ship_paid_by))err('invalid_ship_by')}
  if(o.money_to==null)o.money_to='hkd';
  if(o.status==='da-nhan-tien'){o.got_amount=o.got_amount??o.total+(o.ship_fee||0);o.ship_cost=o.ship_cost??(o.ship_fee||0);o.received_at=wasAt||new Date().toISOString()}
  else if(o.status==='hoan-hang'){o.got_amount=o.got_amount??0;o.ship_cost=o.ship_cost??(o.ship_fee||0);o.received_at=wasAt||new Date().toISOString()}
  else o.received_at=null;
  if(!isNew&&DONE(was)&&DONE(o.status)&&(JSON.stringify(o.items)!==wasItems||o.ship_fee!==wasFee))err('plan_locked');
  o.cod_total=o.ship_fee==null?null:o.total+o.ship_fee;o.updated_at=new Date().toISOString();
  const i=db.orders.findIndex(y=>y.id===o.id);if(i>=0)db.orders[i]=o;else db.orders.unshift(o);
  return clone(o);
}
function saveExpense(db,id,d){
  let e,e0=null;if(id==null)e={id:++db.seq.e,campaign_id:running(db),spent_on:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),cat:'khac',name:null,amount:null,units:null,vendor:null,paid:true,note:null};
  else{const x=db.expenses.find(y=>y.id===id);if(!x)err('not_found');editable(db,x.campaign_id);e=clone(x);e0=x}
  if('campaign_id' in d){if(!camp(db,d.campaign_id))err('invalid_campaign');e.campaign_id=+d.campaign_id}
  if(e.campaign_id==null)err('invalid_campaign');editable(db,e.campaign_id);
  ['spent_on','cat'].forEach(k=>{if(k in d)e[k]=d[k]});
  if('name' in d)e.name=String(d.name||'').trim();if(!e.name||e.name.length<2)err('invalid_name');
  if('amount' in d)e.amount=num(d.amount,2e9);if(!e.amount)err('invalid_amount');
  if('units' in d)e.units=d.units?+d.units:null;
  ['vendor','note'].forEach(k=>{if(k in d)e[k]=String(d[k]||'').trim()||null});
  if('paid' in d)e.paid=!!d.paid;
  const c=camp(db,e.campaign_id);
  if(e.paid&&c&&c.sn_id&&c.sn_capital!=null&&(!e0||!e0.paid||e.amount>e0.amount||e.campaign_id!==e0.campaign_id)){
    const left=c.sn_capital-kdOut(db,c,e0?e0.id:null);if(e.amount>left+1000){const x=new Error('no_capital');x.data={error:'no_capital',left:Math.max(0,left)};throw x}}
  const i=db.expenses.findIndex(y=>y.id===e.id);if(i>=0)db.expenses[i]=e;else db.expenses.unshift(e);
  return clone(e);
}
function saveCampaign(db,id,d){
  let c;if(id==null)c={id:++db.seq.c,code:d.code||'cd-'+Date.now(),name:'',status:'draft',start_date:null,end_date:null,target_revenue:null,budget:{},sets:[],note:null,settled_at:null};
  else{const x=camp(db,id);if(!x)err('not_found');c=clone(x);if(x.status==='settled'&&(d.status||'settled')==='settled'&&Object.keys(d).some(k=>!['status','note'].includes(k)))err('locked')}
  if('code' in d){if(db.campaigns.some(x=>x.code===d.code&&x.id!==c.id))err('code_taken');c.code=d.code}
  if(id!=null&&c.sn_id&&(('status' in d&&(d.status==='settled')!==(c.status==='settled'))||('code' in d&&d.code!==c.code)))err('sn_controls');
  if(id!=null&&!c.sn_id&&d.status==='running'&&c.status!=='running'&&db.capital_requests.some(r=>r.campaign_id===c.id&&r.kind==='tao'&&r.status==='cho-duyet'))err('wait_capital');
  ['name','status','note'].forEach(k=>{if(k in d)c[k]=d[k]});if(!c.name||c.name.length<2)err('invalid_name');
  ['start_date','end_date'].forEach(k=>{if(k in d)c[k]=d[k]||null});if(c.start_date&&c.end_date&&c.end_date<c.start_date)err('invalid_date');
  if('target_revenue' in d)c.target_revenue=num(d.target_revenue,2e9);
  if('budget' in d){c.budget={};Object.entries(d.budget||{}).forEach(([k,v])=>{const n=num(v,2e9);if(n)c.budget[k]=n})}
  if('sets' in d)c.sets=d.sets.map(s=>WEB[s.code]?{code:s.code,name:WEB[s.code][0],price:WEB[s.code][1],qty:s.qty??null,web:true}:{code:s.code,name:s.name,price:+s.price||0,qty:s.qty??null,web:false});
  c.settled_at=c.status==='settled'?(c.settled_at||new Date().toISOString()):null;
  const i=db.campaigns.findIndex(y=>y.id===c.id);if(i>=0)db.campaigns[i]=c;else db.campaigns.push(c);
  return clone(c);
}
function handle(db,method,body){
  if(method==='GET')return clone({campaigns:db.campaigns,sources:db.sources,orders:db.orders,expenses:db.expenses,capital_requests:db.capital_requests,sync_items:db.sync_items,sync_runs:db.sync_runs,at:new Date().toISOString()});
  const b=body||{},id=b.id==null?null:+b.id;
  if(b.action==='order')return {row:saveOrder(db,id,b.data||{})};
  if(b.action==='expense')return {row:saveExpense(db,id,b.data||{})};
  if(b.action==='campaign')return {row:saveCampaign(db,id,b.data||{})};
  if(b.action==='expense-delete'){const e=db.expenses.find(x=>x.id===id);if(!e)err('not_found');editable(db,e.campaign_id);db.expenses=db.expenses.filter(x=>x.id!==id);return {id}}
  if(b.action==='capreq'){const d=b.data||{},c=camp(db,d.campaign_id);if(!c)err('invalid_campaign');if(c.status==='settled')err('locked');
    const n=num(d.amount,2e9);if(!n||n<1000)err('invalid_amount');
    let r=db.capital_requests.find(x=>x.campaign_id===c.id&&x.status==='cho-duyet');
    const ids=(d.expense_ids||[]).map(Number).filter(x=>db.expenses.some(e=>e.id===x&&e.campaign_id===c.id));
    if(r)Object.assign(r,{amount:n,note:String(d.note||'').trim()||null,expense_ids:ids,kind:c.sn_id?'them':'tao',created_at:new Date().toISOString()});
    else{r={id:++db.seq.r,campaign_id:c.id,kind:c.sn_id?'them':'tao',amount:n,note:String(d.note||'').trim()||null,expense_ids:ids,status:'cho-duyet',decided_amount:null,reply:null,created_at:new Date().toISOString(),decided_at:null};db.capital_requests.unshift(r)}
    return {row:clone(r)}}
  if(b.action==='capreq-cancel'){const r=db.capital_requests.find(x=>x.id===id&&x.status==='cho-duyet');if(!r)err('not_found');r.status='huy';r.decided_at=new Date().toISOString();return {id}}
  if(b.action==='sources'){(b.list||[]).forEach(s=>{const x=db.sources.find(y=>y.key===s.key);if(x)Object.assign(x,{label:s.label,sort:s.sort,active:s.active});else db.sources.push({key:s.key,label:s.label,sort:s.sort,active:s.active,auto:false})});
    db.sources.sort((a,b)=>a.sort-b.sort);return {sources:clone(db.sources)}}
  err('bad_input');
}
return {create,handle};
})();
