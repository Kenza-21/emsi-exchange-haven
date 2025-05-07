
import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  size?: number;
  onChange?: (rating: number) => void;
  interactive?: boolean;
  className?: string;
}

export function RatingStars({
  rating,
  size = 20,
  onChange,
  interactive = false,
  className
}: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (star: number) => {
    if (interactive && onChange) {
      onChange(star);
    }
  };

  return (
    <div className={cn('flex', className)}>
      {stars.map((star) => (
        <Star
          key={star}
          size={size}
          onClick={() => handleClick(star)}
          className={cn(
            'transition-colors',
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300',
            interactive && 'cursor-pointer hover:text-yellow-300'
          )}
        />
      ))}
    </div>
  );
}
