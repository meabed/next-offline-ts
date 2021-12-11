import nextBuild from 'next/dist/build';
import withOffline from 'next-offline-ts';
import { accessSync, constants, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import rimraf from 'rimraf';

const withManifest = require('next-manifest');

const forceProd = require('./forceProd');

const cwd = __dirname;

// Creates a RegExp for finding a file with a Next build hash.
function getFileHashRegex(fileName: string, extension: string) {
  return new RegExp(`${fileName}([-\\w])*\\.${extension}$`);
}

function getNextBuildFilePath(filePath: string) {
  return join(cwd, '.next', filePath);
}

async function readBuildFile(filePath: string) {
  return readFileSync(getNextBuildFilePath(filePath), 'utf8');
}

// Read a directory and returns the file path for the first file name matching the provided RegExp.
async function findHashedFileName(directoryPath: any, regexTest: RegExp) {
  const files = readdirSync(directoryPath);
  return files.find((filePath: string) => regexTest.test(filePath));
}

beforeEach(async () => {
  jest.setTimeout(20000);
  rimraf.sync(getNextBuildFilePath(''));
  rimraf.sync(join(cwd, 'static/manifest'));
});

test('withOffline builds a service worker file with auto-registration logic', async () => {
  const nextConf = forceProd(withOffline());

  await nextBuild(cwd, nextConf);
  accessSync(getNextBuildFilePath('service-worker.js'), constants.F_OK);

  // Check registration logic exists
  // const mainFileName = await findHashedFileName(getNextBuildFilePath('static/runtime'), getFileHashRegex('main', 'js'));
  // const mainFileContents = await readBuildFile(`static/runtime/${mainFileName}`);
  // expect(mainFileContents).toEqual(expect.stringContaining('serviceWorker'));
});

// test('withOffline builds a service worker file without auto-registration logic when the consumer opts out', async () => {
//   const nextConf = forceProd(withOffline({dontAutoRegisterSw: true}));
//
//   await nextBuild(cwd, nextConf);
//   accessSync(getNextBuildFilePath('service-worker.js'), constants.F_OK);
//
//   const mainFileName = await findHashedFileName(getNextBuildFilePath('static/runtime'), getFileHashRegex('main', 'js'));
//   const mainFileContents = await readBuildFile(`static/runtime/${mainFileName}`);
//   expect(mainFileContents).not.toEqual(expect.stringContaining('serviceWorker'));
// });
//
// test('withOffline includes static assets and build artifacts in its service worker pre-cache', async () => {
//   const nextConf = forceProd(withOffline());
//
//   await nextBuild(cwd, nextConf);
//   const serviceWorkerContents = await readBuildFile('service-worker.js');
//
//   // Check that various bundles are getting entered into pre-cache manifest
//   expect(serviceWorkerContents).toEqual(expect.stringContaining('/pages/_app.js'));
//   expect(serviceWorkerContents).toEqual(expect.stringContaining('_next/static/chunks/commons.'));
//
//   // Check that static asset copying via glob pattern is working as expected
//   expect(serviceWorkerContents).toEqual(expect.stringContaining('_next/public/image.jpg'));
// });
//
// test('withOffline pre-caches the generated manifest from withManifest', async () => {
//   const nextConf = forceProd(
//     withOffline(
//       withManifest({
//         manifest: {
//           output: './public/',
//           name: 'next-app',
//         },
//       }),
//     ),
//   );
//   await nextBuild(cwd, nextConf);
//
//   const serviceWorkerContent = await readBuildFile('service-worker.js');
//   expect(serviceWorkerContent).toEqual(expect.stringContaining('_next/public/manifest.json'));
// });
//
// test('withOffline respects "swDest"', async () => {
//   const customSWDest = './static/service-worker.js';
//
//   const nextConf = forceProd(
//     withOffline({
//       workboxOpts: {swDest: customSWDest},
//     }),
//   );
//
//   await nextBuild(cwd, nextConf);
//   accessSync(getNextBuildFilePath(customSWDest), constants.F_OK);
// });
