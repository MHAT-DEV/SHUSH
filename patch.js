const fs = require('fs');
let code = fs.readFileSync('src/components/DeviceAndLogs.tsx', 'utf8');

// Add visibleSections
code = code.replace(
  'const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({',
  'const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});\n  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({'
);

// Update useEffect for search
code = code.replace(
  'setExpandedSections(prev => ({',
  'setVisibleSections(matches);\n      setExpandedSections(prev => ({'
);

code = code.replace(
  `} else {\n    // fetchLogs...`, // Actually there is no else in the useEffect.
  ""
);

fs.writeFileSync('src/components/DeviceAndLogs.tsx', code);
