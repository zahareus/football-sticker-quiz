const fs=require('fs');const DIR='/tmp/sh-proto';
const B='https://stickerhunt.club/img/';
const T=['club_896/1777109170183_IMG_9620_web.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_9582_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1389_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1130_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1521_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1469_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_0444_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1111_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1432_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1520_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1737_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1157_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_9463_thumb.webp?v=2026-05-27','stickers/FC_Augsburg/IMG_0914_thumb.webp?v=2026-05-27','stickers/Eintracht_Frankfurt/IMG_8862_thumb.webp?v=2026-05-27','club_948/1767036555136_IMG_7767_thumb.webp?v=2026-05-27','stickers/FC_Bayern_Munich/IMG_0733_thumb.webp?v=2026-05-27','stickers/Hertha_BSC/IMG_0995_thumb.webp?v=2026-05-27','club_947/1751114262225_IMG_6075_thumb.webp?v=2026-05-27'];
const th=i=>B+T[((i%T.length)+T.length)%T.length];
const FL=c=>`https://flagcdn.com/w40/${c}.png`;
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const PIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';

const HEAD=(t,x='')=>`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t}</title><link rel="preconnect" href="https://stickerhunt.club"><link rel="stylesheet" href="shared.css"><style>${x}</style></head><body>`;
const HDR=`<header class="hdr"><div class="hdr-inner"><a class="logo" href="#"><img src="https://stickerhunt.club/logo.webp" alt="StickerHunt" width="126" height="32"></a><div class="spacer"></div><nav><a href="#">Catalogue</a><a href="#">Map</a><a href="#">Rating</a></nav><a class="play" href="#">▶ Play Quiz</a><div class="user"><div class="ava">V</div><span class="uname">victor</span><span class="caret">▾</span></div></div></header>`;
const FTR=`<footer><a href="#">About</a> · <a href="#">Catalogue</a> · <a href="#">Map</a> · <a href="#">Rating</a> · <a href="#">Leaderboard</a> · <a href="#">Terms</a> · <a href="#">Privacy</a> · © 2026 StickerHunt</footer></body></html>`;

// ---- plate helpers ----
function stPlate(o){ // sticker: square photo + optional foot/rate/rank
  const img=o.img!=null?`<div class="sh-st__img"><img src="${o.img}" alt="${esc(o.alt||'')}" width="200" height="200" loading="lazy" decoding="async">${o.rank?`<span class="sh-st__rank">${o.rank}</span>`:''}${o.rate?`<span class="sh-st__rate${o.unrated?' sh-st__rate--unrated':''}">${o.rate}</span>`:''}</div>`
    :`<div class="sh-st__img"><div class="sh-st__noimg">#${o.id||''}</div></div>`;
  const foot=(o.foot||o.footMeta)?`<div class="sh-st__foot"><span class="nm" title="${esc(o.foot||'')}">${esc(o.foot||'')}</span>${o.footMeta?`<span class="mt">${o.footMeta}</span>`:''}</div>`:'';
  return `<a class="sh-st" href="#" title="${esc(o.title||o.foot||'')}">${img}${foot}</a>`;
}
function clPlate(o){ // club: name-led row
  const badge=o.img!=null?`<span class="sh-cl__badge"><img src="${o.img}" alt=""></span>`:`<span class="sh-cl__badge"><span class="sh-cl__ph">${esc((o.name||'?').replace(/[^A-Za-z0-9]/g,'').charAt(0)||'?')}</span></span>`;
  const fl=o.flag?`<img class="fl" src="${FL(o.flag)}" alt="">`:'';
  const ct=o.count!=null?`<span class="sh-cl__ct">${o.count} sticker${o.count===1?'':'s'}</span>`:'';
  return `<a class="sh-cl" href="#" title="${esc(o.name)}">${badge}<span class="sh-cl__body"><span class="sh-cl__name">${fl}<span class="t">${esc(o.name)}</span></span>${ct}</span></a>`;
}
const coPlate=([n,c,cl,st])=>`<a class="sh-co" href="#" title="${esc(n)}"><img class="sh-co__flag" src="${FL(c)}" alt="${esc(n)} flag" width="40" height="27"><span class="sh-co__body"><span class="sh-co__name">${esc(n)}</span><span class="sh-co__ct">${st} stickers · ${cl} clubs</span></span></a>`;
const ciPlate=([n,c])=>`<a class="sh-ci" href="#" title="${esc(n)}"><span class="sh-ci__name">${PIN}<span class="t">${esc(n)}</span></span><span class="sh-ci__ct">${c} sticker${c===1?'':'s'}</span></a>`;
const chip=(k,v)=>`<span class="chip">${k?`<i>${k}</i>`:''}<span class="v">${v}</span></span>`;
const sec=(title,meta,inner)=> inner&&inner.trim()? `<div class="section"><div class="section-head"><h2>${title}</h2>${meta?`<span class="meta">${meta}</span>`:''}</div>${inner}</div>`:'';
function pag(cur,total){const out=[];out.push(cur>1?`<a class="nav" href="#">‹</a>`:`<span class="nav" style="opacity:.35">‹</span>`);const add=n=>out.push(n===cur?`<span class="cur">${n}</span>`:`<a href="#">${n}</a>`);const gap=()=>out.push(`<span class="gap">…</span>`);const pages=new Set([1,2,total,cur-1,cur,cur+1]);for(let i=1;i<=total;i++)if(pages.has(i)&&i>=1&&i<=total){}; // build window
  let last=0;for(let i=1;i<=total;i++){if(i===1||i===total||Math.abs(i-cur)<=1){if(last&&i-last>1)gap();add(i);last=i;}}
  out.push(cur<total?`<a class="nav" href="#">›</a>`:`<span class="nav" style="opacity:.35">›</span>`);return `<div class="pag">${out.join('')}</div>`;}

