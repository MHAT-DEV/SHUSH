import React, { useState, useEffect, useRef, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRouteSync } from "./useRouteSync";
import AuthScreen from "./components/AuthScreen";
import {
  Shield,
  MessageSquare,
  Users,
  Clock,
  Settings,
  Search,
  Folder,
  Send,
  User,
  Heart,
  Plus,
  Trash2,
  Unlock,
  Copy,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sparkles,
  Zap,
  Info,
  CircleDot,
  CheckCircle,
  AlertTriangle,
  Flame,
  CornerDownLeft,
  CalendarCheck,
  Eye,
  Radio,
  X,
  Bell,
  Fingerprint,
  UserPlus,
  Sun,
  Moon,
  ShoppingBag,
  QrCode,
  ArrowLeft,
  Home,
  Compass,
  Activity,
  Menu,
  MoreHorizontal,
  Star,
  Pin,
  BellOff,
  Ban,
  Image,
  Smile,
  Mic,
  Camera,
  Paperclip,
} from "lucide-react";
import {
  generateE2EEKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  generateRecoveryKey,
} from "./lib/crypto.ts";
import { motion, AnimatePresence } from "motion/react";
import { LinkPreview } from "./components/LinkPreview.tsx";

import { IdentityContext } from "./IdentityContext.tsx";
import UserDisplay from "./components/UserDisplay.tsx";

// Lazy load subcomponents for progressive performance
const CoupleSpace = React.lazy(() => import("./components/CoupleSpace.tsx"));
const BffSpace = React.lazy(() => import("./components/BffSpace.tsx"));
const VaultSpace = React.lazy(() => import("./components/VaultSpace.tsx"));
const StoriesSpace = React.lazy(() => import("./components/StoriesSpace.tsx"));
const AchievementsTab = React.lazy(
  () => import("./components/AchievementsTab.tsx"),
);
const DeviceAndLogs = React.lazy(
  () => import("./components/DeviceAndLogs.tsx"),
);
const BffGroupConfigModal = React.lazy(
  () => import("./components/BffGroupConfigModal.tsx").then(module => ({ default: module.BffGroupConfigModal }))
);
const LensesSpace = React.lazy(() => import("./components/LensesSpace.tsx"));
const QRShareManager = React.lazy(
  () => import("./components/QRShareManager.tsx"),
);
const PublicProfileView = React.lazy(
  () => import("./components/PublicProfileView.tsx"),
);
const PetSpace = React.lazy(() =>
  import("./components/PetSpace.tsx").then((m) => ({ default: m.PetSpace })),
);
const DiscoverySpace = React.lazy(
  () => import("./components/DiscoverySpace.tsx"),
);
const NotificationsSpace = React.lazy(
  () => import("./components/NotificationsSpace.tsx"),
);
const ShhStoreSpace = React.lazy(
  () => import("./components/ShhStoreSpace.tsx"),
);

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

const EMOJI_AVATARS = [
  "🐱",
  "🦊",
  "🐻",
  "🦁",
  "🐨",
  "🐼",
  "🐯",
  "🐮",
  "🐸",
  "🐣",
  "🦄",
  "🌈",
  "⚡",
  "🌸",
  "🥑",
  "🎮",
  "🎨",
  "🚀",
  "💻",
  "🪐",
  "🍿",
  "💙",
  "💕",
  "👑",
];

