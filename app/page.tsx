import type { Metadata } from "next";
import LandingPage from "./components/LandingPage";

export const metadata: Metadata = {
  title: "Transport operations, under control",
  description:
    "Fleetora brings dispatch, fleet health, finance, fuel, maintenance, and compliance into one operational workspace.",
};

export default function Home() {
  return <LandingPage />;
}
