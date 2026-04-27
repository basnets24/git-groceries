import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Inventory from "../pages/Inventory";
import { renderWithProviders, setupTest, mockFetch } from "../test-utils";

beforeEach(() => {
    setupTest();
    localStorage.setItem("token", "test_token");
    localStorage.setItem("user", JSON.stringify({
        customerID: 123,
        username: "alice",
        role: "EMPLOYEE",
    }));
});

test("inventory displays current stock levels for employee", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/api/auth/me")) {
            return {
                ok: true,
                json: async () => ({
                    customerID: 123,
                    username: "alice",
                    role: "EMPLOYEE",
                }),
            } as Response;
        }

        if (url.includes("/api/cart/123")) {
            return {
                ok: true,
                json: async () => ({ items: [] }),
            } as Response;
        }

        if (url.includes("/api/inventory")) {
            return {
                ok: true,
                json: async () => ({
                    inventory: [
                        {
                            id: 1,
                            name: "Apples",
                            category: "Produce",
                            category_id: 1,
                            price: 3.99,
                            quantity: 50,
                            lowStockThreshold: 10,
                        },
                        {
                            id: 2,
                            name: "Milk",
                            category: "Dairy",
                            category_id: 2,
                            price: 2.99,
                            quantity: 5,
                            lowStockThreshold: 10,
                        },
                    ],
                }),
            } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Inventory />);

    await waitFor(() => {
        expect(screen.getByText(/apples/i)).toBeInTheDocument();
        expect(screen.getByText(/milk/i)).toBeInTheDocument();
        expect(screen.getByText(/50/)).toBeInTheDocument(); // Apples quantity
    }, { timeout: 3000 });
});

test("inventory allows viewing and managing items by category", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/api/auth/me")) {
            return {
                ok: true,
                json: async () => ({
                    customerID: 123,
                    username: "alice",
                    role: "EMPLOYEE",
                }),
            } as Response;
        }

        if (url.includes("/api/cart/123")) {
            return {
                ok: true,
                json: async () => ({ items: [] }),
            } as Response;
        }

        if (url.includes("/api/inventory")) {
            return {
                ok: true,
                json: async () => ({
                    inventory: [
                        {
                            id: 1,
                            name: "Apples",
                            category: "Produce",
                            category_id: 1,
                            price: 3.99,
                            quantity: 50,
                            lowStockThreshold: 10,
                        },
                    ],
                }),
            } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Inventory />);

    await waitFor(() => {
        expect(screen.getByText(/apples/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify the category is displayed
    expect(screen.getAllByRole("cell", { name: /produce/i }).length).toBeGreaterThan(0);
});

test("inventory shows low stock warning for items below threshold", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/api/auth/me")) {
            return {
                ok: true,
                json: async () => ({
                    customerID: 123,
                    username: "alice",
                    role: "EMPLOYEE",
                }),
            } as Response;
        }

        if (url.includes("/api/cart/123")) {
            return {
                ok: true,
                json: async () => ({ items: [] }),
            } as Response;
        }

        if (url.includes("/api/inventory")) {
            return {
                ok: true,
                json: async () => ({
                    inventory: [
                        {
                            id: 1,
                            name: "Milk",
                            category: "Dairy",
                            category_id: 2,
                            price: 2.99,
                            quantity: 5,
                            lowStockThreshold: 10,
                        },
                    ],
                }),
            } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Inventory />);

    await waitFor(() => {
        expect(screen.getByText(/milk/i)).toBeInTheDocument();
        expect(screen.getAllByText(/low stock/i).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
});
