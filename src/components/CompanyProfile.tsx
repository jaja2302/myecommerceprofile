"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";

export function CompanyProfile() {
  const items = [
    {
      title: "Frontend Development",
      description: "Expert in React, Next.js, React Native, and Flutter. Building responsive and user-friendly interfaces for web and mobile applications.",
    },
    {
      title: "Backend Development",
      description: "Proficient in Node.js, Python, PHP, and Dart. Creating robust server-side solutions and APIs for seamless functionality.",
    },
    {
      title: "Database Management",
      description: "Skilled in MySQL, MongoDB, PostgreSQL, and SQLite. Designing efficient database structures for optimal performance.",
    },
    {
      title: "UI/UX Design",
      description: "Creating beautiful, intuitive user interfaces and experiences that engage users and enhance usability across platforms.",
    },
    {
      title: "Business Automation",
      description: "Streamlining business processes through custom software solutions that increase efficiency and productivity.",
    },
    {
      title: "24/7 Support",
      description: "Providing continuous technical support to ensure your applications run smoothly and issues are resolved promptly.",
    },
  ];
  
  return (
    <BackgroundBeamsWithCollision className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto p-4 z-10 relative">
        <p className="text-neutral-300 max-w-2xl mx-auto my-8 text-lg text-center">
          I'm a passionate full-stack developer with expertise in web and mobile development. 
          Specializing in creating modern, efficient, and user-friendly applications.
        </p>
        
        <HoverEffect items={items} />
      </div>
    </BackgroundBeamsWithCollision>
  );
}

export const HoverEffect = ({
  items,
  className,
}: {
  items: {
    title: string;
    description: string;
  }[];
  className?: string;
}) => {
  let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={`card-${idx}-${item.title}`}
          className="relative group block p-2 h-full w-full cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-neutral-200 dark:bg-slate-800/[0.8] block rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <Card>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </Card>
        </div>
      ))}
    </div>
  );
};

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl h-full w-full p-4 overflow-hidden bg-black border border-transparent dark:border-white/[0.2] group-hover:border-slate-700 relative z-20",
        className
      )}
    >
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export const CardTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <h4 className={cn("text-zinc-100 font-bold tracking-wide mt-4", className)}>
      {children}
    </h4>
  );
};

export const CardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <p
      className={cn(
        "mt-8 text-zinc-400 tracking-wide leading-relaxed text-sm",
        className
      )}
    >
      {children}
    </p>
  );
}; 