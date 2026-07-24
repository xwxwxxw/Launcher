import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import crypto from 'crypto';
import { ModInfo } from '../types.js';
import { 
  WORLDGEN_MODS, CLIENT_MODS, SERVER_MODS, HEAVY_MODS, OPTIMIZATION_MODS, WORLDGEN_KEYWORDS, TRANSLATIONS
} from './constants.js';

interface CacheEntry {
  mtimeMs: number;
  size: number;
  info: ModInfo;
}

const modCache = new Map<string, CacheEntry>();

export async function parseModJar(filePath: string): Promise<ModInfo> {
  const fileName = path.basename(filePath, '.jar');
  let modId = fileName;
  let displayName = fileName;
  let description = '';
  let environment = '';
  let depends: string[] = [];
  let iconDataUrl = '';

  let stats: fs.Stats | null = null;
  try {
    stats = await fs.promises.stat(filePath);
    const cached = modCache.get(filePath);
    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.info;
    }
  } catch (e) {
    // If stats can't be read, continue without cache
  }

  let loader = 'unknown';

  try {
    const data = await fs.promises.readFile(filePath);
    const zip = await JSZip.loadAsync(data);
    
    const isFabric = zip.file('fabric.mod.json');
    const isQuilt = zip.file('quilt.mod.json');
    const isForge = zip.file('META-INF/mods.toml') || zip.file('mcmod.info');

    if (isFabric) {
      loader = 'fabric';
      const file = zip.file('fabric.mod.json');
      if (file) {
        const content = await file.async('string');
        const json = JSON.parse(content);
        modId = json.id || fileName;
        displayName = json.name || fileName;
        description = json.description || '';
        if (typeof json.environment === 'string') {
          environment = json.environment.toLowerCase();
        }
        if (json.depends && typeof json.depends === 'object') {
          depends = Object.keys(json.depends);
        }
        
        let iconPath: string | null = null;
        if (json.icon) {
          if (typeof json.icon === 'string') {
            iconPath = json.icon;
          } else if (typeof json.icon === 'object') {
            const keys = Object.keys(json.icon).sort((a, b) => parseInt(b) - parseInt(a));
            if (keys.length > 0) {
              iconPath = json.icon[keys[0]];
            }
          }
        }
        if (iconPath) {
          const iconFile = zip.file(iconPath);
          if (iconFile) {
            const buffer = await iconFile.async('nodebuffer');
            iconDataUrl = 'data:image/png;base64,' + buffer.toString('base64');
          }
        }
      }
    } else if (isQuilt) {
      loader = 'quilt';
      const file = zip.file('quilt.mod.json');
      if (file) {
        const content = await file.async('string');
        const json = JSON.parse(content);
        modId = json.id || fileName;
        displayName = json.name || fileName;
        description = json.description || '';
        if (typeof json.environment === 'string') {
          environment = json.environment.toLowerCase();
        }
        if (json.depends && typeof json.depends === 'object') {
          depends = Object.keys(json.depends);
        }
        
        let iconPath: string | null = null;
        if (json.icon) {
          if (typeof json.icon === 'string') {
            iconPath = json.icon;
          } else if (typeof json.icon === 'object') {
            const keys = Object.keys(json.icon).sort((a, b) => parseInt(b) - parseInt(a));
            if (keys.length > 0) {
              iconPath = json.icon[keys[0]];
            }
          }
        }
        if (iconPath) {
          const iconFile = zip.file(iconPath);
          if (iconFile) {
            const buffer = await iconFile.async('nodebuffer');
            iconDataUrl = 'data:image/png;base64,' + buffer.toString('base64');
          }
        }
      }
    } else if (isForge) {
      loader = 'forge';
      modId = fileName;
      displayName = fileName;
      description = 'Модификация для загрузчика Forge.';
    }

    // Generic fallback for any mod loader (Fabric, Quilt, Forge) if no icon was loaded yet
    if (!iconDataUrl) {
      const allFileNames = Object.keys(zip.files);
      const iconCandidate = allFileNames.find(name => {
        const lowerName = name.toLowerCase();
        return (
          (lowerName === 'icon.png' || lowerName.endsWith('/icon.png')) ||
          (lowerName === 'logo.png' || lowerName.endsWith('/logo.png')) ||
          (lowerName === 'pack.png' || lowerName.endsWith('/pack.png')) ||
          (lowerName.includes('icon') && lowerName.endsWith('.png'))
        );
      });
      if (iconCandidate) {
        const iconFile = zip.file(iconCandidate);
        if (iconFile) {
          const buffer = await iconFile.async('nodebuffer');
          iconDataUrl = 'data:image/png;base64,' + buffer.toString('base64');
        }
      }
    }
  } catch (e) {
    // Silently fallback to filename defaults if parsing fails
  }

  const modInfo: ModInfo = {
    path: filePath,
    name: fileName,
    mod_id: modId,
    display_name: displayName,
    description,
    description_ru: '',
    environment,
    depends,
    is_worldgen: false,
    is_client: false,
    is_server: false,
    is_heavy: false,
    is_library: false,
    is_optimization: false,
    warnings: [],
    icon_url: iconDataUrl,
    project_url: '',
    categories: [],
    categories_ru: [],
    downloads: 0,
    api_source: '',
    mod_loader: loader,
  };

  applyLocalAnalysis(modInfo);
  if (stats) {
    modCache.set(filePath, {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      info: modInfo
    });
  }
  return modInfo;
}

