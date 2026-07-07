const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "outfit_lounge_token";

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at?: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function logout(): void {
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

export async function register(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<Customer> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Registration failed"));
  const data = await res.json();
  setToken(data.token);
  return data.customer;
}

export async function login(input: { email: string; password: string }): Promise<Customer> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Login failed"));
  const data = await res.json();
  setToken(data.token);
  return data.customer;
}

export async function fetchMe(): Promise<Customer | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) logout();
    return null;
  }
  return res.json();
}
