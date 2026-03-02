import type { SyntheticEvent } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (item: any, keyword: string) => {
  if (item?.imageUrl && typeof item.imageUrl === "string" && item.imageUrl.startsWith("http")) {
    const url = item.imageUrl.trim();
    const bad = ["source.unsplash.com", "picsum", "google.com/imgres", "gstatic", "instagram", "pinterest", "flickr.com/photos"];
    if (!bad.some((b) => url.includes(b))) return url;
  }

  const kw = encodeURIComponent(keyword.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().slice(0, 60));
  const seed = Math.abs(
    keyword.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0)
  ) % 1000;

  return `https://loremflickr.com/800/600/${kw},travel/all?lock=${seed}`;
};

export const handleImageError = (e: SyntheticEvent<HTMLImageElement>) => {
  const target = e.target as HTMLImageElement;
  if (!target.dataset.fallback) {
    target.dataset.fallback = "1";
    const seed = Math.floor(Math.random() * 1000);
    target.src = `https://loremflickr.com/800/600/travel,landscape/all?lock=${seed}`;
  }
};

export const getSafeLink = (url: string | undefined, name: string): string => {
  if (url && typeof url === "string" && url.startsWith("http")) {
    const trusted = ["wikipedia.org", "tripadvisor", "booking.com", "expedia", "viator", "lonelyplanet", "google.com", "wikimedia"];
    if (trusted.some((t) => url.includes(t))) return url;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
};
