import React, { useState, useEffect } from 'react';
import { Target, Trophy, CheckCircle, Clock, Star, Gift, ChevronRight, Lock } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  points: number;
  progress: number;
  max: number;
  completed: boolean;
  claimed: boolean;
  category?: string;
}

interface MissionsData {
  daily: Mission[];
  lifetime: Mission[];
  points: number;
}

export default function AchievementsTab({
  token,
  user,
  setUser,
  onPointsEarned
}: {
  token: string | null;
  user: any;
  setUser: any;
  onPointsEarned?: (pts: number) => void;
}) {
  const [data, setData] = useState<MissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'lifetime'>('daily');
  const [animatingMission, setAnimatingMission] = useState<string | null>(null);

  const fetchMissions = async () => {
    try {
      const res = await fetch('/api/missions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchMissions();
  }, [token]);

  const claimMission = async (id: string) => {
    setAnimatingMission(id);
    try {
      const res = await fetch('/api/missions/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const d = await res.json();
        // Calculate diff in points
        if (data && d.points > data.points && onPointsEarned) {
          onPointsEarned(d.points - data.points);
        }
        setTimeout(() => {
          setData(d);
          setAnimatingMission(null);
        }, 800);
      }
    } catch (e) {
      console.error(e);
      setAnimatingMission(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-[var(--theme-text-secondary)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full mb-4"></div>
        <p>กำลังโหลดภารกิจ...</p>
      </div>
    );
  }

  const renderMission = (mission: Mission, index: number) => {
    const isClaimable = mission.completed && !mission.claimed;
    const isClaiming = animatingMission === mission.id;
    
    return (
      <div 
        key={mission.id} 
        className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
          mission.claimed 
            ? 'bg-[var(--theme-surface)]/30 border-[var(--theme-border)]/50 opacity-60' 
            : isClaimable
              ? 'bg-[var(--theme-surface-hover)] border-[var(--theme-primary)] shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.1)]'
              : 'bg-[var(--theme-surface)] border-[var(--theme-border)]'
        } ${isClaiming ? 'scale-95 opacity-50' : ''}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          mission.claimed ? 'bg-green-500/10 text-green-500' :
          isClaimable ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]' :
          'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]'
        }`}>
          {mission.claimed ? <CheckCircle className="w-6 h-6" /> : 
           isClaimable ? <Gift className="w-6 h-6" /> :
           <Target className="w-6 h-6" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-bold truncate ${mission.claimed ? 'text-[var(--theme-text-secondary)] line-through' : 'text-[var(--theme-text-primary)]'}`}>
              {mission.title}
            </h4>
            <span className="text-xs font-bold text-[var(--theme-primary)] flex items-center gap-1 bg-[var(--theme-primary)]/10 px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3" /> {mission.points}
            </span>
          </div>
          
          {mission.category && (
            <div className="text-[10px] text-[var(--theme-text-secondary)] uppercase tracking-wider mb-2 font-bold">
              {mission.category}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[var(--theme-surface-hover)] rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${isClaimable ? 'bg-[var(--theme-primary)] animate-pulse' : 'bg-gradient-to-r from-blue-500 to-[var(--theme-primary)]'}`}
                style={{ width: `${Math.min(100, (mission.progress / mission.max) * 100)}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono text-[var(--theme-text-secondary)]">
              {mission.progress}/{mission.max}
            </span>
          </div>
        </div>

        {isClaimable && (
          <button
            onClick={() => claimMission(mission.id)}
            disabled={isClaiming}
            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg text-sm font-bold shadow-lg shadow-[var(--theme-primary)]/20 hover:scale-105 transition-transform whitespace-nowrap flex-shrink-0"
          >
            {isClaiming ? 'รับรางวัล...' : 'รับแต้ม!'}
          </button>
        )}
      </div>
    );
  };

  const dailyMissions = data.daily;
  const lifetimeMissions = data.lifetime;

  const totalPoints = data.points || 0;
  
  const dailyProgress = dailyMissions.filter(m => m.completed).length;
  const dailyTotal = dailyMissions.length;

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg)] pb-[90px] md:pb-6 overflow-y-auto">
      {/* Header */}
      <div className="p-6 pb-2 sticky top-0 bg-[var(--theme-bg)]/80 backdrop-blur-xl z-20">
        <h2 className="text-2xl font-bold text-[var(--theme-text-primary)] flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Missions & Achievements
        </h2>
        <p className="text-sm text-[var(--theme-text-secondary)] mt-1">
          ทำภารกิจเพื่อเรียนรู้การใช้งานและสะสมแต้ม!
        </p>
      </div>

      <div className="p-6 space-y-6 pt-4">
        {/* Points Display */}
        <div className="bg-gradient-to-br from-[var(--theme-surface)] to-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-2xl p-6 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-sm text-[var(--theme-text-secondary)] font-bold mb-1">แต้มสะสมปัจจุบัน</div>
            <div className="text-4xl font-bold text-[var(--theme-text-primary)] flex items-center gap-2">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              {totalPoints.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--theme-text-secondary)] font-bold mb-1">ความสำเร็จประจำวัน</div>
            <div className="text-2xl font-bold text-[var(--theme-text-primary)] font-mono">
              {dailyProgress} <span className="text-[var(--theme-text-secondary)] text-lg">/ {dailyTotal}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)]">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'daily' 
                ? 'bg-[var(--theme-bg)] text-[var(--theme-text-primary)] shadow-sm' 
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            Daily Missions
          </button>
          <button
            onClick={() => setActiveTab('lifetime')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'lifetime' 
                ? 'bg-[var(--theme-bg)] text-[var(--theme-text-primary)] shadow-sm' 
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            Lifetime
          </button>
        </div>

        {/* Mission List */}
        <div className="space-y-3">
          {activeTab === 'daily' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-[var(--theme-text-secondary)]">
                <Clock className="w-4 h-4" /> รีเซ็ตทุกวันเวลา 00:00
              </div>
              <div className="space-y-3">
                {dailyMissions.sort((a, b) => (a.claimed === b.claimed) ? 0 : a.claimed ? 1 : -1).map((m, i) => renderMission(m, i))}
              </div>
            </div>
          )}

          {activeTab === 'lifetime' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-[var(--theme-text-secondary)]">
                <Trophy className="w-4 h-4" /> ทำสำเร็จได้เพียงครั้งเดียว
              </div>
              {lifetimeMissions.sort((a, b) => (a.claimed === b.claimed) ? 0 : a.claimed ? 1 : -1).map((m, i) => renderMission(m, i))}
            </div>
          )}
        </div>
        
        {/* Privacy Note */}
        <div className="mt-8 text-center text-xs text-[var(--theme-text-secondary)] space-y-2">
          <p className="flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> ข้อมูลความสำเร็จทั้งหมดเป็นความลับและเห็นได้เฉพาะคุณเท่านั้น
          </p>
          <p>ระบบสร้างมาเพื่อแนะนำการใช้งานเท่านั้น ไม่มีผลต่อความสามารถของบัญชี</p>
        </div>
      </div>
    </div>
  );
}
