"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Fuel,
  Gauge,
  Headphones,
  LineChart,
  Lock,
  MapPin,
  Menu,
  PackageCheck,
  Play,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

const navigation = [
  { label: "Platform", href: "#features" },
  { label: "How it works", href: "#workflow" },
  { label: "Customers", href: "#customers" },
  { label: "Pricing", href: "#pricing" },
];

const companyLogos = ["Northstar", "TransAxis", "Roadline", "CargoGrid", "BlueRoute"];

const stats = [
  { value: "38%", label: "less admin work" },
  { value: "22%", label: "lower operating costs" },
  { value: "2.4x", label: "faster invoicing" },
  { value: "99.99%", label: "platform uptime" },
];

const features: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
  tone: string;
}> = [
  {
    icon: Route,
    title: "Trip control, end to end",
    description:
      "Plan, dispatch, track, and close every trip from one reliable workspace.",
    detail: "Live ETAs, route progress, PODs, and profitability",
    tone: "blue",
  },
  {
    icon: Truck,
    title: "A healthier fleet",
    description:
      "Keep vehicles road-ready with maintenance schedules and document alerts.",
    detail: "Service, tyres, permits, insurance, fitness, and PUC",
    tone: "violet",
  },
  {
    icon: Users,
    title: "Drivers at their best",
    description:
      "Assign the right driver, monitor availability, and improve performance.",
    detail: "Licences, attendance, settlements, and scorecards",
    tone: "emerald",
  },
  {
    icon: CircleDollarSign,
    title: "Finance without blind spots",
    description:
      "Connect trip revenue, expenses, invoices, and collections in real time.",
    detail: "Cash flow, profit, outstanding balances, and ledgers",
    tone: "amber",
  },
  {
    icon: Fuel,
    title: "Fuel you can account for",
    description:
      "Catch mileage drift and overspending before they become costly patterns.",
    detail: "Truck-wise averages, trends, and variance alerts",
    tone: "rose",
  },
  {
    icon: BarChart3,
    title: "Decisions backed by data",
    description:
      "Turn transport activity into clear, useful reports for every stakeholder.",
    detail: "Custom filters with PDF, Excel, and CSV exports",
    tone: "cyan",
  },
];

const workflow = [
  {
    number: "01",
    title: "Bring your operation together",
    description:
      "Import vehicles, drivers, customers, and opening balances with guided setup.",
  },
  {
    number: "02",
    title: "Run every trip in one flow",
    description:
      "Plan loads, assign resources, capture expenses, and track movement live.",
  },
  {
    number: "03",
    title: "Close faster and improve",
    description:
      "Collect PODs, create invoices, reconcile payments, and review true profit.",
  },
];

const testimonials = [
  {
    quote:
      "Fleetora gave our dispatch and finance teams the same source of truth. Month-end closing went from nine days to three.",
    name: "Neha Kulkarni",
    role: "COO, Northstar Logistics",
    initials: "NK",
  },
  {
    quote:
      "We can finally see which routes, vehicles, and customers are actually profitable—while the trip is still running.",
    name: "Arjun Mehta",
    role: "Director, TransAxis Freight",
    initials: "AM",
  },
  {
    quote:
      "Document alerts alone saved us from costly downtime. The platform feels remarkably easy for a system this capable.",
    name: "Sara Khan",
    role: "Fleet Head, BlueRoute Cargo",
    initials: "SK",
  },
];

