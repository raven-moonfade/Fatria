export type BackstreetMessageSender = 'user' | 'contact' | 'system';

export interface BackstreetMessage {
  id: string;
  sender: BackstreetMessageSender;
  contact: string;
  type: 'text' | 'system';
  time: string;
  text: string;
  createdAt: number;
}

export interface BackstreetContact {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
}

export interface BackstreetThreadData {
  contact: string;
  updatedAt: number;
  messages: BackstreetMessage[];
}

export interface BackstreetCoreMemory {
  contact: string;
  updatedAt: number;
  summary: string;
  relationship: string;
  knownFacts: string[];
  openLoops: string[];
  recentTone: string;
  keywords: string[];
}

export interface BackstreetBridgeMemoryItem {
  text: string;
  keywords: string[];
  updatedAt: number;
}

export interface BackstreetBridgeMemory {
  contact: string;
  updatedAt: number;
  summary: string;
  facts: string[];
  openLoops: string[];
  keywords: string[];
  items: BackstreetBridgeMemoryItem[];
}

export interface PhoneMemoryQuery {
  app: 'backstreet';
  characters: string[];
  keywords: string[];
  locations: string[];
  limit: number;
}

export interface PhoneMemoryHit {
  title: string;
  content: string;
  contact?: string;
  source: string;
  score: number;
}

export interface WorldbookEntry {
  uid?: number | string;
  key?: string[];
  keysecondary?: string[];
  comment?: string;
  content?: string;
  disable?: boolean;
  disabled?: boolean;
  constant?: boolean;
  selective?: boolean;
  selectiveLogic?: number;
  position?: number;
  role?: number;
  depth?: number;
  order?: number;
  probability?: number;
  useProbability?: boolean;
  [key: string]: unknown;
}

export interface WorldbookData {
  entries?: WorldbookEntry[] | Record<string, WorldbookEntry>;
  [key: string]: unknown;
}
