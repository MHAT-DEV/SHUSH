const fs = require('fs');

// Patch AchievementsTab.tsx
let code = fs.readFileSync('src/components/AchievementsTab.tsx', 'utf8');

code = code.replace(
  'setUser: any;',
  'setUser: any;\n  onPointsEarned?: (pts: number) => void;'
);

code = code.replace(
  'setUser\n}: {',
  'setUser,\n  onPointsEarned\n}: {'
);

// Call onPointsEarned
code = code.replace(
  'const d = await res.json();\n        setTimeout(() => {',
  `const d = await res.json();
        // Calculate diff in points
        if (data && d.points > data.points && onPointsEarned) {
          onPointsEarned(d.points - data.points);
        }
        setTimeout(() => {`
);

fs.writeFileSync('src/components/AchievementsTab.tsx', code);

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  '<AchievementsTab\n                        token={token}\n                        user={user}\n                        setUser={setUser}\n                      />',
  `<AchievementsTab
                        token={token}
                        user={user}
                        setUser={setUser}
                        onPointsEarned={(pts) => {
                          const newPts = points + pts;
                          setPoints(newPts);
                          localStorage.setItem('shush_points', String(newPts));
                        }}
                      />`
);
fs.writeFileSync('src/App.tsx', appCode);

