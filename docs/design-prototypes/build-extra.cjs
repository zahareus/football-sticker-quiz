const fs=require('fs');const DIR='/tmp/sh-proto';
const B='https://stickerhunt.club/img/';
const T=['club_896/1777109170183_IMG_9620_web.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_9582_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1389_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1130_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1521_thumb.webp?v=2026-05-27','stickers/TSV_1860_Munchen/IMG_1469_thumb.webp?v=2026-05-27','stickers/FC_Augsburg/IMG_0914_thumb.webp?v=2026-05-27','stickers/Eintracht_Frankfurt/IMG_8862_thumb.webp?v=2026-05-27','club_948/1767036555136_IMG_7767_thumb.webp?v=2026-05-27','stickers/FC_Bayern_Munich/IMG_0733_thumb.webp?v=2026-05-27','stickers/Hertha_BSC/IMG_0995_thumb.webp?v=2026-05-27','club_947/1751114262225_IMG_6075_thumb.webp?v=2026-05-27'];
const th=i=>B+T[((i%T.length)+T.length)%T.length];
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const HEAD=(t,x='')=>`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t}</title><link rel="preconnect" href="https://stickerhunt.club"><link rel="stylesheet" href="shared.css"><style>${x}</style></head><body>`;
const HDR=`<header class="hdr"><div class="hdr-inner"><a class="logo" href="#"><img src="https://stickerhunt.club/logo.webp" alt="StickerHunt" width="126" height="32"></a><div class="spacer"></div><nav><a href="#">Catalogue</a><a href="#">Map</a><a href="#">Rating</a></nav><a class="play" href="#">▶ Play Quiz</a><div class="user"><div class="ava">V</div><span class="uname">victor</span><span class="caret">▾</span></div></div></header>`;
const FTR=`<footer><a href="#">About</a> · <a href="#">Catalogue</a> · <a href="#">Map</a> · <a href="#">Rating</a> · <a href="#">Leaderboard</a> · <a href="#">Terms</a> · <a href="#">Privacy</a> · © 2026 StickerHunt</footer></body></html>`;
const W=(name,body,x='')=>fs.writeFileSync(DIR+'/'+name,HEAD('StickerHunt',x)+HDR+`<div class="wrap">${body}</div>`+FTR);
// site-nav reused by map/battle (real)
const SITENAV=`<nav class="sitenav"><a href="#">Catalogue</a><span class="cur">Map</span><a href="#">Rating</a><a href="#">Play Quiz</a></nav>`;
const SITENAV2=`<nav class="sitenav"><a href="#">Catalogue</a><a href="#">Map</a><a href="#">Rating</a><a href="#">Play Quiz</a></nav>`;
const sitenavCSS=`.sitenav{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:30px;}.sitenav a,.sitenav .cur{padding:10px 20px;border:2px solid var(--ink);border-radius:var(--r-sm);font-weight:700;font-size:.85rem;text-transform:uppercase;color:var(--ink-2);}.sitenav a:hover{background:var(--accent);color:var(--accent-ink);}.sitenav .cur{background:var(--surface-2);color:var(--muted);}`;
const actionsCSS=`.pactions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:34px;}.pactions a{padding:13px 28px;border:2px solid var(--ink);border-radius:var(--r-sm);font-weight:800;text-transform:uppercase;font-size:.85rem;}.pactions a:hover{background:var(--accent);color:var(--accent-ink);box-shadow:var(--shadow-sm);}`;

// ============ MAP (real: h1 + subtitle + map + site-nav, NO filters) ============
W('map.html',`
<h1 style="font-size:2rem;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;margin:6px 0 6px;">Sticker Map</h1>
<p style="color:var(--ink-2);font-weight:600;margin:0 0 18px;">Explore <b>2,529</b> stickers with known locations.</p>
<div class="bigmap"><div class="bm" style="background-image:url('${th(0)}');"></div></div>
`,`.bigmap{border:3px solid var(--ink);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);}.bm{height:560px;background:#dde7ea center/cover;filter:grayscale(.4);}${sitenavCSS}`);

