/**
 * RBAC helpers.
 *
 * Backend returns role as enum value: "admin" (Super Admin), "manager" (Admin), "analyst" (Developer), "viewer".
 * UI/DB might sometimes use labels like "Super Admin", "Admin". We accept all variants.
 */
const ADMIN_LIKE_ROLES = new Set([
  "admin",
  "manager",
  "super admin",
  "superadmin",
  "super_admin",
]);

function getRoleRaw(user) {
  if (!user || typeof user !== "object") return "";
  const r = user.role ?? user.role_name ?? user.user_role ?? "";
  return (typeof r === "string" ? r : String(r ?? "")).trim().toLowerCase();
}

export function normalizeRole(role) {
  const raw = (role ?? "").toString().trim().toLowerCase();
  if (!raw) return "";

  if (raw === "super admin" || raw === "superadmin" || raw === "super_admin") return "admin";
  if (raw === "admin") return "admin";
  if (raw === "manager") return "manager";
  if (raw === "developer") return "analyst";
  if (raw === "analyst") return "analyst";
  if (raw === "viewer") return "viewer";
  return raw;
}

/** True if user is Super Admin or Admin (can access Settings, API Configuration, Team Directory, etc.). */
export function isAdminLike(user) {
  const role = getRoleRaw(user);
  return role !== "" && ADMIN_LIKE_ROLES.has(role);
}
 
export function isViewer(user) {
  return normalizeRole(user?.role) === "viewer";
}
 
export function isDeveloperLike(user) {
  const role = normalizeRole(user?.role);
  return role === "analyst" || role === "developer";
}
