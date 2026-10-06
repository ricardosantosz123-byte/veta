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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bitacora: {
        Row: {
          created_at: string
          datos: Json | null
          empresa_id: string
          id: number
          operacion: string
          registro_id: string | null
          tabla: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          datos?: Json | null
          empresa_id: string
          id?: never
          operacion: string
          registro_id?: string | null
          tabla: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          datos?: Json | null
          empresa_id?: string
          id?: never
          operacion?: string
          registro_id?: string | null
          tabla?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bitacora_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          empresa_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          empresa_id: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          empresa_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "categorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          apellidos: string
          created_at: string
          direccion: string | null
          email: string | null
          empresa_cliente: string | null
          empresa_id: string
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
        }
        Insert: {
          apellidos?: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa_cliente?: string | null
          empresa_id: string
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
        }
        Update: {
          apellidos?: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          empresa_cliente?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      costos_modelo: {
        Row: {
          costo: number
          empresa_id: string
          etapa_id: string
          id: string
          modelo_id: string
          opcion_id: string | null
        }
        Insert: {
          costo: number
          empresa_id: string
          etapa_id: string
          id?: string
          modelo_id: string
          opcion_id?: string | null
        }
        Update: {
          costo?: number
          empresa_id?: string
          etapa_id?: string
          id?: string
          modelo_id?: string
          opcion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costos_modelo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costos_modelo_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costos_modelo_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costos_modelo_opcion_id_fkey"
            columns: ["opcion_id"]
            isOneToOne: false
            referencedRelation: "opciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_item_costos: {
        Row: {
          costo_unitario: number
          empresa_id: string
          item_id: string
        }
        Insert: {
          costo_unitario?: number
          empresa_id: string
          item_id: string
        }
        Update: {
          costo_unitario?: number
          empresa_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_item_costos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_item_costos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_items: {
        Row: {
          cantidad: number
          cotizacion_id: string
          created_at: string
          descripcion: string
          empresa_id: string
          id: string
          importe: number | null
          modelo_id: string | null
          opcion_ids: string[]
          opciones_texto: string | null
          orden: number
          pedido_id: string | null
          precio_manual: boolean
          precio_sugerido: number | null
          precio_unitario: number | null
          vendido: boolean
        }
        Insert: {
          cantidad?: number
          cotizacion_id: string
          created_at?: string
          descripcion?: string
          empresa_id: string
          id?: string
          importe?: number | null
          modelo_id?: string | null
          opcion_ids?: string[]
          opciones_texto?: string | null
          orden?: number
          pedido_id?: string | null
          precio_manual?: boolean
          precio_sugerido?: number | null
          precio_unitario?: number | null
          vendido?: boolean
        }
        Update: {
          cantidad?: number
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          empresa_id?: string
          id?: string
          importe?: number | null
          modelo_id?: string | null
          opcion_ids?: string[]
          opciones_texto?: string | null
          orden?: number
          pedido_id?: string | null
          precio_manual?: boolean
          precio_sugerido?: number | null
          precio_unitario?: number | null
          vendido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "v_cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_pedido_fk"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_pedido_fk"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedido_resumen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_pedido_fk"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          cliente_id: string
          created_at: string
          descuento_monto: number | null
          descuento_pct: number
          empresa_id: string
          envio: number
          estado: Database["public"]["Enums"]["estado_cotizacion"]
          fecha: string
          folio: number | null
          id: string
          iva: number
          lista_id: string | null
          notas: string | null
          precios_con_iva: boolean
          subtotal: number
          total: number
          updated_at: string
          vendedor_id: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descuento_monto?: number | null
          descuento_pct?: number
          empresa_id: string
          envio?: number
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha?: string
          folio?: number | null
          id?: string
          iva?: number
          lista_id?: string | null
          notas?: string | null
          precios_con_iva?: boolean
          subtotal?: number
          total?: number
          updated_at?: string
          vendedor_id?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descuento_monto?: number | null
          descuento_pct?: number
          empresa_id?: string
          envio?: number
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha?: string
          folio?: number | null
          id?: string
          iva?: number
          lista_id?: string | null
          notas?: string | null
          precios_con_iva?: boolean
          subtotal?: number
          total?: number
          updated_at?: string
          vendedor_id?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_precios"
            referencedColumns: ["id"]
          },
        ]
      }
      destajistas: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          empresa_id: string
          especialidad: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          empresa_id: string
          especialidad?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          tipo?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          empresa_id?: string
          especialidad?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "destajistas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_secretos: {
        Row: {
          empresa_id: string
          mp_access_token: string | null
          updated_at: string
        }
        Insert: {
          empresa_id: string
          mp_access_token?: string | null
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          mp_access_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_secretos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          anticipo_pct: number
          cancela_al_final: boolean
          color_marca: string
          condiciones_cotizacion: string | null
          created_at: string
          direccion: string | null
          email: string | null
          estado_suscripcion: Database["public"]["Enums"]["estado_suscripcion"]
          id: string
          iva: number
          logo_path: string | null
          logo_pdf_path: string | null
          metodo_precio: Database["public"]["Enums"]["metodo_precio"]
          mp_conectado: boolean
          mp_cuenta: string | null
          nombre: string
          periodo_termina: string | null
          plan_intervalo: string | null
          prueba_termina: string
          razon_social: string | null
          rfc: string | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          telefono: string | null
          vigencia_cotizacion_dias: number
        }
        Insert: {
          anticipo_pct?: number
          cancela_al_final?: boolean
          color_marca?: string
          condiciones_cotizacion?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          iva?: number
          logo_path?: string | null
          logo_pdf_path?: string | null
          metodo_precio?: Database["public"]["Enums"]["metodo_precio"]
          mp_conectado?: boolean
          mp_cuenta?: string | null
          nombre: string
          periodo_termina?: string | null
          plan_intervalo?: string | null
          prueba_termina?: string
          razon_social?: string | null
          rfc?: string | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefono?: string | null
          vigencia_cotizacion_dias?: number
        }
        Update: {
          anticipo_pct?: number
          cancela_al_final?: boolean
          color_marca?: string
          condiciones_cotizacion?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          iva?: number
          logo_path?: string | null
          logo_pdf_path?: string | null
          metodo_precio?: Database["public"]["Enums"]["metodo_precio"]
          mp_conectado?: boolean
          mp_cuenta?: string | null
          nombre?: string
          periodo_termina?: string | null
          plan_intervalo?: string | null
          prueba_termina?: string
          razon_social?: string | null
          rfc?: string | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefono?: string | null
          vigencia_cotizacion_dias?: number
        }
        Relationships: []
      }
      etapas: {
        Row: {
          activo: boolean
          empresa_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          empresa_id: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          empresa_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "etapas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      folios: {
        Row: {
          empresa_id: string
          tipo: string
          ultimo: number
        }
        Insert: {
          empresa_id: string
          tipo: string
          ultimo?: number
        }
        Update: {
          empresa_id?: string
          tipo?: string
          ultimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "folios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_opcion: {
        Row: {
          empresa_id: string
          id: string
          nombre: string
          obligatorio: boolean
          orden: number
        }
        Insert: {
          empresa_id: string
          id?: string
          nombre: string
          obligatorio?: boolean
          orden?: number
        }
        Update: {
          empresa_id?: string
          id?: string
          nombre?: string
          obligatorio?: boolean
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "grupos_opcion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          activo: boolean
          costo_unitario: number
          empresa_id: string
          existencia: number
          id: string
          minimo: number
          nombre: string
          nombre_norm: string
          proveedor: string | null
          tipo: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          costo_unitario?: number
          empresa_id: string
          existencia?: number
          id?: string
          minimo?: number
          nombre: string
          nombre_norm: string
          proveedor?: string | null
          tipo?: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          costo_unitario?: number
          empresa_id?: string
          existencia?: number
          id?: string
          minimo?: number
          nombre?: string
          nombre_norm?: string
          proveedor?: string | null
          tipo?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones: {
        Row: {
          aceptada_at: string | null
          created_at: string
          created_by: string | null
          destajista_id: string | null
          email: string
          empresa_id: string
          id: string
          rol: Database["public"]["Enums"]["rol_miembro"]
        }
        Insert: {
          aceptada_at?: string | null
          created_at?: string
          created_by?: string | null
          destajista_id?: string | null
          email: string
          empresa_id: string
          id?: string
          rol: Database["public"]["Enums"]["rol_miembro"]
        }
        Update: {
          aceptada_at?: string | null
          created_at?: string
          created_by?: string | null
          destajista_id?: string | null
          email?: string
          empresa_id?: string
          id?: string
          rol?: Database["public"]["Enums"]["rol_miembro"]
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "destajistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "v_destajo_saldos"
            referencedColumns: ["destajista_id"]
          },
          {
            foreignKeyName: "invitaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      links_pago: {
        Row: {
          concepto: string
          created_at: string
          created_by: string | null
          empresa_id: string
          estado: string
          externo_id: string | null
          id: string
          monto: number
          pagado_at: string | null
          pago_id: string | null
          pedido_id: string
          proveedor: string
          url: string
        }
        Insert: {
          concepto?: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          estado?: string
          externo_id?: string | null
          id?: string
          monto: number
          pagado_at?: string | null
          pago_id?: string | null
          pedido_id: string
          proveedor?: string
          url: string
        }
        Update: {
          concepto?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          estado?: string
          externo_id?: string | null
          id?: string
          monto?: number
          pagado_at?: string | null
          pago_id?: string | null
          pedido_id?: string
          proveedor?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_pago_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_pago_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_pago_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "v_pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_pago_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_pago_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedido_resumen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_pago_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_precios: {
        Row: {
          activo: boolean
          empresa_id: string
          factor: number
          id: string
          incluye_iva: boolean
          nombre: string
          predeterminada: boolean
          redondeo: number
        }
        Insert: {
          activo?: boolean
          empresa_id: string
          factor?: number
          id?: string
          incluye_iva?: boolean
          nombre: string
          predeterminada?: boolean
          redondeo?: number
        }
        Update: {
          activo?: boolean
          empresa_id?: string
          factor?: number
          id?: string
          incluye_iva?: boolean
          nombre?: string
          predeterminada?: boolean
          redondeo?: number
        }
        Relationships: [
          {
            foreignKeyName: "listas_precios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      miembros: {
        Row: {
          activo: boolean
          created_at: string
          destajista_id: string | null
          empresa_id: string
          id: string
          nombre: string | null
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          destajista_id?: string | null
          empresa_id: string
          id?: string
          nombre?: string | null
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          destajista_id?: string | null
          empresa_id?: string
          id?: string
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_miembro"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "destajistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "v_destajo_saldos"
            referencedColumns: ["destajista_id"]
          },
          {
            foreignKeyName: "miembros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_costeo: {
        Row: {
          empresa_id: string
          margen_venta: number
          markup: number
          modelo_id: string
        }
        Insert: {
          empresa_id: string
          margen_venta?: number
          markup?: number
          modelo_id: string
        }
        Update: {
          empresa_id?: string
          margen_venta?: number
          markup?: number
          modelo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_costeo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_costeo_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: true
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_grupos: {
        Row: {
          empresa_id: string
          grupo_id: string
          modelo_id: string
        }
        Insert: {
          empresa_id: string
          grupo_id: string
          modelo_id: string
        }
        Update: {
          empresa_id?: string
          grupo_id?: string
          modelo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_grupos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_opcion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_grupos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos: {
        Row: {
          activo: boolean
          categoria_id: string | null
          created_at: string
          descripcion: string | null
          empresa_id: string
          foto_path: string | null
          id: string
          nombre: string
          precio_base: number
          sobre_diseno: boolean
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          foto_path?: string | null
          id?: string
          nombre: string
          precio_base?: number
          sobre_diseno?: boolean
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          foto_path?: string | null
          id?: string
          nombre?: string
          precio_base?: number
          sobre_diseno?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "modelos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_insumo: {
        Row: {
          cantidad: number
          costo_unitario: number | null
          created_at: string
          created_by: string | null
          destajista_id: string | null
          empresa_id: string
          id: string
          insumo_id: string
          nota: string | null
          orden_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Insert: {
          cantidad: number
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          destajista_id?: string | null
          empresa_id: string
          id?: string
          insumo_id: string
          nota?: string | null
          orden_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Update: {
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          destajista_id?: string | null
          empresa_id?: string
          id?: string
          insumo_id?: string
          nota?: string | null
          orden_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_insumo_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "destajistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "v_destajo_saldos"
            referencedColumns: ["destajista_id"]
          },
          {
            foreignKeyName: "movimientos_insumo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      opciones: {
        Row: {
          activo: boolean
          ajuste_precio: number
          empresa_id: string
          grupo_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          ajuste_precio?: number
          empresa_id: string
          grupo_id: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          ajuste_precio?: number
          empresa_id?: string
          grupo_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "opciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opciones_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_opcion"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_produccion: {
        Row: {
          cantidad: number
          costo_acordado: number
          created_at: string
          descripcion: string
          destajista_id: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_orden"]
          etapa_id: string
          fecha_compromiso: string | null
          folio: number | null
          id: string
          iniciada_at: string | null
          notas: string | null
          pagado: number
          pedido_item_id: string
          saldo: number | null
          terminada_at: string | null
          updated_at: string
        }
        Insert: {
          cantidad?: number
          costo_acordado?: number
          created_at?: string
          descripcion?: string
          destajista_id?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_orden"]
          etapa_id: string
          fecha_compromiso?: string | null
          folio?: number | null
          id?: string
          iniciada_at?: string | null
          notas?: string | null
          pagado?: number
          pedido_item_id: string
          saldo?: number | null
          terminada_at?: string | null
          updated_at?: string
        }
        Update: {
          cantidad?: number
          costo_acordado?: number
          created_at?: string
          descripcion?: string
          destajista_id?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_orden"]
          etapa_id?: string
          fecha_compromiso?: string | null
          folio?: number | null
          id?: string
          iniciada_at?: string | null
          notas?: string | null
          pagado?: number
          pedido_item_id?: string
          saldo?: number | null
          terminada_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_produccion_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "destajistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "v_destajo_saldos"
            referencedColumns: ["destajista_id"]
          },
          {
            foreignKeyName: "ordenes_produccion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_cliente: {
        Row: {
          anulado: boolean
          anulado_at: string | null
          anulado_por: string | null
          comprobante_path: string | null
          created_at: string
          empresa_id: string
          externo_id: string | null
          fecha: string
          folio: number | null
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          motivo_anulacion: string | null
          pedido_id: string
          referencia: string | null
          registrado_por: string | null
        }
        Insert: {
          anulado?: boolean
          anulado_at?: string | null
          anulado_por?: string | null
          comprobante_path?: string | null
          created_at?: string
          empresa_id: string
          externo_id?: string | null
          fecha?: string
          folio?: number | null
          id?: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          motivo_anulacion?: string | null
          pedido_id: string
          referencia?: string | null
          registrado_por?: string | null
        }
        Update: {
          anulado?: boolean
          anulado_at?: string | null
          anulado_por?: string | null
          comprobante_path?: string | null
          created_at?: string
          empresa_id?: string
          externo_id?: string | null
          fecha?: string
          folio?: number | null
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto?: number
          motivo_anulacion?: string | null
          pedido_id?: string
          referencia?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedido_resumen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_destajista: {
        Row: {
          created_at: string
          empresa_id: string
          fecha: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          nota: string | null
          orden_id: string
          registrado_por: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          fecha?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          nota?: string | null
          orden_id: string
          registrado_por?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          fecha?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto?: number
          nota?: string | null
          orden_id?: string
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_destajista_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_destajista_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_items: {
        Row: {
          cantidad: number
          cotizacion_item_id: string | null
          created_at: string
          descripcion: string
          empresa_id: string
          estado_produccion: Database["public"]["Enums"]["estado_produccion"]
          id: string
          importe: number | null
          modelo_id: string | null
          opciones_texto: string | null
          pedido_id: string
          precio_unitario: number
        }
        Insert: {
          cantidad?: number
          cotizacion_item_id?: string | null
          created_at?: string
          descripcion: string
          empresa_id: string
          estado_produccion?: Database["public"]["Enums"]["estado_produccion"]
          id?: string
          importe?: number | null
          modelo_id?: string | null
          opciones_texto?: string | null
          pedido_id: string
          precio_unitario?: number
        }
        Update: {
          cantidad?: number
          cotizacion_item_id?: string | null
          created_at?: string
          descripcion?: string
          empresa_id?: string
          estado_produccion?: Database["public"]["Enums"]["estado_produccion"]
          id?: string
          importe?: number | null
          modelo_id?: string | null
          opciones_texto?: string | null
          pedido_id?: string
          precio_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_cotizacion_item_id_fkey"
            columns: ["cotizacion_item_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedido_resumen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          anticipo_pct: number
          anticipo_requerido: number
          cancelado_at: string | null
          cliente_id: string
          cotizacion_id: string | null
          created_at: string
          created_by: string | null
          descuento_monto: number | null
          descuento_pct: number
          direccion_entrega: string | null
          empresa_id: string
          en_produccion_at: string | null
          entregado_at: string | null
          envio: number
          estado: Database["public"]["Enums"]["estado_pedido"]
          factura_path: string | null
          facturado: boolean
          fecha_compromiso: string | null
          folio: number | null
          id: string
          inicio_autorizado_at: string | null
          inicio_autorizado_por: string | null
          iva: number
          liquidado_at: string | null
          motivo_cancelacion: string | null
          notas: string | null
          pagado: number
          precios_con_iva: boolean
          saldo: number | null
          subtotal: number
          terminado_at: string | null
          token_portal: string
          total: number
          updated_at: string
        }
        Insert: {
          anticipo_pct?: number
          anticipo_requerido?: number
          cancelado_at?: string | null
          cliente_id: string
          cotizacion_id?: string | null
          created_at?: string
          created_by?: string | null
          descuento_monto?: number | null
          descuento_pct?: number
          direccion_entrega?: string | null
          empresa_id: string
          en_produccion_at?: string | null
          entregado_at?: string | null
          envio?: number
          estado?: Database["public"]["Enums"]["estado_pedido"]
          factura_path?: string | null
          facturado?: boolean
          fecha_compromiso?: string | null
          folio?: number | null
          id?: string
          inicio_autorizado_at?: string | null
          inicio_autorizado_por?: string | null
          iva?: number
          liquidado_at?: string | null
          motivo_cancelacion?: string | null
          notas?: string | null
          pagado?: number
          precios_con_iva?: boolean
          saldo?: number | null
          subtotal?: number
          terminado_at?: string | null
          token_portal?: string
          total?: number
          updated_at?: string
        }
        Update: {
          anticipo_pct?: number
          anticipo_requerido?: number
          cancelado_at?: string | null
          cliente_id?: string
          cotizacion_id?: string | null
          created_at?: string
          created_by?: string | null
          descuento_monto?: number | null
          descuento_pct?: number
          direccion_entrega?: string | null
          empresa_id?: string
          en_produccion_at?: string | null
          entregado_at?: string | null
          envio?: number
          estado?: Database["public"]["Enums"]["estado_pedido"]
          factura_path?: string | null
          facturado?: boolean
          fecha_compromiso?: string | null
          folio?: number | null
          id?: string
          inicio_autorizado_at?: string | null
          inicio_autorizado_por?: string | null
          iva?: number
          liquidado_at?: string | null
          motivo_cancelacion?: string | null
          notas?: string | null
          pagado?: number
          precios_con_iva?: boolean
          saldo?: number | null
          subtotal?: number
          terminado_at?: string | null
          token_portal?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "v_cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_intentos: {
        Row: {
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: never
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: never
          ip_hash?: string
        }
        Relationships: []
      }
      stripe_eventos: {
        Row: {
          empresa_id: string | null
          id: string
          recibido_at: string
          tipo: string
        }
        Insert: {
          empresa_id?: string | null
          id: string
          recibido_at?: string
          tipo: string
        }
        Update: {
          empresa_id?: string | null
          id?: string
          recibido_at?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_clientes: {
        Row: {
          apellidos: string | null
          cotizaciones: number | null
          created_at: string | null
          direccion: string | null
          email: string | null
          empresa_cliente: string | null
          empresa_id: string | null
          id: string | null
          nombre: string | null
          notas: string | null
          pedidos: number | null
          saldo: number | null
          telefono: string | null
        }
        Insert: {
          apellidos?: string | null
          cotizaciones?: never
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_cliente?: string | null
          empresa_id?: string | null
          id?: string | null
          nombre?: string | null
          notas?: string | null
          pedidos?: never
          saldo?: never
          telefono?: string | null
        }
        Update: {
          apellidos?: string | null
          cotizaciones?: never
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_cliente?: string | null
          empresa_id?: string | null
          id?: string | null
          nombre?: string | null
          notas?: string | null
          pedidos?: never
          saldo?: never
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cotizaciones: {
        Row: {
          cliente_apellidos: string | null
          cliente_id: string | null
          cliente_nombre: string | null
          created_at: string | null
          descuento_monto: number | null
          descuento_pct: number | null
          empresa_cliente: string | null
          empresa_id: string | null
          envio: number | null
          estado: Database["public"]["Enums"]["estado_cotizacion"] | null
          estado_efectivo:
            | Database["public"]["Enums"]["estado_cotizacion"]
            | null
          fecha: string | null
          folio: number | null
          id: string | null
          iva: number | null
          lista_id: string | null
          notas: string | null
          precios_con_iva: boolean | null
          renglones: number | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          vendedor_id: string | null
          vigencia_hasta: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_precios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_destajo_saldos: {
        Row: {
          activo: boolean | null
          adelantos: number | null
          comprometido: number | null
          destajista_id: string | null
          empresa_id: string | null
          en_curso: number | null
          especialidad: string | null
          nombre: string | null
          ordenes_abiertas: number | null
          pagado_terminado: number | null
          por_pagar: number | null
          telefono: string | null
          terminado: number | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destajistas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_insumos: {
        Row: {
          activo: boolean | null
          bajo_minimo: boolean | null
          costo_unitario: number | null
          empresa_id: string | null
          existencia: number | null
          id: string | null
          minimo: number | null
          nombre: string | null
          proveedor: string | null
          tipo: string | null
          ultimo_movimiento_at: string | null
          unidad: string | null
          updated_at: string | null
          valor_existencia: number | null
        }
        Insert: {
          activo?: boolean | null
          bajo_minimo?: never
          costo_unitario?: number | null
          empresa_id?: string | null
          existencia?: number | null
          id?: string | null
          minimo?: number | null
          nombre?: string | null
          proveedor?: string | null
          tipo?: string | null
          ultimo_movimiento_at?: never
          unidad?: string | null
          updated_at?: string | null
          valor_existencia?: never
        }
        Update: {
          activo?: boolean | null
          bajo_minimo?: never
          costo_unitario?: number | null
          empresa_id?: string | null
          existencia?: number | null
          id?: string | null
          minimo?: number | null
          nombre?: string | null
          proveedor?: string | null
          tipo?: string | null
          ultimo_movimiento_at?: never
          unidad?: string | null
          updated_at?: string | null
          valor_existencia?: never
        }
        Relationships: [
          {
            foreignKeyName: "insumos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_movimientos_insumo: {
        Row: {
          cantidad: number | null
          costo_unitario: number | null
          created_at: string | null
          created_by: string | null
          destajista: string | null
          destajista_id: string | null
          efecto: number | null
          empresa_id: string | null
          existencia_despues: number | null
          id: string | null
          insumo: string | null
          insumo_id: string | null
          nota: string | null
          orden_folio: number | null
          orden_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"] | null
          unidad: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_insumo_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "destajistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_destajista_id_fkey"
            columns: ["destajista_id"]
            isOneToOne: false
            referencedRelation: "v_destajo_saldos"
            referencedColumns: ["destajista_id"]
          },
          {
            foreignKeyName: "movimientos_insumo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pagos: {
        Row: {
          anulado: boolean | null
          anulado_at: string | null
          anulado_por: string | null
          comprobante_path: string | null
          created_at: string | null
          empresa_id: string | null
          externo_id: string | null
          fecha: string | null
          folio: number | null
          id: string | null
          metodo: Database["public"]["Enums"]["metodo_pago"] | null
          monto: number | null
          motivo_anulacion: string | null
          pagado_acumulado: number | null
          pedido_folio: number | null
          pedido_id: string | null
          pedido_total: number | null
          referencia: string | null
          registrado_por: string | null
          saldo_despues: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedido_resumen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pedido_resumen: {
        Row: {
          cliente: string | null
          costo_produccion: number | null
          created_at: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_pedido"] | null
          folio: number | null
          id: string | null
          iva: number | null
          margen_bruto: number | null
          margen_pct: number | null
          pagado: number | null
          por_pagar_destajistas: number | null
          saldo: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pedidos: {
        Row: {
          anticipo_faltante: number | null
          anticipo_pct: number | null
          anticipo_requerido: number | null
          cancelado_at: string | null
          cliente_apellidos: string | null
          cliente_email: string | null
          cliente_id: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          cotizacion_id: string | null
          created_at: string | null
          created_by: string | null
          descuento_monto: number | null
          descuento_pct: number | null
          dias_para_compromiso: number | null
          direccion_entrega: string | null
          empresa_cliente: string | null
          empresa_id: string | null
          en_produccion_at: string | null
          entregado_at: string | null
          envio: number | null
          estado: Database["public"]["Enums"]["estado_pedido"] | null
          factura_path: string | null
          facturado: boolean | null
          fecha_compromiso: string | null
          folio: number | null
          id: string | null
          inicio_autorizado_at: string | null
          inicio_autorizado_por: string | null
          iva: number | null
          liquidado_at: string | null
          motivo_cancelacion: string | null
          notas: string | null
          pagado: number | null
          precios_con_iva: boolean | null
          saldo: number | null
          saldo_a_favor: number | null
          semaforo: string | null
          subtotal: number | null
          terminado_at: string | null
          token_portal: string | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "v_cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _avisar: { Args: { p_datos?: Json; p_tipo: string }; Returns: undefined }
      _calcular_costo: {
        Args: { p_modelo: string; p_opciones: string[] }
        Returns: number
      }
      _empresa_de_ruta: { Args: { p_name: string }; Returns: string }
      _norm: { Args: { t: string }; Returns: string }
      _normalizar_telefono: { Args: { p: string }; Returns: string }
      _siguiente_folio: {
        Args: { p_empresa: string; p_tipo: string }
        Returns: number
      }
      _slug_reservado: { Args: { p_slug: string }; Returns: boolean }
      _totales: {
        Args: {
          p_con_iva: boolean
          p_descuento_pct: number
          p_envio: number
          p_iva: number
          p_subtotal: number
        }
        Returns: Record<string, unknown>
      }
      _valida_empresa: {
        Args: { p_empresa: string; p_id: string; p_tabla: unknown }
        Returns: undefined
      }
      _validar_opciones: {
        Args: { p_modelo: string; p_opciones: string[] }
        Returns: undefined
      }
      aceptar_invitaciones: { Args: never; Returns: number }
      ajustar_existencia: {
        Args: {
          p_existencia_contada: number
          p_insumo: string
          p_motivo: string
        }
        Returns: number
      }
      aplicar_suscripcion_stripe: {
        Args: {
          p_cancela_al_final: boolean
          p_customer: string
          p_empresa: string
          p_intervalo: string
          p_periodo_termina: string
          p_status: string
          p_subscription: string
        }
        Returns: Database["public"]["Enums"]["estado_suscripcion"]
      }
      autorizar_inicio_sin_anticipo: {
        Args: { p_pedido: string }
        Returns: undefined
      }
      calcular_precio: {
        Args: { p_lista?: string; p_modelo: string; p_opciones: string[] }
        Returns: number
      }
      corte_destajistas: {
        Args: { p_desde: string; p_empresa: string; p_hasta: string }
        Returns: {
          comprometido: number
          destajista_id: string
          nombre: string
          ordenes_terminadas_periodo: number
          pagado_periodo: number
          por_pagar: number
          telefono: string
          terminado_periodo: number
        }[]
      }
      costear_modelo: {
        Args: { p_lista?: string; p_modelo: string; p_opciones: string[] }
        Returns: {
          costo: number
          precio: number
        }[]
      }
      crear_empresa: {
        Args: { p_nombre: string; p_slug: string }
        Returns: string
      }
      crear_insumo: {
        Args: {
          p_costo_inicial?: number
          p_empresa: string
          p_existencia_inicial?: number
          p_minimo?: number
          p_nombre: string
          p_proveedor?: string
          p_tipo: string
          p_unidad: string
        }
        Returns: string
      }
      crear_pedido_desde_cotizacion: {
        Args: {
          p_cotizacion: string
          p_fecha_compromiso?: string
          p_incluir_envio?: boolean
          p_items?: string[]
        }
        Returns: string
      }
      duplicar_cotizacion: { Args: { p_cotizacion: string }; Returns: string }
      es_miembro: { Args: { p_empresa: string }; Returns: boolean }
      guardar_cliente_stripe: {
        Args: { p_customer: string; p_empresa: string }
        Returns: undefined
      }
      hoy_mx: { Args: never; Returns: string }
      marcar_avance_orden: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_orden"]
          p_nota?: string
          p_orden: string
        }
        Returns: undefined
      }
      material_entregado: {
        Args: { p_ordenes: string[] }
        Returns: {
          cantidad: number
          destajista: string
          entregado_at: string
          insumo: string
          insumo_id: string
          movimiento_id: string
          nota: string
          orden_id: string
          unidad: string
          valor: number
        }[]
      }
      mi_destajista: { Args: { p_empresa: string }; Returns: string }
      mp_desconectar: { Args: { p_empresa: string }; Returns: undefined }
      mp_guardar_conexion: {
        Args: { p_cuenta: string; p_empresa: string; p_token: string }
        Returns: undefined
      }
      nombres_equipo: {
        Args: { p_empresa: string }
        Returns: {
          nombre: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }[]
      }
      portal_buscar: {
        Args: { p_apellidos: string; p_folio: number; p_slug: string }
        Returns: string
      }
      portal_pedido: {
        Args: { p_slug?: string; p_token: string }
        Returns: Json
      }
      portal_permitido: { Args: { p_ip_hash: string }; Returns: boolean }
      portal_registrar_intento: {
        Args: { p_ip_hash: string }
        Returns: undefined
      }
      preparar_link_pago: {
        Args: { p_monto: number; p_pedido: string }
        Returns: Json
      }
      puede_escribir: { Args: { p_empresa: string }; Returns: boolean }
      recalcular_precios_cotizacion: {
        Args: { p_cotizacion: string }
        Returns: undefined
      }
      registrar_link_pago: {
        Args: {
          p_concepto: string
          p_externo: string
          p_monto: number
          p_pedido: string
          p_url: string
          p_usuario: string
        }
        Returns: string
      }
      registrar_pago_mp: {
        Args: {
          p_empresa: string
          p_fecha: string
          p_monto: number
          p_pago_externo: string
          p_pedido: string
        }
        Returns: string
      }
      reordenar_catalogo: {
        Args: { p_ids: string[]; p_tabla: string }
        Returns: undefined
      }
      slug_disponible: { Args: { p_slug: string }; Returns: boolean }
      sugerir_ordenes: {
        Args: { p_pedido: string }
        Returns: {
          cantidad: number
          con_costo: boolean
          costo_sugerido: number
          costo_unitario: number
          descripcion: string
          estado_produccion: Database["public"]["Enums"]["estado_produccion"]
          etapa: string
          etapa_id: string
          etapa_orden: number
          opciones_texto: string
          pedido_item_id: string
          tiene_orden: boolean
        }[]
      }
      tablero: { Args: { p_empresa: string }; Returns: Json }
      tiene_rol: {
        Args: {
          p_empresa: string
          p_roles: Database["public"]["Enums"]["rol_miembro"][]
        }
        Returns: boolean
      }
    }
    Enums: {
      estado_cotizacion:
        | "borrador"
        | "enviada"
        | "parcial"
        | "aceptada"
        | "vencida"
        | "cancelada"
      estado_orden: "pendiente" | "en_proceso" | "terminada" | "cancelada"
      estado_pedido:
        | "anticipo_pendiente"
        | "en_produccion"
        | "terminado"
        | "liquidado"
        | "entregado"
        | "cancelado"
      estado_produccion: "pendiente" | "en_proceso" | "terminado"
      estado_suscripcion: "prueba" | "activa" | "vencida" | "cancelada"
      metodo_pago:
        | "efectivo"
        | "transferencia"
        | "tarjeta"
        | "mercado_pago"
        | "otro"
      metodo_precio: "componentes" | "base_ajustes"
      rol_miembro:
        | "admin"
        | "vendedor"
        | "produccion"
        | "destajista"
        | "contador"
      tipo_movimiento: "entrada" | "salida" | "ajuste"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_cotizacion: [
        "borrador",
        "enviada",
        "parcial",
        "aceptada",
        "vencida",
        "cancelada",
      ],
      estado_orden: ["pendiente", "en_proceso", "terminada", "cancelada"],
      estado_pedido: [
        "anticipo_pendiente",
        "en_produccion",
        "terminado",
        "liquidado",
        "entregado",
        "cancelado",
      ],
      estado_produccion: ["pendiente", "en_proceso", "terminado"],
      estado_suscripcion: ["prueba", "activa", "vencida", "cancelada"],
      metodo_pago: [
        "efectivo",
        "transferencia",
        "tarjeta",
        "mercado_pago",
        "otro",
      ],
      metodo_precio: ["componentes", "base_ajustes"],
      rol_miembro: [
        "admin",
        "vendedor",
        "produccion",
        "destajista",
        "contador",
      ],
      tipo_movimiento: ["entrada", "salida", "ajuste"],
    },
  },
} as const
