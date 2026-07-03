const fs = require('fs');

const content = fs.readFileSync('src/components/NotificationsSpace.tsx', 'utf8');

const targetStr = '  if (!settings) {';
const index = content.indexOf(targetStr);

if (index === -1) {
  console.log("Not found");
  process.exit(1);
}

const newContent = content.substring(0, index) + `
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const displayedNotifications = activeNotifications.filter(n => {
    if (filter === 'unread' && n.isRead) return false;
    return true;
  });

  const unreadCount = activeNotifications.filter(n => !n.isRead).length;

  const timeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return \`\${seconds} seconds ago\`;
    if (minutes < 60) return \`\${minutes} minutes ago\`;
    if (hours < 24) return \`\${hours} hours ago\`;
    if (days === 1) return \`Yesterday at \${new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\`;
    return new Date(dateString).toLocaleDateString() + ' at ' + new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getIcon = (category: string) => {
    switch(category) {
      case 'RELATIONSHIP': return <CheckCircle className="w-5 h-5 text-white" />;
      case 'LENS': return <Eye className="w-5 h-5 text-white" />;
      case 'SYSTEM': return <Shield className="w-5 h-5 text-white" />;
      case 'HONEY_ME': return <Sparkles className="w-5 h-5 text-white" />;
      default: return <Info className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => onNavigateToTab && onNavigateToTab('space')}>
      <div 
        className="w-full sm:w-[450px] h-full bg-white shadow-2xl flex flex-col font-sans" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-[#E93B3B] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <button className="hover:text-gray-900 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => onNavigateToTab && onNavigateToTab('space')} className="hover:text-gray-900 transition-colors">
              <EyeOff className="w-5 h-5 hidden" />
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <button 
            onClick={() => setFilter('all')}
            className={\`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors \${filter === 'all' ? 'bg-[#E3E8EF] text-gray-900' : 'text-gray-600 hover:bg-gray-50'}\`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={\`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors \${filter === 'unread' ? 'bg-[#E3E8EF] text-gray-900' : 'text-gray-600 hover:bg-gray-50'}\`}
          >
            Unread
          </button>
          <button 
            onClick={handleMarkAllRead}
            className="ml-auto p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            title="Mark all as read"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications to show</p>
            </div>
          ) : (
            displayedNotifications.map((n) => (
              <div key={n.id} className={\`relative flex items-start gap-4 p-5 border-b border-gray-100 hover:bg-[#F8FAFC] transition-colors \${!n.isRead ? 'bg-[#F0F5FF]' : ''}\`}>
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.category)}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <p className="text-sm text-gray-900 leading-relaxed">
                    <span className="font-bold">{n.title}</span> {n.body}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>
                
                {/* 3-dot menu */}
                <div className="absolute right-4 top-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === n.id ? null : n.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                  
                  {openDropdownId === n.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                      <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                        <button 
                          onClick={() => {
                            setOpenDropdownId(null);
                            handleMarkAsRead(n.id);
                            if (onNavigateToNotification) {
                              onNavigateToNotification(n);
                            } else if (onNavigateToTab) {
                              if (n.category === 'RELATIONSHIP') onNavigateToTab('chat');
                              else if (n.category === 'LENS') onNavigateToTab('lenses');
                              else if (n.category === 'HONEY_ME') onNavigateToTab('discovery');
                              else if (n.category === 'SYSTEM') onNavigateToTab('settings');
                            }
                          }}
                          className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                          Go to reservation
                        </button>
                        {!n.isRead && (
                          <button 
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleMarkAsRead(n.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/NotificationsSpace.tsx', newContent, 'utf8');
console.log("Done.");
