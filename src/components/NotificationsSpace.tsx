import React, { useState, useEffect } from "react";
import {
  Bell,
  Shield,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  Moon,
  Clock,
  CheckCircle,
  Trash2,
  Sliders,
  Lock,
  Info,
  AlertTriangle,
  ListFilter,
  ChevronLeft,
  Smartphone,
  Volume2,
  VolumeX,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { ShushNotification, NotificationSettings } from "../types";

interface NotificationsSpaceProps {
  user: any;
  notifications?: ShushNotification[];
  onRefreshNotifications?: () => void;
  onNavigateToTab?: (
    tab:
      | "chat"
      | "stories"
      | "space"
      | "vault"
      | "settings"
      | "lenses"
      | "pet"
      | "discovery"
      | "notifications",
  ) => void;
  onNavigateToNotification?: (notification: ShushNotification) => void;
  onClose?: () => void;
}

export default function NotificationsSpace({
  user,
  notifications: propNotifications,
  onRefreshNotifications,
  onNavigateToTab,
  onNavigateToNotification,
  onClose,
}: NotificationsSpaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "center" | "pet" | "inbox" | "settings" | "dnd"
  >("center");
  const [localNotifications, setLocalNotifications] = useState<
    ShushNotification[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const notifications =
    propNotifications !== undefined ? propNotifications : localNotifications;

  const setNotifications = (
    val:
      | ShushNotification[]
      | ((prev: ShushNotification[]) => ShushNotification[]),
  ) => {
    if (typeof val === "function") {
      setLocalNotifications((prev) => {
        const next = val(
          propNotifications !== undefined ? propNotifications : prev,
        );
        return next;
      });
    } else {
      setLocalNotifications(val);
    }
    if (onRefreshNotifications) {
      onRefreshNotifications();
    }
  };
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  const token = localStorage.getItem("shush_token");

  const fetchPendingInvites = async () => {
    try {
      const res = await fetch("/api/honey/invites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptInvite = async (fromUserId: string, notificationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/honey/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fromUserId })
      });
      if (res.ok) {
        showToast('ยอมรับการเชื่อมต่อสำเร็จ ตอนนี้คุณเป็นเพื่อนกันแล้ว! 🎉');
        handleMarkAsRead(notificationId);
        fetchPendingInvites();
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineInvite = async (fromUserId: string, notificationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/honey/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fromUserId })
      });
      if (res.ok) {
        showToast('ปฏิเสธคำขอการเชื่อมต่อเรียบร้อย');
        handleMarkAsRead(notificationId);
        fetchPendingInvites();
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderAvatar = (avatarVal?: string) => {
    if (!avatarVal) return <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0 font-bold">👤</div>;
    if (avatarVal.length <= 2) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] flex items-center justify-center text-xl shrink-0 mt-0.5 font-sans">
          {avatarVal}
        </div>
      );
    }
    if (avatarVal.startsWith("http") || avatarVal.startsWith("data:")) {
      return (
        <img
          src={avatarVal}
          alt="Avatar"
          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[var(--theme-border)] mt-0.5"
          referrerPolicy="no-referrer"
        />
      );
    }
    const num = parseInt(avatarVal, 10);
    const EMOJI_AVATARS = [
      '🐱', '🦊', '🐻', '🦁', '🐨', '🐼', '🐯', '🐮',
      '🐸', '🐣', '🦄', '🌈', '⚡', '🌸', '🥑', '🎮',
      '🎨', '🚀', '💻', '🪐', '🍿', '💙', '💕', '👑'
    ];
    if (!isNaN(num) && num >= 0 && num < EMOJI_AVATARS.length) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] flex items-center justify-center text-xl shrink-0 mt-0.5 font-sans">
          {EMOJI_AVATARS[num]}
        </div>
      );
    }
    return <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0 font-bold">👤</div>;
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/notifications/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
    fetchPendingInvites();
  }, []);

  const handleUpdateSettings = async (
    updatedFields: Partial<NotificationSettings>,
  ) => {
    if (!settings) return;
    try {
      setIsSaving(true);
      const newSettings = { ...settings, ...updatedFields };
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        showToast("บันทึกการตั้งค่าความเป็นส่วนตัวสำเร็จ 🔒");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsUnread = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/unread`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
        );
        showToast("ทำเครื่องหมายว่ายังไม่ได้อ่านแล้ว");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast("ลบแจ้งเตือนสำเร็จ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        showToast("ทำเครื่องหมายว่าอ่านแล้วทั้งหมด 🔔");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearRead = async () => {
    try {
      const res = await fetch("/api/notifications/clear-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        setSelectedIds(new Set());
        showToast("ล้างแจ้งเตือนที่อ่านแล้วสำเร็จ 🧹");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchAction = async (action: "read" | "unread" | "delete") => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/notifications/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids,
          isRead:
            action === "read" ? true : action === "unread" ? false : undefined,
          shouldDelete: action === "delete" ? true : undefined,
        }),
      });
      if (res.ok) {
        if (action === "delete") {
          setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
        } else {
          setNotifications((prev) =>
            prev.map((n) =>
              ids.includes(n.id) ? { ...n, isRead: action === "read" } : n,
            ),
          );
        }
        setSelectedIds(new Set());
        showToast(
          action === "delete"
            ? "ลบรายการที่เลือกสำเร็จ"
            : action === "read"
              ? "ทำเครื่องหมายอ่านแล้วสำเร็จ"
              : "ทำเครื่องหมายว่ายังไม่ได้อ่านสำเร็จ",
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearAll = async () => {
    if (!window.confirm("คุณต้องการล้างประวัติการแจ้งเตือนทั้งหมดใช่หรือไม่?"))
      return;
    try {
      const res = await fetch("/api/notifications/clear", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications([]);
        setSelectedIds(new Set());
        showToast("ล้างประวัติการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter based on sub-tabs - PET notifications are completely removed as requested
  const activeNotifications = notifications.filter(
    (n) => !n.isSilent && n.category !== "PET",
  );
  const silentNotifications = notifications.filter((n) => n.isSilent && n.category !== "PET");

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const displayedNotifications = notifications.filter((n) => {
    if (n.category === "PET") return false; // Filter out PET notifications completely
    if (filter === "unread" && n.isRead) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead && n.category !== "PET").length;

  const timeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1)
      return `Yesterday at ${new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return (
      new Date(dateString).toLocaleDateString() +
      " at " +
      new Date(dateString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const getIcon = (category: string) => {
    switch (category) {
      case "RELATIONSHIP":
        return <CheckCircle className="w-5 h-5 text-white" />;
      case "LENS":
        return <Eye className="w-5 h-5 text-white" />;
      case "SYSTEM":
        return <Shield className="w-5 h-5 text-white" />;
      case "HONEY_ME":
        return <Sparkles className="w-5 h-5 text-white" />;
      default:
        return <Info className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="w-full h-full bg-transparent flex flex-col font-sans text-[var(--theme-text-primary)] relative">
        {/* Toast Notification for state updates */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#8B6DFF] text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce border border-white/20 whitespace-nowrap">
            <Check className="w-3.5 h-3.5 text-white shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--theme-border)]">
          <div className="flex items-center gap-2">
            {activeSubTab === "settings" && (
              <button
                onClick={() => setActiveSubTab("center")}
                className="mr-1 p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] rounded-lg transition-colors"
                title="ย้อนกลับ"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <h2 className="text-xl font-bold text-[var(--theme-text-primary)]">
              {activeSubTab === "settings" ? "Notification Settings" : "Notifications"}
            </h2>
            {activeSubTab !== "settings" && unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[var(--theme-text-secondary)]">
            <button
              onClick={() => setActiveSubTab(activeSubTab === "settings" ? "center" : "settings")}
              className={`p-1.5 hover:text-[var(--theme-text-primary)] transition-colors rounded-lg ${activeSubTab === "settings" ? "text-[var(--theme-primary)] bg-[var(--theme-primary)]/10" : ""}`}
              title="ตั้งค่าแจ้งเตือน"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => onClose ? onClose() : (onNavigateToTab && onNavigateToTab("space"))}
              className="p-1.5 hover:text-[var(--theme-text-primary)] transition-colors rounded-lg"
              title="ปิด"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {activeSubTab === "settings" ? (
          <div className="flex-1 overflow-y-auto bg-[var(--theme-bg)] p-6 space-y-6">
            {!settings ? (
              <div className="flex flex-col items-center justify-center h-48 text-[var(--theme-text-secondary)]">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-[var(--theme-primary)]" />
                <p className="text-sm">กำลังโหลดการตั้งค่า...</p>
              </div>
            ) : (
              <>
                {/* 1. Delivery Mode Settings */}
                <div className="bg-[var(--theme-surface)]/60 border border-[var(--theme-border)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-[var(--theme-border)] pb-3">
                    <Smartphone className="w-5 h-5 text-indigo-400 shrink-0" />
                    <h3 className="font-bold text-sm text-[var(--theme-text-primary)]">วิธีการรับแจ้งเตือน (Delivery Method)</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "IN_APP", label: "แอปหลัก", desc: "ในแถบและป๊อปอัป" },
                      { id: "BADGE", label: "ตัวเลขสะสม", desc: "ไอคอน Badge" },
                      { id: "SILENT", label: "โหมดเงียบ", desc: "เก็บไว้เงียบๆ" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleUpdateSettings({ deliveryType: mode.id as any })}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          settings.deliveryType === mode.id
                            ? "bg-[var(--theme-primary)]/15 border-[var(--theme-primary)] text-[var(--theme-primary)]"
                            : "bg-black/10 border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:bg-black/20"
                        }`}
                      >
                        <span className="block font-bold text-xs">{mode.label}</span>
                        <span className="block text-[10px] mt-0.5 opacity-80">{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Do Not Disturb Mode */}
                <div className="bg-[var(--theme-surface)]/60 border border-[var(--theme-border)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3">
                    <div className="flex items-center gap-2.5">
                      <Moon className="w-5 h-5 text-amber-400 shrink-0" />
                      <h3 className="font-bold text-sm text-[var(--theme-text-primary)]">โหมดห้ามรบกวน (Do Not Disturb)</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.dndEnabled}
                        onChange={() => handleUpdateSettings({ dndEnabled: !settings.dndEnabled })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                    </label>
                  </div>

                  {settings.dndEnabled && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[var(--theme-text-secondary)]">ขอบเขตการห้ามรบกวน:</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "ALL", label: "ทั้งหมด", desc: "เงียบทุกรายการ" },
                            { id: "GROUPS", label: "เฉพาะกลุ่ม", desc: "ยกเว้นแจ้งเตือนหลัก" },
                            { id: "SCHEDULE", label: "ตามเวลา", desc: "ตามช่วงที่กำหนด" }
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => handleUpdateSettings({ dndMode: mode.id as any })}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                settings.dndMode === mode.id
                                  ? "bg-[var(--theme-primary)]/15 border-[var(--theme-primary)] text-[var(--theme-primary)]"
                                  : "bg-black/10 border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:bg-black/20"
                              }`}
                            >
                              <span className="block font-bold text-xs">{mode.label}</span>
                              <span className="block text-[9px] mt-0.5 opacity-80">{mode.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {settings.dndMode === "SCHEDULE" && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-black/10 rounded-xl border border-[var(--theme-border)]">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--theme-text-secondary)] mb-1">เวลาเริ่มต้น:</label>
                            <input
                              type="time"
                              value={settings.dndScheduleStart || "22:00"}
                              onChange={(e) => handleUpdateSettings({ dndScheduleStart: e.target.value })}
                              className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--theme-text-secondary)] mb-1">เวลาสิ้นสุด:</label>
                            <input
                              type="time"
                              value={settings.dndScheduleEnd || "08:00"}
                              onChange={(e) => handleUpdateSettings({ dndScheduleEnd: e.target.value })}
                              className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 bg-black/10 rounded-xl border border-[var(--theme-border)]">
                        <div className="flex flex-col pr-4">
                          <span className="text-xs font-bold text-[var(--theme-text-primary)]">อนุญาตระบบวิกฤต (Critical System)</span>
                          <span className="text-[10px] text-[var(--theme-text-secondary)]">ยอมให้แจ้งเตือนระบบที่สำคัญข้ามโหมด DND ได้</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={settings.dndOverrideSystemCritical}
                            onChange={() => handleUpdateSettings({ dndOverrideSystemCritical: !settings.dndOverrideSystemCritical })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Filter Categories Toggle */}
                <div className="bg-[var(--theme-surface)]/60 border border-[var(--theme-border)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-[var(--theme-border)] pb-3">
                    <Sliders className="w-5 h-5 text-teal-400 shrink-0" />
                    <h3 className="font-bold text-sm text-[var(--theme-text-primary)]">ประเภทแจ้งเตือนที่อนุญาต</h3>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: "RELATIONSHIP", label: "💬 คู่หู & ความสัมพันธ์", desc: "การแชท, การบีบมือ, คำขอเป็นคู่หู" },
                      { key: "LENS", label: "🎭 ความลับ & เลนส์", desc: "การสะกดรอย, แอบมองเลนส์, กิจกรรมลับ" },
                      { key: "PET", label: "🐾 สัตว์เลี้ยงแสนรัก", desc: "สถานะหิว, ป่วย, ความเติบโตของคู่หูสัตว์เลี้ยง" },
                      { key: "SYSTEM", label: "🛡️ ระบบ & ความปลอดภัย", desc: "การตั้งค่า, การล็อกอินใหม่, ข้อมูลแอป" },
                      { key: "HONEY_ME", label: "💖 ฟังก์ชัน Honey Me", desc: "การส่งความรู้สึกพิเศษ และกิจกรรมน่ารักอื่นๆ" }
                    ].map((cat) => (
                      <div key={cat.key} className="flex items-center justify-between py-1">
                        <div className="flex flex-col pr-4">
                          <span className="text-xs font-bold text-[var(--theme-text-primary)]">{cat.label}</span>
                          <span className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5">{cat.desc}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={settings.categories[cat.key as keyof typeof settings.categories] ?? true}
                            onChange={() => {
                              const updatedCategories = {
                                ...settings.categories,
                                [cat.key]: !settings.categories[cat.key as keyof typeof settings.categories]
                              };
                              handleUpdateSettings({ categories: updatedCategories });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Relationship Scope Filter */}
                <div className="bg-[var(--theme-surface)]/60 border border-[var(--theme-border)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-[var(--theme-border)] pb-3">
                    <CheckCircle className="w-5 h-5 text-pink-400 shrink-0" />
                    <h3 className="font-bold text-sm text-[var(--theme-text-primary)]">สิทธิ์ความสัมพันธ์แชท</h3>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: "FRIENDS", label: "เพื่อนทั่วไป (Friends)", desc: "เปิดรับแจ้งเตือนจากรายชื่อเพื่อนปกติ" },
                      { key: "BFF", label: "เพื่อนสนิท (BFF)", desc: "เปิดรับแจ้งเตือนจากเพื่อนสนิทที่สุดเท่านั้น" },
                      { key: "COUPLE", label: "คู่รัก (Couple)", desc: "เปิดรับแจ้งเตือนจากคู่แชทพิเศษของคุณ" }
                    ].map((rel) => (
                      <div key={rel.key} className="flex items-center justify-between py-1">
                        <div className="flex flex-col pr-4">
                          <span className="text-xs font-bold text-[var(--theme-text-primary)]">{rel.label}</span>
                          <span className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5">{rel.desc}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={settings.relationships[rel.key as keyof typeof settings.relationships] ?? true}
                            onChange={() => {
                              const updated = {
                                ...settings.relationships,
                                [rel.key]: !settings.relationships[rel.key as keyof typeof settings.relationships]
                              };
                              handleUpdateSettings({ relationships: updated });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Preferences (Message Preview / Toast Popups) */}
                <div className="bg-[var(--theme-surface)]/60 border border-[var(--theme-border)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-[var(--theme-border)] pb-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0" />
                    <h3 className="font-bold text-sm text-[var(--theme-text-primary)]">ความพึงพอใจการแสดงผล</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col pr-4">
                        <span className="text-xs font-bold text-[var(--theme-text-primary)]">แสดงตัวอย่างข้อความ</span>
                        <span className="text-[10px] text-[var(--theme-text-secondary)]">แสดงเนื้อความสั้นในแถบแจ้งเตือน</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.showMessagePreview}
                          onChange={() => handleUpdateSettings({ showMessagePreview: !settings.showMessagePreview })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col pr-4">
                        <span className="text-xs font-bold text-[var(--theme-text-primary)]">แสดงการแจ้งเตือนแบบป๊อปอัป</span>
                        <span className="text-[10px] text-[var(--theme-text-secondary)]">แสดงแบนเนอร์แจ้งเตือนชั่วขณะที่ด้านบนแอป</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.enableToastPopup}
                          onChange={() => handleUpdateSettings({ enableToastPopup: !settings.enableToastPopup })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {isSaving && (
                  <div className="text-center text-xs text-[var(--theme-text-secondary)] flex items-center justify-center gap-1.5 pt-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึกการตั้งค่า...</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--theme-border)]">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === "all" ? "bg-[var(--theme-primary)] text-[var(--theme-primary-content)]" : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]"}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === "unread" ? "bg-[var(--theme-primary)] text-[var(--theme-primary-content)]" : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]"}`}
              >
                Unread
              </button>
              
              <button
                onClick={handleMarkAllRead}
                className="ml-auto p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] rounded-lg transition-colors border border-[var(--theme-border)]"
                title="Mark all as read"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearRead}
                className="p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] rounded-lg transition-colors border border-[var(--theme-border)]"
                title="Clear read history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto bg-[var(--theme-bg)]">
              {displayedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--theme-text-secondary)]">
                  <Bell className="w-8 h-8 mb-2 opacity-20 text-[var(--theme-text-secondary)]" />
                  <p className="text-sm">No notifications to show</p>
                </div>
              ) : (
                displayedNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setOpenDropdownId(null);
                      handleMarkAsRead(n.id);
                      if (onNavigateToNotification) {
                        onNavigateToNotification(n);
                      } else if (onNavigateToTab) {
                        if (n.category === "RELATIONSHIP")
                          onNavigateToTab("chat");
                        else if (n.category === "LENS")
                          onNavigateToTab("lenses");
                        else if (n.category === "HONEY_ME")
                          onNavigateToTab("discovery");
                        else if (n.category === "SYSTEM")
                          onNavigateToTab("settings");
                      }
                    }}
                    className={`relative flex items-start gap-4 p-5 border-b border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)]/30 transition-colors cursor-pointer ${!n.isRead ? "bg-[var(--theme-primary)]/10" : ""}`}
                  >
                    {n.senderId ? (
                      renderAvatar(n.senderAvatar)
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-primary-content)] flex items-center justify-center shrink-0 mt-0.5">
                        {getIcon(n.category)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-8">
                      {n.category === 'HONEY_ME' && n.senderId ? (
                        <div>
                          <p className="text-sm text-[var(--theme-text-primary)] leading-relaxed">
                            <span className="font-bold">{n.senderDisplayName || n.senderUsername}</span> ส่งคำขอเป็นเพื่อนกับคุณ
                          </p>
                          {pendingInvites.some((p) => p.id === n.senderId) && (
                            <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleAcceptInvite(n.senderId!, n.id, e)}
                                className="px-4 py-1.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/80 text-[var(--theme-primary-content)] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> ยอมรับ
                              </button>
                              <button
                                onClick={(e) => handleDeclineInvite(n.senderId!, n.id, e)}
                                className="px-4 py-1.5 bg-[var(--theme-surface-hover)] hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> ปฏิเสธ
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--theme-text-primary)] leading-relaxed">
                          <span className="font-bold">{n.title}</span> {n.body}
                        </p>
                      )}
                      <p className="text-xs text-[var(--theme-text-secondary)] mt-1.5">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* 3-dot menu */}
                    <div className="absolute right-4 top-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === n.id ? null : n.id);
                        }}
                        className="p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] rounded-full transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {openDropdownId === n.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-56 bg-[var(--theme-surface)] rounded-xl shadow-xl border border-[var(--theme-border)] py-2 z-50">
                            <button
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleMarkAsRead(n.id);
                                if (onNavigateToNotification) {
                                  onNavigateToNotification(n);
                                } else if (onNavigateToTab) {
                                  if (n.category === "RELATIONSHIP")
                                    onNavigateToTab("chat");
                                  else if (n.category === "LENS")
                                    onNavigateToTab("lenses");
                                  else if (n.category === "HONEY_ME")
                                    onNavigateToTab("discovery");
                                  else if (n.category === "SYSTEM")
                                    onNavigateToTab("settings");
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm font-bold text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] flex items-center gap-3"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect
                                  width="18"
                                  height="18"
                                  x="3"
                                  y="4"
                                  rx="2"
                                  ry="2"
                                />
                                <line x1="16" x2="16" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="2" y2="6" />
                                <line x1="3" x2="21" y1="10" y2="10" />
                                <path d="m9 16 2 2 4-4" />
                              </svg>
                              Go to notification
                            </button>
                            <button
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleDeleteNotification(n.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm font-bold text-rose-500 hover:bg-[var(--theme-surface-hover)] flex items-center gap-3"
                            >
                              <Trash2 className="w-4 h-4" />
                              ลบรายการนี้
                            </button>
                            {!n.isRead && (
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleMarkAsRead(n.id);
                                }}
                                className="w-full text-left px-4 py-2 text-sm font-bold text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] flex items-center gap-3"
                              >
                                <CheckCircle className="w-4 h-4 text-[var(--theme-primary)]" />
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
          </>
        )}
    </div>
  );
}
