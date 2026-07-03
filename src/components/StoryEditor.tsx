import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Send, Image as ImageIcon, Type, Palette, PenTool, Undo, Redo, Shield, 
  Plus, Trash2, Copy, Layers, Lock, Unlock, Eye, EyeOff, ChevronUp, ChevronDown, 
  Search, Sparkles, Smile, Play, Pause, Download, RefreshCw, Scissors, 
  Video, Smartphone, AlertCircle, Check, ZoomIn, ZoomOut, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Interfaces & Constants ---

export interface StoryLayer {
  id: string;
  type: 'text' | 'image' | 'sticker' | 'video';
  value: string; // text content, image/sticker URL, or raw base64
  x: number; // percentage coordinate 0-100 (relative to 9:16 canvas)
  y: number; // percentage coordinate 0-100
  scale: number;
  rotation: number; // degrees
  opacity: number;
  isLocked?: boolean;
  isHidden?: boolean;
  name: string;
  // Text options
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBgStyle?: 'none' | 'solid' | 'blur' | 'outline' | 'glow';
  textBgColor?: string;
  // Sticker options
  stickerType?: 'emoji' | 'animated' | 'svg';
  // Video options
  videoDuration?: number;
}

export interface StoryPage {
  id: string;
  duration: number; // in seconds (1 to 180)
  background: {
    type: 'gradient' | 'color' | 'image' | 'video';
    value: string; // gradient classes, color hex, or media URLs
  };
  layers: StoryLayer[];
  drawingDataUrl?: string; // High-res transparent layer
}

// Custom Font Library
const FONTS = [
  { name: 'Inter', value: 'font-sans' },
  { name: 'Mono Tech', value: 'font-mono' },
  { name: 'Playfair Editorial', value: 'font-serif' },
  { name: 'Space Bold', value: 'font-sans font-black tracking-tight uppercase' },
  { name: 'Chubby Rounded', value: 'font-sans font-bold tracking-wide rounded-md' },
  { name: 'Elegant Cursive', value: 'italic font-serif tracking-widest' },
];

const PRESET_GRADIENTS = [
  'from-indigo-600 via-purple-600 to-pink-600',
  'from-rose-500 via-red-500 to-amber-500',
  'from-emerald-400 to-cyan-500',
  'from-blue-600 to-indigo-900',
  'from-slate-800 to-zinc-950',
  'from-pink-400 via-rose-500 to-red-500',
  'from-fuchsia-600 via-purple-700 to-indigo-800',
  'from-amber-400 via-orange-500 to-rose-600',
];

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', 
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', 
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'
];

// Beautiful built-in stickers
const BUILTIN_STICKERS = [
  { id: 'st_1', type: 'animated', value: '🔥', label: 'HOT', color: 'bg-red-500' },
  { id: 'st_2', type: 'animated', value: '✨', label: 'SPARKLE', color: 'bg-amber-400' },
  { id: 'st_3', type: 'animated', value: '💖', label: 'LOVE', color: 'bg-pink-500' },
  { id: 'st_4', type: 'animated', value: '🌟', label: 'STAR', color: 'bg-yellow-400' },
  { id: 'st_5', type: 'animated', value: '💯', label: '100', color: 'bg-red-600' },
  { id: 'st_6', type: 'animated', value: '🚀', label: 'GO', color: 'bg-indigo-500' },
  { id: 'st_7', type: 'svg', value: '⭐', label: 'STAR SVG', color: 'bg-yellow-500' },
  { id: 'st_8', type: 'emoji', value: '😻', label: 'CAT LOVE', color: 'bg-rose-400' },
  { id: 'st_9', type: 'emoji', value: '🎉', label: 'PARTY', color: 'bg-fuchsia-500' },
  { id: 'st_10', type: 'emoji', value: '🍵', label: 'CHILL', color: 'bg-emerald-500' },
  { id: 'st_11', type: 'emoji', value: '🍿', label: 'DAILY', color: 'bg-blue-500' },
  { id: 'st_12', type: 'emoji', value: '👾', label: 'GAMER', color: 'bg-purple-500' },
];

