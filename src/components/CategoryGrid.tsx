import { useNavigate } from "react-router-dom";
import { Shirt, Coffee, Gift, Palette, Headphones, Watch, Sparkles, Package, LucideIcon, Flame } from "lucide-react";
import { useStorefrontCategories } from "@/hooks/useCatalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CategoryGridProps {
  onCategorySelect?: (categoryId: string) => void;
  selectedCategory?: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  package: Package, shirt: Shirt, coffee: Coffee, gift: Gift,
  palette: Palette, headphones: Headphones, watch: Watch, sparkles: Sparkles,
};

const getIconComponent = (iconName: string | null | undefined, _categoryName: string): LucideIcon => {
  if (iconName && categoryIcons[iconName]) return categoryIcons[iconName];
  return Package;
};

export function CategoryGrid({ onCategorySelect, selectedCategory }: CategoryGridProps) {
  const navigate = useNavigate();
  const { data: categories, isLoading } = useStorefrontCategories();
  const { t, language } = useLanguage();

  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      navigate(`/search?category=${categoryId}`);
    }
  };

  if (isLoading) {
    return (
      <section className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3">{t('categories.title')}</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 min-w-[100px] rounded-2xl flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) return null;

  const allCategories = [
    { id: "all", name: t('common.all'), name_en: "All", icon: null },
    ...categories
  ];

  return (
    <section className="px-4 mt-6">
      <h2 className="text-lg font-bold mb-3">{t('categories.title')}</h2>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4">
        {allCategories.map((category, index) => {
          const IconComponent = category.id === "all" ? Flame : getIconComponent(category.icon, category.name);
          const isActive = selectedCategory ? selectedCategory === category.id : category.id === "all";
          const displayName = language === 'en' && 'name_en' in category && category.name_en ? category.name_en : category.name;
          
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-300 press-effect flex-shrink-0 animate-slide-up",
                isActive ? "bg-gradient-primary text-white shadow-glow" : "bg-card text-foreground shadow-card hover:shadow-float"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <IconComponent className={cn("h-4 w-4", isActive ? "text-white" : "text-primary")} strokeWidth={2} />
              <span>{displayName}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
