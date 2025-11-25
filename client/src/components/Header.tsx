import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Plane, Compass, Users, User, Tag } from "lucide-react";

const CompassLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e88e5" strokeWidth="8"/>
    <path d="M50 15 L55 40 L50 35 L45 40 Z M85 50 L60 55 L65 50 L60 45 Z M50 85 L45 60 L50 65 L55 60 Z M15 50 L40 45 L35 50 L40 55 Z" fill="#1e88e5"/>
    <path d="M50 20 L57 45 L50 38 L43 45 Z M80 50 L55 57 L62 50 L55 43 Z M50 80 L43 55 L50 62 L57 55 Z M20 50 L45 43 L38 50 L45 57 Z" fill="#1e88e5" opacity="0.6"/>
  </svg>
);

export default function Header() {
  const { isSignedIn } = useUser();
  const { user: dbUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "My Trips", href: "/my-trips", icon: Plane, requiresAuth: true },
    { label: "Explore", href: "/explore", icon: Compass, requiresAuth: true },
    { label: "Travel Deals", href: "/travel-deals", icon: Tag, requiresAuth: false },
    { label: "Profile", href: dbUser ? `/profile/${dbUser.id}` : "/profile", icon: User, requiresAuth: true },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <CompassLogo className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
            <span className="text-base sm:text-xl font-semibold whitespace-nowrap">Tripfolio</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {isSignedIn && dbUser ? (
              <>
                <Link href="/my-trips" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-my-trips">
                  My Trips
                </Link>
                <Link href="/explore" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-explore">
                  Explore
                </Link>
                <Link href="/travel-deals" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-travel-deals">
                  Travel Deals
                </Link>
                <Link href={`/profile/${dbUser.id}`} className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-profile">
                  Profile
                </Link>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-my-trips">
                    My Trips
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-explore">
                    Explore
                  </button>
                </SignInButton>
                <Link href="/travel-deals" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-travel-deals">
                  Travel Deals
                </Link>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" data-testid="link-profile">
                    Profile
                  </button>
                </SignInButton>
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
                  className="text-sm px-3"
                >
                  Sign In
                </Button>
              </SignInButton>
            )}
            <ThemeToggle />
          </nav>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            {isSignedIn && (
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            )}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8 pt-2">
                    <div className="flex items-center gap-2">
                      <CompassLogo className="w-8 h-8" />
                      <span className="text-lg font-semibold">Tripfolio</span>
                    </div>
                  </div>
                  
                  <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      
                      if (item.requiresAuth && (!isSignedIn || !dbUser)) {
                        return (
                          <SignInButton key={item.label} mode="modal">
                            <button 
                              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left w-full"
                              onClick={closeMobileMenu}
                              data-testid={`mobile-link-${item.label.toLowerCase().replace(' ', '-')}`}
                            >
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">{item.label}</span>
                            </button>
                          </SignInButton>
                        );
                      }
                      
                      return (
                        <Link 
                          key={item.label}
                          href={item.href}
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                          data-testid={`mobile-link-${item.label.toLowerCase().replace(' ', '-')}`}
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                  
                  {!isSignedIn && (
                    <div className="mt-auto pb-4">
                      <SignInButton mode="modal">
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={closeMobileMenu}
                          data-testid="mobile-button-signin"
                        >
                          Sign In
                        </Button>
                      </SignInButton>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
