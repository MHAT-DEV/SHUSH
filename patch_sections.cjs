const fs = require('fs');

let code = fs.readFileSync('src/components/DeviceAndLogs.tsx', 'utf8');

const searchMappingBlock = `
  const searchMapping: Record<string, string[]> = {
    account: ['account', 'profile', 'username', 'display name', 'logout', 'bio', 'lens', 'avatar', 'ข้อมูลส่วนตัว', 'ออกจากระบบ'],
    communication: ['communication', 'relationship', 'circles', 'friends', 'couple', 'bff', 'แอดเพื่อน', 'กลุ่มความสัมพันธ์'],
    privacy: ['privacy', 'shhpass', 'security', 'e2ee', 'passkeys', 'totp', 'authenticator', 'fido2', '2fa', 'คำถามความปลอดภัย', 'ความเป็นส่วนตัว'],
    discovery: ['discovery', 'honeyme', 'honey', 'mode', 'permission', 'ค้นพบเพื่อน', 'หาคู่'],
    pet: ['pet', 'coins', 'xp', 'level', 'สัตว์เลี้ยง', 'เหรียญ'],
    shop: ['shop', 'store', 'points', 'buy', 'badges', 'colors', 'ธีม', 'ร้านค้า'],
    developer: ['developer', 'audit', 'logs', 'devices', 'sessions', 'metadata', 'พ.ร.บ.คอมพิวเตอร์', 'เซสชัน', 'ความปลอดภัยระบบ'],
    settings: ['settings', 'theme', 'dark mode', 'light mode', 'สลับโหมด', 'สลับธีม']
  };

  const isSectionVisible = (sec: string) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return searchMapping[sec].some(k => k.includes(q));
  };
`;

code = code.replace(
  '  // If search query exists, automatically expand matching categories',
  searchMappingBlock + '\n  // If search query exists, automatically expand matching categories'
);

code = code.replace(/const searchMapping[^}]+};\n\n/m, '');

// Now replace {expandedSections.account && (
// but only the outer ones.
const sections = ['account', 'communication', 'privacy', 'discovery', 'pet', 'shop', 'developer', 'settings'];

for (const sec of sections) {
  // We want to replace the first occurrence of `{expandedSections.${sec} && (` in the JSX 
  // after `{/* 1. ACCOUNT */}` etc.
  const regex = new RegExp(`{\\s*expandedSections\\.${sec}\\s*&&\\s*\\(`, 'g');
  
  let count = 0;
  code = code.replace(regex, (match) => {
    count++;
    if (count % 2 !== 0) {
      // First occurrence is the outer wrapper
      return `{isSectionVisible('${sec}') && (`;
    }
    // Second occurrence is the inner content body
    return match;
  });
}

// Write the file
fs.writeFileSync('src/components/DeviceAndLogs.tsx', code);