// ============ BATTLE (real: title + "Click on the sticker or press 1 or 2" + total votes + 2 stickers Vote + site-nav) ============
W('battle.html',`
<div style="text-align:center;padding:24px 0 4px;"><h1 style="font-size:2rem;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;margin:0 0 6px;">Which sticker is better?</h1><p style="color:var(--ink-2);font-weight:600;margin:0 0 4px;">Click on the sticker or press 1 or 2</p><div style="font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">12,408 votes</div></div>
<div class="battle">
  <a class="bcard" href="#"><div class="bimg"><img src="${th(1)}" alt="Sticker A" width="400" height="400"></div><div class="bovl"><span class="vt">Vote</span></div></a>
  <a class="bcard" href="#"><div class="bimg"><img src="${th(7)}" alt="Sticker B" width="400" height="400"></div><div class="bovl"><span class="vt">Vote</span></div></a>
</div>
`,`.battle{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:10px;}
.bcard{position:relative;border:3px solid var(--ink);border-radius:var(--r);overflow:hidden;background:var(--surface);box-shadow:var(--shadow);transition:.12s;}
.bcard:hover{transform:translate(-3px,-3px);}.bimg img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;}
.bovl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:.12s;background:rgba(255,179,0,.25);}
.bcard:hover .bovl{opacity:1;}.vt{background:var(--accent);color:var(--accent-ink);border:2px solid var(--ink);border-radius:var(--r-sm);box-shadow:var(--shadow);font-weight:800;text-transform:uppercase;font-size:1rem;padding:10px 26px;}
${sitenavCSS}@media(max-width:760px){.battle{grid-template-columns:1fr;}}`);

// ============ LEADERBOARD (real: h1 + time filter + mode filter + 4 sections Easy/Medium/Hard/TTR + actions) ============
const lbTable=(rows)=>`<table class="lbt"><thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead><tbody>${rows.map((r,i)=>`<tr${i<3?' class="top"':''}><td class="r">${i+1}</td><td class="n">${esc(r[0])}</td><td class="s">${r[1].toLocaleString()}</td></tr>`).join('')}</tbody></table>`;
const sample=(b)=>['stickerking','munchner','ultras1860','hunter_07','panini_pro'].map((n,i)=>[n,b-i*180]);
W('leaderboard.html',`
<div class="idhead"><h1>Leaderboard</h1></div>
<div class="lbfilters">
  <div class="fg"><button class="fpill active">Today</button><button class="fpill">7 Days</button><button class="fpill">All Time</button></div>
  <div class="fg"><button class="fpill active">Results</button><button class="fpill">Players</button></div>
</div>
<div class="lbgrid">
  <div class="lbsec"><h2>Easy</h2>${lbTable(sample(9800))}</div>
  <div class="lbsec"><h2>Medium</h2>${lbTable(sample(8600))}</div>
  <div class="lbsec"><h2>Hard</h2>${lbTable(sample(6400))}</div>
  <div class="lbsec"><h2>Time To Run</h2>${lbTable([['stickerking',34],['munchner',31],['ultras1860',27],['hunter_07',22],['panini_pro',18]])}</div>
</div>
`,`
.lbfilters{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0 20px;}.fg{display:flex;gap:8px;}
.fpill{border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);padding:8px 16px;font-weight:800;text-transform:uppercase;font-size:.78rem;cursor:pointer;}.fpill.active{background:var(--accent);color:var(--accent-ink);box-shadow:var(--shadow-sm);}
.lbgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.lbsec{border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);overflow:hidden;}
.lbsec h2{margin:0;font-size:.95rem;font-weight:800;text-transform:uppercase;background:var(--ink);color:#fff;padding:9px 14px;}
.lbt{width:100%;border-collapse:collapse;}
.lbt th{font-size:.62rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:left;padding:8px 14px;border-bottom:2px solid var(--line);}
.lbt th:last-child,.lbt td.s{text-align:right;}
.lbt td{padding:9px 14px;font-weight:700;font-size:.85rem;border-bottom:1px solid var(--line);}
.lbt tbody tr:last-child td{border-bottom:none;}.lbt tr.top td{background:#fff7e6;}
.lbt td.r{font-weight:800;width:30px;}.lbt td.n{text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;max-width:1px;}.lbt td.s{font-variant-numeric:tabular-nums;}
${actionsCSS}@media(max-width:760px){.lbgrid{grid-template-columns:1fr;}}`);