const plans = [
  {
    name: "Starter",
    description: "For small fleets moving beyond spreadsheets.",
    monthly: 4999,
    annual: 3999,
    features: [
      "Up to 15 vehicles",
      "Trips, fleet, and drivers",
      "Invoices and expenses",
      "Document expiry alerts",
      "Email support",
    ],
    cta: "Start free",
    href: "/register",
    featured: false,
  },
  {
    name: "Growth",
    description: "For growing teams that need control at scale.",
    monthly: 9999,
    annual: 7999,
    features: [
      "Up to 75 vehicles",
      "Everything in Starter",
      "Advanced finance and fuel",
      "Custom reports and exports",
      "Roles and permissions",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    href: "/register",
    featured: true,
  },
  {
    name: "Scale",
    description: "For complex, multi-branch transport operations.",
    monthly: null,
    annual: null,
    features: [
      "Unlimited vehicles",
      "Everything in Growth",
      "Multi-company and branches",
      "Dedicated success manager",
      "Migration and onboarding",
      "Custom controls and SLAs",
    ],
    cta: "Talk to sales",
    href: "/register",
    featured: false,
  },
];

const faqs = [
  {
    question: "How quickly can we get started?",
    answer:
      "Most teams are ready to run their first trip in a day. Our guided import helps you bring in vehicles, drivers, customers, and balances from your existing sheets.",
  },
  {
    question: "Can Fleetora work for different types of transport businesses?",
    answer:
      "Yes. Fleetora supports full-truckload, part-load, contract, market-vehicle, and multi-branch operations, with workflows flexible enough for owned and attached fleets.",
  },
  {
    question: "Does it work on phones and tablets?",
    answer:
      "Fleetora is fully responsive and works in modern browsers across desktop, tablet, and mobile, so dispatchers and managers can stay informed from anywhere.",
  },
  {
    question: "Can I move data from spreadsheets or another TMS?",
    answer:
      "Absolutely. Standard plans include spreadsheet imports, while our Scale plan includes a managed migration for more complex historical data.",
  },
  {
    question: "Is my business data secure?",
    answer:
      "Fleetora uses encryption in transit and at rest, role-based access, activity history, regular backups, and secure infrastructure practices designed for modern businesses.",
  },
  {
    question: "What happens after the free trial?",
    answer:
      "You can choose the plan that fits your fleet or leave without being charged. Your team gets full Growth features during the 14-day trial, and no card is required to begin.",
  },
];

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Live workspace", href: "/dashboard" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Fleet operations", href: "#features" },
      { label: "Trip management", href: "#workflow" },
      { label: "Finance teams", href: "#features" },
      { label: "Transport owners", href: "#customers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Fleetora", href: "#about" },
      { label: "Customer stories", href: "#customers" },
      { label: "Security", href: "#security" },
      { label: "Support", href: "#faq" },
    ],
  },
];

function Brand() {
  return (
    <span className="landing-brand" aria-label="Fleetora home">
      <span className="landing-brand-mark" aria-hidden="true">
        <Route size={20} strokeWidth={2.5} />
      </span>
      <span className="landing-brand-name">Fleetora</span>
    </span>
  );
}

