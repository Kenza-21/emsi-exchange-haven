
import { useState } from 'react';
import { CATEGORIES } from '@/types/database';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface CategoryFilterProps {
  onCategoryChange: (category: string | null) => void;
}

export function CategoryFilter({ onCategoryChange }: CategoryFilterProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleToggle = (value: string) => {
    const newCategory = selectedCategory === value ? null : value;
    setSelectedCategory(newCategory);
    onCategoryChange(newCategory);
  };

  return (
    <div className="mb-6">
      <h3 className="font-medium text-gray-700 mb-2">Categories</h3>
      <ToggleGroup type="single" className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <ToggleGroupItem
            key={category}
            value={category}
            aria-label={category}
            data-selected={selectedCategory === category}
            onClick={() => handleToggle(category)}
            className={`border text-sm ${
              selectedCategory === category ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            {category}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
