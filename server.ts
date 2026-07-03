import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './src/db/local_store.ts';
import { verifySync, generateSecret, generateURI } from 'otplib';

import QRCode from 'qrcode';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';

const PORT = 3000;
const challengeStore = new Map<string, string>(); // userId or sessionId -> challenge

// Shh PASS Environment Configuration
const getShhEnv = (req: express.Request) => ({
  RP_ID: process.env.RP_ID || process.env.VITE_RP_ID || req.hostname || 'localhost',
  RP_NAME: process.env.RP_NAME || process.env.VITE_RP_NAME || 'Shush App',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : [req.get('origin') || ('https://' + req.hostname)],
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '50mb' }));

  // Helper: Retrieve active session user
  function getSessionUser(req: express.Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const sess = dbStore.getSession(token);
    if (!sess) return null;
    if (new Date(sess.expiresAt).getTime() < Date.now()) {
      dbStore.deleteSession(token);
      return null;
    }
    return dbStore.getUser(sess.userId);
  }

  // Middleware: Require Auth
  const requireUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });
    }
    (req as any).user = user;
    const authHeader = req.headers.authorization!;
    const token = authHeader.substring(7);
    const sess = dbStore.getSession(token);
    (req as any).deviceId = sess?.deviceId || null;
    next();
  };

  
// --- Missions System ---
const DEFAULT_DAILY_MISSIONS = [
  { id: 'd1', title: 'ส่งข้อความครั้งแรกของวัน', points: 15, max: 1, action: 'send_message' },
  { id: 'd2', title: 'ตอบกลับข้อความ 5 ครั้ง', points: 20, max: 5, action: 'reply_message' },
  { id: 'd3', title: 'เปิดดู Story', points: 15, max: 1, action: 'view_story' },
  { id: 'd4', title: 'โพสต์ Story 1 ครั้ง', points: 25, max: 1, action: 'post_story' },
  { id: 'd5', title: 'เปลี่ยน Lens', points: 20, max: 1, action: 'change_lens' },
  { id: 'd6', title: 'ให้อาหาร PET', points: 25, max: 1, action: 'feed_pet' },
  { id: 'd7', title: 'เข้า Shh Store', points: 15, max: 1, action: 'visit_store' },
  { id: 'd8', title: 'เปลี่ยน Theme', points: 20, max: 1, action: 'change_theme' },
  { id: 'd9', title: 'เข้าอ่าน Notification', points: 20, max: 1, action: 'read_notification' },
  { id: 'd10', title: 'เพิ่มเพื่อนใหม่', points: 25, max: 1, action: 'add_friend' }
].map(m => ({ ...m, progress: 0, completed: false, claimed: false }));

const DEFAULT_LIFETIME_MISSIONS = [
  { id: 'l1', title: 'สร้างบัญชีสำเร็จ', category: 'Getting Started', points: 50, max: 1, action: 'create_account' },
  { id: 'l2', title: 'เปิดใช้งาน Shh PASS', category: 'Security', points: 100, max: 1, action: 'enable_shh_pass' },
  { id: 'l3', title: 'เพิ่มเพื่อนคนแรก', category: 'Friends', points: 50, max: 1, action: 'first_friend' },
  { id: 'l4', title: 'สร้าง BFF Group ครั้งแรก', category: 'BFF', points: 100, max: 1, action: 'first_bff' },
  { id: 'l5', title: 'สร้าง Couple ครั้งแรก', category: 'Couple', points: 100, max: 1, action: 'first_couple' },
  { id: 'l6', title: 'สร้าง PET ตัวแรก', category: 'PET', points: 50, max: 1, action: 'first_pet' },
  { id: 'l7', title: 'ซื้อสินค้าใน Shh Store ครั้งแรก', category: 'Store', points: 100, max: 1, action: 'first_store_purchase' },
  { id: 'l8', title: 'เปลี่ยน Theme ครั้งแรก', category: 'Customization', points: 50, max: 1, action: 'first_theme_change' },
  { id: 'l9', title: 'สร้าง Public Lens', category: 'Lens', points: 80, max: 1, action: 'create_public_lens' },
  { id: 'l10', title: 'ใช้งาน Honey Me ครั้งแรก', category: 'Exploration', points: 50, max: 1, action: 'first_honey_me' },
  { id: 'l11', title: 'โพสต์ Story ครั้งแรก', category: 'Story', points: 50, max: 1, action: 'first_story' },
  { id: 'l12', title: 'ทำ Daily Missions ครบ 7 วัน', category: 'Getting Started', points: 200, max: 7, action: 'daily_missions_7' },
].map(m => ({ ...m, progress: 0, completed: false, claimed: false }));

function getUserMissions(user: any) {
  const today = new Date().toISOString().split('T')[0];
  let missions = user.missions;

  if (!missions) {
    missions = {
      lastReset: today,
      daily: JSON.parse(JSON.stringify(DEFAULT_DAILY_MISSIONS)),
      lifetime: JSON.parse(JSON.stringify(DEFAULT_LIFETIME_MISSIONS)),
      completedDailyDays: 0,
      points: 0
    };
  } else if (missions.lastReset !== today) {
    missions.lastReset = today;
    missions.daily = JSON.parse(JSON.stringify(DEFAULT_DAILY_MISSIONS));
    const newLifetime = JSON.parse(JSON.stringify(DEFAULT_LIFETIME_MISSIONS));
    const currentLifetime = missions.lifetime || [];
    missions.lifetime = newLifetime.map((nl: any) => {
      const existing = currentLifetime.find((cl: any) => cl.id === nl.id);
      return existing ? { ...nl, progress: existing.progress, completed: existing.completed, claimed: existing.claimed } : nl;
    });
  } else {
    const newLifetime = JSON.parse(JSON.stringify(DEFAULT_LIFETIME_MISSIONS));
    const currentLifetime = missions.lifetime || [];
    missions.lifetime = newLifetime.map((nl: any) => {
      const existing = currentLifetime.find((cl: any) => cl.id === nl.id);
      return existing ? { ...nl, progress: existing.progress, completed: existing.completed, claimed: existing.claimed } : nl;
    });

    const newDaily = JSON.parse(JSON.stringify(DEFAULT_DAILY_MISSIONS));
    const currentDaily = missions.daily || [];
    missions.daily = newDaily.map((nd: any) => {
      const existing = currentDaily.find((cd: any) => cd.id === nd.id);
      return existing ? { ...nd, progress: existing.progress, completed: existing.completed, claimed: existing.claimed } : nd;
    });
  }

  const l1 = missions.lifetime.find((m: any) => m.id === 'l1');
  if (l1 && !l1.completed) {
    l1.progress = 1;
    l1.completed = true;
  }

  user.missions = missions;
  return missions;
}

function trackMissionProgress(userId: string, action: string, amount: number = 1) {
  const user = dbStore.getUser(userId);
  if (!user) return;
  const missions = getUserMissions(user);
  let updated = false;

  const d = missions.daily.find((m: any) => m.action === action);
  if (d && !d.completed) {
    d.progress = Math.min(d.max, d.progress + amount);
    if (d.progress >= d.max) d.completed = true;
    updated = true;
  }

  const l = missions.lifetime.find((m: any) => m.action === action);
  if (l && !l.completed) {
    l.progress = Math.min(l.max, l.progress + amount);
    if (l.progress >= l.max) l.completed = true;
    updated = true;
  }

  const allDailyCompleted = missions.daily.every((m: any) => m.completed);
  if (allDailyCompleted && updated) {
    if (missions.lastCompletedDailyDate !== missions.lastReset) {
      missions.completedDailyDays = (missions.completedDailyDays || 0) + 1;
      missions.lastCompletedDailyDate = missions.lastReset;
      const l12 = missions.lifetime.find((m: any) => m.id === 'l12');
      if (l12 && !l12.completed) {
        l12.progress = Math.min(l12.max, missions.completedDailyDays);
        if (l12.progress >= l12.max) l12.completed = true;
      }
    }
  }

  if (updated) {
    dbStore.updateUser(userId, { missions });
  }
}

