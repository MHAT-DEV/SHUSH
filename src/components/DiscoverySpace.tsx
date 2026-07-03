import React, { useState, useEffect } from 'react';
import UserDisplay from './UserDisplay.tsx';
import { 
  Search, Bell, Settings, Plus, Star, Heart, MessageSquare, 
  UserPlus, Mail, VolumeX, Check, X, Shield, ChevronLeft, ChevronRight,
  Sparkles, Globe, LogOut, Layers
} from 'lucide-react';
import StoriesSpace from './StoriesSpace.tsx';

interface DiscoverySpaceProps {
  user: any;
  circles: any[];
  bffGroups: any[];
  userPrivateKey: string;
  userPublicKey: string;
  onRefreshFriends?: () => void;
  onOpenDirectChat?: (friendId: string, friendName: string) => void;
  onLogout?: () => void;
  onOpenLensesSettings?: () => void;
  initialSelectedUserId?: string | null;
  onClearInitialSelectedUser?: () => void;
  initialShowInbox?: boolean;
  onClearInitialShowInbox?: () => void;
}

export default function DiscoverySpace({
  user,
  circles,
  bffGroups,
  userPrivateKey,
  userPublicKey,
  onRefreshFriends,
  onOpenDirectChat,
  onLogout,
  onOpenLensesSettings,
  initialSelectedUserId,
  onClearInitialSelectedUser,
  initialShowInbox,
  onClearInitialShowInbox,
}: DiscoverySpaceProps) {
  const [honeyMeMode, setHoneyMeMode] = useState(false);
  const [honeyMePermission, setHoneyMePermission] = useState<'OPEN' | 'REQUEST' | 'INVITE' | 'SILENT'>('REQUEST');
  const [discoverableUsers, setDiscoverableUsers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Explore');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const filters = ['Highlights', 'News', 'Explore', 'Favorites'];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchSettings();
    fetchDiscoverable();
    fetchPendingInvites();
  }, []);

  useEffect(() => {
    if (initialShowInbox) {
      setShowInbox(true);
      if (onClearInitialShowInbox) {
        onClearInitialShowInbox();
      }
    }
  }, [initialShowInbox, onClearInitialShowInbox]);

  useEffect(() => {
    if (initialSelectedUserId) {
      const found = discoverableUsers.find(u => u.id === initialSelectedUserId) ||
                    pendingInvites.find(u => u.id === initialSelectedUserId || u.fromUserId === initialSelectedUserId);
      if (found) {
        setSelectedProfile(found);
        if (onClearInitialSelectedUser) {
          onClearInitialSelectedUser();
        }
      } else {
        fetch(`/api/honey/user/${initialSelectedUserId}`, { headers })
          .then(res => res.json())
          .then(data => {
            if (data && !data.error) {
              setSelectedProfile(data);
            }
            if (onClearInitialSelectedUser) {
              onClearInitialSelectedUser();
            }
          })
          .catch(e => {
            console.error(e);
            if (onClearInitialSelectedUser) {
              onClearInitialSelectedUser();
            }
          });
      }
    }
  }, [initialSelectedUserId, discoverableUsers, pendingInvites, onClearInitialSelectedUser]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/honey/settings', { headers });
      if (res.ok) {
        const data = await res.json();
        setHoneyMeMode(data.honeyMeMode);
        setHoneyMePermission(data.honeyMePermission);
      }
    } catch (e) {
      console.error('Error fetching honey settings:', e);
    }
  };

  const fetchDiscoverable = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/honey/discover', { headers });
      if (res.ok) {
        const data = await res.json();
        setDiscoverableUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching discoverable users:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const res = await fetch('/api/honey/invites', { headers });
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching pending invites:', e);
    }
  };

  const handleUpdateSettings = async (mode: boolean, permission: 'OPEN' | 'REQUEST' | 'INVITE' | 'SILENT') => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/honey/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode, permission })
      });
      if (res.ok) {
        setHoneyMeMode(mode);
        setHoneyMePermission(permission);
        fetchDiscoverable();
      } else {
        alert('อัปเดตการตั้งค่าล้มเหลว');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendInvite = async (targetId: string) => {
    try {
      const res = await fetch('/api/honey/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.addedDirectly) {
          alert('เพิ่มเพื่อนสำเร็จโดยตรงตามเงื่อนไขของปลายทาง!');
          if (onRefreshFriends) onRefreshFriends();
        } else {
          alert('ส่งสัญญาณคำชวน (Signal Invite) เรียบร้อย รอการตอบรับ');
        }
        fetchDiscoverable();
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถเชื่อมต่อได้');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptInvite = async (fromUserId: string) => {
    try {
      const res = await fetch('/api/honey/accept', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromUserId })
      });
      if (res.ok) {
        alert('ยอมรับการเชื่อมต่อสำเร็จ ตอนนี้คุณเป็นเพื่อนกันแล้ว!');
        if (onRefreshFriends) onRefreshFriends();
        fetchPendingInvites();
        fetchDiscoverable();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineInvite = async (fromUserId: string) => {
    try {
      const res = await fetch('/api/honey/decline', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromUserId })
      });
      if (res.ok) {
        fetchPendingInvites();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = discoverableUsers.filter(u => {
    if (activeFilter === 'Favorites' && !favorites[u.id]) return false;
    
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const nameMatch = u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    const interestMatch = Array.isArray(u.interests) && u.interests.some((interest: string) => interest.toLowerCase().includes(q));
    return nameMatch || interestMatch;
  });

  const renderActionButton = (u: any) => {
    const isPartner = u.relationship === 'COUPLE';
    const isBff = u.relationship === 'BFF';
    const isFriend = u.relationship === 'FRIENDS';

    if (isFriend || isBff || isPartner) {
      return (
        <button disabled className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold w-full">
          Friends
        </button>
      );
    }
    if (u.hasSentInvite) {
      return (
        <button disabled className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold w-full">
          Requested
        </button>
      );
    }
    if (u.hasReceivedInvite) {
      return (
        <button onClick={(e) => { e.stopPropagation(); handleAcceptInvite(u.id); }} className="px-3 py-1.5 rounded-full bg-[#0084FF] text-white text-[10px] font-bold w-full">
          Accept
        </button>
      );
    }
    if (u.honeyMePermission === 'SILENT') {
      return (
        <button disabled className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold w-full">
          Silent
        </button>
      );
    }
    return (
      <button onClick={(e) => { e.stopPropagation(); handleSendInvite(u.id); }} className="px-3 py-1.5 rounded-full bg-[#0084FF] hover:bg-blue-500 text-white transition-colors text-[10px] font-bold w-full shadow-lg shadow-blue-500/30">
        {u.honeyMePermission === 'OPEN' ? 'Message' : u.honeyMePermission === 'REQUEST' ? 'Add Friend' : 'Invite'}
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-slate-200 overflow-hidden font-sans">
      
      {/* Dimber-style Header */}
      <div className="flex items-center justify-between px-5 py-4 gap-4 flex-shrink-0">
        <h1 className="text-xl font-black tracking-tight text-[#0084FF]">HoneyMe</h1>
        
        <div className="flex-1 max-w-xs relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="discovery-search-input"
            name="discovery-search-input"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search here..."
            className="w-full bg-[var(--theme-surface)]/60 border border-[var(--theme-border)]/40 rounded-full pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#0084FF] transition-all placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowInbox(true)} className="relative p-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/60 text-slate-300 hover:text-white transition-colors">
            <Bell className="w-4 h-4" />
            {pendingInvites.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0B0F19]"></span>
            )}
          </button>
          <div className="relative">
            <div 
              className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 cursor-pointer hover:border-[#0084FF] transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {user?.avatar && user.avatar.length <= 2 ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-sm">{user.avatar}</div>
              ) : (
                <img src={user?.avatar || 'https://via.placeholder.com/150'} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
            </div>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                <div className="absolute top-10 right-0 w-48 bg-[#151A28] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button 
                    onClick={() => { setShowUserMenu(false); onOpenLensesSettings && onOpenLensesSettings(); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors text-left"
                  >
                    <Layers className="w-4 h-4 text-purple-400" /> ตั้งค่า เลนส์
                  </button>
                  <button 
                    onClick={() => { setShowUserMenu(false); setShowSettings(true); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-blue-400" /> ตั้งค่า Honey Me
                  </button>
                  <div className="h-px bg-slate-800 my-1"></div>
                  <button 
                    onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" /> ออกจากระบบ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-20">
        
        {/* Public Stories */}
        <StoriesSpace
          user={user}
          circles={circles}
          bffGroups={bffGroups}
          userPrivateKey={userPrivateKey}
          userPublicKey={userPublicKey}
          onStartReplyChat={() => {}}
          filterVisibility="public"
          layout="row"
        />

        {/* Filters */}
        <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          {filters.map(f => (
            <button 
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === f 
                  ? 'bg-slate-800 border border-slate-600 text-white' 
                  : 'bg-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Top of the week Section */}
        {filteredUsers.length > 0 && (
          <div className="mt-4">
            <h2 className="px-5 text-sm font-bold text-white mb-3 tracking-wide">Top of the week</h2>
            <div className="px-5 flex gap-4 overflow-x-auto scrollbar-none pb-4 snap-x">
              {filteredUsers.slice(0, 5).map((u, idx) => (
                <div key={`top-${u.id}`} onClick={() => setSelectedProfile(u)} className="cursor-pointer relative w-72 h-40 sm:w-80 sm:h-44 rounded-3xl overflow-hidden flex-shrink-0 group snap-center border border-slate-800/60 shadow-lg">
                  {/* Background */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ 
                      backgroundColor: u.banner && !u.banner.startsWith('data:') && !u.banner.startsWith('http') ? u.banner : '#1A1F2E',
                      backgroundImage: u.banner && (u.banner.startsWith('data:') || u.banner.startsWith('http')) ? `url(${u.banner})` : undefined
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/20 to-transparent opacity-90" />
                  
                  {/* Number Badge */}
                  <div className="absolute top-4 left-4 w-7 h-7 rounded-full bg-white text-black font-black text-xs flex items-center justify-center shadow-lg">
                    0{idx + 1}
                  </div>

                  {/* Info */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-slate-800">
                        {u.avatar && u.avatar.length <= 2 ? (
                          <div className="w-full h-full flex items-center justify-center text-sm">{u.avatar}</div>
                        ) : (
                          <img src={u.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <UserDisplay user={u} className="text-base font-bold text-white leading-tight" />
                          <div className="w-3.5 h-3.5 bg-[#0084FF] rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-300 line-clamp-1">{u.status || u.bio || `@${u.username}`}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Grid */}
        <div className="mt-4 px-5">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-sm font-bold text-white tracking-wide">Trending</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredUsers.slice(5).map(u => {
              const rating = (4.0 + ((u.id.length % 10) / 10)).toFixed(1);
              const reviews = (u.id.length * 7 % 120) + 10;
              
              return (
              <div key={`trending-${u.id}`} onClick={() => setSelectedProfile(u)} className="cursor-pointer bg-[var(--theme-surface)]/30 rounded-3xl overflow-hidden border border-[var(--theme-border)]/40 flex flex-col group hover:border-[var(--theme-border)]/60 transition-colors">
                <div 
                  className="h-32 w-full bg-cover bg-center relative"
                  style={{ 
                    backgroundColor: u.banner && !u.banner.startsWith('data:') && !u.banner.startsWith('http') ? u.banner : '#1A1F2E',
                    backgroundImage: u.banner && (u.banner.startsWith('data:') || u.banner.startsWith('http')) ? `url(${u.banner})` : undefined
                  }}
                >
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-bold text-amber-400 border border-white/5">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    {rating} ({reviews})
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFavorites(prev => ({...prev, [u.id]: !prev[u.id]})); }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/5 hover:bg-black/80 transition-colors"
                  >
                    <Heart className={`w-3.5 h-3.5 ${favorites[u.id] ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                  </button>
                  {/* Floating Action Badge overlaying image */}
                  <div className="absolute -bottom-3 right-3 z-10">
                    <div className="w-6 h-6 rounded-full bg-[var(--theme-surface)] flex items-center justify-center">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full border border-[var(--theme-surface)]"></div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 pt-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <UserDisplay user={u} className="text-sm font-bold text-white truncate" />
                    <div className="w-3.5 h-3.5 bg-[#0084FF] rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mb-4 flex-1">
                    {u.bio || "Member"}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="text-[10px] font-bold text-slate-400 max-w-[50%] truncate pr-2" title={u.relevanceLabel || 'Active'}>
                      {u.relevanceLabel || 'Active'}
                    </div>
                    <div className="w-20">
                      {renderActionButton(u)}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

      </div>

      {/* Settings Modal Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--theme-surface)] sm:rounded-3xl rounded-t-3xl border border-[var(--theme-border)] overflow-hidden shadow-2xl relative p-6 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-white">Honey Me Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[var(--theme-bg)]/60 rounded-2xl border border-[var(--theme-border)]">
                <div>
                  <h4 className="font-bold text-sm text-white">Discovery Mode</h4>
                  <p className="text-[10px] text-slate-400">Allow others to find you in Honey Me</p>
                </div>
                <button
                  disabled={savingSettings}
                  onClick={() => handleUpdateSettings(!honeyMeMode, honeyMePermission)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                    honeyMeMode ? 'bg-[#0084FF]' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${
                    honeyMeMode ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact Permission</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'OPEN', label: 'Open', icon: MessageSquare, desc: 'Anyone can message' },
                    { id: 'REQUEST', label: 'Request', icon: UserPlus, desc: 'Add friend first' },
                    { id: 'INVITE', label: 'Invite', icon: Mail, desc: 'Requires invite' },
                    { id: 'SILENT', label: 'Silent', icon: VolumeX, desc: 'No contact allowed' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleUpdateSettings(honeyMeMode, p.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        honeyMePermission === p.id 
                          ? 'border-[#0084FF] bg-[#0084FF]/10 text-white shadow-inner shadow-[#0084FF]/10' 
                          : 'border-slate-800 bg-[#1A1F2E] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p.icon className={`w-4 h-4 mb-1.5 ${honeyMePermission === p.id ? 'text-[#0084FF]' : 'text-slate-500'}`} />
                      <div className="text-xs font-bold">{p.label}</div>
                      <div className="text-[9px] mt-0.5 leading-tight opacity-70">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal Overlay */}
      {showInbox && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--theme-surface)] sm:rounded-3xl rounded-t-3xl border border-[var(--theme-border)] overflow-hidden shadow-2xl relative p-6 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Incoming Signals
                {pendingInvites.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{pendingInvites.length}</span>
                )}
              </h3>
              <button onClick={() => setShowInbox(false)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-3 flex-1 scrollbar-thin">
              {pendingInvites.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
                  <Mail className="w-8 h-8 opacity-50" />
                  <p className="text-xs font-medium">No new invites</p>
                </div>
              ) : (
                pendingInvites.map(inv => (
                  <div key={inv.id} className="p-3 bg-[var(--theme-bg)]/40 border border-[var(--theme-border)]/40 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                        {inv.avatar && inv.avatar.length <= 2 ? (
                          <div className="w-full h-full flex items-center justify-center text-sm">{inv.avatar}</div>
                        ) : (
                          <img src={inv.avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate"><UserDisplay user={inv as any} /></div>
                        <div className="text-[10px] text-slate-400 truncate">@{inv.username}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleAcceptInvite(inv.id)} className="w-8 h-8 rounded-full bg-[#0084FF] text-white flex items-center justify-center hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeclineInvite(inv.id)} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--theme-surface)] rounded-3xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 flex flex-col max-h-[90vh]">
            <div className="overflow-y-auto scrollbar-thin w-full relative">
              {/* Banner */}
              <div 
                className="h-32 sm:h-40 w-full bg-cover bg-center relative flex-shrink-0"
                style={{ 
                  backgroundColor: selectedProfile.banner && !selectedProfile.banner.startsWith('data:') && !selectedProfile.banner.startsWith('http') ? selectedProfile.banner : '#1A1F2E',
                  backgroundImage: selectedProfile.banner && (selectedProfile.banner.startsWith('data:') || selectedProfile.banner.startsWith('http')) ? `url(${selectedProfile.banner})` : undefined
                }}
              >
                <button 
                  onClick={() => setSelectedProfile(null)} 
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm z-20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="px-6 pb-6 pt-0 relative flex-1">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--theme-surface)] bg-slate-800 -mt-12 mb-3 relative z-10 mx-auto shadow-xl">
                  {selectedProfile.avatar && selectedProfile.avatar.length <= 2 ? (
                    <div className="w-full h-full flex items-center justify-center text-3xl">{selectedProfile.avatar}</div>
                  ) : (
                    <img src={selectedProfile.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                </div>
                
                {/* Name & Bio */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-black text-white flex items-center justify-center gap-1.5">
                    <UserDisplay user={selectedProfile as any} />
                    <div className="w-4 h-4 bg-[#0084FF] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">@{selectedProfile.username}</p>
                  {selectedProfile.pronouns && (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 mt-2">
                      {selectedProfile.pronouns}
                    </span>
                  )}
                </div>

                {/* Status */}
                {selectedProfile.status && (
                  <div className="bg-[var(--theme-bg)]/60 rounded-2xl p-4 mb-6 border border-[var(--theme-border)]/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#0084FF]"></div>
                    <p className="text-sm text-slate-200 italic leading-relaxed">"{selectedProfile.status}"</p>
                  </div>
                )}

                {/* Bio block */}
                {selectedProfile.bio && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">About</h3>
                    <p className="text-sm text-slate-300 leading-relaxed bg-[var(--theme-bg)]/40 p-4 rounded-2xl">
                      {selectedProfile.bio}
                    </p>
                  </div>
                )}

                {/* Interests */}
                {selectedProfile.interests && selectedProfile.interests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.interests.map((interest: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700/50">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Button */}
                <div className="mt-8 pt-4 border-t border-slate-800/50">
                  <div className="w-full max-w-[200px] mx-auto">
                    {renderActionButton(selectedProfile)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
