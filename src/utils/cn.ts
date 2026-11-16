/** Join class names, dropping falsy values. Small enough not to need clsx. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
