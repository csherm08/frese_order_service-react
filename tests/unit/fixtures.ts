import type { CartItem, Product } from '@/types/products'

export function makeProduct(over: Partial<Product> = {}): Product {
    return {
        id: 1,
        title: 'Test Product',
        description: '',
        price: 5,
        photoUrl: '',
        typeId: 1,
        quantity: -1,
        active: true,
        ...over,
    } as Product
}

export function makeCartItem(over: Partial<CartItem> = {}): CartItem {
    return {
        productId: 1,
        quantity: 1,
        price: 5,
        product_size_id: null,
        selections: {},
        add_ons: {},
        typeId: 1,
        ...over,
    } as CartItem
}
