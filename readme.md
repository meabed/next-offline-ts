<h1 align="center">
  next-offline-ts
</h1>

<p align="center">
Use <a href='https://github.com/GoogleChrome/workbox'>Workbox</a> with <a href='https://github.com/zeit/next.js'>
Next.js</a> and <br />easily enable offline functionality in your application!
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/next-offline-ts">
    <img src="https://img.shields.io/npm/dy/next-offline-ts.svg">
  </a>
  <a href="https://www.npmjs.com/package/next-offline-ts">
    <img src="https://img.shields.io/npm/v/next-offline-ts.svg?maxAge=3600&label=next-offline&colorB=007ec6">
  </a>
</p>


<h5 align="center">
  Maintained, Upgraded and improved version of <a href='https://github.com/hanford/next-offline'>next-offline</a>, written in typescript, updated and tested to fix multiple issues in the original library
</h5>


<br/>

## Installation

```sh
$ npm install --save next-offline-ts
```

```sh
$ yarn add next-offline-ts
```

## Usage

There are two important things to set up, first we need `next-offline-ts` to wrap your next config.

If you haven't yet, create a `next.config.js` in your project.

```js
// next.config.js
const { withOffline } = require('next-offline-ts')

const nextConfig = {
  ...
}

module.exports = withOffline(nextConfig)
```

Next we need to make sure our the application is properly serving the service worker, this setup depends on how you're hosting your application. There is [documentation](#serving-service-worker) below. If you're not using Now 2.0, the Now 1.0 example should work in most circumstances.

