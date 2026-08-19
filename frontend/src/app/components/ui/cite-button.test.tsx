import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CiteButton } from "./cite-button";

describe("CiteButton", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders the default 'Citer' label", () => {
        render(<CiteButton quoteText="hello" quoteLabel="Page 2" />);
        expect(
            screen.getByRole("button", { name: /citer/i }),
        ).toBeInTheDocument();
    });

    it("hides the label when showText is false", () => {
        render(
            <CiteButton
                quoteText="hello"
                quoteLabel="Page 2"
                showText={false}
            />,
        );
        expect(screen.queryByText("Citer")).not.toBeInTheDocument();
    });

    it("copies the quote and citation, then shows 'Copié'", async () => {
        // userEvent.setup() installs a clipboard stub on navigator; spy on it.
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, "writeText");
        render(<CiteButton quoteText={`he said "hi"`} quoteLabel="Page 2" />);

        await user.click(screen.getByRole("button"));

        expect(writeText).toHaveBeenCalledWith(`"he said 'hi'" (Page 2)`);
        expect(await screen.findByText("Copié")).toBeInTheDocument();
    });
});
