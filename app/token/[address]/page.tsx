import { TokenScreen } from "@/components/token-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token — Guava",
  description: "Guava token page.",
};

export default async function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <TokenScreen address={address} />;
}
