import { HeroSection } from "@/components/HeroSection";
import { CompanyProfile } from "@/components/CompanyProfile";
import { ProductList } from "@/components/ProductList";
import { Testimonials } from "@/components/Testimonials";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <HeroSection />
      
      <section id="about" className="py-20">
        <CompanyProfile />
      </section>
      
      <section id="products" className="py-20">
        <ProductList />
      </section>
      
      <section id="testimonials" className="py-20">
        <Testimonials />
      </section>
      
      <section id="contact" className="py-20">
        <ContactSection />
      </section>
      
      <Footer />
    </main>
  );
}
