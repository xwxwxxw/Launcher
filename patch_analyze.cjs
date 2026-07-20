const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "  res.json(results);\n});",
  `  // Save to modsList
  results.forEach(analyzedMod => {
    const idx = modsList.findIndex(m => m.profile_id === analyzedMod.profile_id && m.contentType === analyzedMod.contentType && (m.mod_id === analyzedMod.mod_id || m.path === analyzedMod.path));
    if (idx !== -1) {
      modsList[idx] = { ...modsList[idx], ...analyzedMod };
    }
  });
  saveMods();
  res.json(results);
});`
);

fs.writeFileSync('server.ts', code);
