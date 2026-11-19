import './styles.css';
const QLBL={'VAT posted twice (absorbed by Tegenrekening dagboeken)':'VAT posted twice, reversed by a correction booking','Unallocated customer payments (no invoice ref)':'Customer payments without an invoice reference','Portal customer codes without Microfas match':'Former-portal customers without a Microfas match','Portal product codes without Microfas match':'Former-portal products without a Microfas match','Text-only delivery lines removed':'Text-only delivery lines (left out)'};
{
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NF0=new Intl.NumberFormat('de-DE',{maximumFractionDigits:0});
const NF1=new Intl.NumberFormat('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
const NF2=new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
const sg=c=>c<0?'−':'';
const eur=c=>sg(c)+'€ '+NF0.format(Math.abs(Math.round(c/100)));
const eur2=c=>sg(c)+'€ '+NF2.format(Math.abs(c)/100);
const eurS=c=>{const a=Math.abs(c/100);return sg(c)+(a>=1e6?'€ '+NF2.format(a/1e6)+' M':a>=1e4?'€ '+NF0.format(a/1e3)+' K':'€ '+NF0.format(a))};
const ton=kg=>NF1.format(kg/1000)+' t';
const pct=x=>x==null||!isFinite(x)?'—':(x>0?'+':x<0?'−':'')+NF1.format(Math.abs(x))+' %';
const share=x=>!isFinite(x)?'—':NF1.format(x)+' %';
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mLab=m=>MN[+m.slice(5)-1]+' '+m.slice(2,4);
const mLong=m=>MN[+m.slice(5)-1]+' '+m.slice(0,4);
const dLab=d=>{const x=new Date(d+'T00:00:00Z');return x.getUTCDate()+' '+MN[x.getUTCMonth()]+' '+x.getUTCFullYear()};
const days=(a,b)=>Math.round((new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z'))/864e5);
const GROUPS=['Milk powder','Feed','Calf housing','Calf supplies','Perfect Udder','Other'];
const GCOL=['var(--s1)','var(--s2)','var(--s3)','var(--s4)','var(--s5)','var(--s6)'];
const AGE=['Current','1–30','31–60','61–90','91+'];
const ACOL=['var(--a0)','var(--a1)','var(--a2)','var(--a3)','var(--a4)'];
const PAGES=[['overview','Overview'],['sales','Sales trend'],['verkopers','Verkopers'],['repcard','Verkoper card'],['volumes','Volumes per verkoper'],['customers','Customers'],['products','Products & price'],['markets','Markets'],['reorder','Reorder radar'],['orders','Open orders'],['results','Results (books)'],['receivables','Receivables'],['data','Data & definitions'],['insights','Insights'],['summary','Executive Summary']];
let X, st, ready=false;

fetch('dash.json').then(r=>r.json()).then(init).catch(e=>{$('#page').innerHTML='<div class="empty">The data file could not be loaded.</div>';void e});

function init(raw){
  X=raw; const F=X.facts, n=F.r.length;
  X.n=n; X.gOfCat=X.categories.map(c=>GROUPS.indexOf(c[1]));
  X.mkts=[...new Set(X.customers.map(c=>c[1]))].sort();
  X.cMkt=X.customers.map(c=>X.mkts.indexOf(c[1]));
  F.G=F.g.map(g=>X.gOfCat[g]); F.M=F.c.map(c=>X.cMkt[c]);
  X.portal=new Set(X.meta.portalMonths); X.nM=X.months.length;
  X.isPortalM=X.months.map(m=>X.portal.has(m));
  const lt=X.meta.ledgerThrough, lastM=lt.slice(0,7);
  const dim=new Date(Date.UTC(+lastM.slice(0,4),+lastM.slice(5),0)).getUTCDate();
  X.partial={m:X.months.indexOf(lastM),day:+lt.slice(8),dim};
  if(X.partial.day>=dim) X.partial.m=-1;
  X.lastFull=X.partial.m>=0?X.partial.m-1:X.nM-1;
  X.kgProd=new Set(); const pk=new Map();
  for(let i=0;i<n;i++) if(F.k[i]) pk.set(F.p[i],(pk.get(F.p[i])||0)+F.k[i]);
  for(const [p,k] of pk) if(k>0) X.kgProd.add(p);
  F.T=F.d.map((d,i)=>d?Date.UTC(+X.months[F.m[i]].slice(0,4),+X.months[F.m[i]].slice(5)-1,d)/864e5:null);
  X.ltT=Date.UTC(+lt.slice(0,4),+lt.slice(5,7)-1,+lt.slice(8,10))/864e5;
  X.first=new Map();for(let i=0;i<n;i++){if(F.r[i]<=0)continue;const k=F.m[i]*100+F.d[i],c=F.c[i],o=X.first.get(c);if(o==null||k<o)X.first.set(c,k)}
  X.reps=[...new Set([...X.verkopers,...X.customers.map(c=>c[2])])].sort((a,b)=>a.localeCompare(b));
  buildBar(); st=defaults(); readHash(); syncBar(); ready=true; render();
  window.addEventListener('hashchange',()=>{readHash();render()});
}
function defaults(){const y=X.months[X.lastFull].slice(0,4);const f=X.months.indexOf(y+'-01');return{from:f<0?0:f,to:X.lastFull,cmp:'py',rep:'',grp:'',mkt:'',page:'overview',preset:'ytd',ins:{mode:'week'},vol:{preset:'proelite',custom:new Set(),gran:'month',cf:'all'}}}
function readHash(){const h=location.hash.slice(1);if(PAGES.some(p=>p[0]===h))st.page=h}
function buildBar(){
  $('#nav').innerHTML=PAGES.map((p,i)=>(p[0]==='results'||p[0]==='data'||p[0]==='insights'?'<div class="sep"></div>':'')+`<a href="#${p[0]}" data-p="${p[0]}">${esc(p[1])}</a>`).join('');
  const mo=X.months.map((m,i)=>`<option value="${i}">${mLong(m)}${i===X.partial.m?' (to '+X.partial.day+')':''}</option>`).join('');
  $('#fFrom').innerHTML=mo;$('#fTo').innerHTML=mo;
  const L=X.lastFull,ly=X.months[L].slice(0,4),pm=X.partial.m;
  const pr=[['ytd',`Year to date ${ly} (Jan–${MN[+X.months[L].slice(5)-1]})`],['lm',`Last complete month (${mLong(X.months[L])})`],['l3','Last 3 complete months'],['l12','Last 12 complete months']];
  if(pm>=0) pr.push(['mtd',`${mLong(X.months[pm])} so far (1–${X.partial.day})`]);
  for(const y of [...new Set(X.months.map(m=>m.slice(0,4)))]) if(X.months.filter(m=>m.startsWith(y)).length===12) pr.push(['y'+y,'Full year '+y]);
  pr.push(['custom','Custom months']);
  $('#fPeriod').innerHTML=pr.map(p=>`<option value="${p[0]}">${esc(p[1])}</option>`).join('');
  $('#fRep').innerHTML='<option value="">All verkopers</option>'+X.reps.map(r=>`<option>${esc(r)}</option>`).join('');
  $('#fGrp').innerHTML='<option value="">All product groups</option>'+GROUPS.slice(0,5).map(g=>`<option>${g}</option>`).join('');
  $('#fMkt').innerHTML='<option value="">All markets</option>'+X.mkts.map(m=>`<option>${esc(m)}</option>`).join('');
  $('#fPeriod').onchange=e=>{applyPreset(e.target.value);syncBar();render()};
  $('#fFrom').onchange=e=>{st.from=+e.target.value;if(st.to<st.from)st.to=st.from;st.preset='custom';syncBar();render()};
  $('#fTo').onchange=e=>{st.to=+e.target.value;if(st.from>st.to)st.from=st.to;st.preset='custom';syncBar();render()};
  $('#fCmp').onchange=e=>{st.cmp=e.target.value;render()};
  $('#fRep').onchange=e=>{st.rep=e.target.value;render()};
  $('#fGrp').onchange=e=>{st.grp=e.target.value;render()};
  $('#fMkt').onchange=e=>{st.mkt=e.target.value;render()};
  $('#fReset').onclick=()=>{const p=st.page;st=defaults();st.page=p;syncBar();render()};
  $('#menu').onclick=()=>$('#rail').classList.toggle('open');
  $('#fT').onclick=()=>{const b=$('#bar');b.classList.toggle('show');$('#fT').setAttribute('aria-expanded',b.classList.contains('show'))};
  $('#nav').onclick=()=>$('#rail').classList.remove('open');
  $('#shade').onclick=closeDrawer;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
  $('#asof').innerHTML=`All amounts excl. VAT<br>Ledger through <b>${dLab(X.meta.ledgerThrough)}</b><br>Extract ${dLab(X.meta.snapshot)}`;
}
function applyPreset(p){
  st.preset=p;const L=X.lastFull;
  if(p==='ytd'){st.from=X.months.indexOf(X.months[L].slice(0,4)+'-01');st.to=L}
  else if(p==='lm'){st.from=st.to=L}
  else if(p==='l3'){st.from=Math.max(0,L-2);st.to=L}
  else if(p==='l12'){st.from=Math.max(0,L-11);st.to=L}
  else if(p==='mtd'){st.from=st.to=X.partial.m;if(st.cmp==='py')st.cmp='pp'}
  else if(p[0]==='y'){const y=p.slice(1);st.from=X.months.indexOf(y+'-01');st.to=X.months.indexOf(y+'-12')}
}
function syncBar(){$('#fPeriod').value=st.preset;$('#fFrom').value=st.from;$('#fTo').value=st.to;$('#fCmp').value=st.cmp;$('#fRep').value=st.rep;$('#fGrp').value=st.grp;$('#fMkt').value=st.mkt}

function period(){
  const cur=[];for(let m=st.from;m<=st.to;m++) cur.push({m,cap:m===X.partial.m?X.partial.day:99});
  const P={cur,cmp:null,why:'',label:cur.length===1?mLong(X.months[st.from])+(st.from===X.partial.m?` (1–${X.partial.day})`:''):mLong(X.months[st.from])+' – '+mLong(X.months[st.to])+(st.to===X.partial.m?` (to ${X.partial.day})`:'')};
  if(st.cmp==='none'){P.why='No comparison selected.';return P}
  const shift=st.cmp==='py'?12:cur.length, cmp=[];
  for(const c of cur){const m=c.m-shift;
    if(m<0){P.why=st.cmp==='py'?'No data for the same months a year earlier (data starts '+mLong(X.months[0])+').':'No data before '+mLong(X.months[0])+'.';return P}
    if(c.cap<99&&X.isPortalM[m]){P.why=`${mLong(X.months[c.m])} is only complete to day ${c.cap}; ${mLong(X.months[m])} has monthly totals only, so a like-for-like comparison is not possible. Choose “Previous period”.`;return P}
    cmp.push({m,cap:c.cap})}
  P.cmp=cmp;
  const a=cmp[0].m,b=cmp[cmp.length-1].m,capTxt=cur[cur.length-1].cap<99?` (days 1–${cur[cur.length-1].cap})`:'';
  P.cmpLabel=(a===b?mLong(X.months[a]):mLong(X.months[a])+' – '+mLong(X.months[b]))+capTxt;
  return P;
}
function dimOK(i,o={}){const F=X.facts;
  const rep=o.rep!==undefined?o.rep:st.rep, grp=o.grp!==undefined?o.grp:st.grp, mkt=o.mkt!==undefined?o.mkt:st.mkt;
  if(rep&&X.verkopers[F.v[i]]!==rep) return false;
  if(grp&&GROUPS[F.G[i]]!==grp) return false;
  if(mkt&&X.mkts[F.M[i]]!==mkt) return false;
  return true}
function pick(list,o={}){ if(!list) return null; const F=X.facts,cap=new Map(list.map(x=>[x.m,x.cap])),out=[];
  for(let i=0;i<X.n;i++){const c=cap.get(F.m[i]);if(c===undefined)continue;if(F.d[i]>c)continue;if(!dimOK(i,o))continue;if(o.where&&!o.where(i))continue;out.push(i)}
  return out}
const sum=(ix,col)=>{if(!ix)return null;const a=X.facts[col];let s=0;for(const i of ix)s+=a[i];return s};
function by(ix,keyFn,col){const m=new Map();if(!ix)return m;const a=X.facts[col];for(const i of ix){const k=keyFn(i);m.set(k,(m.get(k)||0)+a[i])}return m}
const DIMS={month:{n:'Month',f:i=>X.facts.m[i],l:k=>mLong(X.months[k])},group:{n:'Product group',f:i=>X.facts.G[i],l:k=>GROUPS[k]},
 category:{n:'Category',f:i=>X.facts.g[i],l:k=>X.categories[k][0]},verkoper:{n:'Verkoper',f:i=>X.facts.v[i],l:k=>X.verkopers[k]},
 customer:{n:'Customer',f:i=>X.facts.c[i],l:k=>X.customers[k][0]},product:{n:'Product',f:i=>X.facts.p[i],l:k=>X.products[k][0]},
 market:{n:'Market',f:i=>X.facts.M[i],l:k=>X.mkts[k]}};
const filtTxt=()=>[st.rep&&'Verkoper: '+st.rep,st.grp&&'Group: '+st.grp,st.mkt&&'Market: '+st.mkt].filter(Boolean).join(' · ')||'All verkopers, groups and markets';

function monPair(m){const P=period(),k=P.cur.findIndex(c=>c.m===m);return[m,P.cmp&&k>=0?P.cmp[k].m:-1]}
function salesKPI(o={}){const P=period(),FM=X.facts.m,w=o.where,
    oc=o.mon?{...o,where:i=>FM[i]===o.mon[0]&&(!w||w(i))}:o,op=o.mon?{...o,where:i=>FM[i]===o.mon[1]&&(!w||w(i))}:o;
  const cur=pick(P.cur,oc),cmp=pick(P.cmp,op);
  return{P,cur,cmp,rev:sum(cur,'r'),revC:sum(cmp,'r'),kg:sum(cur,'k'),kgC:sum(cmp,'k'),q:sum(cur,'q'),qC:sum(cmp,'q')}}
const growth=(a,b)=>b==null||b<=0?null:(a-b)/b*100;
function deltaHTML(a,b,P,fmt=eurS,inv=false){
  if(!P.cmp||b==null) return `<span class="na">No comparison</span>`;
  const g=growth(a,b),d=a-b,cls=g==null||d===0?'na':((d>0)!==inv?'up':'down');
  return `<span class="${cls}">${g==null?'—':(d>0?'▲':d<0?'▼':'■')+' '+pct(g)}</span> <span class="na">(${d>0?'+':d<0?'−':''}${fmt(Math.abs(d))})</span>`}
function custRev(ix){const m=new Map();if(!ix)return m;const F=X.facts;for(const i of ix)m.set(F.c[i],(m.get(F.c[i])||0)+F.r[i]);return m}
const activeSet=m=>new Set([...m].filter(([,v])=>v>0).map(([k])=>k));
function newLost(o={}){const P=period(),K=salesKPI(o);const a=activeSet(custRev(K.cur));
  const lbS=st.from-12;let neu=null;
  if(lbS>=0){const lb=pick(Array.from({length:12},(_,j)=>({m:lbS+j,cap:99})),o),prev=activeSet(custRev(lb));neu=[...a].filter(c=>!prev.has(c))}
  const lost=K.cmp?[...activeSet(custRev(K.cmp))].filter(c=>!a.has(c)):null;
  return{active:a,neu,lost,K,lbOK:lbS>=0}}
function priceKPI(grp,o={}){const w=i=>X.kgProd.has(X.facts.p[i]);const K=salesKPI({...o,grp,where:w});return{...K,ppk:K.kg?K.rev/K.kg:null,ppkC:K.kgC?K.revC/K.kgC:null}}

const cOK=c=>(!st.rep||X.customers[c][2]===st.rep)&&(!st.mkt||X.customers[c][1]===st.mkt);
function arRows(per){const lo=per?X.months[st.from]:'',hi=per?X.months[st.to]:'';return X.ar.filter(a=>cOK(a[0])&&(!per||(a[2].slice(0,7)>=lo&&a[2].slice(0,7)<=hi)))}
function arPerTxt(){const a=X.months[st.from],b=X.months[st.to],s0=X.meta.arStart.slice(0,7),lo=a<s0?s0:a;const t=lo===b?mLong(lo):mLong(lo)+' – '+mLong(b);return t+(a<=s0&&b>=s0?` (from ${dLab(X.meta.arStart)})`:'')}
function arKPI(per){const R=arRows(per);let open=0,over=0,over30=0,credit=0,nOpen=0;const by=new Map(AGE.map(a=>[a,0]));
  for(const a of R){const b=a[6];if(b>0){open+=b;nOpen++;by.set(a[7],(by.get(a[7])||0)+b);if(a[7]!=='Current')over+=b;if(a[7]!=='Current'&&a[7]!=='1–30')over30+=b}if(b<0)credit+=b}
  return{R,open,over,over30,credit,nOpen,by,net:open+credit}}
const lateOrders=O=>O.filter(o=>o[12]==='toDeliver'&&o[7]==='past');
const unbilled=O=>O.filter(o=>o[12]==='deliveredNotInvoiced');
const staleOpen=O=>O.filter(o=>o[12]==='invoiced');
function openOrders(per){const lo=X.months[st.from],hi=X.months[st.to];return X.orders.filter(o=>o[5]&&(!per||(o[1].slice(0,7)>=lo&&o[1].slice(0,7)<=hi))&&(!st.rep||o[3]===st.rep)&&(!st.mkt||(o[2]>=0&&X.customers[o[2]][1]===st.mkt)))}
function roTxt(){const W=roWin();return W[0]>W[1]?'—':(W[0]===W[1]?'on '+dLab(W[0]):dLab(W[0])+' – '+dLab(W[1]))}
function termTxt(c){const t=X.customers[c][3];return t==null?'—':t===0?'0 days (direct)':t+' days'}
function arNoData(){return X.months[st.to]<X.meta.arStart.slice(0,7)}
function roWin(){const a=X.months[st.from]+'-01',e=X.months[st.to],end=e+'-'+String(new Date(+e.slice(0,4),+e.slice(5),0).getDate()).padStart(2,'0');return[a,end<X.meta.ledgerThrough?end:X.meta.ledgerThrough]}
function addDays(d,n){const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)}
function reorder(per){const snap=X.meta.ledgerThrough,F=X.facts,W=per?roWin():null;
  const msF=X.months.map((m,i)=>i).filter(i=>!X.isPortalM[i]&&i!==X.partial.m);
  const win=new Set(msF.slice(-6)),rv=new Map();
  for(let i=0;i<X.n;i++) if(win.has(F.m[i])){const k=F.c[i]+'|'+F.p[i];rv.set(k,(rv.get(k)||0)+F.r[i])}
  const out=[];
  for(const [c,p,n,last,gap] of X.cadence){
    const g=X.gOfCat[X.products[p][1]];
    if(!cOK(c)||(st.grp&&GROUPS[g]!==st.grp)) continue;
    const since=days(last,snap),due=Math.round(since-gap);
    const fell=addDays(last,Math.floor(1.5*gap)+1);if(W&&(fell<W[0]||fell>W[1]))continue;
    if(since>1.5*gap&&since<=120) out.push({c,p,n,last,gap,since,due,fell,mrev:Math.round((rv.get(c+'|'+p)||0)/win.size)})}
  return out.sort((a,b)=>b.mrev-a.mrev)}

const tip=$('#tip');
function showTip(e,h){tip.innerHTML=h;tip.style.display='block';const w=tip.offsetWidth,hh=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+hh>innerHeight-8)y=e.clientY-hh-14;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,y)+'px'}
const hideTip=()=>tip.style.display='none';
const ROs=[];
function chart(el,draw){if(!el)return;el.classList.add('enter');setTimeout(()=>el.classList.remove('enter'),1100);const s=document.createElementNS('http://www.w3.org/2000/svg','svg');el.appendChild(s);const run=()=>{if(s.clientWidth>0)draw(s,s.clientWidth,s.clientHeight)};const ro=new ResizeObserver(run);ro.observe(el);ROs.push(ro);run();vtToggle(el,s)}
const VT={};let VTall=null;
function vtFmt(o,v){if(v==null)return'—';if(!o.axis)return NF1.format(v);const a=o.axis(1e9);if(/€/.test(a)&&/[KM]$/.test(a.trim()))return eur2(v);if(/€/.test(o.axis(1)))return o.axis(v);return NF1.format(v)+String(o.axis(0)).replace(/^-?0/,'')}
function vtTable(sp){if(!sp)return'<div class="empty">No data.</div>';const o=sp.o;
  if(sp.k==='bridge'){const rows=[{l:o.startL,v:o.start,tot:1},...o.steps,{l:o.endL,v:o.end,tot:1}],sum=o.start+o.steps.reduce((a,r)=>a+r.v,0);
    return`<table><thead><tr><th></th><th class="n">Amount</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${o.click?'click':''}${r.tot?' tot':''}" data-i="${i}"><td>${esc(r.l)}</td><td class="n">${r.tot?'':r.v>=0?'+':''}${eur2(r.v)}</td></tr>`).join('')}</tbody></table><p class="note">${sum===o.end?'✓ Start + changes = end, exactly.':'Start + changes differ from the end by '+eur2(o.end-sum)}</p>`}
  const S=o.series,nm=(x,j)=>x.name||(S.length===1?'Value':j===S.length-1?'Selected':'Comparison'),add=!o.tip||true;
  const tot=S.map(x=>x.vals.reduce((a,v)=>a+(v||0),0)),pct=o.noTotal||o.fit||(o.axis&&/%/.test(o.axis(0)));
  return`<table><thead><tr><th></th>${S.map((x,j)=>`<th class="n">${esc(nm(x,j))}</th>`).join('')}</tr></thead><tbody>${o.labels.map((l,i)=>`<tr class="${o.click?'click':''}" data-i="${i}"><td>${esc(String(l))}</td>${S.map(x=>`<td class="n">${vtFmt(o,x.vals[i])}</td>`).join('')}</tr>`).join('')}${pct||o.labels.length<2?'':`<tr class="tot"><td>Total</td>${tot.map(v=>`<td class="n">${vtFmt(o,v)}</td>`).join('')}</tr>`}</tbody></table>`}
function vtToggle(el,s){const h=el.closest('.card')&&el.closest('.card').querySelector('h2,h3'),key=el.id||('t:'+(h?h.textContent:'')+':'+[...el.parentNode.children].indexOf(el));let bar=el.previousElementSibling;if(!(bar&&bar.classList.contains('vt'))){bar=document.createElement('div');bar.className='vt';el.parentNode.insertBefore(bar,el)}
  let tb=el.parentNode.querySelector(':scope > .vtab[data-for="'+CSS.escape(key)+'"]');if(!tb){tb=document.createElement('div');tb.className='vtab scroll tbox';tb.dataset.for=key;el.after(tb)}
  bar.innerHTML='<button class="btn" data-m="c">Chart</button><button class="btn" data-m="t">Table</button>';
  const set=m=>{VT[key]=m;bar.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));el.style.display=m==='t'?'none':'';tb.style.display=m==='t'?'':'none';
    if(m==='t'){tb.innerHTML=vtTable(s.__spec);const o=s.__spec&&s.__spec.o;if(o&&o.click)tb.querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>{const i=+tr.dataset.i;if(s.__spec.k==='bridge'){const rows=[{l:o.startL,v:o.start,tot:true},...o.steps,{l:o.endL,v:o.end,tot:true}];o.click(rows[i])}else o.click(i)})}
    else{el.dispatchEvent(new Event('vtshow'));requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))}};
  bar.querySelectorAll('button').forEach(b=>b.onclick=()=>set(b.dataset.m));set(VT[key]||VTall||'c')}
function niceMax(v){if(v<=0)return 1;const e=10**Math.floor(Math.log10(v)),f=v/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function yScale(lo,hi,H,top,bot){const mx=niceMax(Math.max(hi,0)),mn=lo<0?-niceMax(-lo):0;return{y:v=>top+(mx-v)/(mx-mn)*(H-top-bot),mx,mn}}
function ticks(mn,mx){const out=[],st=(mx-mn)/4;for(let v=mn;v<=mx+st/2;v+=st)out.push(Math.round(v*1e6)/1e6);return out}
function columns(s,W,H,o){s.__spec={k:'col',o};const L=o.labels,ser=o.series,nb=ser.length,narrow=W<520;
  const left=narrow?44:58,bot=28,top=14,iw=W-left-8,bw=iw/L.length;
  let hi=0,lo=0;for(const x of ser)for(const v of x.vals){if(v!=null){hi=Math.max(hi,v);lo=Math.min(lo,v)}}
  const Y=yScale(lo,hi,H,top,bot);let h='';
  for(const t of ticks(Y.mn,Y.mx)){const y=Y.y(t);h+=`<line x1="${left}" x2="${W-8}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${left-6}" y="${y+4}" text-anchor="end">${o.axis(t)}</text>`}
  const gap=Math.max(2,bw*.22),inner=(bw-gap)/nb;
  L.forEach((l,i)=>{ser.forEach((x,j)=>{const v=x.vals[i];if(v==null)return;const y0=Y.y(0),y1=Y.y(v),bx=left+i*bw+gap/2+j*inner;
      const hh=Math.abs(y1-y0);h+=`<rect x="${bx+1}" y="${Math.min(y0,y1)}" width="${Math.max(1,inner-2)}" height="${Math.max(hh,.5)}" rx="${Math.min(3,inner/3)}" fill="${x.col}" ${o.hl&&o.hl(i)===false?'opacity=".35"':''}/>`});
    const lw=Math.max(...L.map(x=>String(x).length))*6.6+8,step=Math.max(1,Math.ceil(lw/bw));if(i%step===0)h+=`<text x="${left+i*bw+bw/2}" y="${H-8}" text-anchor="middle">${esc(l)}</text>`;
    h+=`<rect class="hit" data-i="${i}" x="${left+i*bw}" y="${top}" width="${bw}" height="${H-top-bot}" fill="transparent" style="cursor:${o.click?'pointer':'default'}"/>`});
  h+=`<line x1="${left}" x2="${W-8}" y1="${Y.y(0)}" y2="${Y.y(0)}" stroke="var(--muted)"/>`;
  s.innerHTML=h;
  s.querySelectorAll('.hit').forEach(r=>{const i=+r.dataset.i;r.onmousemove=e=>showTip(e,o.tip(i));r.onmouseleave=hideTip;if(o.click)r.onclick=()=>{hideTip();o.click(i)}})}
function lines(s,W,H,o){s.__spec={k:'line',o};const L=o.labels,narrow=W<520,left=narrow?44:58,bot=28,top=14,right=o.endLabels?(narrow?8:96):10,iw=W-left-right;
  let hi=0,lo=0;for(const x of o.series)for(const v of x.vals)if(v!=null){hi=Math.max(hi,v);lo=Math.min(lo,v)}
  let Y;if(o.fit){let a=Infinity,b=-Infinity;for(const x of o.series)for(const v of x.vals)if(v!=null){a=Math.min(a,v);b=Math.max(b,v)}const pad=Math.max((b-a)*.25,Math.abs(b)*.02),st=niceMax((b-a+2*pad)/4)/ (niceMax((b-a+2*pad)/4)>=(b-a+2*pad)/4*2?2:1),mn=Math.floor((a-pad)/st)*st,mx=mn+st*4>=b+pad?mn+st*4:Math.ceil((b+pad)/st)*st;Y={mn,mx,y:v=>top+(mx-v)/(mx-mn)*(H-top-bot)}}else Y=yScale(lo,hi,H,top,bot);
  const X0=i=>left+(L.length===1?iw/2:i*iw/(L.length-1));let h='';
  for(const t of ticks(Y.mn,Y.mx)){const y=Y.y(t);h+=`<line x1="${left}" x2="${W-right}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${left-6}" y="${y+4}" text-anchor="end">${o.axis(t)}</text>`}
  const every=Math.ceil(L.length/(narrow?5:12));L.forEach((l,i)=>{if(i%every===0)h+=`<text x="${X0(i)}" y="${H-8}" text-anchor="middle">${esc(l)}</text>`});
  const EL=[];for(const x of o.series){let d='',pen=false;x.vals.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?'L':'M')+X0(i)+','+Y.y(v);pen=true});
    h+=`<path d="${d}" fill="none" stroke="${x.col}" stroke-width="${x.w||2}" ${x.dash?'stroke-dasharray="5 4"':''} stroke-linejoin="round"/>`;
    if(o.endLabels&&!narrow){let li=x.vals.length-1;while(li>=0&&x.vals[li]==null)li--;if(li>=0)EL.push({x:X0(li)+6,y:Y.y(x.vals[li])+4,t:x.name})}
    x.vals.forEach((v,i)=>{if(v!=null&&L.length<=40)h+=`<circle cx="${X0(i)}" cy="${Y.y(v)}" r="2.6" fill="${x.col}"/>`})}
  EL.sort((a,b)=>a.y-b.y);for(let j=1;j<EL.length;j++)if(EL[j].y-EL[j-1].y<13)EL[j].y=EL[j-1].y+13;{const ov=EL.length?EL[EL.length-1].y-(H-bot):0;if(ov>0)for(const e of EL)e.y-=ov;}for(const e of EL)h+=`<text x="${e.x}" y="${e.y}" class="vl">${esc(e.t)}</text>`;
  h+=`<line id="xh" x1="0" x2="0" y1="${top}" y2="${H-bot}" stroke="var(--muted)" stroke-dasharray="3 3" style="display:none"/><rect class="hit" x="${left}" y="${top}" width="${iw}" height="${H-top-bot}" fill="transparent"/>`;
  s.innerHTML=h;const hit=s.querySelector('.hit'),xh=s.querySelector('#xh');
  hit.onmousemove=e=>{const r=s.getBoundingClientRect(),i=Math.max(0,Math.min(L.length-1,Math.round((e.clientX-r.left-left)/(iw/Math.max(1,L.length-1)))));xh.setAttribute('x1',X0(i));xh.setAttribute('x2',X0(i));xh.style.display='';showTip(e,o.tip(i))};
  hit.onmouseleave=()=>{xh.style.display='none';hideTip()};if(o.click)hit.onclick=e=>{const r=s.getBoundingClientRect(),i=Math.max(0,Math.min(L.length-1,Math.round((e.clientX-r.left-left)/(iw/Math.max(1,L.length-1)))));hideTip();o.click(i)}}
function bridge(s,W,H,o){s.__spec={k:'bridge',o};const rows=[{l:o.startL,v:o.start,tot:true},...o.steps,{l:o.endL,v:o.end,tot:true}];
  const narrow=W<520,left=narrow?96:140,right=narrow?64:92,rh=(H-6)/rows.length;let run=0,lo=0,hi=0;
  for(const r of rows){if(r.tot){hi=Math.max(hi,r.v);lo=Math.min(lo,r.v);run=r.v}else{const a=run,b=run+r.v;hi=Math.max(hi,a,b);lo=Math.min(lo,a,b);run=b}}
  const span=hi-lo||1,pad=span*.04,x=v=>left+(v-(lo-pad))/(span+2*pad)*(W-left-right);run=0;let h='';
  rows.forEach((r,i)=>{const y=3+i*rh,bh=Math.min(22,rh*.66),cy=y+(rh-bh)/2;let a,b,col;
    if(r.tot){a=Math.min(0,r.v);b=Math.max(0,r.v);col='var(--tot)';run=r.v;a=Math.max(a,lo-pad)}else{a=Math.min(run,run+r.v);b=Math.max(run,run+r.v);col=r.v>=0?'var(--up)':'var(--down)';run+=r.v}
    const x1=x(Math.max(a,lo-pad)),x2=x(b);
    h+=`<text x="${left-8}" y="${cy+bh/2+4}" text-anchor="end" ${r.tot?'class="vl"':''}>${esc(narrow&&r.l.length>13?r.l.slice(0,12)+'…':r.l)}</text><rect x="${x1}" y="${cy}" width="${Math.max(1.5,x2-x1)}" height="${bh}" rx="3" fill="${r.tot?'var(--tot)':col}" ${r.tot?'':'opacity=".9"'}/><text x="${x2+6}" y="${cy+bh/2+4}" class="vl">${r.tot?eurS(r.v):(r.v>=0?'+':'−')+eurS(Math.abs(r.v)).replace('€ ','€ ')}</text>`;
    h+=`<rect class="hit" data-i="${i}" x="0" y="${y}" width="${W}" height="${rh}" fill="transparent" style="cursor:pointer"/>`});
  s.innerHTML=h;s.querySelectorAll('.hit').forEach(r=>{const i=+r.dataset.i,row=rows[i];r.onmousemove=e=>showTip(e,`<b>${esc(row.l)}</b><br>${row.tot?eur(row.v):(row.v>=0?'+':'−')+eur(Math.abs(row.v))}`);r.onmouseleave=hideTip;r.onclick=()=>{hideTip();o.click&&o.click(row)}})}
function hbars(rows,o={ck:true}){const mx=Math.max(1,...rows.map(r=>Math.max(Math.abs(r.v),Math.abs(r.c||0))));
  if(o.tab!==false&&rows.length)return `<div class="hbw"><div class="vt"><button class="btn on" data-hm="c">Chart</button><button class="btn" data-hm="t">Table</button></div><div class="hb-c">${hbars(rows,{...o,tab:false})}</div><div class="hb-t scroll tbox" style="display:none"><table><thead><tr><th></th><th class="n">Value</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${o.ck===false?'':'click'}" data-k="${i}"><td>${esc(r.l)}</td><td class="n">${r.vt}</td></tr>`).join('')}</tbody></table></div></div>`;
  return `<div class="hbar${o.ck===false?'':' ck'}">${rows.map((r,i)=>`<div class="nm" data-k="${i}" title="${esc(r.l)}">${esc(r.l)}</div><div class="t" data-k="${i}" title="${esc(r.tipTxt||'')}"><b style="width:${Math.max(0,r.v)/mx*100}%;background:${r.col||'var(--s1)'}"></b>${r.c!=null&&r.c>0?`<s style="left:${r.c/mx*100}%"></s>`:''}</div><div class="val" data-k="${i}">${r.vt}</div>`).join('')}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-hm]');if(!b)return;const w=b.closest('.hbw'),t=b.dataset.hm==='t';
  w.querySelectorAll('[data-hm]').forEach(x=>x.classList.toggle('on',x===b));w.querySelector('.hb-c').style.display=t?'none':'';w.querySelector('.hb-t').style.display=t?'':'none'});
function legend(items){return `<div class="legend">${items.map(([n,c])=>`<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>`}

let D=null;
function closeDrawer(){$('#drawer').classList.remove('open');$('#shade').classList.remove('open')}
function openDrawer(top,body){$('#dTop').innerHTML=top;$('#dBody').innerHTML=body;$('#drawer').classList.add('open');$('#shade').classList.add('open');$('#drawer').querySelector('.x').onclick=closeDrawer;$('#dBody').scrollTop=0}
function proof(cfg){D=Object.assign({dim:cfg.dims?cfg.dims[0]:'month'},cfg);drawProof()}
function drawProof(){const c=D,K=c.calc(),P=K.P,F=X.facts,col=c.col||'r',fmt=mFmt(col);
  const dim=DIMS[c.dim],pair=c.dim==='month'&&K.cmp&&Array.isArray(P.cur)&&Array.isArray(P.cmp),mp=pair?new Map(P.cmp.map((x,j)=>[x.m,P.cur[j].m])):null;
  const a=by(K.cur,dim.f,col),b=by(K.cmp,pair?(i=>mp.get(F.m[i])):dim.f,col),keys=[...new Set([...a.keys(),...b.keys()])];
  const cl=pair?new Map(P.cur.map((x,j)=>[x.m,P.cmp[j].m])):null;
  const rows=keys.map(k=>({k,l:dim.l(k)+(pair?' vs '+mLab(X.months[cl.get(k)]):''),v:a.get(k)||0,w:K.cmp?(b.get(k)||0):null})).sort((x,y)=>c.dim==='month'?x.k-y.k:(y.v-x.v)||((y.w||0)-(x.w||0)));
  const tv=rows.reduce((s,r)=>s+r.v,0),tw=K.cmp?rows.reduce((s,r)=>s+r.w,0):null,kv=mVal(K,col),kw=mVal(K,col,1);
  const ok=tv===kv&&(tw===kw||!K.cmp);
  const top=`<div style="display:flex;justify-content:space-between;gap:10px"><h3>${esc(c.title)}</h3><button class="btn x" aria-label="Close">Close ✕</button></div>
   <div class="note" style="font-size:13px;color:var(--muted)">${esc(c.def)}<br>${esc(P.label)}${P.cmp?' vs '+esc(P.cmpLabel):''} · ${esc(filtTxt())}${c.extra?' · '+esc(c.extra):''}</div>
   <div class="chk ${ok?'ok':'bad'}">${ok?'<b>✓ Rows add up exactly</b> to the figure shown: '+fmt(kv)+(K.cmp?' (comparison '+fmt(kw)+')':''):'<b>✗ Mismatch</b> rows '+fmt(tv)+' vs figure '+fmt(kv)}</div>
   <div class="seg">${(c.dims||Object.keys(DIMS)).map(d=>`<button class="btn ${d===c.dim?'on':''}" data-d="${d}">By ${DIMS[d].n.toLowerCase()}</button>`).join('')} <button class="btn" id="copyT">Copy table</button></div>`;
  const body=`<div class="scroll"><table><thead><tr><th>${dim.n}</th><th class="n">${esc(P.label)}</th>${K.cmp?`<th class="n">Comparison</th><th class="n">Change</th>`:''}<th class="n">Share</th></tr></thead><tbody>
   ${rows.map(r=>`<tr><td>${esc(r.l)}</td><td class="n">${fmt(r.v)}</td>${K.cmp?`<td class="n">${fmt(r.w)}</td><td class="n ${r.v-r.w>0?'up':r.v-r.w<0?'down':''}">${(r.v-r.w>0?'+':r.v-r.w<0?'−':'')+fmt(Math.abs(r.v-r.w))}</td>`:''}<td class="n">${tv?share(r.v/tv*100):'—'}</td></tr>`).join('')}
   <tr class="tot"><td>Total (${rows.length} rows)</td><td class="n">${fmt(tv)}</td>${K.cmp?`<td class="n">${fmt(tw)}</td><td class="n">${(tv-tw>0?'+':tv-tw<0?'−':'')+fmt(Math.abs(tv-tw))}</td>`:''}<td class="n">${tv?'100,0 %':'—'}</td></tr></tbody></table></div>`;
  openDrawer(top,body);
  $('#dTop').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{D.dim=b.dataset.d;drawProof()});
  $('#copyT').onclick=()=>copyRows([[dim.n,P.label,...(K.cmp?['Comparison','Change']:[])],...rows.map(r=>[r.l,String(r.v/mDiv(col)),...(K.cmp?[String(r.w/mDiv(col)),String((r.v-r.w)/mDiv(col))]:[])])])}
function copyRows(rows){const t=rows.map(r=>r.join('\t')).join('\n');try{navigator.clipboard.writeText(t).then(()=>flash('Copied — paste into Excel'),()=>flash('Copy was blocked by the browser'))}catch(e){flash('Copy was blocked by the browser')}}
function flash(m){const b=$('#copyT');if(b){const o=b.textContent;b.textContent=m;setTimeout(()=>b.textContent=o,1800)}}
function listProof(title,def,head,rows,totals,checkTxt){
  const top=`<div style="display:flex;justify-content:space-between;gap:10px"><h3>${esc(title)}</h3><button class="btn x" aria-label="Close">Close ✕</button></div><div class="note" style="font-size:13px;color:var(--muted)">${esc(def)}</div>${checkTxt?`<div class="chk ok">${checkTxt}</div>`:''}<div class="seg"><button class="btn" id="copyT">Copy table</button></div>`;
  const body=`<div class="scroll"><table><thead><tr>${head.map(h=>`<th class="${h[1]?'n':''}">${esc(h[0])}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${head[i][1]?'n':''}">${v}</td>`).join('')}</tr>`).join('')}${totals?`<tr class="tot">${totals.map((v,i)=>`<td class="${head[i][1]?'n':''}">${v}</td>`).join('')}</tr>`:''}</tbody></table></div>`;
  openDrawer(top,body);const strip=s=>String(s).replace(/<[^>]+>/g,'').replace(/ /g,' ');
  $('#copyT').onclick=()=>copyRows([head.map(h=>h[0]),...rows.map(r=>r.map(strip))])}
function salesProof(title,def,o={},dims,col){proof({title,def,col,dims:dims||['month','group','verkoper','customer','product','market','category'],calc:()=>salesKPI(o),extra:o.extra})}

function render(){if(!ready)return;{const p=$('#page');p.classList.remove('enter');void p.offsetWidth;p.classList.add('enter')}ROs.forEach(r=>r.disconnect());ROs.length=0;hideTip();
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.p===st.page));
  const P=period();$('#cov').textContent=`Showing ${P.label}${P.cmp?' vs '+P.cmpLabel:''} · ${P.cmp?'':P.why+' · '}Jan 2025–Mar 2026 come from the former sales portal (monthly totals); daily detail starts Apr 2026.`;
  const pg=$('#page');pg.innerHTML='';(VIEWS[st.page]||VIEWS.overview)(pg,P);pg.scrollTop=0}
