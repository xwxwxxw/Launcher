import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import mclc from 'minecraft-launcher-core';
import multer from 'multer';
import * as archiverPkg from 'archiver';
import * as unzipperPkg from 'unzipper';
const archiver: any = archiverPkg && (archiverPkg as any).default ? (archiverPkg as any).default : archiverPkg;
const unzipper: any = unzipperPkg && (unzipperPkg as any).default ? (unzipperPkg as any).default : unzipperPkg;

import crypto from 'crypto';

const upload = multer({ dest: os.tmpdir() });
const { Client, Authenticator } = mclc;
let activeProcess: any = null;
import dotenv from 'dotenv';
import { parseModJar, fetchModrinthData, translateText, generateWarningsRu } from './src/lib/modParser.js';
import { TRANSLATIONS } from './src/lib/constants.js';
import { Profile } from './src/types.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.use(express.json());

// Define standard directory for storing profiles and mods data
const getStorageDir = () => {
  let baseDir = process.cwd();
  let oldBaseDir = '';
  if (process.env.APPDATA) {
    baseDir = path.join(process.env.APPDATA, 'LayleLauncher');
    oldBaseDir = path.join(process.env.APPDATA, 'MinecraftLauncher');
  } else if (process.platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support', 'LayleLauncher');
    oldBaseDir = path.join(os.homedir(), 'Library', 'Application Support', 'MinecraftLauncher');
  } else {
    baseDir = path.join(os.homedir(), '.LayleLauncher');
    oldBaseDir = path.join(os.homedir(), '.MinecraftLauncher');
  }

  // Migrate old directory if exists
  if (!fs.existsSync(baseDir) && oldBaseDir && fs.existsSync(oldBaseDir)) {
    try {
      fs.renameSync(oldBaseDir, baseDir);
      console.log(`Migrated storage folder from ${oldBaseDir} to ${baseDir}`);
    } catch (e) {
      console.error('Failed to migrate launcher directory:', e);
    }
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
};

const DATA_DIR = getStorageDir();
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const MODS_FILE = path.join(DATA_DIR, 'mods.json');

// Migration of local files to APPDATA folder to prevent development watcher reload
const localProfilesFile = path.join(process.cwd(), 'profiles.json');
const localModsFile = path.join(process.cwd(), 'mods.json');

if (fs.existsSync(localProfilesFile)) {
  try {
    fs.copyFileSync(localProfilesFile, PROFILES_FILE);
    fs.unlinkSync(localProfilesFile);
    console.log('Migrated profiles.json to APPDATA folder');
  } catch (e) {
    console.error('Failed to migrate profiles.json:', e);
  }
}

if (fs.existsSync(localModsFile)) {
  try {
    fs.copyFileSync(localModsFile, MODS_FILE);
    fs.unlinkSync(localModsFile);
    console.log('Migrated mods.json to APPDATA folder');
  } catch (e) {
    console.error('Failed to migrate mods.json:', e);
  }
}

// Profiles In-Memory DB (or File backed)
let profiles: Profile[] = [];

function saveProfiles() {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

if (fs.existsSync(PROFILES_FILE)) {
  try {
    profiles = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
    // Ensure all existing profiles have separate isolated folders by default
    let migrated = false;
    profiles.forEach(p => {
      if (!p.mod_path || p.mod_path.trim() === '') {
        p.mod_path = `./profiles/${p.id}/.minecraft/mods`;
        migrated = true;
      }
    });
    if (migrated) {
      saveProfiles();
    }
  } catch (e) {}
}

if (profiles.length === 0 || (profiles.length === 3 && profiles[0].name === 'Vanilla 1.20.1')) {
  profiles = [
    {
      id: '1',
      name: 'Сборка Fabric 1.20.1',
      description: 'Сборка на загрузчике Fabric с оптимизацией FPS (Sodium) и поддержкой современных модов.',
      game_version: '1.20.1',
      mod_loader: 'Fabric' as const,
      mod_path: './profiles/1/.minecraft/mods',
      created_at: Date.now() - 100000,
      is_active: true,
      ram_mb: 4096
    },
    {
      id: '2',
      name: 'Сборка Forge 1.20.1',
      description: 'Классическая сборка на загрузчике Forge для работы с масштабными индустриальными и магическими модификациями.',
      game_version: '1.20.1',
      mod_loader: 'Forge',
      mod_path: './profiles/2/.minecraft/mods',
      created_at: Date.now() - 50000,
      is_active: false,
      ram_mb: 4096
    }
  ];
  saveProfiles();
}

// Mods In-Memory DB (or File backed)
let modsList: any[] = [];

function saveMods() {
  fs.writeFileSync(MODS_FILE, JSON.stringify(modsList, null, 2));
}

if (fs.existsSync(MODS_FILE)) {
  try {
    modsList = JSON.parse(fs.readFileSync(MODS_FILE, 'utf-8'));
  } catch (e) {}
}

if (modsList.length === 0) {
  modsList = [];
  saveMods();
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/profiles', (req, res) => {
  res.json(profiles);
});

app.post('/api/profiles', (req, res) => {
  const id = Date.now().toString();
  const mod_path = req.body.mod_path && req.body.mod_path.trim() !== '' 
    ? req.body.mod_path 
    : `./profiles/${id}/mods`;
  const newProfile: Profile = {
    ...req.body,
    id,
    mod_path,
    created_at: Date.now(),
  };
  profiles.push(newProfile);
  saveProfiles();
  res.json(newProfile);
});


app.get('/api/profiles/:id/export', async (req, res) => {
  const profileId = req.params.id;
  const profile = profiles.find(p => p.id === profileId);
  
  if (!profile) return res.status(404).send('Profile not found');
  
  const profileDir = path.resolve(process.cwd(), `./profiles/${profileId}`);
  if (!fs.existsSync(profileDir)) return res.status(404).send('Profile directory not found');

  res.attachment(`${profile.name || 'profile'}_export.zip`);
  
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
  if (!(req as any).file) return res.status(400).json({ error: 'No file uploaded' });
  
  const tempPath = (req as any).file.path;
  const newId = Date.now().toString();
  const profileDir = path.resolve(process.cwd(), `./profiles/${newId}`);
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
      profileData.mod_path = `./profiles/${newId}/.minecraft/mods`;
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
      const genericProfile = { description: '',
        id: newId,
        name: 'Импортированная сборка',
        game_version: '1.20.1',
        mod_loader: 'Fabric' as const,
        mod_loader_version: '0.15.7',
        mod_path: `./profiles/${newId}/.minecraft/mods`,
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

app.put('/api/profiles/:id', (req, res) => {
  const index = profiles.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    const updated = { ...profiles[index], ...req.body };
    if (!updated.mod_path || updated.mod_path.trim() === '') {
      updated.mod_path = `./profiles/${req.params.id}/.minecraft/mods`;
    }
    profiles[index] = updated;
    saveProfiles();
    res.json(profiles[index]);
  } else {
    res.status(404).json({ error: 'Profile not found' });
  }
});

app.delete('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id;
  profiles = profiles.filter(p => p.id !== profileId);
  saveProfiles();
  
  // Clean up mods associated with deleted profile
  modsList = modsList.filter(m => m.profile_id !== profileId);
  saveMods();
  
  res.json({ success: true });
});

app.post('/api/auth/ely', async (req, res) => {
  try {
    const { username, password } = req.body;
    const response = await fetch('https://authserver.ely.by/auth/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        clientToken: Date.now().toString(), // Simple client token
        requestUser: true
      })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Ely.by and Mojang Skin Proxy to bypass CORS on Canvas
app.get('/api/skin', async (req, res) => {
  try {
    const username = req.query.username as string;
    const uuid = req.query.uuid as string;
    
    if (!username && !uuid) {
      return res.status(400).send('Missing username or uuid');
    }

    let response: any = null;
    let success = false;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
    
    // 1. Try to fetch from skinsystem.ely.by by username
    if (username && username.toLowerCase() !== 'steve' && username.toLowerCase() !== 'alex') {
      try {
        const url = `https://skinsystem.ely.by/skins/${username}.png`;
        response = await fetch(url, { headers: { 'User-Agent': userAgent } });
        if (response.ok) {
          success = true;
        } else {
          // Try skins.ely.by fallback
          const urlFallback = `https://skins.ely.by/skins/${username}.png`;
          const resFallback = await fetch(urlFallback, { headers: { 'User-Agent': userAgent } });
          if (resFallback.ok) {
            response = resFallback;
            success = true;
          }
        }
      } catch (e) {
        console.error('Failed fetching from ely.by by username:', e);
      }
    }

    // 2. If not successful, and uuid is provided, try by uuid
    if (!success && uuid) {
      try {
        const url = `https://skinsystem.ely.by/skins/${uuid}.png`;
        response = await fetch(url, { headers: { 'User-Agent': userAgent } });
        if (response.ok) {
          success = true;
        } else {
          // Try skins.ely.by fallback by uuid
          const urlFallback = `https://skins.ely.by/skins/${uuid}.png`;
          const resFallback = await fetch(urlFallback, { headers: { 'User-Agent': userAgent } });
          if (resFallback.ok) {
            response = resFallback;
            success = true;
          }
        }
      } catch (e) {
        console.error('Failed fetching from ely.by by uuid:', e);
      }
    }

    // 3. Fallback to minotar.net (username or Steve)
    if (!success) {
      try {
        const nameParam = username || 'Steve';
        const url = `https://minotar.net/skin/${nameParam}`;
        response = await fetch(url, { headers: { 'User-Agent': userAgent } });
        if (response.ok) {
          success = true;
        }
      } catch (e) {
        console.error('Failed fetching from minotar:', e);
      }
    }

    // 4. Ultimate server-side fallback if everything else failed
    if (!success) {
      try {
        const url = `https://minotar.net/skin/Steve`;
        response = await fetch(url, { headers: { 'User-Agent': userAgent } });
        if (response.ok) {
          success = true;
        }
      } catch (e) {
        console.error('Failed fetching ultimate Steve fallback:', e);
      }
    }

    if (success && response) {
      const contentType = response.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache 30 mins
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    res.status(404).send('Skin not found');
  } catch (error) {
    console.error('Skin proxy general error:', error);
    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
      const fallbackResponse = await fetch('https://minotar.net/skin/Steve', { headers: { 'User-Agent': userAgent } });
      if (fallbackResponse.ok) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        const arrayBuffer = await fallbackResponse.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (e) {
      console.error('Ultimate catch block fetch failed:', e);
    }
    res.status(500).send('Internal Server Error');
  }
});


// Ely.by OAuth2 Start Endpoint
app.get('/api/auth/ely/url', (req, res) => {
  try {
    const customClientId = req.query.client_id;
    const customClientSecret = req.query.client_secret;
    const origin = req.query.origin || `${req.protocol}://${req.get('host')}`;
    
    const clientId = customClientId || process.env.ELY_CLIENT_ID || 'layle-launcher3';
    const clientSecret = customClientSecret || process.env.ELY_CLIENT_SECRET || '21nUJW32uKxbQrLCx5qTWL3_Fk11ehEBw3S_xnNfuOFRHfygzerpbhp5T7uGLyKc';

    const redirectUri = `${origin}/api/auth/ely/callback`;
    
    // Package credentials into state parameter to keep this server completely stateless and support localhost/multiple hosts dynamically
    const stateObj = {
      clientId: clientId,
      clientSecret: clientSecret || '',
      origin: origin
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId as string,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'account_info minecraft_yggdrasil',
      state: state
    });

    const authUrl = `https://oauth.ely.by/oauth/v2/auth?${params.toString()}`;
    res.json({ url: authUrl });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Ely.by OAuth2 Callback Endpoint
const handleElyCallback = async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send(`
      <html>
        <head>
          <title>Ошибка авторизации</title>
          <style>
            body {
              background-color: #09090b;
              color: #e4e4e7;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .container {
              background-color: #18181b;
              border: 1px solid #ef4444;
              padding: 40px;
              border-radius: 24px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
              max-width: 400px;
            }
            .error-icon {
              color: #ef4444;
              font-size: 3.5rem;
              margin-bottom: 20px;
            }
            h2 { margin: 0 0 12px 0; font-size: 1.5rem; font-weight: 700; color: #f87171; }
            p { margin: 0 0 24px 0; font-size: 0.9rem; color: #a1a1aa; line-height: 1.5; }
            button {
              background: #3f3f46;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 12px;
              cursor: pointer;
              font-size: 0.85rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              transition: all 0.2s;
            }
            button:hover {
              background: #52525b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⚠️</div>
            <h2>Неверный запрос</h2>
            <p>Не передан код авторизации или состояние сессии. Пожалуйста, попробуйте войти заново из лаунчера.</p>
            <button onclick="window.close()">Закрыть окно</button>
          </div>
        </body>
      </html>
    `);
  }

  try {
    // Decode stateless configurations
    const stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
    const { clientId, clientSecret, origin } = stateObj;
    
    const redirectUri = `${origin}/api/auth/ely/callback`;

    // Exchange Code for Access Token
    const tokenRes = await fetch('https://oauth.ely.by/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      }).toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Не удалось получить токен доступа на Ely.by.');
    }

    const accessToken = tokenData.access_token;

    // Fetch account profile info
    const userRes = await fetch('https://account.ely.by/api/account/v1/info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const userData = await userRes.json();
    if (!userRes.ok) {
      throw new Error('Не удалось получить информацию о пользователе с Ely.by.');
    }

    // Build standard launcher account profile
    const profile = {
      name: userData.username,
      id: userData.uuid.replace(/-/g, ''), // Clean UUID with no dashes
      accessToken: accessToken
    };

    res.send(`
      <html>
        <head>
          <title>Авторизация Ely.by</title>
          <style>
            body {
              background-color: #09090b;
              color: #e4e4e7;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              padding: 24px;
            }
            .container {
              background-color: #18181b;
              border: 1px solid #27272a;
              padding: 40px;
              border-radius: 28px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
              max-width: 420px;
              width: 100%;
              box-sizing: border-box;
            }
            .spinner {
              border: 3px solid #27272a;
              border-top: 3px solid #10b981;
              border-radius: 50%;
              width: 48px;
              height: 48px;
              animation: spin 1s linear infinite;
              margin: 0 auto 24px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h2 { margin: 0 0 12px 0; font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
            p { margin: 0; font-size: 0.95rem; color: #a1a1aa; line-height: 1.6; font-weight: 500; }
            button {
              display: none;
              margin-top: 28px;
              background: #10b981;
              color: #000;
              border: none;
              padding: 14px 28px;
              border-radius: 14px;
              cursor: pointer;
              font-size: 0.8rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              transition: all 0.2s;
              box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);
            }
            button:hover {
              background: #34d399;
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner" id="spinner-icon"></div>
            <h2>Вход выполнен!</h2>
            <p id="status-text">Передаём данные авторизации в Layle Launcher...</p>
            <button id="close-btn" onclick="window.close()">Закрыть окно</button>
          </div>
          <script>
            const profile = ${JSON.stringify(profile)};
            let success = false;
            
            // 1. Force write to localStorage as a super stable fallback for iframe / popups / Electron
            try {
              localStorage.setItem('ely_session_pending', JSON.stringify(profile));
              localStorage.setItem('ely_session_pending_time', Date.now().toString());
            } catch (e) {
              console.error('Failed to write to localStorage:', e);
            }

            // 2. Try posting a message back to the launcher window
            if (window.opener) {
              try {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  profile: profile 
                }, '*');
                success = true;
              } catch (err) {
                console.error('Failed to send message:', err);
              }
            }

            const statusEl = document.getElementById('status-text');
            const spinnerEl = document.getElementById('spinner-icon');
            const btnEl = document.getElementById('close-btn');

            if (success) {
              statusEl.textContent = 'Данные успешно отправлены. Окно закроется автоматически через мгновение...';
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              // Show friendly instruction in case window.opener is broken or blocked
              if (spinnerEl) spinnerEl.style.display = 'none';
              statusEl.innerHTML = 'Вход прошёл отлично! Авторизация сохранена во внутренней памяти браузера.<br/><br/>Пожалуйста, <strong>закройте эту вкладку</strong> и вернитесь к лаунчеру — он автоматически обнаружит ваш вход!';
              if (btnEl) btnEl.style.display = 'inline-block';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <html>
        <head>
          <title>Ошибка авторизации</title>
          <style>
            body {
              background-color: #09090b;
              color: #e4e4e7;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .container {
              background-color: #18181b;
              border: 1px solid rgba(239, 68, 68, 0.2);
              padding: 40px;
              border-radius: 24px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
              max-width: 400px;
            }
            .error-icon {
              color: #ef4444;
              font-size: 3.5rem;
              margin-bottom: 20px;
            }
            h2 { margin: 0 0 12px 0; font-size: 1.5rem; font-weight: 700; color: #f87171; }
            p { margin: 0 0 24px 0; font-size: 0.9rem; color: #a1a1aa; line-height: 1.5; }
            button {
              background: #ef4444;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 12px;
              cursor: pointer;
              font-size: 0.85rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              transition: all 0.2s;
            }
            button:hover {
              background: #dc2626;
              transform: scale(1.02);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⚠️</div>
            <h2>Не удалось авторизоваться</h2>
            <p>${err.message || 'Ошибка во время обмена кодами или получения профиля Ely.by.'}</p>
            <button onclick="window.close()">Закрыть окно</button>
          </div>
        </body>
      </html>
    `);
  }
};

app.get('/api/auth/ely/callback', handleElyCallback);
app.get('/api/auth/ely/callback/', handleElyCallback);

app.post('/api/mods/install', async (req, res) => {
  const { projectId, versionId, folderPath, profileId } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const projectRes = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
    if (!projectRes.ok) {
      throw new Error(`Failed to fetch project details from Modrinth: ${projectRes.statusText}`);
    }
    const project = await projectRes.json();

    const modId = project.slug || project.id;
    const name = project.slug || project.id;
    const displayName = project.title || project.name;
    const description = project.description || '';
    const descriptionRu = await translateText(description);

    const categories = project.categories || [];
    const categoriesRu = categories.map((c: string) => TRANSLATIONS[c.toLowerCase()] || c);

    const clientSide = project.client_side || 'optional';
    const serverSide = project.server_side || 'optional';
    let environment = '*';
    if (clientSide === 'required' && serverSide === 'unsupported') {
      environment = 'client';
    } else if (serverSide === 'required' && clientSide === 'unsupported') {
      environment = 'server';
    }

    
    let depends: string[] = [];
    let dependenciesSuggested: any[] = [];
    let downloadUrl = '';
    let fileName = `${modId}.jar`;

    try {
      const versionsRes = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version`);
      if (versionsRes.ok) {
        const versions = await versionsRes.json();
        if (versions.length > 0) {
          const latestVersion = versions[0];
          
          if (latestVersion.files && latestVersion.files.length > 0) {
            downloadUrl = latestVersion.files[0].url;
            fileName = latestVersion.files[0].filename;
          }

          if (latestVersion.dependencies && Array.isArray(latestVersion.dependencies)) {
            const requiredDeps = latestVersion.dependencies.filter((d: any) => d.dependency_type === 'required' && d.project_id);
            for (const dep of requiredDeps) {
              try {
                const depProjectRes = await fetch(`https://api.modrinth.com/v2/project/${dep.project_id}`);
                if (depProjectRes.ok) {
                  const depProj = await depProjectRes.json();
                  depends.push(depProj.slug || depProj.id);
                  dependenciesSuggested.push({
                    projectId: dep.project_id,
                    slug: depProj.slug,
                    title: depProj.title || depProj.name
                  });
                }
              } catch (e) {
                console.error('Error fetching dependency details:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dependencies from Modrinth:', err);
    }

    let targetPath = `/mock/mods/${profileId || '1'}/${modId}.jar`;
    const profile = profiles.find(p => p.id === profileId);
    let destDir = folderPath;
    if (profile && profile.mod_path) destDir = profile.mod_path;
    
    if (destDir && downloadUrl) {
      const absDir = path.isAbsolute(destDir) ? destDir : path.resolve(process.cwd(), destDir);
      if (!fs.existsSync(absDir)) {
        fs.mkdirSync(absDir, { recursive: true });
      }
      targetPath = path.join(absDir, fileName);
      
      const fileRes = await fetch(downloadUrl);
      if (fileRes.ok && fileRes.body) {
        const arrayBuffer = await fileRes.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
      }
    }

    const mod: any = {
      path: targetPath,
      name,
      mod_id: modId,
      display_name: displayName,
      description,
      description_ru: descriptionRu,
      environment,
      depends,
      is_worldgen: categories.some((c: string) => ["worldgen", "biomes", "terrain", "dimensions", "structures"].includes(c.toLowerCase())),
      is_client: environment === 'client',
      is_server: environment === 'server',
      is_heavy: categories.some((c: string) => ["utility", "technology"].includes(c.toLowerCase())) || (project.downloads && project.downloads < 100000),
      is_library: categories.some((c: string) => ["library", "api"].includes(c.toLowerCase())),
      is_optimization: categories.some((c: string) => ["optimization", "performance"].includes(c.toLowerCase())),
      warnings: [],
      icon_url: project.icon_url || '',
      project_url: `https://modrinth.com/mod/${project.slug || project.id}`,
      categories,
      categories_ru: categoriesRu,
      downloads: project.downloads || 0,
      api_source: 'Modrinth',
      profile_id: profileId || '1',
      enabled: true
    };

    generateWarningsRu(mod);

    // Filter duplicates only within the same profile
    const targetProfileId = profileId || '1';
    modsList = modsList.filter(m => !(m.mod_id === modId && m.profile_id === targetProfileId));
    modsList.push(mod);
    saveMods();

    res.json({ 
      success: true, 
      message: `Мод "${displayName}" успешно установлен.`, 
      mod,
      dependenciesSuggested
    });
  } catch (error) {
    console.error('Error installing mod:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/mods/delete', (req, res) => {
  const { modId, profileId, filePath } = req.body;
  if (!modId) {
    return res.status(400).json({ error: 'Missing modId' });
  }
  
  // Physically delete the jar file if filePath is passed and exists
  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Failed to physically delete mod file:', e);
    }
  }
  
  if (profileId) {
    modsList = modsList.filter(m => !(m.mod_id === modId && m.profile_id === profileId));
  } else {
    modsList = modsList.filter(m => m.mod_id !== modId && m.name !== modId);
  }
  
  saveMods();
  res.json({ success: true, message: 'Мод успешно удален.' });
});

app.post('/api/mods/scan', async (req, res) => {
  let { folderPath, profileId } = req.body;
  
  if (profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (profile && profile.mod_path) {
      folderPath = profile.mod_path;
    }
  }

  if (folderPath && folderPath.trim() !== '') {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      
      const files = fs.readdirSync(folderPath);
      const jarFiles = files.filter(f => f.endsWith('.jar')).map(f => path.join(folderPath, f));
      
      if (jarFiles.length === 0) {
        // Clear cached mods from list if folder is empty
        if (profileId) {
          modsList = modsList.filter(m => m.profile_id !== profileId);
          saveMods();
        }
        const filtered = modsList.filter(m => m.profile_id === profileId);
        return res.json(filtered);
      }

      const parsedMods = await Promise.all(jarFiles.map(async (f) => {
        const parsed = await parseModJar(f);
        // Find if we already have this mod in modsList for this profile
        const existing = modsList.find(m => m.path === f && m.profile_id === profileId);
        
        const mod: any = {
          ...parsed,
          profile_id: profileId,
          enabled: existing ? existing.enabled : true,
        };
        return mod;
      }));

      // Update modsList for this profile
      if (profileId) {
        modsList = modsList.filter(m => m.profile_id !== profileId);
        modsList.push(...parsedMods);
        saveMods();
      }

      res.json(parsedMods);
    } catch (error) {
      const filtered = modsList.filter(m => m.profile_id === profileId);
      return res.json(filtered);
    }
  } else {
    if (profileId) {
      const filtered = modsList.filter(m => m.profile_id === profileId);
      return res.json(filtered);
    }
    return res.json(modsList);
  }
});

app.post('/api/utils/open-folder', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' });
  }

  const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.resolve(process.cwd(), folderPath);

  if (!fs.existsSync(absolutePath)) {
    try {
      fs.mkdirSync(absolutePath, { recursive: true });
    } catch (e) {
      console.error('Failed to create directory to open:', e);
    }
  }

  let command = '';
  switch (process.platform) {
    case 'win32':
      command = `explorer.exe "${absolutePath}"`;
      break;
    case 'darwin':
      command = `open "${absolutePath}"`;
      break;
    default:
      command = `xdg-open "${absolutePath}"`;
      break;
  }

  exec(command, (err) => {
    if (err) {
      // In cloud container, xdg-open might fail, we just ignore it for the backend
      return res.status(200).json({ success: false, message: 'Opening folders is not supported in the web container environment.' });
    }
    return res.json({ success: true });
  });
});

app.post('/api/mods/toggle', (req, res) => {
  const { modId, profileId, enabled } = req.body;
  if (!modId || !profileId) {
    return res.status(400).json({ error: 'Missing modId or profileId' });
  }

  const mod = modsList.find(m => m.mod_id === modId && m.profile_id === profileId);
  if (mod) {
    mod.enabled = enabled;
    
    // Physically rename the file on disk if it exists
    if (fs.existsSync(mod.path)) {
      let newPath = mod.path;
      if (!enabled && mod.path.endsWith('.jar')) {
        newPath = mod.path + '.disabled';
        try {
          fs.renameSync(mod.path, newPath);
          mod.path = newPath;
        } catch (e) {
          console.error('Failed to rename file to disabled:', e);
        }
      } else if (enabled && mod.path.endsWith('.jar.disabled')) {
        newPath = mod.path.slice(0, -9); // remove '.disabled'
        try {
          fs.renameSync(mod.path, newPath);
          mod.path = newPath;
        } catch (e) {
          console.error('Failed to rename file to enabled:', e);
        }
      }
    } else {
      // Fallback for mock path
      if (enabled) {
        mod.path = `/mock/mods/${profileId}/${modId}.jar`;
      } else {
        mod.path = `/mock/mods/${profileId}/.disabled/${modId}.jar`;
      }
    }
    
    saveMods();
    res.json({ success: true, message: enabled ? 'Мод включен.' : 'Мод выключен.', mod });
  } else {
    res.status(404).json({ error: 'Mod not found' });
  }
});

app.post('/api/mods/analyze', async (req, res) => {
  const { mods } = req.body;
  if (!Array.isArray(mods)) return res.status(400).json({ error: 'Invalid mods array' });

  // Analyze in parallel with limit
  const results = await Promise.all(mods.map(async (mod) => {
    await fetchModrinthData(mod);
    if (mod.description) {
      mod.description_ru = await translateText(mod.description);
    }
    generateWarningsRu(mod);
    return mod;
  }));

  res.json(results);
});

app.post('/api/mods/update', async (req, res) => {
  // Simulate an update process
  const { autoUpdate } = req.body;
  
  // Wait a bit to simulate network
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  res.json({ success: true, updatedCount: 3, message: 'Моды успешно обновлены.' });
});

app.get('/api/minecraft/versions', async (req, res) => {
  try {
    const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

app.get('/api/minecraft/check-installed', async (req, res) => {
  try {
    const { minecraftPath, version, loader } = req.query;
    if (!minecraftPath || !version) {
      return res.json({ installed: false });
    }
    const mcPath = path.isAbsolute(String(minecraftPath)) ? String(minecraftPath) : path.resolve(process.cwd(), String(minecraftPath));
    
    let versionFolder = String(version);
    if (loader === 'Fabric') {
       versionFolder = `fabric-loader-0.15.7-${version}`; // Assuming 0.15.7 based on launch route
    } else if (loader === 'Forge') {
       // Forge might have a different folder name, simplistic check for now
       // Often something like <version>-forge-<forge-version>
    }
    
    const jsonPath = path.join(mcPath, 'versions', versionFolder, `${versionFolder}.json`);
    const installed = fs.existsSync(jsonPath);
    
    res.json({ installed });
  } catch (err) {
    res.json({ installed: false });
  }
});

app.get('/api/java/find', async (req, res) => {
  try {
    const { findJavaPaths } = await import('./src/lib/findJava.js');
    const paths = findJavaPaths();
    res.json({ success: true, paths });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/minecraft/launch', async (req, res) => {
  const { 
    profileId, 
    ram, 
    javaPath, 
    minecraftPath, 
    resWidth, 
    resHeight, 
    fullscreen, 
    jvmArgs,
    authName,
    authUuid,
    authAccess
  } = req.query;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const activeProfile: any = profiles.find(p => p.id === profileId) || profiles[0] || {
    id: profileId ? String(profileId) : '1',
    name: 'Сборка Fabric 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Fabric',
    mod_path: './profiles/1/.minecraft/mods',
    description: ''
  };

  const selectedRam = ram || '4096';
  const baseDir = getStorageDir(); // Or process.cwd() ? Wait! It should probably go in the APPDATA folder now!
  const selectedMinecraft = minecraftPath ? String(minecraftPath) : `./profiles/${activeProfile.id}/.minecraft`;
  const minecraftPathAbsolute = path.isAbsolute(selectedMinecraft) ? selectedMinecraft : path.resolve(process.cwd(), selectedMinecraft);
  const jvmArguments = jvmArgs ? String(jvmArgs).split(' ') : [];

  const launcher = new Client();
  
  let authData;
  if (authName && authUuid && authAccess) {
      authData = {
          access_token: String(authAccess),
          client_token: String(authUuid), // or any consistent string
          uuid: String(authUuid),
          name: String(authName),
          user_properties: "{}"
      };
  } else {
      authData = await Authenticator.getAuth("LaylePlayer");
  }
  
  // Always use global root for assets and libraries to prevent redownloading
  const globalRoot = path.resolve(process.cwd(), './.minecraft');
  const isolatedDir = path.resolve(process.cwd(), `./profiles/${activeProfile.id}/.minecraft`);
  
  if (!fs.existsSync(isolatedDir)) {
    fs.mkdirSync(isolatedDir, { recursive: true });
  }

  let opts: any = {
    clientPackage: null,
    authorization: authData,
    root: globalRoot,
    overrides: {
      gameDirectory: isolatedDir,
    },
    version: {
        number: activeProfile.game_version,
        type: "release"
    },
    memory: {
        max: `${selectedRam}M`,
        min: "1024M"
    },
    window: {
        width: parseInt(String(resWidth) || '1280', 10),
        height: parseInt(String(resHeight) || '720', 10),
        fullscreen: fullscreen === '1'
    }
  };

  if (activeProfile.mod_loader === 'Fabric') {
      const loaderVer = '0.15.7'; // Or fetch latest
      const customVersionName = `fabric-loader-${loaderVer}-${activeProfile.game_version}`;
      opts.version.custom = customVersionName;
      
      const versionsDir = path.join(minecraftPathAbsolute, 'versions', customVersionName);
      if (!fs.existsSync(versionsDir)) {
          fs.mkdirSync(versionsDir, { recursive: true });
      }
      const jsonPath = path.join(versionsDir, `${customVersionName}.json`);
      if (!fs.existsSync(jsonPath)) {
          sendEvent('log', { message: 'Скачивание профиля Fabric...', progress: 5 });
          try {
              const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${activeProfile.game_version}/${loaderVer}/profile/json`);
              if (res.ok) {
                  const data = await res.text();
                  fs.writeFileSync(jsonPath, data);
                  sendEvent('log', { message: 'Профиль Fabric успешно загружен.', progress: 10 });
              }
          } catch (e) {
              console.error('Failed to download Fabric profile', e);
          }
      }
  } else if (activeProfile.mod_loader === 'Forge') {
      opts.forge = minecraftPathAbsolute; // Depending on how MCLC handles it, normally it downloads if needed.
  }

  if (javaPath && javaPath !== '') {
    opts.javaPath = String(javaPath);
  } else {
    try {
      const { findJavaPaths } = await import('./src/lib/findJava.js');
      const found = findJavaPaths();
      if (found.length > 0) {
        opts.javaPath = found[0];
        sendEvent('log', { message: `Автоматически найдена Java: ${found[0]}`, progress: 10 });
      }
    } catch (e) {}
  }

  if (jvmArguments.length > 0) {
    opts.customArgs = jvmArguments;
  }

  launcher.on('debug', (e: string) => sendEvent('log', { message: e, progress: 50 }));
  launcher.on('data', (e: string) => sendEvent('log', { message: e, progress: 80 }));
  launcher.on('download-status', (e: any) => {
    const progress = Math.min(100, Math.round((e.current / e.total) * 100));
    sendEvent('log', { message: `Загрузка ${e.name}...`, progress });
  });
  launcher.on('progress', (e: any) => {
    sendEvent('log', { message: `Прогресс: ${e.task} (${e.total} всего)`, progress: 60 });
  });

  try {
    sendEvent('log', { message: `Начинается установка и запуск ${activeProfile.game_version}...`, progress: 10 });
    
    // Will throw if errors out, or return ChildProcess when fully started
    const proc = await launcher.launch(opts);
    activeProcess = proc;
    
    const startTime = Date.now();
    if (!activeProfile.stats) {
      activeProfile.stats = { totalPlayTimeMs: 0, lastLaunchTime: 0, launchCount: 0 };
    }
    activeProfile.stats.launchCount++;
    activeProfile.stats.lastLaunchTime = startTime;
    saveProfiles();
    
    if (proc === null) {
      sendEvent('error', 'Не удалось запустить Minecraft. Убедитесь, что Java установлена и путь указан верно (в настройках лаунчера).');
      res.end();
      return;
    }

    sendEvent('log', { message: 'Игровой процесс успешно запущен!', progress: 100 });
    sendEvent('done', { message: 'Minecraft запущен!' });

    proc.on('close', (code: number) => {
       activeProcess = null;
       sendEvent('log', { message: `Процесс завершился с кодом ${code}`, progress: 100 });
       
       let crashMessage = null;
       let outOfMemory = false;
       
       if (code !== 0) {
         // Check crash reports
         const crashDir = path.join(isolatedDir, 'crash-reports');
         if (fs.existsSync(crashDir)) {
           const files = fs.readdirSync(crashDir).filter(f => f.endsWith('.txt')).sort();
           if (files.length > 0) {
             const crashPath = path.join(crashDir, files[files.length - 1]);
             const stats = fs.statSync(crashPath);
             // If crash report is newer than process start
             if (Date.now() - stats.mtimeMs < 60000) {
               const crashContent = fs.readFileSync(crashPath, 'utf8');
               if (crashContent.includes('java.lang.OutOfMemoryError')) {
                 outOfMemory = true;
                 crashMessage = 'Недостаточно оперативной памяти (OutOfMemoryError). Увеличьте RAM в настройках профиля.';
               } else {
                 crashMessage = 'Произошла ошибка. См. краш-репорт в ' + crashPath;
               }
             }
           }
         }
         
         if (!crashMessage) {
           // Maybe we can check latest.log for out of memory
           const logPath = path.join(isolatedDir, 'logs', 'latest.log');
           if (fs.existsSync(logPath)) {
             const logContent = fs.readFileSync(logPath, 'utf8');
             if (logContent.includes('java.lang.OutOfMemoryError')) {
               outOfMemory = true;
               crashMessage = 'Недостаточно оперативной памяти (OutOfMemoryError). Увеличьте RAM в настройках профиля.';
             }
           }
         }
       }
       
       if (activeProfile.stats) {
         activeProfile.stats.totalPlayTimeMs += (Date.now() - startTime);
         saveProfiles();
       }
       sendEvent('game_closed', { code, crashMessage, outOfMemory });
       res.end();
    });
    
  } catch (error: any) {
    console.error('Launch Error:', error);
    sendEvent('error', error.message || String(error));
    res.end();
  }

  req.on('close', () => {
    // If the client disconnects before finishing
  });
});



// ==================== LOGS & SCREENSHOTS ====================

app.get('/api/minecraft/logs', (req, res) => {
  const { profileId } = req.query;
  const profile = profiles.find(p => p.id === profileId);
  const profileDir = path.resolve(process.cwd(), `./profiles/${profileId || '1'}/.minecraft`);
  
  const logPath = path.join(profileDir, 'logs', 'latest.log');
  
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    res.json({ content });
  } else {
    // Check crash reports?
    const crashDir = path.join(profileDir, 'crash-reports');
    if (fs.existsSync(crashDir)) {
      const files = fs.readdirSync(crashDir).filter(f => f.endsWith('.txt')).sort();
      if (files.length > 0) {
        const crashPath = path.join(crashDir, files[files.length - 1]);
        const crashContent = fs.readFileSync(crashPath, 'utf8');
        return res.json({ content: `Лог latest.log не найден.\nПоследний краш-репорт:\n\n${crashContent}` });
      }
    }
    res.json({ content: 'Лог-файл не найден. Запустите игру хотя бы один раз.' });
  }
});

app.post('/api/minecraft/open-logs-folder', async (req, res) => {
  const { profileId } = req.query;
  const profileDir = path.resolve(process.cwd(), `./profiles/${profileId || '1'}/.minecraft`);
  const logsDir = path.join(profileDir, 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Use Electron shell.openPath if available, otherwise just try to open it somehow
  try {
    const { shell } = require('electron');
    if (shell) await shell.openPath(logsDir);
  } catch (e) {
    // maybe it's just web?
  }
  res.json({ success: true });
});

app.get('/api/minecraft/screenshots', (req, res) => {
  const { profileId, globalPath } = req.query;
  // Minecraft usually saves screenshots in isolated dir or global if not isolated.
  const profileDir = path.resolve(process.cwd(), `./profiles/${profileId || '1'}/.minecraft`);
  const screenshotsDir = path.join(profileDir, 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    return res.json({ screenshots: [] });
  }
  
  try {
    const files = fs.readdirSync(screenshotsDir)
      .filter(f => f.endsWith('.png'))
      .map(f => {
        const filePath = path.join(screenshotsDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          date: stats.mtimeMs,
          // We can read it and send as base64 to display in UI
          url: 'data:image/png;base64,' + fs.readFileSync(filePath, 'base64')
        };
      })
      .sort((a, b) => b.date - a.date);
      
    res.json({ screenshots: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/minecraft/screenshots/delete', (req, res) => {
  const { paths } = req.body;
  if (Array.isArray(paths)) {
    for (const p of paths) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
  }
  res.json({ success: true });
});

app.post('/api/minecraft/open-screenshots-folder', async (req, res) => {
  const { profileId } = req.query;
  const profileDir = path.resolve(process.cwd(), `./profiles/${profileId || '1'}/.minecraft`);
  const dir = path.join(profileDir, 'screenshots');
  
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    const { shell } = require('electron');
    if (shell) await shell.openPath(dir);
  } catch (e) {}
  res.json({ success: true });
});

app.post('/api/minecraft/open-game-folder', async (req, res) => {
  const { profileId } = req.query;
  const profileDir = path.resolve(process.cwd(), `./profiles/${profileId || '1'}/.minecraft`);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
  try {
    const { shell } = require('electron');
    if (shell) await shell.openPath(profileDir);
  } catch (e) {}
  res.json({ success: true });
});

// ============================================================

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

app.get('/api/system/check-update', async (req, res) => {
  try {
    const currentVersion = require('./package.json').version || '1.0.0';
    let repo = process.env.GITHUB_REPO || '';
    if (repo) {
      repo = repo.trim().replace(/\.git$/, '');
      if (repo.includes('github.com/')) {
        const parts = repo.split('github.com/');
        if (parts.length > 1) repo = parts[1];
      } else if (repo.includes('github.com:')) {
        const parts = repo.split('github.com:');
        if (parts.length > 1) repo = parts[1];
      }
    }
    
    if (!repo) {
       return res.json({ updateAvailable: false });
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { 'User-Agent': 'Minecraft-Launcher' }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ success: false, error: 'Релизы в репозитории не найдены или репозиторий приватный/не существует (404)' });
      }
      return res.json({ success: false, error: `GitHub API status ${response.status}` });
    }

    const data = await response.json();
    const latestVersion = data.tag_name.replace(/^v/, ''); // e.g. v1.0.1 -> 1.0.1
    
    // Simple version compare
    const isNewerVersion = (latest: string, current: string) => {
      const lParts = latest.split('.').map(Number);
      const cParts = current.split('.').map(Number);
      for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
        const l = lParts[i] || 0;
        const c = cParts[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
      }
      return false;
    };

    if (latestVersion !== currentVersion && isNewerVersion(latestVersion, currentVersion)) {
      res.json({
        updateAvailable: true,
        version: data.tag_name,
        url: data.html_url,
        notes: data.body
      });
    } else {
      res.json({ updateAvailable: false });
    }
  } catch (error) {
    res.json({ updateAvailable: false });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
