import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Register from "../pages/Register";
import { renderWithProviders, setupTest } from "../test-utils";

beforeEach(setupTest);

test("shows a validation error when register passwords do not match", async () => {
    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/username/i), "new_customer");
    await userEvent.type(screen.getByLabelText(/^email$/i), "customer@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "Secret123!");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "Secret124!");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
});
