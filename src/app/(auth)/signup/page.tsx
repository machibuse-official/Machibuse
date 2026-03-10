"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="relative w-full max-w-sm">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 animate-float rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 animate-float rounded-full bg-indigo-400/20 blur-3xl [animation-delay:2s]" />
        <div className="pointer-events-none absolute -right-16 top-8 h-48 w-48 animate-float rounded-full bg-cyan-400/20 blur-3xl [animation-delay:4s]" />

        <div className="relative animate-scale-in rounded-2xl border border-white/40 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              確認メールを送信しました
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {email}{" "}
              に確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              ログインページへ
            </Link>
          </div>
        </div>
      </div>
    );
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

        <form onSubmit={handleSignup} className="space-y-5">
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
              placeholder="6文字以上"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
              placeholder="もう一度入力"
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
            {loading ? "登録中..." : "アカウント作成"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          すでにアカウントをお持ちの方は{" "}
          <Link
            href="/login"
            className="font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
