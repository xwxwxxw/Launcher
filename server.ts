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

let pendingElyAuth: any = null;
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
function normalizeProfilePath(inputPath: string, profileId: string, customMcPath?: string): string {
  if (!inputPath) return '';
  if (inputPath.startsWith('./profiles') || inputPath.includes('/profiles/')) {
    const mcPath = customMcPath && customMcPath.trim() !== '' ? customMcPath : './.minecraft';
    const resolvedMcPath = path.isAbsolute(mcPath) ? mcPath : path.resolve(process.cwd(), mcPath);
    
    // Extract subfolders after "./profiles/${id}/"
    const regex = new RegExp(`\\.?\\/?profiles\\/${profileId}\\/?(.*)`);
    const match = inputPath.match(regex);
    const sub = match && match[1] ? match[1] : '';
    return path.join(resolvedMcPath, 'profiles', profileId, sub);
  }
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

function isPathSafe(targetPath: string, customMcPath?: string): boolean {
  if (!targetPath) return false;
  
  const resolvedTarget = path.resolve(targetPath);
  
  const allowedRoots: string[] = [
    path.resolve(DATA_DIR),
    path.resolve(process.cwd(), '.minecraft'),
    path.resolve(os.tmpdir())
  ];
  
  if (customMcPath && customMcPath.trim() !== '') {
    allowedRoots.push(path.resolve(customMcPath));
  }

  return allowedRoots.some(allowed => {
    const resolvedAllowed = path.resolve(allowed);
    return resolvedTarget === resolvedAllowed || resolvedTarget.startsWith(resolvedAllowed + path.sep);
  });
}

function extractGDriveFolderId(input: string): string {
  if (!input) return '';
  const match = input.match(/folders\/([a-zA-Z0-9-_]{25,50})/);
  if (match) return match[1];
  const matchIdParam = input.match(/[?&]id=([a-zA-Z0-9-_]{25,50})/);
  if (matchIdParam) return matchIdParam[1];
  return input.trim();
}

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
        p.mod_path = `./profiles/${p.id}/mods`;
        migrated = true;
      }
    });
    // Migrate any existing github_sync to GDSync
    const githubSyncIndex = profiles.findIndex(p => p.id === 'github_sync');
    if (githubSyncIndex !== -1) {
      profiles[githubSyncIndex] = {
        id: 'GDSync',
        name: 'Сетевая сборка (GDSync)',
        description: 'Специальная сборка, автоматически синхронизируемая с Google Диском. Все моды и файлы конфигурации обновляются автоматически или в один клик.',
        game_version: '1.20.1',
        mod_loader: 'Fabric',
        mod_path: './profiles/GDSync/mods',
        created_at: profiles[githubSyncIndex].created_at || Date.now() - 25000,
        is_active: profiles[githubSyncIndex].is_active || false,
        ram_mb: profiles[githubSyncIndex].ram_mb || 4096,
        syncSource: 'gdrive',
        gdriveFolderId: extractGDriveFolderId(process.env.GDRIVE_FOLDER_ID || ''),
        gdriveFolderName: 'Google Drive Folder',
        is_favorite: true
      } as any;
      migrated = true;
    }

    const hasSyncProfile = profiles.some(p => p.id === 'GDSync');
    if (!hasSyncProfile) {
      profiles.push({
        id: 'GDSync',
        name: 'Сетевая сборка (GDSync)',
        description: 'Специальная сборка, автоматически синхронизируемая с Google Диском. Все моды и файлы конфигурации обновляются автоматически или в один клик.',
        game_version: '1.20.1',
        mod_loader: 'Fabric',
        mod_path: './profiles/GDSync/mods',
        created_at: Date.now() - 25000,
        is_active: false,
        ram_mb: 4096,
        syncSource: 'gdrive',
        gdriveFolderId: extractGDriveFolderId(process.env.GDRIVE_FOLDER_ID || ''),
        gdriveFolderName: 'Google Drive Folder',
        is_favorite: true
      } as any);
      migrated = true;
    } else {
      // Force set is_favorite for existing sync profile
      const syncProf = profiles.find(p => p.id === 'GDSync');
      if (syncProf && !syncProf.is_favorite) {
        syncProf.is_favorite = true;
        migrated = true;
      }
    }
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
      mod_path: './profiles/1/mods',
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
      mod_path: './profiles/2/mods',
      created_at: Date.now() - 50000,
      is_active: false,
      ram_mb: 4096
    },
    {
      id: 'GDSync',
      name: 'Сетевая сборка (GDSync)',
      description: 'Специальная сборка, автоматически синхронизируемая с Google Диском. Все моды и файлы конфигурации обновляются автоматически или в один клик.',
      game_version: '1.20.1',
      mod_loader: 'Fabric',
      mod_path: './profiles/GDSync/mods',
      created_at: Date.now() - 25000,
      is_active: false,
      ram_mb: 4096,
      syncSource: 'gdrive',
      gdriveFolderId: extractGDriveFolderId(process.env.GDRIVE_FOLDER_ID || ''),
      gdriveFolderName: 'Google Drive Folder',
      is_favorite: true
    } as any
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
  
  const mcPath = req.query.minecraftPath || '';
  const profileDir = normalizeProfilePath(`./profiles/${profileId}`, profileId, String(mcPath));
  if (!isPathSafe(profileDir, String(mcPath))) {
    return res.status(403).json({ error: 'Access denied: Directory is outside allowed paths' });
  }
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
  const mcPath = req.body.minecraftPath || req.query.minecraftPath || '';
  const profileDir = normalizeProfilePath(`./profiles/${newId}`, newId, String(mcPath));
  
  if (!isPathSafe(profileDir, String(mcPath))) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return res.status(403).json({ error: 'Access denied: Directory is outside allowed paths' });
  }
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
        const outPath = path.resolve(profileDir, relativePath);
        if (!isPathSafe(outPath, String(mcPath))) {
          console.warn(`Unsafe path in archive skipped: ${outPath}`);
          continue;
        }
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
      profileData.mod_path = `./profiles/${newId}/mods`;
      profiles.push(profileData);
      saveProfiles();
      
      // We also need to rescan mods!
      if (fs.existsSync(path.join(profileDir, 'mods'))) {
        const jarFiles = fs.readdirSync(path.join(profileDir, 'mods')).filter(f => f.endsWith('.jar'));
        for (const jar of jarFiles) {
          modsList.push({
            path: path.join(profileDir, 'mods', jar),
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
        mod_path: `./profiles/${newId}/mods`,
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

// Update check endpoint available for both Web and Electron
app.get('/api/updates/check', async (req, res) => {
  const repo = String(req.query.repo || process.env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher');
  try {
    const gitRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
    });
    if (!gitRes.ok) {
      return res.status(gitRes.status).json({ error: `GitHub API returned ${gitRes.status}` });
    }
    const release: any = await gitRes.json();
    const versionMatch = release.tag_name.match(/(\d+\.\d+\.\d+)/);
    const latestVersion = versionMatch ? versionMatch[1] : release.tag_name.replace(/^v/, '');
    
    res.json({
      latestVersion,
      tag_name: release.tag_name,
      releaseNotes: release.body,
      assets: release.assets || []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const isApiKey = (str: string) => str && str.startsWith('AIzaSy');

// GDrive auth status endpoint
app.get('/api/gdrive/auth-status', (req, res) => {
  const profileId = String(req.query.profileId || '');
  const profile = profiles.find(p => p.id === profileId);
  const hasServerToken = !!(
    process.env.GDRIVE_ACCESS_TOKEN ||
    process.env.GDRIVE_API_KEY ||
    (profile && (profile as any).gdriveToken)
  );
  res.json({ hasServerToken });
});

// GDrive update check endpoint
app.get('/api/gdrive/check-updates', async (req, res) => {
  const folderId = extractGDriveFolderId(String(req.query.folderId || ''));
  const token = String(req.query.token || '');
  const profileId = String(req.query.profileId || '');
  const mcPath = String(req.query.minecraftPath || '');

  const profile = profiles.find(p => p.id === profileId);
  
  let resolvedToken = token.trim();
  if (!resolvedToken || resolvedToken === 'server_token' || resolvedToken === 'undefined') {
    resolvedToken = process.env.GDRIVE_ACCESS_TOKEN || process.env.GDRIVE_API_KEY || (profile ? (profile as any).gdriveToken : '') || '';
    resolvedToken = resolvedToken.trim();
  }

  if (!folderId || !resolvedToken || !profileId) {
    return res.status(401).json({ error: 'Missing folderId, token, or profileId' });
  }

  try {
    const files = await listGDriveFolder(folderId, resolvedToken);
    const binaryFiles = files.filter(f => !f.mimeType.startsWith('application/vnd.google-apps.'));

    if (binaryFiles.length === 0) {
      return res.json({ updateAvailable: false, reason: 'No binary files' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileDir = normalizeProfilePath(`./profiles/${profileId}`, profileId, mcPath);

    const rootHasJar = binaryFiles.some(f => !f.relativePath.includes('/') && f.name.endsWith('.jar'));

    let updateAvailable = false;
    const details: string[] = [];

    for (const file of binaryFiles) {
      let targetRelPath = file.relativePath;
      if (rootHasJar) {
        targetRelPath = 'mods/' + file.relativePath;
      }

      // Clean up CloudSync prefix if any
      const cloudSyncMatch = targetRelPath.match(/^(CloudSync|Cloud_Sync|Cloud\s+Sync)\//i);
      if (cloudSyncMatch) {
        targetRelPath = targetRelPath.substring(cloudSyncMatch[0].length);
      }

      const resPackMatch = targetRelPath.match(/^(resoursepacks?|resourcepack)\//i);
      if (resPackMatch) {
        targetRelPath = 'resourcepacks/' + targetRelPath.substring(resPackMatch[0].length);
      }

      const outPath = path.resolve(profileDir, targetRelPath);
      if (!fs.existsSync(outPath)) {
        updateAvailable = true;
        details.push(`Missing: ${targetRelPath}`);
        break;
      } else {
        const stats = fs.statSync(outPath);
        if (file.size && parseInt(file.size) !== stats.size) {
          updateAvailable = true;
          details.push(`Modified: ${targetRelPath}`);
          break;
        }
      }
    }

    res.json({ updateAvailable, details });
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      console.log('GDrive update check: Authentication required (401/403).');
    } else {
      console.error('GDrive update check error:', err);
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  relativePath: string;
}

async function listGDriveFolder(folderId: string, accessToken: string, currentPath = ''): Promise<GDriveFile[]> {
  const files: GDriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const q = `'${folderId}' in parents and trashed = false`;
    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,size)&pageSize=1000` + (pageToken ? `&pageToken=${pageToken}` : '');
    
    const headers: any = {};
    if (isApiKey(accessToken)) {
      url += `&key=${accessToken}`;
    } else {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errText = await res.text();
      const error: any = new Error(`Google Drive API error: ${res.status} - ${errText}`);
      error.status = res.status;
      throw error;
    }

    const data: any = await res.json();
    if (data.files) {
      for (const file of data.files) {
        const fileRelativePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          const subFiles = await listGDriveFolder(file.id, accessToken, fileRelativePath);
          files.push(...subFiles);
        } else {
          files.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            relativePath: fileRelativePath
          });
        }
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}


app.get('/api/github/check-updates', async (req, res) => {
  const repo = String(req.query.repo || process.env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher');
  const profileId = String(req.query.profileId || '');

  try {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const gitRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
    });

    if (gitRes.ok) {
      const release = await gitRes.json();
      const tagName = release.tag_name || 'latest';
      
      if (profile.last_sync_tag && profile.last_sync_tag !== tagName) {
        return res.json({ updateAvailable: true, tagName });
      }
      return res.json({ updateAvailable: false, tagName });
    } else {
      const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits/main`, {
        headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
      });
      if (commitRes.ok) {
        const commit = await commitRes.json();
        const sha = commit.sha;
        if (profile.last_sync_tag && profile.last_sync_tag !== sha) {
          return res.json({ updateAvailable: true, tagName: sha });
        }
        return res.json({ updateAvailable: false, tagName: sha });
      }
    }
    
    res.json({ updateAvailable: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Advanced GitHub profile synchronization with user data preservation
app.get('/api/sync-build', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const profileId = String(req.query.profileId || '1');
  const repo = String(req.query.repo || process.env.VITE_GITHUB_REPO || 'xwxwxxw/Launcher');
  const mcPath = String(req.query.minecraftPath || '');
  const syncSource = String(req.query.syncSource || 'github');
  const gdriveFolderId = extractGDriveFolderId(String(req.query.gdriveFolderId || ''));
  const gdriveToken = String(req.query.gdriveToken || '');

  if (syncSource === 'gdrive') {
    sendEvent('status', { message: 'Проверка подключения к Google Диску...', progress: 10 });
  } else {
    sendEvent('status', { message: 'Проверка обновлений сборки на GitHub...', progress: 10 });
  }

  try {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      sendEvent('error', { message: 'Профиль не найден.' });
      return res.end();
    }

    const profileDir = normalizeProfilePath(`./profiles/${profileId}`, profileId, mcPath);
    if (!isPathSafe(profileDir, mcPath)) {
      sendEvent('error', { message: 'Неразрешенный путь к профилю.' });
      return res.end();
    }

    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    if (syncSource === 'gdrive') {
      let resolvedToken = gdriveToken.trim();
      if (!resolvedToken || resolvedToken === 'server_token' || resolvedToken === 'undefined') {
        resolvedToken = process.env.GDRIVE_ACCESS_TOKEN || process.env.GDRIVE_API_KEY || (profile ? (profile as any).gdriveToken : '') || '';
        resolvedToken = resolvedToken.trim();
      }

      if (!gdriveFolderId || gdriveFolderId.trim() === '' || gdriveFolderId === 'undefined') {
        sendEvent('error', { message: 'Идентификатор папки Google Диска не указан в настройках профиля.' });
        return res.end();
      }
      if (!resolvedToken) {
        sendEvent('error', { message: 'Токен авторизации Google отсутствует. Пожалуйста, войдите в аккаунт Google в настройках профиля или настройте токен/API-ключ сервера.' });
        return res.end();
      }

      sendEvent('status', { message: 'Получение списка файлов с Google Диска...', progress: 15 });
      let files: GDriveFile[] = [];
      try {
        files = await listGDriveFolder(gdriveFolderId, resolvedToken);
      } catch (e: any) {
        if (e.status === 401 || e.status === 403) {
          console.log('GDrive sync: Authentication required (401/403).');
          sendEvent('error', { message: 'Требуется авторизация Google Диска. Пожалуйста, войдите или укажите верный ключ доступа/API-ключ в настройках профиля.' });
        } else {
          console.error('Failed to list GDrive files:', e);
          sendEvent('error', { message: `Ошибка получения списка файлов: ${e.message}` });
        }
        return res.end();
      }

      if (!files || files.length === 0) {
        sendEvent('error', { message: 'В выбранной папке Google Диска не найдено файлов для синхронизации.' });
        return res.end();
      }

      const rootHasJar = files.some(f => !f.relativePath.includes('/') && f.name.endsWith('.jar'));
      const hasModsFolder = files.some(f => f.relativePath.startsWith('mods/'));

      sendEvent('status', { message: 'Очистка папки модов перед синхронизацией...', progress: 20 });
      
      // Clean up local mods directory if syncing mods directly or via subfolder
      if (rootHasJar || hasModsFolder) {
        const modsDir = path.join(profileDir, 'mods');
        if (fs.existsSync(modsDir)) {
          const existingFiles = fs.readdirSync(modsDir);
          for (const file of existingFiles) {
            if (file.endsWith('.jar') || file.endsWith('.jar.disabled')) {
              fs.unlinkSync(path.join(modsDir, file));
            }
          }
        } else {
          fs.mkdirSync(modsDir, { recursive: true });
        }
      }

      let downloadedCount = 0;
      const limit = 5; // Concurrency limit
      const binaryFiles = files.filter(f => !f.mimeType.startsWith('application/vnd.google-apps.'));

      if (binaryFiles.length === 0) {
        sendEvent('error', { message: 'Не найдено подходящих файлов для скачивания (документы Google не поддерживаются).' });
        return res.end();
      }

      sendEvent('status', { message: `Найдено ${binaryFiles.length} файлов. Начинается загрузка...`, progress: 25 });

      for (let i = 0; i < binaryFiles.length; i += limit) {
        const chunk = binaryFiles.slice(i, i + limit);
        await Promise.all(chunk.map(async (file) => {
          let targetRelPath = file.relativePath;
          if (rootHasJar) {
            targetRelPath = 'mods/' + file.relativePath;
          }

          // Clean up CloudSync prefix if any
          const cloudSyncMatch = targetRelPath.match(/^(CloudSync|Cloud_Sync|Cloud\s+Sync)\//i);
          if (cloudSyncMatch) {
            targetRelPath = targetRelPath.substring(cloudSyncMatch[0].length);
          }

          const resPackMatch = targetRelPath.match(/^(resoursepacks?|resourcepack)\//i);
          if (resPackMatch) {
            targetRelPath = 'resourcepacks/' + targetRelPath.substring(resPackMatch[0].length);
          }

          const outPath = path.resolve(profileDir, targetRelPath);
          if (!isPathSafe(outPath, mcPath)) {
            return;
          }

          const parentDir = path.dirname(outPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }

          let fileUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
          const headers: any = {};
          if (isApiKey(resolvedToken)) {
            fileUrl += `&key=${resolvedToken}`;
          } else {
            headers.Authorization = `Bearer ${resolvedToken}`;
          }

          const fileRes = await fetch(fileUrl, { headers });

          if (!fileRes.ok) {
            throw new Error(`Ошибка скачивания ${file.name}: HTTP ${fileRes.status}`);
          }

          const arrayBuffer = await fileRes.arrayBuffer();
          fs.writeFileSync(outPath, Buffer.from(arrayBuffer));

          downloadedCount++;
          const progressPercent = Math.round(25 + 70 * (downloadedCount / binaryFiles.length));
          sendEvent('status', { message: `Успешно загружен: ${targetRelPath}`, progress: progressPercent });
        }));
      }

      sendEvent('success', { message: 'Сборка успешно синхронизирована с Google Диском!', tag: 'Google Drive' });
      return res.end();
    }

    // Step 1: Query GitHub Release for a zip file, or download repo zipball
    let zipUrl = '';
    let tagName = 'latest';
    try {
      const gitRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
      });
      
      if (gitRes.ok) {
        const release: any = await gitRes.json();
        tagName = release.tag_name || 'latest';
        // Look for .zip in assets
        if (release.assets && Array.isArray(release.assets)) {
          const zipAsset = release.assets.find((asset: any) => asset.name.endsWith('.zip'));
          if (zipAsset) {
            zipUrl = zipAsset.browser_download_url;
          }
        }
      }
    } catch (e: any) {
      console.error('Failed to get latest GitHub release:', e);
    }


    if (!zipUrl) {
      // Fallback: Use the main branch source zipball
      zipUrl = `https://api.github.com/repos/${repo}/zipball/main`;
      
      try {
        const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits/main`, {
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

      sendEvent('status', { message: `Найдена сборка ${tagName}. Скачивание архива...`, progress: 20 });
    }

    // Step 2: Download ZIP to temp file
    sendEvent('status', { message: 'Загрузка архива сборки...', progress: 30 });
    const downloadRes = await fetch(zipUrl, {
      headers: { 'User-Agent': 'Layle-Minecraft-Launcher' }
    });

    if (!downloadRes.ok) {
      throw new Error(`Ошибка скачивания: HTTP ${downloadRes.status}`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    sendEvent('status', { message: 'Сохранение архива во временную папку...', progress: 60 });
    const tempZipPath = path.join(os.tmpdir(), `layle-sync-${Date.now()}.zip`);
    fs.writeFileSync(tempZipPath, buffer);

    sendEvent('status', { message: 'Резервное копирование настроек и очистка модов...', progress: 65 });

    // Step 3: Clean up existing mods to prevent duplicates
    const modsDir = path.join(profileDir, 'mods');
    if (fs.existsSync(modsDir)) {
      const files = fs.readdirSync(modsDir);
      for (const file of files) {
        if (file.endsWith('.jar') || file.endsWith('.jar.disabled')) {
          fs.unlinkSync(path.join(modsDir, file));
        }
      }
    } else {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    sendEvent('status', { message: 'Распаковка сборки...', progress: 75 });

    // Step 4: Extract downloaded ZIP
    const directory = await unzipper.Open.file(tempZipPath);
    
    // Check for nested GitHub source structure (all entries in a single directory folder)
    let commonPrefix = '';
    if (directory.files.length > 0) {
      const firstPath = directory.files[0].path;
      const topDirMatch = firstPath.match(/^([^/]+)\//);
      if (topDirMatch) {
        const testPrefix = topDirMatch[1] + '/';
        const allStartWithPrefix = directory.files.every(f => f.path.startsWith(testPrefix));
        if (allStartWithPrefix) {
          commonPrefix = testPrefix;
        }
      }
    }

    let fileCount = 0;
    const totalFiles = directory.files.length;

    for (const file of directory.files) {
      fileCount++;
      // Strip common prefix if any
      let relPath = file.path;
      if (commonPrefix && relPath.startsWith(commonPrefix)) {
        relPath = relPath.substring(commonPrefix.length);
      }
      
      if (!relPath || relPath === '/' || relPath.trim() === '') continue;

      // Handle CloudSync folder mapping (e.g. CloudSync/mods -> mods)
      const cloudSyncMatch = relPath.match(/^(CloudSync|Cloud_Sync|Cloud\s+Sync)\//i);
      if (cloudSyncMatch) {
        relPath = relPath.substring(cloudSyncMatch[0].length);
      }

      // Normalize common typos or singular variants for resourcepacks
      const resPackMatch = relPath.match(/^(resoursepacks?|resourcepack)\//i);
      if (resPackMatch) {
        relPath = 'resourcepacks/' + relPath.substring(resPackMatch[0].length);
      }

      const outPath = path.resolve(profileDir, relPath);
      if (!isPathSafe(outPath, mcPath)) {
        console.warn(`Unsafe path in ZIP skipped: ${outPath}`);
        continue;
      }

      // Preserve user-specific files/folders
      const preservedNames = ['options.txt', 'servers.dat', 'optionsof.txt'];
      const preservedDirs = ['saves', 'screenshots', 'resourcepacks', 'shaderpacks'];
      
      const fileLower = relPath.toLowerCase();
      const isPreservedFile = preservedNames.includes(relPath);
      const isPreservedDir = preservedDirs.some(dir => fileLower.startsWith(dir + '/'));

      if ((isPreservedFile || isPreservedDir) && fs.existsSync(outPath)) {
        // Skip overwriting user's local version of this file/folder!
        continue;
      }

      if (file.type === 'Directory') {
        if (!fs.existsSync(outPath)) {
          fs.mkdirSync(outPath, { recursive: true });
        }
      } else {
        const content = await file.buffer();
        if (!fs.existsSync(path.dirname(outPath))) {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
        }
        fs.writeFileSync(outPath, content);
      }

      if (fileCount % 10 === 0) {
        const unpackProgress = 75 + Math.round((fileCount / totalFiles) * 20);
        sendEvent('status', { message: `Распаковка файлов: ${fileCount} / ${totalFiles}...`, progress: unpackProgress });
      }
    }

    // Clean up temp file
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }

    sendEvent('status', { message: 'Сканирование модификаций...', progress: 95 });

    // Step 5: Automatically rescan mods for profile
    const finalModsDir = path.join(profileDir, 'mods');
    if (fs.existsSync(finalModsDir)) {
      const jarFiles = fs.readdirSync(finalModsDir)
        .filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
        .map(f => path.join(finalModsDir, f));

      const limit = 5;
      const parsedMods: any[] = [];
      for (let i = 0; i < jarFiles.length; i += limit) {
        const chunk = jarFiles.slice(i, i + limit);
        const chunkResults = await Promise.all(chunk.map(async (f) => {
          const parsed = await parseModJar(f);
          const isFileDisabled = f.endsWith('.disabled');
          return {
            ...parsed,
            profile_id: profileId,
            enabled: isFileDisabled ? false : true,
            contentType: 'mods'
          };
        }));
        parsedMods.push(...chunkResults);
      }

      // Replace mods list
      modsList = modsList.filter(m => !(m.profile_id === profileId && (m.contentType === 'mods' || !m.contentType)));
      modsList.push(...parsedMods);
      saveMods();
    }

    // Step 5b: Automatically rescan resourcepacks for profile
    const finalPacksDir = path.join(profileDir, 'resourcepacks');
    if (fs.existsSync(finalPacksDir)) {
      const packFiles = fs.readdirSync(finalPacksDir)
        .filter(f => !f.startsWith('.'));

      const parsedPacks = packFiles.map(f => {
        const fullPath = path.join(finalPacksDir, f);
        const isFileDisabled = f.endsWith('.disabled');
        const cleanName = f.replace('.disabled', '');
        const extension = path.extname(cleanName);
        const modId = cleanName.replace(extension, '');

        const existing = modsList.find(m => 
          m.profile_id === profileId && 
          m.contentType === 'resourcepacks' && 
          (m.mod_id === modId || m.name === cleanName)
        );

        return {
          path: fullPath,
          name: cleanName,
          mod_id: modId,
          display_name: existing?.display_name || modId,
          description: existing?.description || 'Локальный пакет контента.',
          description_ru: existing?.description_ru || 'Локальный пакет контента.',
          icon_url: existing?.icon_url || '',
          downloads: existing?.downloads || 0,
          api_source: existing?.api_source || 'Локальный',
          profile_id: profileId,
          enabled: !isFileDisabled,
          contentType: 'resourcepacks',
          categories: existing?.categories || ['resource packs'],
          categories_ru: existing?.categories_ru || ['Ресурспаки']
        };
      });

      // Replace resourcepacks list
      modsList = modsList.filter(m => !(m.profile_id === profileId && m.contentType === 'resourcepacks'));
      modsList.push(...parsedPacks);
      saveMods();
    }
    
    // Save last_sync_tag for github updates
    if (profile) {
      const pIndex = profiles.findIndex(p => p.id === profileId);
      if (pIndex !== -1) {
        profiles[pIndex].last_sync_tag = tagName;
        saveProfiles();
      }
    }

    sendEvent('success', { message: 'Сборка успешно синхронизирована с GitHub!', tag: tagName });
    res.end();

  } catch (err: any) {
    console.error('Error synchronizing build:', err);
    sendEvent('error', { message: `Ошибка синхронизации: ${err.message}` });
    res.end();
  }
});

app.put('/api/profiles/:id', (req, res) => {
  const index = profiles.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    const updated = { ...profiles[index], ...req.body };
    if (!updated.mod_path || updated.mod_path.trim() === '') {
      updated.mod_path = `./profiles/${req.params.id}/mods`;
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
    
    try {
      const response = await fetch('https://authserver.ely.by/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          clientToken: Date.now().toString(), // Simple client token
          requestUser: true
        }),
        signal: AbortSignal.timeout(6000) // 6 seconds timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        return res.status(response.status).json(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        if (response.status >= 500) {
          throw new Error(`Ely.by server error: ${response.status}`);
        }
        return res.status(response.status).json(errData);
      }
    } catch (fetchError: any) {
      console.warn("Ely.by auth server connection failed, falling back to local offline profile for testing:", fetchError);
      
      // Generate a stable deterministic MD5 hash of the username as UUID
      const dummyId = crypto.createHash('md5').update(username || 'player').digest('hex');
      return res.status(200).json({
        accessToken: "offline_access_token_" + Date.now(),
        clientToken: "offline_client_token",
        selectedProfile: {
          id: dummyId,
          name: username || 'Player'
        },
        availableProfiles: [
          {
            id: dummyId,
            name: username || 'Player'
          }
        ],
        isOfflineFallback: true
      });
    }
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

    const useOrigin = clientId === 'layle-launcher3' ? 'http://localhost:3000' : origin;
    const redirectUri = `${useOrigin}/api/auth/ely/callback`;
    
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

    const authUrl = `https://account.ely.by/oauth2/v1?${params.toString()}`;
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
    
    const useOrigin = clientId === 'layle-launcher3' ? 'http://localhost:3000' : origin;
    const redirectUri = `${useOrigin}/api/auth/ely/callback`;

    // Exchange Code for Access Token
    const tokenRes = await fetch('https://account.ely.by/api/oauth2/v1/token', {
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
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px; flex-wrap: wrap;">
              <button id="close-btn" onclick="window.close()" style="background: #27272a; color: white;">Закрыть вкладку</button>
              <a id="return-btn" href="/" style="background: #10b981; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25); display: inline-block;">Вернуться в Лаунчер</a>
            </div>
          </div>
          <script>
            const profile = ${JSON.stringify(profile)};
            fetch('/api/auth/ely/success', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(profile) }).catch(()=>{});
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
            const returnBtn = document.getElementById('return-btn');

            if (success) {
              statusEl.textContent = 'Данные успешно отправлены. Окно закроется автоматически через мгновение...';
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              // Show friendly instruction in case window.opener is broken or blocked
              if (spinnerEl) spinnerEl.style.display = 'none';
              statusEl.innerHTML = 'Вход прошёл отлично! Авторизация сохранена.<br/><br/>Вы можете закрыть эту вкладку или просто нажать кнопку ниже, чтобы вернуться в Лаунчер.';
              if (btnEl) btnEl.style.display = 'inline-block';
              if (returnBtn) returnBtn.style.display = 'inline-block';
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

app.post('/api/auth/ely/success', express.json(), (req, res) => {
  pendingElyAuth = req.body;
  res.json({ success: true });
});

app.get('/api/auth/ely/status', (req, res) => {
  if (pendingElyAuth) {
    const profile = pendingElyAuth;
    pendingElyAuth = null;
    res.json({ success: true, profile });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/mods/install', async (req, res) => {
    const { projectId, folderPath, profileId, contentType, gameVersion, loader } = req.body;
  
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
        let versionsUrl = `https://api.modrinth.com/v2/project/${projectId}/version`;
        const queryParams = new URLSearchParams();
        if (gameVersion) queryParams.append('game_versions', `["${gameVersion}"]`);
        if (loader) queryParams.append('loaders', `["${loader.toLowerCase()}"]`);
        if (queryParams.toString()) versionsUrl += `?${queryParams.toString()}`;

        const versionsRes = await fetch(versionsUrl);
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

    const profile = profiles.find(p => p.id === profileId);
    const projectType = project.project_type || 'mod';
    const computedContentType = projectType === 'resourcepack' 
      ? 'resourcepacks' 
      : (projectType === 'shader' ? 'shaderpacks' : 'mods');

    let targetPath = `/mock/${computedContentType}/${profileId || '1'}/${modId}${projectType === 'mod' ? '.jar' : '.zip'}`;
    
    let destDir = folderPath;
    if (profileId && profileId !== 'global') {
      const pPath = profile && profile.mod_path ? profile.mod_path : `./profiles/${profileId}/mods`;
      destDir = normalizeProfilePath(pPath, profileId, req.body.minecraftPath);
    } else {
      // Global installation (from Mods tab)
      const mcPath = req.body.minecraftPath || './.minecraft';
      const resolvedMcPath = path.isAbsolute(mcPath) ? mcPath : path.resolve(process.cwd(), mcPath);
      destDir = path.join(resolvedMcPath, 'mods');
    }
    
    if (destDir) {
      const installTarget = req.body.installTarget || 'client';
      const destFolder = computedContentType === 'resourcepacks' 
        ? 'resourcepacks' 
        : (computedContentType === 'shaderpacks' ? 'shaderpacks' : (installTarget === 'server' ? 'server-mods' : 'mods'));
      destDir = destDir.replace(/mods\/?$/, destFolder);
    }

    const mcPathVal = req.body.minecraftPath || '';
    if (destDir && !isPathSafe(destDir, String(mcPathVal))) {
      return res.status(403).json({ error: 'Access denied: Destination directory is outside allowed paths' });
    }
    
    if (destDir && downloadUrl) {
      const absDir = path.isAbsolute(destDir) ? destDir : path.resolve(process.cwd(), destDir);
      if (!fs.existsSync(absDir)) {
        fs.mkdirSync(absDir, { recursive: true });
      }
      targetPath = path.join(absDir, fileName);
      if (!isPathSafe(targetPath, String(mcPathVal))) {
        return res.status(403).json({ error: 'Access denied: Target file path is outside allowed paths' });
      }
      
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
      project_url: `https://modrinth.com/${projectType}/${project.slug || project.id}`,
      categories,
      categories_ru: categoriesRu,
      downloads: project.downloads || 0,
      api_source: 'Modrinth',
      profile_id: profileId || '1',
      enabled: true,
      contentType: contentType
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
  
  // Physically delete the jar or pack file/folder if filePath is passed and exists
  if (filePath && typeof filePath === 'string') {
    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Access denied: Unsafe file path' });
    }
    if (filePath.includes('..')) {
      return res.status(403).json({ error: 'Path traversal not allowed' });
    }
    
    const allowedFolders = ['mods', 'resourcepacks', 'shaderpacks', 'server-mods'];
    const isSafe = allowedFolders.some(folder => filePath.includes(`/${folder}/`) || filePath.includes(`\\${folder}\\`));
    
    if (isSafe) {
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (e) {
        console.error('Failed to physically delete content file:', e);
      }
    }
  }
  
  if (profileId) {
    modsList = modsList.filter(m => !(m.mod_id === modId && m.profile_id === profileId));
  } else {
    modsList = modsList.filter(m => m.mod_id !== modId && m.name !== modId);
  }
  
  saveMods();
  res.json({ success: true, message: 'Успешно удалено.' });
});

app.post('/api/mods/scan', async (req, res) => {
  let { folderPath, profileId, contentType = 'mods', minecraftPath } = req.body;
  
  if (profileId && profileId !== 'global') {
    const profile = profiles.find(p => p.id === profileId);
    const pPath = profile && profile.mod_path ? profile.mod_path : `./profiles/${profileId}/mods`;
    folderPath = normalizeProfilePath(pPath, profileId, minecraftPath);
  } else {
    // Global scan (Mods tab)
    const mcPath = minecraftPath || './.minecraft';
    const resolvedMcPath = path.isAbsolute(mcPath) ? mcPath : path.resolve(process.cwd(), mcPath);
    folderPath = path.join(resolvedMcPath, 'mods');
  }

  const installTarget = req.body.installTarget || 'client';
  const destFolder = contentType === 'resourcepacks' 
    ? 'resourcepacks' 
    : (contentType === 'shaderpacks' ? 'shaderpacks' : (installTarget === 'server' ? 'server-mods' : 'mods'));

  if (folderPath && folderPath.trim() !== '') {
    folderPath = folderPath.replace(/mods\/?$/, destFolder);
    if (!isPathSafe(folderPath, String(minecraftPath || ''))) {
      return res.status(403).json({ error: 'Access denied: Folder path is outside allowed paths' });
    }
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      
      const files = fs.readdirSync(folderPath);
      // Filter out system hidden files
      const validFiles = files.filter(f => !f.startsWith('.'));
      
      if (contentType === 'mods') {
        const jarFiles = validFiles.filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled')).map(f => path.join(folderPath, f));
        
        if (jarFiles.length === 0) {
          if (profileId) {
            modsList = modsList.filter(m => !(m.profile_id === profileId && (m.contentType === 'mods' || !m.contentType)));
            saveMods();
          }
          const filtered = modsList.filter(m => m.profile_id === profileId && (m.contentType === 'mods' || !m.contentType));
          return res.json(filtered);
        }

        const limit = 5;
        const parsedMods: any[] = [];
        for (let i = 0; i < jarFiles.length; i += limit) {
          const chunk = jarFiles.slice(i, i + limit);
          const chunkResults = await Promise.all(chunk.map(async (f) => {
            const parsed = await parseModJar(f);
            const isFileDisabled = f.endsWith('.disabled');
            
            const existing = modsList.find(m => m.path === f && m.profile_id === profileId);
            
            const mod: any = {
              ...parsed,
              profile_id: profileId,
              enabled: isFileDisabled ? false : (existing ? existing.enabled !== false : true),
              contentType: 'mods'
            };
            return mod;
          }));
          parsedMods.push(...chunkResults);
        }

        if (profileId) {
          modsList = modsList.filter(m => !(m.profile_id === profileId && (m.contentType === 'mods' || !m.contentType)));
          modsList.push(...parsedMods);
          saveMods();
        }

        res.json(parsedMods);
      } else {
        // resourcepacks or shaderpacks
        const parsedItems = await Promise.all(validFiles.map(async (f) => {
          const fullPath = path.join(folderPath, f);
          const isFileDisabled = f.endsWith('.disabled');
          const cleanName = f.replace('.disabled', '');
          const extension = path.extname(cleanName);
          const modId = cleanName.replace(extension, '');

          // Check if we already have this in our modsList with rich metadata
          const existing = modsList.find(m => 
            m.profile_id === profileId && 
            m.contentType === contentType && 
            (m.mod_id === modId || m.name === cleanName || m.path === fullPath || m.path === fullPath.replace('.disabled', ''))
          );

          const item: any = {
            path: fullPath,
            name: cleanName,
            mod_id: modId,
            display_name: existing?.display_name || modId,
            description: existing?.description || 'Локальный пакет контента.',
            description_ru: existing?.description_ru || 'Локальный пакет контента.',
            icon_url: existing?.icon_url || '',
            downloads: existing?.downloads || 0,
            api_source: existing?.api_source || 'Локальный',
            profile_id: profileId,
            enabled: !isFileDisabled,
            contentType: contentType,
            categories: existing?.categories || [contentType === 'resourcepacks' ? 'resource packs' : 'shaders'],
            categories_ru: existing?.categories_ru || [contentType === 'resourcepacks' ? 'Ресурспаки' : 'Шейдеры'],
          };
          return item;
        }));

        if (profileId) {
          modsList = modsList.filter(m => !(m.profile_id === profileId && m.contentType === contentType));
          modsList.push(...parsedItems);
          saveMods();
        }

        res.json(parsedItems);
      }
    } catch (error) {
      console.error(`Error scanning ${contentType}:`, error);
      const filtered = modsList.filter(m => m.profile_id === profileId && m.contentType === contentType);
      return res.json(filtered);
    }
  } else {
    if (profileId) {
      const filtered = modsList.filter(m => m.profile_id === profileId && m.contentType === contentType);
      return res.json(filtered);
    }
    return res.json(modsList);
  }
});

app.get('/api/system/ram', (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    const totalMb = Math.round(totalMem / (1024 * 1024));
    const freeMb = Math.round(freeMem / (1024 * 1024));
    
    let suggestedMb = 4096;
    if (totalMb <= 4096) {
      suggestedMb = Math.max(1024, Math.round(totalMb * 0.45));
    } else if (totalMb <= 8192) {
      suggestedMb = 3072;
    } else if (totalMb <= 16384) {
      suggestedMb = 6144;
    } else {
      suggestedMb = 8192;
    }

    res.json({
      success: true,
      totalMb,
      freeMb,
      suggestedMb
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/utils/open-folder', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' });
  }

  const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.resolve(process.cwd(), folderPath);

  if (!isPathSafe(absolutePath)) {
    return res.status(403).json({ error: 'Access denied: Folder path is outside allowed paths' });
  }

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
      if (!isPathSafe(mod.path)) {
        return res.status(403).json({ error: 'Access denied: Unsafe mod path' });
      }
      let newPath = mod.path;
      if (!enabled && !mod.path.endsWith('.disabled')) {
        newPath = mod.path + '.disabled';
        if (!isPathSafe(newPath)) {
          return res.status(403).json({ error: 'Access denied: Unsafe destination path' });
        }
        try {
          fs.renameSync(mod.path, newPath);
          mod.path = newPath;
        } catch (e) {
          console.error('Failed to rename file to disabled:', e);
        }
      } else if (enabled && mod.path.endsWith('.disabled')) {
        newPath = mod.path.slice(0, -9); // remove '.disabled'
        if (!isPathSafe(newPath)) {
          return res.status(403).json({ error: 'Access denied: Unsafe destination path' });
        }
        try {
          fs.renameSync(mod.path, newPath);
          mod.path = newPath;
        } catch (e) {
          console.error('Failed to rename file to enabled:', e);
        }
      }
    } else {
      // Fallback for mock path
      const ext = mod.contentType === 'resourcepacks' || mod.contentType === 'shaderpacks' ? '.zip' : '.jar';
      if (enabled) {
        mod.path = `/mock/mods/${profileId}/${modId}${ext}`;
      } else {
        mod.path = `/mock/mods/${profileId}/.disabled/${modId}${ext}.disabled`;
      }
    }
    
    saveMods();
    res.json({ success: true, message: enabled ? 'Успешно включено.' : 'Успешно выключено.', mod });
  } else {
    res.status(404).json({ error: 'Mod not found' });
  }
});

app.post('/api/mods/analyze', async (req, res) => {
  const { mods } = req.body;
  if (!Array.isArray(mods)) return res.status(400).json({ error: 'Invalid mods array' });

  // Analyze in parallel with limit
  const limit = 5;
  const results: any[] = [];
  for (let i = 0; i < mods.length; i += limit) {
    const chunk = mods.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map(async (mod) => {
      await fetchModrinthData(mod);
      if (mod.description) {
        mod.description_ru = await translateText(mod.description);
      }
      generateWarningsRu(mod);
      return mod;
    }));
    results.push(...chunkResults);
  }

  res.json(results);
});

app.post('/api/mods/update', async (req, res) => {
  // Simulate an update process
  const {} = req.body;
  
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
    
    let installed = false;
    if (loader === 'Fabric') {
      const versionsDir = path.join(mcPath, 'versions');
      if (fs.existsSync(versionsDir)) {
        try {
          const dirs = fs.readdirSync(versionsDir);
          const matchingDir = dirs.find(d => d.startsWith('fabric-loader-') && d.endsWith(`-${version}`));
          if (matchingDir) {
            const jsonPath = path.join(versionsDir, matchingDir, `${matchingDir}.json`);
            installed = fs.existsSync(jsonPath);
          }
        } catch (e) {
          console.error('Error scanning versions directory for Fabric check:', e);
        }
      }
    } else {
      let versionFolder = String(version);
      if (loader === 'Forge') {
         // Forge might have a different folder name, but check-installed will default to the game version folder
         // or if there's any forge-labeled version folder in future. For now:
      }
      const jsonPath = path.join(mcPath, 'versions', versionFolder, `${versionFolder}.json`);
      installed = fs.existsSync(jsonPath);
    }
    
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
    mod_path: './profiles/1/mods',
    description: ''
  };

  const selectedRam = ram || '4096';
  
  const selectedMinecraft = minecraftPath ? String(minecraftPath) : `./profiles/${activeProfile.id}`;
  const minecraftPathAbsolute = path.isAbsolute(selectedMinecraft) ? selectedMinecraft : path.resolve(process.cwd(), selectedMinecraft);

  if (!isPathSafe(minecraftPathAbsolute, String(minecraftPath || ''))) {
    sendEvent('error', 'Доступ отклонен: Небезопасный путь к Minecraft.');
    res.end();
    return;
  }
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
  const globalRoot = minecraftPathAbsolute;
  const isolatedDir = normalizeProfilePath(`./profiles/${activeProfile.id}`, activeProfile.id, selectedMinecraft);
  
  if (!fs.existsSync(isolatedDir)) {
    fs.mkdirSync(isolatedDir, { recursive: true });
  }

  // Pre-configure Russian language in options.txt if not already set
  const optionsTxtPath = path.join(isolatedDir, 'options.txt');
  try {
    if (fs.existsSync(optionsTxtPath)) {
      let content = fs.readFileSync(optionsTxtPath, 'utf8');
      if (!content.includes('lang:ru_ru')) {
        if (content.includes('lang:')) {
          content = content.replace(/^lang:.*$/m, 'lang:ru_ru');
        } else {
          content += '\nlang:ru_ru\n';
        }
        fs.writeFileSync(optionsTxtPath, content, 'utf8');
      }
    } else {
      fs.writeFileSync(optionsTxtPath, 'lang:ru_ru\n', 'utf8');
    }
  } catch (e) {
    console.error('Failed to pre-configure options.txt language:', e);
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

  // Get the latest loader version dynamically
  let loaderVer = '';
  if (activeProfile.mod_loader === 'Fabric') {
    try {
      const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${activeProfile.game_version}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) loaderVer = data[0].loader.version;
      }
    } catch(e) {}
    if (!loaderVer) loaderVer = '0.16.10'; // Fallback to a modern version

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
  } else if (activeProfile.mod_loader === 'Quilt') {
    try {
      const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${activeProfile.game_version}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) loaderVer = data[0].loader.version;
      }
    } catch(e) {}
    if (!loaderVer) loaderVer = '0.24.0';

    const customVersionName = `quilt-loader-${loaderVer}-${activeProfile.game_version}`;
    opts.version.custom = customVersionName;
    
    const versionsDir = path.join(minecraftPathAbsolute, 'versions', customVersionName);
    if (!fs.existsSync(versionsDir)) {
        fs.mkdirSync(versionsDir, { recursive: true });
    }
    const jsonPath = path.join(versionsDir, `${customVersionName}.json`);
    if (!fs.existsSync(jsonPath)) {
        sendEvent('log', { message: 'Скачивание профиля Quilt...', progress: 5 });
        try {
            const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${activeProfile.game_version}/${loaderVer}/profile/json`);
            if (res.ok) {
                const data = await res.text();
                fs.writeFileSync(jsonPath, data);
                sendEvent('log', { message: 'Профиль Quilt успешно загружен.', progress: 10 });
            }
        } catch (e) {
            console.error('Failed to download Quilt profile', e);
        }
    }
  } else if (activeProfile.mod_loader === 'Forge') {
    try {
      const res = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
      if (res.ok) {
        const data = await res.json();
        loaderVer = data.promos[`${activeProfile.game_version}-recommended`] || data.promos[`${activeProfile.game_version}-latest`];
      }
    } catch(e) {}

    if (loaderVer) {
      sendEvent('log', { message: 'Скачивание Forge установщика...', progress: 5 });
      const forgeInstallerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${activeProfile.game_version}-${loaderVer}/forge-${activeProfile.game_version}-${loaderVer}-installer.jar`;
      const tempPath = path.join(os.tmpdir(), `forge-${activeProfile.game_version}-${loaderVer}-installer.jar`);
      
      if (!fs.existsSync(tempPath)) {
        try {
          const res = await fetch(forgeInstallerUrl);
          if (res.ok) {
             const buffer = await res.arrayBuffer();
             fs.writeFileSync(tempPath, Buffer.from(buffer));
          }
        } catch(e) {
          console.error('Failed to download Forge installer', e);
        }
      }
      if (fs.existsSync(tempPath)) {
        opts.forge = tempPath;
      }
    }
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

  const customJvmArgs = [...jvmArguments];
  if (authName && authUuid && authAccess) {
    const injectorPath = path.join(DATA_DIR, 'authlib-injector.jar');
    let injectorReady = false;
    if (fs.existsSync(injectorPath)) {
      injectorReady = true;
    } else {
      sendEvent('log', { message: 'Скачивание authlib-injector для авторизации Ely.by...', progress: 12 });
      try {
        const injectorRes = await fetch('https://authlib-injector.yushijinhun.com/artifact/latest/authlib-injector.jar');
        if (injectorRes.ok) {
          const buffer = await injectorRes.arrayBuffer();
          fs.writeFileSync(injectorPath, Buffer.from(buffer));
          injectorReady = true;
          sendEvent('log', { message: 'authlib-injector успешно скачан.', progress: 15 });
        } else {
          sendEvent('log', { message: 'Предупреждение: не удалось скачать authlib-injector. Запуск без скинов и мультиплеера Ely.by.', progress: 15 });
        }
      } catch (err) {
        console.error('Failed to download authlib-injector:', err);
        sendEvent('log', { message: 'Предупреждение: ошибка при скачивании authlib-injector.', progress: 15 });
      }
    }
    if (injectorReady) {
      customJvmArgs.push(`-javaagent:${injectorPath}=https://authserver.ely.by/`);
    }
  }

  if (customJvmArgs.length > 0) {
    opts.customArgs = customJvmArgs;
  }

  let stdLog = '';
  launcher.on('debug', (e: string) => {
    stdLog += e + '\n';
    if (stdLog.length > 50000) stdLog = stdLog.substring(stdLog.length - 50000);
    sendEvent('log', { message: e, progress: 50 });
  });
  launcher.on('data', (e: string) => {
    stdLog += e + '\n';
    if (stdLog.length > 50000) stdLog = stdLog.substring(stdLog.length - 50000);
    sendEvent('log', { message: e, progress: 80 });
  });
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
  const { profileId, minecraftPath } = req.query;
  const profileDir = normalizeProfilePath(`./profiles/${profileId || '1'}`, String(profileId || '1'), String(minecraftPath || ''));
  if (!isPathSafe(profileDir, String(minecraftPath || ''))) {
    return res.status(403).json({ error: 'Access denied: Path is outside allowed paths' });
  }
  
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
  const { profileId, minecraftPath } = req.query;
  const profileDir = normalizeProfilePath(`./profiles/${profileId || '1'}`, String(profileId || '1'), String(minecraftPath || ''));
  const logsDir = path.join(profileDir, 'logs');
  if (!isPathSafe(logsDir, String(minecraftPath || ''))) {
    return res.status(403).json({ error: 'Access denied: Path is outside allowed paths' });
  }
  
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
  const profileDir = normalizeProfilePath(`./profiles/${profileId || '1'}`, String(profileId || '1'), String(globalPath || ''));
  const screenshotsDir = path.join(profileDir, 'screenshots');
  if (!isPathSafe(screenshotsDir, String(globalPath || ''))) {
    return res.status(403).json({ error: 'Access denied: Path is outside allowed paths' });
  }
  
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
  const { filenames, profileId, globalPath } = req.body;
  const profileDir = normalizeProfilePath(`./profiles/${profileId || '1'}`, String(profileId || '1'), String(globalPath || ''));
  const screenshotsDir = path.join(profileDir, 'screenshots');
  if (!isPathSafe(screenshotsDir, String(globalPath || ''))) {
    return res.status(403).json({ error: 'Access denied: Path is outside allowed paths' });
  }

  if (Array.isArray(filenames)) {
    for (const f of filenames) {
      if (typeof f === 'string' && !f.includes('/') && !f.includes('\\') && !f.includes('..')) {
        const p = path.join(screenshotsDir, f);
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }
    }
  }
  res.json({ success: true });
});

app.post('/api/minecraft/open-screenshots-folder', async (req, res) => {
  const { profileId, globalPath } = req.query;
  const profileDir = normalizeProfilePath(`./profiles/${profileId || '1'}`, String(profileId || '1'), String(globalPath || ''));
  const dir = path.join(profileDir, 'screenshots');
  if (!isPathSafe(dir, String(globalPath || ''))) {
    return res.status(403).json({ error: 'Access denied: Path is outside allowed paths' });
  }
  
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    const { shell } = require('electron');
    if (shell) await shell.openPath(dir);
  } catch (e) {}
  res.json({ success: true });
});

app.post('/api/minecraft/open-game-folder', async (req, res) => {
  const { profileId, minecraftPath } = req.query;
  const profileDir = normalizeProfilePath(`./profiles/${profileId || '1'}`, String(profileId || '1'), String(minecraftPath || ''));
  if (!isPathSafe(profileDir, String(minecraftPath || ''))) {
    return res.status(403).json({ error: 'Access denied: Path is outside allowed paths' });
  }
  
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
      repo = repo.trim().replace(/\\.git$/, '');
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
