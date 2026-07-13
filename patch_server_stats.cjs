const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetLaunch = `    const proc = await launcher.launch(opts);
    activeProcess = proc;`;

const repLaunch = `    const proc = await launcher.launch(opts);
    activeProcess = proc;
    
    const startTime = Date.now();
    if (!activeProfile.stats) {
      activeProfile.stats = { totalPlayTimeMs: 0, lastLaunchTime: 0, launchCount: 0 };
    }
    activeProfile.stats.launchCount++;
    activeProfile.stats.lastLaunchTime = startTime;
    saveProfiles();`;

code = code.replace(targetLaunch, repLaunch);

const targetClose = `       sendEvent('game_closed', { code, crashMessage, outOfMemory });
       res.end();
    });`;

const repClose = `       if (activeProfile.stats) {
         activeProfile.stats.totalPlayTimeMs += (Date.now() - startTime);
         saveProfiles();
       }
       sendEvent('game_closed', { code, crashMessage, outOfMemory });
       res.end();
    });`;

code = code.replace(targetClose, repClose);

fs.writeFileSync('server.ts', code);
