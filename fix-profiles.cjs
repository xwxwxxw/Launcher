const fs = require('fs');
if (fs.existsSync('profiles.json')) {
  let profiles = JSON.parse(fs.readFileSync('profiles.json', 'utf-8'));
  profiles.forEach(p => {
    if (p.mod_path && p.mod_path.includes('.minecraft/mods')) {
      p.mod_path = p.mod_path.replace('.minecraft/mods', 'mods');
    }
  });
  fs.writeFileSync('profiles.json', JSON.stringify(profiles, null, 2));
}
