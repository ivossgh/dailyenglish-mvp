// Thin wrapper around the Umami analytics client.
// All event calls go through here, so changing the provider is a one-file change.
//
// Umami injects `window.umami` after the script loads. The function may not exist
// on localhost (domain mismatch) or if the script is blocked by an ad blocker.
// Every call is wrapped in a try/catch so a blocked tracker never breaks the app.

type EventProperties = Record<string, string | number | boolean>;

function umami(): { track: (event: string, props?: EventProperties) => void } | undefined {
  // `window.umami` is set by the Umami script tag; it is not in the TypeScript lib.
  return (window as unknown as { umami?: { track: (e: string, p?: EventProperties) => void } })
    .umami;
}

export function trackEvent(event: string, props?: EventProperties): void {
  try {
    umami()?.track(event, props);
  } catch {
    // Swallow any error so a tracker failure never breaks the app.
  }
}

// Called once per session on the first render of Layout.
// Fires "return_visit" only when today is different from the last recorded visit day.
// Uses localStorage (not IndexedDB) because this is a lightweight session marker,
// not user content worth backing up.
export function trackReturnVisit(): void {
  try {
    const key = 'di_last_visit';
    const today = new Date().toISOString().slice(0, 10); // "2026-11-03"
    const last = localStorage.getItem(key);
    localStorage.setItem(key, today);
    if (last !== null && last !== today) {
      trackEvent('return_visit');
    }
  } catch {
    // localStorage may be unavailable in private browsing; that is fine.
  }
}