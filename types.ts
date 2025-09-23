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
}

export interface Plan {
    id: number;
    name: string;
    price: number;
    credits_per_month: number;
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

export interface AppSettings {
  id: number; // Should always be 1 for single-row table
  image_credit_cost: number;
  video_credit_cost: number;
  prompt_credit_cost: number;
  chat_credit_cost: number;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  applicable_plan_id: number | null;
  is_active: boolean;
  created_at: string;
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


export type { Session };