const VIEWS={};
const kpiTile=(id,l,v,d,h)=>`<button class="kpi" id="${id}"><span class="l">${esc(l)}</span><span class="v">${v}</span><span class="d">${d}</span>${h?`<span class="h">${h}</span>`:''}</button>`;
const card=(cls,title,inner,note,right='')=>`<section class="card ${cls}"><div class="hd"><h2>${title}</h2>${right}</div>${note?`<p class="note">${note}</p>`:''}${inner}</section>`;
function monthSeries(o={}){const P=period(),F=X.facts;const ms=P.cur.map(c=>c.m),cm=P.cmp?P.cmp.map(c=>c.m):null;
  const cur=pick(P.cur,o),cmp=pick(P.cmp,o),a=by(cur,i=>F.m[i],o.col||'r'),b=by(cmp,i=>F.m[i],o.col||'r');
  return{P,ms,cm,cur:ms.map(m=>a.get(m)||0),cmp:cm?cm.map(m=>b.get(m)||0):null}}
function bridgeSteps(dimKey,o={},top=6){const K=salesKPI(o),f=DIMS[dimKey].f,a=by(K.cur,f,'r'),b=by(K.cmp,f,'r');
  const ks=[...new Set([...a.keys(),...b.keys()])].map(k=>({k,l:DIMS[dimKey].l(k),v:(a.get(k)||0)-(b.get(k)||0)})).filter(x=>x.v!==0).sort((x,y)=>Math.abs(y.v)-Math.abs(x.v));
  const head=ks.slice(0,top),rest=ks.slice(top).reduce((s,x)=>s+x.v,0);if(rest!==0)head.push({k:null,l:`${ks.length-top} others`,v:rest});
  return{K,steps:head}}

VIEWS.overview=(pg,P)=>{
  const K=salesKPI(),mp=priceKPI('Milk powder'),NL=newLost(),A=arKPI(),RO=reorder(true),OO=openOrders(true);
  const pastDue=lateOrders(OO);
  const g=growth(K.rev,K.revC),act=NL.active.size,rpc=act?K.rev/act:0;
  const title=P.cmp?`Revenue ${g>=0?'up':'down'} ${pct(Math.abs(g)).replace('+','')} to ${eurS(K.rev)} for ${P.label}`:`Revenue ${eurS(K.rev)} for ${P.label}`;
  const actC=K.cmp?activeSet(custRev(K.cmp)).size:null;
  pg.innerHTML=`<h1>${esc(title)}</h1><p class="sub">${P.cmp?'Compared with '+esc(P.cmpLabel):esc(P.why)} · ${esc(filtTxt())}. Click any figure to see the rows behind it.</p>
  <div class="kpis">
   ${kpiTile('kRev','Revenue',eurS(K.rev),deltaHTML(K.rev,K.revC,P),'Booked turnover excl. VAT')}
   ${kpiTile('kMp','Milk powder sold',ton(mp.kg),deltaHTML(mp.kg,mp.kgC,P,ton),'Tonnes invoiced')}
   ${kpiTile('kPpk','Milk powder price',mp.ppk==null?'—':'€ '+NF2.format(mp.ppk/100)+'/kg',P.cmp&&mp.ppkC?deltaHTML(mp.ppk,mp.ppkC,P,v=>'€ '+NF2.format(v/100)):'<span class="na">No comparison</span>','Revenue ÷ kg')}
   ${kpiTile('kAct','Active customers',NF0.format(act),P.cmp?deltaHTML(act,actC,P,v=>NF0.format(v)):'<span class="na">No comparison</span>',`${eurS(rpc)} revenue per customer`)}
   ${kpiTile('kAR','Open receivables',eurS(A.open),`<span class="${A.open?'down':'na'}">${A.open?share(A.over/A.open*100)+' overdue':'—'}</span>`,`${NF0.format(A.nOpen)} invoices still open on ${dLab(X.meta.ledgerThrough)} (report date, not the period)`)}
   ${kpiTile('kRO','Reorders overdue',NF0.format(RO.length),`<span class="${RO.length?'down':'na'}">${eurS(RO.reduce((s,r)=>s+r.mrev,0))} / month at stake</span>`,`Fell due ${esc(roTxt())}, not yet reordered`)}
  </div>
  <div class="grid">
   ${card('c8','Revenue by month',`<div class="fig" id="ovM"></div>`+legend([[P.label,'var(--s1)'],...(P.cmp?[[P.cmpLabel,'var(--cmp)']]:[])]),'Click a month to see its customers, products and verkopers.')}
   ${card('c4',P.cmp?'What moved revenue':'Revenue by product group',`<div class="fig" id="ovB"></div>`,P.cmp?'Change by product group, comparison → current. Click a bar for the rows.':'Click a bar for the rows.')}
   ${card('c6','What the numbers say',`<ul class="ins" id="ovI"></ul>`)}
   ${card('c6',X.partial.m>=0?`${mLong(X.months[X.partial.m])} so far vs ${mLong(X.months[X.partial.m-1])}`:'Latest month',`<div class="fig s" id="ovD"></div><div id="ovDl"></div>`,X.partial.m>=0?`Cumulative revenue by day, same days of the previous month (like for like). Not affected by the period filter.`:'')}
  </div>`;
  $('#kRev').onclick=()=>salesProof('Revenue','Signed revenue: invoice lines on revenue accounts (Microfas) and the former sales portal’s invoiced totals (Jan 2025–Mar 2026). Excludes VAT.');
  $('#kMp').onclick=()=>proof({title:'Milk powder sold (kg)',def:'Kilograms delivered and invoiced for Milk powder products, net of returns.',col:'k',dims:['month','customer','product','verkoper','market'],calc:()=>salesKPI({grp:'Milk powder'}),extra:'Group: Milk powder'});
  $('#kPpk').onclick=()=>pricePanel('Milk powder');
  $('#kAct').onclick=()=>activeProof();
  $('#kAR').onclick=()=>arProof('all',null,null);
  $('#kRO').onclick=()=>{location.hash='reorder'};
  const M=monthSeries();
  chart($('#ovM'),(s,W,H)=>columns(s,W,H,{labels:M.ms.map(m=>mLab(X.months[m])),series:[...(M.cmp?[{vals:M.cmp,col:'var(--cmp)'}]:[]),{vals:M.cur,col:'var(--s1)'}],axis:v=>eurS(v*1),
    tip:i=>`<b>${mLong(X.months[M.ms[i]])}</b><br>${eur(M.cur[i])}${M.cmp?`<br>${mLong(X.months[M.cm[i]])}: ${eur(M.cmp[i])}<br>Change ${pct(growth(M.cur[i],M.cmp[i]))}`:''}`,
    click:i=>salesProof(`Revenue · ${mLong(X.months[M.ms[i]])}`,'Revenue of one month of the selected period, against its comparison month.',{mon:monPair(M.ms[i])},['customer','product','verkoper','group','market'])}));
  if(P.cmp){const B=bridgeSteps('group',{},6);chart($('#ovB'),(s,W,H)=>bridge(s,W,H,{startL:P.cmpLabel.length>18?'Comparison':P.cmpLabel,start:B.K.revC,endL:'Current',end:B.K.rev,steps:B.steps,click:r=>salesProof(r.tot?'Revenue':'Revenue · '+r.l,'Revenue change by product group.',r.tot||r.k==null?{}:{grp:r.l},['customer','product','verkoper','month'])}))}
  else{const a=by(K.cur,i=>X.facts.G[i],'r'),gr=GROUPS.map((gN,i)=>({l:gN,v:a.get(i)||0,vt:eurS(a.get(i)||0),col:GCOL[i]})).filter(r=>r.v);const box=$('#ovB');box.className='';box.style.minHeight='';box.innerHTML=hbars(gr);
    box.querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>salesProof('Revenue · '+gr[+e.dataset.k].l,'Revenue of one product group.',{grp:gr[+e.dataset.k].l},['customer','product','verkoper','month','market']))}
  insights($('#ovI'),K,mp,NL,A,RO,pastDue,P);
  if(X.partial.m>=0) mtdChart();
};
function mtdChart(){const pm=X.partial.m,day=X.partial.day,F=X.facts;const a=new Array(day).fill(0),b=new Array(day).fill(0);
  for(let i=0;i<X.n;i++){if(F.d[i]<1||F.d[i]>day||!dimOK(i))continue;if(F.m[i]===pm)a[F.d[i]-1]+=F.r[i];else if(F.m[i]===pm-1)b[F.d[i]-1]+=F.r[i]}
  const ca=[],cb=[];let x=0,y=0;for(let d=0;d<day;d++){x+=a[d];y+=b[d];ca.push(x);cb.push(y)}
  chart($('#ovD'),(s,W,H)=>lines(s,W,H,{noTotal:true,labels:ca.map((_,i)=>String(i+1)),series:[{name:mLab(X.months[pm-1]),vals:cb,col:'var(--cmp)',dash:true},{name:mLab(X.months[pm]),vals:ca,col:'var(--s1)',w:2.5}],axis:v=>eurS(v),endLabels:true,
    tip:i=>`<b>Day 1–${i+1}</b><br>${mLong(X.months[pm])}: ${eur(ca[i])}<br>${mLong(X.months[pm-1])}: ${eur(cb[i])}<br>Change ${pct(growth(ca[i],cb[i]))}`}));
  const g=growth(x,y);$('#ovDl').innerHTML=`<p class="note"><b class="${x>=y?'up':'down'}">${eur(x)}</b> booked in days 1–${day}, ${pct(g)} vs ${eur(y)} in the same days of ${mLong(X.months[pm-1])}.</p>`}
function insights(el,K,mp,NL,A,RO,pastDue,P){const L=[],F=X.facts;
  if(P.cmp){const B=bridgeSteps('customer',{},400).steps.filter(s=>s.k!=null);const up=B.filter(s=>s.v>0).slice(0,3),dn=B.filter(s=>s.v<0).sort((a,b)=>a.v-b.v).slice(0,3);
    if(up.length)L.push(['g',`Biggest gains: ${up.map(s=>`${esc(s.l)} <b>+${eurS(s.v)}</b>`).join(', ')}.`,()=>moversProof()]);
    if(dn.length)L.push(['w',`Biggest declines: ${dn.map(s=>`${esc(s.l)} <b>−${eurS(-s.v)}</b>`).join(', ')}.`,()=>moversProof()]);
    if(mp.kg&&mp.kgC&&mp.ppkC){const vol=Math.round((mp.kg-mp.kgC)*mp.ppkC),pr=Math.round((mp.ppk-mp.ppkC)*mp.kg);
      L.push([vol+pr>=0?'g':'w',`Milk powder: volume ${mp.kg>=mp.kgC?'added':'cost'} <b>${vol>=0?'+':'−'}${eurS(Math.abs(vol))}</b> (${ton(mp.kg)} vs ${ton(mp.kgC)}), price ${pr>=0?'added':'cost'} <b>${pr>=0?'+':'−'}${eurS(Math.abs(pr))}</b> (€ ${NF2.format(mp.ppk/100)} vs € ${NF2.format(mp.ppkC/100)}/kg).`,()=>pricePanel('Milk powder')])}}
  const cr=[...custRev(K.cur)].sort((a,b)=>b[1]-a[1]),t10=cr.slice(0,10).reduce((s,x)=>s+x[1],0);
  if(K.rev>0)L.push(['',`Top 10 customers bring <b>${share(t10/K.rev*100)}</b> of revenue; ${esc(X.customers[cr[0][0]][0])} alone <b>${share(cr[0][1]/K.rev*100)}</b>.`,()=>{location.hash='customers'}]);
  if(NL.neu&&NL.lost)L.push([NL.lost.length>NL.neu.length?'w':'g',`<b>${NL.neu.length}</b> new customers (no purchase in the 12 months before) and <b>${NL.lost.length}</b> customers who bought in the comparison period but not now.`,()=>newLostProof()]);
  if(A.open)L.push([A.over30/A.open>.25?'w':'',`<b>${eurS(A.over30)}</b> of open receivables is more than 30 days past due (${share(A.over30/A.open*100)} of ${eurS(A.open)}).`,()=>arProof('over30')]);
  if(RO.length)L.push(['w',`<b>${RO.length}</b> regular customer-product pairs are overdue to reorder, worth about <b>${eurS(RO.reduce((s,r)=>s+r.mrev,0))}</b> a month. Top: ${esc(X.customers[RO[0].c][0])} – ${esc(X.products[RO[0].p][0])}.`,()=>{location.hash='reorder'}]);
  {const OO=openOrders(),ub=unbilled(OO),so=staleOpen(OO);
   if(pastDue.length)L.push(['w',`<b>${pastDue.length}</b> sales order${pastDue.length>1?'s are':' is'} late: requested date passed and not fully delivered.`,()=>{location.hash='orders'}]);
   if(ub.length)L.push(['w',`<b>${ub.length}</b> orders are delivered in full but not yet invoiced (${ton(ub.reduce((s,o)=>s+o[10],0))} delivered).`,()=>{location.hash='orders'}]);
   if(so.length)L.push(['',`<b>${so.length}</b> orders are already invoiced but still open in Microfas; closing them would make the order list reliable.`,()=>{location.hash='orders'}]);}
  el.innerHTML=L.map((x,i)=>`<li class="${x[0]}" data-i="${i}">${x[1]}</li>`).join('')||'<li>No findings for this selection.</li>';
  el.querySelectorAll('li[data-i]').forEach(li=>li.onclick=()=>L[+li.dataset.i][2]())}
function moversProof(){proof({title:'Revenue change by customer',def:'Every customer with revenue in either period; the change column adds up to the total change.',dims:['customer','product','verkoper','group','market','month'],calc:()=>salesKPI()});D.dim='customer';drawProof()}
function activeProof(){const K=salesKPI(),m=custRev(K.cur),rows=[...m].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  listProof('Active customers','Customers whose net revenue in the period is above zero. Each row is one customer; the count of rows is the figure shown.',[['#',1],['Customer'],['Verkoper'],['Market'],['Revenue',1]],
   rows.map(([c,v],i)=>[i+1,esc(X.customers[c][0]),esc(X.customers[c][2]),esc(X.customers[c][1]),eur2(v)]),['',`${rows.length} customers`,'','',eur2(rows.reduce((s,r)=>s+r[1],0))],`<b>✓ ${rows.length} rows</b> = active customers shown. ${[...m].filter(([,v])=>v<=0).length} other customers had zero or negative net revenue (credit notes only).`)}
function newLostProof(){const NL=newLost(),K=NL.K,a=custRev(K.cur),b=custRev(K.cmp);
  const r1=(NL.neu||[]).map(c=>['New',esc(X.customers[c][0]),esc(X.customers[c][2]),eur2(a.get(c)||0),eur2(b.get(c)||0)]),r2=(NL.lost||[]).map(c=>['Lost',esc(X.customers[c][0]),esc(X.customers[c][2]),eur2(a.get(c)||0),eur2(b.get(c)||0)]);
  listProof('New and lost customers','New: active now and no positive revenue in the 12 months before the period start. Lost: active in the comparison period and not active now.',[['Type'],['Customer'],['Verkoper'],['Revenue now',1],['Revenue comparison',1]],[...r1,...r2],null,`<b>✓ ${r1.length} new · ${r2.length} lost</b>`)}
