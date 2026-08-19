import { createHash } from "crypto";
import type { createServerSupabase } from "./supabase";
import { SYSTEM_WORKFLOWS, type SystemWorkflow } from "./systemWorkflows";
import { storageEnabled, uploadFile } from "./storage";
import { contentTypeForDocumentType } from "./documentTypes";

type Db = ReturnType<typeof createServerSupabase>;

export const DEFAULT_WORKFLOW_IDS = [
  "builtin-proofread",
  "builtin-compare-documents",
  "builtin-extract-key-terms",
  "builtin-draft-from-template",
  "builtin-commercial-agreement-tabular-review",
] as const;

const DEFAULT_WORKFLOW_ID_SET = new Set<string>(DEFAULT_WORKFLOW_IDS);
const DEFAULT_QUICK_ACTION_PROMPT =
  "Execute this workflow on the selected documents.";

const QUICK_ACTION_DEFAULTS: Partial<
  Record<
  (typeof DEFAULT_WORKFLOW_IDS)[number],
  { prompt: string; documentUpload: boolean; sortOrder: number }
  >
> = {
  "builtin-proofread": {
    prompt: DEFAULT_QUICK_ACTION_PROMPT,
    documentUpload: true,
    sortOrder: 0,
  },
  "builtin-compare-documents": {
    prompt: DEFAULT_QUICK_ACTION_PROMPT,
    documentUpload: true,
    sortOrder: 1,
  },
  "builtin-extract-key-terms": {
    prompt: DEFAULT_QUICK_ACTION_PROMPT,
    documentUpload: true,
    sortOrder: 2,
  },
  "builtin-draft-from-template": {
    prompt: DEFAULT_QUICK_ACTION_PROMPT,
    documentUpload: true,
    sortOrder: 3,
  },
};

const DEFAULT_WORKFLOW_LOCALIZATIONS: Record<
  string,
  Partial<
    Record<
      (typeof DEFAULT_WORKFLOW_IDS)[number],
      {
        title: string;
        language: string;
        quickActionName?: string;
        quickActionPrompt?: string;
      }
    >
  >
> = {
  fr: {
    "builtin-proofread": {
      title: "Relecture et correction",
      language: "French",
      quickActionName: "Relecture et correction",
      quickActionPrompt: "Exécuter ce workflow sur les documents sélectionnés.",
    },
    "builtin-compare-documents": {
      title: "Comparer des documents",
      language: "French",
      quickActionName: "Comparer des documents",
      quickActionPrompt: "Exécuter ce workflow sur les documents sélectionnés.",
    },
    "builtin-extract-key-terms": {
      title: "Extraire les termes clés",
      language: "French",
      quickActionName: "Extraire les termes clés",
      quickActionPrompt: "Exécuter ce workflow sur les documents sélectionnés.",
    },
    "builtin-draft-from-template": {
      title: "Rédiger à partir d'un modèle",
      language: "French",
      quickActionName: "Rédiger à partir d'un modèle",
      quickActionPrompt: "Exécuter ce workflow sur les documents sélectionnés.",
    },
    "builtin-commercial-agreement-tabular-review": {
      title: "Revue tabulaire d'accords commerciaux",
      language: "French",
    },
  },
  de: {
    "builtin-proofread": {
      title: "Korrekturlesen und Überarbeiten",
      language: "German",
      quickActionName: "Korrekturlesen und Überarbeiten",
      quickActionPrompt: "Diesen Workflow auf die ausgewählten Dokumente anwenden.",
    },
    "builtin-compare-documents": {
      title: "Dokumente vergleichen",
      language: "German",
      quickActionName: "Dokumente vergleichen",
      quickActionPrompt: "Diesen Workflow auf die ausgewählten Dokumente anwenden.",
    },
    "builtin-extract-key-terms": {
      title: "Wichtige Klauseln extrahieren",
      language: "German",
      quickActionName: "Wichtige Klauseln extrahieren",
      quickActionPrompt: "Diesen Workflow auf die ausgewählten Dokumente anwenden.",
    },
    "builtin-draft-from-template": {
      title: "Entwurf aus Vorlage erstellen",
      language: "German",
      quickActionName: "Entwurf aus Vorlage erstellen",
      quickActionPrompt: "Diesen Workflow auf die ausgewählten Dokumente anwenden.",
    },
    "builtin-commercial-agreement-tabular-review": {
      title: "Tabellarische Prüfung von Handelsverträgen",
      language: "German",
    },
  },
  en: {
    "builtin-proofread": {
      title: "Proofread",
      language: "English",
      quickActionName: "Proofread",
      quickActionPrompt: DEFAULT_QUICK_ACTION_PROMPT,
    },
    "builtin-compare-documents": {
      title: "Compare Documents",
      language: "English",
      quickActionName: "Compare Documents",
      quickActionPrompt: DEFAULT_QUICK_ACTION_PROMPT,
    },
    "builtin-extract-key-terms": {
      title: "Extract Key Terms",
      language: "English",
      quickActionName: "Extract Key Terms",
      quickActionPrompt: DEFAULT_QUICK_ACTION_PROMPT,
    },
    "builtin-draft-from-template": {
      title: "Draft from Template",
      language: "English",
      quickActionName: "Draft from Template",
      quickActionPrompt: DEFAULT_QUICK_ACTION_PROMPT,
    },
    "builtin-commercial-agreement-tabular-review": {
      title: "Commercial Agreement Tabular Review",
      language: "English",
    },
  },
};

