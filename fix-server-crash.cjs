const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// We need to inject a stdLog buffer
content = content.replace(
  `  launcher.on('debug', (e: string) => sendEvent('log', { message: e, progress: 50 }));
  launcher.on('data', (e: string) => sendEvent('log', { message: e, progress: 80 }));`,
  `  let stdLog = '';
  launcher.on('debug', (e: string) => {
    stdLog += e + '\\n';
    if (stdLog.length > 50000) stdLog = stdLog.substring(stdLog.length - 50000);
    sendEvent('log', { message: e, progress: 50 });
  });
  launcher.on('data', (e: string) => {
    stdLog += e + '\\n';
    if (stdLog.length > 50000) stdLog = stdLog.substring(stdLog.length - 50000);
    sendEvent('log', { message: e, progress: 80 });
  });`
);

content = content.replace(
  `        if (!crashMessage) {
          // Maybe we can check latest.log for out of memory`,
  `        if (!crashMessage) {
          // Parse stdout/stderr for common mod conflicts or JVM crashes
          const lines = stdLog.split('\\n');
          const errorLineIndex = lines.findIndex(l => 
            l.includes('Exception in thread') || 
            l.includes('FATAL ERROR') || 
            l.includes('net.fabricmc.loader.impl.gui.FabricGuiEntry') ||
            l.includes('Multiple entries with same key') ||
            l.includes('Could not execute entrypoint')
          );
          if (errorLineIndex !== -1) {
            crashMessage = lines.slice(Math.max(0, errorLineIndex - 2), errorLineIndex + 10).join('\\n');
          }
        }
        
        if (!crashMessage) {
          // Maybe we can check latest.log for out of memory`
);

fs.writeFileSync('server.ts', content);