function pricePanel(grp){const F=X.facts,w=i=>X.kgProd.has(F.p[i]),K=priceKPI(grp);
  const ra=by(K.cur,i=>F.p[i],'r'),ka=by(K.cur,i=>F.p[i],'k'),rb=by(K.cmp,i=>F.p[i],'r'),kb=by(K.cmp,i=>F.p[i],'k');
  const ps=[...new Set([...ka.keys(),...kb.keys()])].sort((a,b)=>(ka.get(b)||0)-(ka.get(a)||0));
  const f=(r,k)=>k?'€ '+NF2.format(r/k/100):'—';
  listProof(`${grp} price per kg`,'Price per kg = revenue ÷ kg over products sold by weight. Totals are ratios of the summed columns, not averages of ratios.',[['Product'],['Revenue',1],['kg',1],['€/kg',1],...(K.cmp?[['€/kg comparison',1]]:[])],
   ps.map(p=>[esc(X.products[p][0]),eur2(ra.get(p)||0),NF0.format(ka.get(p)||0),f(ra.get(p)||0,ka.get(p)||0),...(K.cmp?[f(rb.get(p)||0,kb.get(p)||0)]:[])]),
   ['Total',eur2(K.rev),NF0.format(K.kg),f(K.rev,K.kg),...(K.cmp?[f(K.revC,K.kgC)]:[])],`<b>✓ Total</b> = ${eur2(K.rev)} ÷ ${NF0.format(K.kg)} kg`)}
function arProof(kind,bucket,cust,per){const A=arKPI(per);let R=A.R.filter(a=>a[6]!==0);
  if(kind==='over30')R=R.filter(a=>a[6]>0&&!['Current','1–30'].includes(a[7]));else if(kind==='over')R=R.filter(a=>a[6]>0&&a[7]!=='Current');else if(kind==='credit')R=R.filter(a=>a[6]<0);else if(kind==='net');else if(kind==='bucket')R=R.filter(a=>a[7]===bucket);else if(kind==='cust')R=R.filter(a=>a[0]===cust&&a[6]>0);else R=R.filter(a=>a[6]>0);
  const want={all:A.open,over:A.over,over30:A.over30,credit:A.credit,net:A.net}[kind];
  R.sort((a,b)=>b[6]-a[6]);const tot=R.reduce((s,a)=>s+a[6],0);
  listProof(kind==='bucket'?`Receivables · ${bucket}`:kind==='over30'?'Receivables more than 30 days past due':kind==='over'?'Overdue receivables':kind==='credit'?'Open credits':kind==='net'?'Owed after credits (open invoices − open credits)':kind==='cust'?'Open items · '+X.customers[cust][0]:'Open receivables',
   `${per?`Invoices of ${arPerTxt()}`:`Invoices dated on or after ${dLab(X.meta.arStart)}`} that Microfas still shows open on ${dLab(X.meta.ledgerThrough)}. Due date = invoice date + current payment terms.`,
   [['Customer'],['Invoice'],['Invoice date'],['Due'],['Days late',1],['Invoiced',1],['Paid',1],['Open',1]],
   R.map(a=>[esc(X.customers[a[0]][0]),esc(a[1]),a[2],a[3]||'—',a[3]?Math.max(0,days(a[3],X.meta.ledgerThrough)):'—',eur2(a[4]),eur2(-a[5]),eur2(a[6])]),
   ['Total','','','','',eur2(R.reduce((s,a)=>s+a[4],0)),eur2(-R.reduce((s,a)=>s+a[5],0)),eur2(tot)],want!=null&&want!==tot?`<b class="down">✗ Rows ${eur2(tot)} differ from the figure ${eur2(want)}</b>`:`<b>✓ ${R.length} invoices</b> add up to ${eur2(tot)}${want!=null?', the figure on the tile':''}; invoiced − paid = open on every row.`)}

VIEWS.sales=(pg,P)=>{const K=salesKPI(),M=monthSeries();const F=X.facts;
  const g=growth(K.rev,K.revC);
  pg.innerHTML=`<h1>${esc(P.cmp?`${P.label}: ${eurS(K.rev)}, ${pct(g)} vs ${P.cmpLabel}`:`${P.label}: ${eurS(K.rev)}`)}</h1><p class="sub">${esc(filtTxt())}</p>
  <div class="grid">
   ${card('c12','Monthly revenue, all months available',`<div class="fig" id="sAll"></div>`+legend([['Selected period','var(--s1)'],['Other months','var(--cmp)']]),'The whole history, so seasonality is visible. Click a month to open its rows.')}
   ${card('c12','Revenue by product group, month by month',`<div class="grid" id="sSm"></div>`,'One small chart per group, each on its own scale so every group’s trend is readable. Dashed line = comparison period.')}
   ${card('c12','Month × product group',`<div class="scroll tbox" id="sTab"></div>`,'Rows and columns add up to the totals; click a cell to see its rows.')}
   ${card('c12','Weekly revenue (daily detail from Apr 2026)',`<div class="fig s" id="sWk"></div>`,'Weeks run Monday–Sunday and are labelled by their Monday. Portal months have no daily detail, so weeks start in April 2026.')}
  </div>`;
  const all=X.months.map((m,i)=>i),sel=new Set(P.cur.map(c=>c.m)),allIx=pick(all.map(m=>({m,cap:m===X.partial.m?X.partial.day:99}))),am=by(allIx,i=>F.m[i],'r');
  chart($('#sAll'),(s,W,H)=>columns(s,W,H,{labels:all.map(m=>mLab(X.months[m])+(m===X.partial.m?'*':'')),series:[{vals:all.map(m=>am.get(m)||0),col:'var(--s1)'}],hl:i=>sel.has(i),axis:v=>eurS(v),
    tip:i=>`<b>${mLong(X.months[i])}${i===X.partial.m?' (to day '+X.partial.day+')':''}</b><br>${eur(am.get(i)||0)}${i>=12?`<br>vs ${mLong(X.months[i-12])}: ${pct(growth(am.get(i)||0,am.get(i-12)||0))}${i===X.partial.m?' (not like for like)':''}`:''}`,
    click:i=>{st.from=st.to=i;st.preset='custom';if(i===X.partial.m&&st.cmp==='py')st.cmp='pp';syncBar();render()}}));
  const sm=$('#sSm');GROUPS.slice(0,5).forEach((gN,gi)=>{if(st.grp&&st.grp!==gN)return;const S=monthSeries({grp:gN}),tot=S.cur.reduce((a,b)=>a+b,0),totC=S.cmp?S.cmp.reduce((a,b)=>a+b,0):null;
    const d=document.createElement('div');d.className='c4';d.innerHTML=`<div style="display:flex;justify-content:space-between;gap:6px;font-size:13.5px"><b>${gN}</b><span>${eurS(tot)} ${S.cmp?`<span class="${tot>=totC?'up':'down'}">${pct(growth(tot,totC))}</span>`:''}</span></div><div class="fig xs"></div>`;sm.appendChild(d);
    chart(d.querySelector('.fig'),(s,W,H)=>lines(s,W,H,{labels:S.ms.map(m=>mLab(X.months[m])),series:[...(S.cmp?[{name:'Comparison',vals:S.cmp,col:'var(--cmp)',dash:true}]:[]),{name:gN,vals:S.cur,col:GCOL[gi],w:2.5}],axis:v=>eurS(v),
      tip:i=>`<b>${gN} · ${mLong(X.months[S.ms[i]])}</b><br>${eur(S.cur[i])}${S.cmp?`<br>${mLong(X.months[S.cm[i]])}: ${eur(S.cmp[i])}`:''}`,click:i=>salesProof(`${gN} · ${mLong(X.months[S.ms[i]])}`,'Revenue of one group in one month.',{grp:gN,mon:monPair(S.ms[i])},['customer','product','verkoper','market'])}))});
  const t=new Map();for(const i of K.cur){const k=F.m[i]+'|'+F.G[i];t.set(k,(t.get(k)||0)+F.r[i])}
  const gs=GROUPS.map((g,i)=>i).filter(i=>K.cur.some(j=>F.G[j]===i));let gt=new Array(GROUPS.length).fill(0),grand=0;
  let h=`<table><thead><tr><th>Month</th>${gs.map(i=>`<th class="n">${GROUPS[i]}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>`;
  for(const c of P.cur){let rt=0;h+=`<tr><td>${mLong(X.months[c.m])}</td>${gs.map(i=>{const v=t.get(c.m+'|'+i)||0;rt+=v;gt[i]+=v;return`<td class="n click" data-m="${c.m}" data-g="${i}" style="cursor:pointer">${eur(v)}</td>`}).join('')}<td class="n"><b>${eur(rt)}</b></td></tr>`;grand+=rt}
  h+=`<tr class="tot"><td>Total</td>${gs.map(i=>`<td class="n">${eur(gt[i])}</td>`).join('')}<td class="n">${eur(grand)}</td></tr></tbody></table>`;
  $('#sTab').innerHTML=h+(grand!==K.rev?'<p class="down">Table total does not match revenue.</p>':'');
  $('#sTab').querySelectorAll('td[data-m]').forEach(td=>td.onclick=()=>salesProof(`${GROUPS[+td.dataset.g]} · ${mLong(X.months[+td.dataset.m])}`,'Revenue of one table cell.',{grp:GROUPS[+td.dataset.g],mon:monPair(+td.dataset.m)},['customer','product','verkoper','market']));
  const wk=new Map();for(let i=0;i<X.n;i++){if(!F.d[i]||!dimOK(i))continue;const dt=new Date(Date.UTC(+X.months[F.m[i]].slice(0,4),+X.months[F.m[i]].slice(5)-1,F.d[i]));const wd=(dt.getUTCDay()+6)%7;dt.setUTCDate(dt.getUTCDate()-wd);const k=dt.toISOString().slice(0,10);wk.set(k,(wk.get(k)||0)+F.r[i])}
  const wks=[...wk.keys()].sort(),lastWk=wks[wks.length-1];
  chart($('#sWk'),(s,W,H)=>columns(s,W,H,{labels:wks.map(k=>k.slice(8)+'/'+k.slice(5,7)),series:[{vals:wks.map(k=>wk.get(k)),col:'var(--s1)'}],axis:v=>eurS(v),hl:i=>wks[i]!==lastWk||days(lastWk,X.meta.ledgerThrough)>=6,
    tip:i=>`<b>Week of ${dLab(wks[i])}</b><br>${eur(wk.get(wks[i]))}${wks[i]===lastWk&&days(lastWk,X.meta.ledgerThrough)<6?'<br>Week still in progress':''}`}));
};

VIEWS.verkopers=(pg,P)=>{const K=salesKPI(),F=X.facts,a=by(K.cur,i=>F.v[i],'r'),b=by(K.cmp,i=>F.v[i],'r');
  const mpI=K.cur.filter(i=>F.G[i]===0&&X.kgProd.has(F.p[i])),mr=by(mpI,i=>F.v[i],'r'),mk=by(mpI,i=>F.v[i],'k');
  const ac=new Map();{const m=new Map();for(const i of K.cur){const k=F.v[i]+'|'+F.c[i];m.set(k,(m.get(k)||0)+F.r[i])}for(const [k,v] of m)if(v>0){const r=+k.split('|')[0];ac.set(r,(ac.get(r)||0)+1)}}
  const reps=[...new Set([...a.keys(),...b.keys()])].map(v=>({v,n:X.verkopers[v],r:a.get(v)||0,c:K.cmp?(b.get(v)||0):null,mk:mk.get(v)||0,mr:mr.get(v)||0,ac:ac.get(v)||0})).sort((x,y)=>y.r-x.r);
  const tot=reps.reduce((s,r)=>s+r.r,0),totC=K.cmp?reps.reduce((s,r)=>s+r.c,0):null,top=reps[0];
  const gr=K.cmp?reps.filter(r=>r.c>0).map(r=>({...r,g:r.r-r.c})).sort((x,y)=>y.g-x.g):[];
  pg.innerHTML=`<h1>${top?esc(`${top.n} leads with ${eurS(top.r)} (${share(top.r/tot*100)} of revenue)`):'No revenue in this selection'}</h1>
  <p class="sub">${esc(P.label)}${P.cmp?' vs '+esc(P.cmpLabel):''} · ${esc(filtTxt())}. From April 2026 each customer’s revenue goes to their current verkoper; portal months use the matched customer’s current verkoper too, so years compare on the same basis.${gr.length?` Largest change: ${esc(gr[0].n)} ${gr[0].g>=0?'+':'−'}${eurS(Math.abs(gr[0].g))}.`:''}</p>
  <div class="grid">
   ${card('c4','Revenue per verkoper',`<div id="vBars"></div>`+(K.cmp?legend([['Current','var(--s1)'],['Comparison (tick)','var(--ink)']]):''),'Click a name to filter the whole cockpit to that verkoper.')}
   ${card('c8','Scorecard',`<div class="scroll tbox" id="vTab"></div>`,'Milk powder €/kg is revenue ÷ kg of milk powder sold by weight. Active customers have positive net revenue.')}
   ${card('c12','Verkoper × product group',`<div class="scroll" id="vHeat"></div>`,'Shading shows each verkoper’s mix (share of their own revenue). Click a cell for its rows.')}
  </div>`;
  $('#vBars').innerHTML=hbars(reps.map(r=>({l:r.n,v:r.r,c:r.c,vt:eurS(r.r)})));
  $('#vBars').querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>{st.rep=reps[+el.dataset.k].n;syncBar();render()});
  $('#vTab').innerHTML=`<table><thead><tr><th>Verkoper</th><th class="n">Revenue</th>${K.cmp?'<th class="n">Comparison</th><th class="n">Change</th>':''}<th class="n">Share</th><th class="n">Milk powder</th><th class="n">€/kg</th><th class="n">Customers</th></tr></thead><tbody>
   ${reps.map(r=>`<tr class="click" data-v="${r.v}"><td style="white-space:nowrap">${esc(r.n)}</td><td class="n">${eur(r.r)}</td>${K.cmp?`<td class="n">${eur(r.c)}</td><td class="n ${r.r>=r.c?'up':'down'}">${pct(growth(r.r,r.c))}</td>`:''}<td class="n">${share(tot?r.r/tot*100:0)}</td><td class="n">${ton(r.mk)}</td><td class="n">${r.mk?NF2.format(r.mr/r.mk/100):'—'}</td><td class="n">${r.ac}</td></tr>`).join('')}
   <tr class="tot"><td>Total</td><td class="n">${eur(tot)}</td>${K.cmp?`<td class="n">${eur(totC)}</td><td class="n">${pct(growth(tot,totC))}</td>`:''}<td class="n">100,0 %</td><td class="n">${ton(reps.reduce((s,r)=>s+r.mk,0))}</td><td class="n">${(()=>{const k=reps.reduce((s,r)=>s+r.mk,0);return k?NF2.format(reps.reduce((s,r)=>s+r.mr,0)/k/100):'—'})()}</td><td class="n">${activeSet(custRev(K.cur)).size}*</td></tr></tbody></table><p class="note">* A customer served by two verkopers in the period counts once in the total.</p>`;
  $('#vTab').querySelectorAll('tr[data-v]').forEach(tr=>tr.onclick=()=>salesProof('Revenue · '+X.verkopers[+tr.dataset.v],'Revenue booked to one verkoper.',{rep:X.verkopers[+tr.dataset.v]},['customer','product','group','month','market']));
  const hm=new Map();for(const i of K.cur){const k=F.v[i]+'|'+F.G[i];hm.set(k,(hm.get(k)||0)+F.r[i])}
  const gs=[0,1,2,3,4,5].filter(g=>reps.some(r=>hm.get(r.v+'|'+g)));
  $('#vHeat').innerHTML=`<table><thead><tr><th>Verkoper</th>${gs.map(g=>`<th class="n">${GROUPS[g]}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>${reps.map(r=>`<tr><td>${esc(r.n)}</td>${gs.map(g=>{const v=hm.get(r.v+'|'+g)||0,sh=r.r>0?Math.max(0,v/r.r):0;return`<td class="n" data-v="${r.v}" data-g="${g}" style="cursor:pointer;background:color-mix(in srgb,var(--s1) ${Math.round(sh*70)}%,transparent)" title="${share(sh*100)} of ${esc(r.n)}’s revenue">${eurS(v)}</td>`}).join('')}<td class="n"><b>${eurS(r.r)}</b></td></tr>`).join('')}
   <tr class="tot"><td>Total</td>${gs.map(g=>`<td class="n">${eurS(reps.reduce((s,r)=>s+(hm.get(r.v+'|'+g)||0),0))}</td>`).join('')}<td class="n">${eurS(tot)}</td></tr></tbody></table>`;
  $('#vHeat').querySelectorAll('td[data-g]').forEach(td=>td.onclick=()=>salesProof(`${X.verkopers[+td.dataset.v]} · ${GROUPS[+td.dataset.g]}`,'Revenue of one verkoper in one product group.',{rep:X.verkopers[+td.dataset.v],grp:GROUPS[+td.dataset.g]},['customer','product','month']));
};

VIEWS.customers=(pg,P)=>{const K=salesKPI(),F=X.facts,a=custRev(K.cur),b=custRev(K.cmp),NL=newLost();
  const rows=[...new Set([...a.keys(),...b.keys()])].map(c=>({c,n:X.customers[c][0],r:a.get(c)||0,w:K.cmp?(b.get(c)||0):null})).sort((x,y)=>y.r-x.r);
  const pos=rows.filter(r=>r.r>0),totPos=pos.reduce((s,r)=>s+r.r,0);let cum=0;const curve=pos.map(r=>(cum+=r.r)/totPos*100);
  const nA=curve.findIndex(v=>v>=80)+1,nB=curve.findIndex(v=>v>=95)+1;
  pg.innerHTML=`<h1>${esc(`${nA} of ${pos.length} active customers make 80 % of revenue`)}</h1><p class="sub">${esc(P.label)} · ${esc(filtTxt())}. A = the customers that make the first 80 %, B = the next 15 %, C = the rest.</p>
  <div class="kpis">${kpiTile('cA','A customers',NF0.format(nA),`<span class="na">${share(80)} of revenue</span>`,'Protect: visit, plan, price carefully')}${kpiTile('cB','B customers',NF0.format(nB-nA),'<span class="na">next 15 %</span>','Grow share of wallet')}${kpiTile('cC','C customers',NF0.format(pos.length-nB),'<span class="na">last 5 %</span>','Serve efficiently (webshop)')}
   ${kpiTile('cN','New customers',NL.neu?NF0.format(NL.neu.length):'—',NL.neu?`<span class="up">${eurS(NL.neu.reduce((s,c)=>s+(a.get(c)||0),0))}</span>`:'<span class="na">Needs 12 months of history before the period</span>','No purchase in the prior 12 months')}
   ${kpiTile('cL','Lost customers',NL.lost?NF0.format(NL.lost.length):'—',NL.lost?`<span class="down">${eurS(NL.lost.reduce((s,c)=>s+(b.get(c)||0),0))} in comparison</span>`:'<span class="na">No comparison</span>','Bought in comparison period, not now')}</div>
  <div class="grid">
   ${card('c6','Revenue concentration',`<div class="fig s" id="cPar"></div>`,'Cumulative share of revenue by customer rank (Pareto curve).')}
   ${card('c6',K.cmp?'Biggest movers':'Top customers',`<div id="cMov"></div>`,K.cmp?'Customers with the largest change vs the comparison period. Click a name for detail.':'Click a name for detail.')}
   ${card('c12','All customers',`<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="search" id="cQ" placeholder="Search customer" aria-label="Search customer"></div><div class="scroll tbox" id="cTab"></div>`,'Credit period = the payment terms set for the customer in Microfas (days from invoice date to due date). Click a row for the customer’s history, products, receivables and reorder rhythm.')}
  </div>`;
  ['cA','cB','cC'].forEach((id,j)=>$('#'+id).onclick=()=>{const sl=j===0?pos.slice(0,nA):j===1?pos.slice(nA,nB):pos.slice(nB);listProof(['A','B','C'][j]+' customers','Ranked by revenue in the period; A reaches 80 % of revenue from active customers, B 95 %.',[['Rank',1],['Customer'],['Revenue',1],['Cumulative share',1]],sl.map(r=>[pos.indexOf(r)+1,esc(r.n),eur2(r.r),share(curve[pos.indexOf(r)])]),['',`${sl.length} customers`,eur2(sl.reduce((s,r)=>s+r.r,0)),''],`<b>✓ ${sl.length} rows</b>`)});
  $('#cN').onclick=newLostProof;$('#cL').onclick=newLostProof;
  chart($('#cPar'),(s,W,H)=>lines(s,W,H,{labels:curve.map((_,i)=>String(i+1)),series:[{name:'Cumulative share',vals:curve,col:'var(--s1)',w:2.5}],axis:v=>NF0.format(v)+'%',tip:i=>`<b>Top ${i+1} customers</b><br>${share(curve[i])} of revenue<br>#${i+1}: ${esc(pos[i].n)} ${eur(pos[i].r)}`}));
  const mv=K.cmp?rows.map(r=>({...r,g:r.r-r.w})).filter(r=>r.g!==0).sort((x,y)=>Math.abs(y.g)-Math.abs(x.g)).slice(0,14):rows.slice(0,14);
  $('#cMov').innerHTML=K.cmp?`<div class="scroll"><table><thead><tr><th>Customer</th><th class="n">Comparison</th><th class="n">Now</th><th class="n">Change</th></tr></thead><tbody>${mv.map(r=>`<tr class="click" data-c="${r.c}"><td>${esc(r.n)}</td><td class="n">${eurS(r.w)}</td><td class="n">${eurS(r.r)}</td><td class="n ${r.g>0?'up':'down'}">${r.g>0?'+':'−'}${eurS(Math.abs(r.g))}</td></tr>`).join('')}</tbody></table></div>`:hbars(mv.map(r=>({l:r.n,v:r.r,vt:eurS(r.r)})));
  $('#cMov').querySelectorAll('[data-c]').forEach(e=>e.onclick=()=>custCard(+e.dataset.c));
  if(!K.cmp)$('#cMov').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>custCard(mv[+e.dataset.k].c));
  const draw=q=>{const f=rows.filter(r=>!q||r.n.toLowerCase().includes(q));const sh=f.slice(0,400);
    $('#cTab').innerHTML=`<table><thead><tr><th>#</th><th>Customer</th><th>Verkoper</th><th>Market</th><th class="n">Credit period</th><th class="n">Revenue</th>${K.cmp?'<th class="n">Comparison</th><th class="n">Change</th>':''}</tr></thead><tbody>${sh.map(r=>`<tr class="click" data-c="${r.c}"><td>${rows.indexOf(r)+1}</td><td>${esc(r.n)}</td><td>${esc(X.customers[r.c][2])}</td><td>${esc(X.customers[r.c][1])}</td><td class="n">${termTxt(r.c)}</td><td class="n">${eur(r.r)}</td>${K.cmp?`<td class="n">${eur(r.w)}</td><td class="n ${r.r>=r.w?'up':'down'}">${pct(growth(r.r,r.w))}</td>`:''}</tr>`).join('')}
     <tr class="tot"><td></td><td>${f.length} customers${f.length>sh.length?` (first ${sh.length} shown; total covers all)`:''}</td><td></td><td></td><td></td><td class="n">${eur(f.reduce((s,r)=>s+r.r,0))}</td>${K.cmp?`<td class="n">${eur(f.reduce((s,r)=>s+r.w,0))}</td><td></td>`:''}</tr></tbody></table>`;
    $('#cTab').querySelectorAll('tr[data-c]').forEach(tr=>tr.onclick=()=>custCard(+tr.dataset.c))};
  draw('');$('#cQ').oninput=e=>draw(e.target.value.trim().toLowerCase());
};
function custCard(c){const F=X.facts,cu=X.customers[c],all=[];for(let i=0;i<X.n;i++)if(F.c[i]===c)all.push(i);
  const mm=by(all,i=>F.m[i],'r'),pr=by(all,i=>F.p[i],'r'),pk=by(all,i=>F.p[i],'k');const ar=X.ar.filter(a=>a[0]===c&&a[6]!==0),cad=X.cadence.filter(x=>x[0]===c);
  const tot=[...mm.values()].reduce((s,v)=>s+v,0);
  const top=`<div style="display:flex;justify-content:space-between;gap:10px"><h3>${esc(cu[0])}</h3><button class="btn x" aria-label="Close">Close ✕</button></div><div class="note" style="font-size:13px;color:var(--muted)">${esc(cu[2])} · ${esc(cu[1])} · credit period ${termTxt(c)} · all months, ignoring the page filters</div><div class="chk ok"><b>✓ ${eur2(tot)}</b> lifetime revenue in the data (${mLong(X.months[0])} – ${dLab(X.meta.ledgerThrough)}); months below add up to it.</div>`;
  const body=`<div class="fig s" id="ccM"></div>
   <h2 style="margin:14px 0 6px">Products</h2><div class="scroll"><table><thead><tr><th>Product</th><th class="n">Revenue</th><th class="n">kg</th></tr></thead><tbody>${[...pr].sort((a,b)=>b[1]-a[1]).map(([p,v])=>`<tr><td>${esc(X.products[p][0])}</td><td class="n">${eur(v)}</td><td class="n">${pk.get(p)?NF0.format(pk.get(p)):'—'}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="n">${eur(tot)}</td><td></td></tr></tbody></table></div>
   <h2 style="margin:14px 0 6px">Reorder rhythm</h2>${cad.length?`<div class="scroll"><table><thead><tr><th>Product</th><th class="n">Orders</th><th class="n">Usual gap</th><th>Last order</th><th class="n">Days since</th></tr></thead><tbody>${cad.map(x=>{const sn=days(x[3],X.meta.ledgerThrough);return`<tr><td>${esc(X.products[x[1]][0])}</td><td class="n">${x[2]}</td><td class="n">${NF0.format(x[4])} d</td><td>${x[3]}</td><td class="n ${sn>1.5*x[4]?'down':''}">${sn}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="note">Fewer than three orders of any one product since April 2026.</p>'}
   <h2 style="margin:14px 0 6px">Open receivables</h2>${ar.length?`<div class="scroll"><table><thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th class="n">Open</th><th>Ageing</th></tr></thead><tbody>${ar.map(a=>`<tr><td>${esc(a[1])}</td><td>${a[2]}</td><td>${a[3]||'—'}</td><td class="n">${eur2(a[6])}</td><td>${esc(a[7])}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td></td><td></td><td class="n">${eur2(ar.reduce((s,a)=>s+a[6],0))}</td><td></td></tr></tbody></table></div>`:'<p class="note">Nothing open.</p>'}`;
  openDrawer(top,body);const ms=X.months.map((m,i)=>i);chart($('#ccM'),(s,W,H)=>columns(s,W,H,{labels:ms.map(m=>mLab(X.months[m])),series:[{vals:ms.map(m=>mm.get(m)||0),col:'var(--s1)'}],axis:v=>eurS(v),tip:i=>`<b>${mLong(X.months[i])}</b><br>${eur(mm.get(i)||0)}`}))}

VIEWS.products=(pg,P)=>{const K=salesKPI(),F=X.facts;
  const gr=by(K.cur,i=>F.G[i],'r'),grC=by(K.cmp,i=>F.G[i],'r');
  const mp=priceKPI('Milk powder'),fd=priceKPI('Feed');
  pg.innerHTML=`<h1>${esc(mp.ppk?`Milk powder averages € ${NF2.format(mp.ppk/100)}/kg over ${ton(mp.kg)}${mp.ppkC?`, ${pct(growth(mp.ppk,mp.ppkC))} vs comparison`:''}`:'Products and price')}</h1><p class="sub">${esc(P.label)} · ${esc(filtTxt())}. Price per kg uses products sold by weight; totals are ratios of sums.</p>
  <div class="grid">
   ${card('c6','Milk powder: tonnes per month',`<div class="fig s" id="pT"></div>`+legend([['Current','var(--s1)'],...(mp.cmp?[['Comparison','var(--cmp)']]:[])]))}
   ${card('c6','Milk powder: € per kg per month',`<div class="fig s" id="pP"></div>`,'Axis starts near the lowest price so movements are visible. Separate from the tonnes chart, so neither scale misleads.')}
   ${card('c12','Group → category → product',`<div class="scroll tbox" id="pTab"></div>`,'Click a group or category to open it. Every level adds up to the level above.')}
   ${card('c6','Feed: tonnes and price',`<div id="pFeed"></div>`)}
   ${card('c6','Product mix by group',`<div id="pMix"></div>`)}
  </div>`;
  const ms=P.cur.map(c=>c.m),w=i=>X.kgProd.has(F.p[i]);
  const cK=by(mp.cur,i=>F.m[i],'k'),cR=by(mp.cur,i=>F.m[i],'r'),pK=by(mp.cmp,i=>F.m[i],'k'),pR=by(mp.cmp,i=>F.m[i],'r'),cm=P.cmp?P.cmp.map(c=>c.m):null;
  chart($('#pT'),(s,W,H)=>columns(s,W,H,{labels:ms.map(m=>mLab(X.months[m])),series:[...(cm?[{vals:cm.map(m=>(pK.get(m)||0)/1000),col:'var(--cmp)'}]:[]),{vals:ms.map(m=>(cK.get(m)||0)/1000),col:'var(--s1)'}],axis:v=>NF0.format(v)+' t',tip:i=>`<b>${mLong(X.months[ms[i]])}</b><br>${ton(cK.get(ms[i])||0)}${cm?`<br>${mLong(X.months[cm[i]])}: ${ton(pK.get(cm[i])||0)}`:''}`,click:i=>proof({title:'Milk powder kg · '+mLong(X.months[ms[i]]),def:'Kilograms of milk powder in one month.',col:'k',dims:['customer','product','verkoper'],calc:()=>salesKPI({grp:'Milk powder',mon:monPair(ms[i])})})}));
  const pp=m=>{const k=cK.get(m)||0;return k?(cR.get(m)||0)/k/100:null},ppC=m=>{const k=pK.get(m)||0;return k?(pR.get(m)||0)/k/100:null};
  chart($('#pP'),(s,W,H)=>lines(s,W,H,{labels:ms.map(m=>mLab(X.months[m])),series:[...(cm?[{name:'Comparison',vals:cm.map(ppC),col:'var(--cmp)',dash:true}]:[]),{name:'€/kg',vals:ms.map(pp),col:'var(--s1)',w:2.5}],fit:true,axis:v=>'€ '+NF2.format(v),tip:i=>`<b>${mLong(X.months[ms[i]])}</b><br>€ ${pp(ms[i])==null?'—':NF2.format(pp(ms[i]))}/kg${cm?`<br>${mLong(X.months[cm[i]])}: € ${ppC(cm[i])==null?'—':NF2.format(ppC(cm[i]))}/kg`:''}`}));
  let open=new Set();const gk=by(K.cur,i=>F.G[i],'k'),ck=by(K.cur,i=>F.g[i],'k');const drawT=()=>{const cr=by(K.cur,i=>F.g[i],'r'),cc=by(K.cmp,i=>F.g[i],'r'),pr=by(K.cur,i=>F.p[i],'r'),pc=by(K.cmp,i=>F.p[i],'r'),pk=by(K.cur,i=>F.p[i],'k');
    let h=`<table><thead><tr><th>Group / category / product</th><th class="n">Revenue</th>${K.cmp?'<th class="n">Comparison</th><th class="n">Change</th>':''}<th class="n">Share</th><th class="n">kg</th></tr></thead><tbody>`;
    const row=(lab,v,c,k,lvl,key)=>`<tr ${key?`class="click" data-k="${key}"`:''}><td style="padding-left:${8+lvl*18}px">${key?(open.has(key)?'▾ ':'▸ '):''}${lvl===0?'<b>'+esc(lab)+'</b>':esc(lab)}</td><td class="n">${eur(v)}</td>${K.cmp?`<td class="n">${eur(c)}</td><td class="n ${v>=c?'up':'down'}">${pct(growth(v,c))}</td>`:''}<td class="n">${K.rev?share(v/K.rev*100):'—'}</td><td class="n">${k?NF0.format(k):'—'}</td></tr>`;
    GROUPS.forEach((g,gi)=>{const v=gr.get(gi)||0,c=grC.get(gi)||0;if(!v&&!c)return;h+=row(g,v,c,gk.get(gi)||0,0,'g'+gi);
      if(open.has('g'+gi))X.categories.forEach((ct,ci)=>{if(X.gOfCat[ci]!==gi)return;const v2=cr.get(ci)||0,c2=cc.get(ci)||0;if(!v2&&!c2)return;h+=row(ct[0],v2,c2,ck.get(ci)||0,1,'c'+ci);
        if(open.has('c'+ci))[...new Set([...pr.keys(),...pc.keys()])].filter(p=>X.products[p][1]===ci).sort((a,b)=>(pr.get(b)||0)-(pr.get(a)||0)).forEach(p=>{h+=row(X.products[p][0],pr.get(p)||0,pc.get(p)||0,pk.get(p)||0,2,null)})})});
    h+=`<tr class="tot"><td>Total</td><td class="n">${eur(K.rev)}</td>${K.cmp?`<td class="n">${eur(K.revC)}</td><td class="n">${pct(growth(K.rev,K.revC))}</td>`:''}<td class="n">100,0 %</td><td class="n">${NF0.format(K.kg)}</td></tr></tbody></table>`;
    $('#pTab').innerHTML=h;$('#pTab').querySelectorAll('tr[data-k]').forEach(tr=>tr.onclick=()=>{const k=tr.dataset.k;open.has(k)?open.delete(k):open.add(k);drawT()})};
  drawT();
  $('#pFeed').innerHTML=fd.kg?`<p style="margin:0">${ton(fd.kg)} at € ${NF2.format(fd.ppk/100)}/kg${fd.kgC?` · comparison ${ton(fd.kgC)} at € ${NF2.format(fd.ppkC/100)}/kg`:''}.</p><button class="btn" id="pFb" style="margin-top:8px;align-self:start">Show feed price by product</button>`:'<p class="note">No feed sold by weight in this selection.</p>';
  if(fd.kg)$('#pFb').onclick=()=>pricePanel('Feed');
  $('#pMix').innerHTML=hbars(GROUPS.map((g,i)=>({l:g,v:gr.get(i)||0,c:K.cmp?(grC.get(i)||0):null,vt:`${eurS(gr.get(i)||0)} · ${K.rev?share((gr.get(i)||0)/K.rev*100):'—'}`,col:GCOL[i]})).filter(r=>r.v||r.c));
  $('#pMix').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>{st.grp=GROUPS[[...GROUPS.keys()].filter(i=>(gr.get(i)||0)||(K.cmp&&(grC.get(i)||0)))[+e.dataset.k]];syncBar();render()});
};

VIEWS.markets=(pg,P)=>{const K=salesKPI(),F=X.facts,a=by(K.cur,i=>F.M[i],'r'),b=by(K.cmp,i=>F.M[i],'r');
  const rows=[...new Set([...a.keys(),...b.keys()])].map(k=>({k,n:X.mkts[k],r:a.get(k)||0,c:K.cmp?(b.get(k)||0):null})).sort((x,y)=>y.r-x.r);
  const tot=rows.reduce((s,r)=>s+r.r,0),t=rows[0];
  pg.innerHTML=`<h1>${t?esc(`${t.n} is ${share(t.r/tot*100)} of revenue`):'Markets'}</h1><p class="sub">${esc(P.label)} · ${esc(filtTxt())} · market = customer’s delivery country in the master data.</p>
  <div class="grid">${card('c5','Revenue by market',`<div id="mB"></div>`+(K.cmp?legend([['Current','var(--s1)'],['Comparison (tick)','var(--ink)']]):''),'Click a market to filter the cockpit.')}
  ${card('c7','Market × product group',`<div class="scroll" id="mT"></div>`,'Click a cell for its rows.')}</div>`;
  $('#mB').innerHTML=hbars(rows.map(r=>({l:r.n,v:r.r,c:r.c,vt:`${eurS(r.r)}${K.cmp?' '+pct(growth(r.r,r.c)):''}`})));
  $('#mB').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>{st.mkt=rows[+e.dataset.k].n;syncBar();render()});
  const hm=new Map();for(const i of K.cur){const k=F.M[i]+'|'+F.G[i];hm.set(k,(hm.get(k)||0)+F.r[i])}const gs=[0,1,2,3,4,5].filter(g=>rows.some(r=>hm.get(r.k+'|'+g)));
  $('#mT').innerHTML=`<table><thead><tr><th>Market</th>${gs.map(g=>`<th class="n">${GROUPS[g]}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.n)}</td>${gs.map(g=>`<td class="n" style="cursor:pointer" data-k="${r.k}" data-g="${g}">${eurS(hm.get(r.k+'|'+g)||0)}</td>`).join('')}<td class="n"><b>${eurS(r.r)}</b></td></tr>`).join('')}<tr class="tot"><td>Total</td>${gs.map(g=>`<td class="n">${eurS(rows.reduce((s,r)=>s+(hm.get(r.k+'|'+g)||0),0))}</td>`).join('')}<td class="n">${eurS(tot)}</td></tr></tbody></table>`;
  $('#mT').querySelectorAll('td[data-g]').forEach(td=>td.onclick=()=>salesProof(`${X.mkts[+td.dataset.k]} · ${GROUPS[+td.dataset.g]}`,'Revenue of one market and group.',{mkt:X.mkts[+td.dataset.k],grp:GROUPS[+td.dataset.g]},['customer','product','verkoper','month']));
};

