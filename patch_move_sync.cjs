const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\\s*useRouteSync\\(\\{[\\s\\S]*?\\}\\);/, '');

// Now add it after activeChannel
const injectionPoint = '  const [activeChannel, setActiveChannel] = useState<{\n    type: "COUPLE" | "BFF_GROUP" | "FRIEND";\n    id: string;\n    name: string;\n  } | null>(null);';

content = content.replace(
  injectionPoint,
  injectionPoint + '\n\n  useRouteSync({\n    activeTab, setActiveTab,\n    activeCategory, setActiveCategory,\n    activeChannel, setActiveChannel,\n    user, couple, bffGroups, friends\n  });\n'
);

fs.writeFileSync(file, content);
