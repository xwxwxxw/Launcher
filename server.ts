import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { parseModJar, fetchModrinthData, translateText, generateWarningsRu } from './src/lib/modParser.js';
import { TRANSLATIONS } from './src/lib/constants.js';
import { Profile } from './src/types.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.use(express.json());

// Profiles In-Memory DB (or File backed)
const PROFILES_FILE = path.join(process.cwd(), 'profiles.json');
let profiles: Profile[] = [];

if (fs.existsSync(PROFILES_FILE)) {
  try {
    profiles = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
  } catch (e) {}
}

function saveProfiles() {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

if (profiles.length === 0 || (profiles.length === 3 && profiles[0].name === 'Vanilla 1.20.1')) {
  profiles = [
    {
      id: '1',
      name: 'Сборка Fabric 1.20.1',
      description: 'Сборка на загрузчике Fabric с оптимизацией FPS (Sodium) и поддержкой современных модов.',
      game_version: '1.20.1',
      mod_loader: 'Fabric',
      mod_path: '',
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
      mod_path: '',
      created_at: Date.now() - 50000,
      is_active: false,
      ram_mb: 4096
    }
  ];
  saveProfiles();
}

// Mods In-Memory DB (or File backed)
const MODS_FILE = path.join(process.cwd(), 'mods.json');
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
  const newProfile: Profile = {
    ...req.body,
    id: Date.now().toString(),
    created_at: Date.now(),
  };
  profiles.push(newProfile);
  saveProfiles();
  res.json(newProfile);
});

app.put('/api/profiles/:id', (req, res) => {
  const index = profiles.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    profiles[index] = { ...profiles[index], ...req.body };
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
    
    // 1. Try to fetch from skinsystem.ely.by by username
    if (username && username.toLowerCase() !== 'steve' && username.toLowerCase() !== 'alex') {
      try {
        const url = `https://skinsystem.ely.by/skins/${username}.png`;
        response = await fetch(url);
        if (response.ok) {
          success = true;
        }
      } catch (e) {
        console.error('Failed fetching from ely.by by username:', e);
      }
    }

    // 2. If not successful, and uuid is provided, try by uuid
    if (!success && uuid) {
      try {
        const url = `https://skinsystem.ely.by/skins/${uuid}.png`;
        response = await fetch(url);
        if (response.ok) {
          success = true;
        }
      } catch (e) {
        console.error('Failed fetching from ely.by by uuid:', e);
      }
    }

    // 3. Fallback to minotar.net
    if (!success) {
      try {
        const nameParam = username || 'Steve';
        const url = `https://minotar.net/skin/${nameParam}`;
        response = await fetch(url);
        if (response.ok) {
          success = true;
        }
      } catch (e) {
        console.error('Failed fetching from minotar:', e);
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

    res.redirect('https://minotar.net/skin/Steve');
  } catch (error) {
    console.error('Skin proxy general error:', error);
    res.redirect('https://minotar.net/skin/Steve');
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
    try {
      const versionsRes = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version`);
      if (versionsRes.ok) {
        const versions = await versionsRes.json();
        if (versions.length > 0) {
          const latestVersion = versions[0];
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

    const mod: any = {
      path: `/mock/mods/${profileId || '1'}/${modId}.jar`,
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
        const filtered = modsList.filter(m => m.profile_id === profileId);
        return res.json(filtered);
      }

      const mods = await Promise.all(jarFiles.map(f => parseModJar(f)));
      res.json(mods);
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

app.post('/api/mods/toggle', (req, res) => {
  const { modId, profileId, enabled } = req.body;
  if (!modId || !profileId) {
    return res.status(400).json({ error: 'Missing modId or profileId' });
  }

  const mod = modsList.find(m => m.mod_id === modId && m.profile_id === profileId);
  if (mod) {
    mod.enabled = enabled;
    
    // Simulate physically moving the file to / from a hidden folder
    if (enabled) {
      mod.path = `/mock/mods/${profileId}/${modId}.jar`;
    } else {
      // Moves to hidden special .disabled subfolder
      mod.path = `/mock/mods/${profileId}/.disabled/${modId}.jar`;
    }
    
    saveMods();
    res.json({ success: true, message: enabled ? 'Мод включен.' : 'Мод выключен и перемещен в скрытую папку .disabled.', mod });
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

app.get('/api/minecraft/launch', (req, res) => {
  const { 
    profileId, 
    ram, 
    javaPath, 
    minecraftPath, 
    resWidth, 
    resHeight, 
    fullscreen, 
    jvmArgs 
  } = req.query;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const activeProfile = profiles.find(p => p.id === profileId) || profiles[0] || {
    name: 'Сборка Fabric 1.20.1',
    game_version: '1.20.1',
    mod_loader: 'Fabric'
  };

  const selectedRam = ram || '4096';
  const selectedJava = javaPath ? String(javaPath) : 'По умолчанию (автопоиск)';
  const selectedMinecraft = minecraftPath ? String(minecraftPath) : './.minecraft';
  const jvmArguments = jvmArgs ? String(jvmArgs) : '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200';
  const windowMode = fullscreen === '1' ? 'Полноэкранный режим' : `Оконный режим (${resWidth || '1280'}x${resHeight || '720'})`;

  // Filter mods that are enabled in this profile
  const profileMods = modsList.filter(m => m.profile_id === profileId && m.enabled !== false);

  const steps = [
    { delay: 400, msg: `Инициализация профиля "${activeProfile.name}"...` },
    { delay: 400, msg: `Рабочая директория игры: ${selectedMinecraft}` },
    { delay: 450, msg: `Путь к среде выполнения Java: ${selectedJava}` },
    { delay: 500, msg: `Выделение памяти: ${selectedRam} MB (-Xmx${selectedRam}M)` },
    { delay: 450, msg: `Режим экрана: ${windowMode}` },
    { delay: 600, msg: `Аргументы JVM: ${jvmArguments}` },
    { delay: 600, msg: 'Проверка системных библиотек и natives...' },
    { delay: 700, msg: `Обнаружено ${profileMods.length} активных модификаций.` }
  ];

  // Dynamically list loading of each mod
  profileMods.forEach(mod => {
    steps.push({
      delay: 300,
      msg: `Загрузка модификации [${mod.api_source || 'Local'}] ${mod.display_name || mod.name} (${mod.mod_id})...`
    });
  });

  steps.push(
    { delay: 800, msg: 'Запуск виртуальной машины Java...' },
    { delay: 600, msg: `Лог запуска: Setting user: ${req.headers['user-agent'] ? 'MinecraftPlayer' : 'LayleUser'}` },
    { delay: 400, msg: 'Лог запуска: [LWJGL] GLFW window context created.' },
    { delay: 500, msg: 'Лог запуска: [Minecraft] Loading assets, textures, sounds...' },
    { delay: 400, msg: 'Процесс игры успешно создан и запущен в фоне.' }
  );

  let totalDelay = 0;
  steps.forEach((step, index) => {
    totalDelay += step.delay;
    setTimeout(() => {
      sendEvent('log', { message: step.msg, progress: Math.min(100, Math.round(((index + 1) / steps.length) * 100)) });
      if (index === steps.length - 1) {
        setTimeout(() => {
          sendEvent('done', { message: 'Minecraft запущен!' });
          res.end();
        }, 1200);
      }
    }, totalDelay);
  });
  
  req.on('close', () => {
    // Connection closed
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
