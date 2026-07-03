import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, ExternalLink, Activity, Info, Link as LinkIcon } from 'lucide-react';
import UserDisplay from './UserDisplay.tsx';

export default function PublicProfileView({ token }: { token: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/p/${token}`);
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
      } else {
        setError(data.error || 'ไม่พบโปรไฟล์สาธารณะ');
      }
    } catch (e) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black text-[var(--theme-text-primary)] mb-2">ลิงก์ไม่พร้อมใช้งาน</h2>
        <p className="text-[var(--theme-text-secondary)]">{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] px-6 py-2 rounded-xl text-[var(--theme-text-primary)] font-bold">
          กลับสู่หน้าแรก
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] flex flex-col">
        <div className="h-48 sm:h-64 bg-[var(--theme-surface-hover)] animate-pulse"></div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 w-full -mt-16 sm:-mt-24 relative z-10">
          <div className="bg-[var(--theme-surface)] rounded-3xl p-6 sm:p-8 border border-[var(--theme-border)] shadow-xl animate-pulse">
            <div className="w-32 h-32 rounded-full bg-[var(--theme-border)] mx-auto mb-4"></div>
            <div className="h-8 w-48 bg-[var(--theme-border)] rounded-lg mx-auto mb-2"></div>
            <div className="h-4 w-32 bg-[var(--theme-border)] rounded-lg mx-auto mb-6"></div>
            <div className="h-16 w-full bg-[var(--theme-border)] rounded-xl mb-4"></div>
            <div className="flex gap-2 justify-center">
              <div className="h-8 w-24 bg-[var(--theme-border)] rounded-full"></div>
              <div className="h-8 w-24 bg-[var(--theme-border)] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = profile.avatar?.startsWith('http') ? profile.avatar : `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.avatar || profile.id}`;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text-primary)] overflow-y-auto">
      <div className="w-full h-48 sm:h-64 relative bg-slate-900" style={{ backgroundColor: profile.banner || '#1e1b4b' }}>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 relative -mt-16 sm:-mt-24 pb-20">
        <div className="bg-[var(--theme-surface)]/80 backdrop-blur-xl border border-[var(--theme-border)] shadow-2xl rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden">
          <div className="w-32 h-32 rounded-full border-4 border-[var(--theme-surface)] shadow-xl overflow-hidden bg-[var(--theme-bg)] mx-auto relative z-10 mb-4 flex items-center justify-center">
            {avatarError ? (
              <span className="text-4xl font-black opacity-30">{profile.displayName?.[0] || 'S'}</span>
            ) : (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
            )}
          </div>

          <div className="text-center relative z-10">
            <h1 className="text-3xl font-display font-black tracking-tight flex flex-wrap items-center justify-center gap-2 mb-1">
              <UserDisplay user={profile} className="text-3xl font-display font-black tracking-tight" />
            </h1>
            <p className="text-sm font-semibold text-[var(--theme-text-secondary)] mb-6">@{profile.username}</p>

            {profile.bio && (
              <div className="bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl p-4 mb-6 text-sm">
                <p className="whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {profile.interests?.map((tag: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 rounded-full text-xs font-bold">
                  {tag}
                </span>
              ))}
            </div>

            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex justify-center gap-3">
                {profile.socialLinks.map((link: any, i: number) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] hover:bg-[var(--theme-border)] rounded-xl text-xs font-semibold transition-colors">
                    <LinkIcon className="w-3.5 h-3.5" />
                    {link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.pet && (
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] mb-3">
                <Activity className="w-4 h-4 text-emerald-500" /> Public PET
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[var(--theme-bg)] rounded-xl flex items-center justify-center text-3xl shadow-inner border border-[var(--theme-border)]">
                  {profile.pet.type === 'cat' ? '🐱' : profile.pet.type === 'dog' ? '🐶' : '🐰'}
                </div>
                <div>
                  <h3 className="font-black text-lg">{profile.pet.name}</h3>
                  <p className="text-xs text-[var(--theme-text-secondary)]">Stage: {profile.pet.stage}</p>
                </div>
              </div>
            </div>
          )}

          {profile.stories && profile.stories.length > 0 && (
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5 md:col-span-full">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" /> Public Stories
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {profile.stories.map((story: any) => (
                  <div key={story.id} className="w-20 h-28 flex-shrink-0 rounded-xl border border-white/20 shadow-md flex items-center justify-center p-2 text-center" style={{ backgroundColor: story.bgColor || '#1e1b4b' }}>
                    <span className="text-[10px] font-bold text-white drop-shadow-md">
                      {new Date(story.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <h3 className="font-display font-black text-lg mb-2">อยากทำความรู้จักให้มากขึ้น?</h3>
            <p className="text-xs text-[var(--theme-text-secondary)] mb-4">สแกน QR Code ภายในแอป Shush เพื่อเชื่อมต่อกัน</p>
            <a href="/" className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2">
              เปิดแอป Shush
            </a>
          </div>
        </div>

        <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-[10px] text-[var(--theme-text-secondary)] font-mono">
          <Shield className="w-3 h-3" /> ข้อมูลนี้เป็นสาธารณะ (Public Lens)
        </div>
      </div>
    </div>
  );
}
