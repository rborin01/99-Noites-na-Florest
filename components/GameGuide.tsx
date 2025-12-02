import React from 'react';
import { ENTITY_CONFIG, EntityType, ClassType } from '../types';

interface GameGuideProps {
  onClose: () => void;
}

export const GameGuide: React.FC<GameGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/95 backdrop-blur p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/50 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950/50">
          <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase">Field Manual v3.2</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Section 1: Objective */}
          <section>
            <h3 className="text-emerald-400 font-bold text-lg mb-2 border-l-4 border-emerald-500 pl-2">OBJECTIVE</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Survive 99 Nights. Physically explore your real-world neighborhood to gather resources during the <span className="text-yellow-400">DAY</span>. 
              Build a Base. Return to it before <span className="text-purple-400">NIGHT</span> falls.
              <br/><br/>
              If your HP hits 0, you die (Permadeath). In Multiplayer, you become a Ghost and must be revived.
            </p>
          </section>

          {/* Section 2: Classes */}
          <section>
            <h3 className="text-cyan-400 font-bold text-lg mb-4 border-l-4 border-cyan-500 pl-2">CLASSES</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="text-cyan-400 font-bold mb-1">{ClassType.SCOUT}</div>
                <p className="text-xs text-slate-400">Fast movement. Sees enemies from further away on the Radar.</p>
              </div>
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="text-orange-400 font-bold mb-1">{ClassType.ENGINEER}</div>
                <p className="text-xs text-slate-400">Cheaper building costs. Traps are more effective.</p>
              </div>
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="text-red-400 font-bold mb-1">{ClassType.MEDIC}</div>
                <p className="text-xs text-slate-400">Heals more HP. Can revive teammates faster.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Entities */}
          <section>
            <h3 className="text-red-400 font-bold text-lg mb-4 border-l-4 border-red-500 pl-2">THREATS & ASSETS</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <div className="font-bold text-slate-200">{config.name}</div>
                    {config.hp && <div className="text-[10px] text-red-400">HP: {config.hp} // DMG: {config.damage}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Multiplayer */}
          <section>
             <h3 className="text-purple-400 font-bold text-lg mb-2 border-l-4 border-purple-500 pl-2">MULTIPLAYER PROTOCOLS</h3>
             <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
               <li><strong className="text-white">HOST:</strong> Controls the world, time, and enemies.</li>
               <li><strong className="text-white">SYNC:</strong> Everyone sees the same base and monsters.</li>
               <li><strong className="text-white">REVIVE:</strong> If you die, a teammate must physically walk to your ghost and use a Medkit.</li>
             </ul>
          </section>

        </div>
      </div>
    </div>
  );
};