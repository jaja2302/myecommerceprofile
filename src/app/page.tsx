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
        <AnimatedTestimonials testimonials={testimonials} />
      </section>
      
      <section id="contact" className="py-20">
        <ContactSection />
      </section>
      
      <Footer />
    </main>
  );
}
