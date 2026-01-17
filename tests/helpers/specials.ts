/**
 * Utility functions for managing specials in test database
 * Uses API endpoints to create and delete specials for test isolation
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface SpecialData {
    name: string;
    products: number[]; // Array of product IDs
    start: Date;
    end: Date;
}

/**
 * Create a special in the database via API
 */
export async function createSpecial(special: SpecialData): Promise<number> {
    const response = await fetch(`${API_URL}/specials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: special.name,
            products: Array.isArray(special.products)
                ? special.products.join(',')
                : special.products,
            start: special.start.toISOString(),
            end: special.end.toISOString(),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create special: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.id;
}

/**
 * Delete a special by ID
 * Note: DELETE endpoint requires JWT auth
 * In test mode, the backend should allow deletion without auth for test isolation
 * If this fails, specials will remain in DB but won't affect other tests (they'll be filtered by date)
 */
export async function deleteSpecial(specialId: number): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/specials/${specialId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.warn(`⚠ Delete requires auth. Special ${specialId} will expire naturally (end date in future).`);
            } else if (response.status !== 404) {
                console.warn(`Failed to delete special ${specialId}: ${response.status} ${response.statusText}`);
            }
            // Don't throw - cleanup is best effort, and specials will expire anyway
        }
    } catch (error) {
        // Log but don't throw - cleanup is best effort
        console.warn(`Could not delete special ${specialId}:`, error);
    }
}

/**
 * Get all active specials
 */
export async function getActiveSpecials(): Promise<any[]> {
    try {
        const response = await fetch(`${API_URL}/activeSpecials?activeOnly=true`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('Could not fetch specials via API');
    }
    return [];
}

/**
 * Get product IDs from the API (to use in specials)
 */
export async function getProductIds(limit: number = 10): Promise<number[]> {
    try {
        const response = await fetch(`${API_URL}/activeProductsAndSizesIncludingSpecials`);
        if (response.ok) {
            const products = await response.json();
            return products.slice(0, limit).map((p: any) => p.id);
        }
    } catch (error) {
        console.warn('Could not fetch products via API');
    }
    return [];
}

/**
 * Helper to create test special data structure
 */
export function createTestSpecial(
    name: string,
    productIds: number[],
    daysFromNow: number = 7
): SpecialData {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + daysFromNow);

    return {
        name,
        products: productIds,
        start: now,
        end,
    };
}

/**
 * Setup test specials - creates specials for testing
 * Returns array of special IDs for cleanup
 */
export async function setupTestSpecials(productIds?: number[]): Promise<number[]> {
    // Get product IDs if not provided
    let productIdList = productIds;
    if (!productIdList || productIdList.length === 0) {
        productIdList = await getProductIds(10);
    }

    if (productIdList.length === 0) {
        throw new Error('No products available. Please seed products first.');
    }

    const specialIds: number[] = [];

    try {
        // Create test specials
        const now = new Date();
        const oneWeekFromNow = new Date(now);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        // Special 1: Use first few products
        const special1 = createTestSpecial(
            'Test Special 1',
            productIdList.slice(0, 3),
            7
        );
        const id1 = await createSpecial(special1);
        specialIds.push(id1);

        // Special 2: Use next few products
        if (productIdList.length >= 5) {
            const special2 = createTestSpecial(
                'Test Special 2',
                productIdList.slice(3, 5),
                7
            );
            const id2 = await createSpecial(special2);
            specialIds.push(id2);
        }

        console.log(`✓ Created ${specialIds.length} test specials`);
        return specialIds;
    } catch (error) {
        // Cleanup on error
        await cleanupTestSpecials(specialIds);
        throw error;
    }
}

/**
 * Cleanup test specials - deletes specials created for testing
 */
export async function cleanupTestSpecials(specialIds: number[]): Promise<void> {
    for (const id of specialIds) {
        await deleteSpecial(id);
    }
    if (specialIds.length > 0) {
        console.log(`✓ Cleaned up ${specialIds.length} test specials`);
    }
}

