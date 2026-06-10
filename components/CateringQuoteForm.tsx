"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitCateringRequest } from '@/lib/api';

const SERVICE_OPTIONS = [
    { value: 'pickup', label: 'Pick up' },
    { value: 'dropoff', label: 'Drop off' },
    { value: 'banquet', label: 'Full service banquet' },
    { value: 'barbecue', label: 'Full service barbecue' },
];

const EVENT_TYPES = [
    'Wedding',
    'Birthday',
    'Corporate event',
    'Holiday party',
    'Graduation',
    'Funeral / memorial',
    'Other',
];

export default function CateringQuoteForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [eventDateTime, setEventDateTime] = useState('');
    const [people, setPeople] = useState('');
    const [phone, setPhone] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [eventType, setEventType] = useState('');
    const [eventTypeOther, setEventTypeOther] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

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
                guestCount: people ? parseInt(people, 10) : undefined,
                serviceType,
                eventType: eventTypeText,
                notes,
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
                    Thanks, {name.split(' ')[0] || 'there'}! We&apos;ll review the details and email you at{' '}
                    <span className="font-medium">{email}</span> with a proposed date and a link to reserve it.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="quote-name">Name</Label>
                    <Input
                        id="quote-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="quote-email">Email</Label>
                    <Input
                        id="quote-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="quote-phone">Phone number</Label>
                    <Input
                        id="quote-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="quote-datetime">Date and time of event</Label>
                    <Input
                        id="quote-datetime"
                        type="datetime-local"
                        value={eventDateTime}
                        onChange={(e) => setEventDateTime(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="quote-people">Estimated number of people</Label>
                    <Input
                        id="quote-people"
                        type="number"
                        min="1"
                        value={people}
                        onChange={(e) => setPeople(e.target.value)}
                        required
                    />
                </div>
            </div>

            <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Service type</legend>
                <RadioGroup value={serviceType} onValueChange={setServiceType} required className="grid sm:grid-cols-2 gap-2">
                    {SERVICE_OPTIONS.map((opt) => (
                        <Label
                            key={opt.value}
                            htmlFor={`quote-service-${opt.value}`}
                            className="flex items-center gap-2 rounded-md border border-input px-3 py-2 cursor-pointer hover:bg-accent"
                        >
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
                        <Label
                            key={opt}
                            htmlFor={`quote-eventtype-${opt}`}
                            className="flex items-center gap-2 rounded-md border border-input px-3 py-2 cursor-pointer hover:bg-accent"
                        >
                            <RadioGroupItem id={`quote-eventtype-${opt}`} value={opt} />
                            <span>{opt}</span>
                        </Label>
                    ))}
                </RadioGroup>
                {eventType === 'Other' && (
                    <Input
                        type="text"
                        placeholder="Tell us about your event"
                        value={eventTypeOther}
                        onChange={(e) => setEventTypeOther(e.target.value)}
                    />
                )}
            </fieldset>

            <div className="space-y-2">
                <Label htmlFor="quote-notes">Notes</Label>
                <textarea
                    id="quote-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Anything else we should know — menu requests, dietary needs, location, budget, etc."
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                    </>
                ) : (
                    'Request a Quote'
                )}
            </Button>
        </form>
    );
}
