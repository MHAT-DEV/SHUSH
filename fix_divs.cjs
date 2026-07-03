const fs = require('fs');
let code = fs.readFileSync('src/components/PetSpace.tsx', 'utf8');

code = code.replace(
  '              </AnimatePresence>\n          </div>\n          </div>\n\n          {/* Left Floating Action Buttons',
  '              </AnimatePresence>\n          </div>\n\n          {/* Left Floating Action Buttons'
);

fs.writeFileSync('src/components/PetSpace.tsx', code);
