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
`;

// There are two, find the first and remove it
let i = content.indexOf('useRouteSync({');
if (i !== -1) {
  let end = content.indexOf('});', i) + 3;
  content = content.substring(0, i) + content.substring(end);
}

fs.writeFileSync(file, content);
