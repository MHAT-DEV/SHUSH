import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Shield, Key, Trash2, ShieldAlert, Users, Plus, Radio, Server, 
  MonitorSmartphone, Fingerprint, GripHorizontal, ToggleLeft, ToggleRight, 
  History, X, Search, User, ShoppingBag, Palette, Star, Sparkles, Check, 
  Diamond, ShieldCheck, Heart, Moon, Sun, AlertCircle, Eye, Settings2, Award, Gift, Trophy,
  ChevronRight, Layers
} from 'lucide-react';
import UserDisplay from "./UserDisplay";
import { startRegistration } from '@simplewebauthn/browser';

interface DeviceAndLogsProps {
  user: any;
  circles: any[];
  onRefreshCircles: () => void;
  setActiveTab: (tab: any) => void;
  // Props for unified "Me" dashboard
  points: number;
  setPoints: (p: number) => void;
  activeTheme: string;
  setActiveTheme: (t: string) => void;
  activeBadge: string | null;
  setActiveBadge: (b: string | null) => void;
  activeNameColor: string | null;
  setActiveNameColor: (c: string | null) => void;
  isDarkMode: boolean;
  setIsDarkMode: (d: boolean) => void;
  friends: any[];
  couple: any;
  bffGroups: any[];
  handleLogout: () => void;
  presenceStatus: 'online' | 'busy' | 'away' | 'offline';
  handleUpdatePresenceStatus: (status: 'online' | 'busy' | 'away' | 'offline') => void;
  userLenses: any[];
  activeLensType: 'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE';
  setActiveLensType: (val: any) => void;
  setUser?: (u: any) => void;
}

const STORE_ITEMS = [
  // Themes
  { id: 'theme_default', type: 'theme', name: 'Slate Blue (Default)', description: 'ธีมมาตรฐานของระบบ', price: 0, value: 'default', preview: 'bg-slate-900 border-blue-500' },
  { id: 'theme_rose', type: 'theme', name: 'Midnight Rose', description: 'โทนสีแดงกุหลาบและชมพู', price: 500, value: 'rose', preview: 'bg-rose-950 border-rose-500' },
  { id: 'theme_midnight', type: 'theme', name: 'Deep Midnight', description: 'สีน้ำเงินเข้มแห่งรัตติกาล', price: 500, value: 'midnight', preview: 'bg-slate-950 border-sky-500' },
  { id: 'theme_forest', type: 'theme', name: 'Enchanted Forest', description: 'สีเขียวธรรมชาติ', price: 500, value: 'forest', preview: 'bg-emerald-950 border-emerald-500' },
  
  // Badges
  { id: 'badge_star', type: 'badge', name: 'Golden Star', description: 'สัญลักษณ์ดาวทองคำ', price: 200, value: '⭐' },
  { id: 'badge_sparkles', type: 'badge', name: 'Magic Sparkles', description: 'ละอองเวทมนตร์', price: 300, value: '✨' },
  { id: 'badge_fire', type: 'badge', name: 'Hot Fire', description: 'ไฟลุกโชน', price: 300, value: '🔥' },
  { id: 'badge_crown', type: 'badge', name: 'Royal Crown', description: 'มงกุฎแห่งราชา', price: 1000, value: '👑' },
  { id: 'badge_diamond', type: 'badge', name: 'Blue Diamond', description: 'เพชรสีน้ำเงิน', price: 1500, value: '💎' },
  { id: 'badge_heart', type: 'badge', name: 'Pink Heart', description: 'หัวใจสีชมพู', price: 250, value: '💖' },

  // Name Colors
  { id: 'color_gold', type: 'nameColor', name: 'Golden Aura', description: 'สีทองอร่าม', price: 400, value: '#fbbf24' },
  { id: 'color_rose', type: 'nameColor', name: 'Rose Pink', description: 'สีชมพูกุหลาบ', price: 400, value: '#f43f5e' },
  { id: 'color_cyan', type: 'nameColor', name: 'Cyan Glow', description: 'สีฟ้านีออน', price: 400, value: '#22d3ee' },
  { id: 'color_grad_fire', type: 'nameColor', name: 'Fire Gradient', description: 'ไล่สีเพลิง', price: 800, value: 'gradient-fire' },
  { id: 'color_grad_ocean', type: 'nameColor', name: 'Ocean Gradient', description: 'ไล่สีมหาสมุทร', price: 800, value: 'gradient-ocean' },
];

const EMOJI_AVATARS = [
  '🐱', '🦊', '🐻', '🦁', '🐨', '🐼', '🐯', '🐮',
  '🐸', '🐣', '🦄', '🌈', '⚡', '🌸', '🥑', '🎮',
  '🎨', '🚀', '💻', '🪐', '🍿', '💙', '💕', '👑'
];

const renderAvatar = (avatarVal: string, sizeClass = "w-12 h-12 text-2xl") => {
  if (!avatarVal) return '👤';
  if (avatarVal.length <= 2) {
    return avatarVal; // emoji
  }
  if (avatarVal.startsWith('http') || avatarVal.startsWith('data:')) {
    return <img src={avatarVal} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />;
  }
  const emojiIndex = parseInt(avatarVal, 10);
  if (!isNaN(emojiIndex) && EMOJI_AVATARS[emojiIndex]) {
    return EMOJI_AVATARS[emojiIndex];
  }
  return '👤';
};

