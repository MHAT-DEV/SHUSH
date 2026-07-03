const fs = require('fs');
let code = fs.readFileSync('src/useRouteSync.ts', 'utf8');

code = code.replace(
  'const friend = friends.find(f => f.id === channelId);',
  'const friend = friends.find(f => channelId.includes(f.id));'
);

code = code.replace(
  'foundChannel = { type: "FRIEND", id: channelId, name: friend.displayName || friend.username };',
  'foundChannel = { type: "FRIEND", id: channelId, friendId: friend.id, name: friend.displayName || friend.username } as any;'
);

fs.writeFileSync('src/useRouteSync.ts', code);
