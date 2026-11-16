import { Redirect } from 'expo-router';

/** Deep-link alias — real screen is under /account/notifications. */
export default function NotificationsAlias() {
  return <Redirect href="/account/notifications" />;
}
