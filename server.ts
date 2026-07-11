import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { parseModJar, fetchModrinthData, translateText, generateWarningsRu } from './src/lib/modParser.js';
import { Profile } from './src/types.js';

const app = express();
const PORT = 3000;
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
    const response = await fetch('https://authserver.ely.by/api/authlib/authenticate', {
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
