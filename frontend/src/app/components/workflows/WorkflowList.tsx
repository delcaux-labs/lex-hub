"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  deleteWorkflow,
  getWorkflowFilterOptions,
  type WorkflowFilterOptions,
  getWorkflowAddon,
  importWorkflowAddon,
  listWorkflowAddons,
} from "@/app/lib/mikeApi";
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue";
import { useQueryParamTab } from "@/app/hooks/useQueryParamTab";
import { usePaginatedWorkflows } from "@/app/hooks/usePaginatedWorkflows";
import { deleteTabularReviewsWithConcurrency } from "@/app/lib/deleteTabularReviewsWithConcurrency";
import type { Workflow, WorkflowAddon } from "../shared/types";
import { UseWorkflowModal } from "./UseWorkflowModal";
import { NewWorkflowModal } from "./NewWorkflowModal";
import { TableToolbar } from "../shared/TableToolbar";
import { RowActionMenuItems, RowActions } from "../shared/RowActions";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { SubfolderSvgIcon } from "@/app/components/shared/FolderSvgIcon";
import { PillButton } from "@/app/components/ui/pill-button";
import { TabPillButton } from "@/app/components/ui/tab-pill-button";
import { LiquidDropdownSurface } from "@/app/components/ui/liquid-dropdown";
import {
  ChatSkeuoIcon,
  TabularReviewSkeuoIcon,
  WorkflowSkeuoIcon,
} from "@/app/components/shared/AppSidebarSkeuoIcons";
import { workflowDetailPath } from "./workflowRoutes";
import { ConfirmPopup } from "../popups/ConfirmPopup";
import { WorkflowAddonPreviewModal } from "./WorkflowAddonPreviewModal";
import { TableLoadMoreRow } from "@/app/components/shared/TableLoadMoreRow";
import {
  SkeletonDot,
  SkeletonLine,
  TABLE_CHECKBOX_CLASS,
  TableBody,
  TableCell,
  TableEmptyState,
  TableFilters,
  type TableFilterOption,
  TableHeaderCell,
  TableHeaderRow,
  TablePrimaryCell,
  TableRow,
  TableScrollArea,
  type TableSortDirection,
  TableStickyCell,
} from "../shared/TablePrimitive";

type WorkflowListTab = "all" | "assistant" | "tabular" | "addons";

const WORKFLOW_TABS: { id: WorkflowListTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "assistant", label: "Assistant" },
  { id: "tabular", label: "Tabulaire" },
  { id: "addons", label: "Add-ons" },
];
const WORKFLOW_TAB_IDS = WORKFLOW_TABS.map((tab) => tab.id);

const WORKFLOW_SORT_OPTIONS: TableFilterOption<TableSortDirection>[] = [
  { value: "asc", label: "Croissant" },
  { value: "desc", label: "Décroissant" },
];

function workflowFilterOptions(
  values: (string | null | undefined)[],
  labelForValue: (value: string) => string = (value) => value,
): TableFilterOption<string>[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => !!value),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: labelForValue(value) }));
}

