import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";

const CompassLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e88e5" strokeWidth="8"/>
    <path d="M50 15 L55 40 L50 35 L45 40 Z M85 50 L60 55 L65 50 L60 45 Z M50 85 L45 60 L50 65 L55 60 Z M15 50 L40 45 L35 50 L40 55 Z" fill="#1e88e5"/>
    <path d="M50 20 L57 45 L50 38 L43 45 Z M80 50 L55 57 L62 50 L55 43 Z M50 80 L43 55 L50 62 L57 55 Z M20 50 L45 43 L38 50 L45 57 Z" fill="#1e88e5" opacity="0.6"/>
  </svg>
);

export default function Header() {
  const { isSignedIn, user } = useUser();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <CompassLogo className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
            <span className="text-base sm:text-xl font-semibold whitespace-nowrap">Tripfolio</span>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {isSignedIn && user && (
              <>
                <Link href="/my-trips" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-my-trips">
                  My Trips
                </Link>
                <Link href="/explore" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-explore">
                  Explore
                </Link>
              </>
            )}
            {isSignedIn ? (
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            ) : (
              <SignInButton mode="modal">
                <Button
                  variant="default"
                  size="sm"
                  data-testid="button-header-login"
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  Sign In
                </Button>
              </SignInButton>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
