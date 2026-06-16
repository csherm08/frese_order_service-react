"use client"

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, Loader2, Plus, Minus, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { fetchProducts, fetchProductTypes, submitCateringRequest } from '@/lib/api';
import {
    groupCateringProducts,
    buildLineItems,
    estimateTotal,
    type CateringMenuGroup,
} from '@/lib/cateringMenu';
import type { Product } from '@/types/products';

const SERVICE_OPTIONS = [
    { value: 'pickup', label: 'Pick up' },
    { value: 'dropoff', label: 'Drop off' },
    { value: 'banquet', label: 'Full service banquet' },
    { value: 'barbecue', label: 'Full service barbecue' },
];

const EVENT_TYPES = [
    'Wedding', 'Birthday', 'Corporate event', 'Holiday party', 'Graduation', 'Funeral / memorial', 'Other',
];

export default function CateringQuoteBuilder() {
    const [groups, setGroups] = useState<CateringMenuGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState<Record<number, number>>({});

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [eventDateTime, setEventDateTime] = useState('');
    const [people, setPeople] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [eventType, setEventType] = useState('');
    const [eventTypeOther, setEventTypeOther] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const guestCount = useMemo(() => {
        const n = parseInt(people, 10);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }, [people]);

    useEffect(() => {
        (async () => {
            try {
                const [products, types] = await Promise.all([fetchProducts(), fetchProductTypes()]);
                setGroups(groupCateringProducts(products as Product[], types));
            } catch {
                toast.error('Could not load catering menus. Please refresh or call us at (518) 756-1000.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const lineItems = useMemo(() => buildLineItems(groups, selections, guestCount), [groups, selections, guestCount]);
    const estimate = useMemo(() => estimateTotal(lineItems), [lineItems]);

    const togglePerPerson = (productId: number) =>
        setSelections((prev) => ({ ...prev, [productId]: prev[productId] ? 0 : 1 }));

    const setQty = (productId: number, qty: number) =>
        setSelections((prev) => ({ ...prev, [productId]: Math.max(0, qty) }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const eventTypeText = eventType === 'Other' && eventTypeOther.trim()
            ? `Other — ${eventTypeOther.trim()}`
            : eventType;

        setSubmitting(true);
        try {
            await submitCateringRequest({
                name,
                email,
                phone,
                eventDate: eventDateTime || undefined,
                guestCount: guestCount || undefined,
                serviceType,
                eventType: eventTypeText,
                notes,
                lineItems,
                estimatedTotal: Math.round(estimate * 100), // cents, matches quotedPrice/depositAmount
            });
            setSubmitted(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center text-center gap-3 py-8">
                <CheckCircle className="h-12 w-12 text-[#f5991c]" />
                <h3 className="text-2xl font-semibold">Request received!</h3>
                <p className="text-muted-foreground max-w-md">
                    Thanks, {name.split(' ')[0] || 'there'}! We&apos;ll review your selections and email you at{' '}
                    <span className="font-medium">{email}</span> with a confirmed quote and a link to reserve your date.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#f5991c]" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {/* 1. Guests — drives per-person pricing */}
            <section className="space-y-2">
                <Label htmlFor="quote-people" className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" /> How many guests?
                </Label>
                <Input
                    id="quote-people"
                    type="number"
                    min="1"
                    value={people}
                    onChange={(e) => setPeople(e.target.value)}
                    placeholder="e.g. 50"
                    className="max-w-[160px]"
                    required
                />
                <p className="text-sm text-muted-foreground">
                    Per-person menu prices update with your guest count.
                </p>
            </section>

            {/* 2. Build the menu */}
            <section className="space-y-8">
                <h3 className="text-2xl font-bold">Build your menu</h3>
                {groups.map((group) => (
                    <div key={group.typeId} className="space-y-3">
                        <div className="flex items-baseline justify-between gap-2">
                            <h4 className="text-lg font-semibold">{group.typeName.replace(/ Catering$/i, '')}</h4>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                {group.perPerson ? 'Priced per person' : 'Priced per item'}
                            </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {group.products.map((product) => {
                                const qty = selections[product.id] || 0;
                                const selected = qty > 0;
                                return (
                                    <div
                                        key={product.id}
                                        className={`rounded-lg border p-4 transition-colors ${selected ? 'border-[#f5991c] bg-orange-50/50' : 'border-input'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium">{product.title}</p>
                                                {product.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                                                )}
                                                <p className="text-sm font-semibold mt-1">
                                                    {formatCurrency(product.price)}
                                                    <span className="font-normal text-muted-foreground">
                                                        {group.perPerson ? ' / person' : ' each'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            {group.perPerson ? (
                                                <Button
                                                    type="button"
                                                    variant={selected ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => togglePerPerson(product.id)}
                                                    className="w-full"
                                                >
                                                    {selected ? (
                                                        <><Check className="h-4 w-4 mr-1" /> Added{guestCount ? ` · ${formatCurrency(product.price * guestCount)}` : ''}</>
                                                    ) : 'Add to quote'}
                                                </Button>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(product.id, qty - 1)} disabled={qty === 0}>
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-medium">{qty}</span>
                                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(product.id, qty + 1)}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                    {qty > 0 && (
                                                        <span className="ml-auto text-sm font-semibold">{formatCurrency(product.price * qty)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </section>

            {/* Running quote summary */}
            <section className="rounded-lg border bg-muted/40 p-5 space-y-3">
                <h3 className="text-lg font-semibold">Your quote</h3>
                {lineItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Add items above to build your estimate.</p>
                ) : (
                    <>
                        <ul className="space-y-1.5 text-sm">
                            {lineItems.map((item) => (
                                <li key={item.productId} className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        {item.title}
                                        <span className="text-xs"> × {item.quantity}{item.perPerson ? ' guests' : ''}</span>
                                    </span>
                                    <span className="font-medium whitespace-nowrap">{formatCurrency(item.lineTotal)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-between border-t pt-3 text-base font-bold">
                            <span>Estimated total</span>
                            <span className="text-[#f5991c]">{formatCurrency(estimate)}</span>
                        </div>
                        {lineItems.some((i) => i.perPerson) && !guestCount && (
                            <p className="text-sm text-amber-700">Enter a guest count above to price per-person items.</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            This is an estimate — we&apos;ll confirm your final quote by email before any deposit.
                        </p>
                    </>
                )}
            </section>

            {/* 3. Event details */}
            <section className="space-y-6">
                <h3 className="text-2xl font-bold">Your details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="quote-name">Name</Label>
                        <Input id="quote-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quote-email">Email</Label>
                        <Input id="quote-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quote-phone">Phone number</Label>
                        <Input id="quote-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quote-datetime">Date and time of event</Label>
                        <Input id="quote-datetime" type="datetime-local" value={eventDateTime} onChange={(e) => setEventDateTime(e.target.value)} required />
                    </div>
                </div>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Service type</legend>
                    <RadioGroup value={serviceType} onValueChange={setServiceType} required className="grid sm:grid-cols-2 gap-2">
                        {SERVICE_OPTIONS.map((opt) => (
                            <Label key={opt.value} htmlFor={`quote-service-${opt.value}`} className="flex items-center gap-2 rounded-md border border-input px-3 py-2 cursor-pointer hover:bg-accent">
                                <RadioGroupItem id={`quote-service-${opt.value}`} value={opt.value} />
                                <span>{opt.label}</span>
                            </Label>
                        ))}
                    </RadioGroup>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">What type of event is it?</legend>
                    <RadioGroup value={eventType} onValueChange={setEventType} required className="grid sm:grid-cols-2 gap-2">
                        {EVENT_TYPES.map((opt) => (
                            <Label key={opt} htmlFor={`quote-eventtype-${opt}`} className="flex items-center gap-2 rounded-md border border-input px-3 py-2 cursor-pointer hover:bg-accent">
                                <RadioGroupItem id={`quote-eventtype-${opt}`} value={opt} />
                                <span>{opt}</span>
                            </Label>
                        ))}
                    </RadioGroup>
                    {eventType === 'Other' && (
                        <Input type="text" placeholder="Tell us about your event" value={eventTypeOther} onChange={(e) => setEventTypeOther(e.target.value)} />
                    )}
                </fieldset>

                <div className="space-y-2">
                    <Label htmlFor="quote-notes">Notes</Label>
                    <textarea
                        id="quote-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        placeholder="Anything else we should know — dietary needs, location, budget, or custom requests."
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                </div>
            </section>

            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                    <>Request a Quote{estimate > 0 ? ` · est. ${formatCurrency(estimate)}` : ''}</>
                )}
            </Button>
        </form>
    );
}