export function WorkflowList({
  initialTab = "all",
  packKey = null,
}: {
  initialTab?: WorkflowListTab;
  packKey?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addons, setAddons] = useState<WorkflowAddon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(true);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useQueryParamTab(
    WORKFLOW_TAB_IDS,
    packKey ? "addons" : initialTab,
    !!packKey || initialTab === "addons",
  );
  const [search, setSearch] = useState("");
  const [nameSortDirection, setNameSortDirection] =
    useState<TableSortDirection | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [practiceFilter, setPracticeFilter] = useState<string | null>(null);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(
    null,
  );
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [databaseFilterOptions, setDatabaseFilterOptions] =
    useState<WorkflowFilterOptions>({
      practices: [],
      jurisdictions: [],
      languages: [],
    });
  const [selectedAddon, setSelectedAddon] = useState<WorkflowAddon | null>(
    null,
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [workflowActionsOpen, setWorkflowActionsOpen] = useState(false);
  const [pendingDeleteWorkflows, setPendingDeleteWorkflows] = useState<
    Workflow[]
  >([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "loading" | "complete"
  >("idle");
  const [importingAddonId, setImportingAddonId] = useState<string | null>(null);
  const [bulkImportingAddons, setBulkImportingAddons] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [addonsError, setAddonsError] = useState("");
  const [actionError, setActionError] = useState("");
  const workflowActionsRef = useRef<HTMLDivElement>(null);
  const openAddonIdRef = useRef<string | null>(null);
  const previewEmptyStates = searchParams.get("emptyStates") === "1";
  const debouncedSearch = useDebouncedValue(search, 250);
  const selectedType =
    activeTab === "assistant" || activeTab === "tabular"
      ? activeTab
      : typeFilter === "assistant" || typeFilter === "tabular"
        ? typeFilter
        : undefined;
  const {
    dbWorkflows: workflows,
    setDbWorkflows: setWorkflows,
    loading: workflowsLoading,
    loadingMore,
    hasMore,
    error: workflowsError,
    loadMoreError,
    loadMore,
    selectedWorkflowIds,
    setSelectedWorkflowIds,
    selectAllMatching,
    selectingAll,
  } = usePaginatedWorkflows({
    dbEnabled: activeTab !== "addons",
    systemEnabled: false,
    type: selectedType,
    search: debouncedSearch,
    selectionKey: search,
    practiceFilter,
    languageFilter,
    jurisdictionFilter,
    sort: nameSortDirection
      ? { key: "name", direction: nameSortDirection }
      : null,
  });
  const loading = activeTab === "addons" ? addonsLoading : workflowsLoading;

  useEffect(() => {
    listWorkflowAddons()
      .then(setAddons)
      .catch((error) => {
        setAddonsError(
          error instanceof Error ? error.message : "Impossible de charger les add-ons.",
        );
      })
      .finally(() => setAddonsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "addons") return;
    const controller = new AbortController();
    void getWorkflowFilterOptions({
      type: selectedType,
      signal: controller.signal,
    })
      .then((options) => {
        if (!controller.signal.aborted) setDatabaseFilterOptions(options);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDatabaseFilterOptions({
            practices: [],
            jurisdictions: [],
            languages: [],
          });
        }
      });
    return () => controller.abort();
  }, [activeTab, selectedType]);

  useEffect(() => {
    function closeActions(event: MouseEvent) {
      if (
        workflowActionsRef.current &&
        !workflowActionsRef.current.contains(event.target as Node)
      ) {
        setWorkflowActionsOpen(false);
      }
    }
    if (workflowActionsOpen) {
      document.addEventListener("mousedown", closeActions);
    }
    return () => document.removeEventListener("mousedown", closeActions);
  }, [workflowActionsOpen]);

  const query = search.trim().toLowerCase();
  const visibleWorkflows = useMemo(() => {
    return previewEmptyStates ? [] : workflows;
  }, [previewEmptyStates, workflows]);

  const visibleAddons = useMemo(() => {
    if (previewEmptyStates) return [];
    return addons.filter(
      (addon) =>
        !query ||
        addon.title.toLowerCase().includes(query) ||
        addon.description?.toLowerCase().includes(query) ||
        addon.pack_title?.toLowerCase().includes(query) ||
        addon.practice?.toLowerCase().includes(query),
    );
  }, [addons, previewEmptyStates, query]);
  const activePack = useMemo(() => {
    if (!packKey) return null;
    const addon = addons.find((item) => item.pack_key === packKey);
    if (!addon) return null;
    return {
      key: packKey,
      title: addon.pack_title || packKey,
    };
  }, [addons, packKey]);

  function openAddonPack(nextPackKey: string) {
    setSearch("");
    setSelectedAddonIds([]);
    setActiveTab(
      "addons",
      `/workflows/addons/packs/${encodeURIComponent(nextPackKey)}`,
    );
  }

  function closeAddonPack() {
    setSelectedAddonIds([]);
    setActiveTab("addons", "/workflows/addons");
  }

  function changeTab(tab: WorkflowListTab) {
    if (tab !== "all") setTypeFilter(null);
    setSelectedWorkflowIds([]);
    setSelectedAddonIds([]);
    setWorkflowActionsOpen(false);

    if (tab === "addons") {
      if (packKey) closeAddonPack();
      else if (initialTab !== "addons") {
        setActiveTab("addons", "/workflows/addons");
      } else {
        setActiveTab("addons");
      }
      return;
    }

    if (packKey || initialTab === "addons") {
      setActiveTab(tab, "/workflows");
    } else {
      setActiveTab(tab);
    }
  }

  async function openAddon(addon: WorkflowAddon) {
    openAddonIdRef.current = addon.id;
    setSelectedAddon(addon);
    try {
      const detailed = await getWorkflowAddon(addon.id);
      if (openAddonIdRef.current === addon.id) setSelectedAddon(detailed);
    } catch {
      // The list payload still provides a useful preview.
    }
  }

  function closeAddon() {
    openAddonIdRef.current = null;
    setSelectedAddon(null);
  }

  async function importAddon(addon: WorkflowAddon) {
    if (importingAddonId) return;
    setImportingAddonId(addon.id);
    setActionError("");
    try {
      const workflow = await importWorkflowAddon(addon.id);
      setWorkflows((current) => [workflow, ...current]);
      setSelectedAddonIds((current) => current.filter((id) => id !== addon.id));
      closeAddon();
      router.push(workflowDetailPath(workflow));
    } catch (error) {
      setActionError(
        error instanceof Error
          ? `Impossible d'importer "${addon.title}" : ${error.message}`
          : `Impossible d'importer "${addon.title}".`,
      );
    } finally {
      setImportingAddonId(null);
    }
  }

  async function importSelectedAddons() {
    const selectedAddons = addons.filter((addon) =>
      selectedAddonIds.includes(addon.id),
    );
    if (selectedAddons.length === 0) return;
    setBulkImportingAddons(true);
    try {
      const results = await Promise.allSettled(
        selectedAddons.map((addon) => importWorkflowAddon(addon.id)),
      );
      const imported = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (imported.length > 0) {
        setWorkflows((current) => [...imported, ...current]);
      }
      setSelectedAddonIds([]);
      if (imported.length !== selectedAddons.length) {
        setActionError("Certains add-ons sélectionnés n'ont pas pu être importés.");
      }
    } finally {
      setBulkImportingAddons(false);
    }
  }

  function requestWorkflowDeletion(
    workflowsToDelete: Workflow[],
    ids = workflowsToDelete.map((workflow) => workflow.id),
  ) {
    setPendingDeleteWorkflows(workflowsToDelete);
    setPendingDeleteIds(ids);
    setWorkflowActionsOpen(false);
    setDeleteStatus("idle");
  }

  async function confirmWorkflowDeletion() {
    const ids = pendingDeleteIds;
    if (ids.length === 0) return;
    setDeleteStatus("loading");
    const { deletedIds, failedIds } =
      await deleteTabularReviewsWithConcurrency(
        ids,
        deleteWorkflow,
      );
    setSelectedWorkflowIds((current) =>
      current.filter((id) => !deletedIds.includes(id)),
    );
    setWorkflows((current) =>
      current.filter((workflow) => !deletedIds.includes(workflow.id)),
    );
    if (failedIds.length > 0) {
      setActionError("Certains workflows sélectionnés n'ont pas pu être supprimés.");
    }
    setDeleteStatus("complete");
    window.setTimeout(() => {
      setPendingDeleteWorkflows([]);
      setPendingDeleteIds([]);
      setDeleteStatus("idle");
    }, 500);
  }

  const workflowToolbarActions =
    activeTab !== "addons" && selectedWorkflowIds.length > 0 ? (
      <div ref={workflowActionsRef} className="relative">
        <TabPillButton onClick={() => setWorkflowActionsOpen((open) => !open)}>
          Actions
          <ChevronDown className="h-3.5 w-3.5" />
        </TabPillButton>
        {workflowActionsOpen && (
          <LiquidDropdownSurface className="absolute top-full right-0 z-[100] mt-1 w-36 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                requestWorkflowDeletion(
                  workflows.filter((workflow) =>
                    selectedWorkflowIds.includes(workflow.id),
                  ),
                  selectedWorkflowIds,
                )
              }
              className="w-full px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-500/10"
            >
              Supprimer
            </button>
          </LiquidDropdownSurface>
        )}
      </div>
    ) : undefined;
  const addonToolbarActions = activeTab === "addons" ? (
    <>
      {packKey && (
        <TabPillButton onClick={closeAddonPack}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Retour
        </TabPillButton>
      )}
      {selectedAddonIds.length > 0 && (
        <button
          type="button"
          disabled={bulkImportingAddons}
          onClick={() => void importSelectedAddons()}
          className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:text-gray-950 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {bulkImportingAddons
            ? "Importation en cours…"
            : `Importer${selectedAddonIds.length > 1 ? ` (${selectedAddonIds.length})` : ""}`}
        </button>
      )}
    </>
  ) : undefined;
  const pendingDefaultDeleteCount = pendingDeleteWorkflows.filter(
    (workflow) => workflow.is_default,
  ).length;
  const includesUnloadedWorkflows =
    pendingDeleteIds.length > pendingDeleteWorkflows.length;
  const deleteWarningMessage =
    includesUnloadedWorkflows
      ? "Cette action supprimera définitivement tous les workflows sélectionnés, y compris les workflows correspondants non affichés actuellement. Si certains sont des workflows par défaut, leurs Actions rapides correspondantes seront également supprimées et ne seront pas recréées automatiquement."
      : pendingDefaultDeleteCount > 0
      ? pendingDeleteWorkflows.length === 1
        ? "La suppression de ce workflow par défaut supprimera également définitivement son Action rapide correspondante. Le workflow par défaut ne sera plus recréé automatiquement."
        : `Les workflows sélectionnés seront définitivement supprimés. ${pendingDefaultDeleteCount} ${pendingDefaultDeleteCount === 1 ? "est un workflow par défaut, son Action rapide correspondante sera" : "sont des workflows par défaut, leurs Actions rapides correspondantes seront"} également supprimée(s). Les valeurs par défaut supprimées ne seront pas recréées automatiquement.`
      : pendingDeleteWorkflows.length === 1
        ? "Ce workflow sera définitivement supprimé."
        : "Les workflows sélectionnés seront définitivement supprimés.";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        shrink
        loading={loading}
        breadcrumbs={
          packKey
            ? [
                {
                  label: "Workflows",
                  onClick: () => router.push("/workflows"),
                },
                { label: "Add-ons", onClick: closeAddonPack },
                {
                  label: activePack?.title || packKey,
                  loading: addonsLoading && !activePack,
                },
              ]
            : undefined
        }
        actions={[
          {
            type: "search",
            value: search,
            onChange: setSearch,
            placeholder:
              activeTab === "addons" ? "Rechercher des add-ons…" : "Rechercher des workflows…",
          },
          {
            type: "new",
            onClick: () => setNewModalOpen(true),
            title: "Nouveau workflow",
          },
        ]}
      >
        <h1 className="font-serif text-2xl font-medium text-gray-900">
          Workflows
        </h1>
      </PageHeader>

      <TableToolbar
        items={WORKFLOW_TABS}
        active={activeTab}
        onChange={changeTab}
        actions={
          activeTab === "addons" ? addonToolbarActions : workflowToolbarActions
        }
      />

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-600"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700"
          >
            Ignorer
          </button>
        </div>
      )}

      {activeTab === "addons" ? (
        <AddonTable
          addons={visibleAddons}
          loading={loading}
          error={addonsError}
          selectedIds={selectedAddonIds}
          onSelectedIdsChange={setSelectedAddonIds}
          importingAddonId={importingAddonId}
          bulkImporting={bulkImportingAddons}
          activePackKey={packKey}
          onOpenPack={openAddonPack}
          onOpen={openAddon}
          onImport={importAddon}
        />
      ) : (
        <WorkflowTable
          key={activeTab}
          workflows={visibleWorkflows}
          loading={loading}
          error={workflowsError?.message || loadError}
          onOpen={setSelected}
          onEdit={setEditingWorkflow}
          onDelete={(workflow) => requestWorkflowDeletion([workflow])}
          onCreate={() => setNewModalOpen(true)}
          selectedIds={selectedWorkflowIds}
          onSelectedIdsChange={setSelectedWorkflowIds}
          onSelectAll={() => void selectAllMatching([], "owned")}
          selectingAll={selectingAll}
          nameSortDirection={nameSortDirection}
          onNameSortDirectionChange={setNameSortDirection}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          practiceFilter={practiceFilter}
          onPracticeFilterChange={setPracticeFilter}
          jurisdictionFilter={jurisdictionFilter}
          onJurisdictionFilterChange={setJurisdictionFilter}
          languageFilter={languageFilter}
          onLanguageFilterChange={setLanguageFilter}
          filterOptions={databaseFilterOptions}
          loadingMore={loadingMore}
          hasMore={hasMore}
          loadMoreError={!!loadMoreError}
          onLoadMore={() => void loadMore()}
        />
      )}

      <UseWorkflowModal
        workflow={selected}
        onClose={() => setSelected(null)}
      />

      <NewWorkflowModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={(workflow) => {
          setWorkflows((current) => [workflow, ...current]);
          setNewModalOpen(false);
          router.push(workflowDetailPath(workflow));
        }}
      />

      <NewWorkflowModal
        open={!!editingWorkflow}
        onClose={() => setEditingWorkflow(null)}
        onCreated={() => undefined}
        editWorkflow={editingWorkflow ?? undefined}
        onUpdated={(updated) => {
          setWorkflows((current) =>
            current.map((workflow) =>
              workflow.id === updated.id
                ? { ...workflow, ...updated }
                : workflow,
            ),
          );
          setEditingWorkflow(null);
        }}
      />

      <WorkflowAddonPreviewModal
        addon={selectedAddon}
        importing={selectedAddon?.id === importingAddonId}
        onClose={closeAddon}
        onImport={importAddon}
      />

      <ConfirmPopup
        open={pendingDeleteIds.length > 0}
        title={
          pendingDeleteIds.length === 1
            ? "Supprimer le workflow ?"
            : "Supprimer les workflows ?"
        }
        message={deleteWarningMessage}
        confirmLabel="Supprimer"
        confirmStatus={deleteStatus}
        onConfirm={() => void confirmWorkflowDeletion()}
        onCancel={() => {
          if (deleteStatus === "loading") return;
          setPendingDeleteWorkflows([]);
          setPendingDeleteIds([]);
          setDeleteStatus("idle");
        }}
      />
    </div>
  );
}

