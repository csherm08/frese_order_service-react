import { CartItem } from '@/types/products';

/**
 * Generate a composite key for a cart item to identify duplicates
 * Items with the same composite key should be grouped together
 */
export function generateCompositeKey(item: CartItem): string {
    try {
        const entry: any = {
            productId: item.productId,
            price: item.price,
            product_size_id: item.product_size_id || null,
        };

        // Include selections if available
        if (item.selections && Object.keys(item.selections).length > 0) {
            entry.selections = [];
            for (const [key, value] of Object.entries(item.selections)) {
                entry.selections.push(`${key}: ${value.value}`);
            }
            // Sort to ensure consistent ordering
            entry.selections.sort();
        }

        // Include add-ons if available
        if (item.add_ons && Object.keys(item.add_ons).length > 0) {
            entry.add_ons = [];
            for (const [key, values] of Object.entries(item.add_ons)) {
                if (Array.isArray(values)) {
                    // Extract just the category name (before the size part if present)
                    const categoryName = key.split('-')[0];
                    values.forEach((val) => {
                        if (val.value) {
                            entry.add_ons.push(`${categoryName}: ${val.value}`);
                        }
                    });
                }
            }
            // Sort to ensure consistent ordering
            entry.add_ons.sort();
        }

        return JSON.stringify(entry);
    } catch (e) {
        console.error("Error generating composite key:", e);
        // Fallback to a simple key
        return JSON.stringify({
            productId: item.productId,
            product_size_id: item.product_size_id || null,
        });
    }
}

/**
 * Find an item in the cart that matches the composite key
 * Returns the index if found, -1 otherwise
 */
export function findMatchingItemIndex(items: CartItem[], newItem: CartItem): number {
    const newKey = generateCompositeKey(newItem);
    return items.findIndex(item => generateCompositeKey(item) === newKey);
}

