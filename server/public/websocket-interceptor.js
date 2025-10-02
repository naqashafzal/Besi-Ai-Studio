(function() {
  const originalWebSocket = window.WebSocket;

  if (!originalWebSocket) {
    console.error('[WebSocketInterceptor] Original window.WebSocket not found. Cannot apply interceptor.');
    return;
  }

  const handler = {
    construct(target, args) {
      let [url, protocols] = args;
      
      try {
        const urlString = String(url); // Handles both string and URL object
        const parsedUrl = new URL(urlString);

        if (parsedUrl.hostname.endsWith('googleapis.com') || parsedUrl.hostname.endsWith('clients6.google.com')) {
          const proxyScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
          const proxyHost = window.location.host;
          const newUrl = `${proxyScheme}://${proxyHost}/api-proxy/${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}`;
          
          console.log('[WebSocketInterceptor-Proxy] Original WebSocket URL:', urlString);
          console.log('[WebSocketInterceptor-Proxy] Redirecting to proxy URL:', newUrl);
          url = newUrl; // Update the URL to be used in the constructor
        }
      } catch (e) {
        // Not a valid URL, or some other error. Let it pass through to the original constructor.
        console.warn('[WebSocketInterceptor-Proxy] Could not process WebSocket URL, using original:', url, e);
      }
      
      // Call original constructor with the (potentially modified) URL
      if (protocols) {
        return Reflect.construct(target, [url, protocols]);
      } else {
        return Reflect.construct(target, [url]);
      }
    },
    get(target, prop, receiver) {
      // Forward static property access (e.g., WebSocket.OPEN, WebSocket.CONNECTING)
      return Reflect.get(target, prop, receiver);
    }
  };

  window.WebSocket = new Proxy(originalWebSocket, handler);

  console.log('[WebSocketInterceptor-Proxy] Global WebSocket constructor has been wrapped using Proxy.');
})();