function OperationsVisual() {
  return (
    <div
      className="hero-operations"
      role="img"
      aria-label="Fleetora live operations dashboard showing active trips, vehicle movement, and delivery progress"
    >
      <div className="hero-operations-glow hero-operations-glow--one" />
      <div className="hero-operations-glow hero-operations-glow--two" />

      <div className="hero-floating-card hero-floating-card--profit">
        <span className="hero-floating-icon hero-floating-icon--success">
          <LineChart size={16} aria-hidden="true" />
        </span>
        <span>
          <small>Trip profit</small>
          <strong>₹42,860</strong>
        </span>
        <em>+18.4%</em>
      </div>

      <div className="hero-operations-window">
        <div className="hero-window-bar">
          <span className="hero-window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="hero-window-label">Live operations</span>
          <span className="hero-live-status">
            <i /> Live
          </span>
        </div>

        <div className="hero-window-content">
          <div className="hero-kpis">
            <div className="hero-kpi hero-kpi--active">
              <span className="hero-kpi-icon">
                <Truck size={16} aria-hidden="true" />
              </span>
              <span>
                <small>Active trips</small>
                <strong>24</strong>
              </span>
              <em>+4 today</em>
            </div>
            <div className="hero-kpi">
              <span className="hero-kpi-icon">
                <Gauge size={16} aria-hidden="true" />
              </span>
              <span>
                <small>On-time rate</small>
                <strong>96.8%</strong>
              </span>
            </div>
          </div>

          <div className="hero-map">
            <div className="hero-map-grid" aria-hidden="true" />
            <div className="hero-map-road hero-map-road--one" aria-hidden="true" />
            <div className="hero-map-road hero-map-road--two" aria-hidden="true" />
            <div className="hero-route-line hero-route-line--one" aria-hidden="true" />
            <div className="hero-route-line hero-route-line--two" aria-hidden="true" />

            <span className="hero-map-point hero-map-point--origin">
              <i /> Mumbai
            </span>
            <span className="hero-map-point hero-map-point--destination">
              <i /> Bengaluru
            </span>
            <span className="hero-truck-pin hero-truck-pin--primary">
              <Truck size={15} aria-hidden="true" />
              <b>MH 04 LM 4821</b>
            </span>
            <span className="hero-truck-pin hero-truck-pin--secondary">
              <Truck size={13} aria-hidden="true" />
            </span>
            <span className="hero-map-location">
              <MapPin size={12} aria-hidden="true" /> Pune
            </span>
          </div>

          <div className="hero-trip-row">
            <span className="hero-trip-avatar">
              <PackageCheck size={17} aria-hidden="true" />
            </span>
            <span className="hero-trip-copy">
              <strong>TRP-2048 · Mumbai → Bengaluru</strong>
              <small>Ramesh Yadav · 18.2 T · 642 km</small>
            </span>
            <span className="hero-trip-progress">
              <i>
                <b />
              </i>
              <small>72%</small>
            </span>
          </div>
        </div>
      </div>

      <div className="hero-floating-card hero-floating-card--alert">
        <span className="hero-floating-icon hero-floating-icon--warning">
          <Bell size={16} aria-hidden="true" />
        </span>
        <span>
          <small>Smart alert</small>
          <strong>3 permits expire soon</strong>
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(true);

  const closeMobileNav = () => setMobileOpen(false);

  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link className="landing-logo-link" href="/" onClick={closeMobileNav}>
            <Brand />
          </Link>

          <nav
            className={`landing-nav${mobileOpen ? " landing-nav--open" : ""}`}
            aria-label="Primary navigation"
          >
            <div className="landing-nav-links">
              {navigation.map((item) => (
                <a key={item.label} href={item.href} onClick={closeMobileNav}>
                  {item.label}
                </a>
              ))}
            </div>
            <div className="landing-nav-actions">
              <Link className="landing-login-link" href="/login" onClick={closeMobileNav}>
                Sign in
              </Link>
              <Link className="landing-button landing-button--small" href="/register" onClick={closeMobileNav}>
                Start free
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </nav>

          <button
            className="landing-menu-button"
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((isOpen) => !isOpen)}
          >
            {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-section" aria-labelledby="hero-heading">
          <div className="hero-background" aria-hidden="true">
            <span className="hero-background-orb hero-background-orb--one" />
            <span className="hero-background-orb hero-background-orb--two" />
            <span className="hero-background-grid" />
          </div>

          <div className="landing-container hero-layout">
            <div className="hero-content">
              <a className="hero-eyebrow" href="#features">
                <span>
                  <Sparkles size={13} aria-hidden="true" /> New
                </span>
                The modern operating system for transport
                <ChevronRight size={14} aria-hidden="true" />
              </a>

              <h1 id="hero-heading">
                Every truck. Every trip.
                <span>One calm command center.</span>
              </h1>
              <p className="hero-description">
                Fleetora unifies dispatch, fleet, drivers, finance, fuel, and compliance—so your team can move freight with confidence and grow without the operational chaos.
              </p>

              <div className="hero-actions">
                <Link className="landing-button landing-button--primary landing-button--large" href="/register">
                  Start your 14-day trial
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="landing-button landing-button--secondary landing-button--large" href="/dashboard">
                  <Play size={16} fill="currentColor" aria-hidden="true" />
                  Explore live workspace
                </Link>
              </div>

              <div className="hero-assurances" aria-label="Trial benefits">
                <span>
                  <CheckCircle2 size={15} aria-hidden="true" /> No credit card
                </span>
                <span>
                  <CheckCircle2 size={15} aria-hidden="true" /> Setup in one day
                </span>
                <span>
                  <CheckCircle2 size={15} aria-hidden="true" /> Cancel anytime
                </span>
              </div>
            </div>

            <div className="hero-visual-wrap">
              <OperationsVisual />
            </div>
          </div>
        </section>

        <section className="landing-social-proof" aria-label="Trusted transport companies">
          <div className="landing-container">
            <p>Trusted by ambitious transport teams moving business forward</p>
            <div className="landing-logo-cloud">
              {companyLogos.map((company, index) => (
                <span key={company} className={`landing-customer-logo landing-customer-logo--${index + 1}`}>
                  <span aria-hidden="true" />
                  {company}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-label="Fleetora customer results">
          <div className="landing-container landing-stats-grid">
            {stats.map((stat) => (
              <div className="landing-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="feature-section" id="features" aria-labelledby="features-heading">
          <div className="landing-container">
            <div className="landing-section-heading feature-heading">
              <span className="landing-section-kicker">One connected platform</span>
              <h2 id="features-heading">Run your entire transport business without the busywork</h2>
              <p>
                Replace scattered spreadsheets, calls, and disconnected tools with a workspace built around how modern transport teams actually operate.
              </p>
            </div>

            <div className="feature-grid">
              {features.map(({ icon: FeatureIcon, title, description, detail, tone }) => (
                <article className={`feature-card feature-card--${tone}`} key={title}>
                  <div className="feature-icon">
                    <FeatureIcon size={22} aria-hidden="true" />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="feature-detail">
                    <Check size={15} aria-hidden="true" />
                    <span>{detail}</span>
                  </div>
                  <a href="#workflow" aria-label={`Learn more about ${title}`}>
                    See how it works <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="workflow-section" id="workflow" aria-labelledby="workflow-heading">
          <div className="landing-container workflow-layout">
            <div className="workflow-content">
              <div className="landing-section-heading landing-section-heading--left">
                <span className="landing-section-kicker">From dispatch to payment</span>
                <h2 id="workflow-heading">One continuous workflow. Zero information gaps.</h2>
                <p>
                  Fleetora follows every load from planning to settlement, keeping your operation and accounts perfectly aligned.
                </p>
              </div>

              <ol className="workflow-steps">
                {workflow.map((step, index) => (
                  <li className={`workflow-step${index === 0 ? " workflow-step--active" : ""}`} key={step.number}>
                    <span className="workflow-step-number">{step.number}</span>
                    <span>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </span>
                  </li>
                ))}
              </ol>

              <Link className="landing-text-link" href="/dashboard">
                Explore the complete workflow <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="workflow-visual" aria-label="Trip workflow preview">
              <div className="workflow-visual-header">
                <span>
                  <Route size={18} aria-hidden="true" /> Trip TRP-2048
                </span>
                <span className="workflow-status">In transit</span>
              </div>
              <div className="workflow-route-summary">
                <div>
                  <span className="workflow-route-dot workflow-route-dot--start" />
                  <small>Origin</small>
                  <strong>Mumbai, MH</strong>
                  <em>10 Jul · 06:30</em>
                </div>
                <span className="workflow-route-track" aria-hidden="true">
                  <i />
                  <Truck size={19} />
                </span>
                <div>
                  <span className="workflow-route-dot workflow-route-dot--end" />
                  <small>Destination</small>
                  <strong>Bengaluru, KA</strong>
                  <em>11 Jul · 19:15</em>
                </div>
              </div>
              <div className="workflow-metrics">
                <div>
                  <span className="workflow-metric-icon"><Clock3 size={16} aria-hidden="true" /></span>
                  <span><small>ETA</small><strong>9h 24m</strong></span>
                </div>
                <div>
                  <span className="workflow-metric-icon"><Fuel size={16} aria-hidden="true" /></span>
                  <span><small>Fuel spend</small><strong>₹28,400</strong></span>
                </div>
                <div>
                  <span className="workflow-metric-icon"><LineChart size={16} aria-hidden="true" /></span>
                  <span><small>Est. profit</small><strong>₹42,860</strong></span>
                </div>
              </div>
              <div className="workflow-timeline">
                <div className="workflow-timeline-item workflow-timeline-item--done">
                  <span><Check size={12} aria-hidden="true" /></span>
                  <div><strong>Trip dispatched</strong><small>06:30 · Mumbai hub</small></div>
                </div>
                <div className="workflow-timeline-item workflow-timeline-item--done">
                  <span><Check size={12} aria-hidden="true" /></span>
                  <div><strong>Checkpoint cleared</strong><small>11:48 · Pune</small></div>
                </div>
                <div className="workflow-timeline-item workflow-timeline-item--current">
                  <span><Truck size={12} aria-hidden="true" /></span>
                  <div><strong>En route to Hubballi</strong><small>Location updated 2 min ago</small></div>
                </div>
                <div className="workflow-timeline-item">
                  <span><PackageCheck size={12} aria-hidden="true" /></span>
                  <div><strong>Proof of delivery</strong><small>Expected tomorrow</small></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-control-section" id="security" aria-labelledby="control-heading">
          <div className="landing-container feature-control-layout">
            <div className="feature-control-panel" aria-hidden="true">
              <div className="feature-control-search">
                <Search size={16} />
                <span>Search trips, vehicles, drivers...</span>
                <kbd>⌘ K</kbd>
              </div>
              <div className="feature-control-command">
                <small>QUICK ACTIONS</small>
                <div className="feature-command-row feature-command-row--active">
                  <Route size={16} />
                  <span>Create a new trip</span>
                  <kbd>↵</kbd>
                </div>
                <div className="feature-command-row">
                  <Truck size={16} />
                  <span>Add a vehicle</span>
                </div>
                <div className="feature-command-row">
                  <FileCheck2 size={16} />
                  <span>Generate invoice</span>
                </div>
              </div>
              <div className="feature-control-notice">
                <ShieldCheck size={18} />
                <span><strong>Everything is under control</strong><small>All critical documents are valid</small></span>
                <CheckCircle2 size={17} />
              </div>
            </div>

            <div className="feature-control-content">
              <span className="landing-section-kicker">Fast for your team. Safe for your business.</span>
              <h2 id="control-heading">Powerful control that never gets in the way</h2>
              <p>
                Give every person the clarity and tools they need, while keeping sensitive business data protected.
              </p>
              <ul className="feature-control-list">
                <li>
                  <span><Zap size={17} aria-hidden="true" /></span>
                  <div><strong>Built for speed</strong><p>Global search, quick actions, keyboard shortcuts, and smart defaults.</p></div>
                </li>
                <li>
                  <span><Lock size={17} aria-hidden="true" /></span>
                  <div><strong>Granular permissions</strong><p>Control who can view, edit, approve, and export sensitive data.</p></div>
                </li>
                <li>
                  <span><ShieldCheck size={17} aria-hidden="true" /></span>
                  <div><strong>Enterprise-ready security</strong><p>Encryption, backups, activity history, and secure cloud infrastructure.</p></div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="landing-testimonials" id="customers" aria-labelledby="testimonials-heading">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="landing-section-kicker">Loved by transport teams</span>
              <h2 id="testimonials-heading">Less chasing. More moving.</h2>
              <p>See why growing transport companies trust Fleetora to run their day.</p>
            </div>

            <div className="landing-testimonial-grid">
              {testimonials.map((testimonial, index) => (
                <figure
                  className={`landing-testimonial-card${index === 0 ? " landing-testimonial-card--featured" : ""}`}
                  key={testimonial.name}
                >
                  <div className="landing-rating" aria-label="5 out of 5 stars">
                    {[0, 1, 2, 3, 4].map((star) => (
                      <Star key={star} size={15} fill="currentColor" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote>“{testimonial.quote}”</blockquote>
                  <figcaption>
                    <span className="landing-avatar" aria-hidden="true">{testimonial.initials}</span>
                    <span><strong>{testimonial.name}</strong><small>{testimonial.role}</small></span>
                    <CheckCircle2 size={16} aria-label="Verified customer" />
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-section" id="pricing" aria-labelledby="pricing-heading">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="landing-section-kicker">Simple, transparent pricing</span>
              <h2 id="pricing-heading">A plan that grows with every mile</h2>
              <p>Start free for 14 days. Upgrade when you are ready. No hidden implementation fees.</p>
            </div>

            <div className="pricing-billing-toggle" role="group" aria-label="Billing frequency">
              <button
                type="button"
                className={!annualBilling ? "pricing-billing-option pricing-billing-option--active" : "pricing-billing-option"}
                aria-pressed={!annualBilling}
                onClick={() => setAnnualBilling(false)}
              >
                Monthly
              </button>
              <button
                type="button"
                className={annualBilling ? "pricing-billing-option pricing-billing-option--active" : "pricing-billing-option"}
                aria-pressed={annualBilling}
                onClick={() => setAnnualBilling(true)}
              >
                Annually <span>Save 20%</span>
              </button>
            </div>

            <div className="pricing-grid">
              {plans.map((plan) => {
                const price = annualBilling ? plan.annual : plan.monthly;
                return (
                  <article
                    className={`pricing-card${plan.featured ? " pricing-card--featured" : ""}`}
                    key={plan.name}
                  >
                    {plan.featured && <span className="pricing-popular-badge">Most popular</span>}
                    <div className="pricing-card-header">
                      <h3>{plan.name}</h3>
                      <p>{plan.description}</p>
                    </div>
                    <div className="pricing-price">
                      {price === null ? (
                        <><strong>Custom</strong><span>Built around your operation</span></>
                      ) : (
                        <>
                          <span className="pricing-currency">₹</span>
                          <strong>{price.toLocaleString("en-IN")}</strong>
                          <span>/ month</span>
                          {annualBilling && <small>Billed annually</small>}
                        </>
                      )}
                    </div>
                    <Link
                      className={`landing-button pricing-button${plan.featured ? " pricing-button--featured" : ""}`}
                      href={plan.href}
                    >
                      {plan.cta} <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                    <div className="pricing-divider" />
                    <p className="pricing-includes">What&apos;s included</p>
                    <ul>
                      {plan.features.map((feature) => (
                        <li key={feature}><Check size={15} aria-hidden="true" /> {feature}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            <p className="pricing-footnote">
              All plans include secure cloud hosting, automatic updates, daily backups, and access on unlimited devices.
            </p>
          </div>
        </section>

        <section className="faq-section" id="faq" aria-labelledby="faq-heading">
          <div className="landing-container faq-layout">
            <div className="faq-intro">
              <span className="landing-section-kicker">Frequently asked questions</span>
              <h2 id="faq-heading">Everything you need to know</h2>
              <p>Can&apos;t find the answer you need?</p>
              <a className="landing-text-link" href="mailto:hello@fleetora.app">
                Talk to our team <ArrowRight size={16} aria-hidden="true" />
              </a>
              <div className="faq-support-card">
                <span><Headphones size={19} aria-hidden="true" /></span>
                <div><strong>Real help, from real people</strong><small>Average reply time: under 10 minutes</small></div>
              </div>
            </div>

            <div className="faq-list">
              {faqs.map((faq, index) => (
                <details className="faq-item" key={faq.question} open={index === 0}>
                  <summary>
                    <span>{faq.question}</span>
                    <span className="faq-icon" aria-hidden="true" />
                  </summary>
                  <div className="faq-answer"><p>{faq.answer}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta-section" aria-labelledby="cta-heading">
          <div className="landing-container">
            <div className="landing-cta-card">
              <div className="landing-cta-grid" aria-hidden="true" />
              <span className="landing-cta-orb landing-cta-orb--one" aria-hidden="true" />
              <span className="landing-cta-orb landing-cta-orb--two" aria-hidden="true" />
              <div className="landing-cta-icon" aria-hidden="true"><Truck size={26} /></div>
              <h2 id="cta-heading">Your operation deserves a clearer road ahead.</h2>
              <p>Join modern transport teams running faster, leaner, and more profitably with Fleetora.</p>
              <div className="landing-cta-actions">
                <Link className="landing-button landing-button--light landing-button--large" href="/register">
                  Start free for 14 days <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="landing-button landing-button--ghost-light landing-button--large" href="/dashboard">
                  View the dashboard
                </Link>
              </div>
              <span className="landing-cta-note"><Check size={14} aria-hidden="true" /> No credit card required</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="about">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div className="landing-footer-brand">
              <Link className="landing-logo-link" href="/"><Brand /></Link>
              <p>The connected operating system for modern transport businesses.</p>
              <span className="landing-footer-status"><i /> All systems operational</span>
            </div>

            <div className="landing-footer-links">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h3>{group.title}</h3>
                  {group.links.map((link) => (
                    link.href.startsWith("/") ? (
                      <Link key={link.label} href={link.href}>{link.label}</Link>
                    ) : (
                      <a key={link.label} href={link.href}>{link.label}</a>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} Fleetora Technologies. All rights reserved.</span>
            <div>
              <a href="#about">Privacy</a>
              <a href="#about">Terms</a>
              <a href="#security">Security</a>
            </div>
            <span className="landing-footer-made">Built for the people who keep business moving.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
