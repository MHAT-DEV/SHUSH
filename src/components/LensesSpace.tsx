import React, { useState, useEffect } from 'react';
import UserDisplay from './UserDisplay.tsx';
import {
  Globe,
  Users,
  Heart,
  Eye,
  Plus,
  Trash2,
  Check,
  Link2,
  X,
  Smile,
  Palette,
  ShieldAlert,
  Sparkles,
  Info,
  Upload
} from 'lucide-react';

interface Lens {
  id: string;
  userId: string;
  type: 'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE';
  displayName: string;
  bio?: string;
  avatar: string;
  banner?: string;
  accentColor?: string;
  status?: string;
  pronouns?: string;
  interests?: string[];
  socialLinks?: Array<{ platform: string; url: string }>;
  createdAt?: string;
  updatedAt?: string;
}

interface LensesSpaceProps {
  targetUserId?: string;
  user: any;
  couple: any;
  bffGroups: any[];
  onRefreshUser?: () => void;
}

const COLOR_PRESETS = [
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Slate', hex: '#475569' }
];

const BANNER_PRESETS = [
  { name: 'Dark Indigo', hex: '#1e1b4b' },
  { name: 'Deep Purple', hex: '#2e1065' },
  { name: 'Dark Rose', hex: '#4c0519' },
  { name: 'Forest Green', hex: '#022c22' },
  { name: 'Midnight', hex: '#0f172a' },
  { name: 'Teal Depth', hex: '#042f2e' }
];

const EMOJI_AVATARS = [
  '🐱', '🦊', '🐻', '🦁', '🐨', '🐼', '🐯', '🐮',
  '🐸', '🐣', '🦄', '🌈', '⚡', '🌸', '🥑', '🎮',
  '🎨', '🚀', '💻', '🪐', '🍿', '💙', '💕', '👑'
];

function formatLastOnline(lastOnlineStr: string | undefined | null): string {
  if (!lastOnlineStr) return "ออฟไลน์";
  
  const lastOnline = new Date(lastOnlineStr);
  const now = new Date();
  const diffMs = now.getTime() - lastOnline.getTime();
  
  if (isNaN(lastOnline.getTime())) return "ออฟไลน์";
  if (diffMs < 0) return "ออนไลน์เมื่อสักครู่";
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);
  
  if (diffMins < 1) {
    return "ออนไลน์เมื่อสักครู่";
  } else if (diffMins < 60) {
    return `ออนไลน์: ${diffMins} นาทีที่แล้ว`;
  } else if (diffHours < 24) {
    return `ออนไลน์: ${diffHours} ชั่วโมงที่แล้ว`;
  } else if (diffDays < 30) {
    return `ออนไลน์: ${diffDays} วันที่แล้ว`;
  } else if (diffMonths < 12) {
    return `ออนไลน์: ${diffMonths} เดือนที่แล้ว`;
  } else {
    return `ออนไลน์: ${diffYears} ปีที่แล้ว`;
  }
}

