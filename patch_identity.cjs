const fs = require('fs');

// Patch IdentityContext.tsx
let identityCode = fs.readFileSync('src/IdentityContext.tsx', 'utf8');
identityCode = identityCode.replace(
  'isDarkMode: boolean;',
  'isDarkMode: boolean;\n  currentUserId: string | null;'
).replace(
  'isDarkMode: true,',
  'isDarkMode: true,\n  currentUserId: null,'
);
fs.writeFileSync('src/IdentityContext.tsx', identityCode);

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  'value={{ activeTheme, activeBadge, activeNameColor, isDarkMode }}',
  'value={{ activeTheme, activeBadge, activeNameColor, isDarkMode, currentUserId: user?.id || null }}'
);
fs.writeFileSync('src/App.tsx', appCode);

// Patch UserDisplay.tsx
let udCode = fs.readFileSync('src/components/UserDisplay.tsx', 'utf8');
udCode = udCode.replace(
  'const { activeBadge, activeNameColor } = useIdentity();',
  'const { activeBadge, activeNameColor, currentUserId } = useIdentity();'
);
udCode = udCode.replace(
  "const isSelf = user.id === 'user-1' || user.id === '1' || user.id === 'current-user' || !user.id;",
  "const isSelf = user.id === currentUserId || !user.id;"
);
fs.writeFileSync('src/components/UserDisplay.tsx', udCode);
