import { describe, expect, it } from "vitest";
import fr from "../../messages/fr.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import { locales, defaultLocale } from "./config";

function getDeepKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.keys(obj).flatMap((key) => {
        const val = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (val !== null && typeof val === "object" && !Array.isArray(val)) {
            return getDeepKeys(val as Record<string, unknown>, newKey);
        }
        return [newKey];
    });
}

describe("i18n parity & config test", () => {
    it("has valid supported locales and defaultLocale is 'fr'", () => {
        expect(locales).toEqual(["fr", "en", "de"]);
        expect(defaultLocale).toBe("fr");
    });

    it("has identical keys in fr.json, en.json, and de.json", () => {
        const frKeys = getDeepKeys(fr).sort();
        const enKeys = getDeepKeys(en).sort();
        const deKeys = getDeepKeys(de).sort();

        expect(enKeys).toEqual(frKeys);
        expect(deKeys).toEqual(frKeys);
    });

    it("has non-empty translations for all keys across all locales", () => {
        const checkNonEmpty = (obj: Record<string, unknown>, path = "") => {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                if (typeof value === "string") {
                    expect(
                        value.trim().length,
                        `Empty translation at ${currentPath}`,
                    ).toBeGreaterThan(0);
                } else if (
                    value !== null &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {
                    checkNonEmpty(value as Record<string, unknown>, currentPath);
                }
            }
        };

        checkNonEmpty(fr);
        checkNonEmpty(en);
        checkNonEmpty(de);
    });
});
