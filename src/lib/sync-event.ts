/**
 * Writes to localStorage AND dispatches a custom "profile-source-updated" event
 * so same-tab listeners (useProfile, useChanceCalculator, etc.) can re-read
 * immediately — without waiting for tab focus or cross-tab StorageEvent.
 *
 * Also clears stale manual overrides for any fields owned by this source.
 * Runs globally so it works even when useProfile isn't mounted.
 */

const OVERRIDES_KEY = "admitedge-profile-overrides";

// Map source localStorage keys → profile fields they own
const OVERRIDES_BY_SOURCE: Record<string, string[]> = {
  "gpa-calc-v1": ["gpaUW", "gpaW", "rigor"],
  "essay-grader-result": ["essayCommonApp", "essayVspice"],
  "ec-evaluator-result": ["ecBand", "ecStrength"],
};

function clearOverridesFor(key: string): void {
  const fields = OVERRIDES_BY_SOURCE[key];
  if (!fields) return;
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    const current = raw ? JSON.parse(raw) : {};
    let changed = false;
    for (const f of fields) {
      if (current[f]) { delete current[f]; changed = true; }
    }
    if (changed) localStorage.setItem(OVERRIDES_KEY, JSON.stringify(current));
  } catch { /* ignore */ }
}

export function setItemAndNotify(key: string, value: string): void {
  localStorage.setItem(key, value);
  clearOverridesFor(key);
  window.dispatchEvent(
    new CustomEvent("profile-source-updated", { detail: { key } })
  );
}
