const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "outfit_lounge_admin_token";

export type Admin = {
  id: string;
  name: string;
  email: string;
  created_at?: string;
};

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setAdminToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function adminLogout(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

export async function adminLogin(input: { email: string; password: string }): Promise<Admin> {
  const res = await fetch(`${API_URL}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Login failed"));
  const data = await res.json();
  setAdminToken(data.token);
  return data.admin;
}

export async function fetchAdminMe(): Promise<Admin | null> {
  const token = getAdminToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/admin/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) adminLogout();
    return null;
  }
  return res.json();
}

export async function adminApiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API_URL}${path}`, { ...options, headers });
}
