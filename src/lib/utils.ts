import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compute the discount amount for a coupon against a base price.
 * Mirrors checkout logic: percentage = floor(base * value / 100), clamped to base.
 */
export function computeDiscount(
  basePrice: number,
  code: { discount_type: 'percentage' | 'fixed' | string; discount_value: number }
): number {
  if (!basePrice || basePrice <= 0) return 0;
  const raw =
    code.discount_type === 'percentage'
      ? Math.floor((basePrice * code.discount_value) / 100)
      : code.discount_value;
  return Math.max(0, Math.min(raw, basePrice));
}
