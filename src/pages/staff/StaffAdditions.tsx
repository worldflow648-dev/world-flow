import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffAdditions, useAddonTags } from '@/hooks/useStaffAdditions';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const StaffAdditions = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useStaffAdditions();
  const { data: allTags = [] } = useAddonTags();

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = items;

    if (selectedTag) {
      result = result.filter(item => item.tags.includes(selectedTag));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        item.orderNumber.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.merchantName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, selectedTag, search]);

  const getWaitingTime = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const tagColors = [
    'bg-primary/10 text-primary border-primary/20',
    'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'bg-violet-500/10 text-violet-600 border-violet-500/20',
    'bg-rose-500/10 text-rose-600 border-rose-500/20',
    'bg-sky-500/10 text-sky-600 border-sky-500/20',
  ];

  const getTagColor = (tag: string) => {
    const idx = allTags.indexOf(tag);
    return tagColors[idx % tagColors.length];
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('staff.searchAdditions') || 'بحث بالطلب أو المنتج أو التاجر...'}
          className="pr-10 text-right"
        />
      </div>

      {/* Tag Filter */}
      <Select value={selectedTag || 'all'} onValueChange={v => setSelectedTag(v === 'all' ? null : v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('staff.allTags') || 'الكل'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('staff.allTags') || 'الكل'}</SelectItem>
          {allTags.map(tag => (
            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} {t('staff.additionsCount') || 'عنصر يحتوي على إضافات'}
      </p>

      {/* Items */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState type="orders" title={t('staff.noAdditions') || 'لا توجد إضافات'} />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <Card
              key={item.orderItemId}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
              onClick={() => navigate(`/staff/order/${item.orderItemId}`)}
            >
              <div className="flex items-start gap-3">
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm truncate">{item.productName}</h3>
                    <span className="text-xs text-muted-foreground font-mono">{item.orderNumber}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.merchantName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getWaitingTime(item.createdAt)}
                    </span>
                    <span>{item.size}{item.color ? ` • ${item.color}` : ''} × {item.quantity}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.addons.map((addon, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={cn('text-xs', getTagColor(addon.tag || addon.name))}
                      >
                        {addon.tag || addon.name}
                        {addon.option ? ` · ${addon.option}` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffAdditions;
