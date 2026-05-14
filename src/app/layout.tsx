import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClientToaster } from "@/components/ClientToaster";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "PersonalHERS Clinic Portal",
  description: "Personal Health and Emergency Response System — Clinic Management Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        {children}
        <ClientToaster />
      </body>
    </html>
  );
}