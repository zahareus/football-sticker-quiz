import re,os
ROOT='/Users/victorzakharchenko/Claude Code/stickerhunt'
HEAD='''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{t} — StickerHunt</title><link rel="stylesheet" href="shared.css"><style>
.article{{max-width:720px;}}.article h1{{font-size:2rem;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;margin:6px 0 8px;}}
.article h2{{font-size:1.05rem;font-weight:800;text-transform:uppercase;margin:26px 0 8px;}}
.article h3{{font-size:.95rem;font-weight:800;margin:18px 0 6px;}}
.article p{{color:var(--ink-2);line-height:1.75;margin:0 0 14px;font-size:.95rem;}}
.article ul{{color:var(--ink-2);line-height:1.7;font-size:.95rem;padding-left:1.2em;margin:0 0 14px;}} .article li{{margin:.3em 0;}}
.article a{{color:var(--accent-deep);font-weight:600;}}
.article .updated{{color:var(--muted);font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;margin:0 0 18px;}}
.article img{{border:3px solid var(--ink);border-radius:4px;box-shadow:4px 4px 0 var(--ink);margin:10px 0 8px;width:100%;}}
.article .cap{{color:var(--muted);font-size:.82rem;font-style:italic;margin:0 0 18px;}}
.article .cta{{flex-direction:row;gap:10px;margin-top:22px;}}
</style></head><body>
<header class="hdr"><div class="hdr-inner"><a class="logo" href="#"><img src="https://stickerhunt.club/logo.webp" alt="StickerHunt" width="126" height="32"></a><div class="spacer"></div><nav><a href="#">Catalogue</a><a href="#">Map</a><a href="#">Rating</a></nav><a class="play" href="#">▶ Play Quiz</a><div class="user"><div class="ava">V</div><span class="uname">victor</span><span class="caret">▾</span></div></div></header>
<div class="wrap"><div class="article">{body}</div></div>
<footer><a href="#">About</a> · <a href="#">Catalogue</a> · <a href="#">Map</a> · <a href="#">Rating</a> · <a href="#">Leaderboard</a> · <a href="#">Terms</a> · <a href="#">Privacy</a> · © 2026 StickerHunt</footer></body></html>'''

def extract(f):
    h=open(os.path.join(ROOT,f),encoding='utf-8').read()
    m=re.search(r'<main\b.*?</main>',h,re.S)
    t=m.group(0) if m else h
    t=re.sub(r'<script.*?</script>','',t,flags=re.S)
    t=re.sub(r'<style.*?</style>','',t,flags=re.S)
    # drop header/footer/auth blocks inside main if any
    t=re.sub(r'<header.*?</header>','',t,flags=re.S)
    t=re.sub(r'<footer.*?</footer>','',t,flags=re.S)
    # strip attributes (class/id/style) but keep href/src/alt
    def clean(tag):
        return tag
    t=re.sub(r'\s(class|id|style|onclick|data-[a-z-]+)="[^"]*"','',t)
    # keep only content tags
    # remove <main ...> wrapper tags
    t=re.sub(r'</?main[^>]*>','',t)
    t=re.sub(r'</?div[^>]*>','',t)
    t=re.sub(r'</?section[^>]*>','',t)
    # fix about photo + links
    t=re.sub(r'(?:/)?about-photo\.jpg','https://stickerhunt.club/about-photo.jpg',t)
    t=re.sub(r'<a[^>]*>\s*(?:Play Quiz|View Catalogue|Back to StickerHunt|←\s*Back to StickerHunt)\s*</a>','',t,flags=re.I)
    t=re.sub(r'←?\s*Back to StickerHunt','',t)
    # collapse blank lines
    t=re.sub(r'\n\s*\n+','\n',t).strip()
    return t

for f,title in [('about.html','About'),('terms.html','Terms of Service'),('privacy.html','Privacy Policy')]:
    body=extract(f)
    open(os.path.join('/tmp/sh-proto',f),'w',encoding='utf-8').write(HEAD.format(t=title,body=body))
    print('wrote',f,len(body),'chars')
