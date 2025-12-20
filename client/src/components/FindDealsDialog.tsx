import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink, Loader2 } from "lucide-react";

interface CategoryData {
  title: string;
  description: string;
  links: Array<{
    name: string;
    url: string;
    description: string | null;
  }>;
}

interface AffiliateLinksResponse {
  [category: string]: CategoryData;
}

interface FindDealsDialogProps {
  categoryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FindDealsDialog({ categoryId, open, onOpenChange }: FindDealsDialogProps) {
  const { data: affiliateLinks, isLoading } = useQuery<AffiliateLinksResponse>({
    queryKey: ["/api/affiliate-links"],
    enabled: open,
  });

  const category: CategoryData | undefined = categoryId && affiliateLinks ? affiliateLinks[categoryId] : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !category ? (
          <>
            <DialogHeader>
              <DialogTitle>No Links Available</DialogTitle>
              <DialogDescription>
                No booking links are configured for this category yet.
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{category.title}</DialogTitle>
              <DialogDescription>{category.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 mt-4">
              {category.links.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate transition-colors"
                  data-testid={`link-find-${categoryId}-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{link.name}</div>
                    {link.description && (
                      <div className="text-xs text-muted-foreground">{link.description}</div>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3" />
                </a>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
