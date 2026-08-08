#!/usr/bin/env python3
"""Notify IndexNow (Bing, Yandex, Seznam, Naver) that the site has changed.

Reads the site's sitemap, extracts every <loc> URL, and submits the batch to
the IndexNow API. Intended to run in CI right after a successful deploy, but
also usable by hand:

    python3 .github/scripts/submit-indexnow.py --dry-run
    python3 .github/scripts/submit-indexnow.py --sitemap _site/sitemap.xml --dry-run

The IndexNow key is deliberately public: search engines verify ownership by
fetching https://<host>/<key>.txt, so it must be committed and deployed. It is
not a secret and grants nothing beyond "may notify that this domain changed".
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

HOST = "biscuitsandgravy.ai"
KEY = "04fcbeb76cf369b5d47eaa3f758b82e4"
ENDPOINT = "https://api.indexnow.org/indexnow"
SITEMAP_NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
TIMEOUT = 30
# Cloudflare fronts the site and rejects the default "Python-urllib/3.x"
# User-Agent with a 403, so identify ourselves properly on every request.
USER_AGENT = f"{HOST}-indexnow/1.0 (+https://{HOST}/)"


def read_sitemap(source: str) -> bytes:
    if source.startswith(("http://", "https://")):
        req = urllib.request.Request(source, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.read()
    with open(source, "rb") as fh:
        return fh.read()


def urls_from_sitemap(data: bytes) -> list[str]:
    root = ET.fromstring(data)
    locs = [el.text.strip() for el in root.findall(".//s:loc", SITEMAP_NS) if el.text]
    # IndexNow rejects the whole batch if any URL is outside the declared host.
    return [u for u in locs if u.startswith(f"https://{HOST}/")]


def submit(urls: list[str]) -> int:
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": f"https://{HOST}/{KEY}.txt",
        "urlList": urls,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        print(f"IndexNow responded {resp.status} {resp.reason}")
        return resp.status


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sitemap", default=f"https://{HOST}/sitemap.xml")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        urls = urls_from_sitemap(read_sitemap(args.sitemap))
    except (OSError, urllib.error.URLError, ET.ParseError) as exc:
        print(f"Could not read sitemap {args.sitemap}: {exc}", file=sys.stderr)
        return 1

    if not urls:
        print(f"No {HOST} URLs found in sitemap; nothing to submit.", file=sys.stderr)
        return 1

    print(f"{len(urls)} URL(s) from {args.sitemap}:")
    for u in urls:
        print(f"  {u}")

    if args.dry_run:
        print("\n--dry-run: not submitting. Payload would be:")
        print(json.dumps({
            "host": HOST,
            "key": KEY,
            "keyLocation": f"https://{HOST}/{KEY}.txt",
            "urlList": urls,
        }, indent=2))
        return 0

    try:
        # 200 = accepted, 202 = accepted while the key is still being verified.
        return 0 if submit(urls) in (200, 202) else 1
    except urllib.error.HTTPError as exc:
        # 403 = key file not reachable/incorrect, 422 = URL/host mismatch.
        print(f"IndexNow rejected the request: {exc.code} {exc.reason}", file=sys.stderr)
        print(exc.read().decode(errors="replace"), file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Could not reach IndexNow: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