// ============ PROFILE (real: ⚽username + Member since + Games played + Best Results×3 + Last Games + actions) ============
const best=[['Easy',9800,'12 May 2026'],['Medium',8600,'2 Jun 2026'],['Hard',0,null]];
const lastg=[['7 Jun 2026','Medium',8600],['6 Jun 2026','Easy',9800],['5 Jun 2026','Hard',5400],['3 Jun 2026','Medium',7200],['1 Jun 2026','Easy',9100]];
W('profile.html',`
<h1 class="pname">⚽ victor <a href="#" class="pedit">edit</a></h1>
<div class="pinfo"><div class="pi"><span class="pl">Member since:</span><span class="pv">April 2026</span></div><div class="pi"><span class="pl">Games played:</span><span class="pv">218</span></div></div>
<div class="section"><div class="section-head"><h2>Best Results</h2></div>
<div class="bestgrid">${best.map(([d,s,dt])=>`<div class="bcardr"><span class="bd">${d}</span><span class="bv">${s?s.toLocaleString():'—'}</span><span class="bt">${dt?dt:'Not played yet'}</span></div>`).join('')}</div></div>
<div class="section"><div class="section-head"><h2>Your Last Games</h2></div>
<div class="lglist">${lastg.map(([dt,d,s])=>`<div class="lgrow"><span class="lgd">${dt}</span><span class="lgdi">${d}</span><span class="lgs">${s.toLocaleString()}</span></div>`).join('')}</div></div>
`,`
.pname{font-size:1.9rem;font-weight:800;text-transform:uppercase;margin:6px 0 14px;}.pedit{font-size:.8rem;color:var(--accent-deep);font-weight:700;text-transform:none;text-decoration:underline;}
.pinfo{display:flex;flex-direction:column;gap:8px;border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);padding:14px 18px;max-width:420px;}
.pi{display:flex;justify-content:space-between;gap:16px;}.pl{font-weight:700;color:var(--muted);text-transform:uppercase;font-size:.72rem;letter-spacing:.04em;}.pv{font-weight:800;}
.bestgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.bcardr{border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);padding:16px;display:flex;flex-direction:column;gap:4px;}
.bd{font-size:.7rem;font-weight:800;text-transform:uppercase;color:var(--muted);letter-spacing:.05em;}.bv{font-size:1.8rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;}.bt{font-size:.72rem;color:var(--ink-2);font-weight:600;}
.lglist{display:flex;flex-direction:column;gap:8px;}
.lgrow{display:grid;grid-template-columns:1fr auto auto;gap:16px;align-items:center;border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);padding:11px 16px;}
.lgd{font-weight:700;color:var(--ink-2);font-size:.84rem;}.lgdi{font-weight:800;text-transform:uppercase;font-size:.78rem;}.lgs{font-weight:800;font-variant-numeric:tabular-nums;}
${actionsCSS}@media(max-width:760px){.bestgrid{grid-template-columns:1fr;}}`);

