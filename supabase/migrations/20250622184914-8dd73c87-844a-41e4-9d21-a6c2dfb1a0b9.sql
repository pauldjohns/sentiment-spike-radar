
-- Update the admin user profile to set correct role and approval status
UPDATE public.profiles 
SET 
  role = 'admin',
  approved = true,
  approved_at = now(),
  approved_by = id  -- Self-approved: this is the initial admin
WHERE email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL';
