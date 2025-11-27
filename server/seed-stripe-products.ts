import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking for existing products...');
  
  const existingProducts = await stripe.products.search({ 
    query: "name:'Tripfolio Premium'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Tripfolio Premium product already exists:', existingProducts.data[0].id);
    
    const prices = await stripe.prices.list({ 
      product: existingProducts.data[0].id,
      active: true 
    });
    
    if (prices.data.length > 0) {
      console.log('Price already exists:', prices.data[0].id);
      return { productId: existingProducts.data[0].id, priceId: prices.data[0].id };
    }
  }

  console.log('Creating Tripfolio Premium product...');
  const product = await stripe.products.create({
    name: 'Tripfolio Premium',
    description: 'Unlimited AI Travel Assistant usage and unlimited trips',
    metadata: {
      plan: 'premium',
      features: 'unlimited_ai,unlimited_trips',
    },
  });
  console.log('Created product:', product.id);

  console.log('Creating $2/month price...');
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 200, // $2.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      plan: 'premium_monthly',
    },
  });
  console.log('Created price:', monthlyPrice.id);

  console.log('\n✅ Stripe products created successfully!');
  console.log('Product ID:', product.id);
  console.log('Price ID:', monthlyPrice.id);
  
  return { productId: product.id, priceId: monthlyPrice.id };
}

createProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error creating products:', error);
    process.exit(1);
  });
