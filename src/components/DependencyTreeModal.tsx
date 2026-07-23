import { useEffect, useRef, useState } from 'react';
import { ModInfo } from '../types';
import { X, Network, AlertTriangle } from 'lucide-react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  group: 'selected' | 'dependency' | 'dependent' | 'missing' | 'other';
  radius: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: 'required' | 'optional';
}

export default function DependencyTreeModal({ mod, allMods, onClose }: { mod: ModInfo, allMods?: ModInfo[], onClose: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, Node>();

    // Add selected mod
    const selectedNode: Node = { id: mod.mod_id || mod.name, label: mod.display_name, group: 'selected', radius: 30 };
    nodes.push(selectedNode);
    nodeMap.set(selectedNode.id, selectedNode);

    // Track missing mods
    const missingMods = new Set<string>();

    // Process dependencies
    if (mod.depends) {
      const IGNORED_DEPS = [
        'minecraft', 'java', 'fabricloader', 'fabric', 'quiltloader', 'yarn', 'loom', 'fabric-api-base',
        'cloth-config', 'cloth-config-2', 'cloth_config', 'architectury', 'yet-another-config-lib', 'yet_another_config_lib', 'yacl', 'cardinal-components', 'cardinal-components-base', 'cardinal-components-entity', 'kirin', 'kirin-api', 'modmenu', 'com_typesafe_config', 'typesafe-config', 'org_jetbrains_annotations', 'playerabilitylib', 'trinkets', 'geckolib', 'omega-config', 'fzzy_config', 'pehkui', 'bclib', 'spectrelib', 'completeconfig', 'libgui', 'libip', 'org_antlr_antlr4_runtime',
        'fabric-rendering-v1', 'fabric-lifecycle-events-v1', 'fabric-keybindings-v0', 'fabric-screen-api-v1', 'fabric-resource-loader-v0', 'fabric-networking-api-v1', 'fabric-content-registries-v0', 'fabric-item-api-v1', 'fabric-models-v0', 'fabric-renderer-api-v1', 'fabric-mining-level-api-v1', 'fabric-object-builder-api-v1', 'fabric-transitive-access-wideners-v1', 'fabric-command-api-v1', 'fabric-command-api-v2', 'fabric-commands-v0', 'fabric-registry-sync-v0', 'fabric-loot-api-v2', 'fabric-loot-tables-v1', 'fabric-recipe-api-v1', 'fabric-sound-api-v1', 'fabric-dimensions-v1', 'fabric-biome-api-v1', 'fabric-game-rule-api-v1', 'fabric-particles-v1', 'fabric-events-interaction-v0', 'fabric-containers-v0', 'fabric-screen-handler-api-v1', 'fabric-transfer-api-v1', 'fabric-rendering-fluids-v1', 'fabric-rendering-data-attachment-v1', 'fabric-convention-tags-v1', 'fabric-message-api-v1', 'fabric-item-group-api-v1'
      ];
      mod.depends.forEach(depId => {
        const cleanDepId = depId.trim().toLowerCase();
        if (IGNORED_DEPS.includes(cleanDepId)) return;
        
        const foundMod = allMods?.find(m => m.mod_id === depId || m.name === depId);
        let depNode = nodeMap.get(depId);
        
        if (!depNode) {
          if (foundMod) {
            depNode = { id: depId, label: foundMod.display_name, group: 'dependency', radius: 20 };
          } else {
            depNode = { id: depId, label: depId, group: 'missing', radius: 20 };
            missingMods.add(depId);
          }
          nodes.push(depNode);
          nodeMap.set(depId, depNode);
        }
        
        links.push({ source: selectedNode.id, target: depId, type: 'required' });
      });
    }

    // Find dependents
    if (allMods) {
      allMods.forEach(otherMod => {
        if (otherMod.mod_id === mod.mod_id) return;
        
        if (otherMod.depends?.includes(mod.mod_id) || otherMod.depends?.includes(mod.name)) {
          let dependentNode = nodeMap.get(otherMod.mod_id || otherMod.name);
          if (!dependentNode) {
            dependentNode = { 
              id: otherMod.mod_id || otherMod.name, 
              label: otherMod.display_name, 
              group: 'dependent', 
              radius: 20 
            };
            nodes.push(dependentNode);
            nodeMap.set(dependentNode.id, dependentNode);
          }
          links.push({ source: dependentNode.id, target: selectedNode.id, type: 'required' });
        }
      });
    }

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
      }))
      .append("g");

    // Add arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#52525b") // zinc-600
      .attr("d", "M0,-5L10,0L0,5");
      
    svg.select("defs").append("marker")
      .attr("id", "arrow-missing")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#ef4444") // red-500
      .attr("d", "M0,-5L10,0L0,5");

    const g = svg.append("g");

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (d as Node).radius + 10));

    const link = g.append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => {
        const targetNode = nodes.find(n => n.id === d.target || (d.target as Node).id === n.id);
        return targetNode?.group === 'missing' ? '#ef4444' : '#52525b';
      })
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", d => {
        const targetNode = nodes.find(n => n.id === d.target || (d.target as Node).id === n.id);
        return targetNode?.group === 'missing' ? "5,5" : "none";
      })
      .attr("marker-end", d => {
        const targetNode = nodes.find(n => n.id === d.target || (d.target as Node).id === n.id);
        return targetNode?.group === 'missing' ? "url(#arrow-missing)" : "url(#arrow)";
      });

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Colors mapping
    const getColor = (group: string) => {
      switch (group) {
        case 'selected': return '#3b82f6'; // purple-500
        case 'dependency': return '#10b981'; // emerald-500
        case 'dependent': return '#a855f7'; // purple-500
        case 'missing': return '#ef4444'; // red-500
        default: return '#71717a'; // zinc-500
      }
    };

    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => getColor(d.group))
      .attr("stroke", "#18181b") // zinc-900
      .attr("stroke-width", 3)
      .attr("class", "transition-colors cursor-grab active:cursor-grabbing");

    node.append("text")
      .attr("dx", d => d.radius + 5)
      .attr("dy", 4)
      .text(d => d.label)
      .attr("fill", "#e4e4e7") // zinc-200
      .attr("font-size", d => d.group === 'selected' ? "14px" : "11px")
      .attr("font-weight", d => d.group === 'selected' ? "bold" : "normal")
      .attr("class", "pointer-events-none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [mod, allMods]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-[#09090b] border border-zinc-800/60 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-purple-500/10 blur-[80px] pointer-events-none rounded-full"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/60 bg-zinc-900/30 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-purple-400">
              <Network size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-0.5">Граф зависимостей</p>
              <h2 className="text-lg font-bold text-white">{mod.display_name}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Legend */}
            <div className="flex items-center gap-4 bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800/50 hidden md:flex">
               <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                 <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Выбран
               </div>
               <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Зависимость
               </div>
               <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                 <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Использует
               </div>
               <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                 <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Отсутствует
               </div>
            </div>
            
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative z-10 flex flex-col md:flex-row">
          <div className="flex-1 h-full relative" ref={containerRef}>
            <svg ref={svgRef} className="absolute inset-0 w-full h-full cursor-move" />
          </div>
          
          <div className="w-full md:w-64 h-full border-l border-zinc-800/60 bg-zinc-900/20 p-5 overflow-y-auto hidden md:block">
            <h3 className="font-bold text-[11px] uppercase tracking-widest text-zinc-400 mb-4">Информация</h3>
            <p className="text-sm text-zinc-300 mb-6">{mod.description_ru || mod.description}</p>
            
            {(!mod.depends || mod.depends.length === 0) && (
              <p className="text-xs text-zinc-500 italic">Нет явных зависимостей.</p>
            )}

            {mod.depends && mod.depends.length > 0 && (
              <div className="mt-4">
                <h4 className="font-bold text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Требуемые моды:</h4>
                <div className="space-y-2">
                  {mod.depends.map(dep => {
                    const found = allMods?.find(m => m.mod_id === dep || m.name === dep);
                    return (
                      <div key={dep} className="flex items-center gap-2">
                        {found ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        ) : (
                          <AlertTriangle size={12} className="text-red-500" />
                        )}
                        <span className={`text-xs ${found ? 'text-zinc-300' : 'text-red-400 line-through'}`}>{dep}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
