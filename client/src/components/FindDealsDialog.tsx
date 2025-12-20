import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { AFFILIATE_LINKS, CategoryLinks } from "@/constants/affiliateLinks";

interface FindDealsDialogProps {
  categoryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FindDealsDialog({ categoryId, open, onOpenChange }: FindDealsDialogProps) {
  const category: CategoryLinks | undefined = categoryId ? AFFILIATE_LINKS[categoryId] : undefined;

  if (!category) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                <div className="text-xs text-muted-foreground">{link.description}</div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3" />
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
