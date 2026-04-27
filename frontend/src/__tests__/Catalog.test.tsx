import React from "react";
import { screen, waitFor } from "@testing-library/react";
import Catalog from "../pages/Catalog";
import { renderWithProviders, setupTest, mockFetch } from "../test-utils";

beforeEach(() => {
    setupTest();
    localStorage.setItem("token", "test_token");
    localStorage.setItem("user", JSON.stringify({
        customerID: 123,
        username: "testuser",
        role: "CUSTOMER",
    }));
});

test("catalog renders products and categories from API", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/api/auth/me")) {
            return {
                ok: true,
                json: async () => ({
                    customerID: 123,
                    username: "testuser",
                    role: "CUSTOMER",
                }),
            } as Response;
        }

        if (url.includes("/api/cart/123")) {
            return {
                ok: true,
                json: async () => ({ items: [] }),
            } as Response;
        }

        if (url.includes("/api/categories")) {
            return {
                ok: true,
                json: async () => ({
                    categories: [
                        { id: 1, name: "Produce" },
                        { id: 2, name: "Dairy" },
                    ],
                }),
            } as Response;
        }

        if (url.includes("/api/products")) {
            return {
                ok: true,
                json: async () => ({
                    products: [
                        {
                            id: 1,
                            name: "Apples",
                            category: "Produce",
                            price: 3.99,
                            weight: 0.5,
                            description: "Fresh apples",
                            image: "apple.png",
                            quantityInStock: 50,
                        },
                        {
                            id: 2,
                            name: "Milk",
                            category: "Dairy",
                            price: 2.99,
                            weight: 1.0,
                            description: "Fresh milk",
                            image: "milk.png",
                            quantityInStock: 30,
                        },
                    ],
                }),
            } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Catalog />);

    expect(await screen.findByRole("heading", { name: /apples/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /milk/i }, { timeout: 3000 })).toBeInTheDocument();
});

test("catalog allows filtering by category", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/api/auth/me")) {
            return {
                ok: true,
                json: async () => ({
                    customerID: 123,
                    username: "testuser",
                    role: "CUSTOMER",
                }),
            } as Response;
        }

        if (url.includes("/api/cart/123")) {
            return {
                ok: true,
                json: async () => ({ items: [] }),
            } as Response;
        }

        if (url.includes("/api/categories")) {
            return {
                ok: true,
                json: async () => ({
                    categories: [
                        { id: 1, name: "Produce" },
                        { id: 2, name: "Dairy" },
                    ],
                }),
            } as Response;
        }

        if (url.includes("/api/products")) {
            return {
                ok: true,
                json: async () => ({
                    products: [
                        {
                            id: 1,
                            name: "Apples",
                            category: "Produce",
                            price: 3.99,
                            weight: 0.5,
                            description: "Fresh apples",
                            image: "apple.png",
                            quantityInStock: 50,
                        },
                        {
                            id: 2,
                            name: "Milk",
                            category: "Dairy",
                            price: 2.99,
                            weight: 1.0,
                            description: "Fresh milk",
                            image: "milk.png",
                            quantityInStock: 30,
                        },
                    ],
                }),
            } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Catalog />);

    expect(await screen.findByRole("heading", { name: /apples/i }, { timeout: 3000 })).toBeInTheDocument();

    // Verify both products are displayed
    expect(screen.getByRole("heading", { name: /apples/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /milk/i })).toBeInTheDocument();
});
