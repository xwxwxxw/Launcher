export interface ModInfo {
  profile_id?: string;
  enabled?: boolean;
  path: string;
  name: string;
  mod_id: string;
  display_name: string;
  description: string;
  description_ru: string;
  environment: string;
  depends: string[];
  is_worldgen: boolean;
  is_client: boolean;
  is_server: boolean;
  is_heavy: boolean;
  is_library: boolean;
  is_optimization: boolean;
  warnings: Array<{ type: string; title: string; desc: string; tip: string }>;
  icon_url: string;
  project_url: string;
  categories: string[];
  categories_ru: string[];
  downloads: number;
  api_source: string;
  mod_loader?: string;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  game_version: string;
  mod_loader: 'Vanilla' | 'Fabric' | 'Forge';
  mod_path: string;
  created_at: number;
  is_active: boolean;
  ram_mb: number;
  java_path?: string;
  minecraft_path?: string;
  syncSource?: 'gdrive';
  gdriveFolderId?: string;
  gdriveFolderName?: string;
  gdriveToken?: string;
  last_sync_tag?: string;
  is_favorite?: boolean;
  stats?: {
    totalPlayTimeMs: number;
    lastLaunchTime: number;
    launchCount: number;
  };
}
