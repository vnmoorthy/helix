"use client";
import { useParams } from "next/navigation";
import { NicheView } from "@/components/NicheView";

export default function Page() {
  const params = useParams<{ q: string }>();
  return <NicheView q={decodeURIComponent(params.q || "")} />;
}
