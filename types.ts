export enum ClassType {
  MEDIC = 'MEDIC',
  ENGINEER = 'ENGINEER',
  SCOUT = 'SCOUT'
}

export enum EntityType {
  RESOURCE_WOOD = 'RESOURCE_WOOD',
  RESOURCE_FOOD = 'RESOURCE_FOOD',
  RESOURCE_WATER = 'RESOURCE_WATER',
  RESOURCE_MEDKIT = 'RESOURCE_MEDKIT',
  ITEM_LASER = 'ITEM_LASER',
  MISSION_CHILD = 'MISSION_CHILD',
  ENEMY_WOLF = 'ENEMY_WOLF',
  ENEMY_CULTIST = 'ENEMY_CULTIST',
  ENEMY_ALPHA = 'ENEMY_ALPHA',
  ENEMY_ALIEN = 'ENEMY_ALIEN',
  BASE = 'BASE'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  position: Coordinates;
  health?: number;
  maxHealth?: number;
  name: string;
  icon: string;
  distance?: number; // Calculated relative to player
}

export interface Player {
  id: string; // PeerID
  name: string;
  classType: ClassType;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  temperature: number; // 0-100
  isDead: boolean;
  position?: Coordinates; // For multiplayer sync
  inventory: {
    wood: number;
    food: number;
    water: number;
    medkit: number;
    laser: number;
    childrenSaved: number;
  };
}

export interface GameState {
  day: number;
  isNight: boolean;
  baseLevel: number;
  baseHealth: number;
  baseMaxHealth: number;
  baseLocation: Coordinates | null;
  logs: string[];
}

// Multiplayer Payloads
export type PacketType = 'HELLO' | 'WORLD_UPDATE' | 'PLAYER_UPDATE' | 'REVIVE_REQUEST' | 'CHAT';

export interface NetworkPacket {
  type: PacketType;
  senderId: string;
  payload: any;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export const ENTITY_CONFIG: Record<EntityType, { name: string, icon: string, hp?: number, damage?: number, description?: string }> = {
  [EntityType.RESOURCE_WOOD]: { name: 'Old Pallets', icon: '🪵' },
  [EntityType.RESOURCE_FOOD]: { name: 'Wild Berries', icon: '🍒' },
  [EntityType.RESOURCE_WATER]: { name: 'Rain Collector', icon: '💧' },
  [EntityType.RESOURCE_MEDKIT]: { name: 'First Aid Kit', icon: '💊' },
  [EntityType.ITEM_LASER]: { name: 'Alien Blaster', icon: '🔫', description: "Instantly kills any target. 1 Charge." },
  [EntityType.MISSION_CHILD]: { name: 'Lost Child', icon: '👧', description: "Escort to base for massive rewards." },
  [EntityType.ENEMY_WOLF]: { name: 'Mutated Wolf', icon: '🐺', hp: 50, damage: 10 },
  [EntityType.ENEMY_CULTIST]: { name: 'Glitch Cultist', icon: '🧙‍♂️', hp: 80, damage: 15 },
  [EntityType.ENEMY_ALPHA]: { name: 'Alpha Beast', icon: '👹', hp: 200, damage: 30 },
  [EntityType.ENEMY_ALIEN]: { name: 'Grey Visitor', icon: '👽', hp: 150, damage: 40 },
  [EntityType.BASE]: { name: 'Safehouse', icon: '⛺' }
};