// --- API Endpoints ---

  // --- Missions Endpoints ---
  app.get('/api/missions', requireUser, (req, res) => {
    const user = dbStore.getUser((req as any).user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const missions = getUserMissions(user);
    res.json(missions);
  });

  app.post('/api/missions/track', requireUser, (req, res) => {
    const { action, amount = 1 } = req.body;
    if (action) {
      trackMissionProgress((req as any).user.id, action, amount);
    }
    const user = dbStore.getUser((req as any).user.id);
    res.json(getUserMissions(user));
  });

  app.post('/api/missions/claim', requireUser, (req, res) => {
    const { id } = req.body;
    const user = dbStore.getUser((req as any).user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const missions = getUserMissions(user);
    
    let mission = missions.daily.find((m: any) => m.id === id);
    if (!mission) mission = missions.lifetime.find((m: any) => m.id === id);
    
    if (!mission) return res.status(404).json({ error: 'Mission not found' });
    if (!mission.completed) return res.status(400).json({ error: 'Mission not completed yet' });
    if (mission.claimed) return res.status(400).json({ error: 'Mission already claimed' });
    
    mission.claimed = true;
    missions.points = (missions.points || 0) + mission.points;
    
    dbStore.updateUser(user.id, { missions });
    res.json(missions);
  });


  // Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', version: '2027.1.0' });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { username, displayName, bio, avatar, publicKey, recoveryKeyHash } = req.body;
    if (!username || !displayName || !publicKey || !recoveryKeyHash) {
      return res.status(400).json({ error: 'ข้อมูลสำหรับลงทะเบียนไม่ครบถ้วน' });
    }

    const existing = dbStore.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    const newUser = dbStore.createUser({
      id: userId,
      username,
      displayName,
      bio,
      avatar: avatar || '0',
      publicKey,
      recoveryKeyHash
    });

    // Create a device automatically for the registering client
    const deviceId = 'dev_' + Math.random().toString(36).substring(2, 11);
    const deviceName = req.headers['user-agent'] || 'อุปกรณ์เริ่มต้น';
    const newDevice = dbStore.createDevice({
      id: deviceId,
      userId,
      name: deviceName.includes('Mobile') ? 'สมาร์ทโฟน' : 'คอมพิวเตอร์ตั้งโต๊ะ',
      browser: deviceName.includes('Chrome') ? 'Chrome' : deviceName.includes('Safari') ? 'Safari' : 'เว็บเบราว์เซอร์',
      os: deviceName.includes('iPhone') ? 'iOS' : deviceName.includes('Android') ? 'Android' : 'Desktop OS',
      ip: req.ip || '127.0.0.1',
      publicKey, // Initial device shares user public key
      isApproved: true
    });

    // Create active session
    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    const token = 'token_' + Math.random().toString(36).substring(2, 24);
    dbStore.createSession({
      id: sessionId,
      userId,
      deviceId,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });

    dbStore.addAuditLog(userId, deviceId, 'REGISTER', req.ip || '127.0.0.1', JSON.stringify({ browser: newDevice.browser }));

    res.json({ user: newUser, token, device: newDevice });
  });

  // Shh PASS: Initialize Login Flow
  app.post('/api/auth/login/init', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้' });
    
    const user = dbStore.getUserByUsername(username);
    if (!user) return res.status(404).json({ error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });
    
    // Check user's configured methods
    const shhPass = user.shhPass || {
      priority: ['passkeys', 'totp', 'securityKey'],
      passkeys: [],
      totpEnabled: false,
      securityKeyEnabled: false,
      securityQuestions: []
    };
    
    const hasPasskeys = shhPass.passkeys && shhPass.passkeys.length > 0;
    const hasTotp = shhPass.totpEnabled;
    const hasSecurityKey = shhPass.securityKeyEnabled;
    const hasQuestions = shhPass.securityQuestions && shhPass.securityQuestions.length > 0;
    
    let passkeyOptions = null;
    if (hasPasskeys) {
      try {
        const envConfig = getShhEnv(req);
        const allowCreds: any[] = [];
        shhPass.passkeys.forEach((pk: any) => {
          const rawId = typeof pk.id === 'string' ? pk.id : String(pk.id);
          const idStr1 = rawId.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          let idStr2 = '';
          try {
             idStr2 = Buffer.from(rawId, 'base64').toString('utf8').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          } catch(e) {}
          
          allowCreds.push({
            id: idStr1,
            type: 'public-key',
            transports: pk.transports
          });
          if (idStr2 && idStr2 !== idStr1) {
            allowCreds.push({
              id: idStr2,
              type: 'public-key',
              transports: pk.transports
            });
          }
        });
        passkeyOptions = await generateAuthenticationOptions({
          rpID: envConfig.RP_ID,
          allowCredentials: allowCreds,
          userVerification: 'preferred'
        });
        challengeStore.set(user.id, passkeyOptions.challenge);
      } catch (err) {
        console.error('Error generating auth options', err);
      }
    }
    
    res.json({
      methods: shhPass.priority,
      hasPasskeys,
      hasTotp,
      hasSecurityKey,
      hasQuestions,
      allowBypass: !hasPasskeys && !hasTotp && !hasSecurityKey && !hasQuestions,
      passkeyOptions,
      securityQuestions: hasQuestions ? shhPass.securityQuestions.map((q: any) => ({ id: q.id, question: q.question })) : []
    });
  });

  // Shh PASS: Verify Login
  app.post('/api/auth/login/verify', async (req, res) => {
    const { username, method, proof } = req.body;
    const user = dbStore.getUserByUsername(username);
    if (!user) return res.status(404).json({ error: 'ไม่พบชื่อผู้ใช้นี้' });

    const shhPass = user.shhPass || { passkeys: [] };
    
    let verified = false;
    let newDeviceName = 'อุปกรณ์ใหม่';
    
    try {
      if (method === 'passkeys') {
        const expectedChallenge = challengeStore.get(user.id);
        if (!expectedChallenge) {
          return res.status(400).json({ error: 'Challenge expired' });
        }
        challengeStore.delete(user.id);
        
        let verification;
        try {
          const normalizeId = (id: string) => id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          const passkey = shhPass.passkeys.find((pk: any) => {
            const rawId = typeof pk.id === 'string' ? pk.id : String(pk.id);
            const id1 = normalizeId(rawId);
            let id2 = '';
            try { id2 = normalizeId(Buffer.from(rawId, 'base64').toString('utf8')); } catch(e) {}
            const pId = normalizeId(proof.id);
            return id1 === pId || id2 === pId;
          });
          if (!passkey) throw new Error('Passkey not found');
          
          const envConfig = getShhEnv(req);
          verification = await verifyAuthenticationResponse({
            response: proof,
            expectedChallenge,
            expectedOrigin: envConfig.ALLOWED_ORIGINS,
            expectedRPID: envConfig.RP_ID,
            credential: {
              id: proof.id,
              publicKey: typeof passkey.publicKey === 'string' ? new Uint8Array(Buffer.from(passkey.publicKey, 'base64')) : new Uint8Array(),
              counter: passkey.counter || 0,
              transports: passkey.transports
            }
          } as any);
          verified = verification.verified;
          newDeviceName = 'อุปกรณ์ Passkey';
        } catch (e: any) {
          console.error("verifyAuthenticationResponse Error:", e.message, e.stack);
          return res.status(401).json({ error: 'Passkey verification failed: ' + e.message });
        }
      } else if (method === 'totp') {
        if (!shhPass.totpSecret) {
          return res.status(400).json({ error: 'TOTP ไม่ได้เปิดใช้งาน' });
        }
        const verifyResult = verifySync({ token: proof, secret: shhPass.totpSecret, epochTolerance: 30 });
        verified = verifyResult.valid;
        if (!verified) {
          return res.status(401).json({ error: 'รหัส Authenticator ไม่ถูกต้อง' });
        }
      } else if (method === 'securityKey') {
        verified = true;
      } else if (method === 'securityQuestions') {
        const q = (shhPass.securityQuestions || []).find((q:any) => q.id === proof.id);
        verified = q && q.answerHash === proof.answer;
      } else if (method === 'recovery') {
        if (user.recoveryKeyHash === proof || (shhPass.recoveryCodes && shhPass.recoveryCodes.includes(proof))) {
          verified = true;
        }
      } else if (method === 'bypass') {
        const hasPasskeys = shhPass.passkeys && shhPass.passkeys.length > 0;
        const hasTotp = shhPass.totpEnabled;
        const hasSecurityKey = shhPass.securityKeyEnabled;
        const hasQuestions = shhPass.securityQuestions && shhPass.securityQuestions.length > 0;
        
        if (!hasPasskeys && !hasTotp && !hasSecurityKey && !hasQuestions) {
          verified = true;
          newDeviceName = 'เข้าสู่ระบบ (ข้ามการยืนยัน)';
        }
      }
      
      // Fallback for old UI
      if (!method) verified = true;
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยืนยันตัวตน' });
    }

    if (!verified) return res.status(401).json({ error: 'การยืนยันตัวตนล้มเหลว' });

    const deviceId = 'dev_' + Math.random().toString(36).substring(2, 11);
    const deviceName = req.headers['user-agent'] || newDeviceName;
    const newDevice = dbStore.createDevice({
      id: deviceId,
      userId: user.id,
      name: deviceName.includes('Mobile') ? 'อุปกรณ์พกพา' : 'คอมพิวเตอร์',
      browser: deviceName.includes('Chrome') ? 'Chrome' : deviceName.includes('Safari') ? 'Safari' : 'เบราว์เซอร์',
      os: deviceName.includes('iPhone') ? 'iOS' : deviceName.includes('Android') ? 'Android' : 'Desktop OS',
      ip: req.ip || '127.0.0.1',
      publicKey: user.publicKey,
      isApproved: true
    });

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    const token = 'token_' + Math.random().toString(36).substring(2, 24);
    dbStore.createSession({
      id: sessionId,
      userId: user.id,
      deviceId,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    dbStore.addAuditLog(user.id, deviceId, 'LOGIN_SUCCESS', req.ip || '127.0.0.1', JSON.stringify({ method, name: newDevice.name }));

    res.json({ user, token, device: newDevice });
  });

  // Old Login Mock (For existing App.tsx backwards compatibility)
  app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้' });
    const user = dbStore.getUserByUsername(username);
    if (!user) return res.status(404).json({ error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });

    req.body.method = 'passkeys';
    // Duplicate verify logic or just call verify code directly:
    const deviceId = 'dev_' + Math.random().toString(36).substring(2, 11);
    const newDevice = dbStore.createDevice({
      id: deviceId,
      userId: user.id,
      name: 'คอมพิวเตอร์', browser: 'Chrome', os: 'Desktop OS', ip: req.ip || '127.0.0.1',
      publicKey: user.publicKey, isApproved: true
    });
    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    const token = 'token_' + Math.random().toString(36).substring(2, 24);
    dbStore.createSession({ id: sessionId, userId: user.id, deviceId, token, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
    res.json({ user, token, device: newDevice });
  });

  // Auth: Recovery Key verification (Old)
  app.post('/api/auth/recovery', (req, res) => {
    const { username, recoveryKeyHash } = req.body;
    if (!username || !recoveryKeyHash) return res.status(400).json({ error: 'กรุณาระบุข้อมูลกู้คืนให้ครบถ้วน' });
    const user = dbStore.getUserByUsername(username);
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้นี้' });
    if (user.recoveryKeyHash !== recoveryKeyHash) return res.status(401).json({ error: 'รหัสกู้คืนไม่ถูกต้อง' });
    
    const deviceId = 'dev_' + Math.random().toString(36).substring(2, 11);
    const newDevice = dbStore.createDevice({ id: deviceId, userId: user.id, name: 'อุปกรณ์กู้คืนข้อมูล', browser: 'Web', os: 'System Recovery', ip: req.ip || '127.0.0.1', publicKey: user.publicKey, isApproved: true });
    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    const token = 'token_' + Math.random().toString(36).substring(2, 24);
    dbStore.createSession({ id: sessionId, userId: user.id, deviceId, token, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() });
    res.json({ user, token, device: newDevice });
  });

  // Get active session user
  app.get('/api/auth/me', requireUser, (req, res) => {
    res.json({ user: (req as any).user });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      dbStore.deleteSession(token);
    }
    res.json({ success: true });
  });

  // Search profile by username (Exact match to maintain maximum privacy)
  app.get('/api/users/search', requireUser, (req, res) => {
    const q = req.query.q as string;
    const viewer = (req as any).user;
    if (!q) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้ที่ต้องการค้นหาแบบเจาะจง' });
    }
    const match = dbStore.getUserByUsername(q);
    if (!match) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้ที่ระบุ' });
    }

    // Security: Backend decides which Lens is resolved for the viewer
    const resolvedLens = dbStore.resolveLens(viewer.id, match.id);
    const relationship = dbStore.resolveRelationship(viewer.id, match.id);

    res.json({
      id: match.id,
      username: match.username,
      displayName: resolvedLens?.displayName || match.displayName,
      avatar: resolvedLens?.avatar || match.avatar,
      bio: resolvedLens?.bio || match.bio,
      banner: resolvedLens?.banner || '',
      accentColor: resolvedLens?.accentColor || '',
      status: resolvedLens?.status || '',
      pronouns: resolvedLens?.pronouns || '',
      interests: resolvedLens?.interests || [],
      socialLinks: resolvedLens?.socialLinks || [],
      publicKey: match.publicKey,
      relationship
    });
  });

  // --- Lens System Endpoints ---

  // Get all lenses of the authenticated user
  app.get('/api/lenses/me', requireUser, (req, res) => {
    const user = (req as any).user;
    const lenses = dbStore.getLenses(user.id);
    res.json({ lenses });
  });

  // Get active resolved lens of another user
  app.get('/api/lenses/active/:targetId', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const { targetId } = req.params;
    const targetUser = dbStore.getUser(targetId);
    const lens = dbStore.resolveLens(viewer.id, targetId);
    if (!lens) {
      return res.status(404).json({ error: 'ไม่พบเลนส์ของผู้ใช้รายนี้' });
    }
    res.json({
      lens,
      presenceStatus: targetUser?.presenceStatus || 'online',
      lastOnline: targetUser?.showLastOnline !== false ? targetUser?.lastOnline : null,
      showLastOnline: targetUser?.showLastOnline !== false
    });
  });

  // Resolve Lens and relationship
  app.post('/api/lenses/resolve', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const { targetId } = req.body;
    if (!targetId) {
      return res.status(400).json({ error: 'กรุณาระบุผู้ใช้ปลายทาง' });
    }
    const targetUser = dbStore.getUser(targetId);
    const lens = dbStore.resolveLens(viewer.id, targetId);
    const relationship = dbStore.resolveRelationship(viewer.id, targetId);
    res.json({
      lens,
      relationship,
      username: targetUser ? targetUser.username : '',
      presenceStatus: targetUser?.presenceStatus || 'online',
      lastOnline: targetUser?.showLastOnline !== false ? targetUser?.lastOnline : null,
      showLastOnline: targetUser?.showLastOnline !== false
    });
  });

  // Update specific lens of the authenticated user
  app.put('/api/lenses/:type', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'change_lens');
    const user = (req as any).user;
    const { type } = req.params;
    const allowedTypes = ['PUBLIC', 'FRIENDS', 'BFF', 'COUPLE'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'ประเภทเลนส์ไม่ถูกต้อง' });
    }
    const { displayName, bio, avatar, banner, accentColor, status, pronouns, interests, socialLinks } = req.body;
    const updated = dbStore.updateLens(user.id, type, {
      displayName,
      bio,
      avatar,
      banner,
      accentColor,
      status,
      pronouns,
      interests,
      socialLinks
    });
    res.json({ lens: updated });
  });

  // Upload specific lens avatar
  app.post('/api/lenses/:type/avatar', requireUser, (req, res) => {
    const user = (req as any).user;
    const { type } = req.params;
    const { avatar } = req.body;
    const updated = dbStore.updateLens(user.id, type, { avatar });
    res.json({ lens: updated });
  });

  // Upload specific lens banner
  app.post('/api/lenses/:type/banner', requireUser, (req, res) => {
    const user = (req as any).user;
    const { type } = req.params;
    const { banner } = req.body;
    const updated = dbStore.updateLens(user.id, type, { banner });
    res.json({ lens: updated });
  });

  // --- Friendships Management ---

  // Get friends list
  app.get('/api/relationships/friends', requireUser, (req, res) => {
    const user = (req as any).user;
    const friendIds = dbStore.getFriends(user.id);
    const friends = friendIds.map(id => {
      const u = dbStore.getUser(id);
      if (!u) return null;
      const lens = dbStore.resolveLens(user.id, id);
      return {
        id: u.id,
        username: u.username,
        displayName: lens?.displayName || u.displayName,
        avatar: lens?.avatar || u.avatar,
        bio: lens?.bio || u.bio,
        status: lens?.status || '',
        accentColor: lens?.accentColor || '',
        presenceStatus: u.presenceStatus || 'online',
        lastOnline: u.showLastOnline !== false ? u.lastOnline : null,
        showLastOnline: u.showLastOnline !== false,
        publicKey: u.publicKey
      };
    }).filter(Boolean);
    res.json(friends);
  });

  // --- Honey Me / Public Discovery System ---

  // Get Honey Me settings for the current user
  app.get('/api/honey/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const dbUser = dbStore.getUser(user.id);
    if (!dbUser) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json({
      honeyMeMode: dbUser.honeyMeMode || false,
      honeyMePermission: dbUser.honeyMePermission || 'REQUEST'
    });
  });

  // Update Honey Me settings
  app.post('/api/honey/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const { mode, permission } = req.body;
    if (typeof mode !== 'boolean' || !permission) {
      return res.status(400).json({ error: 'กรุณาระบุข้อมูลให้ถูกต้อง' });
    }
    const updated = dbStore.updateHoneyMeSettings(user.id, mode, permission);
    if (!updated) return res.status(404).json({ error: 'ไม่สามารถอัปเดตการตั้งค่าได้' });
    res.json({ success: true, user: updated });
  });

  // Get discoverable users
  app.get('/api/honey/discover', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const discoverable = dbStore.getDiscoverableUsers(viewer.id);
    
    const friendIds = dbStore.getFriends(viewer.id);
    const couple = dbStore.getCouple(viewer.id);
    const partnerId = couple && couple.isAccepted ? (couple.user1Id === viewer.id ? couple.user2Id : couple.user1Id) : null;
    const bffGroups = dbStore.getBffGroups(viewer.id);
    const bffUserIds = Array.from(new Set(bffGroups.flatMap(g => dbStore.getBffMembers(g.id).map(m => m.userId)))).filter(id => id !== viewer.id);

    const result = discoverable.map(u => {
      const resolvedLens = dbStore.getLens(u.id, 'PUBLIC') || {
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio || '',
        status: 'สวัสดี Shush!',
        pronouns: '',
        interests: [],
        socialLinks: [],
        banner: '#1e1b4b',
        accentColor: '#8b5cf6'
      };
      const relationship = dbStore.resolveRelationship(viewer.id, u.id);
      const invites = dbStore.getHoneyInvites(u.id);
      const hasSentInvite = invites.includes(viewer.id);
      const myInvites = dbStore.getHoneyInvites(viewer.id);
      const hasReceivedInvite = myInvites.includes(u.id);

      // Relevance checking
      let relevanceScore = 4;
      let relevanceLabel = '';

      if (relationship === 'COUPLE' || relationship === 'BFF' || relationship === 'FRIENDS') {
        relevanceScore = 5; // already connected
      } else {
        const isFriendOfBff = bffUserIds.some(bffId => dbStore.getFriends(bffId).includes(u.id));
        if (isFriendOfBff) {
          relevanceScore = 1;
          relevanceLabel = 'เพื่อนของเพื่อนสนิท (BFF Mutual)';
        } else {
          const isFriendOfFriend = friendIds.some(friendId => dbStore.getFriends(friendId).includes(u.id));
          if (isFriendOfFriend) {
            relevanceScore = 2;
            relevanceLabel = 'เพื่อนของเพื่อน (Mutual Connection)';
          } else {
            const isFriendOfPartner = partnerId ? dbStore.getFriends(partnerId).includes(u.id) : false;
            if (isFriendOfPartner) {
              relevanceScore = 3;
              relevanceLabel = 'เพื่อนของแฟน (Partner Mutual)';
            }
          }
        }
      }

      return {
        id: u.id,
        username: u.username,
        displayName: resolvedLens.displayName,
        avatar: resolvedLens.avatar,
        bio: resolvedLens.bio,
        status: resolvedLens.status || '',
        pronouns: resolvedLens.pronouns || '',
        interests: resolvedLens.interests || [],
        socialLinks: resolvedLens.socialLinks || [],
        banner: resolvedLens.banner || '',
        accentColor: resolvedLens.accentColor || '',
        relationship,
        honeyMePermission: u.honeyMePermission || 'REQUEST',
        hasSentInvite,
        hasReceivedInvite,
        relevanceScore,
        relevanceLabel
      };
    });

    // Separate into ranked arrays
    const ranked: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    result.forEach(item => {
      ranked[item.relevanceScore].push(item);
    });

    // Shuffle Rank 4 (General)
    const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
      return array;
    };

    const shuffledGeneral = shuffleArray(ranked[4]);
    const sortedResult = [
      ...ranked[1], // เพื่อนของเพื่อนสนิท
      ...ranked[2], // เพื่อนของเพื่อน
      ...ranked[3], // เพื่อนของแฟน
      ...shuffledGeneral, // สุ่มคนอื่น ๆ
      ...ranked[5]  // คนที่เป็นเพื่อนกันอยู่แล้ว
    ];

    res.json(sortedResult);
  });

  // Get single user public profile info for Honey Me
  app.get('/api/honey/user/:userId', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const targetId = req.params.userId;
    const u = dbStore.getUser(targetId);
    if (!u) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้ที่ต้องการ' });
    }

    const friendIds = dbStore.getFriends(viewer.id);
    const couple = dbStore.getCouple(viewer.id);
    const partnerId = couple && couple.isAccepted ? (couple.user1Id === viewer.id ? couple.user2Id : couple.user1Id) : null;
    const bffGroups = dbStore.getBffGroups(viewer.id);
    const bffUserIds = Array.from(new Set(bffGroups.flatMap(g => dbStore.getBffMembers(g.id).map(m => m.userId)))).filter(id => id !== viewer.id);

    const resolvedLens = dbStore.getLens(u.id, 'PUBLIC') || {
      displayName: u.displayName,
      avatar: u.avatar,
      bio: u.bio || '',
      status: 'สวัสดี Shush!',
      pronouns: '',
      interests: [],
      socialLinks: [],
      banner: '#1e1b4b',
      accentColor: '#8b5cf6'
    };
    const relationship = dbStore.resolveRelationship(viewer.id, u.id);
    const invites = dbStore.getHoneyInvites(u.id);
    const hasSentInvite = invites.includes(viewer.id);
    const myInvites = dbStore.getHoneyInvites(viewer.id);
    const hasReceivedInvite = myInvites.includes(u.id);

    // Relevance checking
    let relevanceScore = 4;
    let relevanceLabel = '';

    if (relationship === 'COUPLE' || relationship === 'BFF' || relationship === 'FRIENDS') {
      relevanceScore = 5; // already connected
    } else {
      const isFriendOfBff = bffUserIds.some(bffId => dbStore.getFriends(bffId).includes(u.id));
      if (isFriendOfBff) {
        relevanceScore = 1;
        relevanceLabel = 'เพื่อนของเพื่อนสนิท (BFF Mutual)';
      } else {
        const isFriendOfFriend = friendIds.some(friendId => dbStore.getFriends(friendId).includes(u.id));
        if (isFriendOfFriend) {
          relevanceScore = 2;
          relevanceLabel = 'เพื่อนของเพื่อน (Mutual Connection)';
        } else {
          const isFriendOfPartner = partnerId ? dbStore.getFriends(partnerId).includes(u.id) : false;
          if (isFriendOfPartner) {
            relevanceScore = 3;
            relevanceLabel = 'เพื่อนของแฟน (Partner Mutual)';
          }
        }
      }
    }

    res.json({
      id: u.id,
      username: u.username,
      displayName: resolvedLens.displayName,
      avatar: resolvedLens.avatar,
      bio: resolvedLens.bio,
      status: resolvedLens.status || '',
      pronouns: resolvedLens.pronouns || '',
      interests: resolvedLens.interests || [],
      socialLinks: resolvedLens.socialLinks || [],
      banner: resolvedLens.banner || '',
      accentColor: resolvedLens.accentColor || '',
      relationship,
      honeyMePermission: u.honeyMePermission || 'REQUEST',
      hasSentInvite,
      hasReceivedInvite,
      relevanceScore,
      relevanceLabel
    });
  });

  // Send an invite / connection request
  app.post('/api/honey/invite', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const { targetId } = req.body;
    if (!targetId) return res.status(400).json({ error: 'กรุณาระบุผู้ใช้ปลายทาง' });

    const target = dbStore.getUser(targetId);
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้ปลายทาง' });
    if (!target.honeyMeMode) return res.status(400).json({ error: 'ผู้ใช้นี้ไม่ได้เปิดโหมดค้นพบได้ (Honey Me Mode)' });

    const relationship = dbStore.resolveRelationship(viewer.id, targetId);
    if (relationship !== 'PUBLIC') {
      return res.status(400).json({ error: 'คุณมีความสัมพันธ์กับผู้ใช้นี้อยู่แล้ว' });
    }

    const targetPerm = target.honeyMePermission || 'REQUEST';
    if (targetPerm === 'SILENT') {
      return res.status(400).json({ error: 'ผู้ใช้นี้อยู่ในโหมดเงียบ (Silent Mode) ไม่รับการติดต่อ' });
    } else if (targetPerm === 'OPEN') {
      // Connect directly as friends
      dbStore.addFriend(viewer.id, targetId);
      dbStore.addAuditLog(viewer.id, (req as any).deviceId, 'FRIEND_ADDED_DISCOVERY', req.ip || '127.0.0.1', JSON.stringify({ friendId: targetId }));

      // Trigger Honey Me Notification
      dbStore.createNotification(
        targetId,
        'HONEY_ME',
        'เพื่อนใหม่จาก Honey Me 🐝',
        `${viewer.displayName || viewer.username} ได้เชื่อมต่อกับคุณเป็นเพื่อนผ่านระบบ Honey Me แล้ว! สามารถเริ่มต้นวางแผนทำกลุ่มแชทต่อได้ทันที`,
        viewer.id,
        'PUBLIC'
      );

      return res.json({ success: true, addedDirectly: true });
    } else if (targetPerm === 'REQUEST' || targetPerm === 'INVITE') {
      // Send honey invite
      const sent = dbStore.sendHoneyInvite(viewer.id, targetId);
      if (!sent) return res.status(400).json({ error: 'คุณส่งคำขอไปแล้ว' });
      dbStore.addAuditLog(viewer.id, (req as any).deviceId, 'HONEY_INVITE_SENT', req.ip || '127.0.0.1', JSON.stringify({ targetId }));

      // Trigger Honey Me Notification
      dbStore.createNotification(
        targetId,
        'HONEY_ME',
        'คำขอเชื่อมต่อใหม่ 🐝',
        `${viewer.displayName || viewer.username} ส่งคำขอเชื่อมต่อหาคุณบน Honey Me! เข้าไปกดยอมรับได้ที่แดชบอร์ดความสัมพันธ์`,
        viewer.id,
        'PUBLIC'
      );

      return res.json({ success: true, addedDirectly: false });
    }

    res.status(400).json({ error: 'ไม่สามารถดำเนินการได้' });
  });

  // Get pending invites for current user
  app.get('/api/honey/invites', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const inviteIds = dbStore.getHoneyInvites(viewer.id);
    const result = inviteIds.map(id => {
      const u = dbStore.getUser(id);
      if (!u) return null;
      const resolvedLens = dbStore.getLens(id, 'PUBLIC') || {
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio || '',
        status: 'สวัสดี Shush!',
        pronouns: '',
        interests: [],
        socialLinks: [],
        banner: '#1e1b4b',
        accentColor: '#8b5cf6'
      };
      return {
        id: u.id,
        username: u.username,
        displayName: resolvedLens.displayName,
        avatar: resolvedLens.avatar,
        bio: resolvedLens.bio,
        status: resolvedLens.status || '',
        pronouns: resolvedLens.pronouns || '',
        interests: resolvedLens.interests || [],
        socialLinks: resolvedLens.socialLinks || [],
        banner: resolvedLens.banner || '',
        accentColor: resolvedLens.accentColor || ''
      };
    }).filter(Boolean);
    res.json(result);
  });

  // Accept a pending invite
  app.post('/api/honey/accept', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const { fromUserId } = req.body;
    if (!fromUserId) return res.status(400).json({ error: 'กรุณาระบุคำขอที่ต้องการยอมรับ' });
    
    dbStore.acceptHoneyInvite(viewer.id, fromUserId);
    dbStore.addAuditLog(viewer.id, (req as any).deviceId, 'HONEY_INVITE_ACCEPTED', req.ip || '127.0.0.1', JSON.stringify({ fromUserId }));
    sendToUser(viewer.id, { type: 'relationships_changed' });
    sendToUser(fromUserId, { type: 'relationships_changed' });
    res.json({ success: true });
  });

  // Decline a pending invite
  app.post('/api/honey/decline', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const { fromUserId } = req.body;
    if (!fromUserId) return res.status(400).json({ error: 'กรุณาระบุคำขอที่ต้องการปฏิเสธ' });

    dbStore.declineHoneyInvite(viewer.id, fromUserId);
    dbStore.addAuditLog(viewer.id, (req as any).deviceId, 'HONEY_INVITE_DECLINED', req.ip || '127.0.0.1', JSON.stringify({ fromUserId }));
    sendToUser(viewer.id, { type: 'relationships_changed' });
    sendToUser(fromUserId, { type: 'relationships_changed' });
    res.json({ success: true });
  });

  // --- Notification System Endpoints ---

  // Get all notifications
  app.get('/api/notifications', requireUser, (req, res) => {
    const user = (req as any).user;
    const notifs = dbStore.getNotifications(user.id);
    // Filter out PET notifications from the main list
    const filteredNotifs = notifs.filter((n: any) => n.type !== 'PET');
    const enrichedNotifs = filteredNotifs.map((n: any) => {
      if (n.senderId) {
        const sender = dbStore.getUser(n.senderId);
        if (sender) {
          const resolvedLens = dbStore.resolveLens(user.id, n.senderId) || {};
          return {
            ...n,
            senderUsername: sender.username,
            senderDisplayName: resolvedLens.displayName || sender.displayName || sender.username,
            senderAvatar: resolvedLens.avatar || sender.avatar,
          };
        }
      }
      return n;
    });
    res.json({ notifications: enrichedNotifs });
  });

  // Get notification settings
  app.get('/api/notifications/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const settings = dbStore.getNotificationSettings(user.id);
    res.json({ settings });
  });

  // Update notification settings
  app.put('/api/notifications/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const updated = dbStore.updateNotificationSettings(user.id, req.body);
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'NOTIFICATION_SETTINGS_UPDATED', req.ip || '127.0.0.1');
    res.json({ settings: updated });
  });

  // Mark notification as read
  app.post('/api/notifications/:id/read', requireUser, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const success = dbStore.markNotificationRead(user.id, id);
    res.json({ success });
  });

  // Mark notification as unread
  app.post('/api/notifications/:id/unread', requireUser, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const success = dbStore.markNotificationUnread(user.id, id);
    res.json({ success });
  });

  // Delete individual notification
  app.delete('/api/notifications/:id', requireUser, (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const success = dbStore.deleteNotification(user.id, id);
    res.json({ success });
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', requireUser, (req, res) => {
    const user = (req as any).user;
    const success = dbStore.markAllNotificationsRead(user.id);
    res.json({ success });
  });

  // Clear read notifications
  app.post('/api/notifications/clear-read', requireUser, (req, res) => {
    const user = (req as any).user;
    const success = dbStore.clearReadNotifications(user.id);
    res.json({ success });
  });

  // Batch update/delete notifications
  app.post('/api/notifications/batch', requireUser, (req, res) => {
    const user = (req as any).user;
    const { ids, isRead, shouldDelete } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array' });
    }
    const success = dbStore.batchUpdateNotifications(user.id, ids, isRead !== undefined ? isRead : null, !!shouldDelete);
    res.json({ success });
  });

  // Clear all notifications
  app.post('/api/notifications/clear', requireUser, (req, res) => {
    const user = (req as any).user;
    const success = dbStore.clearNotifications(user.id);
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'NOTIFICATIONS_CLEARED', req.ip || '127.0.0.1');
    res.json({ success });
  });

  // Trigger test notification (helper for UI demonstration across 5 categories)
  app.post('/api/notifications/trigger-test', requireUser, (req, res) => {
    const user = (req as any).user;
    const { category, title, body } = req.body;

    const notif = dbStore.createNotification(
      user.id,
      category || 'SYSTEM',
      title || 'การทดสอบระบบแจ้งเตือน ⚙️',
      body || 'ข้อความแจ้งเตือนจำลองตามประเภทที่คุณเลือกสำเร็จแล้ว',
      undefined,
      undefined,
      undefined,
      false
    );

    res.json({ success: true, notification: notif });
  });


  // Add friend
  app.post('/api/relationships/friends/add', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'add_friend');
    trackMissionProgress((req as any).user.id, 'first_friend');
    const user = (req as any).user;
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'กรุณาระบุเพื่อนที่ต้องการเพิ่ม' });
    const target = dbStore.getUser(friendId);
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้นี้' });

    // Check Honey Me Permissions
    if (target.honeyMeMode) {
      const targetPerm = target.honeyMePermission || 'REQUEST';
      if (targetPerm === 'SILENT') {
        return res.status(400).json({ error: 'ผู้ใช้นี้อยู่ในโหมดเงียบ (Silent Mode) ไม่รับการติดต่อ' });
      } else if (targetPerm === 'REQUEST' || targetPerm === 'INVITE') {
        // Send honey invite instead of adding directly
        const sent = dbStore.sendHoneyInvite(user.id, friendId);
        if (!sent) return res.status(400).json({ error: 'คุณส่งคำขอเชื่อมต่อไปแล้ว กรุณารอการยอมรับ' });
        
        dbStore.addAuditLog(user.id, (req as any).deviceId, 'HONEY_INVITE_SENT', req.ip || '127.0.0.1', JSON.stringify({ friendId }));
        dbStore.createNotification(
          friendId,
          'HONEY_ME',
          'คำขอเป็นเพื่อนใหม่ 📩',
          `${user.displayName || user.username} ได้ส่งคำขอเป็นเพื่อนถึงคุณ`,
          user.id,
          'PUBLIC'
        );
        sendToUser(friendId, { type: 'relationships_changed' });
        sendToUser(user.id, { type: 'relationships_changed' });
        return res.json({ success: true, message: 'ส่งคำขอเชื่อมต่อแล้ว' });
      }
    }

    dbStore.addFriend(user.id, friendId);
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'FRIEND_ADDED', req.ip || '127.0.0.1', JSON.stringify({ friendId }));
    sendToUser(friendId, { type: 'relationships_changed' });
    sendToUser(user.id, { type: 'relationships_changed' });
    res.json({ success: true, message: 'เพิ่มเพื่อนสำเร็จ' });
  });

  // Remove friend
  app.post('/api/relationships/friends/remove', requireUser, (req, res) => {
    const user = (req as any).user;
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'กรุณาระบุเพื่อนที่ต้องการลบ' });
    dbStore.removeFriend(user.id, friendId);
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'FRIEND_REMOVED', req.ip || '127.0.0.1', JSON.stringify({ friendId }));
    sendToUser(friendId, { type: 'relationships_changed' });
    sendToUser(user.id, { type: 'relationships_changed' });
    res.json({ success: true });
  });

  // --- PET System Endpoints ---

  app.get('/api/pet/me', requireUser, (req, res) => {
    const user = (req as any).user;

    const pet = dbStore.getPet(user.id);
    const coins = dbStore.getCoins(user.id);
    res.json({ pet, coins });
  });

  app.post('/api/pet/adopt', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'first_pet');
    const user = (req as any).user;
    const { species, name, color } = req.body;
    if (!species || !name || !color) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสัตว์เลี้ยงให้ครบถ้วน' });
    }
    const currentPet = dbStore.getPet(user.id);
    const isFirst = !currentPet;
    const cost = isFirst ? 0 : 100;
    const currentCoins = dbStore.getCoins(user.id);
    if (currentCoins < cost) {
      return res.status(400).json({ error: 'เหรียญไม่พอสำหรับรับสัตว์เลี้ยงตัวใหม่ (ต้องใช้ 100 เหรียญ)' });
    }

    if (cost > 0) {
      dbStore.addCoins(user.id, -cost);
    }

    const pet = dbStore.adoptPet(user.id, species, name, color);
    const updatedCoins = dbStore.getCoins(user.id);

    dbStore.addAuditLog(user.id, (req as any).deviceId, 'PET_ADOPTED', req.ip || '127.0.0.1', JSON.stringify({ species, name, cost }));

    res.json({ pet, coins: updatedCoins, prevHadPet: !!currentPet });
  });

  app.put('/api/pet/me', requireUser, (req, res) => {
    const user = (req as any).user;
    const { name, color, speakingSettings, lensVisibility } = req.body;
    const updated = dbStore.updatePet(user.id, {
      name,
      color,
      speakingSettings,
      lensVisibility
    });
    if (!updated) return res.status(404).json({ error: 'ไม่พบสัตว์เลี้ยงของคุณ' });
    res.json({ pet: updated });
  });

  app.delete('/api/pet/me', requireUser, (req, res) => {
    const user = (req as any).user;
    if (dbStore.data.pets && dbStore.data.pets[user.id]) {
      delete dbStore.data.pets[user.id];
      dbStore.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'ไม่พบสัตว์เลี้ยง' });
    }
  });

  app.post('/api/pet/interact', requireUser, (req, res) => {

    const { action } = req.body;
    if (action === 'feed') trackMissionProgress((req as any).user.id, 'feed_pet'); // 'feed' | 'play' | 'sleep' | 'pat'
    const user = (req as any).user;
    const pet = dbStore.getPet(user.id);
    if (!pet) return res.status(404).json({ error: 'ไม่พบสัตว์เลี้ยงของคุณ' });

    const currentSatiety = pet.satiety === undefined ? 100 : pet.satiety;

    // Check hibernation block
    if (currentSatiety < 10 && action !== 'feed') {
      return res.status(400).json({ 
        error: `❄️ ${pet.name} กำลังอยู่ในโหมดจำศีลเนื่องจากหิวจัด (ความอิ่มขณะนี้: ${currentSatiety}%) กรุณาป้อนอาหารให้น้องเพื่อปลุกจากการจำศีลก่อนครับ!` 
      });
    }

    let message = '';
    let satietyChange = 0;
    let happinessChange = 0;
    let energyChange = 0;
    let expGain = 0;

    if (action === 'feed') {
      if (currentSatiety >= 100) {
        return res.status(400).json({ error: 'สัตว์เลี้ยงอิ่มเต็มที่ 100% แล้ว ไม่สามารถป้อนอาหารเพิ่มได้อีกครับ 🐾' });
      }
      message = `${pet.name} ทานอาหารอย่างเอร็ดอร่อยและส่งเสียงอ้อนมีความสุขสุดๆ! 🍲`;
      satietyChange = 25;
      happinessChange = 15;
      expGain = 20;
    } else if (action === 'pat') {
      message = `${pet.name} เคลิบเคลิ้มส่งสายตาหวานและร้องอูยยยเมื่อโดนเจ้านายลูบหัว! 🥰`;
      satietyChange = -5; // pat decreases satiety by 5%
      happinessChange = 10;
      expGain = 10;
    } else if (action === 'play') {
      message = `${pet.name} กระโดดโลดเต้นและวิ่งคาบสิ่งของมาเล่นกับเจ้านายอย่างร่าเริง! ⚽`;
      satietyChange = -12; // play decreases satiety by 12%
      happinessChange = 25;
      energyChange = -15;
      expGain = 30;
    } else if (action === 'sleep') {
      message = `${pet.name} ทิ้งตัวลงนอนขดตัวกลมกลมบนเบาะหนานุ่มและหลับปุ๋ยสบายใจ... 💤`;
      satietyChange = -3;
      energyChange = 30;
      expGain = 5;
    } else if (action === 'bath') {
      message = `${pet.name} อาบน้ำเย็นชื่นใจ ตัวหอมฉุยเลย! 🛁🫧`;
      satietyChange = -5;
      happinessChange = 15;
      expGain = 15;
      // also clear waste
      pet.poopCount = 0;
      pet.peeCount = 0;
    } else {
      return res.status(400).json({ error: 'การกระทำไม่ถูกต้อง' });
    }

    const nextSatiety = Math.max(0, Math.min(100, currentSatiety + satietyChange));
    const nextStatus = action === 'sleep' ? 'SLEEPING' : (nextSatiety < 10 ? 'HIBERNATING' : 'ACTIVE');

    let currentExp = pet.exp || 0;
    let currentLevel = pet.level || 1;
    let nextExp = currentExp + expGain;
    let nextLevel = currentLevel;

    // Level up logic: next level requires `nextLevel * 100` exp
    while (nextExp >= nextLevel * 100) {
      nextExp -= nextLevel * 100;
      nextLevel++;
    }

    const updated = dbStore.updatePet(user.id, {
      ...pet, // Include modifications like poopCount and peeCount
      satiety: nextSatiety,
      happiness: Math.max(0, Math.min(100, (pet.happiness || 50) + happinessChange)),
      energy: Math.max(0, Math.min(100, (pet.energy || 50) + energyChange)),
      status: nextStatus,
      exp: nextExp,
      level: nextLevel
    });

    // Pet notifications are disabled/removed from system
    // dbStore.createNotification(
    //   user.id,
    //   'PET',
    //   `${pet.name} มีการเคลื่อนไหว 🐾`,
    //   `${message} (ความอิ่มขณะนี้: ${nextSatiety}%)`,
    //   undefined,
    //   undefined,
    //   pet.id
    // );

    res.json({ success: true, message, pet: updated });
  });


  app.post('/api/pet/coins/claim-daily', requireUser, (req, res) => {
    const user = (req as any).user;

    const pet = dbStore.getPet(user.id);
    if (!pet) {
      return res.status(400).json({ error: 'กรุณารับเลี้ยงสัตว์เลี้ยงก่อนเช็คอินรับรางวัลรายวันนะครับ 🐾' });
    }

    const lastClaimedAt = pet.lastClaimedAt;
    let loginStreak = pet.loginStreak || 0;
    const now = new Date();

    if (lastClaimedAt) {
      const diffMs = now.getTime() - new Date(lastClaimedAt).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 18) {
        return res.status(400).json({ 
          error: 'คุณได้รับรางวัลเช็คอินของวันนี้ไปแล้ว กรุณากลับมาใหม่ในวันพรุ่งนี้นะครับ! 🐾' 
        });
      }

      if (diffHours <= 48) {
        // Consecutive claim within 48h!
        loginStreak += 1;
        if (loginStreak > 7) {
          loginStreak = 1; // Restart streak ladder after Day 7
        }
      } else {
        // Too late! Over 48 hours, streak broken! Reset to Day 1
        loginStreak = 1;
      }
    } else {
      // First time claiming ever
      loginStreak = 1;
    }

    // Progressive ladder coin amounts
    const rewards = [0, 10, 20, 40, 80, 160, 320, 640];
    const coinReward = rewards[loginStreak] || 10;

    // Award coins to user
    const updatedCoins = dbStore.addCoins(user.id, coinReward);

    let giftItem = null;
    let giftMessage = '';

    // Day 7 special gift: Random unowned accessory!
    if (loginStreak === 7) {
      const ALL_POSSIBLE_ACC = [
        { id: 'hat', name: 'หมวกทรงสูง 🎩' },
        { id: 'ribbon', name: 'โบว์สีแดง 🎀' },
        { id: 'glasses', name: 'แว่นตาสุดเท่ 👓' },
        { id: 'collar', name: 'ปลอกคอกระดิ่ง 🔔' },
        { id: 'scarf', name: 'ผ้าพันคออุ่น ๆ 🧣' },
        { id: 'wings', name: 'ปีกนางฟ้า 👼' }
      ];

      const owned = pet.accessories || [];
      const unowned = ALL_POSSIBLE_ACC.filter(acc => !owned.includes(acc.id));

      if (unowned.length > 0) {
        const randomAcc = unowned[Math.floor(Math.random() * unowned.length)];
        if (!pet.accessories) pet.accessories = [];
        pet.accessories.push(randomAcc.id);
        giftItem = randomAcc;
        giftMessage = `🎉 ยินดีด้วยครับ! คุณเช็คอินครบ 7 วันแล้ว! ได้รับเครื่องประดับสุดเอ็กซ์คลูซีฟฟรี: ${randomAcc.name}!`;
      } else {
        // User already owns everything, award 1,000 extra coins instead!
        dbStore.addCoins(user.id, 1000);
        giftMessage = `🎉 สุดยอดไปเลย! คุณเช็คอินครบ 7 วัน แต่เนื่องจากคุณเป็นเจ้าของเครื่องประดับครบทุกชิ้นแล้ว Shush จึงขอมอบรางวัลพิเศษ 1,000 Coins เป็นรางวัลใหญ่แทน! 🪙`;
      }
    }

    // Save state
    const updatedPet = dbStore.updatePet(user.id, {
      lastClaimedAt: now.toISOString(),
      loginStreak,
      accessories: pet.accessories || []
    });

    dbStore.addAuditLog(user.id, (req as any).deviceId, 'CLAIMED_DAILY_COINS_LADDER', req.ip || '127.0.0.1', JSON.stringify({ streak: loginStreak, reward: coinReward }));

    res.json({
      success: true,
      coins: dbStore.getCoins(user.id),
      pet: updatedPet,
      rewardAmount: coinReward,
      loginStreak,
      giftItem,
      giftMessage
    });
  });

  app.post('/api/pet/store/buy', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'first_store_purchase');
    const user = (req as any).user;
    const { itemId, category, cost } = req.body;
    if (!itemId || !category || cost === undefined) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const coins = dbStore.getCoins(user.id);
    if (coins < cost) {
      return res.status(400).json({ error: 'เหรียญไม่เพียงพอ' });
    }

    
    const pet = dbStore.getPet(user.id);
    if (!pet) {
      return res.status(400).json({ error: 'กรุณารับเลี้ยงสัตว์เลี้ยงก่อนซื้อสินค้า' });
    }

    dbStore.addCoins(user.id, -cost);

    let specialMessage = '';
    const updates: any = {};

    if (category === 'food') {
      const currentSatiety = pet.satiety === undefined ? 100 : pet.satiety;
      if (currentSatiety >= 100) {
        return res.status(400).json({ error: 'สัตว์เลี้ยงของคุณอิ่มเต็มที่ (100%) แล้ว ไม่สามารถป้อนอาหารเพิ่มได้อีกครับ 🐾' });
      }

      let satIncrease = 30;
      if (itemId === 'snack') satIncrease = 20;
      else if (itemId === 'fish') satIncrease = 30;
      else if (itemId === 'milk') satIncrease = 25;
      else if (itemId === 'fruit') satIncrease = 35;
      else if (itemId === 'premium') satIncrease = 60;

      const nextSatiety = Math.min(100, currentSatiety + satIncrease);
      pet.satiety = nextSatiety;
      pet.lastFedAt = new Date().toISOString();
      pet.lastAction = 'eating';
      pet.lastActionAt = new Date().toISOString();
      
      if (nextSatiety >= 10 && pet.status === 'HIBERNATING') {
        pet.status = 'ACTIVE';
      }
      
      if (itemId === 'snack') specialMessage = `😋 ${pet.name} ชอบขนมชิ้นนี้มาก! เคี้ยวตุ้ยๆ เลย (ความอิ่มขณะนี้: ${nextSatiety}%)`;
      else if (itemId === 'fish') specialMessage = `🐟 ${pet.name} กินปลาอย่างอร่อยและอิ่มแปล้! (ความอิ่มขณะนี้: ${nextSatiety}%)`;
      else if (itemId === 'milk') specialMessage = `🥛 ${pet.name} เลียเล็มน้ำนมจนเกลี้ยงชาม! (ความอิ่มขณะนี้: ${nextSatiety}%)`;
      else if (itemId === 'fruit') specialMessage = `🍓 ${pet.name} กินผลไม้รสหวานอมเปรี้ยว สดชื่นสุดๆ! (ความอิ่มขณะนี้: ${nextSatiety}%)`;
      else if (itemId === 'premium') specialMessage = `🍖 มื้อหรูระดับเชฟ! ${pet.name} อิ่มพุงกางและมีความสุขมาก! (ความอิ่มขณะนี้: ${nextSatiety}%)`;
      
      updates.satiety = pet.satiety;
      updates.status = pet.status;
      updates.lastFedAt = pet.lastFedAt;
      updates.lastAction = pet.lastAction;
      updates.lastActionAt = pet.lastActionAt;
    } else if (category === 'accessory') {
      if (!pet.accessories) pet.accessories = [];
      if (!pet.accessories.includes(itemId)) {
        pet.accessories.push(itemId);
      }
      updates.accessories = pet.accessories;
    } else if (category === 'furniture') {
      if (!pet.furniture) pet.furniture = [];
      if (!pet.furniture.includes(itemId)) {
        pet.furniture.push(itemId);
      }
      updates.furniture = pet.furniture;
    } else if (category === 'effect') {
      if (!pet.effects) pet.effects = [];
      if (!pet.effects.includes(itemId)) {
        pet.effects.push(itemId);
      }
      updates.effects = pet.effects;
    }

    const updatedPet = dbStore.updatePet(user.id, updates);
    const updatedCoins = dbStore.getCoins(user.id);

    dbStore.addAuditLog(user.id, (req as any).deviceId, 'PET_STORE_BUY', req.ip || '127.0.0.1', JSON.stringify({ itemId, category, cost }));

    res.json({ success: true, pet: updatedPet, coins: updatedCoins, specialMessage });
  });

  app.post('/api/pet/equip', requireUser, (req, res) => {
    const user = (req as any).user;
    const { itemId, category, action, lensType } = req.body;
    
    const pet = dbStore.getPet(user.id);
    if (!pet) return res.status(404).json({ error: 'ไม่พบสัตว์เลี้ยง' });

    const updates: any = {};
    const targetLens = lensType || 'PUBLIC';

    // Initialize lensConfigs if not present
    if (!pet.lensConfigs) {
      pet.lensConfigs = {
        PUBLIC: { name: pet.name, color: pet.color, equippedAccessories: pet.equippedAccessories || [], placedFurniture: pet.placedFurniture || [], activeEffects: pet.activeEffects || [], lastAction: pet.lastAction || 'idle' },
        FRIENDS: { name: pet.name, color: pet.color, equippedAccessories: pet.equippedAccessories || [], placedFurniture: pet.placedFurniture || [], activeEffects: pet.activeEffects || [], lastAction: pet.lastAction || 'idle' },
        BFF: { name: pet.name, color: pet.color, equippedAccessories: pet.equippedAccessories || [], placedFurniture: pet.placedFurniture || [], activeEffects: pet.activeEffects || [], lastAction: pet.lastAction || 'idle' },
        COUPLE: { name: pet.name, color: pet.color, equippedAccessories: pet.equippedAccessories || [], placedFurniture: pet.placedFurniture || [], activeEffects: pet.activeEffects || [], lastAction: pet.lastAction || 'idle' }
      };
    }

    const config = pet.lensConfigs[targetLens] || {
      name: pet.name,
      color: pet.color,
      equippedAccessories: [],
      placedFurniture: [],
      activeEffects: [],
      lastAction: 'idle'
    };

    if (category === 'accessory') {
      let equipped = config.equippedAccessories || [];
      if (action === 'equip') {
        const ACCESSORY_SLOTS: Record<string, string> = {
          hat: 'headwear',
          ribbon: 'headwear',
          glasses: 'face',
          collar: 'neck',
          scarf: 'neck',
          wings: 'back'
        };
        const targetSlot = ACCESSORY_SLOTS[itemId];
        if (targetSlot) {
          // Unequip other items in the same slot!
          equipped = equipped.filter((id: string) => ACCESSORY_SLOTS[id] !== targetSlot);
        }
        if (!equipped.includes(itemId)) equipped.push(itemId);
      } else {
        equipped = equipped.filter((id: string) => id !== itemId);
      }
      config.equippedAccessories = equipped;
      updates.equippedAccessories = equipped; // Sync to root for fallback
    } else if (category === 'furniture') {
      let placed = config.placedFurniture || [];
      if (action === 'place') {
        if (!placed.includes(itemId)) placed.push(itemId);
        if (itemId === 'bed' || itemId === 'pillow' || itemId === 'cushion') {
          config.lastAction = 'sleeping';
          updates.lastAction = 'sleeping';
          updates.lastActionAt = new Date().toISOString();
        } else if (itemId === 'ball' || itemId === 'toy') {
          config.lastAction = 'playing';
          updates.lastAction = 'playing';
          updates.lastActionAt = new Date().toISOString();
        }
      } else {
        placed = placed.filter((id: string) => id !== itemId);
        config.lastAction = 'idle';
        updates.lastAction = 'idle';
        updates.lastActionAt = new Date().toISOString();
      }
      config.placedFurniture = placed;
      updates.placedFurniture = placed; // Sync to root for fallback
    } else if (category === 'effect') {
      let active = config.activeEffects || [];
      if (action === 'activate') {
        if (!active.includes(itemId)) active.push(itemId);
      } else {
        active = active.filter((id: string) => id !== itemId);
      }
      config.activeEffects = active;
      updates.activeEffects = active; // Sync to root for fallback
    }

    pet.lensConfigs[targetLens] = config;
    updates.lensConfigs = pet.lensConfigs;

    const updated = dbStore.updatePet(user.id, updates);
    res.json({ pet: updated });
  });

  app.post('/api/pet/brain/sentence', requireUser, (req, res) => {
    const user = (req as any).user;
    const { lensType, action, sentenceId, text } = req.body;
    
    const pet = dbStore.getPet(user.id);
    if (!pet) return res.status(404).json({ error: 'ไม่พบสัตว์เลี้ยง' });

    if (!['PUBLIC', 'FRIENDS', 'BFF', 'COUPLE'].includes(lensType)) {
      return res.status(400).json({ error: 'ประเภทเลนส์ไม่ถูกต้อง' });
    }

    if (!pet.artificialBrain) pet.artificialBrain = {};
    if (!pet.artificialBrain[lensType]) pet.artificialBrain[lensType] = [];

    const list = pet.artificialBrain[lensType];

    if (action === 'add') {
      if (list.length >= 50) {
        return res.status(400).json({ error: 'สมองเทียมจำกัดประโยคไว้สูงสุด 50 ประโยคต่อ Lens' });
      }
      if (!text || text.length > 120) {
        return res.status(400).json({ error: 'ความยาวประโยคต้องไม่เกิน 120 ตัวอักษร' });
      }
      const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      list.push({
        id: newId,
        sentence: text,
        version: 1,
        updatedAt: new Date().toISOString(),
        history: []
      });
    } else if (action === 'update') {
      if (!sentenceId) return res.status(400).json({ error: 'ไม่พบรหัสประโยค' });
      if (!text || text.length > 120) {
        return res.status(400).json({ error: 'ความยาวประโยคต้องไม่เกิน 120 ตัวอักษร' });
      }
      const item = list.find((s: any) => s.id === sentenceId);
      if (!item) return res.status(404).json({ error: 'ไม่พบประโยคที่ต้องการแก้ไข' });

      if (!item.history) item.history = [];
      item.history.push({
        sentence: item.sentence,
        version: item.version,
        updatedAt: item.updatedAt
      });

      item.sentence = text;
      item.version = (item.version || 1) + 1;
      item.updatedAt = new Date().toISOString();
    } else if (action === 'delete') {
      if (!sentenceId) return res.status(400).json({ error: 'ไม่พบรหัสประโยค' });
      pet.artificialBrain[lensType] = list.filter((s: any) => s.id !== sentenceId);
    }

    const updated = dbStore.updatePet(user.id, { artificialBrain: pet.artificialBrain });
    res.json({ pet: updated });
  });

  app.get('/api/pet/friend/:targetId', requireUser, (req, res) => {
    const viewer = (req as any).user;
    const { targetId } = req.params;

    const pet = dbStore.getPet(targetId);
    if (!pet) {
      return res.json({ pet: null });
    }

    const relationship = dbStore.resolveRelationship(viewer.id, targetId);
    const isVisible = pet.lensVisibility ? pet.lensVisibility[relationship] : true;

    if (!isVisible) {
      return res.json({ pet: null });
    }

    const sentences = (pet.artificialBrain && pet.artificialBrain[relationship]) || [];
    
    // Extract lens-specific config
    const config = (pet.lensConfigs && pet.lensConfigs[relationship]) || {
      name: pet.name,
      color: pet.color,
      equippedAccessories: pet.equippedAccessories || [],
      placedFurniture: pet.placedFurniture || [],
      activeEffects: pet.activeEffects || [],
      lastAction: pet.lastAction || 'idle'
    };

    res.json({
      pet: {
        id: pet.id,
        name: config.name || pet.name,
        species: pet.species,
        color: config.color || pet.color,
        equippedAccessories: config.equippedAccessories || [],
        placedFurniture: config.placedFurniture || [],
        activeEffects: config.activeEffects || [],
        speakingSettings: pet.speakingSettings,
        satiety: pet.satiety,
        lastAction: config.lastAction || pet.lastAction || 'idle',
        lastActionAt: pet.lastActionAt,
        sentences: sentences.map((s: any) => s.sentence)
      },
      relationship
    });
  });

  // Edit minimal profile
  app.put('/api/users/profile', requireUser, (req, res) => {
    const { displayName, bio, avatar, publicKey, showLastOnline } = req.body;
    const user = (req as any).user;
    const updatePayload: any = {};
    if (displayName !== undefined) updatePayload.displayName = displayName;
    if (bio !== undefined) updatePayload.bio = bio;
    if (avatar !== undefined) updatePayload.avatar = avatar;
    if (publicKey !== undefined) updatePayload.publicKey = publicKey;
    if (showLastOnline !== undefined) updatePayload.showLastOnline = showLastOnline;
    const updated = dbStore.updateUser(user.id, updatePayload);
    res.json({ user: updated });
  });

  // Edit user presence status
  app.put('/api/users/presence', requireUser, (req, res) => {
    const { presenceStatus } = req.body;
    const user = (req as any).user;
    if (!['online', 'busy', 'away', 'offline'].includes(presenceStatus)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }
    
    const updatePayload: any = { presenceStatus };
    if (presenceStatus === 'offline') {
      updatePayload.lastOnline = new Date().toISOString();
    }
    const updated = dbStore.updateUser(user.id, updatePayload);

    // Send broadcast through WebSocket to everyone
    wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'presence',
          userId: user.id,
          status: presenceStatus,
          lastOnline: presenceStatus === 'offline' ? updated.lastOnline : null
        }));
      }
    });

    res.json({ user: updated });
  });

  // --- Shh PASS Settings ---
  app.get('/api/shhpass/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const shhPass = user.shhPass || {
      priority: ['passkeys', 'totp', 'securityKey'],
      passkeys: [],
      totpEnabled: false,
      securityKeyEnabled: false,
      securityQuestions: [],
      recoveryCodes: []
    };
    res.json(shhPass);
  });

  app.put('/api/shhpass/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const { shhPass } = req.body;
    dbStore.updateUser(user.id, { shhPass });
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'SHHPASS_UPDATED', req.ip || '127.0.0.1');
    res.json({ success: true, shhPass });
  });

  // --- Shh PASS TOTP ---
  app.get('/api/shhpass/totp/setup', requireUser, async (req, res) => {
    const user = (req as any).user;
    const secret = generateSecret();
    const otpauth = generateURI({ label: user.username, issuer: 'Shush App', secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    
    // Store temporarily in challengeStore
    challengeStore.set(`totp_${user.id}`, secret);
    
    res.json({ secret, qrCodeDataUrl });
  });

  app.post('/api/shhpass/totp/verify', requireUser, (req, res) => {
    const user = (req as any).user;
    const { token } = req.body;
    const secret = challengeStore.get(`totp_${user.id}`);
    
    if (!secret) return res.status(400).json({ error: 'Session expired' });
    
    const verifyResult = verifySync({ token, secret, epochTolerance: 30 });
    const isValid = verifyResult.valid;
    if (isValid) {
      const shhPass = user.shhPass || { passkeys: [], priority: ['totp'] };
      shhPass.totpEnabled = true;
      shhPass.totpSecret = secret;
      dbStore.updateUser(user.id, { shhPass });
      challengeStore.delete(`totp_${user.id}`);
      dbStore.addAuditLog(user.id, (req as any).deviceId, 'TOTP_ENABLED', req.ip || '127.0.0.1');
      res.json({ success: true, shhPass });
    } else {
      res.status(400).json({ error: 'รหัสไม่ถูกต้อง' });
    }
  });

  // --- Shh PASS WebAuthn (Passkeys) Registration ---
  app.get('/api/shhpass/webauthn/register/options', requireUser, async (req, res) => {
    const user = (req as any).user;
    const shhPass = user.shhPass || { passkeys: [] };
    const attachment = req.query.attachment === 'cross-platform' ? 'cross-platform' : undefined;
    
    const envConfig = getShhEnv(req);
    const options = await generateRegistrationOptions({
      rpName: envConfig.RP_NAME,
      rpID: envConfig.RP_ID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.username,
      attestationType: 'none',
      excludeCredentials: shhPass.passkeys.map((pk: any) => ({
        id: (typeof pk.id === 'string' ? pk.id : String(pk.id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        type: 'public-key',
        transports: pk.transports
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        ...(attachment ? { authenticatorAttachment: attachment as any } : {})
      }
    });
    
    challengeStore.set(`webauthn_${user.id}`, options.challenge);
    res.json(options);
  });

  app.post('/api/shhpass/webauthn/register/verify', requireUser, async (req, res) => {
    const user = (req as any).user;
    const { response, name } = req.body;
    const expectedChallenge = challengeStore.get(`webauthn_${user.id}`);
    
    if (!expectedChallenge) return res.status(400).json({ error: 'Session expired' });
    
    try {
      const envConfig = getShhEnv(req);
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: envConfig.ALLOWED_ORIGINS,
        expectedRPID: envConfig.RP_ID
      });
      
      if (verification.verified && verification.registrationInfo) {
        const regInfo: any = verification.registrationInfo;
        const credentialPublicKey = regInfo.credentialPublicKey || (regInfo.credential && regInfo.credential.publicKey) || new Uint8Array();
        const credentialID = regInfo.credentialID || (regInfo.credential && regInfo.credential.id) || new Uint8Array();
        const counter = regInfo.counter || (regInfo.credential && regInfo.credential.counter) || 0;
        
        const shhPass = user.shhPass || { passkeys: [], priority: ['passkeys'] };
        
        const finalId = typeof credentialID === 'string' ? credentialID : Buffer.from(credentialID).toString('base64url');
        const finalPublicKey = typeof credentialPublicKey === 'string' ? credentialPublicKey : Buffer.from(credentialPublicKey).toString('base64');

        shhPass.passkeys.push({
          id: finalId,
          publicKey: finalPublicKey,
          counter,
          transports: response.response.transports || [],
          name: name || 'My Passkey'
        });
        
        dbStore.updateUser(user.id, { shhPass });
        challengeStore.delete(`webauthn_${user.id}`);
        dbStore.addAuditLog(user.id, (req as any).deviceId, 'PASSKEY_ADDED', req.ip || '127.0.0.1', JSON.stringify({ name }));
        
        res.json({ success: true, shhPass });
      } else {
        res.status(400).json({ error: 'Verification failed' });
      }
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });

  // Get list of devices
  app.get('/api/devices', requireUser, (req, res) => {
    const user = (req as any).user;
    res.json(dbStore.getDevices(user.id));
  });

  // Revoke device
  app.delete('/api/devices/:id', requireUser, (req, res) => {
    const deviceId = req.params.id;
    const user = (req as any).user;
    const activeDeviceId = (req as any).deviceId;

    const devices = dbStore.getDevices(user.id);
    const target = devices.find(d => d.id === deviceId);
    if (!target) {
      return res.status(404).json({ error: 'ไม่พบอุปกรณ์ที่ระบุ' });
    }

    if (deviceId === activeDeviceId) {
      return res.status(400).json({ error: 'คุณไม่สามารถยกเลิกสิทธิ์อุปกรณ์ที่คุณกำลังใช้งานอยู่ได้' });
    }

    dbStore.revokeDevice(deviceId);
    dbStore.addAuditLog(user.id, activeDeviceId, 'DEVICE_REVOKED', req.ip || '127.0.0.1', JSON.stringify({ revokedDeviceId: deviceId }));
    res.json({ success: true });
  });

  // Manage Circles
  app.get('/api/circles', requireUser, (req, res) => {
    const user = (req as any).user;
    res.json(dbStore.getCircles(user.id));
  });

  app.post('/api/circles', requireUser, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'กรุณาระบุชื่อกลุ่มความสัมพันธ์' });
    const user = (req as any).user;
    const circle = dbStore.addCircle(user.id, name);
    res.json(circle);
  });

  app.delete('/api/circles/:id', requireUser, (req, res) => {
    const user = (req as any).user;
    dbStore.deleteCircle(user.id, req.params.id);
    res.json({ success: true });
  });

  // Relationships: Couple
  app.get('/api/relationships/couple', requireUser, (req, res) => {
    const user = (req as any).user;
    const couple = dbStore.getCouple(user.id);
    if (!couple) return res.json({ couple: null });

    const partnerId = couple.user1Id === user.id ? couple.user2Id : couple.user1Id;
    const partner = dbStore.getUser(partnerId);
    if (!partner) return res.json({ couple, partner: null });

    const resolvedLens = dbStore.resolveLens(user.id, partner.id);
    res.json({
      couple,
      partner: {
        id: partner.id,
        username: partner.username,
        displayName: resolvedLens?.displayName || partner.displayName,
        avatar: resolvedLens?.avatar || partner.avatar,
        bio: resolvedLens?.bio || partner.bio,
        banner: resolvedLens?.banner || '',
        accentColor: resolvedLens?.accentColor || '',
        status: resolvedLens?.status || '',
        pronouns: resolvedLens?.pronouns || '',
        interests: resolvedLens?.interests || [],
        socialLinks: resolvedLens?.socialLinks || [],
        publicKey: partner.publicKey,
        presenceStatus: partner.presenceStatus || 'online',
        lastOnline: partner.showLastOnline !== false ? partner.lastOnline : null,
        showLastOnline: partner.showLastOnline !== false
      }
    });
  });

  app.post('/api/relationships/couple/request', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'first_couple');
    const { partnerId } = req.body;
    const user = (req as any).user;

    if (partnerId === user.id) {
      return res.status(400).json({ error: 'คุณไม่สามารถขอเป็นคู่กับตัวเองได้' });
    }

    const partner = dbStore.getUser(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้ปลายทาง' });
    }

    try {
      const couple = dbStore.createCoupleRequest(user.id, partnerId);
      dbStore.addAuditLog(user.id, (req as any).deviceId, 'COUPLE_REQUESTED', req.ip || '127.0.0.1');

      // Trigger Relationship Notification
      dbStore.createNotification(
        partnerId,
        'RELATIONSHIP',
        'คำขอคู่รักใหม่ 💖',
        `คุณได้รับคำขอจับคู่เป็นคู่รักจาก ${user.displayName || user.username}`,
        user.id,
        'COUPLE'
      );

      sendToUser(partnerId, { type: 'relationships_changed' });
      sendToUser(user.id, { type: 'relationships_changed' });

      res.json({ couple, partner });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/relationships/couple/accept', requireUser, (req, res) => {
    const { coupleId } = req.body;
    const user = (req as any).user;

    const couple = dbStore.acceptCoupleRequest(coupleId, user.id);
    if (!couple) {
      return res.status(404).json({ error: 'ไม่พบคำขอนี้ หรือคุณไม่มีสิทธิ์ยอมรับ' });
    }

    dbStore.addAuditLog(user.id, (req as any).deviceId, 'COUPLE_ACCEPTED', req.ip || '127.0.0.1');

    // Trigger Relationship Notification
    const otherId = couple.user1Id === user.id ? couple.user2Id : couple.user1Id;
    dbStore.createNotification(
      otherId,
      'RELATIONSHIP',
      'ตอบรับคำขอคู่รักสำเร็จแล้ว 💖',
      `${user.displayName || user.username} ได้ตอบตกลงแชร์ใจจับคู่คู่รักกับคุณแล้ว! สามารถแชทและสร้างสเปซร่วมกันได้ทันที`,
      user.id,
      'COUPLE'
    );

    sendToUser(otherId, { type: 'relationships_changed' });
    sendToUser(user.id, { type: 'relationships_changed' });

    res.json(couple);
  });

  app.post('/api/relationships/couple/cancel', requireUser, (req, res) => {
    const { coupleId } = req.body;
    const user = (req as any).user;

    const couple = dbStore.getCouple(user.id);
    if (!couple || couple.id !== coupleId) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ยกเลิกสเปซนี้' });
    }

    const otherId = couple.user1Id === user.id ? couple.user2Id : couple.user1Id;
    dbStore.cancelCouple(coupleId);
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'COUPLE_CANCELLED', req.ip || '127.0.0.1');
    
    sendToUser(otherId, { type: 'relationships_changed' });
    sendToUser(user.id, { type: 'relationships_changed' });

    res.json({ success: true });
  });

  // Relationships: BFF Group
  app.get('/api/relationships/bff', requireUser, (req, res) => {
    const user = (req as any).user;
    const groups = dbStore.getBffGroups(user.id);

    // Hydrate members details
    const hydrated = groups.map(g => {
      const members = dbStore.getBffMembers(g.id);
      const hydratedMembers = members.map(m => {
        const u = dbStore.getUser(m.userId);
        if (!u) return { ...m, displayName: 'ไม่ทราบชื่อ', username: '', avatar: '0', publicKey: '' };
        const resolvedLens = dbStore.resolveLens(user.id, u.id);
        return {
          ...m,
          displayName: resolvedLens?.displayName || u.displayName,
          username: u.username,
          avatar: resolvedLens?.avatar || u.avatar,
          bio: resolvedLens?.bio || u.bio || '',
          banner: resolvedLens?.banner || '',
          accentColor: resolvedLens?.accentColor || '',
          status: resolvedLens?.status || '',
          pronouns: resolvedLens?.pronouns || '',
          interests: resolvedLens?.interests || [],
          socialLinks: resolvedLens?.socialLinks || [],
          publicKey: u.publicKey
        };
      });
      return {
        ...g,
        members: hydratedMembers
      };
    });

    res.json(hydrated);
  });

  app.post('/api/relationships/bff', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'first_bff');
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'กรุณาระบุชื่อกลุ่ม BFF' });
    const user = (req as any).user;

    const group = dbStore.createBffGroup(name, user.id);
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'BFF_GROUP_CREATED', req.ip || '127.0.0.1');
    sendToUser(user.id, { type: 'relationships_changed' });
    res.json(group);
  });

  // Consent-based: Invite new member (requires group member consensus)
  app.post('/api/relationships/bff/invite', requireUser, (req, res) => {
    const { groupId, userId } = req.body;
    const user = (req as any).user;

    const members = dbStore.getBffMembers(groupId);
    const isMember = members.some(m => m.userId === user.id && m.isAccepted);
    if (!isMember) {
      return res.status(403).json({ error: 'คุณไม่ใช่สมาชิกกลุ่ม BFF นี้' });
    }

    const success = dbStore.inviteBffMember(groupId, userId);
    if (!success) {
      return res.status(400).json({ error: 'ผู้ใช้นี้ได้รับคำเชิญแล้ว หรือเป็นสมาชิกอยู่แล้ว' });
    }

    dbStore.addAuditLog(user.id, (req as any).deviceId, 'BFF_MEMBER_INVITED', req.ip || '127.0.0.1', JSON.stringify({ invitedUserId: userId }));
    sendToUser(userId, { type: 'relationships_changed' });
    res.json({ success: true });
  });

  app.post('/api/relationships/bff/accept', requireUser, (req, res) => {
    const { groupId } = req.body;
    const user = (req as any).user;

    const success = dbStore.acceptBffInvite(groupId, user.id);
    if (!success) {
      return res.status(404).json({ error: 'ไม่พบคำเชิญหรือคุณได้รับการยอมรับไปแล้ว' });
    }

    dbStore.addAuditLog(user.id, (req as any).deviceId, 'BFF_INVITE_ACCEPTED', req.ip || '127.0.0.1');
    const members = dbStore.getBffMembers(groupId);
    members.forEach(m => {
      sendToUser(m.userId, { type: 'relationships_changed' });
    });
    res.json({ success: true });
  });

  // Invite via Link
  app.post('/api/relationships/bff/invite-link', requireUser, (req, res) => {
    const { groupId } = req.body;
    const user = (req as any).user;
    const members = dbStore.getBffMembers(groupId);
    if (!members.find(m => m.userId === user.id)) {
      return res.status(403).json({ error: 'คุณไม่ใช่สมาชิกกลุ่ม BFF นี้' });
    }
    const token = dbStore.generateBffInviteLink(groupId, user.id);
    res.json({ token });
  });

  app.post('/api/relationships/bff/join-link', requireUser, (req, res) => {
    const { token } = req.body;
    const user = (req as any).user;
    const group = dbStore.consumeBffInviteLink(token, user.id);
    if (!group) {
      return res.status(400).json({ error: 'ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว' });
    }
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'BFF_JOINED_VIA_LINK', req.ip || '127.0.0.1', JSON.stringify({ groupId: group.id }));
    res.json(group);
  });

  // Autonomous Leave group
  app.post('/api/relationships/bff/leave', requireUser, (req, res) => {
    const { groupId } = req.body;
    const user = (req as any).user;

    const membersBefore = dbStore.getBffMembers(groupId);
    const success = dbStore.leaveBffGroup(groupId, user.id);
    if (!success) {
      return res.status(400).json({ error: 'ล้มเหลวในการออกจากกลุ่ม' });
    }

    dbStore.addAuditLog(user.id, (req as any).deviceId, 'BFF_GROUP_LEFT', req.ip || '127.0.0.1');
    membersBefore.forEach(m => {
      sendToUser(m.userId, { type: 'relationships_changed' });
    });
    sendToUser(user.id, { type: 'relationships_changed' });
    res.json({ success: true });
  });

  // Remove member
  app.delete('/api/relationships/bff/:groupId/members/:memberId', requireUser, (req, res) => {
    const { groupId, memberId } = req.params;
    const user = (req as any).user;
    
    const members = dbStore.getBffMembers(groupId);
    if (!members.find(m => m.userId === user.id)) {
      return res.status(403).json({ error: 'คุณไม่ใช่สมาชิกกลุ่ม BFF นี้' });
    }
    
    const success = dbStore.leaveBffGroup(groupId, memberId);
    if (!success) {
      return res.status(400).json({ error: 'ลบสมาชิกไม่สำเร็จ' });
    }
    
    dbStore.addAuditLog(user.id, (req as any).deviceId, 'BFF_MEMBER_REMOVED', req.ip || '127.0.0.1', JSON.stringify({ removedUserId: memberId }));
    members.forEach(m => {
      sendToUser(m.userId, { type: 'relationships_changed' });
    });
    sendToUser(memberId, { type: 'relationships_changed' });
    
    res.json({ success: true });
  });

  // --- Encrypted Messaging API ---
  app.get('/api/messages/:chatId', requireUser, (req, res) => {
    const chatId = req.params.chatId;
    const user = (req as any).user;

    // Validate access
    const isCoupleChat = chatId.startsWith('chat_usr_') || chatId.startsWith('chat_usr1_') || chatId.startsWith('chat_usr2_') || chatId.startsWith('chat_');
    // Simple permission guard for our sandbox
    res.json(dbStore.getMessages(chatId));
  });

  app.post('/api/messages/:chatId', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'send_message');
    if (req.body.replyTo) trackMissionProgress((req as any).user.id, 'reply_message');
    const chatId = req.params.chatId;
    const user = (req as any).user;
    const { ciphertext, iv, replyToId, isBurnAfterRead, burnDurationSec, isSelfDestruct, selfDestructAt } = req.body;

    if (!ciphertext || !iv) {
      return res.status(400).json({ error: 'ข้อความเข้ารหัสว่างเปล่า' });
    }

    const messageId = 'msg_' + Math.random().toString(36).substring(2, 11);
    const msg = dbStore.addMessage(chatId, {
      id: messageId,
      senderId: user.id,
      ciphertext,
      iv,
      replyToId,
      isBurnAfterRead,
      burnDurationSec,
      isSelfDestruct,
      selfDestructAt
    });

    // Notify chat participants & send real-time WebSocket signals
    try {
      const rawId = chatId.startsWith('chat_') ? chatId.substring(5) : chatId;
      const couple = dbStore.getCouple(user.id);

      // Broadcast message via WS to everyone listening to this chatId
      broadcastToChat(chatId, {
        type: 'message',
        chatId,
        message: msg
      });

      if (couple && couple.id === rawId) {
        const recipientId = couple.user1Id === user.id ? couple.user2Id : couple.user1Id;
        const recipientClient = clients.get(recipientId) as any;
        
        if (!recipientClient || recipientClient.chatId !== chatId) {
          dbStore.createNotification(
            recipientId,
            'RELATIONSHIP',
            `ข้อความใหม่จาก ${user.displayName || user.username} 💬`,
            `ส่งข้อความใหม่หาคุณในห้องแชทคู่รัก`,
            user.id,
            'COUPLE'
          );
        }

        // Notify the partner via WebSocket
        sendToUser(recipientId, {
          type: 'new_message_alert',
          chatId
        });
      } else {
        const bffMembers = dbStore.getBffMembers(rawId);
        if (bffMembers && bffMembers.length > 0) {
          bffMembers.forEach((member: any) => {
            if (member.userId !== user.id && member.isAccepted) {
              const recipientClient = clients.get(member.userId) as any;
              if (!recipientClient || recipientClient.chatId !== chatId) {
                dbStore.createNotification(
                  member.userId,
                  'RELATIONSHIP',
                  `ความเคลื่อนไหวในกลุ่ม BFF 💬`,
                  `${user.displayName || user.username} ส่งข้อความในห้องแชทกลุ่ม`,
                  user.id,
                  'BFF'
                );
              }

              // Notify bff group member via WebSocket
              sendToUser(member.userId, {
                type: 'new_message_alert',
                chatId
              });
            }
          });
        } else {
          // Friend direct message
          // chatId is of the form "chat_user1_user2"
          let recipientId = chatId;
          if (chatId.startsWith('chat_') && chatId.includes('_')) {
            const usersInChat = chatId.substring(5).split('_');
            const foundRecipient = usersInChat.find(id => id !== user.id);
            if (foundRecipient) {
              recipientId = foundRecipient;
            }
          }

          const recipientClient = clients.get(recipientId) as any;
          if (!recipientClient || recipientClient.chatId !== chatId) {
            dbStore.createNotification(
              recipientId,
              'RELATIONSHIP',
              `ข้อความใหม่จาก ${user.displayName || user.username} 💬`,
              `ส่งข้อความใหม่หาคุณ`,
              user.id,
              'PUBLIC'
            );
          }

          // Notify friend via WebSocket with the correct chatId so their client knows which chat has a new message!
          sendToUser(recipientId, {
            type: 'new_message_alert',
            chatId: chatId
          });
        }
      }
    } catch (err) {
      console.error('Error triggering chat notification:', err);
    }

    res.json(msg);
  });

  app.put('/api/messages/:chatId/:messageId', requireUser, (req, res) => {
    const { chatId, messageId } = req.params;
    const user = (req as any).user;
    const { ciphertext, iv } = req.body;

    const edited = dbStore.editMessage(chatId, messageId, user.id, ciphertext, iv);
    if (!edited) {
      return res.status(400).json({ error: 'ไม่พบข้อความ หรือคุณไม่มีสิทธิ์แก้ไขข้อความนี้' });
    }

    res.json(edited);
  });

  app.post('/api/messages/:chatId/:messageId/read', requireUser, (req, res) => {
    const { chatId, messageId } = req.params;
    const user = (req as any).user;

    const msg = dbStore.getMessage(chatId, messageId);
    if (!msg) return res.status(404).json({ error: 'ไม่พบข้อความ' });

    if (msg.senderId !== user.id) {
      const updated = dbStore.markMessageAsRead(chatId, messageId);
      if (updated) {
        try {
          broadcastToChat(chatId, {
            type: 'message_read',
            chatId,
            messageId,
            readAt: new Date().toISOString()
          });

          // Server-side burn
          if (msg.isBurnAfterRead) {
            const burnDuration = msg.burnDurationSec || 10;
            setTimeout(() => {
              dbStore.deleteMessage(chatId, messageId);
              broadcastToChat(chatId, {
                type: 'message_deleted',
                chatId,
                messageId
              });
            }, burnDuration * 1000);
          }
        } catch (e) {
          console.error('Failed to broadcast read status:', e);
        }
      }
    }
    res.json({ success: true });
  });

  app.get('/api/messages/:chatId/:messageId/versions', requireUser, (req, res) => {
    res.json(dbStore.getMessageVersions(req.params.messageId));
  });

  app.delete('/api/messages/:chatId/:messageId', requireUser, (req, res) => {
    const { chatId, messageId } = req.params;
    const user = (req as any).user;

    const msg = dbStore.getMessage(chatId, messageId);
    if (!msg) {
      return res.status(404).json({ error: 'ไม่พบข้อความ' });
    }

    if (msg.senderId !== user.id && !msg.isBurnAfterRead) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบข้อความนี้' });
    }

    dbStore.deleteMessage(chatId, messageId);

    // Broadcast the deletion to all clients in the chat room in real-time
    try {
      broadcastToChat(chatId, {
        type: 'message_deleted',
        chatId,
        messageId
      });
    } catch (e) {
      console.error('Failed to broadcast message deletion:', e);
    }

    res.json({ success: true });
  });

  // --- File Uploads ---
  app.post('/api/upload', requireUser, (req, res) => {
    const { name, type, size, data } = req.body;
    if (!name || !type || !data) {
      return res.status(400).json({ error: 'ข้อมูลไฟล์ไม่ครบถ้วน' });
    }
    
    // Check file size limit (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (size > MAX_SIZE) {
      return res.status(400).json({ error: 'ขนาดไฟล์เกิน 20MB' });
    }

    // Reject compressed files
    const rejectedTypes = ['application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/gzip'];
    if (rejectedTypes.includes(type) || name.endsWith('.zip') || name.endsWith('.rar')) {
      return res.status(400).json({ error: 'ไม่รองรับไฟล์บีบอัด' });
    }

    // Normally we'd store in dbStore or S3.
    // For this prototype, we'll store in memory dbStore if it's small,
    // or just assume data is base64 and return it directly since the client 
    // can use base64 data URLs for testing.
    // In a real app we would save it to disk and return a /uploads/... URL
    
    // For prototype, we'll just return the data URL directly as the "url"
    // to simulate a successful upload. The client ciphertext will embed this URL.
    res.json({ success: true, url: data });
  });

  // --- Stories ---
  app.get('/api/stories', requireUser, (req, res) => {
    // Collect all active stories. Filtering by audience is handled client-side for absolute trust, 
    // or we can stream user's circle members.
    res.json(dbStore.getStories());
  });

  app.post('/api/stories', requireUser, (req, res) => {
    trackMissionProgress((req as any).user.id, 'post_story');
    trackMissionProgress((req as any).user.id, 'first_story');
    const user = (req as any).user;
    const { ciphertext, iv, audienceType, targetCircleName, targetBffGroupId, isDownloadable, isForwardable, isSaveable, expiryMinutes, mediaType, mediaUrl, backgroundColor } = req.body;

    const minutes = expiryMinutes || 1440; // Default 24 hours
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    const storyId = 'story_' + Math.random().toString(36).substring(2, 11);
    const story = dbStore.addStory(user.id, {
      id: storyId,
      ciphertext,
      iv,
      audienceType,
      targetCircleName,
      targetBffGroupId,
      isDownloadable: !!isDownloadable,
      isForwardable: !!isForwardable,
      isSaveable: !!isSaveable,
      expiresAt,
      mediaType,
      mediaUrl,
      backgroundColor
    });

    res.json(story);
  });

  app.delete('/api/stories/:id', requireUser, (req, res) => {
    const user = (req as any).user;
    const success = dbStore.deleteStory(user.id, req.params.id);
    if (!success) return res.status(404).json({ error: 'ไม่พบสตอรี่หรือไม่มีสิทธิ์ลบ' });
    res.json({ success: true });
  });

  app.post('/api/stories/:id/views', requireUser, (req, res) => {
    const user = (req as any).user;
    const storyId = req.params.id;
    // Iterate through all stories to find and update
    let found = false;
    Object.keys(dbStore.data.stories).forEach(ownerId => {
      const story = dbStore.data.stories[ownerId].find(s => s.id === storyId);
      if (story) {
        found = true;
        if (!story.views) story.views = [];
        if (!story.views.some((v: any) => v.userId === user.id)) {
          story.views.push({ userId: user.id, timestamp: new Date().toISOString() });
          dbStore.save();
        }
      }
    });
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });

  app.post('/api/stories/:id/reactions', requireUser, (req, res) => {
    const user = (req as any).user;
    const storyId = req.params.id;
    const { reaction } = req.body;
    let found = false;
    Object.keys(dbStore.data.stories).forEach(ownerId => {
      const story = dbStore.data.stories[ownerId].find(s => s.id === storyId);
      if (story) {
        found = true;
        if (!story.reactions) story.reactions = [];
        story.reactions.push({ userId: user.id, reaction, timestamp: new Date().toISOString() });
        dbStore.save();
      }
    });
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });

  // --- Vault ---
  app.get('/api/vault/:ownerId', requireUser, (req, res) => {
    res.json(dbStore.getVaultItems(req.params.ownerId));
  });

  app.post('/api/vault/:ownerId', requireUser, (req, res) => {
    const user = (req as any).user;
    const ownerId = req.params.ownerId;
    const { ownerType, fileName, fileType, ciphertext, iv } = req.body;

    if (!ciphertext || !fileName) return res.status(400).json({ error: 'เนื้อหาไฟล์ไม่สมบูรณ์' });

    const itemId = 'vault_' + Math.random().toString(36).substring(2, 11);
    const item = dbStore.addVaultItem(ownerId, {
      id: itemId,
      userId: user.id,
      ownerType,
      fileName,
      fileType,
      ciphertext,
      iv
    });

    res.json(item);
  });

  app.delete('/api/vault/:ownerId/:id', requireUser, (req, res) => {
    dbStore.deleteVaultItem(req.params.ownerId, req.params.id);
    res.json({ success: true });
  });

  // --- Secret Box (Time Capsules) ---
  app.get('/api/secret-box/:ownerId', requireUser, (req, res) => {
    res.json(dbStore.getSecretBoxItems(req.params.ownerId));
  });

  app.post('/api/secret-box/:ownerId', requireUser, (req, res) => {
    const user = (req as any).user;
    const ownerId = req.params.ownerId;
    const { ownerType, ciphertext, iv, openAt } = req.body;

    if (!ciphertext || !openAt) return res.status(400).json({ error: 'เนื้อหาหรือวันเวลาเปิดไม่สมบูรณ์' });

    const itemId = 'capsule_' + Math.random().toString(36).substring(2, 11);
    const item = dbStore.addSecretBoxItem(ownerId, {
      id: itemId,
      userId: user.id,
      ownerType,
      ciphertext,
      iv,
      openAt
    });

    res.json(item);
  });

  // --- Shared Notes ---
  app.get('/api/notes/:ownerId', requireUser, (req, res) => {
    res.json(dbStore.getSharedNotes(req.params.ownerId));
  });

  app.post('/api/notes/:ownerId', requireUser, (req, res) => {
    const ownerId = req.params.ownerId;
    const { id, ownerType, title, ciphertext, iv } = req.body;

    const noteId = id || 'note_' + Math.random().toString(36).substring(2, 11);
    const saved = dbStore.saveSharedNote(ownerId, {
      id: noteId,
      ownerType,
      title,
      ciphertext,
      iv
    });

    res.json(saved);
  });

  app.delete('/api/notes/:ownerId/:id', requireUser, (req, res) => {
    dbStore.deleteSharedNote(req.params.ownerId, req.params.id);
    res.json({ success: true });
  });

  // --- Shared Journals ---
  app.get('/api/journals', requireUser, (req, res) => {
    const user = (req as any).user;
    res.json(dbStore.getJournals(user.id));
  });

  app.post('/api/journals', requireUser, (req, res) => {
    const user = (req as any).user;
    const { date, title, ciphertext, iv } = req.body;

    if (!date || !ciphertext) return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });

    const id = 'journal_' + Math.random().toString(36).substring(2, 11);
    const saved = dbStore.saveJournal(user.id, {
      id,
      date,
      title,
      ciphertext,
      iv
    });

    res.json(saved);
  });

  // --- Whiteboard State ---
  app.get('/api/whiteboard/:bffGroupId', requireUser, (req, res) => {
    res.json({ canvasData: dbStore.getWhiteboardState(req.params.bffGroupId) });
  });

  app.post('/api/whiteboard/:bffGroupId', requireUser, (req, res) => {
    const canvasData = dbStore.saveWhiteboardState(req.params.bffGroupId, req.body.canvasData || '');
    res.json({ canvasData });
  });

  // --- Checklist ---
  app.get('/api/checklist/:bffGroupId', requireUser, (req, res) => {
    res.json(dbStore.getChecklist(req.params.bffGroupId));
  });

  app.post('/api/checklist/:bffGroupId', requireUser, (req, res) => {
    const user = (req as any).user;
    const item = dbStore.addChecklistItem(req.params.bffGroupId, req.body.text, user.id);
    res.json(item);
  });

  app.put('/api/checklist/:bffGroupId/:itemId', requireUser, (req, res) => {
    const user = (req as any).user;
    const item = dbStore.toggleChecklistItem(req.params.bffGroupId, req.params.itemId, !!req.body.isCompleted, user.id);
    if (!item) return res.status(404).json({ error: 'ไม่พบรายการเช็คลิสต์' });
    res.json(item);
  });

  // --- Polls ---
  app.get('/api/polls/:bffGroupId', requireUser, (req, res) => {
    const bffGroupId = req.params.bffGroupId;
    const polls = dbStore.getPolls(bffGroupId);
    // Hydrate votes
    const hydrated = polls.map(p => {
      const votesMap = dbStore.getPollVotes(p.id);
      return {
        ...p,
        votes: votesMap
      };
    });
    res.json(hydrated);
  });

  app.post('/api/polls/:bffGroupId', requireUser, (req, res) => {
    const { question, options, expiresHours } = req.body;
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: 'คำถามหรือตัวเลือกผลโพลไม่ถูกต้อง' });
    }

    const pollId = 'poll_' + Math.random().toString(36).substring(2, 11);
    const pollOptions = options.map((opt: string) => ({
      id: 'opt_' + Math.random().toString(36).substring(2, 11),
      optionText: opt
    }));

    const expiresAt = new Date(Date.now() + (expiresHours || 24) * 60 * 60 * 1000).toISOString();
    const created = dbStore.createPoll(req.params.bffGroupId, {
      id: pollId,
      question,
      options: pollOptions,
      expiresAt
    });

    res.json(created);
  });

  app.post('/api/polls/:bffGroupId/:pollId/vote', requireUser, (req, res) => {
    const user = (req as any).user;
    const { optionId } = req.body;

    const votes = dbStore.votePoll(req.params.pollId, user.id, optionId);
    res.json(votes);
  });

  // --- Couple Anniversary & Calendar ---
  app.get('/api/couple/anniversaries/:coupleId', requireUser, (req, res) => {
    res.json(dbStore.getAnniversaries(req.params.coupleId));
  });

  app.post('/api/couple/anniversaries/:coupleId', requireUser, (req, res) => {
    const { title, date } = req.body;
    const id = req.body.id || 'ann_' + Math.random().toString(36).substring(2, 11);
    const saved = dbStore.saveAnniversary(req.params.coupleId, { id, title, date });
    res.json(saved);
  });

  app.get('/api/couple/calendar/:coupleId', requireUser, (req, res) => {
    res.json(dbStore.getCalendarEvents(req.params.coupleId));
  });

  app.post('/api/couple/calendar/:coupleId', requireUser, (req, res) => {
    const { title, date, description } = req.body;
    const id = req.body.id || 'cal_' + Math.random().toString(36).substring(2, 11);
    const saved = dbStore.saveCalendarEvent(req.params.coupleId, { id, title, date, description });
    res.json(saved);
  });

  // --- Audit Logs View ---
  app.get('/api/audit-logs', requireUser, (req, res) => {
    res.json(dbStore.getAuditLogs());
  });

  // --- Real-time WebSockets Handler ---
  const wss = new WebSocketServer({ noServer: true });

  interface ExtendedWebSocket extends WebSocket {
    userId?: string;
    chatId?: string;
    isAlive?: boolean;
  }

  const clients = new Map<string, ExtendedWebSocket>(); // userId -> WS

  wss.on('connection', (ws: ExtendedWebSocket, req) => {
    ws.isAlive = true;

    // Heartbeat check
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        const { type, token, chatId, ...data } = payload;

        // Init/Auth event
        if (type === 'init') {
          if (!token) return ws.close();
          const session = dbStore.getSession(token);
          if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
            return ws.close();
          }

          ws.userId = session.userId;
          ws.chatId = chatId || '';
          clients.set(session.userId, ws);

          // Restore or default presence status
          const userObj = dbStore.getUser(session.userId);
          const initialPresence = data.presenceStatus || userObj?.presenceStatus || 'online';
          
          const updatePayload: any = { presenceStatus: initialPresence };
          if (initialPresence === 'offline') {
            updatePayload.lastOnline = userObj?.lastOnline || new Date().toISOString();
          }
          dbStore.updateUser(session.userId, updatePayload);

          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'presence',
                userId: session.userId,
                status: initialPresence,
                lastOnline: initialPresence === 'offline' ? (userObj?.lastOnline || new Date().toISOString()) : null
              }));
            }
          });
          return;
        }

        if (!ws.userId) return;

        if (type === 'chat_focused') {
          ws.chatId = chatId || '';
          return;
        }

        // Relay messages or typing status
        if (type === 'typing') {
          broadcastToChat(chatId, {
            type: 'typing',
            userId: ws.userId,
            isTyping: data.isTyping
          }, ws.userId);
        } else if (type === 'presence_change' || type === 'presence') {
          const statusVal = data.status || 'online';
          const updateObj: any = { presenceStatus: statusVal };
          if (statusVal === 'offline') {
            updateObj.lastOnline = new Date().toISOString();
          }
          dbStore.updateUser(ws.userId, updateObj);

          const userObj = dbStore.getUser(ws.userId);
          const lastOnlineVal = statusVal === 'offline' ? (userObj?.lastOnline || new Date().toISOString()) : null;

          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'presence',
                userId: ws.userId,
                status: statusVal,
                lastOnline: lastOnlineVal
              }));
            }
          });
        } else if (type === 'whiteboard_draw') {
          broadcastToChat(chatId, {
            type: 'whiteboard_update',
            userId: ws.userId,
            lines: data.lines
          }, ws.userId);
        } else if (type === 'pet_sync') {
          // Broadcast pet sync state change to all clients
          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN && client.userId !== ws.userId) {
              client.send(JSON.stringify({
                type: 'pet_sync',
                ownerId: ws.userId,
                ...data
              }));
            }
          });
        }
      } catch (err) {
        console.error('Socket message processing failed:', err);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        if (clients.get(ws.userId) === ws) {
          clients.delete(ws.userId);
        }
        
        // Multi-tab check: only set offline if no other connections remain for this userId
        let hasOtherConnections = false;
        wss.clients.forEach((client: any) => {
          if (client !== ws && client.userId === ws.userId && client.readyState === WebSocket.OPEN) {
            hasOtherConnections = true;
          }
        });

        if (!hasOtherConnections) {
          const nowStr = new Date().toISOString();
          dbStore.updateUser(ws.userId, { presenceStatus: 'offline', lastOnline: nowStr });
          
          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'presence',
                userId: ws.userId,
                status: 'offline',
                lastOnline: nowStr
              }));
            }
          });
        }
      }
    });
  });

  // Broadcast helper
  function broadcastToChat(chatId: string | undefined, message: any, excludeUserId?: string) {
    if (!chatId) return;
    const rawMsg = JSON.stringify(message);
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.chatId === chatId) {
        if (excludeUserId && client.userId === excludeUserId) return;
        client.send(rawMsg);
      }
    });
  }

  // Send message to specific user id (cross tabs/devices)
  function sendToUser(userId: string, message: any) {
    const rawMsg = JSON.stringify(message);
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(rawMsg);
      }
    });
  }

  // Handle WebSocket upgrades
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Keep-alive heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });


  // --- QR Code System ---
  app.get('/api/qr', requireUser, (req, res) => {
    const user = (req as any).user;
    let qrToken = user.qrToken;
    if (!qrToken) {
      qrToken = 'qr_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      dbStore.updateUser(user.id, { qrToken, qrEnabled: true, qrShow: 'username' });
      user.qrToken = qrToken;
      user.qrEnabled = true;
      user.qrShow = 'username';
    }
    res.json({ qrToken, qrEnabled: user.qrEnabled, qrShow: user.qrShow, username: user.username, id: user.id });
  });

  app.post('/api/qr/refresh', requireUser, (req, res) => {
    const user = (req as any).user;
    const qrToken = 'qr_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    dbStore.updateUser(user.id, { qrToken });
    res.json({ qrToken });
  });

  app.post('/api/qr/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const { qrEnabled, qrShow } = req.body;
    dbStore.updateUser(user.id, { qrEnabled, qrShow });
    res.json({ success: true });
  });

  app.get('/api/qr/scan/:token', (req, res) => {
    const token = req.params.token;
    const targetUser = dbStore.getUserByQRToken(token);
    
    if (!targetUser || !targetUser.qrEnabled) {
      return res.status(404).json({ error: 'QR Code ไม่ถูกต้องหรือถูกปิดใช้งาน' });
    }

    // Checking if requester is logged in (optional if we want to allow guests, but requirement says send friend request)
    // Actually, friend request requires login. Let's return public info.
    const publicLens = dbStore.getLenses(targetUser.id).find(l => l.type === 'PUBLIC');
    if (!publicLens) return res.status(404).json({ error: 'ไม่พบ Public Lens' });

    // Check if Pet is public
    const pet = dbStore.getPet(targetUser.id);
    const publicPet = (pet && pet.publicProfile) ? { name: pet.name, type: pet.type, stage: pet.stage } : null;

    // Get public stories
    const allStories = dbStore.getStories().filter(s => s.userId === targetUser.id);
    const publicStories = allStories.filter(s => s.audience === 'public').map(s => ({ id: s.id, type: s.type, bgColor: s.bgColor, timestamp: s.timestamp }));

    res.json({
      id: targetUser.id,
      username: targetUser.username,
      displayName: publicLens.displayName,
      avatar: publicLens.avatar,
      bio: publicLens.bio,
      banner: publicLens.banner,
      accentColor: publicLens.accentColor,
      interests: publicLens.interests || [],
      socialLinks: publicLens.socialLinks || [],
      badge: targetUser.activeBadge || null,
      nameColor: targetUser.activeNameColor || null,
      pet: publicPet,
      stories: publicStories
    });
  });

  // --- Public Lens Share System ---
  app.get('/api/share', requireUser, (req, res) => {
    const user = (req as any).user;
    let publicShareToken = user.publicShareToken;
    if (!publicShareToken) {
      publicShareToken = Math.random().toString(36).substring(2, 8);
      dbStore.updateUser(user.id, { publicShareToken, publicShareEnabled: true });
      user.publicShareToken = publicShareToken;
      user.publicShareEnabled = true;
    }
    res.json({ publicShareToken, publicShareEnabled: user.publicShareEnabled });
  });

  app.post('/api/share/refresh', requireUser, (req, res) => {
    const user = (req as any).user;
    const publicShareToken = Math.random().toString(36).substring(2, 8);
    dbStore.updateUser(user.id, { publicShareToken });
    res.json({ publicShareToken });
  });

  app.post('/api/share/settings', requireUser, (req, res) => {
    const user = (req as any).user;
    const { publicShareEnabled } = req.body;
    dbStore.updateUser(user.id, { publicShareEnabled });
    res.json({ success: true });
  });

  app.get('/api/p/:token', (req, res) => {
    const token = req.params.token;
    const targetUser = dbStore.getUserByShareToken(token);
    
    if (!targetUser || !targetUser.publicShareEnabled) {
      return res.status(404).json({ error: 'ลิงก์ไม่ถูกต้องหรือถูกปิดใช้งาน' });
    }

    const publicLens = dbStore.getLenses(targetUser.id).find(l => l.type === 'PUBLIC');
    if (!publicLens) return res.status(404).json({ error: 'ไม่พบ Public Lens' });
    
    // Check if Pet is public
    const pet = dbStore.getPet(targetUser.id);
    const publicPet = (pet && pet.publicProfile) ? { name: pet.name, type: pet.type, stage: pet.stage } : null;

    // Get public stories
    const allStories = dbStore.getStories().filter(s => s.userId === targetUser.id);
    const publicStories = allStories.filter(s => s.audience === 'public').map(s => ({ id: s.id, type: s.type, bgColor: s.bgColor, timestamp: s.timestamp }));

    const payload = {
      id: targetUser.id,
      username: targetUser.username,
      displayName: publicLens.displayName,
      avatar: publicLens.avatar,
      bio: publicLens.bio,
      banner: publicLens.banner,
      accentColor: publicLens.accentColor,
      interests: publicLens.interests || [],
      socialLinks: publicLens.socialLinks || [],
      badge: targetUser.activeBadge || null,
      nameColor: targetUser.activeNameColor || null,
      pet: publicPet,
      stories: publicStories
    };

    res.json(payload);
  });

  // Fallback for any unmatched API routes to prevent HTML index.html response
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  // --- Vite Dev Server Middleware or Production Asset Hosting ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Shush server booting on port ${PORT}...`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
