"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

type TestimonialType = {
  id: number;
  name: string;
  role: string;
  content: string;
  avatar: string;
};

const testimonials: TestimonialType[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Marketing Director",
    content: "This product has completely transformed our marketing workflow. The intuitive interface and powerful features have increased our team's productivity by 40%.",
    avatar: "/avatar-1.jpg",
  },
  {
    id: 2,
    name: "David Chen",
    role: "CTO",
    content: "After evaluating numerous solutions, we chose this platform for its exceptional performance and reliability. The technical support has been outstanding.",
    avatar: "/avatar-2.jpg",
  },
  {
    id: 3,
    name: "Amanda Rodriguez",
    role: "Small Business Owner",
    content: "As a small business owner, I needed an affordable solution that didn't compromise on quality. This exceeded all my expectations and helped my business grow.",
    avatar: "/avatar-3.jpg",
  },
  {
    id: 4,
    name: "Michael Taylor",
    role: "Project Manager",
    content: "The collaboration features have made coordinating my team effortless. We've reduced meeting time by 60% while improving our project delivery timelines.",
    avatar: "/avatar-4.jpg",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="w-full bg-black py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 inline-block mb-4">What Our Clients Say</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 mx-auto"></div>
          <p className="text-gray-300 mt-4 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our customers have to say about our products.
          </p>
        </div>
        
        <div className="flex justify-center">
          <CardStack items={testimonials} />
        </div>
      </div>
    </section>
  );
}

interface CardStackProps {
  items: TestimonialType[];
  offset?: number;
  scaleFactor?: number;
}

function CardStack({ items, offset = 10, scaleFactor = 0.06 }: CardStackProps) {
  const [cards, setCards] = useState<TestimonialType[]>(items);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCards((prevCards) => {
        const newArray = [...prevCards];
        newArray.unshift(newArray.pop()!);
        return newArray;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="relative h-[400px] w-[350px] md:w-[500px]">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          className="absolute dark:bg-[#1c1c1c] bg-white h-[350px] w-[350px] md:h-[300px] md:w-[500px] rounded-2xl p-6 shadow-xl border border-neutral-200 dark:border-white/[0.1] shadow-black/[0.1] dark:shadow-white/[0.05] flex flex-col justify-between"
          style={{
            transformOrigin: "top center",
          }}
          animate={{
            top: index * -offset,
            scale: 1 - index * scaleFactor,
            zIndex: cards.length - index,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            mass: 1,
          }}
        >
          <div>
            <p className="text-neutral-700 dark:text-neutral-200 text-sm md:text-base leading-relaxed">
              "{card.content}"
            </p>
          </div>
          <div className="flex items-center gap-4 mt-6">
            <div className="h-12 w-12 rounded-full overflow-hidden">
              <img 
                src={card.avatar} 
                alt={card.name} 
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-neutral-900 dark:text-white font-medium">
                {card.name}
              </p>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                {card.role}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
} 