import { Alert, Platform } from "react-native";

export function notify(title: string, message?: string, onDismiss?: () => void) {
  const text = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(text);
    onDismiss?.();
    return;
  }
  Alert.alert(title, message, [{ text: "OK", onPress: onDismiss }]);
}

/** Human message from axios/DRF errors — never dump raw HTML 500 pages. */
export function formatApiError(error: any, fallback = "Sprawdź połączenie z serwerem."): string {
  const code = error?.code || error?.response?.status;
  const rawMessage = String(error?.message || "");
  if (
    code === "ECONNABORTED"
    || /timeout/i.test(rawMessage)
  ) {
    return "Przesyłanie trwa zbyt długo. Sprawdź łącze albo spróbuj mniejszego zdjęcia.";
  }
  const data = error?.response?.data;
  if (data == null) return rawMessage || fallback;
  if (typeof data === "string") {
    if (data.includes("<!doctype") || data.includes("<html")) {
      const status = error?.response?.status;
      return status
        ? `Serwer zwrócił błąd ${status}. Spróbuj ponownie za chwilę.`
        : "Serwer zwrócił nieoczekiwany błąd. Spróbuj ponownie.";
    }
    return data.slice(0, 280);
  }
  const nested = data?.error?.message || data?.detail || data?.message;
  if (typeof nested === "string") return nested;
  if (typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const firstVal = firstKey ? data[firstKey] : null;
    if (Array.isArray(firstVal) && firstVal[0]) return `${firstKey}: ${firstVal[0]}`;
    if (typeof firstVal === "string") return `${firstKey}: ${firstVal}`;
  }
  try {
    const raw = JSON.stringify(data);
    return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
  } catch {
    return fallback;
  }
}
