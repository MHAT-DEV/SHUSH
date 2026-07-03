const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<LensesSpace',
  '<LensesSpace\n                        targetUserId={location.pathname.startsWith("/lenses/") ? location.pathname.split("/")[2] : undefined}'
);

fs.writeFileSync(file, content);
