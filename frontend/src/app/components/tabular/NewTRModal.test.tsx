import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    uploadProjectDocument,
    uploadStandaloneDocument,
} from "@/app/lib/mikeApi";
import type { Document } from "../shared/types";
import { NewTRModal } from "./NewTRModal";

vi.mock("@/app/lib/mikeApi", () => ({
    getProject: vi.fn(),
    listWorkflows: vi.fn(async () => []),
    uploadProjectDocument: vi.fn(),
    uploadStandaloneDocument: vi.fn(),
}));

vi.mock("../shared/FileDirectory", () => ({
    FileDirectory: ({ tabs }: { tabs?: string[] }) => (
        <div>
            Document directory
            <span data-testid="directory-tabs">{tabs?.join(",")}</span>
        </div>
    ),
}));

describe("NewTRModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows folder grouping on the first screen and excludes Templates", () => {
        const onAdd = vi.fn();
        render(
            <NewTRModal
                open
                onClose={vi.fn()}
                onAdd={onAdd}
            />,
        );

        expect(screen.getByText("Regroupement des documents")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Traiter les documents d'un même dossier comme une seule ligne de revue",
            ),
        ).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Nom de la revue"), {
            target: { value: "Closing review" },
        });
        const groupingSwitch = screen.getByRole("switch", {
            name: "Traiter les documents d'un même dossier comme une seule ligne de revue",
        });
        expect(groupingSwitch).toHaveAttribute("aria-checked", "false");
        fireEvent.click(groupingSwitch);
        expect(groupingSwitch).toHaveAttribute("aria-checked", "true");
        fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

        expect(screen.getByText("Document directory")).toBeInTheDocument();
        expect(screen.getByTestId("directory-tabs")).toHaveTextContent(
            "files,projects",
        );
        expect(screen.queryByText("Regroupement des documents")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Créer" }));
        expect(onAdd).toHaveBeenCalledWith(
            "Closing review",
            undefined,
            undefined,
            undefined,
            "folder",
        );
    });

    it("stores uploads from a project review in that project", async () => {
        const uploadedDocument = {
            id: "uploaded-document",
            project_id: "project-1",
            filename: "New agreement.pdf",
            file_type: "pdf",
        };
        vi.mocked(uploadProjectDocument).mockResolvedValue(
            uploadedDocument as Document,
        );

        render(
            <NewTRModal
                open
                onClose={vi.fn()}
                onAdd={vi.fn()}
                projectId="project-1"
                projectDocs={[]}
                projectFolders={[]}
                projectName="Acquisition"
            />,
        );

        fireEvent.change(screen.getByLabelText("Nom de la revue"), {
            target: { value: "Project review" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

        const file = new File(["agreement"], "New agreement.pdf", {
            type: "application/pdf",
        });
        const input = document.querySelector<HTMLInputElement>(
            'input[type="file"]',
        );
        fireEvent.change(input!, { target: { files: [file] } });

        await waitFor(() =>
            expect(uploadProjectDocument).toHaveBeenCalledWith(
                "project-1",
                file,
            ),
        );
        expect(uploadStandaloneDocument).not.toHaveBeenCalled();
    });
});
