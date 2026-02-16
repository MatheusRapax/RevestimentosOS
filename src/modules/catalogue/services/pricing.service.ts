import { Injectable, Logger } from '@nestjs/common';
import { Product, Brand, Category, Clinic } from '@prisma/client';

export interface PricingFactors {
    productMarkup: number | null;
    brandMarkup: number | null;
    categoryMarkup: number | null;
    globalMarkup: number;
    manualPrice: boolean;
}

export interface CalculatedPrice {
    priceCents: number;
    appliedMarkup: number;
    source: 'MANUAL' | 'PRODUCT' | 'BRAND' | 'CATEGORY' | 'GLOBAL';
}

@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);

    calculatePrice(
        costCents: number,
        factors: PricingFactors,
    ): CalculatedPrice {
        // 1. Manual Override
        if (factors.manualPrice) {
            return {
                priceCents: 0, // Should be preserved from input if manual, but here we calculate based on markup. 
                // If manual, the service calling this should probably not overwrite the price, or pass the current price as 'cost'?
                // Actually, if manualPrice is true, this calculator might not be called, OR it returns the cost + 0 markup?
                // Let's assume if manualPrice is true, we return a special indicator or just 0 markup.
                // But the requirement says: "If manualPrice is true, ignores markup engine."
                // So the caller should check manualPrice before calling this, OR this returns specific metadata.
                appliedMarkup: 0,
                source: 'MANUAL',
            };
        }

        // 2. Hierarchy Logic
        let markup = factors.productMarkup;
        let source: 'PRODUCT' | 'BRAND' | 'CATEGORY' | 'GLOBAL' = 'PRODUCT';

        if (markup === null || markup === undefined) {
            markup = factors.brandMarkup;
            source = 'BRAND';
        }

        if (markup === null || markup === undefined) {
            markup = factors.categoryMarkup;
            source = 'CATEGORY';
        }

        if (markup === null || markup === undefined) {
            markup = factors.globalMarkup;
            source = 'GLOBAL';
        }

        // 3. Calculation
        // Price = Cost * (1 + Markup/100)
        // Cents integer math
        const multiplier = 1 + (markup / 100);
        const priceCents = Math.round(costCents * multiplier);

        return {
            priceCents,
            appliedMarkup: markup,
            source,
        };
    }
}
