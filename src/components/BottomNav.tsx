import React, { forwardRef, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, ClipboardList, LayoutDashboard, LogIn } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  actionSlot?: React.ReactNode;
}

const NOTCH_RADIUS = 40;
const CORNER_RADIUS = 16;

export const BottomNav = forwardRef<HTMLElement, BottomNavProps>(
  function BottomNav({ actionSlot }, ref) {
    const location = useLocation();
    const { getItemCount } = useCart();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const itemCount = getItemCount();

    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const update = () => {
        setSize({ width: el.clientWidth, height: el.clientHeight });
      };
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, [actionSlot, isAuthenticated]);

    const navItems = isAuthenticated
      ? [
          { path: "/", icon: Home, label: t('nav.home') },
          { path: "/search", icon: Search, label: t('nav.search') },
          { path: "/cart", icon: ShoppingCart, label: t('nav.cart'), badgeCount: itemCount },
          { path: "/orders", icon: ClipboardList, label: t('nav.orders') },
          { path: "/dashboard", icon: LayoutDashboard, label: t('nav.dashboard') },
        ]
      : [
          { path: "/", icon: Home, label: t('nav.home') },
          { path: "/search", icon: Search, label: t('nav.search') },
          { path: "/auth", icon: LogIn, label: t('nav.login') },
        ];

    const hasCart = isAuthenticated;
    const cartIndex = hasCart ? 2 : -1;
    const itemCount_ = navItems.length;

    // Cart column center: (cartIndex + 0.5) / total * width
    const w = size.width;
    const h = size.height;
    const cartCenterX = hasCart && w > 0 ? ((cartIndex + 0.5) / itemCount_) * w : w / 2;
    const r = NOTCH_RADIUS;
    const cr = CORNER_RADIUS;
    const notchStart = cartCenterX - r;
    const notchEnd = cartCenterX + r;

    const path = w > 0 && h > 0
      ? hasCart
        ? `M 0,${cr} Q 0,0 ${cr},0 L ${notchStart},0 A ${r},${r} 0 0 0 ${notchEnd},0 L ${w - cr},0 Q ${w},0 ${w},${cr} L ${w},${h - cr} Q ${w},${h} ${w - cr},${h} L ${cr},${h} Q 0,${h} 0,${h - cr} Z`
        : `M 0,${cr} Q 0,0 ${cr},0 L ${w - cr},0 Q ${w},0 ${w},${cr} L ${w},${h - cr} Q ${w},${h} ${w - cr},${h} L ${cr},${h} Q 0,${h} 0,${h - cr} Z`
      : "";

    return (
      <nav ref={ref} className="fixed bottom-4 left-4 right-4 z-50 max-w-2xl mx-auto md:hidden" role="navigation" aria-label={t('nav.mainMenu')}>
        <div ref={containerRef} className="relative">
          {/* SVG dock shape with notch */}
          {w > 0 && h > 0 && (
            <svg
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              className="absolute inset-0 pointer-events-none drop-shadow-elevated"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="dock-clip">
                  <path d={path} />
                </clipPath>
              </defs>
              <foreignObject x="0" y="0" width={w} height={h} clipPath="url(#dock-clip)">
                <div className="w-full h-full bg-card" />
              </foreignObject>
              <path
                d={path}
                fill="none"
                stroke="hsl(var(--border) / 0.3)"
                strokeWidth="1"
              />
            </svg>
          )}

          {/* Cart bubble — anchored to dock top edge (notch center) */}
          {hasCart && w > 0 && h > 0 && (() => {
            const cartItem = navItems[cartIndex];
            const isActive = location.pathname === cartItem.path;
            const Icon = cartItem.icon;
            return (
              <Link
                to={cartItem.path}
                aria-label={cartItem.label}
                aria-current={isActive ? 'page' : undefined}
                style={{ left: cartCenterX, top: 0, transform: 'translate(-50%, -50%)' }}
                className={cn(
                  "absolute z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300 ease-out active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive ? "shadow-glow-strong scale-105" : "shadow-glow"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={2.5} />
                {cartItem.badgeCount && cartItem.badgeCount > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-float animate-bounce-in ring-2 ring-background">
                    {cartItem.badgeCount > 9 ? "9+" : cartItem.badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })()}

          <div className="relative">
            {actionSlot && (
              <>
                <div className="p-4 pb-4">
                  {actionSlot}
                </div>
                <div className="border-t border-border/30" />
              </>
            )}

            <div className="flex items-stretch px-1 mt-1 safe-bottom">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                const isCart = item.path === "/cart";

                if (isCart) {
                  return <div key={item.path} className="flex-1 basis-0" />;
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      "relative flex flex-1 basis-0 flex-col items-center justify-end h-16 pb-2 rounded-xl text-xs transition-all duration-300 ease-out active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary transition-all duration-300 ease-out",
                      isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                    )} />

                    <div className="relative h-5 w-5 flex items-center justify-center">
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-all duration-300 ease-out",
                          isActive && "scale-110"
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </div>
                    <span className={cn(
                      "mt-0.5 font-medium transition-all duration-300 ease-out text-[10px]",
                      isActive && "font-bold"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    );
  });
