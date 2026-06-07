import { NextResponse } from "next/server";

import {
  dashboardRoleCookieName,
  getSafeDashboardRole,
} from "@/lib/role-session";
import { logRoleSelection } from "@/lib/recall-repository";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { role?: string };
  const role = getSafeDashboardRole(body.role);
  await logRoleSelection(role);
  const response = NextResponse.json({ ok: true, role });

  response.cookies.set({
    name: dashboardRoleCookieName,
    value: role,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}