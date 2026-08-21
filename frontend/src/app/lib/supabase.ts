import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (envUrl && !envUrl.includes("__NEXT_PUBLIC_SUPABASE_URL__")) {
        return envUrl;
    }
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    return "http://localhost:54321";
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
