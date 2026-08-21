import { describe, expect, it } from "vitest";
import { formatUserTier } from "./tier";

describe("formatUserTier", () => {
    const mockFrTiers = (key: string) => {
        const map: Record<string, string> = {
            free: "Gratuit",
            pro: "Pro",
            enterprise: "Entreprise",
        };
        return map[key] || key;
    };

    const mockDeTiers = (key: string) => {
        const map: Record<string, string> = {
            free: "Kostenlos",
            pro: "Pro",
            enterprise: "Enterprise",
        };
        return map[key] || key;
    };

    const mockEnTiers = (key: string) => {
        const map: Record<string, string> = {
            free: "Free",
            pro: "Pro",
            enterprise: "Enterprise",
        };
        return map[key] || key;
    };

    it("translates 'Free' to French 'Gratuit'", () => {
        expect(formatUserTier("Free", mockFrTiers)).toBe("Gratuit");
        expect(formatUserTier("free", mockFrTiers)).toBe("Gratuit");
    });

    it("translates 'Free' to German 'Kostenlos'", () => {
        expect(formatUserTier("Free", mockDeTiers)).toBe("Kostenlos");
        expect(formatUserTier("free", mockDeTiers)).toBe("Kostenlos");
    });

    it("translates 'Free' to English 'Free'", () => {
        expect(formatUserTier("Free", mockEnTiers)).toBe("Free");
    });

    it("handles null and undefined gracefully by defaulting to free tier translation", () => {
        expect(formatUserTier(null, mockFrTiers)).toBe("Gratuit");
        expect(formatUserTier(undefined, mockFrTiers)).toBe("Gratuit");
        expect(formatUserTier("", mockFrTiers)).toBe("Gratuit");
    });

    it("translates Pro and Enterprise tiers", () => {
        expect(formatUserTier("Pro", mockFrTiers)).toBe("Pro");
        expect(formatUserTier("Enterprise", mockFrTiers)).toBe("Entreprise");
        expect(formatUserTier("enterprise", mockFrTiers)).toBe("Entreprise");
    });

    it("falls back to capitalization if no translator is supplied or tier is custom", () => {
        expect(formatUserTier("custom-plan")).toBe("Custom-plan");
        expect(formatUserTier(undefined)).toBe("Free");
    });
});
