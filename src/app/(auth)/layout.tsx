"use client";

import { GuestGuard } from "@/components/auth/guest-guard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestGuard>
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(slate 1px, transparent 1px), linear-gradient(to right, slate 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 w-full px-4">
          <div className="flex items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