// ===== shared data =====
const COUNTRIES={Europe:[['Germany','de',151,1134],['Spain','es',73,450],['France','fr',32,281],['Netherlands','nl',42,200],['Italy','it',61,196],['Sweden','se',19,121],['England','gb-eng',44,117],['Switzerland','ch',12,97],['Turkey','tr',14,95],['Czech Republic','cz',18,94],['Poland','pl',36,91],['Belgium','be',12,90],['Austria','at',16,72],['Portugal','pt',15,61],['Scotland','gb-sct',13,54],['Serbia','rs',9,42],['Norway','no',11,40],['Hungary','hu',10,33],['Russia','ru',12,31],['Romania','ro',8,28],['Greece','gr',7,26],['Denmark','dk',9,24],['Bulgaria','bg',6,20],['Croatia','hr',6,19],['Finland','fi',7,18],['Ireland','ie',6,16],['Slovakia','sk',6,15],['Ukraine','ua',7,14],['Bosnia & Herz.','ba',5,12],['Latvia','lv',4,11],['Montenegro','me',3,9],['Slovenia','si',4,9],['Wales','gb-wls',4,8],['Estonia','ee',3,7],['Georgia','ge',3,6],['Liechtenstein','li',1,5],['Monaco','mc',1,4],['Luxembourg','lu',2,4],['Kazakhstan','kz',2,3],['Cyprus','cy',2,3],['Lithuania','lt',2,3],['Northern Ireland','gb-nir',2,2]],'South America':[['Argentina','ar',8,24],['Colombia','co',5,12],['Chile','cl',4,9],['Brazil','br',6,11],['Uruguay','uy',3,5],['Bolivia','bo',1,2]],'North America':[['Mexico','mx',5,10],['United States','us',6,9],['Canada','ca',3,4]],Asia:[['Israel','il',4,8],['Japan','jp',3,5],['Armenia','am',1,2]],Africa:[['Morocco','ma',2,4],['Algeria','dz',2,3],['Egypt','eg',1,1]]};
const ALLC=Object.values(COUNTRIES).flat();
const CITIES=[['Amsterdam',173],['Stuttgart',89],['Brussels',78],['Prague',71],['Tonbridge',64],['Maastricht',58],['The Hague',52],['Delft',47],['Santiago de Compostela',41],['Nantes',38],['Cartagena',34],['Seville',31]];
const TOPCLUBS=[['VfB Stuttgart',67,'de'],['TSV 1860 München',62,'de'],['Dynamo Dresden',60,'de'],['FC Bayern Munich',57,'de'],['1. FC Nürnberg',56,'de'],['Hertha BSC',56,'de'],['SC Freiburg',52,'de'],['Fortuna Düsseldorf',50,'de']];
const RECENT=[['TSV 1860',1],['FC Augsburg',13],['Eintracht Frankfurt',14],['Borussia Dortmund',15],['FC Bayern',16],['Hertha BSC',17]];
const TOPRATED=[['TSV 1860',7,1575],['FC Bayern',16,1557],['Dortmund',15,1557],['Frankfurt',14,1548],['Hertha BSC',17,1540],['VfB Stuttgart',18,1533]];

// real-ish German club list
const REAL_DE=['VfB Stuttgart','TSV 1860 München','Dynamo Dresden','FC Bayern Munich','1. FC Nürnberg','Hertha BSC','SC Freiburg','Fortuna Düsseldorf','Werder Bremen','1. FC Köln','Hamburger SV','FC St. Pauli','FC Schalke 04','Bayer Leverkusen','Borussia M.gladbach','1. FC Kaiserslautern','Karlsruher SC','Borussia Dortmund','Eintracht Frankfurt','FC Augsburg','Hannover 96','VfL Bochum','SV Darmstadt 98','Arminia Bielefeld','SpVgg Greuther Fürth','SV Sandhausen','Hansa Rostock','Eintracht Braunschweig','FC Erzgebirge Aue','Holstein Kiel','SV Wehen Wiesbaden','FC Ingolstadt 04','MSV Duisburg','Rot-Weiss Essen','Waldhof Mannheim','VfL Osnabrück','SC Verl','TSV Havelse','SV Meppen','Würzburger Kickers','Chemnitzer FC','FC Energie Cottbus','VfB Lübeck','Preußen Münster','SpVgg Unterhaching','BFC Dynamo','1. FC Magdeburg','FC Viktoria Köln','Kickers Offenbach','SC Paderborn'];
const TOWNS=['Aachen','Bonn','Trier','Kassel','Erfurt','Jena','Gera','Halle','Kiel','Rostock','Potsdam','Bamberg','Passau','Ulm','Pforzheim','Heilbronn','Worms','Speyer','Fulda','Gießen','Marburg','Siegen','Hagen','Soest','Minden','Celle','Goslar','Lüneburg','Stade','Flensburg','Schwerin','Wismar','Stralsund','Görlitz','Bautzen','Plauen','Zwickau','Weimar','Suhl','Coburg','Hof','Amberg','Landshut','Rosenheim','Kempten','Konstanz','Offenburg','Lahr','Tübingen','Esslingen','Aalen','Schweinfurt','Bayreuth','Wolfsburg','Salzgitter','Hildesheim','Detmold','Herford','Gütersloh'];
function deClubs(n){const o=[];for(let i=0;i<n;i++){let name=i<REAL_DE.length?REAL_DE[i]:`${['FC','SV','TSV','VfL','SpVgg','1. FC','SC'][i%7]} ${TOWNS[(i-REAL_DE.length)%TOWNS.length]}`;o.push([name,Math.max(1,67-Math.floor(i*0.42))]);}return o;}
const DE_ALL=deClubs(156);