// ============ CLUBS ("Football Sticker Clubs" + search + UNIFIED club plates, 100 per page) ============
const clPlate=o=>`<a class="sh-cl" href="#" title="${esc(o.name)}"><span class="sh-cl__badge"><img src="${o.img}" alt=""></span><span class="sh-cl__body"><span class="sh-cl__name"><img class="fl" src="https://flagcdn.com/w40/${o.flag||'de'}.png" alt=""><span class="t">${esc(o.name)}</span></span><span class="sh-cl__ct">${o.count} stickers</span></span></a>`;
function pag(cur,total){const out=[];out.push(cur>1?`<a class="nav" href="#">‹</a>`:`<span class="nav" style="opacity:.35">‹</span>`);let last=0;for(let i=1;i<=total;i++){if(i===1||i===total||Math.abs(i-cur)<=1){if(last&&i-last>1)out.push(`<span class="gap">…</span>`);out.push(i===cur?`<span class="cur">${i}</span>`:`<a href="#">${i}</a>`);last=i;}}out.push(cur<total?`<a class="nav" href="#">›</a>`:`<span class="nav" style="opacity:.35">›</span>`);return `<div class="pag">${out.join('')}</div>`;}
const DE=['VfB Stuttgart','TSV 1860 München','Dynamo Dresden','FC Bayern Munich','1. FC Nürnberg','Hertha BSC','SC Freiburg','Fortuna Düsseldorf','Werder Bremen','1. FC Köln','Hamburger SV','FC St. Pauli','FC Schalke 04','Bayer Leverkusen','Borussia M.gladbach','1. FC Kaiserslautern','Karlsruher SC','Borussia Dortmund','Eintracht Frankfurt','FC Augsburg','Hannover 96','VfL Bochum','SV Darmstadt 98','Arminia Bielefeld','SpVgg Greuther Fürth','SV Sandhausen','Hansa Rostock','Eintracht Braunschweig','FC Erzgebirge Aue','Holstein Kiel'];
const TW=['Aachen','Bonn','Trier','Kassel','Erfurt','Jena','Gera','Halle','Kiel','Rostock','Potsdam','Bamberg','Passau','Ulm','Pforzheim','Heilbronn','Worms','Speyer','Fulda','Gießen','Marburg','Siegen','Hagen','Soest','Minden','Celle','Goslar','Lüneburg','Stade','Flensburg','Schwerin','Wismar','Stralsund','Görlitz','Bautzen','Plauen','Zwickau','Weimar','Suhl','Coburg','Hof','Amberg','Landshut','Rosenheim','Kempten','Konstanz','Offenburg','Lahr','Tübingen','Esslingen'];
const clubs100=Array.from({length:100},(_,i)=>{const name=i<DE.length?DE[i]:`${['FC','SV','TSV','VfL','SpVgg','1. FC','SC'][i%7]} ${TW[(i-DE.length)%TW.length]}`;return clPlate({name,count:Math.max(1,67-Math.floor(i*0.6)),flag:'de',img:th((i%11)+1)});}).join('');
W('clubs.html',`
<div style="text-align:center;padding:28px 0 6px;"><h1 style="font-size:2.1rem;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;margin:0 0 14px;">Football Sticker Clubs</h1>
<div class="cat-search"><input placeholder="Search clubs…"><button>Search</button></div></div>
<div class="section"><div class="section-head"><h2>All Clubs</h2><span class="meta">alphabetical · page 1 of 7</span></div>
<div class="sh-grid g4">${clubs100}</div>
${pag(1,7)}</div>
`,`.cat-search{display:flex;max-width:480px;margin:0 auto 14px;border:3px solid var(--ink);border-radius:var(--r-sm);box-shadow:var(--shadow);overflow:hidden;background:var(--surface);}.cat-search input{flex:1;border:none;outline:none;padding:11px 16px;font-family:inherit;font-size:1rem;background:transparent;}.cat-search button{background:var(--accent);border:none;border-left:3px solid var(--ink);padding:0 18px;font-weight:800;text-transform:uppercase;font-size:.82rem;color:var(--accent-ink);}`);

