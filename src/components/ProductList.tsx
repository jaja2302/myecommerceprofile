"use client";

import React from "react";
import { motion } from "framer-motion";
import { BackgroundGradient } from "@/components/ui/background-gradient";

const products = [
  {
    id: 1,
    name: "Premium App Suite",
    description: "Complete solution for businesses with advanced features",
    price: "$99.99",
    features: ["Unlimited Users", "Priority Support", "Custom Branding", "Advanced Analytics"],
    image: "/product1.jpg",
    popular: true,
  },
  {
    id: 2,
    name: "Essential Package",
    description: "Perfect for small teams and startups",
    price: "$49.99",
    features: ["Up to 10 Users", "Email Support", "Basic Analytics", "Core Features"],
    image: "/product2.jpg",
    popular: false,
  },
  {
    id: 3,
    name: "Basic Solution",
    description: "Get started with our entry-level package",
    price: "$29.99",
    features: ["Up to 3 Users", "Community Support", "Standard Features", "Basic Reporting"],
    image: "/product3.jpg",
    popular: false,
  },
];

export function ProductList() {
  return (
    <section id="products" className="w-full bg-black py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 inline-block mb-4">Our Products</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mx-auto"></div>
          <p className="text-gray-300 mt-4 max-w-2xl mx-auto">
            Discover our cutting-edge solutions designed to transform your digital experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: typeof products[number] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="relative"
    >
      <BackgroundGradient className="rounded-xl">
        <div className="relative p-6 h-full bg-black bg-opacity-80 rounded-xl overflow-hidden">
          {product.popular && (
            <div className="absolute top-0 right-0">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                POPULAR
              </div>
            </div>
          )}
          
          <div className="h-40 mb-4 overflow-hidden rounded-lg">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform hover:scale-110 duration-700"
            />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
          <p className="text-gray-300 text-sm mb-4">{product.description}</p>
          
          <div className="mb-6">
            <ul className="space-y-2">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-300 text-sm">
                  <svg className="w-4 h-4 mr-2 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-between items-center mt-auto">
            <span className="text-white font-bold text-xl">{product.price}</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg"
            >
              Get Now
            </motion.button>
          </div>
        </div>
      </BackgroundGradient>
    </motion.div>
  );
} 