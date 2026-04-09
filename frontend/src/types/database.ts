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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_payment_passwords: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          ai_model: string
          ai_provider: string
          cost_usd: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          operation_type: string
          success: boolean | null
          tokens_input: number | null
          tokens_output: number | null
          user_email: string | null
        }
        Insert: {
          ai_model: string
          ai_provider: string
          cost_usd?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_type: string
          success?: boolean | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_email?: string | null
        }
        Update: {
          ai_model?: string
          ai_provider?: string
          cost_usd?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          success?: boolean | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_email?: string | null
        }
        Relationships: []
      }
      alocacoes_recursos: {
        Row: {
          atividade_id: string
          created_at: string | null
          custo_unitario: number | null
          data_alocacao: string | null
          id: string
          nome_recurso: string
          quantidade: number | null
          tipo_recurso: string
        }
        Insert: {
          atividade_id: string
          created_at?: string | null
          custo_unitario?: number | null
          data_alocacao?: string | null
          id?: string
          nome_recurso: string
          quantidade?: number | null
          tipo_recurso: string
        }
        Update: {
          atividade_id?: string
          created_at?: string | null
          custo_unitario?: number | null
          data_alocacao?: string | null
          id?: string
          nome_recurso?: string
          quantidade?: number | null
          tipo_recurso?: string
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_recursos_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      anftest: {
        Row: {
          content: string | null
          created_at: string
          embedding: Json | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          embedding?: Json | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string
          embedding?: Json | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      asaas_payments_log: {
        Row: {
          asaas_transfer_id: string | null
          bank_account_id: string | null
          codigo_lanca: number
          created_at: string | null
          error_message: string | null
          holder_name: string
          id: string
          pix_key: string
          pix_key_type: string
          response_data: Json | null
          status: string
          user_email: string | null
          user_id: string
          valor: number
        }
        Insert: {
          asaas_transfer_id?: string | null
          bank_account_id?: string | null
          codigo_lanca: number
          created_at?: string | null
          error_message?: string | null
          holder_name: string
          id?: string
          pix_key: string
          pix_key_type: string
          response_data?: Json | null
          status?: string
          user_email?: string | null
          user_id: string
          valor: number
        }
        Update: {
          asaas_transfer_id?: string | null
          bank_account_id?: string | null
          codigo_lanca?: number
          created_at?: string | null
          error_message?: string | null
          holder_name?: string
          id?: string
          pix_key?: string
          pix_key_type?: string
          response_data?: Json | null
          status?: string
          user_email?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_log_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          caminho_critico: boolean | null
          codigo: string
          codigo_itens: number | null
          codigo_orcamento: number | null
          codigo_subitens: string | null
          created_at: string | null
          cronograma_id: string
          custo_estimado: number | null
          custo_real: number | null
          data_fim_real: string | null
          data_inicio_real: string | null
          descricao: string | null
          duracao_esperada: number | null
          duracao_fixa: number | null
          duracao_mais_provavel: number | null
          duracao_otimista: number | null
          duracao_pessimista: number | null
          fim_mais_cedo: number | null
          fim_mais_tarde: number | null
          folga_livre: number | null
          folga_total: number | null
          id: string
          inicio_forcado: number | null
          inicio_mais_cedo: number | null
          inicio_mais_tarde: number | null
          nome: string
          percentual_concluido: number | null
          recursos_necessarios: Json | null
          updated_at: string | null
          variancia: number | null
        }
        Insert: {
          caminho_critico?: boolean | null
          codigo: string
          codigo_itens?: number | null
          codigo_orcamento?: number | null
          codigo_subitens?: string | null
          created_at?: string | null
          cronograma_id: string
          custo_estimado?: number | null
          custo_real?: number | null
          data_fim_real?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          duracao_esperada?: number | null
          duracao_fixa?: number | null
          duracao_mais_provavel?: number | null
          duracao_otimista?: number | null
          duracao_pessimista?: number | null
          fim_mais_cedo?: number | null
          fim_mais_tarde?: number | null
          folga_livre?: number | null
          folga_total?: number | null
          id?: string
          inicio_forcado?: number | null
          inicio_mais_cedo?: number | null
          inicio_mais_tarde?: number | null
          nome: string
          percentual_concluido?: number | null
          recursos_necessarios?: Json | null
          updated_at?: string | null
          variancia?: number | null
        }
        Update: {
          caminho_critico?: boolean | null
          codigo?: string
          codigo_itens?: number | null
          codigo_orcamento?: number | null
          codigo_subitens?: string | null
          created_at?: string | null
          cronograma_id?: string
          custo_estimado?: number | null
          custo_real?: number | null
          data_fim_real?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          duracao_esperada?: number | null
          duracao_fixa?: number | null
          duracao_mais_provavel?: number | null
          duracao_otimista?: number | null
          duracao_pessimista?: number | null
          fim_mais_cedo?: number | null
          fim_mais_tarde?: number | null
          folga_livre?: number | null
          folga_total?: number | null
          id?: string
          inicio_forcado?: number | null
          inicio_mais_cedo?: number | null
          inicio_mais_tarde?: number | null
          nome?: string
          percentual_concluido?: number | null
          recursos_necessarios?: Json | null
          updated_at?: string | null
          variancia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronograma"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          context: string | null
          created_at: string
          id: number
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          context?: string | null
          created_at?: string
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          context?: string | null
          created_at?: string
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_account_passwords: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          password_hash: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          password_hash: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          password_hash?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_account_passwords_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          agencia: string | null
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          banco: string
          conta: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          nonce: string | null
          provider: string | null
          saldo_atual: number | null
          saldo_atualizado_em: string | null
          tipo_conta: string | null
          token_encrypted: string | null
          updated_at: string | null
          webhook_token_encrypted: string | null
        }
        Insert: {
          agencia?: string | null
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          banco: string
          conta?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          nonce?: string | null
          provider?: string | null
          saldo_atual?: number | null
          saldo_atualizado_em?: string | null
          tipo_conta?: string | null
          token_encrypted?: string | null
          updated_at?: string | null
          webhook_token_encrypted?: string | null
        }
        Update: {
          agencia?: string | null
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          banco?: string
          conta?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          nonce?: string | null
          provider?: string | null
          saldo_atual?: number | null
          saldo_atualizado_em?: string | null
          tipo_conta?: string | null
          token_encrypted?: string | null
          updated_at?: string | null
          webhook_token_encrypted?: string | null
        }
        Relationships: []
      }
      bank_balance_history: {
        Row: {
          bank_account_id: string
          created_at: string | null
          data_registro: string
          id: string
          saldo: number
        }
        Insert: {
          bank_account_id: string
          created_at?: string | null
          data_registro?: string
          id?: string
          saldo: number
        }
        Update: {
          bank_account_id?: string
          created_at?: string | null
          data_registro?: string
          id?: string
          saldo?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_balance_history_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          asaas_payment_log_id: string | null
          bank_account_id: string
          categoria: string | null
          conciliado_em: string | null
          conciliado_por: string | null
          created_at: string | null
          data_transacao: string
          descricao: string | null
          external_id: string
          id: string
          lanca_codigo: number | null
          observacoes: string | null
          raw_data: Json | null
          saldo_apos: number | null
          status_conciliacao: string | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          asaas_payment_log_id?: string | null
          bank_account_id: string
          categoria?: string | null
          conciliado_em?: string | null
          conciliado_por?: string | null
          created_at?: string | null
          data_transacao: string
          descricao?: string | null
          external_id: string
          id?: string
          lanca_codigo?: number | null
          observacoes?: string | null
          raw_data?: Json | null
          saldo_apos?: number | null
          status_conciliacao?: string | null
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          asaas_payment_log_id?: string | null
          bank_account_id?: string
          categoria?: string | null
          conciliado_em?: string | null
          conciliado_por?: string | null
          created_at?: string | null
          data_transacao?: string
          descricao?: string | null
          external_id?: string
          id?: string
          lanca_codigo?: number | null
          observacoes?: string | null
          raw_data?: Json | null
          saldo_apos?: number | null
          status_conciliacao?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_asaas_payment_log_id_fkey"
            columns: ["asaas_payment_log_id"]
            isOneToOne: false
            referencedRelation: "asaas_payments_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_rules: {
        Row: {
          app_name: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          min_group_to_edit: number | null
          rule_key: string
          rule_type: string
          rule_value: string
          updated_at: string | null
        }
        Insert: {
          app_name?: string | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          min_group_to_edit?: number | null
          rule_key: string
          rule_type: string
          rule_value: string
          updated_at?: string | null
        }
        Update: {
          app_name?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          min_group_to_edit?: number | null
          rule_key?: string
          rule_type?: string
          rule_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_log: {
        Row: {
          attachments_info: Json | null
          cc: string | null
          channel: string
          content: string
          error_message: string | null
          id: string
          recipient: string
          recipient_name: string | null
          related_record_id: string | null
          related_table: string | null
          resend_id: string | null
          sent_at: string | null
          subject: string | null
          success: boolean | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          attachments_info?: Json | null
          cc?: string | null
          channel: string
          content: string
          error_message?: string | null
          id?: string
          recipient: string
          recipient_name?: string | null
          related_record_id?: string | null
          related_table?: string | null
          resend_id?: string | null
          sent_at?: string | null
          subject?: string | null
          success?: boolean | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          attachments_info?: Json | null
          cc?: string | null
          channel?: string
          content?: string
          error_message?: string | null
          id?: string
          recipient?: string
          recipient_name?: string | null
          related_record_id?: string | null
          related_table?: string | null
          resend_id?: string | null
          sent_at?: string | null
          subject?: string | null
          success?: boolean | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contitem: {
        Row: {
          codigo_itens: number | null
          codigo_orcamento: number | null
          codigo_subitens: string | null
          data_real: string | null
          descricao: string | null
          descricao_nova: string | null
          HORA_REAL: string | null
          id_contrato: number
          item_contrato: number
          qtde_prevista: number | null
          status: string | null
          unidade: string | null
          updated_at: string | null
          usuarios: number | null
          valor: number | null
          valor_unitario: number | null
        }
        Insert: {
          codigo_itens?: number | null
          codigo_orcamento?: number | null
          codigo_subitens?: string | null
          data_real?: string | null
          descricao?: string | null
          descricao_nova?: string | null
          HORA_REAL?: string | null
          id_contrato?: number
          item_contrato: number
          qtde_prevista?: number | null
          status?: string | null
          unidade?: string | null
          updated_at?: string | null
          usuarios?: number | null
          valor?: number | null
          valor_unitario?: number | null
        }
        Update: {
          codigo_itens?: number | null
          codigo_orcamento?: number | null
          codigo_subitens?: string | null
          data_real?: string | null
          descricao?: string | null
          descricao_nova?: string | null
          HORA_REAL?: string | null
          id_contrato?: number
          item_contrato?: number
          qtde_prevista?: number | null
          status?: string | null
          unidade?: string | null
          updated_at?: string | null
          usuarios?: number | null
          valor?: number | null
          valor_unitario?: number | null
        }
        Relationships: []
      }
      contrato: {
        Row: {
          codigo_obra: string | null
          contato: string | null
          contmed_contrato: number | null
          data_entrega: string | null
          desconto: number | null
          descricao: string | null
          dt_contrato: string | null
          email: string | null
          end_cobranca: string | null
          endereco_entrega: string | null
          faturamento: string | null
          fax: string | null
          fone: string | null
          forma_pagamento: string | null
          frete: number | null
          id_contrato: number
          id_cotacao: number | null
          id_fornece: number | null
          id_requisicao: number | null
          imposto: number | null
          indice_reajuste: string | null
          memo_contrato: string | null
          status: number | null
          subtotal: number | null
          tipo: string | null
          updated_at: string | null
          valor_total: number | null
          whatsapp: string | null
        }
        Insert: {
          codigo_obra?: string | null
          contato?: string | null
          contmed_contrato?: number | null
          data_entrega?: string | null
          desconto?: number | null
          descricao?: string | null
          dt_contrato?: string | null
          email?: string | null
          end_cobranca?: string | null
          endereco_entrega?: string | null
          faturamento?: string | null
          fax?: string | null
          fone?: string | null
          forma_pagamento?: string | null
          frete?: number | null
          id_contrato?: number
          id_cotacao?: number | null
          id_fornece?: number | null
          id_requisicao?: number | null
          imposto?: number | null
          indice_reajuste?: string | null
          memo_contrato?: string | null
          status?: number | null
          subtotal?: number | null
          tipo?: string | null
          updated_at?: string | null
          valor_total?: number | null
          whatsapp?: string | null
        }
        Update: {
          codigo_obra?: string | null
          contato?: string | null
          contmed_contrato?: number | null
          data_entrega?: string | null
          desconto?: number | null
          descricao?: string | null
          dt_contrato?: string | null
          email?: string | null
          end_cobranca?: string | null
          endereco_entrega?: string | null
          faturamento?: string | null
          fax?: string | null
          fone?: string | null
          forma_pagamento?: string | null
          frete?: number | null
          id_contrato?: number
          id_cotacao?: number | null
          id_fornece?: number | null
          id_requisicao?: number | null
          imposto?: number | null
          indice_reajuste?: string | null
          memo_contrato?: string | null
          status?: number | null
          subtotal?: number | null
          tipo?: string | null
          updated_at?: string | null
          valor_total?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      contrato_doc: {
        Row: {
          codigo_doc: number
          data: string | null
          documento: string | null
          id_contrato: number | null
          login: string | null
          nome_arquivo: string | null
          storage_path: string | null
          tamanho: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_doc?: number
          data?: string | null
          documento?: string | null
          id_contrato?: number | null
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_doc?: number
          data?: string | null
          documento?: string | null
          id_contrato?: number | null
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contrato_status: {
        Row: {
          descricao: string | null
          status_id: number
          updated_at: string | null
        }
        Insert: {
          descricao?: string | null
          status_id: number
          updated_at?: string | null
        }
        Update: {
          descricao?: string | null
          status_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cotacao: {
        Row: {
          codigo_obra: string | null
          created_at: string | null
          data_cotacao: string | null
          data_entrega: string | null
          descricao: string | null
          id_cotacao: number
          id_fornecedor_vencedor: number | null
          id_requisicao: number | null
          id_requisicao_jarvis: number | null
          monitorar_jarvis: boolean | null
          observacoes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_obra?: string | null
          created_at?: string | null
          data_cotacao?: string | null
          data_entrega?: string | null
          descricao?: string | null
          id_cotacao?: number
          id_fornecedor_vencedor?: number | null
          id_requisicao?: number | null
          id_requisicao_jarvis?: number | null
          monitorar_jarvis?: boolean | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_obra?: string | null
          created_at?: string | null
          data_cotacao?: string | null
          data_entrega?: string | null
          descricao?: string | null
          id_cotacao?: number
          id_fornecedor_vencedor?: number | null
          id_requisicao?: number | null
          id_requisicao_jarvis?: number | null
          monitorar_jarvis?: boolean | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_id_requisicao_jarvis_fkey"
            columns: ["id_requisicao_jarvis"]
            isOneToOne: false
            referencedRelation: "requisicao"
            referencedColumns: ["id_requisicao"]
          },
        ]
      }
      cotacao_approval_tokens: {
        Row: {
          action_taken: string | null
          approved_by: string | null
          approved_by_ip: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          id_cotacao: number
          sent_by: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          action_taken?: string | null
          approved_by?: string | null
          approved_by_ip?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          id_cotacao: number
          sent_by?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          action_taken?: string | null
          approved_by?: string | null
          approved_by_ip?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          id_cotacao?: number
          sent_by?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cotacao"
            columns: ["id_cotacao"]
            isOneToOne: false
            referencedRelation: "cotacao"
            referencedColumns: ["id_cotacao"]
          },
        ]
      }
      cotacao_doc: {
        Row: {
          codigo_doc: number
          content_hash: string | null
          created_at: string | null
          data: string | null
          documento: string | null
          id_cotacao: number
          login: string | null
          nome_arquivo: string | null
          storage_path: string | null
          tamanho: string | null
          tipo_documento: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_doc?: number
          content_hash?: string | null
          created_at?: string | null
          data?: string | null
          documento?: string | null
          id_cotacao: number
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_doc?: number
          content_hash?: string | null
          created_at?: string | null
          data?: string | null
          documento?: string | null
          id_cotacao?: number
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cotacao_fornecedor: {
        Row: {
          condicao_pagamento: string | null
          contato: string | null
          created_at: string | null
          desconto_necessario: number | null
          desconto_negociado: number | null
          email: string | null
          id_cotacao: number
          id_cotacao_fornecedor: number
          id_fornece: number | null
          numero_fornecedor: number
          obs: string | null
          prazo_entrega: string | null
          razao_social: string | null
          telefone: string | null
          valor_bruto: number | null
          valor_frete: number | null
          valor_imposto: number | null
          valor_total: number | null
        }
        Insert: {
          condicao_pagamento?: string | null
          contato?: string | null
          created_at?: string | null
          desconto_necessario?: number | null
          desconto_negociado?: number | null
          email?: string | null
          id_cotacao: number
          id_cotacao_fornecedor?: number
          id_fornece?: number | null
          numero_fornecedor: number
          obs?: string | null
          prazo_entrega?: string | null
          razao_social?: string | null
          telefone?: string | null
          valor_bruto?: number | null
          valor_frete?: number | null
          valor_imposto?: number | null
          valor_total?: number | null
        }
        Update: {
          condicao_pagamento?: string | null
          contato?: string | null
          created_at?: string | null
          desconto_necessario?: number | null
          desconto_negociado?: number | null
          email?: string | null
          id_cotacao?: number
          id_cotacao_fornecedor?: number
          id_fornece?: number | null
          numero_fornecedor?: number
          obs?: string | null
          prazo_entrega?: string | null
          razao_social?: string | null
          telefone?: string | null
          valor_bruto?: number | null
          valor_frete?: number | null
          valor_imposto?: number | null
          valor_total?: number | null
        }
        Relationships: []
      }
      cotacao_item_fornecedor: {
        Row: {
          created_at: string | null
          id_cotacao_fornecedor: number
          id_cotacao_item_fornecedor: number
          id_cotacao_produto: number
          preco_unitario: number | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string | null
          id_cotacao_fornecedor: number
          id_cotacao_item_fornecedor?: number
          id_cotacao_produto: number
          preco_unitario?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string | null
          id_cotacao_fornecedor?: number
          id_cotacao_item_fornecedor?: number
          id_cotacao_produto?: number
          preco_unitario?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      cotacao_produto: {
        Row: {
          created_at: string | null
          descricao: string | null
          id_cotacao: number
          id_cotacao_produto: number
          melhor_valor: number | null
          numero_item: number
          quantidade: number | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id_cotacao: number
          id_cotacao_produto?: number
          melhor_valor?: number | null
          numero_item: number
          quantidade?: number | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id_cotacao?: number
          id_cotacao_produto?: number
          melhor_valor?: number | null
          numero_item?: number
          quantidade?: number | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cronograma: {
        Row: {
          codigo_obra: string
          created_at: string | null
          created_by: string | null
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio: string | null
          descricao: string | null
          duracao_total_dias: number | null
          id: string
          nome: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_obra: string
          created_at?: string | null
          created_by?: string | null
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio?: string | null
          descricao?: string | null
          duracao_total_dias?: number | null
          id?: string
          nome: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_obra?: string
          created_at?: string | null
          created_by?: string | null
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio?: string | null
          descricao?: string | null
          duracao_total_dias?: number | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cronograma_financeiro: {
        Row: {
          codigo_obra: string
          created_at: string | null
          cronograma_id: string
          id: string
          nome: string
          percentual_sinal: number
          percentual_termino: number
          prazo_medio_pagamento_dias: number
          status: string
          updated_at: string | null
        }
        Insert: {
          codigo_obra: string
          created_at?: string | null
          cronograma_id: string
          id?: string
          nome: string
          percentual_sinal?: number
          percentual_termino?: number
          prazo_medio_pagamento_dias?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          codigo_obra?: string
          created_at?: string | null
          cronograma_id?: string
          id?: string
          nome?: string
          percentual_sinal?: number
          percentual_termino?: number
          prazo_medio_pagamento_dias?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_financeiro_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronograma"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          function_name: string | null
          id: number
          input_data: Json | null
          result_count: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          function_name?: string | null
          id?: number
          input_data?: Json | null
          result_count?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          function_name?: string | null
          id?: number
          input_data?: Json | null
          result_count?: number | null
        }
        Relationships: []
      }
      dependencias_atividades: {
        Row: {
          created_at: string | null
          id: string
          lag_time: number | null
          predecessora_id: string
          sucessora_id: string
          tipo_dependencia: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lag_time?: number | null
          predecessora_id: string
          sucessora_id: string
          tipo_dependencia?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lag_time?: number | null
          predecessora_id?: string
          sucessora_id?: string
          tipo_dependencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependencias_atividades_predecessora_id_fkey"
            columns: ["predecessora_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencias_atividades_sucessora_id_fkey"
            columns: ["sucessora_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      despesa_categoria: {
        Row: {
          arquivada: boolean | null
          cor: string | null
          created_at: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          arquivada?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          arquivada?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      despesa_icone: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          id: string
          lucide_name: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          lucide_name: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          lucide_name?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      despesa_subcategoria: {
        Row: {
          ativo: boolean | null
          categoria_id: string
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_id: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "despesa_subcategoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "despesa_categoria"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      edge_function_usage_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          success: boolean | null
          user_email: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          success?: boolean | null
          user_email?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          success?: boolean | null
          user_email?: string | null
        }
        Relationships: []
      }
      email_attachments: {
        Row: {
          created_at: string | null
          detected_type: string | null
          email_id: string
          extracted_data: Json | null
          extraction_status: string | null
          filename: string
          gmail_attachment_id: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          detected_type?: string | null
          email_id: string
          extracted_data?: Json | null
          extraction_status?: string | null
          filename: string
          gmail_attachment_id: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          detected_type?: string | null
          email_id?: string
          extracted_data?: Json | null
          extraction_status?: string | null
          filename?: string
          gmail_attachment_id?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_document_scan: {
        Row: {
          attachment_id: string
          document_type: string
          email_from: string | null
          email_received_at: string | null
          email_subject: string | null
          extracted_data: Json | null
          filename: string
          gmail_message_id: string
          gmail_thread_id: string
          id: string
          match_confidence: string | null
          match_status: string
          matched_lanca_id: number | null
          mime_type: string | null
          scan_error: string | null
          scanned_at: string | null
          user_email: string
        }
        Insert: {
          attachment_id: string
          document_type: string
          email_from?: string | null
          email_received_at?: string | null
          email_subject?: string | null
          extracted_data?: Json | null
          filename: string
          gmail_message_id: string
          gmail_thread_id: string
          id?: string
          match_confidence?: string | null
          match_status?: string
          matched_lanca_id?: number | null
          mime_type?: string | null
          scan_error?: string | null
          scanned_at?: string | null
          user_email: string
        }
        Update: {
          attachment_id?: string
          document_type?: string
          email_from?: string | null
          email_received_at?: string | null
          email_subject?: string | null
          extracted_data?: Json | null
          filename?: string
          gmail_message_id?: string
          gmail_thread_id?: string
          id?: string
          match_confidence?: string | null
          match_status?: string
          matched_lanca_id?: number | null
          mime_type?: string | null
          scan_error?: string | null
          scanned_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      email_lanca_links: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_id: string
          created_at: string | null
          id: string
          lanca_id: number | null
          link_type: string
          match_confidence: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_id: string
          created_at?: string | null
          id?: string
          lanca_id?: number | null
          link_type: string
          match_confidence?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_id?: string
          created_at?: string | null
          id?: string
          lanca_id?: number | null
          link_type?: string
          match_confidence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_lanca_links_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "email_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_lanca_links_lanca_id_fkey"
            columns: ["lanca_id"]
            isOneToOne: false
            referencedRelation: "lanca"
            referencedColumns: ["codigo_lanca"]
          },
        ]
      }
      email_messages: {
        Row: {
          created_at: string | null
          from_email: string | null
          from_name: string | null
          gmail_message_id: string
          has_attachments: boolean | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          label_ids: string[] | null
          processed_for_nf_boleto: boolean | null
          received_at: string | null
          snippet: string | null
          subject: string | null
          thread_id: string | null
          to_emails: string[] | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          gmail_message_id: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          label_ids?: string[] | null
          processed_for_nf_boleto?: boolean | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_emails?: string[] | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          gmail_message_id?: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          label_ids?: string[] | null
          processed_for_nf_boleto?: boolean | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_emails?: string[] | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      email_monitor_state: {
        Row: {
          channel: string
          created_at: string | null
          id: number
          is_running: boolean | null
          last_error: string | null
          last_run_actions: Json | null
          last_run_at: string | null
          last_run_emails_found: number | null
          processed_ids: Json | null
          updated_at: string | null
          watermark: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          id?: number
          is_running?: boolean | null
          last_error?: string | null
          last_run_actions?: Json | null
          last_run_at?: string | null
          last_run_emails_found?: number | null
          processed_ids?: Json | null
          updated_at?: string | null
          watermark?: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: number
          is_running?: boolean | null
          last_error?: string | null
          last_run_actions?: Json | null
          last_run_at?: string | null
          last_run_emails_found?: number | null
          processed_ids?: Json | null
          updated_at?: string | null
          watermark?: string
        }
        Relationships: []
      }
      email_snoozes: {
        Row: {
          created_at: string | null
          gmail_message_id: string
          id: string
          original_label_ids: string[] | null
          snoozed_until: string
          user_email: string
        }
        Insert: {
          created_at?: string | null
          gmail_message_id: string
          id?: string
          original_label_ids?: string[] | null
          snoozed_until: string
          user_email: string
        }
        Update: {
          created_at?: string | null
          gmail_message_id?: string
          id?: string
          original_label_ids?: string[] | null
          snoozed_until?: string
          user_email?: string
        }
        Relationships: []
      }
      exec_sql_audit: {
        Row: {
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          execution_time_ms: number | null
          id: string
          sql_command: string
          success: boolean
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          sql_command: string
          success: boolean
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          sql_command?: string
          success?: boolean
        }
        Relationships: []
      }
      extrato_cabecalho: {
        Row: {
          banco_detectado: string | null
          codigo_obra: string
          created_at: string | null
          criado_por: string | null
          enviado_em: string | null
          id: string
          nome_arquivo: string | null
          periodo: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          banco_detectado?: string | null
          codigo_obra: string
          created_at?: string | null
          criado_por?: string | null
          enviado_em?: string | null
          id?: string
          nome_arquivo?: string | null
          periodo: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          banco_detectado?: string | null
          codigo_obra?: string
          created_at?: string | null
          criado_por?: string | null
          enviado_em?: string | null
          id?: string
          nome_arquivo?: string | null
          periodo?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      extrato_linha: {
        Row: {
          codigo_fornecedor: number | null
          codigo_lanca: number | null
          created_at: string | null
          data_lancamento: string | null
          descricao: string | null
          extrato_id: string
          fornecedor_nome: string | null
          id: string
          incluir: boolean | null
          numero: number
          numero_documento: string | null
          observacao: string | null
          status_match: string | null
          tipo: string | null
          valor: number
        }
        Insert: {
          codigo_fornecedor?: number | null
          codigo_lanca?: number | null
          created_at?: string | null
          data_lancamento?: string | null
          descricao?: string | null
          extrato_id: string
          fornecedor_nome?: string | null
          id?: string
          incluir?: boolean | null
          numero: number
          numero_documento?: string | null
          observacao?: string | null
          status_match?: string | null
          tipo?: string | null
          valor?: number
        }
        Update: {
          codigo_fornecedor?: number | null
          codigo_lanca?: number | null
          created_at?: string | null
          data_lancamento?: string | null
          descricao?: string | null
          extrato_id?: string
          fornecedor_nome?: string | null
          id?: string
          incluir?: boolean | null
          numero?: number
          numero_documento?: string | null
          observacao?: string | null
          status_match?: string | null
          tipo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_linha_extrato_id_fkey"
            columns: ["extrato_id"]
            isOneToOne: false
            referencedRelation: "extrato_cabecalho"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor: {
        Row: {
          agencia: string | null
          atividade: string | null
          bairro: string | null
          banco: string | null
          bot_funcao: string | null
          bot_obra_padrao: string | null
          bot_obras_autorizadas: string[] | null
          bot_requisicao_autorizado: boolean | null
          cargo: string | null
          ccm: string | null
          cep: string | null
          cgccic: string | null
          cidade: string | null
          complemento: string | null
          conta: string | null
          contato: string | null
          cpf: string | null
          created_at: string | null
          depositarpara: string | null
          email: string | null
          embedding: string | null
          endereco: string | null
          estado: string | null
          fisicajuridica: string | null
          id_fornece: number
          inscricaoestadual: string | null
          nomefantasia: string | null
          numero: string | null
          obs: string | null
          pix: string | null
          razaosocial: string | null
          rg: string | null
          site: string | null
          telefone: string | null
          tipo_pix: number | null
          tipoempresa: string | null
          updated_at: string | null
          usuarios: number | null
          whatsapp: string | null
          whatsapp_lid: string | null
          whatsapp_lid_updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          atividade?: string | null
          bairro?: string | null
          banco?: string | null
          bot_funcao?: string | null
          bot_obra_padrao?: string | null
          bot_obras_autorizadas?: string[] | null
          bot_requisicao_autorizado?: boolean | null
          cargo?: string | null
          ccm?: string | null
          cep?: string | null
          cgccic?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string | null
          depositarpara?: string | null
          email?: string | null
          embedding?: string | null
          endereco?: string | null
          estado?: string | null
          fisicajuridica?: string | null
          id_fornece?: number
          inscricaoestadual?: string | null
          nomefantasia?: string | null
          numero?: string | null
          obs?: string | null
          pix?: string | null
          razaosocial?: string | null
          rg?: string | null
          site?: string | null
          telefone?: string | null
          tipo_pix?: number | null
          tipoempresa?: string | null
          updated_at?: string | null
          usuarios?: number | null
          whatsapp?: string | null
          whatsapp_lid?: string | null
          whatsapp_lid_updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          atividade?: string | null
          bairro?: string | null
          banco?: string | null
          bot_funcao?: string | null
          bot_obra_padrao?: string | null
          bot_obras_autorizadas?: string[] | null
          bot_requisicao_autorizado?: boolean | null
          cargo?: string | null
          ccm?: string | null
          cep?: string | null
          cgccic?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string | null
          depositarpara?: string | null
          email?: string | null
          embedding?: string | null
          endereco?: string | null
          estado?: string | null
          fisicajuridica?: string | null
          id_fornece?: number
          inscricaoestadual?: string | null
          nomefantasia?: string | null
          numero?: string | null
          obs?: string | null
          pix?: string | null
          razaosocial?: string | null
          rg?: string | null
          site?: string | null
          telefone?: string | null
          tipo_pix?: number | null
          tipoempresa?: string | null
          updated_at?: string | null
          usuarios?: number | null
          whatsapp?: string | null
          whatsapp_lid?: string | null
          whatsapp_lid_updated_at?: string | null
        }
        Relationships: []
      }
      fornecedor_produtos: {
        Row: {
          created_at: string | null
          id: string
          id_fornece: number
          produto_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_fornece: number
          produto_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          id_fornece?: number
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_conhecimento"
            referencedColumns: ["id"]
          },
        ]
      }
      help_business_rules: {
        Row: {
          active: boolean | null
          admin_only: boolean | null
          app_code: string
          applies_to: string | null
          description: string | null
          error_message: string | null
          id: number
          rule_code: string
          title: string
        }
        Insert: {
          active?: boolean | null
          admin_only?: boolean | null
          app_code: string
          applies_to?: string | null
          description?: string | null
          error_message?: string | null
          id?: number
          rule_code: string
          title: string
        }
        Update: {
          active?: boolean | null
          admin_only?: boolean | null
          app_code?: string
          applies_to?: string | null
          description?: string | null
          error_message?: string | null
          id?: number
          rule_code?: string
          title?: string
        }
        Relationships: []
      }
      help_contexts: {
        Row: {
          active: boolean | null
          app_code: string
          content: string | null
          content_type: string | null
          context_key: string
          created_at: string | null
          display_type: string | null
          id: number
          order_index: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          app_code: string
          content?: string | null
          content_type?: string | null
          context_key: string
          created_at?: string | null
          display_type?: string | null
          id?: number
          order_index?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          app_code?: string
          content?: string | null
          content_type?: string | null
          context_key?: string
          created_at?: string | null
          display_type?: string | null
          id?: number
          order_index?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      help_fields: {
        Row: {
          active: boolean | null
          description: string | null
          examples: string[] | null
          field_name: string
          help_context_id: number | null
          id: number
          label: string | null
          related_fields: string[] | null
          required: boolean | null
          tips: string[] | null
          validation_rules: Json | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          examples?: string[] | null
          field_name: string
          help_context_id?: number | null
          id?: number
          label?: string | null
          related_fields?: string[] | null
          required?: boolean | null
          tips?: string[] | null
          validation_rules?: Json | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          examples?: string[] | null
          field_name?: string
          help_context_id?: number | null
          id?: number
          label?: string | null
          related_fields?: string[] | null
          required?: boolean | null
          tips?: string[] | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "help_fields_help_context_id_fkey"
            columns: ["help_context_id"]
            isOneToOne: false
            referencedRelation: "help_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      help_visibility: {
        Row: {
          group_id: number
          help_context_id: number | null
          id: number
          visible: boolean | null
        }
        Insert: {
          group_id: number
          help_context_id?: number | null
          id?: number
          visible?: boolean | null
        }
        Update: {
          group_id?: number
          help_context_id?: number | null
          id?: number
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "help_visibility_help_context_id_fkey"
            columns: ["help_context_id"]
            isOneToOne: false
            referencedRelation: "help_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      indice_valores: {
        Row: {
          codigo_indice: number
          created_at: string | null
          data: string
          id: number
          updated_at: string | null
          valor: number
        }
        Insert: {
          codigo_indice: number
          created_at?: string | null
          data: string
          id?: number
          updated_at?: string | null
          valor: number
        }
        Update: {
          codigo_indice?: number
          created_at?: string | null
          data?: string
          id?: number
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "indice_valores_codigo_indice_fkey"
            columns: ["codigo_indice"]
            isOneToOne: false
            referencedRelation: "indices"
            referencedColumns: ["codigo_indice"]
          },
        ]
      }
      indices: {
        Row: {
          codigo_indice: number
          created_at: string | null
          descricao: string
          descricao_detalhada: string | null
          periodicidade: string | null
        }
        Insert: {
          codigo_indice?: number
          created_at?: string | null
          descricao: string
          descricao_detalhada?: string | null
          periodicidade?: string | null
        }
        Update: {
          codigo_indice?: number
          created_at?: string | null
          descricao?: string
          descricao_detalhada?: string | null
          periodicidade?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          cnpj: string | null
          created_at: string
          data_emissao: string | null
          data_vencimento: string | null
          file_name: string
          file_size: number | null
          historico: string | null
          id: string
          numero_nota: string | null
          processed_at: string | null
          raw_data: Json | null
          razao_social: string | null
          tipo_documento: string | null
          user_id: string | null
          valor_total: number | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          file_name: string
          file_size?: number | null
          historico?: string | null
          id?: string
          numero_nota?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          tipo_documento?: string | null
          user_id?: string | null
          valor_total?: number | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          file_name?: string
          file_size?: number | null
          historico?: string | null
          id?: string
          numero_nota?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          tipo_documento?: string | null
          user_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      jarvis_activity: {
        Row: {
          details: Json | null
          id: string
          model: string | null
          session_id: string | null
          summary: string
          tokens_in: number | null
          tokens_out: number | null
          ts: string | null
          type: string
        }
        Insert: {
          details?: Json | null
          id?: string
          model?: string | null
          session_id?: string | null
          summary: string
          tokens_in?: number | null
          tokens_out?: number | null
          ts?: string | null
          type: string
        }
        Update: {
          details?: Json | null
          id?: string
          model?: string | null
          session_id?: string | null
          summary?: string
          tokens_in?: number | null
          tokens_out?: number | null
          ts?: string | null
          type?: string
        }
        Relationships: []
      }
      jarvis_crons: {
        Row: {
          enabled: boolean | null
          id: string
          last_run: string | null
          last_status: string | null
          model: string | null
          name: string | null
          next_run: string | null
          schedule: string | null
          updated_at: string | null
        }
        Insert: {
          enabled?: boolean | null
          id: string
          last_run?: string | null
          last_status?: string | null
          model?: string | null
          name?: string | null
          next_run?: string | null
          schedule?: string | null
          updated_at?: string | null
        }
        Update: {
          enabled?: boolean | null
          id?: string
          last_run?: string | null
          last_status?: string | null
          model?: string | null
          name?: string | null
          next_run?: string | null
          schedule?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jarvis_despesas: {
        Row: {
          categoria_id: string
          centro_custo: string
          classificacao_status: string
          comprovante_tipo: string | null
          comprovante_url: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          meio_pagamento_id: string
          notas: string | null
          parcela_atual: number | null
          parcela_total: number | null
          subcategoria_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id: string
          centro_custo: string
          classificacao_status?: string
          comprovante_tipo?: string | null
          comprovante_url?: string | null
          created_at?: string
          data: string
          descricao: string
          id?: string
          meio_pagamento_id: string
          notas?: string | null
          parcela_atual?: number | null
          parcela_total?: number | null
          subcategoria_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string
          centro_custo?: string
          classificacao_status?: string
          comprovante_tipo?: string | null
          comprovante_url?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          meio_pagamento_id?: string
          notas?: string | null
          parcela_atual?: number | null
          parcela_total?: number | null
          subcategoria_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "jarvis_despesas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "despesa_categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jarvis_despesas_centro_custo_fkey"
            columns: ["centro_custo"]
            isOneToOne: false
            referencedRelation: "obracada"
            referencedColumns: ["codigo_obra"]
          },
          {
            foreignKeyName: "jarvis_despesas_meio_pagamento_id_fkey"
            columns: ["meio_pagamento_id"]
            isOneToOne: false
            referencedRelation: "jarvis_meios_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jarvis_despesas_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "despesa_subcategoria"
            referencedColumns: ["id"]
          },
        ]
      }
      jarvis_gcal_events: {
        Row: {
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          start_time: string | null
          summary: string | null
          synced_at: string | null
        }
        Insert: {
          description?: string | null
          end_time?: string | null
          id: string
          location?: string | null
          start_time?: string | null
          summary?: string | null
          synced_at?: string | null
        }
        Update: {
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          start_time?: string | null
          summary?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      jarvis_meios_pagamento: {
        Row: {
          ativo: boolean
          bandeira: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
          tipo: string
          ultimos_digitos: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bandeira?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          tipo: string
          ultimos_digitos?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bandeira?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          ultimos_digitos?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jarvis_memories: {
        Row: {
          content: string
          id: string
          path: string
          updated_at: string | null
        }
        Insert: {
          content: string
          id?: string
          path: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          id?: string
          path?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jarvis_task_tags: {
        Row: {
          tag: string
          task_id: string
        }
        Insert: {
          tag: string
          task_id: string
        }
        Update: {
          tag?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jarvis_task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "jarvis_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      jarvis_tasks: {
        Row: {
          assignee: string | null
          completed_at: string | null
          context: Json | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          parent_id: string | null
          position: number | null
          priority: string
          source: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_id?: string | null
          position?: number | null
          priority?: string
          source?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_id?: string | null
          position?: number | null
          priority?: string
          source?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jarvis_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "jarvis_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      lanca: {
        Row: {
          administracao: number | null
          agencia: string | null
          agenciacheque: string | null
          banco: string | null
          bancocheque: string | null
          bank_account_id: string | null
          boleto_enviado: string | null
          codigo_fornecedor: number | null
          codigo_lanca: number
          codigo_obra: string | null
          codigo_orcamento: number | null
          conta: string | null
          created_at: string | null
          data_emissao: string | null
          data_envio_boleto: string | null
          data_envio_email: string | null
          data_lancamento: string | null
          data_real: string | null
          data_sugerida: string | null
          data_vencimento: string | null
          debito_credito: string | null
          depositarpara: string | null
          descricao_retencao_imposto: string | null
          doc: string | null
          enviado: string | null
          historico: string | null
          hora_real: string | null
          id_contrato: number | null
          id_medicao: number | null
          local_pagamento: string | null
          numero_cotacao: number | null
          numero_documento: string | null
          numerocheque: string | null
          obs_data_sugerida: string | null
          observacaobanco: string | null
          pedido: number | null
          protocolo_boleto: number | null
          quem_paga: string | null
          relacao: number | null
          status: number | null
          tipo_documento: string | null
          tipo_lancamento: string | null
          tipo_obra: string | null
          updated_at: string | null
          usuarios: number | null
          valor: number | null
          valor_adm: number | null
          valor_liquido: number | null
          valor_retencao_imposto: number | null
        }
        Insert: {
          administracao?: number | null
          agencia?: string | null
          agenciacheque?: string | null
          banco?: string | null
          bancocheque?: string | null
          bank_account_id?: string | null
          boleto_enviado?: string | null
          codigo_fornecedor?: number | null
          codigo_lanca?: number
          codigo_obra?: string | null
          codigo_orcamento?: number | null
          conta?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_envio_boleto?: string | null
          data_envio_email?: string | null
          data_lancamento?: string | null
          data_real?: string | null
          data_sugerida?: string | null
          data_vencimento?: string | null
          debito_credito?: string | null
          depositarpara?: string | null
          descricao_retencao_imposto?: string | null
          doc?: string | null
          enviado?: string | null
          historico?: string | null
          hora_real?: string | null
          id_contrato?: number | null
          id_medicao?: number | null
          local_pagamento?: string | null
          numero_cotacao?: number | null
          numero_documento?: string | null
          numerocheque?: string | null
          obs_data_sugerida?: string | null
          observacaobanco?: string | null
          pedido?: number | null
          protocolo_boleto?: number | null
          quem_paga?: string | null
          relacao?: number | null
          status?: number | null
          tipo_documento?: string | null
          tipo_lancamento?: string | null
          tipo_obra?: string | null
          updated_at?: string | null
          usuarios?: number | null
          valor?: number | null
          valor_adm?: number | null
          valor_liquido?: number | null
          valor_retencao_imposto?: number | null
        }
        Update: {
          administracao?: number | null
          agencia?: string | null
          agenciacheque?: string | null
          banco?: string | null
          bancocheque?: string | null
          bank_account_id?: string | null
          boleto_enviado?: string | null
          codigo_fornecedor?: number | null
          codigo_lanca?: number
          codigo_obra?: string | null
          codigo_orcamento?: number | null
          conta?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_envio_boleto?: string | null
          data_envio_email?: string | null
          data_lancamento?: string | null
          data_real?: string | null
          data_sugerida?: string | null
          data_vencimento?: string | null
          debito_credito?: string | null
          depositarpara?: string | null
          descricao_retencao_imposto?: string | null
          doc?: string | null
          enviado?: string | null
          historico?: string | null
          hora_real?: string | null
          id_contrato?: number | null
          id_medicao?: number | null
          local_pagamento?: string | null
          numero_cotacao?: number | null
          numero_documento?: string | null
          numerocheque?: string | null
          obs_data_sugerida?: string | null
          observacaobanco?: string | null
          pedido?: number | null
          protocolo_boleto?: number | null
          quem_paga?: string | null
          relacao?: number | null
          status?: number | null
          tipo_documento?: string | null
          tipo_lancamento?: string | null
          tipo_obra?: string | null
          updated_at?: string | null
          usuarios?: number | null
          valor?: number | null
          valor_adm?: number | null
          valor_liquido?: number | null
          valor_retencao_imposto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lanca_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lanca_despesa_categoria: {
        Row: {
          categoria_id: string
          codigo_lanca: number
          created_at: string | null
          id: string
          subcategoria_id: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          categoria_id: string
          codigo_lanca: number
          created_at?: string | null
          id?: string
          subcategoria_id?: string | null
          updated_at?: string | null
          valor?: number
        }
        Update: {
          categoria_id?: string
          codigo_lanca?: number
          created_at?: string | null
          id?: string
          subcategoria_id?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lanca_despesa_categoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "despesa_categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lanca_despesa_categoria_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "despesa_subcategoria"
            referencedColumns: ["id"]
          },
        ]
      }
      lanca_doc_new: {
        Row: {
          codigo_doc: number
          codigo_lanca: number
          created_at: string | null
          data: string | null
          documento: string | null
          login: string | null
          nome_arquivo: string | null
          storage_path: string | null
          tamanho: string | null
          tipo_documento: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_doc?: number
          codigo_lanca: number
          created_at?: string | null
          data?: string | null
          documento?: string | null
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_doc?: number
          codigo_lanca?: number
          created_at?: string | null
          data?: string | null
          documento?: string | null
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lanca_orcamento: {
        Row: {
          codigo_itens: number | null
          codigo_lanca: number | null
          codigo_lanca_orcamento: number
          codigo_orcamento: number | null
          codigo_subitens: number | null
          created_at: string | null
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          codigo_itens?: number | null
          codigo_lanca?: number | null
          codigo_lanca_orcamento?: number
          codigo_orcamento?: number | null
          codigo_subitens?: number | null
          created_at?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          codigo_itens?: number | null
          codigo_lanca?: number | null
          codigo_lanca_orcamento?: number
          codigo_orcamento?: number | null
          codigo_subitens?: number | null
          created_at?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      legacy_user_mapping: {
        Row: {
          legacy_login: string
          migrated_at: string | null
          supabase_user_id: string
        }
        Insert: {
          legacy_login: string
          migrated_at?: string | null
          supabase_user_id: string
        }
        Update: {
          legacy_login?: string
          migrated_at?: string | null
          supabase_user_id?: string
        }
        Relationships: []
      }
      manual_pages: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_published: boolean | null
          module: string
          order_index: number | null
          requires_admin: boolean | null
          slug: string
          summary: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          module: string
          order_index?: number | null
          requires_admin?: boolean | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          module?: string
          order_index?: number | null
          requires_admin?: boolean | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      marcos: {
        Row: {
          atingido: boolean | null
          atividade_id: string | null
          created_at: string | null
          cronograma_id: string
          data_prevista: string | null
          data_real: string | null
          id: string
          nome: string
        }
        Insert: {
          atingido?: boolean | null
          atividade_id?: string | null
          created_at?: string | null
          cronograma_id: string
          data_prevista?: string | null
          data_real?: string | null
          id?: string
          nome: string
        }
        Update: {
          atingido?: boolean | null
          atividade_id?: string | null
          created_at?: string | null
          cronograma_id?: string
          data_prevista?: string | null
          data_real?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcos_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcos_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronograma"
            referencedColumns: ["id"]
          },
        ]
      }
      material_request_approval_tokens: {
        Row: {
          action_taken: string | null
          created_at: string | null
          expires_at: string
          id: string
          request_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          request_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          request_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_request_approval_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_material_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao: {
        Row: {
          codigo_lanca: number | null
          created_at: string | null
          data_faturamento: string | null
          data_medicao: string | null
          data_prevista: string | null
          desconto_medicao: number | null
          desconto_retencao: number | null
          frete_medicao: number | null
          id_contrato: number
          id_medicao: number
          imposto_medicao: number | null
          numero_medicao: number
          observacoes: string | null
          percentual_executado: number | null
          percentual_previsto: number | null
          status: string | null
          subtotal_medicao: number | null
          updated_at: string | null
          valor_faturavel: number | null
          valor_liquido: number | null
          valor_previsto: number | null
          valor_total_medicao: number | null
        }
        Insert: {
          codigo_lanca?: number | null
          created_at?: string | null
          data_faturamento?: string | null
          data_medicao?: string | null
          data_prevista?: string | null
          desconto_medicao?: number | null
          desconto_retencao?: number | null
          frete_medicao?: number | null
          id_contrato: number
          id_medicao?: number
          imposto_medicao?: number | null
          numero_medicao: number
          observacoes?: string | null
          percentual_executado?: number | null
          percentual_previsto?: number | null
          status?: string | null
          subtotal_medicao?: number | null
          updated_at?: string | null
          valor_faturavel?: number | null
          valor_liquido?: number | null
          valor_previsto?: number | null
          valor_total_medicao?: number | null
        }
        Update: {
          codigo_lanca?: number | null
          created_at?: string | null
          data_faturamento?: string | null
          data_medicao?: string | null
          data_prevista?: string | null
          desconto_medicao?: number | null
          desconto_retencao?: number | null
          frete_medicao?: number | null
          id_contrato?: number
          id_medicao?: number
          imposto_medicao?: number | null
          numero_medicao?: number
          observacoes?: string | null
          percentual_executado?: number | null
          percentual_previsto?: number | null
          status?: string | null
          subtotal_medicao?: number | null
          updated_at?: string | null
          valor_faturavel?: number | null
          valor_liquido?: number | null
          valor_previsto?: number | null
          valor_total_medicao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medicao_id_contrato_fkey"
            columns: ["id_contrato"]
            isOneToOne: false
            referencedRelation: "contrato"
            referencedColumns: ["id_contrato"]
          },
        ]
      }
      medicao_item: {
        Row: {
          created_at: string | null
          id_contrato: number
          id_medicao: number
          id_medicao_item: number
          item_contrato: number
          observacoes: string | null
          percentual_executado: number | null
          quantidade_executada: number | null
          updated_at: string | null
          valor_executado: number | null
        }
        Insert: {
          created_at?: string | null
          id_contrato: number
          id_medicao: number
          id_medicao_item?: number
          item_contrato: number
          observacoes?: string | null
          percentual_executado?: number | null
          quantidade_executada?: number | null
          updated_at?: string | null
          valor_executado?: number | null
        }
        Update: {
          created_at?: string | null
          id_contrato?: number
          id_medicao?: number
          id_medicao_item?: number
          item_contrato?: number
          observacoes?: string | null
          percentual_executado?: number | null
          quantidade_executada?: number | null
          updated_at?: string | null
          valor_executado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medicao_item_id_contrato_item_contrato_fkey"
            columns: ["id_contrato", "item_contrato"]
            isOneToOne: false
            referencedRelation: "contitem"
            referencedColumns: ["id_contrato", "item_contrato"]
          },
          {
            foreignKeyName: "medicao_item_id_medicao_fkey"
            columns: ["id_medicao"]
            isOneToOne: false
            referencedRelation: "medicao"
            referencedColumns: ["id_medicao"]
          },
        ]
      }
      nano_activity_log: {
        Row: {
          action: string
          agent_id: string
          cost_usd: number | null
          created_at: string
          description: string
          duration_ms: number | null
          id: string
          input: Json | null
          output: Json | null
          target_id: string | null
          target_table: string | null
          task_id: string | null
          tokens_used: number | null
        }
        Insert: {
          action: string
          agent_id: string
          cost_usd?: number | null
          created_at?: string
          description?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          output?: Json | null
          target_id?: string | null
          target_table?: string | null
          task_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          action?: string
          agent_id?: string
          cost_usd?: number | null
          created_at?: string
          description?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          output?: Json | null
          target_id?: string | null
          target_table?: string | null
          task_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nano_activity_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nano_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "nano_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      nano_agents: {
        Row: {
          config: Json
          created_at: string
          emoji: string | null
          id: string
          model: string
          name: string
          parent_agent_id: string | null
          slug: string
          status: string
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          emoji?: string | null
          id?: string
          model?: string
          name: string
          parent_agent_id?: string | null
          slug: string
          status?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          emoji?: string | null
          id?: string
          model?: string
          name?: string
          parent_agent_id?: string | null
          slug?: string
          status?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nano_agents_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      nano_documents: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          doc_type: string
          embedding: string | null
          file_path: string | null
          id: string
          metadata: Json
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          content?: string
          created_at?: string
          doc_type?: string
          embedding?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          doc_type?: string
          embedding?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nano_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      nano_flows: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          name: string
          nodes: Json
          trigger: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          name: string
          nodes?: Json
          trigger?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          name?: string
          nodes?: Json
          trigger?: Json
          updated_at?: string
        }
        Relationships: []
      }
      nano_memory: {
        Row: {
          agent_id: string
          category: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          relevance_score: number
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          category: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          relevance_score?: number
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          relevance_score?: number
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nano_memory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      nano_messages: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          id: string
          role: string
          task_id: string | null
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          task_id?: string | null
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nano_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nano_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "nano_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      nano_secrets: {
        Row: {
          agent_id: string | null
          created_at: string
          description: string | null
          encrypted_value: string
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          encrypted_value: string
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          encrypted_value?: string
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nano_secrets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      nano_tasks: {
        Row: {
          admin_feedback: string | null
          assigned_to: string | null
          completed_at: string | null
          context: Json
          created_at: string
          created_by: string | null
          description: string
          due_at: string | null
          id: string
          max_retries: number
          parent_task_id: string | null
          priority: string
          result: string | null
          retry_count: number
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_feedback?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          context?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          due_at?: string | null
          id?: string
          max_retries?: number
          parent_task_id?: string | null
          priority?: string
          result?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_feedback?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          context?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          due_at?: string | null
          id?: string
          max_retries?: number
          parent_task_id?: string | null
          priority?: string
          result?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nano_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nano_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "nano_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nano_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "nano_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notif_anexos: {
        Row: {
          created_at: string | null
          id: number
          nome_arquivo: string
          notif_id: number
          storage_path: string
          tamanho: number
          tipo_arquivo: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome_arquivo: string
          notif_id: number
          storage_path: string
          tamanho: number
          tipo_arquivo: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome_arquivo?: string
          notif_id?: number
          storage_path?: string
          tamanho?: number
          tipo_arquivo?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notif_anexos_notif"
            columns: ["notif_id"]
            isOneToOne: false
            referencedRelation: "notif_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      notif_inbox: {
        Row: {
          created_at: string | null
          data_criacao: string
          due_date: string | null
          id: number
          lido: boolean
          link: string | null
          login_from: string | null
          login_to: string
          mensagem: string
          parent_id: number | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_criacao?: string
          due_date?: string | null
          id?: number
          lido?: boolean
          link?: string | null
          login_from?: string | null
          login_to: string
          mensagem: string
          parent_id?: number | null
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_criacao?: string
          due_date?: string | null
          id?: number
          lido?: boolean
          link?: string | null
          login_from?: string | null
          login_to?: string
          mensagem?: string
          parent_id?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_notif"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notif_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      notif_pref: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          message_notifications: boolean | null
          push_enabled: boolean | null
          task_notifications: boolean | null
          updated_at: string | null
          user_login: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          message_notifications?: boolean | null
          push_enabled?: boolean | null
          task_notifications?: boolean | null
          updated_at?: string | null
          user_login: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          message_notifications?: boolean | null
          push_enabled?: boolean | null
          task_notifications?: boolean | null
          updated_at?: string | null
          user_login?: string
        }
        Relationships: []
      }
      ob_agent_activity_log: {
        Row: {
          action: string
          agent_slug: string
          created_at: string
          description: string | null
          id: string
          input: Json | null
          output: Json | null
          project_id: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          agent_slug: string
          created_at?: string
          description?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          project_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          agent_slug?: string
          created_at?: string
          description?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          project_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ob_agent_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_agent_conversations: {
        Row: {
          agent_slug: string
          content: string
          created_at: string
          id: string
          project_id: string | null
          role: string
          tool_calls: Json | null
        }
        Insert: {
          agent_slug: string
          content: string
          created_at?: string
          id?: string
          project_id?: string | null
          role: string
          tool_calls?: Json | null
        }
        Update: {
          agent_slug?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string | null
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ob_agent_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_block_mappings: {
        Row: {
          block_name: string
          componente: string
          confirmed: boolean
          created_at: string
          disciplina: string
          id: string
          org_id: string
          unidade: string
        }
        Insert: {
          block_name: string
          componente: string
          confirmed?: boolean
          created_at?: string
          disciplina: string
          id?: string
          org_id: string
          unidade: string
        }
        Update: {
          block_name?: string
          componente?: string
          confirmed?: boolean
          created_at?: string
          disciplina?: string
          id?: string
          org_id?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_block_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "ob_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_cotacoes_mercado: {
        Row: {
          created_at: string
          descricao: string
          fornecedor: string | null
          id: string
          observacoes: string | null
          project_id: string
          unidade: string
          validade: string | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          project_id: string
          unidade: string
          validade?: string | null
          valor_unitario: number
        }
        Update: {
          created_at?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          project_id?: string
          unidade?: string
          validade?: string | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "ob_cotacoes_mercado_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_delegation_tasks: {
        Row: {
          context: Json
          created_at: string
          from_agent: string
          id: string
          pranchas: Json
          project_id: string
          result: Json | null
          status: string
          to_agent: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          from_agent: string
          id?: string
          pranchas?: Json
          project_id: string
          result?: Json | null
          status?: string
          to_agent: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          from_agent?: string
          id?: string
          pranchas?: Json
          project_id?: string
          result?: Json | null
          status?: string
          to_agent?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_delegation_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_layer_mappings: {
        Row: {
          confirmed: boolean
          created_at: string
          disciplina: string
          id: string
          layer_name: string
          org_id: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          disciplina: string
          id?: string
          layer_name: string
          org_id: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          disciplina?: string
          id?: string
          layer_name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_layer_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "ob_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_nc_chats: {
        Row: {
          channel: string | null
          is_group: boolean | null
          jid: string
          last_message_time: string | null
          name: string | null
        }
        Insert: {
          channel?: string | null
          is_group?: boolean | null
          jid: string
          last_message_time?: string | null
          name?: string | null
        }
        Update: {
          channel?: string | null
          is_group?: boolean | null
          jid?: string
          last_message_time?: string | null
          name?: string | null
        }
        Relationships: []
      }
      ob_nc_messages: {
        Row: {
          chat_jid: string
          content: string | null
          id: string
          is_bot_message: boolean | null
          is_from_me: boolean | null
          sender: string | null
          sender_name: string | null
          timestamp: string
        }
        Insert: {
          chat_jid: string
          content?: string | null
          id: string
          is_bot_message?: boolean | null
          is_from_me?: boolean | null
          sender?: string | null
          sender_name?: string | null
          timestamp: string
        }
        Update: {
          chat_jid?: string
          content?: string | null
          id?: string
          is_bot_message?: boolean | null
          is_from_me?: boolean | null
          sender?: string | null
          sender_name?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_nc_messages_chat_jid_fkey"
            columns: ["chat_jid"]
            isOneToOne: false
            referencedRelation: "ob_nc_chats"
            referencedColumns: ["jid"]
          },
        ]
      }
      ob_nc_registered_groups: {
        Row: {
          added_at: string
          container_config: Json | null
          folder: string
          is_main: boolean | null
          jid: string
          name: string
          requires_trigger: boolean | null
          trigger_pattern: string
        }
        Insert: {
          added_at: string
          container_config?: Json | null
          folder: string
          is_main?: boolean | null
          jid: string
          name: string
          requires_trigger?: boolean | null
          trigger_pattern: string
        }
        Update: {
          added_at?: string
          container_config?: Json | null
          folder?: string
          is_main?: boolean | null
          jid?: string
          name?: string
          requires_trigger?: boolean | null
          trigger_pattern?: string
        }
        Relationships: []
      }
      ob_nc_router_state: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      ob_nc_scheduled_tasks: {
        Row: {
          chat_jid: string
          context_mode: string | null
          created_at: string
          group_folder: string
          id: string
          last_result: string | null
          last_run: string | null
          next_run: string | null
          prompt: string
          schedule_type: string
          schedule_value: string
          script: string | null
          status: string | null
        }
        Insert: {
          chat_jid: string
          context_mode?: string | null
          created_at?: string
          group_folder: string
          id: string
          last_result?: string | null
          last_run?: string | null
          next_run?: string | null
          prompt: string
          schedule_type: string
          schedule_value: string
          script?: string | null
          status?: string | null
        }
        Update: {
          chat_jid?: string
          context_mode?: string | null
          created_at?: string
          group_folder?: string
          id?: string
          last_result?: string | null
          last_run?: string | null
          next_run?: string | null
          prompt?: string
          schedule_type?: string
          schedule_value?: string
          script?: string | null
          status?: string | null
        }
        Relationships: []
      }
      ob_nc_sessions: {
        Row: {
          group_folder: string
          session_id: string
        }
        Insert: {
          group_folder: string
          session_id: string
        }
        Update: {
          group_folder?: string
          session_id?: string
        }
        Relationships: []
      }
      ob_nc_task_run_logs: {
        Row: {
          duration_ms: number
          error: string | null
          id: number
          result: string | null
          run_at: string
          status: string
          task_id: string
        }
        Insert: {
          duration_ms: number
          error?: string | null
          id?: never
          result?: string | null
          run_at: string
          status: string
          task_id: string
        }
        Update: {
          duration_ms?: number
          error?: string | null
          id?: never
          result?: string | null
          run_at?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_nc_task_run_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ob_nc_scheduled_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_orcamento_items: {
        Row: {
          adm_percentual: number | null
          created_at: string
          curva_abc_classe: string | null
          custo_mao_obra: number | null
          custo_material: number | null
          custo_total: number | null
          custo_unitario: number | null
          descricao: string
          eap_code: string
          eap_level: number
          fonte: string | null
          fonte_codigo: string | null
          fonte_data_base: string | null
          id: string
          peso_percentual: number | null
          project_id: string
          quantidade: number | null
          quantitativo_id: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          adm_percentual?: number | null
          created_at?: string
          curva_abc_classe?: string | null
          custo_mao_obra?: number | null
          custo_material?: number | null
          custo_total?: number | null
          custo_unitario?: number | null
          descricao: string
          eap_code: string
          eap_level: number
          fonte?: string | null
          fonte_codigo?: string | null
          fonte_data_base?: string | null
          id?: string
          peso_percentual?: number | null
          project_id: string
          quantidade?: number | null
          quantitativo_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          adm_percentual?: number | null
          created_at?: string
          curva_abc_classe?: string | null
          custo_mao_obra?: number | null
          custo_material?: number | null
          custo_total?: number | null
          custo_unitario?: number | null
          descricao?: string
          eap_code?: string
          eap_level?: number
          fonte?: string | null
          fonte_codigo?: string | null
          fonte_data_base?: string | null
          id?: string
          peso_percentual?: number | null
          project_id?: string
          quantidade?: number | null
          quantitativo_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_orcamento_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_orcamento_items_quantitativo_id_fkey"
            columns: ["quantitativo_id"]
            isOneToOne: false
            referencedRelation: "ob_quantitativos"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "ob_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ob_pdf_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_id: string
          id: string
          progress: number
          project_id: string | null
          stage: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_id: string
          id?: string
          progress?: number
          project_id?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_id?: string
          id?: string
          progress?: number
          project_id?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_pdf_jobs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "ob_project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_pdf_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_pdf_pages: {
        Row: {
          confidence: number | null
          created_at: string
          file_id: string
          id: string
          image_path: string | null
          needs_review: boolean
          ocr_used: boolean
          page_number: number
          prancha_id: string | null
          review_notes: string | null
          structured_data: Json | null
          text_content: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          file_id: string
          id?: string
          image_path?: string | null
          needs_review?: boolean
          ocr_used?: boolean
          page_number: number
          prancha_id?: string | null
          review_notes?: string | null
          structured_data?: Json | null
          text_content?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          file_id?: string
          id?: string
          image_path?: string | null
          needs_review?: boolean
          ocr_used?: boolean
          page_number?: number
          prancha_id?: string | null
          review_notes?: string | null
          structured_data?: Json | null
          text_content?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_pdf_pages_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "ob_project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_processing_runs: {
        Row: {
          created_at: string
          error_message: string | null
          file_id: string
          id: string
          items: Json
          needs_review: Json
          pages_processed: number
          project_id: string
          prompt: string
          raw_response: Json | null
          status: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_id: string
          id?: string
          items?: Json
          needs_review?: Json
          pages_processed?: number
          project_id: string
          prompt: string
          raw_response?: Json | null
          status?: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_id?: string
          id?: string
          items?: Json
          needs_review?: Json
          pages_processed?: number
          project_id?: string
          prompt?: string
          raw_response?: Json | null
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ob_processing_runs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "ob_project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_processing_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_project_files: {
        Row: {
          created_at: string
          disciplina: string | null
          file_type: string
          filename: string
          id: string
          project_id: string
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disciplina?: string | null
          file_type: string
          filename: string
          id?: string
          project_id: string
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disciplina?: string | null
          file_type?: string
          filename?: string
          id?: string
          project_id?: string
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_projects: {
        Row: {
          area_total_m2: number | null
          bdi_percentual: number | null
          cidade: string | null
          created_at: string
          data_base_sinapi: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          premissas: Json
          status: string
          tipo_obra: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          area_total_m2?: number | null
          bdi_percentual?: number | null
          cidade?: string | null
          created_at?: string
          data_base_sinapi?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          premissas?: Json
          status?: string
          tipo_obra?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          area_total_m2?: number | null
          bdi_percentual?: number | null
          cidade?: string | null
          created_at?: string
          data_base_sinapi?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          premissas?: Json
          status?: string
          tipo_obra?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "ob_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_proposta_items: {
        Row: {
          confidence: number | null
          created_at: string
          descricao: string
          id: string
          needs_review: boolean | null
          preco_total: number | null
          preco_unitario: number | null
          proposta_id: string
          quantidade: number | null
          unidade: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          descricao?: string
          id?: string
          needs_review?: boolean | null
          preco_total?: number | null
          preco_unitario?: number | null
          proposta_id: string
          quantidade?: number | null
          unidade?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          descricao?: string
          id?: string
          needs_review?: boolean | null
          preco_total?: number | null
          preco_unitario?: number | null
          proposta_id?: string
          quantidade?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ob_proposta_items_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "ob_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_propostas: {
        Row: {
          created_at: string
          file_id: string | null
          fornecedor: string
          id: string
          project_id: string
          status: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          fornecedor?: string
          id?: string
          project_id: string
          status?: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          file_id?: string | null
          fornecedor?: string
          id?: string
          project_id?: string
          status?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ob_propostas_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "ob_project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_propostas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_quantitativos: {
        Row: {
          calculo_memorial: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          descricao: string
          disciplina: string
          id: string
          item_code: string | null
          needs_review: boolean
          origem_ambiente: string | null
          origem_prancha: string | null
          project_id: string
          quantidade: number
          reviewed_by: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          calculo_memorial?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          descricao: string
          disciplina: string
          id?: string
          item_code?: string | null
          needs_review?: boolean
          origem_ambiente?: string | null
          origem_prancha?: string | null
          project_id: string
          quantidade: number
          reviewed_by?: string | null
          unidade: string
          updated_at?: string
        }
        Update: {
          calculo_memorial?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          disciplina?: string
          id?: string
          item_code?: string | null
          needs_review?: boolean
          origem_ambiente?: string | null
          origem_prancha?: string | null
          project_id?: string
          quantidade?: number
          reviewed_by?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_quantitativos_origem_prancha_fkey"
            columns: ["origem_prancha"]
            isOneToOne: false
            referencedRelation: "ob_pdf_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_quantitativos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ob_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_sinapi_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_length: number
          created_at: string | null
          embedding: string | null
          id: string
          page_number: number | null
          source_file: string
          source_title: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_length: number
          created_at?: string | null
          embedding?: string | null
          id?: string
          page_number?: number | null
          source_file: string
          source_title: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_length?: number
          created_at?: string | null
          embedding?: string | null
          id?: string
          page_number?: number | null
          source_file?: string
          source_title?: string
        }
        Relationships: []
      }
      ob_sinapi_composicao_insumos: {
        Row: {
          coeficiente: number
          composicao_id: string
          id: string
          insumo_id: string
        }
        Insert: {
          coeficiente: number
          composicao_id: string
          id?: string
          insumo_id: string
        }
        Update: {
          coeficiente?: number
          composicao_id?: string
          id?: string
          insumo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_sinapi_composicao_insumos_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "ob_sinapi_composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_sinapi_composicao_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "ob_sinapi_composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_sinapi_composicoes: {
        Row: {
          classe: string | null
          codigo: string
          created_at: string
          custo_com_desoneracao: number | null
          custo_sem_desoneracao: number | null
          data_base: string
          descricao: string
          id: string
          tipo: string
          uf: string
          unidade: string
        }
        Insert: {
          classe?: string | null
          codigo: string
          created_at?: string
          custo_com_desoneracao?: number | null
          custo_sem_desoneracao?: number | null
          data_base: string
          descricao: string
          id?: string
          tipo: string
          uf: string
          unidade: string
        }
        Update: {
          classe?: string | null
          codigo?: string
          created_at?: string
          custo_com_desoneracao?: number | null
          custo_sem_desoneracao?: number | null
          data_base?: string
          descricao?: string
          id?: string
          tipo?: string
          uf?: string
          unidade?: string
        }
        Relationships: []
      }
      ob_tcpo_composicoes: {
        Row: {
          bdi_percentual: number | null
          categoria: string | null
          codigo: string
          created_at: string
          custo_com_taxas: number | null
          custo_sem_taxas: number | null
          data_precos: string | null
          descricao: string
          id: string
          ls_percentual: number | null
          regiao: string | null
          search_term: string | null
          unidade: string
        }
        Insert: {
          bdi_percentual?: number | null
          categoria?: string | null
          codigo: string
          created_at?: string
          custo_com_taxas?: number | null
          custo_sem_taxas?: number | null
          data_precos?: string | null
          descricao: string
          id?: string
          ls_percentual?: number | null
          regiao?: string | null
          search_term?: string | null
          unidade: string
        }
        Update: {
          bdi_percentual?: number | null
          categoria?: string | null
          codigo?: string
          created_at?: string
          custo_com_taxas?: number | null
          custo_sem_taxas?: number | null
          data_precos?: string | null
          descricao?: string
          id?: string
          ls_percentual?: number | null
          regiao?: string | null
          search_term?: string | null
          unidade?: string
        }
        Relationships: []
      }
      ob_tcpo_insumos: {
        Row: {
          classe: string | null
          codigo: string
          coeficiente: number | null
          composicao_id: string
          consumo: number | null
          descricao: string
          id: string
          preco_unitario: number | null
          total: number | null
          unidade: string | null
        }
        Insert: {
          classe?: string | null
          codigo: string
          coeficiente?: number | null
          composicao_id: string
          consumo?: number | null
          descricao: string
          id?: string
          preco_unitario?: number | null
          total?: number | null
          unidade?: string | null
        }
        Update: {
          classe?: string | null
          codigo?: string
          coeficiente?: number | null
          composicao_id?: string
          consumo?: number | null
          descricao?: string
          id?: string
          preco_unitario?: number | null
          total?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ob_tcpo_insumos_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "ob_tcpo_composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_tcpo_insumos_base: {
        Row: {
          categoria: string
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          preco: number | null
          regiao: string | null
          search_term: string | null
          unidade: string | null
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          preco?: number | null
          regiao?: string | null
          search_term?: string | null
          unidade?: string | null
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          preco?: number | null
          regiao?: string | null
          search_term?: string | null
          unidade?: string | null
        }
        Relationships: []
      }
      obra_documentos: {
        Row: {
          codigo_documento: number
          codigo_obra: string | null
          created_at: string | null
          data: string | null
          login: string | null
          nome_arquivo: string | null
          path: string | null
          tamanho: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_documento?: never
          codigo_obra?: string | null
          created_at?: string | null
          data?: string | null
          login?: string | null
          nome_arquivo?: string | null
          path?: string | null
          tamanho?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_documento?: never
          codigo_obra?: string | null
          created_at?: string | null
          data?: string | null
          login?: string | null
          nome_arquivo?: string | null
          path?: string | null
          tamanho?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      obracada: {
        Row: {
          administracao: number | null
          bairro_cobranca: string | null
          bairro_correspondencia: string | null
          bairro_faturamento: string | null
          bairro_obra: string | null
          ccm: string | null
          cei: string | null
          cep_cobranca: string | null
          cep_correspondencia: string | null
          cep_faturamento: string | null
          cep_obra: string | null
          cgc_cobranca: string | null
          cidade_cobranca: string | null
          cidade_correspondencia: string | null
          cidade_faturamento: string | null
          cidade_obra: string | null
          cobra_iss: string | null
          cobranca: string | null
          codigo_obra: string
          codigo_orcamento: number | null
          complemento_cobranca: string | null
          complemento_correspondencia: string | null
          complemento_faturamento: string | null
          complemento_obra: string | null
          contato_cliente: string | null
          contato_obra: string | null
          controla_banco: string | null
          controla_orcamento: string | null
          correspondencia: string | null
          cpf: string | null
          created_at: string | null
          data_fechada: string | null
          data_inicio: string | null
          data_termino: string | null
          default_bank_account_id: string | null
          email_cliente: string | null
          email_cliente2: string | null
          email_cliente3: string | null
          email_cliente4: string | null
          entrega: string | null
          estado_cobranca: string | null
          estado_correspondencia: string | null
          estado_faturamento: string | null
          estado_obra: string | null
          faturamento: string | null
          gerencia_pagto: string | null
          insc_cobranca: string | null
          iss: number | null
          leis_sociais: number | null
          nome: string | null
          numero_cobranca: string | null
          numero_correspondencia: string | null
          numero_faturamento: string | null
          numero_obra: string | null
          obs_enviar: string | null
          obs_lancar: string | null
          observacoes: string | null
          pessoa_fis_jur: string | null
          razao_social_faturamento: string | null
          reembolso_engenheiro: string | null
          reembolso_imposto: string | null
          restrito: string | null
          rua_cobranca: string | null
          rua_correspondencia: string | null
          rua_faturamento: string | null
          rua_obra: string | null
          status: string | null
          taxa_maquinas: number | null
          tel_cliente: string | null
          tel_obra: string | null
          tipo: string | null
          updated_at: string | null
          usuarios: number | null
          valor_engenheiro: number | null
          valor_imposto: number | null
          whatsapp_cliente: string | null
        }
        Insert: {
          administracao?: number | null
          bairro_cobranca?: string | null
          bairro_correspondencia?: string | null
          bairro_faturamento?: string | null
          bairro_obra?: string | null
          ccm?: string | null
          cei?: string | null
          cep_cobranca?: string | null
          cep_correspondencia?: string | null
          cep_faturamento?: string | null
          cep_obra?: string | null
          cgc_cobranca?: string | null
          cidade_cobranca?: string | null
          cidade_correspondencia?: string | null
          cidade_faturamento?: string | null
          cidade_obra?: string | null
          cobra_iss?: string | null
          cobranca?: string | null
          codigo_obra: string
          codigo_orcamento?: number | null
          complemento_cobranca?: string | null
          complemento_correspondencia?: string | null
          complemento_faturamento?: string | null
          complemento_obra?: string | null
          contato_cliente?: string | null
          contato_obra?: string | null
          controla_banco?: string | null
          controla_orcamento?: string | null
          correspondencia?: string | null
          cpf?: string | null
          created_at?: string | null
          data_fechada?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          default_bank_account_id?: string | null
          email_cliente?: string | null
          email_cliente2?: string | null
          email_cliente3?: string | null
          email_cliente4?: string | null
          entrega?: string | null
          estado_cobranca?: string | null
          estado_correspondencia?: string | null
          estado_faturamento?: string | null
          estado_obra?: string | null
          faturamento?: string | null
          gerencia_pagto?: string | null
          insc_cobranca?: string | null
          iss?: number | null
          leis_sociais?: number | null
          nome?: string | null
          numero_cobranca?: string | null
          numero_correspondencia?: string | null
          numero_faturamento?: string | null
          numero_obra?: string | null
          obs_enviar?: string | null
          obs_lancar?: string | null
          observacoes?: string | null
          pessoa_fis_jur?: string | null
          razao_social_faturamento?: string | null
          reembolso_engenheiro?: string | null
          reembolso_imposto?: string | null
          restrito?: string | null
          rua_cobranca?: string | null
          rua_correspondencia?: string | null
          rua_faturamento?: string | null
          rua_obra?: string | null
          status?: string | null
          taxa_maquinas?: number | null
          tel_cliente?: string | null
          tel_obra?: string | null
          tipo?: string | null
          updated_at?: string | null
          usuarios?: number | null
          valor_engenheiro?: number | null
          valor_imposto?: number | null
          whatsapp_cliente?: string | null
        }
        Update: {
          administracao?: number | null
          bairro_cobranca?: string | null
          bairro_correspondencia?: string | null
          bairro_faturamento?: string | null
          bairro_obra?: string | null
          ccm?: string | null
          cei?: string | null
          cep_cobranca?: string | null
          cep_correspondencia?: string | null
          cep_faturamento?: string | null
          cep_obra?: string | null
          cgc_cobranca?: string | null
          cidade_cobranca?: string | null
          cidade_correspondencia?: string | null
          cidade_faturamento?: string | null
          cidade_obra?: string | null
          cobra_iss?: string | null
          cobranca?: string | null
          codigo_obra?: string
          codigo_orcamento?: number | null
          complemento_cobranca?: string | null
          complemento_correspondencia?: string | null
          complemento_faturamento?: string | null
          complemento_obra?: string | null
          contato_cliente?: string | null
          contato_obra?: string | null
          controla_banco?: string | null
          controla_orcamento?: string | null
          correspondencia?: string | null
          cpf?: string | null
          created_at?: string | null
          data_fechada?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          default_bank_account_id?: string | null
          email_cliente?: string | null
          email_cliente2?: string | null
          email_cliente3?: string | null
          email_cliente4?: string | null
          entrega?: string | null
          estado_cobranca?: string | null
          estado_correspondencia?: string | null
          estado_faturamento?: string | null
          estado_obra?: string | null
          faturamento?: string | null
          gerencia_pagto?: string | null
          insc_cobranca?: string | null
          iss?: number | null
          leis_sociais?: number | null
          nome?: string | null
          numero_cobranca?: string | null
          numero_correspondencia?: string | null
          numero_faturamento?: string | null
          numero_obra?: string | null
          obs_enviar?: string | null
          obs_lancar?: string | null
          observacoes?: string | null
          pessoa_fis_jur?: string | null
          razao_social_faturamento?: string | null
          reembolso_engenheiro?: string | null
          reembolso_imposto?: string | null
          restrito?: string | null
          rua_cobranca?: string | null
          rua_correspondencia?: string | null
          rua_faturamento?: string | null
          rua_obra?: string | null
          status?: string | null
          taxa_maquinas?: number | null
          tel_cliente?: string | null
          tel_obra?: string | null
          tipo?: string | null
          updated_at?: string | null
          usuarios?: number | null
          valor_engenheiro?: number | null
          valor_imposto?: number | null
          whatsapp_cliente?: string | null
        }
        Relationships: []
      }
      orcamento: {
        Row: {
          administracao: number | null
          bdi: number | null
          codigo_indice: number | null
          codigo_obra: string | null
          codigo_orcamento: number
          created_at: string | null
          data_base: string | null
          imposto: number | null
          quantidade_indice: number | null
          tipo_obra: string | null
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          administracao?: number | null
          bdi?: number | null
          codigo_indice?: number | null
          codigo_obra?: string | null
          codigo_orcamento: number
          created_at?: string | null
          data_base?: string | null
          imposto?: number | null
          quantidade_indice?: number | null
          tipo_obra?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          administracao?: number | null
          bdi?: number | null
          codigo_indice?: number | null
          codigo_obra?: string | null
          codigo_orcamento?: number
          created_at?: string | null
          data_base?: string | null
          imposto?: number | null
          quantidade_indice?: number | null
          tipo_obra?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      orcamento_itens: {
        Row: {
          codigo_indice: number | null
          codigo_itens: number
          codigo_orcamento: number | null
          created_at: string | null
          descricao_iten: string | null
          item: string | null
          quantidade_indice: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          codigo_indice?: number | null
          codigo_itens: number
          codigo_orcamento?: number | null
          created_at?: string | null
          descricao_iten?: string | null
          item?: string | null
          quantidade_indice?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          codigo_indice?: number | null
          codigo_itens?: number
          codigo_orcamento?: number | null
          created_at?: string | null
          descricao_iten?: string | null
          item?: string | null
          quantidade_indice?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orcamento_itens_orcamento"
            columns: ["codigo_orcamento"]
            isOneToOne: false
            referencedRelation: "orcamento"
            referencedColumns: ["codigo_orcamento"]
          },
        ]
      }
      orcamento_subitem: {
        Row: {
          administracao: number | null
          codigo_indice: number | null
          codigo_itens: number | null
          codigo_subitens: number
          created_at: string | null
          descricao_subitem: string | null
          quantidade: number | null
          quantidade_indice: number | null
          subitem: string | null
          total: number | null
          unidade: string | null
          unitario: number | null
          updated_at: string | null
        }
        Insert: {
          administracao?: number | null
          codigo_indice?: number | null
          codigo_itens?: number | null
          codigo_subitens: number
          created_at?: string | null
          descricao_subitem?: string | null
          quantidade?: number | null
          quantidade_indice?: number | null
          subitem?: string | null
          total?: number | null
          unidade?: string | null
          unitario?: number | null
          updated_at?: string | null
        }
        Update: {
          administracao?: number | null
          codigo_indice?: number | null
          codigo_itens?: number | null
          codigo_subitens?: number
          created_at?: string | null
          descricao_subitem?: string | null
          quantidade?: number | null
          quantidade_indice?: number | null
          subitem?: string | null
          total?: number | null
          unidade?: string | null
          unitario?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orcamento_subitem_itens"
            columns: ["codigo_itens"]
            isOneToOne: false
            referencedRelation: "orcamento_itens"
            referencedColumns: ["codigo_itens"]
          },
        ]
      }
      parcela_config_atividade: {
        Row: {
          atividade_id: string
          created_at: string | null
          cronograma_financeiro_id: string
          id: string
          ordem: number
          percentual: number
          posicao_percentual: number
          prazo_pagamento_dias: number
          tipo: string
          updated_at: string | null
        }
        Insert: {
          atividade_id: string
          created_at?: string | null
          cronograma_financeiro_id: string
          id?: string
          ordem: number
          percentual: number
          posicao_percentual?: number
          prazo_pagamento_dias?: number
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          atividade_id?: string
          created_at?: string | null
          cronograma_financeiro_id?: string
          id?: string
          ordem?: number
          percentual?: number
          posicao_percentual?: number
          prazo_pagamento_dias?: number
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parcela_config_atividade"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parcela_config_cronograma"
            columns: ["cronograma_financeiro_id"]
            isOneToOne: false
            referencedRelation: "cronograma_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      parcela_financeira: {
        Row: {
          atividade_id: string
          created_at: string | null
          cronograma_financeiro_id: string
          data_evento: string
          data_pagamento_previsto: string
          id: string
          numero_parcela: number
          percentual: number
          tipo: string
          valor: number
        }
        Insert: {
          atividade_id: string
          created_at?: string | null
          cronograma_financeiro_id: string
          data_evento: string
          data_pagamento_previsto: string
          id?: string
          numero_parcela?: number
          percentual?: number
          tipo: string
          valor?: number
        }
        Update: {
          atividade_id?: string
          created_at?: string | null
          cronograma_financeiro_id?: string
          data_evento?: string
          data_pagamento_previsto?: string
          id?: string
          numero_parcela?: number
          percentual?: number
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcela_financeira_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcela_financeira_cronograma_financeiro_id_fkey"
            columns: ["cronograma_financeiro_id"]
            isOneToOne: false
            referencedRelation: "cronograma_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_charges: {
        Row: {
          amount_cents: number
          asaas_payment_id: string | null
          bank_account_id: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          paid_at: string | null
          pix_copy_paste: string | null
          qr_code: string | null
          qr_code_image_url: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount_cents: number
          asaas_payment_id?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          pix_copy_paste?: string | null
          qr_code?: string | null
          qr_code_image_url?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount_cents?: number
          asaas_payment_id?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          pix_copy_paste?: string | null
          qr_code?: string | null
          qr_code_image_url?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      produto_categoria: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produto_subcategoria: {
        Row: {
          ativo: boolean | null
          categoria_codigo: string
          codigo: string
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_codigo: string
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_codigo?: string
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_subcategoria_categoria_codigo_fkey"
            columns: ["categoria_codigo"]
            isOneToOne: false
            referencedRelation: "produto_categoria"
            referencedColumns: ["codigo"]
          },
        ]
      }
      produtos_conhecimento: {
        Row: {
          categoria: string | null
          codigo_produto: string | null
          created_at: string | null
          descricao_completa: string
          descricao_normalizada: string | null
          embedding: string | null
          especificacoes_tecnicas: Json | null
          frequencia_uso: number | null
          grupo_material: string | null
          id: string
          id_fornece: number | null
          price: number | null
          price_date: string | null
          sinonimos: string[] | null
          subcategoria: string | null
          tags: string[] | null
          tipo_item: string | null
          ultima_utilizacao: string | null
          unidade_padrao: string
          unidades_alternativas: Json | null
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          descricao_completa: string
          descricao_normalizada?: string | null
          embedding?: string | null
          especificacoes_tecnicas?: Json | null
          frequencia_uso?: number | null
          grupo_material?: string | null
          id?: string
          id_fornece?: number | null
          price?: number | null
          price_date?: string | null
          sinonimos?: string[] | null
          subcategoria?: string | null
          tags?: string[] | null
          tipo_item?: string | null
          ultima_utilizacao?: string | null
          unidade_padrao: string
          unidades_alternativas?: Json | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          descricao_completa?: string
          descricao_normalizada?: string | null
          embedding?: string | null
          especificacoes_tecnicas?: Json | null
          frequencia_uso?: number | null
          grupo_material?: string | null
          id?: string
          id_fornece?: number | null
          price?: number | null
          price_date?: string | null
          sinonimos?: string[] | null
          subcategoria?: string | null
          tags?: string[] | null
          tipo_item?: string | null
          ultima_utilizacao?: string | null
          unidade_padrao?: string
          unidades_alternativas?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produtos_embeddings_backup: {
        Row: {
          backed_up_at: string | null
          backup_timestamp: string | null
          id: string
          metadata: Json | null
          migration_id: string
          old_dimensions: number
          old_embedding: string
          old_model: string
          produto_id: string
        }
        Insert: {
          backed_up_at?: string | null
          backup_timestamp?: string | null
          id?: string
          metadata?: Json | null
          migration_id: string
          old_dimensions: number
          old_embedding: string
          old_model: string
          produto_id: string
        }
        Update: {
          backed_up_at?: string | null
          backup_timestamp?: string | null
          id?: string
          metadata?: Json | null
          migration_id?: string
          old_dimensions?: number
          old_embedding?: string
          old_model?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_embeddings_backup_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_conhecimento"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposta_analise: {
        Row: {
          arquivo_path: string
          created_at: string | null
          dados_analise: Json | null
          id_fornece: number
          id_proposta_analise: number
          id_requisicao: number
          id_tracking: number
          modelo_ia: string | null
          observacoes: string | null
          source: string
          status_analise: string
          tokens_usados: number | null
          updated_at: string | null
        }
        Insert: {
          arquivo_path: string
          created_at?: string | null
          dados_analise?: Json | null
          id_fornece: number
          id_proposta_analise?: number
          id_requisicao: number
          id_tracking: number
          modelo_ia?: string | null
          observacoes?: string | null
          source: string
          status_analise?: string
          tokens_usados?: number | null
          updated_at?: string | null
        }
        Update: {
          arquivo_path?: string
          created_at?: string | null
          dados_analise?: Json | null
          id_fornece?: number
          id_proposta_analise?: number
          id_requisicao?: number
          id_tracking?: number
          modelo_ia?: string | null
          observacoes?: string | null
          source?: string
          status_analise?: string
          tokens_usados?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposta_analise_id_requisicao_fkey"
            columns: ["id_requisicao"]
            isOneToOne: false
            referencedRelation: "requisicao"
            referencedColumns: ["id_requisicao"]
          },
          {
            foreignKeyName: "proposta_analise_id_tracking_fkey"
            columns: ["id_tracking"]
            isOneToOne: false
            referencedRelation: "requisicao_envio_tracking"
            referencedColumns: ["id_tracking"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rag_migrations: {
        Row: {
          completed_at: string | null
          custo_estimado_usd: number | null
          custo_total_usd: number | null
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          new_dimensions: number
          new_model: string
          old_dimensions: number
          old_model: string
          produtos_com_erro: number | null
          produtos_com_sucesso: number | null
          produtos_processados: number | null
          started_at: string | null
          status: string
          tempo_decorrido_segundos: number | null
          tempo_estimado_segundos: number | null
          total_produtos: number
        }
        Insert: {
          completed_at?: string | null
          custo_estimado_usd?: number | null
          custo_total_usd?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          new_dimensions: number
          new_model: string
          old_dimensions: number
          old_model: string
          produtos_com_erro?: number | null
          produtos_com_sucesso?: number | null
          produtos_processados?: number | null
          started_at?: string | null
          status: string
          tempo_decorrido_segundos?: number | null
          tempo_estimado_segundos?: number | null
          total_produtos: number
        }
        Update: {
          completed_at?: string | null
          custo_estimado_usd?: number | null
          custo_total_usd?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          new_dimensions?: number
          new_model?: string
          old_dimensions?: number
          old_model?: string
          produtos_com_erro?: number | null
          produtos_com_sucesso?: number | null
          produtos_processados?: number | null
          started_at?: string | null
          status?: string
          tempo_decorrido_segundos?: number | null
          tempo_estimado_segundos?: number | null
          total_produtos?: number
        }
        Relationships: []
      }
      rag_reindex_log: {
        Row: {
          created_at: string | null
          custo_usd: number | null
          error_message: string | null
          id: string
          migration_id: string
          new_embedding_sample: string | null
          old_embedding_sample: string | null
          processed_at: string | null
          processing_time_ms: number | null
          produto_codigo: string | null
          produto_descricao: string | null
          produto_id: string
          status: string
          tokens_input: number | null
          tokens_output: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custo_usd?: number | null
          error_message?: string | null
          id?: string
          migration_id: string
          new_embedding_sample?: string | null
          old_embedding_sample?: string | null
          processed_at?: string | null
          processing_time_ms?: number | null
          produto_codigo?: string | null
          produto_descricao?: string | null
          produto_id: string
          status: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custo_usd?: number | null
          error_message?: string | null
          id?: string
          migration_id?: string
          new_embedding_sample?: string | null
          old_embedding_sample?: string | null
          processed_at?: string | null
          processing_time_ms?: number | null
          produto_codigo?: string | null
          produto_descricao?: string | null
          produto_id?: string
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_reindex_log_migration_id_fkey"
            columns: ["migration_id"]
            isOneToOne: false
            referencedRelation: "rag_migrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_reindex_log_migration_id_fkey"
            columns: ["migration_id"]
            isOneToOne: false
            referencedRelation: "v_migration_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_reindex_log_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_conhecimento"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          updated_at: string | null
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          updated_at?: string | null
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          updated_at?: string | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      recibos: {
        Row: {
          cod_fornecedor: number | null
          cod_obra: string | null
          created_at: string | null
          data: string | null
          recibo: number
          updated_at: string | null
        }
        Insert: {
          cod_fornecedor?: number | null
          cod_obra?: string | null
          created_at?: string | null
          data?: string | null
          recibo?: number
          updated_at?: string | null
        }
        Update: {
          cod_fornecedor?: number | null
          cod_obra?: string | null
          created_at?: string | null
          data?: string | null
          recibo?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      regeneracao_embeddings: {
        Row: {
          batch_atual: number | null
          completed_at: string | null
          custo_estimado_usd: number | null
          custo_total_usd: number | null
          entidade: string
          error_message: string | null
          erros: number | null
          id: string
          metadata: Json | null
          modo: string
          processados: number | null
          progresso_percentual: number | null
          started_at: string | null
          status: string
          sucessos: number | null
          tempo_decorrido_segundos: number | null
          tempo_estimado_segundos: number | null
          total_batches: number | null
          total_registros: number
        }
        Insert: {
          batch_atual?: number | null
          completed_at?: string | null
          custo_estimado_usd?: number | null
          custo_total_usd?: number | null
          entidade: string
          error_message?: string | null
          erros?: number | null
          id?: string
          metadata?: Json | null
          modo: string
          processados?: number | null
          progresso_percentual?: number | null
          started_at?: string | null
          status: string
          sucessos?: number | null
          tempo_decorrido_segundos?: number | null
          tempo_estimado_segundos?: number | null
          total_batches?: number | null
          total_registros?: number
        }
        Update: {
          batch_atual?: number | null
          completed_at?: string | null
          custo_estimado_usd?: number | null
          custo_total_usd?: number | null
          entidade?: string
          error_message?: string | null
          erros?: number | null
          id?: string
          metadata?: Json | null
          modo?: string
          processados?: number | null
          progresso_percentual?: number | null
          started_at?: string | null
          status?: string
          sucessos?: number | null
          tempo_decorrido_segundos?: number | null
          tempo_estimado_segundos?: number | null
          total_batches?: number | null
          total_registros?: number
        }
        Relationships: []
      }
      regeneracao_logs: {
        Row: {
          custo_usd: number | null
          entidade: string
          error_message: string | null
          id: string
          processed_at: string | null
          processing_time_ms: number | null
          regeneracao_id: string | null
          registro_descricao: string | null
          registro_id: string
          status: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          custo_usd?: number | null
          entidade: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          processing_time_ms?: number | null
          regeneracao_id?: string | null
          registro_descricao?: string | null
          registro_id: string
          status: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          custo_usd?: number | null
          entidade?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          processing_time_ms?: number | null
          regeneracao_id?: string | null
          registro_descricao?: string | null
          registro_id?: string
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regeneracao_logs_regeneracao_id_fkey"
            columns: ["regeneracao_id"]
            isOneToOne: false
            referencedRelation: "regeneracao_embeddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regeneracao_logs_regeneracao_id_fkey"
            columns: ["regeneracao_id"]
            isOneToOne: false
            referencedRelation: "v_regeneracao_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicao: {
        Row: {
          codigo_obra: string | null
          created_at: string | null
          data_entrega: string | null
          data_requisicao: string | null
          descricao: string | null
          id_requisicao: number
          jarvis_canal: string | null
          jarvis_instrucoes: string | null
          jarvis_max_tentativas: number | null
          jarvis_mensagem_adicional: string | null
          jarvis_prazo_limite: string | null
          monitorar_jarvis: boolean | null
          monitorar_jarvis_iniciado_em: string | null
          observacoes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_obra?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_requisicao?: string | null
          descricao?: string | null
          id_requisicao?: number
          jarvis_canal?: string | null
          jarvis_instrucoes?: string | null
          jarvis_max_tentativas?: number | null
          jarvis_mensagem_adicional?: string | null
          jarvis_prazo_limite?: string | null
          monitorar_jarvis?: boolean | null
          monitorar_jarvis_iniciado_em?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_obra?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_requisicao?: string | null
          descricao?: string | null
          id_requisicao?: number
          jarvis_canal?: string | null
          jarvis_instrucoes?: string | null
          jarvis_max_tentativas?: number | null
          jarvis_mensagem_adicional?: string | null
          jarvis_prazo_limite?: string | null
          monitorar_jarvis?: boolean | null
          monitorar_jarvis_iniciado_em?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      requisicao_doc: {
        Row: {
          codigo_doc: number
          created_at: string | null
          data: string | null
          id_requisicao: number
          login: string | null
          nome_arquivo: string | null
          storage_path: string | null
          tamanho: string | null
          tipo_documento: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_doc?: number
          created_at?: string | null
          data?: string | null
          id_requisicao: number
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_doc?: number
          created_at?: string | null
          data?: string | null
          id_requisicao?: number
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      requisicao_envio_tracking: {
        Row: {
          arquivo_proposta: string | null
          canal_envio: string | null
          canal_resposta: string | null
          created_at: string | null
          data_envio: string
          data_followup_1: string | null
          data_proposta: string | null
          data_ultima_cobranca: string | null
          duvidas_count: number | null
          enviado_por: string | null
          id_fornece: number | null
          id_requisicao: number
          id_requisicao_fornecedor: number | null
          id_tracking: number
          numero_followups: number | null
          observacoes: string | null
          perfil_urgencia: string | null
          prazo_proposta: string | null
          resumo_resposta: string | null
          status_fornecedor: string | null
          ultima_duvida: string | null
          ultima_mensagem_fornecedor: string | null
          updated_at: string | null
        }
        Insert: {
          arquivo_proposta?: string | null
          canal_envio?: string | null
          canal_resposta?: string | null
          created_at?: string | null
          data_envio?: string
          data_followup_1?: string | null
          data_proposta?: string | null
          data_ultima_cobranca?: string | null
          duvidas_count?: number | null
          enviado_por?: string | null
          id_fornece?: number | null
          id_requisicao: number
          id_requisicao_fornecedor?: number | null
          id_tracking?: number
          numero_followups?: number | null
          observacoes?: string | null
          perfil_urgencia?: string | null
          prazo_proposta?: string | null
          resumo_resposta?: string | null
          status_fornecedor?: string | null
          ultima_duvida?: string | null
          ultima_mensagem_fornecedor?: string | null
          updated_at?: string | null
        }
        Update: {
          arquivo_proposta?: string | null
          canal_envio?: string | null
          canal_resposta?: string | null
          created_at?: string | null
          data_envio?: string
          data_followup_1?: string | null
          data_proposta?: string | null
          data_ultima_cobranca?: string | null
          duvidas_count?: number | null
          enviado_por?: string | null
          id_fornece?: number | null
          id_requisicao?: number
          id_requisicao_fornecedor?: number | null
          id_tracking?: number
          numero_followups?: number | null
          observacoes?: string | null
          perfil_urgencia?: string | null
          prazo_proposta?: string | null
          resumo_resposta?: string | null
          status_fornecedor?: string | null
          ultima_duvida?: string | null
          ultima_mensagem_fornecedor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisicao_envio_tracking_id_requisicao_fkey"
            columns: ["id_requisicao"]
            isOneToOne: false
            referencedRelation: "requisicao"
            referencedColumns: ["id_requisicao"]
          },
          {
            foreignKeyName: "requisicao_envio_tracking_id_requisicao_fornecedor_fkey"
            columns: ["id_requisicao_fornecedor"]
            isOneToOne: false
            referencedRelation: "requisicao_fornecedor"
            referencedColumns: ["id_requisicao_fornecedor"]
          },
        ]
      }
      requisicao_fornecedor: {
        Row: {
          condicao_pagamento: string | null
          contato: string | null
          created_at: string | null
          data_envio: string | null
          desconto_necessario: number | null
          desconto_obtido: number | null
          email: string | null
          enviado_email: boolean | null
          enviado_whatsapp: boolean | null
          id_fornece: number | null
          id_requisicao: number
          id_requisicao_fornecedor: number
          numero_fornecedor: number | null
          razao_social: string | null
          selecionado: boolean | null
          telefone: string | null
          updated_at: string | null
          valor_final: number | null
          valor_frete: number | null
          valor_imposto: number | null
          whatsapp: string | null
        }
        Insert: {
          condicao_pagamento?: string | null
          contato?: string | null
          created_at?: string | null
          data_envio?: string | null
          desconto_necessario?: number | null
          desconto_obtido?: number | null
          email?: string | null
          enviado_email?: boolean | null
          enviado_whatsapp?: boolean | null
          id_fornece?: number | null
          id_requisicao: number
          id_requisicao_fornecedor?: number
          numero_fornecedor?: number | null
          razao_social?: string | null
          selecionado?: boolean | null
          telefone?: string | null
          updated_at?: string | null
          valor_final?: number | null
          valor_frete?: number | null
          valor_imposto?: number | null
          whatsapp?: string | null
        }
        Update: {
          condicao_pagamento?: string | null
          contato?: string | null
          created_at?: string | null
          data_envio?: string | null
          desconto_necessario?: number | null
          desconto_obtido?: number | null
          email?: string | null
          enviado_email?: boolean | null
          enviado_whatsapp?: boolean | null
          id_fornece?: number | null
          id_requisicao?: number
          id_requisicao_fornecedor?: number
          numero_fornecedor?: number | null
          razao_social?: string | null
          selecionado?: boolean | null
          telefone?: string | null
          updated_at?: string | null
          valor_final?: number | null
          valor_frete?: number | null
          valor_imposto?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      requisicao_item: {
        Row: {
          created_at: string | null
          descricao: string | null
          especificacoes: string | null
          id_requisicao: number
          id_requisicao_item: number
          numero_item: number
          quantidade: number | null
          status_item: string | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          especificacoes?: string | null
          id_requisicao: number
          id_requisicao_item?: number
          numero_item: number
          quantidade?: number | null
          status_item?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          especificacoes?: string | null
          id_requisicao?: number
          id_requisicao_item?: number
          numero_item?: number
          quantidade?: number | null
          status_item?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rh_centros_custo: {
        Row: {
          ativo: boolean | null
          codigo: string
          cor: string | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rh_colaboradores: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco: string | null
          chave_pix: string | null
          codigo_obra: string | null
          conta: string | null
          created_at: string | null
          data_admissao: string | null
          data_demissao: string | null
          dias_ferias_restantes: number | null
          id: string
          id_fornece: number
          observacoes: string | null
          periodo_aquisitivo_inicio: string | null
          salario_base: number | null
          tipo_colaborador: string
          tipo_pix: number | null
          updated_at: string | null
          valor_diaria: number | null
          valor_hora: number | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          chave_pix?: string | null
          codigo_obra?: string | null
          conta?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          dias_ferias_restantes?: number | null
          id?: string
          id_fornece: number
          observacoes?: string | null
          periodo_aquisitivo_inicio?: string | null
          salario_base?: number | null
          tipo_colaborador?: string
          tipo_pix?: number | null
          updated_at?: string | null
          valor_diaria?: number | null
          valor_hora?: number | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          chave_pix?: string | null
          codigo_obra?: string | null
          conta?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          dias_ferias_restantes?: number | null
          id?: string
          id_fornece?: number
          observacoes?: string | null
          periodo_aquisitivo_inicio?: string | null
          salario_base?: number | null
          tipo_colaborador?: string
          tipo_pix?: number | null
          updated_at?: string | null
          valor_diaria?: number | null
          valor_hora?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_colaboradores_id_fornece_fkey"
            columns: ["id_fornece"]
            isOneToOne: true
            referencedRelation: "fornecedor"
            referencedColumns: ["id_fornece"]
          },
          {
            foreignKeyName: "rh_colaboradores_id_fornece_fkey"
            columns: ["id_fornece"]
            isOneToOne: true
            referencedRelation: "whatsapp_fornecedor_contacts"
            referencedColumns: ["id_fornece"]
          },
        ]
      }
      rh_dias_trabalhados: {
        Row: {
          colaborador_id: string
          created_at: string | null
          data: string
          id: string
          observacoes: string | null
          quantidade: number | null
          valor_dia: number | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          data: string
          id?: string
          observacoes?: string | null
          quantidade?: number | null
          valor_dia?: number | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          data?: string
          id?: string
          observacoes?: string | null
          quantidade?: number | null
          valor_dia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_dias_trabalhados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "rh_colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_emprestimos: {
        Row: {
          colaborador_id: string
          created_at: string | null
          data_emprestimo: string
          data_primeira_parcela: string | null
          id: string
          motivo: string | null
          parcelas_pagas: number | null
          quantidade_parcelas: number
          status: string | null
          updated_at: string | null
          valor_parcela: number
          valor_total: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          data_emprestimo?: string
          data_primeira_parcela?: string | null
          id?: string
          motivo?: string | null
          parcelas_pagas?: number | null
          quantidade_parcelas?: number
          status?: string | null
          updated_at?: string | null
          valor_parcela: number
          valor_total: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          data_emprestimo?: string
          data_primeira_parcela?: string | null
          id?: string
          motivo?: string | null
          parcelas_pagas?: number | null
          quantidade_parcelas?: number
          status?: string | null
          updated_at?: string | null
          valor_parcela?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "rh_emprestimos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "rh_colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_pagamentos: {
        Row: {
          ano_referencia: number | null
          asaas_status: string | null
          asaas_transfer_id: string | null
          codigo_lanca: number | null
          codigo_recibo: number | null
          colaborador_id: string
          created_at: string | null
          created_by: string | null
          data_pagamento: string | null
          data_programada: string | null
          descontos: number | null
          dias_ferias: number | null
          dias_trabalhados: number | null
          emprestimo_descontado: number | null
          id: string
          mes_referencia: number | null
          observacoes: string | null
          parcela_13: number | null
          recibo_pdf_url: string | null
          status: string | null
          terco_constitucional: number | null
          tipo: string
          updated_at: string | null
          valor_bruto: number
          valor_diaria_usado: number | null
          valor_liquido: number
        }
        Insert: {
          ano_referencia?: number | null
          asaas_status?: string | null
          asaas_transfer_id?: string | null
          codigo_lanca?: number | null
          codigo_recibo?: number | null
          colaborador_id: string
          created_at?: string | null
          created_by?: string | null
          data_pagamento?: string | null
          data_programada?: string | null
          descontos?: number | null
          dias_ferias?: number | null
          dias_trabalhados?: number | null
          emprestimo_descontado?: number | null
          id?: string
          mes_referencia?: number | null
          observacoes?: string | null
          parcela_13?: number | null
          recibo_pdf_url?: string | null
          status?: string | null
          terco_constitucional?: number | null
          tipo?: string
          updated_at?: string | null
          valor_bruto: number
          valor_diaria_usado?: number | null
          valor_liquido: number
        }
        Update: {
          ano_referencia?: number | null
          asaas_status?: string | null
          asaas_transfer_id?: string | null
          codigo_lanca?: number | null
          codigo_recibo?: number | null
          colaborador_id?: string
          created_at?: string | null
          created_by?: string | null
          data_pagamento?: string | null
          data_programada?: string | null
          descontos?: number | null
          dias_ferias?: number | null
          dias_trabalhados?: number | null
          emprestimo_descontado?: number | null
          id?: string
          mes_referencia?: number | null
          observacoes?: string | null
          parcela_13?: number | null
          recibo_pdf_url?: string | null
          status?: string | null
          terco_constitucional?: number | null
          tipo?: string
          updated_at?: string | null
          valor_bruto?: number
          valor_diaria_usado?: number | null
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "rh_pagamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "rh_colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_emails: {
        Row: {
          attachments: Json | null
          bcc_address: string | null
          cc_address: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          html_content: string
          id: string
          metadata: Json | null
          related_id: string | null
          related_table: string | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
          subject: string
          to_address: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          bcc_address?: string | null
          cc_address?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          html_content: string
          id?: string
          metadata?: Json | null
          related_id?: string | null
          related_table?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          subject: string
          to_address: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          bcc_address?: string | null
          cc_address?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          html_content?: string
          id?: string
          metadata?: Json | null
          related_id?: string | null
          related_table?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          to_address?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      search_feedback: {
        Row: {
          acao_tomada: string | null
          created_at: string | null
          feedback_tipo: string
          id: string
          produto_desejado: string | null
          produto_selecionado_codigo: string | null
          produto_selecionado_descricao: string | null
          produto_selecionado_id: string | null
          produtos_retornados: Json | null
          query_original: string
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          session_id: string | null
          telefone_usuario: string | null
        }
        Insert: {
          acao_tomada?: string | null
          created_at?: string | null
          feedback_tipo: string
          id?: string
          produto_desejado?: string | null
          produto_selecionado_codigo?: string | null
          produto_selecionado_descricao?: string | null
          produto_selecionado_id?: string | null
          produtos_retornados?: Json | null
          query_original: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          session_id?: string | null
          telefone_usuario?: string | null
        }
        Update: {
          acao_tomada?: string | null
          created_at?: string | null
          feedback_tipo?: string
          id?: string
          produto_desejado?: string | null
          produto_selecionado_codigo?: string | null
          produto_selecionado_descricao?: string | null
          produto_selecionado_id?: string | null
          produtos_retornados?: Json | null
          query_original?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          session_id?: string | null
          telefone_usuario?: string | null
        }
        Relationships: []
      }
      sec_apps: {
        Row: {
          app_name: string
          app_type: string | null
          created_at: string | null
          description: string | null
          updated_at: string | null
        }
        Insert: {
          app_name: string
          app_type?: string | null
          created_at?: string | null
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: string
          app_type?: string | null
          created_at?: string | null
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sec_groups: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sec_groups_apps: {
        Row: {
          app_name: string
          created_at: string | null
          group_id: number
          priv_access: string | null
          priv_delete: string | null
          priv_export: string | null
          priv_insert: string | null
          priv_print: string | null
          priv_update: string | null
          priv_view: string | null
          updated_at: string | null
        }
        Insert: {
          app_name: string
          created_at?: string | null
          group_id: number
          priv_access?: string | null
          priv_delete?: string | null
          priv_export?: string | null
          priv_insert?: string | null
          priv_print?: string | null
          priv_update?: string | null
          priv_view?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: string
          created_at?: string | null
          group_id?: number
          priv_access?: string | null
          priv_delete?: string | null
          priv_export?: string | null
          priv_insert?: string | null
          priv_print?: string | null
          priv_update?: string | null
          priv_view?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sec_groups_apps_app_name_fkey"
            columns: ["app_name"]
            isOneToOne: false
            referencedRelation: "sec_apps"
            referencedColumns: ["app_name"]
          },
          {
            foreignKeyName: "sec_groups_apps_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "sec_groups"
            referencedColumns: ["group_id"]
          },
        ]
      }
      sec_logged: {
        Row: {
          date_login: string | null
          ip: string | null
          login: string
          sc_session: string | null
          session_type: string | null
        }
        Insert: {
          date_login?: string | null
          ip?: string | null
          login: string
          sc_session?: string | null
          session_type?: string | null
        }
        Update: {
          date_login?: string | null
          ip?: string | null
          login?: string
          sc_session?: string | null
          session_type?: string | null
        }
        Relationships: []
      }
      sec_users: {
        Row: {
          activation_code: string | null
          active: string | null
          email: string | null
          filename: string | null
          google_email: string | null
          login: string
          mfa: string | null
          mfa_last_updated: string | null
          name: string | null
          phone: string | null
          picture: string | null
          priv_admin: string | null
          pswd: string | null
          pswd_last_updated: string | null
          role: string | null
          size: number | null
          supabase_user_id: string | null
          user_id: number
        }
        Insert: {
          activation_code?: string | null
          active?: string | null
          email?: string | null
          filename?: string | null
          google_email?: string | null
          login: string
          mfa?: string | null
          mfa_last_updated?: string | null
          name?: string | null
          phone?: string | null
          picture?: string | null
          priv_admin?: string | null
          pswd?: string | null
          pswd_last_updated?: string | null
          role?: string | null
          size?: number | null
          supabase_user_id?: string | null
          user_id: number
        }
        Update: {
          activation_code?: string | null
          active?: string | null
          email?: string | null
          filename?: string | null
          google_email?: string | null
          login?: string
          mfa?: string | null
          mfa_last_updated?: string | null
          name?: string | null
          phone?: string | null
          picture?: string | null
          priv_admin?: string | null
          pswd?: string | null
          pswd_last_updated?: string | null
          role?: string | null
          size?: number | null
          supabase_user_id?: string | null
          user_id?: number
        }
        Relationships: []
      }
      sec_users_apps: {
        Row: {
          app_name: string
          login: string
          priv_access: string | null
          priv_delete: string | null
          priv_export: string | null
          priv_insert: string | null
          priv_print: string | null
          priv_update: string | null
          priv_view: string | null
          user_id: number | null
        }
        Insert: {
          app_name: string
          login: string
          priv_access?: string | null
          priv_delete?: string | null
          priv_export?: string | null
          priv_insert?: string | null
          priv_print?: string | null
          priv_update?: string | null
          priv_view?: string | null
          user_id?: number | null
        }
        Update: {
          app_name?: string
          login?: string
          priv_access?: string | null
          priv_delete?: string | null
          priv_export?: string | null
          priv_insert?: string | null
          priv_print?: string | null
          priv_update?: string | null
          priv_view?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sec_users_apps_app_name_fkey"
            columns: ["app_name"]
            isOneToOne: false
            referencedRelation: "sec_apps"
            referencedColumns: ["app_name"]
          },
          {
            foreignKeyName: "sec_users_apps_login_fkey"
            columns: ["login"]
            isOneToOne: false
            referencedRelation: "sec_users"
            referencedColumns: ["login"]
          },
        ]
      }
      sec_users_groups: {
        Row: {
          created_at: string | null
          group_id: number
          login: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: number
          login: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: number
          login?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sec_users_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "sec_groups"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "sec_users_groups_login_fkey"
            columns: ["login"]
            isOneToOne: false
            referencedRelation: "sec_users"
            referencedColumns: ["login"]
          },
        ]
      }
      sinonimos_materiais: {
        Row: {
          categoria: string
          created_at: string | null
          id: string
          sinonimos: string[]
          termo_principal: string
        }
        Insert: {
          categoria: string
          created_at?: string | null
          id?: string
          sinonimos: string[]
          termo_principal: string
        }
        Update: {
          categoria?: string
          created_at?: string | null
          id?: string
          sinonimos?: string[]
          termo_principal?: string
        }
        Relationships: []
      }
      storage_usage_log: {
        Row: {
          bucket_name: string
          created_at: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          operation: string
          user_email: string | null
        }
        Insert: {
          bucket_name: string
          created_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          operation: string
          user_email?: string | null
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          operation?: string
          user_email?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          config_key: string
          config_type: string
          config_value: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_type: string
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_type?: string
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tar_tipo_pix: {
        Row: {
          created_at: string | null
          descricao_pix: string
          id_tipo_pix: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao_pix: string
          id_tipo_pix?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao_pix?: string
          id_tipo_pix?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tarefa_compra: {
        Row: {
          codigo_obra: string
          created_at: string | null
          data_limite: string
          data_tarefa: string | null
          descricao: string
          id_tarefa: number
          jarvis_canal: string | null
          jarvis_instrucoes: string | null
          jarvis_max_tentativas: number | null
          jarvis_mensagem_adicional: string | null
          jarvis_prazo_limite: string | null
          monitorar_jarvis: boolean | null
          monitorar_jarvis_iniciado_em: string | null
          observacoes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_obra: string
          created_at?: string | null
          data_limite: string
          data_tarefa?: string | null
          descricao: string
          id_tarefa?: number
          jarvis_canal?: string | null
          jarvis_instrucoes?: string | null
          jarvis_max_tentativas?: number | null
          jarvis_mensagem_adicional?: string | null
          jarvis_prazo_limite?: string | null
          monitorar_jarvis?: boolean | null
          monitorar_jarvis_iniciado_em?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_obra?: string
          created_at?: string | null
          data_limite?: string
          data_tarefa?: string | null
          descricao?: string
          id_tarefa?: number
          jarvis_canal?: string | null
          jarvis_instrucoes?: string | null
          jarvis_max_tentativas?: number | null
          jarvis_mensagem_adicional?: string | null
          jarvis_prazo_limite?: string | null
          monitorar_jarvis?: boolean | null
          monitorar_jarvis_iniciado_em?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tarefa_compra_doc: {
        Row: {
          codigo_doc: number
          created_at: string | null
          data: string | null
          id_tarefa: number
          login: string | null
          nome_arquivo: string | null
          storage_path: string | null
          tamanho: string | null
          tipo_documento: string | null
        }
        Insert: {
          codigo_doc?: number
          created_at?: string | null
          data?: string | null
          id_tarefa: number
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
        }
        Update: {
          codigo_doc?: number
          created_at?: string | null
          data?: string | null
          id_tarefa?: number
          login?: string | null
          nome_arquivo?: string | null
          storage_path?: string | null
          tamanho?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_compra_doc_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefa_compra"
            referencedColumns: ["id_tarefa"]
          },
        ]
      }
      tarefa_compra_envio_tracking: {
        Row: {
          canal_envio: string | null
          canal_resposta: string | null
          created_at: string | null
          data_conclusao: string | null
          data_envio: string
          data_followup_1: string | null
          data_ultima_cobranca: string | null
          enviado_por: string | null
          id_fornece: number | null
          id_tarefa: number
          id_tarefa_fornecedor: number | null
          id_tracking: number
          numero_followups: number | null
          observacoes: string | null
          perfil_urgencia: string | null
          status_fornecedor: string | null
          updated_at: string | null
        }
        Insert: {
          canal_envio?: string | null
          canal_resposta?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          data_envio?: string
          data_followup_1?: string | null
          data_ultima_cobranca?: string | null
          enviado_por?: string | null
          id_fornece?: number | null
          id_tarefa: number
          id_tarefa_fornecedor?: number | null
          id_tracking?: number
          numero_followups?: number | null
          observacoes?: string | null
          perfil_urgencia?: string | null
          status_fornecedor?: string | null
          updated_at?: string | null
        }
        Update: {
          canal_envio?: string | null
          canal_resposta?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          data_envio?: string
          data_followup_1?: string | null
          data_ultima_cobranca?: string | null
          enviado_por?: string | null
          id_fornece?: number | null
          id_tarefa?: number
          id_tarefa_fornecedor?: number | null
          id_tracking?: number
          numero_followups?: number | null
          observacoes?: string | null
          perfil_urgencia?: string | null
          status_fornecedor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_compra_envio_tracking_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefa_compra"
            referencedColumns: ["id_tarefa"]
          },
          {
            foreignKeyName: "tarefa_compra_envio_tracking_id_tarefa_fornecedor_fkey"
            columns: ["id_tarefa_fornecedor"]
            isOneToOne: false
            referencedRelation: "tarefa_compra_fornecedor"
            referencedColumns: ["id_tarefa_fornecedor"]
          },
        ]
      }
      tarefa_compra_fornecedor: {
        Row: {
          contato: string | null
          created_at: string | null
          data_envio: string | null
          email: string | null
          enviado_email: boolean | null
          enviado_whatsapp: boolean | null
          id_fornece: number | null
          id_tarefa: number
          id_tarefa_fornecedor: number
          numero_fornecedor: number | null
          razao_social: string | null
          selecionado: boolean | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string | null
          data_envio?: string | null
          email?: string | null
          enviado_email?: boolean | null
          enviado_whatsapp?: boolean | null
          id_fornece?: number | null
          id_tarefa: number
          id_tarefa_fornecedor?: number
          numero_fornecedor?: number | null
          razao_social?: string | null
          selecionado?: boolean | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string | null
          data_envio?: string | null
          email?: string | null
          enviado_email?: boolean | null
          enviado_whatsapp?: boolean | null
          id_fornece?: number | null
          id_tarefa?: number
          id_tarefa_fornecedor?: number
          numero_fornecedor?: number | null
          razao_social?: string | null
          selecionado?: boolean | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_compra_fornecedor_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefa_compra"
            referencedColumns: ["id_tarefa"]
          },
        ]
      }
      tarefa_compra_subtarefa: {
        Row: {
          concluida: boolean | null
          created_at: string | null
          descricao: string
          id_subtarefa: number
          id_tarefa: number
          numero_subtarefa: number
        }
        Insert: {
          concluida?: boolean | null
          created_at?: string | null
          descricao: string
          id_subtarefa?: number
          id_tarefa: number
          numero_subtarefa: number
        }
        Update: {
          concluida?: boolean | null
          created_at?: string | null
          descricao?: string
          id_subtarefa?: number
          id_tarefa?: number
          numero_subtarefa?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_compra_subtarefa_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefa_compra"
            referencedColumns: ["id_tarefa"]
          },
        ]
      }
      task_kanban_columns: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          position: number
          slug: string
          status_mapping: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          position?: number
          slug: string
          status_mapping: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          position?: number
          slug?: string
          status_mapping?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tipodoc: {
        Row: {
          descricao: string | null
          tipo_documento: string
          updated_at: string | null
        }
        Insert: {
          descricao?: string | null
          tipo_documento: string
          updated_at?: string | null
        }
        Update: {
          descricao?: string | null
          tipo_documento?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          bank_account_id: string | null
          completed_at: string | null
          counterpart_bank_info: Json | null
          counterpart_document: string | null
          counterpart_name: string | null
          created_at: string | null
          description: string | null
          direction: string
          fee_cents: number | null
          id: string
          reference_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          bank_account_id?: string | null
          completed_at?: string | null
          counterpart_bank_info?: Json | null
          counterpart_document?: string | null
          counterpart_name?: string | null
          created_at?: string | null
          description?: string | null
          direction: string
          fee_cents?: number | null
          id?: string
          reference_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          bank_account_id?: string | null
          completed_at?: string | null
          counterpart_bank_info?: Json | null
          counterpart_document?: string | null
          counterpart_name?: string | null
          created_at?: string | null
          description?: string | null
          direction?: string
          fee_cents?: number | null
          id?: string
          reference_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      transfer_alerts: {
        Row: {
          alerta_enviado_em: string | null
          canal_alerta: string | null
          conta_destino_id: string
          conta_origem_id: string | null
          created_at: string | null
          data_limite: string
          data_saldo_minimo: string | null
          executado_em: string | null
          executado_por: string | null
          id: string
          observacoes: string | null
          pagamentos_relacionados: Json | null
          primeiro_dia_negativo: string | null
          projecao_diaria: Json | null
          saldo_atual: number | null
          saldo_minimo_projetado: number | null
          status: string
          total_pagamentos: number | null
          updated_at: string | null
          valor_necessario: number
        }
        Insert: {
          alerta_enviado_em?: string | null
          canal_alerta?: string | null
          conta_destino_id: string
          conta_origem_id?: string | null
          created_at?: string | null
          data_limite: string
          data_saldo_minimo?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          observacoes?: string | null
          pagamentos_relacionados?: Json | null
          primeiro_dia_negativo?: string | null
          projecao_diaria?: Json | null
          saldo_atual?: number | null
          saldo_minimo_projetado?: number | null
          status?: string
          total_pagamentos?: number | null
          updated_at?: string | null
          valor_necessario: number
        }
        Update: {
          alerta_enviado_em?: string | null
          canal_alerta?: string | null
          conta_destino_id?: string
          conta_origem_id?: string | null
          created_at?: string | null
          data_limite?: string
          data_saldo_minimo?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          observacoes?: string | null
          pagamentos_relacionados?: Json | null
          primeiro_dia_negativo?: string | null
          projecao_diaria?: Json | null
          saldo_atual?: number | null
          saldo_minimo_projetado?: number | null
          status?: string
          total_pagamentos?: number | null
          updated_at?: string | null
          valor_necessario?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_alerts_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_alerts_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade: {
        Row: {
          descricao: string | null
          tipounidade: string
        }
        Insert: {
          descricao?: string | null
          tipounidade: string
        }
        Update: {
          descricao?: string | null
          tipounidade?: string
        }
        Relationships: []
      }
      user_active_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          device_type: string
          id: string
          ip_address: string | null
          last_activity: string | null
          session_context: string
          session_token: string
          user_email: string
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          device_type?: string
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          session_context?: string
          session_token: string
          user_email: string
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          device_type?: string
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          session_context?: string
          session_token?: string
          user_email?: string
        }
        Relationships: []
      }
      user_limits: {
        Row: {
          created_at: string
          current_usage: number
          id: string
          last_reset_at: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_usage?: number
          id?: string
          last_reset_at?: string
          monthly_limit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_usage?: number
          id?: string
          last_reset_at?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_obras: {
        Row: {
          codigo_obra: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          codigo_obra: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          codigo_obra?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_signature_images: {
        Row: {
          created_at: string | null
          file_size: number | null
          filename: string
          id: string
          image_type: string | null
          mime_type: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          image_type?: string | null
          mime_type?: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          image_type?: string | null
          mime_type?: string | null
          public_url?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_signatures: {
        Row: {
          created_at: string | null
          email_signature_enabled: boolean | null
          email_signature_html: string | null
          id: string
          updated_at: string | null
          user_id: string
          whatsapp_signature_enabled: boolean | null
          whatsapp_signature_text: string | null
        }
        Insert: {
          created_at?: string | null
          email_signature_enabled?: boolean | null
          email_signature_html?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          whatsapp_signature_enabled?: boolean | null
          whatsapp_signature_text?: string | null
        }
        Update: {
          created_at?: string | null
          email_signature_enabled?: boolean | null
          email_signature_html?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          whatsapp_signature_enabled?: boolean | null
          whatsapp_signature_text?: string | null
        }
        Relationships: []
      }
      user_task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          is_system: boolean | null
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_task_history: {
        Row: {
          action: string
          created_at: string | null
          from_value: string | null
          id: string
          notes: string | null
          performed_by: string | null
          task_id: string
          to_value: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          task_id: string
          to_value?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          task_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          assignee_user_id: string
          category: string | null
          completed_at: string | null
          context_id: string | null
          context_title: string | null
          context_type: string | null
          created_at: string | null
          creator_user_id: string
          due_date: string | null
          due_datetime: string | null
          google_sync_error: string | null
          google_task_id: string | null
          google_tasklist_id: string | null
          id: string
          kanban_column_id: string | null
          kanban_moved_at: string | null
          kanban_position: number | null
          last_synced_at: string | null
          notes: string | null
          priority: string | null
          status: string | null
          synced_to_google: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_user_id: string
          category?: string | null
          completed_at?: string | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string | null
          created_at?: string | null
          creator_user_id: string
          due_date?: string | null
          due_datetime?: string | null
          google_sync_error?: string | null
          google_task_id?: string | null
          google_tasklist_id?: string | null
          id?: string
          kanban_column_id?: string | null
          kanban_moved_at?: string | null
          kanban_position?: number | null
          last_synced_at?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          synced_to_google?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_user_id?: string
          category?: string | null
          completed_at?: string | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string | null
          created_at?: string | null
          creator_user_id?: string
          due_date?: string | null
          due_datetime?: string | null
          google_sync_error?: string | null
          google_task_id?: string | null
          google_tasklist_id?: string | null
          id?: string
          kanban_column_id?: string | null
          kanban_moved_at?: string | null
          kanban_position?: number | null
          last_synced_at?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          synced_to_google?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_kanban_column_id_fkey"
            columns: ["kanban_column_id"]
            isOneToOne: false
            referencedRelation: "task_kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      virus_scan_cache: {
        Row: {
          created_at: string | null
          detections: string[] | null
          expires_at: string
          hash: string
          id: string
          scanned_at: string
          stats: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          detections?: string[] | null
          expires_at: string
          hash: string
          id?: string
          scanned_at: string
          stats?: Json | null
          status: string
        }
        Update: {
          created_at?: string | null
          detections?: string[] | null
          expires_at?: string
          hash?: string
          id?: string
          scanned_at?: string
          stats?: Json | null
          status?: string
        }
        Relationships: []
      }
      whatsapp_agent_queue: {
        Row: {
          attempts: number | null
          colaborador: Json
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone: string
          session_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number | null
          colaborador: Json
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone: string
          session_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number | null
          colaborador?: Json
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string
          session_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      whatsapp_agent_sessions: {
        Row: {
          colaborador_id: number | null
          colaborador_nome: string | null
          created_at: string
          id: string
          messages: Json
          phone: string
          session_data: Json
          status: string
          updated_at: string
        }
        Insert: {
          colaborador_id?: number | null
          colaborador_nome?: string | null
          created_at?: string
          id?: string
          messages?: Json
          phone: string
          session_data?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: number | null
          colaborador_nome?: string | null
          created_at?: string
          id?: string
          messages?: Json
          phone?: string
          session_data?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_automation_logs: {
        Row: {
          action_taken: string | null
          automation_id: string
          conversation_id: string
          created_at: string | null
          error_message: string | null
          id: string
          new_state: Json | null
          previous_state: Json | null
          status: string | null
          trigger_reason: string | null
        }
        Insert: {
          action_taken?: string | null
          automation_id: string
          conversation_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          status?: string | null
          trigger_reason?: string | null
        }
        Update: {
          action_taken?: string | null
          automation_id?: string
          conversation_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          status?: string | null
          trigger_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_fiscal_documents: {
        Row: {
          arquivos: Json | null
          bot_session_id: string | null
          created_at: string | null
          erro_mensagem: string | null
          fornecedor_id: number | null
          fornecedor_nome: string | null
          id: string
          lanca_id: number | null
          numero_nf: string | null
          processado_em: string | null
          processado_por: string | null
          status: string | null
          tipo_documento: string | null
          updated_at: string | null
          valor: number | null
          vencimento: string | null
        }
        Insert: {
          arquivos?: Json | null
          bot_session_id?: string | null
          created_at?: string | null
          erro_mensagem?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          id?: string
          lanca_id?: number | null
          numero_nf?: string | null
          processado_em?: string | null
          processado_por?: string | null
          status?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
          valor?: number | null
          vencimento?: string | null
        }
        Update: {
          arquivos?: Json | null
          bot_session_id?: string | null
          created_at?: string | null
          erro_mensagem?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          id?: string
          lanca_id?: number | null
          numero_nf?: string | null
          processado_em?: string | null
          processado_por?: string | null
          status?: string | null
          tipo_documento?: string | null
          updated_at?: string | null
          valor?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_fiscal_documents_bot_session_id_fkey"
            columns: ["bot_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bot_fiscal_documents_lanca_id_fkey"
            columns: ["lanca_id"]
            isOneToOne: false
            referencedRelation: "lanca"
            referencedColumns: ["codigo_lanca"]
          },
        ]
      }
      whatsapp_bot_interactions: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string | null
          id: string
          intent_detected: string | null
          message_id: string | null
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          confidence_score?: number | null
          content: string
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          message_id?: string | null
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          message_id?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_interactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bot_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_material_requests: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          bot_session_id: string | null
          created_at: string | null
          data_necessidade: string | null
          id: string
          itens: Json
          obra_codigo: string | null
          observacoes: string | null
          requisicao_id: number | null
          solicitante_funcao: string | null
          solicitante_nome: string
          solicitante_telefone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          bot_session_id?: string | null
          created_at?: string | null
          data_necessidade?: string | null
          id?: string
          itens?: Json
          obra_codigo?: string | null
          observacoes?: string | null
          requisicao_id?: number | null
          solicitante_funcao?: string | null
          solicitante_nome: string
          solicitante_telefone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          bot_session_id?: string | null
          created_at?: string | null
          data_necessidade?: string | null
          id?: string
          itens?: Json
          obra_codigo?: string | null
          observacoes?: string | null
          requisicao_id?: number | null
          solicitante_funcao?: string | null
          solicitante_nome?: string
          solicitante_telefone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_material_requests_bot_session_id_fkey"
            columns: ["bot_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bot_material_requests_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicao"
            referencedColumns: ["id_requisicao"]
          },
        ]
      }
      whatsapp_bot_sessions: {
        Row: {
          contact_id: string | null
          contexto: Json | null
          conversation_id: string | null
          created_at: string | null
          current_step: string | null
          department_id: string | null
          id: string
          itens_coletados: Json | null
          session_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contact_id?: string | null
          contexto?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          current_step?: string | null
          department_id?: string | null
          id?: string
          itens_coletados?: Json | null
          session_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string | null
          contexto?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          current_step?: string | null
          department_id?: string | null
          id?: string
          itens_coletados?: Json | null
          session_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bot_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bot_sessions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_supplier_proposals: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          arquivos_anexos: Json | null
          assunto: string
          bot_session_id: string | null
          categoria: string | null
          cnpj: string | null
          created_at: string | null
          descricao: string | null
          email: string | null
          fornecedor_id: number | null
          fornecedor_nome: string
          id: string
          observacoes: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          arquivos_anexos?: Json | null
          assunto: string
          bot_session_id?: string | null
          categoria?: string | null
          cnpj?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          fornecedor_id?: number | null
          fornecedor_nome: string
          id?: string
          observacoes?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          arquivos_anexos?: Json | null
          assunto?: string
          bot_session_id?: string | null
          categoria?: string | null
          cnpj?: string | null
          created_at?: string | null
          descricao?: string | null
          email?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string
          id?: string
          observacoes?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_supplier_proposals_bot_session_id_fkey"
            columns: ["bot_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcast_lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          recipient_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          recipient_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          recipient_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_lists_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcast_messages: {
        Row: {
          broadcast_id: string | null
          content: string
          content_type: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          media_url: string | null
          read_count: number | null
          sent_at: string | null
          sent_by: string | null
          sent_count: number | null
          status: string | null
          total_recipients: number | null
        }
        Insert: {
          broadcast_id?: string | null
          content: string
          content_type?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          media_url?: string | null
          read_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
        }
        Update: {
          broadcast_id?: string | null
          content?: string
          content_type?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          media_url?: string | null
          read_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_messages_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcast_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcast_recipients: {
        Row: {
          added_at: string | null
          broadcast_id: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string
          id: string
          id_fornece: number | null
        }
        Insert: {
          added_at?: string | null
          broadcast_id?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone: string
          id?: string
          id_fornece?: number | null
        }
        Update: {
          added_at?: string | null
          broadcast_id?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          id?: string
          id_fornece?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcast_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcast_sends: {
        Row: {
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          read_at: string | null
          recipient_name: string | null
          recipient_phone: string
          sent_at: string | null
          status: string | null
          zapi_message_id: string | null
        }
        Insert: {
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_sends_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcast_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          config_key: string
          config_value: string
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          company: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          id_fornece: number | null
          is_blocked: boolean | null
          last_conversation_at: string | null
          lid: string | null
          lid_updated_at: string | null
          name: string | null
          notes: string | null
          phone: string
          profile_pic: string | null
          tags: string[] | null
          total_conversations: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          id_fornece?: number | null
          is_blocked?: boolean | null
          last_conversation_at?: string | null
          lid?: string | null
          lid_updated_at?: string | null
          name?: string | null
          notes?: string | null
          phone: string
          profile_pic?: string | null
          tags?: string[] | null
          total_conversations?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          id_fornece?: number | null
          is_blocked?: boolean | null
          last_conversation_at?: string | null
          lid?: string | null
          lid_updated_at?: string | null
          name?: string | null
          notes?: string | null
          phone?: string
          profile_pic?: string | null
          tags?: string[] | null
          total_conversations?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_id_fornece_fkey"
            columns: ["id_fornece"]
            isOneToOne: false
            referencedRelation: "fornecedor"
            referencedColumns: ["id_fornece"]
          },
          {
            foreignKeyName: "whatsapp_contacts_id_fornece_fkey"
            columns: ["id_fornece"]
            isOneToOne: false
            referencedRelation: "whatsapp_fornecedor_contacts"
            referencedColumns: ["id_fornece"]
          },
        ]
      }
      whatsapp_conversation_history: {
        Row: {
          action: string
          conversation_id: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          automation_paused: boolean | null
          automation_paused_until: string | null
          chat_lid: string | null
          contact_avatar_url: string | null
          contact_id: string | null
          contact_lid: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          department_id: string | null
          expected_close_date: string | null
          first_agent_message_at: string | null
          first_message_at: string | null
          id: string
          id_fornece: number | null
          is_muted: boolean | null
          kanban_column_id: string | null
          kanban_moved_at: string | null
          kanban_moved_by: string | null
          kanban_position: number | null
          last_agent_message_at: string | null
          last_customer_message_at: string | null
          last_message_at: string | null
          lid_updated_at: string | null
          metadata: Json | null
          muted_until: string | null
          notes: string | null
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_id: string | null
          source_module: string | null
          status: string | null
          tags: string[] | null
          total_messages: number | null
          unread_count: number | null
          updated_at: string | null
          value: number | null
          waiting_since: string | null
        }
        Insert: {
          assigned_to?: string | null
          automation_paused?: boolean | null
          automation_paused_until?: string | null
          chat_lid?: string | null
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_lid?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          department_id?: string | null
          expected_close_date?: string | null
          first_agent_message_at?: string | null
          first_message_at?: string | null
          id?: string
          id_fornece?: number | null
          is_muted?: boolean | null
          kanban_column_id?: string | null
          kanban_moved_at?: string | null
          kanban_moved_by?: string | null
          kanban_position?: number | null
          last_agent_message_at?: string | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          lid_updated_at?: string | null
          metadata?: Json | null
          muted_until?: string | null
          notes?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_module?: string | null
          status?: string | null
          tags?: string[] | null
          total_messages?: number | null
          unread_count?: number | null
          updated_at?: string | null
          value?: number | null
          waiting_since?: string | null
        }
        Update: {
          assigned_to?: string | null
          automation_paused?: boolean | null
          automation_paused_until?: string | null
          chat_lid?: string | null
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_lid?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          department_id?: string | null
          expected_close_date?: string | null
          first_agent_message_at?: string | null
          first_message_at?: string | null
          id?: string
          id_fornece?: number | null
          is_muted?: boolean | null
          kanban_column_id?: string | null
          kanban_moved_at?: string | null
          kanban_moved_by?: string | null
          kanban_position?: number | null
          last_agent_message_at?: string | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          lid_updated_at?: string | null
          metadata?: Json | null
          muted_until?: string | null
          notes?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_module?: string | null
          status?: string | null
          tags?: string[] | null
          total_messages?: number | null
          unread_count?: number | null
          updated_at?: string | null
          value?: number | null
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_id_fornece_fkey"
            columns: ["id_fornece"]
            isOneToOne: false
            referencedRelation: "fornecedor"
            referencedColumns: ["id_fornece"]
          },
          {
            foreignKeyName: "whatsapp_conversations_id_fornece_fkey"
            columns: ["id_fornece"]
            isOneToOne: false
            referencedRelation: "whatsapp_fornecedor_contacts"
            referencedColumns: ["id_fornece"]
          },
          {
            foreignKeyName: "whatsapp_conversations_kanban_column_id_fkey"
            columns: ["kanban_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_kanban_column_id_fkey"
            columns: ["kanban_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns_view"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_department_users: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          max_concurrent_chats: number | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_chats?: number | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_chats?: number | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_department_users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_departments: {
        Row: {
          auto_assign: boolean | null
          away_message: string | null
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          forward_number: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          max_concurrent_chats: number | null
          name: string
          sort_order: number | null
          updated_at: string | null
          welcome_message: string | null
          working_hours: Json | null
        }
        Insert: {
          auto_assign?: boolean | null
          away_message?: string | null
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          forward_number?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_chats?: number | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          welcome_message?: string | null
          working_hours?: Json | null
        }
        Update: {
          auto_assign?: boolean | null
          away_message?: string | null
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          forward_number?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_chats?: number | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          welcome_message?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      whatsapp_group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_mentions: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          is_read: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          is_read?: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          is_read?: boolean | null
          mentioned_by?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_mentions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_group_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          group_id: string
          id: string
          message_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          group_id: string
          id?: string
          message_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          group_id?: string
          id?: string
          message_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_message_reactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_group_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_messages: {
        Row: {
          content: string | null
          content_type: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          group_id: string | null
          id: string
          is_deleted: boolean | null
          is_pinned: boolean | null
          is_starred: boolean | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          pinned_at: string | null
          pinned_by: string | null
          quoted_message_id: string | null
          sender_id: string | null
          transcription: string | null
          transcription_error: string | null
          transcription_status: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          is_starred?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          quoted_message_id?: string | null
          sender_id?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_status?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          is_starred?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          quoted_message_id?: string | null
          sender_id?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_group_messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_poll_options: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: string
          poll_id: string
          sort_order: number | null
          text: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          poll_id: string
          sort_order?: number | null
          text: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          poll_id?: string
          sort_order?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_group_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_group_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_polls: {
        Row: {
          allows_add_options: boolean | null
          created_at: string | null
          created_by: string
          ends_at: string | null
          group_id: string
          id: string
          is_anonymous: boolean | null
          is_closed: boolean | null
          is_multiple_choice: boolean | null
          message_id: string | null
          question: string
        }
        Insert: {
          allows_add_options?: boolean | null
          created_at?: string | null
          created_by: string
          ends_at?: string | null
          group_id: string
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_multiple_choice?: boolean | null
          message_id?: string | null
          question: string
        }
        Update: {
          allows_add_options?: boolean | null
          created_at?: string | null
          created_by?: string
          ends_at?: string | null
          group_id?: string
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_multiple_choice?: boolean | null
          message_id?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_group_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_read_status: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          last_read_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          last_read_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          last_read_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_read_status_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_groups: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_kanban_automations: {
        Row: {
          action_column_id: string | null
          action_notify_message: string | null
          action_notify_users: string[] | null
          action_priority: string | null
          action_tags: string[] | null
          action_type: string
          board_id: string | null
          condition_business_hours_only: boolean | null
          condition_department_id: string | null
          condition_has_unread: boolean | null
          condition_priority: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          trigger_column_id: string | null
          trigger_tags: string[] | null
          trigger_type: string
          trigger_value: number | null
          updated_at: string | null
        }
        Insert: {
          action_column_id?: string | null
          action_notify_message?: string | null
          action_notify_users?: string[] | null
          action_priority?: string | null
          action_tags?: string[] | null
          action_type: string
          board_id?: string | null
          condition_business_hours_only?: boolean | null
          condition_department_id?: string | null
          condition_has_unread?: boolean | null
          condition_priority?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          trigger_column_id?: string | null
          trigger_tags?: string[] | null
          trigger_type: string
          trigger_value?: number | null
          updated_at?: string | null
        }
        Update: {
          action_column_id?: string | null
          action_notify_message?: string | null
          action_notify_users?: string[] | null
          action_priority?: string | null
          action_tags?: string[] | null
          action_type?: string
          board_id?: string | null
          condition_business_hours_only?: boolean | null
          condition_department_id?: string | null
          condition_has_unread?: boolean | null
          condition_priority?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          trigger_column_id?: string | null
          trigger_tags?: string[] | null
          trigger_type?: string
          trigger_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_kanban_automations_action_column_id_fkey"
            columns: ["action_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_automations_action_column_id_fkey"
            columns: ["action_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_automations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_automations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_automations_condition_department_id_fkey"
            columns: ["condition_department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_automations_trigger_column_id_fkey"
            columns: ["trigger_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_automations_trigger_column_id_fkey"
            columns: ["trigger_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns_view"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_kanban_board_departments: {
        Row: {
          board_id: string
          created_at: string | null
          department_id: string
          id: string
          is_primary: boolean | null
          settings: Json | null
        }
        Insert: {
          board_id: string
          created_at?: string | null
          department_id: string
          id?: string
          is_primary?: boolean | null
          settings?: Json | null
        }
        Update: {
          board_id?: string
          created_at?: string | null
          department_id?: string
          id?: string
          is_primary?: boolean | null
          settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_kanban_board_departments_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_board_departments_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_board_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_kanban_boards: {
        Row: {
          background_color: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_kanban_columns: {
        Row: {
          auto_archive_days: number | null
          auto_assign_agent: boolean | null
          auto_move_after_hours: number | null
          auto_move_to_column_id: string | null
          background_color: string | null
          board_id: string | null
          color: string | null
          conversation_status: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_closed: boolean | null
          is_default: boolean | null
          is_final: boolean | null
          metadata: Json | null
          name: string
          position: number
          slug: string
          updated_at: string | null
          wip_limit: number | null
        }
        Insert: {
          auto_archive_days?: number | null
          auto_assign_agent?: boolean | null
          auto_move_after_hours?: number | null
          auto_move_to_column_id?: string | null
          background_color?: string | null
          board_id?: string | null
          color?: string | null
          conversation_status?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          is_default?: boolean | null
          is_final?: boolean | null
          metadata?: Json | null
          name: string
          position?: number
          slug: string
          updated_at?: string | null
          wip_limit?: number | null
        }
        Update: {
          auto_archive_days?: number | null
          auto_assign_agent?: boolean | null
          auto_move_after_hours?: number | null
          auto_move_to_column_id?: string | null
          background_color?: string | null
          board_id?: string | null
          color?: string | null
          conversation_status?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          is_default?: boolean | null
          is_final?: boolean | null
          metadata?: Json | null
          name?: string
          position?: number
          slug?: string
          updated_at?: string | null
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_kanban_columns_auto_move_to_column_id_fkey"
            columns: ["auto_move_to_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_auto_move_to_column_id_fkey"
            columns: ["auto_move_to_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_kanban_history: {
        Row: {
          conversation_id: string
          created_at: string | null
          from_board_id: string | null
          from_column_id: string | null
          id: string
          metadata: Json | null
          move_type: string | null
          moved_by: string | null
          moved_by_name: string | null
          notes: string | null
          reason: string | null
          to_board_id: string | null
          to_column_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          from_board_id?: string | null
          from_column_id?: string | null
          id?: string
          metadata?: Json | null
          move_type?: string | null
          moved_by?: string | null
          moved_by_name?: string | null
          notes?: string | null
          reason?: string | null
          to_board_id?: string | null
          to_column_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          from_board_id?: string | null
          from_column_id?: string | null
          id?: string
          metadata?: Json | null
          move_type?: string | null
          moved_by?: string | null
          moved_by_name?: string | null
          notes?: string | null
          reason?: string | null
          to_board_id?: string | null
          to_column_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_kanban_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_from_board_id_fkey"
            columns: ["from_board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_from_board_id_fkey"
            columns: ["from_board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_from_column_id_fkey"
            columns: ["from_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_from_column_id_fkey"
            columns: ["from_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_to_board_id_fkey"
            columns: ["to_board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_to_board_id_fkey"
            columns: ["to_board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_to_column_id_fkey"
            columns: ["to_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_history_to_column_id_fkey"
            columns: ["to_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns_view"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_kanban_icons: {
        Row: {
          category: string | null
          created_at: string | null
          icon_type: string | null
          icon_value: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          label: string
          name: string
          position: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          icon_type?: string | null
          icon_value: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label: string
          name: string
          position?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          icon_type?: string | null
          icon_value?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label?: string
          name?: string
          position?: number | null
        }
        Relationships: []
      }
      whatsapp_lid_mapping: {
        Row: {
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          lid: string
          phone: string
          source: string | null
        }
        Insert: {
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          lid: string
          phone: string
          source?: string | null
        }
        Update: {
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          lid?: string
          phone?: string
          source?: string | null
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          from_name: string | null
          from_number: string
          id: string
          message_content: string | null
          sent_at: string | null
          status: string | null
          to_number: string
          to_sector: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          from_name?: string | null
          from_number: string
          id?: string
          message_content?: string | null
          sent_at?: string | null
          status?: string | null
          to_number: string
          to_sector?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          from_name?: string | null
          from_number?: string
          id?: string
          message_content?: string | null
          sent_at?: string | null
          status?: string | null
          to_number?: string
          to_sector?: string | null
        }
        Relationships: []
      }
      whatsapp_message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          contact_data: Json | null
          contact_name: string | null
          contact_phone: string | null
          contact_vcard: string | null
          content: string | null
          content_type: string | null
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          direction: string
          external_id: string | null
          id: string
          is_deleted: boolean | null
          is_private_note: boolean | null
          is_starred: boolean | null
          link_preview: Json | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          metadata: Json | null
          quoted_message_id: string | null
          sender_id: string | null
          sender_lid: string | null
          sender_name: string | null
          sender_phone: string | null
          sender_type: string
          status: string | null
          transcription: string | null
          transcription_error: string | null
          transcription_status: string | null
        }
        Insert: {
          contact_data?: Json | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_vcard?: string | null
          content?: string | null
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          direction: string
          external_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_private_note?: boolean | null
          is_starred?: boolean | null
          link_preview?: Json | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          quoted_message_id?: string | null
          sender_id?: string | null
          sender_lid?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_type: string
          status?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_status?: string | null
        }
        Update: {
          contact_data?: Json | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_vcard?: string | null
          content?: string | null
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          direction?: string
          external_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_private_note?: boolean | null
          is_starred?: boolean | null
          link_preview?: Json | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          quoted_message_id?: string | null
          sender_id?: string | null
          sender_lid?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_type?: string
          status?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_phone_locks: {
        Row: {
          lock_id: string
          locked_at: string
          phone: string
        }
        Insert: {
          lock_id: string
          locked_at?: string
          phone: string
        }
        Update: {
          lock_id?: string
          locked_at?: string
          phone?: string
        }
        Relationships: []
      }
      whatsapp_quick_replies: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          is_global: boolean | null
          shortcut: string
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_global?: boolean | null
          shortcut: string
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_global?: boolean | null
          shortcut?: string
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_replies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_scheduled_message_logs: {
        Row: {
          api_response: Json | null
          attempt_number: number | null
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          execution_duration_ms: number | null
          id: string
          scheduled_for: string
          scheduled_message_id: string
          sent_message_id: string | null
          status: string
        }
        Insert: {
          api_response?: Json | null
          attempt_number?: number | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_duration_ms?: number | null
          id?: string
          scheduled_for: string
          scheduled_message_id: string
          sent_message_id?: string | null
          status: string
        }
        Update: {
          api_response?: Json | null
          attempt_number?: number | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_duration_ms?: number | null
          id?: string
          scheduled_for?: string
          scheduled_message_id?: string
          sent_message_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_scheduled_message_logs_scheduled_message_id_fkey"
            columns: ["scheduled_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_scheduled_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_message_logs_scheduled_message_id_fkey"
            columns: ["scheduled_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_scheduled_messages_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_message_logs_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_scheduled_messages: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          content: string | null
          content_type: string
          conversation_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          error_message: string | null
          executions_count: number | null
          id: string
          is_recurring: boolean | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          metadata: Json | null
          notes: string | null
          quoted_message_id: string | null
          recurrence_count: number | null
          recurrence_days: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          scheduled_at: string
          sent_at: string | null
          sent_message_id: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          content?: string | null
          content_type?: string
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          error_message?: string | null
          executions_count?: number | null
          id?: string
          is_recurring?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          notes?: string | null
          quoted_message_id?: string | null
          recurrence_count?: number | null
          recurrence_days?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          scheduled_at: string
          sent_at?: string | null
          sent_message_id?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          content?: string | null
          content_type?: string
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          error_message?: string | null
          executions_count?: number | null
          id?: string
          is_recurring?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          notes?: string | null
          quoted_message_id?: string | null
          recurrence_count?: number | null
          recurrence_days?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          scheduled_at?: string
          sent_at?: string | null
          sent_message_id?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_scheduled_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          contact_name: string | null
          created_at: string | null
          current_state: string | null
          id: string
          last_activity: string | null
          menu_config: Json | null
          pending_messages: Json | null
          phone_number: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          current_state?: string | null
          id?: string
          last_activity?: string | null
          menu_config?: Json | null
          pending_messages?: Json | null
          phone_number: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          current_state?: string | null
          id?: string
          last_activity?: string | null
          menu_config?: Json | null
          pending_messages?: Json | null
          phone_number?: string
        }
        Relationships: []
      }
      whatsapp_tags: {
        Row: {
          color: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tags_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_transfer_requests: {
        Row: {
          conversation_id: string
          created_at: string | null
          current_department_id: string | null
          id: string
          note: string | null
          requested_by: string
          requested_by_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_department_id: string | null
          target_user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          current_department_id?: string | null
          id?: string
          note?: string | null
          requested_by: string
          requested_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_department_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          current_department_id?: string | null
          id?: string
          note?: string | null
          requested_by?: string
          requested_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_department_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_transfer_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_transfer_requests_current_department_id_fkey"
            columns: ["current_department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_transfer_requests_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_user_departments: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_user_status: {
        Row: {
          current_chats_count: number | null
          custom_status: string | null
          id: string
          last_seen: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          current_chats_count?: number | null
          custom_status?: string | null
          id?: string
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          current_chats_count?: number | null
          custom_status?: string | null
          id?: string
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      rh_conta_corrente_view: {
        Row: {
          colaborador_id: string | null
          credito: number | null
          data: string | null
          debito: number | null
          descricao: string | null
          origem: string | null
          origem_id: string | null
        }
        Relationships: []
      }
      scheduled_emails_view: {
        Row: {
          attachments: Json | null
          bcc_address: string | null
          cc_address: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          error_message: string | null
          html_content: string | null
          id: string | null
          metadata: Json | null
          related_id: string | null
          related_table: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          to_address: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      user_tasks_with_details: {
        Row: {
          assignee_name: string | null
          assignee_user_id: string | null
          category: string | null
          comments_count: number | null
          completed_at: string | null
          context_id: string | null
          context_title: string | null
          context_type: string | null
          created_at: string | null
          creator_name: string | null
          creator_user_id: string | null
          due_date: string | null
          due_datetime: string | null
          google_sync_error: string | null
          google_task_id: string | null
          google_tasklist_id: string | null
          id: string | null
          kanban_column_color: string | null
          kanban_column_icon: string | null
          kanban_column_id: string | null
          kanban_column_name: string | null
          kanban_moved_at: string | null
          kanban_position: number | null
          last_synced_at: string | null
          notes: string | null
          priority: string | null
          status: string | null
          synced_to_google: boolean | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_kanban_column_id_fkey"
            columns: ["kanban_column_id"]
            isOneToOne: false
            referencedRelation: "task_kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      v_auth_migration_status: {
        Row: {
          migrated_users: number | null
          migration_percentage: number | null
          pending_users: number | null
          total_users: number | null
        }
        Relationships: []
      }
      v_migration_summary: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string | null
          new_dimensions: number | null
          new_model: string | null
          old_dimensions: number | null
          old_model: string | null
          produtos_com_erro: number | null
          produtos_com_sucesso: number | null
          produtos_processados: number | null
          started_at: string | null
          status: string | null
          tempo_decorrido_segundos: number | null
          total_produtos: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string | null
          new_dimensions?: number | null
          new_model?: string | null
          old_dimensions?: number | null
          old_model?: string | null
          produtos_com_erro?: number | null
          produtos_com_sucesso?: number | null
          produtos_processados?: number | null
          started_at?: string | null
          status?: string | null
          tempo_decorrido_segundos?: never
          total_produtos?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string | null
          new_dimensions?: number | null
          new_model?: string | null
          old_dimensions?: number | null
          old_model?: string | null
          produtos_com_erro?: number | null
          produtos_com_sucesso?: number | null
          produtos_processados?: number | null
          started_at?: string | null
          status?: string | null
          tempo_decorrido_segundos?: never
          total_produtos?: number | null
        }
        Relationships: []
      }
      v_regeneracao_summary: {
        Row: {
          completed_at: string | null
          custo_total_usd: number | null
          entidade: string | null
          erros: number | null
          id: string | null
          logs_erro: number | null
          logs_sucesso: number | null
          modo: string | null
          processados: number | null
          progresso_percentual: number | null
          started_at: string | null
          status: string | null
          sucessos: number | null
          tempo_decorrido_segundos: number | null
          tempo_medio_ms: number | null
          total_registros: number | null
        }
        Relationships: []
      }
      whatsapp_fornecedor_contacts: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id_fornece: number | null
          name: string | null
          phone: string | null
          telefone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id_fornece?: number | null
          name?: string | null
          phone?: never
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id_fornece?: number | null
          name?: string | null
          phone?: never
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      whatsapp_kanban_boards_view: {
        Row: {
          background_color: string | null
          color: string | null
          column_count: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          department_count: number | null
          departments: Json | null
          description: string | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      whatsapp_kanban_columns_view: {
        Row: {
          auto_archive_days: number | null
          auto_assign_agent: boolean | null
          auto_move_after_hours: number | null
          auto_move_to_column_id: string | null
          background_color: string | null
          board_id: string | null
          board_name: string | null
          card_count: number | null
          color: string | null
          conversation_status: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          is_closed: boolean | null
          is_default: boolean | null
          is_final: boolean | null
          metadata: Json | null
          name: string | null
          position: number | null
          slug: string | null
          updated_at: string | null
          wip_limit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_kanban_columns_auto_move_to_column_id_fkey"
            columns: ["auto_move_to_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_auto_move_to_column_id_fkey"
            columns: ["auto_move_to_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_boards_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_scheduled_messages_view: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          content: string | null
          content_type: string | null
          conversation_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          department_code: string | null
          department_id: string | null
          department_name: string | null
          error_message: string | null
          executions_count: number | null
          id: string | null
          is_recurring: boolean | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          metadata: Json | null
          notes: string | null
          quoted_message_id: string | null
          recurrence_count: number | null
          recurrence_days: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_message_id: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_scheduled_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_scheduled_messages_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _is_mobile_device: { Args: { p_device_info: string }; Returns: boolean }
      acquire_phone_lock: {
        Args: { p_lock_id: string; p_phone: string; p_timeout_seconds?: number }
        Returns: boolean
      }
      add_whatsapp_message: {
        Args: {
          p_content?: string
          p_content_type?: string
          p_conversation_id: string
          p_direction: string
          p_media_filename?: string
          p_media_mime_type?: string
          p_media_url?: string
          p_reply_to?: string
          p_sender_id?: string
          p_sender_phone: string
          p_sender_type: string
        }
        Returns: string
      }
      buscar_obra_por_similaridade: {
        Args: { p_limit?: number; p_nome: string; p_threshold?: number }
        Returns: {
          cep_obra: string
          cgc_cobranca: string
          cidade_obra: string
          codigo_obra: string
          complemento_obra: string
          numero_obra: string
          razao_social_faturamento: string
          rua_obra: string
          similarity: number
        }[]
      }
      check_obra_access: { Args: { p_codigo_obra: string }; Returns: boolean }
      check_permissions: {
        Args: { p_app_name: string; p_email: string }
        Returns: Json
      }
      check_user_group: { Args: never; Returns: number[] }
      cleanup_old_agent_queue: { Args: never; Returns: number }
      cleanup_phone_locks: { Args: never; Returns: number }
      create_conversation_from_module: {
        Args: {
          p_department_code?: string
          p_id_fornece?: number
          p_media_filename?: string
          p_media_mime_type?: string
          p_media_url?: string
          p_message?: string
          p_phone: string
          p_sender_user_id?: string
          p_source_id?: string
          p_source_module?: string
        }
        Returns: string
      }
      create_system_notification: {
        Args: {
          p_assigned_to?: string
          p_contact_name?: string
          p_contact_phone: string
          p_department_code?: string
          p_message?: string
          p_source_id?: string
          p_source_module?: string
        }
        Returns: string
      }
      create_whatsapp_conversation: {
        Args: {
          p_contact_name: string
          p_contact_phone: string
          p_content_type?: string
          p_department_code: string
          p_id_fornece?: number
          p_initial_message: string
          p_media_filename?: string
          p_media_mime_type?: string
          p_media_url?: string
        }
        Returns: string
      }
      cron_check_tasks: { Args: never; Returns: undefined }
      exec_sql: { Args: { sql: string }; Returns: undefined }
      exec_sql_query: { Args: { sql: string }; Returns: Json }
      exec_sql_rate_limited: { Args: { sql: string }; Returns: undefined }
      exec_sql_validated: { Args: { sql: string }; Returns: undefined }
      expire_old_agent_sessions: { Args: never; Returns: number }
      get_active_conversation:
        | {
            Args: { p_contact_phone: string; p_department_code: string }
            Returns: string
          }
        | {
            Args: {
              p_contact_lid?: string
              p_contact_phone: string
              p_department_code: string
            }
            Returns: string
          }
      get_approvers_with_phone: {
        Args: never
        Returns: {
          login: string
          name: string
          phone: string
          supabase_user_id: string
        }[]
      }
      get_conversation_history_counts: {
        Args: { p_phones: string[] }
        Returns: {
          contact_phone: string
          history_count: number
        }[]
      }
      get_conversation_timeline: {
        Args: { p_limit?: number; p_offset?: number; p_phone: string }
        Returns: {
          content: string
          content_type: string
          conversation_id: string
          conversation_status: string
          created_at: string
          department_name: string
          direction: string
          is_deleted: boolean
          media_filename: string
          media_mime_type: string
          media_url: string
          message_id: string
          quoted_message_id: string
          sender_id: string
          sender_type: string
          source_module: string
          status: string
          transcription: string
          transcription_error: string
          transcription_status: string
        }[]
      }
      get_fornecedores_by_ids: {
        Args: { p_ids: number[] }
        Returns: {
          contato: string
          email: string
          id_fornece: number
          nomefantasia: string
          razaosocial: string
          telefone: string
          whatsapp: string
        }[]
      }
      get_fornecedores_by_phones: {
        Args: { p_phones: string[] }
        Returns: {
          contato: string
          email: string
          id_fornece: number
          nomefantasia: string
          razaosocial: string
          telefone: string
          whatsapp: string
        }[]
      }
      get_group_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          group_id: string
          unread_count: number
        }[]
      }
      get_migration_stats: { Args: { p_migration_id: string }; Returns: Json }
      get_next_task_kanban_position: {
        Args: { p_column_id: string }
        Returns: number
      }
      get_or_create_whatsapp_contact:
        | {
            Args: {
              p_lid?: string
              p_name?: string
              p_phone: string
              p_profile_pic?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_name?: string
              p_phone: string
              p_profile_picture?: string
            }
            Returns: string
          }
      get_preferred_identifier: {
        Args: { p_lid: string; p_phone: string }
        Returns: string
      }
      has_app_permission: {
        Args: { p_app_name: string; p_permission_type: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_produto_frequencia: {
        Args: { produto_id: string }
        Returns: undefined
      }
      insert_scheduled_email: {
        Args: {
          p_attachments: Json
          p_bcc_address: string
          p_cc_address: string
          p_created_by: string
          p_html_content: string
          p_metadata: Json
          p_related_id: string
          p_related_table: string
          p_scheduled_at: string
          p_subject: string
          p_to_address: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_auth_user: { Args: { p_login: string }; Returns: boolean }
      is_lid: { Args: { identifier: string }; Returns: boolean }
      mark_transfer_alert_executed:
        | { Args: { p_alert_id: string }; Returns: undefined }
        | {
            Args: { p_alert_id: string; p_user_id?: string }
            Returns: undefined
          }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_documents_v2: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_fornecedores: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          cgccic: string
          cpf: string
          email: string
          id_fornece: number
          razaosocial: string
          similarity: number
          telefone: string
          whatsapp: string
        }[]
      }
      match_produtos: {
        Args: {
          filter_categoria?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          categoria: string
          codigo_produto: string
          descricao_completa: string
          especificacoes_tecnicas: Json
          id: string
          similarity: number
          sinonimos: string[]
          subcategoria: string
          tags: string[]
          unidade_padrao: string
          unidades_alternativas: Json
        }[]
      }
      match_produtos_hybrid: {
        Args: { p_limit?: number; p_min_score?: number; p_query: string }
        Returns: {
          categoria: string
          codigo_produto: string
          descricao_completa: string
          descricao_normalizada: string
          frequencia_uso: number
          id: string
          match_type: string
          score: number
          sinonimos: string[]
          subcategoria: string
          unidade_padrao: string
        }[]
      }
      match_produtos_hybrid_v2: {
        Args: { p_limit?: number; p_query: string; p_rrf_k?: number }
        Returns: {
          categoria: string
          codigo_produto: string
          descricao_completa: string
          descricao_normalizada: string
          frequencia_uso: number
          id: string
          match_type: string
          score: number
          sinonimos: string[]
          subcategoria: string
          unidade_padrao: string
        }[]
      }
      move_conversation_to_column:
        | {
            Args: {
              p_column_id: string
              p_conversation_id: string
              p_new_position?: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_conversation_id: string
              p_move_type?: string
              p_moved_by?: string
              p_new_position?: number
              p_reason?: string
              p_to_column_id: string
            }
            Returns: undefined
          }
      nano_decrypt_secret: {
        Args: { p_encrypted: string; p_passphrase?: string }
        Returns: string
      }
      nano_encrypt_secret: {
        Args: { p_passphrase?: string; p_value: string }
        Returns: string
      }
      nano_get_memories: {
        Args: { p_agent_id: string; p_category?: string; p_limit?: number }
        Returns: {
          category: string
          content: string
          id: string
          pinned: boolean
          relevance_score: number
          title: string
          updated_at: string
        }[]
      }
      nano_get_secret: {
        Args: { p_agent_id: string; p_key: string }
        Returns: string
      }
      nano_list_secrets: {
        Args: { p_agent_id: string }
        Returns: {
          description: string
          key: string
          updated_at: string
        }[]
      }
      nano_save_memory: {
        Args: {
          p_agent_id: string
          p_category: string
          p_content: string
          p_pinned?: boolean
          p_source?: string
          p_title: string
        }
        Returns: string
      }
      nano_save_secret: {
        Args: {
          p_agent_id: string
          p_description?: string
          p_key: string
          p_value: string
        }
        Returns: string
      }
      reconcile_lid_to_phone: {
        Args: { p_lid: string; p_phone: string }
        Returns: undefined
      }
      register_user_session: {
        Args: {
          p_device_info?: string
          p_ip_address?: string
          p_session_context?: string
          p_session_token: string
          p_user_email: string
        }
        Returns: Json
      }
      release_phone_lock: {
        Args: { p_lock_id: string; p_phone: string }
        Returns: undefined
      }
      remove_user_session:
        | {
            Args: { p_session_context?: string; p_user_email: string }
            Returns: Json
          }
        | {
            Args: {
              p_session_context?: string
              p_session_token?: string
              p_user_email: string
            }
            Returns: Json
          }
      reorder_kanban_columns: {
        Args: { p_board_id: string; p_column_ids: string[] }
        Returns: undefined
      }
      reset_monthly_usage: { Args: never; Returns: undefined }
      rollback_rag_migration: {
        Args: { p_migration_id: string }
        Returns: Json
      }
      search_sinapi_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          page_number: number
          similarity: number
          source_file: string
          source_title: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_fornecedor_to_whatsapp_contact: {
        Args: { p_id_fornece: number }
        Returns: string
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_bank_account_balance: {
        Args: { p_account_id: string; p_saldo: number }
        Returns: undefined
      }
      user_belongs_to_department: {
        Args: { dept_id: string }
        Returns: boolean
      }
      user_has_access_to_obra: {
        Args: { _codigo_obra: string; _user_id: string }
        Returns: boolean
      }
      validar_dependencia_circular: {
        Args: { p_predecessora_id: string; p_sucessora_id: string }
        Returns: boolean
      }
      validate_user_session: {
        Args: {
          p_session_context?: string
          p_session_token: string
          p_user_email: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "administrador" | "avancado" | "basico" | "guest"
      rh_tipo_colaborador:
        | "CLT_MENSAL"
        | "CLT_HORISTA"
        | "DIARISTA"
        | "MEI_FIXO"
        | "MEI_DIARIA"
      tipo_item_enum: "PRODUTO" | "SERVICO" | "LOCACAO" | "SERVICO_PRODUTO"
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
    Enums: {
      app_role: ["administrador", "avancado", "basico", "guest"],
      rh_tipo_colaborador: [
        "CLT_MENSAL",
        "CLT_HORISTA",
        "DIARISTA",
        "MEI_FIXO",
        "MEI_DIARIA",
      ],
      tipo_item_enum: ["PRODUTO", "SERVICO", "LOCACAO", "SERVICO_PRODUTO"],
    },
  },
} as const
