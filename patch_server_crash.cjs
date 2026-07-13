const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetClose = `    proc.on('close', (code: number) => {
       activeProcess = null;
       sendEvent('log', { message: \`Процесс завершился с кодом \${code}\`, progress: 100 });
       sendEvent('game_closed', { code });
       res.end();
    });`;

const replacementClose = `    proc.on('close', (code: number) => {
       activeProcess = null;
       sendEvent('log', { message: \`Процесс завершился с кодом \${code}\`, progress: 100 });
       
       let crashMessage = null;
       let outOfMemory = false;
       
       if (code !== 0) {
         // Check crash reports
         const crashDir = path.join(isolatedDir, 'crash-reports');
         if (fs.existsSync(crashDir)) {
           const files = fs.readdirSync(crashDir).filter(f => f.endsWith('.txt')).sort();
           if (files.length > 0) {
             const crashPath = path.join(crashDir, files[files.length - 1]);
             const stats = fs.statSync(crashPath);
             // If crash report is newer than process start
             if (Date.now() - stats.mtimeMs < 60000) {
               const crashContent = fs.readFileSync(crashPath, 'utf8');
               if (crashContent.includes('java.lang.OutOfMemoryError')) {
                 outOfMemory = true;
                 crashMessage = 'Недостаточно оперативной памяти (OutOfMemoryError). Увеличьте RAM в настройках профиля.';
               } else {
                 crashMessage = 'Произошла ошибка. См. краш-репорт в ' + crashPath;
               }
             }
           }
         }
         
         if (!crashMessage) {
           // Maybe we can check latest.log for out of memory
           const logPath = path.join(isolatedDir, 'logs', 'latest.log');
           if (fs.existsSync(logPath)) {
             const logContent = fs.readFileSync(logPath, 'utf8');
             if (logContent.includes('java.lang.OutOfMemoryError')) {
               outOfMemory = true;
               crashMessage = 'Недостаточно оперативной памяти (OutOfMemoryError). Увеличьте RAM в настройках профиля.';
             }
           }
         }
       }
       
       sendEvent('game_closed', { code, crashMessage, outOfMemory });
       res.end();
    });`;

code = code.replace(targetClose, replacementClose);
fs.writeFileSync('server.ts', code);
