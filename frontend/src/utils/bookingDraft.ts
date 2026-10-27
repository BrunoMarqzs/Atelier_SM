const KEY = "atelier-booking-draft-v1";
const TTL = 2 * 60 * 60 * 1000;
export function readBookingDraft(): { notes: string } | undefined {
  try {
    if (typeof sessionStorage === "undefined") return;
    const draft = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (draft?.version === 1 && typeof draft.notes === "string" && draft.notes.length <= 5000 &&
        typeof draft.expires === "number" && draft.expires > Date.now()) return { notes: draft.notes };
    sessionStorage.removeItem(KEY);
  } catch { /* Private browsing or invalid storage must not block booking. */ }
}
export function saveBookingDraft(notes: string) {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (!notes) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify({ version: 1, notes: notes.slice(0, 5000), expires: Date.now() + TTL }));
  } catch { /* Storage quota or permissions do not block booking. */ }
}
