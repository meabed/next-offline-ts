import { GenerateSW, GenerateSWOptions, InjectManifest, InjectManifestOptions } from 'workbox-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { exportSw } from './export';
import { NextConfig } from 'next';
import { NextConfigComplete } from 'next/dist/server/config-shared';

// Next build metadata files that shouldn't be included in the pre-cache manifest.
const preCacheManifestBlacklist = ['react-loadable-manifest.json', 'build-manifest.json', /\.map$/];

const defaultInjectOpts: InjectManifestOptions = {
  swSrc: undefined,
  exclude: preCacheManifestBlacklist,
  modifyURLPrefix: {
    'static/': '_next/static/',
    'public/': '_next/public/',
  },
};

const defaultGenerateOpts: Partial<GenerateSWOptions | InjectManifestOptions> = {
  ...defaultInjectOpts,
  // As of Workbox v5 Alpha there isn't a well documented way to move workbox runtime into the directory
  // required by Next. As a workaround, we inline the tree-shaken runtime into the main Service Worker file
  // at the cost of less reachability
  inlineWorkboxRuntime: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
};

interface INextOfflineTsConfig extends NextConfig {
  webpack?: any;
  devSwSrc?: string;
  dontAutoRegisterSw?: boolean;
  generateInDevMode?: boolean;
  generateSw?: boolean;
  registerSwPrefix?: string;
  scope?: string;
  workboxOpts?: GenerateSWOptions;
  nextAssetDirectory?: string;
}

export function withOffline(nextConfig: INextOfflineTsConfig = {}): NextConfig {
  return {
    ...nextConfig,
    exportPathMap: exportSw(nextConfig),
    webpack(
      config: any,
      context: {
        dir: string;
        dev: boolean;
        isServer: boolean;
        buildId: string;
        config: NextConfigComplete;
        defaultLoaders: {
          babel: any;
        };
        totalPages: number;
        webpack: any;
      },
    ) {
      if (!context.defaultLoaders) {
        throw new Error('This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade');
      }

      const {
        devSwSrc = join(__dirname, 'service-worker.js'),
        dontAutoRegisterSw = false,
        generateInDevMode = false,
        generateSw = true,
        // Before adjusting "registerSwPrefix" or "scope", read:
        // https://developers.google.com/web/ilt/pwa/introduction-to-service-worker#registration_and_scope
        registerSwPrefix = '',
        scope = '/',
        workboxOpts = {},
        nextAssetDirectory = 'public',
      } = nextConfig;

      const skipDuringDevelopment = context.dev && !generateInDevMode;

      // Generate SW
      if (skipDuringDevelopment) {
        // Simply copy development service worker.
        config.plugins.push(new CopyWebpackPlugin({ patterns: [devSwSrc] }));
      } else if (!context.isServer) {
        // Only run once for the client build.
        config.plugins.push(
          // Workbox uses Webpack asset manifest to generate the SW's pre-cache manifest, so we need
          // to copy the app's assets into the Webpack context so those are picked up.
          new CopyWebpackPlugin({ patterns: [{ from: `${join(cwd(), nextAssetDirectory)}/**/*` }] }),
          generateSw ? new GenerateSW({ ...defaultGenerateOpts, ...workboxOpts }) : new InjectManifest({ ...defaultInjectOpts, ...workboxOpts }),
        );
      }

      if (!skipDuringDevelopment) {
        // Register SW
        const originalEntry = config.entry;
        config.entry = async () => {
          const entries = await originalEntry();
          const swCompiledPath = join(__dirname, 'register-sw-compiled.js');
          // See https://github.com/zeit/next.js/blob/canary/examples/with-polyfills/next.config.js for a reference on how to add new entrypoints
          if (entries['main.js'] && !entries['main.js'].includes(swCompiledPath) && !dontAutoRegisterSw) {
            let content = readFileSync(require.resolve('./register-sw.js'), 'utf8');
            content = content.replace('{REGISTER_SW_PREFIX}', registerSwPrefix);
            content = content.replace('{SW_SCOPE}', scope);

            writeFileSync(swCompiledPath, content, 'utf8');

            entries['main.js'].unshift(swCompiledPath);
          }
          return entries;
        };
      }

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, context);
      }

      return config;
    },
  };
}

export default withOffline;
