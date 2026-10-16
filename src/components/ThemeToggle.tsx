import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative w-14 h-8 rounded-full bg-secondary transition-colors duration-300',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'press-effect',
        className
      )}
      aria-label="تبديل الوضع الداكن"
    >
      {/* Track */}
      <span
        className={cn(
          'absolute inset-0 rounded-full transition-colors duration-300',
          theme === 'dark' ? 'bg-primary/20' : 'bg-secondary'
        )}
      />

      {/* Thumb */}
      <span
        className={cn(
          'absolute top-1 w-6 h-6 rounded-full bg-card shadow-md transition-all duration-300 flex items-center justify-center',
          theme === 'dark' 
            ? 'right-1 bg-primary' 
            : 'left-1 bg-gradient-primary'
        )}
      >
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-primary-foreground" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-primary-foreground" />
        )}
      </span>
    </button>
  );
}
