import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../AuthContext";

// Simple component to expose the auth context for assertions
function AuthConsumer() {
  const { user, loading, token } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.username : "null"}</div>
      <div data-testid="token">{token ?? "null"}</div>
    </div>
  );
}

function LoginButton() {
  const { login } = useAuth();
  return (
    <button onClick={() => login("test@example.com", "password123")}>Login</button>
  );
}

const mockUser = {
  id: "1",
  username: "testuser",
  email: "test@example.com",
  github_username: null,
  current_outfit_id: null,
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuthProvider", () => {
  it("starts unauthenticated when no token in localStorage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 401 })
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("null");
      expect(screen.getByTestId("token")).toHaveTextContent("null");
    });
  });

  it("restores session from localStorage token", async () => {
    localStorage.setItem("token", "stored-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockUser), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("testuser");
      expect(screen.getByTestId("token")).toHaveTextContent("stored-token");
    });
  });

  it("clears storage on invalid stored token", async () => {
    localStorage.setItem("token", "bad-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 401 })
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("null");
      expect(localStorage.getItem("token")).toBeNull();
    });
  });

  it("login stores token and user", async () => {
    // First call: /auth/me (no stored token, skipped)
    // Second call: /auth/login
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "new-token", user: mockUser }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(
      <AuthProvider>
        <AuthConsumer />
        <LoginButton />
      </AuthProvider>
    );

    await screen.findByTestId("user"); // wait for initial load

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Login" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("testuser");
      expect(screen.getByTestId("token")).toHaveTextContent("new-token");
      expect(localStorage.getItem("token")).toBe("new-token");
    });
  });

  it("login throws on bad credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    let caughtError: Error | null = null;

    function LoginWithCapture() {
      const { login } = useAuth();
      return (
        <button
          onClick={async () => {
            try {
              await login("bad@example.com", "wrong");
            } catch (e) {
              caughtError = e as Error;
            }
          }}
        >
          Bad Login
        </button>
      );
    }

    render(
      <AuthProvider>
        <LoginWithCapture />
      </AuthProvider>
    );

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Bad Login" }));
    });

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe("Invalid credentials");
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow(
      "useAuth must be used within AuthProvider"
    );
    spy.mockRestore();
  });
});
