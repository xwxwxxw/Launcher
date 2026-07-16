const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`
    memory: {
        max: \`\${selectedRam}M\`,
        min: "1024M"
    },
`, `
    memory: {
        max: \`\${selectedRam}M\`,
        min: \`\${Math.min(parseInt(selectedRam, 10), 1024)}M\`
    },
`);

fs.writeFileSync('server.ts', code);