// ============================================================ STICKER
function buildSticker(d){
  const ND='<b style="color:var(--muted)">no data</b>';
  const mets=`<div class="metrics2" style="margin-top:18px;">`+
    `<a class="metric metric-link" href="#" title="See full rankings"><span class="arr">↗</span><div class="val">${d.likeRate!=null?d.likeRate:'…'}</div><div class="lab">Like Rate</div><div class="sub">${d.rank?'Rank #'+d.rank:'unranked'}</div></a>`+
    `<div class="metric"><div class="val">${['Easy','Medium','Hard'][d.difficulty-1]}</div><div class="lab">Difficulty</div><div class="dmeter">${[1,2,3].map(i=>`<i class="${i<=d.difficulty?'on':''}"></i>`).join('')}</div></div>`+
    `</div>`;
  const prov=`<div class="prov" style="margin-top:18px;">`+
    `<div class="row"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span>Added ${d.added?`<b>${d.added}</b>`:ND}</span></div>`+
    `<div class="row"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg><span>Hunted ${d.hunted?`<b>${d.hunted}</b>`:ND}${d.location?` · <a href="#">${esc(d.location)}</a>`:''}</span></div>`+
    `</div>`;
  const cta=`<div class="cta" style="margin-top:18px;"><a class="btn btn-primary" href="#">▶ Play the quiz · one of 3,569 stickers</a><a class="btn btn-ghost" href="#">See all ${d.clubCount} sticker${d.clubCount===1?'':'s'} from ${esc(d.club)} →</a></div>`;
  const flag=d.flag?`<img class="flag" src="${FL(d.flag)}" alt="${esc(d.country||'')}" width="34" height="23">`:'';
  const X=`.hero{display:grid;grid-template-columns:minmax(0,400px) 1fr;gap:40px;align-items:start;}.shot{position:relative;}.shot-frame{border:3px solid var(--ink);border-radius:var(--r);overflow:hidden;background:var(--surface);box-shadow:var(--shadow);}.shot-frame img{width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;display:block;}.snav-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 12px;pointer-events:none;}.snav{pointer-events:auto;width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.38);border:2px solid rgba(18,18,18,.4);border-radius:var(--r-sm);font-size:1.1rem;font-weight:800;color:rgba(18,18,18,.55);opacity:.75;transition:.16s;}.snav:hover{background:var(--accent);border-color:var(--ink);color:var(--accent-ink);opacity:1;box-shadow:var(--shadow-sm);}@media(max-width:760px){.hero{grid-template-columns:1fr;gap:22px;}}`;
  let snav='';
  if(d.prev||d.next) snav=`<div class="snav-overlay">${d.prev?`<a class="snav" href="#" aria-label="Previous">‹</a>`:'<span></span>'}${d.next?`<a class="snav" href="#" aria-label="Next">›</a>`:'<span></span>'}</div>`;
  const moreClub=sec(`More from ${esc(d.club)}`,d.clubCount>1?`${d.clubCount} stickers`:'',d.moreClub.length?`<div class="sh-grid g6">${d.moreClub.map(m=>stPlate({img:th(m.i),title:d.club})).join('')}</div>`:'');
  const fromCo=sec(`More football stickers from ${esc(d.country||'around')}`,'top rated',d.fromCountry.length?`<div class="sh-grid g6">${d.fromCountry.map(m=>stPlate({img:th(m.i),title:m.club,alt:m.club+' sticker'})).join('')}</div>`:'');
  const map=d.hasMap?`<div class="section"><div class="mapblock"><div class="mh"><span>Where it was found</span></div><div class="mb" style="background-image:url('${th(0)}');filter:grayscale(.45);"></div></div></div>`:'';
  return HEAD(`${esc(d.club)} Sticker #${d.id} — StickerHunt`,X)+HDR+`<div class="wrap">
<div class="crumb"><a href="#">Catalogue</a><span class="sep">›</span><a href="#">${esc(d.country)}</a><span class="sep">›</span><a href="#">${esc(d.club)}</a><span class="sep">›</span><span class="here">Sticker #${d.id}</span></div>
<div class="hero"><div class="shot"><div class="shot-frame"><img src="${th(0)}" alt="${esc(d.club)} football sticker #${d.id}" width="1200" height="1200"></div>${snav}</div>
<div class="panel"><div class="idhead">${flag}<h1>${esc(d.club)}</h1></div>
${mets}${prov}${cta}</div></div>
${moreClub}${fromCo}${map}
<div class="section"><div class="about"><h2>About this sticker</h2><p>${d.about}</p></div></div>
</div>`+FTR;
}

