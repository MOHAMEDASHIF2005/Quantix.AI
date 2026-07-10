import type {
  ChatResponse,
  DashboardResponse,
  DatasetCommitResponse,
  DatasetSummary,
  ForecastResponse,
  Product,
  ProductDetail,
  Recommendation,
  SimulationResponse,
  ShelfHealth,
  ExpiryItem,
  ActionResponse,
  RevenuePredictionResponse,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  products: {
    list: (params?: { category?: string; search?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Product[]>(`/products${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<ProductDetail>(`/products/${id}`),
    update: (id: number, payload: Partial<Product>) =>
      request<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  },
  forecasts: {
    get: (productId: number) => request<ForecastResponse>(`/forecasts/${productId}`),
  },
  recommendations: {
    list: (params?: { urgency?: string; action?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Recommendation[]>(`/recommendations${qs ? `?${qs}` : ""}`);
    },
    get: (productId: number) => request<Recommendation>(`/recommendations/${productId}`),
  },
  dashboard: {
    get: () => request<DashboardResponse>("/dashboard"),
  },
  insights: {
    executiveSummary: () => request<{ narrative: string }>("/insights/executive-summary"),
  },
  datasets: {
    upload: async (file: File): Promise<DatasetSummary> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE_URL}/datasets/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, body || res.statusText);
      }
      return res.json();
    },
    commit: (id: number) => request<DatasetCommitResponse>(`/datasets/${id}/commit`, { method: "POST" }),
    list: () => request<DatasetSummary[]>("/datasets"),
  },
  chat: {
    ask: (message: string) => request<ChatResponse>("/chat", { method: "POST", body: JSON.stringify({ message }) }),
  },
  simulation: {
    run: (payload: { scenario: string; demand_delta: number; category?: string; event_tag?: string }) =>
      request<SimulationResponse>("/simulate", { method: "POST", body: JSON.stringify(payload) }),
  },
  warehouse: {
    heatmap: () => request<ShelfHealth[]>("/warehouse/heatmap"),
  },
  expiry: {
    list: (days = 30) => request<ExpiryItem[]>(`/expiry?days=${days}`),
    action: (productId: number, action: "discount" | "transfer") =>
      request<ActionResponse>(`/expiry/${productId}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
  },
  revenue: {
    predict: () => request<RevenuePredictionResponse>("/revenue/predict"),
  },
};

export { ApiError };
