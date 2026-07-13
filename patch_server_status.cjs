const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add global var
code = code.replace("const launcher = new Client();", "let activeProcess = null;\nconst launcher = new Client();");

const launchTarget = `    const proc = await launcher.launch(opts);
    
    if (proc === null) {`;

const launchReplacement = `    const proc = await launcher.launch(opts);
    activeProcess = proc;
    
    if (proc === null) {`;

code = code.replace(launchTarget, launchReplacement);

const closeTarget = `    proc.on('close', (code: number) => {
       sendEvent('log', { message: \`Процесс завершился с кодом \${code}\`, progress: 100 });
       sendEvent('game_closed', { code });
       res.end();
    });`;

const closeReplacement = `    proc.on('close', (code: number) => {
       activeProcess = null;
       sendEvent('log', { message: \`Процесс завершился с кодом \${code}\`, progress: 100 });
       sendEvent('game_closed', { code });
       res.end();
    });`;

code = code.replace(closeTarget, closeReplacement);

// Add endpoints
const statusEndpoint = `
app.get('/api/minecraft/status', (req, res) => {
  if (activeProcess && !activeProcess.killed) {
    res.json({ status: 'running', pid: activeProcess.pid });
  } else {
    res.json({ status: 'idle' });
  }
});

app.post('/api/minecraft/kill', (req, res) => {
  if (activeProcess) {
    try {
      activeProcess.kill('SIGTERM');
      activeProcess = null;
      res.json({ success: true });
    } catch(e) {
      res.json({ success: false, error: e.message });
    }
  } else {
    res.json({ success: false, error: 'No active process' });
  }
});
`;

code = code.replace("app.get('/api/system/check-update', async (req, res) => {", statusEndpoint + "\napp.get('/api/system/check-update', async (req, res) => {");

fs.writeFileSync('server.ts', code);
