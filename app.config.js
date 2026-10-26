/**
 * Dynamic Expo config — injects Maps + EAS project id from env at build time.
 * Source of truth for static fields remains app.json.
 */
const appJson = require('./app.json');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  '';

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
    googleMapsApiKey,
  };

  if (googleMapsApiKey) {
    expo.ios = {
      ...(expo.ios || {}),
      config: {
        ...(expo.ios?.config || {}),
        googleMapsApiKey,
      },
    };
    expo.android = {
      ...(expo.android || {}),
      config: {
        ...(expo.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    };
  }

  const plugins = [...(expo.plugins || [])];
  const mapsPluginIndex = plugins.findIndex(
    (p) => p === 'react-native-maps' || (Array.isArray(p) && p[0] === 'react-native-maps')
  );
  if (googleMapsApiKey) {
    const mapsPlugin = [
      'react-native-maps',
      {
        iosGoogleMapsApiKey: googleMapsApiKey,
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ];
    if (mapsPluginIndex >= 0) plugins[mapsPluginIndex] = mapsPlugin;
    else plugins.push(mapsPlugin);
  }
  expo.plugins = plugins;

  return { expo };
};