export default function LensesSpace({ user, couple, bffGroups, onRefreshUser, targetUserId }: LensesSpaceProps) {
  const [lenses, setLenses] = useState<Record<string, Lens>>({});
  const [activeEditorType, setActiveEditorType] = useState<'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE'>('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Editor states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('0');
  const [banner, setBanner] = useState('#1e1b4b');
  const [accentColor, setAccentColor] = useState('#8b5cf6');
  const [status, setStatus] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);
  const [newPlatform, setNewPlatform] = useState('GitHub');
  const [newUrl, setNewUrl] = useState('');

  // Target user presence states
  const [targetPresence, setTargetPresence] = useState<'online' | 'busy' | 'away' | 'offline'>('online');
  const [targetLastOnline, setTargetLastOnline] = useState<string | null>(null);
  const [targetShowLastOnline, setTargetShowLastOnline] = useState<boolean>(true);

  // Drag and drop and GIF-conversion states
  const [isDragging, setIsDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState('');

  const handleBannerFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('รองรับเฉพาะไฟล์ภาพเท่านั้น');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setBanner(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const convertVideoToGif = (file: File) => {
    setConverting(true);
    setConvertProgress('กำลังอ่านและเตรียมไฟล์วิดีโอ...');
    
    const fileUrl = URL.createObjectURL(file);
    const gifshot = (window as any).gifshot;
    if (!gifshot) {
      alert('ไม่พบระบบแปลงไฟล์ GIF กรุณารีเฟรชหน้าแล้วลองใหม่อีกครั้ง');
      setConverting(false);
      return;
    }

    setConvertProgress('กำลังถอดเฟรมและแปลงวิดีโอเป็น GIF (อาจใช้เวลาสักครู่)...');
    
    gifshot.createGIF({
      video: [fileUrl],
      numFrames: 24, // capture 24 frames
      interval: 0.15, // interval between frames
      gifWidth: 140,
      gifHeight: 140,
      sampleInterval: 10,
      numWorkers: 2,
    }, (obj: any) => {
      URL.revokeObjectURL(fileUrl);
      setConverting(false);
      if (!obj.error) {
        setAvatar(obj.image); // base64 string of GIF
      } else {
        console.error(obj.error);
        alert('เกิดข้อผิดพลาดในการแปลงวิดีโอเป็น GIF: ' + (obj.errorMsg || 'ไม่พบปัญหาที่ระบุ'));
      }
    });
  };

  const checkVideoDurationAndConvert = (file: File) => {
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    
    const objectUrl = URL.createObjectURL(file);
    videoElement.src = objectUrl;
    
    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = videoElement.duration;
      if (duration > 5.1) {
        alert(`วิดีโอต้องมีความยาวไม่เกิน 5 วินาทีเท่านั้น (วิดีโอของคุณมีความยาว ${duration.toFixed(1)} วินาที)`);
        return;
      }
      convertVideoToGif(file);
    };
    
    videoElement.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      alert('ไม่สามารถโหลดไฟล์วิดีโอนี้ได้ กรุณาลองใช้ไฟล์อื่น');
    };
  };

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      handleImageFile(file);
    } else if (file.type.startsWith('video/')) {
      checkVideoDurationAndConvert(file);
    } else {
      alert('กรุณาอัปโหลดไฟล์รูปภาพ, GIF หรือวิดีโอที่ถูกต้อง');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchMyLenses();
  }, [targetUserId]);

  const fetchMyLenses = async () => {
    if (targetUserId && targetUserId !== user?.id) {
      try {
        const res = await fetch(`/api/lenses/active/${targetUserId}`, { headers });
        const data = await res.json();
        if (res.ok) {
          setLenses(data && data.lens ? { [data.lens.type]: data.lens } : {}); 
          loadLensIntoEditor(data?.lens?.type || "PUBLIC", data && data.lens ? { [data.lens.type]: data.lens } : {});
          if (data.presenceStatus) setTargetPresence(data.presenceStatus);
          if (data.lastOnline !== undefined) setTargetLastOnline(data.lastOnline);
          if (data.showLastOnline !== undefined) setTargetShowLastOnline(data.showLastOnline);
        } else {
          console.error(data.error);
        }
      } catch(e) { console.error(e); }
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/lenses/me', { headers });
      if (res.ok) {
        const data = await res.json();
        const lensMap: Record<string, Lens> = {};
        if (data.lenses && Array.isArray(data.lenses)) {
          data.lenses.forEach((l: Lens) => {
            lensMap[l.type] = l;
          });
        }
        setLenses(lensMap);
        // Load active editor lens config
        loadLensIntoEditor(activeEditorType, lensMap);
      }
    } catch (e) {
      console.error('Failed to fetch lenses:', e);
    }
    setLoading(false);
  };

  const loadLensIntoEditor = (type: 'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE', currentLenses: Record<string, Lens> = lenses) => {
    const lens = currentLenses[type];
    if (lens) {
      setDisplayName(lens.displayName || '');
      setBio(lens.bio || '');
      setAvatar(lens.avatar || '0');
      setBanner(lens.banner || '#1e1b4b');
      setAccentColor(lens.accentColor || '#8b5cf6');
      setStatus(lens.status || '');
      setPronouns(lens.pronouns || '');
      setInterests(lens.interests || []);
      setSocialLinks(lens.socialLinks || []);
    } else {
      // Create template from Public or empty
      const pub = currentLenses['PUBLIC'];
      setDisplayName(pub?.displayName || user?.displayName || '');
      setBio('');
      setAvatar(pub?.avatar || user?.avatar || '0');
      setBanner('#1f2937');
      setAccentColor('#6366f1');
      setStatus('');
      setPronouns('');
      setInterests([]);
      setSocialLinks([]);
    }
  };

  const handleSelectEditorTab = (type: 'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE') => {
    setActiveEditorType(type);
    loadLensIntoEditor(type);
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterest.trim()) return;
    if (interests.includes(newInterest.trim())) {
      setNewInterest('');
      return;
    }
    setInterests([...interests, newInterest.trim()]);
    setNewInterest('');
  };

  const handleRemoveInterest = (tag: string) => {
    setInterests(interests.filter(i => i !== tag));
  };

  const handleAddSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setSocialLinks([...socialLinks, { platform: newPlatform, url: newUrl.trim() }]);
    setNewUrl('');
  };

  const handleRemoveSocial = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSaveLens = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lenses/${activeEditorType}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          displayName,
          bio,
          avatar,
          banner,
          accentColor,
          status,
          pronouns,
          interests,
          socialLinks
        })
      });

      if (res.ok) {
        alert(`บันทึกการปรับแต่ง ${getLensTypeName(activeEditorType)} สำเร็จ!`);
        if (onRefreshUser) onRefreshUser();
        await fetchMyLenses();
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
    setLoading(false);
  };

  const getLensTypeName = (type: string) => {
    switch (type) {
      case 'PUBLIC': return '🌍 Public Lens';
      case 'FRIENDS': return '👥 Friends Lens';
      case 'BFF': return '💙 BFF Lens';
      case 'COUPLE': return '💕 Couple Lens';
      default: return type;
    }
  };

  // Dynamic preview resolution logic:
  const resolvePreviewData = () => {
    // Live editing states
    const draftLens = {
      displayName: displayName,
      bio: bio,
      status: status,
      pronouns: pronouns,
      accentColor: accentColor,
      banner: banner,
      interests: interests,
      socialLinks: socialLinks,
      avatar: avatar
    };

    // Always show the live draft of the currently selected editor type
    return { lens: draftLens, isFallback: false, resolvedType: activeEditorType };
  };

  const previewData = resolvePreviewData();

  if (targetUserId && targetUserId !== user?.id) {
    const resolvedLens = Object.values(lenses)[0];
    
    if (!resolvedLens) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-violet-500/60 mb-3" />
          <h3 className="font-display font-bold text-lg text-[var(--theme-text-primary)]">ไม่สามารถเข้าถึงตัวตนของผู้อื่นได้</h3>
          <p className="text-xs text-[var(--theme-text-secondary)] mt-1 max-w-sm">คุณยังไม่มีความสัมพันธ์กับผู้ใช้นี้ หรือสิทธิ์การเข้าถึงของคุณไม่ตรงกับเลนส์ที่เขาเลือกไว้</p>
        </div>
      );
    }

    const isOnline = targetPresence && targetPresence !== 'offline';
    const showLastOnline = targetShowLastOnline !== false;
    
    let presenceText = "";
    let presenceColor = "text-[var(--theme-text-secondary)] bg-[var(--theme-surface)]";
    let badgeEmoji = "🟢";
    
    if (isOnline) {
      presenceColor = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
      if (targetPresence === 'busy') {
        presenceText = "🔴 ไม่ว่าง";
        badgeEmoji = "🔴";
      } else if (targetPresence === 'away') {
        presenceText = "🟡 ไม่อยู่";
        badgeEmoji = "🟡";
      } else {
        presenceText = "🟢 ออนไลน์";
      }
    } else {
      presenceText = showLastOnline && targetLastOnline
        ? formatLastOnline(targetLastOnline)
        : "ออฟไลน์";
      badgeEmoji = "⚫";
    }

    return (
      <div className="flex flex-col h-full bg-transparent overflow-y-auto p-4 sm:p-6 gap-6 max-w-xl mx-auto w-full">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--theme-text-primary)] flex items-center gap-2">
            <Eye className="w-6 h-6 text-[var(--theme-primary)]" />
            ตัวตนที่เปิดเผย (Active Lens View)
          </h2>
          <p className="text-xs text-[var(--theme-text-secondary)] mt-1 leading-relaxed">
            คุณกำลังรับชมตัวตนตามระดับความสัมพันธ์ที่ผู้ใช้นี้เปิดเผยแก่คุณแบบโปร่งใสและปลอดภัย
          </p>
        </div>

        <div className="relative rounded-3xl border border-[var(--theme-border)] overflow-hidden bg-[var(--theme-bg)] flex flex-col shadow-2xl">
          {/* Header Banner */}
          <div
            className="h-32 relative flex items-end justify-between p-4 bg-cover bg-center"
            style={{ 
              backgroundColor: resolvedLens.banner && !resolvedLens.banner.startsWith('data:') && !resolvedLens.banner.startsWith('http') ? resolvedLens.banner : '#1e1b4b',
              backgroundImage: resolvedLens.banner && (resolvedLens.banner.startsWith('data:') || resolvedLens.banner.startsWith('http')) ? `url(${resolvedLens.banner})` : undefined
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />
            
            {/* Pronoun badge inside banner */}
            {resolvedLens.pronouns && (
              <span className="relative z-10 px-2.5 py-1 bg-[var(--theme-bg)]/80 backdrop-blur text-[var(--theme-text-primary)] text-[10px] font-bold tracking-wider uppercase rounded-full border border-[var(--theme-border)]">
                {resolvedLens.pronouns}
              </span>
            )}

            {/* Lens Type indicator banner tag */}
            <span className="relative z-10 px-2.5 py-1 bg-violet-600/90 text-white text-[10px] font-bold tracking-wider uppercase rounded-full shadow-lg">
              {resolvedLens.type === 'PUBLIC' ? '🌍 Public'
               : resolvedLens.type === 'FRIENDS' ? '👥 Friends'
               : resolvedLens.type === 'BFF' ? '💙 BFF'
               : '💕 Couple'}
            </span>
          </div>

          {/* Lens Details Container */}
          <div className="p-6 -mt-12 relative flex flex-col gap-5">
            {/* Floating Avatar & Accent border & Online Indicator */}
            <div className="flex items-end justify-between">
              <div
                className="w-24 h-24 rounded-2xl bg-[var(--theme-surface)] border-3 flex items-center justify-center text-4xl shadow-2xl transition-all relative"
                style={{ borderColor: resolvedLens.accentColor || '#8b5cf6' }}
              >
                {resolvedLens.avatar && resolvedLens.avatar.length <= 2 ? (
                  resolvedLens.avatar
                ) : resolvedLens.avatar && (resolvedLens.avatar.startsWith('http') || resolvedLens.avatar.startsWith('data:')) ? (
                  <img src={resolvedLens.avatar} alt="Avatar" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                ) : (
                  '👤'
                )}
                
                {/* Visual Status Indicator Badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-full flex items-center justify-center text-xs shadow-lg">
                  {badgeEmoji}
                </div>
              </div>

              {/* Status Display inside Lens */}
              {resolvedLens.status && (
                <div className="px-3.5 py-1.5 bg-[var(--theme-surface)]/80 border border-[var(--theme-border)] rounded-xl text-xs text-[var(--theme-text-secondary)] max-w-[200px] truncate shadow-sm">
                  💬 {resolvedLens.status}
                </div>
              )}
            </div>

            {/* Display Name and Username & Live Presence Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <div className="flex items-center gap-1.5">
                  <UserDisplay user={{ id: targetUserId, displayName: resolvedLens.displayName || '' }} className="font-display font-extrabold text-xl text-[var(--theme-text-primary)] tracking-tight" />
                </div>
                <p className="text-xs text-[var(--theme-text-secondary)] font-mono mt-0.5">@{resolvedLens.displayName ? 'profile' : 'user'}</p>
              </div>

              <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${presenceColor} self-start sm:self-auto`}>
                {presenceText}
              </div>
            </div>

            {/* Bio */}
            <div className="bg-[var(--theme-surface)]/10 p-4 rounded-xl border border-[var(--theme-border)]/40">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-text-secondary)] block mb-1">ประวัติส่วนตัว</span>
              <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
                {resolvedLens.bio || <span className="text-[var(--theme-text-secondary)] italic">ไม่มีข้อมูลประวัติย่อสำหรับเลนส์นี้</span>}
              </p>
            </div>

            {/* Interests tags in Preview */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-text-secondary)]">ความสนใจ</span>
              <div className="flex flex-wrap gap-1.5">
                {!resolvedLens.interests || resolvedLens.interests.length === 0 ? (
                  <span className="text-xs text-[var(--theme-text-secondary)] italic">ไม่ได้ระบุไว้</span>
                ) : (
                  resolvedLens.interests.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text-secondary)] bg-[var(--theme-surface)]/20"
                      style={{ borderLeft: `3px solid ${resolvedLens.accentColor || '#8b5cf6'}` }}
                    >
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Social links in Preview */}
            <div className="space-y-2 border-t border-[var(--theme-border)] pt-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-text-secondary)]">ช่องทางการติดต่อ</span>
              <div className="grid grid-cols-1 gap-2">
                {!resolvedLens.socialLinks || resolvedLens.socialLinks.length === 0 ? (
                  <span className="text-xs text-[var(--theme-text-secondary)] italic">ไม่มีช่องทางการติดต่อที่เปิดเผย</span>
                ) : (
                  resolvedLens.socialLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all hover:translate-x-1"
                    >
                      <Link2 className="w-3.5 h-3.5 text-violet-400" />
                      <span className="font-bold text-[var(--theme-text-secondary)]">{link.platform}:</span>
                      <span className="font-mono truncate text-[var(--theme-text-secondary)]">{link.url}</span>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto p-4 sm:p-6 gap-6 max-w-2xl mx-auto w-full">
      {/* LEFT COLUMN: Selector and Editor */}
      <div className="flex-1 flex flex-col gap-6">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--theme-text-primary)] flex items-center gap-2">
            <Eye className="w-6 h-6 text-[var(--theme-primary)]" />
            Lens System (Identity Layers)
          </h2>
          <p className="text-xs text-[var(--theme-text-secondary)] mt-1 max-w-xl leading-relaxed">
            ระบบเลเยอร์ตัวตนของ Shush ให้คุณแสดงความลึกและเฉดของความสัมพันธ์ที่ต่างกันแก่ผู้คนระดับต่างๆ โดยไม่ต้องมีหลายบัญชี (Privacy by Design)
          </p>
        </div>

        {/* 4 Cards Grid Selector */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {(['PUBLIC', 'FRIENDS', 'BFF', 'COUPLE'] as const).map((type) => {
            const isConfigured = !!lenses[type];
            const isActive = activeEditorType === type;
            const icon = type === 'PUBLIC' ? <Globe className="w-5 h-5 text-emerald-400" />
                       : type === 'FRIENDS' ? <Users className="w-5 h-5 text-sky-400" />
                       : type === 'BFF' ? <Users className="w-5 h-5 text-blue-400" />
                       : <Heart className="w-5 h-5 text-rose-400" />;

            return (
              <button
                key={type}
                onClick={() => handleSelectEditorTab(type)}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                  isActive
                    ? 'bg-[var(--theme-surface)] border-[var(--theme-primary)]/60 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/40'
                    : 'bg-[var(--theme-surface)]/40 hover:bg-[var(--theme-surface)]/80 border-[var(--theme-border)]'
                }`}
              >
                {/* Decorative Accent Background */}
                {isActive && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--theme-primary)]/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 bg-[var(--theme-bg)]/60 rounded-lg border border-[var(--theme-border)]/80">
                    {icon}
                  </div>
                  {type === 'PUBLIC' ? (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                      เริ่มต้น/Fallback
                    </span>
                  ) : isConfigured ? (
                    <span className="text-[9px] bg-[var(--theme-primary)]/15 text-violet-300 border border-[var(--theme-primary)]/20 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                      <Check className="w-2 h-2" /> ตั้งค่าแล้ว
                    </span>
                  ) : (
                    <span className="text-[9px] border-[var(--theme-border)] bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] border border-[var(--theme-border)]/50 px-1.5 py-0.5 rounded-full">
                      ยังไม่เปิดใช้
                    </span>
                  )}
                </div>

                <span className="font-display font-semibold text-[var(--theme-text-primary)] text-xs sm:text-sm">
                  {type === 'PUBLIC' ? 'Public'
                   : type === 'FRIENDS' ? 'Friends'
                   : type === 'BFF' ? 'BFF Group'
                   : 'Couple'}
                </span>

                <span className="text-[10px] text-[var(--theme-text-secondary)] mt-1 line-clamp-2 leading-tight">
                  {type === 'PUBLIC' ? 'คนทั่วไปเห็นเป็นหลักและสำรองหากเลนส์อื่นยังไม่ตั้งค่า'
                   : type === 'FRIENDS' ? 'ตัวตนเฉพาะระดับเพื่อนฝูง'
                   : type === 'BFF' ? 'ตัวตนสำหรับเพื่อนสนิทในกลุ่ม BFF'
                   : 'ตัวตนแบบพิเศษสำหรับคนรัก'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lens Editor Panel */}
        <div className="bg-[var(--theme-surface)]/60 border border-[var(--theme-border)] rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--theme-primary)] font-bold font-mono">LENS EDITOR</span>
              <h3 className="font-display font-bold text-[var(--theme-text-primary)] text-base">
                ปรับแต่ง {getLensTypeName(activeEditorType)}
              </h3>
            </div>
            {activeEditorType !== 'PUBLIC' && !lenses[activeEditorType] && (
              <span className="text-[11px] text-amber-400/90 flex items-center gap-1 bg-amber-950/20 border border-amber-900/50 px-2 py-0.5 rounded-md">
                <Info className="w-3.5 h-3.5" /> ยังไม่ได้ตั้งค่าเลนส์นี้ (ใช้ Public เป็น Fallback)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">ชื่อแสดงผล (Display Name) <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="ระบุชื่อที่จะให้เลนส์นี้เห็น"
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)] transition-all"
              />
            </div>

            {/* Pronouns */}
            <div>
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">สรรพนาม (Pronouns) (ถ้ามี)</label>
              <input
                type="text"
                value={pronouns}
                onChange={e => setPronouns(e.target.value)}
                placeholder="เช่น he/him, she/her, they/them"
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)] transition-all"
              />
            </div>

            {/* Avatar & Emojis */}
            <div className="md:col-span-2 space-y-3">
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)]">
                อวตาร / ตัวเลือกอีโมจิ หรืออัปโหลดรูปภาพ/GIF/วิดีโอ (Avatar / Emoji or File Upload)
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Left side: Input link + Emoji palette */}
                <div className="md:col-span-2 flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={avatar}
                      onChange={e => setAvatar(e.target.value)}
                      placeholder="ป้อนอีโมจิ 1 ตัว หรือลิงก์รูปภาพของคุณ"
                      className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)] transition-all font-semibold"
                    />
                    {avatar && avatar.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setAvatar('👤')}
                        className="px-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 hover:border-red-500/50 text-red-400 text-xs font-semibold rounded-xl transition-all"
                      >
                        ล้างอวตาร
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5 p-2 bg-[var(--theme-bg)]/60 rounded-xl border border-[var(--theme-border)]/60 items-center justify-start">
                    {EMOJI_AVATARS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(emoji)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-sm hover:border-[var(--theme-border)] bg-[var(--theme-surface-hover)] transition-all ${avatar === emoji ? 'bg-[var(--theme-primary)] border border-[var(--theme-primary)] text-[var(--theme-text-primary)] shadow' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right side: File Upload Area (Supports Drag & Drop + Click) */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-all relative cursor-pointer min-h-[120px] ${
                    isDragging 
                      ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10' 
                      : 'border-[var(--theme-border)] bg-[var(--theme-bg)]/40 hover:border-[var(--theme-border)] hover:bg-[var(--theme-bg)]/80'
                  }`}
                  onClick={() => document.getElementById('avatar-file-upload')?.click()}
                >
                  <input
                    id="avatar-file-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {converting ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] text-violet-300 font-medium animate-pulse">{convertProgress}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                      <div className="p-1.5 bg-[var(--theme-surface)] rounded-lg border border-[var(--theme-border)] text-[var(--theme-text-secondary)]">
                        <Upload className="w-4 h-4 text-[var(--theme-primary)] animate-bounce" />
                      </div>
                      <div className="text-[10px] text-[var(--theme-text-secondary)] font-bold">
                        ลากวาง หรือคลิกเพื่ออัปโหลด
                      </div>
                      <div className="text-[8px] text-[var(--theme-text-secondary)] max-w-[150px]">
                        รองรับรูปภาพ, GIF, และวิดีโอไม่เกิน 5 วินาทีเพื่อแปลงเป็น GIF
                      </div>
                    </div>
                  )}

                  {/* Thumbnail Preview overlay inside the upload area if custom */}
                  {avatar && avatar.length > 2 && (
                    <div className="absolute top-1 right-1 w-6 h-6 rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] p-0.5 overflow-hidden">
                      {avatar.startsWith('data:video') ? (
                        <div className="text-[8px] text-[var(--theme-text-secondary)]">Video</div>
                      ) : (
                        <img src={avatar} className="w-full h-full object-cover rounded" alt="Preview" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">สถานะข้อความ (Status Message)</label>
              <input
                type="text"
                value={status}
                onChange={e => setStatus(e.target.value)}
                placeholder="บอกสถานะปัจจุบันของคุณสำหรับเลนส์นี้ (เช่น 💬 กำลังยุ่งอยู่, 🎧 เล่นเกมอยู่)"
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)] transition-all"
              />
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">ประวัติย่อ (Bio)</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="ระบุคำแนะนำตัวสั้นๆ สำหรับกลุ่มเป้าหมายนี้โดยเฉพาะ"
                rows={3}
                className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)] transition-all resize-none"
              />
            </div>

            {/* Accent Color Selection */}
            <div>
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-[var(--theme-primary)]" /> สีธีมหลัก (Theme / Accent Color)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg border border-[var(--theme-border)]" style={{ backgroundColor: accentColor }} />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    placeholder="#hex color"
                    className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--theme-text-primary)] uppercase"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.hex}
                      onClick={() => setAccentColor(preset.hex)}
                      className="w-5 h-5 rounded-full border border-slate-950"
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Banner Background */}
            <div>
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-[var(--theme-primary)]" /> แบนเนอร์หัวการ์ด (Banner Cover)
                </span>
                {activeEditorType === 'PUBLIC' && (
                  <span className="text-[9px] text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-1.5 py-0.5 rounded">ภาพหน้าปกเริ่มต้น</span>
                )}
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div 
                    className="w-12 h-10 rounded-lg border border-[var(--theme-border)] bg-cover bg-center shrink-0" 
                    style={{ 
                      backgroundColor: banner && !banner.startsWith('data:') && !banner.startsWith('http') ? banner : undefined,
                      backgroundImage: banner && (banner.startsWith('data:') || banner.startsWith('http')) ? `url(${banner})` : undefined
                    }} 
                  />
                  <input
                    type="text"
                    value={banner}
                    onChange={e => setBanner(e.target.value)}
                    placeholder="#hex color, URL"
                    className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--theme-text-primary)]"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    id="banner-file-upload"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleBannerFile(e.target.files[0]);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('banner-file-upload')?.click()}
                    className="px-2.5 py-1 bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-primary)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)] rounded-lg text-xs font-medium transition-colors"
                  >
                    อัปโหลด
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--theme-text-secondary)] mt-1">
                  <span className="font-semibold">แนะนำ:</span> กว้าง 800px × สูง 300px (แนวนอน) • รองรับภาพนิ่งเท่านั้น
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {BANNER_PRESETS.map(preset => (
                    <button
                      key={preset.hex}
                      onClick={() => setBanner(preset.hex)}
                      className="w-5 h-5 rounded border border-slate-950"
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Interests Tag Input */}
            <div className="md:col-span-2 border-t border-[var(--theme-border)]/80 pt-3">
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">สิ่งที่คุณสนใจ (Interests / Tags)</label>
              <form onSubmit={handleAddInterest} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newInterest}
                  onChange={e => setNewInterest(e.target.value)}
                  placeholder="พิมพ์ความสนใจแล้วกด Enter (เช่น เล่นบาส, คริปโต, อาร์ต, สัตว์เลี้ยง)"
                  className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
                />
                <button
                  type="submit"
                  className="px-3 border-[var(--theme-border)] bg-[var(--theme-surface-hover)] hover:bg-slate-700 text-[var(--theme-text-primary)] rounded-xl text-xs font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-[var(--theme-bg)]/40 rounded-xl border border-[var(--theme-border)]/60">
                {interests.length === 0 ? (
                  <span className="text-[11px] text-[var(--theme-text-secondary)] italic">ยังไม่มีข้อมูลความสนใจ</span>
                ) : (
                  interests.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md text-[var(--theme-text-primary)] border border-[var(--theme-border)]/80 border-[var(--theme-border)] bg-[var(--theme-surface-hover)]/50"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(tag)}
                        className="text-[var(--theme-text-secondary)] hover:text-red-400 font-bold text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Social Links Manager */}
            <div className="md:col-span-2 border-t border-[var(--theme-border)]/80 pt-3">
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">ลิงก์โซเชียลของคุณ (Social Links)</label>
              <form onSubmit={handleAddSocial} className="flex flex-col sm:flex-row gap-2 mb-3">
                <select
                  value={newPlatform}
                  onChange={e => setNewPlatform(e.target.value)}
                  className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--theme-text-primary)] font-medium"
                >
                  <option value="GitHub">GitHub</option>
                  <option value="Social Network">โซเชียลมีเดีย</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter">Twitter / X</option>
                  <option value="Discord">Discord</option>
                  <option value="Website">เว็บไซต์ส่วนตัว</option>
                </select>
                <input
                  type="text"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="กรอก URL บัญชีผู้ใช้ของคุณ"
                  className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
                />
                <button
                  type="submit"
                  className="px-3 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl text-xs font-semibold flex items-center gap-1 py-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" /> เพิ่มลิงก์
                </button>
              </form>

              {/* Social list */}
              <div className="space-y-1.5">
                {socialLinks.length === 0 ? (
                  <div className="p-2 text-center text-[11px] text-[var(--theme-text-secondary)] italic bg-[var(--theme-bg)]/20 rounded-xl border border-dashed border-[var(--theme-border)]">
                    ไม่มีลิงก์โซเชียลถูกกำหนดไว้
                  </div>
                ) : (
                  socialLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[var(--theme-bg)]/60 border border-[var(--theme-border)] text-xs text-[var(--theme-text-primary)]">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                        <span className="font-semibold text-violet-300">{link.platform}:</span>
                        <span className="text-[var(--theme-text-secondary)] font-mono truncate max-w-xs">{link.url}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(idx)}
                        className="p-1 hover:border-[var(--theme-border)] bg-[var(--theme-surface-hover)] hover:text-red-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end border-t border-[var(--theme-border)] pt-4 gap-3 mt-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2 border border-[var(--theme-border)]/60 bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-primary)] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              id="btn-show-preview-modal"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              ตัวอย่างการแสดงผล
            </button>
            <button
              onClick={handleSaveLens}
              disabled={loading}
              className="px-6 py-2 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-violet-600/10"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการปรับแต่ง Lens'}
            </button>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: Interactive Identity Preview Card */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border)]/10 bg-transparent shrink-0">
              <h3 className="font-display font-semibold text-[var(--theme-text-primary)] text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                ตัวอย่างผู้เข้าชม (Live Preview)
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body containing Preview Mockup */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-[11px] text-[var(--theme-text-secondary)] leading-normal">
                หน้าจอนี้จะแสดงตัวอย่างโหมดที่คุณกำลังตั้งค่าแบบเรียลไทม์ แก่ผู้รับชมระดับที่กำหนด
              </p>

              {/* Dynamic Resolved Lens Mockup Card */}
              <div className="relative rounded-3xl border border-[var(--theme-border)] overflow-hidden bg-[var(--theme-bg)] flex flex-col shadow-xl">
                {/* Header Banner */}
                <div
                  className="h-28 relative transition-all duration-300 flex items-end justify-end p-3 bg-cover bg-center"
                  style={{ 
                    backgroundColor: previewData.lens.banner && !previewData.lens.banner.startsWith('data:') && !previewData.lens.banner.startsWith('http') ? previewData.lens.banner : '#1e1b4b',
                    backgroundImage: previewData.lens.banner && (previewData.lens.banner.startsWith('data:') || previewData.lens.banner.startsWith('http')) ? `url(${previewData.lens.banner})` : undefined
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none" />
                  
                  {/* Pronoun badge inside banner */}
                  {previewData.lens.pronouns && (
                    <span className="relative z-10 px-2 py-0.5 bg-[var(--theme-bg)]/80 backdrop-blur text-[var(--theme-text-primary)] text-[9px] font-semibold tracking-wider uppercase rounded-full border border-[var(--theme-border)]">
                      {previewData.lens.pronouns}
                    </span>
                  )}
                </div>

                {/* Lens Details Container */}
                <div className="p-5 sm:p-6 -mt-10 relative flex flex-col gap-4">
                  {/* Floating Avatar & Accent border */}
                  <div className="flex items-end justify-between">
                    <div
                      className="w-20 h-20 rounded-2xl bg-[var(--theme-surface)] border-3 flex items-center justify-center text-3xl shadow-xl transition-all relative"
                      style={{ borderColor: previewData.lens.accentColor || '#8b5cf6' }}
                    >
                      {/* Visual Avatar Rendering */}
                      {previewData.lens.avatar && previewData.lens.avatar.length <= 2 ? (
                        previewData.lens.avatar
                      ) : previewData.lens.avatar && (previewData.lens.avatar.startsWith('http') || previewData.lens.avatar.startsWith('data:')) ? (
                        <img src={previewData.lens.avatar} alt="Avatar" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                      ) : (
                        '👤'
                      )}
                      
                      {/* Active Relationship Lens indicator */}
                      <div className="absolute -bottom-1 -right-1 p-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg">
                        {activeEditorType === 'PUBLIC' ? <Globe className="w-3.5 h-3.5 text-emerald-400" />
                         : activeEditorType === 'FRIENDS' ? <Users className="w-3.5 h-3.5 text-sky-400" />
                         : activeEditorType === 'BFF' ? <Users className="w-3.5 h-3.5 text-blue-400" />
                         : <Heart className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                    </div>

                    {/* Status Display inside Lens */}
                    {previewData.lens.status && (
                      <div className="px-3 py-1 bg-[var(--theme-surface)]/80 border border-[var(--theme-border)] rounded-xl text-[10px] text-[var(--theme-text-secondary)] max-w-[180px] truncate">
                        {previewData.lens.status}
                      </div>
                    )}
                  </div>

                  {/* Display Name and Username */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <UserDisplay user={{ id: user?.id, displayName: previewData.lens.displayName || user?.displayName || '' }} className="font-display font-bold text-lg text-[var(--theme-text-primary)] tracking-tight" />
                    </div>
                    <span className="text-xs text-[var(--theme-text-secondary)] font-mono">@{user?.username}</span>
                  </div>

                  {/* Bio */}
                  <div>
                    <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed min-h-[40px]">
                      {previewData.lens.bio || <span className="text-[var(--theme-text-secondary)] italic">ไม่มีข้อมูลประวัติย่อสำหรับเลนส์นี้</span>}
                    </p>
                  </div>

                  {/* Interests tags in Preview */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-text-secondary)]">ความสนใจ</span>
                    <div className="flex flex-wrap gap-1">
                      {!previewData.lens.interests || previewData.lens.interests.length === 0 ? (
                        <span className="text-[10px] text-[var(--theme-text-secondary)] italic">ไม่ได้เลือกไว้</span>
                      ) : (
                        previewData.lens.interests.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded border border-[var(--theme-border)] text-[var(--theme-text-secondary)]"
                            style={{ borderLeft: `2px solid ${previewData.lens.accentColor || '#8b5cf6'}` }}
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Social links in Preview */}
                  <div className="space-y-1.5 border-t border-[var(--theme-border)] pt-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-text-secondary)]">ช่องทางการติดต่อ</span>
                    <div className="grid grid-cols-1 gap-1">
                      {!previewData.lens.socialLinks || previewData.lens.socialLinks.length === 0 ? (
                        <span className="text-[10px] text-[var(--theme-text-secondary)] italic">ไม่ได้เปิดเผยลิงก์โซเชียล</span>
                      ) : (
                        previewData.lens.socialLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[11px] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all hover:translate-x-0.5"
                          >
                            <Link2 className="w-3 h-3 text-[var(--theme-text-secondary)]" />
                            <span className="font-semibold text-[var(--theme-text-secondary)]">{link.platform}:</span>
                            <span className="font-mono truncate text-[var(--theme-text-secondary)] text-[10px]">{link.url}</span>
                          </a>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Security Guard Footer */}
                  <div className="p-2 border border-[var(--theme-border)] rounded-xl bg-[var(--theme-bg)]/60 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--theme-text-secondary)]">
                      <Eye className="w-3 h-3" />
                      <span>ความสัมพันธ์ของคุณกับผู้รับชมจะออโต้-รีซอล์ฟข้อมูลทันที</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--theme-border)]/10 flex justify-end shrink-0 bg-transparent">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl text-xs font-semibold transition-all shadow-md shadow-violet-600/10 cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
