import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextConfig } from 'next';

// Copies the generated Service Worker into the export folder if the Next.js app is being built as
// a Static HTML app
export function exportSw(nextConfig: NextConfig) {
  return async function exportPathMap(...args: any[]) {
    const [defaultPathMap, { dev, distDir, outDir }] = args;
    const swDest = (nextConfig.workboxOpts && nextConfig.workboxOpts.swDest) || 'service-worker.js';

    if (!dev) {
      // Copy service worker from Next.js build dir into the export dir.
      copyFileSync(join(distDir, swDest), join(outDir, swDest));
    }

    // Run user's exportPathMap function if available.
    return nextConfig.exportPathMap ? nextConfig.exportPathMap(...args) : defaultPathMap;
  };
}
