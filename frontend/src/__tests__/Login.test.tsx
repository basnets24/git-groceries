import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "../Login";
import { renderWithProviders, setupTest, mockFetch } from "../test-utils";

beforeEach(setupTest);

test("login form renders with email/username and password fields", () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
});

test("login succeeds for CUSTOMER role and navigates home", async () => {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            token: "test_token_customer",
            username: "johndoe",
            role: "CUSTOMER",
            customerID: 123,
        }),
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email or username/i), "johndoe");
    await userEvent.type(screen.getByLabelText(/password/i), "Secret123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
        expect(screen.getByText(/welcome johndoe/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem("token")).toBe("test_token_customer");
    expect(JSON.parse(localStorage.getItem("user") || "{}").role).toBe("CUSTOMER");
});

test("login succeeds for EMPLOYEE role", async () => {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            token: "test_token_employee",
            username: "alice_emp",
            role: "EMPLOYEE",
            customerID: 456,
        }),
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email or username/i), "alice_emp");
    await userEvent.type(screen.getByLabelText(/password/i), "Secret123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
        expect(screen.getByText(/welcome alice_emp/i)).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem("user") || "{}").role).toBe("EMPLOYEE");
});

test("login succeeds for MANAGER role", async () => {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            token: "test_token_manager",
            username: "bob_mgr",
            role: "MANAGER",
            customerID: 789,
        }),
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email or username/i), "bob_mgr");
    await userEvent.type(screen.getByLabelText(/password/i), "Secret123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
        expect(screen.getByText(/welcome bob_mgr/i)).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem("user") || "{}").role).toBe("MANAGER");
});

test("login shows error on invalid credentials", async () => {
    mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid username or password" }),
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email or username/i), "baduser");
    await userEvent.type(screen.getByLabelText(/password/i), "WrongPassword");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
        expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
});
