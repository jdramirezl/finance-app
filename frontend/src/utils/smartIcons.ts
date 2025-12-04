import {
    Coffee, ShoppingCart, Home, Car, Utensils, Film, Gamepad2,
    Plane, Heart, GraduationCap, Briefcase, Wifi,
    Zap, Droplet, Phone, Tv, Music, Book, Gift, Pill,
    ShoppingBag, Shirt, Scissors, Dumbbell, DollarSign, TrendingUp,
    Wallet, CreditCard, Building, Coins
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface IconMapping {
    keywords: string[];
    icon: LucideIcon;
    color: string;
}

const iconMappings: IconMapping[] = [
    // Food & Dining
    { keywords: ['coffee', 'starbucks', 'cafe', 'espresso'], icon: Coffee, color: 'text-amber-600' },
    { keywords: ['restaurant', 'food', 'dinner', 'lunch', 'breakfast', 'eat'], icon: Utensils, color: 'text-orange-600' },
    { keywords: ['grocery', 'supermarket', 'walmart', 'target', 'costco'], icon: ShoppingCart, color: 'text-green-600' },

    // Transportation
    { keywords: ['uber', 'lyft', 'taxi', 'ride', 'gas', 'fuel', 'parking'], icon: Car, color: 'text-blue-600' },
    { keywords: ['flight', 'airline', 'plane', 'airport', 'travel'], icon: Plane, color: 'text-sky-600' },

    // Housing
    { keywords: ['rent', 'mortgage', 'lease', 'apartment'], icon: Home, color: 'text-indigo-600' },
    { keywords: ['electric', 'electricity', 'power'], icon: Zap, color: 'text-yellow-600' },
    { keywords: ['water', 'utility'], icon: Droplet, color: 'text-cyan-600' },
    { keywords: ['internet', 'wifi', 'broadband'], icon: Wifi, color: 'text-purple-600' },
    { keywords: ['phone', 'mobile', 'cellular', 'verizon', 'att', 't-mobile'], icon: Phone, color: 'text-green-600' },

    // Entertainment
    { keywords: ['netflix', 'hulu', 'disney', 'streaming', 'tv', 'cable'], icon: Tv, color: 'text-red-600' },
    { keywords: ['movie', 'cinema', 'theater', 'film'], icon: Film, color: 'text-purple-600' },
    { keywords: ['game', 'gaming', 'xbox', 'playstation', 'steam'], icon: Gamepad2, color: 'text-indigo-600' },
    { keywords: ['spotify', 'music', 'apple music', 'concert'], icon: Music, color: 'text-green-600' },

    // Shopping
    { keywords: ['amazon', 'shopping', 'online', 'purchase'], icon: ShoppingBag, color: 'text-orange-600' },
    { keywords: ['clothing', 'clothes', 'fashion', 'apparel'], icon: Shirt, color: 'text-pink-600' },

    // Health & Fitness
    { keywords: ['gym', 'fitness', 'workout', 'exercise'], icon: Dumbbell, color: 'text-red-600' },
    { keywords: ['doctor', 'medical', 'health', 'hospital', 'pharmacy', 'medicine'], icon: Pill, color: 'text-blue-600' },
    { keywords: ['haircut', 'salon', 'barber'], icon: Scissors, color: 'text-pink-600' },

    // Personal & Gifts
    { keywords: ['gift', 'present', 'birthday'], icon: Gift, color: 'text-purple-600' },
    { keywords: ['donation', 'charity', 'give'], icon: Heart, color: 'text-red-600' },

    // Education & Work
    { keywords: ['school', 'education', 'tuition', 'course', 'class'], icon: GraduationCap, color: 'text-blue-600' },
    { keywords: ['salary', 'paycheck', 'income', 'wage'], icon: Briefcase, color: 'text-green-600' },
    { keywords: ['book', 'reading', 'library'], icon: Book, color: 'text-amber-600' },

    // Finance
    { keywords: ['investment', 'stock', 'crypto', 'trading'], icon: TrendingUp, color: 'text-emerald-600' },
    { keywords: ['bank', 'atm', 'withdrawal', 'deposit'], icon: Building, color: 'text-slate-600' },
    { keywords: ['credit', 'card', 'payment'], icon: CreditCard, color: 'text-blue-600' },
    { keywords: ['cash', 'money'], icon: Coins, color: 'text-yellow-600' },
];

export const getSmartIcon = (notes?: string): { icon: LucideIcon; color: string } | null => {
    if (!notes) return null;

    const lowerNotes = notes.toLowerCase();

    for (const mapping of iconMappings) {
        if (mapping.keywords.some(keyword => lowerNotes.includes(keyword))) {
            return { icon: mapping.icon, color: mapping.color };
        }
    }

    return null;
};

// Default fallback icon
export const getDefaultIcon = (isIncome: boolean): { icon: LucideIcon; color: string } => {
    return isIncome
        ? { icon: Wallet, color: 'text-green-600' }
        : { icon: DollarSign, color: 'text-red-600' };
};
