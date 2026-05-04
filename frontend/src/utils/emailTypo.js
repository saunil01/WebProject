// Catches common typos in email domains that pass standard validation but
// almost certainly aren't what the user meant.
//
// Example: priyen@gmail.cm is structurally a valid email (.cm is Cameroon's
// TLD), so a regex check accepts it — but the user almost certainly meant
// gmail.com. We surface a "Did you mean..." warning before they submit.

const TYPO_MAP = {
  "gmail.com": [
    "gmail.cm", "gmial.com", "gmal.com", "gmail.co", "gmai.com",
    "gmaill.com", "gnail.com", "gmail.con", "gmail.cmo", "gmial.cm",
    "gimail.com",
  ],
  "yahoo.com": [
    "yahoo.cm", "yaho.com", "yahooo.com", "yahoo.con", "yhoo.com",
    "yahoo.co", "yhaoo.com",
  ],
  "outlook.com": [
    "outlook.cm", "outlok.com", "outlook.con", "outloook.com",
    "outlook.co", "outloo.com",
  ],
  "hotmail.com": [
    "hotmail.cm", "hotmial.com", "hotmail.con", "hotmaill.com",
    "hotmail.co", "hotmal.com", "hottmail.com",
  ],
  "icloud.com": [
    "icloud.cm", "iclud.com", "icloud.con", "iclould.com", "icloud.co",
  ],
  "live.com": ["live.cm", "live.con", "liev.com"],
  "protonmail.com": ["protonmail.cm", "protonmial.com", "protomail.com"],
};

/**
 * Returns the suggested corrected email if the domain looks like a typo of
 * a known one, otherwise null.
 */
export function suggestEmailFix(email) {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain) return null;

  for (const [correct, typos] of Object.entries(TYPO_MAP)) {
    if (typos.includes(domain)) return `${local}@${correct}`;
  }
  return null;
}
