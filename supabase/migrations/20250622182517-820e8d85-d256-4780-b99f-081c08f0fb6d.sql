
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Add approval status to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

-- Create admin role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'user';

-- Create policy to allow only approved users to access the app
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin' AND approved = true
    )
  );

-- Create policy for admins to update profiles (for approval)
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin' AND approved = true
    )
  );

-- Update existing users to be approved (so current users aren't locked out)
UPDATE public.profiles SET approved = true WHERE approved IS NULL OR approved = false;

-- Grant the initial admin. Set this to your own address before applying,
-- or apply it by hand after your first signup.
UPDATE public.profiles 
SET role = 'admin', approved = true 
WHERE email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL';
