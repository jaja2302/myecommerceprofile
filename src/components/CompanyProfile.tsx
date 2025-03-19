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
    <div className="min-h-screen w-full bg-black overflow-hidden">
      <BackgroundBeamsWithCollision className="relative">
        <div className="flex-1 flex flex-col justify-center min-h-screen pt-20 pb-12 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <p className="text-neutral-300 max-w-2xl mx-auto mb-12 text-base sm:text-lg text-center leading-relaxed">
              I&apos;m a passionate full-stack developer with expertise in web and mobile development. 
              Specializing in creating modern, efficient, and user-friendly applications.
            </p>
            
            <HoverEffect items={items} />
          </div>
        </div>
      </BackgroundBeamsWithCollision>
    </div>
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-8",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={`card-${idx}-${item.title}`}
          className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-neutral-200 dark:bg-slate-800/[0.8] block rounded-2xl"
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
        "rounded-xl h-full w-full p-4 overflow-hidden bg-black border border-transparent dark:border-white/[0.2] group-hover:border-slate-700 relative z-20",
        className
      )}
    >
      <div className="relative z-50">
        <div className="space-y-3">{children}</div>
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
    <h4 className={cn("text-zinc-100 font-bold tracking-wide text-base sm:text-lg leading-tight", className)}>
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
        "text-zinc-400 tracking-wide leading-relaxed text-sm mt-2",
        className
      )}
    >
      {children}
    </p>
  );
}; 