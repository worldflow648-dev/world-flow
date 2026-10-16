-- Add role and label columns to activation_keys table
ALTER TABLE activation_keys 
ADD COLUMN role app_role NOT NULL DEFAULT 'merchant',
ADD COLUMN label text;

-- Create function to get activation key role
CREATE OR REPLACE FUNCTION get_activation_key_role(key_code text)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role FROM activation_keys 
    WHERE code = key_code 
      AND is_used = false 
      AND expires_at > now()
  );
END;
$$;