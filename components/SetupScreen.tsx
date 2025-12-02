import React, { useState, useEffect } from 'react';
import { ClassType } from '../types';
import { audioService } from '../services/audioService';
import { GameGuide } from './GameGuide';

interface SetupScreenProps {
  onStart: (name: string, classType: ClassType, mode: 'SINGLE' | 'HOST' | 'JOIN', hostId?: string, radius?: number) => void;
  hasSave: boolean;
  onContinue: () => void;
}

const PROFILE_KEY = '99noites_profile_v2';

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, hasSave, onContinue }) => {
  // MEMORY FIX: Initialize state directly from localStorage
  const [name, setName] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved).name : '';
    } catch { return ''; }
  });

  const [selectedClass, setSelectedClass] = useState<ClassType>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved).classType : ClassType.SCOUT;
    } catch { return ClassType.SCOUT; }
  });

  const [hostId, setHostId] = useState('');
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [radius, setRadius] = useState(300);
  const [showGuide, setShowGuide] = useState(false);

  // Save whenever name or class changes
  useEffect(() => {
    if (name) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, classType: selectedClass }));
    }
  }, [name, selectedClass]);

  const handleStart = (mode: 'SINGLE' | 'HOST' | 'JOIN') => {
    if (!name.trim()) return;
    if (mode === 'JOIN' && !hostId.trim()) return;
    
    audioService.initialize(); 
    audioService.playCollect();
    onStart(name, selectedClass, mode, hostId, radius);
  };

  const handleContinue = () => {
    audioService.initialize();
    audioService.playCollect();
    onContinue();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black z-0"></div>
      
      {/* Help Button */}
      <button 
        onClick={() => setShowGuide(true)}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full border border-slate-600 text-slate-400 hover:text-cyan-400 hover:border-cyan-400 flex items-center justify-center transition-all"
      >
        <i className="fas fa-question"></i>
      </button>

      {showGuide && <GameGuide onClose={() => setShowGuide(false)} />}

      <div className="relative z-10 w-full max-w-sm">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-500 mb-2 tracking-tighter animate-pulse">
          99 NOITES
        </h1>
        <p className="text-slate-400 mb-8 font-mono text-sm tracking-widest">REAL LIFE SURVIVAL PROTOCOL</p>

        <div className="space-y-4">
          
          {hasSave && !showMultiplayer && (
            <button
              onClick={handleContinue}
              className="w-full bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500/50 text-white font-bold py-4 rounded shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all mb-4"
            >
              RESUME OPERATION
            </button>
          )}

          <div className="text-left border-t border-slate-800 pt-6">
            <h2 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">New Operation Setup</h2>
            <label className="block text-xs text-cyan-500 font-bold mb-1">CODENAME</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono"
              placeholder="ENTER CALLSIGN..."
            />
          </div>

          <div className="text-left mt-4">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-cyan-500 font-bold">OPERATION RADIUS</label>
              <span className="text-xs text-white font-mono">{radius} METERS</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="50"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Range of resource generation.
            </p>
          </div>

          <div className="text-left mt-4">
            <label className="block text-xs text-cyan-500 font-bold mb-2">CLASS SELECTION</label>
            <div className="grid grid-cols-1 gap-3">
              {[ClassType.SCOUT, ClassType.ENGINEER, ClassType.MEDIC].map((c) => (
                <button
                  key={c}
                  onClick={() => { audioService.playScan(); setSelectedClass(c); }}
                  className={`p-4 rounded border text-left transition-all ${
                    selectedClass === c 
                      ? 'bg-cyan-900/30 border-cyan-400 text-white' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold flex justify-between">
                    <span>{c}</span>
                    {selectedClass === c && <i className="fas fa-check text-cyan-400"></i>}
                  </div>
                  <div className="text-[10px] mt-1 opacity-70">
                    {c === ClassType.SCOUT && "Speed +, Radar +"}
                    {c === ClassType.ENGINEER && "Build Cost -, Traps +"}
                    {c === ClassType.MEDIC && "Heal +, Revive +"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!showMultiplayer ? (
             <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={() => handleStart('SINGLE')}
                  disabled={!name}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-4 rounded shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all"
                >
                  SOLO DEPLOY
                </button>
                <button
                  onClick={() => setShowMultiplayer(true)}
                  disabled={!name}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 rounded border border-slate-600 transition-all"
                >
                  MULTIPLAYER OPS
                </button>
             </div>
          ) : (
            <div className="mt-6 p-4 bg-slate-900/50 rounded border border-cyan-900/50">
              <h3 className="text-cyan-400 font-bold mb-4">MULTIPLAYER UPLINK</h3>
              
              <button
                  onClick={() => handleStart('HOST')}
                  disabled={!name}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 mb-4 text-white font-bold py-3 rounded"
                >
                  HOST SQUAD
              </button>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={hostId}
                  onChange={(e) => setHostId(e.target.value)}
                  className="flex-1 bg-black border border-slate-600 rounded p-2 text-white text-sm"
                  placeholder="HOST ID..."
                />
                <button
                  onClick={() => handleStart('JOIN')}
                  disabled={!name || !hostId}
                  className="bg-cyan-700 hover:bg-cyan-600 px-4 rounded font-bold"
                >
                  JOIN
                </button>
              </div>
              <button onClick={() => setShowMultiplayer(false)} className="text-xs text-slate-500 mt-4 underline">Back</button>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-4 text-[10px] text-slate-700 font-mono">
        v3.5 // MEMORY FIX // CHAT
      </div>
    </div>
  );
};