// Search helper for AdminDashboard
export function adminSearchMatches(value: unknown, query: string): boolean {
  if (!query.trim()) return true;
  return String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());
}
