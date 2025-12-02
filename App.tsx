import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, ClassType, GameState, Entity, EntityType, Coordinates, ENTITY_CONFIG, NetworkPacket, ChatMessage } from './types';
import { calculateDistance, generateRandomOffset, getRandomId } from './utils/geoUtils';
import { SetupScreen } from './components/SetupScreen';
import { GameUI } from './components/GameUI';
import { EncounterModal } from './components/EncounterModal';
import { BaseDashboard } from './components/BaseDashboard';
import { generateNightEvent } from './services/geminiService';
import { audioService } from './services/audioService';
import { p2pService } from './services/p2pService';
import L from 'leaflet';

type AppPhase = 'SETUP' | 'DEPLOY' | 'GAME';
const SAVE_KEY = '99noites_save_v2';

const App: React.FC = () => {
  // --- STATE ---
  const [phase, setPhase] = useState<AppPhase>('SETUP');
  const [activeEncounter, setActiveEncounter] = useState<Entity | null>(null);
  const [showBase, setShowBase] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Game Settings
  const [spawnRadius, setSpawnRadius] = useState(300);

  // Multiplayer State
  const [isHost, setIsHost] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [hostId, setHostId] = useState<string>('');
  const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [player, setPlayer] = useState<Player>({
    id: 'p1',
    name: '',
    classType: ClassType.SCOUT,
    hp: 100,
    maxHp: 100,
    energy: 100,
    maxEnergy: 100,
    temperature: 98,
    isDead: false,
    inventory: { wood: 0, food: 3, water: 3, medkit: 0, laser: 0, childrenSaved: 0 }
  });

  const [gameState, setGameState] = useState<GameState>({
    day: 1,
    isNight: false,
    baseLevel: 1,
    baseHealth: 100,
    baseMaxHealth: 100,
    baseLocation: null,
    logs: ["System Initialized...", "Awaiting Deployment..."]
  });

  const [currentPos, setCurrentPos] = useState<Coordinates | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);

  // --- PERSISTENCE ---
  const saveGame = useCallback(() => {
    if (phase === 'GAME' && gameState.baseLocation && !isHost) {
       // Only save local player stats, Host handles world state
      const saveData = {
        player,
        lastPosition: currentPos,
        timestamp: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }
  }, [player, gameState, phase, currentPos, isHost]);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(saveGame, 30000);
    return () => clearInterval(interval);
  }, [saveGame]);

  const loadGame = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPlayer(data.player);
        if (data.lastPosition) {
          setCurrentPos(data.lastPosition);
        }
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  };

  const hasSave = !!localStorage.getItem(SAVE_KEY);

  // --- GPS ---
  useEffect(() => {
    if (phase === 'SETUP') return;
    if (!navigator.geolocation) {
      alert("GPS Required!");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos(coords);
        setPlayer(prev => ({ ...prev, position: coords }));
        
        // Immediate distance update for responsiveness
        setEntities(prev => prev.map(e => ({
          ...e,
          distance: calculateDistance(coords, e.position)
        })));
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [phase]);

  // --- MULTIPLAYER HANDLERS ---
  const handleNetworkData = useCallback((packet: NetworkPacket) => {
    switch (packet.type) {
      case 'HELLO':
        // New player joined. If I am host, send them the world.
        if (isHost) {
          const worldPacket: NetworkPacket = {
            type: 'WORLD_UPDATE',
            senderId: peerId,
            payload: { gameState, entities }
          };
          p2pService.sendTo(packet.senderId, worldPacket);
        }
        break;
      
      case 'PLAYER_UPDATE':
        // Update other players list
        setOtherPlayers(prev => {
          const filtered = prev.filter(p => p.id !== packet.senderId);
          return [...filtered, packet.payload];
        });
        break;

      case 'WORLD_UPDATE':
        // Host sent new world state
        if (!isHost) {
          setGameState(packet.payload.gameState);
          setEntities(packet.payload.entities);
        }
        break;

      case 'REVIVE_REQUEST':
        // Someone revived me!
        if (packet.payload.targetId === player.id) {
          setPlayer(prev => ({ ...prev, isDead: false, hp: 50 }));
          audioService.playCollect();
        }
        break;
      
      case 'CHAT':
        setChatMessages(prev => [...prev, packet.payload]);
        audioService.playTone(800, 'sine', 0.05); // Chat beep
        break;
    }
  }, [isHost, gameState, entities, peerId, player.id]);

  useEffect(() => {
    // Broadcast my state every 2 seconds
    if (phase === 'GAME') {
      const interval = setInterval(() => {
        const packet: NetworkPacket = {
          type: 'PLAYER_UPDATE',
          senderId: p2pService.myId,
          payload: { ...player, position: currentPos }
        };
        p2pService.broadcast(packet);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, player, currentPos]);

  // --- SPAWNING LOGIC ---
  const spawnEntities = (center: Coordinates) => {
    // Only HOST spawns entities
    const newEntities: Entity[] = [];
    const count = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let type: EntityType = EntityType.RESOURCE_WOOD;

      // Rare Spawn Logic
      if (rand < 0.02) type = EntityType.ENEMY_ALIEN; // 2%
      else if (rand < 0.05) type = EntityType.MISSION_CHILD; // 3%
      else if (rand < 0.10) type = EntityType.RESOURCE_MEDKIT; // 5%
      else if (rand < 0.20) type = EntityType.ENEMY_ALPHA; // 10%
      else if (rand < 0.40) type = EntityType.ENEMY_WOLF;
      else if (rand < 0.60) type = EntityType.RESOURCE_FOOD;
      else if (rand < 0.80) type = EntityType.RESOURCE_WATER;
      else type = EntityType.RESOURCE_WOOD;

      newEntities.push({
        id: getRandomId(),
        type: type,
        // Use configured spawnRadius
        position: generateRandomOffset(center, 50 + Math.random() * spawnRadius),
        name: ENTITY_CONFIG[type].name,
        icon: ENTITY_CONFIG[type].icon,
        health: ENTITY_CONFIG[type].hp,
        maxHealth: ENTITY_CONFIG[type].hp
      });
    }
    
    // Broadcast new entities if Host
    if (isHost) {
      setEntities(prev => {
        const next = [...prev, ...newEntities];
        p2pService.broadcast({
          type: 'WORLD_UPDATE',
          senderId: peerId,
          payload: { gameState, entities: next }
        });
        return next;
      });
    } else {
       setEntities(prev => [...prev, ...newEntities]);
    }
  };

  // --- GAME LOOP ---
  useEffect(() => {
    if (phase !== 'GAME' || !currentPos || player.isDead) return;

    const interval = setInterval(() => {
      // 2. Survival Logic
      setPlayer(prev => {
        const inBase = gameState.baseLocation && calculateDistance(currentPos, gameState.baseLocation) < 50;
        
        let newEnergy = Math.min(prev.maxEnergy, prev.energy + (inBase ? 0.5 : 0.05)); // Energy regen
        
        // Decay
        let foodChange = -0.02;
        
        let newTemp = prev.temperature;
        if (!inBase) newTemp -= 0.1;
        else newTemp += 0.5;
        newTemp = Math.max(0, Math.min(100, newTemp));

        // Damage from stats
        let hpChange = 0;
        if (prev.inventory.food <= 0) { hpChange -= 0.5; foodChange = 0; }
        if (prev.inventory.water <= 0) { hpChange -= 0.5; }
        if (newTemp < 15) hpChange -= 1;

        let newHp = prev.hp + hpChange;
        
        if (newHp <= 0) {
           return { ...prev, hp: 0, isDead: true };
        }

        return { ...prev, hp: newHp, temperature: newTemp, energy: newEnergy };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentPos, gameState.baseLocation, player.isDead]);

  // --- ACTIONS ---
  const handleStartSetup = (name: string, classType: ClassType, mode: 'SINGLE' | 'HOST' | 'JOIN', hId?: string, radius: number = 300) => {
    setSpawnRadius(radius);
    // Initialize P2P
    p2pService.initialize(
      (id) => {
         setPeerId(id);
         setPlayer(prev => ({ ...prev, id: id, name, classType }));
         
         if (mode === 'HOST' || mode === 'SINGLE') {
           setIsHost(true);
           setPhase('DEPLOY');
         } else if (mode === 'JOIN' && hId) {
           setIsHost(false);
           setHostId(hId);
           p2pService.connectToPeer(hId);
           // Send Hello to host
           setTimeout(() => {
              p2pService.sendTo(hId, { type: 'HELLO', senderId: id, payload: {} });
           }, 1000);
           setPhase('GAME'); // Skip deploy, sync will update map
         }
      },
      handleNetworkData
    );
  };

  const handleEstablishBase = () => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    const baseCoords: Coordinates = { lat: center.lat, lng: center.lng };

    const newState = {
      ...gameState,
      baseLocation: baseCoords,
      logs: [...gameState.logs, `Base established at ${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)}`]
    };

    setGameState(newState);
    spawnEntities(baseCoords);
    setPhase('GAME');
    audioService.playCollect();

    if (isHost) {
      p2pService.broadcast({
        type: 'WORLD_UPDATE',
        senderId: peerId,
        payload: { gameState: newState, entities }
      });
    }
  };

  const handleInteract = (entity: Entity) => {
    setActiveEncounter(entity);
  };

  const handleUseDrone = (cost: number) => {
    if (player.energy >= cost) {
      setPlayer(prev => ({...prev, energy: prev.energy - cost}));
      return true;
    }
    return false;
  };

  const handleUseItem = (item: 'food' | 'water' | 'medkit') => {
    setPlayer(prev => {
      const inv = {...prev.inventory};
      let newHp = prev.hp;
      let newEnergy = prev.energy;
      
      if (item === 'food' && inv.food > 0) {
        inv.food--;
        // Restores some HP and prevents hunger damage for a while implicitly by having food
        newHp = Math.min(prev.maxHp, prev.hp + 5);
        audioService.playCollect();
      } else if (item === 'water' && inv.water > 0) {
        inv.water--;
        newEnergy = Math.min(prev.maxEnergy, prev.energy + 20);
        audioService.playCollect();
      } else if (item === 'medkit' && inv.medkit > 0) {
        inv.medkit--;
        const healAmount = prev.classType === ClassType.MEDIC ? 50 : 25;
        newHp = Math.min(prev.maxHp, prev.hp + healAmount);
        audioService.playCollect();
      }

      return { ...prev, inventory: inv, hp: newHp, energy: newEnergy };
    });
  };

  const handleSendChat = (text: string) => {
    const msg: ChatMessage = {
      id: getRandomId(),
      senderName: player.name,
      text,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, msg]);
    
    // Broadcast
    const packet: NetworkPacket = {
      type: 'CHAT',
      senderId: peerId,
      payload: msg
    };
    p2pService.broadcast(packet);
  };

  const resolveEncounter = (entityId: string, win: boolean, loot: any) => {
    setActiveEncounter(null);
    if (win) {
      const newEntities = entities.filter(e => e.id !== entityId);
      setEntities(newEntities);
      
      // Sync removal
      if (isHost) {
         p2pService.broadcast({ type: 'WORLD_UPDATE', senderId: peerId, payload: { gameState, entities: newEntities }});
      }

      if (loot) {
        setPlayer(prev => {
          const inv = { ...prev.inventory };
          if (loot.type === EntityType.RESOURCE_WOOD) inv.wood += loot.amount;
          if (loot.type === EntityType.RESOURCE_FOOD) inv.food += loot.amount;
          if (loot.type === EntityType.RESOURCE_WATER) inv.water += loot.amount;
          if (loot.type === EntityType.RESOURCE_MEDKIT) inv.medkit += loot.amount;
          if (loot.type === EntityType.ITEM_LASER) inv.laser += loot.amount;
          if (loot.type === EntityType.MISSION_CHILD) inv.childrenSaved += 1;
          
          if (loot.type === 'LOOT') inv.food += 1; // Generic loot
          
          if (loot.usedLaser) inv.laser = Math.max(0, inv.laser - 1);
          
          return { ...prev, inventory: inv };
        });
      }
    }
  };

  const handleRevivePlayer = (targetId: string) => {
     // Must be close
     const target = otherPlayers.find(p => p.id === targetId);
     if (target && target.position && currentPos) {
        const dist = calculateDistance(currentPos, target.position);
        if (dist < 15) {
           if (player.inventory.medkit > 0) {
              setPlayer(prev => ({...prev, inventory: {...prev.inventory, medkit: prev.inventory.medkit - 1}}));
              p2pService.broadcast({
                 type: 'REVIVE_REQUEST',
                 senderId: peerId,
                 payload: { targetId }
              });
              audioService.playCollect();
           } else {
             alert("Need Medkit to revive!");
           }
        } else {
           alert("Too far to revive!");
        }
     }
  };

  const handleBaseUpgrade = () => {
    const cost = gameState.baseLevel * 5;
    if (player.inventory.wood >= cost) {
      setPlayer(prev => ({
        ...prev,
        inventory: { ...prev.inventory, wood: prev.inventory.wood - cost }
      }));
      
      const newState = {
        ...gameState,
        baseLevel: gameState.baseLevel + 1,
        baseMaxHealth: gameState.baseMaxHealth + 50,
        baseHealth: gameState.baseMaxHealth + 50
      };
      setGameState(newState);
      audioService.playCollect();
      
      if (isHost) {
        p2pService.broadcast({ type: 'WORLD_UPDATE', senderId: peerId, payload: { gameState: newState, entities }});
      }
    }
  };

  const togglePhase = async () => {
    // Only host controls time
    if (!isHost) {
      alert("Only the Host can advance time.");
      return;
    }

    if (gameState.isNight) {
      // Switch to Day
      const newState = { ...gameState, isNight: false, day: gameState.day + 1 };
      setGameState(newState);
      if (gameState.baseLocation) spawnEntities(gameState.baseLocation);
      
      p2pService.broadcast({ type: 'WORLD_UPDATE', senderId: peerId, payload: { gameState: newState, entities }});

    } else {
      // Switch to Night
      const narrative = await generateNightEvent(gameState.day, gameState.baseHealth, player.hp < 50 ? 'Injured' : 'Healthy');
      
      const defense = gameState.baseLevel * 10;
      const attack = Math.floor(Math.random() * 50) + (gameState.day * 5);
      const dmg = Math.max(0, attack - defense);
      
      const newState = {
        ...gameState,
        isNight: true,
        baseHealth: Math.max(0, gameState.baseHealth - dmg),
        logs: [narrative, `Base took ${dmg} damage.`, ...gameState.logs]
      };
      setGameState(newState);
      setShowBase(true);
      
      p2pService.broadcast({ type: 'WORLD_UPDATE', senderId: peerId, payload: { gameState: newState, entities }});
    }
  };

  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const handleMockGPS = () => {
    setCurrentPos({ lat: 40.7580, lng: -73.9855 });
  };
  
  const handleExit = () => {
    setPhase('SETUP');
    p2pService.disconnect();
    setPeerId('');
  };

  // --- RENDER ---
  if (phase === 'SETUP') {
    return <SetupScreen onStart={handleStartSetup} hasSave={hasSave} onContinue={loadGame} />;
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-black text-white font-sans select-none">
      
      <GameUI 
        player={player} 
        otherPlayers={otherPlayers}
        gameState={gameState} 
        entities={entities} 
        onEntityInteraction={handleInteract}
        onRevivePlayer={handleRevivePlayer}
        currentPosition={currentPos}
        mode={phase}
        onMapReady={handleMapReady}
        onMockGPS={handleMockGPS}
        peerId={peerId}
        onExit={handleExit}
        chatMessages={chatMessages}
        onSendChat={handleSendChat}
        onUseItem={handleUseItem}
      />

      {/* DEPLOYMENT */}
      {phase === 'DEPLOY' && currentPos && isHost && (
        <div className="absolute bottom-10 left-0 right-0 z-[500] flex justify-center p-4">
          <button 
            onClick={handleEstablishBase}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-8 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse uppercase tracking-wider border-2 border-cyan-400"
          >
            ESTABLISH BASE HERE
          </button>
        </div>
      )}

      {/* CONTROLS */}
      {phase === 'GAME' && !player.isDead && (
        <div className="absolute bottom-24 right-4 z-[400] flex flex-col gap-2 pointer-events-auto">
          {gameState.baseLocation && (
             <button 
               onClick={() => setShowBase(true)}
               className="w-16 h-16 rounded-full bg-cyan-900 border-2 border-cyan-500 shadow-lg shadow-cyan-500/50 flex flex-col items-center justify-center transform hover:scale-105 transition-transform"
             >
               <span className="text-xl">⛺</span>
               <span className="text-[10px] font-bold">BASE</span>
             </button>
          )}
          {isHost && (
            <button 
              onClick={togglePhase}
              className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/20 flex flex-col items-center justify-center shadow-lg transform hover:scale-105 transition-transform"
            >
              <span className="text-xl">{gameState.isNight ? '☀️' : '🌙'}</span>
            </button>
          )}
          {/* Energy Display */}
           <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex flex-col items-center justify-center shadow-lg">
               <span className="text-xs text-yellow-400 font-bold">⚡</span>
               <span className="text-[10px] font-mono">{Math.floor(player.energy)}%</span>
            </div>
        </div>
      )}

      {activeEncounter && (
        <EncounterModal 
          entity={activeEncounter} 
          onClose={() => setActiveEncounter(null)}
          onResolve={resolveEncounter}
          hasLaser={player.inventory.laser > 0}
          playerEnergy={player.energy}
          onConsumeEnergy={handleUseDrone}
        />
      )}

      {showBase && (
        <div className="absolute inset-0 z-[500]">
          <BaseDashboard 
            gameState={gameState}
            cost={gameState.baseLevel * 5}
            canUpgrade={player.inventory.wood >= gameState.baseLevel * 5}
            onUpgrade={handleBaseUpgrade}
          />
          <button 
             onClick={() => setShowBase(false)}
             className="absolute top-4 right-4 z-[501] text-white p-2"
          >
            ❌
          </button>
        </div>
      )}

      {/* DEATH SCREEN */}
      {player.isDead && (
        <div className="fixed inset-0 z-[1000] bg-red-950/80 backdrop-blur flex items-center justify-center flex-col text-center p-6">
          <h1 className="text-6xl font-black mb-4 text-red-500 animate-pulse">CRITICAL FAILURE</h1>
          <p className="text-xl mb-4 font-mono">VITAL SIGNS: TERMINATED</p>
          <div className="bg-black/50 p-4 rounded border border-red-500/50 max-w-sm">
            <p className="text-sm text-slate-300">
              You are currently a <span className="text-red-400 font-bold">GHOST SIGNAL</span>.
              <br/><br/>
              Wait for a teammate (Medic preferred) to locate your position and deploy a Medkit.
            </p>
          </div>
          <div className="mt-8 animate-spin text-4xl">📡</div>
          <p className="mt-2 text-xs text-slate-500">BROADCASTING DISTRESS SIGNAL...</p>
        </div>
      )}
    </div>
  );
};

export default App;