VIEWS.reorder=(pg)=>{const R=reorder(true),tot=R.reduce((s,r)=>s+r.mrev,0);
  pg.innerHTML=`<h1>${R.length?esc(`${R.length} regular buyers fell behind on reordering ${roTxt()}, about ${eurS(tot)} a month`):`No regular buyers fell behind on reordering ${roTxt()}`}</h1>
  <p class="sub">Customer-product pairs with at least three order days since April 2026 whose last order is more than 1,5× their usual (median) gap, up to 120 days ago. Value = their average monthly revenue over the last six complete months. The period picks when a pair became late (last order + 1,5× gap); only pairs still not reordered at ${dLab(X.meta.ledgerThrough)} are listed. ${esc(filtTxt())}.</p>
  <div class="grid">${card('c12','Call list',`<div class="scroll tbox" id="rT"></div>`,'Sorted by monthly value. Click a row for the customer card.')}</div>`;
  $('#rT').innerHTML=R.length?`<table><thead><tr><th>Customer</th><th>Product</th><th>Verkoper</th><th class="n">Orders</th><th class="n">Usual gap</th><th>Last order</th><th>Became late</th><th class="n">Days since</th><th class="n">Days late</th><th class="n">€ / month</th></tr></thead><tbody>${R.map(r=>`<tr class="click" data-c="${r.c}"><td>${esc(X.customers[r.c][0])}</td><td>${esc(X.products[r.p][0])}</td><td>${esc(X.customers[r.c][2])}</td><td class="n">${r.n}</td><td class="n">${NF0.format(r.gap)} d</td><td>${r.last}</td><td>${r.fell}</td><td class="n">${r.since}</td><td class="n down">${r.due}</td><td class="n">${eur(r.mrev)}</td></tr>`).join('')}<tr class="tot"><td>${R.length} pairs</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="n">${eur(tot)}</td></tr></tbody></table>`:'<div class="empty">Nothing overdue for this selection.</div>';
  $('#rT').querySelectorAll('tr[data-c]').forEach(tr=>tr.onclick=()=>custCard(+tr.dataset.c));
};

function orderValue(O){
  const sg=new Map(O.map(o=>[o[0],o[12]])),rows=[];let del=0,left=0,unp=0;
  for(const l of X.openLines||[]){const g=sg.get(l[0]);if(g!=='toDeliver'&&g!=='deliveredNotInvoiced')continue;
    if(!l[11]){unp++;continue}const qd=l[6]/1e6,qr=Math.max(0,l[5]-l[6])/1e6,vd=l[10],vr=Math.max(0,l[9]-l[10]),p=l[5]?l[9]/(l[5]/1e6):0;
    del+=vd;left+=vr;rows.push({l,g,p,qd,qr,vd,vr})}
  return{del,left,tot:del+left,rows,unp}}
VIEWS.orders=(pg)=>{const O=openOrders(true),OV=orderValue(O),late=lateOrders(O),toD=O.filter(o=>o[12]==='toDeliver'),nl=O.filter(o=>o[12]==='noLines'),ub=unbilled(O),so=staleOpen(O);
  const kgT=L=>L.reduce((a,o)=>a+o[10],0),kgR=L=>L.reduce((a,o)=>a+Math.max(0,o[9]-o[10]),0),kgS=kg=>kg>=10000?ton(kg):NF0.format(kg)+' kg';
  const STAGE={toDeliver:'Still to deliver',deliveredNotInvoiced:'Delivered, not invoiced',invoiced:'Invoiced, still open in Microfas',noLines:'Open, no order lines'};
  pg.innerHTML=`<h1>${esc(`${toD.length} order${toD.length===1?'':'s'} still to deliver, ${ub.length} waiting for an invoice (${eurS(OV.tot)} not yet billed)`)}</h1><p class="sub">Microfas lists ${O.length} sales orders placed in ${esc(period().label)} as open on ${dLab(X.meta.snapshot)}. Matched against deliveries and invoices: ${so.length} are already invoiced (their status was not closed), ${ub.length} are delivered in full but have no invoice yet, ${toD.length} still have quantity to deliver, and ${nl.length} have no order lines at all (empty orders to check or close). The open order value uses the prices on the order lines; lines without a price count as € 0. ${esc(filtTxt())}. The period picks the order date: orders placed in ${esc(period().label)} that are still open on ${dLab(X.meta.snapshot)}.</p>
  <div class="kpis k6">${kpiTile('oD','Still to deliver',NF0.format(toD.length),`<span class="${late.length?'down':'na'}">${late.length} past requested date</span>`,kgR(toD)?kgS(kgR(toD))+' outstanding':'')}${kpiTile('oB','Delivered, not invoiced',NF0.format(ub.length),`<span class="${ub.length?'down':'na'}">${kgS(kgT(ub))} delivered</span>`,'Billing backlog')}${kpiTile('oS','Invoiced, still open',NF0.format(so.length),'<span class="na">status not closed</span>','Order-desk clean-up')}${kpiTile('oN','Open, no order lines',NF0.format(nl.length),`<span class="${nl.length?'down':'na'}">nothing to deliver</span>`,'Empty orders to check')}${kpiTile('oA','All open in Microfas',NF0.format(O.length),'<span class="na">as the system shows them</span>','')}${kpiTile('oX','Open order value',eurS(OV.tot),`<span class="na">${eurS(OV.del)} delivered, not billed</span>`,`${eurS(OV.left)} still to deliver · excl. VAT`)}</div>
  <div class="grid">${card('c4','Open orders per verkoper',`<div class="scroll" id="oV"></div>`)}${card('c8','Order list',`<div class="seg" id="oF" style="margin-bottom:6px"></div><div class="scroll tbox" id="oL"></div>`)}</div>`;
  const byV=new Map();for(const o of O){const x=byV.get(o[3])||{t:0,b:0,s:0,n:0};x[o[12]==='toDeliver'?'t':o[12]==='deliveredNotInvoiced'?'b':o[12]==='noLines'?'n':'s']++;byV.set(o[3],x)}
  $('#oV').innerHTML=`<table><thead><tr><th>Verkoper</th><th class="n">To deliver</th><th class="n">No invoice</th><th class="n">Invoiced</th><th class="n">No lines</th></tr></thead><tbody>${[...byV].sort((a,b)=>(b[1].t+b[1].b)-(a[1].t+a[1].b)).map(([v,x])=>`<tr><td>${esc(v)}</td><td class="n">${x.t}</td><td class="n">${x.b}</td><td class="n">${x.s}</td><td class="n">${x.n}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="n">${toD.length}</td><td class="n">${ub.length}</td><td class="n">${so.length}</td><td class="n">${nl.length}</td></tr></tbody></table>`;
  let cur=toD.length?'toDeliver':'deliveredNotInvoiced';
  const list=()=>{const L=O.filter(o=>!cur||o[12]===cur).sort((a,b)=>String(a[6]).localeCompare(String(b[6])));
    $('#oF').innerHTML=[['toDeliver',toD.length],['deliveredNotInvoiced',ub.length],['invoiced',so.length],['noLines',nl.length],['',O.length]].map(([k,n])=>`<button class="btn ${k===cur?'on':''}" data-s="${k}">${k?STAGE[k]:'All'} (${n})</button>`).join('');
    $('#oF').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{cur=b.dataset.s;list()});
    $('#oL').innerHTML=`<table><thead><tr><th>Order</th><th>Customer</th><th>Verkoper</th><th>Ordered</th><th>Requested</th><th>Microfas status</th><th>Stage</th><th class="n">kg ordered</th><th class="n">kg delivered</th></tr></thead><tbody>${L.map(o=>`<tr><td>${esc(o[0])}</td><td>${o[2]>=0?esc(X.customers[o[2]][0]):'—'}</td><td>${esc(o[3])}</td><td>${o[1]||'—'}</td><td class="${o[12]==='toDeliver'&&o[7]==='past'?'down':''}">${o[6]||'—'}</td><td>${esc(o[4])}${o[8]?'':' <span class="tag">no lines</span>'}</td><td>${STAGE[o[12]]}</td><td class="n">${NF0.format(o[9])}</td><td class="n">${NF0.format(o[10])}</td></tr>`).join('')}<tr class="tot"><td>${L.length} orders</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="n">${NF0.format(L.reduce((a,o)=>a+o[9],0))}</td><td class="n">${NF0.format(L.reduce((a,o)=>a+o[10],0))}</td></tr></tbody></table>`};
  list();$('#oX').onclick=()=>listProof('Open order value','Order lines not yet invoiced (still to deliver, or delivered and waiting for an invoice). Each line is valued at its own order-line price: quantity × (price − line discounts) ÷ price unit, excl. VAT.'+(OV.unp?` ${OV.unp} line(s) have no price on the order (price 0) and count as € 0.`:''),
    [['Order'],['Customer'],['Product'],['Stage'],['€ per unit',1],['Delivered',1],['Still to deliver',1],['Value delivered',1],['Value to deliver',1],['Value',1]],
    OV.rows.sort((a,b)=>(b.vd+b.vr)-(a.vd+a.vr)).map(r=>[esc(r.l[0]),esc(X.customers[r.l[1]]?.[0]||''),esc(X.products[r.l[3]]?.[0]||''),r.g==='toDeliver'?'Still to deliver':'Delivered, not invoiced',eur2(Math.round(r.p)),NF1.format(r.qd)+' '+esc(r.l[4]),NF1.format(r.qr)+' '+esc(r.l[4]),eur2(r.vd),eur2(r.vr),eur2(r.vd+r.vr)]),
    ['Total','','','','','','',eur2(OV.del),eur2(OV.left),eur2(OV.tot)],`<b>✓ ${OV.rows.length} lines</b> add up to ${eur2(OV.tot)}, the figure on the tile.`);
  [['oD','toDeliver'],['oB','deliveredNotInvoiced'],['oS','invoiced'],['oN','noLines'],['oA','']].forEach(([id,k])=>$('#'+id).onclick=()=>{cur=k;list();$('#oL').scrollIntoView({behavior:'smooth',block:'center'})});
};
VIEWS.receivables=(pg)=>{const A=arKPI(),R=X.recon,F=A.R,FP=arRows(true),RD=dLab(X.meta.ledgerThrough),S0=dLab(X.meta.arStart);
  const cust=new Map();for(const a of F)if(a[6]>0)cust.set(a[0],(cust.get(a[0])||0)+a[6]);
  const top=[...cust].sort((a,b)=>b[1]-a[1]);
  const billed=F.reduce((s,a)=>s+a[4],0),sh=billed?A.net/billed*100:0;
  const pm=new Map();for(const a of FP){const m=a[2].slice(0,7);const x=pm.get(m)||[0,0,0,0];x[0]+=a[4];x[1]+=Math.max(0,a[6]);if(a[4]>0&&a[8]!=null){x[2]+=a[8];x[3]++}pm.set(m,x)}
  const pms=[...pm.keys()].sort(),filtered=!!(st.rep||st.mkt);
  pg.innerHTML=`<h1>${esc(`${eurS(A.net)} still to collect on ${RD}: ${share(sh)} of revenue billed since ${S0}`)}</h1>
  <p class="sub">Every figure is the position in Microfas on ${RD} (the report date) and uses Microfas’ own open/matched status per item: an invoice counts as open only while Microfas still shows it open. All amounts excl. VAT. Due date = invoice date + the customer’s payment terms. ${esc(filtTxt())}; product group does not apply. The period filter only changes the “Still unpaid, by invoice month” chart.</p>
  <div class="kpis k6">${kpiTile('aO','Open invoices',eurS(A.open),`<span class="na">${NF0.format(A.nOpen)} invoices</span>`,`Invoices from ${S0} that Microfas still shows as not (fully) paid`)}${kpiTile('aV','Overdue',eurS(A.over),`<span class="${A.over?'down':'na'}">${share(A.open?A.over/A.open*100:0)} of open</span>`,'Part of the open invoices that is past its due date')}${kpiTile('a30','More than 30 days late',eurS(A.over30),`<span class="${A.over30?'down':'na'}">${share(A.open?A.over30/A.open*100:0)} of open</span>`,'Part of the overdue amount that is over 30 days past due')}${kpiTile('aC','Open credits',eurS(-A.credit),`<span class="na">${NF0.format(F.filter(a=>a[6]<0).length)} items</span>`,'Credit notes and overpayments Microfas still shows open: money we owe back or still have to set off')}${kpiTile('aN','Owed after credits',eurS(A.net),'<span class="na">Open invoices − open credits</span>','What customers still owe us in total, once the open credits are set off')}${kpiTile('aS','Revenue still to collect',share(sh),`<span class="na">${eurS(A.net)} of ${eurS(billed)}</span>`,`Owed after credits as a share of revenue billed since ${S0}`)}</div>
  <div class="grid">
   ${card('c6','Ageing of open invoices',`<div id="aAge"></div>`,`Open invoices by days past due on ${RD}. Click a bucket for its invoices; they add up to the bar.`)}
   ${card('c6','Largest open balances',`<div id="aTop"></div>`,`Customers with the most open invoice value on ${RD}. Click a customer for their open items.`)}
   ${card('c12','From open items to the debtors account',`<div class="recon" id="aRec"></div><p class="note" id="aRecN"></p>`,filtered?'The tie-out covers the whole company and ignores the verkoper and market filters.':'How the receivables on this page add up to the debtors account 132000 in Microfas, to the cent.')}
   ${card('c6','Still unpaid, by invoice month',`<div class="fig s" id="aPay"></div>`,`Follows the period filter (${esc(arPerTxt())}). Each bar = share of that month’s billed value (excl. VAT, net of credit notes) that Microfas still shows open on ${RD}. Older months should be near zero; a high bar in an old month is a collection problem. Click a bar for the invoices.`)}
   ${card('c6','Open items not in the tiles',`<div id="aLeg"></div>`,'')}
  </div>`;
  const ag=AGE.map((a,i)=>({l:a==='Current'?'Not yet due':a+' days late',v:A.by.get(a)||0,vt:`${eurS(A.by.get(a)||0)} · ${A.open?share((A.by.get(a)||0)/A.open*100):'—'}`,col:ACOL[i]}));
  $('#aAge').innerHTML=hbars(ag);$('#aAge').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>arProof('bucket',AGE[+e.dataset.k],null));
  $('#aTop').innerHTML=hbars(top.slice(0,12).map(([c,v])=>({l:X.customers[c][0],v,vt:eurS(v)})));$('#aTop').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>arProof('cust',null,top[+e.dataset.k][0]));
  ['aO','aV','a30','aC','aN'].forEach(id=>$('#'+id).onclick=()=>arProof({aO:'all',aV:'over',a30:'over30',aC:'credit',aN:'net'}[id],null,null));
  $('#aS').onclick=()=>{const M=new Map();for(const a of F){const m=a[2].slice(0,7);const x=M.get(m)||[0,0];x[0]+=a[4];x[1]+=a[6];M.set(m,x)}const ks=[...M.keys()].sort(),b=ks.reduce((s,m)=>s+M.get(m)[0],0),o=ks.reduce((s,m)=>s+M.get(m)[1],0);
    listProof('Revenue still to collect',`Revenue billed since ${S0} (excl. VAT, net of credit notes) and what Microfas still shows open on ${RD}, after open credits.`,[['Invoice month'],['Billed (excl. VAT)',1],['Still owed after credits',1],['Share',1]],ks.map(m=>[mLong(m),eur2(M.get(m)[0]),eur2(M.get(m)[1]),share(M.get(m)[0]?M.get(m)[1]/M.get(m)[0]*100:0)]),['Total',eur2(b),eur2(o),share(b?o/b*100:0)],b===billed&&o===A.net?`<b>✓ ${ks.length} months</b> add up to ${eur2(o)} of ${eur2(b)}, the tile’s ${share(sh)}`:`<b class="down">✗ Months differ from the tile</b>`)};
  const ex=R.cohortBalanceCents+R.legacyOpenCents+R.unallocatedOpenCents,inc=ex+R.vatInOpenItemsCents,tot=inc+R.matchedResidualCents,ok=tot===R.controlCents;
  $('#aRec').innerHTML=`<div>Open from invoices since ${S0.replace(/ \d{4}$/,'')}<b>${eur2(R.cohortBalanceCents)}</b></div><span class="op">+</span><div>Open from before ${S0.replace(/ \d{4}$/,'')}<b>${eur2(R.legacyOpenCents)}</b></div><span class="op">${R.unallocatedOpenCents<0?'−':'+'}</span><div>Open items without an invoice<b>${eur2(Math.abs(R.unallocatedOpenCents))}</b></div><span class="op">=</span><div class="eq">Receivables excl. VAT<b>${eur2(ex)}</b></div><span class="op">+</span><div>VAT on these items<b>${eur2(R.vatInOpenItemsCents)}</b></div><span class="op">=</span><div class="eq">Open items in Microfas, incl. VAT<b>${eur2(inc)}</b></div><span class="op">+</span><div>Matched items that do not net to zero<b>${eur2(R.matchedResidualCents)}</b></div><span class="op">=</span><div class="eq">Debtors account 132000<b>${eur2(R.controlCents)}</b></div><div class="${ok?'':'down'}" style="align-self:center;background:none">${ok?'✓ exact':'✗ off by '+eur2(R.controlCents-tot)}</div>`;
  $('#aRecN').innerHTML=`The debtors account is booked incl. VAT, so the VAT inside the open items is added back. Older items have no invoice lines available; their VAT uses the customer’s own VAT ratio (else its market’s). <b>Matched items that do not net to zero:</b> Microfas marks these postings as matched (settled), yet their amounts do not add up to zero, so they stay in the account balance. They are not owed by anyone according to Microfas’ own matching and are left out of receivables; the difference is for the bookkeeper to clear in Microfas.`;
  if(!pms.length)$('#aPay').innerHTML=`<p class="note">No invoices in ${esc(period().label)}. Receivables start with invoices of ${S0}.</p>`;
  else chart($('#aPay'),(s,W,H)=>columns(s,W,H,{labels:pms.map(m=>mLab(m)),series:[{vals:pms.map(m=>pm.get(m)[0]?pm.get(m)[1]/pm.get(m)[0]*100:0),col:'var(--a2)'}],axis:v=>NF0.format(v)+'%',tip:i=>{const x=pm.get(pms[i]);return`<b>Invoices of ${mLong(pms[i])}</b><br>${eur(x[1])} of ${eur(x[0])} still open, excl. VAT (${share(x[0]?x[1]/x[0]*100:0)})${x[3]?`<br>Paid so far: first payment after ${NF1.format(x[2]/x[3])} days on average`:''}`},click:i=>{const m=pms[i];const Q=FP.filter(a=>a[2].startsWith(m)&&a[6]>0).sort((a,b)=>b[6]-a[6]);listProof('Still open · invoices of '+mLong(m),`Invoices of one month that Microfas still shows open on ${RD}.`,[['Customer'],['Invoice'],['Date'],['Due'],['Open',1]],Q.map(a=>[esc(X.customers[a[0]][0]),esc(a[1]),a[2],a[3]||'—',eur2(a[6])]),['Total','','','',eur2(Q.reduce((s,a)=>s+a[6],0))],`<b>✓ ${Q.length} invoices</b> add up to ${eur2(Q.reduce((s,a)=>s+a[6],0))}, the bar’s ${eur2(pm.get(m)[1])}`)}}));
  const LG=X.legacy.filter(x=>cOK(x[0])),UA=X.unallocated.filter(x=>cOK(x[0]));
  $('#aLeg').innerHTML=`<p style="margin:0">Microfas still shows <b>${LG.length} items for ${eur(LG.reduce((s,x)=>s+x[2],0))}</b> open from invoices dated before ${S0} (the opening balance), and <b>${UA.length} items for ${eur(UA.reduce((s,x)=>s+x[3],0))}</b> open with no matching invoice, mostly payments received on account that are not yet set against an invoice. Both are excl. VAT and are part of the tie-out above, not of the tiles.</p><div class="seg" style="margin-top:8px"><button class="btn" id="aL1">Open from before ${S0.replace(/ \d{4}$/,'')}</button><button class="btn" id="aL2">Open items without an invoice</button></div>`;
  $('#aL1').onclick=()=>listProof(`Open from before ${S0}`,'Items Microfas still shows open from the opening balance (Beginbalans), net per invoice, excl. VAT. Original invoice dates are not available, so they are not aged.',[['Customer'],['Invoice'],['Open',1]],LG.sort((a,b)=>b[2]-a[2]).map(x=>[esc(X.customers[x[0]][0]),esc(x[1]),eur2(x[2])]),['Total',`${LG.length} items`,eur2(LG.reduce((s,x)=>s+x[2],0))],`<b>✓ ${LG.length} rows</b>`);
  $('#aL2').onclick=()=>listProof('Open items without an invoice','Open customer postings with no invoice reference, or a reference not found in billing, excl. VAT; dated by their last posting. Negative = received from the customer but not yet set against an invoice.',[['Customer'],['Date'],['Amount',1]],UA.map(x=>[esc(X.customers[x[0]][0]),x[1],eur2(x[3])]),['Total','',eur2(UA.reduce((s,x)=>s+x[3],0))],`<b>✓ ${UA.length} rows</b>`);
};
VIEWS.data=(pg)=>{const F=X.facts,tot=F.r.reduce((a,b)=>a+b,0);
  pg.innerHTML=`<h1>Where every number comes from</h1><p class="sub">Microfas extract of ${dLab(X.meta.snapshot)} (ledger through ${dLab(X.meta.ledgerThrough)}) plus the former sales portal for ${mLong(X.meta.portalMonths[0])} – ${mLong(X.meta.portalMonths[X.meta.portalMonths.length-1])}.</p>
  <div class="grid">
  ${card('c6','Definitions',`<div class="scroll"><table><tbody>
   <tr><td><b>Revenue</b></td><td>Signed revenue excl. VAT. Apr 2026 on: invoice lines on revenue accounts (Omzet…, Doorberekende kosten) in the billing journal, by invoice date. Jan 2025–Mar 2026: the former sales portal’s invoiced totals by invoice month.</td></tr>
   <tr><td><b>kg, tonnes</b></td><td>Delivered quantity on kg lines (Microfas) or the former sales portal’s tonnage. Returns are netted.</td></tr>
   <tr><td><b>€ per kg</b></td><td>Revenue ÷ kg over products sold by weight; always a ratio of sums.</td></tr>
   <tr><td><b>Comparison</b></td><td>Same months last year, or the same number of months before. A partial month is only compared with the same days of a month that has daily data; otherwise no comparison is shown.</td></tr>
   <tr><td><b>Verkoper</b></td><td>The customer’s current verkoper in Microfas, for all months, so periods compare on one basis. Customers with two verkopers show as “Multiple representatives”. Portal customers without a Microfas match keep the portal verkoper.</td></tr>
   <tr><td><b>Product group</b></td><td>Milk powder; Feed (Veevoeders, Aanvullende Veevoeders); Calf housing (Kalverhuisvesting, CalfOtel); Calf supplies (Milkbar, Kleine Kalverbenodigdheden, Overige Artikelen); Perfect Udder. Portal products use their Microfas category when matched.</td></tr>
   <tr><td><b>Active / new / lost</b></td><td>Active: net revenue above zero in the period. New: active and none in the 12 months before. Lost: active in the comparison period, not now.</td></tr>
   <tr><td><b>Receivables</b></td><td>Invoices dated from ${dLab(X.meta.arStart)}; all payments that reference the invoice up to the ledger date count, including payments made before the invoice date.</td></tr>
   <tr><td><b>Volumes</b></td><td>Tonnes for products sold by weight, pieces for products sold per unit, net of returns. Pro Elite = products named “Pro Elite …”. Calf pens &amp; hutches = the boxes, pens and CalfOTel hutches themselves, not wheels, gates, buckets or closures (the list is on the Volumes page).</td></tr>
   <tr><td><b>Buyers</b></td><td>Customers with a positive quantity of the chosen products in the period. New: buying now, not in the comparison period. Stopped: bought in the comparison period, not now.</td></tr>
   <tr><td><b>Average price</b></td><td>Revenue ÷ quantity, over products sold in that unit only.</td></tr>
   <tr><td><b>Reorder radar</b></td><td>Pairs with ≥3 order days since Apr 2026; late when days since last order &gt; 1,5 × the median gap, up to 120 days.</td></tr>
  </tbody></table></div>`)}
  ${card('c6','Data checks',`<div class="scroll"><table><thead><tr><th>Check</th><th class="n">Count</th><th class="n">Amount</th></tr></thead><tbody>${X.quality.map(q=>`<tr><td>${esc(QLBL[q.check]||q.check)}</td><td class="n">${NF0.format(q.count)}</td><td class="n">${q.amountCents?eur2(q.amountCents):'—'}</td></tr>`).join('')}</tbody></table></div>`,'Issues found in the source data. None changes a revenue total; each is either flagged or handled as described.')}
  ${card('c12','Coverage',`<div class="scroll"><table><thead><tr><th>Month</th><th>Source</th><th>Detail</th><th class="n">Revenue</th></tr></thead><tbody>${X.months.map((m,i)=>{let s=0;for(let j=0;j<X.n;j++)if(F.m[j]===i)s+=F.r[j];return`<tr><td>${mLong(m)}</td><td>${X.isPortalM[i]?'Former sales portal':'Microfas'}</td><td>${X.isPortalM[i]?'Monthly totals':i===X.partial.m?'Daily, to day '+X.partial.day:'Daily'}</td><td class="n">${eur2(s)}</td></tr>`}).join('')}<tr class="tot"><td>Total</td><td></td><td></td><td class="n">${eur2(tot)}</td></tr></tbody></table></div>`)}
  </div>`;
};
const PCSF=new Intl.NumberFormat('de-DE',{maximumFractionDigits:2});
const pcs=q=>PCSF.format(q/X.qScale)+' pcs';
const mFmt=col=>col==='r'?eur2:col==='k'?(v=>NF0.format(v)+' kg'):pcs;
const mDiv=col=>col==='r'?100:col==='k'?1:X.qScale;
const mVal=(K,col,c)=>col==='r'?(c?K.revC:K.rev):col==='k'?(c?K.kgC:K.kg):(c?K.qC:K.q);
const tOf=iso=>Date.UTC(+iso.slice(0,4),+iso.slice(5,7)-1,+iso.slice(8,10))/864e5;
const isoOf=t=>new Date(t*864e5).toISOString().slice(0,10);
const isoWeek=t=>{const d=new Date(t*864e5),day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day+3);const y=d.getUTCFullYear(),f=new Date(Date.UTC(y,0,4));return{y,w:1+Math.round(((d-f)/864e5-3+((f.getUTCDay()+6)%7))/7)}};
const shortD=t=>{const d=new Date(t*864e5);return d.getUTCDate()+' '+MN[d.getUTCMonth()]};
function pickW(w,o={}){if(!w)return null;if(w.kind==='m')return pick(w.list,o);const F=X.facts,out=[];
  for(let i=0;i<X.n;i++){const t=F.T[i];if(t==null||t<w.a||t>w.b)continue;if(!dimOK(i,o))continue;if(o.where&&!o.where(i))continue;out.push(i)}return out}
function winK(W,o={}){const cur=pickW(W.cur,o),cmp=pickW(W.cmp,o);
  return{P:{label:W.label,cmp:!!W.cmp,cmpLabel:W.cmpLabel},cur,cmp,rev:sum(cur,'r'),revC:sum(cmp,'r'),kg:sum(cur,'k'),kgC:sum(cmp,'k'),q:sum(cur,'q'),qC:sum(cmp,'q')}}
function winProof(title,def,W,o={},dims,col){proof({title,def,col,dims:dims||['customer','verkoper','group','product','market'],calc:()=>winK(W,o)})}
function invStats(w){if(!w)return null;const m=new Map();
  for(const [inv,mi,d,c,g,r] of X.invoices){
    if(w.kind==='m'){const cap=w.list.find(x=>x.m===mi);if(!cap||d>cap.cap)continue}else{if(!d)continue;const t=Date.UTC(+X.months[mi].slice(0,4),+X.months[mi].slice(5)-1,d)/864e5;if(t<w.a||t>w.b)continue}
    if(!cOK(c)||(st.grp&&GROUPS[g]!==st.grp))continue;
    const k=inv+'|'+c,x=m.get(k)||{inv,c,d:X.months[mi]+'-'+String(d).padStart(2,'0'),r:0};x.r+=r;m.set(k,x)}
  const all=[...m.values()];return{inv:all.filter(x=>x.r>0),cn:all.filter(x=>x.r<0),all}}
function newCust(w){const out=[];for(const [c,k] of X.first){if(!cOK(c))continue;const mi=Math.floor(k/100),d=k%100;
    if(w.kind==='m'){if(!w.list.some(x=>x.m===mi&&d<=x.cap))continue}else{if(!d)continue;const t=Date.UTC(+X.months[mi].slice(0,4),+X.months[mi].slice(5)-1,d)/864e5;if(t<w.a||t>w.b)continue}
    out.push(c)}return out}
function spark(vals,hiLast){const W=96,H=26,mx=Math.max(1,...vals.map(v=>Math.abs(v||0))),mn=Math.min(0,...vals.map(v=>v||0)),y=v=>H-2-((v||0)-mn)/(mx-mn||1)*(H-4),x=i=>2+i*(W-4)/Math.max(1,vals.length-1);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="trend"><polyline fill="none" stroke="var(--s1)" stroke-width="1.8" points="${vals.map((v,i)=>x(i)+','+y(v)).join(' ')}"/>${hiLast?`<circle cx="${x(vals.length-1)}" cy="${y(vals[vals.length-1])}" r="2.8" fill="var(--s1)"/>`:''}</svg>`}

