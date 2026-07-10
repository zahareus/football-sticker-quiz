#!/usr/bin/env python3
"""GSC checkpoint tool for stickerhunt.club — read-only.

Subcommands:
  sitemaps            list submitted sitemaps (pending/errors/warnings/contents)
  inspect <url>...    URL Inspection verdict/coverage/crawl for one or more URLs
  analytics [--days N] search analytics totals (web+image) + 10-day daily trend
"""
import argparse
import datetime as dt
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

CREDS = "/Users/victorzakharchenko/.config/gsc_credentials.json"
SCOPE = ["https://www.googleapis.com/auth/webmasters.readonly"]
PROPERTY = "sc-domain:stickerhunt.club"


def service():
    creds = service_account.Credentials.from_service_account_file(CREDS, scopes=SCOPE)
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def cmd_sitemaps(svc, _args):
    resp = svc.sitemaps().list(siteUrl=PROPERTY).execute()
    maps = resp.get("sitemap", [])
    print(f"# {len(maps)} sitemap(s) submitted for {PROPERTY}\n")
    for m in maps:
        print(f"path:        {m.get('path')}")
        print(f"  isPending: {m.get('isPending')}  isSitemapsIndex: {m.get('isSitemapsIndex')}")
        print(f"  type:      {m.get('type')}  lastSubmitted: {m.get('lastSubmitted')}")
        print(f"  lastDownloaded: {m.get('lastDownloaded')}")
        print(f"  errors: {m.get('errors')}  warnings: {m.get('warnings')}")
        for c in m.get("contents", []):
            print(f"  contents[{c.get('type')}]: submitted={c.get('submitted')} indexed={c.get('indexed')}")
        print()


def cmd_inspect(svc, args):
    for url in args.urls:
        try:
            resp = svc.urlInspection().index().inspect(
                body={"inspectionUrl": url, "siteUrl": PROPERTY}
            ).execute()
            r = resp.get("inspectionResult", {}).get("indexStatusResult", {})
            print(f"url: {url}")
            print(f"  verdict:        {r.get('verdict')}")
            print(f"  coverageState:  {r.get('coverageState')}")
            print(f"  robotsTxtState: {r.get('robotsTxtState')}")
            print(f"  indexingState:  {r.get('indexingState')}")
            print(f"  lastCrawlTime:  {r.get('lastCrawlTime')}")
            print(f"  pageFetchState: {r.get('pageFetchState')}")
            print(f"  googleCanonical: {r.get('googleCanonical')}")
            print(f"  userCanonical:   {r.get('userCanonical')}")
            print()
        except Exception as e:  # keep going on quota/errors
            print(f"url: {url}\n  ERROR: {e}\n")


def _query(svc, start, end, search_type, dimensions):
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "type": search_type,
        "dimensions": dimensions,
        "rowLimit": 100,
    }
    return svc.searchanalytics().query(siteUrl=PROPERTY, body=body).execute()


def cmd_analytics(svc, args):
    end = dt.date.today() - dt.timedelta(days=1)
    start = end - dt.timedelta(days=args.days - 1)
    print(f"# searchanalytics {start} .. {end} ({args.days} days)\n")
    for st in ("web", "image"):
        resp = _query(svc, start, end, st, [])
        rows = resp.get("rows", [])
        if rows:
            r = rows[0]
            print(f"[{st}] clicks={r.get('clicks')} impressions={r.get('impressions')} "
                  f"ctr={r.get('ctr'):.4f} position={r.get('position'):.2f}")
        else:
            print(f"[{st}] no data")
    print("\n# daily trend (web) last 10 days")
    t_start = end - dt.timedelta(days=9)
    resp = _query(svc, t_start, end, "web", ["date"])
    for r in resp.get("rows", []):
        print(f"  {r['keys'][0]}  clicks={r.get('clicks')} impressions={r.get('impressions')} "
              f"ctr={r.get('ctr'):.4f} pos={r.get('position'):.2f}")


def main():
    p = argparse.ArgumentParser(description="GSC checkpoint (read-only)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("sitemaps")
    ins = sub.add_parser("inspect")
    ins.add_argument("urls", nargs="+")
    an = sub.add_parser("analytics")
    an.add_argument("--days", type=int, default=28)
    args = p.parse_args()

    svc = service()
    {"sitemaps": cmd_sitemaps, "inspect": cmd_inspect, "analytics": cmd_analytics}[args.cmd](svc, args)


if __name__ == "__main__":
    sys.exit(main())
