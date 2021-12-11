export function unregister() {
  if (typeof window != 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function (registration) {
      registration
        .unregister()
        .then()
        .catch((e) => console.error(`Error in unregistering service-worker`, e));
    });
  }
}

export function register(swPath?: any, options?: RegistrationOptions) {
  if (typeof window != 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register(swPath || '/service-worker.js', options)
      .then(function (registration) {
        console.log('SW registered: ', registration);
      })
      .catch(function (registrationError) {
        console.log('SW registration failed: ', registrationError);
      });
  }
}
