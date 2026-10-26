export function getApiErrorPayload(error: unknown): {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
} {
  const data = (error as { response?: { data?: any } })?.response?.data;
  if (!data) {
    const message = (error as { message?: string })?.message;
    if (message === "Network Error" || (error as { code?: string })?.code === "ERR_NETWORK") {
      return { message: "Brak połączenia z serwerem. Sprawdź, czy backend działa." };
    }
    return { message };
  }

  if (typeof data.error === "object" && data.error) {
    return {
      message: data.error.message,
      code: data.error.code,
      details: data.error.details,
    };
  }

  if (typeof data.detail === "string") {
    return { message: data.detail };
  }

  if (typeof data.message === "string") {
    return { message: data.message };
  }

  return {};
}

export function formatApiError(error: unknown, fallback: string): string {
  const payload = getApiErrorPayload(error);
  if (payload.details) {
    const first = Object.values(payload.details)[0];
    if (typeof first === "string") return first;
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  return payload.message || fallback;
}
