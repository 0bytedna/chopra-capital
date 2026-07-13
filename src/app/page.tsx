import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";
import { LandingSections } from "@/components/landing/Sections";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LandingSections />
      </main>
      <Footer />
    </>
  );
}
