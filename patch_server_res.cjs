const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace "const res =" inside launch logic with "const fetchRes ="
code = code.replace(/const res = await fetch\(\`https:\/\/meta\.fabricmc\.net/g, 'const fetchRes = await fetch(`https://meta.fabricmc.net');
code = code.replace(/if \(res\.ok\) \{/g, 'if (fetchRes && fetchRes.ok) {');
code = code.replace(/const data = await res\.text\(\);/g, 'const data = await fetchRes.text();');

code = code.replace(/const res = await fetch\(\`https:\/\/meta\.quiltmc\.org/g, 'const fetchRes = await fetch(`https://meta.quiltmc.org');
code = code.replace(/const data = await res\.json\(\);/g, 'const data = await fetchRes.json();');

code = code.replace(/const res = await fetch\('https:\/\/files\.minecraftforge\.net/g, 'const fetchRes = await fetch(\'https://files.minecraftforge.net');
code = code.replace(/const res = await fetch\(forgeInstallerUrl\);/g, 'const fetchRes = await fetch(forgeInstallerUrl);');
code = code.replace(/const buffer = await res\.arrayBuffer\(\);/g, 'const buffer = await fetchRes.arrayBuffer();');

fs.writeFileSync('server.ts', code);
