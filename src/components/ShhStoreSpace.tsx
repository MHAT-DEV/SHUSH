import React, { useState } from 'react';
import { ShoppingBag, Palette, Star, Sparkles, Check, Diamond } from 'lucide-react';

type StoreItem = {
  id: string;
  type: 'theme' | 'badge' | 'nameColor';
  name: string;
  description: string;
  price: number;
  value: string;
  preview?: string;
  gradient?: string;
};

const STORE_ITEMS: StoreItem[] = [
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
  { id: 'color_grad_fire', type: 'nameColor', name: 'Fire Gradient', description: 'ไล่สีเพลิง', price: 800, value: 'gradient-fire', gradient: 'linear-gradient(to right, #f97316, #ef4444)' },
  { id: 'color_grad_ocean', type: 'nameColor', name: 'Ocean Gradient', description: 'ไล่สีมหาสมุทร', price: 800, value: 'gradient-ocean', gradient: 'linear-gradient(to right, #06b6d4, #3b82f6)' },
  { id: 'color_grad_purple', type: 'nameColor', name: 'Royal Gradient', description: 'ไล่สีม่วงทอง', price: 1200, value: 'gradient-royal', gradient: 'linear-gradient(to right, #8b5cf6, #fbbf24)' },
];

export default function ShhStoreSpace({
  points,
  setPoints,
  activeTheme,
  setActiveTheme,
  activeBadge,
  setActiveBadge,
  activeNameColor,
  setActiveNameColor
}: {
  points: number;
  setPoints: (p: number) => void;
  activeTheme: string;
  setActiveTheme: (t: string) => void;
  activeBadge: string | null;
  setActiveBadge: (b: string | null) => void;
  activeNameColor: string | null;
  setActiveNameColor: (c: string | null) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<'theme' | 'badge' | 'nameColor'>('theme');
  const [ownedItems, setOwnedItems] = useState<string[]>(() => JSON.parse(localStorage.getItem('shush_owned_items') || '["theme_default"]'));

  const handlePurchase = (item: StoreItem) => {
    if (ownedItems.includes(item.id)) return;
    if (points >= item.price) {
      setPoints(points - item.price);
      const newOwned = [...ownedItems, item.id];
      setOwnedItems(newOwned);
      localStorage.setItem('shush_owned_items', JSON.stringify(newOwned));
    } else {
      alert('แต้มไม่พอสำหรับการซื้อไอเทมนี้');
    }
  };

  const handleEquip = (item: StoreItem) => {
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

  const filteredItems = STORE_ITEMS.filter(i => i.type === activeCategory);

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg)] overflow-y-auto p-4 sm:p-6 text-[var(--theme-text-primary)] relative">
      <div className="max-w-4xl mx-auto w-full space-y-6 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Shh Store</h2>
              <p className="text-sm text-[var(--theme-text-secondary)]">ปรับแต่ง Lens และประสบการณ์ใช้งาน</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[var(--theme-surface-hover)] px-4 py-2 rounded-xl border border-[var(--theme-border)]">
            <Diamond className="w-5 h-5 text-sky-400" />
            <span className="font-bold font-mono">{points.toLocaleString()}</span>
            <span className="text-xs text-[var(--theme-text-secondary)]">Points</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 p-1 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCategory('theme')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeCategory === 'theme' ? 'bg-[var(--theme-primary)] text-[var(--theme-primary-content)] shadow-md shadow-[var(--theme-primary)]/20' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]'}`}
          >
            <Palette className="w-4 h-4" /> Themes
          </button>
          <button
            onClick={() => setActiveCategory('badge')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeCategory === 'badge' ? 'bg-[var(--theme-primary)] text-[var(--theme-primary-content)] shadow-md shadow-[var(--theme-primary)]/20' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]'}`}
          >
            <Star className="w-4 h-4" /> Badges
          </button>
          <button
            onClick={() => setActiveCategory('nameColor')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeCategory === 'nameColor' ? 'bg-[var(--theme-primary)] text-[var(--theme-primary-content)] shadow-md shadow-[var(--theme-primary)]/20' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]'}`}
          >
            <Sparkles className="w-4 h-4" /> Name Colors
          </button>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const isOwned = ownedItems.includes(item.id);
            const isEquipped = 
              (item.type === 'theme' && activeTheme === item.value) ||
              (item.type === 'badge' && activeBadge === item.value) ||
              (item.type === 'nameColor' && activeNameColor === item.value);

            return (
              <div key={item.id} className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] p-4 flex flex-col justify-between gap-4 transition-all hover:border-[var(--theme-primary)]/50 group">
                <div className="space-y-3">
                  {/* Preview Area */}
                  <div className="h-24 rounded-xl bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] flex items-center justify-center overflow-hidden">
                    {item.type === 'theme' && (
                      <div className={`w-16 h-16 rounded-lg border-2 shadow-lg ${item.preview}`} />
                    )}
                    {item.type === 'badge' && (
                      <span className="text-4xl filter drop-shadow-md">{item.value}</span>
                    )}
                    {item.type === 'nameColor' && (
                      <span 
                        className="text-2xl font-bold font-display"
                        style={item.gradient ? { background: item.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: item.value }}
                      >
                        SampleName
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-[var(--theme-text-primary)]">{item.name}</h3>
                    <p className="text-xs text-[var(--theme-text-secondary)] line-clamp-2">{item.description}</p>
                  </div>
                </div>

                {isOwned ? (
                  <button
                    onClick={() => handleEquip(item)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isEquipped ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30' : 'bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)]'}`}
                  >
                    {isEquipped ? <><Check className="w-4 h-4" /> ใช้งานอยู่</> : 'ใช้งาน'}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={points < item.price}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${points >= item.price ? 'bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] shadow-md shadow-[var(--theme-primary)]/20' : 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] cursor-not-allowed opacity-50'}`}
                  >
                    ซื้อในราคา {item.price} Points
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
