import { createCookieSessionStorage, redirect } from "@remix-run/node";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { admins } from "~/db/schema";

// Define admin user type
export interface AdminUser {
  id: string;
  username: string;
  role: "admin" | "auditor" | string;
  name: string;
}

// Session storage for admin users
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__admin_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "default-admin-secret"],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

// Get session from request
export async function getAdminSession(request?: Request) {
  const cookie = request?.headers.get("Cookie") ?? "";
  return await sessionStorage.getSession(cookie);
}

// Store admin user in session
export async function createAdminSession(user: AdminUser, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("adminUser", JSON.stringify(user));
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

// Get admin user from session
export async function getAdminUser(request: Request): Promise<AdminUser | null> {
  const session = await getAdminSession(request);
  const userJson = session.get("adminUser");
  if (!userJson) return null;
  
  return JSON.parse(userJson);
}

// Require admin user to be logged in
export async function requireAdminUser(
  request: Request,
  redirectTo: string = "/admin/login"
): Promise<AdminUser> {
  const user = await getAdminUser(request);
  if (!user) {
    throw redirect(redirectTo);
  }
  return user;
}

// Require no admin user is logged in (for login page)
export async function requireNoAdminUser(
  request: Request,
  redirectTo: string = "/admin"
): Promise<void> {
  const user = await getAdminUser(request);
  if (user) {
    throw redirect(redirectTo);
  }
}

// Login admin user
export async function adminLogin({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  // Find user in database
  const [userRecord] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  
  if (!userRecord) {
    throw new Error("用户不存在");
  }

  // Compare passwords
  const isPasswordValid = await bcrypt.compare(password, userRecord.passwordHash);

  if (!isPasswordValid) {
    throw new Error("密码错误");
  }

  // Create admin user object
  const user: AdminUser = {
    id: userRecord.id,
    username: userRecord.username,
    role: userRecord.role,
    name: userRecord.name,
  };

  return { user };
}

// Logout admin user
export async function logoutAdmin(request: Request) {
  const session = await getAdminSession(request);
  return redirect("/admin/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
} 
