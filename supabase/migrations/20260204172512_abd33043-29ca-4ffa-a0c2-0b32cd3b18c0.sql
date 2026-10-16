-- Create SECURITY DEFINER function to safely fetch user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_role;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO anon;