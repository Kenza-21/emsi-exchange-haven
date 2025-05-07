
import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  size = 'md',
  readonly = false,
  className
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleMouseEnter = (rating: number) => {
    if (readonly) return;
    setHoverRating(rating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const handleClick = (rating: number) => {
    if (readonly || !onChange) return;
    onChange(rating);
  };

  return (
    <div className={cn("flex", className)}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Star
          key={rating}
          className={cn(
            sizes[size],
            "transition-colors mr-1",
            readonly ? "cursor-default" : "cursor-pointer",
            ((hoverRating && hoverRating >= rating) || (!hoverRating && value >= rating))
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300"
          )}
          onMouseEnter={() => handleMouseEnter(rating)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(rating)}
          data-testid={`star-${rating}`}
        />
      ))}
    </div>
  );
}
