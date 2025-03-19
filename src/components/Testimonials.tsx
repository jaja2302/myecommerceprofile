"use client";

import React from "react";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { useTranslation } from 'react-i18next';

const reviews = [
  {
    name: "Alex Chen",
    role: "Mobile App User",
    image: "/user1.jpg",
    review: "The e-commerce app is incredibly intuitive. It has streamlined our entire online sales process.",
    rating: 5,
    app: "E-commerce App"
  },
  {
    name: "Sarah Johnson",
    role: "Team Leader",
    image: "/user2.jpg",
    review: "Task Manager Pro has transformed how our team collaborates. The interface is beautiful and functional.",
    rating: 5,
    app: "Task Manager Pro"
  },
  {
    name: "Michael Brown",
    role: "Marketing Manager",
    image: "/user3.jpg",
    review: "The social media dashboard saves me hours every week. Best investment for our marketing team.",
    rating: 5,
    app: "Social Media Dashboard"
  }
];

export function Testimonials() {
  const { t } = useTranslation();

  return (
    <div className="relative w-full bg-black py-20 overflow-hidden">
      <BackgroundBeams className="opacity-20" />
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500 inline-block mb-4">
            User Reviews
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            See what users are saying about my applications. Real feedback from real people who use my apps daily.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-center mb-4">
                <img
                  src={review.image}
                  alt={review.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h3 className="text-white font-semibold">{review.name}</h3>
                  <p className="text-gray-400 text-sm">{review.role}</p>
                </div>
              </div>
              <div className="mb-4">
                {[...Array(review.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-500">★</span>
                ))}
              </div>
              <p className="text-gray-300 mb-4">{review.review}</p>
              <div className="flex items-center justify-between">
                <span className="text-purple-400 text-sm">{review.app}</span>
                <span className="text-gray-400 text-sm">Verified User</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 