-- Add columns to public.users for referral code tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_signup_count INT DEFAULT 0;

-- Backfill existing users with a unique referral code based on their UUID
UPDATE public.users
SET referral_code = UPPER(SUBSTRING(id::text FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Update trigger function to automatically handle referral registration on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referred_code TEXT;
BEGIN
  referred_code := new.raw_user_meta_data->>'referral_code_used';

  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    subscription_status, 
    phone_number, 
    college, 
    course, 
    year_of_study, 
    referral_code, 
    referred_by
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    'inactive',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'year_of_study',
    UPPER(SUBSTRING(new.id::text FROM 1 FOR 8)),
    referred_code
  );

  -- Increment the referral_signup_count of the referrer
  IF referred_code IS NOT NULL THEN
    UPDATE public.users
    SET referral_signup_count = referral_signup_count + 1
    WHERE referral_code = referred_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
