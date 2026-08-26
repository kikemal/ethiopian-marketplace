import { ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<ApiResponse<T>> {
  const { token, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${API_URL}. Start the backend with npm run dev in backend/.`,
      0
    );
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    const detail = json.error && json.error !== json.message ? json.error : '';
    throw new ApiError(
      detail ? `${json.message || 'Request failed'} (${detail})` : json.message || json.error || 'Request failed',
      res.status
    );
  }
  return json;
}

export function getApiUrl() {
  return API_URL;
}
