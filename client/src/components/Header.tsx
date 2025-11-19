import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/ChatGPT Image Nov 19, 2025, 01_55_15 PM_1763585721040.png";

export default function Header() {
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity" data-testid="link-home">
            <img src={logoImage} alt="Tripfolio" className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0" />
            <span className="text-base sm:text-xl font-semibold whitespace-nowrap">Tripfolio</span>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {isAuthenticated && (
              <>
                <Link href="/my-trips" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-my-trips">
                  My Trips
                </Link>
                <Link href="/explore" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-explore">
                  Explore
                </Link>
                {user && (
                  <Link href={`/profile/${(user as any).id}`} className="text-xs sm:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-profile">
                    Profile
                  </Link>
                )}
              </>
            )}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-header-logout"
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                Logout
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-header-login"
                className="text-xs sm:text-sm px-2 sm:px-3"
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
