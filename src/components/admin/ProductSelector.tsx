 import { useState } from 'react';
 import { Search, Check } from 'lucide-react';
 import { Input } from '@/components/ui/input';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { cn } from '@/lib/utils';
 import { useProducts } from '@/hooks/useProducts';
 
interface ProductSelectorProps {
  selectedProductId?: string | null;
  onSelect?: (productId: string) => void;
  multiple?: boolean;
  selectedProductIds?: string[];
  onChange?: (productIds: string[]) => void;
}

const ProductSelector = ({ selectedProductId, onSelect, multiple, selectedProductIds = [], onChange }: ProductSelectorProps) => {
   const [search, setSearch] = useState('');
   const { data: products = [], isLoading } = useProducts();
 
   const filteredProducts = products.filter(product =>
     product.name.toLowerCase().includes(search.toLowerCase()) ||
     product.name_en?.toLowerCase().includes(search.toLowerCase())
   );
 
   const formatPrice = (price: number) => {
     return new Intl.NumberFormat('ar-IQ').format(price) + ' د.ع';
   };
 
   if (isLoading) {
     return (
       <div className="space-y-3">
         {[1, 2, 3].map(i => (
           <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
         ))}
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       {/* Search */}
       <div className="relative">
         <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
           placeholder="بحث عن منتج..."
           value={search}
           onChange={(e) => setSearch(e.target.value)}
           className="pr-10"
         />
       </div>
 
       {/* Products List */}
       <ScrollArea className="h-[300px] rounded-xl border border-border">
         <div className="p-2 space-y-2">
           {filteredProducts.length === 0 ? (
             <p className="text-center text-muted-foreground py-8">
               لا توجد منتجات
             </p>
           ) : (
              filteredProducts.map((product) => {
                const isSelected = multiple
                  ? selectedProductIds.includes(product.id)
                  : selectedProductId === product.id;
                const imageUrl = product.images?.[0] || '/placeholder.svg';

                const handleClick = () => {
                  if (multiple) {
                    const next = selectedProductIds.includes(product.id)
                      ? selectedProductIds.filter(id => id !== product.id)
                      : [...selectedProductIds, product.id];
                    onChange?.(next);
                  } else {
                    onSelect?.(product.id);
                  }
                };

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={handleClick}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                      'hover:bg-muted/50 text-right',
                      isSelected && 'bg-primary/10 border-2 border-primary'
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPrice(product.merchant_price)}</p>
                    </div>
                    <div className={cn(
                      'w-6 h-6 flex items-center justify-center flex-shrink-0 border-2',
                      multiple ? 'rounded-md' : 'rounded-full',
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })
           )}
         </div>
       </ScrollArea>
     </div>
   );
 };
 
 export default ProductSelector;