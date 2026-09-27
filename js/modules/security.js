(function () {
  'use strict';

  const hostname = (typeof location !== 'undefined' && location.hostname) || '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  // Môi trường frontend nên được đọc từ biến toàn cục nếu build được inject.
  const configuredNodeEnv = (typeof window !== 'undefined' && window.__GEO_ENV__ && window.__GEO_ENV__.NODE_ENV)
    || 'development';

  const isProduction = configuredNodeEnv === 'production';

  window.GeoSecurity = window.GeoSecurity || {};
  window.GeoSecurity.settings = {
    environment: configuredNodeEnv,
    isProduction,
    isLocalhost,
    appCheckDebugEnabled: isLocalhost && !isProduction
  };
})();
