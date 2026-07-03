const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix sorting
const sortSearch = `return (
                                  (presenceOrder[
                                    a.presenceStatus as keyof typeof presenceOrder
                                  ] || 0) -
                                  (presenceOrder[
                                    b.presenceStatus as keyof typeof presenceOrder
                                  ] || 0)
                                );`;
const sortReplace = `const diff = (presenceOrder[a.presenceStatus as keyof typeof presenceOrder] || 0) - (presenceOrder[b.presenceStatus as keyof typeof presenceOrder] || 0);
                                if (diff !== 0) return diff;
                                return (a.displayName || "").localeCompare(b.displayName || "");`;
content = content.replace(sortSearch, sortReplace);

// Fix Start Chat menu
const startChatSearch = `setActiveChannel({
                                                  type: "FRIEND",
                                                  id: f.id,
                                                  name: f.displayName,
                                                });
                                              }}
                                            >
                                              <MessageSquare className="w-4 h-4 text-[var(--theme-primary)]" />{" "}
                                              ส่งข้อความ
                                            </button>`;
const startChatReplace = `setActiveChannel({
                                                  type: "FRIEND",
                                                  id: f.id,
                                                  name: f.displayName,
                                                });
                                                setActiveTab("chat");
                                                setActiveSidebarTab("CHATS");
                                              }}
                                            >
                                              <MessageSquare className="w-4 h-4 text-[var(--theme-primary)]" />{" "}
                                              ส่งข้อความ
                                            </button>`;
content = content.replace(startChatSearch, startChatReplace);

fs.writeFileSync(file, content);