// ============================================================ CLUB
function buildClub(d){
  const ND='<span style="color:var(--muted)">no data</span>';
  const kvRow=(k,v)=>`<div class="kvrow"><span class="k">${k}</span><span class="v">${v||ND}</span></div>`;
  const left=`<div class="infocard"><div class="kv">${kvRow('City',d.city)}${kvRow('Founded',d.founded)}${kvRow('Stadium',d.stadium)}${kvRow('Site',d.site?`<a href="#" title="${esc(d.siteFull||d.site)}">${esc(d.site)} ↗</a>`:'')}</div></div>`;
  const right=`<div class="infocard"><div class="tt" style="font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:10px 0 9px;">Tags &amp; links</div>${d.hashtags.length?`<div class="tags">${d.hashtags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:`<div style="color:var(--muted);font-size:.8rem;font-weight:600;">No tags</div>`}<div class="kv" style="margin-top:8px;">${kvRow('Wiki',d.wiki?`<a href="#" title="${esc(d.wikiFull||d.wiki)}">${esc(d.wiki)} ↗</a>`:'')}</div></div>`;
  const twocol=`<div class="twocol">${left}${right}</div>`;
  const about=d.about?`<div class="section"><div class="about"><h2>About ${esc(d.name)}</h2><p>${d.about}</p></div></div>`:'';
  const mets=`<div class="metrics3" style="margin-top:18px;">`+
    `<div class="metric"><div class="val">${d.count}</div><div class="lab">Stickers in DB</div></div>`+
    `<a class="metric metric-link" href="#"><span class="arr">↗</span><div class="val">${d.count>0&&d.rank?'#'+d.rank:'<span style=\"color:var(--muted)\">—</span>'}</div><div class="lab">Most collected</div><div class="sub">in ${esc(d.country)}</div></a>`+
    `<a class="metric metric-link" href="#"><span class="arr">↗</span><div class="val">${d.count>0&&d.topRate?d.topRate:'<span style=\"color:var(--muted)\">—</span>'}</div><div class="lab">Top Like Rate</div></a>`+
    `</div>`;
  const gallery=d.count>0?`<div class="sh-grid g7">${Array.from({length:Math.min(d.count,42)},(_,i)=>stPlate({img:th(i)})).join('')}</div>`:'<div class="about"><p>No stickers found for this club yet.</p></div>';
  const map=d.hasMap?`<div class="section"><div class="mapblock"><div class="mh"><span>Sticker locations</span><span class="loc">${d.count} found worldwide</span></div><div class="mb" style="background-image:url('${th(0)}');filter:grayscale(.45);"></div></div></div>`:'';
  const others=d.others.length?`<div class="sh-grid g4">${d.others.map(o=>clPlate({name:o[0],count:o[1],flag:'de',img:th(o[2]!=null?o[2]:1)})).join('')}<a class="sh-cl more" href="#">View all 156 clubs from ${esc(d.country)} →</a></div>`:'';
  return HEAD(`${esc(d.name)} Stickers — ${d.count} | StickerHunt`)+HDR+`<div class="wrap">
<div class="crumb"><a href="#">Catalogue</a><span class="sep">›</span><a href="#">${esc(d.country)}</a><span class="sep">›</span><span class="here">${esc(d.name)}</span></div>
<div class="idhead"><img class="flag" src="${FL('de')}" alt="${esc(d.country)}" width="34" height="23"><h1>${esc(d.name)}</h1></div>
${twocol}
${about}
${mets}
${sec(`All ${d.count} sticker${d.count===1?'':'s'}`,d.count>0?'found by fans':'',gallery)}
${map}
${sec(`Other clubs from ${esc(d.country)}`,'156 clubs',others)}
</div>`+FTR;
}

// ============================================================ COUNTRY
function buildCountry(d){
  const mets=`<div class="metrics3" style="margin-top:18px;"><div class="metric"><div class="val">${d.clubs}</div><div class="lab">Clubs</div></div><div class="metric"><div class="val">${d.stickers}</div><div class="lab">Stickers</div></div><a class="metric metric-link" href="#" title="All countries"><span class="arr">↗</span><div class="val">#${d.catRank}</div><div class="lab">By stickers</div><div class="sub">of ${d.totalCountries} countries</div></a></div>`;
  const mc=sec('Most Collected','by number of stickers',d.mostCollected.length?`<div class="sh-grid g4">${d.mostCollected.map((c,i)=>clPlate({name:c[0],count:c[1],flag:'de',img:th(i+1)})).join('')}</div>`:'');
  const fs=sec('Featured Stickers','top by rating',d.featured.length?`<div class="sh-grid g6">${d.featured.map(f=>stPlate({img:th(f[1]),foot:f[0],rate:'⚡ '+f[2],title:f[0]})).join('')}</div>`:'');
  const all=sec(`All clubs`,`${d.clubs} clubs · A–Z`,d.allClubs.length?`<div class="sh-grid g4">${d.allClubs.map((c,i)=>clPlate({name:c[0],count:c[1],flag:'de',img:th(i+1)})).join('')}</div>`:'');
  return HEAD(`${esc(d.name)} Football Stickers — ${d.clubs} Clubs, ${d.stickers} Stickers | StickerHunt`)+HDR+`<div class="wrap">
<div class="crumb"><a href="#">Catalogue</a><span class="sep">›</span><span class="here">${esc(d.name)}</span></div>
<div class="idhead"><img class="flag" src="${FL(d.flag)}" alt="${esc(d.name)} flag" width="34" height="23"><h1>${esc(d.name)}</h1></div>
${mets}
${mc}${fs}${all}
<div class="section"><div class="about"><h2>About ${esc(d.name)} football stickers</h2><p>${d.seo}</p></div></div>
</div>`+FTR;
}