function weekList(){const F=X.facts;let t0=Infinity;for(let i=0;i<X.n;i++)if(F.T[i]!=null&&F.T[i]<t0)t0=F.T[i];
  const lt=X.ltT,mon=t=>t-((new Date(t*864e5).getUTCDay()+6)%7),out=[];for(let a=mon(t0);a<=lt;a+=7){const b=Math.min(a+6,lt);out.push({a,b,full:a+6<=lt})}return out}
function insWindows(){const I=st.ins;
  if(I.mode==='week'){const L=weekList(),i=Math.min(I.sel??(L[L.length-1].full?L.length-1:L.length-2),L.length-1),w=L[i],iw=isoWeek(w.a),n=w.b-w.a+1;
    const cur={kind:'d',a:w.a,b:w.b},cmp=i>0?{kind:'d',a:w.a-7,b:w.b-7}:null,piw=isoWeek(w.a-7);
    return{L,i,unit:'week',cur,cmp,label:`Week ${iw.w} · ${shortD(w.a)}–${shortD(w.b)} ${new Date(w.b*864e5).getUTCFullYear()}${w.full?'':` (${n} day${n>1?'s':''} so far)`}`,
      cmpLabel:cmp?`week ${piw.w}${w.full?'':` (same ${n} day${n>1?'s':''})`}`:'',why:cmp?'':'The week before has no daily data (portal months only).',partial:!w.full,
      hist:L.slice(Math.max(0,i-7),i+1).map(x=>({kind:'d',a:x.a,b:x.b,lab:'W'+isoWeek(x.a).w,full:x.full})),trend:L.slice(Math.max(0,i-11),i+1).map((x,j,arr)=>({kind:'d',a:x.a,b:x.b,lab:'W'+isoWeek(x.a).w,full:x.full,idx:i-arr.length+1+j}))}}
  const lastFull=X.lastFull,i=Math.min(I.selM??lastFull,X.nM-1),part=i===X.partial.m,cap=part?X.partial.day:99;
  const cur={kind:'m',list:[{m:i,cap}]};let cmp=null,why='';
  if(i>0){if(part&&X.isPortalM[i-1])why='Previous month has monthly totals only.';else cmp={kind:'m',list:[{m:i-1,cap}]}}else why='No earlier month in the data.';
  const py=!part&&i>=12?{kind:'m',list:[{m:i-12,cap:99}]}:null;
  return{i,unit:'month',cur,cmp,py,label:mLong(X.months[i])+(part?` (1–${cap})`:''),cmpLabel:cmp?mLong(X.months[i-1])+(part?` (1–${cap})`:''):'',why,partial:part,
    hist:Array.from({length:Math.min(8,i+1)},(_,j)=>{const m=i-Math.min(8,i+1)+1+j;return{kind:'m',list:[{m,cap:m===X.partial.m?X.partial.day:99}],lab:mLab(X.months[m]),full:m!==X.partial.m}}),
    trend:Array.from({length:Math.min(13,i+1)},(_,j)=>{const m=i-Math.min(13,i+1)+1+j;return{kind:'m',list:[{m,cap:m===X.partial.m?X.partial.day:99}],lab:mLab(X.months[m]),full:m!==X.partial.m,idx:m}})}}
VIEWS.insights=(pg)=>{const W=insWindows(),F=X.facts,K=winK(W),u=W.unit;
  const portalSel=u==='month'&&X.isPortalM[W.i],portalPrev=u==='month'&&W.i>0&&X.isPortalM[W.i-1];
  const IS=invStats(W.cur),ISp=invStats(W.cmp),NC=newCust(W.cur),NCp=W.cmp?newCust(W.cmp):null;
  const cr=custRev(K.cur),crp=custRev(K.cmp),credits=[...cr].filter(([,v])=>v<0).sort((a,b)=>a[1]-b[1]),credTot=credits.reduce((s,x)=>s+x[1],0);
  const mpI=K.cur.filter(i=>F.G[i]===0),mpP=K.cmp?K.cmp.filter(i=>F.G[i]===0):null,mpT=sum(mpI,'k'),mpTp=mpP?sum(mpP,'k'):null;
  const vr=by(K.cur,i=>F.v[i],'r'),vrp=by(K.cmp,i=>F.v[i],'r'),reps=[...vr].sort((a,b)=>b[1]-a[1]),top3=reps.slice(0,3).reduce((s,x)=>s+x[1],0);
  const topC=[...cr].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const PY=W.py?winK({cur:W.py,cmp:null,label:'',cmpLabel:''}):null;
  const OO=openOrders(),past=lateOrders(OO);
  const g=growth(K.rev,K.revC);
  const nc=NC.map(c=>[c,cr.get(c)||0]).sort((a,b)=>b[1]-a[1]);
  let nar=`<b>${eur(K.rev)}</b> invoiced in ${esc(W.label)}`+(K.cmp?`, <b class="${K.rev>=K.revC?'up':'down'}">${pct(Math.abs(g)).replace('+','')} ${K.rev>=K.revC?'higher':'lower'}</b> than ${esc(W.cmpLabel)} (${eur(K.revC)})`:'')+'.';
  if(reps[0])nar+=` ${esc(X.verkopers[reps[0][0]])} led with ${eur(reps[0][1])}`+(reps[1]?`, ahead of ${esc(X.verkopers[reps[1][0]])} (${eur(reps[1][1])})`:'')+'.';
  if(topC[0])nar+=` Biggest customer: ${esc(X.customers[topC[0][0]][0])} (${eur(topC[0][1])}).`;
  if(nc.length)nar+=` ${nc.length} new customer${nc.length>1?'s':''}, the largest ${esc(X.customers[nc[0][0]][0])} (${eur(nc[0][1])}).`;
  if(mpT||mpTp)nar+=` Milk powder: ${ton(mpT)}`+(mpTp!=null?` vs ${ton(mpTp)}`:'')+'.';
  if(credits.length)nar+=` ${credits.length} customer${credits.length>1?'s':''} with a net credit (${eur(credTot)}).`;
  if(past.length)nar+=` <b>${past.length} sales order${past.length>1?'s are':' is'} late</b> (snapshot); ${unbilled(OO).length} delivered orders await invoicing.`;
  const opts=u==='week'?W.L.map((w,i)=>`<option value="${i}" ${i===W.i?'selected':''}>Week ${isoWeek(w.a).w} · ${shortD(w.a)}–${shortD(w.b)} ${new Date(w.b*864e5).getUTCFullYear()}${w.full?'':' (so far)'}</option>`).reverse().join(''):X.months.map((m,i)=>`<option value="${i}" ${i===W.i?'selected':''}>${mLong(m)}${i===X.partial.m?' (so far)':''}</option>`).reverse().join('');
  pg.innerHTML=`<h1>${esc(u==='week'?'Weekly':'Monthly')} insights · ${esc(W.label)}</h1>
  <div class="seg" style="margin:0 0 10px;align-items:center"><button class="btn ${u==='week'?'on':''}" id="iW">Weekly</button><button class="btn ${u==='month'?'on':''}" id="iM">Monthly</button>
   <label for="iSel" style="font-size:13px;color:var(--muted);margin-left:8px">${u==='week'?'Week':'Month'}</label><select id="iSel" class="search" style="width:auto;font-size:14px">${opts}</select></div>
  <p class="sub" style="font-size:15px;color:var(--ink);max-width:980px">${nar}</p>
  <p class="sub">${W.cmp?'Compared with '+esc(W.cmpLabel)+(W.partial?' — same number of days, like for like':''):esc(W.why)} · ${esc(filtTxt())}. ${u==='week'?'Weeks run Monday–Sunday; daily data starts April 2026.':''} The period filter at the top does not apply here; this page has its own ${u} picker.</p>
  <div class="kpis">
   ${kpiTile('iRev','Revenue',eurS(K.rev),deltaHTML(K.rev,K.revC,{cmp:W.cmp}),PY?`vs ${mLong(X.months[W.i-12])}: ${pct(growth(K.rev,PY.rev))}`:(u==='week'?'Invoiced, excl. VAT':''))}
   ${portalSel?kpiTile('iInv','Invoices issued','—','<span class="na">Portal months have no invoice detail</span>',''):kpiTile('iInv','Invoices issued',NF0.format(IS.inv.length),ISp&&!portalPrev?deltaHTML(IS.inv.length,ISp.inv.length,{cmp:true},v=>NF0.format(v)):'<span class="na">No comparison</span>',`${NF0.format(IS.cn.length)} credit notes`)}
   ${kpiTile('iMp','Milk powder',ton(mpT),mpTp!=null?deltaHTML(mpT,mpTp,{cmp:true},ton):'<span class="na">No comparison</span>','Tonnes invoiced')}
   ${kpiTile('iNew','New customers',NF0.format(NC.length),`<span class="${NC.length?'up':'na'}">${eurS(nc.reduce((s,x)=>s+x[1],0))}</span>${NCp?` <span class="na">(prev. ${NCp.length})</span>`:''}`,'First purchase since Jan 2025')}
   ${kpiTile('iCr','Net credits',NF0.format(credits.length),`<span class="${credits.length?'down':'na'}">${eurS(credTot)}</span>`,'Customers with negative net revenue')}
   ${kpiTile('iTop','Top-3 verkoper share',K.rev>0?share(top3/K.rev*100):'—',`<span class="na">${reps.slice(0,3).map(x=>esc(X.verkopers[x[0]].split(' ')[0])).join(', ')}</span>`,'Of revenue in the '+u)}
  </div>
  <div class="grid">
   ${card('c7',`Revenue trend · last ${W.trend.length} ${u}s`,`<div class="fig s" id="iTr"></div>`,`Average ${eurS(W.trend.filter(x=>x.full).reduce((s,x)=>s+sum(pickW(x),'r'),0)/Math.max(1,W.trend.filter(x=>x.full).length))} per complete ${u}. Click a bar to open that ${u}.`)}
   ${card('c5',`Product groups this ${u}`,`<div id="iCat"></div>`+(K.cmp?legend([['This '+u,'var(--s1)'],['Previous (tick)','var(--ink)']]):''),'Click a group for its rows.')}
   ${card('c12',`How each verkoper is moving, ${u} by ${u}`,`<div class="scroll tbox" id="iRep"></div>`,`Trend line = revenue in the last ${W.hist.length} ${u}s. “vs average” compares with the average of the earlier complete ${u}s in that line${W.partial?'; not shown for a '+u+' still in progress':''}. Click a row for its rows.`)}
   ${card('c6',`Top customers this ${u}`,`<div class="scroll" id="iCus"></div>`)}
   ${card('c6',`New customers and credits`,`<div class="scroll tbox" id="iNC"></div>`)}
  </div>`;
  $('#iW').onclick=()=>{st.ins.mode='week';render()};$('#iM').onclick=()=>{st.ins.mode='month';render()};
  $('#iSel').onchange=e=>{if(u==='week')st.ins.sel=+e.target.value;else st.ins.selM=+e.target.value;render()};
  $('#iRev').onclick=()=>winProof('Revenue · '+W.label,'Invoiced revenue in the '+u+'.',W);
  $('#iMp').onclick=()=>winProof('Milk powder kg · '+W.label,'Kilograms of milk powder invoiced.',W,{grp:'Milk powder'},['customer','verkoper','product'],'k');
  if(!portalSel)$('#iInv').onclick=()=>{const R=[...IS.all].sort((a,b)=>b.r-a.r);listProof('Invoices · '+W.label,'Each invoice (or credit note) dated in the '+u+', net of its revenue lines. Positive = invoice, negative = credit note.',[['Invoice'],['Date'],['Customer'],['Verkoper'],['Net revenue',1]],R.map(x=>[esc(x.inv),x.d,esc(X.customers[x.c][0]),esc(X.customers[x.c][2]),eur2(x.r)]),['Total',`${IS.inv.length} invoices · ${IS.cn.length} credit notes`,'','',eur2(R.reduce((s,x)=>s+x.r,0))],`<b>✓ ${R.length} documents</b>; net total equals the ${u}’s revenue ${eur2(K.rev)}${R.reduce((s,x)=>s+x.r,0)===K.rev?' exactly':''}.`)};
  const ncProof=()=>listProof('New customers · '+W.label,'Customers whose first invoice line with positive revenue in the data (from Jan 2025) falls in this '+u+'. Credits: customers whose net revenue in the '+u+' is negative.',[['Type'],['Customer'],['Verkoper'],['Market'],['Revenue',1]],[...nc.map(([c,v])=>['New',esc(X.customers[c][0]),esc(X.customers[c][2]),esc(X.customers[c][1]),eur2(v)]),...credits.map(([c,v])=>['Credit',esc(X.customers[c][0]),esc(X.customers[c][2]),esc(X.customers[c][1]),eur2(v)])],null,`<b>✓ ${nc.length} new · ${credits.length} credits</b>`);
  $('#iNew').onclick=ncProof;$('#iCr').onclick=ncProof;
  $('#iTop').onclick=()=>winProof('Revenue by verkoper · '+W.label,'Revenue per verkoper in the '+u+'.',W,{},['verkoper','customer','group']);
  const tv=W.trend.map(x=>sum(pickW(x),'r'));
  chart($('#iTr'),(s,Wd,H)=>columns(s,Wd,H,{labels:W.trend.map(x=>x.lab+(x.full?'':'*')),series:[{vals:tv,col:'var(--s1)'}],hl:i=>i===W.trend.length-1,axis:v=>eurS(v),
    tip:i=>`<b>${esc(W.trend[i].lab)}${W.trend[i].full?'':' (so far)'}</b><br>${eur(tv[i])}${i>0?`<br>vs previous: ${pct(growth(tv[i],tv[i-1]))}${W.trend[i].full?'':' (not like for like)'}`:''}`,
    click:i=>{const t=W.trend[i];if(u==='week')st.ins.sel=t.idx;else st.ins.selM=t.idx;render()}}));
  const gc=by(K.cur,i=>F.G[i],'r'),gp=by(K.cmp,i=>F.G[i],'r'),grs=GROUPS.map((n,i)=>({l:n,v:gc.get(i)||0,c:K.cmp?(gp.get(i)||0):null,vt:`${eurS(gc.get(i)||0)}${K.cmp?' '+pct(growth(gc.get(i)||0,gp.get(i)||0)):''}`,col:GCOL[i],gi:i})).filter(r=>r.v||r.c);
  $('#iCat').innerHTML=hbars(grs);$('#iCat').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>winProof(grs[+e.dataset.k].l+' · '+W.label,'Revenue of one product group.',W,{grp:grs[+e.dataset.k].l},['customer','product','verkoper']));
  const hist=W.hist.map(h=>by(pickW(h),i=>F.v[i],'r')),mpv=by(mpI,i=>F.v[i],'k'),cust=new Map();for(const [c,v] of cr)if(v>0){const r=X.customers[c][2];}
  const vc=new Map();{const m=new Map();for(const i of K.cur){const k=F.v[i]+'|'+F.c[i];m.set(k,(m.get(k)||0)+F.r[i])}for(const [k,v] of m)if(v>0){const r=+k.split('|')[0];vc.set(r,(vc.get(r)||0)+1)}}
  const ids=[...new Set([...vr.keys(),...vrp.keys()])].sort((a,b)=>(vr.get(b)||0)-(vr.get(a)||0));
  const prevFull=W.hist.slice(0,-1).map((h,j)=>({h,j})).filter(x=>x.h.full);
  const tot=ids.reduce((s,v)=>s+(vr.get(v)||0),0),totp=ids.reduce((s,v)=>s+(vrp.get(v)||0),0);
  $('#iRep').innerHTML=`<table><thead><tr><th>Verkoper</th><th>Last ${W.hist.length} ${u}s</th><th class="n">This ${u}</th>${K.cmp?`<th class="n">Previous</th><th class="n">Change</th>`:''}<th class="n">vs average</th><th class="n">Milk powder</th><th class="n">Customers</th></tr></thead><tbody>
   ${ids.map(v=>{const a=vr.get(v)||0,b=vrp.get(v)||0,av=prevFull.length?prevFull.reduce((s,x)=>s+(hist[x.j].get(v)||0),0)/prevFull.length:null;
     return`<tr class="click" data-v="${v}"><td style="white-space:nowrap">${esc(X.verkopers[v])}</td><td>${spark(hist.map(h=>h.get(v)||0),true)}</td><td class="n">${eur(a)}</td>${K.cmp?`<td class="n">${eur(b)}</td><td class="n ${a>b?'up':a<b?'down':''}">${a-b>0?'+':a-b<0?'−':''}${eurS(Math.abs(a-b))}</td>`:''}<td class="n ${W.partial||av==null?'':a>=av?'up':'down'}">${W.partial||av==null?'—':pct(growth(a,av))}</td><td class="n">${mpv.get(v)?ton(mpv.get(v)):'—'}</td><td class="n">${vc.get(v)||0}</td></tr>`}).join('')}
   <tr class="tot"><td>Total</td><td>${spark(hist.map(h=>[...h.values()].reduce((s,x)=>s+x,0)),true)}</td><td class="n">${eur(tot)}</td>${K.cmp?`<td class="n">${eur(totp)}</td><td class="n">${tot-totp>0?'+':tot-totp<0?'−':''}${eurS(Math.abs(tot-totp))}</td>`:''}<td></td><td class="n">${ton(mpT)}</td><td class="n">${activeSet(cr).size}*</td></tr></tbody></table><p class="note">* A customer served by two verkopers counts once in the total.</p>`;
  if(tot!==K.rev)$('#iRep').insertAdjacentHTML('beforeend','<p class="down">Table total does not match revenue.</p>');
  $('#iRep').querySelectorAll('tr[data-v]').forEach(tr=>tr.onclick=()=>winProof(X.verkopers[+tr.dataset.v]+' · '+W.label,'Revenue of one verkoper in the '+u+'.',W,{rep:X.verkopers[+tr.dataset.v]},['customer','product','group']));
  $('#iCus').innerHTML=topC.length?`<table><thead><tr><th>Customer</th><th>Verkoper</th><th class="n">This ${u}</th>${K.cmp?'<th class="n">Previous</th>':''}</tr></thead><tbody>${topC.map(([c,v])=>`<tr class="click" data-c="${c}"><td>${esc(X.customers[c][0])}</td><td>${esc(X.customers[c][2])}</td><td class="n">${eur(v)}</td>${K.cmp?`<td class="n">${eur(crp.get(c)||0)}</td>`:''}</tr>`).join('')}</tbody></table>`:'<div class="empty">No revenue.</div>';
  $('#iCus').querySelectorAll('tr[data-c]').forEach(tr=>tr.onclick=()=>custCard(+tr.dataset.c));
  $('#iNC').innerHTML=(nc.length||credits.length)?`<table><thead><tr><th></th><th>Customer</th><th>Verkoper</th><th class="n">Revenue</th></tr></thead><tbody>${nc.map(([c,v])=>`<tr class="click" data-c="${c}"><td><span class="tag">New</span></td><td>${esc(X.customers[c][0])}</td><td>${esc(X.customers[c][2])}</td><td class="n">${eur(v)}</td></tr>`).join('')}${credits.map(([c,v])=>`<tr class="click" data-c="${c}"><td><span class="tag">Credit</span></td><td>${esc(X.customers[c][0])}</td><td>${esc(X.customers[c][2])}</td><td class="n down">${eur(v)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No new customers or net credits.</div>';
  $('#iNC').querySelectorAll('tr[data-c]').forEach(tr=>tr.onclick=()=>custCard(+tr.dataset.c));
};

