import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <article
              className="
                [&>h1]:font-serif [&>h1]:text-3xl [&>h1]:sm:text-4xl [&>h1]:tracking-tight [&>h1]:text-ink
                [&>p.lead]:mt-4 [&>p.lead]:text-base [&>p.lead]:text-ink-dim
                [&>h2]:mt-10 [&>h2]:font-serif [&>h2]:text-xl [&>h2]:text-ink
                [&>p]:mt-4 [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-ink-dim
                [&>ul]:mt-4 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5 [&>ul]:text-sm [&>ul]:leading-relaxed [&>ul]:text-ink-dim
              "
            >
              {children}
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
