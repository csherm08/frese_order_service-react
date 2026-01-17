import { Product } from './products';

export interface Special {
    id: number;
    name: string;
    description: string;
    start: string;
    end: string;
    products: Product[];
    active: boolean;
    photoUrl?: string;
}



