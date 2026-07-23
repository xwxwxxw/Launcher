  // Intercept console.error/warn to suppress benign WebSocket/HMR messages
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const isBenign = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === 'string' ? arg : (arg.message || arg.stack || String(arg));
      return str.includes('WebSocket') || str.includes('vite') || str.includes('ws://') || str.includes('wss://') || str.includes('closed without opened');
    });
    if (isBenign) return;
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const isBenign = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === 'string' ? arg : (arg.message || arg.stack || String(arg));
      return str.includes('WebSocket') || str.includes('vite') || str.includes('ws://') || str.includes('wss://') || str.includes('closed without opened');
    });
    if (isBenign) return;
    originalConsoleWarn.apply(console, args);
  };

  // Catch and silence benign Vite/WebSocket HMR errors that occur when HMR is disabled
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason ? (typeof reason === 'string' ? reason : (reason.message || reason.stack || String(reason))) : '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('vite') || 
      msg.includes('ws://') || 
      msg.includes('wss://') ||
      msg.includes('closed without opened')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('vite') || 
      msg.includes('ws://') || 
      msg.includes('wss://') ||
      msg.includes('closed without opened')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

