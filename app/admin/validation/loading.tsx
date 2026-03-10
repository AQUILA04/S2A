// Skeleton loading state for the Validation Console page
// Uses Tailwind animate-pulse to match the table layout

export default function ValidationLoading() {
    return (
        <div className="flex flex-col min-h-full animate-pulse">
            {/* Header skeleton */}
            <div className="px-4 py-6 bg-white border-b">
                <div className="h-7 w-56 bg-muted rounded-md mb-2" />
                <div className="h-4 w-80 bg-muted/60 rounded-md" />
            </div>

            <div className="p-4">
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {/* Table header skeleton */}
                    <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b bg-muted/20">
                        {[3, 2, 2, 2, 2, 1].map((span, i) => (
                            <div
                                key={i}
                                className={`col-span-${span} h-3 bg-muted rounded`}
                            />
                        ))}
                    </div>

                    {/* Row skeletons */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-12 gap-3 px-4 py-4 border-b items-center"
                        >
                            <div className="col-span-3 h-4 bg-muted rounded" />
                            <div className="col-span-2 h-4 bg-muted rounded w-3/4" />
                            <div className="col-span-2 h-4 bg-muted/60 rounded w-4/5" />
                            <div className="col-span-2 h-3 bg-muted/50 rounded w-full" />
                            <div className="col-span-2 h-3 bg-muted/50 rounded w-3/4" />
                            <div className="col-span-1 flex justify-end">
                                <div className="h-8 w-20 bg-muted rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
