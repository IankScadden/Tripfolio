import { ExternalLink } from "lucide-react";

interface LinkifyTextProps {
  text: string;
  className?: string;
}

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

export function LinkifyText({ text, className = "" }: LinkifyTextProps) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (URL_REGEX.test(part)) {
          URL_REGEX.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-url-${index}`}
            >
              {part.length > 50 ? `${part.substring(0, 50)}...` : part}
              <ExternalLink className="h-3 w-3 inline-flex shrink-0" />
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

export function hasLinks(text: string): boolean {
  if (!text) return false;
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}
