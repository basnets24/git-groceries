import React from "react";
import { screen, waitFor } from "@testing-library/react";
import Cart from "../pages/Cart";
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

test("cart displays empty state when no items", async () => {
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

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Cart />);

    await waitFor(() => {
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /shop now/i })).toBeInTheDocument();
    }, { timeout: 3000 });
});

test("cart displays items with price and quantity controls", async () => {
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
                json: async () => ({
                    items: [
                        {
                            order_id: 1,
                            product_id: 1,
                            name: "Apples",
                            category: "Produce",
                            price: 3.99,
                            quantity: 2,
                            price_at_checkout: 3.99,
                            weight_at_checkout: 0.5,
                            quantity_in_stock: 50,
                        },
                    ],
                }),
            } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Cart />);

    await waitFor(() => {
        expect(screen.getByText(/apples/i)).toBeInTheDocument();
        expect(screen.getByText(/\$3\.99/)).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: /qty/i })).toBeInTheDocument();
    }, { timeout: 3000 });
});

test("cart shows delivery charge for items >= 20 lbs", async () => {
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
                json: async () => ({
                    items: [
                        {
                            order_id: 1,
                            product_id: 1,
                            name: "Flour",
                            category: "Pantry",
                            price: 5.99,
                            quantity: 5,
                            price_at_checkout: 5.99,
                            weight_at_checkout: 5.0, // 5 * 5 = 25 lbs total
                            quantity_in_stock: 50,
                        },
                    ],
                }),
            } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<Cart />);

    await waitFor(() => {
        expect(screen.getByText(/delivery charge/i)).toBeInTheDocument();
        expect(screen.getByText(/\$10/)).toBeInTheDocument(); // Delivery charge for >= 20 lbs
    }, { timeout: 3000 });
});
