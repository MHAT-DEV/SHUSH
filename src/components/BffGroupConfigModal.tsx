import React, { useState } from "react";
import { X, ArrowLeft, Users, Bell, BellOff, Link as LinkIcon, LogOut, UserMinus, UserPlus, Copy, Check } from "lucide-react";
import UserDisplay from "./UserDisplay.tsx";

export function BffGroupConfigModal({
  isOpen,
  onClose,
  group,
  user,
  friends,
  token,
  onUpdateNotifications,
  onRefresh
}: any) {
  const [activeTab, setActiveTab] = useState<"menu" | "members" | "invite">("menu");
  const [inviteToken, setInviteToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  if (!isOpen || !group) return null;

  const handleLeave = async () => {
    if (!confirm("คุณต้องการออกจากกลุ่มนี้ใช่หรือไม่?")) return;
    try {
      await fetch('/api/relationships/bff/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ groupId: group.id })
      });
      onRefresh();
      onClose();
    } catch (e) {}
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("ต้องการลบสมาชิกนี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/relationships/bff/${group.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (e) {}
  };

  const handleInviteFriend = async (friendId: string) => {
    try {
      await fetch('/api/relationships/bff/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ groupId: group.id, userId: friendId })
      });
      alert('ส่งคำเชิญเรียบร้อยแล้ว');
      onRefresh();
    } catch (e) {}
  };

  const handleGenerateLink = async () => {
    try {
      const res = await fetch('/api/relationships/bff/invite-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ groupId: group.id })
      });
      const data = await res.json();
      if (data.token) {
        setInviteToken(data.token);
      }
    } catch (e) {}
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?invite_token=${inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md bg-[var(--theme-bg)] md:rounded-2xl border-0 md:border border-[var(--theme-border)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab !== "menu") setActiveTab("menu");
                else onClose();
              }}
              className="md:hidden text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold text-[var(--theme-text-primary)] text-lg">
              {activeTab === "menu" ? `ตั้งค่า ${group.name}` : activeTab === "members" ? "จัดการสมาชิก" : "เชิญเพื่อน"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="hidden md:block text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "menu" && (
            <div className="space-y-2">
              <button 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--theme-surface)] transition-colors text-left"
              >
                <div className="flex items-center gap-3 text-[var(--theme-text-primary)] font-semibold">
                  {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5 text-red-400" />}
                  ปิดการแจ้งเตือน
                </div>
                <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${notificationsEnabled ? 'bg-[var(--theme-surface-hover)]' : 'bg-red-500'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-0' : 'translate-x-4'}`} />
                </div>
              </button>
              
              <button 
                onClick={() => setActiveTab("members")}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--theme-surface)] transition-colors text-left text-[var(--theme-text-primary)] font-semibold"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5" />
                  จัดการสมาชิก
                </div>
                <span className="text-sm text-[var(--theme-text-secondary)]">{group.members?.length || 0} คน</span>
              </button>

              <button 
                onClick={() => setActiveTab("invite")}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--theme-surface)] transition-colors text-left text-[var(--theme-text-primary)] font-semibold"
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5" />
                  เชิญ
                </div>
              </button>

              <button 
                onClick={handleLeave}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors text-left font-semibold"
              >
                <LogOut className="w-5 h-5" />
                ออกจากกลุ่ม (Leave Circle)
              </button>
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-3">
              {group.members?.map((m: any) => (
                <div key={m.userId} className="flex items-center justify-between p-3 rounded-xl bg-[var(--theme-surface)]">
                  <span className="font-semibold text-[var(--theme-text-primary)]">{m.userId === user.id ? 'คุณ (Me)' : m.userId}</span>
                  {m.userId !== user.id && (
                    <button 
                      onClick={() => handleRemoveMember(m.userId)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "invite" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-bold text-[var(--theme-text-primary)]">ส่งลิงก์เชิญ (ใช้ได้ครั้งเดียว)</h4>
                {!inviteToken ? (
                  <button 
                    onClick={handleGenerateLink}
                    className="w-full py-2.5 rounded-xl bg-[var(--theme-primary)] text-white font-bold flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" /> สร้างลิงก์เชิญใหม่
                  </button>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-primary)]/30">
                    <span className="flex-1 font-mono text-xs truncate text-[var(--theme-text-primary)]">
                      {window.location.origin}/?invite_token={inviteToken}
                    </span>
                    <button onClick={handleCopyLink} className="p-2 bg-[var(--theme-primary)] text-white rounded-lg">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-bold text-[var(--theme-text-primary)]">เชิญจากรายชื่อเพื่อน</h4>
                <div className="space-y-2">
                  {friends?.map((f: any) => {
                    const isMember = group.members?.find((m: any) => m.userId === f.id);
                    return (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--theme-surface)]">
                        <span className="font-semibold text-[var(--theme-text-primary)]"><UserDisplay user={f} /></span>
                        {!isMember ? (
                          <button 
                            onClick={() => handleInviteFriend(f.id)}
                            className="text-xs bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] px-3 py-1 rounded-full font-bold"
                          >
                            เชิญ
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--theme-text-secondary)]">เข้าร่วมแล้ว</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
