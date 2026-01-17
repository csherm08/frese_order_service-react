"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { unsubscribeEmail } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

export default function UnsubscribePage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setLoading(true);

        try {
            await unsubscribeEmail(email);
            setSuccess(true);
            toast.success('Successfully unsubscribed');
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            toast.error('Failed to unsubscribe. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container px-4 py-16">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-12 pb-12 text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-green-100 rounded-full p-6">
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Unsubscribed Successfully</h2>
                            <p className="text-muted-foreground">
                                You have been removed from our email list.
                            </p>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            We're sorry to see you go! If you change your mind, you can resubscribe by placing an order.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container px-4 py-16">
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">Unsubscribe from Emails</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <p className="text-muted-foreground">
                                Enter your email address to unsubscribe from our mailing list.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Unsubscribing...
                                </>
                            ) : (
                                'Unsubscribe'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}



