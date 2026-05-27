// src/app/page.tsx — public landing page

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Siren,
  Activity,
  Truck,
  Users,
  Phone,
  Gauge,
  ShieldCheck,
  FileSignature,
  ClipboardCheck,
  MessageSquare,
  LogIn,
  Sparkles,
  Building2,
  Clock,
  CheckCircle2,
} from "lucide-react";

const CLAIM_STEPS = [
  {
    icon: FileSignature,
    title: "Submit your claim",
    body:
      "Tell us about your clinic, upload your business license and medical certificate, and set the password you'll use to sign in.",
  },
  {
    icon: ClipboardCheck,
    title: "System admin review",
    body:
      "A SmartHERS administrator verifies your documents against the Ministry of Health registry. Most reviews finish within one business day.",
  },
  {
    icon: MessageSquare,
    title: "Get approved by SMS",
    body:
      "When your claim is approved you receive a TextBee SMS at the phone number you submitted. Rejected? You'll get the reason and can re-apply.",
  },
  {
    icon: LogIn,
    title: "Sign in and dispatch",
    body:
      "Use your phone number and the password you set during the claim. You become the clinic_admin and can immediately invite drivers and operators.",
  },
];

const FEATURES = [
  {
    icon: Siren,
    title: "Live SOS dispatch queue",
    body:
      "Every emergency near your clinic shows up in real time with patient location, urgency level, and a one-click driver assignment.",
  },
  {
    icon: Truck,
    title: "Ambulance availability",
    body:
      "Toggle availability, set how many ambulances are free, and a built-in expiry keeps your status from going stale.",
  },
  {
    icon: Users,
    title: "Driver & operator management",
    body:
      "Invite staff by phone number. They receive their temporary password by SMS and can sign in straight from the mobile app.",
  },
  {
    icon: Gauge,
    title: "Operational status",
    body:
      "Mark your clinic as Available, Busy, Capacity-Full, or Closed. Dispatch routing reflects your status within seconds.",
  },
  {
    icon: Phone,
    title: "Priority emergency lines",
    body:
      "Maintain up to five emergency phone numbers and drag to set the order responders are dialled in.",
  },
  {
    icon: ShieldCheck,
    title: "Verified-only network",
    body:
      "Every clinic is verified by a system administrator before going live. Patients only see clinics that passed review.",
  },
];

const TRUST_POINTS = [
  {
    title: "Built around the MoH registry",
    body:
      "Claims are matched against existing clinics — no duplicate listings, no spoofed facilities.",
  },
  {
    title: "Phone-first authentication",
    body:
      "Ethiopian phone numbers (+2519 / +2517) are the identity primitive. No emails to lose, no inboxes to monitor.",
  },
  {
    title: "Audit trail on every action",
    body:
      "Claim submissions, approvals, rejections, and staff invitations are all written to an immutable event log.",
  },
];

