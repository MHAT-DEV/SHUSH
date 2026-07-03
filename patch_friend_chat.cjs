const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// In fetchAllConversationsMessages
code = code.replace(
  'chatIds.push({ id: f.id, type: "FRIEND" });',
  'chatIds.push({ id: "chat_" + [user.id, f.id].sort().join("_"), type: "FRIEND", friendId: f.id });'
);

// We also need to fix the activeChannel assignment in map
code = code.replace(
  /activeChannel\?\.type === "FRIEND" && activeChannel\?\.id === f\.id/g,
  'activeChannel?.type === "FRIEND" && activeChannel?.friendId === f.id'
);

// Update setActiveChannel calls for FRIEND
code = code.replace(
  /type: "FRIEND",\s*id: f\.id,/g,
  'type: "FRIEND",\n                                  id: "chat_" + [user?.id || "", f.id].sort().join("_"),\n                                  friendId: f.id,'
);

// We need to update the definition of activeChannel state if it has type
// const [activeChannel, setActiveChannel] = useState<{ type: "CIRCLE" | "COUPLE" | "BFF_GROUP" | "FRIEND" | "CUSTOM"; id: string; name: string } | null>(null);
code = code.replace(
  /id: string; name: string }/g,
  'id: string; name: string; friendId?: string }'
);

fs.writeFileSync('src/App.tsx', code);