// ============================================================ CATALOGUE
function buildCatalogue(){
  const X=`.cat-hero{text-align:center;padding:36px 0 8px;}.cat-hero h1{font-size:2.2rem;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;margin:0 0 6px;}.cat-hero p{color:var(--ink-2);font-size:.9rem;font-weight:600;margin:0 0 16px;}.cat-search{display:flex;max-width:520px;margin:0 auto;border:3px solid var(--ink);border-radius:var(--r-sm);box-shadow:var(--shadow);overflow:hidden;background:var(--surface);}.cat-search input{flex:1;border:none;outline:none;padding:12px 16px;font-family:inherit;font-size:1rem;background:transparent;}.cat-search button{background:var(--accent);border:none;border-left:3px solid var(--ink);padding:0 18px;font-weight:800;text-transform:uppercase;font-size:.82rem;color:var(--accent-ink);}.continent{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:22px 0 10px;}`;
  return HEAD('Football Sticker Catalogue — 54 Countries, 720 Clubs | StickerHunt',X)+HDR+`<div class="wrap">
<div class="cat-hero"><h1>Football Sticker Catalogue</h1><p>Browse 2,684 stickers from 720 clubs across 56 countries. Find any club, country, or city.</p><div class="cat-search"><input placeholder="Search clubs, countries, cities…"><button>Search</button></div></div>
${sec('Recently Added','<a href="stickerlog.html">View full log →</a>',`<div class="sh-grid g6">${RECENT.map(([n,i])=>stPlate({img:th(i),foot:n,footMeta:'2d',title:n})).join('')}</div>`)}
${sec('Most Rated','<a href="rating.html">View full rating →</a>',`<div class="sh-grid g6">${TOPRATED.map(([n,i,r])=>stPlate({img:th(i),foot:n,rate:'⚡ '+r,title:n})).join('')}</div>`)}
${sec('Most Collected Clubs','720 clubs',`<div class="sh-grid g4">${TOPCLUBS.slice(0,4).map((c,i)=>clPlate({name:c[0],count:c[1],flag:c[2],img:th(i+1)})).join('')}</div>`)}
<div class="section"><div class="section-head"><h2>Browse by Country</h2><span class="meta">56 countries</span></div>${Object.entries(COUNTRIES).map(([cont,list])=>`<div class="continent">${cont}</div><div class="sh-grid g4">${list.map(coPlate).join('')}</div>`).join('')}</div>
${sec('Browse by City','<a href="cities.html">all cities →</a>',`<div class="sh-grid g4">${CITIES.map(ciPlate).join('')}</div>`)}
<div class="section"><div class="about"><h2>About the Football Sticker Catalogue</h2><p>StickerHunt maintains the world's largest database of fan-spotted football stickers found on streets, walls and lampposts. Our catalogue covers 720 clubs from 56 countries, with Germany, Spain and France leading the collection. Each sticker is photographed and logged in its real-world location, with a community rating, find location and difficulty. Browse by country, city or use the search to find a specific club.</p></div></div>
</div>`+FTR;
}