export default function StoryEditor({ user, circles, bffGroups, onClose, onPost }: any) {
  // --- Core State ---
  const [pages, setPages] = useState<StoryPage[]>([
    {
      id: 'page_init_' + Math.random().toString(36).substring(2, 9),
      duration: 5,
      background: { type: 'gradient', value: PRESET_GRADIENTS[0] },
      layers: []
    }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeLayerIds, setActiveLayerIds] = useState<string[]>([]);
  const [editorTab, setEditorTab] = useState<'text' | 'media' | 'stickers' | 'draw' | 'bg' | 'layers'>('text');
  
  // --- Drag & Selection Coordinates ---
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [layerStartPos, setLayerStartPos] = useState<Record<string, { x: number; y: number }>>({});
  const [isRotatingScaling, setIsRotatingScaling] = useState<boolean>(false);
  const [rotateScaleStart, setRotateScaleStart] = useState<{ 
    layerId: string; 
    cx: number; cy: number; 
    startAngle: number; 
    startDist: number; 
    startScale: number; 
    startRotation: number;
  } | null>(null);

  // --- Zoom / Pan Canvas UX ---
  const [zoomScale, setZoomScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 0.8 : 1.0;
    }
    return 1.0;
  });

  // --- Safe Area Snap Guides ---
  const [showSnapH, setShowSnapH] = useState<boolean>(false);
  const [showSnapV, setShowSnapV] = useState<boolean>(false);

  // --- Drawing Tool State ---
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [brushType, setBrushType] = useState<'pen' | 'marker' | 'highlighter' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [brushColor, setBrushColor] = useState<string>('#ffffff');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [drawStrokes, setDrawStrokes] = useState<any[]>([]); // Vector path history for brush undo/redo
  const [redoStrokes, setRedoStrokes] = useState<any[]>([]);

  // --- Media Pipeline ---
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [transcodingProgress, setTranscodingProgress] = useState<number | null>(null);

  // --- Undo/Redo Engine for Pages & Layers ---
  const [historyStack, setHistoryStack] = useState<StoryPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // --- Playback / Preview Player ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playerProgress, setPlayerProgress] = useState<number>(0);

  // --- Auto-Save Status ---
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'none'>('saved');
  const [draftRestored, setDraftRestored] = useState<boolean>(false);

  // --- Export Status ---
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // --- Lens/Audience Settings ---
  const [audienceType, setAudienceType] = useState<'PUBLIC' | 'CIRCLE' | 'COUPLE' | 'BFF_GROUP'>('PUBLIC');
  const [targetCircleName, setTargetCircleName] = useState('Family');
  const [targetBffGroupId, setTargetBffGroupId] = useState('');

  // --- Search stickers query ---
  const [stickerQuery, setStickerQuery] = useState<string>('');

  // --- References ---
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- Current Page Data Shortcut ---
  const currentPage = pages[currentPageIndex] || pages[0];

  // Push current pages state to history stack
  const saveToHistory = useCallback((newPages: StoryPage[]) => {
    const nextStack = historyStack.slice(0, historyIndex + 1);
    nextStack.push(JSON.parse(JSON.stringify(newPages)));
    setHistoryStack(nextStack);
    setHistoryIndex(nextStack.length - 1);
  }, [historyStack, historyIndex]);

  // Undo / Redo Trigger
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setPages(JSON.parse(JSON.stringify(historyStack[prevIndex])));
      setActiveLayerIds([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setPages(JSON.parse(JSON.stringify(historyStack[nextIndex])));
      setActiveLayerIds([]);
    }
  };

  // Safe Update Pages state wrapper
  const updatePages = (updatedPages: StoryPage[]) => {
    setPages(updatedPages);
    saveToHistory(updatedPages);
  };

  // --- Auto Save & Draft Recovery ---
  useEffect(() => {
    const savedDraft = localStorage.getItem('shush_story_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.length > 0) {
          setPages(parsed);
          setHistoryStack([parsed]);
          setHistoryIndex(0);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 5000);
        }
      } catch (err) {
        console.error('Error loading draft', err);
      }
    } else {
      // Setup initial history
      setHistoryStack([pages]);
      setHistoryIndex(0);
    }
  }, []);

  // Periodic Auto-save
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoSaveStatus('saving');
      localStorage.setItem('shush_story_draft', JSON.stringify(pages));
      setTimeout(() => setAutoSaveStatus('saved'), 600);
    }, 3000);
    return () => clearInterval(timer);
  }, [pages]);

  const clearDraft = () => {
    localStorage.removeItem('shush_story_draft');
  };

  // --- Selection and Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected layers
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeLayerIds.length > 0 && !drawMode) {
          // If active element is a textarea/input, ignore
          if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
            return;
          }
          e.preventDefault();
          const nextLayers = currentPage.layers.filter(l => !activeLayerIds.includes(l.id));
          const nextPages = [...pages];
          nextPages[currentPageIndex] = { ...currentPage, layers: nextLayers };
          updatePages(nextPages);
          setActiveLayerIds([]);
        }
      }

      // Micro movement with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (activeLayerIds.length > 0 && !drawMode) {
          e.preventDefault();
          const offset = e.shiftKey ? 2 : 0.4; // shift for bigger jumps
          const dx = e.key === 'ArrowLeft' ? -offset : e.key === 'ArrowRight' ? offset : 0;
          const dy = e.key === 'ArrowUp' ? -offset : e.key === 'ArrowDown' ? offset : 0;

          const nextLayers = currentPage.layers.map(l => {
            if (activeLayerIds.includes(l.id) && !l.isLocked) {
              return { ...l, x: Math.max(0, Math.min(100, l.x + dx)), y: Math.max(0, Math.min(100, l.y + dy)) };
            }
            return l;
          });
          const nextPages = [...pages];
          nextPages[currentPageIndex] = { ...currentPage, layers: nextLayers };
          updatePages(nextPages);
        }
      }

      // Copy & Paste (Ctrl/Cmd + C / V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (activeLayerIds.length > 0) {
          const selected = currentPage.layers.filter(l => activeLayerIds.includes(l.id));
          localStorage.setItem('shush_clipboard', JSON.stringify(selected));
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const raw = localStorage.getItem('shush_clipboard');
        if (raw) {
          try {
            const copied: StoryLayer[] = JSON.parse(raw);
            const nextLayers = [...currentPage.layers];
            const pastedIds: string[] = [];

            copied.forEach(layer => {
              const newId = 'copied_layer_' + Math.random().toString(36).substring(2, 9);
              nextLayers.push({
                ...layer,
                id: newId,
                x: Math.min(90, layer.x + 5),
                y: Math.min(90, layer.y + 5),
                name: layer.name + ' (Copy)'
              });
              pastedIds.push(newId);
            });

            const nextPages = [...pages];
            nextPages[currentPageIndex] = { ...currentPage, layers: nextLayers };
            updatePages(nextPages);
            setActiveLayerIds(pastedIds);
          } catch (err) {
            console.error(err);
          }
        }
      }

      // Undo/Redo (Ctrl+Z, Ctrl+Y)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLayerIds, currentPageIndex, pages, drawMode]);

  // --- Layer operations ---
  const handleAddTextLayer = () => {
    const newLayer: StoryLayer = {
      id: 'layer_text_' + Math.random().toString(36).substring(2, 9),
      type: 'text',
      value: 'แตะเพื่อแก้ไขข้อความ',
      x: 50,
      y: 40,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
      name: 'Text ' + (currentPage.layers.filter(l => l.type === 'text').length + 1),
      fontSize: 26,
      color: '#ffffff',
      fontFamily: FONTS[0].value,
      textAlign: 'center',
      textBgStyle: 'none',
      textBgColor: '#000000'
    };
    
    const nextPages = [...pages];
    nextPages[currentPageIndex] = {
      ...currentPage,
      layers: [...currentPage.layers, newLayer]
    };
    updatePages(nextPages);
    setActiveLayerIds([newLayer.id]);
  };

  const handleAddSticker = (stickerValue: string, stickerType: 'emoji' | 'animated' | 'svg' = 'emoji') => {
    const newLayer: StoryLayer = {
      id: 'layer_sticker_' + Math.random().toString(36).substring(2, 9),
      type: 'sticker',
      value: stickerValue,
      x: 50,
      y: 50,
      scale: 1.2,
      rotation: 0,
      opacity: 1.0,
      name: 'Sticker ' + (currentPage.layers.filter(l => l.type === 'sticker').length + 1),
      stickerType
    };

    const nextPages = [...pages];
    nextPages[currentPageIndex] = {
      ...currentPage,
      layers: [...currentPage.layers, newLayer]
    };
    updatePages(nextPages);
    setActiveLayerIds([newLayer.id]);
  };

  const handleUpdateLayer = (layerId: string, updates: Partial<StoryLayer>) => {
    const nextLayers = currentPage.layers.map(l => {
      if (l.id === layerId) {
        return { ...l, ...updates };
      }
      return l;
    });
    const nextPages = [...pages];
    nextPages[currentPageIndex] = { ...currentPage, layers: nextLayers };
    updatePages(nextPages);
  };

  // Layer ordering & actions
  const changeLayerDepth = (layerId: string, direction: 'forward' | 'backward' | 'top' | 'bottom') => {
    const idx = currentPage.layers.findIndex(l => l.id === layerId);
    if (idx === -1) return;

    const layers = [...currentPage.layers];
    const item = layers.splice(idx, 1)[0];

    if (direction === 'forward') {
      layers.splice(Math.min(layers.length, idx + 1), 0, item);
    } else if (direction === 'backward') {
      layers.splice(Math.max(0, idx - 1), 0, item);
    } else if (direction === 'top') {
      layers.push(item);
    } else if (direction === 'bottom') {
      layers.unshift(item);
    }

    const nextPages = [...pages];
    nextPages[currentPageIndex] = { ...currentPage, layers };
    updatePages(nextPages);
  };

  const handleDeleteLayer = (layerId: string) => {
    const nextLayers = currentPage.layers.filter(l => l.id !== layerId);
    const nextPages = [...pages];
    nextPages[currentPageIndex] = { ...currentPage, layers: nextLayers };
    updatePages(nextPages);
    setActiveLayerIds(activeLayerIds.filter(id => id !== layerId));
  };

  const handleDuplicateLayer = (layer: StoryLayer) => {
    const newLayer: StoryLayer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: 'duplicated_' + Math.random().toString(36).substring(2, 9),
      x: Math.min(90, layer.x + 5),
      y: Math.min(90, layer.y + 5),
      name: layer.name + ' (Copy)'
    };
    
    const nextPages = [...pages];
    nextPages[currentPageIndex] = { ...currentPage, layers: [...currentPage.layers, newLayer] };
    updatePages(nextPages);
    setActiveLayerIds([newLayer.id]);
  };

  // --- Dragging & Interactive Control Logics ---

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (!canvasContainerRef.current) return { x: 0, y: 0 };
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e && (e as any).touches && (e as any).touches.length > 0 ? (e as any).touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e && (e as any).touches && (e as any).touches.length > 0 ? (e as any).touches[0].clientY : (e as any).clientY;
    
    // Relative coordinates scaled from 0 to 100 within 9:16 aspect box
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y, screenX: clientX, screenY: clientY };
  };

  const handleLayerPointerDown = (e: React.PointerEvent, layer: StoryLayer) => {
    if (drawMode) return;
    e.stopPropagation(); // Prevents canvas background deselect from firing
    
    if (layer.isLocked) return;

    const coords = getCanvasCoords(e);
    const x = coords.x;
    const y = coords.y;

    const isShift = e.shiftKey;
    let newActiveIds = [...activeLayerIds];
    if (isShift) {
      if (activeLayerIds.includes(layer.id)) {
        newActiveIds = activeLayerIds.filter(id => id !== layer.id);
      } else {
        newActiveIds = [...activeLayerIds, layer.id];
      }
    } else {
      if (!activeLayerIds.includes(layer.id)) {
        newActiveIds = [layer.id];
      }
    }
    setActiveLayerIds(newActiveIds);

    // Start dragging
    setDragStart({ x, y });
    const initialPos: Record<string, { x: number; y: number }> = {};
    currentPage.layers.forEach(l => {
      if (newActiveIds.includes(l.id) || l.id === layer.id) {
        initialPos[l.id] = { x: l.x, y: l.y };
      }
    });
    setLayerStartPos(initialPos);
  };

  const handleCanvasPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (drawMode) return;
    
    // Multi-touch handling (e.g. pinch to zoom/rotate) can be expanded here
    const { x, y } = getCanvasCoords(e);
    
    // Find clicked layer (from top depth to bottom)
    const clickedLayer = [...currentPage.layers]
      .reverse()
      .find(l => {
        if (l.isHidden) return false;
        // Basic rectangular/radial collision detection
        const dist = Math.hypot(l.x - x, l.y - y);
        return dist < 12 * l.scale; // simple tap target radius
      });

    if (clickedLayer) {
      const isShift = 'shiftKey' in e && e.shiftKey;
      if (isShift) {
        if (activeLayerIds.includes(clickedLayer.id)) {
          setActiveLayerIds(activeLayerIds.filter(id => id !== clickedLayer.id));
        } else {
          setActiveLayerIds([...activeLayerIds, clickedLayer.id]);
        }
      } else {
        if (!activeLayerIds.includes(clickedLayer.id)) {
          setActiveLayerIds([clickedLayer.id]);
        }
      }

      if (!clickedLayer.isLocked) {
        setDragStart({ x, y });
        // Save initial positions of all active layers
        const initialPos: Record<string, { x: number; y: number }> = {};
        currentPage.layers.forEach(l => {
          if (activeLayerIds.includes(l.id) || l.id === clickedLayer.id) {
            initialPos[l.id] = { x: l.x, y: l.y };
          }
        });
        setLayerStartPos(initialPos);
      }
    } else {
      // Tap outside clears selection
      setActiveLayerIds([]);
    }
  };

  const handleCanvasPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (drawMode) return;

    const { x, y } = getCanvasCoords(e);

    // --- 1. Layer Drag and Snap ---
    if (dragStart && Object.keys(layerStartPos).length > 0) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      const nextLayers = currentPage.layers.map(l => {
        const start = layerStartPos[l.id];
        if (start && !l.isLocked) {
          let newX = start.x + dx;
          let newY = start.y + dy;

          // Alignment Snapping to Guides (if moving only one element)
          if (Object.keys(layerStartPos).length === 1) {
            // Horizontal Center Snap (X = 50%)
            if (Math.abs(newX - 50) < 3.0) {
              newX = 50;
              setShowSnapV(true);
            } else {
              setShowSnapV(false);
            }

            // Vertical Center Snap (Y = 50%)
            if (Math.abs(newY - 50) < 3.0) {
              newY = 50;
              setShowSnapH(true);
            } else {
              setShowSnapH(false);
            }
          }

          return {
            ...l,
            x: Math.max(0, Math.min(100, newX)),
            y: Math.max(0, Math.min(100, newY))
          };
        }
        return l;
      });

      const nextPages = [...pages];
      nextPages[currentPageIndex] = { ...currentPage, layers: nextLayers };
      setPages(nextPages); // transient state update
    }

    // --- 2. Interactive Rotation and Scaling ---
    if (isRotatingScaling && rotateScaleStart) {
      const targetLayer = currentPage.layers.find(l => l.id === rotateScaleStart.layerId);
      if (targetLayer) {
        // Find coordinates of target center in client pixels
        if (canvasContainerRef.current) {
          const rect = canvasContainerRef.current.getBoundingClientRect();
          const targetCx = rect.left + (targetLayer.x / 100) * rect.width;
          const targetCy = rect.top + (targetLayer.y / 100) * rect.height;

          const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

          // Angle & Distance
          const currentAngle = Math.atan2(clientY - targetCy, clientX - targetCx);
          const currentDist = Math.hypot(clientX - targetCx, clientY - targetCy);

          const deltaAngle = ((currentAngle - rotateScaleStart.startAngle) * 180) / Math.PI;
          const scaleRatio = currentDist / rotateScaleStart.startDist;

          let newRot = rotateScaleStart.startRotation + deltaAngle;
          // Snap angle to nearest 15 degrees if shift key
          if ('shiftKey' in e && e.shiftKey) {
            newRot = Math.round(newRot / 15) * 15;
          }

          handleUpdateLayer(rotateScaleStart.layerId, {
            rotation: newRot,
            scale: Math.max(0.2, Math.min(8.0, rotateScaleStart.startScale * scaleRatio))
          });
        }
      }
    }
  };

  const handleCanvasPointerUp = () => {
    if (dragStart) {
      setDragStart(null);
      // Persist the final dragged positions into the history
      saveToHistory(pages);
    }
    if (isRotatingScaling) {
      setIsRotatingScaling(false);
      setRotateScaleStart(null);
      saveToHistory(pages);
    }
    setShowSnapH(false);
    setShowSnapV(false);
  };

  const startRotateScale = (e: React.MouseEvent | React.TouchEvent, layerId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const layer = currentPage.layers.find(l => l.id === layerId);
    if (!layer) return;

    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const targetCx = rect.left + (layer.x / 100) * rect.width;
      const targetCy = rect.top + (layer.y / 100) * rect.height;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const startAngle = Math.atan2(clientY - targetCy, clientX - targetCx);
      const startDist = Math.hypot(clientX - targetCx, clientY - targetCy);

      setIsRotatingScaling(true);
      setRotateScaleStart({
        layerId,
        cx: targetCx,
        cy: targetCy,
        startAngle,
        startDist,
        startScale: layer.scale,
        startRotation: layer.rotation
      });
    }
  };

  // --- Drawing overlay handling ---
  useEffect(() => {
    if (drawMode && drawingCanvasRef.current) {
      const canvas = drawingCanvasRef.current;
      // High-DPI canvas resolution matching standard 9:16 story (1080x1920)
      canvas.width = 1080;
      canvas.height = 1920;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawingCtxRef.current = ctx;
      }

      // Pre-draw any existing drawing layer
      if (currentPage.drawingDataUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx?.drawImage(img, 0, 0, 1080, 1920);
        };
        img.src = currentPage.drawingDataUrl;
      }
    }
  }, [drawMode, currentPageIndex]);

  const drawPointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingCanvasRef.current || !drawingCtxRef.current) return;
    setIsDrawing(true);

    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const canvasX = ((clientX - rect.left) / rect.width) * 1080;
    const canvasY = ((clientY - rect.top) / rect.height) * 1920;

    const ctx = drawingCtxRef.current;
    ctx.beginPath();
    ctx.moveTo(canvasX, canvasY);

    // Setup brush types & styles
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize * 4; // match high resolution 1080

    if (brushType === 'marker') {
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'source-over';
    } else if (brushType === 'highlighter') {
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = brushSize * 8; // thicker brush
      ctx.globalCompositeOperation = 'source-over';
    } else if (brushType === 'eraser') {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }

    const newStroke = {
      points: [{ x: canvasX, y: canvasY }],
      brushType,
      brushSize,
      brushColor,
    };
    setDrawStrokes([...drawStrokes, newStroke]);
    setRedoStrokes([]);
  };

  const drawPointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingCanvasRef.current || !drawingCtxRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const canvasX = ((clientX - rect.left) / rect.width) * 1080;
    const canvasY = ((clientY - rect.top) / rect.height) * 1920;

    const ctx = drawingCtxRef.current;
    ctx.lineTo(canvasX, canvasY);
    ctx.stroke();

    const currentStroke = [...drawStrokes];
    const last = currentStroke[currentStroke.length - 1];
    if (last) {
      last.points.push({ x: canvasX, y: canvasY });
      setDrawStrokes(currentStroke);
    }
  };

  const drawPointerUp = () => {
    setIsDrawing(false);
    if (drawingCanvasRef.current) {
      const dataUrl = drawingCanvasRef.current.toDataURL();
      const nextPages = [...pages];
      nextPages[currentPageIndex] = { ...currentPage, drawingDataUrl: dataUrl };
      setPages(nextPages);
    }
  };

  const handleClearDrawing = () => {
    if (!drawingCanvasRef.current || !drawingCtxRef.current) return;
    const ctx = drawingCtxRef.current;
    ctx.clearRect(0, 0, 1080, 1920);
    setDrawStrokes([]);
    setRedoStrokes([]);

    const nextPages = [...pages];
    nextPages[currentPageIndex] = { ...currentPage, drawingDataUrl: undefined };
    updatePages(nextPages);
  };

  const handleExitDrawMode = () => {
    setDrawMode(false);
    saveToHistory(pages);
  };

  // --- Media Pipeline: Upload and Transcode (Simulation) ---

  const validateFile = (file: File): boolean => {
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB video, 10MB image

    if (file.size > maxSize) {
      setMediaUploadError(`ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${isVideo ? '50MB' : '10MB'})`);
      return false;
    }
    return true;
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, isBg: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaUploadError(null);
    if (!validateFile(file)) return;

    const isVideo = file.type.startsWith('video/');
    setMediaUploadProgress(10);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setMediaUploadProgress(Math.round((event.loaded / event.total) * 90));
      }
    };

    reader.onload = (event) => {
      const resultUrl = event.target?.result as string;
      setMediaUploadProgress(100);

      if (isVideo) {
        // Standard video compression/codec simulation workflow
        setTranscodingProgress(20);
        const transcodeTimer = setInterval(() => {
          setTranscodingProgress(p => {
            if (p !== null && p >= 100) {
              clearInterval(transcodeTimer);
              setTimeout(() => {
                setTranscodingProgress(null);
                setMediaUploadProgress(null);
                applyMediaToLayer(resultUrl, 'video', isBg);
              }, 400);
              return 100;
            }
            return (p || 0) + 20;
          });
        }, 300);
      } else {
        setTimeout(() => {
          setMediaUploadProgress(null);
          applyMediaToLayer(resultUrl, 'image', isBg);
        }, 500);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyMediaToLayer = (url: string, type: 'image' | 'video', isBg: boolean) => {
    if (isBg) {
      const nextPages = [...pages];
      nextPages[currentPageIndex] = {
        ...currentPage,
        background: { type, value: url }
      };
      updatePages(nextPages);
    } else {
      const newLayer: StoryLayer = {
        id: 'layer_media_' + Math.random().toString(36).substring(2, 9),
        type,
        value: url,
        x: 50,
        y: 50,
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        name: (type === 'image' ? 'Image ' : 'Video ') + (currentPage.layers.filter(l => l.type === type).length + 1)
      };

      const nextPages = [...pages];
      nextPages[currentPageIndex] = {
        ...currentPage,
        layers: [...currentPage.layers, newLayer]
      };
      updatePages(nextPages);
      setActiveLayerIds([newLayer.id]);
    }
  };

  // --- Multi-page / Timeline Controls ---

  const handleAddPage = () => {
    const newPage: StoryPage = {
      id: 'page_new_' + Math.random().toString(36).substring(2, 9),
      duration: 5,
      background: { type: 'gradient', value: PRESET_GRADIENTS[Math.floor(Math.random() * PRESET_GRADIENTS.length)] },
      layers: []
    };
    const nextPages = [...pages, newPage];
    updatePages(nextPages);
    setCurrentPageIndex(nextPages.length - 1);
    setActiveLayerIds([]);
  };

  const handleDuplicatePage = (idx: number) => {
    const pageToDup = pages[idx];
    if (!pageToDup) return;

    const dupedPage: StoryPage = {
      ...JSON.parse(JSON.stringify(pageToDup)),
      id: 'page_dupe_' + Math.random().toString(36).substring(2, 9)
    };

    const nextPages = [...pages];
    nextPages.splice(idx + 1, 0, dupedPage);
    updatePages(nextPages);
    setCurrentPageIndex(idx + 1);
  };

  const handleDeletePage = (idx: number) => {
    if (pages.length <= 1) return; // Must have at least one page
    const nextPages = pages.filter((_, i) => i !== idx);
    updatePages(nextPages);
    setCurrentPageIndex(Math.max(0, idx - 1));
    setActiveLayerIds([]);
  };

  const reorderPages = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pages.length) return;
    const nextPages = [...pages];
    const [moved] = nextPages.splice(fromIdx, 1);
    nextPages.splice(toIdx, 0, moved);
    updatePages(nextPages);
    setCurrentPageIndex(toIdx);
  };

  // --- Sequential Playback Preview System ---

  useEffect(() => {
    let playTimer: NodeJS.Timeout;
    if (isPlaying) {
      const interval = 100; // tick every 100ms
      playTimer = setInterval(() => {
        setPlaybackTime(t => {
          const totalDuration = pages.reduce((sum, p) => sum + p.duration, 0);
          const nextTime = t + 0.1;

          if (nextTime >= totalDuration) {
            setIsPlaying(false);
            setPlayerProgress(100);
            return 0;
          }

          // Calculate current page index based on cumulative playbackTime
          let accumulated = 0;
          let activeIndex = 0;
          for (let i = 0; i < pages.length; i++) {
            accumulated += pages[i].duration;
            if (nextTime <= accumulated) {
              activeIndex = i;
              break;
            }
          }
          if (activeIndex !== currentPageIndex) {
            setCurrentPageIndex(activeIndex);
          }

          setPlayerProgress((nextTime / totalDuration) * 100);
          return nextTime;
        });
      }, interval);
    }
    return () => clearInterval(playTimer);
  }, [isPlaying, pages, currentPageIndex]);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setPlaybackTime(0);
      setCurrentPageIndex(0);
      setIsPlaying(true);
    }
  };

  // --- Premium Story Canvas Exporter (PNG/WEBP and MediaRecorder Video Export) ---

  const handleExportPNG = async () => {
    setExporting(true);
    setExportProgress(20);
    setExportError(null);

    try {
      // Setup rendering on virtual canvas
      const canvas = exportCanvasRef.current;
      if (!canvas) throw new Error('Export canvas not initialized');

      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get 2D export context');

      // 1. Draw Background
      setExportProgress(40);
      await drawPageToCanvas(currentPage, ctx, canvas.width, canvas.height);

      setExportProgress(80);
      // Generate Download link
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `shush_story_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setExportProgress(100);
      setTimeout(() => setExporting(false), 500);
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
    }
  };

  const handleExportVideoMP4 = async () => {
    setExporting(true);
    setExportProgress(10);
    setExportError(null);

    try {
      const canvas = exportCanvasRef.current;
      if (!canvas) throw new Error('Export canvas not ready');

      canvas.width = 720; // 720x1280 for efficient client-side rendering
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot acquire canvas context');

      // Native Canvas capture stream at 30 FPS
      const stream = canvas.captureStream(30);
      
      // Determine fully supported mimeType for recording on this client
      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          chunks.push(evt.data);
        }
      };

      recorder.onstop = () => {
        setExportProgress(95);
        const videoBlob = new Blob(chunks, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        const link = document.createElement('a');
        link.download = `shush_story_video_${Date.now()}.mp4`;
        link.href = videoUrl;
        link.click();

        setExportProgress(100);
        setTimeout(() => {
          setExporting(false);
          setExportProgress(0);
        }, 600);
      };

      recorder.start();

      // Sequentially play and render each page of the timeline
      const totalDuration = pages.reduce((sum, p) => sum + p.duration, 0);
      let elapsed = 0;
      const fps = 30;
      const totalFrames = totalDuration * fps;
      let frameCount = 0;

      const renderNextFrame = async () => {
        if (frameCount >= totalFrames) {
          recorder.stop();
          return;
        }

        // Determine current frame page target
        const currentTime = frameCount / fps;
        let accumulated = 0;
        let targetPage = pages[0];
        for (const p of pages) {
          accumulated += p.duration;
          if (currentTime <= accumulated) {
            targetPage = p;
            break;
          }
        }

        // Draw current frame target page
        await drawPageToCanvas(targetPage, ctx, canvas.width, canvas.height);

        // Update progress
        frameCount++;
        setExportProgress(Math.round((frameCount / totalFrames) * 85));

        // Wait next frame tick
        requestAnimationFrame(renderNextFrame);
      };

      renderNextFrame();

    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'ไม่สามารถบันทึกวิดีโอได้');
      setExporting(false);
    }
  };

  // Pure Canvas drawer helper
  const drawPageToCanvas = async (page: StoryPage, ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> => {
    ctx.clearRect(0, 0, width, height);

    // Background
    if (page.background.type === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      // Map basic gradients
      if (page.background.value.includes('indigo-600')) {
        gradient.addColorStop(0, '#4f46e5');
        gradient.addColorStop(0.5, '#9333ea');
        gradient.addColorStop(1, '#db2777');
      } else if (page.background.value.includes('emerald-400')) {
        gradient.addColorStop(0, '#34d399');
        gradient.addColorStop(1, '#06b6d4');
      } else {
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#090d16');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (page.background.type === 'color') {
      ctx.fillStyle = page.background.value;
      ctx.fillRect(0, 0, width, height);
    } else if ((page.background.type === 'image' || page.background.type === 'video') && page.background.value) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => resolve(); // continue on fail
        img.src = page.background.value;
      });
    }

    // Custom Canvas Drawings
    if (page.drawingDataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = page.drawingDataUrl!;
      });
    }

    // Render layers
    for (const l of page.layers) {
      if (l.isHidden) continue;

      ctx.save();
      // Calculate pixel translation from percentage
      const lx = (l.x / 100) * width;
      const ly = (l.y / 100) * height;

      ctx.translate(lx, ly);
      ctx.rotate((l.rotation * Math.PI) / 180);
      ctx.scale(l.scale, l.scale);
      ctx.globalAlpha = l.opacity;

      if (l.type === 'text') {
        ctx.fillStyle = l.color || '#ffffff';
        const fontSize = l.fontSize ? l.fontSize * 1.5 : 36;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw basic shadow for readability
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        ctx.fillText(l.value, 0, 0);
      } else if (l.type === 'image' || l.type === 'sticker') {
        // Emojis or animated stickers values can be painted as text
        if (l.stickerType === 'emoji' || l.value.length <= 4) {
          ctx.font = '72px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(l.value, 0, 0);
        } else {
          // Custom uploaded images
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            img.onload = () => {
              const sw = 180;
              const sh = (img.height / img.width) * sw;
              ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = l.value;
          });
        }
      }
      ctx.restore();
    }
  };

  // --- Publishing Flow ---

  const handlePostStory = async () => {
    // Generate high-resolution compiled cover page to send to server
    try {
      const canvas = exportCanvasRef.current;
      if (!canvas) return;
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await drawPageToCanvas(pages[0], ctx, 1080, 1920);
      const coverUrl = canvas.toDataURL('image/jpeg', 0.85);

      clearDraft(); // remove draft from local IndexedDB/localStorage upon success

      onPost({
        mediaType: pages[0].background.type === 'video' ? 'video' : 'image',
        mediaUrl: coverUrl,
        text: pages[0].layers.find(l => l.type === 'text')?.value || '',
        backgroundColor: pages[0].background.type === 'gradient' ? pages[0].background.value : undefined,
        audienceType,
        targetCircleName: audienceType === 'CIRCLE' ? targetCircleName : undefined,
        targetBffGroupId: audienceType === 'BFF_GROUP' ? targetBffGroupId : undefined
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Filter stickers based on search query
  const filteredStickers = BUILTIN_STICKERS.filter(s => 
    s.label.toLowerCase().includes(stickerQuery.toLowerCase()) || 
    s.value.includes(stickerQuery)
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#0C0A14] flex flex-col md:flex-row text-white overflow-hidden"
    >
      {/* Hidden Export Canvas */}
      <canvas ref={exportCanvasRef} className="hidden" />

      {/* Draft Restore Popup Notification */}
      <AnimatePresence>
        {draftRestored && (
          <motion.div 
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#6366f1] border border-white/20 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>กู้คืนฉบับร่างของคุณล่าสุดสำเร็จ 📝</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- LEFT SIDEBAR: Timeline & Pages Navigation (Desktop) --- */}
      <div className="hidden md:flex flex-col w-64 bg-[#141221] border-r border-white/5 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <span className="text-xs font-black tracking-wider text-white/40 uppercase">Story Timeline</span>
          <button 
            onClick={handleAddPage}
            className="p-1.5 bg-[#6366f1] hover:bg-[#5053df] active:scale-95 rounded-lg text-white transition-all flex items-center gap-1 text-[11px] font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มหน้า
          </button>
        </div>

        {/* Thumbnail / Page Blocks */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {pages.map((page, idx) => (
            <div 
              key={page.id}
              onClick={() => {
                setCurrentPageIndex(idx);
                setActiveLayerIds([]);
              }}
              className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                currentPageIndex === idx 
                  ? 'bg-[#1D1A35] border-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.2)]' 
                  : 'bg-[#181628] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white/50">หน้า {idx + 1}</span>
                <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-md font-mono text-white/80">{page.duration} วิ</span>
              </div>

              {/* 9:16 Miniature Placeholder */}
              <div className={`aspect-[9/16] w-full max-w-[120px] mx-auto rounded-lg overflow-hidden relative border border-white/10 ${
                page.background.type === 'gradient' ? `bg-gradient-to-br ${page.background.value}` : 'bg-zinc-800'
              }`} style={{ backgroundColor: page.background.type === 'color' ? page.background.value : undefined }}>
                {page.background.type === 'image' && page.background.value && (
                  <img src={page.background.value} className="w-full h-full object-cover" />
                )}
                {page.background.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Video className="w-5 h-5 text-white/40" /></div>
                )}
                
                {/* Visual miniature elements layer count overlay */}
                <div className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-mono opacity-80 text-white flex items-center gap-0.5">
                  <Layers className="w-2.5 h-2.5" />
                  {page.layers.length}
                </div>
              </div>

              {/* Duplicate/Delete Hover Buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDuplicatePage(idx); }}
                  className="p-1 bg-[#1A182E] hover:bg-[#25223e] border border-white/10 rounded-lg text-white/70 hover:text-white"
                  title="ทำซ้ำ"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                  className="p-1 bg-[#1A182E] hover:bg-rose-950 border border-white/10 rounded-lg text-rose-400 hover:text-rose-200"
                  title="ลบหน้านี้"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Global duration summary */}
        <div className="mt-auto pt-3 border-t border-white/5 space-y-2">
          <div className="flex justify-between text-xs text-white/50">
            <span>สตอรี่ทั้งหมด:</span>
            <span className="font-bold text-white">{pages.length} หน้า</span>
          </div>
          <div className="flex justify-between text-xs text-white/50">
            <span>เวลารวม:</span>
            <span className="font-bold text-white">{pages.reduce((sum, p) => sum + p.duration, 0)} วินาที</span>
          </div>
        </div>
      </div>

      {/* --- CENTER AREA: Main Story Editor Canvas Workspace --- */}
      <div className="flex-1 flex flex-col relative bg-[#090810]">
        
        {/* Workspace Controls Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0C0A14] relative z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/60">
                {autoSaveStatus === 'saving' ? 'บันทึกอัตโนมัติ...' : 'บันทึกแล้ว'}
              </span>
            </div>
          </div>

          {/* Interactive Zoom and Quick Playback controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setZoomScale(s => Math.max(0.6, s - 0.1))} 
              className="p-1.5 hover:bg-white/5 rounded-lg text-white/60 hover:text-white"
              title="ย่อขนาดพื้นที่งาน"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-white/40">{Math.round(zoomScale * 100)}%</span>
            <button 
              onClick={() => setZoomScale(s => Math.min(1.5, s + 0.1))} 
              className="p-1.5 hover:bg-white/5 rounded-lg text-white/60 hover:text-white"
              title="ขยายขนาดพื้นที่งาน"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <button 
              onClick={handleUndo} 
              disabled={historyIndex <= 0}
              className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="เลิกทำ (Undo)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRedo} 
              disabled={historyIndex >= historyStack.length - 1}
              className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="ทำซ้ำ (Redo)"
            >
              <Redo className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDrawMode(!drawMode)} 
              className={`p-2 rounded-lg transition-all ${drawMode ? 'bg-[#6366f1] text-white font-bold' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
              title="เขียน/วาดรูปหน้าจอ"
            >
              <PenTool className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Drawing Toolbar overlay if active */}
        <AnimatePresence>
          {drawMode && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#161426] border border-white/10 px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 animate-fadeIn"
            >
              <div className="flex gap-2">
                {(['pen', 'marker', 'highlighter', 'eraser'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setBrushType(type)}
                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                      brushType === type ? 'bg-[#6366f1] text-white' : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {type === 'pen' && '✏️ ดินสอ'}
                    {type === 'marker' && '🖌️ มาร์กเกอร์'}
                    {type === 'highlighter' && '🎨 ไฮไลท์'}
                    {type === 'eraser' && '🧼 ยางลบ'}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/50">ขนาด:</span>
                <input 
                  type="range" 
                  min="2" max="40" 
                  value={brushSize}
                  onChange={e => setBrushSize(parseInt(e.target.value))}
                  className="w-20 accent-[#6366f1]"
                />
              </div>

              {brushType !== 'eraser' && (
                <>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex gap-1.5">
                    {['#ffffff', '#000000', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'].map(c => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        className={`w-4 h-4 rounded-full border transition-transform ${brushColor === c ? 'scale-125 border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </>
              )}

              <div className="h-4 w-px bg-white/10" />
              <button 
                onClick={handleClearDrawing} 
                className="p-1 hover:bg-rose-950/40 rounded text-rose-400 hover:text-rose-200 text-xs font-bold"
              >
                ล้างทั้งหมด
              </button>
              <button 
                onClick={handleExitDrawMode} 
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-full text-xs font-bold text-white"
              >
                บันทึกภาพวาด
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MAIN STAGE CONTAINER --- */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-3 sm:p-6 relative">
          
          <div 
            ref={canvasContainerRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            className={`relative aspect-[9/16] w-full max-w-[340px] md:max-w-[380px] bg-zinc-950 rounded-[32px] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)] border border-white/5 ${
              currentPage.background.type === 'gradient' ? `bg-gradient-to-br ${currentPage.background.value}` : ''
            }`}
            style={{ 
              transform: `scale(${zoomScale})`,
              transition: 'transform 0.1s ease',
              backgroundColor: currentPage.background.type === 'color' ? currentPage.background.value : undefined 
            }}
          >
            {/* Background Image / Video render */}
            {currentPage.background.type === 'image' && currentPage.background.value && (
              <img src={currentPage.background.value} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            )}
            {currentPage.background.type === 'video' && currentPage.background.value && (
              <video 
                src={currentPage.background.value} 
                autoPlay muted loop playsInline 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
              />
            )}

            {/* Solid Overlay representing Safe Areas */}
            <div className="absolute inset-x-0 top-12 bottom-16 border border-dashed border-white/10 pointer-events-none z-10 rounded-[24px]">
              <div className="absolute top-2 left-3 bg-black/40 backdrop-blur-md text-[8px] tracking-widest text-white/30 uppercase px-2 py-0.5 rounded-full font-mono">
                Standard Mobile Safe Area
              </div>
            </div>

            {/* Smart Snap Axis Guides */}
            {showSnapV && <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-dashed border-l border-[#ff2a6d] z-30 pointer-events-none" />}
            {showSnapH && <div className="absolute inset-y-0 top-1/2 -translate-y-1/2 h-[1px] bg-dashed border-t border-[#ff2a6d] w-full z-30 pointer-events-none" />}

            {/* --- LAYERS RENDER ENGINE --- */}
            {currentPage.layers.map(layer => {
              if (layer.isHidden) return null;
              const isSelected = activeLayerIds.includes(layer.id);
              
              return (
                <div
                  key={layer.id}
                  onPointerDown={(e) => handleLayerPointerDown(e, layer)}
                  style={{
                    position: 'absolute',
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
                    cursor: layer.isLocked ? 'not-allowed' : 'move',
                    zIndex: isSelected ? 40 : 20,
                    opacity: layer.opacity,
                    userSelect: 'none',
                    touchAction: 'none'
                  }}
                  className={`group relative ${isSelected ? 'ring-2 ring-[#6366f1] ring-offset-2 ring-offset-transparent rounded-lg p-2' : ''}`}
                >
                  {/* Lock Indicator */}
                  {layer.isLocked && (
                    <div className="absolute -top-3 -left-3 bg-[#1e1b4b] border border-white/10 text-white p-1 rounded-full scale-75 z-40">
                      <Lock className="w-3 h-3 text-white/60" />
                    </div>
                  )}

                  {/* Render content based on type */}
                  {layer.type === 'text' && (
                    <div 
                      className={`font-bold tracking-tight select-none leading-normal select-none outline-none break-words max-w-[280px] text-center ${layer.fontFamily}`}
                      style={{ 
                        color: layer.color, 
                        fontSize: `${layer.fontSize}px`,
                        textAlign: layer.textAlign,
                        textShadow: layer.textBgStyle === 'glow' ? `0 0 16px ${layer.color}` : '2px 2px 8px rgba(0,0,0,0.5)',
                        border: layer.textBgStyle === 'outline' ? `2px solid ${layer.textBgColor || '#000'}` : undefined,
                        backgroundColor: layer.textBgStyle === 'solid' ? layer.textBgColor || 'rgba(0,0,0,0.6)' : undefined,
                        padding: layer.textBgStyle === 'solid' ? '6px 12px' : undefined,
                        borderRadius: layer.textBgStyle === 'solid' ? '12px' : undefined,
                      }}
                    >
                      {layer.value}
                    </div>
                  )}

                  {layer.type === 'image' && (
                    <img 
                      src={layer.value} 
                      className="w-36 h-auto max-h-48 object-contain rounded-xl select-none"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {layer.type === 'sticker' && (
                    <div className="select-none text-6xl flex items-center justify-center">
                      {layer.value}
                    </div>
                  )}

                  {layer.type === 'video' && (
                    <video 
                      src={layer.value} 
                      autoPlay muted loop playsInline 
                      className="w-36 h-auto object-contain rounded-xl select-none" 
                    />
                  )}

                  {/* Interactive Adjustment Handles (Only when focused and unlocked) */}
                  {isSelected && !layer.isLocked && (
                    <>
                      {/* Top Right: Rotation & Scaling Handle */}
                      <div 
                        onPointerDown={(e) => startRotateScale(e, layer.id)}
                        className="absolute -top-3 -right-3 w-6 h-6 bg-white text-zinc-900 rounded-full border border-zinc-900 flex items-center justify-center cursor-pointer scale-90 hover:scale-105 active:scale-95 shadow-xl"
                        title="หมุนและย่อขยาย"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </div>

                      {/* Top Left: Quick Delete */}
                      <button 
                        onClick={() => handleDeleteLayer(layer.id)}
                        className="absolute -top-3 -left-3 w-6 h-6 bg-rose-600 border border-rose-700 text-white rounded-full flex items-center justify-center cursor-pointer scale-90 hover:scale-105"
                        title="ลบเลเยอร์"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Bottom Left: Quick Duplicate */}
                      <button 
                        onClick={() => handleDuplicateLayer(layer)}
                        className="absolute -bottom-3 -left-3 w-6 h-6 bg-zinc-800 border border-white/10 text-white rounded-full flex items-center justify-center cursor-pointer scale-90 hover:scale-105"
                        title="ทำซ้ำเลเยอร์"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Drawing Layer over active layers */}
            {currentPage.drawingDataUrl && !drawMode && (
              <img 
                src={currentPage.drawingDataUrl} 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-35" 
              />
            )}

            {/* Active Drawing Overlay Canvas */}
            <canvas
              ref={drawingCanvasRef}
              onMouseDown={drawPointerDown}
              onMouseMove={drawPointerMove}
              onMouseUp={drawPointerUp}
              onMouseLeave={drawPointerUp}
              onTouchStart={drawPointerDown}
              onTouchMove={drawPointerMove}
              onTouchEnd={drawPointerUp}
              className={`absolute inset-0 w-full h-full object-contain z-35 ${drawMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none hidden'}`}
            />
          </div>
        </div>

        {/* --- EXPORTING OVERLAY STATUS MODAL --- */}
        <AnimatePresence>
          {exporting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#141221] border border-white/10 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
              >
                <div className="relative w-20 h-20 mx-auto">
                  {/* Radial progress ring */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" stroke="currentColor" className="text-white/10" strokeWidth="4" fill="transparent" />
                    <circle cx="40" cy="40" r="34" stroke="currentColor" className="text-[#6366f1]" strokeWidth="4" fill="transparent" 
                            strokeDasharray={213.6} strokeDashoffset={213.6 - (213.6 * exportProgress) / 100} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono font-black text-white">{exportProgress}%</span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg">กำลังประมวลผลวิดีโอสตอรี่ของคุณ</h3>
                  <p className="text-xs text-white/60 leading-relaxed">โปรดอย่าปิดหน้าจอนี้ ระบบกำลังบีบอัดวิดีโอและรวมทุกองค์ประกอบด้วยเฟรมระดับสูงเบื้องหลัง</p>
                </div>

                {exportError && (
                  <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-400">
                    {exportError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => setExporting(false)} 
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-xs font-bold transition-all"
                  >
                    ยกเลิกการส่งออก
                  </button>
                  {exportError && (
                    <button 
                      onClick={handleExportVideoMP4} 
                      className="flex-1 py-2.5 bg-[#6366f1] hover:bg-[#5053df] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> ลองใหม่
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- BOTTOM ROW: Timeline / Page Sequencer controls (Mobile & Desktop Player) --- */}
        <div className="bg-[#0C0A14] border-t border-white/5 p-4 relative z-20">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4">
            
            {/* Player Seek & Timeline controls */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={togglePlayback}
                className="w-10 h-10 bg-white hover:bg-zinc-200 active:scale-90 rounded-full flex items-center justify-center text-zinc-950 shadow-xl transition-all"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              
              <div className="flex-1 md:w-48 bg-white/5 border border-white/10 h-2 rounded-full relative overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-100 ease-linear"
                  style={{ width: `${playerProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-white/50">{playbackTime.toFixed(1)}s</span>
            </div>

            {/* Quick selector of active slide duration */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-2 w-full md:w-auto">
              <span className="text-xs text-white/60 font-medium">ความยาวหน้า:</span>
              <input 
                type="range" 
                min="1" max="15" 
                value={currentPage.duration}
                onChange={e => {
                  const nextPages = [...pages];
                  nextPages[currentPageIndex] = { ...currentPage, duration: parseInt(e.target.value) };
                  updatePages(nextPages);
                }}
                className="w-24 accent-[#6366f1]"
              />
              <span className="text-xs font-mono font-bold text-[#6366f1]">{currentPage.duration}s</span>
            </div>

            {/* Layout Export Panel */}
            <div className="flex gap-2 w-full md:w-auto md:ml-auto">
              <button 
                onClick={handleExportPNG}
                className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/15 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                title="ดาวน์โหลดภาพนิ่ง PNG"
              >
                <Download className="w-3.5 h-3.5" /> บันทึกภาพ
              </button>
              <button 
                onClick={handleExportVideoMP4}
                className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                title="ดาวน์โหลดวิดีโอ MP4"
              >
                <Video className="w-3.5 h-3.5" /> ส่งออกวิดีโอ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDEBAR: Content Creation Toolbar Panel (Gradients, Text Styles, Stickers, Layers list) --- */}
      <div className="w-full md:w-80 bg-[#0E0C16] border-t md:border-t-0 md:border-l border-white/5 flex flex-col flex-shrink-0 z-20">
        
        {/* Editor Category Tabs */}
        <div className="flex bg-[#110F1D] border-b border-white/5">
          {([
            { id: 'text', label: 'ข้อความ', icon: Type },
            { id: 'stickers', label: 'สติกเกอร์', icon: Smile },
            { id: 'bg', label: 'พื้นหลัง', icon: Palette },
            { id: 'layers', label: 'เลเยอร์', icon: Layers }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setEditorTab(tab.id)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1 border-b-2 text-[10px] font-bold tracking-wide transition-all ${
                editorTab === tab.id 
                  ? 'border-[#6366f1] text-[#6366f1] bg-[#141223]' 
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents Drawer Panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          
          {/* 1. TEXT TAB CONTROLS */}
          {editorTab === 'text' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black tracking-wider uppercase text-white/40">เนื้อหาข้อความ</label>
                <button 
                  onClick={handleAddTextLayer}
                  className="w-full py-2.5 bg-[#6366f1] hover:bg-[#5053df] active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" /> สร้างเลเยอร์ข้อความใหม่
                </button>
              </div>

              {/* Dynamic properties adjustments for current text layer */}
              {activeLayerIds.length > 0 && currentPage.layers.find(l => activeLayerIds.includes(l.id) && l.type === 'text') ? (
                (() => {
                  const activeTextLayer = currentPage.layers.find(l => activeLayerIds.includes(l.id) && l.type === 'text')!;
                  return (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold text-[#6366f1] flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5" /> ปรับแต่งข้อความที่เลือก
                      </h4>
                      
                      {/* Live Text Editing Field */}
                      <textarea
                        value={activeTextLayer.value}
                        onChange={(e) => handleUpdateLayer(activeTextLayer.id, { value: e.target.value })}
                        className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#6366f1]"
                        rows={3}
                        placeholder="พิมพ์ข้อความที่นี่..."
                      />

                      {/* Font selector */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-white/50">ฟอนต์พิมพ์:</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {FONTS.map(f => (
                            <button
                              key={f.name}
                              onClick={() => handleUpdateLayer(activeTextLayer.id, { fontFamily: f.value })}
                              className={`p-1.5 rounded-lg text-[10px] font-bold border transition-all truncate text-center ${
                                activeTextLayer.fontFamily === f.value ? 'bg-[#6366f1]/20 border-[#6366f1] text-[#6366f1]' : 'bg-black/10 border-white/5 hover:border-white/10'
                              }`}
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Alignments */}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-white/50">การจัดวาง:</span>
                        <div className="flex gap-1">
                          {(['left', 'center', 'right'] as const).map(align => (
                            <button
                              key={align}
                              onClick={() => handleUpdateLayer(activeTextLayer.id, { textAlign: align })}
                              className={`px-3 py-1 text-[10px] rounded-lg border font-bold transition-all ${
                                activeTextLayer.textAlign === align ? 'bg-white text-zinc-950 border-white' : 'border-white/10 text-white/70 hover:bg-white/5'
                              }`}
                            >
                              {align === 'left' && 'ชิดซ้าย'}
                              {align === 'center' && 'กึ่งกลาง'}
                              {align === 'right' && 'ชิดขวา'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Background Styles */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-white/50">สไตล์พื้นหลังข้อความ:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'none', label: 'ปกติ' },
                            { id: 'solid', label: 'ทึบแสง' },
                            { id: 'glow', label: 'สะท้อนแสง' },
                          ].map(style => (
                            <button
                              key={style.id}
                              onClick={() => handleUpdateLayer(activeTextLayer.id, { textBgStyle: style.id as any })}
                              className={`p-1 text-[10px] rounded-lg border transition-all text-center ${
                                activeTextLayer.textBgStyle === style.id ? 'bg-[#6366f1]/20 border-[#6366f1]' : 'border-white/5 hover:bg-white/5'
                              }`}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text size Slider */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/50">ขนาดอักษร:</span>
                        <input 
                          type="range" 
                          min="12" max="60" 
                          value={activeTextLayer.fontSize || 24}
                          onChange={e => handleUpdateLayer(activeTextLayer.id, { fontSize: parseInt(e.target.value) })}
                          className="w-24 accent-[#6366f1]"
                        />
                      </div>

                      {/* Text Opacity Slider */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/50">ความโปร่งแสง:</span>
                        <input 
                          type="range" 
                          min="10" max="100" 
                          value={(activeTextLayer.opacity || 1.0) * 100}
                          onChange={e => handleUpdateLayer(activeTextLayer.id, { opacity: parseInt(e.target.value) / 100 })}
                          className="w-24 accent-[#6366f1]"
                        />
                      </div>

                      {/* Quick font color picker presets */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-white/50">สีอักษร:</span>
                        <div className="flex flex-wrap gap-1">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => handleUpdateLayer(activeTextLayer.id, { color: c })}
                              className={`w-5 h-5 rounded-full border border-white/20 transition-transform ${
                                activeTextLayer.color === c ? 'scale-125 border-white ring-1 ring-indigo-500' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center text-xs text-white/40">
                  แตะเลือกเลเยอร์ข้อความบนจอ เพื่อปรับแต่งสี ฟอนต์ ขนาด และสไตล์แบบเรียลไทม์ 🎨
                </div>
              )}
            </div>
          )}

          {/* 2. STICKERS & GIFS TAB */}
          {editorTab === 'stickers' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Filter / Search input */}
              <div className="relative">
                <input
                  type="text"
                  value={stickerQuery}
                  onChange={e => setStickerQuery(e.target.value)}
                  placeholder="ค้นหาสติกเกอร์, อิโมจิ..."
                  className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#6366f1]"
                />
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              </div>

              {/* Categorized Emojis list */}
              <div className="space-y-3">
                <span className="text-[10px] font-black tracking-wider uppercase text-white/40">สติกเกอร์สำเร็จรูปแสนรัก (Built-in Graphics)</span>
                <div className="grid grid-cols-4 gap-2">
                  {filteredStickers.map(sticker => (
                    <button
                      key={sticker.id}
                      onClick={() => handleAddSticker(sticker.value, sticker.type as any)}
                      className={`h-12 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-2xl ${sticker.color} bg-opacity-20 hover:bg-opacity-30`}
                      title={sticker.label}
                    >
                      {sticker.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 border-t border-white/5 pt-3">
                <span className="text-[10px] font-black tracking-wider uppercase text-white/40">อิโมจิยอดนิยม (Trending Emojis)</span>
                <div className="grid grid-cols-6 gap-2">
                  {['🥰', '🚀', '💖', '🎉', '☕', '🍭', '🐈', '🐶', '🍕', '🍰', '🌸', '🎁', '🎧', '👾', '🌈', '🔥', '💎', '💡'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleAddSticker(emoji, 'emoji')}
                      className="p-1 text-2xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. BACKGROUND PANEL */}
          {editorTab === 'bg' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Media File uploads for background cover */}
              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-wider uppercase text-white/40">อัปโหลดสื่อทำพื้นหลัง</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>รูปภาพ</span>
                  </button>
                  <button 
                    onClick={() => videoInputRef.current?.click()}
                    className="py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <Video className="w-4 h-4 text-indigo-400" />
                    <span>วิดีโอ (Trim 9:16)</span>
                  </button>
                </div>
                {/* Hidden input nodes */}
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, true)} />
                <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleMediaUpload(e, true)} />
              </div>

              {/* Upload loading/transcoding indicators */}
              {mediaUploadProgress !== null && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>กำลังประมวลผลไฟล์...</span>
                    <span>{mediaUploadProgress}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${mediaUploadProgress}%` }} />
                  </div>
                </div>
              )}

              {transcodingProgress !== null && (
                <div className="p-3 bg-[#1e1b4b]/40 border border-[#6366f1]/20 rounded-xl text-center space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-[#6366f1]">
                    <span>กำลังปรับขนาด/บีบอัด MP4 H.264...</span>
                    <span>{transcodingProgress}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${transcodingProgress}%` }} />
                  </div>
                </div>
              )}

              {mediaUploadError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mediaUploadError}</span>
                </div>
              )}

              {/* Preset Gradients browser */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <span className="text-[10px] font-black tracking-wider uppercase text-white/40">ไล่โทนสีพรีเมียม (Premium Gradients)</span>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_GRADIENTS.map(gradient => (
                    <button
                      key={gradient}
                      onClick={() => {
                        const nextPages = [...pages];
                        nextPages[currentPageIndex] = {
                          ...currentPage,
                          background: { type: 'gradient', value: gradient }
                        };
                        updatePages(nextPages);
                      }}
                      className={`h-12 rounded-xl bg-gradient-to-br ${gradient} border transition-all ${
                        currentPage.background.type === 'gradient' && currentPage.background.value === gradient 
                          ? 'border-white scale-110 ring-2 ring-indigo-500' 
                          : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Preset Solid colors */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <span className="text-[10px] font-black tracking-wider uppercase text-white/40">สีโทนทึบสุภาพ (Solid Colors)</span>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        const nextPages = [...pages];
                        nextPages[currentPageIndex] = {
                          ...currentPage,
                          background: { type: 'color', value: color }
                        };
                        updatePages(nextPages);
                      }}
                      className={`h-8 rounded-lg border transition-all ${
                        currentPage.background.type === 'color' && currentPage.background.value === color 
                          ? 'border-white scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. LAYERS OVERVIEW & OUTLINE */}
          {editorTab === 'layers' && (
            <div className="space-y-3 animate-fadeIn">
              <span className="text-[10px] font-black tracking-wider uppercase text-white/40">โครงสร้างเลเยอร์หน้านี้ ({currentPage.layers.length})</span>
              
              {currentPage.layers.length === 0 ? (
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center text-xs text-white/30">
                  ไม่มีองค์ประกอบตกแต่งอื่นในหน้านี้ คุณสามารถเพิ่ม ข้อความ รูปภาพ หรือ สติกเกอร์ จากแถบเมนูด้านบน 🎨
                </div>
              ) : (
                <div className="space-y-1.5">
                  {currentPage.layers.map((l, i) => {
                    const isSelected = activeLayerIds.includes(l.id);
                    return (
                      <div 
                        key={l.id}
                        onClick={() => setActiveLayerIds([l.id])}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-[#1C1931] border-[#6366f1]' : 'bg-black/10 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Type icons */}
                          <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                            {l.type === 'text' && <Type className="w-3.5 h-3.5" />}
                            {l.type === 'sticker' && <Smile className="w-3.5 h-3.5" />}
                            {(l.type === 'image' || l.type === 'video') && <ImageIcon className="w-3.5 h-3.5" />}
                          </div>
                          
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-white truncate">{l.name}</span>
                            <span className="block text-[8px] text-white/40 font-mono">
                              X: {Math.round(l.x)}% Y: {Math.round(l.y)}%
                            </span>
                          </div>
                        </div>

                        {/* Interactive toggle indicators */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Reorder depth */}
                          <button 
                            onClick={() => changeLayerDepth(l.id, 'forward')}
                            disabled={i === currentPage.layers.length - 1}
                            className="p-1 text-white/40 hover:text-white disabled:opacity-20"
                            title="ย้ายขึ้นหน้า"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => changeLayerDepth(l.id, 'backward')}
                            disabled={i === 0}
                            className="p-1 text-white/40 hover:text-white disabled:opacity-20"
                            title="ย้ายลงล่าง"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Lock / Unlock */}
                          <button 
                            onClick={() => handleUpdateLayer(l.id, { isLocked: !l.isLocked })}
                            className="p-1 hover:bg-white/5 rounded text-white/50 hover:text-white"
                          >
                            {l.isLocked ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Show / Hide */}
                          <button 
                            onClick={() => handleUpdateLayer(l.id, { isHidden: !l.isHidden })}
                            className="p-1 hover:bg-white/5 rounded text-white/50 hover:text-white"
                          >
                            {l.isHidden ? <EyeOff className="w-3.5 h-3.5 text-zinc-600" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => handleDeleteLayer(l.id)}
                            className="p-1 hover:bg-rose-950 rounded text-rose-400 hover:text-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- BOTTOM SECTION: Audience & Post buttons --- */}
        <div className="p-5 bg-[#121020] border-t border-white/5 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-white/40 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#6366f1]" /> ขอบเขตการเผยแพร่ (Audience Lens)
            </span>
            <div className="grid grid-cols-4 gap-1">
              {['PUBLIC', 'CIRCLE', 'BFF_GROUP', 'COUPLE'].map((type) => (
                <button
                  key={type}
                  onClick={() => setAudienceType(type as any)}
                  className={`py-1.5 rounded-lg text-[9px] font-black tracking-wide uppercase transition-all border ${
                    audienceType === type 
                      ? 'bg-[#6366f1] border-[#6366f1] text-white' 
                      : 'bg-[#181628] border-white/5 text-white/50 hover:border-white/10 hover:text-white'
                  }`}
                >
                  {type === 'PUBLIC' && 'สาธารณะ'}
                  {type === 'CIRCLE' && 'Circle'}
                  {type === 'BFF_GROUP' && 'BFF'}
                  {type === 'COUPLE' && 'คู่รัก'}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Dropdown selects based on audience type */}
          {audienceType === 'CIRCLE' && (
            <div className="space-y-1 animate-fadeIn">
              <span className="text-[9px] text-white/50">เลือก Circle:</span>
              <select
                value={targetCircleName}
                onChange={e => setTargetCircleName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6366f1]"
              >
                {circles?.map((c: any) => (
                  <option key={c.id} value={c.name} className="text-black">{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {audienceType === 'BFF_GROUP' && (
            <div className="space-y-1 animate-fadeIn">
              <span className="text-[9px] text-white/50">เลือกกลุ่ม BFF:</span>
              <select
                value={targetBffGroupId}
                onChange={e => setTargetBffGroupId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6366f1]"
              >
                <option value="" className="text-black">-- เลือกกลุ่ม BFF --</option>
                {bffGroups?.map((g: any) => (
                  <option key={g.id} value={g.id} className="text-black">{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Final publish buttons */}
          <button
            onClick={handlePostStory}
            disabled={audienceType === 'BFF_GROUP' && !targetBffGroupId}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>แบ่งปันเรื่องราวชีวิต (Post Story)</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