const PEN=/(k[äa]lber|kalver)(einzel)?box|gruppenbucht|k[äa]lberboxen|quattro|duobox|duo-box|cuddle box|deluxe box|trio box|flex box|^calfotel (comfort|xl-5 (met|mit)|xl-5 lose|plus)/i;
const LINE_IDS={proElite:'proelite',milkPowder:'mp',feed:'feed',calfPens:'boxes',calfHousing:'ch',calfSupplies:'cs',perfectUdder:'pu'};
function volPresets(){if(X.lines&&X.lines.length)return[...X.lines.map(l=>[LINE_IDS[l.key]||l.key,l.label,new Set(l.products)]),['custom','Pick products',null]];
  return volPresetsByName()}
function volPresetsByName(){const P=X.products,gOf=i=>P[i][1]>=0?X.gOfCat[P[i][1]]:5,sel=f=>new Set(P.map((_,i)=>i).filter(f));
  return[['proelite','Pro Elite milk powder',sel(i=>/^pro elite/i.test(P[i][0]))],['mp','All milk powder',sel(i=>gOf(i)===0)],['feed','Feed',sel(i=>gOf(i)===1)],
   ['boxes','Calf pens & hutches',sel(i=>gOf(i)===2&&PEN.test(P[i][0])&&!/set duoboxen|futterbox/i.test(P[i][0]))],['ch','All calf housing',sel(i=>gOf(i)===2)],['cs','Calf supplies',sel(i=>gOf(i)===3)],['pu','Perfect Udder',sel(i=>gOf(i)===4)],['custom','Pick products',null]]}
const LINE_GRP={proElite:0,milkPowder:0,feed:1,calfPens:2,calfHousing:2,calfSupplies:3,perfectUdder:4};let _pg=null;
const gOfP=i=>{if(!_pg){_pg=new Map();for(const l of X.lines||[])if(LINE_GRP[l.key]!=null)for(const p of l.products)_pg.set(p,LINE_GRP[l.key])}
  return X.products[i][1]>=0?X.gOfCat[X.products[i][1]]:(_pg.has(i)?_pg.get(i):5)};
VIEWS.volumes=(pg,P)=>{const F=X.facts,V=st.vol,gi=st.grp?GROUPS.indexOf(st.grp):-1,inG=p=>gi<0||gOfP(p)===gi,
  PR=volPresets().map(x=>[x[0],x[1],x[2]&&new Set([...x[2]].filter(inG))]).filter(x=>!x[2]||x[2].size),
  pr=PR.find(x=>x[0]===V.preset)||PR[0],sel=pr[2]||new Set([...V.custom].filter(inG)),o={grp:'',where:i=>sel.has(F.p[i])};
  const K=salesKPI(o),kgP=K.kg!==0||K.kgC!==0,qP=K.q!==0||K.qC!==0,main=kgP?'k':'q',dv=main==='k'?1000:X.qScale,uS=main==='k'?' t':' pcs',qf=v=>main==='k'?ton(v):pcs(v);
  const unitRow=i=>main==='k'?X.kgProd.has(F.p[i]):!X.kgProd.has(F.p[i]);
  const agg=(ix,key)=>{const m=new Map();if(!ix)return m;for(const i of ix){const k=key(i);const x=m.get(k)||{k:0,q:0,r:0,ur:0,uq:0};x.k+=F.k[i];x.q+=F.q[i];x.r+=F.r[i];if(unitRow(i)){x.ur+=F.r[i];x.uq+=F[main][i]}m.set(k,x)}return m};
  const A=agg(K.cur,i=>F.v[i]),B=agg(K.cmp,i=>F.v[i]),Z={k:0,q:0,r:0,ur:0,uq:0},g=(m,k)=>m.get(k)||Z,mq=x=>main==='k'?x.k:x.q;
  const cv=(ix)=>{const m=new Map();if(!ix)return m;for(const i of ix){const k=F.v[i]+'|'+F.c[i];m.set(k,(m.get(k)||0)+F[main][i])}const s=new Map();for(const [k,v] of m)if(v>0){const [r,c]=k.split('|').map(Number);if(!s.has(r))s.set(r,new Set());s.get(r).add(c)}return s};
  const BC=cv(K.cur),BP=cv(K.cmp),allB=new Set([...BC.values()].flatMap(s=>[...s])),allBP=new Set([...BP.values()].flatMap(s=>[...s]));
  const ids=[...new Set([...A.keys(),...B.keys()])].filter(v=>{const a=g(A,v),b=g(B,v);return a.k||a.q||a.r||b.k||b.q||b.r}).sort((a,b)=>mq(g(A,b))-mq(g(A,a)));
  const pk=by(K.cur,i=>F.p[i],'k'),pq=by(K.cur,i=>F.p[i],'q'),prods=[...sel].filter(p=>pk.get(p)||pq.get(p)).sort((a,b)=>((pk.get(b)||0)/1000+(pq.get(b)||0)/X.qScale)-((pk.get(a)||0)/1000+(pq.get(a)||0)/X.qScale));
  const top=ids[0],qty=(k,q)=>[k?ton(k):'',q?pcs(q):''].filter(Boolean).join(' · ')||'0';
  const uprice=x=>x.uq?(main==='k'?'€ '+NF2.format(x.ur/x.uq/100)+'/kg':'€ '+NF2.format(x.ur/(x.uq/X.qScale)/100)+'/pc'):'—';
  const tA={k:K.kg,q:K.q,r:K.rev,ur:0,uq:0};for(const x of A.values()){tA.ur+=x.ur;tA.uq+=x.uq}
  pg.innerHTML=`<h1>${esc(pr[1])}: ${esc(qty(K.kg,main==='q'?K.q:0))} sold in ${esc(P.label)}${K.cmp&&mVal(K,main)!==0?`, ${pct(growth(mVal(K,main),mVal(K,main,1)))} vs ${esc(P.cmpLabel)}`:''}</h1>
  <p class="sub">Quantities for the products you choose: tonnes for products sold by weight, pieces for products sold per unit, net of returns. ${esc(filtTxt())}.${st.grp?` Only ${esc(st.grp)} products are offered below; choose “All product groups” to see the others.`:''}</p>
  <div class="seg" id="vP" style="margin-bottom:8px">${PR.map(x=>`<button class="btn ${x[0]===pr[0]?'on':''}" data-p="${x[0]}">${esc(x[1])}${x[2]?` <span class="na">(${x[2].size})</span>`:''}</button>`).join('')}</div>
  <div id="vPick"></div>
  <details style="margin:4px 0 14px"><summary style="cursor:pointer;font-size:13.5px;color:var(--link)">Products included: ${sel.size}${pr[0]==='boxes'?' — the pens, boxes and hutches themselves (Kälbereinzelbox, Gruppenbucht, Quattro, Duobox, CalfOTel hutches…); wheels, gates, bucket rings, closures and connection sets are left out. Adjust with “Pick products”.':''}</summary><div class="scroll" style="max-height:240px;margin-top:6px"><table><tbody>${[...sel].sort((a,b)=>X.products[a][0].localeCompare(X.products[b][0])).map(p=>`<tr><td>${esc(X.products[p][0])}</td><td>${esc(X.products[p][1]>=0?X.categories[X.products[p][1]][0]:'—')}</td><td class="n">${qty(pk.get(p)||0,pq.get(p)||0)}</td></tr>`).join('')}</tbody></table></div></details>
  <div class="kpis">${kgP?kpiTile('vT','Tonnes',ton(K.kg),deltaHTML(K.kg,K.kgC,P,ton),'Net of returns'):''}${qP?kpiTile('vQ','Pieces',pcs(K.q),deltaHTML(K.q,K.qC,P,pcs),'Units sold per piece'):''}
   ${kpiTile('vR','Revenue',eurS(K.rev),deltaHTML(K.rev,K.revC,P),'Average '+uprice(tA))}
   ${kpiTile('vC','Buyers',NF0.format(allB.size),K.cmp?`<span class="na">${[...allB].filter(c=>!allBP.has(c)).length} new · ${[...allBP].filter(c=>!allB.has(c)).length} stopped</span>`:'<span class="na">No comparison</span>','Customers with positive quantity')}
   ${top!=null?kpiTile('vTop','Top verkoper',esc(X.verkopers[top].split(' ')[0]),`<span class="na">${qf(mq(g(A,top)))}</span>`,mVal(K,main)?share(mq(g(A,top))/mVal(K,main)*100)+' of the volume':''):''}</div>
  <div class="grid">
   ${card('c12','Volume per verkoper',`<div class="scroll" id="vTab"></div>`,'Average price = revenue ÷ quantity of products sold in that unit. New buyers bought now but not in the comparison period; stopped bought then but not now. Click a row for its customers and products.',`<button class="btn" id="vCopy">Copy table</button>`)}
   ${card('c8',`${main==='k'?'Tonnes':'Pieces'} per verkoper over time`,`<div class="fig s" id="vTr"></div><div id="vTrL"></div>`,'Top five verkopers by volume in the period; the others are combined.',`<div class="seg"><button class="btn ${V.gran!=='week'?'on':''}" id="vGm">Monthly</button><button class="btn ${V.gran==='week'?'on':''}" id="vGw">Weekly</button></div>`)}
   ${card('c4',`${main==='k'?'Tonnes':'Pieces'} per market`,`<div id="vMk"></div>`,'Click a market to filter the cockpit.')}
   ${card('c12','Volume per customer',`<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="search" id="vCq" placeholder="Search customer" aria-label="Search customer"><div class="seg"><button class="btn ${V.cf!=='new'&&V.cf!=='lost'?'on':''}" data-cf="all">All buyers</button><button class="btn ${V.cf==='new'?'on':''}" data-cf="new">New buyers</button><button class="btn ${V.cf==='lost'?'on':''}" data-cf="lost">Stopped buying</button></div></div><div class="scroll tbox" id="vCu"></div>`,'Who buys the selected products, with their verkoper and market. Click a row for the customer card.')}
   ${card('c12','Verkoper × product',`<div class="scroll tbox" id="vMx"></div>`,'Quantity per product in its own unit. Click a cell for its customers.')}
  </div>`;
  $('#vP').querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(b.dataset.p==='custom'&&pr[0]!=='custom'&&![...V.custom].some(inG))V.custom=new Set([...V.custom,...sel]);V.preset=b.dataset.p;render()});
  if(pr[0]==='custom'){const all=[...new Set(F.p)].filter(inG).sort((a,b)=>X.products[a][0].localeCompare(X.products[b][0]));
    $('#vPick').innerHTML=`<div class="card" style="margin-bottom:10px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="search" id="vS" placeholder="Search products" aria-label="Search products"><button class="btn" id="vClr">Clear</button><span class="note">${sel.size} selected${st.grp?` in ${esc(st.grp)}`:''}</span></div><div class="scroll" style="max-height:230px" id="vList"></div></div>`;
    const draw=q=>{const L=all.filter(i=>!q||X.products[i][0].toLowerCase().includes(q)).slice(0,250);$('#vList').innerHTML=L.map(i=>`<label style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:13.5px"><input type="checkbox" data-i="${i}" ${V.custom.has(i)?'checked':''}> ${esc(X.products[i][0])} <span class="na">${esc(X.products[i][1]>=0?X.categories[X.products[i][1]][0]:'')}</span></label>`).join('');
      $('#vList').querySelectorAll('input').forEach(c=>c.onchange=()=>{const i=+c.dataset.i;c.checked?V.custom.add(i):V.custom.delete(i);render()})};
    draw(V.q||'');$('#vS').value=V.q||'';$('#vS').oninput=e=>{V.q=e.target.value.trim().toLowerCase();draw(V.q)};$('#vClr').onclick=()=>{V.custom=new Set([...V.custom].filter(p=>!inG(p)));render()}}
  const vp=(title,ex,col)=>proof({title,def:'Quantities of the selected products.',col,dims:['customer','product','month','market','verkoper'],calc:()=>salesKPI({...o,...ex})});
  if($('#vT'))$('#vT').onclick=()=>vp('Tonnes · '+pr[1],{},'k');if($('#vQ'))$('#vQ').onclick=()=>vp('Pieces · '+pr[1],{},'q');$('#vR').onclick=()=>vp('Revenue · '+pr[1],{},'r');
  if($('#vTop'))$('#vTop').onclick=()=>vp(X.verkopers[top]+' · '+pr[1],{rep:X.verkopers[top]},main);
  const T=(a,b)=>K.cmp?`<td class="n ${a>b?'up':a<b?'down':''}">${pct(growth(a,b))}</td>`:'';
  const nb=v=>{const a=BC.get(v)||new Set(),b=BP.get(v)||new Set();return[a.size,[...a].filter(c=>!b.has(c)).length,[...b].filter(c=>!a.has(c)).length]};
  const head=['Verkoper',...(kgP?['Tonnes',...(K.cmp?['Comparison','Change']:[])]:[]),...(qP?['Pieces',...(K.cmp?['Comparison','Change']:[])]:[]),'Revenue','Avg price','Share',' Buyers',...(K.cmp?['New','Stopped']:[])];
  const totNB=[allB.size,[...allB].filter(c=>!allBP.has(c)).length,[...allBP].filter(c=>!allB.has(c)).length];
  $('#vTab').innerHTML=ids.length?`<table><thead><tr>${head.map((h,j)=>`<th class="${j?'n':''}">${h.trim()}</th>`).join('')}</tr></thead><tbody>
   ${ids.map(v=>{const a=g(A,v),b=g(B,v),n=nb(v);return`<tr class="click" data-v="${v}"><td style="white-space:nowrap">${esc(X.verkopers[v])}</td>${kgP?`<td class="n">${ton(a.k)}</td>${K.cmp?`<td class="n">${ton(b.k)}</td>${T(a.k,b.k)}`:''}`:''}${qP?`<td class="n">${pcs(a.q)}</td>${K.cmp?`<td class="n">${pcs(b.q)}</td>${T(a.q,b.q)}`:''}`:''}<td class="n">${eur(a.r)}</td><td class="n">${uprice(a)}</td><td class="n">${mVal(K,main)?share(mq(a)/mVal(K,main)*100):'—'}</td><td class="n">${n[0]}</td>${K.cmp?`<td class="n">${n[1]}</td><td class="n">${n[2]}</td>`:''}</tr>`}).join('')}
   <tr class="tot"><td>Total</td>${kgP?`<td class="n">${ton(K.kg)}</td>${K.cmp?`<td class="n">${ton(K.kgC)}</td>${T(K.kg,K.kgC)}`:''}`:''}${qP?`<td class="n">${pcs(K.q)}</td>${K.cmp?`<td class="n">${pcs(K.qC)}</td>${T(K.q,K.qC)}`:''}`:''}<td class="n">${eur(K.rev)}</td><td class="n">${uprice(tA)}</td><td class="n">100,0 %</td><td class="n">${totNB[0]}*</td>${K.cmp?`<td class="n">${totNB[1]}*</td><td class="n">${totNB[2]}*</td>`:''}</tr></tbody></table><p class="note">* Distinct customers; a customer served by two verkopers counts once.</p>`:'<div class="empty">No sales of the selected products in this period.</div>';
  const chk=[...A.values()].reduce((s,x)=>s+x.k,0)===K.kg&&[...A.values()].reduce((s,x)=>s+x.q,0)===K.q&&[...A.values()].reduce((s,x)=>s+x.r,0)===K.rev;
  if(!chk)$('#vTab').insertAdjacentHTML('beforeend','<p class="down">Table total does not match.</p>');
  $('#vTab').querySelectorAll('tr[data-v]').forEach(tr=>tr.onclick=()=>vp(X.verkopers[+tr.dataset.v]+' · '+pr[1],{rep:X.verkopers[+tr.dataset.v]},main));
  $('#vCopy').onclick=()=>copyRows([head.map(h=>h.trim()),...ids.map(v=>{const a=g(A,v),b=g(B,v),n=nb(v);return[X.verkopers[v],...(kgP?[a.k/1000,...(K.cmp?[b.k/1000,'']:[])]:[]),...(qP?[a.q/X.qScale,...(K.cmp?[b.q/X.qScale,'']:[])]:[]),a.r/100,uprice(a).replace(/ /g,' '),'',n[0],...(K.cmp?[n[1],n[2]]:[])]})]);
  const t5=ids.slice(0,5);let labs,keys,kf;
  if(V.gran==='week'){const ws=new Set();for(const i of K.cur)if(F.T[i]!=null)ws.add(F.T[i]-((new Date(F.T[i]*864e5).getUTCDay()+6)%7));keys=[...ws].sort((a,b)=>a-b);labs=keys.map(t=>shortD(t));kf=i=>F.T[i]==null?null:F.T[i]-((new Date(F.T[i]*864e5).getUTCDay()+6)%7)}
  else{keys=P.cur.map(c=>c.m);labs=keys.map(m=>mLab(X.months[m]));kf=i=>F.m[i]}
  const mvv=new Map();for(const i of K.cur){const k=kf(i);if(k==null)continue;const v=t5.includes(F.v[i])?F.v[i]:-1;mvv.set(v+'|'+k,(mvv.get(v+'|'+k)||0)+F[main][i])}
  const ser=[...t5.map((v,j)=>({name:X.verkopers[v].split(' ')[0],vals:keys.map(k=>(mvv.get(v+'|'+k)||0)/dv),col:GCOL[j]})),...(ids.length>5?[{name:'Others',vals:keys.map(k=>(mvv.get('-1|'+k)||0)/dv),col:'var(--s6)',dash:true}]:[])];
  if(keys.length)chart($('#vTr'),(s,Wd,H)=>lines(s,Wd,H,{labels:labs,series:ser,axis:v=>NF0.format(v)+uS,endLabels:true,tip:i=>`<b>${V.gran==='week'?'Week of '+dLab(isoOf(keys[i])):mLong(X.months[keys[i]])}</b><br>${ser.map(x=>`${esc(x.name)}: ${PCSF.format(x.vals[i])}${uS}`).join('<br>')}`}));
  else $('#vTr').innerHTML='<div class="empty">No daily data in this period (weeks start April 2026).</div>';
  $('#vTrL').innerHTML=legend(ser.map(x=>[x.name,x.col]));
  $('#vGm').onclick=()=>{V.gran='month';render()};$('#vGw').onclick=()=>{V.gran='week';render()};
  const mk=by(K.cur,i=>F.M[i],main),mkC=by(K.cmp,i=>F.M[i],main),mrows=[...mk].filter(([,v])=>v).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({k,l:X.mkts[k],v,c:K.cmp?(mkC.get(k)||0):null,vt:qf(v)}));
  $('#vMk').innerHTML=hbars(mrows);$('#vMk').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>{st.mkt=mrows[+e.dataset.k].l;syncBar();render()});
  const CA=agg(K.cur,i=>F.c[i]),CB=agg(K.cmp,i=>F.c[i]),crow=[...new Set([...CA.keys(),...CB.keys()])].map(c=>({c,a:g(CA,c),b:g(CB,c)})).filter(x=>mq(x.a)>0||mq(x.b)>0).sort((x,y)=>mq(y.a)-mq(x.a)||mq(y.b)-mq(x.b));
  const drawC=()=>{const q=(V.cq||'').toLowerCase();let L=crow.filter(x=>!q||X.customers[x.c][0].toLowerCase().includes(q));
    if(V.cf==='new')L=L.filter(x=>mq(x.a)>0&&mq(x.b)<=0);else if(V.cf==='lost')L=L.filter(x=>mq(x.a)<=0&&mq(x.b)>0);else L=L.filter(x=>mq(x.a)>0);
    const sh=L.slice(0,300),ta=L.reduce((s,x)=>s+mq(x.a),0),tb=L.reduce((s,x)=>s+mq(x.b),0),tr=L.reduce((s,x)=>s+x.a.r,0);
    $('#vCu').innerHTML=`<table><thead><tr><th>Customer</th><th>Verkoper</th><th>Market</th><th class="n">${main==='k'?'Tonnes':'Pieces'}</th>${K.cmp?`<th class="n">Comparison</th><th class="n">Change</th>`:''}<th class="n">Revenue</th><th class="n">Avg price</th></tr></thead><tbody>${sh.map(x=>`<tr class="click" data-c="${x.c}"><td>${esc(X.customers[x.c][0])}</td><td>${esc(X.customers[x.c][2])}</td><td>${esc(X.customers[x.c][1])}</td><td class="n">${qf(mq(x.a))}</td>${K.cmp?`<td class="n">${qf(mq(x.b))}</td>${T(mq(x.a),mq(x.b))}`:''}<td class="n">${eur(x.a.r)}</td><td class="n">${uprice(x.a)}</td></tr>`).join('')}
     <tr class="tot"><td>${L.length} customers${L.length>sh.length?` (first ${sh.length} shown; totals cover all)`:''}</td><td></td><td></td><td class="n">${qf(ta)}</td>${K.cmp?`<td class="n">${qf(tb)}</td><td></td>`:''}<td class="n">${eur(tr)}</td><td></td></tr></tbody></table>`;
    $('#vCu').querySelectorAll('tr[data-c]').forEach(t=>t.onclick=()=>custCard(+t.dataset.c))};
  drawC();$('#vCq').value=V.cq||'';$('#vCq').oninput=e=>{V.cq=e.target.value.trim();drawC()};
  document.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>{V.cf=b.dataset.cf;render()});
  $('#vC').onclick=()=>{V.cf='all';drawC();$('#vCu').scrollIntoView({behavior:'smooth',block:'center'})};
  const pc=prods.slice(0,10),mx=new Map();for(const i of K.cur){const p=pc.includes(F.p[i])?F.p[i]:-1,k=F.v[i]+'|'+p;const x=mx.get(k)||[0,0];x[0]+=F.k[i];x[1]+=F.q[i];mx.set(k,x)}
  const cols=[...pc,...(prods.length>10?[-1]:[])],ct=c=>ids.reduce((s,v)=>{const x=mx.get(v+'|'+c)||[0,0];return[s[0]+x[0],s[1]+x[1]]},[0,0]);
  $('#vMx').innerHTML=ids.length?`<table><thead><tr><th>Verkoper</th>${cols.map(c=>`<th class="n" style="white-space:normal;min-width:90px">${c<0?`Other ${prods.length-10} products`:esc(X.products[c][0])}</th>`).join('')}</tr></thead><tbody>${ids.map(v=>`<tr><td style="white-space:nowrap">${esc(X.verkopers[v])}</td>${cols.map(c=>{const x=mx.get(v+'|'+c)||[0,0];return`<td class="n" ${c>=0?`data-v="${v}" data-p="${c}" style="cursor:pointer"`:''}>${x[0]||x[1]?qty(x[0],x[1]):'—'}</td>`}).join('')}</tr>`).join('')}<tr class="tot"><td>Total</td>${cols.map(c=>{const x=ct(c);return`<td class="n">${qty(x[0],x[1])}</td>`}).join('')}</tr></tbody></table>`:'';
  $('#vMx').querySelectorAll('td[data-p]').forEach(td=>td.onclick=()=>{const p=+td.dataset.p;vp(X.verkopers[+td.dataset.v]+' · '+X.products[p][0],{rep:X.verkopers[+td.dataset.v],where:i=>F.p[i]===p},pk.get(p)?'k':'q')});
};

