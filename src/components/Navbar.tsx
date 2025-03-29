"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavbarProps {
  title?: string;
  showBackButton?: boolean;
}

export function Navbar({ title, showBackButton }: NavbarProps) {
  const pathname = usePathname();

  return (
    <div className="border-b bg-white">
      <div className="flex h-16 items-center px-4">
        {showBackButton && (
          <Link href="/" className="flex items-center text-sm font-medium mr-2">
            <span className="mr-1">←</span>
            Back
          </Link>
        )}
        
        <div className="ml-auto flex items-center space-x-4">
          <nav className="flex items-center space-x-1">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/" ? "text-black" : "text-gray-500"}`}
            >
              Home
            </Link>
            <span className="text-gray-500">
              /
            </span>
            <Link
              href="/mini-games"
              className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/mini-games" || pathname?.startsWith("/mini-games/") ? "text-black" : "text-gray-500"}`}
            >
              Mini Games
            </Link>
            {title && (
              <>
                <span className="text-gray-500">
                  /
                </span>
                <span className="text-sm font-medium text-black">
                  {title}
                </span>
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
} 