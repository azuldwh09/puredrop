// =============================================================================
// UTILITIES -- src/lib/utils.js
// =============================================================================
// General-purpose utility functions used across the app.
//
// cn():
//   Merges Tailwind class names, resolving conflicts intelligently.
//   Uses clsx (conditional class joining) + tailwind-merge (conflict resolution).
//   Example: cn('px-4 py-2', condition && 'bg-blue-500', 'px-6')
//   Result:  'py-2 bg-blue-500 px-6'  (px-4 is overridden by px-6)
//
//   This is the standard utility function for all Shadcn UI components.
// =============================================================================

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
