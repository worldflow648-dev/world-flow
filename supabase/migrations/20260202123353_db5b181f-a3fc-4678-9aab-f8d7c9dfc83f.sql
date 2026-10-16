-- Function to handle new user signup - auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_name text;
  _phone text;
BEGIN
  -- Get metadata from signup
  _full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  _phone := new.raw_user_meta_data->>'phone';
  
  -- Create profile
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, _full_name, _phone);
  
  RETURN new;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();