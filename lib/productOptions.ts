/**
 * Resolve the option list (selections or add-ons) for a product's current size.
 *
 * Sized products key their options by size name (e.g. "Small"). Size-less
 * products store them under a single placeholder key — but that key is
 * inconsistent across the data ('size' in some products, 'default' in others),
 * so we must not assume 'size'. Fall back to whichever placeholder exists.
 */
export function resolveOptionsForSize<T>(
    bySize: Record<string, T[]> | undefined,
    selectedSizeName: string | null,
    hasSizes: boolean,
): T[] | undefined {
    if (!bySize) return undefined;
    if (hasSizes) {
        return selectedSizeName ? bySize[selectedSizeName] : undefined;
    }
    // Size-less: prefer known placeholders, else the single key present.
    if (bySize['size']) return bySize['size'];
    if (bySize['default']) return bySize['default'];
    const keys = Object.keys(bySize);
    return keys.length === 1 ? bySize[keys[0]] : undefined;
}
