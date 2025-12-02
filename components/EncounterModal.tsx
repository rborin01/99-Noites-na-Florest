import React, { useState } from 'react';
import { Entity, ENTITY_CONFIG, EntityType } from '../types';
import { audioService } from '../services/audioService';

interface EncounterModalProps {
  entity: Entity;
  onClose: () => void;
  onResolve: (entityId: string, win: boolean, loot?: any) => void;
  hasLaser: boolean;
  playerEnergy: number;
  onConsumeEnergy: (amount: number) => boolean;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({ 
  entity, 
  onClose, 
  onResolve, 
  hasLaser,
  playerEnergy,
  onConsumeEnergy
}) => {
  const config = ENTITY_CONFIG[entity.type];
  const [playerTurn, setPlayerTurn] = useState(true);
  const [combatLog, setCombatLog] = useState<string[]>(['Target signal acquired.']);
  const [enemyHp, setEnemyHp] = useState(entity.health || config.hp || 50);
  
  // Interaction Range Logic
  const distance = entity.distance || 0;
  const isOutOfRange = distance > 40;
  const [remoteAccessGranted, setRemoteAccessGranted] = useState(false);
  
  const canInteract = !isOutOfRange || remoteAccessGranted;

  const isResource = [
    EntityType.RESOURCE_FOOD, 
    EntityType.RESOURCE_WATER, 
    EntityType.RESOURCE_WOOD,
    EntityType.RESOURCE_MEDKIT,
    EntityType.ITEM_LASER,
    EntityType.MISSION_CHILD
  ].includes(entity.type);

  const handleRemoteHack = () => {
    if (onConsumeEnergy(15)) {
      audioService.playScan();
      setRemoteAccessGranted(true);
      setCombatLog(prev => ['REMOTE DRONE LINK ESTABLISHED.', 'Bypassing physical distance lock...', ...prev]);
    } else {
      setCombatLog(prev => ['ERROR: INSUFFICIENT ENERGY FOR DRONE LINK.', ...prev]);
    }
  };

  const handleAction = (action: 'ATTACK' | 'FLEE' | 'COLLECT' | 'LASER') => {
    if (action === 'COLLECT') {
      audioService.playCollect();
      let lootAmount = 1;
      if (entity.type === EntityType.RESOURCE_WOOD) lootAmount = Math.floor(Math.random() * 3) + 1;
      onResolve(entity.id, true, { type: entity.type, amount: lootAmount });
      return;
    }

    if (action === 'FLEE') {
      audioService.playScan();
      onClose();
      return;
    }

    if (action === 'LASER') {
      audioService.playLaser();
      setCombatLog(prev => [`FIRED ALIEN BLASTER! TARGET VAPORIZED.`, ...prev]);
      setEnemyHp(0);
      setTimeout(() => {
        onResolve(entity.id, true, { type: 'LOOT', amount: 5, usedLaser: true }); // Bonus loot for laser kill
      }, 1500);
      return;
    }

    if (action === 'ATTACK') {
      audioService.playAttack();
      const dmg = Math.floor(Math.random() * 15) + 5;
      const newHp = enemyHp - dmg;
      setEnemyHp(newHp);
      setCombatLog(prev => [`Hit ${config.name} for ${dmg} DMG!`, ...prev]);

      if (newHp <= 0) {
        let lootType = 'LOOT';
        if (entity.type === EntityType.ENEMY_ALIEN) lootType = EntityType.ITEM_LASER;
        
        setTimeout(() => {
          onResolve(entity.id, true, { type: lootType, amount: 1 });
        }, 1000);
      } else {
        // Enemy Turn
        setPlayerTurn(false);
        setTimeout(() => {
          const enemyDmg = config.damage || 5;
          audioService.playAlert();
          setCombatLog(prev => [`${config.name} attacks! You took ${enemyDmg} DMG.`, ...prev]);
          setPlayerTurn(true);
        }, 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md perspective-1000">
        {/* Holographic Container */}
        <div className={`relative bg-slate-900/80 border ${isOutOfRange && !remoteAccessGranted ? 'border-red-500/50' : 'border-cyan-500/50'} rounded-lg p-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] transform transition-transform duration-500 hover:rotate-y-2`}>
          
          {/* Scanlines Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-0 rounded-lg"></div>

          <div className="relative z-10 flex flex-col items-center">
            
            {/* Header */}
            <h2 className={`text-2xl font-bold ${isOutOfRange && !remoteAccessGranted ? 'text-red-500' : 'text-cyan-400'} tracking-widest uppercase mb-1 animate-pulse-fast`}>
              {isOutOfRange && !remoteAccessGranted ? 'SIGNAL WEAK' : (isResource ? 'OBJECT LOCATED' : 'THREAT DETECTED')}
            </h2>

            {/* Distance Display */}
            <div className={`mb-4 font-mono text-sm font-bold border px-2 py-0.5 rounded ${isOutOfRange ? 'text-red-400 border-red-500/50' : 'text-emerald-400 border-emerald-500/50'}`}>
               DISTANCE: {Math.round(distance)}m
            </div>

            {/* Icon */}
            <div className="w-32 h-32 flex items-center justify-center text-6xl mb-6 relative group">
               <div className={`absolute inset-0 ${isOutOfRange && !remoteAccessGranted ? 'bg-red-500/20' : 'bg-cyan-500/20'} rounded-full blur-xl animate-pulse`}></div>
               <span className={`relative z-10 block ${!isOutOfRange ? 'animate-glitch' : 'opacity-50 grayscale'}`}>{config.icon}</span>
            </div>

            {/* Range Warning */}
            {isOutOfRange && !remoteAccessGranted && (
               <div className="w-full bg-red-900/20 border border-red-500 p-2 mb-4 text-center rounded">
                  <p className="text-red-500 text-[10px] font-bold">PHYSICAL INTERACTION IMPOSSIBLE (>40m)</p>
                  <p className="text-red-400 text-[10px] opacity-70">MOVE CLOSER OR DEPLOY DRONE</p>
               </div>
            )}

            {/* HP Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full mb-2 overflow-hidden border border-slate-600">
               <div 
                 className={`h-full ${isResource ? 'bg-emerald-500' : 'bg-red-500'}`} 
                 style={{ width: `${(enemyHp / (config.hp || 50)) * 100}%` }}
               ></div>
            </div>
            
            <p className="text-xs text-slate-400 mb-4 font-mono text-right w-full">{enemyHp}/{config.hp || 50} HP</p>

            {/* Log */}
            <div className="w-full bg-slate-950/50 p-2 h-24 overflow-y-auto mb-4 font-mono text-xs text-emerald-400 border border-slate-700 rounded">
              {combatLog.map((log, i) => (
                <div key={i}>&gt; {log}</div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 w-full">
               
               {/* Remote Hack Option */}
               {isOutOfRange && !remoteAccessGranted && (
                  <button 
                    onClick={handleRemoteHack}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded font-bold uppercase tracking-wider transition-all border border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)] flex items-center justify-center gap-2"
                  >
                    <span>🚁 DEPLOY DRONE</span>
                    <span className="bg-black/30 px-2 py-0.5 rounded text-xs">-15 ENERGY</span>
                  </button>
               )}

               {/* Standard Actions */}
               {canInteract && (
                 <>
                   <div className="flex gap-2 w-full">
                    {isResource ? (
                      <button 
                        onClick={() => handleAction('COLLECT')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded font-bold uppercase tracking-wider transition-all"
                      >
                        {entity.type === EntityType.MISSION_CHILD ? 'ESCORT' : 'COLLECT'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAction('ATTACK')}
                        disabled={!playerTurn}
                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded font-bold uppercase tracking-wider transition-all border border-red-400"
                      >
                        Attack
                      </button>
                    )}
                  </div>
                  
                  {!isResource && hasLaser && (
                    <button 
                      onClick={() => handleAction('LASER')}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-bold uppercase tracking-widest border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse"
                    >
                      🔥 FIRE ALIEN BLASTER (1 CHARGE)
                    </button>
                  )}
                 </>
               )}

               <button 
                  onClick={() => handleAction('FLEE')}
                  className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-bold uppercase tracking-wider transition-all border border-slate-500"
                >
                  DISENGAGE
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};