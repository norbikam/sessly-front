/**
 * Dynamic Expo config — EAS project id + RevenueCat keys (no Google Maps).
 * Map tiles: OpenStreetMap via OsmMapView (free). Geocoding: Nominatim on API.
 */
const appJson = require('./app.json');

const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  process.env.EAS_PROJECT_ID ||
  appJson.expo?.extra?.eas?.projectId ||
  '';

module.exports = () => {
  const expo = { ...appJson.expo };

  expo.extra = {
    ...(expo.extra || {}),
    eas: {
      ...(expo.extra?.eas || {}),
      projectId: easProjectId,
    },
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
  };

  return { expo };
};
