export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      leads: {
        Row: {
          cidade: string | null
          criado_em: string | null
          data_venda: string | null
          id: string
          nome: string | null
          observacoes: string | null
          perfil: string | null
          qualificado_ia: boolean | null
          responsavel: string
          status_funil: string
          telefone_e164: string
          ultima_interacao_em: string | null
          updated_at: string
          valor_venda: number | null
        }
        Insert: {
          cidade?: string | null
          criado_em?: string | null
          data_venda?: string | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          perfil?: string | null
          qualificado_ia?: boolean | null
          responsavel: string
          status_funil?: string
          telefone_e164: string
          ultima_interacao_em?: string | null
          updated_at?: string
          valor_venda?: number | null
        }
        Update: {
          cidade?: string | null
          criado_em?: string | null
          data_venda?: string | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          perfil?: string | null
          qualificado_ia?: boolean | null
          responsavel?: string
          status_funil?: string
          telefone_e164?: string
          ultima_interacao_em?: string | null
          updated_at?: string
          valor_venda?: number | null
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          created_at: string
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          created_at: string
          data_venda: string
          id: string
          lead_id: string
          observacao: string | null
          registrado_por: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          data_venda?: string
          id?: string
          lead_id: string
          observacao?: string | null
          registrado_por?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          data_venda?: string
          id?: string
          lead_id?: string
          observacao?: string | null
          registrado_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dashboard_funil: {
        Args: { p_from: string; p_to: string }
        Returns: {
          qtd: number
          status_funil: string
        }[]
      }
      dashboard_kpis: {
        Args: { p_from: string; p_to: string }
        Returns: {
          faturamento: number
          qualificados: number
          total: number
          vendidos: number
        }[]
      }
      dashboard_leads_por_dia: {
        Args: { p_from: string; p_to: string }
        Returns: {
          dia: string
          qtd: number
        }[]
      }
      dashboard_vendedoras: {
        Args: { p_from: string; p_to: string }
        Returns: {
          faturamento: number
          leads: number
          qualificados: number
          responsavel: string
          vendas: number
        }[]
      }
      leads_compras_agg: {
        Args: never
        Returns: {
          lead_id: string
          qtd: number
          total: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