async function verifyKeyPair(publicKeyBase64: string, privateKeyBase64: string): Promise<boolean> {
  try {
    const testString = "verify_key_pair";
    const enc = await encryptWithPublicKey(testString, publicKeyBase64);
    const dec = await decryptWithPrivateKey(enc.ciphertext, privateKeyBase64);
    return dec === testString;
  } catch (e) {
    return false;
  }
}

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("shush_token"),
  );
  const [privateKey, setPrivateKey] = useState<string | null>(
    localStorage.getItem("shush_private_key"),
  );

  const [activeTab, setActiveTab] = useState<
    | "chat"
    | "space"
    | "vault"
    | "settings"
    | "lenses"
    | "pet"
    | "discovery"
    | "notifications"
    | "store"
    | "achievements"
  >("chat");
  const [activeCategory, setActiveCategory] = useState<
    | "social"
    | "explore"
    | "pet"
    | "notifications"
    | "lenses"
    | "settings"
    | "store"
  >("social");

  const [showNotificationsSidebar, setShowNotificationsSidebar] = useState<boolean>(false);
  const [selectedDiscoverProfileId, setSelectedDiscoverProfileId] = useState<string | null>(null);
  const [showDiscoverInbox, setShowDiscoverInbox] = useState<boolean>(false);

  // Theme & Identity State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    () => localStorage.getItem("shush_theme_mode") !== "light",
  );
  const [activeTheme, setActiveTheme] = useState<string>(
    () => localStorage.getItem("shush_theme") || "default",
  );
  const [points, setPoints] = useState<number>(() =>
    parseInt(localStorage.getItem("shush_points") || "1500"),
  );
  const [activeBadge, setActiveBadge] = useState<string | null>(() =>
    localStorage.getItem("shush_active_badge"),
  );
  const [activeNameColor, setActiveNameColor] = useState<string | null>(() =>
    localStorage.getItem("shush_active_name_color"),
  );

  
  

  // Sync theme

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("shush_theme_mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("shush_theme_mode", "light");
    }
    document.documentElement.setAttribute("data-theme", activeTheme);
    localStorage.setItem("shush_theme", activeTheme);
  }, [isDarkMode, activeTheme]);

  // Sync points
  useEffect(() => {
    localStorage.setItem("shush_points", points.toString());
  }, [points]);

  // Sync notifications tab to right sidebar on desktop
  useEffect(() => {
    if (activeTab === "notifications" && window.innerWidth >= 768) {
      setShowNotificationsSidebar(true);
      setActiveTab("chat");
      setActiveCategory("social");
    }
  }, [activeTab]);

  // Self-healing End-to-End Encryption Key Management
  const ensureValidKeyPair = async (currentUser: any) => {
    if (!currentUser) return;
    
    const userKeyStoreName = `shush_private_key_${currentUser.id}`;
    let storedPrivKey = localStorage.getItem(userKeyStoreName);
    
    // Check if we have a legacy key
    if (!storedPrivKey) {
      const legacyKey = localStorage.getItem("shush_private_key");
      if (legacyKey) {
        // Test if the legacy key matches this user's public key
        const isMatch = await verifyKeyPair(currentUser.publicKey, legacyKey);
        if (isMatch) {
          storedPrivKey = legacyKey;
          localStorage.setItem(userKeyStoreName, legacyKey);
        }
      }
    }
    
    // If we still don't have a valid key, or the stored key doesn't match the current public key
    let keysAreValid = false;
    if (storedPrivKey) {
      keysAreValid = await verifyKeyPair(currentUser.publicKey, storedPrivKey);
    }
    
    if (!keysAreValid) {
      console.log("No valid local private key matching public key, generating new keypair...");
      try {
        const newKeys = await generateE2EEKeyPair();
        localStorage.setItem(userKeyStoreName, newKeys.privateKeyBase64);
        localStorage.setItem("shush_private_key", newKeys.privateKeyBase64); // Fallback
        setPrivateKey(newKeys.privateKeyBase64);
        
        // Update public key on the server so other users can encrypt for this user
        const res = await fetch("/api/users/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("shush_token")}`,
          },
          body: JSON.stringify({
            publicKey: newKeys.publicKeyBase64,
          }),
        });
        if (res.ok) {
          console.log("Successfully updated public key on server to match new private key!");
          const data = await res.json();
          if (data && data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error("Failed to generate or update keypair:", err);
      }
    } else {
      setPrivateKey(storedPrivKey);
    }
  };

  useEffect(() => {
    if (user) {
      ensureValidKeyPair(user);
    }
  }, [user?.id, user?.publicKey]);

  // Sync category when tab changes (prevents mismatch bugs from hot reloads or quick pins)
  useEffect(() => {
    if (
      ["chat", "space", "vault"].includes(activeTab) &&
      activeCategory !== "social"
    ) {
      setActiveCategory("social");
    } else if (activeTab === "discovery" && activeCategory !== "explore") {
      setActiveCategory("explore");
    } else if (activeTab === "pet" && activeCategory !== "pet") {
      setActiveCategory("pet");
    } else if (
      activeTab === "notifications" &&
      activeCategory !== "notifications"
    ) {
      setActiveCategory("notifications");
    } else if (activeTab === "lenses" && activeCategory !== "lenses") {
      setActiveCategory("lenses");
    } else if (activeTab === "settings" && activeCategory !== "settings") {
      setActiveCategory("settings");
    }
  }, [activeTab, activeCategory]);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeToasts, setActiveToasts] = useState<any[]>([]);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Lenses state and active state
  const [userLenses, setUserLenses] = useState<any[]>([]);
  const [activeLensType, setActiveLensType] = useState<
    "PUBLIC" | "FRIENDS" | "BFF" | "COUPLE"
  >((localStorage.getItem("shush_active_lens") as any) || "PUBLIC");
  const [presenceStatus, setPresenceStatus] = useState<
    "online" | "busy" | "away" | "offline"
  >((sessionStorage.getItem("shush_custom_presence") as any) || "online");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [showEditStatusPanel, setShowEditStatusPanel] = useState(false);

  // Auth/Landing states
  const [isRegistering, setIsRegistering] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [displayInput, setDisplayInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [avatarIndex, setAvatarIndex] = useState("0");
  const [loginUsername, setLoginUsername] = useState("");

  // Key Pair visual generation during registration
  const [generatedKeys, setGeneratedKeys] = useState<any | null>(null);
  const [recoveryKeyInfo, setRecoveryKeyInfo] = useState<any | null>(null);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);

  // Recovery authentication
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");

  // Relationship States
  const [circles, setCircles] = useState<any[]>([]);
  const [couple, setCouple] = useState<any | null>(null);
  const [couplePartner, setCouplePartner] = useState<any | null>(null);
  const [partnerPet, setPartnerPet] = useState<any | null>(null);
  const [bffGroups, setBffGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<{
    type: "COUPLE" | "BFF_GROUP" | "FRIEND";
    id: string;
    name: string;
    friendId?: string;
  } | null>(null);

  useRouteSync({
    activeTab, setActiveTab,
    activeCategory, setActiveCategory,
    activeChannel, setActiveChannel,
    user, couple, bffGroups, friends
  });

  const [activeSidebarTab, setActiveSidebarTab] = useState<"CHATS" | "FRIENDS">(
    "CHATS",
  );
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Search user to build relationship
  const [searchUsername, setSearchUsername] = useState("");
  const [foundPartner, setFoundPartner] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");

  // New BFF Group Modal
  const [newBffName, setNewBffName] = useState("");
  const [showBffModal, setShowBffModal] = useState(false);
  const [showBffGroupConfig, setShowBffGroupConfig] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [activeFriendMenu, setActiveFriendMenu] = useState<string | null>(null);
  const [addFriendModalView, setAddFriendModalView] = useState<"search" | "qr">(
    "search",
  );
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Chat/Messages State
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [replyMessageId, setReplyMessageId] = useState<string | null>(null);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [burnDuration, setBurnDuration] = useState(10); // 10 seconds default
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const chatImages = messages.filter(
    (msg) => msg.decryptedContent && msg.decryptedContent.startsWith("data:image/")
  );

  const [allConversationsMessages, setAllConversationsMessages] = useState<Record<string, any[]>>({});

  // Message edit history modal
  const [msgVersions, setMsgVersions] = useState<any[]>([]);
  const [showVersionsModal, setShowVersionsModal] = useState(false);

  // WebSocket / Real-time references
  const wsRef = useRef<WebSocket | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<
    "online" | "offline" | "away"
  >("offline");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimerRef = useRef<any>(null);
  const burningMessagesRef = useRef<Set<string>>(new Set());
  const decryptionCacheRef = useRef<Record<string, { decryptedContent: string; mediaType?: string; mediaUrl?: string }>>({});

  const decryptMessageWithCache = async (msg: any, privateKey: string, userId: string) => {
    const cacheKey = `${msg.id}_${msg.ciphertext}`;
    if (decryptionCacheRef.current[cacheKey]) {
      return decryptionCacheRef.current[cacheKey];
    }

    let text = "[ข้อความนี้ได้รับการเข้ารหัสที่คุณยังไม่ได้รับสิทธิ์ถอดรหัส]";
    let mediaType = msg.mediaType;
    let mediaUrl = msg.mediaUrl;

    try {
      if (msg.ciphertext.startsWith("v2|") || msg.ciphertext.startsWith("v3|")) {
        const payload = JSON.parse(msg.ciphertext.substring(3));
        const myEnc = payload[userId || ''];
        if (myEnc && privateKey) {
          text = await decryptWithPrivateKey(myEnc, privateKey);
          if (msg.ciphertext.startsWith("v3|")) {
            try {
              const obj = JSON.parse(text);
              text = obj.text;
              mediaType = obj.mediaType;
              mediaUrl = obj.mediaUrl;
            } catch (e) {}
          }
        }
      } else {
        if (privateKey) {
          text = await decryptWithPrivateKey(msg.ciphertext, privateKey);
        }
      }
    } catch (e) {
      console.warn("Decryption error handled gracefully:", e);
    }

    const result = { decryptedContent: text, mediaType, mediaUrl };
    decryptionCacheRef.current[cacheKey] = result;
    return result;
  };

  useEffect(() => {
    decryptionCacheRef.current = {};
  }, [privateKey]);

  // Chat scroll references
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isScrolledUpRef = useRef(false);

  const handleChatScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 50;
    setIsScrolledUp(isUp);
    isScrolledUpRef.current = isUp;
    if (!isUp) setShowNewMessageBadge(false);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setIsScrolledUp(false);
      isScrolledUpRef.current = false;
      setShowNewMessageBadge(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      fetchRelationships();
      fetchCircles();
      fetchFriends();
      initWebSocket();
      fetchUserLenses();

      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite_token");
      if (inviteToken) {
        fetch('/api/relationships/bff/join-link', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token: inviteToken })
        }).then(res => res.json()).then(data => {
          if (data.error) {
            alert(data.error);
          } else {
            fetchRelationships();
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }).catch(console.error);
      }
    }
    return () => {
      if (wsRef.current) {
        const tempWs = wsRef.current;
        wsRef.current = null;
        tempWs.close();
      }
    };
  }, [user]);

  // Notify server of chat focus changes on the same socket, avoiding connection restarts
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat_focused",
          chatId: activeChannel?.id || "",
        })
      );
    }
  }, [activeChannel?.id]);

  const pollNotifications = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return;
        }
        const data = await res.json();
        const allNotifications = data.notifications || [];

        // Silent notifications are stored silently, active ones should be counted/toasted
        const activeNotifications = allNotifications.filter(
          (n: any) => !n.isSilent,
        );
        const unread = activeNotifications.filter((n: any) => !n.isRead);

        setUnreadCount(unread.length);

        const isFirstRun = notifiedIdsRef.current.size === 0;

        if (isFirstRun) {
          unread.forEach((n: any) => notifiedIdsRef.current.add(n.id));
        } else {
          const newUnreads = unread.filter(
            (n: any) => !notifiedIdsRef.current.has(n.id),
          );
          if (newUnreads.length > 0) {
            const enableToasts =
              localStorage.getItem("shush_enable_toast_popup") !== "false" &&
              presenceStatus !== "busy" &&
              presenceStatus !== "away";

            newUnreads.forEach((n: any) => {
              notifiedIdsRef.current.add(n.id);

              if (enableToasts && !n.isSilent) {
                let title = n.title;
                let body = n.body;

                // Privacy check for chat/message category (RELATIONSHIP)
                if (n.category === "RELATIONSHIP") {
                  title = "มีแชทใหม่ถึงคุณ 💬";
                  body = "เลนส์ความลับของคุณกำลังปกป้องเนื้อหาอยู่";
                }

                const toastId = Math.random().toString(36).substring(7);
                setActiveToasts((prev) => [
                  ...prev,
                  {
                    id: toastId,
                    title,
                    body,
                    category: n.category,
                    notification: n,
                  },
                ]);

                // Play sound unless offline or marked noSound
                if (presenceStatus !== "offline" && !n.noSound) {
                  playNotificationSound();
                }

                setTimeout(() => {
                  setActiveToasts((prev) =>
                    prev.filter((t) => t.id !== toastId),
                  );
                }, 5000);
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn(
        "Silent notice: Polling notifications temporary disconnect:",
        err,
      );
    }
  };

  // Periodic Notifications Poller & Real-time Toasts
  useEffect(() => {
    if (!token || !user) return;

    pollNotifications();
    const interval = setInterval(pollNotifications, 8000);
    return () => clearInterval(interval);
  }, [token, user, presenceStatus]);

  useEffect(() => {
    const fetchPartnerPet = async () => {
      if (!couplePartner || activeChannel?.type !== "COUPLE" || !token) {
        setPartnerPet(null);
        return;
      }
      try {
        const res = await fetch(`/api/pet/friend/${couplePartner.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setPartnerPet(data.pet);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch partner pet (silent):", e);
      }
    };
    fetchPartnerPet();
  }, [activeChannel?.id, couplePartner?.id, token]);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { headers });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUser(data.user);
        }
      } else {
        handleLogout();
      }
    } catch (e) {
      console.warn("Failed to fetch current user (silent):", e);
    }
  };

  const fetchUserLenses = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/lenses/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUserLenses(data.lenses || []);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch user lenses (silent):", e);
    }
  };

  const renderAvatarContent = (
    avatarVal: string,
    sizeClass = "w-10 h-10 text-xl",
  ) => {
    if (!avatarVal) return "👤";
    if (avatarVal.length <= 2) {
      return avatarVal; // emoji
    }
    if (avatarVal.startsWith("http") || avatarVal.startsWith("data:")) {
      return (
        <img
          src={avatarVal}
          alt="User Avatar"
          className={`${sizeClass} rounded-full object-cover`}
          referrerPolicy="no-referrer"
        />
      );
    }
    // Check if it's an emoji index from EMOJI_AVATARS
    const emojiIndex = parseInt(avatarVal, 10);
    if (!isNaN(emojiIndex) && EMOJI_AVATARS[emojiIndex]) {
      return EMOJI_AVATARS[emojiIndex];
    }
    return "👤";
  };

  const handleUpdateStatusMessage = async (newStatusText: string) => {
    if (!token) return;
    try {
      const currentLens =
        userLenses.find((l) => l.type === activeLensType) || {};
      const res = await fetch(`/api/lenses/${activeLensType}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...currentLens,
          status: newStatusText,
        }),
      });
      if (res.ok) {
        await fetchUserLenses();
        if (activeLensType === "PUBLIC") {
          await fetchCurrentUser();
        }
        setIsEditingStatus(false);
      }
    } catch (e) {
      console.error("Failed to update lens status:", e);
    }
  };

  const handleUpdatePresenceStatus = async (
    status: "online" | "busy" | "away" | "offline",
  ) => {
    setPresenceStatus(status);
    sessionStorage.setItem("shush_custom_presence", status);
    localStorage.setItem("shush_presence", status);

    if (token) {
      try {
        await fetch("/api/users/presence", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ presenceStatus: status }),
        });
      } catch (e) {
        console.error("Failed to update database presence status:", e);
      }
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "presence",
          status: status,
        }),
      );
    }
  };

  const fetchCircles = async () => {
    try {
      const res = await fetch("/api/circles", { headers });
      const data = await res.json();
      setCircles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRelationships = async () => {
    try {
      // 1. Fetch Couple Space
      const coupleRes = await fetch("/api/relationships/couple", { headers });
      const coupleData = await coupleRes.json();
      if (coupleData.couple) {
        setCouple(coupleData.couple);
        setCouplePartner(coupleData.partner);
        // Default select couple chat
        if (!activeChannel) {
          setActiveChannel({
            type: "COUPLE",
            id: "chat_" + coupleData.couple.id,
            name: coupleData.partner.displayName,
          });
        }
      } else {
        setCouple(null);
        setCouplePartner(null);
      }

      // 2. Fetch BFF Groups
      const bffRes = await fetch("/api/relationships/bff", { headers });
      const bffData = await bffRes.json();
      setBffGroups(Array.isArray(bffData) ? bffData : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigateToNotificationTarget = (n: any) => {
    if (n.category === "PET") {
      setActiveTab("pet");
      setActiveCategory("pet");
    } else if (n.category === "RELATIONSHIP") {
      setActiveTab("chat");
      setActiveCategory("social");
      if (n.senderId) {
        const text = ((n.title || "") + " " + (n.body || "")).toLowerCase();
        const isBff = text.includes("bff") || text.includes("กลุ่ม");
        const isCouple = text.includes("คู่รัก") || text.includes("couple");

        if (isBff) {
          const bffGroup = bffGroups.find(
            (g) =>
              g.members && g.members.some((m: any) => m.userId === n.senderId),
          );
          if (bffGroup) {
            setActiveChannel({
              type: "BFF_GROUP",
              id: `chat_${bffGroup.id}`,
              name: bffGroup.name,
            });
          }
        } else if (isCouple) {
          if (
            couple &&
            (couple.user1Id === n.senderId || couple.user2Id === n.senderId)
          ) {
            setActiveChannel({
              type: "COUPLE",
              id: `chat_${couple.id}`,
              name: couplePartner?.displayName || "คู่รัก",
            });
          }
        } else {
          const friend = friends.find((f) => f.id === n.senderId);
          if (friend) {
            setActiveChannel({
              type: "FRIEND",
              id: "chat_" + [user?.id || "", friend.id].sort().join("_"),
              friendId: friend.id,
              name: friend.displayName || friend.username,
            });
          } else {
            const bffGroup = bffGroups.find(
              (g) =>
                g.members && g.members.some((m: any) => m.userId === n.senderId),
            );
            if (bffGroup) {
              setActiveChannel({
                type: "BFF_GROUP",
                id: `chat_${bffGroup.id}`,
                name: bffGroup.name,
              });
            } else if (
              couple &&
              (couple.user1Id === n.senderId || couple.user2Id === n.senderId)
            ) {
              setActiveChannel({
                type: "COUPLE",
                id: `chat_${couple.id}`,
                name: couplePartner?.displayName || "คู่รัก",
              });
            }
          }
        }
      }
    } else if (n.category === "LENS") {
      setActiveTab("lenses");
      setActiveCategory("lenses");
    } else if (n.category === "HONEY_ME") {
      setActiveTab("discovery");
      setActiveCategory("explore");
      if (n.senderId) {
        setSelectedDiscoverProfileId(n.senderId);
        const text = ((n.title || "") + " " + (n.body || "")).toLowerCase();
        if (text.includes("คำขอ") || text.includes("ชวน") || text.includes("สัญญาณ") || text.includes("invite")) {
          setShowDiscoverInbox(true);
        }
      } else {
        setShowDiscoverInbox(true);
      }
    } else if (n.category === "SYSTEM") {
      setActiveTab("settings");
      setActiveCategory("settings");
    }
  };

  const playNotificationSound = () => {
    const currentPresence = localStorage.getItem("shush_presence") || "online";
    if (
      currentPresence === "offline" ||
      currentPresence === "busy" ||
      currentPresence === "away"
    ) {
      return;
    }

    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // --- WebSocket Connection ---
  const initWebSocket = () => {
    if (wsRef.current) wsRef.current.close();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Authenticate socket connection with current session/intended presence status
      const customPresence = sessionStorage.getItem("shush_custom_presence");
      const currentIntendedPresence = customPresence || localStorage.getItem("shush_presence") || "online";
      
      ws.send(
        JSON.stringify({
          type: "init",
          token,
          chatId: activeChannel?.id || "",
          presenceStatus: currentIntendedPresence
        }),
      );
    };

    ws.onmessage = async (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { type, userId, status, isTyping, lines, lastOnline } = payload;

        if (type === "presence") {
          if (userId !== user?.id) {
            setPartnerPresence(status);
            
            // Update couple partner state if matching
            setCouplePartner((prev: any) => {
              if (prev && prev.id === userId) {
                return { 
                  ...prev, 
                  presenceStatus: status, 
                  lastOnline: status === 'offline' ? lastOnline : null 
                };
              }
              return prev;
            });

            // Update friends list state
            setFriends((prev: any[]) =>
              prev.map((f: any) => {
                if (f.id === userId) {
                  return { 
                    ...f, 
                    presenceStatus: status, 
                    lastOnline: status === 'offline' ? lastOnline : null 
                  };
                }
                return f;
              }),
            );
          } else {
            setPresenceStatus(status);
          }
        } else if (type === "typing") {
          if (userId !== user?.id) {
            setPartnerTyping(isTyping);
          }
        } else if (type === "whiteboard_update") {
          // Handled inside whiteboard if drawing is live
        } else if (type === "message") {
          // Decrypt the incoming message in real-time
          try {
            const msg = payload.message;
            const decryptedData = await decryptMessageWithCache(msg, privateKey || "", user?.id || "");
            const decryptedMsg = {
              ...msg,
              ...decryptedData
            };

            // Only append the message if it belongs to the active channel
            // and is not already in the state (avoid duplicates)
            if (activeChannel && activeChannel.id === payload.chatId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === decryptedMsg.id)) return prev;
                return [...prev, decryptedMsg];
              });
              if (isScrolledUpRef.current) {
                setShowNewMessageBadge(true);
              } else {
                setTimeout(scrollToBottom, 200);
              }
            }
          } catch (e) {
            console.error("Real-time decryption error:", e);
          }
        } else if (type === "new_message_alert") {
          // If we are currently viewing this channel, fetch messages!
          if (activeChannel && activeChannel.id === payload.chatId) {
            fetchMessages();
            if (isScrolledUpRef.current) {
              setShowNewMessageBadge(true);
            } else {
              setTimeout(scrollToBottom, 200);
            }
          } else {
            // Trigger a re-fetch of notifications, and possibly unread status, to update the badge count in real-time!
            pollNotifications();
            fetchRelationships();
            fetchFriends();
          }
          fetchAllConversationsMessages();
        } else if (type === "message_deleted") {
          if (activeChannel && activeChannel.id === payload.chatId) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
          }
          fetchAllConversationsMessages();
        } else if (type === "message_read") {
          if (activeChannel && activeChannel.id === payload.chatId) {
            setMessages((prev) => prev.map(m => m.id === payload.messageId ? { ...m, readAt: payload.readAt } : m));
          }
          fetchAllConversationsMessages();
        } else if (type === "relationships_changed") {
          fetchRelationships();
          fetchFriends();
          pollNotifications();
          fetchAllConversationsMessages();
        }
      } catch (err) {
        console.error(err);
      }
    };

    ws.onclose = () => {
      const customPresence = sessionStorage.getItem("shush_custom_presence");
      if (!customPresence) {
        setPresenceStatus("offline");
      }

      // Reconnect in 3s only if this is still the active socket ref
      if (wsRef.current === ws) {
        setTimeout(() => {
          if (token && user && wsRef.current === ws) {
            initWebSocket();
          }
        }, 3000);
      }
    };
  };

  // Trigger typing indicator on key press
  const handleTyping = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          chatId: activeChannel?.id,
          isTyping: true,
        }),
      );

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        wsRef.current?.send(
          JSON.stringify({
            type: "typing",
            chatId: activeChannel?.id,
            isTyping: false,
          }),
        );
      }, 2000);
    }
  };

  // --- Registration / Key generation ---
  const handleStartRegister = async () => {
    setIsGeneratingKeys(true);
    setIsRegistering(true);
    try {
      // Generate E2EE keys
      const keys = await generateE2EEKeyPair();
      setGeneratedKeys(keys);

      // Generate recovery key
      const recovery = generateRecoveryKey();
      setRecoveryKeyInfo(recovery);
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingKeys(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !displayInput || !generatedKeys || !recoveryKeyInfo)
      return;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          displayName: displayInput,
          bio: bioInput,
          avatar: avatarIndex,
          publicKey: generatedKeys.publicKeyBase64,
          recoveryKeyHash: recoveryKeyInfo.hash,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Save token and private key locally
        localStorage.setItem("shush_token", data.token);
        localStorage.setItem(
          "shush_private_key",
          generatedKeys.privateKeyBase64,
        );

        setToken(data.token);
        setPrivateKey(generatedKeys.privateKeyBase64);
        setUser(data.user);
      } else {
        const err = await res.json();
        alert(err.error || "การลงทะเบียนล้มเหลว");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername) return;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername }),
      });

      if (res.ok) {
        const data = await res.json();
        // Look up local private key for this user
        // In real E2EE production, the user supplies their password to unlock the private key,
        // or uses local Passkey store. For this demo, we can automatically retrieve or regenerate.
        let localKey = localStorage.getItem("shush_private_key");
        if (!localKey) {
          // Regenerate key pair for demo ease so browser can always decrypt
          const demoKeys = await generateE2EEKeyPair();
          localKey = demoKeys.privateKeyBase64;
          localStorage.setItem("shush_private_key", demoKeys.privateKeyBase64);
        }

        localStorage.setItem("shush_token", data.token);
        setToken(data.token);
        setPrivateKey(localKey);
        setUser(data.user);
      } else {
        const err = await res.json();
        alert(err.error || "ชื่อผู้ใช้ไม่ถูกต้อง");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername || !recoveryKeyInput) return;

    try {
      // Calculate recovery hash from key input
      const charSum = recoveryKeyInput
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const recoveryHash = "hash_" + charSum.toString(16) + "_secure_e2ee";

      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoveryUsername,
          recoveryKeyHash: recoveryHash,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const demoKeys = await generateE2EEKeyPair(); // Generate new fallback E2EE keys on successful recovery
        localStorage.setItem("shush_token", data.token);
        localStorage.setItem("shush_private_key", demoKeys.privateKeyBase64);

        setToken(data.token);
        setPrivateKey(demoKeys.privateKeyBase64);
        setUser(data.user);
        setIsRecovering(false);
      } else {
        const err = await res.json();
        alert(err.error || "รหัสกู้คืนไม่ถูกต้อง");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await fetch("/api/relationships/friends", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("shush_token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (e) {
      console.error("Failed to fetch friends:", e);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      const res = await fetch("/api/relationships/friends/add", {
        method: "POST",
        headers,
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) {
        const resData = await res.json();
        alert(resData.message || "เพิ่มเพื่อนสำเร็จ!");
        fetchFriends();
        const searchRes = await fetch(`/api/users/search?q=${searchUsername}`, {
          headers,
        });
        if (searchRes.ok) {
          const sData = await searchRes.json();
          setFoundPartner(sData);
        }
      } else {
        const err = await res.json();
        alert(err.error || "เพิ่มเพื่อนล้มเหลว");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const res = await fetch("/api/relationships/friends/remove", {
        method: "POST",
        headers,
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) {
        alert("ลบเพื่อนสำเร็จ!");
        fetchFriends();
        const searchRes = await fetch(`/api/users/search?q=${searchUsername}`, {
          headers,
        });
        if (searchRes.ok) {
          const sData = await searchRes.json();
          setFoundPartner(sData);
        }
      } else {
        const err = await res.json();
        alert(err.error || "ลบเพื่อนล้มเหลว");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST", headers });
    localStorage.removeItem("shush_token");
    localStorage.removeItem("shush_private_key");
    localStorage.removeItem("shush_presence");
    sessionStorage.removeItem("shush_custom_presence");
    setToken(null);
    setPrivateKey(null);
    setUser(null);
    setCouple(null);
    setCouplePartner(null);
    setBffGroups([]);
    setFriends([]);
    setActiveChannel(null);
  };

  // --- Search Partner & Establish Relationship ---
  const handleSearchPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setFoundPartner(null);
    if (!searchUsername) return;

    try {
      const res = await fetch(`/api/users/search?q=${searchUsername}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setFoundPartner(data);
      } else {
        const err = await res.json();
        setSearchError(err.error || "ไม่พบผู้ใช้นี้");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectCouple = async () => {
    if (!foundPartner) return;
    try {
      const res = await fetch("/api/relationships/couple/request", {
        method: "POST",
        headers,
        body: JSON.stringify({ partnerId: foundPartner.id }),
      });

      if (res.ok) {
        alert("ส่งคำเชิญ Couple สำเร็จแล้ว! ปลายทางต้องกดยอมรับความสัมพันธ์");
        setFoundPartner(null);
        setSearchUsername("");
        fetchRelationships();
      } else {
        const err = await res.json();
        alert(err.error || "ขอสเปซ Couple ล้มเหลว");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptCouple = async (coupleId: string) => {
    try {
      const res = await fetch("/api/relationships/couple/accept", {
        method: "POST",
        headers,
        body: JSON.stringify({ coupleId }),
      });
      if (res.ok) {
        fetchRelationships();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelCouple = async (coupleId: string) => {
    if (
      !confirm(
        "คุณแน่ใจว่าต้องการตัดความสัมพันธ์ Couple นี้? ประวัติแชทและคลังรูปภาพจะถูกลบออกอย่างถาวร",
      )
    )
      return;
    try {
      const res = await fetch("/api/relationships/couple/cancel", {
        method: "POST",
        headers,
        body: JSON.stringify({ coupleId }),
      });
      if (res.ok) {
        fetchRelationships();
        setActiveChannel(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- BFF Group management ---
  const handleCreateBffGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBffName) return;

    try {
      const res = await fetch("/api/relationships/bff", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newBffName }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewBffName("");
        setShowBffModal(false);
        fetchRelationships();
        // Select newly created chat
        setActiveChannel({
          type: "BFF_GROUP",
          id: "chat_" + data.id,
          name: data.name,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveBffGroup = async (groupId: string) => {
    if (!confirm("คุณต้องการออกจากกลุ่ม BFF นี้หรือไม่?")) return;
    try {
      const res = await fetch("/api/relationships/bff/leave", {
        method: "POST",
        headers,
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        fetchRelationships();
        setActiveChannel(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInviteBffPartner = async (partnerId: string, groupId: string) => {
    try {
      const res = await fetch("/api/relationships/bff/invite", {
        method: "POST",
        headers,
        body: JSON.stringify({ groupId, userId: partnerId }),
      });
      if (res.ok) {
        alert("ส่งคำเชิญเข้าร่วมกลุ่มสำเร็จ!");
        fetchRelationships();
      } else {
        const err = await res.json();
        alert(err.error || "ไม่สามารถส่งคำเชิญได้");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptBffInvite = async (groupId: string) => {
    try {
      const res = await fetch("/api/relationships/bff/accept", {
        method: "POST",
        headers,
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        fetchRelationships();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Strict auto-burn timer for burn-after-read messages
  useEffect(() => {
    if (!token || !activeChannel || !user) return;

    messages.forEach((msg) => {
      // Mark as read if not self and not read yet
      if (msg.senderId !== user.id && !msg.readAt) {
        fetch(`/api/messages/${activeChannel.id}/${msg.id}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }).catch(e => console.error("Failed to mark as read:", e));
      }

      if (msg.isBurnAfterRead && msg.readAt && !burningMessagesRef.current.has(msg.id)) {
        burningMessagesRef.current.add(msg.id);

        const durationSec = msg.burnDurationSec || burnDuration || 10;
        
        // Calculate remaining time
        const readTime = new Date(msg.readAt).getTime();
        const now = new Date().getTime();
        const timePassed = now - readTime;
        const remainingMs = Math.max(0, (durationSec * 1000) - timePassed);

        setTimeout(async () => {
          try {
            await fetch(`/api/messages/${activeChannel.id}/${msg.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            // Locally remove from state immediately
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          } catch (e) {
            console.error("Auto-burn failed for message:", msg.id, e);
          }
        }, remainingMs);
      }
    });
  }, [messages, activeChannel?.id, token, user]);

  // --- Real-time Chat and E2EE Messages ---
  useEffect(() => {
    if (activeChannel) {
      setIsScrolledUp(false);
      isScrolledUpRef.current = false;
      setShowNewMessageBadge(false);
      fetchMessages();
      setTimeout(scrollToBottom, 300);
    }
  }, [activeChannel?.id, user?.id, privateKey]);

  // Sync current channel's messages to the allConversationsMessages map
  useEffect(() => {
    if (activeChannel && messages.length > 0) {
      setAllConversationsMessages((prev) => ({
        ...prev,
        [activeChannel.id]: messages,
      }));
    }
  }, [messages, activeChannel?.id]);

  // Mark messages as read when viewing a channel
  useEffect(() => {
    if (activeChannel) {
      localStorage.setItem(`shush_last_read_${activeChannel.id}`, new Date().toISOString());
    }
  }, [activeChannel?.id, messages]);

  // Background fetching and decryption of messages for all chats
  const fetchAllConversationsMessages = async () => {
    if (!token || !user || !privateKey) return;
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };
      const chatIds: { id: string; type: string; friendId?: string }[] = [];
      if (couple) {
        chatIds.push({ id: "chat_" + couple.id, type: "COUPLE" });
      }
      bffGroups.forEach((g) => {
        chatIds.push({ id: "chat_" + g.id, type: "BFF_GROUP" });
      });
      friends.forEach((f) => {
        chatIds.push({ id: "chat_" + [user.id, f.id].sort().join("_"), type: "FRIEND", friendId: f.id });
      });

      if (chatIds.length === 0) return;

      const updatedMap: Record<string, any[]> = {};
      await Promise.all(
        chatIds.map(async (chat) => {
          try {
            const res = await fetch(`/api/messages/${chat.id}`, { headers });
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : [];
              const decrypted = await Promise.all(
                list.map(async (msg) => {
                  const decryptedData = await decryptMessageWithCache(msg, privateKey, user.id);
                  return {
                    ...msg,
                    ...decryptedData,
                  };
                }),
              );
              updatedMap[chat.id] = decrypted;
            }
          } catch (err) {
            console.error("Error background decrypt:", err);
          }
        }),
      );
      setAllConversationsMessages((prev) => ({
        ...prev,
        ...updatedMap,
      }));
    } catch (e) {
      console.error("Failed to fetch all conversations messages:", e);
    }
  };

  useEffect(() => {
    if (!token || !user || !privateKey) return;

    fetchAllConversationsMessages();

    // Poll every 8 seconds
    const interval = setInterval(() => {
      fetchAllConversationsMessages();
    }, 8000);

    return () => clearInterval(interval);
  }, [token, user?.id, privateKey, friends.length, bffGroups.length, couple?.id]);

  const getLatestMessagePreview = (chatId: string, defaultBio: string) => {
    const chatMsgs = allConversationsMessages[chatId] || [];
    if (chatMsgs.length === 0) return defaultBio;

    const lastMsg = chatMsgs[chatMsgs.length - 1];
    let text = lastMsg.decryptedContent || "";

    if (lastMsg.mediaType === 'audio') {
      text = "🎤 ข้อความเสียง";
    } else if (lastMsg.mediaType === 'video') {
      text = "🎥 วิดีโอ";
    } else if (lastMsg.mediaType === 'image' || text.startsWith("data:image/") || text.startsWith("http")) {
      text = "📷 รูปภาพ";
    } else if (lastMsg.mediaType === 'file') {
      text = "📎 ไฟล์แนบ";
    }

    if (lastMsg.senderId === user?.id) {
      return `คุณ: ${text}`;
    }
    return text;
  };

  const getUnreadCountForChat = (chatId: string) => {
    if (activeChannel && activeChannel.id === chatId) return 0;
    const chatMsgs = allConversationsMessages[chatId] || [];
    const lastReadStr = localStorage.getItem(`shush_last_read_${chatId}`) || "";

    const unreadMsgs = chatMsgs.filter(
      (msg) => msg.senderId !== user?.id && msg.createdAt > lastReadStr
    );
    return unreadMsgs.length;
  };

  const fetchMessages = async () => {
    if (!activeChannel) return;
    try {
      const res = await fetch(`/api/messages/${activeChannel.id}`, { headers });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      // Decrypt messages client-side using user's E2EE Private Key!
      const decrypted = await Promise.all(
        list.map(async (msg) => {
          const decryptedData = await decryptMessageWithCache(msg, privateKey || "", user?.id || "");
          return {
            ...msg,
            ...decryptedData,
          };
        }),
      );

      setMessages(decrypted);
    } catch (e) {
      console.error(e);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: 'voice_message.webm',
                type: 'audio/webm',
                size: audioBlob.size,
                data: base64data
              })
            });
            if (res.ok) {
              const uploadData = await res.json();
              await sendContent('[ข้อความเสียง]', 'audio', uploadData.url);
            }
          } catch (e) {
            console.error('Failed to upload audio', e);
            alert('ไม่สามารถส่งข้อความเสียงได้');
          }
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('กรุณาอนุญาตการใช้งานไมโครโฟนก่อนใช้งานข้อความเสียง');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendContent = async (text: string, mediaType?: string, mediaUrl?: string) => {
    if ((!text && !mediaUrl) || !activeChannel || !privateKey) return;

    try {
      const payload: Record<string, string> = {};
      const msgObj = mediaType ? { text, mediaType, mediaUrl } : { text };
      const contentToEncrypt = mediaType ? JSON.stringify(msgObj) : text;
      
      const encSelf = await encryptWithPublicKey(contentToEncrypt, user.publicKey);
      payload[user.id] = encSelf.ciphertext;

      if (activeChannel.type === "COUPLE" && couplePartner?.publicKey) {
        const encPartner = await encryptWithPublicKey(contentToEncrypt, couplePartner.publicKey);
        payload[couplePartner.id] = encPartner.ciphertext;
      } else if (activeChannel.type === "FRIEND") {
        const friend = friends.find((f) => f.id === activeChannel.id);
        if (friend && friend.publicKey) {
          const encPartner = await encryptWithPublicKey(contentToEncrypt, friend.publicKey);
          payload[friend.id] = encPartner.ciphertext;
        }
      } else if (activeChannel.type === "BFF_GROUP") {
        const bff = bffGroups.find((g) => g.id === activeChannel.id.replace("chat_", ""));
        if (bff) {
          for (const m of bff.members) {
            const mUser = friends.find((f) => f.id === m.userId) || (m.userId === user.id ? user : null);
            if (mUser && mUser.publicKey && mUser.id !== user.id) {
              const encMember = await encryptWithPublicKey(contentToEncrypt, mUser.publicKey);
              payload[mUser.id] = encMember.ciphertext;
            }
          }
        }
      }

      // Use v3 prefix if it's a JSON object string, else v2 for plain text
      const version = mediaType ? "v3|" : "v2|";
      const finalCiphertext = version + JSON.stringify(payload);

      const res = await fetch(`/api/messages/${activeChannel.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ciphertext: finalCiphertext,
          iv: encSelf.iv,
          replyToId: replyMessageId,
          isBurnAfterRead: burnAfterRead,
          burnDurationSec: burnAfterRead ? burnDuration : 0,
        }),
      });

      if (res.ok) {
        setMessageInput("");
        setReplyMessageId(null);
        fetchMessages();
        fetchAllConversationsMessages();
        setTimeout(scrollToBottom, 100);

        if (burnAfterRead) {
          setTimeout(() => {
            fetchMessages();
            fetchAllConversationsMessages();
          }, burnDuration * 1000 + 1000);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput) return;
    await sendContent(messageInput);
  };

  const compressImage = (base64Str: string, maxW = 800, maxH = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
      img.src = base64Str;
    });
  };

  const handleSendImage = async (rawBase64: string) => {
    if (!activeChannel || !privateKey) return;
    try {
      // Compress first for fast encryption and transmission
      const dataUrl = await compressImage(rawBase64);

      const payload: Record<string, string> = {};
      const encSelf = await encryptWithPublicKey(dataUrl, user.publicKey);
      payload[user.id] = encSelf.ciphertext;

      if (activeChannel.type === "COUPLE" && couplePartner?.publicKey) {
        const encPartner = await encryptWithPublicKey(dataUrl, couplePartner.publicKey);
        payload[couplePartner.id] = encPartner.ciphertext;
      } else if (activeChannel.type === "FRIEND") {
        const friend = friends.find((f) => f.id === activeChannel.id);
        if (friend && friend.publicKey) {
          const encPartner = await encryptWithPublicKey(dataUrl, friend.publicKey);
          payload[friend.id] = encPartner.ciphertext;
        }
      } else if (activeChannel.type === "BFF_GROUP") {
        const bff = bffGroups.find((g) => g.id === activeChannel.id.replace("chat_", ""));
        if (bff) {
          for (const m of bff.members) {
            const mUser = friends.find((f) => f.id === m.userId) || (m.userId === user.id ? user : null);
            if (mUser && mUser.publicKey && mUser.id !== user.id) {
              const encMember = await encryptWithPublicKey(dataUrl, mUser.publicKey);
              payload[mUser.id] = encMember.ciphertext;
            }
          }
        }
      }

      const finalCiphertext = "v2|" + JSON.stringify(payload);

      const res = await fetch(`/api/messages/${activeChannel.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ciphertext: finalCiphertext,
          iv: encSelf.iv,
          isBurnAfterRead: burnAfterRead,
          burnDurationSec: burnAfterRead ? burnDuration : 0,
        }),
      });

      if (res.ok) {
        fetchMessages();
        fetchAllConversationsMessages();
        if (burnAfterRead) {
          setTimeout(() => {
            fetchMessages();
            fetchAllConversationsMessages();
          }, burnDuration * 1000 + 1000);
        }
      }
    } catch (e) {
      console.error("Failed to encrypt or send image message:", e);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChannel) return;
    try {
      const res = await fetch(`/api/messages/${activeChannel.id}/${msgId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        fetchMessages();
        fetchAllConversationsMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditMessage = async (msgId: string, currentText: string) => {
    if (!activeChannel) return;
    const newText = prompt(
      "แก้ไขข้อความของคุณ (จะถูกบันทึกประวัติไว้):",
      currentText,
    );
    if (!newText || newText === currentText) return;

    try {
      const payload: Record<string, string> = {};
      const encSelf = await encryptWithPublicKey(newText, user.publicKey);
      payload[user.id] = encSelf.ciphertext;

      if (activeChannel.type === "COUPLE" && couplePartner?.publicKey) {
        const encPartner = await encryptWithPublicKey(newText, couplePartner.publicKey);
        payload[couplePartner.id] = encPartner.ciphertext;
      } else if (activeChannel.type === "FRIEND") {
        const friend = friends.find((f) => f.id === activeChannel.id);
        if (friend && friend.publicKey) {
          const encPartner = await encryptWithPublicKey(newText, friend.publicKey);
          payload[friend.id] = encPartner.ciphertext;
        }
      } else if (activeChannel.type === "BFF_GROUP") {
        const bff = bffGroups.find((g) => g.id === activeChannel.id.replace("chat_", ""));
        if (bff) {
          for (const m of bff.members) {
            const mUser = friends.find((f) => f.id === m.userId) || (m.userId === user.id ? user : null);
            if (mUser && mUser.publicKey && mUser.id !== user.id) {
              const encMember = await encryptWithPublicKey(newText, mUser.publicKey);
              payload[mUser.id] = encMember.ciphertext;
            }
          }
        }
      }

      const finalCiphertext = "v2|" + JSON.stringify(payload);

      const res = await fetch(`/api/messages/${activeChannel.id}/${msgId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ciphertext: finalCiphertext, iv: encSelf.iv }),
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewVersions = async (msgId: string) => {
    if (!activeChannel) return;
    try {
      const res = await fetch(
        `/api/messages/${activeChannel.id}/${msgId}/versions`,
        { headers },
      );
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const decryptedVersions = await Promise.all(
        list.map(async (v) => {
          let dec = "[ข้อความนี้ได้รับการเข้ารหัสที่คุณยังไม่ได้รับสิทธิ์ถอดรหัส]";
          try {
            if (v.ciphertext.startsWith("v2|")) {
              const payload = JSON.parse(v.ciphertext.substring(3));
              const myEnc = payload[user?.id || ''];
              if (myEnc && privateKey) {
                dec = await decryptWithPrivateKey(myEnc, privateKey);
              }
            } else {
              if (privateKey) {
                dec = await decryptWithPrivateKey(v.ciphertext, privateKey);
              }
            }
          } catch (e) {
             console.error("Decryption error:", e);
          }
          return { ...v, decContent: dec };
        }),
      );

      setMsgVersions(decryptedVersions);
      setShowVersionsModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const isPublicShareRoute = window.location.pathname.startsWith("/p/");
  const publicToken = isPublicShareRoute
    ? window.location.pathname.split("/p/")[1]
    : null;

  return (
    <IdentityContext.Provider
      value={{ activeTheme, activeBadge, activeNameColor, isDarkMode, currentUserId: user?.id || null }}
    >
      <div className="w-full min-h-[100dvh] bg-[var(--theme-bg)] flex justify-center items-stretch overflow-hidden relative">
        <div className="flex flex-col h-[100dvh] w-full max-w-none bg-transparent text-[var(--theme-text-primary)] font-sans antialiased overflow-hidden selection:bg-[var(--theme-primary)]/30 selection:text-[var(--theme-text-primary)] relative z-10 transition-all duration-300">
        {isPublicShareRoute && publicToken ? (
          <Suspense
            fallback={
              <div className="h-[100dvh] w-screen flex items-center justify-center bg-[var(--theme-bg)]">
                <div className="w-12 h-12 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          >
            <PublicProfileView token={publicToken} />
          </Suspense>
        ) : !user ? (
          <AuthScreen
            onLoginSuccess={({ user, token, privateKey }) => {
              setToken(token);
              setPrivateKey(privateKey);
              setUser(user);
            }}
          />
        ) : (
          // 2. MAIN APP FRAME (LOGGED-IN VIEW)
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex overflow-hidden pl-2.5 gap-2.5">
              {/* LEFT NAV BAR: Instagram-style, hover to expand */}
              <div className="hidden md:flex flex-col h-[calc(100vh-20px)] my-2.5 bg-[var(--theme-bg)]/85 backdrop-blur-md transition-all duration-300 ease-in-out z-30 border border-[var(--theme-border)]/30 rounded-2xl flex-shrink-0 justify-between py-6 px-3 group/sidebar w-[72px] hover:w-60">
                <div className="flex flex-col gap-6">
                  {/* Logo */}
                  <div className="flex items-center gap-3 px-3.5 mb-2 h-10 flex-shrink-0">
                    <img src="/logo.svg" alt="SHUSH" className="w-8 h-8 rounded-lg shadow-sm" />
                    <span className="font-display font-black text-xl tracking-wider text-[var(--theme-text-primary)] opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden group-hover/sidebar:inline">
                      SHUSH
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="flex flex-col gap-2">
                    {[
                      { id: "social", tab: "chat", label: "Chats", icon: MessageSquare },
                      { id: "explore", tab: "discovery", label: "Explore", icon: Compass },
                      { id: "pet", tab: "pet", label: "PET Space", icon: Activity },
                      { id: "store", tab: "store", label: "Shh Store", icon: ShoppingBag },
                      { id: "notifications", tab: "notifications", label: "Alerts", icon: Bell, badgeCount: unreadCount },
                      { id: "lenses", tab: "lenses", label: "Lens / Identity", icon: User },
                      { id: "settings", tab: "settings", label: "Settings", icon: Settings },
                    ].map((item) => {
                      const IconComponent = item.icon;
                      const isActive = activeCategory === item.id || (item.id === "notifications" && showNotificationsSidebar);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === "notifications") {
                              setShowNotificationsSidebar(!showNotificationsSidebar);
                              if (window.innerWidth < 768) {
                                setActiveCategory(item.id as any);
                                setActiveTab(item.tab as any);
                              }
                            } else {
                              setActiveCategory(item.id as any);
                              setActiveTab(item.tab as any);
                            }
                          }}
                          className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 relative ${
                            isActive
                              ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] font-black"
                              : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]"
                          }`}
                        >
                          <div className="flex-shrink-0 relative flex items-center justify-center w-5 h-5">
                            <IconComponent className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                            {item.badgeCount && item.badgeCount > 0 ? (
                              <span className="absolute -top-1 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center leading-tight">
                                {item.badgeCount}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-xs font-semibold tracking-wide opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden group-hover/sidebar:inline">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-2 border-t border-[var(--theme-border)]/20 pt-4">
                  {/* Theme Toggle */}
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] transition-all duration-200"
                    title="สลับโหมด Light/Dark"
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <span className="text-xs font-semibold tracking-wide opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden group-hover/sidebar:inline">
                      {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </span>
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-3 rounded-xl text-[var(--theme-text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    title="ออกจากระบบ"
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden group-hover/sidebar:inline">
                      Logout
                    </span>
                  </button>
                </div>
              </div>

              {/* LEFT SIDEBAR: Conversations & Circles */}
              <div
                className={`w-full md:w-72 lg:w-80 border border-[var(--theme-border)]/30 rounded-2xl bg-[var(--theme-bg)]/80 backdrop-blur-md flex-col justify-between flex-shrink-0 h-[calc(100vh-20px)] my-2.5 ${activeTab === "chat" && !activeChannel ? "flex" : "hidden md:flex"}`}
              >
                <div>
                  {/* Sidebar Header / Lens */}
                  <div className="p-4 border-b border-transparent space-y-3.5 bg-transparent">
                    <div className="flex items-center justify-between">
                      {/* Avatar + Name Details */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30 flex items-center justify-center text-xl overflow-hidden select-none">
                            {renderAvatarContent(
                              userLenses.find((l) => l.type === activeLensType)
                                ?.avatar || user?.avatar,
                            )}
                          </div>
                          {/* Presence Indicator Badge */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 flex items-center justify-center ${
                              presenceStatus === "online"
                                ? "bg-emerald-500"
                                : presenceStatus === "busy"
                                  ? "bg-rose-500"
                                  : presenceStatus === "away"
                                    ? "bg-amber-500"
                                    : "bg-slate-500"
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold text-[var(--theme-text-primary)] truncate text-xs sm:text-sm">
                            <UserDisplay user={{
                              id: user?.id,
                              displayName: userLenses.find((l) => l.type === activeLensType)?.displayName || user?.displayName || ""
                            }} />
                          </h3>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--theme-text-secondary)] font-mono truncate">
                              @{user?.username}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() =>
                            setShowEditStatusPanel((prev) => !prev)
                          }
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            showEditStatusPanel
                              ? "bg-[var(--theme-primary)]/15 border-[var(--theme-primary)]/30 text-[var(--theme-primary)] shadow-sm"
                              : "bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                          }`}
                          title="แก้ไขสถานะ"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span className="hidden sm:inline">แก้ไขสถานะ</span>
                        </button>

                        {/* Log out Button */}
                        <button
                          onClick={handleLogout}
                          className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-red-400 transition-all hover:bg-red-500/10 flex-shrink-0"
                          title="ออกจากระบบ"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Status and Identity Lenses Settings Panel */}
                    {showEditStatusPanel && (
                      <div className="space-y-3 p-3 bg-[var(--theme-surface)]/40 border border-[var(--theme-border)] rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Status Message Line */}
                        <div className="bg-[var(--theme-surface)]/80 border border-[var(--theme-border)] rounded-xl p-2.5 flex items-center justify-between gap-1.5 text-xs">
                          {isEditingStatus ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                id="status-message-input"
                                name="status-message-input"
                                type="text"
                                value={statusInput}
                                onChange={(e) => setStatusInput(e.target.value)}
                                placeholder="ตั้งค่าข้อความสเตตัส..."
                                className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-2 py-1 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleUpdateStatusMessage(statusInput);
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleUpdateStatusMessage(statusInput)
                                }
                                className="p-1 text-emerald-400 hover:text-emerald-300 hover:border-[var(--theme-border)] bg-[var(--theme-surface-hover)]/80 rounded transition-all"
                                title="บันทึก"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setIsEditingStatus(false)}
                                className="p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-secondary)] hover:border-[var(--theme-border)] bg-[var(--theme-surface-hover)]/80 rounded transition-all"
                                title="ยกเลิก"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full min-w-0">
                              <span
                                className="text-[11px] text-[var(--theme-text-secondary)] truncate italic flex-1 pr-1"
                                title={
                                  userLenses.find(
                                    (l) => l.type === activeLensType,
                                  )?.status || "ยังไม่มีสถานะ"
                                }
                              >
                                {userLenses.find(
                                  (l) => l.type === activeLensType,
                                )?.status || "สวัสดี Shush! (ไม่มีสถานะ)"}
                              </span>
                              <button
                                onClick={() => {
                                  setStatusInput(
                                    userLenses.find(
                                      (l) => l.type === activeLensType,
                                    )?.status || "",
                                  );
                                  setIsEditingStatus(true);
                                }}
                                className="p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] hover:border-[var(--theme-border)] bg-[var(--theme-surface-hover)]/60 rounded transition-all flex-shrink-0"
                                title="แก้ไขสเตตัส"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Dropdowns row for Active Lens and Presence Status */}
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          {/* Lens Selection Dropdown */}
                          <div className="space-y-1">
                            <label className="block text-[9px] uppercase tracking-wider text-[var(--theme-text-secondary)] font-bold">
                              สลับเลนส์ตัวตน
                            </label>
                            <select
                              value={activeLensType}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setActiveLensType(val);
                                localStorage.setItem("shush_active_lens", val);
                              }}
                              className="w-full bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--theme-text-primary)] focus:outline-none transition-all cursor-pointer font-semibold"
                            >
                              <option value="PUBLIC">🌍 เลนส์สาธารณะ</option>
                              <option value="FRIENDS">👥 เลนส์เพื่อน</option>
                              <option value="BFF">💙 เลนส์เพื่อนสนิท</option>
                              <option value="COUPLE">💕 เลนส์คนรัก</option>
                            </select>
                          </div>

                          {/* Presence Status Selection Dropdown */}
                          <div className="space-y-1">
                            <label className="block text-[9px] uppercase tracking-wider text-[var(--theme-text-secondary)] font-bold">
                              สถานะการทำงาน
                            </label>
                            <select
                              value={presenceStatus}
                              onChange={(e) =>
                                handleUpdatePresenceStatus(
                                  e.target.value as any,
                                )
                              }
                              className="w-full bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--theme-text-primary)] focus:outline-none transition-all cursor-pointer font-semibold"
                            >
                              <option value="online">🟢 ออนไลน์</option>
                              <option value="busy">🔴 ไม่ว่าง</option>
                              <option value="away">🟡 ไม่อยู่</option>
                              <option value="offline">⚫ ออฟไลน์</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Suspense
                    fallback={
                      <div className="h-20 flex items-center justify-center text-xs text-[var(--theme-text-secondary)]">
                        กำลังโหลดสตอรี่...
                      </div>
                    }
                  >
                    <StoriesSpace
                      user={user}
                      circles={circles}
                      bffGroups={bffGroups}
                      userPrivateKey={privateKey!}
                      userPublicKey={user.publicKey}
                      layout="grid"
                      onStartReplyChat={(chatId) => {
                        setActiveTab("chat");
                        const bff = bffGroups.find(
                          (g) => "chat_" + g.id === chatId,
                        );
                        if (bff) {
                          setActiveChannel({
                            type: "BFF_GROUP",
                            id: chatId,
                            name: bff.name,
                          });
                        } else if (couple) {
                          setActiveChannel({
                            type: "COUPLE",
                            id: chatId,
                            name: couplePartner?.displayName,
                          });
                        }
                      }}
                    />
                  </Suspense>

                  {/* Sidebar Tabs (Chats / Friends) */}
                  <div className="px-4 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-[var(--theme-text-primary)] font-extrabold text-xl font-sans tracking-tight">
                        Chats
                      </h2>
                      <button
                        onClick={() => setShowAddFriendModal(true)}
                        className="w-6 h-6 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center hover:bg-[var(--theme-primary-hover)] transition-all shadow-md shadow-[var(--theme-primary)]/20"
                        title="เพิ่มเพื่อน หรือ สร้างกลุ่ม"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-4 mb-4 border-b border-[var(--theme-border)]/50 pb-2">
                      <button
                        onClick={() => setActiveSidebarTab("CHATS")}
                        className={`text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                          activeSidebarTab === "CHATS"
                            ? "text-[var(--theme-text-primary)]"
                            : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                        }`}
                      >
                        CHATS{" "}
                        {activeSidebarTab === "CHATS" && (
                          <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveSidebarTab("FRIENDS")}
                        className={`text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                          activeSidebarTab === "FRIENDS"
                            ? "text-[var(--theme-text-primary)]"
                            : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                        }`}
                      >
                        FRIENDS{" "}
                        {activeSidebarTab === "FRIENDS" && (
                          <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                        )}
                      </button>
                    </div>

                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]" />
                      <input
                        id="chat-search-input"
                        name="chat-search-input"
                        type="text"
                        placeholder="Search chats..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full bg-[var(--theme-surface)]/50 border border-[var(--theme-border)]/40 rounded-full pl-10 pr-4 py-2 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]/50 transition-all placeholder:text-[var(--theme-text-secondary)]/70 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Conversations List */}
                  <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100dvh-400px)]">
                    {activeSidebarTab === "CHATS" ? (
                      <div className="space-y-1.5">
                        {/* Couple Space Item */}
                        {couple && 
                          couplePartner?.displayName?.toLowerCase().includes(chatSearchQuery.toLowerCase()) && 
                          (!couple.isAccepted || 
                            (allConversationsMessages["chat_" + couple.id] && allConversationsMessages["chat_" + couple.id].length > 0) || 
                            activeChannel?.id === "chat_" + couple.id) && (
                          <div
                            onClick={() =>
                              setActiveChannel({
                                type: "COUPLE",
                                id: "chat_" + couple.id,
                                name: couplePartner?.displayName,
                              })
                            }
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeChannel?.type === "COUPLE" ? "bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-text-primary)]" : "hover:bg-[var(--theme-surface)]/40 text-[var(--theme-text-secondary)]"}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Heart
                                className={`w-4 h-4 flex-shrink-0 ${couple.isAccepted ? "text-rose-500 fill-rose-500/10" : "text-[var(--theme-text-secondary)]"}`}
                              />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-semibold text-xs sm:text-sm text-[var(--theme-text-primary)] truncate">
                                  <UserDisplay user={couplePartner || { id: "", displayName: "คู่รัก" }} />
                                </span>
                                {couple.isAccepted ? (
                                  <span className="text-[10px] text-[var(--theme-text-secondary)] truncate">
                                    {getLatestMessagePreview("chat_" + couple.id, "เริ่มแชทเลย...")}
                                  </span>
                                ) : (
                                  <span className="block text-[9px] text-amber-400">
                                    รอการยินยอม...
                                  </span>
                                )}
                              </div>
                            </div>

                            {!couple.isAccepted && couple.user2Id === user.id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptCouple(couple.id);
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-[var(--theme-text-primary)] rounded text-[9px] font-bold ml-2 flex-shrink-0"
                              >
                                ยินยอม
                              </button>
                            ) : (
                              couple.isAccepted && getUnreadCountForChat("chat_" + couple.id) > 0 && (
                                <div className="bg-rose-500 text-[10px] text-white font-bold h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center shadow-sm shadow-rose-500/20 ml-2 flex-shrink-0">
                                  {getUnreadCountForChat("chat_" + couple.id)}
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {/* BFF Groups items */}
                        {bffGroups
                          .filter((g) => {
                            const matchesSearch = g.name.toLowerCase().includes(chatSearchQuery.toLowerCase());
                            return matchesSearch;
                          })
                          .map((g) => {
                            const isAccepted = g.members?.find(
                              (m: any) => m.userId === user.id,
                            )?.isAccepted;
                            return (
                              <div
                                key={g.id}
                                onClick={() => {
                                  if (isAccepted) {
                                    setActiveChannel({
                                      type: "BFF_GROUP",
                                      id: "chat_" + g.id,
                                      name: g.name,
                                    });
                                  }
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeChannel?.id === "chat_" + g.id ? "bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-text-primary)]" : "hover:bg-[var(--theme-surface)]/40 text-[var(--theme-text-secondary)]"}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <Users className="w-4 h-4 text-[var(--theme-primary)] flex-shrink-0" />
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-semibold text-xs sm:text-sm text-[var(--theme-text-primary)] truncate">
                                      {g.name}
                                    </span>
                                    {isAccepted ? (
                                      <span className="text-[10px] text-[var(--theme-text-secondary)] truncate">
                                        {getLatestMessagePreview("chat_" + g.id, "เริ่มแชทในกลุ่มเลย...")}
                                      </span>
                                    ) : (
                                      <span className="block text-[9px] text-amber-400">
                                        ได้รับเชิญเข้าร่วม...
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {!isAccepted ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptBffInvite(g.id);
                                    }}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-[var(--theme-text-primary)] rounded text-[9px] font-bold ml-2 flex-shrink-0"
                                  >
                                    ยอมรับคำเชิญ
                                  </button>
                                ) : (
                                  getUnreadCountForChat("chat_" + g.id) > 0 && (
                                    <div className="bg-rose-500 text-[10px] text-white font-bold h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center shadow-sm shadow-rose-500/20 ml-2 flex-shrink-0">
                                      {getUnreadCountForChat("chat_" + g.id)}
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })}

                        {/* Friend DM items */}
                        {friends
                          .filter((f) => {
                            const matchesSearch = f.displayName.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                              f.username.toLowerCase().includes(chatSearchQuery.toLowerCase());
                            const chatRoomId = "chat_" + [user?.id || "", f.id].sort().join("_");
                            const hasHistory = allConversationsMessages[chatRoomId] && allConversationsMessages[chatRoomId].length > 0;
                            const isCurrentlyActive = activeChannel?.id === chatRoomId;
                            return matchesSearch && (hasHistory || isCurrentlyActive);
                          })
                          .map((f) => {
                            const chatRoomId = "chat_" + [user?.id || "", f.id].sort().join("_");
                            return (
                              <div
                                key={f.id}
                                onClick={() =>
                                  setActiveChannel({
                                    type: "FRIEND",
                                    id: chatRoomId,
                                    friendId: f.id,
                                    name: f.displayName,
                                  })
                                }
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeChannel?.type === "FRIEND" && activeChannel?.friendId === f.id ? "bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-text-primary)]" : "hover:bg-[var(--theme-surface)]/40 text-[var(--theme-text-secondary)]"}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="relative flex-shrink-0">
                                    <span className="text-base flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                      {f.avatar && f.avatar.length <= 2 ? (
                                        f.avatar
                                      ) : f.avatar && (f.avatar.startsWith("http") || f.avatar.startsWith("data:")) ? (
                                        <img
                                          src={f.avatar}
                                          alt="Avatar"
                                          className="w-5 h-5 rounded-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        "👤"
                                      )}
                                    </span>
                                    <span
                                      className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-slate-950 ${
                                        f.presenceStatus === "online"
                                          ? "bg-emerald-500 animate-pulse"
                                          : f.presenceStatus === "busy"
                                            ? "bg-rose-500"
                                            : f.presenceStatus === "away"
                                              ? "bg-amber-500"
                                              : "bg-slate-500"
                                      }`}
                                    />
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-semibold text-xs sm:text-sm text-[var(--theme-text-primary)] truncate">
                                      <UserDisplay user={f} />
                                    </span>
                                    <span className="text-[10px] text-[var(--theme-text-secondary)] truncate">
                                      {getLatestMessagePreview(chatRoomId, f.status || `@${f.username}`)}
                                    </span>
                                  </div>
                                </div>

                                {getUnreadCountForChat(chatRoomId) > 0 && (
                                  <div className="bg-rose-500 text-[10px] text-white font-bold h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center shadow-sm shadow-rose-500/20 ml-2 flex-shrink-0">
                                    {getUnreadCountForChat(chatRoomId)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Friends list items */}
                        {friends.length > 0 ? (
                          <div className="space-y-1.5">
                            {[...friends]
                              .sort((a, b) => {
                                const presenceOrder = {
                                  online: 0,
                                  busy: 1,
                                  away: 2,
                                  offline: 3,
                                };
                                const diff = (presenceOrder[a.presenceStatus as keyof typeof presenceOrder] || 0) - (presenceOrder[b.presenceStatus as keyof typeof presenceOrder] || 0);
                                if (diff !== 0) return diff;
                                return (a.displayName || "").localeCompare(b.displayName || "");
                              })
                              .map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-[var(--theme-surface)]/30 border border-[var(--theme-border)]/40 text-xs text-[var(--theme-text-secondary)]"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative flex-shrink-0">
                                      <span className="text-base flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                        {f.avatar && f.avatar.length <= 2 ? (
                                          f.avatar
                                        ) : f.avatar &&
                                          (f.avatar.startsWith("http") ||
                                            f.avatar.startsWith("data:")) ? (
                                          <img
                                            src={f.avatar}
                                            alt="Avatar"
                                            className="w-5 h-5 rounded-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          "👤"
                                        )}
                                      </span>
                                      {/* Friend Presence Badge Dot */}
                                      <span
                                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950 ${
                                          f.presenceStatus === "online"
                                            ? "bg-emerald-500 animate-pulse"
                                            : f.presenceStatus === "busy"
                                              ? "bg-rose-500"
                                              : f.presenceStatus === "away"
                                                ? "bg-amber-500"
                                                : "bg-slate-500"
                                        }`}
                                      />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-1">
                                        <span className="font-semibold text-[var(--theme-text-primary)] truncate text-[11px]">
                                          <UserDisplay user={f} />
                                        </span>
                                      </div>
                                      {f.status ? (
                                        <span className="text-[9px] text-[var(--theme-text-secondary)] truncate">
                                          {f.status}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-[var(--theme-text-secondary)] font-mono">
                                          @{f.username}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFriendMenu(
                                          activeFriendMenu === f.id
                                            ? null
                                            : f.id,
                                        );
                                      }}
                                      className="p-1 hover:border-[var(--theme-border)] bg-[var(--theme-surface-hover)] rounded-lg transition-all flex-shrink-0"
                                      title="เมนูเพิ่มเติม"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-[var(--theme-text-secondary)] text-xs">
                            ยังไม่มีเพื่อน
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Friend Menu Modal (Extracted) */}
                  {activeFriendMenu && friends.find(f => f.id === activeFriendMenu) && (
                    <div
                      className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFriendMenu(null);
                      }}
                    >
                      <div
                        className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-xl w-full max-w-[260px] overflow-hidden py-2 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(() => {
                          const f = friends.find(f => f.id === activeFriendMenu);
                          if (!f) return null;
                          return (
                            <>
                              <div className="px-4 py-3 mb-1 border-b border-[var(--theme-border)]/50 flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full mb-2 bg-[var(--theme-primary)]/20 border border-[var(--theme-border)] flex items-center justify-center text-2xl">
                                  {f.avatar && f.avatar.length <= 2 ? f.avatar : "👤"}
                                </div>
                                <div className="font-semibold text-[var(--theme-text-primary)] text-sm">
                                  <UserDisplay user={f} />
                                </div>
                                <div className="text-[10px] text-[var(--theme-text-secondary)] font-mono">
                                  @{f.username}
                                </div>
                              </div>
                              <button
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] flex items-center gap-3 transition-colors"
                                onClick={() => {
                                  setActiveFriendMenu(null);
                                  setActiveChannel({
                                    type: "FRIEND",
                                  id: "chat_" + [user?.id || "", f.id].sort().join("_"),
                                  friendId: f.id,
                                    name: f.displayName,
                                  });
                                  setActiveTab("chat");
                                  setActiveSidebarTab("CHATS");
                                }}
                              >
                                <MessageSquare className="w-4 h-4 text-[var(--theme-primary)]" />{" "}
                                ส่งข้อความ
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] flex items-center gap-3 transition-colors"
                                onClick={() => {
                                  setActiveFriendMenu(null);
                                  alert("Profile " + f.displayName);
                                }}
                              >
                                <User className="w-4 h-4 text-emerald-400" /> ดูโปรไฟล์
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] flex items-center gap-3 transition-colors"
                                onClick={() => setActiveFriendMenu(null)}
                              >
                                <Star className="w-4 h-4 text-amber-400" /> เพิ่มรายการโปรด
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] flex items-center gap-3 transition-colors"
                                onClick={() => setActiveFriendMenu(null)}
                              >
                                <Pin className="w-4 h-4" /> ปักหมุด
                              </button>
                              <div className="border-t border-[var(--theme-border)]/50 my-1" />
                              <button
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] flex items-center gap-3 transition-colors"
                                onClick={() => setActiveFriendMenu(null)}
                              >
                                <BellOff className="w-4 h-4 text-[var(--theme-text-secondary)]" /> ปิดการแจ้งเตือน
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-3 transition-colors"
                                onClick={() => setActiveFriendMenu(null)}
                              >
                                <Ban className="w-4 h-4" /> บล็อก
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-3 transition-colors"
                                onClick={() => {
                                  setActiveFriendMenu(null);
                                  handleRemoveFriend(f.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" /> ลบเพื่อน
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                </div>

                {/* User Presence details */}
                <div className="p-4 border-t border-transparent bg-transparent flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        presenceStatus === "online"
                          ? "bg-emerald-500 animate-pulse"
                          : presenceStatus === "busy"
                            ? "bg-rose-500"
                            : presenceStatus === "away"
                              ? "bg-amber-500"
                              : "bg-slate-500"
                      }`}
                    />
                    <span className="font-semibold text-[var(--theme-text-secondary)]">
                      สถานะ:{" "}
                      {presenceStatus === "online"
                        ? "มีชีวิตออนไลน์"
                        : presenceStatus === "busy"
                          ? "ไม่ว่าง (เงียบ)"
                          : presenceStatus === "away"
                            ? "ไม่อยู่ (ห้ามรบกวน)"
                            : "ออฟไลน์ (ไร้เสียง)"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--theme-text-secondary)] font-mono">
                    Ver 2027.1
                  </span>
                </div>
              </div>

              {/* MAIN APPLICATION VIEWPANEL */}
              <div
                className={`flex-1 flex flex-col overflow-hidden bg-[var(--theme-bg)]/50 backdrop-blur-md rounded-2xl h-[calc(100vh-20px)] my-2.5 max-w-[1024px] mx-auto w-full ${activeTab === "chat" && !activeChannel ? "hidden md:flex" : "flex"}`}
              >
                {/* Top Main Navigation Header */}
                <div className="flex flex-col border-b border-transparent bg-[var(--theme-bg)]/70 backdrop-blur-md flex-shrink-0">
                  {/* Layer 1: Title & 5 Main Categories */}
                  {activeChannel && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-transparent">
                      <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="md:hidden p-1.5 -ml-2 rounded-lg text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface)]"
                            onClick={() => setActiveChannel(null)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          <div className="flex flex-col">
                            <span className="font-display font-extrabold text-sm sm:text-base text-[var(--theme-text-primary)] tracking-wider">
                              {activeChannel.type === "FRIEND" || activeChannel.type === "COUPLE" ? (
                                <UserDisplay user={{ id: activeChannel.friendId || activeChannel.id, displayName: activeChannel.name }} />
                              ) : (
                                activeChannel.name
                              )}
                            </span>
                            
                            {(activeChannel.type === "FRIEND" || activeChannel.type === "COUPLE") && (() => {
                              const partnerId = activeChannel.type === "COUPLE"
                                ? couplePartner?.id
                                : activeChannel.friendId;
                              
                              const partnerObj = activeChannel.type === "COUPLE"
                                ? couplePartner
                                : friends.find(f => f.id === partnerId);
                                
                              if (!partnerObj) return null;
                              
                              const isOnline = partnerObj.presenceStatus && partnerObj.presenceStatus !== 'offline';
                              const showLastOnline = partnerObj.showLastOnline !== false;
                              
                              let presenceText = "";
                              let presenceColor = "text-[var(--theme-text-secondary)]";
                              
                              if (isOnline) {
                                presenceColor = "text-emerald-400";
                                if (partnerObj.presenceStatus === 'busy') {
                                  presenceText = "🔴 ไม่ว่าง";
                                  presenceColor = "text-red-400";
                                } else if (partnerObj.presenceStatus === 'away') {
                                  presenceText = "🟡 ไม่อยู่";
                                  presenceColor = "text-amber-400";
                                } else {
                                  presenceText = "🟢 ออนไลน์";
                                }
                              } else {
                                presenceText = showLastOnline && partnerObj.lastOnline
                                  ? formatLastOnline(partnerObj.lastOnline)
                                  : "ออฟไลน์";
                              }
                              
                              return (
                                <span className={`text-[10px] font-semibold ${presenceColor}`}>
                                  {presenceText}
                                </span>
                              );
                            })()}
                          </div>
                          {activeChannel?.type === "COUPLE" && partnerPet && (
                            <div className="hidden lg:flex items-center gap-1.5 ml-3 bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-300">
                              <span>🐾 {partnerPet.name}</span>
                            </div>
                          )}
                        </div>
                        
                        {activeChannel?.type === "BFF_GROUP" && (
                          <button 
                            onClick={() => setShowBffGroupConfig(true)}
                            className="p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors rounded-full bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] border border-[var(--theme-border)]"
                            title="จัดการกลุ่ม BFF"
                          >
                            <Info className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Layer 2: Dynamic Sub-navigation */}
                  <div className="hidden sm:flex px-4 sm:px-6 py-2 bg-[var(--theme-surface)]/40 border-b border-transparent flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    {/* Dynamic Sub-tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                      {activeCategory === "social" && (
                        <>
                          <button
                            onClick={() => setActiveTab("chat")}
                            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${activeTab === "chat" ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                          >
                            💬 ห้องแชท & เพื่อน (Chat)
                          </button>
                          <button
                            onClick={() => setActiveTab("space")}
                            disabled={!activeChannel}
                            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${!activeChannel ? "opacity-30 cursor-not-allowed" : ""} ${activeTab === "space" ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                          >
                            🪐 สเปซ (Spaces)
                          </button>
                          <button
                            onClick={() => setActiveTab("vault")}
                            disabled={!activeChannel}
                            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${!activeChannel ? "opacity-30 cursor-not-allowed" : ""} ${activeTab === "vault" ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                          >
                            🔒 คลังลับ (Vault)
                          </button>
                        </>
                      )}

                      {activeCategory === "explore" && (
                        <button
                          onClick={() => setActiveTab("discovery")}
                          className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${activeTab === "discovery" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                        >
                          🐝 ค้นพบ Honey Me
                        </button>
                      )}

                      {activeCategory === "pet" && (
                        <button
                          onClick={() => setActiveTab("pet")}
                          className={`px-2.5 py-1 rounded-lg font-bold ${activeTab === "pet" ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                        >
                          🐾 สัตว์เลี้ยง & อุปกรณ์ (PET Space)
                        </button>
                      )}

                      {activeCategory === "notifications" && (
                        <button
                          onClick={() => setActiveTab("notifications")}
                          className={`px-2.5 py-1 rounded-lg font-bold ${activeTab === "notifications" ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                        >
                          🔔 จัดการการแจ้งเตือน & ความเป็นส่วนตัว
                        </button>
                      )}

                      {activeCategory === "lenses" && (
                        <button
                          onClick={() => setActiveTab("lenses")}
                          className={`px-2.5 py-1 rounded-lg font-bold ${activeTab === "lenses" ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                        >
                          🎭 เลนส์ตัวตน & เลนส์ (Lenses)
                        </button>
                      )}

                      {activeCategory === "settings" && (
                        <button
                          onClick={() => setActiveTab("settings")}
                          className={`px-2.5 py-1 rounded-lg font-bold ${activeTab === "settings" ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                        >
                          🛡️ ความปลอดภัย & เซสชันอุปกรณ์ (Security)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* TAB CONTENT PANEL CONTAINER */}
                <div className="flex-1 overflow-hidden relative">
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center bg-[var(--theme-bg)]">
                        <div className="w-8 h-8 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                  >
                    {activeTab === "chat" && activeChannel ? (
                      // Chat Box
                      <div className="flex flex-col h-full bg-transparent">
                        {activeChannel?.type === "COUPLE" &&
                          partnerPet &&
                          partnerPet.lensVisibility?.COUPLE !== false && (
                            <div className="bg-[var(--theme-surface)]/60 border-b border-[var(--theme-border)]/80 p-3 px-4 flex items-center justify-between gap-3 text-xs flex-shrink-0">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-2xl relative border border-[var(--theme-border)] flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      partnerPet.color || "#D0BFFF",
                                  }}
                                >
                                  <span>
                                    {partnerPet.species === "cat"
                                      ? "🐱"
                                      : partnerPet.species === "dog"
                                        ? "🐶"
                                        : partnerPet.species === "rabbit"
                                          ? "🐰"
                                          : partnerPet.species === "fox"
                                            ? "🦊"
                                            : partnerPet.species === "panda"
                                              ? "🐼"
                                              : "🐻"}
                                  </span>
                                  {partnerPet.equippedAccessories?.includes(
                                    "hat",
                                  ) && (
                                    <span className="absolute -top-2.5 text-sm">
                                      🎩
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-extrabold text-[var(--theme-text-primary)] flex items-center gap-1.5">
                                    🐾 {partnerPet.name}
                                    <span className="text-[9px] bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 px-1 py-0.2 rounded">
                                      สัตว์เลี้ยงคู่ครอง
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5">
                                    "
                                    {partnerPet.artificialBrain?.COUPLE?.[0]
                                      ?.sentence ||
                                      "สวัสดีค้าบเจ้านายของแฟน! 💕"}
                                    "
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 font-mono text-[9px] text-[var(--theme-text-secondary)]">
                                <span>
                                  ความอิ่ม: {partnerPet.satiety || 100}%
                                </span>
                                {partnerPet.placedFurniture?.includes(
                                  "bed",
                                ) && <span>😴 กำลังนอนหลับ</span>}
                              </div>
                            </div>
                          )}
                        {/* Messages Stream */}
                        <div 
                          className="flex-1 overflow-y-auto p-4 space-y-4 relative"
                          ref={messagesContainerRef}
                          onScroll={handleChatScroll}
                        >
                          {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-secondary)] gap-2.5 text-center p-8 max-w-sm mx-auto">
                              <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center text-[var(--theme-primary)] border border-[var(--theme-primary)]/10">
                                <Shield className="w-6 h-6 animate-pulse" />
                              </div>
                              <h4 className="font-semibold text-[var(--theme-text-primary)] text-sm sm:text-base">
                                เริ่มต้นความสัมพันธ์แบบส่วนตัว
                              </h4>
                              <p className="text-xs text-[var(--theme-text-secondary)]">
                                ทุกข้อความที่คุณพิมพ์จะถูกคุ้มครองด้วยกุญแจเข้ารหัสลับ
                                RSA-OAEP ก่อนส่งออก ไม่มีร่องรอยให้แอบแกะรอย
                              </p>
                            </div>
                          ) : (
                            messages.map((msg) => {
                              const isSelf = msg.senderId === user.id;
                              const isSelected = selectedMessageId === msg.id;
                              const isImage = msg.mediaType === 'image' || (msg.decryptedContent && msg.decryptedContent.startsWith("data:image/"));
                              const isVideo = msg.mediaType === 'video';
                              const isAudio = msg.mediaType === 'audio';
                              const isFile = msg.mediaType === 'file';
                              
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${isSelf ? "items-end" : "items-start"} animate-fade-in`}
                                >
                                  <div
                                    onClick={() => setSelectedMessageId((prev) => (prev === msg.id ? null : msg.id))}
                                    className={`relative max-w-[85%] rounded-2xl cursor-pointer transition-all ${isImage || isVideo ? "p-1" : "p-2 sm:p-2.5 px-3 sm:px-4"} text-[13px] sm:text-sm ${isSelf ? "bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-tr-none shadow-sm" : "bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] rounded-tl-none shadow-sm"} ${msg.isBurnAfterRead ? ((isImage || isVideo) ? "pb-6 pr-6" : "pb-5 pr-6") : ""}`}
                                  >
                                    {/* Reply reference preview */}
                                    {msg.replyToId && (
                                      <div className={`p-2 mb-1.5 rounded border-l-2 border-[var(--theme-primary)] text-[10px] ${isSelf ? "bg-black/20 text-indigo-100" : "bg-black/20 text-[var(--theme-text-secondary)]"}`}>
                                        อ้างอิงข้อความในความคุ้มครอง...
                                      </div>
                                    )}

                                    {isImage ? (
                                      <div className="rounded-xl overflow-hidden max-w-xs sm:max-w-sm bg-black/20 flex items-center justify-center">
                                        <img
                                          src={msg.mediaUrl || msg.decryptedContent}
                                          alt="Decrypted E2EE Media"
                                          className="max-h-64 w-full object-cover cursor-pointer transition-all hover:scale-[1.02]"
                                          referrerPolicy="no-referrer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const imgIndex = chatImages.findIndex((img) => img.id === msg.id);
                                            if (imgIndex !== -1) {
                                              setGalleryIndex(imgIndex);
                                            }
                                          }}
                                        />
                                      </div>
                                    ) : isVideo ? (
                                      <div className="rounded-xl overflow-hidden max-w-xs sm:max-w-sm bg-black/20 flex items-center justify-center">
                                        <video
                                          src={msg.mediaUrl}
                                          controls
                                          className="max-h-64 w-full object-contain"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    ) : isAudio ? (
                                      <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                                        <audio
                                          src={msg.mediaUrl}
                                          controls
                                          className="w-full max-w-xs h-10"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    ) : isFile ? (
                                      <div className="flex items-center gap-3 p-1">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--theme-background)] flex items-center justify-center flex-shrink-0 text-[var(--theme-primary)]">
                                          <Paperclip className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                          <span className="font-medium truncate">{msg.decryptedContent.replace('[ไฟล์: ', '').replace(']', '')}</span>
                                          <a 
                                            href={msg.mediaUrl} 
                                            download={msg.decryptedContent.replace('[ไฟล์: ', '').replace(']', '')}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[10px] opacity-80 hover:underline inline-block mt-0.5"
                                          >
                                            ดาวน์โหลด
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="whitespace-pre-wrap break-all leading-relaxed">
                                          {msg.decryptedContent}
                                        </p>
                                        
                                        {/* Link Preview (Onebox / Linkbox) */}
                                        {(() => {
                                          const urlRegex = /(https?:\/\/[^\s]+)/g;
                                          const urls = msg.decryptedContent ? msg.decryptedContent.match(urlRegex) : null;
                                          if (urls && urls.length > 0) {
                                            return (
                                              <div className="flex flex-col gap-1.5 mt-1">
                                                {(Array.from(new Set(urls)) as string[]).map((url, i) => (
                                                  <LinkPreview key={i} url={url} />
                                                ))}
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </>
                                    )}

                                    {/* Flame icon positioned at the bottom right corner of the message bubble */}
                                    {msg.isBurnAfterRead && (
                                      <span className="absolute bottom-1.5 right-2 text-amber-500 animate-pulse">
                                        <Flame className="w-3.5 h-3.5 fill-amber-500/20" />
                                      </span>
                                    )}
                                  </div>

                                  {/* Message actions footer (visible only when selected/clicked) */}
                                  {isSelected && (
                                    <div className="flex items-center gap-2 mt-1 text-[9px] text-[var(--theme-text-secondary)] font-mono animate-fade-in bg-[var(--theme-surface)]/40 px-2 py-0.5 rounded-md border border-[var(--theme-border)]/20 shadow-sm">
                                      <span>
                                        {new Date(
                                          msg.createdAt,
                                        ).toLocaleTimeString("th-TH", {
                                          hour: "numeric",
                                          minute: "numeric",
                                        })}
                                      </span>

                                      {isSelf && (
                                        <>
                                          <button
                                            onClick={() =>
                                              handleEditMessage(
                                                msg.id,
                                                msg.decryptedContent,
                                              )
                                            }
                                            className="hover:text-[var(--theme-text-primary)]"
                                          >
                                            แก้ไข
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteMessage(msg.id)
                                            }
                                            className="hover:text-red-400"
                                          >
                                            ลบ
                                          </button>
                                        </>
                                      )}

                                      {msg.updatedAt !== msg.createdAt && (
                                        <button
                                          onClick={() =>
                                            handleViewVersions(msg.id)
                                          }
                                          className="text-[var(--theme-primary)] hover:underline"
                                        >
                                          มีประวัติแก้ไข
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {partnerTyping && (
                            <div className="text-[10px] text-[var(--theme-primary)] italic animate-pulse font-mono pl-2">
                              กำลังพิมพ์ข้อความโต้ตอบ...
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {showNewMessageBadge && (
                          <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 z-10">
                            <button 
                              onClick={() => {
                                scrollToBottom();
                                setShowNewMessageBadge(false);
                              }}
                              className="bg-[var(--theme-primary)] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-[var(--theme-primary)]/20 animate-bounce hover:bg-[var(--theme-primary)]/90"
                            >
                              ข้อความใหม่!
                            </button>
                          </div>
                        )}

                        {/* Chat input box */}
                        <form
                          onSubmit={handleSendMessage}
                          className="p-3 border-t border-transparent bg-[var(--theme-bg)]/70 backdrop-blur-md flex flex-col gap-2 flex-shrink-0 relative"
                        >
                          {replyMessageId && (
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--theme-primary)] px-2">
                              <span>กำลังอ้างอิงข้อความ</span>
                              <button
                                type="button"
                                onClick={() => setReplyMessageId(null)}
                                className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          )}

                          {/* Attachment Menu (from + button) */}
                          {showAttachmentMenu && (
                            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 mb-2 shadow-lg animate-in slide-in-from-bottom-2 duration-150">
                              <div className="flex flex-col gap-4">
                                {/* Existing Feature: Burn After Read */}
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      id="burn-after-read-checkbox"
                                      name="burn-after-read-checkbox"
                                      type="checkbox"
                                      checked={burnAfterRead}
                                      onChange={(e) => setBurnAfterRead(e.target.checked)}
                                      className="rounded border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-primary)] focus:ring-0 w-4 h-4"
                                    />
                                    <Flame className={`w-4 h-4 ${burnAfterRead ? "text-amber-500 animate-pulse" : "text-[var(--theme-text-secondary)]"}`} />
                                    <span className={`text-sm ${burnAfterRead ? "text-amber-400 font-bold" : "text-[var(--theme-text-primary)]"}`}>
                                      ทำลายข้อความเมื่ออ่าน
                                    </span>
                                  </label>
                                  {burnAfterRead && (
                                    <select
                                      value={burnDuration}
                                      onChange={(e) => setBurnDuration(Number(e.target.value))}
                                      className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-2 py-1 text-xs text-[var(--theme-text-primary)] focus:outline-none"
                                    >
                                      <option value={5}>5 วินาที</option>
                                      <option value={10}>10 วินาที</option>
                                      <option value={30}>30 วินาที</option>
                                      <option value={60}>1 นาที</option>
                                    </select>
                                  )}
                                </div>
                                
                                {/* Placeholders for future expansion */}
                                <div className="grid grid-cols-4 gap-4 pt-2 border-t border-[var(--theme-border)]/50">
                                  {/* Future feature placeholders */}
                                  <div className="flex flex-col items-center gap-1.5 opacity-50 cursor-not-allowed">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--theme-bg)] flex items-center justify-center border border-[var(--theme-border)]">
                                      <span className="text-xl">📁</span>
                                    </div>
                                    <span className="text-[10px]">ไฟล์</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5 opacity-50 cursor-not-allowed">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--theme-bg)] flex items-center justify-center border border-[var(--theme-border)]">
                                      <span className="text-xl">📍</span>
                                    </div>
                                    <span className="text-[10px]">ตำแหน่ง</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Horizontal Quick Emoji Picker Bar */}
                          {showEmojiPicker && (
                            <div className="flex items-center gap-1.5 p-2 mb-2 bg-[var(--theme-surface)] border border-[var(--theme-border)]/50 rounded-xl overflow-x-auto no-scrollbar shadow-inner animate-in slide-in-from-bottom-2 duration-150">
                              <span className="text-[10px] font-bold text-[var(--theme-text-secondary)] uppercase pl-1.5 pr-1 tracking-wider whitespace-nowrap">อีโมจิ:</span>
                              {["😊", "😂", "🥰", "😍", "😎", "🤔", "👍", "❤️", "🔥", "🎉", "🚀", "🤫", "🔒", "🐱", "🌸", "🧸", "💑", "🥑", "🎮", "🍿"].map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    setMessageInput(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="w-7 h-7 text-sm flex items-center justify-center rounded-lg hover:bg-[var(--theme-primary)]/10 hover:scale-110 active:scale-95 transition-all flex-shrink-0"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Hidden File Input for E2EE Images */}
                          <input
                            id="chat-image-uploader"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  handleSendImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                              e.target.value = "";
                            }}
                          />
                          
                          {/* Hidden File Input for General Files */}
                          <input
                            id="chat-file-uploader"
                            type="file"
                            accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const MAX_SIZE = 20 * 1024 * 1024;
                                if (file.size > MAX_SIZE) {
                                  alert('ขนาดไฟล์เกิน 20MB');
                                  return;
                                }
                                const rejectedTypes = ['application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/gzip'];
                                if (rejectedTypes.includes(file.type) || file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
                                  alert('ไม่รองรับไฟล์บีบอัด');
                                  return;
                                }

                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const base64data = reader.result as string;
                                  try {
                                    const res = await fetch('/api/upload', {
                                      method: 'POST',
                                      headers,
                                      body: JSON.stringify({
                                        name: file.name,
                                        type: file.type,
                                        size: file.size,
                                        data: base64data
                                      })
                                    });
                                    if (res.ok) {
                                      const uploadData = await res.json();
                                      let mediaType = 'file';
                                      if (file.type.startsWith('image/')) mediaType = 'image';
                                      else if (file.type.startsWith('video/')) mediaType = 'video';
                                      else if (file.type.startsWith('audio/')) mediaType = 'audio';
                                      
                                      await sendContent(`[ไฟล์: ${file.name}]`, mediaType, uploadData.url);
                                    }
                                  } catch (error) {
                                    console.error('Failed to upload file', error);
                                    alert('ไม่สามารถอัปโหลดไฟล์ได้');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                              e.target.value = "";
                            }}
                          />

                          <div className="flex items-center gap-1">
                            {/* Plus Button */}
                            <button
                              type="button"
                              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                              className={`w-9 h-9 sm:w-10 sm:h-10 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] rounded-xl transition-all flex items-center justify-center flex-shrink-0 ${showAttachmentMenu ? 'bg-[var(--theme-surface)] rotate-45' : 'bg-transparent'}`}
                            >
                              <Plus className="w-6 h-6" />
                            </button>

                            {/* Camera (Placeholder) */}
                            <button
                              type="button"
                              onClick={() => {
                                alert("ไฟล์ที่ส่งจะถูกลบหลังจาก 30 วัน");
                                document.getElementById("chat-file-uploader")?.click();
                              }}
                              className="w-9 h-9 sm:w-10 sm:h-10 bg-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] rounded-xl transition-all flex items-center justify-center flex-shrink-0"
                              title="ส่งไฟล์ (Max 20MB)"
                            >
                              <Paperclip className="w-5 h-5" />
                            </button>

                            {/* Gallery (Image Upload) */}
                            <button
                              type="button"
                              onClick={() => document.getElementById("chat-image-uploader")?.click()}
                              className="w-9 h-9 sm:w-10 sm:h-10 bg-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] rounded-xl transition-all flex items-center justify-center flex-shrink-0"
                            >
                              <Image className="w-5 h-5" />
                            </button>

                            {/* Input Field with nested emoji */}
                            <div className="flex-1 relative flex items-center ml-1">
                              <input
                                id="chat-message-input"
                                name="chat-message-input"
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={handleTyping}
                                placeholder="Aa"
                                className="w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-full pl-4 pr-10 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]/50"
                              />
                              <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`absolute right-1 w-8 h-8 flex items-center justify-center rounded-full transition-all ${showEmojiPicker ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]'}`}
                              >
                                <Smile className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Mic or Send button */}
                            {messageInput.trim() ? (
                              <button
                                type="submit"
                                className="ml-1 w-9 h-9 sm:w-10 sm:h-10 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-full transition-all shadow-lg flex items-center justify-center flex-shrink-0"
                              >
                                <Send className="w-4 h-4 -ml-0.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                className={`ml-1 w-9 h-9 sm:w-10 sm:h-10 transition-all flex items-center justify-center flex-shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse rounded-full' : 'bg-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] rounded-xl'}`}
                              >
                                <Mic className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    ) : activeTab === "space" && activeChannel ? (
                      activeChannel.type === "COUPLE" ? (
                        <CoupleSpace
                          couple={couple}
                          partner={couplePartner}
                          userPrivateKey={privateKey!}
                          userPublicKey={user.publicKey}
                        />
                      ) : (
                        <BffSpace
                          group={bffGroups.find(
                            (g) => "chat_" + g.id === activeChannel.id,
                          )}
                          user={user}
                        />
                      )
                    ) : activeTab === "vault" && activeChannel ? (
                      <VaultSpace
                        ownerId={
                          activeChannel.type === "COUPLE"
                            ? couple.id
                            : activeChannel.id.substring(5)
                        }
                        ownerType={activeChannel.type}
                        userPrivateKey={privateKey!}
                        userPublicKey={user.publicKey}
                      />
                    ) : activeTab === "achievements" ? (
                      <AchievementsTab
                        token={token}
                        user={user}
                        setUser={setUser}
                        onPointsEarned={(pts) => {
                          const newPts = points + pts;
                          setPoints(newPts);
                          localStorage.setItem('shush_points', String(newPts));
                        }}
                      />
                    ) : activeTab === "settings" ? (
                      <DeviceAndLogs
                        setActiveTab={setActiveTab}
                        user={user}
                        circles={circles}
                        onRefreshCircles={fetchCircles}
                        points={points}
                        setPoints={setPoints}
                        activeTheme={activeTheme}
                        setActiveTheme={setActiveTheme}
                        activeBadge={activeBadge}
                        setActiveBadge={setActiveBadge}
                        activeNameColor={activeNameColor}
                        setActiveNameColor={setActiveNameColor}
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                        friends={friends}
                        couple={couple}
                        bffGroups={bffGroups}
                        handleLogout={handleLogout}
                        presenceStatus={presenceStatus}
                        handleUpdatePresenceStatus={handleUpdatePresenceStatus}
                        userLenses={userLenses}
                        activeLensType={activeLensType}
                        setActiveLensType={setActiveLensType}
                        setUser={setUser}
                      />
                    ) : activeTab === "lenses" ? (
                      <LensesSpace
                        targetUserId={location.pathname.startsWith("/lenses/") ? location.pathname.split("/")[2] : undefined}
                        user={user}
                        couple={couple}
                        bffGroups={bffGroups}
                        onRefreshUser={async () => {
                          const uRes = await fetch("/api/auth/me", {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (uRes.ok) {
                            const uData = await uRes.json();
                            setUser(uData.user);
                          }
                          await fetchUserLenses();
                        }}
                      />
                    ) : activeTab === "pet" ? (
                      <PetSpace
                        user={user}
                        onRefreshUser={async () => {
                          const uRes = await fetch("/api/auth/me", {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (uRes.ok) {
                            const uData = await uRes.json();
                            setUser(uData.user);
                          }
                        }}
                      />
                    ) : activeTab === "discovery" ? (
                      <DiscoverySpace
                        user={user}
                        circles={circles}
                        bffGroups={bffGroups}
                        userPrivateKey={privateKey!}
                        userPublicKey={user.publicKey}
                        onLogout={handleLogout}
                        onOpenLensesSettings={() => setActiveTab("settings")}
                        onRefreshFriends={async () => {
                          fetchFriends();
                          fetchRelationships();
                        }}
                        onOpenDirectChat={(friendId, friendName) => {
                          if (
                            couple &&
                            couple.partner &&
                            couple.partner.id === friendId
                          ) {
                            setActiveChannel({
                              type: "COUPLE",
                              id: "chat_" + couple.id,
                              name: couple.partner.displayName,
                            });
                            setActiveTab("chat");
                          } else {
                            alert(
                              `เชื่อมต่อกันเรียบร้อยแล้ว! สามารถเริ่มต้นคุยกับ ${friendName} ผ่านการตั้งกลุ่ม BFF หรือ คู่รัก จากแถบด้านซ้ายเพื่อแชทส่วนตัวด้วยเลนส์ปกปิดข้อมูลได้ทันที 💬`,
                            );
                            setActiveTab("chat");
                          }
                        }}
                        initialSelectedUserId={selectedDiscoverProfileId}
                        onClearInitialSelectedUser={() => setSelectedDiscoverProfileId(null)}
                        initialShowInbox={showDiscoverInbox}
                        onClearInitialShowInbox={() => setShowDiscoverInbox(false)}
                      />
                    ) : activeTab === "notifications" ? (
                      <NotificationsSpace
                        user={user}
                        onNavigateToTab={(tabName) => {
                          setActiveTab(tabName as any);
                          if (tabName === "pet") setActiveCategory("pet");
                          else if (tabName === "chat" || tabName === "stories")
                            setActiveCategory("social");
                          else if (tabName === "discovery")
                            setActiveCategory("explore");
                          else if (tabName === "lenses")
                            setActiveCategory("lenses");
                          else if (tabName === "notifications")
                            setActiveCategory("notifications");
                          else if (tabName === "settings")
                            setActiveCategory("settings");
                        }}
                        onNavigateToNotification={
                          handleNavigateToNotificationTarget
                        }
                      />
                    ) : activeTab === "store" ? (
                      <ShhStoreSpace
                        points={points}
                        setPoints={setPoints}
                        activeTheme={activeTheme}
                        setActiveTheme={setActiveTheme}
                        activeBadge={activeBadge}
                        setActiveBadge={setActiveBadge}
                        activeNameColor={activeNameColor}
                        setActiveNameColor={setActiveNameColor}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-secondary)] text-center gap-4 p-8 bg-[var(--theme-bg)]/40">
                        <div className="p-5 bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 rounded-2xl max-w-sm space-y-4 shadow-xl">
                          <Radio className="w-10 h-10 text-[var(--theme-primary)] mx-auto animate-pulse" />
                          <h4 className="font-extrabold text-sm text-[var(--theme-text-primary)]">
                            ยังไม่มีห้องสนทนาหรือเพื่อนใช่ไหม? 🤔
                          </h4>
                          <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
                            เริ่มต้นใช้งาน Shush
                            ด้วยการเปิดเลนส์ปกปิดข้อมูลตัวตน
                            และค้นหาเพื่อนใหม่ที่เคมีตรงกันผ่านระบบ Honey Me
                            Mode ได้ทันที!
                          </p>
                          <button
                            onClick={() => {
                              setActiveCategory("social");
                              setActiveTab("discovery");
                            }}
                            className="w-full py-2 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl text-xs font-bold transition-all shadow-lg"
                          >
                            ✨ ค้นหาเพื่อนใหม่ผ่าน Honey Me
                          </button>
                        </div>
                      </div>
                    )}
                  </Suspense>
                </div>
              </div>

              {/* RIGHT SIDEBAR: Notifications */}
              {showNotificationsSidebar && (
                <div
                  className="hidden md:flex flex-col w-72 lg:w-80 border border-[var(--theme-border)]/30 rounded-2xl bg-[var(--theme-bg)]/85 backdrop-blur-md flex-shrink-0 h-[calc(100vh-20px)] my-2.5 mr-2.5 overflow-hidden relative animate-in slide-in-from-right duration-200"
                >
                  <div className="flex-1 overflow-y-auto">
                    <NotificationsSpace
                      user={user}
                      onClose={() => setShowNotificationsSidebar(false)}
                      onNavigateToTab={(tabName) => {
                        setActiveTab(tabName as any);
                        if (tabName === "pet") setActiveCategory("pet");
                        else if (tabName === "chat" || tabName === "stories")
                          setActiveCategory("social");
                        else if (tabName === "discovery")
                          setActiveCategory("explore");
                        else if (tabName === "lenses")
                          setActiveCategory("lenses");
                        else if (tabName === "notifications")
                          setActiveCategory("notifications");
                        else if (tabName === "settings")
                          setActiveCategory("settings");
                      }}
                      onNavigateToNotification={
                        handleNavigateToNotificationTarget
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Navigation */}
            {!activeChannel && (
              <nav className="md:hidden flex-shrink-0 sticky bottom-0 left-0 right-0 bg-[var(--theme-surface)]/95 backdrop-blur-xl border-t border-[var(--theme-border)] flex justify-around items-start z-40 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+14px)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] px-2">
                <button
                  onClick={() => {
                    setActiveCategory("social");
                    setActiveTab("chat");
                    setActiveChannel(null);
                  }}
                  className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${activeCategory === "social" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
                >
                <div
                  className={`p-1.5 rounded-xl ${activeCategory === "social" ? "bg-[var(--theme-primary)]/15" : ""}`}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">Chats</span>
              </button>
              <button
                onClick={() => {
                  setActiveCategory("explore");
                  setActiveTab("discovery");
                }}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${activeCategory === "explore" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
              >
                <div
                  className={`p-1.5 rounded-xl ${activeCategory === "explore" ? "bg-[var(--theme-primary)]/15" : ""}`}
                >
                  <Compass className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">Discover</span>
              </button>
              <button
                onClick={() => {
                  setActiveCategory("pet");
                  setActiveTab("pet");
                }}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${activeCategory === "pet" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
              >
                <div
                  className={`p-1.5 rounded-xl ${activeCategory === "pet" ? "bg-[var(--theme-primary)]/15" : ""}`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">PET</span>
              </button>
              <button
                onClick={() => {
                  setActiveCategory("notifications");
                  setActiveTab("notifications");
                }}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors relative ${activeCategory === "notifications" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
              >
                <div
                  className={`p-1.5 rounded-xl ${activeCategory === "notifications" ? "bg-[var(--theme-primary)]/15" : ""}`}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">Activity</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-3 w-3 h-3 bg-rose-500 rounded-full border-2 border-[var(--theme-surface)]"></span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveCategory("settings");
                  setActiveTab("settings");
                }}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${activeCategory === "settings" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"}`}
              >
                <div
                  className={`p-1.5 rounded-xl ${activeCategory === "settings" ? "bg-[var(--theme-primary)]/15" : ""}`}
                >
                  <User className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">Me</span>
              </button>
            </nav>
            )}
          </div>
        )}

        {/* 3. MODALS AND FLOATING DIALOGS */}

        {/* Mobile Full Menu */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-[var(--theme-bg)] z-50 flex flex-col md:hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border)]">
              <h3 className="font-display font-black text-xl text-[var(--theme-text-primary)]">
                Menu
              </h3>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-full bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]"
              >
                <span className="font-bold text-lg leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: "store",
                    label: "🛍️ Shh Store",
                    activeTabDefault: "store",
                  },
                  {
                    id: "notifications",
                    label: "🔔 Alerts",
                    activeTabDefault: "notifications",
                  },
                  {
                    id: "lenses",
                    label: "👤 Lens",
                    activeTabDefault: "lenses",
                  },
                  {
                    id: "settings",
                    label: "⚙️ Settings",
                    activeTabDefault: "settings",
                  },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id as any);
                      setActiveTab(cat.activeTabDefault as any);
                      setShowMobileMenu(false);
                    }}
                    className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-sm font-bold border ${activeCategory === cat.id ? "bg-[var(--theme-primary)]/10 border-[var(--theme-primary)]/30 text-[var(--theme-primary)]" : "bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-text-primary)] hover:border-[var(--theme-primary)]/50"}`}
                  >
                    {cat.label}
                    {cat.id === "notifications" && unreadCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full mt-1">
                        {unreadCount} New
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-[var(--theme-border)]">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] font-bold"
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History Modal */}
        {showVersionsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="font-display font-bold text-[var(--theme-text-primary)] text-base sm:text-lg border-b border-[var(--theme-border)] pb-3">
                ประวัติการแก้ไขข้อความ (Versions)
              </h3>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {msgVersions.length === 0 ? (
                  <p className="text-xs text-[var(--theme-text-secondary)] text-center py-4">
                    ไม่พบประวัติการแก้ไขเวอร์ชั่นก่อนหน้า
                  </p>
                ) : (
                  msgVersions.map((v) => (
                    <div
                      key={v.id}
                      className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] text-xs text-[var(--theme-text-secondary)]"
                    >
                      <p className="whitespace-pre-wrap">{v.decContent}</p>
                      <span className="block text-[9px] text-[var(--theme-text-secondary)] mt-2 font-mono">
                        แก้ไขเมื่อ:{" "}
                        {new Date(v.createdAt).toLocaleString("th-TH")}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowVersionsModal(false)}
                className="w-full border-[var(--theme-border)] bg-[var(--theme-surface-hover)] hover:bg-slate-700 text-[var(--theme-text-primary)] rounded-xl py-2 text-xs sm:text-sm font-semibold transition-all"
              >
                ปิดหน้าต่างประวัติ
              </button>
            </div>
          </div>
        )}

        {/* Add Friend / Create Relationship Modal */}
        {showAddFriendModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl max-w-sm w-full p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {addFriendModalView === "search" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-4 sm:p-6 border-b border-[var(--theme-border)] bg-[var(--theme-surface)] sticky top-0 z-10 flex justify-between items-center">
                    <h3 className="font-display font-bold text-[var(--theme-text-primary)] text-base sm:text-lg">
                      สร้างความสัมพันธ์ใหม่
                    </h3>
                    <button
                      onClick={() => setShowAddFriendModal(false)}
                      className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0">
                    <div className="space-y-4">
                      {/* Search Partner form if no couple */}
                      {!couple && (
                        <form
                          onSubmit={handleSearchPartner}
                          className="space-y-2 bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)]"
                        >
                          <span className="block text-[10px] uppercase tracking-wider font-bold text-[var(--theme-text-secondary)]">
                            ค้นหาผู้ใช้เพื่อเพิ่มเพื่อน หรือ
                            สร้างความสัมพันธ์คู่รัก
                          </span>
                          <div className="flex gap-1">
                            <input
                              id="search-username-input"
                              name="search-username-input"
                              type="text"
                              value={searchUsername}
                              onChange={(e) =>
                                setSearchUsername(e.target.value)
                              }
                              placeholder="กรอกชื่อผู้ใช้..."
                              className="flex-1 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
                            />
                            <button
                              type="submit"
                              className="px-3 bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] rounded-lg text-xs font-semibold transition-colors"
                            >
                              ค้นหา
                            </button>
                          </div>

                          {searchError && (
                            <p className="text-[10px] text-rose-500">
                              {searchError}
                            </p>
                          )}

                          {foundPartner && (
                            <div className="bg-[var(--theme-surface)] p-3 border border-[var(--theme-border)] rounded-xl flex flex-col gap-2 text-xs mt-2 animate-fade-in shadow-sm">
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate text-[var(--theme-text-primary)] font-medium">
                                  <UserDisplay user={foundPartner} /> (@
                                  {foundPartner.username})
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] font-mono whitespace-nowrap">
                                  {foundPartner.relationship === "COUPLE"
                                    ? "💕 คู่รัก"
                                    : foundPartner.relationship === "BFF"
                                      ? "💙 BFF"
                                      : foundPartner.relationship === "FRIENDS"
                                        ? "👥 เพื่อน"
                                        : "🌍 ทั่วไป"}
                                </span>
                              </div>
                              {foundPartner.bio && (
                                <p className="text-[10px] text-[var(--theme-text-secondary)] italic line-clamp-1">
                                  {foundPartner.bio}
                                </p>
                              )}

                              <div className="flex gap-1.5 mt-1">
                                <button
                                  type="button"
                                  onClick={handleConnectCouple}
                                  className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-[10px] font-semibold transition-colors"
                                >
                                  ขอเป็นแฟน
                                </button>
                                {friends.some(
                                  (f) => f.id === foundPartner.id,
                                ) ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveFriend(foundPartner.id)
                                    }
                                    className="flex-1 py-1.5 bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-secondary)] rounded-lg text-[10px] font-semibold transition-colors"
                                  >
                                    เลิกเป็นเพื่อน
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddFriend(foundPartner.id)
                                    }
                                    className="flex-1 py-1.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg text-[10px] font-semibold transition-colors shadow-sm shadow-[var(--theme-primary)]/20"
                                  >
                                    เพิ่มเพื่อน
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </form>
                      )}

                      {/* QR Code / Share Link Button */}
                      <button
                        onClick={() => setAddFriendModalView("qr")}
                        className="w-full bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] hover:bg-[var(--theme-border)] rounded-xl py-3 px-4 text-xs font-semibold text-[var(--theme-text-primary)] transition-all flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" /> สแกน QR Code / แชร์ตัวตน
                      </button>

                      {/* BFF Group Button */}
                      <button
                        onClick={() => {
                          setShowAddFriendModal(false);
                          setShowBffModal(true);
                        }}
                        className="w-full bg-[var(--theme-primary)]/5 hover:bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 rounded-xl py-3 px-4 text-xs font-semibold text-[var(--theme-primary)] transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> สร้างกลุ่มเพื่อนสนิท (BFF
                        Group)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-bg)] overflow-hidden">
                  <div className="flex items-center gap-2 p-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)] flex-shrink-0">
                    <button
                      onClick={() => setAddFriendModalView("search")}
                      className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors p-1 rounded-full hover:bg-[var(--theme-surface-hover)]"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-display font-bold text-[var(--theme-text-primary)] text-base">
                      QR Code & Share
                    </h3>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 relative">
                    <Suspense
                      fallback={
                        <div className="p-4 h-full flex items-center justify-center text-center">
                          <div className="w-6 h-6 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                      }
                    >
                      <QRShareManager
                        user={user}
                        onNavigate={() => setShowAddFriendModal(false)}
                        hideHeader={true}
                      />
                    </Suspense>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create BFF Group Modal */}
        {showBffGroupConfig && (
          <Suspense fallback={null}>
            <BffGroupConfigModal
              isOpen={showBffGroupConfig}
              onClose={() => setShowBffGroupConfig(false)}
              group={activeChannel?.type === "BFF_GROUP" ? bffGroups.find(g => g.id === activeChannel.id.replace("chat_", "")) : null}
              user={user}
              friends={friends}
              token={token}
              onRefresh={fetchRelationships}
            />
          </Suspense>
        )}
        {showBffModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl max-w-sm w-full p-6 space-y-4">
              <h3 className="font-display font-bold text-[var(--theme-text-primary)] text-base sm:text-lg border-b border-[var(--theme-border)] pb-3">
                กลุ่มเพื่อนสนิท (BFF Group)
              </h3>

              <form
                onSubmit={handleCreateBffGroup}
                className="space-y-4 text-xs sm:text-sm"
              >
                <div>
                  <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">
                    ชื่อกลุ่มความทรงจำ
                  </label>
                  <input
                    id="new-bff-name-input"
                    name="new-bff-name-input"
                    type="text"
                    required
                    value={newBffName}
                    onChange={(e) => setNewBffName(e.target.value)}
                    placeholder="เช่น กลุ่มเพื่อนซี้แก๊งสามช่า, ครีเอทีฟแลป"
                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBffModal(false)}
                    className="flex-1 border-[var(--theme-border)] bg-[var(--theme-surface-hover)] hover:bg-slate-700 text-[var(--theme-text-primary)] rounded-xl py-2 font-semibold transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl py-2 font-semibold transition-all"
                  >
                    สร้างกลุ่ม BFF
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating In-App Toasts Container (Top-Right) */}
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {activeToasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={() => {
                  handleNavigateToNotificationTarget(toast.notification);
                  setActiveToasts((prev) =>
                    prev.filter((t) => t.id !== toast.id),
                  );
                }}
                className="pointer-events-auto bg-[var(--theme-surface)]/95 border border-[var(--theme-primary)]/30 hover:border-violet-400 p-4 rounded-xl shadow-2xl flex items-start gap-3 cursor-pointer backdrop-blur-md transition-all select-none group"
              >
                <div className="p-2 bg-[var(--theme-primary)]/10 rounded-lg text-lg border border-[var(--theme-primary)]/20">
                  {toast.category === "RELATIONSHIP" && "💬"}
                  {toast.category === "LENS" && "👁️"}
                  {toast.category === "PET" && "🐾"}
                  {toast.category === "SYSTEM" && "🛡️"}
                  {toast.category === "HONEY_ME" && "🐝"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[var(--theme-text-primary)] group-hover:text-violet-300 transition-colors">
                      {toast.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveToasts((prev) =>
                          prev.filter((t) => t.id !== toast.id),
                        );
                      }}
                      className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] text-[10px] ml-2"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--theme-text-secondary)] mt-1 leading-relaxed">
                    {toast.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Fullscreen Image Gallery Modal */}
        {galleryIndex !== null && chatImages.length > 0 && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[10000] flex flex-col justify-between p-4 select-none">
            {/* Header */}
            <div className="flex items-center justify-between text-white p-2">
              <span className="font-sans font-medium text-sm text-gray-300">
                รูปภาพที่ {galleryIndex + 1} จาก {chatImages.length}
              </span>
              <button
                onClick={() => setGalleryIndex(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                id="close-gallery-btn"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex items-center justify-between gap-4 max-w-5xl mx-auto w-full relative">
              {/* Prev Button */}
              {galleryIndex > 0 ? (
                <button
                  onClick={() => setGalleryIndex(galleryIndex - 1)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors absolute left-2 md:left-4 z-10"
                  id="prev-gallery-btn"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              ) : (
                <div className="w-12" />
              )}

              {/* Slider image view */}
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                {chatImages.map((imgMsg, idx) => {
                  const isCurrent = idx === galleryIndex;
                  const isNear = Math.abs(idx - galleryIndex) <= 1;

                  if (!isCurrent) return null;

                  return (
                    <motion.div
                      key={imgMsg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="max-h-[75vh] w-full flex items-center justify-center"
                    >
                      {isNear ? (
                        <img
                          src={imgMsg.decryptedContent}
                          alt="Full Decrypted E2EE Media"
                          className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-gray-400 font-mono text-xs">
                          กำลังรอโหลด...
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Next Button */}
              {galleryIndex < chatImages.length - 1 ? (
                <button
                  onClick={() => setGalleryIndex(galleryIndex + 1)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors absolute right-2 md:right-4 z-10"
                  id="next-gallery-btn"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              ) : (
                <div className="w-12" />
              )}
            </div>

            {/* Footer containing scrollable thumb timeline */}
            <div className="h-20 flex justify-center items-center gap-2 overflow-x-auto px-4 py-2 bg-black/40 border-t border-white/5">
              {chatImages.map((imgMsg, idx) => {
                const isCurrent = idx === galleryIndex;
                const isNear = Math.abs(idx - galleryIndex) <= 4; // Render thumbnail for nearby ones to lazy-load them

                return (
                  <button
                    key={imgMsg.id}
                    onClick={() => setGalleryIndex(idx)}
                    className={`h-12 w-12 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${isCurrent ? "border-[var(--theme-primary)] scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    {isNear ? (
                      <img
                        src={imgMsg.decryptedContent}
                        alt="Thumb"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-full w-full bg-neutral-800" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </IdentityContext.Provider>
  );
}