VIEWS.repcard=(pg,P)=>{const F=X.facts;
  if(!st.rep){const K=salesKPI({rep:''}),a=by(K.cur,i=>F.v[i],'r'),L=[...a].sort((x,y)=>y[1]-x[1]);
    pg.innerHTML=`<h1>Choose a verkoper</h1><p class="sub">One page with everything for one verkoper: revenue, tonnes of Pro Elite and milk powder, calf pens, customers gained and lost, reorders due, overdue invoices and late orders. ${esc(P.label)}.</p><div class="card">${hbars(L.map(([v,r])=>({l:X.verkopers[v],v:r,vt:eurS(r)})))}</div>`;
    pg.querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>{st.rep=X.verkopers[L[+e.dataset.k][0]];syncBar();render()});return}
  const rep=st.rep,PR=volPresets().filter(x=>x[2]),K=salesKPI(),NL=newLost(),A=arKPI(),RO=reorder(true),OO=openOrders(true),past=lateOrders(OO);
  const vk=PR.map(([id,name,sel])=>({id,name,K:salesKPI({grp:'',where:i=>sel.has(F.p[i])})})),get=id=>vk.find(x=>x.id===id).K;
  const pe=get('proelite'),mp=get('mp'),pens=get('boxes'),act=NL.active.size,actC=K.cmp?activeSet(custRev(K.cmp)).size:null;
  const g=growth(K.rev,K.revC);
  pg.innerHTML=`<h1>${esc(rep)}: ${eurS(K.rev)}${K.cmp?`, ${pct(g)} vs ${esc(P.cmpLabel)}`:''}</h1>
  <p class="sub">${esc(P.label)} · ${esc(filtTxt())}. Customers count for their current verkoper. <button class="btn" id="rcX" style="margin-left:6px">Choose another verkoper</button></p>
  <div class="kpis">
   ${kpiTile('rRev','Revenue',eurS(K.rev),deltaHTML(K.rev,K.revC,P),'')}
   ${kpiTile('rPe','Pro Elite',ton(pe.kg),deltaHTML(pe.kg,pe.kgC,P,ton),'Tonnes, net of returns')}
   ${kpiTile('rMp','All milk powder',ton(mp.kg),deltaHTML(mp.kg,mp.kgC,P,ton),mp.kg?'€ '+NF2.format(priceKPI('Milk powder').ppk/100)+'/kg':'')}
   ${kpiTile('rPen','Calf pens & hutches',pcs(pens.q),deltaHTML(pens.q,pens.qC,P,pcs),'Pieces')}
   ${kpiTile('rAct','Active customers',NF0.format(act),actC!=null?deltaHTML(act,actC,P,v=>NF0.format(v)):'<span class="na">No comparison</span>',NL.neu&&NL.lost?`${NL.neu.length} new · ${NL.lost.length} lost`:'')}
   ${kpiTile('rAR','Open receivables',eurS(A.open),`<span class="${A.over?'down':'na'}">${eurS(A.over)} overdue</span>`,`Still open on ${dLab(X.meta.ledgerThrough)} (report date, not the period)`)}
   ${kpiTile('rRO','Reorders due',NF0.format(RO.length),`<span class="${RO.length?'down':'na'}">${eurS(RO.reduce((s,r)=>s+r.mrev,0))} / month</span>`,`Fell due ${esc(roTxt())}`)}
   ${kpiTile('rOO','Late orders',NF0.format(past.length),`<span class="na">${unbilled(OO).length} delivered, not invoiced</span>`,'Not fully delivered, date passed')}
  </div>
  <div class="grid">
   ${card('c7','Volumes by product line',`<div class="scroll" id="rcV"></div>`,'Click a line to open it on the Volumes page for this verkoper.')}
   ${card('c5','Revenue by month',`<div class="fig s" id="rcM"></div>`+legend([[P.label,'var(--s1)'],...(K.cmp?[[P.cmpLabel,'var(--cmp)']]:[])]))}
   ${card('c6','Top customers',`<div class="scroll tbox" id="rcC"></div>`,'Click a customer for the customer card.')}
   ${card('c6','Customers gained and lost',`<div class="scroll tbox" id="rcN"></div>`,'Gained: no purchase in the 12 months before the period. Lost: bought in the comparison period, not now.')}
   ${card('c6','Call list: reorders due',`<div class="scroll tbox" id="rcR"></div>`)}
   ${card('c6','Overdue invoices',`<div class="scroll tbox" id="rcA"></div>`)}
  </div>`;
  $('#rcX').onclick=()=>{st.rep='';syncBar();render()};
  $('#rRev').onclick=()=>salesProof('Revenue · '+rep,'Revenue of this verkoper’s customers.');
  const vp=(id,col)=>{const x=vk.find(y=>y.id===id),sel=PR.find(y=>y[0]===id)[2];proof({title:x.name+' · '+rep,def:'Quantities of the product line.',col,dims:['customer','product','month'],calc:()=>salesKPI({grp:'',where:i=>sel.has(F.p[i])})})};
  $('#rPe').onclick=()=>vp('proelite','k');$('#rMp').onclick=()=>vp('mp','k');$('#rPen').onclick=()=>vp('boxes','q');
  $('#rAct').onclick=()=>newLostProof();$('#rAR').onclick=()=>arProof('all',null,null);$('#rRO').onclick=()=>{location.hash='reorder'};$('#rOO').onclick=()=>{location.hash='orders'};
  $('#rcV').innerHTML=`<table><thead><tr><th>Product line</th><th class="n">Tonnes</th><th class="n">Pieces</th>${K.cmp?'<th class="n">Change</th>':''}<th class="n">Revenue</th></tr></thead><tbody>${vk.map(x=>{const k=x.K,main=k.kg||k.kgC?'k':'q';return`<tr class="click" data-id="${x.id}"><td>${esc(x.name)}</td><td class="n">${k.kg||k.kgC?ton(k.kg):'—'}</td><td class="n">${k.q||k.qC?pcs(k.q):'—'}</td>${K.cmp?`<td class="n ${mVal(k,main)>=mVal(k,main,1)?'up':'down'}">${pct(growth(mVal(k,main),mVal(k,main,1)))}</td>`:''}<td class="n">${eur(k.rev)}</td></tr>`}).join('')}</tbody></table><p class="note">Lines overlap (Pro Elite is part of all milk powder; pens are part of calf housing), so they are not added up.</p>`;
  $('#rcV').querySelectorAll('tr[data-id]').forEach(tr=>tr.onclick=()=>{st.vol.preset=tr.dataset.id;location.hash='volumes'});
  const M=monthSeries();chart($('#rcM'),(s,W,H)=>columns(s,W,H,{labels:M.ms.map(m=>mLab(X.months[m])),series:[...(M.cmp?[{vals:M.cmp,col:'var(--cmp)'}]:[]),{vals:M.cur,col:'var(--s1)'}],axis:v=>eurS(v),tip:i=>`<b>${mLong(X.months[M.ms[i]])}</b><br>${eur(M.cur[i])}${M.cmp?`<br>${mLong(X.months[M.cm[i]])}: ${eur(M.cmp[i])}`:''}`,click:i=>salesProof(`${rep} · ${mLong(X.months[M.ms[i]])}`,'Revenue of one month.',{mon:monPair(M.ms[i])},['customer','product','group'])}));
  const cr=custRev(K.cur),crp=custRev(K.cmp),ck=by(K.cur.filter(i=>F.G[i]===0),i=>F.c[i],'k'),tc=[...cr].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,25);
  $('#rcC').innerHTML=tc.length?`<table><thead><tr><th>Customer</th><th class="n">Revenue</th>${K.cmp?'<th class="n">Comparison</th>':''}<th class="n">Milk powder</th></tr></thead><tbody>${tc.map(([c,v])=>`<tr class="click" data-c="${c}"><td>${esc(X.customers[c][0])}</td><td class="n">${eur(v)}</td>${K.cmp?`<td class="n">${eur(crp.get(c)||0)}</td>`:''}<td class="n">${ck.get(c)?ton(ck.get(c)):'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No revenue.</div>';
  const nl=[...(NL.neu||[]).map(c=>['Gained',c,cr.get(c)||0]),...(NL.lost||[]).map(c=>['Lost',c,crp.get(c)||0])];
  $('#rcN').innerHTML=nl.length?`<table><thead><tr><th></th><th>Customer</th><th class="n">Revenue</th></tr></thead><tbody>${nl.map(([t,c,v])=>`<tr class="click" data-c="${c}"><td><span class="tag">${t}</span></td><td>${esc(X.customers[c][0])}</td><td class="n">${eur(v)}${t==='Lost'?' <span class="na">before</span>':''}</td></tr>`).join('')}</tbody></table>`:`<div class="empty">${NL.neu?'None in this period.':'Needs 12 months of history before the period.'}</div>`;
  $('#rcR').innerHTML=RO.length?`<table><thead><tr><th>Customer</th><th>Product</th><th class="n">Days late</th><th class="n">€ / month</th></tr></thead><tbody>${RO.slice(0,25).map(r=>`<tr class="click" data-c="${r.c}"><td>${esc(X.customers[r.c][0])}</td><td>${esc(X.products[r.p][0])}</td><td class="n down">${r.due}</td><td class="n">${eur(r.mrev)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Nobody is late to reorder.</div>';
  const od=A.R.filter(a=>a[6]>0&&a[7]!=='Current').sort((a,b)=>b[6]-a[6]);
  $('#rcA').innerHTML=od.length?`<table><thead><tr><th>Customer</th><th>Invoice</th><th>Due</th><th class="n">Days late</th><th class="n">Open</th></tr></thead><tbody>${od.slice(0,25).map(a=>`<tr class="click" data-c="${a[0]}"><td>${esc(X.customers[a[0]][0])}</td><td>${esc(a[1])}</td><td>${a[3]||'—'}</td><td class="n">${a[3]?days(a[3],X.meta.ledgerThrough):'—'}</td><td class="n">${eur(a[6])}</td></tr>`).join('')}<tr class="tot"><td>${od.length} invoices</td><td></td><td></td><td></td><td class="n">${eur(od.reduce((s,a)=>s+a[6],0))}</td></tr></tbody></table>`:'<div class="empty">No overdue invoices.</div>';
  pg.querySelectorAll('#rcC tr[data-c],#rcN tr[data-c],#rcR tr[data-c],#rcA tr[data-c]').forEach(tr=>tr.onclick=()=>custCard(+tr.dataset.c));
};

const extend=(name,fn)=>{const base=VIEWS[name];VIEWS[name]=(pg,P)=>{base(pg,P);fn(pg,P)}};
const grid=pg=>pg.querySelector('.grid');
const curMonths=()=>new Set(period().cur.map(c=>c.m));
const mIdx=ms=>X.months.indexOf(ms);
reorder=function(per){const W=per?roWin():null;return (X.reorder||[]).map(([c,p,n,gap,last,since,late,mrev])=>({c,p,n,last,gap,since,mrev,fell:addDays(last,Math.floor(1.5*gap)+1)})).map(r=>({...r,due:days(r.fell,X.meta.ledgerThrough)}))
  .filter(r=>(!W||(r.fell>=W[0]&&r.fell<=W[1]))&&cOK(r.c)&&(!st.grp||GROUPS[X.gOfCat[X.products[r.p][1]]]===st.grp)).sort((a,b)=>b.mrev-a.mrev)};

function signedRows(){const ms=curMonths();return (X.signed||[]).filter(r=>ms.has(r[0])&&(!st.rep||X.verkopers[r[1]]===st.rep)&&(!st.grp||GROUPS[r[2]]===st.grp)&&(!st.mkt||r[9]===st.mkt))}
extend('sales',(pg,P)=>{const R=signedRows(),bm=new Map(),bv=new Map();
  for(const r of R){for(const [map,k] of [[bm,r[0]],[bv,r[1]]]){const x=map.get(k)||[0,0,0,0,0,0];for(let j=0;j<6;j++)x[j]+=r[3+j];map.set(k,x)}}
  const T=[0,0,0,0,0,0];for(const x of bm.values())for(let j=0;j<6;j++)T[j]+=x[j];
  const row=(l,x,cls='')=>`<tr class="${cls}"><td>${l}</td><td class="n">${eur(x[0])}</td><td class="n down">${eur(x[1])}</td><td class="n">${eur(x[0]+x[1])}</td><td class="n">${x[0]?share(-x[1]/x[0]*100):'—'}</td><td class="n">${x[3]?ton(-x[3]):'—'}</td><td class="n">${x[5]?pcs(-x[5]):'—'}</td></tr>`;
  const head=`<thead><tr><th></th><th class="n">Positive lines</th><th class="n">Negative lines</th><th class="n">Net revenue</th><th class="n">Negative share</th><th class="n">Returned</th><th class="n">Returned pcs</th></tr></thead>`;
  const mk='';
  grid(pg).insertAdjacentHTML('beforeend',card('c6','Credits, returns and discounts by month',`<div class="scroll tbox"><table>${head}<tbody>${[...bm].sort((a,b)=>a[0]-b[0]).map(([m,x])=>row(mLong(X.months[m]),x)).join('')}${row('Total',T,'tot')}</tbody></table></div>${mk}`,'Each sales line is split into its positive and negative part. Negative lines are credit notes, returns and discount lines on normal invoices, so they are not all credit notes. Net revenue equals the revenue shown elsewhere.')
   +card('c6','Negative lines by verkoper',`<div class="scroll tbox"><table>${head.replace('<th></th>','<th>Verkoper</th>')}<tbody>${[...bv].sort((a,b)=>a[1][1]-b[1][1]).map(([v,x])=>row(esc(X.verkopers[v]),x)).join('')}${row('Total',T,'tot')}</tbody></table></div>`,'Sorted by negative lines, largest first.'));
});

extend('orders',(pg)=>{const SG=new Map((X.orders||[]).map(o=>[o[0],o[12]])),L=(X.openLines||[]).filter(l=>l[5]>l[6]&&SG.get(l[0])==='toDeliver'&&(!st.rep||l[2]===st.rep)&&(!st.mkt||(l[1]>=0&&X.customers[l[1]][1]===st.mkt)));if(!L.length){grid(pg).insertAdjacentHTML('beforeend',card('c12','Still to deliver, by product','<div class="empty">No order line has quantity left to deliver.</div>'));return}
  const by=new Map();for(const l of L){const k=l[3]+'|'+l[4];const x=by.get(k)||{p:l[3],u:l[4],o:0,d:0,past:0,n:0};x.o+=l[5];x.d+=l[6];if(l[7]==='past')x.past+=l[5]-l[6];x.n++;by.set(k,x)}
  const R=[...by.values()].sort((a,b)=>(b.o-b.d)-(a.o-a.d)),q=(v,u)=>u==='kg'?ton(v/1e6*1000/1000*1000/1000):PCSF.format(v/1e6)+' '+(u||'units');
  const fq=(v,u)=>u==='kg'?NF0.format(v/1e6)+' kg':PCSF.format(v/1e6)+' '+esc(u||'units');
  grid(pg).insertAdjacentHTML('beforeend',card('c12','Still to deliver, by product',`<div class="scroll tbox"><table><thead><tr><th>Product</th><th class="n">Lines</th><th class="n">Ordered</th><th class="n">Delivered</th><th class="n">To deliver</th><th class="n">Of which past due</th></tr></thead><tbody>${R.map(x=>`<tr><td>${esc(X.products[x.p][0])}</td><td class="n">${x.n}</td><td class="n">${fq(x.o,x.u)}</td><td class="n">${fq(x.d,x.u)}</td><td class="n"><b>${fq(x.o-x.d,x.u)}</b></td><td class="n ${x.past>0?'down':''}">${x.past?fq(x.past,x.u):'—'}</td></tr>`).join('')}</tbody></table></div>`,`Lines with quantity left on the ${L.length===1?'order':'orders'} still to deliver (${L.length} line${L.length===1?'':'s'}), by product and unit. Lines on orders that are already invoiced are left out.`));
});

extend('customers',()=>{const C=(X.contracts||[]).filter(c=>cOK(c[0]));if(!C.length)return;
  const pg=$('#page');grid(pg).insertAdjacentHTML('beforeend',card('c12','Contracts: called off vs agreed',`<div class="scroll"><table><thead><tr><th>Customer</th><th>Product group</th><th>Term</th><th class="n">Agreed</th><th class="n">Delivered</th><th>Progress</th><th class="n">Term passed</th><th>Read</th></tr></thead><tbody>${C.map(c=>{const pctD=c[2]?c[5]/c[2]*100:null,small=c[2]<100,end=c[4]<X.meta.ledgerThrough;
    const read=small?'Check unit (agreed quantity looks like tonnes)':pctD>=100?(end?'Completed':'Fully called off — renew'):end?'Term ended under quantity':pctD+5<(c[6]||0)?'Behind schedule':'On track';
    return`<tr class="click" data-c="${c[0]}"><td>${esc(X.customers[c[0]][0])}</td><td>${esc(c[1])}</td><td style="white-space:nowrap">${c[3]} → ${c[4]}</td><td class="n">${NF0.format(c[2])}</td><td class="n">${NF0.format(c[5])} kg</td><td style="min-width:120px"><div class="hbar" style="grid-template-columns:minmax(0,1fr)"><div class="t"><b style="width:${Math.min(100,pctD||0)}%;background:${pctD>=100?'var(--s2)':'var(--s1)'}"></b>${c[6]!=null?`<s style="left:${c[6]}%"></s>`:''}</div></div></td><td class="n">${c[6]==null?'—':NF0.format(c[6])+' %'}</td><td>${read}${c[7]&&c[7].length?` <span class="tag" title="Portal months not fully inside the term are not counted">${c[7].join(', ')} not counted</span>`:''}</td></tr>`}).join('')}</tbody></table></div>`,'Delivered kg of the contract’s product group to that customer within the term. The tick marks how much of the term has passed. Contracts carry no product or price in Microfas.'));
  pg.querySelectorAll('.grid tr[data-c]').forEach(tr=>{if(!tr.onclick)tr.onclick=()=>custCard(+tr.dataset.c)})});

function marginRows(o={}){const ms=curMonths(),rep=o.rep!==undefined?o.rep:st.rep,mkt=o.mkt!==undefined?o.mkt:st.mkt;
  return (X.margin||[]).filter(r=>ms.has(r[0])&&(!rep||X.verkopers[r[1]]===rep)&&(!mkt||X.customers[r[2]][1]===mkt)&&(!st.grp||st.grp==='Milk powder'))}
const mSum=R=>R.reduce((a,r)=>[a[0]+r[4],a[1]+r[5],a[2]+r[6]],[0,0,0]);
function marginTable(R,keyFn,lab,head){const m=new Map();for(const r of R){const k=keyFn(r);const x=m.get(k)||[0,0,0];x[0]+=r[4];x[1]+=r[5];x[2]+=r[6];m.set(k,x)}
  const T=mSum(R),rows=[...m].sort((a,b)=>(b[1][0]-b[1][2])-(a[1][0]-a[1][2])),f=x=>`<td class="n">${eur(x[0])}</td><td class="n">${ton(x[1])}</td><td class="n">${eur(x[2])}</td><td class="n"><b>${eur(x[0]-x[2])}</b></td><td class="n">${x[1]?'€ '+NF2.format((x[0]-x[2])/x[1]/100):'—'}</td><td class="n">${x[0]?share((x[0]-x[2])/x[0]*100):'—'}</td>`;
  return `<table><thead><tr><th>${head}</th><th class="n">Revenue</th><th class="n">Sold</th><th class="n">Purchase cost</th><th class="n">Margin</th><th class="n">Per kg</th><th class="n">Margin %</th></tr></thead><tbody>${rows.map(([k,x])=>`<tr><td>${esc(lab(k))}</td>${f(x)}</tr>`).join('')}<tr class="tot"><td>Total</td>${f(T)}</tr></tbody></table>`}
extend('products',(pg,P)=>{const R=marginRows();if(!(X.margin||[]).length)return;
  const T=mSum(R),first=(X.costs||[]).reduce((a,c)=>!a||c[1]<a?c[1]:a,null);
  grid(pg).insertAdjacentHTML('beforeend',card('c12',R.length?`Milk powder margin over purchase price: ${share(T[0]?(T[0]-T[2])/T[0]*100:0)}, € ${NF2.format(T[1]?(T[0]-T[2])/T[1]/100:0)} per kg`:'Milk powder margin over purchase price',
    R.length?`<div class="grid" style="gap:14px"><div class="c6 scroll">${marginTable(R,r=>r[3],k=>X.products[k][0],'Product')}</div><div class="c6 scroll tbox">${marginTable(R,r=>r[1],k=>X.verkopers[k],'Verkoper')}</div></div>`:'<div class="empty">No sales with a purchase price in this period (purchase prices start '+esc(first||'—')+').</div>',
    `Estimate: revenue − kg × purchase price (Microfas “Prijslijst inkoopprijzen”) valid on the invoice date, for the ${new Set((X.costs||[]).map(c=>c[0])).size} products that have one, from ${esc(first||'—')}. Excludes freight, discounts and stock effects. Cross-check: the books show milk powder purchases close to this cost (see Results).`));
  pg.querySelectorAll('.grid .grid .c6').forEach(d=>d.style.gridColumn='');
});

extend('repcard',(pg,P)=>{if(!st.rep)return;const R=marginRows(),T=mSum(R),k=pg.querySelector('.kpis');
  if(k&&(X.margin||[]).length)k.insertAdjacentHTML('beforeend',kpiTile('rMg','Milk powder margin (est.)',T[0]?share((T[0]-T[2])/T[0]*100):'—',`<span class="na">${eurS(T[0]-T[2])}</span>`,T[1]?'€ '+NF2.format((T[0]-T[2])/T[1]/100)+' per kg':''));
  const mg=$('#rMg');if(mg)mg.onclick=()=>{const m=new Map();for(const r of R){const x=m.get(r[2])||[0,0,0];x[0]+=r[4];x[1]+=r[5];x[2]+=r[6];m.set(r[2],x)}
    const rows=[...m].sort((a,b)=>(b[1][0]-b[1][2])-(a[1][0]-a[1][2]));listProof('Milk powder margin · '+st.rep,'Estimated margin over purchase price, per customer.',[['Customer'],['Revenue',1],['kg',1],['Cost',1],['Margin',1],['Per kg',1]],
      rows.map(([c,x])=>[esc(X.customers[c][0]),eur2(x[0]),NF0.format(x[1]),eur2(x[2]),eur2(x[0]-x[2]),x[1]?'€ '+NF2.format((x[0]-x[2])/x[1]/100):'—']),['Total',eur2(T[0]),NF0.format(T[1]),eur2(T[2]),eur2(T[0]-T[2]),T[1]?'€ '+NF2.format((T[0]-T[2])/T[1]/100):'—'],`<b>✓ ${rows.length} customers</b> add up to the total`)};
  const tg=(X.targets||[]).filter(t=>t.verkoper===st.rep&&curMonths().has(mIdx(t.month)));
  grid(pg).insertAdjacentHTML('beforeend',card('c12','Targets',tg.length?`<div class="scroll"><table><thead><tr><th>Line</th><th class="n">Target</th><th class="n">Actual</th><th class="n">Attainment</th></tr></thead><tbody>${(()=>{const by=new Map();for(const t of tg){const x=by.get(t.line)||{kg:0,q:0,r:0};x.kg+=t.kg;x.q+=t.microPieces;x.r+=t.revenueCents;by.set(t.line,x)}
     const ln=key=>key==='revenue'?null:new Set((X.lines.find(l=>l.key===key)||{products:[]}).products);
     return [...by].map(([key,t])=>{const set=ln(key),K=salesKPI(set?{grp:'',where:i=>set.has(X.facts.p[i])}:{}),meas=key==='revenue'?['r',t.r]:t.kg?['k',t.kg]:['q',t.q],a=mVal(K,meas[0]);
       return `<tr><td>${esc(key==='revenue'?'Revenue':(X.lines.find(l=>l.key===key)||{label:key}).label)}</td><td class="n">${mFmt(meas[0])(meas[1])}</td><td class="n">${mFmt(meas[0])(a)}</td><td class="n ${a>=meas[1]?'up':'down'}">${meas[1]?share(a/meas[1]*100):'—'}</td></tr>`}).join('')})()}</tbody></table></div>`
    :'<p class="note" style="font-size:14px">No targets have been set yet. Once monthly targets per verkoper are supplied with the data, this card shows target vs actual for every product line, e.g. Pro Elite tonnes per month.</p>'));
});



const booksFrom=()=>(X.meta.booksOpening||'0000-00').slice(0,7);
const booksRows=()=>(X.pnl||[]).filter(r=>r[0]>=booksFrom());
const booksEarly=()=>(X.pnl||[]).filter(r=>r[0]<booksFrom());
const PNL_ORDER=['Revenue','Purchases','Personnel','Transport','Housing','Sales & marketing','Office & admin','Finance & tax','Other'];
function accountProof(title,rows){const m=new Map();for(const r of rows){const k=r[1]+'|'+r[0];m.set(k,(m.get(k)||0)+r[4])}
  const L=[...m].map(([k,v])=>{const [a,mo]=k.split('|');return[a,mo,v]}).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1])),t=L.reduce((s,x)=>s+x[2],0);
  listProof(title,'P&L postings as booked, income positive and costs negative.',[['Account'],['Month'],['Amount',1]],L.map(x=>[esc(x[0]),mLong(x[1]),eur2(x[2])]),['Total','',eur2(t)],`<b>✓ ${L.length} rows</b> add up to ${eur2(t)}`)}
