/** Pure validation functions - safe for both client and server */

export function validateScreenName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}
