import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

interface ConfettiCelebrationProps {
  isActive?: boolean;
  particleCount?: number;
  duration?: number;
  className?: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)", // success green
  "hsl(38 92% 50%)",  // warning amber
  "hsl(271 81% 56%)", // purple
  "hsl(199 89% 48%)", // blue
  "hsl(0 84% 60%)",   // red
];

export function ConfettiCelebration({
  isActive = true,
  particleCount = 40,
  duration = 3000,
  className,
}: ConfettiCelebrationProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(isActive);

  useEffect(() => {
    if (!isActive) return;

    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
    }));

    setPieces(newPieces);
    setIsVisible(true);

    // Cleanup after animation
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, particleCount, duration]);

  if (!isVisible || pieces.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none overflow-hidden z-50",
        className
      )}
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: -20,
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${2 + Math.random()}s`,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}
