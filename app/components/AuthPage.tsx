import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Radio,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

export type AuthVariant = "login" | "register" | "forgot";

export interface AuthPageProps {
  variant: AuthVariant;
}

const variantCopy: Record<
  AuthVariant,
  { eyebrow: string; title: string; description: string }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to your workspace",
    description:
      "Access dispatch, live tracking, and fleet performance from one secure command center.",
  },
  register: {
    eyebrow: "Start with Fleetora",
    title: "Build a more connected fleet",
    description:
      "Create your operations workspace and bring every load, driver, and delivery into view.",
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Reset your password",
    description:
      "Enter the work email linked to your Fleetora account and we’ll send you a secure reset link.",
  },
};

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="auth-field-icon" aria-hidden="true">
      {children}
    </span>
  );
}

function LoginForm() {
  return (
    <form className="auth-form" method="post">
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="auth-login-email">
          Work email
        </label>
        <div className="auth-input-wrap">
          <FieldIcon>
            <Mail size={18} strokeWidth={1.8} />
          </FieldIcon>
          <input
            className="auth-input"
            id="auth-login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </div>
      </div>

      <div className="auth-field-group">
        <div className="auth-label-row">
          <label className="auth-label" htmlFor="auth-login-password">
            Password
          </label>
          <Link className="auth-inline-link" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <div className="auth-input-wrap">
          <FieldIcon>
            <LockKeyhole size={18} strokeWidth={1.8} />
          </FieldIcon>
          <input
            className="auth-input"
            id="auth-login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </div>
      </div>

      <label className="auth-check-row" htmlFor="auth-remember">
        <input
          className="auth-checkbox"
          id="auth-remember"
          name="remember"
          type="checkbox"
        />
        <span className="auth-check-control" aria-hidden="true">
          <Check className="auth-check-icon" size={13} strokeWidth={2.8} />
        </span>
        <span className="auth-check-copy">Keep me signed in on this device</span>
      </label>

      <button className="auth-primary-button" type="submit">
        <span className="auth-button-label">Sign in to Fleetora</span>
        <ArrowRight className="auth-button-icon" size={18} strokeWidth={2} />
      </button>

      <div className="auth-divider" role="separator">
        <span className="auth-divider-line" />
        <span className="auth-divider-text">or continue with</span>
        <span className="auth-divider-line" />
      </div>

      <button className="auth-secondary-button" type="button">
        <Building2 className="auth-button-icon" size={18} strokeWidth={1.8} />
        <span className="auth-button-label">Company single sign-on</span>
      </button>
    </form>
  );
}

function RegisterForm() {
  return (
    <form className="auth-form" method="post">
      <div className="auth-field-grid">
        <div className="auth-field-group">
          <label className="auth-label" htmlFor="auth-register-name">
            Full name
          </label>
          <div className="auth-input-wrap">
            <FieldIcon>
              <UserRound size={18} strokeWidth={1.8} />
            </FieldIcon>
            <input
              className="auth-input"
              id="auth-register-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              required
            />
          </div>
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="auth-register-company">
            Company
          </label>
          <div className="auth-input-wrap">
            <FieldIcon>
              <Building2 size={18} strokeWidth={1.8} />
            </FieldIcon>
            <input
              className="auth-input"
              id="auth-register-company"
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="Northstar Logistics"
              required
            />
          </div>
        </div>
      </div>

      <div className="auth-field-group">
        <label className="auth-label" htmlFor="auth-register-email">
          Work email
        </label>
        <div className="auth-input-wrap">
          <FieldIcon>
            <Mail size={18} strokeWidth={1.8} />
          </FieldIcon>
          <input
            className="auth-input"
            id="auth-register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </div>
      </div>

      <div className="auth-field-group">
        <label className="auth-label" htmlFor="auth-register-password">
          Create password
        </label>
        <div className="auth-input-wrap">
          <FieldIcon>
            <LockKeyhole size={18} strokeWidth={1.8} />
          </FieldIcon>
          <input
            className="auth-input"
            id="auth-register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            aria-describedby="auth-password-hint"
            required
          />
        </div>
        <p className="auth-field-hint" id="auth-password-hint">
          Use 8+ characters with a number and a special character.
        </p>
      </div>

      <label className="auth-check-row auth-check-row-top" htmlFor="auth-terms">
        <input
          className="auth-checkbox"
          id="auth-terms"
          name="terms"
          type="checkbox"
          required
        />
        <span className="auth-check-control" aria-hidden="true">
          <Check className="auth-check-icon" size={13} strokeWidth={2.8} />
        </span>
        <span className="auth-check-copy">
          I agree to Fleetora’s{" "}
          <Link className="auth-inline-link" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="auth-inline-link" href="/privacy">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button className="auth-primary-button" type="submit">
        <span className="auth-button-label">Create my workspace</span>
        <ArrowRight className="auth-button-icon" size={18} strokeWidth={2} />
      </button>
    </form>
  );
}

