import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export const setupClerkAuth = () => {
  return clerkMiddleware();
};

export function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  
  if (!auth.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

export async function ensureUserInDb(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const clerkId = auth.userId;
    let user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      if (!process.env.CLERK_SECRET_KEY) {
        console.error("CLERK_SECRET_KEY is not set");
        return res.status(500).json({ error: "Server configuration error" });
      }

      const response = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        console.error(`Clerk API error: ${response.status} ${response.statusText}`);
        return res.status(500).json({ error: "Failed to fetch user data" });
      }

      const clerkUser = await response.json();

      user = await storage.createUserFromClerk({
        clerkId,
        email: clerkUser.email_addresses?.[0]?.email_address || '',
        firstName: clerkUser.first_name || '',
        lastName: clerkUser.last_name || '',
        profileImageUrl: clerkUser.image_url || '',
      });
    }

    (req as any).userId = user.id;
    (req as any).clerkId = clerkId;
    
    next();
  } catch (error) {
    console.error("Error ensuring user in DB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
