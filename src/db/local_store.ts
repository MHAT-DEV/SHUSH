import fs from 'fs';
import path from 'path';
import { ShushNotification, NotificationSettings } from '../types.ts';

const IS_SANDBOX = process.env.SANDBOX_MODE === 'true';
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DATA_FILE = path.join(DATA_DIR, IS_SANDBOX ? 'shush_data_sandbox.json' : 'shush_data.json');

export interface LocalStoreData {
  users: Record<string, any>; // userId -> User
  devices: Record<string, any>; // deviceId -> Device
  sessions: Record<string, any>; // sessionId -> Session
  circles: Record<string, any[]>; // userId -> Circle[]
  couples: Record<string, any>; // coupleId -> Couple
  bffGroups: Record<string, any>; // bffGroupId -> BffGroup
  bffMembers: Record<string, any[]>; // bffGroupId -> Member[]
  chats: Record<string, any>; // chatId -> Chat
  messages: Record<string, any[]>; // chatId -> Message[]
  messageVersions: Record<string, any[]>; // messageId -> MessageVersion[]
  stories: Record<string, any[]>; // userId -> Story[]
  vaultItems: Record<string, any[]>; // ownerId (coupleId or bffGroupId) -> VaultItem[]
  secretBoxItems: Record<string, any[]>; // ownerId -> SecretBoxItem[]
  sharedNotes: Record<string, any[]>; // ownerId -> SharedNote[]
  sharedJournals: Record<string, Record<string, any>>; // userId -> { date -> Journal }
  whiteboardStates: Record<string, string>; // bffGroupId -> canvasData
  checklists: Record<string, any[]>; // bffGroupId -> ChecklistItem[]
  polls: Record<string, any[]>; // bffGroupId -> Poll[]
  pollVotes: Record<string, Record<string, string>>; // pollId -> { userId -> optionId }
  anniversaries: Record<string, any[]>; // coupleId -> Anniversary[]
  calendarEvents: Record<string, any[]>; // coupleId -> CalendarEvent[]
  lenses: Record<string, any>; // lensId -> Lens
  friends: Record<string, string[]>; // userId -> friendUserIds[]
  pets: Record<string, any>; // userId -> Pet
  honeyInvites?: Record<string, string[]>; // userId -> pendingInvitesFromTheseUserIds
  bffInvites?: Record<string, { groupId: string; createdBy: string; createdAt: number }>; // inviteToken -> InviteInfo
  notifications?: Record<string, ShushNotification[]>; // userId -> ShushNotification[]
  notificationSettings?: Record<string, NotificationSettings>; // userId -> NotificationSettings
  auditLogs: any[];
}

function getInitialData(): LocalStoreData {
  return {
    users: {},
    devices: {},
    sessions: {},
    circles: {},
    couples: {},
    bffGroups: {},
    bffMembers: {},
    chats: {},
    messages: {},
    messageVersions: {},
    stories: {},
    vaultItems: {},
    secretBoxItems: {},
    sharedNotes: {},
    sharedJournals: {},
    whiteboardStates: {},
    checklists: {},
    polls: {},
    pollVotes: {},
    anniversaries: {},
    calendarEvents: {},
    lenses: {},
    friends: {},
    pets: {},
    honeyInvites: {},
    bffInvites: {},
    notifications: {},
    notificationSettings: {},
    auditLogs: []
  };
}

