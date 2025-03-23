export default function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "El Shop",
          "url": "https://elshoptech.vercel.app",
          // ...data lainnya
        })
      }}
    />
  )
} 