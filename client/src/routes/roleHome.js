const ROLE_HOMES = { ADMIN: "/admin", CUSTOMER_SERVICE: "/support", STUDENT: "/student" };

export function roleHome(role) {
  return ROLE_HOMES[role] || "/student";
}
