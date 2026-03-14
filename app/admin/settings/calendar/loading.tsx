import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function CalendarLoading() {
    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="h-8 w-64 mb-2 bg-muted rounded-md animate-pulse" />
                    <div className="h-4 w-96 bg-muted rounded-md animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Card key={i} className="animate-pulse border-border">
                        <CardHeader className="pb-2">
                            <div className="h-6 w-24 bg-muted rounded-md animate-pulse" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-10 w-full mb-4 bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
