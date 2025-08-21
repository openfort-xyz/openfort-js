  const openfort = new Openfort({
    baseConfiguration: {
        publishableKey: 'pk_test_6aef2466-6df0-508d-a32c-3872aeeae6fb',
    },
    shieldConfiguration: {
        debug: true,
        shieldPublishableKey: 'At5k1GFlBk52zHpTsghZAn82vWwGR3CvHTxhuwMZzMyp',
        shieldEncryptionShare: 'AptbbTVHwcC+S36CuOrJA/gGNSAySpwOm0STLYMXkrqT'
    },
    overrides: {
        shieldUrl: 'http://localhost:8080',
        backendUrl: 'http://localhost:3000',
        iframeUrl: 'http://localhost:4000/iframe',
    },
  });