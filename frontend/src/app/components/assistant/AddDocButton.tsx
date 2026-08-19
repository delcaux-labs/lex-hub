"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
    onBrowseAll: () => void;
    selectedDocIds?: string[];
    hideLabel?: boolean;
}

export function AddDocButton({
    onBrowseAll,
    selectedDocIds = [],
    hideLabel = false,
}: Props) {
    const tCommon = useTranslations("common");
    const tAssistant = useTranslations("assistant");

    return (
        <button
            type="button"
            onClick={onBrowseAll}
            className={`flex items-center gap-1 px-2 h-8 rounded-lg text-sm transition-colors cursor-pointer ${
                selectedDocIds.length > 0
                    ? "text-gray-700 hover:text-gray-900"
                    : "text-gray-400 hover:text-gray-700"
            }`}
            title={tAssistant("attachDocument")}
            aria-label={tAssistant("attachDocument")}
        >
            {selectedDocIds.length > 0 ? (
                <span className="font-medium tabular-nums">
                    {selectedDocIds.length}
                </span>
            ) : (
                <PlusIcon className="h-4 w-4 shrink-0" />
            )}
            <span className={hideLabel ? "hidden" : "hidden sm:inline"}>
                {selectedDocIds.length === 1
                    ? tCommon("document")
                    : tCommon("documents")}
            </span>
        </button>
    );
}
