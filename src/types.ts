export interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar: string;
  publicKey: string;
  recoveryKeyHash: string;
  createdAt: string;
  honeyMeMode?: boolean;
  honeyMePermission?: 'OPEN' | 'REQUEST' | 'INVITE' | 'SILENT';
}

export interface Device {
  id: string;
  userId: string;
  name: string;
  browser: string;
  os: string;
  ip: string;
  publicKey: string;
  isApproved: boolean;
  approvedAt?: string;
  lastActiveAt: string;
  createdAt: string;
}

export interface Circle {
  id: string;
  name: string;
  type: 'SYSTEM' | 'CUSTOM';
}

export interface Couple {
  id: string;
  user1Id: string;
  user2Id: string;
  isAccepted: boolean;
  anniversaryDate?: string;
  createdAt: string;
}

export interface BffMember {
  id: string;
  bffGroupId: string;
  userId: string;
  isAccepted: boolean;
  joinedAt: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  publicKey?: string;
}

export interface BffGroup {
  id: string;
  name: string;
  avatar?: string;
  createdAt: string;
  members: BffMember[];
}

export interface Message {
  id: string;
  senderId: string;
  ciphertext: string;
  iv: string;
  isBurnAfterRead: boolean;
  burnDurationSec: number;
  isSelfDestruct: boolean;
  selfDestructAt?: string;
  readAt?: string;
  replyToId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageVersion {
  id: string;
  messageId: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  ciphertext: string;
  iv: string;
  audienceType: 'CIRCLE' | 'COUPLE' | 'BFF_GROUP' | 'CUSTOM';
  targetCircleName?: string;
  targetBffGroupId?: string;
  isDownloadable: boolean;
  isForwardable: boolean;
  isSaveable: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface VaultItem {
  id: string;
  userId: string;
  ownerType: 'USER' | 'COUPLE' | 'BFF_GROUP';
  fileName: string;
  fileType: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
}

export interface SecretBoxItem {
  id: string;
  userId: string;
  ownerType: 'USER' | 'COUPLE' | 'BFF_GROUP';
  ciphertext: string;
  iv: string;
  openAt: string;
  createdAt: string;
}

export interface SharedNote {
  id: string;
  ownerType: 'COUPLE' | 'BFF_GROUP';
  title: string; // encrypted
  ciphertext: string; // encrypted
  iv: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedJournal {
  id: string;
  userId: string;
  title: string; // encrypted
  ciphertext: string; // encrypted
  iv: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string; // encrypted
  isCompleted: boolean;
  updatedBy: string;
  createdAt: string;
}

export interface Poll {
  id: string;
  question: string; // encrypted
  options: Array<{ id: string; optionText: string }>; // optionTexts are encrypted
  expiresAt: string;
  createdAt: string;
  votes: Record<string, string>; // userId -> optionId
}

export interface Anniversary {
  id: string;
  title: string;
  date: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  deviceId: string | null;
  event: string;
  ip: string;
  metadata?: string;
  createdAt: string;
}

export type LensType = 'PUBLIC' | 'FRIENDS' | 'BFF' | 'COUPLE';

export interface Lens {
  id: string;
  userId: string;
  type: LensType;
  displayName: string;
  bio?: string;
  avatar: string;
  banner?: string;
  accentColor?: string;
  status?: string;
  pronouns?: string;
  interests?: string[];
  socialLinks?: Array<{ platform: string; url: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ShushNotification {
  id: string;
  userId: string;
  category: 'RELATIONSHIP' | 'LENS' | 'PET' | 'SYSTEM' | 'HONEY_ME';
  title: string;
  body: string;
  senderId?: string;
  senderAvatar?: string;
  senderUsername?: string;
  senderDisplayName?: string;
  lensType?: LensType;
  petId?: string;
  isRead: boolean;
  isSilent: boolean; // If true, stored silently in Privacy Inbox
  noSound?: boolean; // If true, do not play notification sound
  createdAt: string;
}

export interface NotificationSettings {
  categories: {
    RELATIONSHIP: boolean;
    LENS: boolean;
    PET: boolean;
    SYSTEM: boolean;
    HONEY_ME: boolean;
  };
  relationships: {
    FRIENDS: boolean;
    BFF: boolean;
    COUPLE: boolean;
  };
  lenses: {
    PUBLIC: boolean;
    FRIENDS: boolean;
    BFF: boolean;
    COUPLE: boolean;
  };
  deliveryType: 'SILENT' | 'BADGE' | 'IN_APP';
  dndEnabled: boolean;
  dndMode: 'ALL' | 'GROUPS' | 'SCHEDULE';
  dndScheduleStart?: string; // "HH:MM"
  dndScheduleEnd?: string; // "HH:MM"
  dndOverrideSystemCritical: boolean;
  showMessagePreview: boolean;
  enableToastPopup?: boolean;
}