// ============ STICKERSTAT (real: Statistics + Stickers(N) chart + Clubs(N) top-20 table + Countries(N) top-20 table + actions) ============
const topClubsT=[['VfB Stuttgart',67],['TSV 1860 München',62],['Dynamo Dresden',60],['FC Bayern Munich',57],['1. FC Nürnberg',56],['Hertha BSC',56],['SC Freiburg',52],['Fortuna Düsseldorf',50]];
const topCountriesT=[['Germany',151],['Spain',73],['Italy',61],['England',44],['Netherlands',42],['Poland',36],['France',32],['Sweden',19]];
const statTable=(rows,unit)=>`<table class="stt"><tbody>${rows.map((r,i)=>`<tr><td class="r">${i+1}</td><td class="n">${esc(r[0])}</td><td class="c">${r[1]} <span>${unit}</span></td></tr>`).join('')}</tbody></table>`;
W('stickerstat.html',`
<div class="idhead"><h1>Statistics</h1></div>
<div class="section"><div class="section-head"><h2>Stickers (2,942)</h2></div>
<div class="chartbox"><div class="chartbars">${[60,80,45,90,70,100,55,85,40,75,65,95].map(h=>`<i style="height:${h}%"></i>`).join('')}</div><div class="chartcap">Stickers added per month</div></div></div>
<div class="statgrid">
  <div class="statsec"><div class="section-head"><h2>Clubs (661)</h2></div><p class="ssub">Top 20 clubs by number of stickers</p>${statTable(topClubsT,'stickers')}</div>
  <div class="statsec"><div class="section-head"><h2>Countries (54)</h2></div><p class="ssub">Top 20 countries by number of clubs</p>${statTable(topCountriesT,'clubs')}</div>
</div>
`,`
.chartbox{border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);padding:18px 20px;}
.chartbars{display:flex;align-items:flex-end;gap:8px;height:200px;}.chartbars i{flex:1;background:var(--accent);border:2px solid var(--ink);border-bottom:none;border-radius:3px 3px 0 0;}
.chartcap{text-align:center;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-top:10px;}
.statgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:46px;}
.ssub{font-size:.78rem;color:var(--muted);font-weight:600;margin:8px 0 12px;}
.stt{width:100%;border-collapse:collapse;border:2px solid var(--ink);border-radius:var(--r-sm);overflow:hidden;}
.stt td{padding:9px 14px;font-weight:700;font-size:.86rem;border-bottom:1px solid var(--line);background:var(--surface);}.stt tr:last-child td{border-bottom:none;}
.stt td.r{font-weight:800;width:30px;color:var(--muted);}.stt td.n{text-transform:uppercase;}.stt td.c{text-align:right;font-variant-numeric:tabular-nums;}.stt td.c span{color:var(--muted);font-size:.7rem;font-weight:600;}
.statsec .section-head{margin-bottom:6px;}
${actionsCSS}@media(max-width:760px){.statgrid{grid-template-columns:1fr;}}`);

