import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/MerchantLayout";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useMerchantInvoices, MonthlyInvoice, InvoiceOrder } from "@/hooks/useMerchantInvoices";
import { useMerchantSettlements } from "@/hooks/useSettlementReceipts";
import { usePendingSettlementRequest, useCreateSettlementRequest } from "@/hooks/useSettlementRequests";
import { useGovernorates } from "@/hooks/useCatalogData";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ChevronDown, ChevronUp, Search, Receipt, HandCoins, Wallet, Loader2, User, Phone, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function useFormatPrice() {
  const { locale, t } = useLanguage();
  return (price: number) => price.toLocaleString(locale) + " " + t('common.currency');
}


function OrderRow({ order, govNameMap }: { order: InvoiceOrder; govNameMap: Map<string, string> }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const formatPrice = useFormatPrice();
  const govName = govNameMap.get(order.governorate) || order.governorate;
  const shipping = Number(order.shipping_fee || 0);
  const discount = Number(order.discount_amount || 0);

  return (
    <div className="text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 gap-3 hover:bg-muted/30 transition-colors text-right"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">{order.order_number}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(order.delivered_at || order.created_at).toLocaleDateString(locale)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
            <User className="h-3 w-3 shrink-0" />
            {order.customer_name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-primary text-xs">{formatPrice(Number(order.net_profit))}</span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 space-y-3 bg-muted/10 border-t border-border/20">
          {/* Contact */}
          <div className="space-y-1.5">
            <a
              href={`tel:${order.customer_phone}`}
              className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span dir="ltr" className="font-mono">{order.customer_phone}</span>
            </a>
            {order.customer_phone2 && (
              <a
                href={`tel:${order.customer_phone2}`}
                className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span dir="ltr" className="font-mono">{order.customer_phone2}</span>
              </a>
            )}
            <div className="flex items-start gap-2 text-xs text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="leading-relaxed">
                {govName}
                {order.region ? ` · ${order.region}` : ""}
                {order.landmark ? ` · ${order.landmark}` : ""}
              </span>
            </div>
          </div>

          {/* Financial breakdown */}
          <div className="rounded-lg bg-background/60 border border-border/30 p-2.5 space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t('invoices.totalSale')}</span>
              <span className="font-semibold">{formatPrice(Number(order.final_retail_price))}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t('invoices.productCost')}</span>
              <span className="font-semibold">{formatPrice(Number(order.total_merchant_cost))}</span>
            </div>
            {shipping > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{t('invoices.shippingFees')}</span>
                <span className="font-semibold">{formatPrice(shipping)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{t('invoices.discountLabel')}</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  -{formatPrice(discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs pt-1.5 border-t border-border/30">
              <span className="font-semibold">{t('invoices.netProfit')}</span>
              <span className="font-bold text-primary">{formatPrice(Number(order.net_profit))}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/order/${order.id}`);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('invoices.viewOrderDetails')}
          </Button>
        </div>
      )}
    </div>
  );
}

function InvoiceCard({ invoice, govNameMap }: { invoice: MonthlyInvoice; govNameMap: Map<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const formatPrice = useFormatPrice();

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-right gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm">{invoice.monthLabel}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.ordersCount} {t('invoices.completedOrder')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-left">
            <p className="text-sm font-bold text-primary">{formatPrice(invoice.totalProfit)}</p>
            <p className="text-[10px] text-muted-foreground">{t('invoices.netProfit')}</p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30">
          <div className="flex justify-between px-4 py-2 bg-muted/20 text-xs text-muted-foreground">
            <span>{t('invoices.totalSales')}: {formatPrice(invoice.totalRevenue)}</span>
            <span>{t('invoices.netProfit')}: {formatPrice(invoice.totalProfit)}</span>
          </div>
          <div className="divide-y divide-border/20">
            {invoice.orders.map((order) => (
              <OrderRow key={order.id} order={order} govNameMap={govNameMap} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function MerchantInvoices() {
  const { t, locale } = useLanguage();
  const formatPrice = useFormatPrice();
  const { data: invoices, isLoading } = useMerchantInvoices();
  const { data: settlements, isLoading: settlementsLoading } = useMerchantSettlements();
  const { data: pendingRequest } = usePendingSettlementRequest();
  const createRequest = useCreateSettlementRequest();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("invoices");
  const queryClient = useQueryClient();
  const { data: governorates } = useGovernorates();

  const govNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (governorates || []).forEach((g) => map.set(g.id, g.name_ar));
    return map;
  }, [governorates]);

  const { data: walletBalance = 0 } = useQuery({
    queryKey: ["merchant-wallet-balance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("merchant_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.balance ?? 0);
    },
  });

  const handleRequestSettlement = async () => {
    if (walletBalance <= 0 || pendingRequest) return;
    try {
      await createRequest.mutateAsync({ amount: walletBalance });
      toast.success(t('invoices.settlementSuccess'));
    } catch {
      toast.error(t('invoices.settlementError'));
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["merchant-invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["settlement-receipts"] }),
    ]);
  }, [queryClient]);

  const filtered = invoices?.filter((inv) =>
    inv.monthLabel.includes(search)
  );

  return (
    <MerchantLayout title={t('invoices.title')} hideHeader>
      <div className="max-w-2xl mx-auto px-4 pb-32">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg pt-4 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">{t('invoices.headerTitle')}</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invoices" className="gap-1">
                <Receipt className="h-4 w-4" />
                {t('invoices.tabInvoices')}
              </TabsTrigger>
              <TabsTrigger value="settlements" className="gap-1">
                <HandCoins className="h-4 w-4" />
                {t('invoices.tabSettlements')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "invoices" && (
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('invoices.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

        <PullToRefresh onRefresh={handleRefresh}>
          {activeTab === "invoices" ? (
            isLoading ? (
              <div className="space-y-3 mt-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : !filtered || filtered.length === 0 ? (
              <EmptyState type="orders" />
            ) : (
              <div className="space-y-3 mt-2">
                {filtered.map((inv) => (
                  <InvoiceCard key={inv.monthKey} invoice={inv} govNameMap={govNameMap} />
                ))}
              </div>
            )
          ) : (
            settlementsLoading ? (
              <div className="space-y-3 mt-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : !settlements || settlements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('invoices.noSettlements')}</div>
            ) : (
              <div className="space-y-3 mt-2">
                 {settlements.map((s) => (
                   <Card key={s.id} className="p-4 space-y-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                           <HandCoins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                         </div>
                         <div>
                           <p className="text-base font-bold text-primary">{formatPrice(s.amount)}</p>
                           <p className="text-[10px] font-mono text-muted-foreground">#{s.id.slice(0, 8).toUpperCase()}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                         <span className="text-xs font-medium">{t('invoices.settlementCompleted')}</span>
                       </div>
                     </div>
                     {s.description && (
                       <p className="text-sm text-muted-foreground pr-[52px]">{s.description}</p>
                     )}
                     <div className="text-xs text-muted-foreground pr-[52px]">
                       {new Date(s.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                     </div>
                   </Card>
                 ))}
               </div>
            )
          )}
        </PullToRefresh>

        {/* Floating Settlement Request Button */}
        <div className="fixed bottom-32 left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-auto z-40 flex justify-center md:justify-end">
          <Button
            onClick={handleRequestSettlement}
            disabled={walletBalance <= 0 || !!pendingRequest || createRequest.isPending}
            className={cn(
              "rounded-full shadow-xl px-6 h-12 text-sm font-bold gap-2",
              pendingRequest
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-primary text-primary-foreground"
            )}
          >
            {createRequest.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wallet className="h-5 w-5" />
            )}
            {pendingRequest ? t('invoices.settlementUnderReview') : t('invoices.requestSettlementBtn')}
          </Button>
        </div>
      </div>
    </MerchantLayout>
  );
}
