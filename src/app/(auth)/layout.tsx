export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full grid place-items-center bg-tg-darker">
      <div className="w-full max-w-md rounded-2xl border border-tg-border bg-tg-surface p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

