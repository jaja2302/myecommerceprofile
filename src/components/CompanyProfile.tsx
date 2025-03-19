"use client";

import React from "react";
import { motion } from "framer-motion";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { BackgroundBeams } from "@/components/ui/background-beams";

export function CompanyProfile() {
  return (
    <section id="about" className="relative w-full bg-black py-20 overflow-hidden">
      <BackgroundBeams className="opacity-20" />
      
      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 inline-block mb-4">About Our Company</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mx-auto"></div>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="lg:w-1/2">
            <CardContainer>
              <CardBody className="relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[25rem] h-auto rounded-xl p-6 border">
                <CardItem translateZ="100" className="w-full mt-4">
                  <img
                    src="/company-image.jpg" 
                    alt="Company Office"
                    className="h-64 w-full object-cover rounded-xl group-hover/card:shadow-xl"
                  />
                </CardItem>
                <CardItem
                  translateZ="50"
                  className="text-xl font-bold text-white mt-4"
                >
                  Innovation is our DNA
                </CardItem>
                <CardItem
                  as="p"
                  translateZ="60"
                  className="text-neutral-300 text-sm mt-2"
                >
                  Founded in 2023, we've been at the forefront of digital innovation
                </CardItem>
              </CardBody>
            </CardContainer>
          </div>
          
          <div className="lg:w-1/2 text-white space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 p-6 rounded-lg backdrop-blur-sm border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-3 text-purple-300">Our Mission</h3>
              <p className="text-gray-300">
                We strive to create cutting-edge digital solutions that transform how people interact with technology. Our products combine stunning design with powerful functionality.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white/5 p-6 rounded-lg backdrop-blur-sm border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-3 text-blue-300">Our Vision</h3>
              <p className="text-gray-300">
                To lead the digital revolution by creating products that are not only functional but also beautiful, intuitive, and accessible to everyone.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white/5 p-6 rounded-lg backdrop-blur-sm border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-3 text-pink-300">Our Values</h3>
              <p className="text-gray-300">
                Innovation, Quality, Customer-focus, and Integrity guide everything we do. We believe in pushing boundaries while maintaining the highest standards.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
} 