// ============ ADMIN FORMS (real fields) ============
const formCSS=`.formwrap{max-width:560px;}
.field{margin-bottom:18px;}.field>label{display:block;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink);margin-bottom:7px;}
.field input[type=text],.field input[type=url]{width:100%;border:2px solid var(--ink);border-radius:var(--r-sm);padding:11px 14px;font-family:inherit;font-size:.95rem;background:var(--surface);outline:none;}
.field input:focus{box-shadow:var(--shadow-sm);}
.diffbtns{display:flex;gap:8px;}.diffbtns button{width:48px;height:44px;border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);font-weight:800;font-size:1rem;cursor:pointer;}.diffbtns button.active{background:var(--accent);color:var(--accent-ink);box-shadow:var(--shadow-sm);}
.dropz{border:2px dashed var(--ink);border-radius:var(--r-sm);background:var(--surface-2);padding:36px;text-align:center;font-weight:700;color:var(--ink-2);font-size:.9rem;}.dropz .hint{font-size:.78rem;color:var(--muted);font-weight:600;margin-top:6px;}
.cbx{display:flex;align-items:center;gap:9px;font-weight:700;font-size:.9rem;}.cbx input{width:18px;height:18px;}
.btn-sub{display:inline-flex;}
.brow{display:grid;grid-template-columns:54px 1fr 150px 28px;gap:12px;align-items:center;border:2px solid var(--ink);border-radius:var(--r-sm);background:var(--surface);padding:10px;margin-bottom:10px;}
.brow img{width:54px;height:54px;object-fit:cover;border:2px solid var(--ink);border-radius:3px;}
.brow .bcol{min-width:0;}.brow .bfn{font-size:.72rem;color:var(--muted);font-weight:700;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.brow .bci{width:100%;border:2px solid var(--ink);border-radius:3px;padding:7px 10px;font-family:inherit;font-size:.85rem;}
.brow .bdiff{display:flex;gap:5px;}.brow .bdiff button{width:34px;height:34px;border:2px solid var(--ink);border-radius:3px;background:var(--surface);font-weight:800;cursor:pointer;}.brow .bdiff button.active{background:var(--accent);}
.brow .brm{border:2px solid var(--ink);border-radius:3px;width:28px;height:28px;background:var(--surface);font-weight:800;cursor:pointer;}`;
W('upload.html',`<div class="formwrap"><div class="idhead"><h1>Upload Sticker</h1></div>
<form>
<div class="field"><label>Club</label><input type="text" placeholder="Start typing club name..."></div>
<div class="field"><label>Difficulty</label><div class="diffbtns"><button type="button" class="active">1</button><button type="button">2</button><button type="button">3</button></div></div>
<div class="field"><label>Sticker Image (JPEG)</label><div class="dropz">Drag &amp; drop a JPEG file here or click to select</div></div>
<div class="field"><label class="cbx"><input type="checkbox" checked> Post to media</label></div>
<a class="btn btn-primary btn-sub" href="#">Upload Sticker</a>
</form></div>`,formCSS);
W('upload-batch.html',`<div class="formwrap" style="max-width:680px;"><div class="idhead"><h1>Batch Upload</h1></div>
<div class="dropz" style="margin-bottom:18px;">Drop images anywhere on the page — or click to select<div class="hint">JPEG only. Drop as many as you like, any time — one row per image.</div></div>
<div class="brows">
${[1,7].map(i=>`<div class="brow"><img src="${th(i)}" alt=""><div class="bcol"><div class="bfn">IMG_${1380+i}.jpg</div><input class="bci" placeholder="Start typing club name..."></div><div class="bdiff"><button class="active">1</button><button>2</button><button>3</button></div><button class="brm">✕</button></div>`).join('')}
</div>
<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;"><span style="font-weight:700;color:var(--muted);font-size:.85rem;">2 images</span><a class="btn btn-primary btn-sub" href="#">Upload all</a></div>
</div>`,formCSS);
W('club-create.html',`<div class="formwrap"><div class="idhead"><h1>Create Club</h1></div>
<form>
<div class="field"><label>Club Name</label><input type="text" placeholder="e.g. FC Barcelona"></div>
<div class="field"><label>Country Code (3 letters)</label><input type="text" placeholder="ESP"></div>
<div class="field"><label class="cbx"><input type="checkbox" checked> Auto-fill city, hashtags, and website using AI</label></div>
<div class="field"><label>City, Country</label><input type="text" placeholder="Barcelona, Spain"></div>
<div class="field"><label>Hashtags</label><input type="text" placeholder="#fcbarcelona #viscabarca #campnou"></div>
<div class="field"><label>Website URL</label><input type="url" placeholder="https://en.wikipedia.org/wiki/FC_Barcelona"></div>
<a class="btn btn-primary btn-sub" href="#">Create Club</a>
</form></div>`,formCSS);

console.log('built (faithful): map, battle, leaderboard, profile, clubs, stickerstat, upload, upload-batch, club-create');
