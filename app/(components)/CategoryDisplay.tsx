"use client";

import { useState } from "react";

type Category = {
  id: string;
  category: string;
  rating: number;
};

type CategoryDisplayProps = {
  categories: Category[];
  maxVisible?: number;
};

export default function CategoryDisplay({ categories, maxVisible = 3 }: CategoryDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  
  if (!categories || categories.length === 0) {
    return <span className="text-muted">—</span>;
  }

  const visibleCategories = showAll ? categories : categories.slice(0, maxVisible);
  const hasMore = categories.length > maxVisible;

  const formatCategoryName = (name: string) => {
    // Convert snake_case or camelCase to Title Case
    return name
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRatingClass = (rating: number) => {
    if (rating >= 8) return "rating-high";
    if (rating >= 6) return "rating-medium";
    return "rating-low";
  };

  return (
    <div className="category-display">
      {visibleCategories.map((cat) => (
        <div key={cat.id} className="category-item">
          <span className="category-name">{formatCategoryName(cat.category)}</span>
          <span className={`category-rating ${getRatingClass(cat.rating)}`}>
            {cat.rating}
          </span>
        </div>
      ))}
      
      {hasMore && (
        <button 
          className="category-toggle"
          onClick={() => setShowAll(!showAll)}
          type="button"
        >
          {showAll ? `Show less` : `+${categories.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}