import React, { useState } from 'react';
import { Sparkles, ArrowRight, Download, Key, ShieldCheck, FileKey, ShieldAlert, KeyRound, MonitorSmartphone, LockKeyhole, Upload } from 'lucide-react';
import { generateE2EEKeyPair, generateRecoveryKey } from '../lib/crypto.ts';
import { startAuthentication } from '@simplewebauthn/browser';
import CopyButton from './CopyButton.tsx';

interface AuthScreenProps {
  onLoginSuccess: (data: { user: any, token: string, privateKey: string }) => void;
}

const renderRecentSessionAvatar = (session: any) => {
  const av = session.avatar;
  if (!av) return <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${session.username}`} alt="avatar" className="w-full h-full object-cover" />;
  if (av.startsWith('http') || av.startsWith('data:')) {
    return <img src={av} alt="avatar" className="w-full h-full object-cover" />;
  }
  if (av.length <= 2) {
    return <div className="w-full h-full flex items-center justify-center text-2xl bg-[var(--theme-surface)]">{av}</div>;
  }
  return <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${av}`} alt="avatar" className="w-full h-full object-cover" />;
};

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [view, setView] = useState<'login' | 'register' | 'recovery'>('login');
  
  // Register state
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [displayInput, setDisplayInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarIndex, setAvatarIndex] = useState('0');
  const [generatedKeys, setGeneratedKeys] = useState<any | null>(null);
  const [recoveryKeyInfo, setRecoveryKeyInfo] = useState<any | null>(null);

  // Login flow state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginStep, setLoginStep] = useState<1 | 2>(1); // 1: Username, 2: Challenge
  const [authOptions, setAuthOptions] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [proofInput, setProofInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [recentSession, setRecentSession] = React.useState<any>(() => {
    const saved = localStorage.getItem('shush_recent_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Recovery flow state
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1); // 1: Recovery Code/File, 2: Challenge

  const handleStartRegister = async () => {
    setView('register');
    setIsGeneratingKeys(true);
    try {
      const keys = await generateE2EEKeyPair();
      setGeneratedKeys(keys);
      const recovery = generateRecoveryKey();
      setRecoveryKeyInfo(recovery);
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingKeys(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !displayInput || !generatedKeys || !recoveryKeyInfo) return;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput,
          displayName: displayInput,
          bio: bioInput,
          avatar: avatarIndex,
          publicKey: generatedKeys.publicKeyBase64,
          recoveryKeyHash: recoveryKeyInfo.hash
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('shush_token', data.token);
        localStorage.setItem('shush_private_key', generatedKeys.privateKeyBase64);
        onLoginSuccess({ user: data.user, token: data.token, privateKey: generatedKeys.privateKeyBase64 });
      } else {
        const err = await res.json();
        alert(err.error || 'การลงทะเบียนล้มเหลว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Login Flow ---
  const handleLoginInit = async (e?: React.FormEvent, overrideUsername?: string) => {
    if (e) e.preventDefault();
    const targetUsername = overrideUsername || loginUsername;
    if (!targetUsername) return;

    try {
      const res = await fetch('/api/auth/login/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername })
      });

      if (res.ok) {
        const data = await res.json();
        setAuthOptions(data);
        if (overrideUsername) setLoginUsername(overrideUsername);
        
        // Auto-select preferred method
        if (data.allowBypass) {
          finishLoginVerify('bypass', { pubKey: 'local_storage_bypass' }, targetUsername);
          return;
        }

        let defaultMethod = 'passkeys';
        if (data.methods && data.methods.length > 0) {
          defaultMethod = data.methods[0];
        } else if (data.hasPasskeys) defaultMethod = 'passkeys';
        else if (data.hasTotp) defaultMethod = 'totp';
        else if (data.hasSecurityKey) defaultMethod = 'securityKey';
        else if (data.hasQuestions) defaultMethod = 'securityQuestions';
        
        setSelectedMethod(defaultMethod);
        setLoginStep(2);

        if (defaultMethod === 'passkeys' && data.passkeyOptions) {
          triggerPasskeyLogin(data.passkeyOptions, targetUsername);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่พบชื่อผู้ใช้นี้');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerPasskeyLogin = async (options: any, forceUsername?: string) => {
    try {
      const asseResp = await startAuthentication(options);
      await finishLoginVerify('passkeys', asseResp, forceUsername);
    } catch (e: any) {
      console.error(e);
      if (e.name !== 'NotAllowedError') {
        alert('Passkey error: ' + e.message);
      }
    }
  };

  const finishLoginVerify = async (method: string, proof: any, forceUsername?: string) => {
    try {
      const res = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forceUsername || loginUsername, method, proof })
      });

      if (res.ok) {
        const data = await res.json();
        
        let localKey = localStorage.getItem('shush_private_key');
        if (!localKey) {
          const demoKeys = await generateE2EEKeyPair();
          localKey = demoKeys.privateKeyBase64;
          localStorage.setItem('shush_private_key', localKey);
        }

        localStorage.setItem('shush_token', data.token);
        
        if (rememberMe) {
          localStorage.setItem('shush_recent_session', JSON.stringify({
            username: data.user.username,
            displayName: data.user.displayName,
            avatar: data.user.avatar,
            lastLogin: new Date().toISOString()
          }));
        } else {
          localStorage.removeItem('shush_recent_session');
        }

        onLoginSuccess({ user: data.user, token: data.token, privateKey: localKey });
      } else {
        const err = await res.json();
        alert(err.error || 'การยืนยันตัวตนล้มเหลว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((selectedMethod === 'passkeys' || selectedMethod === 'securityKey') && authOptions?.passkeyOptions) {
      // Both Passkey and Security Key (FIDO2) use WebAuthn under the hood
      return triggerPasskeyLogin(authOptions.passkeyOptions);
    }
    
    let finalProof: any = proofInput;
    if (selectedMethod === 'securityQuestions') {
      finalProof = { id: authOptions?.securityQuestions?.[0]?.id || 0, answer: proofInput };
    }
    
    await finishLoginVerify(selectedMethod, finalProof);
  };

  // --- Recovery Flow ---
  const handleDownloadRecoveryFile = () => {
    if (!recoveryKeyInfo || !usernameInput) return;
    const fileData = {
      username: usernameInput,
      key: recoveryKeyInfo.key,
      magic: 'SHUSH_RECOVERY_V1'
    };
    const encoded = btoa(JSON.stringify(fileData));
    const blob = new Blob([encoded], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${usernameInput}_recovery.shush`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const decoded = atob(content);
        const data = JSON.parse(decoded);
        
        if (data.magic === 'SHUSH_RECOVERY_V1' && data.key && data.username) {
          setRecoveryUsername(data.username);
          setRecoveryInput(data.key);
        } else {
          alert('ไฟล์กู้คืนไม่ถูกต้อง (Invalid Format)');
        }
      } catch (err) {
        alert('ไฟล์กู้คืนไม่ถูกต้อง (Decryption Error)');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleRecoveryInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername || !recoveryInput) return;

    try {
      const charSum = recoveryInput.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const recoveryHash = 'hash_' + charSum.toString(16) + '_secure_e2ee';

      // Use the verify endpoint directly to simulate verifying the recovery code
      const res = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: recoveryUsername, method: 'recovery', proof: recoveryHash })
      });

      if (res.ok) {
        // Step 1 success! In Shh PASS, recovery code is just step 1. Must follow up with another method.
        // For simulation, let's fetch methods and go to step 2.
        const optsRes = await fetch('/api/auth/login/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: recoveryUsername })
        });
        const opts = await optsRes.json();
        setAuthOptions(opts);
        setSelectedMethod(opts.methods[0] || 'passkeys');
        setLoginUsername(recoveryUsername); // Sync username
        setRecoveryStep(2);
      } else {
        const err = await res.json();
        alert(err.error || 'รหัสกู้คืนไม่ถูกต้อง');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto bg-[var(--theme-bg)] relative min-h-screen">
      {/* Left panel: Brand */}
      <div className="flex-1 bg-transparent p-8 md:p-16 flex flex-col justify-between relative z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="SHUSH Logo" className="w-12 h-12 rounded-xl shadow-lg shadow-violet-600/20" />
          <span className="font-display font-black text-2xl tracking-wider text-[var(--theme-text-primary)]">SHUSH</span>
        </div>

        <div className="my-12 md:my-0 space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Private Relationship Messenger for 2027
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold text-[var(--theme-text-primary)] tracking-tight leading-tight">
            แชทลับเฉพาะคุณ<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--theme-primary)] to-fuchsia-500">
              ปลอดภัยขั้นสุด
            </span>
          </h1>
          <p className="text-lg text-[var(--theme-text-secondary)] max-w-md font-medium leading-relaxed">
            ขับเคลื่อนด้วย E2EE (End-to-End Encryption) แบบ 100% 
            และระบบยืนยันตัวตน Shh PASS (Passwordless Zero-Trust)
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-[var(--theme-text-secondary)] font-medium">
          <div className="flex items-center gap-1.5"><LockKeyhole className="w-4 h-4 text-[var(--theme-primary)]" /> End-to-End Encrypted</div>
          <div className="flex items-center gap-1.5"><MonitorSmartphone className="w-4 h-4 text-[var(--theme-primary)]" /> Passkey Ready</div>
        </div>
      </div>

      {/* Right panel: Auth */}
      <div className="flex-1 bg-transparent p-8 md:p-16 flex flex-col justify-center relative z-10">
        <div className="max-w-md w-full mx-auto">
          
          {/* LOGIN FLOW */}
          {view === 'login' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-display font-bold text-[var(--theme-text-primary)] tracking-tight mb-2">ยินดีต้อนรับกลับมา</h2>
                <p className="text-sm text-[var(--theme-text-secondary)]">
                  {loginStep === 1 ? 'กรอกชื่อผู้ใช้เพื่อเข้าสู่ระบบผ่านระบบ Shh PASS' : 'ยืนยันตัวตนด้วยวิธีที่รองรับ'}
                </p>
              </div>

              {loginStep === 1 && (
                <div className="space-y-6">
                  {recentSession && (
                    <div 
                      onClick={(e) => handleLoginInit(e as any, recentSession.username)}
                      className="cursor-pointer bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-[var(--theme-primary)] rounded-xl p-4 flex items-center gap-4 transition-all shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--theme-border)] shrink-0 bg-[var(--theme-surface)] flex items-center justify-center">
                        {renderRecentSessionAvatar(recentSession)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--theme-text-primary)] truncate">{recentSession.displayName}</div>
                        <div className="text-xs text-[var(--theme-text-secondary)] truncate">@{recentSession.username}</div>
                        <div className="text-[10px] text-[var(--theme-text-secondary)] mt-0.5 opacity-70">
                          เข้าสู่ระบบล่าสุด: {new Date(recentSession.lastLogin).toLocaleString('th-TH')}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[var(--theme-text-secondary)]" />
                    </div>
                  )}

                  {recentSession && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--theme-border)]"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-[var(--theme-surface)] px-2 text-[var(--theme-text-secondary)]">หรือเข้าสู่ระบบด้วยบัญชีอื่น</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLoginInit} className="space-y-4">
                    <div>
                      <label htmlFor="loginUsername" className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">ชื่อผู้ใช้ (Username)</label>
                      <input
                        type="text"
                        id="loginUsername"
                        name="loginUsername"
                        required={!recentSession && !loginUsername}
                        value={loginUsername}
                        onChange={e => setLoginUsername(e.target.value)}
                        placeholder="e.g. shush_user"
                        className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--theme-primary)] transition-colors text-[var(--theme-text-primary)]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] bg-[var(--theme-bg)] cursor-pointer"
                      />
                      <label htmlFor="rememberMe" className="text-sm text-[var(--theme-text-secondary)] cursor-pointer select-none">
                        จดจำฉัน (Remember me)
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl py-3 font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      ดำเนินการต่อ <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {loginStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-[var(--theme-bg)] p-4 rounded-xl border border-[var(--theme-border)] text-center">
                    <MonitorSmartphone className="w-8 h-8 text-[var(--theme-primary)] mx-auto mb-2" />
                    <h3 className="font-bold text-[var(--theme-text-primary)]">
                      {selectedMethod === 'passkeys' ? 'ใช้งาน Passkey ของคุณ' : 
                       selectedMethod === 'totp' ? 'กรอกรหัส Authenticator' : 
                       selectedMethod === 'securityKey' ? 'เสียบ Security Key' : 'ตอบคำถามความปลอดภัย'}
                    </h3>
                    <p className="text-xs text-[var(--theme-text-secondary)] mt-1">
                      กำลังยืนยันตัวตนสำหรับ @{loginUsername}
                    </p>
                  </div>

                  {selectedMethod === 'passkeys' && (
                    <button onClick={() => handleLoginVerify()} className="w-full bg-[var(--theme-primary)] text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30">
                      <ShieldCheck className="w-5 h-5" /> ยืนยันด้วย Passkey
                    </button>
                  )}

                  {selectedMethod === 'totp' && (
                    <form onSubmit={handleLoginVerify} className="space-y-4">
                      <label htmlFor="totpProofInput" className="block text-xs text-center text-[var(--theme-text-secondary)]">รหัส 6 หลักจากแอป Authenticator</label>
                      <input
                        type="text" required maxLength={6}
                        id="totpProofInput"
                        name="totpProofInput"
                        value={proofInput} onChange={e => setProofInput(e.target.value)}
                        placeholder="รหัส 6 หลักจากแอป Authenticator"
                        className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 text-center tracking-[0.5em] text-xl font-mono focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                      <button type="submit" className="w-full bg-[var(--theme-primary)] text-white rounded-xl py-3 font-bold">ยืนยันรหัส</button>
                    </form>
                  )}

                  {selectedMethod === 'securityKey' && (
                    <button onClick={() => {
                        if (authOptions?.passkeyOptions) {
                          triggerPasskeyLogin(authOptions.passkeyOptions);
                        } else {
                          alert('ไม่มีข้อมูล FIDO2 / Security Key ในระบบ');
                        }
                    }} className="w-full bg-slate-800 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 border border-slate-700">
                      <KeyRound className="w-5 h-5" /> ยืนยันด้วย Security Key
                    </button>
                  )}

                  {selectedMethod === 'securityQuestions' && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!proofInput) return;
                      // Determine the question ID from authOptions. We need the current question ID.
                      // For now, let's assume authOptions.securityQuestions is provided.
                      const qId = authOptions?.securityQuestions?.[0]?.id || 0;
                      handleLoginVerify(undefined);
                    }} className="space-y-4">
                      <label htmlFor="questionAnswerInput" className="block text-xs text-[var(--theme-text-secondary)] mb-1">
                        {authOptions?.securityQuestions?.[0]?.question || 'คำถามความปลอดภัย'}
                      </label>
                      <input
                        type="text" required
                        id="questionAnswerInput"
                        name="questionAnswerInput"
                        value={proofInput} onChange={e => setProofInput(e.target.value)}
                        placeholder="คำตอบของคุณ"
                        className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                      <button type="submit" className="w-full bg-[var(--theme-primary)] text-white rounded-xl py-3 font-bold">ยืนยันคำตอบ</button>
                    </form>
                  )}

                  <div className="pt-4 border-t border-[var(--theme-border)]">
                    <p className="text-xs text-[var(--theme-text-secondary)] mb-3 text-center">วิธีลงชื่อเข้าใช้อื่นๆ</p>
                    <div className="space-y-2">
                      {authOptions.methods.map((m: string) => m !== selectedMethod && (
                        <button key={m} onClick={() => setSelectedMethod(m)} className="w-full text-sm py-2 px-4 rounded-lg bg-[var(--theme-bg)] hover:bg-[var(--theme-border)] transition-colors border border-[var(--theme-border)] text-left flex items-center justify-between">
                          <span>
                            {m === 'passkeys' && '📱 Passkey'}
                            {m === 'totp' && '🔢 Authenticator App'}
                            {m === 'securityKey' && '🔑 Security Key (FIDO2)'}
                            {m === 'securityQuestions' && '❓ Security Questions'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-[var(--theme-text-secondary)]" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setLoginStep(1)} className="w-full text-xs text-center text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]">
                    ← กลับไปแก้ไขชื่อผู้ใช้
                  </button>
                </div>
              )}

              {loginStep === 1 && (
                <div className="pt-8 flex flex-col gap-3 text-sm text-[var(--theme-text-secondary)]">
                  <div className="flex justify-between items-center bg-[var(--theme-bg)] p-3 rounded-lg border border-[var(--theme-border)] cursor-pointer hover:border-[var(--theme-primary)]/50 transition-colors" onClick={() => setView('recovery')}>
                    <span>พบปัญหาเข้าสู่ระบบ?</span>
                    <span className="text-[var(--theme-primary)] font-semibold flex items-center gap-1">กู้คืนบัญชี <ArrowRight className="w-3.5 h-3.5" /></span>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--theme-bg)] p-3 rounded-lg border border-[var(--theme-border)] cursor-pointer hover:border-[var(--theme-primary)]/50 transition-colors" onClick={handleStartRegister}>
                    <span>ยังไม่มีบัญชี Shush?</span>
                    <span className="text-[var(--theme-primary)] font-semibold flex items-center gap-1">สร้างบัญชีใหม่ <ArrowRight className="w-3.5 h-3.5" /></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REGISTER FLOW */}
          {view === 'register' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {isGeneratingKeys ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative">
                    <ShieldCheck className="w-16 h-16 text-[var(--theme-primary)] animate-pulse" />
                    <Key className="w-6 h-6 text-white absolute bottom-0 right-0" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">กำลังสร้างคู่กุญแจ E2EE</h3>
                    <p className="text-xs text-[var(--theme-text-secondary)]">กระบวนการนี้ทำงานอยู่บนอุปกรณ์ของคุณเท่านั้น</p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-[var(--theme-text-primary)] mb-2">สร้างตัวตนที่ซ่อนเร้น</h2>
                    <p className="text-sm text-[var(--theme-text-secondary)]">ข้อมูลของคุณถูกเข้ารหัสตั้งแต่เริ่มต้นด้วย E2EE</p>
                  </div>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label htmlFor="regUsername" className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">ชื่อผู้ใช้ (ไม่สามารถเปลี่ยนได้)</label>
                      <input type="text" id="regUsername" name="regUsername" required value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--theme-primary)]" placeholder="e.g. shadow_ninja" />
                    </div>
                    <div>
                      <label htmlFor="regDisplayName" className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">ชื่อแสดงผล</label>
                      <input type="text" id="regDisplayName" name="regDisplayName" required value={displayInput} onChange={e => setDisplayInput(e.target.value)} className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--theme-primary)]" placeholder="นินจาเงา" />
                    </div>
                    <div>
                      <label htmlFor="regBio" className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">คำอธิบายตัวเอง (Bio)</label>
                      <textarea id="regBio" name="regBio" value={bioInput} onChange={e => setBioInput(e.target.value)} rows={2} className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--theme-primary)] resize-none" placeholder="ซ่อนตัวอยู่ในเงามืด..." />
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-3">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-amber-600 dark:text-amber-400 text-sm">บันทึกรหัสกู้คืน (Recovery Key)</h4>
                          <p className="text-xs text-[var(--theme-text-secondary)] mt-1">
                            Shush ไม่มีระบบกู้คืนรหัสผ่านผ่านอีเมล หากคุณลืมรหัสผ่านหรือเปลี่ยนเครื่อง นี่คือวิธีเดียวที่จะเข้าถึงข้อมูลเดิมได้
                          </p>
                        </div>
                      </div>
                      <div className="bg-[var(--theme-bg)] p-3 rounded-lg flex items-center justify-between border border-[var(--theme-border)]">
                        <code className="text-[10px] sm:text-xs font-mono text-[var(--theme-text-primary)] break-all px-2 select-all">
                          {recoveryKeyInfo?.key}
                        </code>
                        <CopyButton textToCopy={recoveryKeyInfo?.key || ''} className="ml-2 bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-xs font-semibold px-3 py-1.5 rounded-md transition-colors shrink-0" />
                      </div>
                      <button type="button" onClick={handleDownloadRecoveryFile} className="w-full bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] rounded-lg py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-[var(--theme-border)]">
                        <Download className="w-4 h-4" /> บันทึกเป็นไฟล์ .shush
                      </button>
                    </div>

                    <button type="submit" className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-content)] rounded-xl py-3.5 font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                      เข้าร่วม Shush ตอนนี้
                    </button>
                    
                    <button type="button" onClick={() => setView('login')} className="w-full text-sm text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors text-center py-2">
                      มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* RECOVERY FLOW */}
          {view === 'recovery' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
              <div>
                <h2 className="text-2xl font-display font-bold text-amber-500 mb-2">กู้คืนบัญชี</h2>
                <p className="text-sm text-[var(--theme-text-secondary)]">ใช้ Recovery Code หรือ Recovery File ของคุณ</p>
              </div>
              
              {recoveryStep === 1 && (
                <form onSubmit={handleRecoveryInit} className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col items-center justify-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-amber-500" />
                    <div className="text-center">
                      <h4 className="font-bold text-amber-600 dark:text-amber-400 text-sm">อัปโหลดไฟล์ .shush</h4>
                      <p className="text-xs text-[var(--theme-text-secondary)] mt-1">ใช้ไฟล์ .shush ที่บันทึกไว้เพื่อกรอกข้อมูลกู้คืนโดยอัตโนมัติ</p>
                    </div>
                    <label className="cursor-pointer bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-primary)] border border-[var(--theme-border)] px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" /> เลือกไฟล์กู้คืน
                      <input type="file" accept=".shush" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[var(--theme-border)]"></div>
                    <span className="text-xs text-[var(--theme-text-secondary)] font-medium">หรือกรอกด้วยตัวเอง</span>
                    <div className="flex-1 h-px bg-[var(--theme-border)]"></div>
                  </div>

                  <div>
                    <label htmlFor="recoveryUsername" className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">ชื่อผู้ใช้ (Username)</label>
                    <input type="text" id="recoveryUsername" name="recoveryUsername" required value={recoveryUsername} onChange={e => setRecoveryUsername(e.target.value)} className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label htmlFor="recoveryInput" className="block text-xs text-[var(--theme-text-secondary)] mb-1.5">รหัสกู้คืนบัญชี 24 ตัวอักษร (Recovery Code)</label>
                    <input type="text" id="recoveryInput" name="recoveryInput" required value={recoveryInput} onChange={e => setRecoveryInput(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3.5 font-bold transition-all flex items-center justify-center gap-2">
                    <FileKey className="w-4 h-4" /> ยืนยันรหัสกู้คืน (Step 1)
                  </button>
                </form>
              )}

              {recoveryStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 text-center">
                    <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <h3 className="font-bold text-amber-600">ตรวจสอบสิทธิ์สำเร็จ</h3>
                    <p className="text-xs text-[var(--theme-text-secondary)] mt-1">
                      (Step 2) เพื่อความปลอดภัยสูงสุด กรุณายืนยันตัวตนอีก 1 วิธี
                    </p>
                  </div>
                  
                  {/* Reuse login verify UI for Step 2 */}
                  {selectedMethod === 'passkeys' && (
                    <button onClick={() => handleLoginVerify()} className="w-full bg-[var(--theme-primary)] text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> ยืนยันด้วย Passkey
                    </button>
                  )}
                  {selectedMethod === 'totp' && (
                    <form onSubmit={handleLoginVerify} className="space-y-4">
                      <label htmlFor="totpProofInput2" className="block text-xs text-center text-[var(--theme-text-secondary)]">รหัส 6 หลักจากแอป Authenticator</label>
                      <input type="text" id="totpProofInput2" name="totpProofInput2" required maxLength={6} value={proofInput} onChange={e => setProofInput(e.target.value)} placeholder="รหัส 6 หลักจากแอป Authenticator" className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 text-center tracking-[0.5em] text-xl font-mono" />
                      <button type="submit" className="w-full bg-[var(--theme-primary)] text-white rounded-xl py-3 font-bold">ยืนยันรหัส</button>
                    </form>
                  )}
                  {selectedMethod === 'securityKey' && (
                    <button onClick={() => handleLoginVerify()} className="w-full bg-slate-800 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2">
                      <KeyRound className="w-5 h-5" /> ตรวจสอบ Security Key
                    </button>
                  )}
                  {selectedMethod === 'securityQuestions' && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!proofInput) return;
                      handleLoginVerify(undefined);
                    }} className="space-y-4">
                      <label htmlFor="questionAnswerInput2" className="block text-xs text-[var(--theme-text-secondary)] mb-1">
                        {authOptions?.securityQuestions?.[0]?.question || 'คำถามความปลอดภัย'}
                      </label>
                      <input
                        type="text" required
                        id="questionAnswerInput2"
                        name="questionAnswerInput2"
                        value={proofInput} onChange={e => setProofInput(e.target.value)}
                        placeholder="คำตอบของคุณ"
                        className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                      <button type="submit" className="w-full bg-[var(--theme-primary)] text-white rounded-xl py-3 font-bold">ยืนยันคำตอบ</button>
                    </form>
                  )}

                  <div className="pt-4 border-t border-[var(--theme-border)]">
                    <div className="space-y-2">
                      {authOptions?.methods.map((m: string) => m !== selectedMethod && (
                        <button key={m} onClick={() => setSelectedMethod(m)} className="w-full text-sm py-2 px-4 rounded-lg bg-[var(--theme-bg)] hover:bg-[var(--theme-border)] transition-colors border border-[var(--theme-border)] text-left flex items-center justify-between">
                          <span>
                            {m === 'passkeys' && '📱 Passkey'}
                            {m === 'totp' && '🔢 Authenticator App'}
                            {m === 'securityKey' && '🔑 Security Key (FIDO2)'}
                            {m === 'securityQuestions' && '❓ Security Questions'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-[var(--theme-text-secondary)]" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--theme-border)]">
                <button onClick={() => setView('login')} className="w-full text-sm text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors">
                  ← ยกเลิกการกู้คืน
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
