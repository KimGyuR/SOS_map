const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadTs } = require('./loadTs.cjs');
const { synchronizeMapRegion } = loadTs('src/lib/mapViewport.ts');

test('map synchronization preserves all zoom levels and ignores gesture echoes', () => {
  const region = { latitude: 35, longitude: 128 };
  for (const zoom of [0, 3, 8, 14, 19]) {
    const calls = [];
    const map = { getCenter: () => ({ lat: 36, lng: 129 }), getZoom: () => zoom, setView: (...args) => calls.push(args) };
    synchronizeMapRegion(map, region, region);
    assert.equal(calls.length, 0);
    synchronizeMapRegion(map, region, null);
    assert.deepEqual(calls, [[[35, 128], zoom]]);
  }
});

test('all decorative web icons render without native DOM attributes or React warnings', () => {
  const icons = loadTs('src/components/AppIcon.tsx', {
    'react-native': { Platform: { OS: 'web' } },
    'react-native-svg': { __esModule: true, default: 'svg', Path: 'path' },
  });
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    for (const name of Object.keys(icons.iconPaths)) {
      const html = renderToStaticMarkup(React.createElement(icons.default, { name }));
      assert.match(html, /aria-hidden="true"/);
      assert.doesNotMatch(html, /accessibilityElementsHidden|importantForAccessibility/);
    }
    assert.equal(errors.length, 0);
  } finally { console.error = original; }
});

function locationApi(platform, location, geolocation, secure = true) {
  return loadTs('src/lib/currentLocation.ts', {
    'react-native': { Platform: { OS: platform } }, 'expo-location': location,
  }, { navigator: { geolocation }, globalThis: { isSecureContext: secure } });
}

test('web GPS succeeds without native geocoding and uses a bounded timeout', async () => {
  const api = locationApi('web', {}, {
    getCurrentPosition(success, _failure, options) {
      assert.equal(options.timeout, 15000);
      success({ coords: { latitude: 35, longitude: 128 } });
    },
  });
  assert.deepEqual(await api.getCurrentPlace(), { coordinate: { latitude: 35, longitude: 128 }, address: '' });
});

test('GPS permission failures and insecure contexts reject', async () => {
  await assert.rejects(locationApi('web', {}, null, false).getCurrentPlace());
  await assert.rejects(locationApi('web', {}, { getCurrentPosition(_success, failure) { failure(new Error('denied')); } }).getCurrentPlace(), /denied/);
  await assert.rejects(locationApi('android', { requestForegroundPermissionsAsync: async () => ({ status: 'denied' }) }).getCurrentPlace());
});

test('native address lookup failures preserve the successfully acquired coordinates', async () => {
  const api = locationApi('ios', {
    Accuracy: { Balanced: 3 }, requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
    getCurrentPositionAsync: async () => ({ coords: { latitude: 35, longitude: 128 } }),
    reverseGeocodeAsync: async () => { throw new Error('geocoder unavailable'); },
  });
  assert.deepEqual(await api.getCurrentPlace(), { coordinate: { latitude: 35, longitude: 128 }, address: '' });
});
