import * as React from "react";

export default function DashboardLoading() {
  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="h-32 w-full rounded-xl bg-muted animate-pulse lg:col-span-2" />
      <div className="h-32 w-full rounded-xl bg-muted animate-pulse" />
      <div className="h-32 w-full rounded-xl bg-muted animate-pulse" />
    </div>
  );
}
