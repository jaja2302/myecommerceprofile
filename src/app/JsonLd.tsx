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
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://elshoptech.vercel.app/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })
      }}
    />
  )
} 