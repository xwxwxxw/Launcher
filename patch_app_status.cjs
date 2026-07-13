const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetEffect = `    // 3. Listen to storage changes (fired when other windows/tabs modify localStorage)
    const handleStorageEvent = (e: StorageEvent) => {`;

const replacementEffect = `    // Poll for game status periodically
    const checkGameStatus = async () => {
      try {
        const res = await fetch('/api/minecraft/status');
        if (res.ok) {
          const data = await res.json();
          setGameStatus(data.status);
        }
      } catch (e) {}
    };
    
    // Check initially and then every 3 seconds
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 3000);

    // 3. Listen to storage changes (fired when other windows/tabs modify localStorage)
    const handleStorageEvent = (e: StorageEvent) => {`;

code = code.replace(targetEffect, replacementEffect);

const targetCleanup = `    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };`;

const replacementCleanup = `    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(interval);
    };`;

code = code.replace(targetCleanup, replacementCleanup);

const targetPlayBtn = `              <button 
                onClick={() => setShowLaunchModal(true)} 
                disabled={gameStatus === 'running' || gameStatus === 'installing'}`;

const replacementPlayBtn = `              <button 
                onClick={() => {
                  if (gameStatus === 'running') {
                    // Try to kill
                    fetch('/api/minecraft/kill', { method: 'POST' }).then(() => setGameStatus('idle'));
                  } else {
                    setShowLaunchModal(true);
                  }
                }} 
                disabled={gameStatus === 'installing'}`;

code = code.replace(targetPlayBtn, replacementPlayBtn);

const targetBtnText = `<PlaySquare size={16} fill="currentColor" /> {isCheckingInstall ? '...' : (isInstalled ? 'Играть' : 'Установить')}`;
const replacementBtnText = `<PlaySquare size={16} fill="currentColor" /> {gameStatus === 'running' ? 'Остановить' : (isCheckingInstall ? '...' : (isInstalled ? 'Играть' : 'Установить'))}`;

code = code.replace(targetBtnText, replacementBtnText);

fs.writeFileSync('src/App.tsx', code);
