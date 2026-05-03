import { logger } from '../utils/logger';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC_KEY;
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface PaystackPlan {
  name: string;
  amount: number; // in kobo (NGN * 100)
  interval: string;
  description?: string;
}

export interface PaystackSubscription {
  customer: string;
  plan: string;
  authorization?: string;
  start_date?: string;
}

export interface PaystackTransaction {
  amount: number;
  email: string;
  reference: string;
  callback_url?: string;
  metadata?: any;
  plan?: string;
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number; // in NGN
  interval: 'monthly' | 'yearly';
  features: string[];
  downloadLimit: number;
  quality: string;
  apiKeys: number;
  paystackPlanCode?: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out the API',
    price: 0,
    interval: 'monthly',
    features: ['5 downloads/day', '480p quality', '1 API key', 'Community support'],
    downloadLimit: 5,
    quality: '480p',
    apiKeys: 1,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For individual developers',
    price: 5000, // ₦5,000
    interval: 'monthly',
    features: ['50 downloads/day', '720p quality', '3 API keys', 'Email support', 'Analytics dashboard'],
    downloadLimit: 50,
    quality: '720p',
    apiKeys: 3,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price: 15000, // ₦15,000
    interval: 'monthly',
    features: ['200 downloads/day', '1080p quality', '10 API keys', 'Priority support', 'Advanced analytics', 'Webhook notifications'],
    downloadLimit: 200,
    quality: '1080p',
    apiKeys: 10,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large scale operations',
    price: 50000, // ₦50,000
    interval: 'monthly',
    features: ['Unlimited downloads', '4K quality', 'Unlimited API keys', '24/7 dedicated support', 'Custom integrations', 'SLA guarantee', 'White-label option'],
    downloadLimit: -1, // unlimited
    quality: '4K',
    apiKeys: -1, // unlimited
  },
];

export class PaystackService {
  private secretKey: string;
  private publicKey: string;
  private baseUrl = 'https://api.paystack.co';

  constructor() {
    this.secretKey = PAYSTACK_SECRET || '';
    this.publicKey = PAYSTACK_PUBLIC || '';
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      logger.error('Paystack API error:', data);
      throw new Error(data.message || `Paystack API error: ${response.status}`);
    }

    return data;
  }

  async initializeTransaction(data: PaystackTransaction) {
    return this.request('/transaction/initialize', 'POST', {
      ...data,
      callback_url: data.callback_url || `${BASE_URL}/api/v1/payments/verify`,
    });
  }

  async verifyTransaction(reference: string) {
    return this.request(`/transaction/verify/${reference}`);
  }

  async createPlan(plan: PaystackPlan) {
    return this.request('/plan', 'POST', plan);
  }

  async createSubscription(subscription: PaystackSubscription) {
    return this.request('/subscription', 'POST', subscription);
  }

  async disableSubscription(code: string, token: string) {
    return this.request('/subscription/disable', 'POST', { code, token });
  }

  async fetchSubscription(code: string) {
    return this.request(`/subscription/${code}`);
  }

  async createCustomer(email: string, firstName?: string, lastName?: string) {
    return this.request('/customer', 'POST', {
      email,
      first_name: firstName,
      last_name: lastName,
    });
  }

  async fetchCustomer(email: string) {
    return this.request(`/customer/${email}`);
  }

  isConfigured(): boolean {
    return !!this.secretKey && !!this.publicKey;
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}

export const paystackService = new PaystackService();
