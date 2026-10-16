-- 1. Wipe all transactional + financial data
TRUNCATE TABLE
  public.order_status_history,
  public.order_items,
  public.order_returns,
  public.wallet_transactions,
  public.settlement_order_links,
  public.settlement_receipts,
  public.settlement_requests,
  public.issue_reports,
  public.expenses,
  public.discount_codes,
  public.attendance_overtime_payments,
  public.staff_attendance,
  public.attendance_shifts,
  public.orders,
  public.wallets
RESTART IDENTITY CASCADE;

-- 2. Wipe catalog + config
TRUNCATE TABLE
  public.addon_options,
  public.product_addons,
  public.product_variants,
  public.products,
  public.categories,
  public.banners,
  public.tier_discounts,
  public.governorates,
  public.app_settings
RESTART IDENTITY CASCADE;

-- 3. Wipe identity tables (children before parents)
DELETE FROM public.activation_keys;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- 4. Wipe auth users (cascades to identities, sessions, refresh tokens)
DELETE FROM auth.users;

-- 5. Seed admin account
DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'Admin@Worldflow.com',
    crypt('WorldFlow123@456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin"}'::jsonb,
    now(), now(), '', '', '', '', false, false
  );

  -- handle_new_user trigger should have inserted a profile row; promote it.
  UPDATE public.profiles
  SET full_name = 'Admin',
      profile_completed = true,
      updated_at = now()
  WHERE id = v_admin_id;

  -- If no profile was created (trigger missed), insert it.
  INSERT INTO public.profiles (id, full_name, profile_completed)
  SELECT v_admin_id, 'Admin', true
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin'::public.app_role);
END $$;