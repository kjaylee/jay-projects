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
          created_at: string;
          last_login: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
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
        Insert: Database['public']['Tables']['generals']['Row'];
        Update: Partial<Database['public']['Tables']['generals']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['user_generals']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['user_generals']['Insert']>;
      };
      formations: {
        Row: {
          id: string;
          user_id: string;
          slot: number;
          positions: (string | null)[];
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['formations']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['formations']['Insert']>;
      };
      battles: {
        Row: {
          id: string;
          attacker_id: string;
          defender_id: string;
          winner_id: string | null;
          replay_data: object;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['battles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['battles']['Insert']>;
      };
    };
  };
}
