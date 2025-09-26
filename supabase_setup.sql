-- ========= 1. Custom Types (Enums) =========
-- These ensure data consistency for roles, plans, etc.

-- Drop types if they exist to apply changes
DROP TYPE IF EXISTS public.user_plan CASCADE;
CREATE TYPE public.user_plan AS ENUM ('free', 'pro');

DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

DROP TYPE IF EXISTS public.discount_type CASCADE;
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');


-- ========= 2. Table Creation =========
-- Creates all the tables your application needs.

-- Stores public user profiles, linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  credits integer NOT NULL DEFAULT 50,
  plan public.user_plan NOT NULL DEFAULT 'free'::user_plan,
  role public.user_role NOT NULL DEFAULT 'user'::user_role,
  credits_reset_at timestamptz DEFAULT now(),
  phone text,
  country text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
COMMENT ON TABLE public.profiles IS 'Stores public user data. RLS policies should be applied.';

-- Stores membership plans (e.g., free, pro)
CREATE TABLE IF NOT EXISTS public.plans (
  id smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text UNIQUE NOT NULL,
  price numeric(6, 2) NOT NULL DEFAULT 0.00,
  credits_per_month integer NOT NULL
);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sale_price numeric(6, 2);
COMMENT ON TABLE public.plans IS 'Defines membership plans and their default USD prices.';

-- Stores country-specific pricing for plans
CREATE TABLE IF NOT EXISTS public.plan_country_prices (
  id smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  plan_id smallint NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  country text NOT NULL,
  price numeric(10, 2) NOT NULL,
  currency character varying(3) NOT NULL,
  UNIQUE (plan_id, country)
);
COMMENT ON TABLE public.plan_country_prices IS 'Overrides default plan prices for specific countries.';

-- Creates the 'credit_costs' table
CREATE TABLE IF NOT EXISTS public.credit_costs (
  id smallint PRIMARY KEY DEFAULT 1,
  standard_image integer NOT NULL DEFAULT 10,
  hd_image integer NOT NULL DEFAULT 20,
  prompt_from_image integer NOT NULL DEFAULT 2,
  chat_message integer NOT NULL DEFAULT 1,
  video_generation integer NOT NULL DEFAULT 250,
  CONSTRAINT credit_costs_singleton CHECK (id = 1)
);
COMMENT ON TABLE public.credit_costs IS 'Singleton table defining credit costs for features.';

-- Stores payment integration settings (singleton table)
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  stripe_public_key text,
  stripe_secret_key text,
  paypal_client_id text,
  manual_payment_instructions_pk text,
  CONSTRAINT payment_settings_singleton CHECK (id = 1)
);
COMMENT ON TABLE public.payment_settings IS 'Singleton table for payment provider API keys and settings.';

-- Stores example prompts for the UI
CREATE TABLE IF NOT EXISTS public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  image_url text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.prompts IS 'Stores example prompts displayed in the application.';

-- Stores submissions from the contact form
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.contact_submissions IS 'Stores messages sent through the contact form.';

-- Stores discount coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code text UNIQUE NOT NULL,
  discount_type public.discount_type NOT NULL,
  discount_value numeric NOT NULL,
  expires_at timestamptz,
  max_uses integer,
  times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.coupons IS 'Stores discount coupons for promotions.';


