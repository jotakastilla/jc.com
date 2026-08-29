"use server";

import { redirect } from "next/navigation";
import { startAdminSession } from "../../../../lib/admin-auth";

export async function loginAction(formData) {
  const password = String(formData.get("password") || "");
  const isAuthenticated = await startAdminSession(password);

  redirect(isAuthenticated ? "/viralia/admin" : "/viralia/admin/login?error=1");
}
