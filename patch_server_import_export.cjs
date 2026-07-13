const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const archiverImports = `import multer from 'multer';
import archiver from 'archiver';
import unzipper from 'unzipper';
import crypto from 'crypto';

const upload = multer({ dest: os.tmpdir() });`;

code = code.replace("import mclc from 'minecraft-launcher-core';", "import mclc from 'minecraft-launcher-core';\n" + archiverImports);

const exportImportCode = `
app.get('/api/profiles/:id/export', async (req, res) => {
  const profileId = req.params.id;
  const profile = profiles.find(p => p.id === profileId);
  
  if (!profile) return res.status(404).send('Profile not found');
  
  const profileDir = path.resolve(process.cwd(), \`./profiles/\${profileId}\`);
  if (!fs.existsSync(profileDir)) return res.status(404).send('Profile directory not found');

  res.attachment(\`\${profile.name || 'profile'}_export.zip\`);
  
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { res.status(500).send({ error: err.message }); });
  
  archive.pipe(res);
  
  // We can include the profile metadata inside the zip
  archive.append(JSON.stringify(profile, null, 2), { name: 'profile.json' });
  
  // And the whole folder
  archive.directory(profileDir, 'profile_data');
  
  await archive.finalize();
});

app.post('/api/profiles/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const tempPath = req.file.path;
  const newId = Date.now().toString();
  const profileDir = path.resolve(process.cwd(), \`./profiles/\${newId}\`);
  fs.mkdirSync(profileDir, { recursive: true });
  
  try {
    const directory = await unzipper.Open.file(tempPath);
    let profileData = null;
    
    for (const file of directory.files) {
      if (file.path === 'profile.json') {
        const content = await file.buffer();
        profileData = JSON.parse(content.toString());
      } else if (file.path.startsWith('profile_data/')) {
        const relativePath = file.path.substring('profile_data/'.length);
        if (!relativePath) continue;
        const outPath = path.join(profileDir, relativePath);
        if (file.type === 'Directory') {
          if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
        } else {
          const content = await file.buffer();
          if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, content);
        }
      }
    }
    
    fs.unlinkSync(tempPath);
    
    if (profileData) {
      profileData.id = newId;
      profileData.mod_path = \`./profiles/\${newId}/.minecraft/mods\`;
      profiles.push(profileData);
      saveProfiles();
      
      // We also need to rescan mods!
      if (fs.existsSync(path.join(profileDir, '.minecraft', 'mods'))) {
        const jarFiles = fs.readdirSync(path.join(profileDir, '.minecraft', 'mods')).filter(f => f.endsWith('.jar'));
        for (const jar of jarFiles) {
          modsList.push({
            path: path.join(profileDir, '.minecraft', 'mods', jar),
            name: jar,
            mod_id: jar.replace('.jar', ''),
            display_name: jar,
            profile_id: newId,
            enabled: true
          });
        }
        saveMods();
      }
      
      return res.json({ success: true, profile: profileData });
    } else {
      // Create generic profile if profile.json was missing
      const genericProfile = {
        id: newId,
        name: 'Импортированная сборка',
        game_version: '1.20.1',
        mod_loader: 'Fabric',
        mod_loader_version: '0.15.7',
        mod_path: \`./profiles/\${newId}/.minecraft/mods\`,
        created_at: Date.now(),
        is_active: false,
        ram_mb: 4096
      };
      profiles.push(genericProfile);
      saveProfiles();
      return res.json({ success: true, profile: genericProfile });
    }
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace(`app.put('/api/profiles/:id'`, exportImportCode + "\napp.put('/api/profiles/:id'");

fs.writeFileSync('server.ts', code);
