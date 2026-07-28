import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-20">
      <section className="glass-card w-full p-8 text-center sm:p-12">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-serif text-4xl text-ink">That page does not exist.</h1>
        <p className="mt-4 text-base text-ink-dim">The link may be outdated, or the page may have moved.</p>
        <Link href="/" className="btn-gold mt-7 px-6 py-3">
          Return home
        </Link>
      </section>
    </main>
  );
}
