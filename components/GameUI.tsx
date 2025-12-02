import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Player, GameState, Entity, Coordinates, ChatMessage } from '../types';
import { GameGuide } from './GameGuide';

interface GameUIProps {
  player: Player;
  otherPlayers: Player[];
  gameState: GameState;
  entities: Entity[];
  onEntityInteraction: (entity: Entity) => void;
  onRevivePlayer: (targetId: string) => void;
  currentPosition: Coordinates | null;
  mode: 'DEPLOY' | 'GAME';
  onMapReady: (map: L.Map) => void;
  onMockGPS?: () => void;
  peerId?: string;
  onExit?: () => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onUseItem: (item: 'food' | 'water' | 'medkit') => void;
}

export const GameUI: React.FC<GameUIProps> = ({ 
  player, 
  otherPlayers,
  gameState, 
  entities, 
  onEntityInteraction,
  onRevivePlayer,
  currentPosition,
  mode,
  onMapReady,
  onMockGPS,
  peerId,
  onExit,
  chatMessages,
  onSendChat,
  onUseItem
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const userMarker = useRef<L.CircleMarker | null>(null);
  const entityLayer = useRef<L.LayerGroup | null>(null);
  const playersLayer = useRef<L.LayerGroup | null>(null);
  const [showMockOption, setShowMockOption] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll Chat to bottom
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        zoomAnimation: true,
        fadeAnimation: true,
      }).setView([0, 0], 13);

      // CartoDB Dark Matter Tiles (Dark Theme)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(leafletMap.current);

      entityLayer.current = L.layerGroup().addTo(leafletMap.current);
      playersLayer.current = L.layerGroup().addTo(leafletMap.current);
      
      // Pass map instance back to parent
      onMapReady(leafletMap.current);
    }

    const resizeObserver = new ResizeObserver(() => {
      leafletMap.current?.invalidateSize();
    });

    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Timeout for Mock GPS Option
  useEffect(() => {
    if (!currentPosition) {
      const timer = setTimeout(() => setShowMockOption(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentPosition]);

  // Handle Player Position Updates
  useEffect(() => {
    if (!leafletMap.current || !currentPosition) return;
    
    const isFirstLoad = !userMarker.current;

    if (mode === 'GAME' || isFirstLoad) {
      leafletMap.current.setView([currentPosition.lat, currentPosition.lng], 18);
    }

    // Update Player Marker
    if (!userMarker.current) {
      userMarker.current = L.circleMarker([currentPosition.lat, currentPosition.lng], {
        radius: 8,
        fillColor: player.isDead ? '#ef4444' : '#0ea5e9', // Red if dead, Blue if alive
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(leafletMap.current);
    } else {
      userMarker.current.setLatLng([currentPosition.lat, currentPosition.lng]);
      userMarker.current.setStyle({ fillColor: player.isDead ? '#ef4444' : '#0ea5e9' });
    }
  }, [currentPosition, mode, player.isDead]);

  // Render Entities and Other Players
  useEffect(() => {
    if (!leafletMap.current || !entityLayer.current || !playersLayer.current) return;

    // 1. Entities
    entityLayer.current.clearLayers();
    entities.forEach(ent => {
      const distanceText = ent.distance ? `${Math.round(ent.distance)}m` : '';
      
      const marker = L.marker([ent.position.lat, ent.position.lng], {
        icon: L.divIcon({
          className: 'bg-transparent border-none',
          html: `
            <div class="flex flex-col items-center group cursor-pointer">
              <div class="text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] transition-transform group-hover:scale-125">${ent.icon}</div>
              <div class="text-[9px] text-white font-bold bg-black/60 px-1 rounded backdrop-blur-sm mt-[-4px] border border-white/10 shadow-sm">${distanceText}</div>
            </div>`,
          iconSize: [40, 50],
          iconAnchor: [20, 25]
        })
      });
      marker.on('click', () => onEntityInteraction(ent));
      marker.addTo(entityLayer.current!);
    });

    // 2. Base
    if (gameState.baseLocation) {
       L.marker([gameState.baseLocation.lat, gameState.baseLocation.lng], {
        icon: L.divIcon({
          className: 'bg-transparent border-none',
          html: `<div class="text-4xl drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse">⛺</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(entityLayer.current);
    }

    // 3. Other Players (Teammates)
    playersLayer.current.clearLayers();
    otherPlayers.forEach(p => {
      if (!p.position) return;
      const isDead = p.isDead;
      
      const marker = L.marker([p.position.lat, p.position.lng], {
        icon: L.divIcon({
          className: 'bg-transparent border-none',
          html: `
            <div class="flex flex-col items-center">
              <div class="text-xs bg-black/50 text-white px-1 rounded whitespace-nowrap mb-1">${p.name}</div>
              <div class="w-4 h-4 rounded-full border-2 border-white ${isDead ? 'bg-red-600 animate-bounce' : 'bg-green-500'} shadow-lg"></div>
              ${isDead ? '<div class="text-[10px] text-red-500 font-bold bg-black px-1 rounded mt-1">SOS</div>' : ''}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      });

      if (isDead) {
        marker.on('click', () => onRevivePlayer(p.id));
      }

      marker.addTo(playersLayer.current!);
    });

  }, [entities, onEntityInteraction, gameState.baseLocation, otherPlayers, onRevivePlayer]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-slate-950">
      
      {showGuide && <GameGuide onClose={() => setShowGuide(false)} />}

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-[400] p-4 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-cyan-400 font-bold text-xl tracking-tighter drop-shadow-md">99 NOITES</h1>
            <p className="text-white text-xs font-bold drop-shadow-md shadow-black">
              {mode === 'DEPLOY' ? 'DEPLOYMENT PHASE' : `DAY ${gameState.day} // ${gameState.isNight ? 'NIGHT' : 'OPS'}`}
            </p>
            {peerId && <p className="text-[10px] text-slate-500 font-mono pointer-events-auto select-all">ID: {peerId}</p>}
          </div>
          
          {/* Menu / Exit Buttons */}
          <div className="flex flex-col gap-2 pointer-events-auto items-end">
            <div className="flex gap-2">
               {mode === 'GAME' && (
                 <button 
                  onClick={() => setShowChat(!showChat)} 
                  className={`w-8 h-8 rounded-full border border-slate-600 hover:border-cyan-400 flex items-center justify-center ${showChat ? 'bg-cyan-900 text-white' : 'bg-slate-800 text-slate-400'}`}
                 >
                   <i className="fas fa-comment-alt text-xs"></i>
                   {chatMessages.length > 0 && !showChat && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                 </button>
               )}
               <button onClick={() => setShowGuide(true)} className="bg-slate-800 text-white w-8 h-8 rounded-full border border-slate-600 hover:border-cyan-400 flex items-center justify-center">
                 <i className="fas fa-question"></i>
               </button>
               {onExit && (
                 <button onClick={onExit} className="bg-slate-800 text-red-400 w-8 h-8 rounded-full border border-slate-600 hover:border-red-500 flex items-center justify-center">
                   <i className="fas fa-times"></i>
                 </button>
               )}
            </div>
            
            {mode === 'GAME' && (
              <div className="text-right mt-2">
                <div className={`text-2xl font-mono font-bold drop-shadow-md ${player.hp < 30 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                  {Math.round(player.hp)}% HP
                </div>
                <div className={`text-xs font-bold drop-shadow-md ${player.inventory.food === 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  HUNGER: {player.inventory.food > 0 ? 'OK' : 'CRITICAL'}
                </div>
                <div className={`text-xs font-bold drop-shadow-md ${player.temperature < 20 ? 'text-cyan-300 animate-bounce' : 'text-slate-200'}`}>
                  TEMP: {Math.round(player.temperature)}°C
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHAT OVERLAY */}
      {showChat && mode === 'GAME' && (
        <div className="absolute top-20 right-4 w-64 h-64 bg-slate-900/90 border border-slate-600 rounded flex flex-col z-[400] pointer-events-auto shadow-xl">
           <div className="p-2 border-b border-slate-700 font-bold text-xs text-cyan-400">RADIO FREQUENCY</div>
           <div className="flex-1 overflow-y-auto p-2 text-xs font-mono space-y-1">
             {chatMessages.map(msg => (
               <div key={msg.id} className="break-words">
                 <span className="text-slate-400">[{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]</span>{' '}
                 <span className="font-bold text-emerald-400">{msg.senderName}:</span>{' '}
                 <span className="text-white">{msg.text}</span>
               </div>
             ))}
             <div ref={chatEndRef}></div>
           </div>
           <form onSubmit={handleChatSubmit} className="p-2 border-t border-slate-700 flex gap-1">
             <input 
               className="flex-1 bg-black border border-slate-700 rounded px-1 text-xs text-white" 
               value={chatInput}
               onChange={e => setChatInput(e.target.value)}
               placeholder="Transmit..."
             />
             <button type="submit" className="bg-cyan-700 px-2 rounded text-xs">Send</button>
           </form>
        </div>
      )}

      {/* Radar List */}
      {mode === 'GAME' && !player.isDead && (
        <div className="absolute top-28 left-4 z-[400] flex flex-col gap-3 pointer-events-auto">
          {entities
            .filter(e => e.type !== 'BASE')
            .sort((a, b) => (a.distance || 999) - (b.distance || 999))
            .slice(0, 5)
            .map(ent => (
              <div key={ent.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => onEntityInteraction(ent)}
                  className="w-12 h-12 bg-slate-900/90 border border-slate-600 rounded-full flex items-center justify-center text-xl shadow-lg backdrop-blur hover:border-cyan-400 hover:scale-110 transition-all z-10"
                >
                  {ent.icon}
                </button>
                <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-r-md border-r border-y border-slate-700 font-mono shadow-md animate-in fade-in slide-in-from-left-2">
                  {ent.distance ? `${Math.round(ent.distance)}m` : 'Scanning...'}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Main Map Area */}
      <div className="flex-1 w-full h-full relative z-0">
        <div ref={mapRef} className="w-full h-full bg-slate-800 absolute inset-0" />
        
        {/* Waiting for GPS Overlay */}
        {!currentPosition && (
          <div className="absolute inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center text-cyan-500 p-6 text-center">
             <i className="fas fa-satellite-dish text-6xl mb-4 animate-bounce"></i>
             <div className="text-xl font-bold font-mono animate-pulse">ACQUIRING UPLINK...</div>
             <div className="text-xs text-slate-500 mt-2">WAITING FOR GPS SIGNAL</div>
             
             {showMockOption && onMockGPS && (
               <button 
                 onClick={onMockGPS}
                 className="mt-8 bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded text-xs animate-pulse hover:bg-red-800"
               >
                 ⚠ SIGNAL WEAK. BYPASS SECURITY?
               </button>
             )}
          </div>
        )}

        {/* Crosshair for Deployment */}
        {mode === 'DEPLOY' && currentPosition && (
          <div className="absolute inset-0 pointer-events-none z-[399] flex items-center justify-center">
             <div className="relative">
               <div className="w-12 h-12 border-2 border-cyan-500 rounded-full animate-pulse"></div>
               <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 -translate-x-1/2 -translate-y-1/2"></div>
               <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-cyan-400 text-xs font-bold whitespace-nowrap bg-black/50 px-2 rounded">
                 TARGET EPICENTER
               </div>
             </div>
          </div>
        )}
      </div>

      {/* Bottom HUD - Interactive Inventory */}
      {mode === 'GAME' && (
        <div className="absolute bottom-0 left-0 right-0 z-[400] bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 pb-8 pointer-events-auto">
          <div className="grid grid-cols-5 gap-2 mb-2">
             <div className="bg-slate-800 p-2 rounded text-center shadow opacity-75">
               <div className="text-[10px] text-slate-400">WOOD</div>
               <div className="font-bold text-amber-600">{player.inventory.wood}</div>
             </div>
             
             <button 
               onClick={() => onUseItem('food')}
               disabled={player.inventory.food <= 0}
               className="bg-slate-800 p-2 rounded text-center shadow active:scale-95 transition-transform hover:bg-slate-700 disabled:opacity-50"
             >
               <div className="text-[10px] text-slate-400">FOOD (EAT)</div>
               <div className="font-bold text-red-400">{player.inventory.food}</div>
             </button>

             <button 
               onClick={() => onUseItem('water')}
               disabled={player.inventory.water <= 0}
               className="bg-slate-800 p-2 rounded text-center shadow active:scale-95 transition-transform hover:bg-slate-700 disabled:opacity-50"
             >
               <div className="text-[10px] text-slate-400">H2O (DRINK)</div>
               <div className="font-bold text-blue-400">{player.inventory.water}</div>
             </button>

             <button 
               onClick={() => onUseItem('medkit')}
               disabled={player.inventory.medkit <= 0}
               className="bg-slate-800 p-2 rounded text-center border border-emerald-900 shadow active:scale-95 transition-transform hover:bg-slate-700 disabled:opacity-50"
             >
               <div className="text-[10px] text-slate-400">MED (HEAL)</div>
               <div className="font-bold text-emerald-400">{player.inventory.medkit}</div>
             </button>

             <div className="bg-slate-800 p-2 rounded text-center border border-purple-900 shadow opacity-75">
               <div className="text-[10px] text-slate-400">LASER</div>
               <div className="font-bold text-purple-400">{player.inventory.laser}</div>
             </div>
          </div>
          
          {gameState.baseLocation && (
            <div className="w-full text-center">
              <span className="text-xs font-mono text-slate-500">
                DISTANCE TO BASE: <span className="text-white">{Math.round(currentPosition && gameState.baseLocation ? L.latLng(currentPosition).distanceTo(gameState.baseLocation) : 0)}m</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};