import { Redirect } from 'expo-router';

/** Legacy route — notifications live in the main tab bar. */
export default function NotificationsRedirect() {
  return <Redirect href="/(tabs)/notifications" />;
}
