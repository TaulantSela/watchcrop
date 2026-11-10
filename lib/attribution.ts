/**
 * First-touch attribution for the de-risk phase: which community a visitor or
 * signup came from. Post links with ?utm_source=reddit&utm_campaign=… and the
 * admin demand panel splits visits and signups by it. Without UTM tags the
 * referring site is used, else "direct".
 *
 * Holds no personal data: campaign tags and a referring hostname only.
 */
export type Touch = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerHost?: string;
};

const TOUCH_KEY = "watchcrop:touch";

function clean(v: string | null | undefined, max = 64): string | undefined {
  const s = v?.trim().toLowerCase().slice(0, max);
  return s || undefined;
}

/** Where a page load came from. Same-site referrers (internal navigation) don't count. */
export function readTouch(href: string, referrer: string): Touch {
  const url = new URL(href);
  let referrerHost: string | undefined;
  try {
    const r = new URL(referrer);
    if (r.host !== url.host) referrerHost = r.hostname.replace(/^www\./, "");
  } catch {
    /* no referrer */
  }
  return {
    utmSource: clean(url.searchParams.get("utm_source")),
    utmMedium: clean(url.searchParams.get("utm_medium")),
    utmCampaign: clean(url.searchParams.get("utm_campaign")),
    referrerHost: clean(referrerHost, 255),
  };
}

/** The session's first touch: captured on the first page load, reused after. Browser only. */
export function sessionTouch(): Touch {
  try {
    const saved = sessionStorage.getItem(TOUCH_KEY);
    if (saved) return JSON.parse(saved) as Touch;
    const touch = readTouch(location.href, document.referrer);
    sessionStorage.setItem(TOUCH_KEY, JSON.stringify(touch));
    return touch;
  } catch {
    return readTouch(location.href, document.referrer);
  }
}

/** The label a touch is grouped under: utm_source, else the referring host, else "direct". */
export function sourceLabel(t: { utmSource?: string | null; referrerHost?: string | null }): string {
  return t.utmSource || t.referrerHost || "direct";
}
