-- Create atomic registration function
CREATE OR REPLACE FUNCTION complete_user_registration(
  p_user_id uuid,
  p_activation_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Get the role from activation key
  SELECT role INTO v_role
  FROM activation_keys
  WHERE code = p_activation_key
    AND is_used = false
    AND expires_at > now();
  
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Mark activation key as used
  UPDATE activation_keys
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE code = p_activation_key;
  
  -- Assign role to user
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, v_role)
  ON CONFLICT DO NOTHING;
  
  -- Create wallet for merchants
  IF v_role = 'merchant' THEN
    INSERT INTO wallets (merchant_id, balance, total_earned, total_withdrawn)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN true;
END;
$$;

-- Grant execute to anonymous users (needed for registration)
GRANT EXECUTE ON FUNCTION complete_user_registration TO anon;
GRANT EXECUTE ON FUNCTION complete_user_registration TO authenticated;