function applyLocalAnalysis(mod: ModInfo) {
  const modIdLower = mod.mod_id.toLowerCase();
  const nameLower = mod.display_name.toLowerCase();

  for (const wgId of WORLDGEN_MODS) {
    if (modIdLower.includes(wgId) || nameLower.includes(wgId)) {
      mod.is_worldgen = true;
      break;
    }
  }

  if (mod.environment === "client") mod.is_client = true;
  for (const clientId of CLIENT_MODS) {
    if (modIdLower.includes(clientId) || nameLower.includes(clientId)) {
      mod.is_client = true;
      break;
    }
  }

  if (mod.environment === "server") mod.is_server = true;
  for (const serverId of SERVER_MODS) {
    if (modIdLower.includes(serverId) || nameLower.includes(serverId)) {
      mod.is_server = true;
      break;
    }
  }

  for (const heavyId of HEAVY_MODS) {
    if (modIdLower.includes(heavyId) || nameLower.includes(heavyId)) {
      mod.is_heavy = true;
      break;
    }
  }

  for (const optId of OPTIMIZATION_MODS) {
    if (modIdLower.includes(optId) || nameLower.includes(optId)) {
      mod.is_optimization = true;
      break;
    }
  }

  const libKeywords = ["api", "lib", "library", "core", "base"];
  if (libKeywords.some(kw => modIdLower.includes(kw)) && !mod.is_worldgen) {
    mod.is_library = true;
  }
}

export function generateWarningsRu(mod: ModInfo) {
  mod.warnings = [];
  if (mod.is_worldgen) {
    mod.warnings.push({ type: "danger", title: TRANSLATIONS["worldgen_warning"], desc: TRANSLATIONS["worldgen_desc"], tip: TRANSLATIONS["worldgen_tip"] });
  }
  if (mod.is_heavy) {
    mod.warnings.push({ type: "warning", title: TRANSLATIONS["heavy_warning"], desc: TRANSLATIONS["heavy_desc"], tip: TRANSLATIONS["heavy_tip"] });
  }
  if (mod.is_client) {
    mod.warnings.push({ type: "info", title: TRANSLATIONS["client_warning"], desc: TRANSLATIONS["client_desc"], tip: TRANSLATIONS["client_tip"] });
  }
  if (mod.is_server) {
    mod.warnings.push({ type: "info", title: TRANSLATIONS["server_warning"], desc: TRANSLATIONS["server_desc"], tip: TRANSLATIONS["server_tip"] });
  }
  if (mod.is_library) {
    mod.warnings.push({ type: "info", title: TRANSLATIONS["library_warning"], desc: TRANSLATIONS["library_desc"], tip: TRANSLATIONS["library_tip"] });
  }
  if (mod.is_optimization) {
    mod.warnings.push({ type: "success", title: TRANSLATIONS["optimization_warning"], desc: TRANSLATIONS["optimization_desc"], tip: TRANSLATIONS["optimization_tip"] });
  }
  if (!mod.api_source) {
    mod.warnings.push({ type: "warning", title: TRANSLATIONS["not_found_warning"], desc: TRANSLATIONS["not_found_desc"], tip: TRANSLATIONS["not_found_tip"] });
  }
}

