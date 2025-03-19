"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";

const apps = [
  {
    title: "E-commerce App",
    description: "Complete online store solution with admin dashboard",
    image: "/ecommerce-app.png",
    price: "$99",
    link: "#",
    tags: ["React Native", "Node.js", "MongoDB"]
  },
  {
    title: "Task Manager Pro",
    description: "Advanced task management for teams",
    image: "/task-manager.png",
    price: "$49",
    link: "#",
    tags: ["React", "Firebase", "Material UI"]
  },
  {
    title: "Social Media Dashboard",
    description: "Analytics and management platform",
    image: "/social-dashboard.png",
    price: "$79",
    link: "#",
    tags: ["Next.js", "TypeScript", "Tailwind"]
  }
];

export function ProductList() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen w-full bg-black py-20" id="products">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500 inline-block mb-4">
            My Applications
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg">
            Browse through my collection of carefully crafted applications. 
            Each app is built with modern technologies and designed for the best user experience.
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
                  <img
                    src={app.image}
                    alt={app.title}
                    height="200"
                    width="400"
                    className="h-52 w-full object-cover rounded-xl group-hover/card:shadow-xl"
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
                      View Details
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