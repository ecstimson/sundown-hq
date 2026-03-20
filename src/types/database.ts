export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      species: {
        Row: {
          id: string
          common_name: string
          scientific_name: string
          code: string
          is_new_caledonian: boolean
          created_at: string
        }
        Insert: {
          id?: string
          common_name: string
          scientific_name: string
          code: string
          is_new_caledonian?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          common_name?: string
          scientific_name?: string
          code?: string
          is_new_caledonian?: boolean
          created_at?: string
        }
      }
      pairings: {
        Row: {
          id: string
          pairing_id: string
          sire_id: string | null
          dam_id: string | null
          species_id: string | null
          status: 'Active' | 'Retired'
          total_clutches: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pairing_id: string
          sire_id?: string | null
          dam_id?: string | null
          species_id?: string | null
          status?: 'Active' | 'Retired'
          total_clutches?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pairing_id?: string
          sire_id?: string | null
          dam_id?: string | null
          species_id?: string | null
          status?: 'Active' | 'Retired'
          total_clutches?: number
          notes?: string | null
          created_at?: string
        }
      }
      animals: {
        Row: {
          id: string
          animal_id: string
          species_id: string
          gender: 'Male' | 'Female' | 'Unsexed'
          pairing_id: string | null
          sire_animal_id: string | null
          dam_animal_id: string | null
          hatch_date: string | null
          current_weight_g: number | null
          last_weighed: string | null
          morph_traits: string | null
          price: number | null
          status: 'Breeder' | 'Available' | 'Unlisted' | 'Hold' | 'Listed' | 'Sold' | 'Archived'
          shopify_product_id: string | null
          morphmarket_id: string | null
          date_listed: string | null
          date_sold: string | null
          buyer: string | null
          building: 'A' | 'B' | null
          rack_enclosure: string | null
          image_folder_url: string | null
          notes: string | null
          listing_readiness_score: number
          last_observation_date: string | null
          status_history: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          animal_id: string
          species_id: string
          gender?: 'Male' | 'Female' | 'Unsexed'
          pairing_id?: string | null
          sire_animal_id?: string | null
          dam_animal_id?: string | null
          hatch_date?: string | null
          current_weight_g?: number | null
          last_weighed?: string | null
          morph_traits?: string | null
          price?: number | null
          status?: 'Breeder' | 'Available' | 'Unlisted' | 'Hold' | 'Listed' | 'Sold' | 'Archived'
          shopify_product_id?: string | null
          morphmarket_id?: string | null
          date_listed?: string | null
          date_sold?: string | null
          buyer?: string | null
          building?: 'A' | 'B' | null
          rack_enclosure?: string | null
          image_folder_url?: string | null
          notes?: string | null
          listing_readiness_score?: number
          last_observation_date?: string | null
          status_history?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          animal_id?: string
          species_id?: string
          gender?: 'Male' | 'Female' | 'Unsexed'
          pairing_id?: string | null
          sire_animal_id?: string | null
          dam_animal_id?: string | null
          hatch_date?: string | null
          current_weight_g?: number | null
          last_weighed?: string | null
          morph_traits?: string | null
          price?: number | null
          status?: 'Breeder' | 'Available' | 'Unlisted' | 'Hold' | 'Listed' | 'Sold' | 'Archived'
          shopify_product_id?: string | null
          morphmarket_id?: string | null
          date_listed?: string | null
          date_sold?: string | null
          buyer?: string | null
          building?: 'A' | 'B' | null
          rack_enclosure?: string | null
          image_folder_url?: string | null
          notes?: string | null
          listing_readiness_score?: number
          last_observation_date?: string | null
          status_history?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      observations: {
        Row: {
          id: string
          animal_id: string
          employee_id: string
          employee_name: string
          observation_type: 'Feeding' | 'Weight' | 'Health Concern' | 'Behavior' | 'Shedding' | 'Egg-Breeding' | 'General Note'
          details: string
          urgency: 'Routine' | 'Needs Attention' | 'Urgent'
          photo_urls: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          animal_id: string
          employee_id: string
          employee_name: string
          observation_type: 'Feeding' | 'Weight' | 'Health Concern' | 'Behavior' | 'Shedding' | 'Egg-Breeding' | 'General Note'
          details: string
          urgency?: 'Routine' | 'Needs Attention' | 'Urgent'
          photo_urls?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          animal_id?: string
          employee_id?: string
          employee_name?: string
          observation_type?: 'Feeding' | 'Weight' | 'Health Concern' | 'Behavior' | 'Shedding' | 'Egg-Breeding' | 'General Note'
          details?: string
          urgency?: 'Routine' | 'Needs Attention' | 'Urgent'
          photo_urls?: string[] | null
          created_at?: string
        }
      }
      daily_checklists: {
        Row: {
          id: string
          date: string
          building: 'A' | 'B'
          checklist_type: 'Opening' | 'Feeding-AM' | 'Feeding-PM' | 'Closing' | 'Weekly'
          employee_id: string
          employee_name: string
          completed_at: string | null
          items: Json
          notes: string | null
          template_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          building: 'A' | 'B'
          checklist_type: 'Opening' | 'Feeding-AM' | 'Feeding-PM' | 'Closing' | 'Weekly'
          employee_id: string
          employee_name: string
          completed_at?: string | null
          items?: Json
          notes?: string | null
          template_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          building?: 'A' | 'B'
          checklist_type?: 'Opening' | 'Feeding-AM' | 'Feeding-PM' | 'Closing' | 'Weekly'
          employee_id?: string
          employee_name?: string
          completed_at?: string | null
          items?: Json
          notes?: string | null
          template_id?: string | null
          created_at?: string
        }
      }
      drops: {
        Row: {
          id: string
          drop_id: string
          drop_date: string
          status: 'Planning' | 'Prep' | 'Listed' | 'Complete'
          drop_type: 'Monthly' | 'Tax Season' | 'Black Friday' | 'Vault Rotation'
          discount_code: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          drop_id: string
          drop_date: string
          status?: 'Planning' | 'Prep' | 'Listed' | 'Complete'
          drop_type?: 'Monthly' | 'Tax Season' | 'Black Friday' | 'Vault Rotation'
          discount_code?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          drop_id?: string
          drop_date?: string
          status?: 'Planning' | 'Prep' | 'Listed' | 'Complete'
          drop_type?: 'Monthly' | 'Tax Season' | 'Black Friday' | 'Vault Rotation'
          discount_code?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      drop_animals: {
        Row: {
          id: string
          drop_id: string
          animal_id: string
          stage: 'candidates' | 'prep' | 'photo' | 'ready'
        }
        Insert: {
          id?: string
          drop_id: string
          animal_id: string
          stage?: 'candidates' | 'prep' | 'photo' | 'ready'
        }
        Update: {
          id?: string
          drop_id?: string
          animal_id?: string
          stage?: 'candidates' | 'prep' | 'photo' | 'ready'
        }
      }
      sops: {
        Row: {
          id: string
          title: string
          category: string
          content: string
          sort_order: number
          image_urls: string[] | null
          version: number
          previous_version_content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          category: string
          content: string
          sort_order?: number
          image_urls?: string[] | null
          version?: number
          previous_version_content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: string
          content?: string
          sort_order?: number
          image_urls?: string[] | null
          version?: number
          previous_version_content?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sop_attachments: {
        Row: {
          id: string
          sop_id: string
          file_name: string
          file_url: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sop_id: string
          file_name: string
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sop_id?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          name: string
          pin: string
          assigned_buildings: string[]
          role: 'super_admin' | 'admin' | 'employee'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          pin: string
          assigned_buildings?: string[]
          role?: 'super_admin' | 'admin' | 'employee'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          pin?: string
          assigned_buildings?: string[]
          role?: 'super_admin' | 'admin' | 'employee'
          is_active?: boolean
          created_at?: string
        }
      }
      employee_profiles: {
        Row: {
          employee_id: string
          avatar_url: string | null
          phone: string | null
          address: string | null
          w2_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          employee_id: string
          avatar_url?: string | null
          phone?: string | null
          address?: string | null
          w2_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          employee_id?: string
          avatar_url?: string | null
          phone?: string | null
          address?: string | null
          w2_email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employee_time_entries: {
        Row: {
          id: string
          employee_id: string
          clock_in_at: string
          clock_out_at: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          clock_in_at?: string
          clock_out_at?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          clock_in_at?: string
          clock_out_at?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employee_shifts: {
        Row: {
          id: string
          shift_date: string
          employee_id: string
          shift_type: string
          start_time: string | null
          end_time: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shift_date: string
          employee_id: string
          shift_type?: string
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shift_date?: string
          employee_id?: string
          shift_type?: string
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      feeding_schedule: {
        Row: {
          id: string
          schedule_date: string
          animal_id: string | null
          group_name: string | null
          feeding_type: string
          calcium_rotation: string
          start_time: string | null
          end_time: string | null
          repeat_rule: string
          repeat_interval: number
          repeat_until: string | null
          notes: string | null
          completed: boolean
          completed_by: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          schedule_date: string
          animal_id?: string | null
          group_name?: string | null
          feeding_type?: string
          calcium_rotation?: string
          start_time?: string | null
          end_time?: string | null
          repeat_rule?: string
          repeat_interval?: number
          repeat_until?: string | null
          notes?: string | null
          completed?: boolean
          completed_by?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          schedule_date?: string
          animal_id?: string | null
          group_name?: string | null
          feeding_type?: string
          calcium_rotation?: string
          start_time?: string | null
          end_time?: string | null
          repeat_rule?: string
          repeat_interval?: number
          repeat_until?: string | null
          notes?: string | null
          completed?: boolean
          completed_by?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          author_id: string
          author_name: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          author_name: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          author_name?: string
          body?: string
          created_at?: string
        }
      }
      dashboard_preferences: {
        Row: {
          user_id: string
          hidden_widgets: string[]
          widget_order: string[]
          updated_at: string
        }
        Insert: {
          user_id: string
          hidden_widgets?: string[]
          widget_order?: string[]
          updated_at?: string
        }
        Update: {
          user_id?: string
          hidden_widgets?: string[]
          widget_order?: string[]
          updated_at?: string
        }
      }
      checklist_templates: {
        Row: {
          id: string
          title: string
          building: 'A' | 'B'
          checklist_type: string
          items: Json
          is_active: boolean
          repeat_rule: 'daily' | 'custom_weekdays'
          repeat_weekdays: number[] | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          building: 'A' | 'B'
          checklist_type: string
          items?: Json
          is_active?: boolean
          repeat_rule?: 'daily' | 'custom_weekdays'
          repeat_weekdays?: number[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          building?: 'A' | 'B'
          checklist_type?: string
          items?: Json
          is_active?: boolean
          repeat_rule?: 'daily' | 'custom_weekdays'
          repeat_weekdays?: number[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calendars: {
        Row: {
          id: string
          name: string
          color: string
          visibility: 'private' | 'team' | 'public'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          visibility?: 'private' | 'team' | 'public'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          visibility?: 'private' | 'team' | 'public'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calendar_members: {
        Row: {
          id: string
          calendar_id: string
          employee_id: string
          role: 'viewer' | 'editor' | 'owner'
          created_at: string
        }
        Insert: {
          id?: string
          calendar_id: string
          employee_id: string
          role?: 'viewer' | 'editor' | 'owner'
          created_at?: string
        }
        Update: {
          id?: string
          calendar_id?: string
          employee_id?: string
          role?: 'viewer' | 'editor' | 'owner'
          created_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          calendar_id: string
          title: string
          description: string | null
          location: string | null
          all_day: boolean
          start_at: string
          end_at: string
          repeat_rule: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_weekdays'
          repeat_interval: number
          repeat_until: string | null
          repeat_weekdays: number[] | null
          reminder_minutes: number[]
          share_slug: string | null
          checklist_items: Json | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          calendar_id: string
          title: string
          description?: string | null
          location?: string | null
          all_day?: boolean
          start_at: string
          end_at: string
          repeat_rule?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_weekdays'
          repeat_interval?: number
          repeat_until?: string | null
          repeat_weekdays?: number[] | null
          reminder_minutes?: number[]
          share_slug?: string | null
          checklist_items?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          calendar_id?: string
          title?: string
          description?: string | null
          location?: string | null
          all_day?: boolean
          start_at?: string
          end_at?: string
          repeat_rule?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_weekdays'
          repeat_interval?: number
          repeat_until?: string | null
          repeat_weekdays?: number[] | null
          reminder_minutes?: number[]
          share_slug?: string | null
          checklist_items?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_attachments: {
        Row: {
          id: string
          event_id: string
          file_name: string
          file_url: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          file_name: string
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_employee_names: {
        Args: Record<PropertyKey, never>
        Returns: { name: string }[]
      }
      verify_employee_pin: {
        Args: { p_name: string; p_pin: string }
        Returns: { auth_email: string }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Species = Database['public']['Tables']['species']['Row']
export type Animal = Database['public']['Tables']['animals']['Row']
export type Observation = Database['public']['Tables']['observations']['Row']
export type DailyChecklist = Database['public']['Tables']['daily_checklists']['Row']
export type Drop = Database['public']['Tables']['drops']['Row']
export type SOP = Database['public']['Tables']['sops']['Row']
export type SOPAttachment = Database['public']['Tables']['sop_attachments']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeProfile = Database['public']['Tables']['employee_profiles']['Row']
export type EmployeeTimeEntry = Database['public']['Tables']['employee_time_entries']['Row']
export type DropAnimal = Database['public']['Tables']['drop_animals']['Row']
export type Pairing = Database['public']['Tables']['pairings']['Row']
export type EmployeeShift = Database['public']['Tables']['employee_shifts']['Row']
export type FeedingSchedule = Database['public']['Tables']['feeding_schedule']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type DashboardPreference = Database['public']['Tables']['dashboard_preferences']['Row']
export type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row']
export type Calendar = Database['public']['Tables']['calendars']['Row']
export type CalendarMember = Database['public']['Tables']['calendar_members']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type EventAttachment = Database['public']['Tables']['event_attachments']['Row']
