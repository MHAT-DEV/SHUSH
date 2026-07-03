import React, { useState, useEffect, useRef } from 'react';
import { Eye, Clock, Plus, Trash2, Shield, Send, EyeOff, User, Settings, ArrowRight, X, Heart, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { encryptWithPublicKey, decryptWithPrivateKey } from '../lib/crypto.ts';
import { motion, AnimatePresence } from 'motion/react';
import UserDisplay from './UserDisplay.tsx';
import StoryEditor from './StoryEditor.tsx';

interface StoriesSpaceProps {
  user: any;
  circles: any[];
  bffGroups: any[];
  userPrivateKey: string;
  userPublicKey: string;
  onStartReplyChat: (targetChatId: string) => void;
  filterVisibility?: 'all' | 'public';
  layout?: 'row' | 'grid';
}

export default function StoriesSpace({ user, circles, bffGroups, userPrivateKey, userPublicKey, onStartReplyChat, filterVisibility = 'all', layout = 'row' }: StoriesSpaceProps) {
  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [isGridExpanded, setIsGridExpanded] = useState(false);
  
  // Grouped stories by user ID
  const [groupedStories, setGroupedStories] = useState<Record<string, any[]>>({});

  // Story Viewer State
  const [activeStoryUser, setActiveStoryUser] = useState<string | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEditor, setShowEditor] = useState(false);

  const [replyText, setReplyText] = useState('');

  const STORY_DURATION = 5000; // 5 seconds per story

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stories', { headers });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const decrypted = await Promise.all(list.map(async (story) => {
        let decContent = '';
        if (story.ciphertext) {
          decContent = await decryptWithPrivateKey(story.ciphertext, userPrivateKey);
        }
        let ownerName = story.userId === user.id ? user.displayName : 'เพื่อนของคุณ';
        if (story.userId !== user.id) {
          ownerName = 'คู่รัก / เพื่อน BFF';
        }
        return {
          ...story,
          decContent,
          ownerName
        };
      }));

      const validStories = decrypted.filter(s => {
        if (s.decContent.startsWith('[ข้อความ')) return false;
        if (filterVisibility === 'public' && s.audienceType !== 'PUBLIC') return false;
        return true;
      });
      setStories(validStories);

      // Group by user
      const grouped: Record<string, any[]> = {};
      validStories.forEach(s => {
        if (!grouped[s.userId]) grouped[s.userId] = [];
        grouped[s.userId].push(s);
      });
      setGroupedStories(grouped);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePostStory = async (storyData: any) => {
    setLoading(true);
    try {
      let enc = { ciphertext: '', iv: '' };
      if (storyData.text) {
         enc = await encryptWithPublicKey(storyData.text, userPublicKey);
      } else {
         // Create a dummy encrypted payload if there's only an image
         enc = await encryptWithPublicKey('[รูปภาพ]', userPublicKey);
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          audienceType: storyData.audienceType,
          targetCircleName: storyData.targetCircleName,
          targetBffGroupId: storyData.targetBffGroupId,
          isDownloadable: false,
          isForwardable: false,
          isSaveable: false,
          expiryMinutes: 1440,
          mediaType: storyData.mediaType,
          mediaUrl: storyData.mediaUrl,
          backgroundColor: storyData.backgroundColor
        })
      });

      if (res.ok) {
        setShowEditor(false);
        fetchStories();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Story Viewer Logic
  useEffect(() => {
    if (!activeStoryUser || isPaused) return;

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          handleNextStory();
          return 0;
        }
        return p + (100 / (STORY_DURATION / 100)); // Update every 100ms
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryUser, activeStoryIndex, isPaused]);

  // When opening a story, record a view
  useEffect(() => {
    if (activeStoryUser) {
      const story = groupedStories[activeStoryUser]?.[activeStoryIndex];
      if (story && story.userId !== user.id) {
        fetch(`/api/stories/${story.id}/views`, { method: 'POST', headers }).catch(e => console.error(e));
      }
    }
  }, [activeStoryUser, activeStoryIndex]);

  const handleNextStory = () => {
    if (!activeStoryUser) return;
    const userStories = groupedStories[activeStoryUser] || [];
    
    if (activeStoryIndex < userStories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // Find next user
      const users = Object.keys(groupedStories);
      const currentUserIndex = users.indexOf(activeStoryUser);
      if (currentUserIndex < users.length - 1) {
        setActiveStoryUser(users[currentUserIndex + 1]);
        setActiveStoryIndex(0);
        setProgress(0);
      } else {
        closeStoryViewer();
      }
    }
  };

  const handlePrevStory = () => {
    if (!activeStoryUser) return;
    
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
      setProgress(0);
    } else {
      // Find prev user
      const users = Object.keys(groupedStories);
      const currentUserIndex = users.indexOf(activeStoryUser);
      if (currentUserIndex > 0) {
        const prevUser = users[currentUserIndex - 1];
        setActiveStoryUser(prevUser);
        setActiveStoryIndex(groupedStories[prevUser].length - 1);
        setProgress(0);
      } else {
        setProgress(0);
      }
    }
  };

  const closeStoryViewer = () => {
    setActiveStoryUser(null);
    setActiveStoryIndex(0);
    setProgress(0);
    setReplyText('');
  };

  const handleReplyStory = async (story: any) => {
    if (!replyText) return;

    try {
      const chatId = story.targetBffGroupId ? `chat_${story.targetBffGroupId}` : 'chat_couple_main';
      const enc = await encryptWithPublicKey(`[ตอบกลับสตอรี่: "${story.decContent.substring(0, 20)}..."] ${replyText}`, userPublicKey);

      const res = await fetch(`/api/messages/${chatId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ciphertext: enc.ciphertext,
          iv: enc.iv
        })
      });

      if (res.ok) {
        setReplyText('');
        alert('ส่งข้อความตอบกลับในแชทส่วนตัวแล้ว!');
        closeStoryViewer();
        onStartReplyChat(chatId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReaction = async (story: any, reaction: string) => {
    try {
      await fetch(`/api/stories/${story.id}/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reaction })
      });
      // Optionally show a flying emoji effect
      alert(`ส่งรีแอคชั่น ${reaction} แล้ว!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteStory = async (id: string) => {
    try {
      const res = await fetch(`/api/stories/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        fetchStories();
        closeStoryViewer();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const allItems = [
    // 1. Post new story button
    <div key="create-story" className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0" onClick={() => setShowEditor(true)}>
      <div className="relative w-12 h-12 rounded-full bg-[var(--theme-surface)] border-2 border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-text-secondary)] shadow-sm">
        <Plus className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-semibold text-center w-14 truncate">สร้างสตอรี่</span>
    </div>,
    
    // 2. User Story Bubbles
    ...Object.entries(groupedStories).map(([userId, userStories]) => {
      const isMe = userId === user.id;
      const ownerName = userStories[0].ownerName;
      
      return (
        <div 
          key={userId} 
          className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0"
          onClick={() => {
            setActiveStoryUser(userId);
            setActiveStoryIndex(0);
            setProgress(0);
          }}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 p-[2px] shadow-sm">
            <div className="w-full h-full rounded-full bg-[var(--theme-surface)] border-2 border-[var(--theme-bg)] flex items-center justify-center overflow-hidden">
              {userStories[0].ownerAvatar && userStories[0].ownerAvatar.length <= 2 ? (
                <span className="text-xl">{userStories[0].ownerAvatar}</span>
              ) : userStories[0].ownerAvatar && (userStories[0].ownerAvatar.startsWith('http') || userStories[0].ownerAvatar.startsWith('data:')) ? (
                <img src={userStories[0].ownerAvatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-5 h-5 text-[var(--theme-text-secondary)]" />
              )}
            </div>
          </div>
          <UserDisplay user={{ id: userId, displayName: isMe ? 'คุณ' : ownerName }} className="text-[10px] font-semibold truncate w-14 justify-center" />
        </div>
      );
    })
  ];

  // Add mock stories if needed
  if (Object.keys(groupedStories).length === 0) {
    allItems.push(
      ...[
        { id: 'mock1', name: 'เพื่อนสนิท', avatar: '🐱' },
        { id: 'mock2', name: 'พี่สาว', avatar: '🌸' },
        { id: 'mock3', name: 'แฟน', avatar: '💕' }
      ].map(mock => (
        <div 
          key={mock.id} 
          className="flex flex-col items-center gap-1.5 cursor-not-allowed opacity-50 grayscale flex-shrink-0"
          title="ตัวอย่างสตอรี่ (ยังไม่มีสตอรี่จริง)"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 p-[2px] shadow-sm">
            <div className="w-full h-full rounded-full bg-[var(--theme-surface)] border-2 border-[var(--theme-bg)] flex items-center justify-center overflow-hidden">
              <span className="text-xl">{mock.avatar}</span>
            </div>
          </div>
          <div className="text-[10px] font-semibold truncate w-14 text-center text-[var(--theme-text-secondary)]">{mock.name}</div>
        </div>
      ))
    );
  }

  const displayedItems = layout === 'grid' 
    ? allItems.slice(0, isGridExpanded ? 8 : 4) 
    : allItems;

  return (
    <div className="flex flex-col text-[var(--theme-text-primary)] relative">
      
      {/* Premium Story Bubbles */}
      <div className={`mb-2 px-4 pt-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/20 ${layout === 'grid' ? 'pb-2' : 'pb-4'}`}>
        {layout === 'grid' ? (
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-4 gap-x-3 gap-y-4 w-full max-w-sm mx-auto justify-items-center">
              {displayedItems}
            </div>
            {allItems.length > 4 && (
              <button 
                onClick={() => setIsGridExpanded(!isGridExpanded)}
                className="mt-3 w-8 h-4 bg-[var(--theme-border)]/50 hover:bg-[var(--theme-border)] rounded-full flex items-center justify-center transition-colors shadow-sm"
              >
                {isGridExpanded ? <ChevronUp className="w-3 h-3 text-[var(--theme-text-secondary)]" /> : <ChevronDown className="w-3 h-3 text-[var(--theme-text-secondary)]" />}
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-none">
            {displayedItems}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEditor && (
          <StoryEditor 
            user={user} 
            circles={circles} 
            bffGroups={bffGroups} 
            onClose={() => setShowEditor(false)}
            onPost={handlePostStory}
          />
        )}
      </AnimatePresence>

      {/* Full Screen Story Viewer */}
      <AnimatePresence>
        {activeStoryUser && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[100] bg-black sm:p-4 flex items-center justify-center"
          >
            <div className="relative w-full h-full sm:max-w-md sm:h-[80vh] sm:rounded-3xl overflow-hidden bg-zinc-900 flex flex-col shadow-2xl">
              
              {/* Progress Bars */}
              <div className="absolute top-0 inset-x-0 z-20 flex gap-1 p-2 pt-4 px-3 bg-gradient-to-b from-black/60 to-transparent">
                {groupedStories[activeStoryUser]?.map((s, idx) => (
                  <div key={s.id} className="h-0.5 rounded-full bg-white/30 flex-1 overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{ 
                        width: idx === activeStoryIndex ? `${progress}%` : idx < activeStoryIndex ? '100%' : '0%' 
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header Info */}
              <div className="absolute top-8 inset-x-0 z-20 flex justify-between items-center px-4">
                <div className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <UserDisplay 
                      user={{ id: activeStoryUser, displayName: groupedStories[activeStoryUser][activeStoryIndex].ownerName }} 
                      className="text-sm shadow-sm text-white"
                    />
                    <span className="text-[10px] opacity-70">
                      {new Date(groupedStories[activeStoryUser][activeStoryIndex].createdAt).toLocaleTimeString('th-TH')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeStoryUser === user.id && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStory(groupedStories[activeStoryUser][activeStoryIndex].id); }} className="text-white/70 hover:text-red-400">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={closeStoryViewer} className="text-white/70 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Tap areas & Content */}
              <div 
                className={`flex-1 relative flex flex-col items-center justify-center p-6 text-center text-white break-words whitespace-pre-wrap ${groupedStories[activeStoryUser][activeStoryIndex]?.mediaType === 'image' ? 'bg-black' : `bg-gradient-to-br ${groupedStories[activeStoryUser][activeStoryIndex]?.backgroundColor || 'from-indigo-900 via-slate-900 to-violet-950'}`}`}
                onPointerDown={() => setIsPaused(true)}
                onPointerUp={() => setIsPaused(false)}
                onPointerLeave={() => setIsPaused(false)}
              >
                {/* Left tap area */}
                <div 
                  className="absolute left-0 inset-y-0 w-1/3 z-10" 
                  onClick={(e) => { e.stopPropagation(); handlePrevStory(); }}
                />
                
                {/* Right tap area */}
                <div 
                  className="absolute right-0 inset-y-0 w-1/3 z-10" 
                  onClick={(e) => { e.stopPropagation(); handleNextStory(); }}
                />

                {groupedStories[activeStoryUser][activeStoryIndex]?.mediaType === 'image' && groupedStories[activeStoryUser][activeStoryIndex]?.mediaUrl && (
                  <img src={groupedStories[activeStoryUser][activeStoryIndex]?.mediaUrl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="Story" />
                )}

                <span className="relative z-0 select-none drop-shadow-xl text-3xl font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {groupedStories[activeStoryUser][activeStoryIndex]?.decContent !== '[รูปภาพ]' ? groupedStories[activeStoryUser][activeStoryIndex]?.decContent : ''}
                </span>

                {/* Viewers info (if me) */}
                {activeStoryUser === user.id && (
                   <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                     <div className="flex items-center gap-1.5 text-white/80 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md text-xs cursor-pointer hover:bg-black/60">
                       <Eye className="w-3.5 h-3.5" />
                       <span>{groupedStories[activeStoryUser][activeStoryIndex]?.views?.length || 0} ผู้ชม</span>
                     </div>
                   </div>
                )}
              </div>

              {/* Footer / Reply (Only if not self) */}
              {activeStoryUser !== user.id && (
                <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="ตอบกลับสตอรี่..."
                      className="w-full bg-black/40 border border-white/20 rounded-full pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-white/50 backdrop-blur-sm placeholder:text-white/50"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleReplyStory(groupedStories[activeStoryUser][activeStoryIndex]);
                      }}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => setIsPaused(false)}
                    />
                    <button 
                      onClick={() => handleReplyStory(groupedStories[activeStoryUser][activeStoryIndex])}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-1"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReaction(groupedStories[activeStoryUser][activeStoryIndex], '❤️')} className="text-xl hover:scale-125 transition-transform">❤️</button>
                    <button onClick={() => handleReaction(groupedStories[activeStoryUser][activeStoryIndex], '🔥')} className="text-xl hover:scale-125 transition-transform">🔥</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
