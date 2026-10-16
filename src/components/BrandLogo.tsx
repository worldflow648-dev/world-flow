import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "h-9 w-9" }: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn(className)} aria-hidden="true" />;
  }

  return (
    <img
      src={resolvedTheme === "dark" ? logoDark : logoLight}
      alt="World Flow"
      className={cn("object-contain", className)}
    />
  );
}
