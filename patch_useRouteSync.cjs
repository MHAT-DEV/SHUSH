const fs = require('fs');
const file = 'src/useRouteSync.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'if (["chat", "space", "vault"].includes(activeTab) && activeChannel) {\n      newPath += `/${activeChannel.id}`;\n    }',
  `if (["chat", "space", "vault"].includes(activeTab) && activeChannel) {
      newPath += \`/\${activeChannel.id}\`;
    } else if (activeTab === "lenses" && location.pathname.startsWith("/lenses/")) {
      newPath = location.pathname; // Preserve target user ID
    }`
);

fs.writeFileSync(file, content);
