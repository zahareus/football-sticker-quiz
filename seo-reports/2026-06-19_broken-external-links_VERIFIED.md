# StickerHunt — биті зовнішні лінки (ВЕРИФІКОВАНО curl-ом, 19.06.2026)

Метод: 548 унікальних club-website URL з wiki-cache → HEAD-чек → переперевірка підозрілих повноцінним GET (браузерні хедери, follow-redirect) → DNS-резолв для «000». Хибнопозитиви (WAF/Cloudflare 403, HEAD-блок) відсіяно.

## РЕАЛЬНО МЕРТВІ — 13 (треба прибрати/замінити в wiki-cache)

### Мертвий домен (DNS NXDOMAIN) — 10
- fc-brussels.be
- fsv.soemmerda.de
- metalist.ua
- irunavoley.com
- lusitanoginasioclube.com
- sportingclubepombal.com
- tfc.info
- fctorpedokutaisi.com
- mca.dz
- fk-orsha.com

### Hard error (стабільний) — 3
- https://www.fidelisandria.it/ — 500 (×2)
- https://www.sv-heimstetten.com — 500 (×2)
- https://www.elanatorun.com/ — 404

## НЕДОСЯЖНІ — домен резолвиться, але сервер не відповідає мені — 9
(можливо даун / firewall / гео-блок РФ-ДЗ — підтвердити вручну з браузера, не видаляти наосліп)
- leixoessc.pt, fcmetz.com, bohemianfc.com, crb.dz, adanaspor.com.tr, cska.ru, fcdynamo.ru, bresciacalcio.it, hifk.org

## ЖИВІ, але блокують ботів (403/406/429/400 на HEAD) — НЕ чіпати — ~23
fenerbahce.org, feyenoord.com, werder.de, hajduk.hr, spartak.com, fc-zenit.ru, aekfc.gr, pogonszczecin.pl, riminifc.it, lausanne-sport.ch, fctwente.nl, obolon.ua, gimnasticasegoviana.com, ksk.org.tr, logrones.net, dvtk.eu, nk-sirokibrijeg.com, fkdb.ru, mhaifafc.com, calciopotenza.eu, clubbolivar.com, hapoelhaifa.co.il, ksruch.com, slbenfica.pt тощо

## Редиректи (3XX first-hop) — 184
Здебільшого http→https або зміна домену. Не «биті», але варто оновити на фінальний URL у wiki-cache.

---
**Звірка з Ahrefs:** Ahrefs показав «External 4XX = 92» — **завищено**, бо рахував WAF-403/HEAD-блок як биті. Верифіковано реально мертвих: **13** (+9 недосяжних на ручну перевірку). «External 3XX = 176» ≈ наші **184** редиректи (збігається).
