/**
 * Dynamic Expo config — EAS project id + RevenueCat keys (no Google Maps).
 * Map tiles: OpenStreetMap via OsmMapView (free). Geocoding: Nominatim on API.
 * Uses static app.json values via the `config` argument (SDK 58 / expo-doctor).
 */
module.exports = ({ config }) => {
  const easProjectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    process.env.EAS_PROJECT_ID ||
    config.extra?.eas?.projectId ||
    '';

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      eas: {
        ...(config.extra?.eas || {}),
        projectId: easProjectId,
      },
      revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
      revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
    },
  };
};
