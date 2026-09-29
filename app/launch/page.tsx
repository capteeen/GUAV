import { LaunchForm } from "@/components/launch-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Launch — Guava",
  description: "Launch a token into the Guava grove.",
};

export default function LaunchPage() {
  return <LaunchForm />;
}
