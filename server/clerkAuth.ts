import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export const setupClerkAuth = () => {
  return clerkMiddleware();
};

export const requireClerkAuth = requireAuth({
  signInUrl: '/',
});

export async function ensureUserInDb(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return next();
    }

    const clerkId = auth.userId;
    let user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      const clerkUser = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(res => res.json());

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
    next(error);
  }
}
