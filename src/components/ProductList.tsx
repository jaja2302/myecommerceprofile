"use client";

import React from "react";
import { useTranslation } from 'react-i18next';
import Image from "next/image";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";

const apps = [
  {
    title: "Trading Bot",
    description: "Automated trading bot for Okx with 95% accuracy",
    image: "/img/image.png",
    price: "$500",
    link: "#",
    tags: ["python", "CCXT", "SQLite"]
  },
  {
    title: "Media Content FB BOT",
    description: "Automated media content creation for Facebook using whatsapp",
    image: "/img/fb.webp",
    price: "$100",
    link: "#",
    tags: ["nodejs", "Whatsapp API", "SQLite"]
  },
  {
    title: "Automatic Airdrop Bot",
    description: "Automatic airdrop bot for telegram groups",
    image: "/img/airdrop.webp",
    price: "$100",
    link: "#",
    tags: ["python", "Telegram API", "SQLite"],
    isPriority: true
  }
];

export function ProductList() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen w-full bg-black py-20" id="products">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500 inline-block mb-4">
            {t('products.title', 'My Applications')}
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg">
            {t('products.description', 'Browse through my collection of carefully crafted applications. Each app is built with modern technologies and designed for the best user experience.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {apps.map((app) => (
            <CardContainer key={app.title} className="inter-var">
              <CardBody className="bg-black/40 relative group/card dark:hover:shadow-2xl dark:hover:shadow-purple-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[25rem] h-auto rounded-xl p-6 border">
                <CardItem
                  translateZ="100"
                  className="w-full mt-4"
                >
                  <Image
                    src={app.image}
                    alt={app.title}
                    height={200}
                    width={400}
                    className="h-52 w-full object-cover rounded-xl group-hover/card:shadow-xl"
                    priority={app.isPriority}
                  />
                </CardItem>
                
                <CardItem
                  translateZ="50"
                  className="text-2xl font-bold text-white mt-4"
                >
                  {app.title}
                </CardItem>
                <CardItem
                  as="p"
                  translateZ="60"
                  className="text-neutral-300 text-sm mt-2 mb-4"
                >
                  {app.description}
                </CardItem>

                <div className="flex flex-wrap gap-2 mb-4">
                  {app.tags.map((tag) => (
                    <CardItem
                      key={tag}
                      translateZ="30"
                      className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </CardItem>
                  ))}
                </div>

                <CardItem
                  translateZ="30"
                  className="w-full mt-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-400">{app.price}</span>
                    <button className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium">
                      {t('products.viewDetails', 'View Details')}
                    </button>
                  </div>
                </CardItem>
              </CardBody>
            </CardContainer>
          ))}
        </div>
      </div>
    </div>
  );
} 