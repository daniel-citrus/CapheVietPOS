import { useMemo } from "react";
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
  // The placeholder does a hash + SVG string build + encodeURIComponent; memo
  // keeps that off the items-list re-render path (live search filter).
  const src = useMemo(
    () => item.imageUrl || placeholderImage(item.name, size),
    [item.imageUrl, item.name, size],
  );
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-[var(--radius)] object-cover shadow-[inset_0_0_0_1px_var(--color-border)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
