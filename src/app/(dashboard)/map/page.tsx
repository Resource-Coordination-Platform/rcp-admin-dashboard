"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";
const SafeZonesMap = dynamic(
  () => import("@/components/features/safe-zones-map"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[75vh] w-full rounded-2xl" />,
  },
);
export default function MapPage() {
  return <SafeZonesMap />;
}
