-- Delete duplicate addons, keeping only the older ones (by created_at)
DELETE FROM product_addons 
WHERE id IN (
  'afc52201-181b-407b-98bf-0b6746740a18',
  '3b475d72-7831-4013-8c68-5528f86d8797'
);