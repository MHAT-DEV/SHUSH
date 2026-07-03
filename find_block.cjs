const fs = require('fs');
const lines = fs.readFileSync('src/components/PetSpace.tsx', 'utf8').split('\n');

let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Dynamic Room Background (Night Starry window) */}')) {
    start = i;
  }
  if (lines[i].includes('              {/* Heart Animations */}')) {
    end = i;
    break;
  }
}
console.log('Start:', start + 1);
console.log('End:', end + 1);
