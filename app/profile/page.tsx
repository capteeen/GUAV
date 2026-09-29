import { ProfileView } from "@/components/profile-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — Guava",
  description: "Tokens you seeded and claimable creator juice.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
