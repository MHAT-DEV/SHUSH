const fs = require('fs');

let code = fs.readFileSync('src/components/DiscoverySpace.tsx', 'utf8');

if (!code.includes('import UserDisplay')) {
  code = code.replace(
    "import { motion, AnimatePresence } from 'motion/react';",
    "import { motion, AnimatePresence } from 'motion/react';\nimport UserDisplay from './UserDisplay';"
  );
}

// {u.displayName}
code = code.replace(
  /<span className="text-base font-bold text-white leading-tight">\{u\.displayName\}<\/span>/g,
  '<UserDisplay user={u} className="text-base font-bold text-white leading-tight" />'
);

code = code.replace(
  /<span className="text-sm font-bold text-white truncate">\{u\.displayName\}<\/span>/g,
  '<UserDisplay user={u} className="text-sm font-bold text-white truncate" />'
);

// {inv.displayName}
code = code.replace(
  /<div className="text-xs font-bold text-white truncate">\{inv\.displayName\}<\/div>/g,
  '<div className="text-xs font-bold text-white truncate"><UserDisplay user={inv as any} /></div>'
);

// {selectedProfile.displayName}
code = code.replace(
  /\{selectedProfile\.displayName\}/g,
  '<UserDisplay user={selectedProfile as any} />'
);

fs.writeFileSync('src/components/DiscoverySpace.tsx', code);
