import { db, users } from "~/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createCookieSessionStorage, redirect } from "@remix-run/node";

// Define session storage
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "travel_note_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

// Create session
export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

// Get user session
export async function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

// Get logged in user
export async function getLoggedInUser(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId) return null;

  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (userResult.length === 0) return null;

  // Don't expose password hash to client
  const { passwordHash: _passwordHash, ...userWithoutPassword } = userResult[0];
  return userWithoutPassword;
}

// Check if user is logged in and redirect if not
export async function requireLoggedInUser(request: Request, redirectTo: string = "/login") {
  const user = await getLoggedInUser(request);
  if (!user) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams.toString()}`);
  }
  return user;
}

// Logout user
export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

// Login user
export async function login({ username, password }: { username: string; password: string }) {
  // Find user by username
  const userResult = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (userResult.length === 0) return null;

  const user = userResult[0];

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) return null;

  // Return user without password hash
  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Register new user
export async function register({
  username,
  password,
  nickname
}: {
  username: string;
  password: string;
  nickname: string;
}) {
  // Check if username or nickname already exists
  const existingUserResult = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUserResult.length > 0) {
    return { error: "USERNAME_TAKEN" };
  }

  const existingNicknameResult = await db
    .select()
    .from(users)
    .where(eq(users.nickname, nickname))
    .limit(1);

  if (existingNicknameResult.length > 0) {
    return { error: "NICKNAME_TAKEN" };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const result = await db.insert(users).values({
    username,
    passwordHash,
    nickname,
    role: "user",
  }).returning();

  if (result.length === 0) {
    return { error: "FAILED_TO_CREATE_USER" };
  }

  // Return user without password hash
  const { passwordHash: _ph, ...userWithoutPassword } = result[0];
  return { user: userWithoutPassword };
} 
