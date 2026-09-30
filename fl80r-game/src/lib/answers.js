// Answer matching + clock arithmetic for math / memory floors.

// Canonical form for comparison: lowercase, strip spaces, dots, commas.
export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[.,]/g, "");
}

// True if `input` matches any accepted answer (normalized), or the fallback.
export function matchesAnswer(input, accepts, fallback) {
  const n = normalize(input);
  if (!n) return false;
  const list = Array.isArray(accepts) && accepts.length ? accepts : [fallback];
  return list.some((a) => a != null && normalize(a) === n);
}

// Add `addMinutes` to a base clock time; return accepted variants + a display
// string. Wraps across midnight. Accepts 12h ("11:03 pm"/"11:03pm"/"11:03")
// and 24h ("23:03") spellings; `normalize` collapses spacing/case.
export function clockAnswer(baseHH, baseMM, addMinutes) {
  const total = (((baseHH * 60 + baseMM + addMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const mm = String(m).padStart(2, "0");
  const ampm = h24 < 12 ? "am" : "pm";
  const h12 = ((h24 + 11) % 12) + 1;
  const display = `${h12}:${mm} ${ampm.toUpperCase()}`;
  const accepts = [
    `${h12}:${mm} ${ampm}`,
    `${h12}:${mm}${ampm}`,
    `${h12}:${mm}`,
    `${h24}:${mm}`,
    `${String(h24).padStart(2, "0")}:${mm}`,
  ];
  return { accepts, display, minutes: total };
}
