const fs = require('fs');
const file = 'src/components/LensesSpace.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'setLenses(data ? [data] : []);',
  'setLenses(data && data.lens ? { [data.lens.type]: data.lens } : {}); loadLensIntoEditor(data?.lens?.type || "PUBLIC", data && data.lens ? { [data.lens.type]: data.lens } : {});'
);

fs.writeFileSync(file, content);
