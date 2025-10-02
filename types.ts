import type { Session } from '@supabase/supabase-js';

export enum GenerationState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  GENERATING_VIDEO = 'GENERATING_VIDEO',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  QUEUED = 'QUEUED',
}

export interface GenerativePart {
  mimeType: string;
  data: string; // base64 encoded string
}

export type Prompt = {
  id: string;
  text: string;
  imageUrl: string | null;
};

export interface PromptCategory {
  id: string;
  title: string;
  prompts: Prompt[];
}

export interface UserProfile {
  id: string;
  email: string | null;
  credits: number;
  plan: 'free' | 'pro';
  role: 'user' | 'admin';
  credits_reset_at: string;
  phone?: string | null;
  country?: string | null;
}

export interface VisitorProfile {
    credits: number;
    lastVisitDate: string; // YYYY-MM-DD
}

export interface Plan {
    id: number;
    name: string;
    price: number;
    credits_per_month: number;
    sale_price?: number | null;
}

export type GraphicSuiteTool = 'asset_generator' | 'logo_maker' | 'photo_editor' | 'upscale' | 'remove_background' | 'replace_background' | 'colorize';

// FIX: Added missing ArchitectureSuiteTool type definition.
export type ArchitectureSuiteTool = 'exterior' | 'interior' | 'landscape';

export interface CreditCostSettings {
    id: number;
    standard_image: number;
    hd_image: number;
    prompt_from_image: number;
    chat_message: number;
    video_generation: number;
    image_restore: number;
    image_edit: number;
    graphic_icon: number;
    graphic_illustration: number;
    graphic_logo_maker: number;
    graphic_pattern: number;
    graphic_upscale: number;
    graphic_remove_background: number;
    graphic_replace_background: number;
    graphic_colorize: number;
    // FIX: Added missing properties for architecture credit costs.
    architecture_exterior: number;
    architecture_interior: number;
    architecture_landscape: number;
}

export interface PlanCountryPrice {
    id: number;
    plan_id: number;
    country: string;
    price: number;
    currency: string;
}

export interface PaymentSettings {
    id: number;
    stripe_public_key: string | null;
    stripe_secret_key: string | null;
    paypal_client_id: string | null;
    manual_payment_instructions_pk: string | null;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
    id: number;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
    expires_at: string | null;
    max_uses: number | null;
    times_used: number;
    is_active: boolean;
    created_at: string;
}

export interface DecadeGeneration {
  status: 'idle' | 'loading' | 'success' | 'error';
  url: string | null;
  error?: string;
}


export type { Session };
