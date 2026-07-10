import type { Metadata } from "next";
import { AppShell } from "../components/AppShell";
import AuthPage from "../components/AuthPage";
import { StatusPage } from "../components/StatusPage";

type RouteProps = {
  params: Promise<{ slug: string[] }>;
};

const appRoutes = new Set([
  "dashboard",
  "fleet",
  "drivers",
  "trips",
  "customers",
  "vendors",
  "finance",
  "fuel",
  "maintenance",
  "documents",
  "reports",
  "notifications",
  "settings",
  "support",
]);

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const route = slug.join("/");
  const label = route
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return {
    title: route === "login" ? "Welcome back" : label || "Fleetora",
  };
}

export default async function FleetoraRoute({ params }: RouteProps) {
  const { slug } = await params;
  const route = slug.join("/").toLowerCase();

  if (route === "login") return <AuthPage variant="login" />;
  if (route === "register") return <AuthPage variant="register" />;
  if (route === "forgot-password") return <AuthPage variant="forgot" />;
  if (route === "system-maintenance") return <StatusPage type="maintenance" />;
  if (route === "coming-soon") return <StatusPage type="coming-soon" />;
  if (appRoutes.has(route)) return <AppShell route={route} />;

  return <StatusPage type="not-found" />;
}
