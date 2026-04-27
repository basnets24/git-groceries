import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { vi } from "vitest";

const mockNavigate = vi.fn();
const mockFetch = vi.fn();

export function renderWithProviders(ui: React.ReactElement) {
    return render(
        <MemoryRouter>
            <AuthProvider>
                <CartProvider>{ui}</CartProvider>
            </AuthProvider>
        </MemoryRouter>
    );
}

export function setupTest() {
    localStorage.clear();
    vi.restoreAllMocks();
    mockNavigate.mockClear();
    mockFetch.mockClear();
    (global as any).fetch = mockFetch;
}

export { mockNavigate, mockFetch };