export async function fetchModrinthData(mod: ModInfo): Promise<void> {
  let project_type = 'mod';
  if ((mod as any).contentType === 'resourcepacks') project_type = 'resourcepack';
  if ((mod as any).contentType === 'shaderpacks') project_type = 'shader';

    // Clean up the query for better Modrinth matching
  let cleanQuery = mod.display_name
    .replace(/\.(jar|zip)$/i, '')
    .replace(/[-_+]/g, ' ')
    .replace(/\b(fabric|forge|quilt|mc|minecraft)\b/gi, '')
    .replace(/\b(1\.\d+(\.\d+)?)\b/g, '') // remove versions like 1.20.1
    .replace(/\b(v?\d+\.\d+(\.\d+)?)\b/gi, '') // remove generic versions
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!cleanQuery) cleanQuery = mod.display_name.replace(/[-_+]/g, ' ').trim();
  const query = encodeURIComponent(cleanQuery);
  try {
    const searchRes = await fetch(`https://api.modrinth.com/v2/search?query=${query}&limit=1&facets=[["project_type:${project_type}"]]`);
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.hits && data.hits.length > 0) {
        const project = data.hits[0];
        mod.display_name = project.title || mod.display_name;
        
        let desc = project.description || '';
        let body = '';
        
        if (project.slug) {
          const detailsRes = await fetch(`https://api.modrinth.com/v2/project/${project.slug}`);
          if (detailsRes.ok) {
            const details = await detailsRes.json();
            body = details.body || '';
            mod.downloads = details.downloads || 0;
          }
        }
        
        const fullText = `${desc} ${body}`;
        const cleanText = fullText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        mod.description = cleanText.substring(0, 600) || 'Описание отсутствует';
        if (!mod.icon_url) {
          mod.icon_url = project.icon_url || '';
        }
        mod.project_url = `https://modrinth.com/mod/${project.slug}`;
        mod.categories = project.categories || [];
        mod.categories_ru = mod.categories.map((c: string) => TRANSLATIONS[c.toLowerCase()] || c);
        mod.api_source = 'Modrinth';

        const worldgenCats = ["worldgen", "biomes", "terrain", "dimensions", "structures"];
        if (mod.categories.some((c: string) => worldgenCats.includes(c.toLowerCase()))) {
          mod.is_worldgen = true;
        }

        for (const pattern of WORLDGEN_KEYWORDS) {
          if (pattern.test(fullText)) {
            const safeIds = ["fabric-api", "fabric-language-kotlin", "lithium", "sodium", "iris", "ferritecore", "memoryleakfix", "modernfix", "spark", "servercore", "starlight", "krypton", "c2me", "noisium", "fastboot", "ksyxis", "connectivity", "threadtweak"];
            if (!safeIds.includes(mod.mod_id.toLowerCase())) {
              mod.is_worldgen = true;
              break;
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore fetch errors, just don't have Modrinth data
  }
}

export async function translateText(text: string): Promise<string> {
  if (!text || text.length < 3) return text;
  // If it already has cyrillic, skip
  if (/[а-яА-ЯЁё]/.test(text)) return text;

  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'en',
      tl: 'ru',
      dt: 't',
      q: text.substring(0, 500) // translate first 500 chars to save time/limits
    });
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      let translated = '';
      if (data && data[0]) {
        for (const sentence of data[0]) {
          if (sentence[0]) translated += sentence[0];
        }
      }
      return translated || text;
    }
  } catch (e) {
    // ignore translation errors
  }
  return text;
}

export function semverCompare(a: string, b: string): number {
  if (!a) return b ? -1 : 0;
  if (!b) return a ? 1 : 0;
  const pa = a.replace(/[^0-9.]/g, '').split('.').map(Number);
  const pb = b.replace(/[^0-9.]/g, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = isNaN(pa[i]) ? 0 : pa[i];
    const nb = isNaN(pb[i]) ? 0 : pb[i];
    if (na !== nb) return na - nb;
  }
  return 0;
}

export interface ModFabricRequirement {
  modName: string;
  modId: string;
  rawConstraint: string;
  extractedVersion: string;
}

export async function scanFabricRequirementsFromMods(modsDir: string): Promise<{
  maxRequiredVersion: string | null;
  requirements: ModFabricRequirement[];
}> {
  const requirements: ModFabricRequirement[] = [];
  if (!fs.existsSync(modsDir)) {
    return { maxRequiredVersion: null, requirements: [] };
  }

  try {
    const files = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));
    for (const file of files) {
      const filePath = path.join(modsDir, file);
      try {
        const data = await fs.promises.readFile(filePath);
        const zip = await JSZip.loadAsync(data);
        const modJsonFile = zip.file('fabric.mod.json');
        if (modJsonFile) {
          const content = await modJsonFile.async('string');
          const json = JSON.parse(content);
          const modName = json.name || json.id || file;
          const modId = json.id || file;

          if (json.depends && typeof json.depends === 'object') {
            const depKeys = ['fabricloader', 'fabric-loader', 'fabric', 'loader'];
            for (const key of depKeys) {
              const val = json.depends[key];
              if (val && typeof val === 'string' && val !== '*') {
                const match = val.match(/(\d+\.\d+(?:\.\d+)?)/);
                if (match) {
                  const extractedVersion = match[1];
                  requirements.push({
                    modName,
                    modId,
                    rawConstraint: val,
                    extractedVersion
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore single mod parse errors
      }
    }
  } catch (err) {
    console.error('Error scanning mods for fabric requirements:', err);
  }

  let maxRequiredVersion: string | null = null;
  for (const req of requirements) {
    if (!maxRequiredVersion || semverCompare(req.extractedVersion, maxRequiredVersion) > 0) {
      maxRequiredVersion = req.extractedVersion;
    }
  }

  return { maxRequiredVersion, requirements };
}
