"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Plain <img> avoids next/image dev/prod quirks; no-referrer helps if GCS/bucket rules dislike page Referer. */
function isGoogleStorageUrl(src: string): boolean {
    return src.includes("storage.googleapis.com")
}

interface CachedImageProps {
    src: string;
    alt: string;
    fill?: boolean;
    width?: number;
    height?: number;
    className?: string;
    containerClassName?: string;
    priority?: boolean;
    /** When true, skip Next image optimizer (avoids timeouts / pattern issues for GCS and other CDNs). */
    unoptimized?: boolean;
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
    unoptimized: unoptimizedProp,
}: CachedImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const useNativeImg = typeof src === "string" && isGoogleStorageUrl(src)

    const unoptimized =
        unoptimizedProp ??
        (typeof src === "string" &&
            (isGoogleStorageUrl(src) || /^https?:\/\//i.test(src)))

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

    const loadingOverlay =
        isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )

    const imgClass = cn(
        "object-cover transition-opacity duration-300",
        isLoading ? "opacity-0" : "opacity-100",
        className,
    )

    if (useNativeImg) {
        return (
            <div className={cn("relative overflow-hidden", containerClassName)}>
                {loadingOverlay}
                {fill ? (
                    // eslint-disable-next-line @next/next/no-img-element -- GCS: native img avoids incomplete loads via next/image
                    <img
                        src={src}
                        alt={alt}
                        referrerPolicy="no-referrer"
                        loading={priority ? "eager" : "lazy"}
                        decoding="async"
                        className={cn("absolute inset-0 h-full w-full", imgClass)}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false)
                            setHasError(true)
                        }}
                    />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={src}
                        alt={alt}
                        width={width || 400}
                        height={height || 300}
                        referrerPolicy="no-referrer"
                        loading={priority ? "eager" : "lazy"}
                        decoding="async"
                        className={imgClass}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false)
                            setHasError(true)
                        }}
                    />
                )}
            </div>
        )
    }

    return (
        <div className={cn("relative overflow-hidden", containerClassName)}>
            {loadingOverlay}

            {fill ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    priority={priority}
                    unoptimized={unoptimized}
                    className={imgClass}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false)
                        setHasError(true)
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
                    unoptimized={unoptimized}
                    className={imgClass}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false)
                        setHasError(true)
                    }}
                />
            )}
        </div>
    )
}

