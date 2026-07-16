const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`
  const sendEvent = (type: string, data: any) => {
    res.write(\`event: \${type}\\ndata: \${JSON.stringify(data)}\\n\\n\`);
  };
`, `
  let isClosed = false;
  req.on('close', () => { isClosed = true; });
  const sendEvent = (type: string, data: any) => {
    if (!isClosed && !res.writableEnded) {
      res.write(\`event: \${type}\\ndata: \${JSON.stringify(data)}\\n\\n\`);
    }
  };
`);

fs.writeFileSync('server.ts', code);
