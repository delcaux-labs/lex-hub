import type { ColumnFormat } from "../shared/types";

export interface ColumnPreset {
    name: string;
    matches: RegExp;
    prompt: string;
    format: ColumnFormat;
    tags?: string[];
}

export const PROMPT_PRESETS: ColumnPreset[] = [
    {
        name: "Parties",
        matches: /\bpart(y|ies|ie|ies)\b/i,
        format: "bulleted_list",
        prompt: "Indiquez toutes les parties à cet accord. Pour chaque partie, précisez sa dénomination sociale complète, sa forme juridique et son rôle défini, ex. :\n• ABC Corp, société du Delaware (« Société »)\n• John Smith (« Actionnaire »)\nUne partie par puce. Aucun commentaire supplémentaire.",
    },
    {
        name: "Droit applicable",
        matches: /\bgoverning law\b|\bjurisdiction\b|\bdroit applicable\b|\bjuridiction\b/i,
        format: "text",
        prompt: "Indiquez uniquement le droit applicable à cet accord en utilisant le nom court de la juridiction, ex. « Droit français », « Droit de New York », « Droit anglais ». Aucun autre texte.",
    },
    {
        name: "Date d'effet",
        matches: /\beffective date\b|\bdate d'effet\b|\bdate de prise d'effet\b/i,
        format: "date",
        prompt: "Indiquez uniquement la date d'effet de cet accord au format JJ Mois AAAA, ex. « 2 janv. 2026 ». Si elle n'est pas explicitement indiquée, écrivez « Non spécifié ».",
    },
    {
        name: "Durée",
        matches: /\bterm\b|\bduration\b|\bdurée\b/i,
        format: "text",
        prompt: "Indiquez uniquement la durée de cet accord sous une forme concise, ex. « 3 ans », « 24 mois », « perpétuelle ». Aucun autre texte.",
    },
    {
        name: "Résiliation",
        matches: /\bterminat(e|ion|ing)\b|\brésiliation\b/i,
        format: "text",
        prompt: "Extrayez les dispositions relatives à la résiliation. Indiquez qui peut résilier, les événements déclencheurs, le préavis requis, la période de remédiation éventuelle et les conséquences principales de la résiliation. Soyez concis.",
    },
    {
        name: "Changement de contrôle",
        matches: /\bchange of control\b|\bchangement de contrôle\b/i,
        format: "text",
        prompt: "Identifiez les dispositions relatives au changement de contrôle. Résumez les événements déclencheurs, les conséquences, les exigences de consentement et les droits de résiliation ou d'exigibilité anticipée associés. Soyez concis.",
    },
    {
        name: "Confidentialité",
        matches: /\bconfidential(ity)?\b|\bnon-?disclosure\b|\bconfidentialité\b/i,
        format: "text",
        prompt: "Résumez les obligations de confidentialité : portée des informations confidentielles, divulgations autorisées, restrictions d'utilisation, durée et principales exceptions.",
    },
    {
        name: "Cession",
        matches: /\bassign(ment|ability)?\b|\bcession\b/i,
        format: "yes_no",
        prompt: "La cession de cet accord est-elle autorisée sans le consentement de l'autre partie ?",
    },
    {
        name: "Paiement et frais",
        matches: /\bpayment\b|\bfees?\b|\bpaiement\b|\bfrais\b/i,
        format: "text",
        prompt: "Indiquez de manière concise les principales obligations de paiement : montant, échéance et devise, ex. « 10 000 USD payable sous 30 jours à réception de facture ». Mentionnez les pénalités de retard éventuelles.",
    },
    {
        name: "Avenant",
        matches: /\bamendment\b|\bvariation\b|\bavenant\b|\bmodification\b/i,
        format: "text",
        prompt: "Résumez les dispositions relatives aux modifications : comment les avenants peuvent être conclus, qui doit consentir et les exigences de forme (écrit, signature).",
    },
    {
        name: "Indemnisation",
        matches: /\bindemni(ty|ties|fication)\b|\bindemnisation\b|\bgarantie d'indemnisation\b/i,
        format: "text",
        prompt: "Résumez les dispositions d'indemnisation : qui indemnise qui, la portée des pertes indemnisées, les plafonds ou exclusions de responsabilité et les procédures de réclamation.",
    },
    {
        name: "Garanties",
        matches: /\bwarrant(y|ies|ing)\b|\brepresentations?\b|\bgaranties?\b|\bdéclarations?\b/i,
        format: "text",
        prompt: "Identifiez et décrivez les déclarations et garanties clés fournies par chaque partie, y compris la portée de ces engagements et les délais ou conditions applicables. Mettez particulièrement en évidence les garanties non standard.",
    },
    {
        name: "Force majeure",
        matches: /\bforce majeure\b/i,
        format: "yes_no",
        prompt: "Cet accord contient-il une clause de force majeure ?",
    },
];

export function getPresetConfig(
    title: string,
): Pick<ColumnPreset, "prompt" | "format" | "tags"> | null {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const preset = PROMPT_PRESETS.find(({ matches }) => matches.test(trimmed));
    if (!preset) return null;
    return { prompt: preset.prompt, format: preset.format, tags: preset.tags };
}

export function getPresetPrompt(title: string): string | null {
    return getPresetConfig(title)?.prompt ?? null;
}
