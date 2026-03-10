"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 animate-float rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 animate-float rounded-full bg-indigo-400/20 blur-3xl [animation-delay:2s]" />
      <div className="pointer-events-none absolute -right-16 top-8 h-48 w-48 animate-float rounded-full bg-cyan-400/20 blur-3xl [animation-delay:4s]" />

      <div className="relative animate-scale-in rounded-2xl border border-white/40 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            MACHIBUSE
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            理想の住まいを、誰よりも早く。
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
              placeholder="パスワード"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
