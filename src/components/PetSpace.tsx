import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Sparkles, Smile, MessageSquare, Settings2, Trash2, Edit3, 
  Plus, Check, HelpCircle, Store, Eye, Clock, Award, ChevronRight, 
  ChevronLeft, BookOpen, UserCheck, RefreshCw, Layers, Calendar, Gift,
  Home, Cat, Activity, Droplets, Camera, X, Bell, CheckCircle2, Image as ImageIcon, Sliders,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import { PetSVG } from './PetSVG';
import PetRoom3D from './PetRoom3D';

const STORE_ACCESSORIES = [
  { id: 'hat', name: 'หมวกทรงสูง 🎩', cost: 100, emoji: '🎩' },
  { id: 'ribbon', name: 'โบว์สีแดง 🎀', cost: 60, emoji: '🎀' },
  { id: 'glasses', name: 'แว่นตาสุดเท่ 👓', cost: 80, emoji: '👓' },
  { id: 'collar', name: 'ปลอกคอกระดิ่ง 🔔', cost: 50, emoji: '🔔' },
  { id: 'scarf', name: 'ผ้าพันคออุ่น ๆ 🧣', cost: 70, emoji: '🧣' },
  { id: 'wings', name: 'ปีกนางฟ้า 👼', cost: 150, emoji: '👼' },
];

const STORE_FURNITURE = [
  { id: 'cleaner', name: 'หุ่นยนต์ดูดฝุ่น & เก็บอึอัตโนมัติ 🤖', cost: 150, emoji: '🤖', desc: 'ดูแลห้องนอนสัตว์เลี้ยงให้หอมชื่นใจ ไม่หมักหมมอึหรือฉี่โดยไม่มีค่าใช้จ่าย! ✨' },
  { id: 'bed', name: 'เตียงนอนนุ่ม ๆ 🛏️', cost: 120, emoji: '🛏️', desc: 'สัตว์เลี้ยงจะนอนหลับปุ๋ย 😴' },
  { id: 'house', name: 'บ้านไม้หลังเล็ก 🏠', cost: 200, emoji: '🏠', desc: 'บ้านแสนอบอุ่น' },
  { id: 'bowl', name: 'ชามอาหาร 🥣', cost: 50, emoji: '🥣', desc: 'ชามเปล่าสำหรับเตรียมอาหาร' },
  { id: 'toy', name: 'ตุ๊กตาหมีเพื่อนรัก 🧸', cost: 90, emoji: '🧸', desc: 'เพื่อนเล่นคลายเหงา' },
  { id: 'pillow', name: 'หมอนอิงนุ่ม 🛋️', cost: 40, emoji: '🛋️', desc: 'สำหรับอิงพักผ่อน' },
  { id: 'ball', name: 'ลูกบอลยางสนุก ⚽', cost: 60, emoji: '⚽', desc: 'สำหรับเล่นกลิ้งสนุกสนาน 🏃‍♂️' },
];

const STORE_EFFECTS = [
  { id: 'hearts', name: 'พายุหัวใจอบอุ่น ❤️', cost: 110, emoji: '❤️' },
  { id: 'stars', name: 'ประกายดาววิบวับ ✨', cost: 90, emoji: '✨' },
  { id: 'snow', name: 'หิมะโปรยปราย ❄️', cost: 130, emoji: '❄️' },
  { id: 'bubbles', name: 'ฟองสบู่ลอยล่อง 🫧', cost: 80, emoji: '🫧' },
  { id: 'flowers', name: 'กลีบซากุระร่วงโรย 🌸', cost: 120, emoji: '🌸' },
  { id: 'leaves', name: 'ใบไม้พริ้วไหว 🍃', cost: 70, emoji: '🍃' },
];

const STORE_FOODS = [
  { id: 'snack', name: 'ขนมขบเคี้ยว (Snack) 🍪', cost: 10, satiety: 20, emoji: '🍪' },
  { id: 'fish', name: 'ปลาสดเนื้อหวาน (Fish) 🐟', cost: 20, satiety: 30, emoji: '🐟' },
  { id: 'milk', name: 'น้ำนมอุ่น ๆ (Milk) 🥛', cost: 15, satiety: 25, emoji: '🥛' },
  { id: 'fruit', name: 'ผลไม้รวมสดชื่น (Fruit) 🍓', cost: 25, satiety: 35, emoji: '🍓' },
  { id: 'premium', name: 'อาหารพรีเมียม (Premium Meal) 🍖', cost: 50, satiety: 60, emoji: '🍖' },
];

const SPECIES_PRESETS = [
  { id: 'cat', name: 'แมว 🐱', emoji: '🐱' },
  { id: 'dog', name: 'สุนัข 🐶', emoji: '🐶' },
  { id: 'rabbit', name: 'กระต่าย 🐰', emoji: '🐰' },
  { id: 'fox', name: 'สุนัขจิ้งจอก 🦊', emoji: '🦊' },
  { id: 'panda', name: 'แพนด้า 🐼', emoji: '🐼' },
  { id: 'bear', name: 'หมี 🐻', emoji: '🐻' },
];

const COLOR_PRESETS = [
  { name: 'ส้มพาสเทล', value: '#FFB085' },
  { name: 'ชมพูคอตตอน', value: '#FFD1E3' },
  { name: 'ฟ้าพาสเทล', value: '#A0E4CB' },
  { name: 'ม่วงลาเวนเดอร์', value: '#D0BFFF' },
  { name: 'เหลืองละมุน', value: '#FFF5B8' },
  { name: 'เทาสตรีท', value: '#94A3B8' },
];

interface PetSpaceProps {
  user: any;
  onRefreshUser?: () => void;
}

