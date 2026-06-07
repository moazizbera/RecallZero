export const dashboardRoles = ["executive", "ops", "compliance", "store"] as const;

export type DashboardRole = (typeof dashboardRoles)[number];

export const dashboardRoleLabels: Record<DashboardRole, string> = {
  executive: "Executive",
  ops: "Operations",
  compliance: "Compliance",
  store: "Store Manager",
};

export const dashboardRoleCookieName = "recallzero-role";

export function isDashboardRole(value: string): value is DashboardRole {
  return dashboardRoles.includes(value as DashboardRole);
}

export function getSafeDashboardRole(value: string | undefined): DashboardRole {
  if (value && isDashboardRole(value)) {
    return value;
  }

  return "executive";
}