function WorkflowTable({
  workflows,
  loading,
  error,
  onOpen,
  onEdit,
  onDelete,
  onCreate,
  selectedIds,
  onSelectedIdsChange,
  onSelectAll,
  selectingAll,
  nameSortDirection,
  onNameSortDirectionChange,
  typeFilter,
  onTypeFilterChange,
  practiceFilter,
  onPracticeFilterChange,
  jurisdictionFilter,
  onJurisdictionFilterChange,
  languageFilter,
  onLanguageFilterChange,
  filterOptions,
  loadingMore,
  hasMore,
  loadMoreError,
  onLoadMore,
}: {
  workflows: Workflow[];
  loading: boolean;
  error: string;
  onOpen: (workflow: Workflow) => void;
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onCreate: () => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onSelectAll: () => void;
  selectingAll: boolean;
  nameSortDirection: TableSortDirection | null;
  onNameSortDirectionChange: (direction: TableSortDirection | null) => void;
  typeFilter: string | null;
  onTypeFilterChange: (value: string | null) => void;
  practiceFilter: string | null;
  onPracticeFilterChange: (value: string | null) => void;
  jurisdictionFilter: string | null;
  onJurisdictionFilterChange: (value: string | null) => void;
  languageFilter: string | null;
  onLanguageFilterChange: (value: string | null) => void;
  filterOptions: WorkflowFilterOptions;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreError: boolean;
  onLoadMore: () => void;
}) {
  const typeOptions = useMemo<TableFilterOption<string>[]>(
    () => [
      { value: "assistant", label: "Assistant" },
      { value: "tabular", label: "Tabulaire" },
    ],
    [],
  );
  const practiceOptions = useMemo(
    () => workflowFilterOptions(filterOptions.practices),
    [filterOptions.practices],
  );
  const jurisdictionOptions = useMemo(
    () => workflowFilterOptions(filterOptions.jurisdictions),
    [filterOptions.jurisdictions],
  );
  const languageOptions = useMemo(
    () => workflowFilterOptions(filterOptions.languages),
    [filterOptions.languages],
  );
  const displayedWorkflows = workflows;
  const selectableIds = displayedWorkflows
    .filter((workflow) => workflow.is_owner !== false)
    .map((workflow) => workflow.id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));
  const someSelected =
    !allSelected && selectableIds.some((id) => selectedIds.includes(id));

  function toggleAll() {
    if (allSelected) {
      onSelectedIdsChange([]);
      return;
    }
    onSelectAll();
  }

  function toggleOne(id: string) {
    onSelectedIdsChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  }

  function handleNameSortChange(direction: TableSortDirection | null) {
    onNameSortDirectionChange(direction);
    onSelectedIdsChange([]);
  }

  function handleFilterChange(
    setter: (value: string | null) => void,
    value: string | null,
  ) {
    setter(value);
    onSelectedIdsChange([]);
  }

  return (
    <TableScrollArea
      onScroll={(event) => {
        if (loading || loadingMore || !hasMore) return;
        const element = event.currentTarget;
        const distanceToBottom =
          element.scrollHeight - element.scrollTop - element.clientHeight;
        if (distanceToBottom < 200) onLoadMore();
      }}
      header={
        <TableHeaderRow>
          <TableStickyCell header>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(element) => {
                if (element) element.indeterminate = someSelected;
              }}
              disabled={selectableIds.length === 0 || selectingAll}
              onChange={toggleAll}
              className={TABLE_CHECKBOX_CLASS}
              title="Sélectionner tous les workflows supprimables"
            />
            <span className="mr-1">Nom</span>
            {!loading && (
              <TableFilters
                label="Trier par nom de workflow"
                value={nameSortDirection}
                allLabel="Ordre par défaut"
                widthClassName="w-40"
                align="right"
                options={WORKFLOW_SORT_OPTIONS}
                onChange={handleNameSortChange}
              />
            )}
          </TableStickyCell>
          <TableHeaderCell className="ml-auto flex w-28 items-center gap-1">
            <span>Type</span>
            {!loading && (
              <TableFilters
                label="Filtrer par type de workflow"
                value={typeFilter}
                allLabel="Tous les types"
                widthClassName="w-40"
                options={typeOptions}
                onChange={(value) =>
                  handleFilterChange(onTypeFilterChange, value)
                }
              />
            )}
          </TableHeaderCell>
          <TableHeaderCell className="flex w-52 items-center gap-1">
            <span>Domaine d'expertise</span>
            {!loading && (
              <TableFilters
                label="Filtrer par domaine d'expertise"
                value={practiceFilter}
                allLabel="Tous les domaines"
                widthClassName="w-52"
                options={practiceOptions}
                onChange={(value) =>
                  handleFilterChange(onPracticeFilterChange, value)
                }
              />
            )}
          </TableHeaderCell>
          <TableHeaderCell className="flex w-40 items-center gap-1">
            <span>Juridiction</span>
            {!loading && (
              <TableFilters
                label="Filtrer par juridiction"
                value={jurisdictionFilter}
                allLabel="Toutes les juridictions"
                widthClassName="w-48"
                options={jurisdictionOptions}
                onChange={(value) =>
                  handleFilterChange(onJurisdictionFilterChange, value)
                }
              />
            )}
          </TableHeaderCell>
          <TableHeaderCell className="flex w-28 items-center gap-1">
            <span>Langue</span>
            {!loading && (
              <TableFilters
                label="Filtrer par langue"
                value={languageFilter}
                allLabel="Toutes les langues"
                widthClassName="w-44"
                options={languageOptions}
                onChange={(value) =>
                  handleFilterChange(onLanguageFilterChange, value)
                }
              />
            )}
          </TableHeaderCell>
          <TableHeaderCell className="w-8" />
        </TableHeaderRow>
      }
    >
      {loading ? (
        <TableBody>
          {[1, 2, 3].map((index) => (
            <TableRow key={index} interactive={false}>
              <TableStickyCell hover={false}>
                <SkeletonLine className="h-3.5 w-48" />
              </TableStickyCell>
              <TableCell className="ml-auto w-28">
                <SkeletonLine className="w-16" />
              </TableCell>
              <TableCell className="w-52">
                <SkeletonLine className="w-24" />
              </TableCell>
              <TableCell className="w-40">
                <SkeletonLine className="w-24" />
              </TableCell>
              <TableCell className="w-28">
                <SkeletonLine className="w-16" />
              </TableCell>
              <TableCell className="w-8">
                <SkeletonDot />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      ) : workflows.length === 0 ? (
        <TableEmptyState>
          <WorkflowSkeuoIcon className="mb-4 h-8 w-8" />
          <p className="font-serif text-2xl font-medium text-gray-900">
            Workflows
          </p>
          <p className="mt-1 text-left text-xs text-gray-400">
            {error || "Créez un workflow réutilisable ou importez-en un depuis les Add-ons."}
          </p>
          <PillButton
            tone="black"
            size="sm"
            onClick={onCreate}
            className="mt-4 px-3"
          >
            <Plus className="h-3.5 w-3.5" /> Créer
          </PillButton>
        </TableEmptyState>
      ) : displayedWorkflows.length === 0 ? (
        <TableEmptyState>
          <WorkflowSkeuoIcon className="mb-4 h-8 w-8" />
          <p className="font-serif text-2xl font-medium text-gray-900">
            Aucun workflow correspondant
          </p>
          <p className="mt-1 text-left text-xs text-gray-400">
            Ajustez les filtres du tableau pour voir plus de workflows.
          </p>
        </TableEmptyState>
      ) : (
        <>
          <TableBody>
            {displayedWorkflows.map((workflow) => {
            const Icon =
              workflow.metadata.type === "tabular"
                ? TabularReviewSkeuoIcon
                : ChatSkeuoIcon;
            const canManage = workflow.is_owner !== false;
            const canDelete = canManage;
            const isSelected = selectedIds.includes(workflow.id);
            return (
              <TableRow
                key={workflow.id}
                selected={isSelected}
                onClick={() => onOpen(workflow)}
                rightClickDropdown={
                  canManage
                    ? (close, menuProps) => (
                        <RowActionMenuItems
                          onClose={close}
                          surfaceProps={menuProps}
                          onEditDetails={() => onEdit(workflow)}
                          onDelete={() => onDelete(workflow)}
                        />
                      )
                    : undefined
                }
              >
                <TablePrimaryCell
                  label={workflow.metadata.title}
                  selected={isSelected}
                  onSelectionChange={() => toggleOne(workflow.id)}
                  selectionIndicator={
                    canDelete ? undefined : (
                      <input
                        type="checkbox"
                        disabled
                        className={TABLE_CHECKBOX_CLASS}
                        title="Les workflows partagés ne peuvent pas être supprimés"
                        aria-label={`Sélectionner ${workflow.metadata.title}`}
                      />
                    )
                  }
                />
                <TableCell className="ml-auto w-28">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                    <Icon className="h-4 w-4 shrink-0" />
                    {workflow.metadata.type === "tabular"
                      ? "Tabulaire"
                      : "Assistant"}
                  </span>
                </TableCell>
                <TableCell className="w-52 text-xs text-gray-600">
                  {workflow.metadata.practice || "—"}
                </TableCell>
                <TableCell className="w-40 truncate text-xs text-gray-600">
                  {workflow.metadata.jurisdictions?.join(", ") || "—"}
                </TableCell>
                <TableCell className="w-28 text-xs text-gray-600">
                  {workflow.metadata.language || "—"}
                </TableCell>
                <div
                  className="flex w-8 shrink-0 justify-end"
                  onClick={(event) => event.stopPropagation()}
                >
                  {canManage && (
                    <RowActions
                      onEditDetails={() => onEdit(workflow)}
                      onDelete={() => onDelete(workflow)}
                    />
                  )}
                </div>
              </TableRow>
            );
            })}
          </TableBody>
          <TableLoadMoreRow
            loading={loading}
            hasMore={hasMore}
            itemCount={displayedWorkflows.length}
            loadingMore={loadingMore}
            hasError={loadMoreError}
            onLoadMore={onLoadMore}
          />
        </>
      )}
    </TableScrollArea>
  );
}

function AddonTable({
  addons,
  loading,
  error,
  selectedIds,
  onSelectedIdsChange,
  importingAddonId,
  bulkImporting,
  activePackKey,
  onOpenPack,
  onOpen,
  onImport,
}: {
  addons: WorkflowAddon[];
  loading: boolean;
  error: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  importingAddonId: string | null;
  bulkImporting: boolean;
  activePackKey: string | null;
  onOpenPack: (packKey: string) => void;
  onOpen: (addon: WorkflowAddon) => void;
  onImport: (addon: WorkflowAddon) => Promise<void>;
}) {
  const [expandedPackKeys, setExpandedPackKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const packs = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        title: string;
        description: string | null;
        addons: WorkflowAddon[];
      }
    >();
    for (const addon of addons) {
      if (!addon.pack_key) continue;
      const existing = grouped.get(addon.pack_key);
      if (existing) {
        existing.addons.push(addon);
      } else {
        grouped.set(addon.pack_key, {
          key: addon.pack_key,
          title: addon.pack_title || addon.pack_key,
          description: addon.pack_description,
          addons: [addon],
        });
      }
    }
    return [...grouped.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [addons]);
  const activePack = activePackKey
    ? packs.find((pack) => pack.key === activePackKey) ?? null
    : null;
  const standaloneAddons = addons.filter((addon) => !addon.pack_key);
  const isEmpty = activePackKey
    ? !activePack || activePack.addons.length === 0
    : packs.length === 0 && standaloneAddons.length === 0;
  const addonIds = (activePack?.addons ?? addons).map((addon) => addon.id);
  const allSelected =
    addonIds.length > 0 && addonIds.every((id) => selectedIds.includes(id));
  const someSelected =
    !allSelected && addonIds.some((id) => selectedIds.includes(id));

  function toggleAll() {
    onSelectedIdsChange(allSelected ? [] : addonIds);
  }

  function toggleOne(addonId: string) {
    onSelectedIdsChange(
      selectedIds.includes(addonId)
        ? selectedIds.filter((id) => id !== addonId)
        : [...selectedIds, addonId],
    );
  }

  function togglePackSelection(packAddons: WorkflowAddon[]) {
    const packIds = packAddons.map((addon) => addon.id);
    const packSelected = packIds.every((id) => selectedIds.includes(id));
    onSelectedIdsChange(
      packSelected
        ? selectedIds.filter((id) => !packIds.includes(id))
        : [...new Set([...selectedIds, ...packIds])],
    );
  }

  function togglePack(packKey: string) {
    setExpandedPackKeys((current) => {
      const next = new Set(current);
      if (next.has(packKey)) next.delete(packKey);
      else next.add(packKey);
      return next;
    });
  }

  function renderAddonRow(addon: WorkflowAddon, nested = false) {
    const Icon =
      addon.type === "tabular" ? TabularReviewSkeuoIcon : ChatSkeuoIcon;
    return (
      <TableRow
        key={addon.id}
        selected={selectedIds.includes(addon.id)}
        onClick={() => onOpen(addon)}
      >
        <TablePrimaryCell
          className={nested ? "pl-12" : undefined}
          label={addon.title}
          selected={selectedIds.includes(addon.id)}
          onSelectionChange={() => toggleOne(addon.id)}
        />
        <TableCell className="ml-auto w-28">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <Icon className="h-4 w-4" />
            {addon.type === "tabular" ? "Tabulaire" : "Assistant"}
          </span>
        </TableCell>
        <TableCell className="w-52 text-xs text-gray-600">
          {addon.practice || "—"}
        </TableCell>
        <TableCell className="w-40 truncate text-xs text-gray-600">
          {addon.jurisdictions?.join(", ") || "—"}
        </TableCell>
        <TableCell className="w-28 text-xs text-gray-600">
          {addon.language || "—"}
        </TableCell>
        <TableCell className="w-20">
          <button
            type="button"
            disabled={bulkImporting || importingAddonId === addon.id}
            onClick={(event) => {
              event.stopPropagation();
              void onImport(addon);
            }}
            className="inline-flex items-center gap-1 px-1 py-1 text-xs font-medium text-gray-600 transition-colors hover:text-gray-950 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {importingAddonId === addon.id ? "Importation en cours…" : "Importer"}
          </button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableScrollArea
      header={
        <TableHeaderRow>
          <TableStickyCell header>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(element) => {
                if (element) element.indeterminate = someSelected;
              }}
              disabled={addonIds.length === 0 || bulkImporting}
              onChange={toggleAll}
              className={TABLE_CHECKBOX_CLASS}
              title="Sélectionner tous les add-ons"
            />
            Nom
          </TableStickyCell>
          <TableHeaderCell className="ml-auto w-28">Type</TableHeaderCell>
          <TableHeaderCell className="w-52">Domaine d'expertise</TableHeaderCell>
          <TableHeaderCell className="w-40">Juridiction</TableHeaderCell>
          <TableHeaderCell className="w-28">Langue</TableHeaderCell>
          <TableHeaderCell className="w-20" />
        </TableHeaderRow>
      }
    >
      {loading ? (
        <TableBody>
          <TableRow interactive={false}>
            <TableStickyCell hover={false}>
              <SkeletonLine className="w-48" />
            </TableStickyCell>
          </TableRow>
        </TableBody>
      ) : isEmpty ? (
        <TableEmptyState>
          <WorkflowSkeuoIcon className="mb-4 h-8 w-8" />
          <p className="font-serif text-2xl font-medium text-gray-900">
            Add-ons
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {error ||
              (activePackKey ? "Ce pack est vide." : "Aucun add-on trouvé.")}
          </p>
        </TableEmptyState>
      ) : (
        <TableBody>
          {activePack ? (
            activePack.addons.map((addon) => renderAddonRow(addon))
          ) : (
            <>
              {packs.map((pack) => {
                const expanded = expandedPackKeys.has(pack.key);
                const packSelected = pack.addons.every((addon) =>
                  selectedIds.includes(addon.id),
                );
                const packPartiallySelected =
                  !packSelected &&
                  pack.addons.some((addon) =>
                    selectedIds.includes(addon.id),
                  );
                return [
                  <TableRow
                    key={`${pack.key}:folder`}
                    selected={packSelected}
                    aria-expanded={expanded}
                    onClick={() => onOpenPack(pack.key)}
                  >
                    <TablePrimaryCell
                      selected={packSelected}
                      onSelectionChange={() =>
                        togglePackSelection(pack.addons)
                      }
                      selectionIndicator={
                        <input
                          type="checkbox"
                          checked={packSelected}
                          ref={(element) => {
                            if (element) {
                              element.indeterminate = packPartiallySelected;
                            }
                          }}
                          disabled={bulkImporting}
                          onChange={() => togglePackSelection(pack.addons)}
                          onClick={(event) => event.stopPropagation()}
                          className={TABLE_CHECKBOX_CLASS}
                          title={`Sélectionner ${pack.title}`}
                          aria-label={`Sélectionner ${pack.title}`}
                        />
                      }
                      label={
                        <span className="flex min-w-0 items-center">
                          <button
                            type="button"
                            aria-label={
                              expanded
                                ? `Réduire ${pack.title}`
                                : `Développer ${pack.title}`
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              togglePack(pack.key);
                            }}
                            className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          <SubfolderSvgIcon
                            open={expanded}
                            className="mr-2 h-4 w-4 shrink-0"
                          />
                          <span className="truncate text-xs text-gray-700">
                            {pack.title}
                          </span>
                        </span>
                      }
                    />
                    <TableCell className="ml-auto w-28 text-xs text-gray-600">
                      Pack
                    </TableCell>
                    <TableCell className="w-52 text-xs text-gray-600">
                      {pack.addons.length} workflow
                      {pack.addons.length === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell className="w-40 text-xs text-gray-600">
                      —
                    </TableCell>
                    <TableCell className="w-28 text-xs text-gray-600">
                      —
                    </TableCell>
                    <TableCell className="w-20" />
                  </TableRow>,
                  ...(expanded
                    ? pack.addons.map((addon) => renderAddonRow(addon, true))
                    : []),
                ];
              })}
              {standaloneAddons.map((addon) => renderAddonRow(addon))}
            </>
          )}
        </TableBody>
      )}
    </TableScrollArea>
  );
}
