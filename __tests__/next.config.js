// @ts-nocheck
const { withPlugins } = require('next-compose-plugins');
const withManifest = require('next-manifest');
const { withOffline } = require('../dist/index');
const forceProd = require('./forceProd');

const manifest = {
  output: './public/',
  short_name: 'next-offline-test-app',
  name: 'next-offline-test-app',
  description: 'Reproduce a bug to help fix it',
  dir: 'ltr',
  lang: 'en',
  icons: [
    {
      src: 'favicon.ico',
      sizes: '64x64 32x32 24x24 16x16',
      type: 'image/x-icon',
    },
  ],
  start_url: '/',
  display: 'standalone',
  theme_color: '#ffffff',
  background_color: '#ffffff',
};

module.exports = withPlugins([
  withManifest({ manifest }),
  forceProd(
    withOffline({
      dontAutoRegisterSw: true,
      cacheStaticAsset: true,
      nextAssetDirectory: 'public',
      workboxOpts: {
        maximumFileSizeToCacheInBytes: 5000000,
      },
    }),
  ),
]);
