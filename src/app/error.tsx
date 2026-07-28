"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-20">
      <section className="glass-card w-full p-8 text-center sm:p-12">
        <p className="eyebrow">Temporary problem</p>
        <h1 className="mt-4 font-serif text-4xl text-ink">This page could not be loaded.</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-dim">
          Your data has not been changed. Try the page again, or return later if the problem continues.
        </p>
        <button type="button" onClick={reset} className="btn-gold mt-7 px-6 py-3">
          Try again
        </button>
      </section>
    </main>
  );
}