export default function DeviceAndLogs({
  setActiveTab,
  user,
  circles,
  onRefreshCircles,
  points,
  setPoints,
  activeTheme,
  setActiveTheme,
  activeBadge,
  setActiveBadge,
  activeNameColor,
  setActiveNameColor,
  isDarkMode,
  setIsDarkMode,
  friends,
  couple,
  bffGroups,
  handleLogout,
  presenceStatus,
  handleUpdatePresenceStatus,
  userLenses,
  activeLensType,
  setActiveLensType,
  setUser
}: DeviceAndLogsProps) {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [shhPass, setShhPass] = useState<any>(null);
  const [newCircleName, setNewCircleName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Honey Me mode inline state
  const [honeyMeMode, setHoneyMeMode] = useState(user?.honeyMeMode || false);
  const [honeyMePermission, setHoneyMePermission] = useState<'OPEN' | 'REQUEST' | 'INVITE' | 'SILENT'>(user?.honeyMePermission || 'REQUEST');

  // Pet info state
  const [pet, setPet] = useState<any | null>(null);

  // Shop owned items
  const [ownedItems, setOwnedItems] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('shush_owned_items') || '["theme_default"]')
  );

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    account: true,
    communication: true,
    privacy: true,
    discovery: false,
    pet: false,
    shop: false,
    developer: false,
    settings: false,
  });

  const [totpSetup, setTotpSetup] = useState<{ secret: string, qrCodeDataUrl: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [showSecurityQuestionsModal, setShowSecurityQuestionsModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchData();
    fetchHoneySettings();
    fetchPet();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const devRes = await fetch('/api/devices', { headers });
      if (devRes.ok && devRes.headers.get('content-type')?.includes('application/json')) {
        const devData = await devRes.json();
        setDevices(Array.isArray(devData) ? devData : []);
      } else {
        setDevices([]);
      }

      const logRes = await fetch('/api/audit-logs', { headers });
      if (logRes.ok && logRes.headers.get('content-type')?.includes('application/json')) {
        const logData = await logRes.json();
        setLogs(Array.isArray(logData) ? logData : []);
      } else {
        setLogs([]);
      }

      const shRes = await fetch('/api/shhpass/settings', { headers });
      if (shRes.ok && shRes.headers.get('content-type')?.includes('application/json')) {
        const shData = await shRes.json();
        setShhPass(shData);
      }
    } catch (e) {
      console.warn('Silent notice: Failed to fetch device/log settings:', e);
    }
    setLoading(false);
  };

  const fetchHoneySettings = async () => {
    try {
      const res = await fetch('/api/honey/settings', { headers });
      if (res.ok) {
        const data = await res.json();
        setHoneyMeMode(data.honeyMeMode);
        setHoneyMePermission(data.honeyMePermission);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateHoneySettings = async (mode: boolean, perm: any) => {
    try {
      const res = await fetch('/api/honey/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode, permission: perm })
      });
      if (res.ok) {
        setHoneyMeMode(mode);
        setHoneyMePermission(perm);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPet = async () => {
    try {
      const res = await fetch('/api/pet/me', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.pet) {
          setPet({ ...data.pet, coins: data.coins });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateShhPass = async (updates: any) => {
    const newShhPass = { ...shhPass, ...updates };
    setShhPass(newShhPass);
    try {
      await fetch('/api/shhpass/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ shhPass: newShhPass })
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const handleAddPasskey = async () => {
    try {
      const resp = await fetch('/api/shhpass/webauthn/register/options', { headers });
      if (!resp.ok) throw new Error('Failed to get registration options');
      const options = await resp.json();
      
      let attResp;
      try {
        attResp = await startRegistration(options);
      } catch (e: any) {
        if (e.name === 'NotAllowedError') {
          return alert('การสร้าง Passkey ถูกยกเลิก หรืออุปกรณ์ไม่รองรับ');
        }
        throw e;
      }
      
      const verifyResp = await fetch('/api/shhpass/webauthn/register/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ response: attResp, name: 'Passkey ' + new Date().toLocaleDateString() })
      });
      
      const verifyData = await verifyResp.json();
      if (verifyData.success) {
        alert('เพิ่ม Passkey สำเร็จ!');
        fetchData();
      } else {
        alert('การตรวจสอบ Passkey ล้มเหลว: ' + verifyData.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้าง Passkey: ' + err.message);
    }
  };

  const handleAddSecurityKey = async () => {
    try {
      const resp = await fetch('/api/shhpass/webauthn/register/options?attachment=cross-platform', { headers });
      if (!resp.ok) throw new Error('Failed to get registration options');
      const options = await resp.json();
      
      let attResp;
      try {
        attResp = await startRegistration(options);
      } catch (e: any) {
        if (e.name === 'NotAllowedError') {
          return alert('การสร้าง Security Key ถูกยกเลิก หรืออุปกรณ์ไม่รองรับ');
        }
        throw e;
      }
      
      const verifyResp = await fetch('/api/shhpass/webauthn/register/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ response: attResp, name: 'Security Key ' + new Date().toLocaleDateString() })
      });
      
      const verifyData = await verifyResp.json();
      if (verifyData.success) {
        await handleUpdateShhPass({ securityKeyEnabled: true });
        alert('เพิ่ม Security Key สำเร็จ!');
      } else {
        alert('การตรวจสอบ Security Key ล้มเหลว: ' + verifyData.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้าง Security Key: ' + err.message);
    }
  };

  const startTotpSetup = async () => {
    try {
      const res = await fetch('/api/shhpass/totp/setup', { headers });
      const data = await res.json();
      setTotpSetup(data);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถดึงข้อมูล TOTP Setup ได้');
    }
  };

  const handleVerifyTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shhpass/totp/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: totpVerifyCode })
      });
      const data = await res.json();
      if (data.success) {
        setTotpSetup(null);
        setTotpVerifyCode('');
        alert('ตั้งค่า Authenticator App สำเร็จ!');
        fetchData();
      } else {
        alert('รหัสไม่ถูกต้อง กรุณาลองใหม่');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    if (!confirm('คุณแน่ใจว่าต้องการยกเลิกสิทธิ์และตัดการเชื่อมต่อของอุปกรณ์นี้?')) return;
    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'ล้มเหลวในการเพิกถอนอุปกรณ์');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName) return;
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newCircleName })
      });
      if (res.ok) {
        setNewCircleName('');
        onRefreshCircles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCircle = async (id: string) => {
    try {
      const res = await fetch(`/api/circles/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        onRefreshCircles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurchase = (item: any) => {
    if (ownedItems.includes(item.id)) return;
    if (points >= item.price) {
      const remPoints = points - item.price;
      setPoints(remPoints);
      const newOwned = [...ownedItems, item.id];
      setOwnedItems(newOwned);
      localStorage.setItem('shush_owned_items', JSON.stringify(newOwned));
    } else {
      alert('แต้มไม่พอสำหรับการซื้อไอเทมนี้');
    }
  };

  const handleEquip = (item: any) => {
    if (item.type === 'theme') {
      setActiveTheme(item.value);
    } else if (item.type === 'badge') {
      if (activeBadge === item.value) {
        setActiveBadge(null);
        localStorage.removeItem('shush_active_badge');
      } else {
        setActiveBadge(item.value);
        localStorage.setItem('shush_active_badge', item.value);
      }
    } else if (item.type === 'nameColor') {
      if (activeNameColor === item.value) {
        setActiveNameColor(null);
        localStorage.removeItem('shush_active_name_color');
      } else {
        setActiveNameColor(item.value);
        localStorage.setItem('shush_active_name_color', item.value);
      }
    }
  };

  // Toggle Section Helper
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


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
    return searchMapping[sec].some((k: string) => k.includes(q));
  };

  // If search query exists, automatically expand matching categories
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matches: Record<string, boolean> = {};

      Object.entries(searchMapping).forEach(([sec, keywords]) => {
        matches[sec] = keywords.some(k => k.includes(q));
      });

      setExpandedSections(prev => ({
        ...prev,
        ...matches
      }));
    }
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg)] overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm">
      
      {/* 🌟 Global Header Profile Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--theme-border)]/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center font-display font-black text-lg">
            {user?.displayName?.[0] || 'M'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold font-display text-[var(--theme-text-primary)]">พื้นที่ของฉัน (Me Workspace)</h2>
              {activeBadge && <span className="text-sm select-none" title="Active Badge">{activeBadge}</span>}
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              จัดการโปรไฟล์ เลนส์ความสัมพันธ์ คลังแต้ม Zero Trust และระบบควบคุมแอปพลิเคชัน
            </p>
          </div>
        </div>
        
        {/* Points Quick Indicator */}

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button onClick={() => setActiveTab('achievements')} className="flex items-center gap-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 px-4 py-1.5 rounded-xl hover:bg-[var(--theme-primary)]/20 transition-colors">
            <Trophy className="w-4 h-4" />
            <span className="font-bold text-xs">Missions</span>
          </button>
          
          <div className="flex items-center gap-2 bg-[var(--theme-surface)]/60 border border-[var(--theme-border)] px-4 py-1.5 rounded-xl">
            <Diamond className="w-4 h-4 text-cyan-400" />
            <span className="font-bold font-mono text-[var(--theme-text-primary)]">{points.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 🔍 Global Settings Search Container */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[var(--theme-text-secondary)]" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ค้นหาเมนูการตั้งค่า ความเป็นส่วนตัว อุปกรณ์ หรือร้านค้า..." 
          className="w-full pl-10 pr-4 py-2 bg-[var(--theme-surface)]/60 border border-[var(--theme-border)]/80 rounded-xl text-xs sm:text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-2.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 📋 Section Category Searchable List */}
      <div className="space-y-4 pb-20">
        
        {/* 1. ACCOUNT */}
        {isSectionVisible('account') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('account')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>บัญชีและการยืนยันตัวตน (Account Profile)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.account ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.account && (
              <div className="p-4 pt-0 space-y-3.5 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                <div className="flex items-center justify-between bg-[var(--theme-bg)]/40 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--theme-surface-hover)] border border-[var(--theme-border)]/60 flex items-center justify-center overflow-hidden flex-shrink-0 text-2xl">
                      {renderAvatar(user?.avatar)}
                    </div>
                    <div>
                      <UserDisplay user={user || { displayName: "" }} className="text-lg" />
                      <div className="text-[10px] text-[var(--theme-text-secondary)] font-mono">@{user?.username}</div>
                    </div>
                  </div>
                  
                  {/* Presence switcher */}
                  <div className="flex items-center gap-2">
                    <select
                      value={presenceStatus}
                      onChange={(e) => handleUpdatePresenceStatus(e.target.value as any)}
                      className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg px-2 py-1 text-[10px] text-[var(--theme-text-primary)] cursor-pointer focus:outline-none"
                    >
                      <option value="online">🟢 ออนไลน์</option>
                      <option value="busy">🔴 ไม่ว่าง</option>
                      <option value="away">🟡 ไม่อยู่</option>
                      <option value="offline">⚫ ออฟไลน์</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[var(--theme-text-secondary)]">
                  <div className="bg-[var(--theme-bg)]/40 p-3 rounded-xl space-y-1">
                    <span className="font-extrabold text-[var(--theme-text-primary)] uppercase text-[9px] tracking-wider block">สับเปลี่ยนเลนส์ตัวตน (Active Lens)</span>
                    <p className="mb-2">ปกปิดตัวตนของคุณในมุมมองระดับความสัมพันธ์ที่ต้องการได้ทันที</p>
                    <select
                      value={activeLensType}
                      onChange={e => setActiveLensType(e.target.value as any)}
                      className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg px-2 py-1 text-xs text-[var(--theme-text-primary)] cursor-pointer focus:outline-none font-semibold"
                    >
                      <option value="PUBLIC">🌍 Public Lens (ผู้ใช้ทั่วไป)</option>
                      <option value="FRIENDS">👥 Friends Lens (เพื่อนสนิท)</option>
                      <option value="BFF">🌟 BFF Lens (กลุ่มเพื่อนพิเศษ)</option>
                      <option value="COUPLE">💖 Couple Lens (คู่รักคนโปรด)</option>
                    </select>
                  </div>

                  <div className="bg-[var(--theme-bg)]/40 p-3 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="font-extrabold text-[var(--theme-text-primary)] uppercase text-[9px] tracking-wider block">Bio คำอธิบายตัวตน</span>
                      <p className="mt-1 font-sans italic text-[var(--theme-text-secondary)]">"{user?.bio || 'ไม่มีข้อมูลสังเขปคำอธิบาย'}"</p>
                    </div>
                    
                    <button 
                      onClick={() => setActiveTab('lenses')}
                      className="mt-2 w-full bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 rounded-lg py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      ตั้งค่าเลนส์ตัวตน (Lenses Profile)
                    </button>
                    
                    <button 
                      onClick={handleLogout}
                      className="mt-3 w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg py-1.5 text-xs font-bold transition-all"
                    >
                      ออกจากระบบจากเซสชันนี้
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. COMMUNICATION */}
        {isSectionVisible('communication') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('communication')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>กลุ่มความสัมพันธ์และแวดวง (Relationship Circles)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.communication ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.communication && (
              <div className="p-4 pt-0 space-y-4 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                {/* Connected stats */}
                <div className="grid grid-cols-3 gap-3 text-center mt-3">
                  <div className="bg-[var(--theme-bg)]/30 p-2.5 rounded-xl border border-[var(--theme-border)]/40">
                    <span className="block font-bold text-base text-[var(--theme-text-primary)]">{friends.length}</span>
                    <span className="text-[10px] text-[var(--theme-text-secondary)] font-semibold">เพื่อนทั้งหมด</span>
                  </div>
                  <div className="bg-[var(--theme-bg)]/30 p-2.5 rounded-xl border border-[var(--theme-border)]/40">
                    <span className="block font-bold text-base text-[var(--theme-text-primary)]">{bffGroups.length}</span>
                    <span className="text-[10px] text-[var(--theme-text-secondary)] font-semibold">กลุ่ม BFF</span>
                  </div>
                  <div className="bg-[var(--theme-bg)]/30 p-2.5 rounded-xl border border-[var(--theme-border)]/40">
                    <span className="block font-bold text-base text-[var(--theme-text-primary)]">{couple ? 'เชื่อมโยงแล้ว' : 'ยังไม่มีคู่'}</span>
                    <span className="text-[10px] text-[var(--theme-text-secondary)] font-semibold">สถานะคู่รัก</span>
                  </div>
                </div>

                {/* Circles list manager */}
                <div className="space-y-3">
                  <form onSubmit={handleAddCircle} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newCircleName}
                      onChange={e => setNewCircleName(e.target.value)}
                      placeholder="สร้างกลุ่มใหม่ เช่น เพื่อนร่วมงาน, ครอบครัว..."
                      className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      เพิ่ม Circle
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {circles.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-[var(--theme-bg)]/30 p-2.5 rounded-xl border border-[var(--theme-border)]/50 text-xs">
                        <div>
                          <span className="font-semibold text-[var(--theme-text-primary)]">{c.name}</span>
                          <span className="block text-[9px] text-[var(--theme-text-secondary)]">ประเภท: {c.type}</span>
                        </div>
                        {c.type === 'CUSTOM' && (
                          <button
                            onClick={() => handleDeleteCircle(c.id)}
                            className="text-[var(--theme-text-secondary)] hover:text-red-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PRIVACY */}
        {isSectionVisible('privacy') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('privacy')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <Fingerprint className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>ความปลอดภัยความเป็นส่วนตัวขั้นสุด (Zero Trust Privacy)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.privacy ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.privacy && (
              <div className="p-4 pt-0 space-y-4 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                <div className="bg-[var(--theme-primary)]/5 p-3 rounded-xl border border-[var(--theme-primary)]/20 text-[11px] text-[var(--theme-text-secondary)] mt-3">
                  <span className="font-bold text-[var(--theme-primary)] block mb-1">🔐 End-to-End Cryptography Active</span>
                  <p className="leading-relaxed">
                    ระบบ Shush จัดเก็บและรับส่งข้อมูลส่วนบุคคล แชท คลังไฟล์ และสตอรี่ผ่านสถาปัตยกรรมเข้ารหัสกุญแจส่วนบุคคลแบบ 256-bit AES คู่กับ RSA-2048 โดยไม่มีการเก็บรหัสผ่านหลักไว้บนระบบคลาวด์
                  </p>
                  <div className="mt-2 font-mono text-[9px] truncate text-[var(--theme-text-primary)] bg-[var(--theme-bg)] p-1.5 rounded border border-[var(--theme-border)]/50">
                    PUBLIC KEY FINGERPRINT: {user?.publicKey?.substring(0, 48)}...
                  </div>
                </div>

                {/* Credentials Management */}
                {shhPass && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Passkey */}
                    <div className="bg-[var(--theme-bg)]/40 p-3 rounded-xl border border-[var(--theme-border)]/40 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[var(--theme-text-primary)] flex items-center gap-1"><MonitorSmartphone className="w-3.5 h-3.5 text-[var(--theme-primary)]"/> Passkeys</span>
                        <p className="text-[10px] text-[var(--theme-text-secondary)]">{(shhPass.passkeys || []).length} อุปกรณ์ลงทะเบียนไว้</p>
                      </div>
                      <button onClick={handleAddPasskey} className="text-[10px] bg-[var(--theme-primary)] text-white px-2 py-1 rounded font-semibold hover:opacity-95">
                        เพิ่มกุญแจ
                      </button>
                    </div>

                    {/* TOTP 2FA */}
                    <div className="bg-[var(--theme-bg)]/40 p-3 rounded-xl border border-[var(--theme-border)]/40 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[var(--theme-text-primary)] flex items-center gap-1"><GripHorizontal className="w-3.5 h-3.5 text-[var(--theme-primary)]"/> 2FA Authenticator</span>
                        <p className="text-[10px] text-[var(--theme-text-secondary)]">ระบบล็อกอินรหัส 2 ชั้นผ่านแอปพลิเคชัน</p>
                      </div>
                      <button 
                        onClick={() => shhPass.totpEnabled ? handleUpdateShhPass({ totpEnabled: false }) : startTotpSetup()} 
                        className="text-[var(--theme-text-secondary)]"
                      >
                        {shhPass.totpEnabled ? <ToggleRight className="w-7 h-7 text-[var(--theme-primary)]"/> : <ToggleLeft className="w-7 h-7"/>}
                      </button>
                    </div>

                    {/* Security FIDO2 */}
                    <div className="bg-[var(--theme-bg)]/40 p-3 rounded-xl border border-[var(--theme-border)]/40 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[var(--theme-text-primary)] flex items-center gap-1"><Key className="w-3.5 h-3.5 text-[var(--theme-primary)]"/> Security Hardware Key</span>
                        <p className="text-[10px] text-[var(--theme-text-secondary)]">เปิดใช้งานกุญแจฮาร์ดแวร์ภายนอก (FIDO2)</p>
                      </div>
                      <button 
                        onClick={() => shhPass.securityKeyEnabled ? handleUpdateShhPass({ securityKeyEnabled: false }) : handleAddSecurityKey()} 
                        className="text-[var(--theme-text-secondary)]"
                      >
                        {shhPass.securityKeyEnabled ? <ToggleRight className="w-7 h-7 text-[var(--theme-primary)]"/> : <ToggleLeft className="w-7 h-7"/>}
                      </button>
                    </div>

                    {/* Security Questions */}
                    <div className="bg-[var(--theme-bg)]/40 p-3 rounded-xl border border-[var(--theme-border)]/40 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[var(--theme-text-primary)] flex items-center gap-1"><History className="w-3.5 h-3.5 text-[var(--theme-primary)]"/> Security Questions</span>
                        <p className="text-[10px] text-[var(--theme-text-secondary)]">{(shhPass.securityQuestions || []).length} รายการคำถามกู้คืน</p>
                      </div>
                      <button 
                        onClick={() => setShowSecurityQuestionsModal(true)} 
                        className="text-[10px] bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] px-2.5 py-1 rounded"
                      >
                        จัดการ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. DISCOVERY */}
        {isSectionVisible('discovery') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('discovery')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>การเชื่อมต่อและโหมด Honey Me (Discovery & Privacy Mode)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.discovery ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.discovery && (
              <div className="p-4 pt-0 space-y-3.5 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                <div className="bg-[var(--theme-bg)]/40 p-3.5 rounded-xl flex items-center justify-between mt-3 text-xs">
                  <div>
                    <span className="font-bold text-[var(--theme-text-primary)] block">🍯 เปิดเผยโหมดน้ำผึ้ง (Honey Me Mode)</span>
                    <p className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5">อนุญาตให้ผู้ใช้อื่นที่มีความเคมีตรงกันมองเห็นเลนส์ Public ของคุณเพื่อค้นพบกัน</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateHoneySettings(!honeyMeMode, honeyMePermission)}
                    className="focus:outline-none"
                  >
                    {honeyMeMode ? <ToggleRight className="w-8 h-8 text-amber-500"/> : <ToggleLeft className="w-8 h-8 text-[var(--theme-text-secondary)]"/>}
                  </button>
                </div>

                {honeyMeMode && (
                  <div className="space-y-2">
                    <span className="font-extrabold text-[var(--theme-text-primary)] uppercase text-[9px] tracking-wider block">ระดับสิทธิ์การส่งทักทายกลับ (Honey Permission)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      {[
                        { id: 'OPEN', title: '💬 คุยด่วน (OPEN)', desc: 'ทักตรงโดยไม่ต้องแอด' },
                        { id: 'REQUEST', title: '👥 ยินยอม (REQUEST)', desc: 'ต้องยอมรับคำขอแอดก่อน' },
                        { id: 'INVITE', title: '🤝 ชักชวน (INVITE)', desc: 'เฉพาะที่มีรหัสเชิญเชือมโยง' },
                        { id: 'SILENT', title: '📴 ไร้เงา (SILENT)', desc: 'ค้นพบได้แต่ทักทายเงียบสงบ' }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleUpdateHoneySettings(honeyMeMode, p.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${honeyMePermission === p.id ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' : 'bg-[var(--theme-bg)]/40 border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-border)]'}`}
                        >
                          <span>{p.title}</span>
                          <span className="text-[8px] opacity-80 mt-1 font-normal block leading-tight">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. PET */}
        {isSectionVisible('pet') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('pet')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-[var(--theme-primary)] animate-pulse" />
                <span>คลังแต้มสัตว์เลี้ยงตัวโปรด (Compact PET Dashboard)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.pet ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.pet && (
              <div className="p-4 pt-0 space-y-3 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                {pet ? (
                  <div className="bg-[var(--theme-bg)]/40 p-3 rounded-xl flex items-center justify-between gap-4 mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/10 text-xl flex items-center justify-center">
                        {pet.species === 'cat' ? '🐱' : pet.species === 'dog' ? '🐶' : pet.species === 'rabbit' ? '🐰' : '🐾'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--theme-text-primary)] text-sm">{pet.name}</span>
                          <span className="text-[9px] bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] px-1.5 rounded-full font-semibold">LV.{pet.level || 1}</span>
                        </div>
                        <p className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5">XP: {pet.xp || 0}/100 • พลังงานความอิ่มตัว: {pet.satiety || 0}%</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="block font-bold text-base text-amber-400">🪙 {pet.coins || 0}</span>
                      <span className="text-[9px] text-[var(--theme-text-secondary)]">เหรียญสัตว์เลี้ยง</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-[var(--theme-text-secondary)] bg-[var(--theme-bg)]/20 rounded-xl mt-3">
                    <p className="font-semibold text-xs text-[var(--theme-text-primary)]">คุณยังไม่ได้เปิดตัวรับสัตว์เลี้ยงของตัวเองใช่ไหม? 🐾</p>
                    <p className="text-[10px] mt-1 mb-3">เข้าสู่ระบบสัตว์เลี้ยง PET Space ในแถบเมนูด้านล่างเพื่อรับฟองไข่คู่ซี้ร่วมความสัมพันธ์</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. SHOP */}
        {isSectionVisible('shop') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('shop')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>ร้านค้าสัญลักษณ์และตราตั้ง (Shh Store)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.shop ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.shop && (
              <div className="p-4 pt-0 space-y-4 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                <p className="text-[10px] text-[var(--theme-text-secondary)] mt-3 leading-relaxed">
                  ใช้แต้มคะแนนที่สะสมในห้องสนทนาแลกรับของตกแต่ง ตราสัญลักษณ์ และสับเปลี่ยนธีมแอปรอบระบบเพื่อความล้ำยุค
                </p>

                {/* Sub-grid of purchaseable badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {STORE_ITEMS.map(item => {
                    const isOwned = ownedItems.includes(item.id);
                    const isEquipped = activeTheme === item.value || activeBadge === item.value || activeNameColor === item.value;
                    
                    return (
                      <div key={item.id} className="bg-[var(--theme-bg)]/40 p-3 rounded-xl border border-[var(--theme-border)]/50 flex flex-col justify-between gap-2.5 text-xs text-left">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--theme-text-primary)] text-xs">{item.name}</span>
                            <span className="text-[10px] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] px-1.5 py-0.2 rounded font-mono uppercase font-semibold">{item.type}</span>
                          </div>
                          <p className="text-[9px] text-[var(--theme-text-secondary)] mt-1">{item.description}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">💎 {item.price} PTS</span>
                          
                          {isOwned ? (
                            <button
                              onClick={() => handleEquip(item)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${isEquipped ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] text-[var(--theme-text-primary)]'}`}
                            >
                              {isEquipped ? 'ติดตั้งแล้ว ✓' : 'สวมใส่'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchase(item)}
                              className="px-2 py-0.5 bg-[var(--theme-primary)] text-[var(--theme-primary-content)] rounded text-[10px] font-bold hover:bg-[var(--theme-primary-hover)] transition-all"
                            >
                              ซื้อไอเทม
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. DEVELOPER */}
        {isSectionVisible('developer') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('developer')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>เครื่องมือเซสชันและตรวจสอบ (System Device Sessions & Computer Crime Act Logs)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.developer ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.developer && (
              <div className="p-4 pt-0 space-y-4 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                
                {/* Device Lists */}
                <div className="space-y-2 mt-3">
                  <span className="font-extrabold text-[var(--theme-text-primary)] uppercase text-[9px] tracking-wider block">อุปกรณ์ที่ล็อกอินปัจจุบัน ({devices.length})</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {devices.map(dev => (
                      <div key={dev.id} className="flex items-center justify-between bg-[var(--theme-bg)]/40 p-2.5 rounded-xl border border-[var(--theme-border)]/30 text-[10px]">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-[var(--theme-text-primary)]">
                            <Smartphone className="w-3 h-3 text-[var(--theme-primary)]"/>
                            <span>{dev.name} ({dev.os})</span>
                          </div>
                          <span className="text-[9px] text-[var(--theme-text-secondary)] font-mono block mt-0.5">IP: {dev.ip} • ใช้งานล่าสุด: {new Date(dev.lastActiveAt).toLocaleString('th-TH')}</span>
                        </div>

                        <button 
                          onClick={() => handleRevokeDevice(dev.id)}
                          className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg border border-transparent transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Logs Standard computer crime act */}
                <div className="space-y-2 bg-[var(--theme-bg)]/50 p-3 rounded-xl border border-[var(--theme-border)]/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[var(--theme-border)]/30">
                    <span className="font-extrabold text-[var(--theme-text-primary)] uppercase text-[9px] tracking-wider">บันทึก Technical Telemetry Metadata (พ.ร.บ.คอมพิวเตอร์ฯ)</span>
                    <span className="text-[8px] uppercase font-mono px-1.5 py-0.2 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded text-[var(--theme-text-secondary)]">90 Days Active</span>
                  </div>
                  
                  <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[9px] text-[var(--theme-text-secondary)] pr-1">
                    {logs.map(log => (
                      <div key={log.id} className="flex justify-between items-center py-1 hover:bg-[var(--theme-surface)]/20 px-1 rounded">
                        <span>● EVENT: <span className="text-violet-300">{log.event}</span></span>
                        <span>IP: {log.ip}</span>
                        <span>{new Date(log.createdAt).toLocaleTimeString('th-TH')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. SETTINGS */}
        {isSectionVisible('settings') && (
          <div className="bg-[var(--theme-surface)]/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => toggleSection('settings')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--theme-surface)]/30 transition-all font-semibold text-[var(--theme-text-primary)]"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>การตั้งค่าความสวยงามและโหมดแสดงผล (App Appearance Settings)</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.settings ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.settings && (
              <div className="p-4 pt-0 space-y-4 border-t border-[var(--theme-border)]/30 bg-[var(--theme-surface)]/5">
                
                {/* Theme presets toggles */}
                <div className="space-y-2.5 mt-3">
                  <span className="font-extrabold text-[var(--theme-text-primary)] uppercase text-[9px] tracking-wider block">สับเปลี่ยนความสวยงามของเฉดสีธีม (Appearance Theme Style)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'default', label: 'Slate Blue (Default)' },
                      { id: 'rose', label: 'Midnight Rose 🌹' },
                      { id: 'midnight', label: 'Deep Midnight 🌌' },
                      { id: 'forest', label: 'Enchanted Forest 🌲' }
                    ].map(t => {
                      const isEquipped = activeTheme === t.id;
                      const isOwned = ownedItems.includes('theme_' + t.id) || t.id === 'default';
                      
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            if (isOwned) {
                              setActiveTheme(t.id);
                            } else {
                              alert('คุณต้องซื้อธีมนี้ก่อนจากหมวด Shop เพื่อเปิดการใช้งาน');
                            }
                          }}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${isEquipped ? 'bg-[var(--theme-primary)] text-[var(--theme-primary-content)] font-bold border-transparent shadow-lg shadow-[var(--theme-primary)]/15' : 'bg-[var(--theme-bg)]/40 border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-border)]'} ${!isOwned ? 'opacity-40' : ''}`}
                        >
                          <span className="text-xs">{t.label}</span>
                          {!isOwned && <span className="text-[8px] uppercase tracking-wide bg-amber-500/20 text-amber-400 px-1 rounded-md font-extrabold">LOCK 🔒</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Light vs Dark Switch */}
                <div className="flex items-center justify-between bg-[var(--theme-bg)]/40 p-3 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-[var(--theme-text-primary)] block">โหมดสว่าง-มืด (Dynamic Color Mode)</span>
                    <p className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5">สลับการแสดงผลของโทนสีสว่างเพื่อความสบายตาทุกที่ทุกเวลา</p>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="flex items-center gap-1.5 bg-[var(--theme-surface)]/80 border border-[var(--theme-border)] px-3 py-1.5 rounded-xl font-bold text-[var(--theme-text-primary)] cursor-pointer"
                  >
                    {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400"/> : <Moon className="w-3.5 h-3.5 text-cyan-400"/>}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                </div>

                {/* Last Online Visibility Toggle */}
                <div className="flex items-center justify-between bg-[var(--theme-bg)]/40 p-3 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-[var(--theme-text-primary)] block">แสดงสถานะออนไลน์ล่าสุด (Last Online Status)</span>
                    <p className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5">เปิดให้ผู้อื่นสามารถเห็นเวลาที่คุณออนไลน์ล่าสุด และอนุญาตให้คุณดูของผู้อื่นเช่นกัน</p>
                  </div>
                  <button 
                    onClick={async () => {
                      const currentVal = user?.showLastOnline !== false;
                      const newVal = !currentVal;
                      localStorage.setItem('shush_enable_last_online', String(newVal));
                      
                      try {
                        const token = localStorage.getItem('shush_token');
                        const res = await fetch('/api/users/profile', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ showLastOnline: newVal })
                        });
                        
                        if (res.ok) {
                          const data = await res.json();
                          if (data.user && setUser) {
                            setUser(data.user);
                          }
                        }
                      } catch (e) {
                        console.error('Failed to update showLastOnline profile status:', e);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all border cursor-pointer ${
                      (user?.showLastOnline !== false) 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <span>{(user?.showLastOnline !== false) ? 'เปิดใช้งาน (Enabled)' : 'ปิดใช้งาน (Disabled)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* TOTP 2FA Verification Modal overlay */}
      {totpSetup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
            <button onClick={() => setTotpSetup(null)} className="absolute top-4 right-4 text-[var(--theme-text-secondary)] hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-base sm:text-lg font-bold mb-3 text-center text-[var(--theme-text-primary)]">ตั้งค่า Authenticator App (2FA)</h2>
            <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4 border border-slate-300">
              <img src={totpSetup.qrCodeDataUrl} alt="TOTP QR Code" className="w-40 h-40" />
            </div>
            <p className="text-[10px] sm:text-xs text-center text-[var(--theme-text-secondary)] mb-4">
              ใช้แอป Authenticator สแกนบาร์โค้ดนี้ (เช่น Google Authenticator / Authy) แล้วนำรหัสตัวเลขยืนยันด้านล่าง
            </p>
            
            <form onSubmit={handleVerifyTotpSetup} className="space-y-4">
              <input 
                type="text" 
                placeholder="กรอกรหัส 6 หลัก" 
                maxLength={6}
                required
                value={totpVerifyCode}
                onChange={e => setTotpVerifyCode(e.target.value)}
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 text-center tracking-[0.5em] text-lg font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
              />
              <button type="submit" className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl py-2 text-xs sm:text-sm font-bold transition-all shadow-lg">
                ยืนยันและเปิดใช้งาน
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Questions Modal */}
      {showSecurityQuestionsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setShowSecurityQuestionsModal(false)} className="absolute top-4 right-4 text-[var(--theme-text-secondary)] hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-base sm:text-lg font-bold mb-3 text-center text-[var(--theme-text-primary)]">จัดการคำถามความปลอดภัย</h2>
            
            <div className="mb-6 space-y-3">
              {(shhPass?.securityQuestions || []).length > 0 ? (
                (shhPass.securityQuestions || []).map((q: any) => (
                  <div key={q.id} className="bg-[var(--theme-bg)] border border-[var(--theme-border)] p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--theme-text-primary)]">{q.question}</p>
                      <p className="text-xs text-[var(--theme-text-secondary)] mt-1">ตั้งค่าคำตอบเรียบร้อยแล้ว</p>
                    </div>
                    <button 
                      onClick={() => {
                        const updated = (shhPass.securityQuestions || []).filter((sq: any) => sq.id !== q.id);
                        handleUpdateShhPass({ securityQuestions: updated });
                      }}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center text-[var(--theme-text-secondary)] py-4">ยังไม่ได้ตั้งคำถามความปลอดภัย</p>
              )}
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newQuestion.trim() || !newAnswer.trim()) return;
              
              const newQ = {
                id: Date.now(),
                question: newQuestion,
                answerHash: newAnswer // In a real app this should be hashed, but as per current logic, we're using plain text or a hash done by the client. We'll store plain text for the mockup.
              };
              
              handleUpdateShhPass({ securityQuestions: [...(shhPass?.securityQuestions || []), newQ] });
              setNewQuestion('');
              setNewAnswer('');
            }} className="space-y-4 border-t border-[var(--theme-border)] pt-4">
              <h3 className="font-bold text-sm text-[var(--theme-text-primary)]">เพิ่มคำถามใหม่</h3>
              <input 
                type="text" 
                placeholder="คำถาม เช่น สัตว์เลี้ยงตัวแรกชื่ออะไร?" 
                required
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
              />
              <input 
                type="text" 
                placeholder="คำตอบของคุณ" 
                required
                value={newAnswer}
                onChange={e => setNewAnswer(e.target.value)}
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
              />
              <button type="submit" className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl py-2 text-sm font-bold transition-all shadow-lg flex justify-center items-center gap-2">
                <Plus className="w-4 h-4" /> เพิ่มคำถาม
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
