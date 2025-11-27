import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);
  }

  static async handleSubscriptionCreated(subscriptionId: string, customerId: string, status: string) {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    if (user) {
      await db.update(users).set({
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: status,
        subscriptionPlan: status === 'active' ? 'premium' : 'free',
        aiUsesRemaining: status === 'active' ? 999999 : user.aiUsesRemaining,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
    }
  }

  static async handleSubscriptionUpdated(subscriptionId: string, status: string, currentPeriodEnd?: Date) {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    if (user) {
      const isPremium = status === 'active' || status === 'trialing';
      await db.update(users).set({
        subscriptionStatus: status,
        subscriptionPlan: isPremium ? 'premium' : 'free',
        subscriptionEndsAt: currentPeriodEnd,
        aiUsesRemaining: isPremium ? 999999 : 0,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
    }
  }

  static async handleSubscriptionDeleted(subscriptionId: string) {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    if (user) {
      await db.update(users).set({
        subscriptionStatus: 'canceled',
        subscriptionPlan: 'free',
        stripeSubscriptionId: null,
        aiUsesRemaining: 0,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
    }
  }
}
