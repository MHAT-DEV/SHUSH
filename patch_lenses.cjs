const fs = require('fs');
const file = 'src/components/LensesSpace.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add targetUserId to props
content = content.replace(
  'interface LensesSpaceProps {',
  'interface LensesSpaceProps {\n  targetUserId?: string;'
);

content = content.replace(
  'export default function LensesSpace({ user, couple, bffGroups, onRefreshUser }: LensesSpaceProps) {',
  'export default function LensesSpace({ user, couple, bffGroups, onRefreshUser, targetUserId }: LensesSpaceProps) {'
);

// We need to fetch the target user's lens if targetUserId is provided.
// Currently it calls fetchMyLenses().
content = content.replace(
  'const fetchMyLenses = async () => {',
  `const fetchMyLenses = async () => {
    if (targetUserId && targetUserId !== user?.id) {
      try {
        const res = await fetch(\`/api/lenses/active/\${targetUserId}\`, { headers });
        const data = await res.json();
        if (res.ok) {
          setLenses(data ? [data] : []);
        } else {
          console.error(data.error);
        }
      } catch(e) { console.error(e); }
      return;
    }`
);

fs.writeFileSync(file, content);
