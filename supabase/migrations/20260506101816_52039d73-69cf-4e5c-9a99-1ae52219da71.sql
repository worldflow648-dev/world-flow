
-- Seed governorates
INSERT INTO public.governorates (id, name_ar, name_en, shipping_fee, is_active) VALUES
  ('baghdad', 'بغداد', 'Baghdad', 5000, true),
  ('basra', 'البصرة', 'Basra', 7000, true),
  ('erbil', 'أربيل', 'Erbil', 8000, true),
  ('najaf', 'النجف', 'Najaf', 6000, true),
  ('karbala', 'كربلاء', 'Karbala', 6000, true),
  ('mosul', 'الموصل', 'Mosul', 8000, true),
  ('kirkuk', 'كركوك', 'Kirkuk', 7000, true),
  ('babylon', 'بابل', 'Babylon', 5500, true),
  ('wasit', 'واسط', 'Wasit', 6000, true),
  ('diyala', 'ديالى', 'Diyala', 6000, true),
  ('anbar', 'الأنبار', 'Anbar', 8000, true),
  ('sulaymaniyah', 'السليمانية', 'Sulaymaniyah', 8000, true),
  ('dohuk', 'دهوك', 'Dohuk', 8000, true),
  ('maysan', 'ميسان', 'Maysan', 7000, true),
  ('dhi_qar', 'ذي قار', 'Dhi Qar', 7000, true),
  ('muthanna', 'المثنى', 'Muthanna', 7000, true),
  ('qadisiyyah', 'القادسية', 'Qadisiyyah', 6000, true),
  ('saladin', 'صلاح الدين', 'Saladin', 7000, true)
ON CONFLICT (id) DO NOTHING;

-- Seed tier discounts
INSERT INTO public.tier_discounts (tier, discount_type, discount_value, is_active)
SELECT 'basic', 'percentage', 0, true WHERE NOT EXISTS (SELECT 1 FROM public.tier_discounts WHERE tier = 'basic');
INSERT INTO public.tier_discounts (tier, discount_type, discount_value, is_active)
SELECT 'professional', 'percentage', 10, true WHERE NOT EXISTS (SELECT 1 FROM public.tier_discounts WHERE tier = 'professional');

-- Seed app settings
INSERT INTO public.app_settings (key, value) VALUES
  ('qi_card_number', ''),
  ('qi_card_name', ''),
  ('asiacell_phone_number', ''),
  ('asiacell_holder_name', ''),
  ('support_whatsapp', ''),
  ('support_email', ''),
  ('allow_below_cost_pricing', 'true'),
  ('privacy_policy', 'سياسة الخصوصية الخاصة بالتطبيق. يرجى تحديث هذا النص من لوحة الإدارة.'),
  ('about_app', 'تطبيق متجر إلكتروني عراقي متكامل للتجار. يرجى تحديث هذا النص من لوحة الإدارة.'),
  ('faqs', '[{"question":"كيف يمكنني إنشاء طلب جديد؟","answer":"اختر المنتج، أضفه إلى السلة، ثم أكمل بيانات العميل وأرسل الطلب."},{"question":"متى يتم تسليم الطلبات؟","answer":"عادةً خلال 2-5 أيام عمل حسب المحافظة."},{"question":"كيف أسحب أرباحي؟","answer":"من صفحة المحفظة يمكنك إرسال طلب تسوية وسيتم معالجته من قبل الإدارة."}]')
ON CONFLICT (key) DO NOTHING;

-- Seed categories
INSERT INTO public.categories (name, name_en, icon, sort_order)
SELECT 'هوديز', 'Hoodies', '👕', 1 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'هوديز');
INSERT INTO public.categories (name, name_en, icon, sort_order)
SELECT 'تيشيرتات', 'T-shirts', '👚', 2 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'تيشيرتات');
INSERT INTO public.categories (name, name_en, icon, sort_order)
SELECT 'أكواب', 'Cups', '☕', 3 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'أكواب');
INSERT INTO public.categories (name, name_en, icon, sort_order)
SELECT 'سويت شيرت', 'Sweatshirts', '🧥', 4 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'سويت شيرت');

-- Seed default attendance shift
INSERT INTO public.attendance_shifts (name, shift_start, shift_end, grace_minutes, absent_after_minutes, overtime_enabled, overtime_min_minutes, overtime_rate_per_hour, is_active)
SELECT 'الوردية الرئيسية', '15:00', '22:00', 15, 60, true, 15, 5000, true
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_shifts);

-- Seed starter banner
INSERT INTO public.banners (title, subtitle, cta_text, link, icon, bg_gradient, sort_order, is_active)
SELECT 'أهلاً بكم في متجرنا', 'اكتشف أحدث المنتجات بأفضل الأسعار', 'تسوق الآن', '/search', 'sparkles', 'from-indigo-600 via-violet-600 to-purple-700', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.banners);
