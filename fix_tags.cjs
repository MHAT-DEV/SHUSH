const fs = require('fs');
let code = fs.readFileSync('src/components/PetSpace.tsx', 'utf8');

// I will just replace the bad part.
// The bad part starts with `              {/* Heart Animations */}`
// and ends with `            </motion.div>\n          </div>`
// Since my injection opened two divs, I just need to replace `</motion.div>\n          </div>` with `</div>\n          </div>`

code = code.replace(
  '              </AnimatePresence>\n            </motion.div>\n          </div>\n\n          {/* Left Floating Action Buttons',
  '              </AnimatePresence>\n          </div>\n          </div>\n\n          {/* Left Floating Action Buttons'
);

fs.writeFileSync('src/components/PetSpace.tsx', code);
