const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure UserDisplay is imported
if (!code.includes('import UserDisplay')) {
  code = code.replace(
    'import { IdentityContext } from "./IdentityContext";',
    'import { IdentityContext } from "./IdentityContext";\nimport UserDisplay from "./components/UserDisplay";'
  );
}

// {couplePartner?.displayName} -> <UserDisplay user={couplePartner} />
code = code.replace(
  /\{couplePartner\?\.displayName\}/g,
  '<UserDisplay user={couplePartner || { id: "", displayName: "คู่รัก" }} />'
);

// {f.displayName} -> <UserDisplay user={f} />
code = code.replace(
  /\{f\.displayName\}/g,
  '<UserDisplay user={f} />'
);

// {foundPartner.displayName}
code = code.replace(
  /\{foundPartner\.displayName\}/g,
  '<UserDisplay user={foundPartner} />'
);

fs.writeFileSync('src/App.tsx', code);