export const PetSpace: React.FC<PetSpaceProps> = ({ user, onRefreshUser }) => {
  const [pet, setPet] = useState<any | null>(null);
  const [coins, setCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [adoptSpecies, setAdoptSpecies] = useState('cat');
  const [adoptName, setAdoptName] = useState('');
  const [adoptColor, setAdoptColor] = useState('#FFB085');
  const [adoptingError, setAdoptingError] = useState('');

  const [subTab, setSubTab] = useState<'home' | 'pet' | 'activity' | 'store' | 'gift' | 'settings' | 'notifications' | 'gallery'>('home');
  const [isTapped, setIsTapped] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; left: string; delay: string }[]>([]);

  const [activeLens, setActiveLens] = useState<'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE'>('PUBLIC');
  const activeBrainLens = activeLens;
  const setActiveBrainLens = setActiveLens;

  const [fsmState, setFsmState] = useState<'idle' | 'walk' | 'sit' | 'speak' | 'eat' | 'sleep' | 'play' | 'hibernate'>('idle');
  const [lastInteraction, setLastInteraction] = useState<number>(Date.now());
  const [bubbleText, setBubbleText] = useState<string>('สวัสดีฮะเจ้านาย! 😊');
  const [isCleaning, setIsCleaning] = useState(false);
  const [sanctuaryMessage, setSanctuaryMessage] = useState<string | null>(null);

  const [storeTab, setStoreTab] = useState<'foods' | 'accessories' | 'furniture' | 'effects'>('foods');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [quests, setQuests] = useState([
    { id: 'feed', title: 'ให้อาหาร 3 ครั้ง', target: 3, current: 0, reward: 50 },
    { id: 'play', title: 'เล่นกับสัตว์เลี้ยง 2 ครั้ง', target: 2, current: 0, reward: 30 },
    { id: 'bath', title: 'อาบน้ำ 1 ครั้ง', target: 1, current: 0, reward: 30 }
  ]);

  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [rememberScreenshotDecision, setRememberScreenshotDecision] = useState(false);
  const [autoOverwriteScreenshot, setAutoOverwriteScreenshot] = useState(false);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);
  
  // Ref for taking screenshot
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load screenshots from localStorage
    const saved = localStorage.getItem('shush_pet_screenshots');
    if (saved) setScreenshots(JSON.parse(saved));
    const autoOverwrite = localStorage.getItem('shush_pet_auto_overwrite');
    if (autoOverwrite === 'true') setAutoOverwriteScreenshot(true);
  }, []);

  const handlePrevScreenshot = () => {
    setFullscreenIdx((prev) => {
      if (prev === null || screenshots.length === 0) return null;
      return (prev - 1 + screenshots.length) % screenshots.length;
    });
  };

  const handleNextScreenshot = () => {
    setFullscreenIdx((prev) => {
      if (prev === null || screenshots.length === 0) return null;
      return (prev + 1) % screenshots.length;
    });
  };

  const handleDeleteScreenshot = (index: number) => {
    const newScreenshots = screenshots.filter((_, i) => i !== index);
    setScreenshots(newScreenshots);
    localStorage.setItem('shush_pet_screenshots', JSON.stringify(newScreenshots));
    if (newScreenshots.length === 0) {
      setFullscreenIdx(null);
    } else {
      setFullscreenIdx((prev) => {
        if (prev === null) return null;
        if (prev >= newScreenshots.length) return newScreenshots.length - 1;
        return prev;
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenIdx === null) return;
      if (e.key === 'ArrowLeft') {
        handlePrevScreenshot();
      } else if (e.key === 'ArrowRight') {
        handleNextScreenshot();
      } else if (e.key === 'Escape') {
        setFullscreenIdx(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIdx, screenshots]);

  const token = localStorage.getItem('shush_token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchPetData();
  }, []);

  const [editName, setEditName] = useState<string>('');

  useEffect(() => {
    if (pet) {
      setEditName(pet.lensConfigs?.[activeLens]?.name || pet.name || 'สัตว์เลี้ยง');
      cycleSpeech(activeLens);
    }
  }, [pet, activeLens]);

  useEffect(() => {
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'init', token, chatId: 'pet_space_view' }));
    };

    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'pet_sync' && payload.ownerId !== user?.id) {
          if (payload.lensType === activeLens) {
            if (payload.event === 'PET_STATE_UPDATE') {
              setFsmState(payload.payload.state);
            } else if (payload.event === 'PET_ACTION_TRIGGER') {
              setFsmState(payload.payload.state);
              if (payload.payload.speech) setBubbleText(payload.payload.speech);
            } else if (payload.event === 'PET_SPEECH_EVENT') {
              setBubbleText(payload.payload.sentence);
            } else if (payload.event === 'PET_ACCESSORY_CHANGE') {
              fetchPetData();
            }
          }
        }
      } catch (err) {}
    };

    return () => ws.close();
  }, [activeLens, token, user?.id]);

  useEffect(() => {
    if (!pet) return;

    const handleFocus = () => {
      triggerFsmState('speak');
      setBubbleText('เย้! เจ้านายกลับมาแล้ว! 🥰');
      setTimeout(() => setFsmState(prev => prev === 'speak' ? 'idle' : prev), 4000);
    };

    const handleBlur = () => {
      triggerFsmState('sleep');
      setBubbleText('คร่อกกก... Zzz');
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    const currentFurniture = pet.lensConfigs?.[activeLens]?.placedFurniture || pet.placedFurniture || [];
    if (currentFurniture.includes('bed') || currentFurniture.includes('pillow')) {
      setFsmState('sleep');
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastInteraction;

      if (currentFurniture.includes('bed') || currentFurniture.includes('pillow')) {
        if (fsmState !== 'sleep') triggerFsmState('sleep');
        return;
      }

      if (idleTime > 20000 && fsmState !== 'sleep' && fsmState !== 'sit') {
        const randomState = Math.random() > 0.5 ? 'sit' : 'sleep';
        triggerFsmState(randomState);
        setBubbleText(randomState === 'sleep' ? 'Zzz...' : 'รอเจ้านายอยู่น้า... 🐾');
        return;
      }

      if (fsmState === 'idle' || fsmState === 'sit' || fsmState === 'walk') {
        const r = Math.random();
        if (r < 0.25) {
          triggerFsmState('walk');
          setBubbleText('เดินเล่นแป๊บ! 🐾');
          setTimeout(() => setFsmState(prev => prev === 'walk' ? 'idle' : prev), 5000);
        } else if (r < 0.45) {
          triggerFsmState('sit');
        } else {
          triggerFsmState('idle');
          cycleSpeech(activeLens);
        }
      }
    }, 45000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(interval);
    };
  }, [pet, lastInteraction, fsmState, activeLens]);

  const triggerFsmState = (state: 'idle' | 'walk' | 'sit' | 'speak' | 'eat' | 'sleep' | 'play' | 'hibernate') => {
    setFsmState(state);
    setLastInteraction(Date.now());
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pet_sync', lensType: activeLens, event: 'PET_STATE_UPDATE', payload: { state } }));
    }
  };

  const fetchPetData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pet/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setPet(data.pet);
        setCoins(data.coins);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const cycleSpeech = (lensType: string) => {
    if (!pet || !pet.artificialBrain) return;
    const list = pet.artificialBrain[lensType] || [];
    if (list.length > 0) {
      const idx = Math.floor(Math.random() * list.length);
      setBubbleText(list[idx].sentence);
    }
  };

  const updateQuestProgress = (questId: string) => {
    setQuests(prev => prev.map(q => {
      if (q.id === questId && q.current < q.target) {
        const next = q.current + 1;
        if (next === q.target) {
          setCoins(c => c + q.reward); // optimistic UI reward
        }
        return { ...q, current: next };
      }
      return q;
    }));
  };

  const handlePetInteraction = async (type: 'pat' | 'play' | 'walk' | 'feed' | 'sleep' | 'bath') => {
    if (pet) {
      const currentSatiety = pet.satiety !== undefined ? pet.satiety : 100;
      if (currentSatiety < 10 && type !== 'feed') {
        alert(`❄️ สัตว์เลี้ยงจำศีลอยู่ กรุณาให้อาหาร!`);
        return;
      }
    }

    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 800);
    setLastInteraction(Date.now());

    if (type === 'feed') updateQuestProgress('feed');
    if (type === 'play') updateQuestProgress('play');

    try {
      const res = await fetch('/api/pet/interact', { method: 'POST', headers, body: JSON.stringify({ action: type }) });
      if (res.ok) {
        const data = await res.json();
        if (data.pet) setPet(data.pet);
      }
    } catch (e) {}

    if (type === 'pat') {
      triggerFsmState('speak');
      setBubbleText('ลูบหัวฟินจังเจ้านายยย~ 🥰');
      setTimeout(() => setFsmState(prev => prev === 'speak' ? 'idle' : prev), 4000);
    } else if (type === 'play') {
      triggerFsmState('play');
      setBubbleText('เย้ๆ เล่นกันเถอะ! ⚽');
      setTimeout(() => setFsmState(prev => prev === 'play' ? 'idle' : prev), 4500);
    } else if (type === 'walk') {
      triggerFsmState('walk');
      setBubbleText('อากาศดีจังเลย! 🌳');
      setTimeout(() => setFsmState(prev => prev === 'walk' ? 'idle' : prev), 4500);
    } else if (type === 'feed') {
      triggerFsmState('eat');
      setBubbleText('ง่ำๆ อร่อยจังเลย! 🍲');
      setTimeout(() => setFsmState(prev => prev === 'eat' ? 'idle' : prev), 4500);
    } else if (type === 'sleep') {
      triggerFsmState('sleep');
      setBubbleText('คร่อกกก... Zzz');
    } else if (type === 'bath') {
      triggerFsmState('idle');
      setBubbleText('อาบน้ำเสร็จแล้ว ตัวหอมจังเลย! 🛁🫧');
    }

    // Heart burst
    const newHearts = Array.from({ length: 8 }).map((_, i) => ({ id: Date.now() + i, left: `${Math.random() * 80 + 10}%`, delay: `${Math.random() * 0.3}s` }));
    setHearts(newHearts);
  };

  const handleCleanWaste = async () => {
    if (!pet) return;
    setIsCleaning(true);
    setBubbleText("กำลังเตรียมอาบน้ำ... 🛁🫧");
    
    setTimeout(() => {
      handlePetInteraction('bath');
      setIsCleaning(false);
      updateQuestProgress('bath');
    }, 2000);
  };

  const claimDailyCoins = async () => {
    try {
      const res = await fetch('/api/pet/coins/claim-daily', { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json();
        setCoins(data.coins);
        setPet(data.pet);
        alert(`🎉 เช็คอินสำเร็จ! ได้รับ ${data.rewardAmount} Coins 🪙`);
        if (onRefreshUser) onRefreshUser();
      }
    } catch (e) {}
  };

  const handleAdopt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adoptName.trim()) { setAdoptingError('กรุณากรอกชื่อ'); return; }
    try {
      const res = await fetch('/api/pet/adopt', {
        method: 'POST', headers,
        body: JSON.stringify({ species: adoptSpecies, name: adoptName, color: adoptColor })
      });
      if (res.ok) {
        const data = await res.json();
        setPet(data.pet);
        setCoins(data.coins);
        if (onRefreshUser) onRefreshUser();
      } else {
        const err = await res.json();
        setAdoptingError(err.error || 'การเลี้ยงสัตว์ล้มเหลว');
      }
    } catch (e) {}
  };

  const handleBuyItem = async (item: any, type: string) => {
    if (!pet) return;
    
    // Map 'accessories' -> 'accessory', etc for backend
    const categoryMap: Record<string, string> = {
      'foods': 'food',
      'accessories': 'accessory',
      'furniture': 'furniture',
      'effects': 'effect'
    };
    
    const category = categoryMap[type];
    
    // Check if owned (not applicable for food)
    let isOwned = false;
    let isEquipped = false;
    if (type === 'accessories') {
      isOwned = pet.accessories?.includes(item.id);
      isEquipped = equippedAccessories.includes(item.id);
    } else if (type === 'furniture') {
      isOwned = pet.furniture?.includes(item.id);
      isEquipped = placedFurniture.includes(item.id);
    } else if (type === 'effects') {
      isOwned = pet.effects?.includes(item.id);
      isEquipped = activeEffects.includes(item.id);
    }

    try {
      if (type !== 'foods' && isOwned) {
        // Equip or Unequip
        let action = isEquipped ? 'unequip' : 'equip';
        let successMsg = isEquipped ? `ถอด ${item.name} แล้ว` : `ใส่ ${item.name} แล้ว ✨`;
        if (category === 'furniture') {
          action = isEquipped ? 'remove' : 'place';
          successMsg = isEquipped ? `เก็บ ${item.name} แล้ว` : `วาง ${item.name} แล้ว ✨`;
        } else if (category === 'effect') {
          action = isEquipped ? 'deactivate' : 'activate';
          successMsg = isEquipped ? `ปิด ${item.name} แล้ว` : `เปิด ${item.name} แล้ว ✨`;
        }
        
        const res = await fetch('/api/pet/equip', {
          method: 'POST', headers,
          body: JSON.stringify({ itemId: item.id, category, action, lensType: activeLens })
        });
        if (res.ok) {
          const data = await res.json();
          setPet(data.pet);
          setBubbleText(successMsg);
        } else {
          const err = await res.json();
          alert(err.error || 'เกิดข้อผิดพลาด');
        }
      } else {
        // Buy
        const res = await fetch('/api/pet/store/buy', {
          method: 'POST', headers,
          body: JSON.stringify({ itemId: item.id, category, cost: item.cost })
        });
        if (res.ok) {
          const data = await res.json();
          setPet(data.pet);
          setCoins(data.coins);
          if (type === 'foods') {
              setBubbleText(`เย้! ได้กิน ${item.name} แล้ว! 😋`);
              triggerFsmState('eat');
              updateQuestProgress('feed');
              setTimeout(() => setFsmState(prev => prev === 'eat' ? 'idle' : prev), 4500);
          } else {
              setBubbleText(`ซื้อ ${item.name} สำเร็จ! ✨`);
              // Automatically equip after buying
              let autoAction = 'equip';
              if (category === 'furniture') autoAction = 'place';
              else if (category === 'effect') autoAction = 'activate';

              const equipRes = await fetch('/api/pet/equip', {
                method: 'POST', headers,
                body: JSON.stringify({ itemId: item.id, category, action: autoAction, lensType: activeLens })
              });
              if (equipRes.ok) {
                const equipData = await equipRes.json();
                setPet(equipData.pet);
              } else {
                fetchPetData();
              }
          }
        } else {
          const err = await res.json();
          alert(err.error || 'เกิดข้อผิดพลาดในการซื้อ');
        }
      }
    } catch(e) {}
  };

  const handleRename = async () => {
    if (!editName.trim()) return;
    try {
      const res = await fetch('/api/pet/me', {
        method: 'PUT', headers,
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        const data = await res.json();
        setPet(data.pet);
        alert('เปลี่ยนชื่อสำเร็จ!');
      } else {
        alert('เกิดข้อผิดพลาดในการเปลี่ยนชื่อ');
      }
    } catch(e) {}
  };

  const handleReset = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการปล่อยสัตว์เลี้ยงเข้าป่า? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      const res = await fetch('/api/pet/me', {
        method: 'DELETE', headers
      });
      if (res.ok) {
        setPet(null);
        setFsmState('idle');
      }
    } catch(e) {}
  };

  const handleTakeScreenshot = async () => {
    if (screenshots.length >= 50 && !autoOverwriteScreenshot) {
      setShowScreenshotWarning(true);
      return;
    }
    await captureAndSave();
  };

  const captureAndSave = async () => {
    if (!stageRef.current) return;
    try {
      // Add a slight delay to ensure UI updates before capturing if needed
      const dataUrl = await htmlToImage.toPng(stageRef.current, { 
        backgroundColor: '#141218',
        skipFonts: true,
        fontEmbedCSS: '',
      });
      const newScreenshots = [...screenshots];
      if (newScreenshots.length >= 50) {
        newScreenshots.shift(); // remove first
      }
      newScreenshots.push(dataUrl);
      setScreenshots(newScreenshots);
      localStorage.setItem('shush_pet_screenshots', JSON.stringify(newScreenshots));
      setBubbleText('แชะ! ถ่ายรูปแล้ว 📸');
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการถ่ายภาพ');
    }
  };

  const handleConfirmScreenshotWarning = async () => {
    if (rememberScreenshotDecision) {
      setAutoOverwriteScreenshot(true);
      localStorage.setItem('shush_pet_auto_overwrite', 'true');
    }
    setShowScreenshotWarning(false);
    await captureAndSave();
  };

  // UI rendering
  if (loading) return <div className="h-full flex items-center justify-center text-white"><RefreshCw className="w-8 h-8 animate-spin" /></div>;

  if (!pet) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#141218] text-white">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-[#1E1B2E] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <h2 className="font-display font-extrabold text-2xl mb-4 text-[#F3F4F6]">รับเลี้ยงเพื่อนรัก Shush PET! 🐾</h2>
          <form onSubmit={handleAdopt} className="space-y-5 relative z-10">
            <div className="space-y-2">
              <label className="text-sm text-[#9CA3AF]">สายพันธุ์</label>
              <div className="grid grid-cols-3 gap-3">
                {SPECIES_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setAdoptSpecies(p.id)}
                    className={`flex flex-col items-center p-3 rounded-2xl transition-all ${adoptSpecies === p.id ? 'bg-[#8B6DFF] text-white' : 'bg-[#2A2640] text-[#9CA3AF]'}`}
                  >
                    <span className="text-3xl">{p.emoji}</span>
                    <span className="text-xs mt-1">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[#9CA3AF]">ชื่อ</label>
              <input type="text" value={adoptName} onChange={(e) => setAdoptName(e.target.value)} className="w-full px-4 py-3 bg-[#2A2640] rounded-2xl text-white outline-none focus:ring-2 ring-[#8B6DFF]" />
            </div>
            {adoptingError && <p className="text-red-400 text-sm">{adoptingError}</p>}
            <button type="submit" className="w-full py-4 bg-[#8B6DFF] hover:bg-[#7a5ce6] text-white rounded-full font-bold transition-all active:scale-95 shadow-lg shadow-[#8B6DFF]/20">
              รับเลี้ยงฟรี! 🎉
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const activeEffects = pet.lensConfigs?.[activeLens]?.activeEffects || pet.activeEffects || [];
  const currentPetColor = pet.lensConfigs?.[activeLens]?.color || pet.color || '#FFB085';
  const currentPetName = pet.lensConfigs?.[activeLens]?.name || pet.name || 'สัตว์เลี้ยง';
  const equippedAccessories = pet.lensConfigs?.[activeLens]?.equippedAccessories || pet.equippedAccessories || [];
  const placedFurniture = pet.lensConfigs?.[activeLens]?.placedFurniture || pet.placedFurniture || [];
  const currentSatiety = pet.satiety !== undefined ? pet.satiety : 100;
  const currentHappiness = pet.happiness !== undefined ? pet.happiness : 50;

  const isClaimedToday = pet?.lastClaimedAt 
    ? new Date(pet.lastClaimedAt).toDateString() === new Date().toDateString()
    : false;

  // Render M3 Expressive Sidebar
  const SidebarBtn = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button onClick={() => setSubTab(id)} className={`flex flex-col items-center justify-center gap-1.5 p-2 md:p-3 min-w-[64px] rounded-2xl transition-all ${subTab === id ? 'bg-[#8B6DFF]/20 text-[#8B6DFF]' : 'text-[#9CA3AF] hover:bg-[#2A2640] hover:text-white'}`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6" />
      <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#141218] text-white rounded-[28px] overflow-hidden shadow-2xl relative font-sans">
      
      {/* Sidebar - hidden on mobile/tablet to maximize space, accessible via Top Menu on mobile */}
      <div className="hidden md:flex w-full md:w-[88px] h-16 md:h-auto overflow-x-auto md:overflow-visible bg-[#1D1B20] border-t md:border-t-0 md:border-r border-white/5 flex-row md:flex-col items-center justify-start md:justify-start px-2 md:py-6 md:px-0 gap-2 z-30 shrink-0 scrollbar-hide">
        <SidebarBtn id="home" icon={Home} label="หน้าหลัก" />
        <SidebarBtn id="pet" icon={Cat} label="สัตว์เลี้ยง" />
        <SidebarBtn id="activity" icon={Activity} label="กิจกรรม" />
        <SidebarBtn id="store" icon={Store} label="ร้านค้า" />
        <SidebarBtn id="gift" icon={Gift} label="ของขวัญ" />
        <SidebarBtn id="settings" icon={Settings2} label="ตั้งค่า" />
      </div>

      {/* Main Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden bg-gradient-to-b from-[#2A2640] to-[#141218]">
        
        {/* Top Status Bar */}
        <div className="relative z-20 flex justify-between items-center p-4 sm:p-6">
          {/* User & Pet Status Card */}
          <div className="flex items-center gap-3 bg-[#1D1B20]/80 backdrop-blur-md pl-2 pr-4 sm:pr-6 py-1.5 sm:py-2 rounded-full border border-white/10 shadow-lg max-w-[190px] xs:max-w-none">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FF85A2] to-[#8B6DFF] p-0.5 shrink-0">
              <div className="w-full h-full bg-[#1D1B20] rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">
                Lv.{pet?.level || 1}
              </div>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[#F3F4F6] text-xs sm:text-sm truncate">{currentPetName}</span>
                <span className="text-[9px] sm:text-[10px] text-[#9CA3AF] shrink-0">EXP: {pet?.exp || 0}/{ (pet?.level || 1) * 100 }</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="w-2.5 h-2.5 text-[#FF85A2] fill-[#FF85A2] shrink-0" />
                <div className="w-12 sm:w-20 h-1 bg-[#2A2640] rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-gradient-to-r from-[#FF85A2] to-[#8B6DFF] rounded-full transition-all duration-1000" style={{ width: `${currentHappiness}%` }} />
                </div>
                <div className="w-12 sm:w-20 h-1 bg-[#2A2640] rounded-full overflow-hidden relative group shrink-0">
                  <div className="h-full bg-gradient-to-r from-[#FFBC4A] to-[#FF85A2] rounded-full transition-all duration-1000" style={{ width: `${currentSatiety}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Resources, Notifications & Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 bg-[#1D1B20]/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-full border border-white/10 shadow-lg font-bold text-xs sm:text-sm">
              <span className="flex items-center gap-0.5 text-[#FFBC4A]">🪙 {coins}</span>
              <div className="w-px h-3 bg-white/20" />
              <span className="flex items-center gap-0.5 text-[#7EE7C1]">💎 0</span>
            </div>
            <button onClick={() => setSubTab('notifications')} className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1D1B20]/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-[#2A2640] transition-colors relative shadow-lg" title="การแจ้งเตือน">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-[#9CA3AF]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF85A2] rounded-full border border-[#1D1B20]" />
            </button>
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)} 
              className="md:hidden w-8 h-8 sm:w-10 sm:h-10 bg-[#1D1B20]/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-[#2A2640] transition-colors relative shadow-lg"
              title="เมนู"
            >
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-[#9CA3AF]" />
            </button>
          </div>
        </div>

        {/* Mobile Floating Navigation Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40 md:hidden" 
                onClick={() => setShowMobileMenu(false)} 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-4 sm:right-6 top-16 sm:top-20 bg-[#1D1B20]/95 backdrop-blur-xl border border-white/10 rounded-[24px] p-3 shadow-2xl z-50 flex flex-col gap-1 min-w-[150px] md:hidden"
              >
                <div className="text-[9px] uppercase tracking-wider text-[#9CA3AF] font-bold px-3.5 py-1 mb-1 border-b border-white/5">
                  เมนูหลัก
                </div>
                {[
                  { id: 'home', icon: Home, label: 'หน้าหลัก' },
                  { id: 'pet', icon: Cat, label: 'สัตว์เลี้ยง' },
                  { id: 'activity', icon: Activity, label: 'กิจกรรม' },
                  { id: 'store', icon: Store, label: 'ร้านค้า' },
                  { id: 'gift', icon: Gift, label: 'ของขวัญ' },
                  { id: 'settings', icon: Settings2, label: 'ตั้งค่า' }
                ].map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSubTab(item.id as any);
                        setShowMobileMenu(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${subTab === item.id ? 'bg-[#8B6DFF] text-white' : 'text-[#9CA3AF] hover:bg-[#2A2640] hover:text-white'}`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Dynamic Room Background (Night Starry window) */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-80 pointer-events-none">
           <div className="w-[600px] h-[600px] bg-[#8B6DFF]/5 rounded-full blur-[100px] absolute" />
           <div className="w-[400px] h-[400px] rounded-full border-[12px] border-[#1D1B20]/50 absolute backdrop-blur-sm" style={{ boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }}>
              {/* Starry night inside window */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#1E1B2E] to-transparent overflow-hidden">
                 <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse" />
                 <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                 <div className="absolute top-1/2 left-2/3 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
           </div>
        </div>

        {/* Main Pet Stage */}
        <div ref={stageRef} className="flex-1 relative z-10 flex items-center justify-center p-4">
          
          {/* Balanced Layered Room Container */}
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
            {/* Placed Furniture Items */}
            {placedFurniture.map((fId: string) => {
              if (fId === 'house') {
                return (
                  <motion.div 
                    key={fId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.9 }}
                    className="absolute top-[12%] left-[4%] text-6xl sm:text-7xl md:text-8xl z-0 select-none pointer-events-none drop-shadow-2xl"
                    title="Wooden House"
                  >
                    🏠
                  </motion.div>
                );
              }
              if (fId === 'bed') {
                return (
                  <motion.div 
                    key={fId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.85 }}
                    className="absolute bottom-[16%] left-1/2 -translate-x-1/2 text-7xl sm:text-8xl md:text-9xl z-0 select-none pointer-events-none drop-shadow-2xl"
                    title="Cozy Bed"
                  >
                    🛏️
                  </motion.div>
                );
              }
              if (fId === 'cleaner') {
                return (
                  <motion.div 
                    key={fId}
                    animate={{ 
                      x: [0, 60, -60, 0],
                      y: [0, -6, 6, 0],
                      rotate: [0, 360]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 12,
                      ease: "easeInOut"
                    }}
                    className="absolute bottom-[5%] right-[5%] text-3xl sm:text-4xl z-20 select-none pointer-events-none drop-shadow-lg"
                    title="Robotic Vacuum Cleaner"
                  >
                    🤖🧹
                  </motion.div>
                );
              }
              if (fId === 'bowl') {
                return (
                  <motion.div 
                    key={fId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute bottom-[10%] right-[15%] text-4xl sm:text-5xl z-20 select-none pointer-events-none drop-shadow-lg"
                    title="Bowl"
                  >
                    🥣
                  </motion.div>
                );
              }
              if (fId === 'toy') {
                return (
                  <motion.div 
                    key={fId}
                    animate={{ 
                      y: [0, -6, 0],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 4,
                      ease: "easeInOut"
                    }}
                    className="absolute bottom-[10%] left-[15%] text-4xl sm:text-5xl z-20 select-none pointer-events-none drop-shadow-lg"
                    title="Toy"
                  >
                    🧸
                  </motion.div>
                );
              }
              if (fId === 'pillow') {
                return (
                  <motion.div 
                    key={fId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute bottom-[24%] right-[4%] text-4xl sm:text-5xl md:text-6xl z-0 select-none pointer-events-none drop-shadow-2xl"
                    title="Pillow"
                  >
                    🛋️
                  </motion.div>
                );
              }
              if (fId === 'ball') {
                return (
                  <motion.div 
                    key={fId}
                    animate={{ 
                      rotate: 360,
                      x: [-20, 20, -20]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 5,
                      ease: "linear"
                    }}
                    className="absolute bottom-[6%] left-[28%] text-3xl sm:text-4xl z-20 select-none pointer-events-none drop-shadow-lg"
                    title="Ball"
                  >
                    ⚽
                  </motion.div>
                );
              }
              return null;
            })}

            {/* Pet Model Container */}
            <motion.div 
              className="w-40 h-40 sm:w-48 sm:h-48 relative cursor-pointer z-10"
              onClick={() => handlePetInteraction('pat')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <PetSVG 
                species={pet.species} 
                color={currentPetColor} 
                state={currentSatiety < 10 ? 'hibernate' : fsmState} 
                equippedAccessories={equippedAccessories}
                activeEffects={activeEffects}
              />

              {/* Speaking Bubble */}
              <AnimatePresence>
                {bubbleText && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white text-[#1E1B2E] px-3.5 py-1.5 rounded-[20px] text-xs font-bold whitespace-nowrap shadow-xl"
                  >
                    {bubbleText}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Sleeping Zzz */}
              {fsmState === 'sleep' && (
                <span className="absolute -top-4 right-0 text-xl font-bold text-sky-300 animate-pulse">💤</span>
              )}

              {/* Heart Animations */}
              <AnimatePresence>
                {hearts.map((h) => (
                  <motion.span
                    key={h.id}
                    initial={{ y: 0, opacity: 1, scale: 0.5 }}
                    animate={{ y: -100, x: (Math.random() - 0.5) * 80, opacity: 0, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, delay: parseFloat(h.delay), ease: "easeOut" }}
                    className="absolute text-[#FF85A2] text-2xl sm:text-3xl pointer-events-none z-40"
                    style={{ left: h.left }}
                  >
                    ❤️
                  </motion.span>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Left Floating Action Buttons - compact with no labels on mobile to avoid overlap */}
          <div className="absolute left-2 sm:left-4 md:left-8 top-[38%] sm:top-1/2 -translate-y-1/3 sm:-translate-y-1/2 flex flex-col gap-2 sm:gap-4 z-20">
            {[
              { id: 'feed', icon: '🍲', label: 'อาหาร', color: 'bg-[#FFBC4A]/20 text-[#FFBC4A]', action: () => handlePetInteraction('feed') },
              { id: 'bath', icon: '🫧', label: 'อาบน้ำ', color: 'bg-[#7EE7C1]/20 text-[#7EE7C1]', action: handleCleanWaste },
              { id: 'play', icon: '⚽', label: 'เล่น', color: 'bg-[#FF85A2]/20 text-[#FF85A2]', action: () => handlePetInteraction('play') },
              { id: 'sleep', icon: '💤', label: 'นอน', color: 'bg-[#8B6DFF]/20 text-[#8B6DFF]', action: () => handlePetInteraction('sleep') }
            ].map(btn => (
              <motion.button 
                key={btn.id}
                onClick={btn.action}
                whileHover={{ scale: 1.1, x: 4 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1"
                title={btn.label}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl md:text-2xl shadow-lg border border-white/10 backdrop-blur-md ${btn.color} hover:bg-white/10 transition-colors`}>
                  {btn.icon}
                </div>
                <span className="hidden sm:inline text-[11px] font-bold text-[#F3F4F6] bg-[#1D1B20]/60 px-2 py-0.5 rounded-full backdrop-blur-md">{btn.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Right Floating Panels */}
          <div className="absolute right-4 md:right-8 top-24 bottom-20 w-48 md:w-72 flex flex-col gap-4 md:gap-6 z-20 pointer-events-none hidden sm:flex">
            {/* Daily Quests Card */}
            <div className="bg-[#1D1B20]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl pointer-events-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#F3F4F6] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7EE7C1]" /> ภารกิจประจำวัน
                </h3>
                <button className="text-[#9CA3AF] hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                {quests.map(q => (
                  <div key={q.id} className="flex items-center justify-between gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2A2640] flex items-center justify-center text-[#9CA3AF] text-sm shrink-0">
                      {q.id === 'feed' ? '🍲' : q.id === 'play' ? '⚽' : '🫧'}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#F3F4F6]">{q.title}</p>
                      <div className="w-full h-1.5 bg-[#2A2640] rounded-full mt-1.5 overflow-hidden relative">
                         <motion.div 
                           className="absolute left-0 top-0 bottom-0 bg-[#8B6DFF] rounded-full" 
                           initial={{ width: 0 }}
                           animate={{ width: `${(q.current / q.target) * 100}%` }}
                         />
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-[#9CA3AF] font-bold">{q.current}/{q.target}</span>
                      <span className="text-[10px] text-[#FFBC4A] font-bold">+{q.reward} 🪙</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Reward Card */}
            {!isClaimedToday && (
              <div className="bg-[#1D1B20]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex flex-col items-center justify-center pointer-events-auto relative overflow-hidden group cursor-pointer" onClick={claimDailyCoins}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFBC4A]/10 to-[#FF85A2]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="font-bold text-[#F3F4F6] mb-2 z-10">รางวัลรายวัน</h3>
                <div className="relative text-5xl my-2 drop-shadow-2xl z-10 group-hover:scale-110 transition-transform">
                  🎁
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#1D1B20]" />
                </div>
                <span className="text-xs font-mono font-bold text-[#9CA3AF] z-10">แตะเพื่อรับรางวัล</span>
              </div>
            )}
          </div>
          
          {/* Cleaning Overlay */}
          <AnimatePresence>
            {isCleaning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#141218]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-6xl animate-spin" style={{ animationDuration: '2s' }}>🧹</span>
                <span className="mt-4 text-[#7EE7C1] font-bold text-lg animate-pulse">กำลังทำความสะอาดห้อง...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="relative z-20 flex flex-wrap items-center justify-center gap-3 px-4 pb-6 sm:pb-8 w-full max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSubTab('store');
                setStoreTab('accessories');
              }}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2A2640]/90 hover:bg-[#34304e] border border-white/10 rounded-full text-white font-bold text-xs sm:text-sm shadow-lg flex items-center gap-1.5 sm:gap-2 transition-colors backdrop-blur-md"
            >
              <Cat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF85A2]" /> เปลี่ยนชุด
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSubTab('store');
                setStoreTab('furniture');
              }}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2A2640]/90 hover:bg-[#34304e] border border-white/10 rounded-full text-white font-bold text-xs sm:text-sm shadow-lg flex items-center gap-1.5 sm:gap-2 transition-colors backdrop-blur-md"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7EE7C1]" /> ตกแต่งบ้าน
            </motion.button>
          </div>
          
          <div className="flex items-center gap-2.5">
            <motion.button 
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setSubTab('gallery')}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2A2640]/90 border border-white/10 text-white rounded-full flex items-center justify-center shadow-lg backdrop-blur-md"
              title="แกลเลอรี"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={handleTakeScreenshot}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white text-[#1D1B20] rounded-full flex items-center justify-center shadow-lg"
              title="ถ่ายรูป"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </div>
        </div>

        {/* Sub-modals over the dashboard (Store, Settings, etc.) */}
        <AnimatePresence>
           {subTab !== 'home' && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="absolute inset-x-8 bottom-8 top-24 bg-[#1D1B20] border border-white/10 rounded-[32px] shadow-2xl z-40 overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1D1B20]">
                  <h2 className="font-bold text-lg ml-4 flex items-center gap-2">
                    {subTab === 'store' && <><Store className="w-5 h-5 text-[#8B6DFF]"/> ร้านค้า (Store)</>}
                    {subTab === 'settings' && <><Settings2 className="w-5 h-5 text-[#9CA3AF]"/> ตั้งค่า (Settings)</>}
                    {subTab === 'activity' && <><Activity className="w-5 h-5 text-[#FFBC4A]"/> กิจกรรม (Activity)</>}
                    {subTab === 'pet' && <><Cat className="w-5 h-5 text-[#FF85A2]"/> ข้อมูลสัตว์เลี้ยง (Pet Profile)</>}
                    {subTab === 'gift' && <><Gift className="w-5 h-5 text-[#7EE7C1]"/> ของขวัญ (Gift)</>}
                    {subTab === 'notifications' && <><Bell className="w-5 h-5 text-[#FF85A2]"/> การแจ้งเตือนสัตว์เลี้ยง (Notifications)</>}
                    {subTab === 'gallery' && <><ImageIcon className="w-5 h-5 text-white"/> แกลเลอรี (Gallery)</>}
                  </h2>
                  <button onClick={() => setSubTab('home')} className="w-10 h-10 rounded-full bg-[#2A2640] hover:bg-[#34304e] flex items-center justify-center transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-[#141218]">
                   {subTab === 'store' && (
                     <div className="p-6">
                        <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                          {[
                            { id: 'foods', label: 'อาหาร' },
                            { id: 'accessories', label: 'เครื่องแต่งกาย' },
                            { id: 'furniture', label: 'เฟอร์นิเจอร์' },
                            { id: 'effects', label: 'เอฟเฟกต์' }
                          ].map((cat) => (
                            <button 
                              key={cat.id} 
                              onClick={() => setStoreTab(cat.id as any)}
                              className={`px-4 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-colors ${storeTab === cat.id ? 'bg-[#8B6DFF] text-white' : 'bg-[#2A2640] text-[#9CA3AF] hover:text-white'}`}>
                               {cat.label}
                            </button>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                           {storeTab === 'foods' && STORE_FOODS.map(item => (
                             <div key={item.id} onClick={() => handleBuyItem(item, 'foods')} className="bg-[#1D1B20] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-[#FFBC4A]/50 transition-colors cursor-pointer group">
                               <div className="text-4xl group-hover:scale-110 transition-transform">{item.emoji}</div>
                               <div className="text-center">
                                 <div className="text-sm font-bold text-[#F3F4F6]">{item.name}</div>
                                 <div className="text-[10px] text-[#9CA3AF]">อิ่ม +{item.satiety}</div>
                               </div>
                               <button className="w-full py-2 bg-[#2A2640] group-hover:bg-[#FFBC4A] group-hover:text-[#1D1B20] text-[#FFBC4A] rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1">
                                 🪙 {item.cost}
                               </button>
                             </div>
                           ))}

                           {storeTab === 'accessories' && STORE_ACCESSORIES.map(item => (
                             <div key={item.id} onClick={() => handleBuyItem(item, 'accessories')} className="bg-[#1D1B20] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-[#8B6DFF]/50 transition-colors cursor-pointer group relative">
                               {equippedAccessories.includes(item.id) && (
                                  <div className="absolute top-2 right-2 bg-[#8B6DFF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ใช้งานอยู่</div>
                               )}
                               <div className="text-4xl group-hover:scale-110 transition-transform mt-2">{item.emoji}</div>
                               <div className="text-center">
                                 <div className="text-sm font-bold text-[#F3F4F6]">{item.name}</div>
                               </div>
                               <button className="w-full py-2 bg-[#2A2640] group-hover:bg-[#8B6DFF] group-hover:text-white text-[#9CA3AF] rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1 mt-auto">
                                 {pet.accessories?.includes(item.id) ? (equippedAccessories.includes(item.id) ? 'ถอด' : 'ใส่') : `🪙 ${item.cost}`}
                               </button>
                             </div>
                           ))}

                           {storeTab === 'furniture' && STORE_FURNITURE.map(item => (
                             <div key={item.id} onClick={() => handleBuyItem(item, 'furniture')} className="bg-[#1D1B20] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-[#7EE7C1]/50 transition-colors cursor-pointer group relative">
                               {placedFurniture.includes(item.id) && (
                                  <div className="absolute top-2 right-2 bg-[#7EE7C1] text-[#1D1B20] text-[10px] font-bold px-2 py-0.5 rounded-full">วางแล้ว</div>
                               )}
                               <div className="text-4xl group-hover:scale-110 transition-transform mt-2">{item.emoji}</div>
                               <div className="text-center">
                                 <div className="text-sm font-bold text-[#F3F4F6]">{item.name}</div>
                               </div>
                               <button className="w-full py-2 bg-[#2A2640] group-hover:bg-[#7EE7C1] group-hover:text-[#1D1B20] text-[#9CA3AF] rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1 mt-auto">
                                 {pet.furniture?.includes(item.id) ? (placedFurniture.includes(item.id) ? 'เก็บ' : 'วาง') : `🪙 ${item.cost}`}
                               </button>
                             </div>
                           ))}

                           {storeTab === 'effects' && STORE_EFFECTS.map(item => (
                             <div key={item.id} onClick={() => handleBuyItem(item, 'effects')} className="bg-[#1D1B20] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-[#FF85A2]/50 transition-colors cursor-pointer group relative">
                               {activeEffects.includes(item.id) && (
                                  <div className="absolute top-2 right-2 bg-[#FF85A2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">เปิดใช้งาน</div>
                               )}
                               <div className="text-4xl group-hover:scale-110 transition-transform mt-2">{item.emoji}</div>
                               <div className="text-center">
                                 <div className="text-sm font-bold text-[#F3F4F6]">{item.name}</div>
                               </div>
                               <button className="w-full py-2 bg-[#2A2640] group-hover:bg-[#FF85A2] group-hover:text-white text-[#9CA3AF] rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1 mt-auto">
                                 {pet.effects?.includes(item.id) ? (activeEffects.includes(item.id) ? 'ปิด' : 'เปิด') : `🪙 ${item.cost}`}
                               </button>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                   {subTab === 'pet' && (
                     <div className="p-6 flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-[#2A2640] rounded-full flex items-center justify-center mb-6">
                          <PetSVG species={pet.species} color={currentPetColor} state="idle" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">{currentPetName}</h2>
                        <p className="text-[#9CA3AF] mb-6">เกิดเมื่อ: {new Date(pet.createdAt).toLocaleDateString('th-TH')}</p>
                        
                        <div className="w-full max-w-md space-y-4">
                          <div className="bg-[#1D1B20] p-4 rounded-2xl">
                             <div className="flex justify-between text-sm mb-2">
                               <span className="text-[#9CA3AF]">ความสุข</span>
                               <span className="font-bold text-[#FF85A2]">{currentHappiness}/100</span>
                             </div>
                             <div className="h-2 bg-[#2A2640] rounded-full overflow-hidden">
                               <div className="h-full bg-gradient-to-r from-[#FF85A2] to-[#8B6DFF]" style={{ width: `${currentHappiness}%`}} />
                             </div>
                          </div>
                          <div className="bg-[#1D1B20] p-4 rounded-2xl">
                             <div className="flex justify-between text-sm mb-2">
                               <span className="text-[#9CA3AF]">ความอิ่ม</span>
                               <span className="font-bold text-[#FFBC4A]">{currentSatiety}/100</span>
                             </div>
                             <div className="h-2 bg-[#2A2640] rounded-full overflow-hidden">
                               <div className="h-full bg-gradient-to-r from-[#FFBC4A] to-[#FF85A2]" style={{ width: `${currentSatiety}%`}} />
                             </div>
                          </div>
                        </div>
                     </div>
                   )}
                   {subTab === 'activity' && (
                     <div className="p-6">
                        <h3 className="font-bold text-[#F3F4F6] mb-4">กิจกรรมล่าสุด</h3>
                        <div className="space-y-3">
                          {pet.lastAction ? (
                             <div className="flex items-center gap-4 bg-[#1D1B20] p-4 rounded-2xl">
                               <div className="text-2xl">
                                 {pet.lastAction === 'eating' ? '🍲' : 
                                  pet.lastAction === 'playing' ? '⚽' : 
                                  pet.lastAction === 'sleeping' ? '💤' : '🐾'}
                               </div>
                               <div className="flex-1">
                                 <div className="text-sm font-bold text-[#F3F4F6]">
                                   {pet.lastAction === 'eating' ? 'กินอาหาร' : 
                                    pet.lastAction === 'playing' ? 'เล่นสนุก' : 
                                    pet.lastAction === 'sleeping' ? 'นอนหลับพักผ่อน' : 'ทำกิจกรรม'}
                                 </div>
                                 <div className="text-xs text-[#9CA3AF]">
                                   {new Date(pet.lastActionAt).toLocaleString('th-TH')}
                                 </div>
                               </div>
                             </div>
                          ) : (
                             <p className="text-[#9CA3AF] text-center mt-4">ยังไม่มีกิจกรรม</p>
                          )}
                        </div>
                     </div>
                   )}
                   {subTab === 'settings' && (
                     <div className="p-6 max-w-md mx-auto space-y-4">
                        <div className="bg-[#1D1B20] p-4 rounded-2xl space-y-4">
                           <h3 className="font-bold text-[#F3F4F6]">เปลี่ยนชื่อสัตว์เลี้ยง</h3>
                           <div className="flex gap-2">
                             <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 bg-[#2A2640] text-white px-4 py-2 rounded-xl outline-none focus:ring-2 ring-[#8B6DFF]" />
                             <button onClick={handleRename} className="bg-[#8B6DFF] px-4 py-2 rounded-xl font-bold">บันทึก</button>
                           </div>
                        </div>
                        <div className="bg-[#1D1B20] p-4 rounded-2xl space-y-4">
                           <h3 className="font-bold text-red-400">เขตอันตราย (Danger Zone)</h3>
                           <button onClick={handleReset} className="w-full py-3 border border-red-500/50 text-red-400 rounded-xl font-bold hover:bg-red-500/10 transition-colors">
                              ปล่อยสัตว์เลี้ยงเข้าป่า (รีเซ็ต)
                           </button>
                        </div>
                     </div>
                   )}
                   {subTab === 'gift' && (
                     <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                        <div className="text-6xl mb-4">🎁</div>
                        <h3 className="text-xl font-bold text-[#F3F4F6] mb-2">กล่องของขวัญว่างเปล่า</h3>
                        <p className="text-[#9CA3AF] max-w-xs">ยังไม่มีเพื่อนคนไหนส่งของขวัญมาให้คุณเลย ลองส่งของขวัญให้เพื่อนก่อนสิ!</p>
                     </div>
                   )}
                   {subTab === 'notifications' && (
                     <div className="p-6">
                       <h3 className="font-bold text-[#F3F4F6] mb-4">การแจ้งเตือนล่าสุด</h3>
                       <div className="space-y-3">
                         {pet?.lensConfigs?.[activeLens]?.name ? (
                            <div className="flex items-center gap-4 bg-[#1D1B20] p-4 rounded-2xl">
                              <div className="w-10 h-10 rounded-full bg-[#2A2640] flex items-center justify-center text-xl shrink-0">👋</div>
                              <div className="flex-1">
                                <div className="text-sm font-bold text-[#F3F4F6]">ยินดีต้อนรับสู่พื้นที่สัตว์เลี้ยง!</div>
                                <div className="text-xs text-[#9CA3AF]">เพิ่งเริ่มเลี้ยง {pet.lensConfigs[activeLens].name}</div>
                              </div>
                            </div>
                         ) : (
                            <p className="text-[#9CA3AF] text-center mt-4">ไม่มีการแจ้งเตือนใหม่</p>
                         )}
                       </div>
                     </div>
                   )}
                   {subTab === 'gallery' && (
                     <div className="p-6 h-full flex flex-col">
                       <h3 className="font-bold text-[#F3F4F6] mb-2">แกลเลอรีภาพถ่าย ({screenshots.length}/50)</h3>
                       <p className="text-xs text-[#9CA3AF] mb-4">ภาพความทรงจำของสัตว์เลี้ยงคุณ (คลิกเพื่อดูรูปใหญ่)</p>
                       <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
                         {screenshots.length > 0 ? (
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                             {screenshots.map((src, i) => (
                               <div 
                                 key={i} 
                                 onClick={() => setFullscreenIdx(i)}
                                 className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group bg-[#2A2640] cursor-zoom-in transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg shadow-md"
                               >
                                 <img src={src} alt="Pet Screenshot" className="w-full h-full object-cover" />
                                 <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                                   <div className="flex justify-between items-center w-full">
                                     <span className="text-[10px] font-bold text-white/70">#{(i + 1)}</span>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         const confirmDel = window.confirm('คุณต้องการลบภาพความทรงจำนี้ใช่หรือไม่?');
                                         if (confirmDel) handleDeleteScreenshot(i);
                                       }}
                                       className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                                       title="ลบรูปภาพ"
                                     >
                                       <Trash2 className="w-3.5 h-3.5 text-white" />
                                     </button>
                                   </div>
                                   <div className="flex flex-col items-center justify-center gap-1 my-auto">
                                     <div className="p-1.5 bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                                       <Eye className="w-4 h-4 text-white" />
                                      </div>
                                      <span className="text-[11px] font-bold">ดูภาพใหญ่</span>
                                    </div>
                                    <a 
                                      href={src} 
                                      download={`pet_snapshot_${i}.png`} 
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full py-1 bg-white/10 hover:bg-white/20 active:scale-[0.98] rounded-lg text-center text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                    >
                                      <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-50">
                              <ImageIcon className="w-12 h-12 mb-2 text-[#9CA3AF]" />
                              <p className="text-[#9CA3AF]">ยังไม่มีภาพถ่าย ลองกดที่ปุ่มกล้องสิ!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </motion.div>
           )}
        </AnimatePresence>

        {/* Fullscreen Screenshot Preview Modal */}
        <AnimatePresence>
          {fullscreenIdx !== null && screenshots[fullscreenIdx] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#141218]/95 backdrop-blur-md flex flex-col justify-between p-4"
            >
              {/* Header Controls */}
              <div className="flex items-center justify-between w-full max-w-5xl mx-auto z-10 py-2">
                <div className="flex flex-col">
                  <h3 className="font-bold text-base text-[#F3F4F6]">ภาพถ่ายความทรงจำ</h3>
                  <span className="text-xs text-[#9CA3AF]">รูปที่ {fullscreenIdx + 1} จาก {screenshots.length}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <a
                    href={screenshots[fullscreenIdx]}
                    download={`pet_snapshot_${fullscreenIdx}.png`}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
                    title="ดาวน์โหลดภาพนี้"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ดาวน์โหลด</span>
                  </a>
                  
                  <button
                    onClick={() => {
                      const confirmDel = window.confirm('คุณต้องการลบภาพความทรงจำนี้ใช่หรือไม่?');
                      if (confirmDel) handleDeleteScreenshot(fullscreenIdx);
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border border-red-500/30"
                    title="ลบภาพนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ลบรูป</span>
                  </button>

                  <button
                    onClick={() => setFullscreenIdx(null)}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all"
                    title="ปิดหน้าต่าง"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Center Image Area with Navigation */}
              <div className="flex-1 relative flex items-center justify-center max-w-5xl mx-auto w-full my-4">
                
                {/* Left Arrow */}
                {screenshots.length > 1 && (
                  <button
                    onClick={handlePrevScreenshot}
                    className="absolute left-2 sm:left-4 z-10 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90"
                    title="ภาพก่อนหน้า (ลูกศรซ้าย)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* The Image */}
                <motion.div 
                  key={fullscreenIdx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="relative max-h-[60vh] max-w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black flex items-center justify-center"
                >
                  <img
                    src={screenshots[fullscreenIdx]}
                    alt={`Screenshot ${fullscreenIdx}`}
                    className="max-h-[60vh] object-contain max-w-full"
                  />
                </motion.div>

                {/* Right Arrow */}
                {screenshots.length > 1 && (
                  <button
                    onClick={handleNextScreenshot}
                    className="absolute right-2 sm:right-4 z-10 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90"
                    title="ภาพถัดไป (ลูกศรขวา)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Bottom Thumbnails Strip */}
              <div className="w-full max-w-5xl mx-auto py-2 border-t border-white/5 flex flex-col gap-2 shrink-0">
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider text-center">
                  คลังรูปภาพทั้งหมด
                </div>
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-4 justify-start sm:justify-center scrollbar-hide">
                  {screenshots.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setFullscreenIdx(i)}
                      className={`relative w-14 h-10 rounded-lg overflow-hidden shrink-0 transition-all border ${
                        i === fullscreenIdx
                          ? "border-[#8B6DFF] ring-2 ring-[#8B6DFF]/30 scale-105"
                          : "border-white/10 hover:border-white/30 scale-95 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={src} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Screenshot Warning Modal */}
        <AnimatePresence>
          {showScreenshotWarning && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1D1B20] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4"
              >
                <div className="text-4xl text-center">📸</div>
                <h3 className="text-lg font-bold text-center text-white">ถึงจำนวนสูงสุด (50 ภาพ)</h3>
                <p className="text-sm text-[#9CA3AF] text-center leading-relaxed">
                  ต้องการดำเนินการต่อหรือไม่? การบันทึกภาพใหม่จะทับภาพเก่าที่สุดโดยอัตโนมัติ
                </p>
                <label className="flex items-center gap-2 cursor-pointer bg-[#2A2640] p-3 rounded-xl border border-white/5">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${rememberScreenshotDecision ? 'bg-[#8B6DFF] border-[#8B6DFF]' : 'border-white/20'}`}>
                    {rememberScreenshotDecision && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={rememberScreenshotDecision} onChange={(e) => setRememberScreenshotDecision(e.target.checked)} />
                  <span className="text-sm font-medium text-white">จดจำการตัดสินใจนี้</span>
                </label>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setShowScreenshotWarning(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#2A2640] text-white hover:bg-[#34304e] transition-colors">
                    ยกเลิก
                  </button>
                  <button onClick={handleConfirmScreenshotWarning} className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#8B6DFF] text-white hover:bg-[#7a5ce6] transition-colors">
                    ยืนยัน
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