class ShushStore {
  public data: LocalStoreData = getInitialData();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = { ...getInitialData(), ...JSON.parse(raw) };
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch (e) {
      console.error('Failed to load local store:', e);
      this.data = getInitialData();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save local store:', e);
    }
  }

  // --- Users ---
  getUsers() {
    return Object.values(this.data.users);
  }

  getUser(id: string) {
    return this.data.users[id] || null;
  }

  getUserByUsername(username: string) {
    return Object.values(this.data.users).find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  getUserByQRToken(qrToken: string) {
    return Object.values(this.data.users).find(u => u.qrToken === qrToken) || null;
  }

  getUserByShareToken(shareToken: string) {
    return Object.values(this.data.users).find(u => u.publicShareToken === shareToken) || null;
  }

  createUser(user: { id: string; username: string; displayName: string; bio?: string; avatar?: string; publicKey: string; recoveryKeyHash: string }) {
    const newUser = {
      ...user,
      presenceStatus: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.users[user.id] = newUser;

    // Create system default circles for user
    this.data.circles[user.id] = [
      { id: Math.random().toString(), name: 'Family', type: 'SYSTEM' },
      { id: Math.random().toString(), name: 'Friends', type: 'SYSTEM' },
      { id: Math.random().toString(), name: 'Work', type: 'SYSTEM' },
      { id: Math.random().toString(), name: 'Gaming', type: 'SYSTEM' }
    ];

    // Create system default PUBLIC lens automatically
    const publicLensId = `${user.id}_PUBLIC`;
    if (!this.data.lenses) this.data.lenses = {};
    this.data.lenses[publicLensId] = {
      id: publicLensId,
      userId: user.id,
      type: 'PUBLIC',
      displayName: user.displayName,
      bio: user.bio || '',
      avatar: user.avatar || '0',
      banner: '#1e1b4b',
      accentColor: '#8b5cf6',
      status: 'สวัสดี Shush!',
      pronouns: '',
      interests: [],
      socialLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<any>) {
    const user = this.data.users[id];
    if (user) {
      this.data.users[id] = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.save();
      return this.data.users[id];
    }
    return null;
  }

  // --- Devices & Sessions ---
  getDevices(userId: string) {
    return Object.values(this.data.devices).filter(d => d.userId === userId);
  }

  createDevice(device: { id: string; userId: string; name: string; browser: string; os: string; ip: string; publicKey: string; isApproved: boolean }) {
    const newDevice = {
      ...device,
      approvedAt: device.isApproved ? new Date().toISOString() : null,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    this.data.devices[device.id] = newDevice;
    this.save();
    return newDevice;
  }

  approveDevice(deviceId: string) {
    const device = this.data.devices[deviceId];
    if (device) {
      device.isApproved = true;
      device.approvedAt = new Date().toISOString();
      this.save();
      return device;
    }
    return null;
  }

  revokeDevice(deviceId: string) {
    if (this.data.devices[deviceId]) {
      delete this.data.devices[deviceId];
      // Revoke related sessions
      Object.keys(this.data.sessions).forEach(sid => {
        if (this.data.sessions[sid].deviceId === deviceId) {
          delete this.data.sessions[sid];
        }
      });
      this.save();
      return true;
    }
    return false;
  }

  createSession(session: { id: string; userId: string; deviceId: string; token: string; expiresAt: string }) {
    this.data.sessions[session.id] = {
      ...session,
      createdAt: new Date().toISOString()
    };
    this.save();
    return this.data.sessions[session.id];
  }

  getSession(token: string) {
    return Object.values(this.data.sessions).find(s => s.token === token) || null;
  }

  deleteSession(token: string) {
    const session = Object.values(this.data.sessions).find(s => s.token === token);
    if (session) {
      delete this.data.sessions[session.id];
      this.save();
      return true;
    }
    return false;
  }

  // --- Circles ---
  getCircles(userId: string) {
    return this.data.circles[userId] || [];
  }

  addCircle(userId: string, name: string) {
    if (!this.data.circles[userId]) {
      this.data.circles[userId] = [];
    }
    const newCircle = { id: Math.random().toString(), name, type: 'CUSTOM' };
    this.data.circles[userId].push(newCircle);
    this.save();
    return newCircle;
  }

  deleteCircle(userId: string, circleId: string) {
    if (this.data.circles[userId]) {
      this.data.circles[userId] = this.data.circles[userId].filter(c => c.id !== circleId || c.type === 'SYSTEM');
      this.save();
      return true;
    }
    return false;
  }

  // --- Relationship: Couple ---
  getCouple(userId: string) {
    return Object.values(this.data.couples).find(c => (c.user1Id === userId || c.user2Id === userId)) || null;
  }

  createCoupleRequest(user1Id: string, user2Id: string) {
    // Check if user already in couple
    const existing1 = this.getCouple(user1Id);
    const existing2 = this.getCouple(user2Id);
    if (existing1 || existing2) {
      throw new Error('คุณหรืออีกฝ่ายมีความสัมพันธ์ Couple ค้างอยู่แล้ว');
    }

    const coupleId = Math.random().toString();
    const newCouple = {
      id: coupleId,
      user1Id,
      user2Id,
      isAccepted: false,
      anniversaryDate: null,
      createdAt: new Date().toISOString()
    };
    this.data.couples[coupleId] = newCouple;

    // Create Chat
    const chatId = 'chat_' + coupleId;
    this.data.chats[chatId] = {
      id: chatId,
      type: 'COUPLE',
      coupleId: coupleId,
      createdAt: new Date().toISOString()
    };

    this.save();
    return newCouple;
  }

  acceptCoupleRequest(coupleId: string, userId: string) {
    const couple = this.data.couples[coupleId];
    if (couple && couple.user2Id === userId) {
      couple.isAccepted = true;
      this.save();
      return couple;
    }
    return null;
  }

  cancelCouple(coupleId: string) {
    if (this.data.couples[coupleId]) {
      delete this.data.couples[coupleId];
      delete this.data.chats['chat_' + coupleId];
      // Clean resources
      delete this.data.messages['chat_' + coupleId];
      delete this.data.vaultItems[coupleId];
      delete this.data.secretBoxItems[coupleId];
      delete this.data.sharedNotes[coupleId];
      delete this.data.anniversaries[coupleId];
      delete this.data.calendarEvents[coupleId];
      this.save();
      return true;
    }
    return false;
  }

  // --- Relationship: BFF Groups ---
  getBffGroups(userId: string) {
    const groupIds = Object.values(this.data.bffMembers)
      .flatMap(members => members)
      .filter(m => m.userId === userId)
      .map(m => m.bffGroupId);

    return Object.values(this.data.bffGroups).filter(g => groupIds.includes(g.id));
  }

  getBffMembers(groupId: string) {
    return this.data.bffMembers[groupId] || [];
  }

  createBffGroup(name: string, creatorId: string) {
    const groupId = Math.random().toString();
    const newGroup = {
      id: groupId,
      name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString()
    };
    this.data.bffGroups[groupId] = newGroup;

    // Direct creator join with accepted=true
    this.data.bffMembers[groupId] = [
      { id: Math.random().toString(), bffGroupId: groupId, userId: creatorId, isAccepted: true, joinedAt: new Date().toISOString() }
    ];

    // Create Chat
    const chatId = 'chat_' + groupId;
    this.data.chats[chatId] = {
      id: chatId,
      type: 'BFF_GROUP',
      bffGroupId: groupId,
      createdAt: new Date().toISOString()
    };

    this.save();
    return newGroup;
  }

  inviteBffMember(groupId: string, userId: string) {
    if (!this.data.bffMembers[groupId]) {
      this.data.bffMembers[groupId] = [];
    }

    // Check existing
    const exists = this.data.bffMembers[groupId].some(m => m.userId === userId);
    if (exists) return false;

    const invite = {
      id: Math.random().toString(),
      bffGroupId: groupId,
      userId,
      isAccepted: false,
      joinedAt: new Date().toISOString()
    };
    this.data.bffMembers[groupId].push(invite);
    this.save();
    return true;
  }

  acceptBffInvite(groupId: string, userId: string) {
    const members = this.data.bffMembers[groupId] || [];
    const member = members.find(m => m.userId === userId);
    if (member) {
      member.isAccepted = true;
      this.save();
      return true;
    }
    return false;
  }

  leaveBffGroup(groupId: string, userId: string) {
    if (this.data.bffMembers[groupId]) {
      this.data.bffMembers[groupId] = this.data.bffMembers[groupId].filter(m => m.userId !== userId);
      // If group has no members left, delete it
      if (this.data.bffMembers[groupId].length === 0) {
        delete this.data.bffGroups[groupId];
        delete this.data.chats['chat_' + groupId];
        delete this.data.messages['chat_' + groupId];
        delete this.data.bffMembers[groupId];
        delete this.data.vaultItems[groupId];
        delete this.data.secretBoxItems[groupId];
        delete this.data.sharedNotes[groupId];
        delete this.data.whiteboardStates[groupId];
        delete this.data.checklists[groupId];
        delete this.data.polls[groupId];
      }
      this.save();
      return true;
    }
    return false;
  }

  generateBffInviteLink(groupId: string, createdBy: string) {
    this.data.bffInvites = this.data.bffInvites || {};
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    this.data.bffInvites[token] = { groupId, createdBy, createdAt: Date.now() };
    this.save();
    return token;
  }

  consumeBffInviteLink(token: string, userId: string) {
    this.data.bffInvites = this.data.bffInvites || {};
    const invite = this.data.bffInvites[token];
    if (!invite) return null; // Invalid or expired

    const groupId = invite.groupId;
    
    // Check if group still exists
    if (!this.data.bffGroups[groupId]) {
      delete this.data.bffInvites[token];
      this.save();
      return null;
    }

    if (!this.data.bffMembers[groupId]) {
      this.data.bffMembers[groupId] = [];
    }

    const existing = this.data.bffMembers[groupId].find(m => m.userId === userId);
    if (!existing) {
      this.data.bffMembers[groupId].push({ userId, joinedAt: new Date().toISOString(), isAccepted: true });
    } else if (!existing.isAccepted) {
      existing.isAccepted = true;
    }

    // Delete the token immediately as it's one-time use
    delete this.data.bffInvites[token];
    this.save();
    return this.data.bffGroups[groupId];
  }

  // --- Real-time Chats & Messages ---
  getChat(chatId: string) {
    return this.data.chats[chatId] || null;
  }

  getMessages(chatId: string) {
    return this.data.messages[chatId] || [];
  }

  getMessage(chatId: string, messageId: string) {
    const list = this.getMessages(chatId);
    return list.find(m => m.id === messageId) || null;
  }

  addMessage(chatId: string, message: { id: string; senderId: string; ciphertext: string; iv: string; replyToId?: string; isBurnAfterRead?: boolean; burnDurationSec?: number; isSelfDestruct?: boolean; selfDestructAt?: string }) {
    if (!this.data.messages[chatId]) {
      this.data.messages[chatId] = [];
    }

    const newMessage = {
      ...message,
      isBurnAfterRead: message.isBurnAfterRead || false,
      burnDurationSec: message.burnDurationSec || 0,
      isSelfDestruct: message.isSelfDestruct || false,
      selfDestructAt: message.selfDestructAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.messages[chatId].push(newMessage);
    this.save();
    return newMessage;
  }

  editMessage(chatId: string, messageId: string, senderId: string, newCiphertext: string, newIv: string) {
    const list = this.data.messages[chatId] || [];
    const idx = list.findIndex(m => m.id === messageId && m.senderId === senderId);
    if (idx !== -1) {
      const oldMsg = list[idx];

      // Save to edit history
      if (!this.data.messageVersions[messageId]) {
        this.data.messageVersions[messageId] = [];
      }
      this.data.messageVersions[messageId].push({
        id: Math.random().toString(),
        messageId,
        ciphertext: oldMsg.ciphertext,
        iv: oldMsg.iv,
        createdAt: oldMsg.updatedAt || oldMsg.createdAt
      });

      // Update current message
      list[idx] = {
        ...oldMsg,
        ciphertext: newCiphertext,
        iv: newIv,
        updatedAt: new Date().toISOString()
      };

      this.save();
      return list[idx];
    }
    return null;
  }

  getMessageVersions(messageId: string) {
    return this.data.messageVersions[messageId] || [];
  }

  deleteMessage(chatId: string, messageId: string) {
    if (this.data.messages[chatId]) {
      const originalLength = this.data.messages[chatId].length;
      this.data.messages[chatId] = this.data.messages[chatId].filter(m => m.id !== messageId);
      if (this.data.messages[chatId].length !== originalLength) {
        delete this.data.messageVersions[messageId];
        this.save();
        return true;
      }
    }
    return false;
  }

  markMessageAsRead(chatId: string, messageId: string) {
    const list = this.data.messages[chatId] || [];
    const idx = list.findIndex(m => m.id === messageId);
    if (idx !== -1 && !list[idx].readAt) {
      list[idx].readAt = new Date().toISOString();
      this.save();
      return true;
    }
    return false;
  }

  // --- Stories ---
  getStories() {
    // Return all valid, unexpired stories
    const now = new Date().getTime();
    const result: any[] = [];
    Object.keys(this.data.stories).forEach(uid => {
      const userStories = this.data.stories[uid].filter(s => new Date(s.expiresAt).getTime() > now);
      this.data.stories[uid] = userStories; // Clean expired stories
      result.push(...userStories);
    });
    return result;
  }

  addStory(userId: string, story: any) {
    if (!this.data.stories[userId]) {
      this.data.stories[userId] = [];
    }

    const newStory = {
      ...story,
      userId,
      createdAt: new Date().toISOString(),
      views: [],
      reactions: []
    };

    this.data.stories[userId].push(newStory);
    this.save();
    return newStory;
  }

  deleteStory(userId: string, storyId: string) {
    if (this.data.stories[userId]) {
      this.data.stories[userId] = this.data.stories[userId].filter(s => s.id !== storyId);
      this.save();
      return true;
    }
    return false;
  }

  // --- Vault ---
  getVaultItems(ownerId: string) {
    return this.data.vaultItems[ownerId] || [];
  }

  addVaultItem(ownerId: string, item: { id: string; userId: string; ownerType: string; fileName: string; fileType: string; ciphertext: string; iv: string }) {
    if (!this.data.vaultItems[ownerId]) {
      this.data.vaultItems[ownerId] = [];
    }

    const newItem = {
      ...item,
      createdAt: new Date().toISOString()
    };

    this.data.vaultItems[ownerId].push(newItem);
    this.save();
    return newItem;
  }

  deleteVaultItem(ownerId: string, itemId: string) {
    if (this.data.vaultItems[ownerId]) {
      this.data.vaultItems[ownerId] = this.data.vaultItems[ownerId].filter(i => i.id !== itemId);
      this.save();
      return true;
    }
    return false;
  }

  // --- Secret Box ---
  getSecretBoxItems(ownerId: string) {
    return this.data.secretBoxItems[ownerId] || [];
  }

  addSecretBoxItem(ownerId: string, item: { id: string; userId: string; ownerType: string; ciphertext: string; iv: string; openAt: string }) {
    if (!this.data.secretBoxItems[ownerId]) {
      this.data.secretBoxItems[ownerId] = [];
    }

    const newItem = {
      ...item,
      createdAt: new Date().toISOString()
    };

    this.data.secretBoxItems[ownerId].push(newItem);
    this.save();
    return newItem;
  }

  // --- Shared Notes ---
  getSharedNotes(ownerId: string) {
    return this.data.sharedNotes[ownerId] || [];
  }

  saveSharedNote(ownerId: string, note: { id: string; ownerType: string; title: string; ciphertext: string; iv: string }) {
    if (!this.data.sharedNotes[ownerId]) {
      this.data.sharedNotes[ownerId] = [];
    }

    const idx = this.data.sharedNotes[ownerId].findIndex(n => n.id === note.id);
    const item = {
      ...note,
      updatedAt: new Date().toISOString(),
      createdAt: idx !== -1 ? this.data.sharedNotes[ownerId][idx].createdAt : new Date().toISOString()
    };

    if (idx !== -1) {
      this.data.sharedNotes[ownerId][idx] = item;
    } else {
      this.data.sharedNotes[ownerId].push(item);
    }

    this.save();
    return item;
  }

  deleteSharedNote(ownerId: string, noteId: string) {
    if (this.data.sharedNotes[ownerId]) {
      this.data.sharedNotes[ownerId] = this.data.sharedNotes[ownerId].filter(n => n.id !== noteId);
      this.save();
      return true;
    }
    return false;
  }

  // --- Shared Journals ---
  getJournals(userId: string) {
    return Object.values(this.data.sharedJournals[userId] || {});
  }

  saveJournal(userId: string, journal: { id: string; date: string; title: string; ciphertext: string; iv: string }) {
    if (!this.data.sharedJournals[userId]) {
      this.data.sharedJournals[userId] = {};
    }

    const existing = this.data.sharedJournals[userId][journal.date] || {};
    const item = {
      ...journal,
      createdAt: existing.createdAt || new Date().toISOString()
    };

    this.data.sharedJournals[userId][journal.date] = item;
    this.save();
    return item;
  }

  // --- Couple Accessories ---
  getAnniversaries(coupleId: string) {
    return this.data.anniversaries[coupleId] || [];
  }

  saveAnniversary(coupleId: string, anniversary: { id: string; title: string; date: string }) {
    if (!this.data.anniversaries[coupleId]) {
      this.data.anniversaries[coupleId] = [];
    }
    const idx = this.data.anniversaries[coupleId].findIndex(a => a.id === anniversary.id);
    if (idx !== -1) {
      this.data.anniversaries[coupleId][idx] = anniversary;
    } else {
      this.data.anniversaries[coupleId].push(anniversary);
    }
    this.save();
    return anniversary;
  }

  getCalendarEvents(coupleId: string) {
    return this.data.calendarEvents[coupleId] || [];
  }

  saveCalendarEvent(coupleId: string, event: { id: string; title: string; date: string; description?: string }) {
    if (!this.data.calendarEvents[coupleId]) {
      this.data.calendarEvents[coupleId] = [];
    }
    const idx = this.data.calendarEvents[coupleId].findIndex(e => e.id === event.id);
    if (idx !== -1) {
      this.data.calendarEvents[coupleId][idx] = event;
    } else {
      this.data.calendarEvents[coupleId].push(event);
    }
    this.save();
    return event;
  }

  // --- BFF Accessories: Whiteboard, Checklist, Polls ---
  getWhiteboardState(bffGroupId: string) {
    return this.data.whiteboardStates[bffGroupId] || '';
  }

  saveWhiteboardState(bffGroupId: string, canvasData: string) {
    this.data.whiteboardStates[bffGroupId] = canvasData;
    this.save();
    return canvasData;
  }

  getChecklist(bffGroupId: string) {
    return this.data.checklists[bffGroupId] || [];
  }

  addChecklistItem(bffGroupId: string, text: string, userId: string) {
    if (!this.data.checklists[bffGroupId]) {
      this.data.checklists[bffGroupId] = [];
    }
    const item = {
      id: Math.random().toString(),
      text,
      isCompleted: false,
      updatedBy: userId,
      createdAt: new Date().toISOString()
    };
    this.data.checklists[bffGroupId].push(item);
    this.save();
    return item;
  }

  toggleChecklistItem(bffGroupId: string, itemId: string, isCompleted: boolean, userId: string) {
    const list = this.data.checklists[bffGroupId] || [];
    const item = list.find(i => i.id === itemId);
    if (item) {
      item.isCompleted = isCompleted;
      item.updatedBy = userId;
      this.save();
      return item;
    }
    return null;
  }

  getPolls(bffGroupId: string) {
    return this.data.polls[bffGroupId] || [];
  }

  createPoll(bffGroupId: string, poll: { id: string; question: string; options: Array<{ id: string; optionText: string }>; expiresAt: string }) {
    if (!this.data.polls[bffGroupId]) {
      this.data.polls[bffGroupId] = [];
    }
    const newPoll = {
      ...poll,
      createdAt: new Date().toISOString()
    };
    this.data.polls[bffGroupId].push(newPoll);
    this.save();
    return newPoll;
  }

  getPollVotes(pollId: string) {
    return this.data.pollVotes[pollId] || {};
  }

  votePoll(pollId: string, userId: string, optionId: string) {
    if (!this.data.pollVotes[pollId]) {
      this.data.pollVotes[pollId] = {};
    }
    this.data.pollVotes[pollId][userId] = optionId;
    this.save();
    return this.data.pollVotes[pollId];
  }

  // --- Audit Logs ---
  getAuditLogs() {
    return this.data.auditLogs;
  }

  addAuditLog(userId: string | null, deviceId: string | null, event: string, ip: string, metadata?: string) {
    const log = {
      id: Math.random().toString(),
      userId,
      deviceId,
      event,
      ip: ip.replace(/\d+$/, 'xxx'), // Privacy: anonymize last IP octet
      metadata,
      createdAt: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    // Keep only last 500 logs for size control
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
    return log;
  }

  // --- Lenses ---
  getLens(userId: string, type: string) {
    if (!this.data.lenses) this.data.lenses = {};
    const lensId = `${userId}_${type}`;
    let lens = this.data.lenses[lensId];
    if (!lens && type === 'PUBLIC') {
      const u = this.getUser(userId);
      if (u) {
        lens = {
          id: lensId,
          userId,
          type: 'PUBLIC',
          displayName: u.displayName,
          bio: u.bio || '',
          avatar: u.avatar || '0',
          banner: '#1e1b4b',
          accentColor: '#8b5cf6',
          status: 'สวัสดี Shush!',
          pronouns: '',
          interests: [],
          socialLinks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.data.lenses[lensId] = lens;
        this.save();
      }
    }
    return lens || null;
  }

  getLenses(userId: string) {
    const types = ['PUBLIC', 'FRIENDS', 'BFF', 'COUPLE'];
    return types.map(t => this.getLens(userId, t)).filter(Boolean);
  }

  updateLens(userId: string, type: string, updates: any) {
    if (!this.data.lenses) this.data.lenses = {};
    const lensId = `${userId}_${type}`;
    const existing = this.getLens(userId, type) || {
      id: lensId,
      userId,
      type,
      displayName: this.getUser(userId)?.displayName || 'ผู้ใช้',
      bio: '',
      avatar: this.getUser(userId)?.avatar || '0',
      banner: '#1e1b4b',
      accentColor: '#8b5cf6',
      status: '',
      pronouns: '',
      interests: [],
      socialLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.data.lenses[lensId] = updated;

    // Sync with User table if it's the PUBLIC lens
    if (type === 'PUBLIC') {
      this.updateUser(userId, {
        displayName: updated.displayName,
        bio: updated.bio,
        avatar: updated.avatar
      });
    }

    this.save();
    return updated;
  }

  // --- Friendships ---
  getFriends(userId: string) {
    if (!this.data.friends) this.data.friends = {};
    return this.data.friends[userId] || [];
  }

  addFriend(userId: string, friendId: string) {
    if (!this.data.friends) this.data.friends = {};
    if (!this.data.friends[userId]) this.data.friends[userId] = [];
    if (!this.data.friends[friendId]) this.data.friends[friendId] = [];

    if (!this.data.friends[userId].includes(friendId)) {
      this.data.friends[userId].push(friendId);
    }
    if (!this.data.friends[friendId].includes(userId)) {
      this.data.friends[friendId].push(userId);
    }
    this.save();
    return true;
  }

  removeFriend(userId: string, friendId: string) {
    if (!this.data.friends) this.data.friends = {};
    if (this.data.friends[userId]) {
      this.data.friends[userId] = this.data.friends[userId].filter(id => id !== friendId);
    }
    if (this.data.friends[friendId]) {
      this.data.friends[friendId] = this.data.friends[friendId].filter(id => id !== userId);
    }
    this.save();
    return true;
  }

  // --- Honey Me / Discovery Layer ---
  updateHoneyMeSettings(userId: string, mode: boolean, permission: 'OPEN' | 'REQUEST' | 'INVITE' | 'SILENT') {
    const user = this.data.users[userId];
    if (user) {
      user.honeyMeMode = mode;
      user.honeyMePermission = permission;
      this.save();
      return user;
    }
    return null;
  }

  getDiscoverableUsers(viewerId: string) {
    return Object.values(this.data.users).filter(
      u => u.id !== viewerId && u.honeyMeMode === true
    );
  }

  getHoneyInvites(userId: string) {
    if (!this.data.honeyInvites) this.data.honeyInvites = {};
    return this.data.honeyInvites[userId] || [];
  }

  sendHoneyInvite(fromUserId: string, toUserId: string) {
    if (!this.data.honeyInvites) this.data.honeyInvites = {};
    if (!this.data.honeyInvites[toUserId]) {
      this.data.honeyInvites[toUserId] = [];
    }
    if (!this.data.honeyInvites[toUserId].includes(fromUserId)) {
      this.data.honeyInvites[toUserId].push(fromUserId);
      this.save();
      return true;
    }
    return false;
  }

  acceptHoneyInvite(userId: string, fromUserId: string) {
    if (!this.data.honeyInvites) this.data.honeyInvites = {};
    if (this.data.honeyInvites[userId]) {
      this.data.honeyInvites[userId] = this.data.honeyInvites[userId].filter(id => id !== fromUserId);
    }
    this.addFriend(userId, fromUserId);
    this.save();
    return true;
  }

  declineHoneyInvite(userId: string, fromUserId: string) {
    if (!this.data.honeyInvites) this.data.honeyInvites = {};
    if (this.data.honeyInvites[userId]) {
      this.data.honeyInvites[userId] = this.data.honeyInvites[userId].filter(id => id !== fromUserId);
      this.save();
      return true;
    }
    return false;
  }

  resolveRelationship(viewerId: string, targetId: string): 'COUPLE' | 'BFF' | 'FRIENDS' | 'PUBLIC' {
    if (viewerId === targetId) return 'PUBLIC';

    // 1. Couple check
    const couple = this.getCouple(viewerId);
    if (couple && couple.isAccepted && (couple.user1Id === targetId || couple.user2Id === targetId)) {
      return 'COUPLE';
    }

    // 2. BFF check
    const viewerBffs = this.getBffGroups(viewerId).map(g => g.id);
    const targetBffs = this.getBffGroups(targetId).map(g => g.id);
    const sharedBff = viewerBffs.some(gId => targetBffs.includes(gId));
    if (sharedBff) {
      return 'BFF';
    }

    // 3. Friends check
    const friends = this.getFriends(viewerId);
    if (friends.includes(targetId)) {
      return 'FRIENDS';
    }

    return 'PUBLIC';
  }

  resolveLens(viewerId: string, targetId: string) {
    const rel = this.resolveRelationship(viewerId, targetId);
    if (rel === 'PUBLIC') {
      return this.getLens(targetId, 'PUBLIC');
    }

    const preferredLens = this.getLens(targetId, rel);
    if (preferredLens) {
      return preferredLens;
    }

    return this.getLens(targetId, 'PUBLIC');
  }

  // --- Pet System ---
  getPet(userId: string) {
    if (!this.data.pets) this.data.pets = {};
    return this.data.pets[userId] || null;
  }

  adoptPet(userId: string, species: string, name: string, color: string) {
    if (!this.data.pets) this.data.pets = {};
    
    const initialBrain = {
      PUBLIC: [
        { id: '1', sentence: 'สวัสดีฮะนายน้อย 👋', version: 1, updatedAt: new Date().toISOString(), history: [] }
      ],
      FRIENDS: [
        { id: '1', sentence: 'วันนี้ไปเที่ยวไหนกันดีฮะ 👥', version: 1, updatedAt: new Date().toISOString(), history: [] }
      ],
      BFF: [
        { id: '1', sentence: 'คิดถึงเพื่อนซี้ที่สุดเยย 💙', version: 1, updatedAt: new Date().toISOString(), history: [] }
      ],
      COUPLE: [
        { id: '1', sentence: 'รักที่ซู้ดดดด 💕', version: 1, updatedAt: new Date().toISOString(), history: [] }
      ]
    };

    const newPet = {
      id: `${userId}_pet_${Date.now()}`,
      userId,
      species, // 'cat', 'dog', 'rabbit', 'fox', 'panda', 'bear'
      name,
      color, // hex code or preset
      accessories: [] as string[], // list of unlocked / owned accessory IDs
      equippedAccessories: [] as string[], // list of equipped accessory IDs
      furniture: [] as string[], // unlocked furniture
      placedFurniture: [] as string[], // currently placed furniture
      effects: [] as string[], // unlocked effects
      activeEffects: [] as string[], // active effects
      artificialBrain: initialBrain,
      speakingSettings: {
        interval: '15-30', // '1-5' | '5-15' | '15-30' | '30-60' | '60-120' | 'random'
        conditions: ['profile', 'chat', 'story', 'home'] as string[]
      },
      lensVisibility: {
        PUBLIC: true,
        FRIENDS: true,
        BFF: true,
        COUPLE: true
      },
      satiety: 100, // satiety level (0 - 100)
      level: 1, // Start at level 1
      exp: 0, // Start with 0 exp
      lastFedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.pets[userId] = newPet;
    this.save();
    return newPet;
  }

  updatePet(userId: string, updates: any) {
    if (!this.data.pets) this.data.pets = {};
    const existing = this.data.pets[userId];
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.data.pets[userId] = updated;
    this.save();
    return updated;
  }

  getCoins(userId: string): number {
    const u = this.getUser(userId);
    if (!u) return 0;
    if (u.coins === undefined) {
      u.coins = 500; // Default startup balance
      this.saveUser(userId, u);
    }
    return u.coins;
  }

  addCoins(userId: string, amount: number): number {
    const u = this.getUser(userId);
    if (!u) return 0;
    const current = this.getCoins(userId);
    u.coins = Math.max(0, current + amount);
    this.saveUser(userId, u);
    return u.coins;
  }

  // --- Notification System Methods ---

  getNotificationSettings(userId: string): NotificationSettings {
    if (!this.data.notificationSettings) {
      this.data.notificationSettings = {};
    }
    if (!this.data.notificationSettings[userId]) {
      this.data.notificationSettings[userId] = {
        categories: {
          RELATIONSHIP: true,
          LENS: true,
          PET: true,
          SYSTEM: true,
          HONEY_ME: true,
        },
        relationships: {
          FRIENDS: true,
          BFF: true,
          COUPLE: true,
        },
        lenses: {
          PUBLIC: true,
          FRIENDS: true,
          BFF: true,
          COUPLE: true,
        },
        deliveryType: 'IN_APP',
        dndEnabled: false,
        dndMode: 'ALL',
        dndScheduleStart: '22:00',
        dndScheduleEnd: '08:00',
        dndOverrideSystemCritical: true,
        showMessagePreview: false,
        enableToastPopup: true,
      };
      this.save();
    }
    const userSettings = this.data.notificationSettings[userId];
    if (userSettings && userSettings.enableToastPopup === undefined) {
      userSettings.enableToastPopup = true;
    }
    return userSettings;
  }

  updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): NotificationSettings {
    const current = this.getNotificationSettings(userId);
    const updated = {
      ...current,
      ...settings,
      categories: { ...current.categories, ...settings.categories },
      relationships: { ...current.relationships, ...settings.relationships },
      lenses: { ...current.lenses, ...settings.lenses }
    };
    this.data.notificationSettings![userId] = updated;
    this.save();
    return updated;
  }

  getNotifications(userId: string): ShushNotification[] {
    if (!this.data.notifications) {
      this.data.notifications = {};
    }
    return this.data.notifications[userId] || [];
  }

  createNotification(
    userId: string,
    category: 'RELATIONSHIP' | 'LENS' | 'PET' | 'SYSTEM' | 'HONEY_ME',
    title: string,
    body: string,
    senderId?: string,
    lensType?: 'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE',
    petId?: string,
    isSilent: boolean = false
  ): ShushNotification | null {
    const settings = this.getNotificationSettings(userId);

    // Check if category is enabled
    if (settings.categories && !settings.categories[category]) {
      return null;
    }

    // Check relationships filter
    if (senderId) {
      const rel = this.resolveRelationship(userId, senderId);
      if (rel !== 'PUBLIC' && settings.relationships) {
        if (rel === 'FRIENDS' && !settings.relationships.FRIENDS) return null;
        if (rel === 'BFF' && !settings.relationships.BFF) return null;
        if (rel === 'COUPLE' && !settings.relationships.COUPLE) return null;
      }
    }

    // Check lenses filter
    if (lensType && settings.lenses && !settings.lenses[lensType]) {
      return null;
    }

    // Check Presence and apply constraints
    const receiver = this.getUser(userId);
    const presence = receiver?.presenceStatus || 'online';

    // 1. สถานะ "ไม่อยู่" (away): จะไม่มีการแจ้งเตือนใดๆ ส่งมา เหมือนกับโหมด DND
    if (presence === 'away') {
      return null;
    }

    // Check DND
    let finalSilent = isSilent;
    if (settings.dndEnabled) {
      const isSystemCritical = category === 'SYSTEM' && title.toLowerCase().includes('security');
      const canOverride = settings.dndOverrideSystemCritical && isSystemCritical;

      if (!canOverride) {
        if (settings.dndMode === 'ALL') {
          finalSilent = true;
        } else if (settings.dndMode === 'GROUPS' && (category === 'RELATIONSHIP' || category === 'HONEY_ME')) {
          finalSilent = true;
        } else if (settings.dndMode === 'SCHEDULE') {
          const now = new Date();
          const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const start = settings.dndScheduleStart || '22:00';
          const end = settings.dndScheduleEnd || '08:00';
          
          let isDndTime = false;
          if (start <= end) {
            isDndTime = currentHHMM >= start && currentHHMM <= end;
          } else {
            isDndTime = currentHHMM >= start || currentHHMM <= end;
          }

          if (isDndTime) {
            finalSilent = true;
          }
        }
      }
    }

    // 2. สถานะ "ไม่ว่าง" (busy): ปิดการแจ้งเตือนแบบ pop-up หรือการแจ้งเตือนเปลี่ยนเป็นโหมดเงียบ
    if (presence === 'busy') {
      finalSilent = true;
    }

    // 3. สถานะ "ออฟไลน์" (offline): จะแสดงการแจ้งเตือนปกติ แต่จะไม่มีแจ้งเตือนแบบเสียง
    let finalNoSound = false;
    if (presence === 'offline') {
      finalNoSound = true;
    }

    // Handle message preview privacy filtering
    let finalBody = body;
    if (!settings.showMessagePreview && (category === 'RELATIONSHIP' || category === 'HONEY_ME')) {
      finalBody = 'คุณมีข้อความใหม่ (รายละเอียดถูกซ่อนไว้เพื่อความเป็นส่วนตัว)';
    }

    // Enforce privacy of lens / pet data
    if (lensType) {
      if (senderId) {
        const actualRel = this.resolveRelationship(userId, senderId);
        if (lensType === 'COUPLE' && actualRel !== 'COUPLE') return null;
        if (lensType === 'BFF' && actualRel !== 'BFF' && actualRel !== 'COUPLE') return null;
        if (lensType === 'FRIENDS' && actualRel === 'PUBLIC') return null;
      }
    }

    if (petId && senderId) {
      const pet = this.data.pets[senderId];
      if (pet && pet.lensVisibility) {
        const actualRel = this.resolveRelationship(userId, senderId);
        if (actualRel === 'FRIENDS' && pet.lensVisibility.FRIENDS === false) return null;
        if (actualRel === 'BFF' && pet.lensVisibility.BFF === false) return null;
        if (actualRel === 'COUPLE' && pet.lensVisibility.COUPLE === false) return null;
      }
    }

    const newNotif: ShushNotification = {
      id: 'notif_' + Math.random().toString(36).substring(2, 11),
      userId,
      category,
      title,
      body: finalBody,
      senderId,
      lensType,
      petId,
      isRead: false,
      isSilent: finalSilent,
      noSound: finalNoSound,
      createdAt: new Date().toISOString()
    };

    if (!this.data.notifications) {
      this.data.notifications = {};
    }
    if (!this.data.notifications[userId]) {
      this.data.notifications[userId] = [];
    }

    this.data.notifications[userId].unshift(newNotif);

    if (this.data.notifications[userId].length > 200) {
      this.data.notifications[userId] = this.data.notifications[userId].slice(0, 200);
    }

    this.save();
    return newNotif;
  }

  markNotificationRead(userId: string, notificationId: string): boolean {
    if (!this.data.notifications || !this.data.notifications[userId]) return false;
    const notif = this.data.notifications[userId].find(n => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
      this.save();
      return true;
    }
    return false;
  }

  markNotificationUnread(userId: string, notificationId: string): boolean {
    if (!this.data.notifications || !this.data.notifications[userId]) return false;
    const notif = this.data.notifications[userId].find(n => n.id === notificationId);
    if (notif) {
      notif.isRead = false;
      this.save();
      return true;
    }
    return false;
  }

  deleteNotification(userId: string, notificationId: string): boolean {
    if (!this.data.notifications || !this.data.notifications[userId]) return false;
    const initialLength = this.data.notifications[userId].length;
    this.data.notifications[userId] = this.data.notifications[userId].filter(n => n.id !== notificationId);
    if (this.data.notifications[userId].length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  markAllNotificationsRead(userId: string): boolean {
    if (!this.data.notifications || !this.data.notifications[userId]) return false;
    this.data.notifications[userId].forEach(n => {
      n.isRead = true;
    });
    this.save();
    return true;
  }

  clearReadNotifications(userId: string): boolean {
    if (!this.data.notifications || !this.data.notifications[userId]) return false;
    this.data.notifications[userId] = this.data.notifications[userId].filter(n => !n.isRead);
    this.save();
    return true;
  }

  batchUpdateNotifications(userId: string, ids: string[], isRead: boolean | null, shouldDelete: boolean): boolean {
    if (!this.data.notifications || !this.data.notifications[userId]) return false;
    if (shouldDelete) {
      this.data.notifications[userId] = this.data.notifications[userId].filter(n => !ids.includes(n.id));
    } else if (isRead !== null) {
      this.data.notifications[userId].forEach(n => {
        if (ids.includes(n.id)) {
          n.isRead = isRead;
        }
      });
    }
    this.save();
    return true;
  }

  clearNotifications(userId: string): boolean {
    if (!this.data.notifications) return false;
    this.data.notifications[userId] = [];
    this.save();
    return true;
  }

  private saveUser(userId: string, user: any) {
    this.data.users[userId] = user;
    this.save();
  }
}

export const dbStore = new ShushStore();