// ============================================================ HOME
function buildHome(){
  const X=`.hp-hero{text-align:center;padding:38px 0 6px;}.hp-hero h1{font-size:2.2rem;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;margin:0 0 12px;}.hp-statline{font-size:.95rem;font-weight:700;color:var(--ink-2);margin:0 0 18px;}.hp-statline b{color:var(--ink);font-size:1.05rem;}.hp-statline .s{color:var(--muted);margin:0 8px;}.hp-search{display:flex;max-width:520px;margin:0 auto;border:3px solid var(--ink);border-radius:var(--r-sm);box-shadow:var(--shadow);overflow:hidden;background:var(--surface);}.hp-search input{flex:1;border:none;outline:none;padding:12px 16px;font-family:inherit;font-size:1rem;background:transparent;}.hp-search button{background:var(--accent);border:none;border-left:3px solid var(--ink);padding:0 18px;font-weight:800;text-transform:uppercase;font-size:.82rem;color:var(--accent-ink);}.daily{display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--accent);border:2px solid var(--ink);box-shadow:var(--shadow);border-radius:var(--r-sm);padding:16px 20px;margin-top:30px;}.daily .dt{font-weight:800;text-transform:uppercase;font-size:1rem;}.daily .dd{font-size:.82rem;color:var(--accent-ink);font-weight:600;}.daily .btn{background:var(--ink);color:#fff;box-shadow:none;}.modes{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}.mode{border:2px solid var(--ink);border-radius:var(--r-sm);padding:22px;text-align:center;background:var(--surface);transition:.12s;}.mode:hover{background:var(--accent);box-shadow:var(--shadow);transform:translate(-3px,-3px);}.mode .mt{font-size:1.05rem;font-weight:800;text-transform:uppercase;margin-bottom:5px;}.mode .md{font-size:.78rem;color:var(--ink-2);font-weight:500;}.mode:hover .md{color:var(--accent-ink);}.mapprev{border:2px solid var(--ink);border-radius:var(--r);overflow:hidden;}.mapprev .mh{padding:14px 18px;border-bottom:2px solid var(--ink);background:var(--surface-2);}.mapprev .mh .mt{font-weight:800;text-transform:uppercase;font-size:.95rem;}.mapprev .mh .ms{font-size:.78rem;color:var(--muted);font-weight:500;}.mapprev .mb{height:300px;background:#dde7ea url('${th(0)}') center/cover;filter:grayscale(.45);display:flex;align-items:center;justify-content:center;}.mapprev .mb .btn{background:var(--accent);color:var(--accent-ink);box-shadow:var(--shadow);}.gco{grid-template-columns:repeat(6,1fr);}@media(max-width:760px){.modes{grid-template-columns:1fr;}.gco{grid-template-columns:repeat(3,1fr);}}`;
  return HEAD("StickerHunt — The World's Football Sticker Database",X)+HDR+`<div class="wrap">
<div class="hp-hero"><h1>The World's Football<br>Sticker Database</h1><p class="hp-statline"><b>2,529</b> stickers<span class="s">·</span><b>715</b> clubs<span class="s">·</span><b>54</b> countries</p><div class="hp-search"><input placeholder="Search clubs, countries, cities…"><button>Explore</button></div></div>
<div class="daily"><div><div class="dt">Daily Quiz</div><div class="dd">Can you identify today's mystery sticker? New challenge every day.</div></div><a class="btn btn-primary" href="#">Play Now</a></div>
${sec('Recently Added','<a href="stickerlog.html">view all recent →</a>',`<div class="sh-grid g6">${RECENT.map(([n,i])=>stPlate({img:th(i),foot:n,footMeta:'2d',title:n})).join('')}</div>`)}
${sec('Top Rated Stickers','<a href="rating.html">view full rating →</a>',`<div class="sh-grid g6">${TOPRATED.map(([n,i,r])=>stPlate({img:th(i),foot:n,rate:'⚡ '+r,title:n})).join('')}</div>`)}
<div class="section"><div class="section-head"><h2>Discover by Country</h2><span class="meta"><a href="catalogue.html">all 54 countries →</a></span></div><div class="sh-grid g4">${ALLC.map(coPlate).join('')}</div></div>
<div class="section"><div class="mapprev"><div class="mh"><div class="mt">Explore the Map</div><div class="ms">2,529 stickers from 715 clubs across 54 countries, mapped worldwide</div></div><div class="mb"><a class="btn" href="#">Open Interactive Map</a></div></div></div>
${sec('Browse by City','<a href="cities.html">all cities →</a>',`<div class="sh-grid g4">${CITIES.map(ciPlate).join('')}</div>`)}</div>`+FTR;
}

// ============================================================ RATING + STICKERLOG (successor pages)
function buildRating(){
  return HEAD('Sticker Rating — StickerHunt')+HDR+`<div class="wrap">
<div class="idhead"><h1>Sticker Rating</h1></div>
<div class="cta" style="flex-direction:row;margin:16px 0 0;"><a class="btn btn-primary" href="#" style="flex:0 0 auto;">▶ Rate stickers in Battle</a></div>
${sec('Top rated stickers','ranked by Like Rate',`<div class="sh-grid g6">${Array.from({length:100},(_,i)=>{const n=TOPRATED[i%TOPRATED.length];return stPlate({img:th(i),foot:n[0],rate:'⚡ '+(1575-i*4),rank:i+1,title:n[0]});}).join('')}</div>`)}
${pag(1,142)}
</div>`+FTR;
}
function buildStickerlog(){
  const day=(label,n)=>`<div class="section"><div class="section-head"><h2>${label}</h2><span class="meta">${n} added</span></div><div class="sh-grid g6">${Array.from({length:n},(_,i)=>stPlate({img:th(i),foot:RECENT[i%RECENT.length][0],title:RECENT[i%RECENT.length][0]})).join('')}</div></div>`;
  return HEAD('Sticker Log — Recently Added | StickerHunt')+HDR+`<div class="wrap">
<div class="idhead"><h1>Sticker Log</h1></div>
<p style="color:var(--ink-2);font-weight:500;margin:6px 0 0;">Every sticker added to StickerHunt, newest first — up to 100 per page.</p>
${day('7 June 2026',64)}
${day('6 June 2026',36)}
${pag(1,58)}
</div>`+FTR;
}

