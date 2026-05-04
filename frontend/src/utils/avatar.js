// Build a fully-qualified URL for an avatar path returned by the backend.
// The backend stores something like "/uploads/avatars/user-7-1714000000.png".
// In production it might already be an absolute URL — pass that through.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function avatarUrl(avatar) {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (avatar.startsWith("/")) return `${API_BASE}${avatar}`;
  return `${API_BASE}/${avatar}`;
}

export function initialsOf(name = "") {
  return (name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
