import Link from "next/link";
import { ArrowLeft, Clock3, Construction, RouteOff } from "lucide-react";

type StatusPageProps = {
  type: "not-found" | "maintenance" | "coming-soon";
};

const statusCopy = {
  "not-found": {
    eyebrow: "Error 404",
    title: "This route has left the map.",
    body: "The page may have moved, or the address might be incomplete. Your fleet data is safe and exactly where you left it.",
    icon: RouteOff,
    action: "Return to dashboard",
    href: "/dashboard",
  },
  maintenance: {
    eyebrow: "Planned maintenance",
    title: "A quick service stop.",
    body: "Fleetora is receiving a scheduled tune-up. We will be back on the road shortly with every trip and ledger intact.",
    icon: Construction,
    action: "Visit status center",
    href: "/support",
  },
  "coming-soon": {
    eyebrow: "On the roadmap",
    title: "Something useful is in transit.",
    body: "This workspace is being prepared for your team. In the meantime, the rest of Fleetora is ready to explore.",
    icon: Clock3,
    action: "Explore Fleetora",
    href: "/dashboard",
  },
};

export function StatusPage({ type }: StatusPageProps) {
  const item = statusCopy[type];
  const Icon = item.icon;

  return (
    <main className="status-page">
      <Link href="/" className="brand-lockup status-brand" aria-label="Fleetora home">
        <span className="brand-mark">F</span>
        <span>Fleetora</span>
      </Link>
      <section className="status-card">
        <div className="status-icon"><Icon size={26} /></div>
        <span className="eyebrow">{item.eyebrow}</span>
        <h1>{item.title}</h1>
        <p>{item.body}</p>
        <Link href={item.href} className="button primary-button">
          <ArrowLeft size={17} /> {item.action}
        </Link>
      </section>
      <div className="status-grid" aria-hidden="true" />
    </main>
  );
}
