import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { parseModJar, fetchModrinthData, translateText, generateWarningsRu } from './src/lib/modParser.js';
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
  profiles = profiles.filter(p => p.id !== req.params.id);
  saveProfiles();
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
  const { projectId, versionId, folderPath } = req.body;
  
  if (!projectId || !versionId) {
    return res.status(400).json({ error: 'Missing projectId or versionId' });
  }

  // Simulate download delay
  setTimeout(() => {
    res.json({ success: true, message: 'Мод успешно скачан и установлен в папку.' });
  }, 1500);
});

app.post('/api/mods/scan', async (req, res) => {
  let { folderPath } = req.body;
  
  if (!folderPath || folderPath.trim() === '') {
    // Return mock data for preview environment if no path provided
    return res.json([
      {
        path: '/mock/mods/sodium-fabric-mc1.20.1.jar',
        name: 'sodium-fabric-mc1.20.1',
        mod_id: 'sodium',
        display_name: 'Sodium',
        description: 'Modern rendering engine and client-side optimization mod for Minecraft.',
        description_ru: 'Современный движок рендеринга и мод для оптимизации клиента Minecraft.',
        environment: 'client',
        depends: ['fabric-api'],
        is_worldgen: false,
        is_client: true,
        is_server: false,
        is_heavy: false,
        is_library: false,
        is_optimization: true,
        warnings: [
          { type: "info", title: "💻 Только для клиента", desc: "Работает исключительно на стороне игрока. На сервер его ставить бессмысленно — он просто не загрузится или будет висеть мёртвым грузом.", tip: "💡 Совет: Клиентские моды (графика, звук, интерфейс) не работают на сервере." },
          { type: "success", title: "⚡ Оптимизация", desc: "Мод для улучшения производительности. Рекомендуется оставить.", tip: "💡 Совет: Оптимизационные моды почти никогда не конфликтуют." }
        ],
        icon_url: 'https://cdn.modrinth.com/data/AANobbMI/d6fdfa8fb485121401f80be0bd7e5e347e3a1f10.png',
        project_url: 'https://modrinth.com/mod/sodium',
        categories: ['optimization', 'client'],
        categories_ru: ['Оптимизация', 'Клиент'],
        downloads: 25000000,
        api_source: 'Modrinth'
      },
      {
        path: '/mock/mods/terralith.jar',
        name: 'terralith',
        mod_id: 'terralith',
        display_name: 'Terralith',
        description: 'Terralith adds 100+ new biomes and vastly overhauls world generation.',
        description_ru: 'Terralith добавляет более 100 новых биомов и значительно перерабатывает генерацию мира.',
        environment: '*',
        depends: [],
        is_worldgen: true,
        is_client: false,
        is_server: false,
        is_heavy: true,
        is_library: false,
        is_optimization: false,
        warnings: [
          { type: "danger", title: "⚠ Изменяет генерацию мира", desc: "Добавляет новые биомы, структуры или полностью меняет ландшафт. Такой мод должен быть установлен и на клиенте, и на сервере.", tip: "💡 Совет: Если мод меняет генерацию — он нужен везде. Удаляйте только если уверены, что он не используется." },
          { type: "warning", title: "🔥 Требовательный к ресурсам", desc: "Этот мод активно нагружает процессор или видеокарту. На слабых компьютерах может вызывать просадки FPS.", tip: "💡 Совет: Проверьте FPS с этим модом и без него." }
        ],
        icon_url: 'https://cdn.modrinth.com/data/8BmcQJ2H/97e7fdf13a5edcc5e56e40af838848db9a8e0e67.png',
        project_url: 'https://modrinth.com/mod/terralith',
        categories: ['worldgen', 'biomes'],
        categories_ru: ['Генерация мира', 'Биомы'],
        downloads: 12000000,
        api_source: 'Modrinth'
      },
      {
        path: '/mock/mods/fabric-api.jar',
        name: 'fabric-api',
        mod_id: 'fabric-api',
        display_name: 'Fabric API',
        description: 'Core API for Fabric mods.',
        description_ru: 'Основной API для модов Fabric.',
        environment: '*',
        depends: [],
        is_worldgen: false,
        is_client: false,
        is_server: false,
        is_heavy: false,
        is_library: true,
        is_optimization: false,
        warnings: [
          { type: "info", title: "📚 Библиотека (зависимость)", desc: "Это не самостоятельный мод, а библиотека, необходимая для работы других модов.", tip: "💡 Совет: Посмотрите на зависимости — если этот мод нужен другим, не удаляйте его!" }
        ],
        icon_url: 'https://cdn.modrinth.com/data/P7dR8mSH/8f83db54497eef9f8e4e049ed4e910245053de15.png',
        project_url: 'https://modrinth.com/mod/fabric-api',
        categories: ['library', 'api'],
        categories_ru: ['Библиотека', 'API'],
        downloads: 80000000,
        api_source: 'Modrinth'
      }
    ]);
  }

  try {
    const files = fs.readdirSync(folderPath);
    const jarFiles = files.filter(f => f.endsWith('.jar')).map(f => path.join(folderPath, f));
    
    if (jarFiles.length === 0) {
      return res.status(404).json({ error: 'No .jar files found in the directory.' });
    }

    const mods = await Promise.all(jarFiles.map(f => parseModJar(f)));
    res.json(mods);
  } catch (error) {
    res.status(500).json({ error: String(error) });
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
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const steps = [
    { delay: 500, msg: 'Аутентификация...' },
    { delay: 800, msg: 'Получение манифеста версии (1.20.1)...' },
    { delay: 1000, msg: 'Проверка ресурсов (assets)...' },
    { delay: 2000, msg: 'Загрузка отсутствующих ресурсов (234/234)...' },
    { delay: 1500, msg: 'Проверка библиотек Minecraft...' },
    { delay: 1200, msg: 'Загрузка библиотек Fabric (0.15.7)...' },
    { delay: 800, msg: 'Подготовка natives...' },
    { delay: 500, msg: 'Сборка аргументов JVM...' },
    { delay: 600, msg: 'Запуск процесса Java...' }
  ];

  let totalDelay = 0;
  steps.forEach((step, index) => {
    totalDelay += step.delay;
    setTimeout(() => {
      sendEvent('log', { message: step.msg, progress: Math.round(((index + 1) / steps.length) * 100) });
      if (index === steps.length - 1) {
        setTimeout(() => {
          sendEvent('done', { message: 'Minecraft запущен!' });
          res.end();
        }, 1500);
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
