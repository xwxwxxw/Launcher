import React, { useState, useEffect } from 'react';
import { X, Folder, FolderPlus, ChevronRight, HardDrive, Layout, RefreshCw, Monitor, ArrowLeft, Home } from 'lucide-react';

interface FileBrowserModalProps {
  onClose: () => void;
  onSelect: (path: string) => void;
  title?: string;
  initialPath?: string;
}

interface DirNode {
  name: string;
  isDir: boolean;
  children: Record<string, DirNode>;
}

const initialTree: DirNode = {
  name: 'C:',
  isDir: true,
  children: {
    'Users': {
      name: 'Users',
      isDir: true,
      children: {
        'Admin': {
          name: 'Admin',
          isDir: true,
          children: {
            'Desktop': { name: 'Desktop', isDir: true, children: {} },
            'Downloads': { name: 'Downloads', isDir: true, children: {} },
            'Documents': { name: 'Documents', isDir: true, children: {} },
            'AppData': {
              name: 'AppData',
              isDir: true,
              children: {
                'Roaming': {
                  name: 'Roaming',
                  isDir: true,
                  children: {
                    '.minecraft': {
                      name: '.minecraft',
                      isDir: true,
                      children: {
                        'mods': { name: 'mods', isDir: true, children: {} },
                        'saves': { name: 'saves', isDir: true, children: {} },
                        'resourcepacks': { name: 'resourcepacks', isDir: true, children: {} },
                        'profiles': { name: 'profiles', isDir: true, children: {} }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    'Games': {
      name: 'Games',
      isDir: true,
      children: {
        'Minecraft': { name: 'Minecraft', isDir: true, children: {} },
        'profiles': { name: 'profiles', isDir: true, children: {} }
      }
    },
    'Program Files': {
      name: 'Program Files',
      isDir: true,
      children: {
        'Java': {
          name: 'Java',
          isDir: true,
          children: {
            'jdk-17.0.8': {
              name: 'jdk-17.0.8',
              isDir: true,
              children: {
                'bin': { name: 'bin', isDir: true, children: {} }
              }
            },
            'jdk-21': {
              name: 'jdk-21',
              isDir: true,
              children: {
                'bin': { name: 'bin', isDir: true, children: {} }
              }
            }
          }
        }
      }
    }
  }
};

export default function FileBrowserModal({ 
  onClose, 
  onSelect, 
  title = 'Выбор папки', 
  initialPath = '' 
}: FileBrowserModalProps) {
  // Parse initial path into segments
  const parsePathToSegments = (p: string): string[] => {
    if (!p) return ['C:', 'Users', 'Admin', 'AppData', 'Roaming', '.minecraft'];
    // clean windows formatting
    let cleaned = p.replace(/\//g, '\\');
    if (cleaned.startsWith('.\\')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('.')) cleaned = cleaned.substring(1);
    
    const segments = cleaned.split('\\').filter(Boolean);
    if (segments.length === 0 || segments[0] !== 'C:') {
      return ['C:', ...segments];
    }
    return segments;
  };

  const [pathSegments, setPathSegments] = useState<string[]>(() => parsePathToSegments(initialPath));
  const [tree, setTree] = useState<DirNode>(() => {
    const saved = localStorage.getItem('simulated_file_system');
    return saved ? JSON.parse(saved) : initialTree;
  });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Save filesystem on update
  const saveFileSystem = (newTree: DirNode) => {
    setTree(newTree);
    localStorage.setItem('simulated_file_system', JSON.stringify(newTree));
  };

  // Traverse tree to get current node
  const getCurrentNode = (currentTree: DirNode, segments: string[]): DirNode | null => {
    let curr = currentTree;
    for (let i = 1; i < segments.length; i++) {
      if (curr.children && curr.children[segments[i]]) {
        curr = curr.children[segments[i]];
      } else {
        return null;
      }
    }
    return curr;
  };

  const currentNode = getCurrentNode(tree, pathSegments) || tree;

  const currentFolderPathString = pathSegments.join('\\');

  const handleFolderClick = (folderName: string) => {
    setPathSegments([...pathSegments, folderName]);
    setSelectedItem(null);
  };

  const handleGoBack = () => {
    if (pathSegments.length > 1) {
      setPathSegments(pathSegments.slice(0, -1));
      setSelectedItem(null);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    // Clone tree
    const newTree = JSON.parse(JSON.stringify(tree));
    let curr = newTree;
    for (let i = 1; i < pathSegments.length; i++) {
      curr = curr.children[pathSegments[i]];
    }

    if (!curr.children) curr.children = {};
    curr.children[newFolderName] = {
      name: newFolderName,
      isDir: true,
      children: {}
    };

    saveFileSystem(newTree);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleSelectCurrent = () => {
    let finalPath = currentFolderPathString;
    if (selectedItem) {
      finalPath = `${currentFolderPathString}\\${selectedItem}`;
    }
    onSelect(finalPath);
    onClose();
  };

  // Sidebar Shortcut links
  const shortcuts = [
    { name: '.minecraft', path: ['C:', 'Users', 'Admin', 'AppData', 'Roaming', '.minecraft'] },
    { name: 'Рабочий стол', path: ['C:', 'Users', 'Admin', 'Desktop'] },
    { name: 'Загрузки', path: ['C:', 'Users', 'Admin', 'Downloads'] },
    { name: 'Папка Java', path: ['C:', 'Program Files', 'Java'] },
    { name: 'Локальный диск (C:)', path: ['C:'] }
  ];

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl w-full max-w-3xl h-[550px] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Title Bar Windows Style */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-950/40 relative z-10">
          <div className="flex items-center gap-3">
            <Layout className="text-blue-500" size={18} />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{title}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Top Explorer Controls Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/40 bg-zinc-900/20 gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGoBack}
              disabled={pathSegments.length <= 1}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              title="Назад"
            >
              <ArrowLeft size={16} />
            </button>
            <button 
              onClick={() => setPathSegments(['C:'])}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              title="В начало"
            >
              <Home size={16} />
            </button>
          </div>

          {/* Breadcrumbs Input Field */}
          <div className="flex-1 bg-zinc-950/40 border border-zinc-800 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-nowrap scrollbar-none shadow-inner">
            <HardDrive size={12} className="text-zinc-500 shrink-0" />
            {pathSegments.map((seg, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-zinc-600 font-sans mx-0.5">&gt;</span>}
                <button 
                  onClick={() => setPathSegments(pathSegments.slice(0, idx + 1))}
                  className="hover:text-white hover:underline transition-all"
                >
                  {seg}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* New Folder trigger */}
          <button 
            onClick={() => setShowNewFolderInput(true)}
            className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 border border-blue-500/20 rounded-lg text-xs font-semibold transition-all"
          >
            <FolderPlus size={14} />
            <span>Новая папка</span>
          </button>
        </div>

        {/* Explorer Content split sidebar & file-grid */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <div className="w-56 border-r border-zinc-800/40 bg-zinc-950/20 p-4 overflow-y-auto space-y-5">
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-2 px-2.5">Быстрый доступ</p>
              <div className="space-y-1.5">
                {shortcuts.map((sc, idx) => {
                  const isCurrent = pathSegments.join('\\') === sc.path.join('\\');
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setPathSegments(sc.path);
                        setSelectedItem(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${
                        isCurrent 
                          ? 'bg-blue-500/15 border border-blue-500/25 text-blue-400' 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                      }`}
                    >
                      <Folder size={14} className={isCurrent ? "text-blue-400" : "text-zinc-500"} />
                      <span className="truncate">{sc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Main Grid */}
          <div className="flex-1 p-6 overflow-y-auto relative bg-[#0e0e10]">
            
            {showNewFolderInput && (
              <form onSubmit={handleCreateFolder} className="mb-6 p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 flex items-center gap-3">
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Имя новой папки..."
                  className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                  required
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors">
                  Создать
                </button>
                <button type="button" onClick={() => setShowNewFolderInput(false)} className="text-zinc-400 hover:text-white text-xs px-2.5 font-semibold">
                  Отмена
                </button>
              </form>
            )}

            {/* Simulated Folders View */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {currentNode.children && Object.keys(currentNode.children).length > 0 ? (
                Object.keys(currentNode.children).map((key) => {
                  const item = currentNode.children[key];
                  const isSelected = selectedItem === key;
                  return (
                    <div 
                      key={key}
                      onClick={() => setSelectedItem(isSelected ? null : key)}
                      onDoubleClick={() => handleFolderClick(key)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center group cursor-pointer ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/10 shadow-[0_4px_15px_rgba(59,130,246,0.1)]' 
                          : 'border-zinc-800/40 bg-zinc-900/20 hover:border-zinc-700/80 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className={`p-3.5 rounded-xl border mb-3 transition-transform duration-200 group-hover:scale-110 shadow-inner ${
                        isSelected ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-yellow-500/80'
                      }`}>
                        <Folder size={24} />
                      </div>
                      <span className={`text-[11px] font-bold tracking-tight line-clamp-2 max-w-full px-1 ${
                        isSelected ? 'text-blue-400 font-extrabold' : 'text-zinc-300'
                      }`}>
                        {item.name}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-zinc-600">
                  <Folder size={40} className="stroke-[1.2] mb-3 text-zinc-700" />
                  <p className="text-xs">Эта папка пуста</p>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/60 bg-zinc-950/40 relative z-10">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">Выбранный путь:</span>
            <span className="text-[11px] font-mono text-zinc-300 mt-1 truncate max-w-[400px]">
              {selectedItem ? `${currentFolderPathString}\\${selectedItem}` : currentFolderPathString}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-zinc-700 active:scale-95"
            >
              Отмена
            </button>
            <button 
              onClick={handleSelectCurrent}
              className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
            >
              Выбрать папку
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
