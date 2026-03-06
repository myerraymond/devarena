import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts seconds to "Xh Ym" format
 */
export function formatHours(seconds: number): string {
  if (!seconds || seconds === 0) return '0h 0m'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours === 0) {
    return `${minutes}m`
  }
  
  if (minutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${minutes}m`
}

/**
 * Checks if a timestamp is within the last 24 hours
 */
export function isActive(snapshottedAt: string | null): boolean {
  if (!snapshottedAt) return false
  
  const snapshotTime = new Date(snapshottedAt).getTime()
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  
  return (now - snapshotTime) < twentyFourHours
}
