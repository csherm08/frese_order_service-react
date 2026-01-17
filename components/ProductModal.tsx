"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Product, CartItem, ProductSize, SelectionOption, AddOnOption } from '@/types/products';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Plus, Minus, AlertTriangle } from 'lucide-react';
import CachedImage from '@/components/CachedImage';

// Cart mode types
type CartMode = { type: 'regular' } | { type: 'special'; specialId: number; specialName: string };

interface ProductModalProps {
    product: Product;
    open: boolean;
    onClose: () => void;
    mode?: CartMode; // If not provided, defaults to 'regular'
}

export default function ProductModal({ product, open, onClose, mode }: ProductModalProps) {
    const { addItem, cartMode, switchMode } = useCart();
    const [showModeConflict, setShowModeConflict] = useState(false);
    const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);

    // Default mode to 'regular' if not provided
    const currentMode: CartMode = mode || { type: 'regular' };
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
    const [selections, setSelections] = useState<Record<string, SelectionOption | null>>({});
    const [addOns, setAddOns] = useState<Record<string, SelectionOption[]>>({});

    // Reset state when product changes
    useEffect(() => {
        if (open && product) {
            setQuantity(1);

            // Initialize size - select first size if available
            if (product.product_sizes && product.product_sizes.length > 0) {
                setSelectedSize(product.product_sizes[0]);
            } else {
                setSelectedSize(null);
            }

            // Reset selections and add-ons
            setSelections({});
            setAddOns({});
        }
    }, [open, product]);

    // Get the current size key for looking up selections/addons
    const getSizeKey = (): string => {
        return selectedSize?.size || 'size';
    };

    // Get available selections for current size
    const getSelectionsForCurrentSize = () => {
        if (!product.product_selection_values) return {};
        const sizeKey = getSizeKey();
        const result: Record<string, SelectionOption[]> = {};

        Object.keys(product.product_selection_values).forEach(key => {
            if (product.product_selection_values![key][sizeKey]) {
                result[key] = product.product_selection_values![key][sizeKey];
            }
        });

        return result;
    };

    // Get available add-ons for current size
    const getAddOnsForCurrentSize = () => {
        if (!product.product_add_on_values) return {};
        const sizeKey = getSizeKey();
        const result: Record<string, AddOnOption[]> = {};

        Object.keys(product.product_add_on_values).forEach(key => {
            if (product.product_add_on_values![key][sizeKey]) {
                result[key] = product.product_add_on_values![key][sizeKey];
            }
        });

        return result;
    };

    const calculatePrice = () => {
        let basePrice = product.special_price || product.price;

        // Use size price if available
        if (selectedSize) {
            basePrice = selectedSize.special_cost || selectedSize.cost;
        }

        // Add selection costs
        Object.values(selections).forEach(selection => {
            if (selection && selection.cost) {
                basePrice += selection.cost;
            }
        });

        // Add add-on costs
        Object.values(addOns).forEach(addOnArray => {
            addOnArray.forEach(addOn => {
                if (addOn.cost) {
                    basePrice += addOn.cost;
                }
            });
        });

        return basePrice * quantity;
    };

    const validateSelections = (): boolean => {
        const availableSelections = getSelectionsForCurrentSize();
        const selectionKeys = Object.keys(availableSelections);

        // Check if all selections are made
        for (const key of selectionKeys) {
            if (!selections[key]) {
                toast.error(`Please select a ${key}`);
                return false;
            }
        }

        return true;
    };

    const createCartItem = (): CartItem => {
        // Format selections for cart item (matching backend format)
        const formattedSelections: Record<string, { value: string; cost: number }> = {};
        Object.keys(selections).forEach(key => {
            const selection = selections[key];
            if (selection) {
                formattedSelections[key] = {
                    value: selection.value,
                    cost: selection.cost
                };
            }
        });

        // Format add-ons for cart item
        const formattedAddOns: Record<string, Array<{ value: string; cost: number }>> = {};
        Object.keys(addOns).forEach(key => {
            formattedAddOns[key] = addOns[key].map(addOn => ({
                value: addOn.value,
                cost: addOn.cost
            }));
        });

        return {
            productId: product.id,
            product_name: product.title,
            quantity,
            price: calculatePrice() / quantity,
            product_size_id: selectedSize?.id || null,
            selections: formattedSelections,
            add_ons: formattedAddOns,
            typeId: product.typeId,
            product: product, // Include product for display purposes
        };
    };

    const handleAddToCart = () => {
        // Validate that all selections are made
        if (!validateSelections()) {
            return;
        }

        const cartItem = createCartItem();
        const success = addItem(cartItem, currentMode);

        if (!success) {
            // Mode conflict - show confirmation dialog
            setPendingCartItem(cartItem);
            setShowModeConflict(true);
            return;
        }

        toast.success(`Added ${quantity}x ${product.title} to cart`);
        onClose();
    };

    const handleConfirmModeSwitch = () => {
        if (pendingCartItem) {
            // Pass the item directly to switchMode to avoid React state batching issues
            switchMode(currentMode, pendingCartItem);
            toast.success(`Cart cleared. Added ${pendingCartItem.quantity}x ${pendingCartItem.product_name} to cart`);
        }
        setShowModeConflict(false);
        setPendingCartItem(null);
        onClose();
    };

    const getConflictMessage = () => {
        if (!cartMode) return '';

        if (cartMode.type === 'special' && currentMode.type === 'regular') {
            return `You currently have items from "${cartMode.specialName}" in your cart. Adding regular menu items will clear your cart.`;
        } else if (cartMode.type === 'regular' && currentMode.type === 'special') {
            const specialName = currentMode.type === 'special' ? currentMode.specialName : '';
            return `You currently have regular menu items in your cart. Adding items from "${specialName}" will clear your cart.`;
        } else if (cartMode.type === 'special' && currentMode.type === 'special') {
            const newSpecialName = currentMode.type === 'special' ? currentMode.specialName : '';
            return `You currently have items from "${cartMode.specialName}" in your cart. Adding items from "${newSpecialName}" will clear your cart.`;
        }
        return '';
    };

    const handleAddOnToggle = (key: string, option: AddOnOption, checked: boolean) => {
        setAddOns(prev => {
            const current = prev[key] || [];
            if (checked) {
                return { ...prev, [key]: [...current, option] };
            } else {
                return { ...prev, [key]: current.filter(item => item.id !== option.id) };
            }
        });
    };

    const availableSelections = getSelectionsForCurrentSize();
    const availableAddOns = getAddOnsForCurrentSize();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{product.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Product Image */}
                    {product.photoUrl && (
                        <CachedImage
                            src={product.photoUrl}
                            alt={product.title}
                            fill
                            containerClassName="w-full h-64 rounded-lg"
                            className="rounded-lg"
                            priority
                        />
                    )}

                    {/* Description */}
                    {product.description && (
                        <p className="text-muted-foreground">{product.description}</p>
                    )}

                    {/* Sizes */}
                    {product.product_sizes && product.product_sizes.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Select a Size</Label>
                            <RadioGroup
                                value={selectedSize?.id.toString()}
                                onValueChange={(v) => {
                                    const size = product.product_sizes?.find(s => s.id === parseInt(v));
                                    setSelectedSize(size || null);
                                    // Reset selections and add-ons when size changes
                                    setSelections({});
                                    setAddOns({});
                                }}
                            >
                                {product.product_sizes.map((size) => (
                                    <div 
                                        key={size.id} 
                                        className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent cursor-pointer"
                                        onClick={() => {
                                            setSelectedSize(size);
                                            setSelections({});
                                            setAddOns({});
                                        }}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value={size.id.toString()} id={`size-${size.id}`} />
                                            <Label htmlFor={`size-${size.id}`} className="cursor-pointer">
                                                {size.size}
                                            </Label>
                                        </div>
                                        <span className="font-semibold">
                                            {formatCurrency(size.special_cost || size.cost)}
                                        </span>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    )}

                    {/* Selections */}
                    {Object.keys(availableSelections).length > 0 && (
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Selections</Label>
                            {Object.keys(availableSelections).map(key => (
                                <div key={key} className="space-y-2">
                                    <Label className="text-sm">{key}</Label>
                                    <Select
                                        value={selections[key]?.id.toString() || ''}
                                        onValueChange={(v: string) => {
                                            const option = availableSelections[key].find(opt => opt.id === parseInt(v));
                                            setSelections(prev => ({ ...prev, [key]: option || null }));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Select ${key}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSelections[key].map(option => (
                                                <SelectItem key={option.id} value={option.id.toString()}>
                                                    {option.value}
                                                    {option.cost > 0 && ` (+${formatCurrency(option.cost)})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add-ons (Extras) */}
                    {Object.keys(availableAddOns).length > 0 && (
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Extras</Label>
                            {Object.keys(availableAddOns).map(key => (
                                <div key={key} className="space-y-3">
                                    <Label className="text-sm font-medium">{key}</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
                                        {availableAddOns[key].map(option => {
                                            const isChecked = addOns[key]?.some(item => item.id === option.id) || false;
                                            return (
                                                <div key={option.id} className="flex items-center space-x-2 border rounded-md p-2 hover:bg-accent">
                                                    <Checkbox
                                                        id={`addon-${option.id}`}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => handleAddOnToggle(key, option, checked as boolean)}
                                                    />
                                                    <Label htmlFor={`addon-${option.id}`} className="cursor-pointer text-sm flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="truncate">{option.value}</span>
                                                            {option.cost > 0 && (
                                                                <span className="text-xs font-semibold whitespace-nowrap">
                                                                    +{formatCurrency(option.cost)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Quantity</Label>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20 text-center"
                                min={1}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(quantity + 1)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Total Price */}
                    <div className="flex items-center justify-between text-2xl font-bold border-t pt-4">
                        <span>Total</span>
                        <span>{formatCurrency(calculatePrice())}</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddToCart}>
                        Add to Cart
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Mode Conflict Alert Dialog */}
            <AlertDialog open={showModeConflict} onOpenChange={setShowModeConflict}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Clear Cart?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {getConflictMessage()}
                            <br /><br />
                            <strong>Specials and regular menu items have different pickup times and cannot be combined.</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setShowModeConflict(false);
                            setPendingCartItem(null);
                        }}>
                            Keep Current Cart
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmModeSwitch}>
                            Clear Cart & Add Item
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
