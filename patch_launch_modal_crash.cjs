const fs = require('fs');
let code = fs.readFileSync('src/components/LaunchModal.tsx', 'utf8');

const target = `    eventSource.addEventListener('game_closed', (e: any) => {
      setStatus('closed');
      if (onGameStatusChange) onGameStatusChange('idle');
      eventSource.close();
    });`;

const rep = `    eventSource.addEventListener('game_closed', (e: any) => {
      const data = JSON.parse(e.data);
      if (data.code !== 0) {
        if (data.crashMessage) {
           setLogs(prev => [...prev, { msg: \`КРИТИЧЕСКАЯ ОШИБКА: \${data.crashMessage}\`, time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
        }
        if (data.outOfMemory) {
           setTimeout(() => alert("Недостаточно памяти! Пожалуйста, увеличьте RAM для этой сборки в настройках профиля."), 500);
        }
        setStatus('error');
      } else {
        setStatus('closed');
      }
      
      if (onGameStatusChange) onGameStatusChange('idle');
      eventSource.close();
    });`;

code = code.replace(target, rep);
fs.writeFileSync('src/components/LaunchModal.tsx', code);
