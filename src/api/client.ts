const BASE_URL = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthHeader(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem('turnero_session');
    if (!raw) return {};
    const session = JSON.parse(raw) as { token?: string };
    return session.token ? { Authorization: `Bearer ${session.token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: `Error HTTP ${response.status}` }));
    throw new ApiError(body.message ?? `Error HTTP ${response.status}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// Función específica para multipart/form-data — NO establece Content-Type
// para que el browser calcule automáticamente el boundary correcto.
async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body,
    headers: { ...getAuthHeader() },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: `Error HTTP ${response.status}` }));
    throw new ApiError(data.message ?? `Error HTTP ${response.status}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get:      <T>(path: string)                      => request<T>(path),
  post:     <T>(path: string, body: unknown)       => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:      <T>(path: string, body: unknown)       => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:    <T>(path: string, body: unknown)       => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:   <T>(path: string)                      => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, body: FormData)      => requestForm<T>(path, body),
};

export { ApiError };
