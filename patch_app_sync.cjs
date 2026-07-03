const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `
  useRouteSync({
    activeTab, setActiveTab,
    activeCategory, setActiveCategory,
    activeChannel, setActiveChannel,
    user, couple, bffGroups, friends
  });

  // Sync theme
`;

content = content.replace('// Sync theme', injection);
fs.writeFileSync(file, content);
