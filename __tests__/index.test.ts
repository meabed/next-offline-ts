import { accessSync, constants, copyFileSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import rimraf from 'rimraf';
import { execSync } from 'child_process';

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

function nextBuild() {
  execSync(`cd ${__dirname} && yarn build`, { cwd: __dirname });
}

function copyNextConfig(suffix: string = 'auto-register') {
  copyFileSync(`${__dirname}/next-configs/next.config-${suffix}.js`, `${__dirname}/next.config.js`);
}

beforeAll(async () => {
  execSync(`cd ${__dirname} && yarn install --ignore-scripts`, { cwd: __dirname });
});

beforeEach(async () => {
  jest.setTimeout(20000);
  rimraf.sync(getNextBuildFilePath(''));
  rimraf.sync(join(cwd, 'static/manifest'));
});

test('withOffline builds a service worker file with auto-registration logic', async () => {
  copyNextConfig();
  await nextBuild();
  accessSync(getNextBuildFilePath('service-worker.js'), constants.F_OK);
  // Check registration logic exists
  const mainFileName = await findHashedFileName(getNextBuildFilePath('static/chunks'), getFileHashRegex('main', 'js'));
  const mainFileContents = await readBuildFile(`static/chunks/${mainFileName}`);
  expect(mainFileContents).toEqual(expect.stringContaining('serviceWorker'));
});

test('withOffline includes static assets and build artifacts in its service worker pre-cache', async () => {
  copyNextConfig();
  await nextBuild();
  const serviceWorkerContents = await readBuildFile('service-worker.js');
  // Check that various bundles are getting entered into pre-cache manifest
  expect(serviceWorkerContents).toEqual(expect.stringContaining('/pages/_app-'));
  expect(serviceWorkerContents).toEqual(expect.stringContaining('_next/static/chunks/main-'));

  // Check that static asset copying via glob pattern is working as expected
  expect(serviceWorkerContents).toEqual(expect.stringContaining('_next/public/image.jpg'));
});

test('withOffline builds a service worker file without auto-registration logic when the consumer opts out', async () => {
  copyNextConfig('no-auto-register');
  await nextBuild();
  accessSync(getNextBuildFilePath('service-worker.js'), constants.F_OK);

  const mainFileName = await findHashedFileName(getNextBuildFilePath('static/chunks'), getFileHashRegex('main', 'js'));
  const mainFileContents = await readBuildFile(`static/chunks/${mainFileName}`);
  expect(mainFileContents).not.toEqual(expect.stringContaining('serviceWorker'));
});

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
//   await nextBuild();
//   accessSync(getNextBuildFilePath(customSWDest), constants.F_OK);
// });
