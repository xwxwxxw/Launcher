const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
    if (!zipUrl) {
      // Fallback: Use the main branch source zipball
      zipUrl = \`https://api.github.com/repos/\${repo}/zipball/main\`;
      
      try {
        const commitRes = await fetch(\`https://api.github.com/repos/\${repo}/commits/main\`, {
          headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
        });
        if (commitRes.ok) {
          const commit = await commitRes.json();
          tagName = commit.sha;
        } else {
          tagName = 'main';
        }
      } catch (e) {
        tagName = 'main';
      }

      sendEvent('status', { message: 'Основной релиз не найден. Скачивание исходников сборки из ветки main...', progress: 20 });
    } else {
`;

code = code.replace(`    if (!zipUrl) {
      // Fallback: Use the main branch source zipball
      zipUrl = \`https://api.github.com/repos/\${repo}/zipball/main\`;
      sendEvent('status', { message: 'Основной релиз не найден. Скачивание исходников сборки из ветки main...', progress: 20 });
    } else {`, replacement);

fs.writeFileSync('server.ts', code);
