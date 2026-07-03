const fs = require('fs');
const file = 'src/components/LensesSpace.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'useEffect(() => {\n    fetchMyLenses();\n  }, []);',
  'useEffect(() => {\n    fetchMyLenses();\n  }, [targetUserId]);'
);

fs.writeFileSync(file, content);
