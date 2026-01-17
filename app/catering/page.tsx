import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Users, Calendar, CheckCircle } from 'lucide-react';

export default function CateringPage() {
    return (
        <div className="container px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Hero */}
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-bold">Catering Services</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Let Frese's Bakery cater your next event with our delicious baked goods and fried chicken
                    </p>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="bg-orange-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
                                <Users className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-lg">Any Size Event</h3>
                            <p className="text-muted-foreground text-sm">
                                From small gatherings to large parties, we can accommodate your needs
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="bg-orange-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
                                <Calendar className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-lg">Flexible Scheduling</h3>
                            <p className="text-muted-foreground text-sm">
                                Order in advance to ensure availability for your special day
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="bg-orange-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
                                <CheckCircle className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-lg">Quality Guaranteed</h3>
                            <p className="text-muted-foreground text-sm">
                                Fresh baked goods made with the same quality we're known for
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Popular Items */}
                <Card>
                    <CardContent className="pt-6 space-y-6">
                        <h2 className="text-3xl font-bold text-center">Popular Catering Items</h2>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="font-semibold">Bread & Rolls</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li>• Fresh Italian Bread</li>
                                    <li>• Dinner Rolls (by the dozen)</li>
                                    <li>• Specialty Breads</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold">Pastries</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li>• Assorted Cookie Platters</li>
                                    <li>• Danish Pastries</li>
                                    <li>• Mini Pastries</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold">Fried Chicken</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li>• Family Size Buckets</li>
                                    <li>• Wing Platters</li>
                                    <li>• Custom Orders Available</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold">Cakes & More</h4>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li>• Custom Cakes</li>
                                    <li>• Sheet Cakes</li>
                                    <li>• Cupcake Platters</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact CTA */}
                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
                    <CardContent className="pt-6 text-center space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold">Ready to Place a Catering Order?</h2>
                            <p className="text-muted-foreground text-lg">
                                Contact us to discuss your event and get a custom quote
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 rounded-full p-3">
                                    <Phone className="h-6 w-6 text-orange-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm text-muted-foreground">Call Us</p>
                                    <p className="font-semibold text-lg">(518) 756-1000</p>
                                </div>
                            </div>

                            <div className="hidden sm:block text-muted-foreground">or</div>

                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 rounded-full p-3">
                                    <Mail className="h-6 w-6 text-orange-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm text-muted-foreground">Visit Us</p>
                                    <p className="font-semibold text-lg">11 Clifford St, Ravena</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <Button asChild size="lg">
                                <a href="tel:5187561000">Call Now</a>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <a href="https://maps.google.com/?q=11+Clifford+Street+Ravena+NY" target="_blank" rel="noopener noreferrer">
                                    Get Directions
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}



