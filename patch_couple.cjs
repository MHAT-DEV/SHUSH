const fs = require('fs');
let code = fs.readFileSync('src/components/CoupleSpace.tsx', 'utf8');

if (!code.includes('import UserDisplay')) {
  code = code.replace(
    "import { motion, AnimatePresence } from 'motion/react';",
    "import { motion, AnimatePresence } from 'motion/react';\nimport UserDisplay from './UserDisplay';"
  );
}

code = code.replace(
  /\{partner\?\.displayName\}/g,
  '<UserDisplay user={partner || { id: "", displayName: "" }} />'
);

fs.writeFileSync('src/components/CoupleSpace.tsx', code);
