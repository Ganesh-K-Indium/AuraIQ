import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070a12] text-white p-4">
      <h1 className="text-4xl font-bold font-mono text-emerald-400">404</h1>
      <p className="text-slate-400 text-sm mt-2">The requested wealth view does not exist.</p>
      <Link
        href="/"
        className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-all"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