function workflowById(id: string): SystemWorkflow {
  const workflow = SYSTEM_WORKFLOWS.find((item) => item.id === id);
  if (!workflow) throw new Error(`Default workflow '${id}' is missing`);
  return workflow;
}

export function defaultWorkflowPayloads(locale: string = "fr") {
  const normLocale = locale === "en" ? "en" : locale === "de" ? "de" : "fr";
  const localized = DEFAULT_WORKFLOW_LOCALIZATIONS[normLocale] || {};
  return DEFAULT_WORKFLOW_IDS.map((id) => {
    const workflow = workflowById(id);
    const action = QUICK_ACTION_DEFAULTS[id];
    const loc = localized[id];
    const title = loc?.title ?? workflow.metadata.title;
    const language = loc?.language ?? workflow.metadata.language;
    const quickActionName = action
      ? (loc?.quickActionName ?? loc?.title ?? workflow.metadata.title)
      : null;
    const quickActionPrompt = loc?.quickActionPrompt ?? action?.prompt ?? null;

    return {
      default_key: id.replace(/^builtin-/, ""),
      title,
      type: workflow.metadata.type,
      prompt_md: workflow.skill_md,
      columns_config: workflow.columns_config,
      language,
      practice: workflow.metadata.practice,
      jurisdictions: workflow.metadata.jurisdictions,
      quick_action_name: quickActionName,
      quick_action_prompt: quickActionPrompt,
      document_upload: action?.documentUpload ?? false,
      sort_order: action?.sortOrder ?? null,
    };
  });
}

// After the first successful install for a user, the RPC is a pure no-op:
// the installation markers make it skip every default. Remembering that
// success per process avoids shipping the multi-KB default payload and
// taking the per-user advisory lock on every workflow list, quick-action
// list, and chat message. A new deploy (new process) re-runs the RPC once,
// which is exactly when new defaults could have shipped.
const ensuredDefaultUsers = new Set<string>();

export function resetEnsuredDefaultUsersForTests(): void {
  ensuredDefaultUsers.clear();
}

export async function ensureDefaultWorkflows(
  userId: string,
  db: Db,
  preferredLocale?: string,
): Promise<number> {
  if (ensuredDefaultUsers.has(userId)) return 0;

  let locale = preferredLocale;
  if (!locale && typeof db.from === "function") {
    try {
      const { data: profile } = await db
        .from("user_profiles")
        .select("preferred_locale")
        .eq("user_id", userId)
        .maybeSingle();
      locale =
        (profile as { preferred_locale?: string } | null)?.preferred_locale ||
        "fr";
    } catch {
      locale = "fr";
    }
  }

  const { data, error } = await db.rpc("install_missing_default_workflows", {
    p_user_id: userId,
    p_defaults: defaultWorkflowPayloads(locale || "fr"),
  });
  if (error) throw error;
  ensuredDefaultUsers.add(userId);
  return typeof data === "number" ? data : 0;
}

export type WorkflowAddonSeed = {
  addon_key: string;
  pack_key: string | null;
  pack_title: string | null;
  pack_description: string | null;
  pack_version: string | null;
  version: string | null;
  title: string;
  description: string | null;
  type: "assistant" | "tabular";
  prompt_md: string | null;
  columns_config: SystemWorkflow["columns_config"];
  contributors: SystemWorkflow["metadata"]["contributors"];
  language: string;
  practice: string | null;
  jurisdictions: string[] | null;
  content_hash: string;
  active: boolean;
  updated_at: string;
};

export function workflowAddonSeeds(): WorkflowAddonSeed[] {
  return SYSTEM_WORKFLOWS.filter(
    (workflow) => !DEFAULT_WORKFLOW_ID_SET.has(workflow.id),
  ).map((workflow) => {
    const payload = {
      addon_key: workflow.id.replace(/^builtin-/, ""),
      pack_key: workflow.pack?.key ?? null,
      pack_title: workflow.pack?.title ?? null,
      pack_description: workflow.pack?.description ?? null,
      pack_version: workflow.pack?.version ?? null,
      version: workflow.metadata.version ?? null,
      title: workflow.metadata.title,
      description: workflow.metadata.description ?? null,
      type: workflow.metadata.type,
      prompt_md: workflow.skill_md,
      columns_config: workflow.columns_config,
      contributors: workflow.metadata.contributors,
      language: workflow.metadata.language,
      practice: workflow.metadata.practice,
      jurisdictions: workflow.metadata.jurisdictions,
    };
    return {
      ...payload,
      content_hash: createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex"),
      active: true,
      updated_at: new Date().toISOString(),
    };
  });
}