// ===== NORMAL pages =====
const stickerData={id:3348,club:'TSV 1860 München',flag:'de',country:'Germany',clubCount:62,
  chips:[['City','Munich, Germany'],['Founded','1860'],['League','3. Liga'],['Stadium','Grünwalder Stadion']],
  likeRate:1460,rank:3464,difficulty:2,added:'25 April 2026',hunted:'2 January 2025',location:'Istanbul, Turkey',
  prev:true,next:true,hasMap:true,moreClub:[1,2,3,4,5,6].map(i=>({i})),
  fromCountry:[['FC Augsburg',13],['Eintracht Frankfurt',14],['Borussia Dortmund',15],['FC Bayern Munich',16],['Hertha BSC',17],['VfB Stuttgart',18]].map(([club,i])=>({club,i})),
  about:'Sticker #3348 belongs to <b>TSV 1860 München</b>, a club founded in 1860 and now playing in the 3. Liga, with home matches at the Grünwalder Stadion. It was spotted in Istanbul, Turkey, and logged in the StickerHunt database — a collection of real football street stickers photographed by fans worldwide, each with its own rating, find location and difficulty. Browse more from TSV 1860 München, or explore every club from Germany in the catalogue.'};
fs.writeFileSync(DIR+'/sticker.html',buildSticker(stickerData));

const clubData={name:'TSV 1860 München',country:'Germany',count:62,rank:2,topRate:1575,
  city:'Munich, Germany',founded:'1860',stadium:'Grünwalder Stadion',site:'tsv1860.de',siteFull:'https://tsv1860.de',
  web:'instagram.com/tsv1860',webFull:'https://instagram.com/tsv1860',wiki:'de.wikipedia.org',wikiFull:'https://de.wikipedia.org/wiki/TSV_1860_München',
  hashtags:['#tsv1860','#tsv','#lions','#mia60','#drittelliga'],
  hasMap:true,others:TOPCLUBS.slice(0,7).map((c,i)=>[c[0],c[1],i+1]),
  about:'TSV 1860 München, nicknamed "die Löwen" (the Lions), is a Munich football club founded in 1860 — one of Germany\'s oldest. League champions in 1966 and DFB-Pokal winners in 1964, the club today plays in the 3. Liga with home matches at the historic Grünwalder Stadion. StickerHunt holds <b>62</b> TSV 1860 stickers photographed by fans on streets around the world.'};
fs.writeFileSync(DIR+'/club.html',buildClub(clubData));

const countryData={name:'Germany',flag:'de',clubs:156,stickers:1254,catRank:1,totalCountries:54,
  mostCollected:TOPCLUBS.slice(0,8),featured:[['TSV 1860',1,1575],['FC Bayern',16,1557],['Dortmund',15,1557],['Frankfurt',14,1548],['Hertha BSC',17,1540],['VfB Stuttgart',18,1533]],allClubs:DE_ALL,
  seo:'StickerHunt features stickers from 156 clubs across Germany. The most collected clubs include VfB Stuttgart, TSV 1860 München, Dynamo Dresden, FC Bayern Munich and 1. FC Nürnberg. Each club page shows all stickers found, their map locations and community ratings. Browse the complete German collection and discover fan-spotted stickers from across the country.'};
fs.writeFileSync(DIR+'/country.html',buildCountry(countryData));
fs.writeFileSync(DIR+'/catalogue.html',buildCatalogue());
fs.writeFileSync(DIR+'/home.html',buildHome());

// ===== ALL CITIES page (cities/index.html → "Cities") =====
const CITIES_FULL=[['Amsterdam','Netherlands',173],['Istanbul','Turkey',161],['Prague','Czechia',128],['Torrevieja','Spain',127],['Stuttgart','Germany',90],['Brussels','Belgium',78],['Strasbourg','France',72],['Düsseldorf','Germany',64],['Tonbridge','England',64],['Maastricht','Netherlands',58],['The Hague','Netherlands',52],['Delft','Netherlands',47],['Santiago de Compostela','Spain',41],['Nantes','France',38],['Cartagena','Spain',34],['Seville','Spain',31],['Alicante','Spain',28],['A Coruña','Spain',25],['Angers','France',22],['Alanya','Turkey',19]];
const ciPlate2=([n,co,c])=>`<a class="sh-ci sh-ci--col" href="#" title="${esc(n)}"><span class="sh-ci__name">${PIN}<span class="t">${esc(n)}</span></span><span class="sh-ci__ct">${esc(co)} · ${c} stickers</span></a>`;
fs.writeFileSync(DIR+'/cities.html',HEAD('Football Sticker Cities | StickerHunt')+HDR+`<div class="wrap">
<div class="idhead"><h1>Cities</h1></div>
<p style="color:var(--ink-2);font-weight:500;margin:6px 0 18px;">Browse football stickers by the city where fans found them.</p>
<div class="sh-grid g4">${CITIES_FULL.map(ciPlate2).join('')}</div>
</div>`+FTR);

