const fs = require('fs');

// Inject PetRoom3D import if not exists
let code = fs.readFileSync('src/components/PetSpace.tsx', 'utf8');
if (!code.includes('import PetRoom3D')) {
  code = code.replace(
    "import { PetSVG } from './PetSVG';",
    "import { PetSVG } from './PetSVG';\nimport PetRoom3D from './PetRoom3D';"
  );
}

// Replace the block
const lines = code.split('\n');
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Dynamic Room Background (Night Starry window) */}')) start = i;
  if (lines[i].includes('{/* Heart Animations */}')) {
    end = i;
    break;
  }
}

if (start !== -1 && end !== -1) {
  const before = lines.slice(0, start).join('\n');
  const after = lines.slice(end).join('\n');
  
  const injection = `        {/* Dynamic 3D Room Background & Stage */}
        <div className="absolute inset-0 z-0">
           <PetRoom3D 
             placedFurniture={placedFurniture} 
             placedAccessories={placedAccessories} 
             petName={pet.name || 'ชูชู'} 
             fsmState={fsmState}
             activeMessage={activeMessage}
           />
        </div>
        
        {/* Main Pet Stage Foreground overlay (for clicks, particles) */}
        <div ref={stageRef} className="flex-1 relative z-10 flex items-center justify-center p-4 pointer-events-none">
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center pointer-events-auto" onClick={handleInteraction}>
`;

  fs.writeFileSync('src/components/PetSpace.tsx', before + '\n' + injection + '\n' + after);
}
