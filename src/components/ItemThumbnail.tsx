import { placeholderImage } from "../lib/placeholderImage";

interface ThumbItem {
  name: string;
  imageUrl?: string;
}

/**
 * Renders an item's image, or a generated initials placeholder when it has
 * none. Used in both the items list and the item detail header.
 */
export function ItemThumbnail({
  item,
  size = 40,
  className = "",
}: {
  item: ThumbItem;
  size?: number;
  className?: string;
}) {
  const src = item.imageUrl || placeholderImage(item.name, size);
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-[var(--radius)] object-cover shadow-[inset_0_0_0_1px_var(--color-border,var(--border))] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
