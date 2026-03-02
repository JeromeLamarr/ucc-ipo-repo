/**
 * roleAccess.ts
 *
 * Centralised role-access helpers used by both the config-driven router
 * (App.tsx) and the config-driven sidebar (DashboardLayout.tsx).
 *
 * Using these functions instead of inline filter calls ensures the router
 * and the sidebar can never diverge in their access logic.
 */
import type { UserRole, DashboardRouteConfig } from './dashboardRouteConfig';

/**
 * Returns true when `role` is included in `allowedRoles`.
 * This is the canonical RBAC check for dashboard routes.
 */
export function canAccessRoute(role: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role);
}

/**
 * Returns the subset of `routes` that:
 *  1. Have a `nav` config (i.e., should appear in the sidebar), AND
 *  2. Include `role` in their `allowedRoles`.
 *
 * Results are sorted ascending by `nav.order` (undefined order → Infinity).
 */
export function filterNavRoutesByRole(
  role: UserRole,
  routes: DashboardRouteConfig[],
): DashboardRouteConfig[] {
  return routes
    .filter((r) => r.nav !== undefined && canAccessRoute(role, r.allowedRoles))
    .sort((a, b) => (a.nav?.order ?? Infinity) - (b.nav?.order ?? Infinity));
}
