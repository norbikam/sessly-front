import { Alert, Platform } from "react-native";

export function notify(title: string, message?: string) {
  const text = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}
