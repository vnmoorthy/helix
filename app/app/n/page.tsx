"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { NicheView } from "@/components/NicheView";

function Inner() {
  const q = useSearchParams().get("q") || "protein coffee";
  return <NicheView key={q} q={q} />;
}

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <Inner />
    </Suspense>
  );
}
