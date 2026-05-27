// src/app/claim/layout.tsx

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-gray flex flex-col">
      <header className="bg-white border-b border-brand-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="SmartHERS" width={32} height={32} />
            <div className="leading-tight">
              <p className="text-sm font-bold text-brand-navy">SmartHERS</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                Clinic claim
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 py-10 sm:py-14">{children}</main>

      <footer className="bg-white border-t border-brand-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 text-[11px] text-gray-400 flex flex-col sm:flex-row gap-2 justify-between">
          <p>&copy; {new Date().getFullYear()} SmartHERS. All rights reserved.</p>
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-brand-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
