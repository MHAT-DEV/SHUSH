import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Link as LinkIcon, RefreshCw, Copy, ExternalLink, Download, Share2, Scan, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import CopyButton from './CopyButton.tsx';
import UserDisplay from './UserDisplay.tsx';

interface QRShareProps {
  user: any;
  onNavigate: (tab: string, cat?: string) => void;
  hideHeader?: boolean;
}

export default function QRShareManager({ user, onNavigate, hideHeader }: QRShareProps) {
  const [activeSubtab, setActiveSubtab] = useState<'my_qr' | 'scan' | 'share_link'>('my_qr');
  
  // QR State
  const [qrToken, setQrToken] = useState('');
  const [qrEnabled, setQrEnabled] = useState(true);
  const [qrShow, setQrShow] = useState<'username' | 'userid'>('username');
  const [qrDataUrl, setQrDataUrl] = useState('');
  
  // Share Link State
  const [shareToken, setShareToken] = useState('');
  const [shareEnabled, setShareEnabled] = useState(true);

  // Scanner State
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchQR();
    fetchShare();
  }, []);

  useEffect(() => {
    if (qrToken) {
      generateQR(qrToken);
    }
  }, [qrToken, qrShow]);

  const fetchQR = async () => {
    try {
      const res = await fetch('/api/qr', { headers });
      const data = await res.json();
      setQrToken(data.qrToken);
      setQrEnabled(data.qrEnabled);
      setQrShow(data.qrShow);
    } catch (e) { console.error(e); }
  };

  const fetchShare = async () => {
    try {
      const res = await fetch('/api/share', { headers });
      const data = await res.json();
      setShareToken(data.publicShareToken);
      setShareEnabled(data.publicShareEnabled);
    } catch (e) { console.error(e); }
  };

  const generateQR = async (token: string) => {
    try {
      const payload = JSON.stringify({ type: 'shush_qr', token });
      const canvas = document.createElement('canvas');
      
      // Use higher error correction level to allow logo
      await QRCode.toCanvas(canvas, payload, { 
        width: 300, 
        margin: 2, 
        color: { dark: '#1e1b4b', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      });
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const size = 300;
        const center = size / 2;
        
        // Draw SHUSH Logo in the center
        const rectWidth = 80;
        const rectHeight = 30;
        
        // Background for logo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(center - rectWidth/2, center - rectHeight/2, rectWidth, rectHeight, 8);
        ctx.fill();
        
        // Border for logo
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Text
        ctx.fillStyle = '#1e1b4b';
        ctx.font = '900 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SHUSH', center, center + 1);
      }
      
      setQrDataUrl(canvas.toDataURL());
    } catch (err) { console.error(err); }
  };

  const refreshQR = async () => {
    if (!confirm('คิวอาร์โค้ดเก่าจะไม่สามารถใช้งานได้อีก ยืนยันการสร้างใหม่?')) return;
    try {
      const res = await fetch('/api/qr/refresh', { method: 'POST', headers });
      const data = await res.json();
      setQrToken(data.qrToken);
    } catch (e) { console.error(e); }
  };

  const toggleQREnabled = async () => {
    try {
      const newState = !qrEnabled;
      setQrEnabled(newState);
      await fetch('/api/qr/settings', { method: 'POST', headers, body: JSON.stringify({ qrEnabled: newState, qrShow }) });
    } catch (e) { console.error(e); }
  };

  const updateQrShow = async (show: 'username' | 'userid') => {
    setQrShow(show);
    try {
      await fetch('/api/qr/settings', { method: 'POST', headers, body: JSON.stringify({ qrEnabled, qrShow: show }) });
    } catch (e) { console.error(e); }
  };

  const downloadQR = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Shush_QR_${user.username}.png`;
    a.click();
  };

  // Scanner methods
  const startScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    setScanError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์ไม่รองรับ หรือไม่ได้ใช้งานผ่าน HTTPS');
      }
      // Explicitly request camera permissions first
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    } catch (err: any) {
      setScanError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตให้ใช้งานกล้องในเบราว์เซอร์: ' + (err.message || err));
      setIsScanning(false);
      return;
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader");
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
      );
    } catch (err: any) {
      setScanError('ไม่สามารถเริ่มใช้งานกล้องได้: ' + (err.message || err));
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) { console.error(err); }
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, [activeSubtab]);

  const onScanSuccess = async (decodedText: string) => {
    stopScanner();
    try {
      const payload = JSON.parse(decodedText);
      if (payload.type === 'shush_qr' && payload.token) {
        processQrToken(payload.token);
      } else {
        setScanError('QR Code ไม่ใช่รูปแบบของ Shush');
      }
    } catch (e) {
      // Maybe it's a URL or direct token
      processQrToken(decodedText);
    }
  };

  const processQrToken = async (token: string) => {
    try {
      const res = await fetch(`/api/qr/scan/${token}`);
      const data = await res.json();
      if (res.ok) {
        setScanResult(data);
      } else {
        setScanError(data.error || 'ไม่พบผู้ใช้นี้');
      }
    } catch (e) {
      setScanError('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
    }
  };

  const onScanFailure = (error: any) => {
    // Ignore frequent scan failures (no QR detected)
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader");
    }
    setScanError('');
    setScanResult(null);
    try {
      const decodedText = await scannerRef.current.scanFileV2(file);
      onScanSuccess(decodedText.decodedText);
    } catch (err) {
      setScanError('ไม่พบ QR Code ในรูปภาพนี้');
    }
  };

  // Share methods
  const refreshShare = async () => {
    if (!confirm('ลิงก์เดิมจะไม่สามารถใช้งานได้อีก ยืนยันการสร้างใหม่?')) return;
    try {
      const res = await fetch('/api/share/refresh', { method: 'POST', headers });
      const data = await res.json();
      setShareToken(data.publicShareToken);
    } catch (e) { console.error(e); }
  };

  const toggleShareEnabled = async () => {
    try {
      const newState = !shareEnabled;
      setShareEnabled(newState);
      await fetch('/api/share/settings', { method: 'POST', headers, body: JSON.stringify({ publicShareEnabled: newState }) });
    } catch (e) { console.error(e); }
  };

  const shareLinkUrl = `${window.location.origin}/p/${shareToken}`;

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Shush Profile',
        text: 'ดู Public Lens ของฉันบน Shush',
        url: shareLinkUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareLinkUrl);
      alert('คัดลอกลิงก์สำเร็จ!');
    }
  };

  const handleAddFriend = async () => {
    if (!scanResult) return;
    try {
      const res = await fetch('/api/relationships/friends/add', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetId: scanResult.id })
      });
      if (res.ok) {
        alert('ส่งคำขอเป็นเพื่อนเรียบร้อย!');
        setScanResult(null);
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถส่งคำขอได้');
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-[var(--theme-bg)] relative">
      <div className={`bg-[var(--theme-surface)]/80 backdrop-blur border-b border-[var(--theme-border)] p-4 flex-shrink-0 ${hideHeader ? 'pb-2' : ''}`}>
        {!hideHeader && (
          <>
            <h2 className="text-xl font-display font-black text-[var(--theme-text-primary)]">Identity Sharing</h2>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-1">จัดการ QR Code และลิงก์แชร์ตัวตนแบบสาธารณะ</p>
          </>
        )}
        
        <div className={`flex gap-2 ${hideHeader ? 'mt-0' : 'mt-4'}`}>
          <button onClick={() => setActiveSubtab('my_qr')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeSubtab === 'my_qr' ? 'bg-[var(--theme-primary)] text-white shadow-md' : 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] hover:text-white'}`}>
            My QR
          </button>
          <button onClick={() => setActiveSubtab('scan')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeSubtab === 'scan' ? 'bg-[var(--theme-primary)] text-white shadow-md' : 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] hover:text-white'}`}>
            Scan QR
          </button>
          <button onClick={() => setActiveSubtab('share_link')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeSubtab === 'share_link' ? 'bg-[var(--theme-primary)] text-white shadow-md' : 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] hover:text-white'}`}>
            Public Link
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {activeSubtab === 'my_qr' && (
          <div className="max-w-sm mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center relative overflow-hidden">
              {!qrEnabled && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-black">
                  <ShieldAlert className="w-12 h-12 text-rose-500 mb-2" />
                  <p className="font-bold">QR Code ถูกปิดใช้งาน</p>
                </div>
              )}
              
              <div className="w-12 h-12 rounded-full overflow-hidden mb-3 border-2 border-slate-100 flex items-center justify-center bg-slate-100 text-slate-800 relative">
                <span className="font-bold text-lg absolute">{user.displayName?.[0] || 'S'}</span>
                <img 
                  src={user.avatar?.startsWith('http') ? user.avatar : `https://api.dicebear.com/7.x/notionists/svg?seed=${user.avatar || user.id}`} 
                  alt="avatar" 
                  className="w-full h-full object-cover relative z-10 bg-slate-100"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-1"><UserDisplay user={user} /></h3>
              <p className="text-xs text-slate-500 mb-4">
                {qrShow === 'username' ? `@${user.username}` : `ID: ${user.id.substring(0, 8)}...`}
              </p>
              
              {qrDataUrl ? (
                <div className="bg-slate-50 p-2 rounded-2xl mb-4 border border-slate-100">
                  <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 object-contain" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-slate-100 rounded-2xl mb-4 flex items-center justify-center animate-pulse"></div>
              )}
              
              <div className="flex w-full gap-2">
                <button onClick={downloadQR} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                  <Download className="w-4 h-4" /> บันทึก
                </button>
                <button onClick={nativeShare} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-violet-500/30">
                  <Share2 className="w-4 h-4" /> แชร์
                </button>
              </div>
            </div>

            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><QrCode className="w-4 h-4 text-[var(--theme-primary)]" /> ตั้งค่า QR Code</h3>
              
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">เปิดใช้งาน QR Code</div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={qrEnabled} onChange={toggleQREnabled} />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">แสดงข้อมูล</div>
                <div className="flex gap-2">
                  <button onClick={() => updateQrShow('username')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${qrShow === 'username' ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border-[var(--theme-primary)]' : 'border-[var(--theme-border)] text-[var(--theme-text-secondary)]'}`}>Username</button>
                  <button onClick={() => updateQrShow('userid')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${qrShow === 'userid' ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border-[var(--theme-primary)]' : 'border-[var(--theme-border)] text-[var(--theme-text-secondary)]'}`}>User ID</button>
                </div>
              </div>

              <button onClick={refreshQR} className="w-full py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                <RefreshCw className="w-4 h-4" /> รีเฟรช QR Code (ของเดิมจะใช้งานไม่ได้)
              </button>
            </div>
          </div>
        )}

        {activeSubtab === 'scan' && (
          <div className="max-w-md mx-auto flex flex-col gap-4">
            {!scanResult ? (
              <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-4 bg-black/20 text-center border-b border-[var(--theme-border)]">
                  <h3 className="font-bold flex items-center justify-center gap-2"><Scan className="w-5 h-5" /> สแกน QR Code</h3>
                </div>
                
                <div className="bg-black aspect-square relative flex items-center justify-center">
                  <div id="qr-reader" className="w-full h-full text-black"></div>
                  {!isScanning && (
                    <button onClick={startScanner} className="absolute z-10 bg-[var(--theme-primary)] text-white px-6 py-2.5 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
                      <Scan className="w-5 h-5" /> เปิดกล้อง
                    </button>
                  )}
                </div>

                <div className="p-4 flex flex-col items-center gap-3">
                  <p className="text-xs text-[var(--theme-text-secondary)] text-center">หรืออัปโหลดรูปภาพที่มี QR Code</p>
                  <label className="bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] px-6 py-2.5 rounded-xl font-bold cursor-pointer flex items-center gap-2 hover:bg-[var(--theme-border)] transition-colors w-full justify-center">
                    <ImageIcon className="w-5 h-5" /> เลือกรูปภาพ
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {scanError && <p className="text-rose-500 text-xs mt-2 font-semibold text-center">{scanError}</p>}
                </div>
              </div>
            ) : (
              <div className="bg-[var(--theme-surface)] border border-[var(--theme-primary)]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-[var(--theme-primary)]/20 to-transparent" style={{ backgroundColor: scanResult.banner || '#1e1b4b' }}></div>
                
                <button onClick={() => setScanResult(null)} className="absolute top-4 left-4 text-white/70 hover:text-white bg-black/30 rounded-full p-1.5 backdrop-blur-md">
                  <RefreshCw className="w-4 h-4" />
                </button>

                <div className="relative z-10 mt-6 mb-4">
                  <div className="w-20 h-20 rounded-full border-4 border-[var(--theme-surface)] overflow-hidden bg-[var(--theme-bg)]">
                    <img src={scanResult.avatar?.startsWith('http') ? scanResult.avatar : `https://api.dicebear.com/7.x/notionists/svg?seed=${scanResult.avatar || scanResult.id}`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-black mb-1 text-[var(--theme-text-primary)]"><UserDisplay user={scanResult as any} /></h3>
                <p className="text-sm text-[var(--theme-text-secondary)] mb-4">@{scanResult.username}</p>
                <p className="text-xs text-[var(--theme-text-primary)]/80 mb-6 max-w-xs">{scanResult.bio || 'สวัสดี ฉันใช้ Shush!'}</p>
                
                <button onClick={handleAddFriend} className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--theme-primary)]/30 transition-all">
                  👋 ส่งคำขอเป็นเพื่อน
                </button>
              </div>
            )}
          </div>
        )}

        {activeSubtab === 'share_link' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <LinkIcon className="w-32 h-32 text-[var(--theme-primary)]" />
              </div>
              
              <div className="relative z-10">
                <h3 className="font-display font-black text-xl flex items-center gap-2 mb-2"><ExternalLink className="w-5 h-5 text-[var(--theme-primary)]" /> Public Lens Link</h3>
                <p className="text-xs text-[var(--theme-text-secondary)] mb-6">สร้างลิงก์สำหรับแชร์โปรไฟล์สาธารณะของคุณไปยังแอปอื่น</p>

                {!shareEnabled ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl p-4 flex items-start gap-3 mb-6">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">ลิงก์แชร์ถูกปิดใช้งาน</p>
                      <p className="text-xs opacity-80 mt-1">บุคคลภายนอกไม่สามารถเข้าถึง Public Lens ผ่านลิงก์ได้</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="text-[10px] font-bold text-[var(--theme-text-secondary)] uppercase tracking-wider mb-2">Short Link</div>
                    <div className="flex bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl overflow-hidden p-1">
                      <div className="flex-1 px-3 py-2 text-sm truncate font-mono text-[var(--theme-text-primary)] flex items-center">
                        {shareLinkUrl}
                      </div>
                      <CopyButton textToCopy={shareLinkUrl} className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 flex-shrink-0" />
                    </div>
                    
                    <button onClick={nativeShare} className="w-full mt-3 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <Share2 className="w-4 h-4" /> แชร์ไปยังแอปอื่น
                    </button>
                  </div>
                )}

                <div className="space-y-4 pt-6 border-t border-[var(--theme-border)]/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">เปิดใช้งานลิงก์</div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={shareEnabled} onChange={toggleShareEnabled} />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                    </label>
                  </div>

                  <button onClick={refreshShare} className="w-full py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <RefreshCw className="w-4 h-4" /> รีเฟรชลิงก์ (ลิงก์เดิมจะใช้งานไม่ได้)
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[var(--theme-text-secondary)] text-center max-w-sm mx-auto">
              ทุกลิงก์อยู่ภายใต้การควบคุมความเป็นส่วนตัว ลิงก์จะไม่สามารถข้ามการตั้งค่า Privacy หรือแสดงข้อมูลนอกเหนือจาก Public Lens ได้
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
