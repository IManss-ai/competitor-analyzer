import type {
  Dataset,
  DatasetCreate,
  DatasetUpdate,
  DatasetList,
  Disclosure,
  DisclosureGenerateRequest,
  DashboardStats,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getToken(): Promise<string | null> {
  // In the browser, grab the token from Clerk session
  if (typeof window === "undefined") return null;
  try {
    // @ts-ignore — Clerk adds this to window
    const clerk = window.Clerk;
    if (!clerk?.session) return null;
    return await clerk.session.getToken();
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Datasets ────────────────────────────────────────────────────────────────
export const datasetsApi = {
  list: (companySlug: string) =>
    apiFetch<DatasetList>(`/api/datasets?company_slug=${encodeURIComponent(companySlug)}`),

  get: (id: number) => apiFetch<Dataset>(`/api/datasets/${id}`),

  create: (data: DatasetCreate) =>
    apiFetch<Dataset>("/api/datasets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: DatasetUpdate) =>
    apiFetch<Dataset>(`/api/datasets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/datasets/${id}`, { method: "DELETE" }),
};

// ── Disclosures ──────────────────────────────────────────────────────────────
export const disclosuresApi = {
  generate: (req: DisclosureGenerateRequest) =>
    apiFetch<{ disclosures: Disclosure[] }>("/api/disclosures/generate", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  list: (companySlug: string) =>
    apiFetch<{ disclosures: Disclosure[] }>(
      `/api/disclosures?company_slug=${encodeURIComponent(companySlug)}`
    ),

  publish: (id: number) =>
    apiFetch<Disclosure>(`/api/disclosures/${id}/publish`, { method: "POST" }),
};

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: (companySlug: string) =>
    apiFetch<DashboardStats>(
      `/api/dashboard/stats?company_slug=${encodeURIComponent(companySlug)}`
    ),
};
