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
          modelo_id: string | null
          opcion_ids: string[]
          opciones_texto: string | null
          orden: number
          pedido_id: string | null
          precio_manual: boolean
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
          modelo_id?: string | null
          opcion_ids?: string[]
          opciones_texto?: string | null
          orden?: number
          pedido_id?: string | null
          precio_manual?: boolean
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
          modelo_id?: string | null
          opcion_ids?: string[]
          opciones_texto?: string | null
          orden?: number
          pedido_id?: string | null
          precio_manual?: boolean
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
        ]
      }
      cotizaciones: {
        Row: {
          cliente_id: string
          created_at: string
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
          color_marca: string
          condiciones_cotizacion: string | null
          created_at: string
          direccion: string | null
          email: string | null
          estado_suscripcion: Database["public"]["Enums"]["estado_suscripcion"]
          id: string
          iva: number
          logo_path: string | null
          metodo_precio: Database["public"]["Enums"]["metodo_precio"]
          mp_conectado: boolean
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
          color_marca?: string
          condiciones_cotizacion?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          iva?: number
          logo_path?: string | null
          metodo_precio?: Database["public"]["Enums"]["metodo_precio"]
          mp_conectado?: boolean
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
          color_marca?: string
          condiciones_cotizacion?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          iva?: number
          logo_path?: string | null
          metodo_precio?: Database["public"]["Enums"]["metodo_precio"]
          mp_conectado?: boolean
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
          created_at: string
          created_by: string | null
          empresa_id: string
          estado: string
          externo_id: string | null
          id: string
          monto: number
          pedido_id: string
          proveedor: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          estado?: string
          externo_id?: string | null
          id?: string
          monto: number
          pedido_id: string
          proveedor?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          estado?: string
          externo_id?: string | null
          id?: string
          monto?: number
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
          markup: number
          modelo_id: string
        }
        Insert: {
          empresa_id: string
          markup?: number
          modelo_id: string
        }
        Update: {
          empresa_id?: string
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
          empresa_id?: string
          id?: string
          insumo_id?: string
          nota?: string | null
          orden_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Relationships: [
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
          comprobante_path: string | null
          created_at: string
          empresa_id: string
          externo_id: string | null
          fecha: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          pedido_id: string
          referencia: string | null
          registrado_por: string | null
        }
        Insert: {
          anulado?: boolean
          comprobante_path?: string | null
          created_at?: string
          empresa_id: string
          externo_id?: string | null
          fecha?: string
          id?: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          pedido_id: string
          referencia?: string | null
          registrado_por?: string | null
        }
        Update: {
          anulado?: boolean
          comprobante_path?: string | null
          created_at?: string
          empresa_id?: string
          externo_id?: string | null
          fecha?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto?: number
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
        ]
      }
      pedidos: {
        Row: {
          anticipo_pct: number
          anticipo_requerido: number
          cliente_id: string
          cotizacion_id: string | null
          created_at: string
          created_by: string | null
          descuento_pct: number
          direccion_entrega: string | null
          empresa_id: string
          entregado_at: string | null
          envio: number
          estado: Database["public"]["Enums"]["estado_pedido"]
          facturado: boolean
          fecha_compromiso: string | null
          folio: number | null
          id: string
          iva: number
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
          cliente_id: string
          cotizacion_id?: string | null
          created_at?: string
          created_by?: string | null
          descuento_pct?: number
          direccion_entrega?: string | null
          empresa_id: string
          entregado_at?: string | null
          envio?: number
          estado?: Database["public"]["Enums"]["estado_pedido"]
          facturado?: boolean
          fecha_compromiso?: string | null
          folio?: number | null
          id?: string
          iva?: number
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
          cliente_id?: string
          cotizacion_id?: string | null
          created_at?: string
          created_by?: string | null
          descuento_pct?: number
          direccion_entrega?: string | null
          empresa_id?: string
          entregado_at?: string | null
          envio?: number
          estado?: Database["public"]["Enums"]["estado_pedido"]
          facturado?: boolean
          fecha_compromiso?: string | null
          folio?: number | null
          id?: string
          iva?: number
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
            foreignKeyName: "pedidos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
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
    }
    Views: {
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
    }
    Functions: {
      _calcular_costo: {
        Args: { p_modelo: string; p_opciones: string[] }
        Returns: number
      }
      _empresa_de_ruta: { Args: { p_name: string }; Returns: string }
      _norm: { Args: { t: string }; Returns: string }
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
      aceptar_invitaciones: { Args: never; Returns: number }
      calcular_precio: {
        Args: { p_lista?: string; p_modelo: string; p_opciones: string[] }
        Returns: number
      }
      crear_empresa: {
        Args: { p_nombre: string; p_slug: string }
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
      es_miembro: { Args: { p_empresa: string }; Returns: boolean }
      marcar_avance_orden: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_orden"]
          p_nota?: string
          p_orden: string
        }
        Returns: undefined
      }
      mi_destajista: { Args: { p_empresa: string }; Returns: string }
      portal_buscar: {
        Args: { p_apellidos: string; p_folio: number; p_slug: string }
        Returns: string
      }
      portal_pedido: { Args: { p_token: string }; Returns: Json }
      puede_escribir: { Args: { p_empresa: string }; Returns: boolean }
      recalcular_precios_cotizacion: {
        Args: { p_cotizacion: string }
        Returns: undefined
      }
      slug_disponible: { Args: { p_slug: string }; Returns: boolean }
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