// ===== SINGLE CITY page (cities/{city}.html) — Istanbul — faithful 1:1 =====
fs.writeFileSync(DIR+'/city.html',HEAD('Istanbul, Turkey — 161 Football Stickers | StickerHunt','.cinfo{margin-top:14px;display:flex;flex-direction:column;gap:6px;}.cinfo .ci{margin:0;font-size:.92rem;color:var(--ink-2);font-weight:500;}.cinfo .ci b{color:var(--ink);font-weight:700;}')+HDR+`<div class="wrap">
<div class="crumb"><a href="#">Catalogue</a><span class="sep">›</span><a href="cities.html">Cities</a><span class="sep">›</span><span class="here">Istanbul</span></div>
<h1 style="font-size:1.9rem;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;margin:6px 0 16px;overflow-wrap:anywhere;">Istanbul, Turkey — 161 Football Stickers</h1>
<div class="chips">${chip('Population','14,804,116')}</div>
<div class="section" style="margin-top:16px;"><div class="about"><p style="margin:0;">Istanbul is the largest city in Turkey, constituting the country's economic, cultural, and historical center. With a population of over 15 million, it is home to 18% of the population of Turkey.</p><p style="margin:10px 0 0;font-size:.8rem;color:var(--muted);">Source: <a href="#" style="color:var(--accent-deep);">Wikipedia</a></p></div></div>
<div class="cinfo">
  <p class="ci">📦 Clubs represented: <b>69 clubs from 25 countries</b></p>
  <p class="ci">📅 First found: <b>31 Dec 2024</b> | Latest: <b>3 Jan 2025</b></p>
  <p class="ci">🌍 Most common: <b>Turkey (64)</b>, Germany (32), Russia (11), England (6), Algeria (6)</p>
</div>
<div class="section"><div class="sh-grid g7">${Array.from({length:42},(_,i)=>stPlate({img:th(i)})).join('')}</div></div>
<div class="section"><div class="mapblock"><div class="mh"><span>Sticker Locations</span></div><div class="mb" style="background-image:url('${th(0)}');filter:grayscale(.45);"></div><div style="text-align:center;padding:14px;border-top:2px solid var(--ink);"><a class="btn btn-ghost" href="#" style="display:inline-flex;">View Full Map</a></div></div></div>
</div>`+FTR);
fs.writeFileSync(DIR+'/rating.html',buildRating());
fs.writeFileSync(DIR+'/stickerlog.html',buildStickerlog());

// ===== CORNER-CASE VARIANTS (self-QA) =====
const V=DIR+'/qa';fs.mkdirSync(V,{recursive:true});fs.copyFileSync(DIR+'/shared.css',V+'/shared.css');
// sticker: no location/no map, only sticker of club (no More-from-club, no See-all), no prev, no rating
fs.writeFileSync(V+'/sticker_minimal.html',buildSticker({id:9001,club:'FC X',flag:'lu',country:'Luxembourg',clubCount:1,chips:[],likeRate:null,rank:null,difficulty:1,added:'1 June 2026',hunted:null,location:null,prev:false,next:true,hasMap:false,moreClub:[],fromCountry:[],about:'Sticker #9001 from FC X. Logged in the StickerHunt database of real football street stickers.'}));
// sticker: super long club name
fs.writeFileSync(V+'/sticker_longname.html',buildSticker({...stickerData,id:9002,club:'Club Atlético de Madrid Sociedad Anónima Deportiva Reserves',chips:[['City','A very long city name, Region, Country'],['Founded','1903'],['League','Primera Federación Group 2'],['Stadium','Estadio Cívitas Metropolitano Annex Training Ground']]}));
// club: 0 stickers, no wiki, no hashtags, no web
fs.writeFileSync(V+'/club_empty.html',buildClub({name:'SV Newtown',country:'Germany',count:0,rank:null,topRate:null,city:'Newtown, Germany',founded:null,stadium:null,site:null,web:null,wiki:null,hashtags:[],hasMap:false,others:TOPCLUBS.slice(0,3).map((c,i)=>[c[0],c[1],i+1]),about:''}));
// club: 1 sticker, many hashtags, long url
fs.writeFileSync(V+'/club_oneandtags.html',buildClub({name:'1. FC Verylongclubnamerington United',country:'Germany',count:1,rank:140,topRate:1488,city:'Town',founded:'1999',stadium:'Stadium',site:'verylongofficialdomain.example.com',siteFull:'https://verylongofficialdomain.example.com',web:'verylongdomain.example.com/path',webFull:'https://verylongdomain.example.com/wiki/Some_Very_Long_Path',wiki:'en.wikipedia.org',wikiFull:'https://en.wikipedia.org/wiki/Some_Club',hashtags:['#tag1','#anotherlongtag','#ultras','#fans','#football','#supporters','#hardcore','#1899','#green','#white','#derby','#promotion'],hasMap:false,others:[],about:'Short.'}));
// country: 1 club
fs.writeFileSync(V+'/country_tiny.html',buildCountry({name:'Bosnia and Herzegovina',flag:'ba',clubs:1,stickers:0,catRank:48,totalCountries:54,mostCollected:[],featured:[],allClubs:[['FK Sarajevo',0]],seo:'StickerHunt features stickers from 1 club across Bosnia and Herzegovina.'}));

console.log('built normal: sticker, club, country, catalogue, home, rating, stickerlog + qa variants');
