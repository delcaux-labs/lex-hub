import type { AssistantEvent } from "../../shared/types";

export function eventErrorMessage(event: AssistantEvent): string | null {
    if (event.type === "error") return event.message;
    if ("error" in event && typeof event.error === "string" && event.error) {
        return event.error;
    }
    return null;
}

export function toolCallLabel(name: string): string {
    if (name === "ask_inputs") return "Demande d'informations...";
    if (name === "generate_docx") return "Création du document...";
    if (name === "generate_excel") return "Création de la feuille de calcul...";
    if (name === "generate_ppt") return "Création de la présentation...";
    if (name === "edit_document") return "Modification du document...";
    if (name === "read_document") return "Lecture du document...";
    if (name === "fetch_documents") return "Lecture des documents...";
    if (name === "find_in_document") return "Recherche dans le document...";
    if (name === "replicate_document") return "Copie du document...";
    if (name === "read_workflow") return "Lecture du workflow...";
    if (name === "list_workflows") return "Chargement des workflows...";
    if (name === "list_documents") return "Chargement des documents...";
    if (name === "courtlistener_search_case_law")
        return "Recherche de jurisprudence...";
    if (name === "courtlistener_get_cases") return "Récupération des décisions...";
    if (name === "courtlistener_find_in_case") return "Recherche dans la décision...";
    if (name === "courtlistener_read_case") return "Lecture de la décision...";
    if (name === "courtlistener_verify_citations")
        return "Vérification des citations...";
    if (name.startsWith("mcp_")) return "Utilisation du connecteur...";
    return name ? `Exécution de ${name}...` : "Travail en cours...";
}
