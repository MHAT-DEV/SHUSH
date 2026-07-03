import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PetSVG } from './PetSVG';

interface PetRoom3DProps {
  placedFurniture: string[];
  placedAccessories: string[];
  petName: string;
  fsmState: string;
  activeMessage: string | null;
}

export default function PetRoom3D({ placedFurniture, placedAccessories, petName, fsmState, activeMessage }: PetRoom3DProps) {
  const gridW = 300;
  const gridH = 300;

  const [petPos, setPetPos] = useState({ x: 150, y: 150 });
  const [petAction, setPetAction] = useState<'idle' | 'walking' | 'sleeping' | 'playing'>('idle');

  const locations: Record<string, { x: number, y: number, label: string, size: number }> = {
    bed: { x: 70, y: 70, label: '🛏️', size: 100 },
    house: { x: 230, y: 70, label: '🏠', size: 120 },
    cleaner: { x: 250, y: 250, label: '🤖', size: 50 },
    bowl: { x: 70, y: 220, label: '🥣', size: 40 },
    toy: { x: 150, y: 250, label: '🧸', size: 50 },
    pillow: { x: 130, y: 80, label: '🛋️', size: 70 },
    ball: { x: 200, y: 160, label: '⚽', size: 30 }
  };

  useEffect(() => {
    if (fsmState === 'sleep') {
      let target = { x: 150, y: 150 };
      if (placedFurniture.includes('bed')) target = { x: locations.bed.x, y: locations.bed.y };
      else if (placedFurniture.includes('house')) target = { x: locations.house.x, y: locations.house.y };
      else if (placedFurniture.includes('pillow')) target = { x: locations.pillow.x, y: locations.pillow.y };
      
      setPetPos(target);
      setPetAction('sleeping');
      return;
    }

    if (fsmState === 'eat') {
       if (placedFurniture.includes('bowl')) {
         setPetPos({ x: locations.bowl.x, y: locations.bowl.y });
       }
       setPetAction('idle');
       return;
    }

    if (fsmState === 'play') {
       let target = { x: 150, y: 150 };
       if (placedFurniture.includes('toy')) target = { x: locations.toy.x, y: locations.toy.y };
       else if (placedFurniture.includes('ball')) target = { x: locations.ball.x, y: locations.ball.y };
       setPetPos(target);
       setPetAction('playing');
       return;
    }

    const interval = setInterval(() => {
      if (fsmState === 'sleep' || fsmState === 'eat' || fsmState === 'play') return;
      
      const targets = [{ x: 150, y: 150, action: 'idle' }];
      placedFurniture.forEach(fId => {
         if (locations[fId]) {
            targets.push({ x: locations[fId].x, y: locations[fId].y, action: 'idle' });
         }
      });
      targets.push({ x: Math.random() * 200 + 50, y: Math.random() * 200 + 50, action: 'idle' });

      const target = targets[Math.floor(Math.random() * targets.length)];
      setPetAction('walking');
      setPetPos({ x: target.x, y: target.y });
      
      setTimeout(() => {
        setPetAction(target.action as any);
      }, 2000);
      
    }, 6000);
    return () => clearInterval(interval);
  }, [placedFurniture, fsmState]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1A1625] to-[#0D0B14]" style={{ perspective: '1200px' }}>
      <div className="absolute inset-0 bg-[#8B6DFF]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        className="relative"
        style={{ 
          width: gridW, 
          height: gridH, 
          transformStyle: 'preserve-3d',
          transform: 'rotateX(60deg) rotateZ(-45deg)'
        }}
      >
        {/* Floor */}
        <div 
          className="absolute inset-0 bg-[#2A2640] border border-white/5"
          style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6)'
          }}
        />

        {/* Left Wall */}
        <div 
          className="absolute top-0 left-0 bg-[#1D1B20]"
          style={{ 
            width: '200px', 
            height: gridH, 
            transformOrigin: 'left',
            transform: 'rotateY(-90deg)',
            borderRight: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div className="absolute top-[40px] left-[50px] w-[80px] h-[100px] bg-[#1E1B2E] border-4 border-[#141218] rounded-t-2xl overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF85A2]/10 to-[#8B6DFF]/10 animate-pulse" />
            <div className="absolute top-[20%] left-[20%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <div className="absolute top-[40%] right-[30%] w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* Top Wall */}
        <div 
          className="absolute top-0 left-0 bg-[#231F33]"
          style={{ 
            width: gridW, 
            height: '200px', 
            transformOrigin: 'top',
            transform: 'rotateX(90deg)',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        />

        {/* Furniture */}
        {placedFurniture.map(fId => {
          const loc = locations[fId];
          if (!loc) return null;
          let animation = {};
          if (fId === 'cleaner') {
             animation = { x: [loc.x, loc.x + 80, loc.x], y: [loc.y, loc.y - 40, loc.y] };
          }
          return (
            <motion.div
              key={fId}
              animate={animation}
              transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
              className="absolute flex flex-col items-center justify-end pointer-events-none"
              style={{ 
                width: loc.size, 
                height: loc.size, 
                left: loc.x - loc.size/2, 
                top: loc.y - loc.size/2,
                transformStyle: 'preserve-3d',
                transform: 'translateZ(0px) rotateX(-90deg) rotateY(45deg)'
              }}
            >
              <div className="text-5xl sm:text-6xl drop-shadow-2xl">{loc.label}</div>
            </motion.div>
          );
        })}

        {/* Pet */}
        <motion.div
          animate={{ x: petPos.x, y: petPos.y }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute w-[100px] h-[100px] -ml-[50px] -mt-[50px] flex items-end justify-center pointer-events-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <motion.div
             animate={{
                y: petAction === 'walking' ? [0, -15, 0] : petAction === 'sleeping' ? 10 : 0,
                rotateZ: petAction === 'sleeping' ? -90 : 0
             }}
             transition={{ 
                duration: petAction === 'walking' ? 0.3 : 0.5, 
                repeat: petAction === 'walking' ? Infinity : 0
             }}
             style={{ 
                transformOrigin: 'bottom center',
                transform: 'rotateX(-90deg) rotateY(45deg)' 
             }}
             className="relative"
          >
            <div className="relative w-28 h-28 drop-shadow-xl z-50">
              <PetSVG 
                species="cat" 
                color="#FFB085" 
                state={petAction === 'sleeping' ? 'sleep' : petAction === 'playing' ? 'play' : petAction === 'walking' ? 'walk' : 'idle'} 
              />
              
              {placedAccessories.includes('hat') && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl z-10 drop-shadow-md">🎩</div>}
              {placedAccessories.includes('ribbon') && <div className="absolute top-2 right-2 text-2xl z-10 drop-shadow-md">🎀</div>}
              {placedAccessories.includes('glasses') && <div className="absolute top-8 left-1/2 -translate-x-1/2 text-3xl z-10 drop-shadow-md">👓</div>}
              {placedAccessories.includes('collar') && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xl z-10 drop-shadow-md">🔔</div>}
              {placedAccessories.includes('scarf') && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-3xl z-10 drop-shadow-md">🧣</div>}
              {placedAccessories.includes('wings') && <div className="absolute top-10 left-1/2 -translate-x-1/2 text-5xl -z-10 drop-shadow-md opacity-80">👼</div>}
            </div>

            {/* Active Message Bubble */}
            <AnimatePresence>
              {activeMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white text-slate-800 px-4 py-2 rounded-2xl shadow-xl text-sm font-bold whitespace-nowrap z-[60] border-2 border-[var(--theme-primary)]"
                >
                  {activeMessage}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {petAction === 'sleeping' && (
              <motion.span className="absolute -top-4 right-0 text-xl font-bold text-sky-300 animate-pulse">💤</motion.span>
            )}

            <div className="absolute -bottom-6 w-32 text-center -ml-2 text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-md">
              {petName}
            </div>
          </motion.div>
        </motion.div>

      </motion.div>
    </div>
  );
}
