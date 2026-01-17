export interface ProductSize {
    id: number;
    product_id: number;
    size: string;
    cost: number;
    special_cost?: number;
}

// Backend formats these as nested objects: { key_name: { size_name: [...options] } }
export interface SelectionOption {
    id: number;
    value: string;
    cost: number;
    key_id: number;
}

export interface AddOnOption {
    id: number;
    value: string;
    cost: number;
    key_id: number;
}

export interface Product {
    id: number;
    title: string;
    description: string;
    price: number;
    special_price?: number;
    photoUrl: string;
    typeId: number;
    quantity: number;
    active: boolean;
    product_sizes?: ProductSize[];
    // product_selection_values is an object like: { "Bread Type": { "Small": [...], "Medium": [...] } }
    product_selection_values?: Record<string, Record<string, SelectionOption[]>>;
    // product_add_on_values is an object like: { "Extra Toppings": { "Small": [...], "Medium": [...] } }
    product_add_on_values?: Record<string, Record<string, AddOnOption[]>>;
}

export interface CartItem {
    productId: number;
    product_name: string;
    quantity: number;
    price: number;
    product_size_id?: number | null;
    selections: Record<string, { value: string; cost: number }>;
    add_ons: Record<string, Array<{ value: string; cost: number }>>;
    typeId: number;
    // Keep reference to product for display purposes (photo, etc)
    product?: Product;
}

