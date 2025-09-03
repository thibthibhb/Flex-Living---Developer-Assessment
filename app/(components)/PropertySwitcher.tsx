"use client";

import { useRouter } from "next/navigation";

type Props = {
  items: { name: string; slug: string }[];
  current: string;
};

export default function PropertySwitcher({ items, current }: Props) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSlug = e.target.value;
    router.push(`/properties/${selectedSlug}`);
  };

  return (
    <div className="property-switcher">
      <label 
        htmlFor="property-select" 
        style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontSize: '14px', 
          fontWeight: '600', 
          color: 'var(--muted)' 
        }}
      >
        Switch Property:
      </label>
      <select
        id="property-select"
        value={current}
        onChange={handleChange}
        className="select"
        style={{
          width: '100%',
          minWidth: '280px'
        }}
        aria-label="Select a property to view"
      >
        {items.map((property) => (
          <option key={property.slug} value={property.slug}>
            {property.name}
          </option>
        ))}
      </select>
    </div>
  );
}