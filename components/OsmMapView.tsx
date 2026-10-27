import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export type OsmMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  selected?: boolean;
};

type Props = {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers: OsmMarker[];
  userLocation?: { latitude: number; longitude: number } | null;
  onMarkerPress?: (id: string) => void;
  style?: object;
};

function buildHtml(
  center: { latitude: number; longitude: number },
  zoom: number,
  markers: OsmMarker[],
  userLocation?: { latitude: number; longitude: number } | null
) {
  const payload = JSON.stringify({ center, zoom, markers, userLocation: userLocation || null });
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef2ff; }
    .sessly-pin {
      background: #8B5CF6; color: #fff; border-radius: 999px; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center; font-weight: 800;
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.25); font-size: 12px;
      cursor: pointer;
    }
    .sessly-pin.selected { background: #059669; transform: scale(1.12); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const data = ${payload};
    const map = L.map('map', { zoomControl: true }).setView(
      [data.center.latitude, data.center.longitude],
      data.zoom || 12
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    function post(id) {
      const msg = JSON.stringify({ type: 'marker', id: id });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      }
      // Expo web iframe — notify parent window
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    }

    data.markers.forEach(function (m) {
      const icon = L.divIcon({
        className: '',
        html: '<div class="sessly-pin' + (m.selected ? ' selected' : '') + '">●</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
      if (m.title) marker.bindTooltip(m.title, { direction: 'top', offset: [0, -12] });
      marker.on('click', function () { post(m.id); });
    });

    if (data.userLocation) {
      L.circleMarker(
        [data.userLocation.latitude, data.userLocation.longitude],
        { radius: 8, color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 0.9, weight: 2 }
      ).addTo(map);
    }
  </script>
</body>
</html>`;
}

export function OsmMapView({
  center,
  zoom = 12,
  markers,
  userLocation,
  onMarkerPress,
  style,
}: Props) {
  const webRef = useRef<WebView>(null);
  const html = useMemo(
    () => buildHtml(center, zoom, markers, userLocation),
    // Recreate when pin set / selection / center changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      center.latitude,
      center.longitude,
      zoom,
      userLocation?.latitude,
      userLocation?.longitude,
      markers.map((m) => `${m.id}:${m.selected ? 1 : 0}:${m.latitude},${m.longitude}`).join('|'),
    ]
  );

  const handleMarkerMessage = (raw: string) => {
    try {
      const data = JSON.parse(raw);
      if (data?.type === 'marker' && data.id) onMarkerPress?.(String(data.id));
    } catch {
      // ignore
    }
  };

  const onMessage = (event: WebViewMessageEvent) => {
    handleMarkerMessage(event.nativeEvent.data);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onWindowMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      handleMarkerMessage(event.data);
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMarkerPress]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, style]}>
        <iframe
          title="Mapa OSM"
          srcDoc={html}
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#EEF2FF' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
