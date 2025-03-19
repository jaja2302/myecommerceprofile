import { HeroSection } from "@/components/HeroSection";
import { CompanyProfile } from "@/components/CompanyProfile";
import { ProductList } from "@/components/ProductList";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AnimatedTestimonials } from "@/components/AnimatedTestimonials";

const testimonials = [
  {
    quote: "Pelayanan yang sangat baik dan profesional. Selalu siap membantu kapan saja.",
    name: "Elsa",
    designation: "Mahasiswi",
    src: "/img/elelel.jpg"
  },
  {
    quote: "Dengan Program yang sangat baik, saya bisa meningkatkan profit sebanyak 90% dalam waktu 1 bulan.",
    name: "Adi Dwi",
    designation: "Trader",
    src: "/img/persondefaul.webp"
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black overflow-x-hidden">
      <Navbar />
      <HeroSection />
      
      <section id="about">
        <CompanyProfile />
      </section>
      
      <section id="products" className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ProductList />
        </div>
      </section>
      
      <section id="testimonials" className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedTestimonials testimonials={testimonials} />
        </div>
      </section>
      
      <section id="contact" className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ContactSection />
        </div>
      </section>
      
      <Footer />
    </main>
  );
}
