const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`
app.get('/api/minecraft/launch', async (req, res) => {
  const { 
`, `
app.get('/api/minecraft/launch', async (req, res) => {
  if (activeProcess) {
    res.status(400).json({ error: 'Minecraft уже запущен' });
    return;
  }
  const { 
`);

fs.writeFileSync('server.ts', code);
