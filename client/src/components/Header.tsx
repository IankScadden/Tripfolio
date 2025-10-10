import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Compass } from "lucide-react";

export default function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <span className="text-base sm:text-xl font-semibold whitespace-nowrap">TripBudget</span>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {isAuthenticated && (
              <>
                <Link href="/my-trips" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-my-trips">
                  My Trips
                </Link>
                <Link href="/explore" className="hidden sm:inline text-sm font-medium hover:text-primary transition-colors" data-testid="link-explore">
                  Explore
                </Link>
              </>
            )}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-header-logout"
                className="text-xs sm:text-sm"
              >
                Logout
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-header-login"
                className="text-xs sm:text-sm"
              >
                Sign In
              </Button>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
