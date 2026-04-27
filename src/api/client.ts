const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud contiene datos inválidos.',
  401: 'No estás autenticado. Iniciá sesión nuevamente.',
  403: 'No tenés permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  405: 'Acción no permitida. Verificá la configuración.',
  409: 'Conflicto con datos existentes.',
  422: 'Los datos enviados no son válidos.',
  429: 'Demasiadas solicitudes. Esperá un momento.',
  500: 'Error interno del servidor. Intentá nuevamente.',
  502: 'El servidor no está disponible. Intentá más tarde.',
  503: 'Servicio temporalmente no disponible.',
};

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
    const body = await response.json().catch(() => ({}));
    const fallback = STATUS_MESSAGES[response.status] ?? `Error HTTP ${response.status}`;
    throw new ApiError(body.message ?? fallback, response.status);
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
