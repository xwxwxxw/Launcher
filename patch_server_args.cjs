const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`
  const jvmArguments = jvmArgs ? String(jvmArgs).split(' ') : [];
`, `
  const jvmArguments = jvmArgs ? String(jvmArgs).match(/(?:[^\\s"]+|"[^"]*")+/g)?.map(arg => arg.replace(/^"|"$/g, '')) || [] : [];
`);

fs.writeFileSync('server.ts', code);
