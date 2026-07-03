const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure useLocation is defined in App
if (!content.includes('const location = useLocation();')) {
  content = content.replace(
    'export default function App() {',
    'export default function App() {\n  const location = useLocation();'
  );
}

fs.writeFileSync(file, content);
