import React, { useRef, useState, useEffect } from 'react';
import { Shield, RotateCcw, Paintbrush, Eraser } from 'lucide-react';

interface WhiteboardProps {
  canvasData: string;
  onSave: (data: string) => void;
  groupId: string;
}

export default function Whiteboard({ canvasData, onSave, groupId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#8b5cf6');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  // Load initial canvas state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas sizes based on bounding rect
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 600) - 10;
      canvas.height = 360;
      
      // Clear with clean background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (canvasData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = canvasData;
      }
    };

    resizeCanvas();
  }, [canvasData, groupId]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#1e293b' : color;
    ctx.lineWidth = tool === 'eraser' ? 24 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save state
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onSave(dataUrl);
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onSave(canvas.toDataURL());
  };

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--theme-primary)]" />
          <h4 className="font-display font-medium text-[var(--theme-text-primary)] text-sm sm:text-base">กระดานวาดเขียนร่วมกัน (E2EE Whiteboard)</h4>
        </div>
        
        <div className="flex items-center gap-2 bg-[var(--theme-surface-hover)] p-1.5 rounded-lg border border-[var(--theme-border)] text-xs">
          <button
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-md transition-all ${tool === 'pen' ? 'bg-[var(--theme-primary)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            title="ดินสอ"
          >
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-md transition-all ${tool === 'eraser' ? 'bg-[var(--theme-primary)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
            title="ยางลบ"
          >
            <Eraser className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-px bg-slate-700 mx-1"></div>
          
          <button onClick={() => setColor('#8b5cf6')} className={`w-4 h-4 rounded-full bg-[var(--theme-primary)] border ${color === '#8b5cf6' ? 'ring-2 ring-white' : ''}`} />
          <button onClick={() => setColor('#ec4899')} className={`w-4 h-4 rounded-full bg-pink-500 border ${color === '#ec4899' ? 'ring-2 ring-white' : ''}`} />
          <button onClick={() => setColor('#10b981')} className={`w-4 h-4 rounded-full bg-emerald-500 border ${color === '#10b981' ? 'ring-2 ring-white' : ''}`} />
          <button onClick={() => setColor('#f59e0b')} className={`w-4 h-4 rounded-full bg-amber-500 border ${color === '#f59e0b' ? 'ring-2 ring-white' : ''}`} />
          <button onClick={() => setColor('#ef4444')} className={`w-4 h-4 rounded-full bg-red-500 border ${color === '#ef4444' ? 'ring-2 ring-white' : ''}`} />
          
          <div className="h-4 w-px bg-slate-700 mx-1"></div>
          
          <button
            onClick={clearCanvas}
            className="p-1.5 text-[var(--theme-text-secondary)] hover:text-red-400 rounded-md transition-all"
            title="ล้างกระดาน"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative border border-slate-750 rounded-lg overflow-hidden bg-[var(--theme-bg)]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="block touch-none cursor-crosshair mx-auto"
        />
      </div>
      <p className="text-xs text-[var(--theme-text-secondary)] mt-2 text-center">
        * ทุกพิกัดการวาดเขียนจะถูกบันทึกและซิงค์ร่วมกันผ่านโปรโตคอลความปลอดภัย Shush
      </p>
    </div>
  );
}
