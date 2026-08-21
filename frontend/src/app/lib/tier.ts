/**
 * Formats and translates a user's subscription tier for display.
 * Maps known tier identifiers ("free", "pro", "enterprise") to their localized labels,
 * while safely falling back for unknown or custom tier strings.
 */
export function formatUserTier(
    tier: string | null | undefined,
    tTiers?: (key: string) => string,
): string {
    const raw = (tier || "free").trim().toLowerCase();
    if (tTiers) {
        try {
            if (raw === "free" || raw === "pro" || raw === "enterprise") {
                return tTiers(raw);
            }
        } catch {
            // Fall back to formatted raw string if key missing
        }
    }
    if (!tier) return "Free";
    return tier.charAt(0).toUpperCase() + tier.slice(1);
}