function ForgotForm() {
  return (
    <form className="auth-form" method="post">
      <div className="auth-recovery-note">
        <span className="auth-recovery-icon" aria-hidden="true">
          <KeyRound size={20} strokeWidth={1.8} />
        </span>
        <p className="auth-recovery-copy">
          Your reset link will be valid for 30 minutes and can only be used
          once.
        </p>
      </div>

      <div className="auth-field-group">
        <label className="auth-label" htmlFor="auth-forgot-email">
          Work email
        </label>
        <div className="auth-input-wrap">
          <FieldIcon>
            <Mail size={18} strokeWidth={1.8} />
          </FieldIcon>
          <input
            className="auth-input"
            id="auth-forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </div>
      </div>

      <button className="auth-primary-button" type="submit">
        <span className="auth-button-label">Send secure reset link</span>
        <ArrowRight className="auth-button-icon" size={18} strokeWidth={2} />
      </button>

      <Link className="auth-back-link" href="/login">
        <ArrowLeft className="auth-back-icon" size={17} strokeWidth={2} />
        Back to sign in
      </Link>
    </form>
  );
}

export default function AuthPage({ variant }: AuthPageProps) {
  const copy = variantCopy[variant];
  const isLogin = variant === "login";
  const isRegister = variant === "register";

  return (
    <main className="auth-page">
      <div className="auth-ambient auth-ambient-one" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-two" aria-hidden="true" />

      <section
        className="auth-brand-panel"
        aria-label="Fleetora transport management platform"
      >
        <div className="auth-brand-content">
          <Link className="auth-logo" href="/" aria-label="Fleetora home">
            <span className="auth-logo-mark" aria-hidden="true">
              <Truck size={23} strokeWidth={1.9} />
            </span>
            <span className="auth-logo-text">Fleetora</span>
          </Link>

          <div className="auth-brand-message">
            <p className="auth-brand-kicker">
              <Radio className="auth-kicker-icon" size={15} strokeWidth={2} />
              The command center for modern fleets
            </p>
            <h1 className="auth-brand-title">
              Move every load with clarity and control.
            </h1>
            <p className="auth-brand-copy">
              Plan routes, coordinate drivers, and keep customers informed from
              one operational view built for high-performing transport teams.
            </p>
          </div>

          <div className="auth-proof-card">
            <div className="auth-proof-header">
              <div className="auth-proof-heading">
                <span className="auth-proof-icon" aria-hidden="true">
                  <Route size={18} strokeWidth={1.8} />
                </span>
                <div className="auth-proof-title-wrap">
                  <p className="auth-proof-label">Live route control</p>
                  <p className="auth-proof-subtitle">Shipment FL-2048</p>
                </div>
              </div>
              <span className="auth-live-status">
                <span className="auth-live-dot" aria-hidden="true" />
                On schedule
              </span>
            </div>

            <div className="auth-route-row">
              <span className="auth-route-pin" aria-hidden="true">
                <MapPin size={17} strokeWidth={1.9} />
              </span>
              <div className="auth-route-copy">
                <span className="auth-route-city">Mumbai</span>
                <span className="auth-route-line" aria-hidden="true">
                  <span className="auth-route-progress" />
                </span>
                <span className="auth-route-city">Bengaluru</span>
              </div>
            </div>

            <div className="auth-proof-metrics">
              <div className="auth-proof-metric">
                <Clock3 className="auth-metric-icon" size={16} strokeWidth={1.8} />
                <div className="auth-metric-copy">
                  <span className="auth-metric-value">14:20</span>
                  <span className="auth-metric-label">Live ETA</span>
                </div>
              </div>
              <div className="auth-proof-metric">
                <CheckCircle2
                  className="auth-metric-icon"
                  size={16}
                  strokeWidth={1.8}
                />
                <div className="auth-metric-copy">
                  <span className="auth-metric-value">98.7%</span>
                  <span className="auth-metric-label">On-time rate</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-trust-row">
            <ShieldCheck className="auth-trust-icon" size={17} strokeWidth={1.8} />
            <span className="auth-trust-copy">
              Enterprise-grade security · Encrypted in transit and at rest
            </span>
          </div>
        </div>
      </section>

      <section className="auth-form-panel" aria-labelledby="auth-form-title">
        <div className="auth-panel-nav">
          <Link className="auth-mobile-logo" href="/" aria-label="Fleetora home">
            <span className="auth-mobile-logo-mark" aria-hidden="true">
              <Truck size={20} strokeWidth={1.9} />
            </span>
            <span className="auth-mobile-logo-text">Fleetora</span>
          </Link>

          <p className="auth-account-prompt">
            {isRegister ? "Already have an account?" : "New to Fleetora?"}
            <Link
              className="auth-prompt-link"
              href={isRegister ? "/login" : "/register"}
            >
              {isRegister ? "Sign in" : "Create account"}
            </Link>
          </p>
        </div>

        <div className="auth-form-stage">
          <div className="auth-form-card">
            <header className="auth-form-header">
              <p className="auth-eyebrow">{copy.eyebrow}</p>
              <h2 className="auth-form-title" id="auth-form-title">
                {copy.title}
              </h2>
              <p className="auth-form-description">{copy.description}</p>
            </header>

            {isLogin ? <LoginForm /> : isRegister ? <RegisterForm /> : <ForgotForm />}

            <div className="auth-security-note">
              <ShieldCheck
                className="auth-security-icon"
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="auth-security-copy">
                Protected by secure authentication and fraud monitoring.
              </span>
            </div>
          </div>
        </div>

        <footer className="auth-footer">
          <span className="auth-footer-copy">
            © {new Date().getFullYear()} Fleetora Technologies
          </span>
          <span className="auth-footer-links">
            <Link className="auth-footer-link" href="/privacy">
              Privacy
            </Link>
            <Link className="auth-footer-link" href="/terms">
              Terms
            </Link>
          </span>
        </footer>
      </section>
    </main>
  );
}