## Documentation
- [Serving service worker](#serving-service-worker)
  - [Now 1.0 / AWS](#now-10)
  - [Now 2.0](#now-20)
- [Registering service worker](#registering-service-worker)
  - [compile-time registration](#compile-time-registration)
  - [runtime registration](#runtime-registration)
- [Customizing service worker](#customizing-service-worker)
  - [Using workbox](#using-workbox)
  - [next-offline-ts options](#next-offline-ts-options)
- [Cache Strategies](#cache-strategies)
- [Service worker path](#service-worker-path)
- [next export](#next-export)
- [Development mode](#development-mode)
- [Contributing](#contributing)
- [License](#license-mit)

## Serving service worker
Because service workers are so powerful, the API has some restrictions built in. For example, service workers must be served on the domain they're being used on - [you can't use a CDN](https://github.com/w3c/ServiceWorker/issues/940).

### Now 1.0
You'll want to use the next.js custom server API. The easiest way to do that is creating a `server.js` that looks like this:
```js
const { createServer } = require('http')
const { join } = require('path')
const { parse } = require('url')
const next = require('next')

const app = next({ dev: process.env.NODE_ENV !== 'production' })
const handle = app.getRequestHandler()

app.prepare()
  .then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true)
      const { pathname } = parsedUrl

      // handle GET request to /service-worker.js
      if (pathname.startsWith('/service-worker.js')) {
        const filePath = join(__dirname, '.next', pathname);
        res.writeHead(200, { 'content-type': 'application/javascript' });
        res.write(readFileSync(filePath).toString());
        res.end();
      } else {
        handle(req, res, parsedUrl)
      }
    })
    .listen(3000, () => {
      console.log(`> Ready on http://localhost:${3000}`)
    })
  })
```
You can  read more about custom servers in the [Next.js docs](https://github.com/zeit/next.js#custom-server-and-routing)

If you're not hosting with Now, I'd probably follow the Now 1.0 approach because the custom server API can enable a lot of functionality, it just simply doesn't work well with Now 2.0 🙇‍♂️

### Now 2.0
Because Now 2.0 works so different than the previous version, so does serving the service worker. There are a few different ways to do this, but I'd recommend checking out [this now2 example app](https://github.com/meabed/next-offline-ts/tree/master/packages/now2-example). The changes to be aware of are in the [now.json](https://github.com/meabed/next-offline-ts/blob/master/packages/now2-example/now.json) and [next.config.js](https://github.com/meabed/next-offline-ts/blob/master/packages/now2-example/next.config.js).

## Registering service worker
### Compile-time registration
By default `next-offline-ts` will register a service worker with the script below, this is automatically added to your client side bundle once `withOffline` is invoked.

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).then(function (registration) {
      console.log('SW registered: ', registration)
    }).catch(function (registrationError) {
      console.log('SW registration failed: ', registrationError)
    })
  })
}
```

### Runtime registration
Alternative to compile-time, you can take control of registering/unregistering in your application code by using the `next-offline-ts/runtime` module.

```js
import { register, unregister } from 'next-offline-ts/runtime'

class App extends React.Component {
  componentDidMount () {
    register()
  }
  componentWillUnmount () {
    unregister()
  }
  ..
}
```

If you're handling registration on your own, pass `dontAutoRegisterSw` to next-offline-ts.
```js
// next.config.js
const { withOffline } = require('next-offline-ts')

module.exports = withOffline({ dontAutoRegisterSw: true })
```

## Customizing service worker

### Using workbox

If you're new to workbox, I'd recommend reading this [quick guide](https://developers.google.com/web/tools/workbox/guides/generate-service-worker/webpack#adding_runtime_caching) -- anything inside of `worboxOpts` will be passed to `workbox-webpack-plugin`.

Define a `workboxOpts` object in your `next.config.js` and it will gets passed to [workbox-webpack-plugin](https://developers.google.com/web/tools/workbox/modules/workbox-webpack-plugin#generatesw_plugin). Workbox is what `next-offline-ts` uses under the hood to generate the service worker, you can learn more about it [here](https://developers.google.com/web/tools/workbox/).

```js
// next.config.js
const { withOffline } = require('next-offline-ts')

const nextConfig = {
  workboxOpts: {
    ...
  }
}

module.exports = withOffline(nextConfig)
```

### next-offline-ts options
On top of the workbox options, next-offline-ts has some options built in flags to give you finer grain control over how your service worker gets generated.

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Description</th>
      <th>Default</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>generateSw</td>
      <td>Boolean</td>
      <td>If false, next-offline-ts will not generate a service worker and will instead try to modify workboxOpts.swSrc</td>
      <td>true</td>
    </tr>
    <tr>
      <td>dontAutoRegisterSw</td>
      <td>Boolean</td>
      <td>If true, next-offline-ts won't automatically push the registration script into the application code. This is required if you're using runtime registration or are handling registration on your own.</td>
      <td>false</td>
    </tr>
    <tr>
      <td>devSwSrc</td>
      <td>String</td>
      <td>Path to be registered by next-offline-ts during development. By default, next-offline-ts will register a noop during development</td>
      <td>false</td>
    </tr>
    <tr>
      <td>generateInDevMode</td>
      <td>Boolean</td>
      <td>If true, the service worker will also be generated in development mode. Otherwise, the service worker defined in devSwSrc will be used.</td>
      <td>false</td>
    </tr>
    <tr>
      <td>registerSwPrefix</td>
      <td>String</td>
      <td>If your service worker isn't at the root level of your application, this can help you prefix the path. This is useful if you'd like your service worker on foobar.com/my/long/path/service-worker.js. This affects the [scope](https://developers.google.com/web/ilt/pwa/introduction-to-service-worker#registration_and_scope) of your service worker.</td>
      <td>false</td>
    </tr>
    <tr>
      <td>scope</td>
      <td>String</td>
      <td>This is passed to the automatically registered service worker allowing increase or decrease what the service worker has control of.</td>
      <td>"/"</td>
    </tr>
  </tbody>
</table>

## Cache strategies
By default `next-offline-ts` has the following blanket runtime caching strategy. If you customize `next-offline-ts` with `workboxOpts`, the default behaviour will not be passed into `workbox-webpack-plugin`. This [article](https://developers.google.com/web/tools/workbox/guides/generate-service-worker/webpack#adding_runtime_caching) is great at breaking down various different cache recipes.
```js
{
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200
        }
      }
    }
  ]
}
```


```js
// next.config.js
const { withOffline } = require('next-offline-ts')

module.exports = withOffline({
  workboxOpts: {
    runtimeCaching: [
      {
        urlPattern: /.png$/,
        handler: 'CacheFirst'
      },
      {
        urlPattern: /api/,
        handler: 'NetworkFirst',
        options: {
          cacheableResponse: {
            statuses: [0, 200],
            headers: {
              'x-test': 'true'
            }
          }
        }
      }
    ]
  }
})
```

## Service worker path
If your application doesn't live on the root of your domain, you can use `registerSwPrefix`. This is helpful if your application is on domain.com/my/custom/path because by default `next-offline-ts` assumes your application is on domain.com and will try to register domain.com/service-worker.js. We can't support using `assetPrefix` because service workers must be served on the root domain. For a technical breakdown on that limitation, see the following link: [Is it possible to serve service workers from CDN/remote origin?](https://github.com/w3c/ServiceWorker/issues/940)

By default `next-offline-ts` will precache all the Next.js webpack emitted files and the user-defined static ones (inside `/static`) - essentially everything that is exported as well.

If you'd like to include some more or change the origin of your static files use the given workbox options:

```js
workboxOpts: {
  modifyUrlPrefix: {
    'app': assetPrefix,
  },
  runtimeCaching: {...}
}
```

## Development mode
By default `next-offline-ts` will add a no-op service worker in development. If you want to provide your own pass its filepath to `devSwSrc` option. This is particularly useful if you want to test web push notifications in development, for example.

```js
// next.config.js
const { withOffline } = require('next-offline-ts')

module.exports = withOffline({
  devSwSrc: '/path/to/my/dev/service-worker.js'
})
```

You can disable this behavior by setting the `generateInDevMode` option to `true`.


## next export

In next-offline-ts@6.0.0 we've rewritten the export functionality to work in more cases, more reliably, with less code thanks to some additions in Next 7.0.0!

You can read more about exporting at [Next.js docs]((https://github.com/zeit/next.js#static-html-export)) but next offline should Just Work™️.

<hr />

Questions? Feedback? [Please let me know](https://github.com/meabed/next-offline-ts/issues/new)

## TODO
- Fix test
- Deploy examples
- Update documentation about caching public assets `nextAssetDirectory` and `cacheStaticAsset`

## Contributing
Please feel free to open issues, ask questions and solve issues - All contributions are welcome


## License MIT

```
WWWWWW||WWWWWW
 W W W||W W W
      ||
    ( OO )__________
     /  |           \
    /o o|    MIT     \
    \___/||_||__||_|| *
         || ||  || ||
        _||_|| _||_||
       (__|__|(__|__|
```
Copyright © 2021-present

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
