"use client";

import type { Workflow } from "../shared/types";
import { WorkflowPickerModal } from "../workflows/WorkflowPickerModal";

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (workflow: Workflow) => Promise<void> | void;
    projectName?: string;
    projectCmNumber?: string | null;
    initialWorkflowId?: string;
}

export function AssistantWorkflowModal({
    open,
    onClose,
    onSelect,
    projectName,
    projectCmNumber,
    initialWorkflowId,
}: Props) {
    const breadcrumbs = projectName
        ? [
              "Projets",
              `${projectName}${projectCmNumber ? ` (#${projectCmNumber})` : ""}`,
              "Assistant",
              "Ajouter un workflow",
          ]
        : ["Assistant", "Ajouter un workflow"];

    return (
        <WorkflowPickerModal
            open={open}
            onClose={onClose}
            onSelect={onSelect}
            workflowType="assistant"
            breadcrumbs={breadcrumbs}
            primaryLabel="Utiliser"
            initialWorkflowId={initialWorkflowId}
        />
    );
}
