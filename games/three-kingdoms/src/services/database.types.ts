export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nickname: string;
          level: number;
          gold: number;
          gems: number;
          stamina: number;
          vip_level: number;
          max_cleared_stage: string | null;
          cleared_stages: string[];
          created_at: string;
          last_login: string;
        };
        Insert: {
          id: string;
          nickname: string;
          level: number;
          gold: number;
          gems: number;
          stamina: number;
          vip_level: number;
          max_cleared_stage?: string | null;
          cleared_stages?: string[];
          created_at?: string;
          last_login: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          level?: number;
          gold?: number;
          gems?: number;
          stamina?: number;
          vip_level?: number;
          max_cleared_stage?: string | null;
          cleared_stages?: string[];
          created_at?: string;
          last_login?: string;
        };
        Relationships: [];
      };
      generals: {
        Row: {
          id: string;
          name: string;
          grade: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
          class: 'warrior' | 'tank' | 'archer' | 'strategist' | 'cavalry';
          base_attack: number;
          base_defense: number;
          base_intelligence: number;
          base_politics: number;
          base_charm: number;
          skill_ids: string[];
        };
        Insert: {
          id: string;
          name: string;
          grade: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
          class: 'warrior' | 'tank' | 'archer' | 'strategist' | 'cavalry';
          base_attack: number;
          base_defense: number;
          base_intelligence: number;
          base_politics: number;
          base_charm: number;
          skill_ids: string[];
        };
        Update: {
          id?: string;
          name?: string;
          grade?: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
          class?: 'warrior' | 'tank' | 'archer' | 'strategist' | 'cavalry';
          base_attack?: number;
          base_defense?: number;
          base_intelligence?: number;
          base_politics?: number;
          base_charm?: number;
          skill_ids?: string[];
        };
        Relationships: [];
      };
      user_generals: {
        Row: {
          id: string;
          user_id: string;
          general_id: string;
          level: number;
          stars: number;
          exp: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          general_id: string;
          level: number;
          stars: number;
          exp: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          general_id?: string;
          level?: number;
          stars?: number;
          exp?: number;
        };
        Relationships: [];
      };
      formations: {
        Row: {
          id: string;
          user_id: string;
          slot: number;
          positions: (string | null)[];
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          slot: number;
          positions: (string | null)[];
          is_active: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          slot?: number;
          positions?: (string | null)[];
          is_active?: boolean;
        };
        Relationships: [];
      };
      battles: {
        Row: {
          id: string;
          attacker_id: string;
          defender_id: string;
          winner_id: string | null;
          replay_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          attacker_id: string;
          defender_id: string;
          winner_id?: string | null;
          replay_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          attacker_id?: string;
          defender_id?: string;
          winner_id?: string | null;
          replay_data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
