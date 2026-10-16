
-- Allow anon to view active products
CREATE POLICY "Anon can view active products"
  ON products FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to view active categories
CREATE POLICY "Anon can view active categories"
  ON categories FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to view active banners
CREATE POLICY "Anon can view active banners"
  ON banners FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to view active variants
CREATE POLICY "Anon can view active variants"
  ON product_variants FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to view active addons
CREATE POLICY "Anon can view active addons"
  ON product_addons FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to view active addon options
CREATE POLICY "Anon can view active addon options"
  ON addon_options FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to view active governorates (needed for product detail)
CREATE POLICY "Anon can view active governorates"
  ON governorates FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to view app settings
CREATE POLICY "Anon can view settings"
  ON app_settings FOR SELECT TO anon
  USING (true);
