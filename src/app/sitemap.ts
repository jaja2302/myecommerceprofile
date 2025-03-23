import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://elshoptech.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'weekly'
    }
  ]
} 