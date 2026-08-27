export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      AuditLog: {
        Row: {
          action: string
          actorId: string
          createdAt: string
          id: string
          metadata: string | null
          targetId: string
          targetType: string
        }
        Insert: {
          action: string
          actorId: string
          createdAt?: string
          id: string
          metadata?: string | null
          targetId: string
          targetType: string
        }
        Update: {
          action?: string
          actorId?: string
          createdAt?: string
          id?: string
          metadata?: string | null
          targetId?: string
          targetType?: string
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_actorId_fkey"
            columns: ["actorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Course: {
        Row: {
          audience: Database["public"]["Enums"]["CourseAudience"]
          createdAt: string
          demoVideoPath: string | null
          demoVideoUrl: string | null
          description: string
          id: string
          price: number
          published: boolean
          questionnaireEnabled: boolean
          slug: string
          title: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["CourseAudience"]
          createdAt?: string
          demoVideoPath?: string | null
          demoVideoUrl?: string | null
          description: string
          id: string
          price: number
          published?: boolean
          questionnaireEnabled?: boolean
          slug: string
          title: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["CourseAudience"]
          createdAt?: string
          demoVideoPath?: string | null
          demoVideoUrl?: string | null
          description?: string
          id?: string
          price?: number
          published?: boolean
          questionnaireEnabled?: boolean
          slug?: string
          title?: string
        }
        Relationships: []
      }
      Enrollment: {
        Row: {
          courseId: string
          createdAt: string
          id: string
          receiptNote: string | null
          receiptPath: string
          reviewedAt: string | null
          status: Database["public"]["Enums"]["EnrollmentStatus"]
          userId: string
        }
        Insert: {
          courseId: string
          createdAt?: string
          id: string
          receiptNote?: string | null
          receiptPath: string
          reviewedAt?: string | null
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          userId: string
        }
        Update: {
          courseId?: string
          createdAt?: string
          id?: string
          receiptNote?: string | null
          receiptPath?: string
          reviewedAt?: string | null
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Enrollment_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Enrollment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Lesson: {
        Row: {
          content: string
          courseId: string
          id: string
          order: number
          title: string
          videoPath: string | null
          videoUrl: string | null
        }
        Insert: {
          content: string
          courseId: string
          id: string
          order?: number
          title: string
          videoPath?: string | null
          videoUrl?: string | null
        }
        Update: {
          content?: string
          courseId?: string
          id?: string
          order?: number
          title?: string
          videoPath?: string | null
          videoUrl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Lesson_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
        ]
      }
      LessonProgress: {
        Row: {
          completed: boolean
          completedAt: string | null
          courseId: string
          createdAt: string
          durationSeconds: number | null
          furthestSeconds: number
          id: string
          lastPositionSeconds: number
          lessonId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          completed?: boolean
          completedAt?: string | null
          courseId: string
          createdAt?: string
          durationSeconds?: number | null
          furthestSeconds?: number
          id: string
          lastPositionSeconds?: number
          lessonId: string
          updatedAt: string
          userId: string
        }
        Update: {
          completed?: boolean
          completedAt?: string | null
          courseId?: string
          createdAt?: string
          durationSeconds?: number | null
          furthestSeconds?: number
          id?: string
          lastPositionSeconds?: number
          lessonId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "LessonProgress_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "LessonProgress_lessonId_fkey"
            columns: ["lessonId"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "LessonProgress_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          body: string
          createdAt: string
          id: string
          sender: Database["public"]["Enums"]["MessageSender"]
          userId: string
        }
        Insert: {
          body: string
          createdAt?: string
          id: string
          sender: Database["public"]["Enums"]["MessageSender"]
          userId: string
        }
        Update: {
          body?: string
          createdAt?: string
          id?: string
          sender?: Database["public"]["Enums"]["MessageSender"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Question: {
        Row: {
          courseId: string
          id: string
          order: number
          scaleMax: number | null
          scaleMaxLabel: string | null
          scaleMin: number | null
          scaleMinLabel: string | null
          text: string
          type: Database["public"]["Enums"]["QuestionType"]
        }
        Insert: {
          courseId: string
          id: string
          order?: number
          scaleMax?: number | null
          scaleMaxLabel?: string | null
          scaleMin?: number | null
          scaleMinLabel?: string | null
          text: string
          type: Database["public"]["Enums"]["QuestionType"]
        }
        Update: {
          courseId?: string
          id?: string
          order?: number
          scaleMax?: number | null
          scaleMaxLabel?: string | null
          scaleMin?: number | null
          scaleMinLabel?: string | null
          text?: string
          type?: Database["public"]["Enums"]["QuestionType"]
        }
        Relationships: [
          {
            foreignKeyName: "Question_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
        ]
      }
      QuestionAnswer: {
        Row: {
          courseId: string
          createdAt: string
          id: string
          questionId: string
          scaleValue: number | null
          selectedOptionIds: string | null
          textValue: string | null
          userId: string
        }
        Insert: {
          courseId: string
          createdAt?: string
          id: string
          questionId: string
          scaleValue?: number | null
          selectedOptionIds?: string | null
          textValue?: string | null
          userId: string
        }
        Update: {
          courseId?: string
          createdAt?: string
          id?: string
          questionId?: string
          scaleValue?: number | null
          selectedOptionIds?: string | null
          textValue?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "QuestionAnswer_questionId_fkey"
            columns: ["questionId"]
            isOneToOne: false
            referencedRelation: "Question"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "QuestionAnswer_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      QuestionOption: {
        Row: {
          id: string
          label: string
          order: number
          questionId: string
        }
        Insert: {
          id: string
          label: string
          order?: number
          questionId: string
        }
        Update: {
          id?: string
          label?: string
          order?: number
          questionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "QuestionOption_questionId_fkey"
            columns: ["questionId"]
            isOneToOne: false
            referencedRelation: "Question"
            referencedColumns: ["id"]
          },
        ]
      }
      RateLimitHit: {
        Row: {
          createdAt: string
          id: string
          key: string
        }
        Insert: {
          createdAt?: string
          id: string
          key: string
        }
        Update: {
          createdAt?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      Settings: {
        Row: {
          availability: string
          id: string
          whatsappNumber: string
        }
        Insert: {
          availability?: string
          id?: string
          whatsappNumber?: string
        }
        Update: {
          availability?: string
          id?: string
          whatsappNumber?: string
        }
        Relationships: []
      }
      SocialLink: {
        Row: {
          createdAt: string
          id: string
          platform: Database["public"]["Enums"]["SocialPlatform"]
          url: string
        }
        Insert: {
          createdAt?: string
          id: string
          platform: Database["public"]["Enums"]["SocialPlatform"]
          url: string
        }
        Update: {
          createdAt?: string
          id?: string
          platform?: Database["public"]["Enums"]["SocialPlatform"]
          url?: string
        }
        Relationships: []
      }
      SocialLinkAssignment: {
        Row: {
          id: string
          linkId: string
          platform: Database["public"]["Enums"]["SocialPlatform"]
          surface: Database["public"]["Enums"]["SocialSurface"]
        }
        Insert: {
          id: string
          linkId: string
          platform: Database["public"]["Enums"]["SocialPlatform"]
          surface: Database["public"]["Enums"]["SocialSurface"]
        }
        Update: {
          id?: string
          linkId?: string
          platform?: Database["public"]["Enums"]["SocialPlatform"]
          surface?: Database["public"]["Enums"]["SocialSurface"]
        }
        Relationships: [
          {
            foreignKeyName: "SocialLinkAssignment_linkId_fkey"
            columns: ["linkId"]
            isOneToOne: false
            referencedRelation: "SocialLink"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          createdAt: string
          dateOfBirth: string | null
          email: string
          id: string
          messagesReadByAdminAt: string | null
          messagesReadByUserAt: string | null
          name: string
          phone: string | null
          profileCategory: Database["public"]["Enums"]["ProfileCategory"] | null
          role: Database["public"]["Enums"]["Role"]
        }
        Insert: {
          createdAt?: string
          dateOfBirth?: string | null
          email: string
          id: string
          messagesReadByAdminAt?: string | null
          messagesReadByUserAt?: string | null
          name: string
          phone?: string | null
          profileCategory?:
            | Database["public"]["Enums"]["ProfileCategory"]
            | null
          role?: Database["public"]["Enums"]["Role"]
        }
        Update: {
          createdAt?: string
          dateOfBirth?: string | null
          email?: string
          id?: string
          messagesReadByAdminAt?: string | null
          messagesReadByUserAt?: string | null
          name?: string
          phone?: string | null
          profileCategory?:
            | Database["public"]["Enums"]["ProfileCategory"]
            | null
          role?: Database["public"]["Enums"]["Role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_course_if_no_enrollments: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      create_question_with_options: {
        Args: {
          p_course_id: string
          p_type: string
          p_text: string
          p_order: number
          p_scale_min: number | null
          p_scale_max: number | null
          p_scale_min_label: string | null
          p_scale_max_label: string | null
          p_options: Json
        }
        Returns: string
      }
      update_question_with_options: {
        Args: {
          p_question_id: string
          p_type: string
          p_text: string
          p_order: number
          p_scale_min: number | null
          p_scale_max: number | null
          p_scale_min_label: string | null
          p_scale_max_label: string | null
          p_options: Json
        }
        Returns: undefined
      }
      create_social_link_with_assignments: {
        Args: { p_platform: string; p_url: string; p_surfaces: string[] }
        Returns: string
      }
    }
    Enums: {
      CourseAudience: "ADOLESCENT" | "PARENT_TEACHER"
      EnrollmentStatus: "PENDING" | "APPROVED" | "REJECTED"
      MessageSender: "USER" | "ADMIN" | "SYSTEM"
      ProfileCategory: "MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER"
      QuestionType: "OPEN" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SCALE"
      Role: "USER" | "ADMIN"
      SocialPlatform:
        | "INSTAGRAM"
        | "FACEBOOK"
        | "YOUTUBE"
        | "TIKTOK"
        | "WHATSAPP"
      SocialSurface: "GLOBAL" | "PARENTS" | "ADOLESCENTS"
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
      CourseAudience: ["ADOLESCENT", "PARENT_TEACHER"],
      EnrollmentStatus: ["PENDING", "APPROVED", "REJECTED"],
      MessageSender: ["USER", "ADMIN", "SYSTEM"],
      ProfileCategory: ["MOTHER", "TEACHER", "ADOLESCENT", "OTHER"],
      QuestionType: ["OPEN", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "SCALE"],
      Role: ["USER", "ADMIN"],
      SocialPlatform: [
        "INSTAGRAM",
        "FACEBOOK",
        "YOUTUBE",
        "TIKTOK",
        "WHATSAPP",
      ],
      SocialSurface: ["GLOBAL", "PARENTS", "ADOLESCENTS"],
    },
  },
} as const

