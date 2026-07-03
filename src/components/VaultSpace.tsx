import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Upload, Folder, Key, Trash2, Eye, Calendar, Clock, AlertTriangle, EyeOff, File } from 'lucide-react';
import { encryptWithPublicKey, decryptWithPrivateKey } from '../lib/crypto.ts';

interface VaultSpaceProps {
  ownerId: string;
  ownerType: 'COUPLE' | 'BFF_GROUP' | 'USER' | 'FRIEND';
  userPrivateKey: string;
  userPublicKey: string;
}

export default function VaultSpace({ ownerId, ownerType, userPrivateKey, userPublicKey }: VaultSpaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<'vault' | 'capsule'>('vault');
  const [loading, setLoading] = useState(false);

  // Vault Items State
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Secret Box Capsules State
  const [capsuleItems, setCapsuleItems] = useState<any[]>([]);
  const [capsuleText, setCapsuleText] = useState('');
  const [capsuleUnlockDate, setCapsuleUnlockDate] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('shush_token')}`
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab, ownerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'vault') {
        const res = await fetch(`/api/vault/${ownerId}`, { headers });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setVaultItems(list);
      } else if (activeSubTab === 'capsule') {
        const res = await fetch(`/api/secret-box/${ownerId}`, { headers });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setCapsuleItems(list);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // --- Vault operations (Client E2EE File uploads simulation) ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setLoading(true);
    try {
      // 1. Read file as Base64 data url
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // 2. Client-side E2EE: Encrypt base64 data using client's public key
      const encPayload = await encryptWithPublicKey(base64Data, userPublicKey);

      // 3. Post to API
      const res = await fetch(`/api/vault/${ownerId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ownerType,
          fileName: file.name,
          fileType: file.type,
          ciphertext: encPayload.ciphertext,
          iv: encPayload.iv
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('File encryption & upload failed:', e);
      alert('การเข้ารหัสและอัปโหลดไฟล์ล้มเหลว');
    }
    setLoading(false);
  };

  const handleDeleteVaultItem = async (itemId: string) => {
    if (!confirm('คุณแน่ใจว่าต้องการลบไฟล์เข้ารหัสนี้อย่างถาวร?')) return;
    try {
      const res = await fetch(`/api/vault/${ownerId}/${itemId}`, { method: 'DELETE', headers });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecryptAndDownload = async (item: any) => {
    try {
      // Decrypt base64 data url from ciphertext using private key
      const decryptedDataUrl = await decryptWithPrivateKey(item.ciphertext, userPrivateKey);
      
      if (decryptedDataUrl.startsWith('[ข้อความ')) {
        alert('กุญแจของคุณไม่เข้าคู่กับการเข้ารหัสนี้');
        return;
      }

      // Open or trigger download
      const link = document.createElement('a');
      link.href = decryptedDataUrl;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('File decryption failed:', e);
      alert('การถอดรหัสไฟล์ล้มเหลว');
    }
  };

  // --- Secret Box operations (Time capsule) ---
  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsuleText || !capsuleUnlockDate) return;

    const selectedTime = new Date(capsuleUnlockDate).getTime();
    if (selectedTime <= Date.now()) {
      alert('กรุณาเลือกเวลาปลดล็อคในอนาคต');
      return;
    }

    try {
      // Client-side E2EE: Encrypt capsule message content using public key
      const enc = await encryptWithPublicKey(capsuleText, userPublicKey);

      const res = await fetch(`/api/secret-box/${ownerId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ownerType,
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          openAt: new Date(capsuleUnlockDate).toISOString()
        })
      });

      if (res.ok) {
        setCapsuleText('');
        setCapsuleUnlockDate('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Decrypt Capsule contents
  const [decryptedCapsules, setDecryptedCapsules] = useState<Record<string, string>>({});

  const handleDecryptCapsule = async (item: any) => {
    const isLocked = new Date(item.openAt).getTime() > Date.now();
    if (isLocked) return;

    try {
      const dec = await decryptWithPrivateKey(item.ciphertext, userPrivateKey);
      setDecryptedCapsules(prev => ({ ...prev, [item.id]: dec }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--theme-bg)] overflow-y-auto p-4 sm:p-6">
      {/* Space Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-[var(--theme-border)] pb-4">
        <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30 flex items-center justify-center">
          <Folder className="w-6 h-6 text-[var(--theme-primary)]" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-[var(--theme-text-primary)]">Vault & Secret Box (คลังข้อมูลลับสุดยอด)</h2>
          <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] mt-0.5">
            เก็บรักษาไฟล์ รูปภาพ และแคปซูลกาลเวลาที่มีระบบเข้ารหัสความปลอดภัยขั้นสูงสุดระดับ Zero Knowledge
          </p>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex border-b border-[var(--theme-border)] gap-1 sm:gap-2 mb-6 text-xs sm:text-sm">
        <button
          onClick={() => setActiveSubTab('vault')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'vault' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <Key className="w-4 h-4" />
          ตู้นิรภัย E2EE (Encrypted Vault)
        </button>
        <button
          onClick={() => setActiveSubTab('capsule')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'capsule' ? 'border-violet-600 text-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`}
        >
          <Clock className="w-4 h-4" />
          กล่องลับอนาคต (Secret Box / Time Capsule)
        </button>
      </div>

      {/* Security Banner */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3.5 flex items-start gap-3 mb-6">
        <Shield className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-xs font-semibold text-[var(--theme-text-primary)]">ระบบเข้ารหัสแบบทรานสแพเรนท์ (Zero Knowledge Architecture)</h4>
          <p className="text-[11px] text-[var(--theme-text-secondary)] mt-0.5">
            ไฟล์หรือข้อความใดๆ ที่บันทึกลงในตู้นี้จะถูกแบ่ง คลุกเคล้า และแปลงเป็นกุญแจเข้ารหัสลับ RSA-OAEP-256 ทันทีที่ออกจากบราวเซอร์ของคุณ ไม่มีใครบนโลกแม้กระทั่งผู้พัฒนาที่สามารถแอบเข้าอ่านหรือวิเคราะห์ได้โดยไม่มีคีย์คู่ของคุณเอง
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--theme-primary)]"></div>
        </div>
      ) : (
        <div className="flex-1">
          {/* Vault Interface */}
          {activeSubTab === 'vault' && (
            <div className="space-y-6">
              {/* Drag & Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all relative ${dragActive ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 scale-[0.99]' : 'border-[var(--theme-border)] hover:border-[var(--theme-border)]'}`}
              >
                <input
                  type="file"
                  id="vault-file-upload"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="vault-file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center text-[var(--theme-primary)] border border-[var(--theme-primary)]/10">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--theme-text-primary)] text-sm sm:text-base">ลากและวางไฟล์ที่นี่ หรือ <span className="text-[var(--theme-primary)] underline">คลิกเพื่อเลือกไฟล์</span></h4>
                    <p className="text-xs text-[var(--theme-text-secondary)] mt-1">รองรับทุกไฟล์ภาพ วิดีโอ เอกสาร และไฟล์เสียง (จำกัด 10MB ต่อไฟล์)</p>
                  </div>
                </label>
              </div>

              {/* Grid of Files */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {vaultItems.length === 0 ? (
                  <div className="col-span-full text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ตู้นิรภัยว่างเปล่า อัปโหลดไฟล์ส่วนตัวหรือเอกสารลับร่วมกันเลย!
                  </div>
                ) : (
                  vaultItems.map((item) => (
                    <div key={item.id} className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] rounded-xl p-4 flex flex-col justify-between hover:border-[var(--theme-border)] transition-all group">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-text-secondary)] flex-shrink-0">
                          <File className="w-5 h-5 text-[var(--theme-primary)]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-[var(--theme-text-primary)] text-xs sm:text-sm truncate" title={item.fileName}>
                            {item.fileName}
                          </h4>
                          <p className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5 truncate">{item.fileType || 'ไม่ระบุประเภท'}</p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[var(--theme-border)]/60 flex items-center justify-between">
                        <span className="text-[9px] text-[var(--theme-text-secondary)] font-mono">
                          {new Date(item.createdAt).toLocaleDateString('th-TH')}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleDecryptAndDownload(item)}
                            className="p-1.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] bg-[var(--theme-surface-hover)] rounded-md border border-[var(--theme-border)] transition-all"
                            title="ถอดรหัสและเปิดดู"
                          >
                            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteVaultItem(item.id)}
                            className="p-1.5 text-[var(--theme-text-secondary)] hover:text-red-400 bg-[var(--theme-surface-hover)] rounded-md border border-[var(--theme-border)] transition-all"
                            title="ลบถาวร"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Secret Box Interface */}
          {activeSubTab === 'capsule' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Creator Form */}
              <div className="md:col-span-1 bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl h-fit">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-[var(--theme-primary)]" />
                  <h3 className="font-display font-medium text-[var(--theme-text-primary)]">ฝังแคปซูลกาลเวลา</h3>
                </div>

                <form onSubmit={handleCreateCapsule} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">จดหมายหรือข้อความที่จะปลดล็อคในอนาคต</label>
                    <textarea
                      required
                      value={capsuleText}
                      onChange={e => setCapsuleText(e.target.value)}
                      placeholder="เช่น ข้อมูลที่อยากคุยกับตัวเองในอีก 1 ปีข้างหน้า, รูปและข้อความอวยพรวันเกิดปีถัดไป..."
                      rows={5}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">วันที่และเวลาเปิดกล่อง</label>
                    <input
                      type="datetime-local"
                      required
                      value={capsuleUnlockDate}
                      onChange={e => setCapsuleUnlockDate(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-violet-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    ล็อคแคปซูลลงกล่องลับ
                  </button>
                </form>
              </div>

              {/* Capsule Grid */}
              <div className="md:col-span-2 space-y-4">
                {capsuleItems.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[var(--theme-border)] rounded-xl text-[var(--theme-text-secondary)]">
                    ยังไม่มีกล่องลับอนาคตถูกบันทึกไว้ ล็อคความลับเพื่อรอการเปิดตัวในอนาคตเลยสิ!
                  </div>
                ) : (
                  capsuleItems.map((item) => {
                    const isLocked = new Date(item.openAt).getTime() > Date.now();
                    const isDecrypted = !!decryptedCapsules[item.id];

                    return (
                      <div key={item.id} className="bg-[var(--theme-surface)]/50 border border-[var(--theme-border)] p-5 rounded-xl flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isLocked ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                          {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isLocked ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {isLocked ? '🔒 ล็อคอยู่' : '🔓 ปลดล็อคแล้ว'}
                            </span>
                            <span className="text-xs text-[var(--theme-text-secondary)] font-mono flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              เปิดเมื่อ: {new Date(item.openAt).toLocaleString('th-TH')}
                            </span>
                          </div>

                          {isLocked ? (
                            <div className="p-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg flex items-center gap-2.5 text-xs text-[var(--theme-text-secondary)]">
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              ความลับนี้จะถูกถอดรหัสปลดล็อคให้เปิดดูได้อย่างปลอดภัยเมื่อถึงกำหนดวันเวลาด้านบนเท่านั้น
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {isDecrypted ? (
                                <div className="p-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] text-sm rounded-lg whitespace-pre-wrap">
                                  {decryptedCapsules[item.id]}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDecryptCapsule(item)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-[var(--theme-text-primary)] rounded-lg py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Unlock className="w-4 h-4" />
                                  ถอดรหัสกล่องเพื่อเปิดอ่านข้อมูล
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