// The catalog is derived from the generated module, which only changes with
// a deploy, so one successful sync per process is enough. Concurrent callers
// share the in-flight promise instead of racing duplicate upserts; a failed
// sync clears the latch so the next request retries.
let catalogSyncPromise: Promise<void> | null = null;

export function resetCatalogSyncForTests(): void {
  catalogSyncPromise = null;
}

export function syncWorkflowAddonCatalog(db: Db): Promise<void> {
  if (!catalogSyncPromise) {
    catalogSyncPromise = runCatalogSync(db).catch((err: unknown) => {
      catalogSyncPromise = null;
      throw err;
    });
  }
  return catalogSyncPromise;
}

async function runCatalogSync(db: Db): Promise<void> {
  const seeds = workflowAddonSeeds();
  const { data: existing, error: listError } = await db
    .from("workflow_addons")
    .select("id, addon_key, content_hash, active");
  if (listError) throw listError;
  const existingByKey = new Map(
    (existing ?? []).map((row) => [row.addon_key, row]),
  );

  // content_hash covers every seeded column, so rows whose hash matches are
  // already up to date — skipping them keeps updated_at meaningful and turns
  // the steady-state sync into a single read.
  const changed = seeds.filter((seed) => {
    const current = existingByKey.get(seed.addon_key);
    return (
      !current || current.content_hash !== seed.content_hash || !current.active
    );
  });
  if (changed.length > 0) {
    const { error } = await db
      .from("workflow_addons")
      .upsert(changed, { onConflict: "addon_key" });
    if (error) throw error;
  }

  const activeKeys = new Set(seeds.map((seed) => seed.addon_key));
  const removedIds = (existing ?? [])
    .filter((row) => row.active && !activeKeys.has(row.addon_key))
    .map((row) => row.id);
  if (removedIds.length > 0) {
    const { error: deactivateError } = await db
      .from("workflow_addons")
      .update({ active: false, updated_at: new Date().toISOString() })
      .in("id", removedIds);
    if (deactivateError) throw deactivateError;
  }

  if (!storageEnabled) return;
  const { data: addonRows, error: addonRowsError } = await db
    .from("workflow_addons")
    .select("id, addon_key")
    .in(
      "addon_key",
      seeds.map((seed) => seed.addon_key),
    );
  if (addonRowsError) throw addonRowsError;
  const addonIdByKey = new Map(
    (addonRows ?? []).map((row) => [row.addon_key, row.id]),
  );

  for (const workflow of SYSTEM_WORKFLOWS) {
    if (DEFAULT_WORKFLOW_ID_SET.has(workflow.id)) continue;
    const addonKey = workflow.id.replace(/^builtin-/, "");
    const addonId = addonIdByKey.get(addonKey);
    if (!addonId) continue;
    const { data: currentReferences, error: currentReferencesError } = await db
      .from("workflow_addon_reference_files")
      .select("id, filename, content_hash")
      .eq("addon_id", addonId);
    if (currentReferencesError) throw currentReferencesError;
    const referenceFiles =
      workflow.metadata.type === "assistant" ? workflow.reference_files : [];
    const expectedNames = new Set(referenceFiles.map((file) => file.filename));
    const staleIds = (currentReferences ?? [])
      .filter((file) => !expectedNames.has(file.filename))
      .map((file) => file.id);
    if (staleIds.length > 0) {
      const { error: staleError } = await db
        .from("workflow_addon_reference_files")
        .delete()
        .in("id", staleIds);
      if (staleError) throw staleError;
    }
    const currentHashes = new Map(
      (currentReferences ?? []).map((file) => [
        file.filename,
        file.content_hash,
      ]),
    );
    for (const file of referenceFiles) {
      const bytes = Buffer.from(file.content_base64, "base64");
      const contentHash = createHash("sha256").update(bytes).digest("hex");
      if (currentHashes.get(file.filename) === contentHash) continue;
      const storagePath = `workflow-addons/${addonKey}/${contentHash}/${file.filename}`;
      await uploadFile(
        storagePath,
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
        contentTypeForDocumentType(file.file_type),
      );
      const { error: referenceError } = await db
        .from("workflow_addon_reference_files")
        .upsert(
          {
            addon_id: addonId,
            filename: file.filename,
            file_type: file.file_type,
            storage_path: storagePath,
            size_bytes: file.size_bytes,
            content_hash: contentHash,
          },
          { onConflict: "addon_id,filename" },
        );
      if (referenceError) throw referenceError;
    }
  }
}
