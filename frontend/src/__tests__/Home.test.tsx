import React from "react";
import { screen } from "@testing-library/react";
import Home from "../pages/Home";
import { renderWithProviders, setupTest } from "../test-utils";

beforeEach(setupTest);

test("renders the guest home experience", () => {
    renderWithProviders(<Home />);

    expect(screen.getByText(/fresh organic food delivered to your door/i)).toBeInTheDocument();
    expect(screen.getByText(/browse by category/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
});