const STATS = [
  { value: "24/7", label: "Dispatch availability" },
  { value: "<60s", label: "Median SOS pickup" },
  { value: "100%", label: "Verified clinics" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <Hero />
      <StatsStrip />
      <ClaimFlowSection />
      <FeaturesSection />
      <TrustSection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

/* ───────────── Header ───────────── */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="SmartHERS"
            width={36}
            height={36}
            priority
          />
          <div className="leading-tight">
            <p className="text-sm font-bold text-brand-navy">SmartHERS</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              Clinic Portal
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600">
          <a href="#how-it-works" className="hover:text-brand-navy transition-colors">
            How it works
          </a>
          <a href="#features" className="hover:text-brand-navy transition-colors">
            For clinics
          </a>
          <a href="#trust" className="hover:text-brand-navy transition-colors">
            Why SmartHERS
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-gray rounded-lg transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
          <Link
            href="/claim"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand-blue text-white hover:bg-brand-sky rounded-lg shadow-sm transition-colors"
          >
            Claim your clinic
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ───────────── Hero ───────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-gray to-white" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="absolute top-20 -right-32 h-96 w-96 rounded-full bg-brand-sky/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
              <Sparkles className="h-3.5 w-3.5" />
              Ethiopia&apos;s emergency response network
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-brand-navy leading-[1.05]">
              Connect your clinic to{" "}
              <span className="bg-gradient-to-r from-brand-blue to-brand-sky bg-clip-text text-transparent">
                every emergency
              </span>{" "}
              within reach.
            </h1>

            <p className="mt-6 text-lg text-gray-600 max-w-xl">
              SmartHERS routes nearby SOS calls straight to your clinic&apos;s
              dispatch queue. Claim your facility, upload two documents, and
              start saving lives the moment you&apos;re verified.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/claim"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-blue text-white font-semibold hover:bg-brand-sky shadow-lg shadow-brand-blue/20 transition-all hover:-translate-y-0.5"
              >
                Claim your clinic
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-brand-border bg-white text-brand-navy font-semibold hover:bg-brand-gray transition-colors"
              >
                <LogIn className="h-4 w-4" />
                I already have an account
              </Link>
            </div>

            <p className="mt-5 text-xs text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
              Free for verified clinics · Approved within 1 business day
            </p>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/30 to-brand-sky/10 rounded-3xl blur-2xl -z-10" />
      <div className="rounded-3xl bg-brand-navy p-1 shadow-2xl">
        <div className="rounded-[22px] bg-gradient-to-br from-brand-navy to-[#0F1A40] p-6 sm:p-8">
          <div className="flex items-center justify-between text-[11px] text-blue-200">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-red animate-pulse" />
              SOS queue · Addis Ababa
            </span>
            <span>Live</span>
          </div>

          <div className="mt-6 space-y-3">
            <DispatchCard
              urgency="Critical"
              urgencyTone="red"
              patient="+251 911 ••• 042"
              distance="0.8 km away"
              seconds={42}
            />
            <DispatchCard
              urgency="High"
              urgencyTone="amber"
              patient="+251 711 ••• 187"
              distance="1.6 km away"
              seconds={118}
              assigned
            />
            <DispatchCard
              urgency="Medium"
              urgencyTone="green"
              patient="+251 911 ••• 901"
              distance="2.3 km away"
              seconds={205}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="In queue" value="3" tone="blue" />
            <MiniStat label="Drivers on duty" value="4" tone="green" />
            <MiniStat label="Avg pickup" value="58s" tone="amber" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DispatchCard({
  urgency,
  urgencyTone,
  patient,
  distance,
  seconds,
  assigned,
}: {
  urgency: string;
  urgencyTone: "red" | "amber" | "green";
  patient: string;
  distance: string;
  seconds: number;
  assigned?: boolean;
}) {
  const toneClasses = {
    red: "bg-brand-red/15 text-red-200 border-red-400/30",
    amber: "bg-brand-amber/15 text-amber-200 border-amber-400/30",
    green: "bg-brand-green/15 text-green-200 border-green-400/30",
  }[urgencyTone];

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex items-center justify-between hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses} border`}
        >
          <Siren className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${toneClasses} border`}
            >
              {urgency}
            </span>
            <span className="text-[10px] text-blue-200">{distance}</span>
          </div>
          <p className="text-sm text-white font-medium mt-0.5">{patient}</p>
        </div>
      </div>
      <div className="text-right">
        {assigned ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-green-300">
            <CheckCircle2 className="h-3 w-3" />
            Dispatched
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-200">
            <Clock className="h-3 w-3" />
            {seconds}s
          </span>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber";
}) {
  const toneText = {
    blue: "text-blue-300",
    green: "text-green-300",
    amber: "text-amber-300",
  }[tone];
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 py-3 px-2">
      <p className={`text-lg font-bold ${toneText}`}>{value}</p>
      <p className="text-[10px] text-blue-200 mt-0.5 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

/* ───────────── Stats strip ───────────── */

function StatsStrip() {
  return (
    <section className="border-y border-brand-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-3 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-navy">
              {s.value}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── How it works ───────────── */

function ClaimFlowSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-brand-gray">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold text-brand-blue uppercase tracking-widest">
            How it works
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-brand-navy">
            Four steps from claim to first dispatch.
          </h2>
          <p className="mt-4 text-gray-600 text-lg">
            No paperwork shuffling, no in-person visits. Submit once and we
            handle the rest.
          </p>
        </div>

        <ol className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {CLAIM_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative rounded-2xl bg-white p-6 border border-brand-border hover:border-brand-blue/40 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-3xl font-bold text-brand-border group-hover:text-brand-blue/30 transition-colors">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-brand-navy">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 flex justify-center">
          <Link
            href="/claim"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-navy text-white font-semibold hover:bg-[#0F1A40] shadow-lg transition-colors"
          >
            <FileSignature className="h-4 w-4" />
            Start your claim
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Features ───────────── */

function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold text-brand-blue uppercase tracking-widest">
            For clinics
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-brand-navy">
            Everything your dispatch desk needs.
          </h2>
          <p className="mt-4 text-gray-600 text-lg">
            One portal for emergency response, ambulance status, and staff
            access. Built specifically for Ethiopian clinics.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl p-6 border border-brand-border hover:border-brand-blue/40 hover:shadow-xl transition-all bg-white"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-semibold text-brand-navy text-lg">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Trust ───────────── */

function TrustSection() {
  return (
    <section id="trust" className="py-20 lg:py-28 bg-brand-navy text-white relative overflow-hidden">
      <div className="absolute inset-0 -z-0 opacity-20">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-brand-blue blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-brand-sky blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold text-brand-sky uppercase tracking-widest">
            Why SmartHERS
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
            Trust is the only feature that matters in an emergency.
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            We designed the claim flow, the verification, and the dispatch
            interface around one assumption: lives depend on the next
            sixty seconds.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {TRUST_POINTS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl p-6 bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
            >
              <CheckCircle2 className="h-6 w-6 text-brand-green" />
              <h3 className="mt-4 font-semibold text-white text-lg">{p.title}</h3>
              <p className="mt-2 text-sm text-blue-200 leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Final CTA ───────────── */

function FinalCta() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-brand-sky p-10 sm:p-14 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-brand-navy/30 blur-2xl" />

          <div className="relative max-w-2xl">
            <Building2 className="h-10 w-10 text-white/80" />
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-white">
              Ready to claim your clinic?
            </h2>
            <p className="mt-4 text-white/90 text-lg">
              Submitting takes about five minutes. You&apos;ll need your
              business license, medical certificate, and the phone number you
              want to sign in with.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/claim"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-brand-blue font-semibold hover:bg-blue-50 shadow-lg transition-all hover:-translate-y-0.5"
              >
                Start the claim form
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-transparent text-white font-semibold border border-white/40 hover:bg-white/10 transition-colors"
              >
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Footer ───────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-brand-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="SmartHERS" width={28} height={28} />
            <div>
              <p className="text-sm font-bold text-brand-navy">SmartHERS</p>
              <p className="text-[11px] text-gray-500">
                Personal Health & Emergency Response System
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
            <a href="#how-it-works" className="hover:text-brand-navy transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-brand-navy transition-colors">
              For clinics
            </a>
            <Link href="/claim" className="hover:text-brand-navy transition-colors">
              Claim a clinic
            </Link>
            <Link href="/login" className="hover:text-brand-navy transition-colors">
              Sign in
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} SmartHERS. Built for Ethiopian
            emergency care.
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Activity className="h-3 w-3" />
            Verified by Ministry of Health registry
          </p>
        </div>
      </div>
    </footer>
  );
}
