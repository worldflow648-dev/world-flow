import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, ShoppingBag, TrendingUp, Wallet, Eye, HandCoins } from 'lucide-react';

interface MerchantFinancial {
  id: string;
  name: string;
  phone: string | null;
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  walletBalance: number;
  totalWithdrawn: number;
}

interface MerchantFinancialCardProps {
  merchant: MerchantFinancial;
  onViewDetails?: (merchantId: string) => void;
  onSettle?: (merchantId: string, merchantName: string, walletBalance: number) => void;
}

function formatPrice(price: number): string {
  return Math.round(price).toLocaleString('en-US');
}

const MerchantFinancialCard = ({ merchant, onViewDetails, onSettle }: MerchantFinancialCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{merchant.name}</p>
              {merchant.phone && (
                <p className="text-xs text-muted-foreground font-normal" dir="ltr">
                  {merchant.phone}
                </p>
              )}
            </div>
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <ShoppingBag className="w-3 h-3" />
            {merchant.ordersCount} طلب
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs text-muted-foreground">الإيرادات</p>
            <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
              {formatPrice(merchant.totalRevenue)} <span className="text-xs">د.ع</span>
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <Wallet className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-muted-foreground">الأرباح</p>
            <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
              {formatPrice(merchant.totalProfit)} <span className="text-xs">د.ع</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div>
            <span className="text-muted-foreground">الرصيد الحالي: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {formatPrice(merchant.walletBalance)} د.ع
            </span>
          </div>
          <div className="text-muted-foreground">
            تم سحب: {formatPrice(merchant.totalWithdrawn)} د.ع
          </div>
        </div>


        <div className="flex gap-2">
          {onSettle && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-2"
              disabled={merchant.walletBalance <= 0}
              onClick={() => onSettle(merchant.id, merchant.name, merchant.walletBalance)}
            >
              <HandCoins className="w-4 h-4" />
              تسوية
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => onViewDetails(merchant.id)}
            >
              <Eye className="w-4 h-4" />
              عرض التفاصيل
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantFinancialCard;
