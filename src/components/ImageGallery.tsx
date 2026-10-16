import { useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
}

export function ImageGallery({ images, alt = "Product", className }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    direction: "rtl",
    loop: true,
  });

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
    setSelectedIndex(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Subscribe to scroll events
  useState(() => {
    if (emblaApi) {
      emblaApi.on("select", onSelect);
      return () => {
        emblaApi.off("select", onSelect);
      };
    }
  });

  const displayImages = images.length > 0 ? images : ["/placeholder.svg"];

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Main Carousel */}
        <div className="overflow-hidden rounded-3xl bg-card shadow-card" ref={emblaRef}>
          <div className="flex">
            {displayImages.map((image, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] min-w-0 aspect-square relative cursor-pointer group"
                onClick={() => setIsZoomed(true)}
              >
                <img
                  src={image}
                  alt={`${alt} ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Zoom indicator */}
                <div className="absolute bottom-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Image Counter Badge */}
        {displayImages.length > 1 && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
            {selectedIndex + 1} / {displayImages.length}
          </div>
        )}

        {/* Thumbnail Strip */}
        {displayImages.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar px-1 pb-1">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200",
                  selectedIndex === index
                    ? "border-primary shadow-float scale-105"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Dot Indicators (mobile-friendly) */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5 pointer-events-none md:hidden">
            {displayImages.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  idx === selectedIndex 
                    ? "w-6 bg-white shadow-md" 
                    : "w-2 bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center h-[90vh]">
            <img
              src={displayImages[selectedIndex]}
              alt={alt}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
