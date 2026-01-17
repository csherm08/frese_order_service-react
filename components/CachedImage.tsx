"use client"

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CachedImageProps {
    src: string;
    alt: string;
    fill?: boolean;
    width?: number;
    height?: number;
    className?: string;
    containerClassName?: string;
    priority?: boolean;
}

export default function CachedImage({
    src,
    alt,
    fill = false,
    width,
    height,
    className,
    containerClassName,
    priority = false,
}: CachedImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className={cn(
                "bg-muted flex items-center justify-center",
                containerClassName
            )}>
                <span className="text-muted-foreground text-sm">Image unavailable</span>
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden", containerClassName)}>
            {/* Loading spinner overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}
            
            {fill ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    priority={priority}
                    className={cn(
                        "object-cover transition-opacity duration-300",
                        isLoading ? "opacity-0" : "opacity-100",
                        className
                    )}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            ) : (
                <Image
                    src={src}
                    alt={alt}
                    width={width || 400}
                    height={height || 300}
                    priority={priority}
                    className={cn(
                        "object-cover transition-opacity duration-300",
                        isLoading ? "opacity-0" : "opacity-100",
                        className
                    )}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                />
            )}
        </div>
    );
}

