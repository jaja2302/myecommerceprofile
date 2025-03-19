"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
  const [currentText, setCurrentText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [typingSpeed, setTypingSpeed] = React.useState(150);

  React.useEffect(() => {
    const currentWord = words[currentWordIndex];
    const currentWordText = currentWord.text;
    
    const timeout = setTimeout(() => {
      if (isDeleting) {
        setCurrentText((current) => current.substring(0, current.length - 1));
        
        if (currentText.length === 0) {
          setIsDeleting(false);
          setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
          setTypingSpeed(150);
        }
      } else {
        setCurrentText(currentWordText.substring(0, currentText.length + 1));
        
        if (currentText.length === currentWordText.length) {
          setTypingSpeed(2000);
          
          setTimeout(() => {
            setIsDeleting(true);
            setTypingSpeed(100);
          }, 2000);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, currentWordIndex, isDeleting, typingSpeed, words]);

  return (
    <div className={cn("flex space-x-1 my-6", className)}>
      {currentText.split("").map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 10, scale: 0 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 125,
            damping: 10,
            mass: 0.5,
            delay: index * 0.05,
          }}
          className={cn("text-4xl font-bold", words[currentWordIndex].className)}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0, y: 10, scale: 0 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 125,
          damping: 10,
          mass: 0.5,
          delay: currentText.length * 0.05,
        }}
        className={cn("text-4xl font-bold", cursorClassName)}
      >
        |
      </motion.span>
    </div>
  );
}; 