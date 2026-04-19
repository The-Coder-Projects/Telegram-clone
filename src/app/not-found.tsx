import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center bg-tg-dark text-tg-text">
      <div className="max-w-xl rounded-3xl border border-tg-border bg-tg-darker p-10 text-center shadow-sm">
        <p className="text-sm text-tg-text/70">Page not found.</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">404</h1>
        <p className="mt-2 text-sm text-tg-text/80">
          The page you are looking for does not exist.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="rounded-full bg-tg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-tg-brand/90"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
}