-- ========= 3. Database Functions & Triggers =========
-- Automates profile creation and handles coupon logic.

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_credits int;
BEGIN
  SELECT credits_per_month INTO free_plan_credits FROM public.plans WHERE name = 'free' LIMIT 1;
  INSERT INTO public.profiles (id, email, credits, phone, country, credits_reset_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(free_plan_credits, 50), 
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- (FIX) Function to get the current user's role without causing recursion in RLS.
-- This function runs with the permissions of the definer, bypassing the RLS check on the profiles table.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
DECLARE
  user_role_result public.user_role;
BEGIN
  SELECT role INTO user_role_result FROM public.profiles WHERE id = auth.uid();
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- RPC function to validate a coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(coupon_code TEXT)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    coupon_record public.coupons;
BEGIN
    SELECT * INTO coupon_record FROM public.coupons WHERE code = coupon_code;
    IF coupon_record IS NULL THEN RETURN json_build_object('error', 'Coupon not found.'); END IF;
    IF NOT coupon_record.is_active THEN RETURN json_build_object('error', 'This coupon is no longer active.'); END IF;
    IF coupon_record.expires_at IS NOT NULL AND coupon_record.expires_at < now() THEN RETURN json_build_object('error', 'This coupon has expired.'); END IF;
    IF coupon_record.max_uses IS NOT NULL AND coupon_record.times_used >= coupon_record.max_uses THEN RETURN json_build_object('error', 'This coupon has reached its maximum usage limit.'); END IF;
    RETURN to_json(coupon_record);
END;
$$;

-- RPC function to increment coupon usage
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_code TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.coupons SET times_used = times_used + 1 WHERE code = coupon_code;
END;
$$;


-- ========= 4. Storage Setup =========
-- Creates the bucket for prompt images and sets access policies.

-- Create the storage bucket for prompt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('prompt_images', 'prompt_images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket to allow public reads and admin writes
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'prompt_images');

DROP POLICY IF EXISTS "Allow admin insert" ON storage.objects;
CREATE POLICY "Allow admin insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'prompt_images' AND public.get_my_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS "Allow admin update" ON storage.objects;
CREATE POLICY "Allow admin update" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'prompt_images' AND public.get_my_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS "Allow admin delete" ON storage.objects;
CREATE POLICY "Allow admin delete" ON storage.objects
FOR DELETE USING (bucket_id = 'prompt_images' AND public.get_my_role() = 'admin'::public.user_role);


-- ========= 5. Row Level Security (RLS) Policies =========
-- Secures your data, ensuring users can only access what they're allowed to.

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_country_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ** Profiles Policies **
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile." ON public.profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
CREATE POLICY "Admins can view all profiles." ON public.profiles
FOR SELECT USING (public.get_my_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile." ON public.profiles
FOR UPDATE USING (public.get_my_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS "Admins can delete any profile." ON public.profiles;
CREATE POLICY "Admins can delete any profile." ON public.profiles
FOR DELETE USING (public.get_my_role() = 'admin'::public.user_role);

-- ** Plans, Prices, Costs, Prompts Policies (Public Read, Admin Write) **
DROP POLICY IF EXISTS "Allow public read access" ON public.plans;
CREATE POLICY "Allow public read access" ON public.plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read access" ON public.plan_country_prices;
CREATE POLICY "Allow public read access" ON public.plan_country_prices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read access" ON public.credit_costs;
CREATE POLICY "Allow public read access" ON public.credit_costs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read access" ON public.prompts;
CREATE POLICY "Allow public read access" ON public.prompts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin full access" ON public.plans;
CREATE POLICY "Allow admin full access" ON public.plans
FOR ALL USING (public.get_my_role() = 'admin'::public.user_role);
DROP POLICY IF EXISTS "Allow admin full access" ON public.plan_country_prices;
CREATE POLICY "Allow admin full access" ON public.plan_country_prices
FOR ALL USING (public.get_my_role() = 'admin'::public.user_role);
DROP POLICY IF EXISTS "Allow admin full access" ON public.credit_costs;
CREATE POLICY "Allow admin full access" ON public.credit_costs
FOR ALL USING (public.get_my_role() = 'admin'::public.user_role);
DROP POLICY IF EXISTS "Allow admin full access" ON public.prompts;
CREATE POLICY "Allow admin full access" ON public.prompts
FOR ALL USING (public.get_my_role() = 'admin'::public.user_role);

-- ** Payment Settings, Coupons Policies (Admin Only) **
DROP POLICY IF EXISTS "Allow admin full access" ON public.payment_settings;
CREATE POLICY "Allow admin full access" ON public.payment_settings
FOR ALL USING (public.get_my_role() = 'admin'::public.user_role);
DROP POLICY IF EXISTS "Allow admin full access" ON public.coupons;
CREATE POLICY "Allow admin full access" ON public.coupons
FOR ALL USING (public.get_my_role() = 'admin'::public.user_role);

-- ** Contact Submissions Policies **
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.contact_submissions;
CREATE POLICY "Allow anonymous inserts" ON public.contact_submissions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow admin read access" ON public.contact_submissions;
CREATE POLICY "Allow admin read access" ON public.contact_submissions FOR SELECT USING (public.get_my_role() = 'admin'::public.user_role);


-- ========= 6. Initial Data (Seeding) =========
-- Inserts the default data needed for the application to run.

-- Seed the plans table
INSERT INTO public.plans (name, price, credits_per_month, sale_price)
VALUES 
  ('free', 0.00, 50, null),
  ('pro', 5.99, 2500, null)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  credits_per_month = EXCLUDED.credits_per_month,
  sale_price = EXCLUDED.sale_price;

-- Seed the credit_costs table
INSERT INTO public.credit_costs (id, standard_image, hd_image, prompt_from_image, chat_message, video_generation)
VALUES (1, 10, 20, 2, 1, 250)
ON CONFLICT (id) DO UPDATE SET
  standard_image = EXCLUDED.standard_image,
  hd_image = EXCLUDED.hd_image,
  prompt_from_image = EXCLUDED.prompt_from_image,
  chat_message = EXCLUDED.chat_message,
  video_generation = EXCLUDED.video_generation;

-- Seed the payment_settings table
INSERT INTO public.payment_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
