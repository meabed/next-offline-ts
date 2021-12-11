export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function (registration) {
      registration.unregister();
    });
  }
}

export function register(swPath: any, options: RegistrationOptions) {
  if ('serviceWorker' in navigator) {
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