VIEWS.results=(pg,P)=>{const PN=booksRows(),EA=booksEarly(),pm=[...new Set(PN.map(r=>r[0]))].sort();
  if(!pm.length){pg.innerHTML='<h1>Results (books)</h1><div class="empty">No P&L postings in this export.</div>';return}
  const sel=P.cur.map(c=>X.months[c.m]).filter(m=>pm.includes(m));
  if(!sel.length){pg.innerHTML=`<h1>Results (books)</h1><p class="sub">The books start in ${mLong(pm[0])}; the selected period has no bookings.</p><button class="btn" id="rsAll">Show ${mLong(pm[0])} – ${mLong(pm[pm.length-1])}</button>`;
    $('#rsAll').onclick=()=>{st.from=mIdx(pm[0]);st.to=mIdx(pm[pm.length-1]);st.preset='custom';syncBar();render()};return}
  const R=PN.filter(r=>sel.includes(r[0])),cls=new Map(PNL_ORDER.map(c=>[c,0]));for(const r of R)cls.set(r[2],(cls.get(r[2])||0)+r[4]);
  const rev=cls.get('Revenue'),pur=cls.get('Purchases'),gross=rev+pur,res=[...cls.values()].reduce((a,b)=>a+b,0),opex=res-gross;
  const lab=sel.length===1?mLong(sel[0]):mLong(sel[0])+' – '+mLong(sel[sel.length-1]),part=sel.includes(X.months[X.partial.m]);
  const skipped=P.cur.length-sel.length;
  pg.innerHTML=`<h1>${esc(`Books show a result of ${eurS(res)} for ${lab}, ${rev?share(res/rev*100):'—'} of revenue`)}</h1>
  <p class="sub">All profit-and-loss postings as booked in Microfas${part?`, through ${dLab(X.meta.ledgerThrough)}`:''}. ${skipped?`${skipped} selected month${skipped>1?'s are':' is'} before the books start (${mLong(pm[0])}) and left out. `:''}Purchases are booked when bought, not when sold, and no stock-change postings are booked, so a single month swings with purchase timing; read periods of several months. Company-wide: the verkoper, group and market filters do not apply. Corporate tax is booked on a balance account and is not included.${EA.length?` The books start with the first billing on ${dLab(X.meta.booksOpening)}; ${EA.length} back-dated posting${EA.length>1?'s':''} before that (net ${eur2(EA.reduce((s,r)=>s+r[4],0))}) ${EA.length>1?'are':'is'} left out.`:''}</p>
  <div class="kpis">${kpiTile('bR','Revenue (books)',eurS(rev),'<span class="na">income accounts</span>','')}${kpiTile('bP','Purchases',eurS(-pur),`<span class="na">${rev?share(-pur/rev*100):'—'} of revenue</span>`,'')}${kpiTile('bG','After purchases',eurS(gross),`<span class="${gross>=0?'up':'down'}">${rev?share(gross/rev*100):'—'} of revenue</span>`,'Revenue − purchases')}${kpiTile('bO','Operating costs',eurS(-opex),`<span class="na">${rev?share(-opex/rev*100):'—'} of revenue</span>`,'')}${kpiTile('bRes','Result',eurS(res),`<span class="${res>=0?'up':'down'}">${rev?share(res/rev*100):'—'} of revenue</span>`,'Before corporate tax')}</div>
  <div class="grid">
   ${card('c7','Result by month',`<div class="fig s" id="bM"></div>`,'Click a month for its postings.')}
   ${card('c5','Operating costs by type',`<div id="bC"></div>`,'Click a type for its accounts.')}
   ${card('c12','Month × type',`<div class="scroll" id="bT"></div>`,'Rows and columns add up to the totals. Click a cell for its postings.')}
   ${card('c6','Revenue against purchases, by product group',`<div class="scroll" id="bG2"></div>`,'Accounts are matched to groups by name. A group without its own purchase account shows no purchases; those costs sit in “Other”.')}
   ${card('c6','Billed revenue against booked revenue',`<div class="scroll" id="bRec"></div>`,'Billed = invoice lines on revenue accounts in the billing journal (used on every sales page). Booked = all postings on those accounts, including corrections in other journals.')}
  </div>`;
  const tile=(id,c)=>$('#'+id).onclick=()=>accountProof(id==='bRes'?'All P&L postings · '+lab:c+' · '+lab,id==='bRes'?R:R.filter(r=>c==='opex'?!['Revenue','Purchases'].includes(r[2]):r[2]===c));
  tile('bR','Revenue');tile('bP','Purchases');tile('bO','opex');tile('bRes','all');$('#bG').onclick=()=>accountProof('Revenue and purchases · '+lab,R.filter(r=>['Revenue','Purchases'].includes(r[2])));
  const bm=new Map(sel.map(m=>[m,0]));for(const r of R)bm.set(r[0],bm.get(r[0])+r[4]);
  chart($('#bM'),(s,W,H)=>columns(s,W,H,{labels:sel.map(m=>mLab(m)+(m===X.months[X.partial.m]?'*':'')),series:[{vals:sel.map(m=>bm.get(m)),col:'var(--s1)'}],axis:v=>eurS(v),
    tip:i=>`<b>${mLong(sel[i])}</b><br>Result ${eur(bm.get(sel[i]))}`,click:i=>accountProof('P&L postings · '+mLong(sel[i]),R.filter(r=>r[0]===sel[i]))}));
  const oc=PNL_ORDER.slice(2).map(c=>({l:c,v:-(cls.get(c)||0),vt:eurS(-(cls.get(c)||0))+' · '+(rev?share(-(cls.get(c)||0)/rev*100):'—')})).filter(r=>r.v);
  $('#bC').innerHTML=hbars(oc);$('#bC').querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>accountProof(oc[+e.dataset.k].l+' · '+lab,R.filter(r=>r[2]===oc[+e.dataset.k].l)));
  const cols=PNL_ORDER.filter(c=>R.some(r=>r[2]===c)),cell=new Map();for(const r of R){const k=r[0]+'|'+r[2];cell.set(k,(cell.get(k)||0)+r[4])}
  $('#bT').innerHTML=`<table><thead><tr><th>Month</th>${cols.map(c=>`<th class="n">${c}</th>`).join('')}<th class="n">Result</th></tr></thead><tbody>${sel.map(m=>`<tr><td>${mLong(m)}</td>${cols.map(c=>`<td class="n" data-m="${m}" data-c="${c}" style="cursor:pointer">${eur(cell.get(m+'|'+c)||0)}</td>`).join('')}<td class="n"><b>${eur(bm.get(m))}</b></td></tr>`).join('')}<tr class="tot"><td>Total</td>${cols.map(c=>`<td class="n">${eur(cls.get(c)||0)}</td>`).join('')}<td class="n">${eur(res)}</td></tr></tbody></table>`;
  $('#bT').querySelectorAll('td[data-c]').forEach(td=>td.onclick=()=>accountProof(`${td.dataset.c} · ${mLong(td.dataset.m)}`,R.filter(r=>r[0]===td.dataset.m&&r[2]===td.dataset.c)));
  if([...bm.values()].reduce((a,b)=>a+b,0)!==res)$('#bT').insertAdjacentHTML('beforeend','<p class="down">Table total does not match.</p>');
  const gg=new Map();for(const r of R)if(r[2]==='Revenue'||r[2]==='Purchases'){const x=gg.get(r[3])||[0,0];x[r[2]==='Revenue'?0:1]+=r[4];gg.set(r[3],x)}
  const G2=[...gg].sort((a,b)=>b[1][0]-a[1][0]);
  $('#bG2').innerHTML=`<table><thead><tr><th>Group</th><th class="n">Revenue</th><th class="n">Purchases</th><th class="n">Difference</th><th class="n">% of revenue</th></tr></thead><tbody>${G2.map(([g,x])=>`<tr><td>${esc(g)}</td><td class="n">${eur(x[0])}</td><td class="n">${x[1]?eur(-x[1]):'—'}</td><td class="n">${x[1]?eur(x[0]+x[1]):'—'}</td><td class="n">${x[1]&&x[0]?share((x[0]+x[1])/x[0]*100):'—'}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="n">${eur(rev)}</td><td class="n">${eur(-pur)}</td><td class="n">${eur(gross)}</td><td class="n">${rev?share(gross/rev*100):'—'}</td></tr></tbody></table>`;
  const F=X.facts,billed=new Map();for(let i=0;i<X.n;i++){const m=X.months[F.m[i]];if(sel.includes(m))billed.set(m,(billed.get(m)||0)+F.r[i])}
  const booked=new Map();for(const r of R)if(r[2]==='Revenue'&&/^(omzet|doorberekende)/i.test(r[1]))booked.set(r[0],(booked.get(r[0])||0)+r[4]);
  const tb=sel.reduce((s,m)=>s+(billed.get(m)||0),0),tk=sel.reduce((s,m)=>s+(booked.get(m)||0),0);
  $('#bRec').innerHTML=`<table><thead><tr><th>Month</th><th class="n">Billed</th><th class="n">Booked</th><th class="n">Corrections</th></tr></thead><tbody>${sel.map(m=>{const a=billed.get(m)||0,b=booked.get(m)||0;return`<tr><td>${mLong(m)}</td><td class="n">${eur2(a)}</td><td class="n">${eur2(b)}</td><td class="n ${b-a?'down':''}">${eur2(b-a)}</td></tr>`}).join('')}<tr class="tot"><td>Total</td><td class="n">${eur2(tb)}</td><td class="n">${eur2(tk)}</td><td class="n">${eur2(tk-tb)}</td></tr></tbody></table><p class="note">Other income on the books (e.g. Overige bedrijfsopbrengsten): ${eur(rev-tk)}.</p>`;
};

const COMMENTARY_FOR='2026-11-18';
function execModel(){const O={rep:'',grp:'',mkt:''},F=X.facts,L=X.lastFull,y=+X.months[L].slice(0,4),f=mIdx(y+'-01');
  const save={rep:st.rep,grp:st.grp,mkt:st.mkt};Object.assign(st,O);
  try{
  const allIx=pick(X.months.map((_,m)=>({m,cap:99})),O),mt=by(allIx,i=>F.m[i],'r'),mk=by(allIx.filter(i=>F.G[i]===0),i=>F.m[i],'k'),mr=by(allIx.filter(i=>F.G[i]===0),i=>F.m[i],'r');
  const ytdM=[],pyM=[];for(let m=f;m<=L;m++){ytdM.push(m);pyM.push(m-12)}
  const S=ms=>ms.reduce((s,m)=>s+(mt.get(m)||0),0),hasPY=pyM.every(m=>m>=0);
  const ytd=S(ytdM),pytd=hasPY?S(pyM):null,g=hasPY?(ytd-pytd)/Math.abs(pytd):null,gLast=L-12>=0?(mt.get(L)-mt.get(L-12))/Math.abs(mt.get(L-12)):null;
  const rem=[];for(let mm=+X.months[L].slice(5)+1;mm<=12;mm++){const key=`${y}-${String(mm).padStart(2,'0')}`,ci=mIdx(key),pi=mIdx(`${y-1}-${String(mm).padStart(2,'0')}`);
    const py=pi>=0?mt.get(pi)||0:null,mtd=ci>=0?mt.get(ci)||0:0,part=ci>=0&&ci===X.partial.m;
    const gl=Math.min(g??0,gLast??g??0),gh=Math.max(g??0,gLast??g??0);
    const rr=part?Math.round(mtd/X.partial.day*X.partial.dim):null,lo=Math.max(mtd,Math.round(py*(1+gl))),hi=Math.max(mtd,Math.round(py*(1+gh)));
    rem.push({key,ci,py,mtd,part,base:part?rr:Math.round(py*(1+(g??0))),low:part?Math.min(rr,lo):lo,high:part?Math.max(rr,hi):hi})}
  const fy=k=>ytd+rem.reduce((s,r)=>s+r[k],0),pyFull=X.months.map((m,i)=>[m,i]).filter(([m])=>m.startsWith(String(y-1))).reduce((s,[,i])=>s+(mt.get(i)||0),0);
  const pyComplete=X.months.filter(m=>m.startsWith(String(y-1))).length===12;
  const kg=ms=>ms.reduce((s,m)=>s+(mk.get(m)||0),0),rv=ms=>ms.reduce((s,m)=>s+(mr.get(m)||0),0);
  const mp={t:kg(ytdM),tp:hasPY?kg(pyM):null,p:kg(ytdM)?rv(ytdM)/kg(ytdM):null,pp:hasPY&&kg(pyM)?rv(pyM)/kg(pyM):null};
  const qs=[];for(let m=Math.max(0,L-5);m<=L;m++)qs.push(m);const recentP=kg(qs.slice(-3))?rv(qs.slice(-3))/kg(qs.slice(-3)):null,earlyP=kg(ytdM.slice(0,3))?rv(ytdM.slice(0,3))/kg(ytdM.slice(0,3)):null;
  const cur=pick(ytdM.map(m=>({m,cap:99})),O),prv=hasPY?pick(pyM.map(m=>({m,cap:99})),O):[];
  const delta=f2=>{const a=by(cur,f2,'r'),b=by(prv,f2,'r');return [...new Set([...a.keys(),...b.keys()])].map(k=>({k,a:a.get(k)||0,b:b.get(k)||0,d:(a.get(k)||0)-(b.get(k)||0)})).sort((x,y2)=>y2.d-x.d)};
  const grp=delta(i=>F.G[i]),mkt=delta(i=>F.M[i]),rep=delta(i=>F.v[i]),cus=delta(i=>F.c[i]);
  const actA=new Set(cus.filter(x=>x.a>0).map(x=>x.k)),actB=new Set(cus.filter(x=>x.b>0).map(x=>x.k));
  const lost=cus.filter(x=>x.b>0&&!actA.has(x.k)).sort((p,q)=>q.b-p.b),lb12=f-12>=0?activeSet(custRev(pick(Array.from({length:12},(_,j)=>({m:f-12+j,cap:99})),O))):actB,neu=cus.filter(x=>x.a>0&&!lb12.has(x.k));
  const pos=cus.filter(x=>x.a>0).sort((p,q)=>q.a-p.a),top10=pos.slice(0,10).reduce((s,x)=>s+x.a,0)/Math.max(1,pos.reduce((s,x)=>s+x.a,0));
  const A=arKPI(),RO=reorder(),OO=openOrders(),past=lateOrders(OO),ub=unbilled(OO),so=staleOpen(OO);
  const o30=new Map();for(const a of A.R)if(a[6]>0&&!['Current','1–30'].includes(a[7]))o30.set(a[0],(o30.get(a[0])||0)+a[6]);const o30L=[...o30].sort((p,q)=>q[1]-p[1]);
  const pmSet=new Set(ytdM.map(m=>X.months[m])),B=booksRows().filter(r=>pmSet.has(r[0])),bk={};for(const r of B)bk[r[2]]=(bk[r[2]]||0)+r[4];
  const bRev=bk.Revenue||0,bRes=Object.values(bk).reduce((a,b)=>a+b,0),bMonths=[...new Set(B.map(r=>r[0]))].sort();
  const MG=(X.margin||[]).filter(r=>ytdM.includes(r[0])),mg=mSum(MG);
  const C=(X.contracts||[]),renew=C.filter(c=>c[2]>=100&&c[5]>=c[2]&&c[4]>=X.meta.ledgerThrough),ended=C.filter(c=>c[4]<X.meta.ledgerThrough);
  let mtd=null;if(X.partial.m>=0){let a=0,b=0;for(let i=0;i<X.n;i++){if(!F.d[i]||F.d[i]>X.partial.day)continue;if(F.m[i]===X.partial.m)a+=F.r[i];else if(F.m[i]===X.partial.m-1)b+=F.r[i]}mtd={a,b,g:b?(a-b)/Math.abs(b):null}}
  const ch={a:grp.find(x=>x.k===2),open:(X.openLines||[]).filter(l=>(X.orders||[]).some(o=>o[0]===l[0]&&o[12]==='toDeliver')&&X.products[l[3]][1]>=0&&X.gOfCat[X.products[l[3]][1]]===2&&l[4]!=='kg').reduce((s,l)=>s+Math.max(0,l[5]-l[6]),0)/1e6};
  const decPY=rem.find(r=>r.key.endsWith('-12'));
  return{y,L,ytdM,ytd,pytd,g,gLast,rem,fy,pyFull,pyComplete,mp,recentP,earlyP,grp,mkt,rep,cus,lost,neu,top10,actA,actB,A,o30L,RO,OO,past,ub,so,bRev,bRes,bk,bMonths,mg,renew,ended,mtd,ch,decPY,mt}
  }finally{Object.assign(st,save)}}
const gTxt=x=>x==null||!isFinite(x)?'—':(x>=0?'+':'−')+NF1.format(Math.abs(x*100))+' %';
VIEWS.summary=(pg)=>{const E=execModel(),lbl=`Jan–${MN[+X.months[E.L].slice(5)-1]} ${E.y}`,plbl=`Jan–${MN[+X.months[E.L].slice(5)-1]} ${E.y-1}`;
  const top=E.grp[0],bot=E.grp[E.grp.length-1],mUp=E.mkt[0],mDn=E.mkt[E.mkt.length-1],rUp=E.rep[0],rDn=E.rep[E.rep.length-1],G=k=>GROUPS[k];
  const verdict=E.g==null?`${eurS(E.ytd)} booked in ${lbl}`:`${E.y} is ${E.g>=0?'up':'down'} ${gTxt(E.g).replace('+','').replace('−','')} on ${E.y-1}, led by ${G(top.k).toLowerCase()}; ${G(bot.k).toLowerCase()}, collections and November’s pace need attention`;
  const take=[];
  if(E.g!=null)take.push(['g',`<b>Growth is real but narrow.</b> ${eur(E.ytd)} in ${lbl} vs ${eur(E.pytd)} (${gTxt(E.g)}). ${G(top.k)} added ${eurS(top.d)}${E.grp[1]&&E.grp[1].d>0?`, ${G(E.grp[1].k)} ${eurS(E.grp[1].d)}`:''}; ${G(bot.k)} lost ${eurS(-bot.d)} (${gTxt(bot.b?bot.d/bot.b:null)}).`,'sales']);
  if(E.mp.tp)take.push(['',`<b>Milk powder: more tonnes and a better price.</b> ${ton(E.mp.t)} (${gTxt((E.mp.t-E.mp.tp)/E.mp.tp)}) at € ${NF2.format(E.mp.p/100)}/kg vs € ${NF2.format(E.mp.pp/100)}. The price has climbed from € ${NF2.format(E.earlyP/100)} in Q1 to € ${NF2.format(E.recentP/100)} in the last three months${E.mg[0]?`; estimated margin over purchase price ${share((E.mg[0]-E.mg[2])/E.mg[0]*100)} (€ ${NF2.format((E.mg[0]-E.mg[2])/E.mg[1]/100)}/kg)`:''}.`,'products']);
  take.push([mDn.d<0?'w':'',`<b>Markets are diverging.</b> ${esc(X.mkts[mUp.k])} ${eurS(mUp.d)} (${gTxt(mUp.b?mUp.d/mUp.b:null)}); ${esc(X.mkts[mDn.k])} ${eurS(mDn.d)} (${gTxt(mDn.b?mDn.d/mDn.b:null)}).${E.mkt.find(x=>X.mkts[x.k]==='United Kingdom'&&x.d>0)?` The UK has grown to ${eurS(E.mkt.find(x=>X.mkts[x.k]==='United Kingdom').a)}.`:''}`,'markets']);
  take.push(['',`<b>Verkopers:</b> ${esc(X.verkopers[rUp.k])} ${eurS(rUp.d)} (${gTxt(rUp.b?rUp.d/rUp.b:null)}) leads the growth; ${esc(X.verkopers[rDn.k])} is ${eurS(rDn.d)} (${gTxt(rDn.b?rDn.d/rDn.b:null)}).`,'verkopers']);
  take.push([E.lost.length>E.neu.length?'w':'',`<b>The customer base turns over fast.</b> ${E.actA.size} active customers; ${E.lost.length} who bought in ${plbl} have not bought this year (${eurS(E.lost.reduce((s,x)=>s+x.b,0))} then), ${E.neu.length} are new (${eurS(E.neu.reduce((s,x)=>s+x.a,0))}). Top 10 customers are only ${share(E.top10*100)} of revenue, so risk is spread but retention matters.`,'customers']);
  if(E.A.open)take.push(['w',`<b>Cash is tied up.</b> ${eurS(E.A.open)} open, ${share(E.A.over/E.A.open*100)} overdue and ${eurS(E.A.over30)} more than 30 days late${E.o30L[0]?`; ${esc(X.customers[E.o30L[0][0]][0])} alone ${eurS(E.o30L[0][1])}`:''}.`,'receivables']);
  if(E.bMonths.length)take.push([E.bRes>=0?'g':'w',`<b>Books ${mLong(E.bMonths[0])}–${mLong(E.bMonths[E.bMonths.length-1])}:</b> result ${eurS(E.bRes)} on ${eurS(E.bRev)} revenue (${share(E.bRev?E.bRes/E.bRev*100:0)}), before corporate tax. Transport is the biggest cost after purchases (${eurS(-(E.bk.Transport||0))}, ${share(E.bRev?-(E.bk.Transport||0)/E.bRev*100:0)} of revenue).`,'results']);
  if(E.mtd)take.push([E.mtd.g<0?'w':'g',`<b>${mLong(X.months[X.partial.m])} so far:</b> ${eurS(E.mtd.a)} in days 1–${X.partial.day}, ${gTxt(E.mtd.g)} vs the same days of ${mLong(X.months[X.partial.m-1])}.`,'overview']);
  const risks=[];
  if(E.o30L.length)risks.push(`Receivables over 30 days: ${E.o30L.slice(0,3).map(([c,v])=>`${esc(X.customers[c][0])} ${eurS(v)}`).join(', ')}.`);
  if(E.mtd&&E.mtd.g<0)risks.push(`${mLong(X.months[X.partial.m])} runs ${gTxt(E.mtd.g)} behind October’s pace; ${E.decPY&&E.decPY.py?`December was the biggest month of ${E.y-1} (${eurS(E.decPY.py)})`:'December is seasonally strong'}.`);
  if(E.ch.a&&E.ch.a.d<0)risks.push(`Calf housing is ${gTxt(E.ch.a.b?E.ch.a.d/E.ch.a.b:null)} year to date, and ${E.ch.open?`only ${PCSF.format(E.ch.open)} units are`:'no units are'} waiting to be delivered.`);
  if(mDn.d<0)risks.push(`${esc(X.mkts[mDn.k])} has lost ${eurS(-mDn.d)} (${gTxt(mDn.b?mDn.d/mDn.b:null)}).`);
  if(E.lost[0])risks.push(`Largest customers lost since ${E.y-1}: ${E.lost.slice(0,3).map(x=>`${esc(X.customers[x.k][0])} (${eurS(x.b)})`).join(', ')}.`);
  if(E.RO.length)risks.push(`${E.RO.length} regular buyers are past their usual reorder gap (${eurS(E.RO.reduce((s,r)=>s+r.mrev,0))} a month).`);
  if(E.ub.length)risks.push(`${E.ub.length} orders are delivered in full but not invoiced yet (${ton(E.ub.reduce((s,o)=>s+o[10],0))} delivered); revenue and cash wait on billing.`);
  if(E.past.length)risks.push(`${E.past.length} order${E.past.length>1?'s are':' is'} late: requested date passed, quantity still to deliver.`);
  const dec=[];
  if(E.A.over30)dec.push(['Finance + verkopers',`Run a collection sprint on the ${eurS(E.A.over30)} over 30 days, starting with ${E.o30L.slice(0,2).map(([c])=>esc(X.customers[c][0])).join(' and ')}; agree a payment plan before the next large delivery.`,'receivables']);
  if(E.lost.length)dec.push(['Verkopers',`Win-back calls to the ${Math.min(10,E.lost.length)} largest lost customers (worth ${eurS(E.lost.slice(0,10).reduce((s,x)=>s+x.b,0))} last year) and the ${E.RO.length} late reorders.`,'customers']);
  if(E.mg[0])dec.push(['Management',`Hold the milk powder price, but watch tonnes per customer: at ${'€ '+NF2.format((E.mg[0]-E.mg[2])/E.mg[1]/100)}/kg margin, every 100 t lost costs about ${eurS((E.mg[0]-E.mg[2])/E.mg[1]*100000)} of margin.`,'products']);
  if(E.decPY&&E.ch.a)dec.push(['Calf housing',`Fill the December calf-housing pipeline: last December brought ${eurS(E.decPY.py)} in total and housing is the main shortfall this year.`,'volumes']);
  if(mDn.d<0)dec.push([esc(X.mkts[mDn.k]),`Review the ${esc(X.mkts[mDn.k])} plan with the responsible verkoper: which customers stopped and whether price or availability was the reason.`,'markets']);
  if(E.renew.length)dec.push(['Verkopers',`Renew ${E.renew.length} contract${E.renew.length>1?'s':''} already fully called off (${E.renew.map(c=>esc(X.customers[c[0]][0])).join(', ')}).`,'customers']);
  if(E.ub.length||E.so.length)dec.push(['Order desk',`Invoice the ${E.ub.length} delivered orders still waiting for a bill, and close the ${E.so.length} orders that are already invoiced but still open in Microfas.`,'orders']);
  if(E.bk.Transport)dec.push(['Logistics',`Check freight recovery: transport costs are ${share(E.bRev?-(E.bk.Transport||0)/E.bRev*100:0)} of revenue, while charged-on costs appear only on calf housing.`,'results']);
  if(!(X.targets||[]).length)dec.push(['Management',`Load ${E.y+1} targets per verkoper and product line so attainment shows on every verkoper card.`,'repcard']);
  const fcRows=['low','base','high'].map(k=>({k,v:E.fy(k)}));
  const fresh=X.meta.ledgerThrough===COMMENTARY_FOR;
  pg.innerHTML=`<h1>${esc(verdict)}</h1>
  <p class="sub">Company-wide view for ${lbl} against ${plbl}, ledger through ${dLab(X.meta.ledgerThrough)}. The filters at the top do not apply on this page. Every figure is calculated live from the data; click a takeaway to open the page behind it.</p>
  <div class="kpis">${kpiTile('xY','Revenue '+lbl,eurS(E.ytd),E.pytd!=null?deltaHTML(E.ytd,E.pytd,{cmp:true}):'<span class="na">No comparison</span>','')}
   ${kpiTile('xF','Full-year '+E.y+' outlook',eurS(E.fy('base')),`<span class="na">${eurS(E.fy('low'))} – ${eurS(E.fy('high'))}</span>`,E.pyComplete?`${E.y-1}: ${eurS(E.pyFull)} · base ${gTxt((E.fy('base')-E.pyFull)/E.pyFull)}`:'')}
   ${kpiTile('xM','Milk powder',ton(E.mp.t),E.mp.tp?deltaHTML(E.mp.t,E.mp.tp,{cmp:true},ton):'',E.mp.p?'€ '+NF2.format(E.mp.p/100)+'/kg':'')}
   ${E.mg[0]?kpiTile('xG','Milk powder margin (est.)',share((E.mg[0]-E.mg[2])/E.mg[0]*100),`<span class="na">${eurS(E.mg[0]-E.mg[2])}</span>`,'Over purchase price'):''}
   ${E.bMonths.length?kpiTile('xB','Books result',eurS(E.bRes),`<span class="${E.bRes>=0?'up':'down'}">${share(E.bRev?E.bRes/E.bRev*100:0)} of revenue</span>`,`${mLab(E.bMonths[0])}–${mLab(E.bMonths[E.bMonths.length-1])}, before tax`):''}
   ${kpiTile('xA','Overdue receivables',eurS(E.A.over),`<span class="down">${share(E.A.open?E.A.over/E.A.open*100:0)} of open</span>`,eurS(E.A.over30)+' over 30 days')}
   ${kpiTile('xC','Customers',NF0.format(E.actA.size),`<span class="na">${E.neu.length} new · ${E.lost.length} lost</span>`,'vs same months last year')}
   ${kpiTile('xR','Reorders at stake',eurS(E.RO.reduce((s,r)=>s+r.mrev,0)),`<span class="na">${E.RO.length} late regular buyers</span>`,'per month')}</div>
  <div class="grid">
   ${card('c7','Executive takeaways',`<ul class="ins" id="xT">${take.map((t,i)=>`<li class="${t[0]}" data-i="${i}">${t[1]}</li>`).join('')}</ul>`)}
   ${card('c5','Decisions for this month',`<ul class="ins" id="xD">${dec.map((d,i)=>`<li data-i="${i}"><span class="tag">${d[0]}</span> ${d[1]}</li>`).join('')}</ul>`,'Suggested actions with the numbers behind them; the owner tag is a suggestion.')}
   ${card('c8','Outlook: '+E.y+' month by month',`<div class="fig" id="xO"></div>`+legend([[String(E.y-1),'var(--cmp)'],[E.y+' actual','var(--s1)'],[E.y+' outlook (base)','var(--s3)']]),'Bars for the rest of the year are the base case. Hover for the low and high case.')}
   ${card('c4','Full-year scenarios',`<div class="scroll"><table><thead><tr><th>Case</th><th class="n">Full year</th><th class="n">vs ${E.y-1}</th></tr></thead><tbody>${fcRows.map(r=>`<tr><td>${{low:'Low',base:'Base',high:'High'}[r.k]}</td><td class="n">${eur(r.v)}</td><td class="n">${E.pyComplete?gTxt((r.v-E.pyFull)/E.pyFull):'—'}</td></tr>`).join('')}</tbody></table></div><p class="note" style="margin-top:8px">${E.rem.map(r=>`${mLong(r.key)}: ${r.part?`${eurS(r.mtd)} booked to day ${X.partial.day}; base = that daily pace over the month (${eurS(r.base)})`:`base = ${E.y-1} × (1 ${gTxt(E.g)})`}`).join('. ')}. Low uses the weaker of the year-to-date growth (${gTxt(E.g)}) and the latest month’s (${gTxt(E.gLast)}); high the stronger. Booked revenue is never projected below what is already in. A simple trend, not a model of orders.</p>`)}
   ${card('c6','Risks to watch',`<ul class="ins">${risks.map(r=>`<li class="w" style="cursor:default">${r}</li>`).join('')}</ul>`)}
   ${card('c6','Analyst commentary',`<div style="font-size:14.5px;line-height:1.6">${fresh?'':`<p class="chk bad" style="margin-top:0"><b>Written for the ledger of ${dLab(COMMENTARY_FOR)}.</b> The figures elsewhere on this page are live; this text is not.</p>`}
     <p style="margin-top:0">2026 is a milk-powder year. The category carries almost all of the growth, on both more tonnes and a higher price, and the price has kept rising through the autumn. The estimated margin over purchase price (about 17%) agrees with what the books show for milk powder, which makes it a reliable number to steer by. The question for the coming months is whether the higher price starts to cost volume: October tonnes were well below October 2025, and November is behind October’s pace.</p>
     <p>Calf housing is the weak spot. It is a project business with big, lumpy months, and the 2025 pattern shows December matters most. With no housing units waiting to be delivered, the December outcome depends on deals that are not yet in the system.</p>
     <p>The customer base is broad (no customer above a few percent) but it churns: roughly as much revenue was lost from customers who stopped as was won from new ones. Retention is the cheapest growth available, and the reorder radar shows where to start. Geographically, Germany and the UK grow while Hungary, Poland and Denmark shrink; this deserves a market-by-market review rather than a company-wide fix.</p>
     <p>The order list overstates the backlog: most orders still marked open are already invoiced or delivered and waiting for a bill. Invoicing the delivered ones is quick cash; closing the rest makes the order book usable again.</p>
     <p>Cash needs attention before growth: close to two-thirds of open receivables are overdue, concentrated in a handful of customers, one of which is also a top growth account. The books show a healthy result before tax, with transport as the cost line that grows with every extra tonne.</p>
     <p class="note">Commentary on the ledger of ${dLab(COMMENTARY_FOR)}.</p></div>`)}
  </div>
  `;
  const go=h=>{location.hash=h};
  $('#xT').querySelectorAll('li').forEach(li=>li.onclick=()=>go(take[+li.dataset.i][2]));
  $('#xD').querySelectorAll('li').forEach(li=>li.onclick=()=>go(dec[+li.dataset.i][2]));
  [['xY','overview'],['xM','products'],['xG','products'],['xB','results'],['xA','receivables'],['xC','customers'],['xR','reorder']].forEach(([id,h])=>{const e=$('#'+id);if(e)e.onclick=()=>go(h)});
  $('#xF').onclick=()=>$('#xO').scrollIntoView({behavior:'smooth',block:'center'});
  const months12=Array.from({length:12},(_,j)=>`${E.y}-${String(j+1).padStart(2,'0')}`),py=months12.map(k=>{const i=mIdx(`${E.y-1}-${k.slice(5)}`);return i>=0?E.mt.get(i)||0:null});
  const act=months12.map(k=>{const i=mIdx(k);return i>=0&&i<=E.L?E.mt.get(i)||0:(i===X.partial.m?E.mt.get(i)||0:null)}),fc=months12.map(k=>{const r=E.rem.find(x=>x.key===k);return r?r.base:null});
  chart($('#xO'),(s,W,H)=>columns(s,W,H,{labels:months12.map(k=>MN[+k.slice(5)-1]),series:[{vals:py,col:'var(--cmp)'},{vals:act,col:'var(--s1)'},{vals:fc,col:'var(--s3)'}],axis:v=>eurS(v),
    tip:i=>{const r=E.rem.find(x=>x.key===months12[i]);return`<b>${MN[i]} ${E.y}</b>${py[i]!=null?`<br>${E.y-1}: ${eur(py[i])}`:''}${act[i]!=null?`<br>${E.y} actual${r&&r.part?' (to day '+X.partial.day+')':''}: ${eur(act[i])}`:''}${r?`<br>Outlook: ${eur(r.base)} (low ${eurS(r.low)}, high ${eurS(r.high)})`:''}`}}));
};


}
