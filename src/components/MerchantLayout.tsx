import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useLanguage } from "@/contexts/LanguageContext";

interface MerchantLayoutProps {
  children: ReactNode;
  title?: string;
  showSearch?: boolean;
  hideHeader?: boolean;
  actionSlot?: ReactNode;
  className?: string;
}

export function MerchantLayout({
  children,
  title,
  showSearch,
  hideHeader = false,
  actionSlot,
  className,
}: MerchantLayoutProps) {
  const isMobile = useIsMobile();
  const { dir } = useLanguage();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {!hideHeader && <Header title={title} showSearch={showSearch} />}
        {children}
        <BottomNav actionSlot={actionSlot} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background w-full" dir={dir}>
      <DesktopSidebar />
      <main className={`flex-1 min-h-screen overflow-y-auto ${className || ""}`}>
        {children}
      </main>
    </div>
  );
}
