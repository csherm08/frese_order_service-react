import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrderSuccessPage() {
    return (
        <div className="container px-4 py-16">
            <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-12 pb-12 text-center space-y-8">
                    <div className="flex justify-center">
                        <div className="bg-green-100 rounded-full p-6">
                            <CheckCircle className="h-20 w-20 text-green-600" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold">Order Confirmed!</h1>
                        <p className="text-xl text-muted-foreground">
                            Thank you for your order. We've sent a confirmation email with your order details.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 space-y-2">
                        <h2 className="font-semibold text-lg">What's Next?</h2>
                        <p className="text-muted-foreground">
                            Your order is being prepared. You'll receive a notification when it's ready for pickup.
                        </p>
                        <p className="text-muted-foreground">
                            If you have any questions, please call us at <strong>(518) 756-1000</strong>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button asChild size="lg">
                            <Link href="/menu">Order Again</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}



