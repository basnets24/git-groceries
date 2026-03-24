import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

type AdminTile = {
  title: string;
  description: string;
  to?: string;
  cta: string;
  status?: string;
};

type SearchUser = {
  userID: number;
  username: string;
  email: string;
  role: string;
};

const tiles: AdminTile[] = [
    {
        title: "Inventory Ops",
        description: "Review stock levels, toggle products, and restock items before they go out of stock.",
        to: "/employee/inventory",
        cta: "Manage Inventory",
        status: "Live",
    },
    {
        title: "Orders Queue",
        description: "Monitor open orders, update fulfillment steps, and coordinate with checkout/payments.",
        to: "/orders",
        cta: "View Orders",
        status: "Coming soon",
    },
    {
        title: "Payment Center",
        description: "Hook up Stripe payouts, reconcile payment intents, and investigate failures.",
        cta: "Stripe Console",
        status: "Integration pending",
    },
    {
        title: "Delivery Routing",
        description: "Plan delivery slots, dispatch drivers/bots, and check ETAs via Google Maps.",
        cta: "Schedule Deliveries",
        status: "Integration pending",
    },
];

const AdminDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("EMPLOYEE");
  const [assigning, setAssigning] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [emailQuery, setEmailQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const assignableRoles = useMemo(() => {
    if (!user) {
      return [];
    }
    if (user.role === "SUPERADMIN") {
      return ["MANAGER", "EMPLOYEE"];
    }
    if (user.role === "MANAGER") {
      return ["EMPLOYEE"];
    }
    return [];
  }, [user]);

  useEffect(() => {
    if (!assignableRoles.length) {
      return;
    }
    if (!assignableRoles.includes(selectedRole)) {
      setSelectedRole(assignableRoles[0]);
    }
  }, [assignableRoles, selectedRole]);

  const canAssignRoles = assignableRoles.length > 0;
  const isValidTarget = /^\d+$/.test(targetUserId.trim());

  const handleAssignRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canAssignRoles || !isValidTarget) {
      setStatus({ type: "error", message: "Enter a valid numeric user ID." });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setStatus({ type: "error", message: "You need to log in again." });
      return;
    }

    setAssigning(true);
    setStatus(null);

    const trimmedId = targetUserId.trim();

    try {
      const res = await fetch(`/api/auth/users/${trimmedId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const errorMessage = data?.error || data?.message || "Unable to assign role.";
        throw new Error(errorMessage);
      }

      setStatus({
        type: "success",
        message: data?.message || `Assigned ${selectedRole} to user #${data?.userID ?? trimmedId}.`,
      });
      setTargetUserId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to assign role.";
      setStatus({ type: "error", message });
    } finally {
      setAssigning(false);
    }
  };

  const handleSearchUsers = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedQuery = emailQuery.trim();
    if (trimmedQuery.length < 2) {
      setSearchError("Enter at least 2 characters.");
      setSearchResults([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setSearchError("You need to log in again.");
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/auth/users?email=${encodeURIComponent(trimmedQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || data?.message || "Unable to fetch users.";
        throw new Error(message);
      }
      const results: SearchUser[] = data.results ?? [];
      setSearchResults(results);
      if (!results.length) {
        setSearchError("No users match that email.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to fetch users.";
      setSearchError(message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleApplyUser = (result: SearchUser) => {
    setTargetUserId(String(result.userID));
    setStatus({
      type: "success",
      message: `Loaded ${result.email} (role: ${result.role}) into the form.`,
    });
  };

  if (!loading && (!user || user.role === "CUSTOMER")) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return null;
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Admin Control</p>
            <h1 style={styles.title}>
              Welcome back{user ? `, ${user.username}` : ""}!
            </h1>
            <p style={styles.subtitle}>
              Centralize daily operations: track inventory, unblock orders, prep
              payments, and orchestrate deliveries from a single view.
            </p>
          </div>
          <div style={styles.badge}>
            {user?.role ?? "STAFF"}
          </div>
        </header>

        {canAssignRoles && (
          <>
            <section style={styles.searchPanel}>
              <div style={styles.rolePanelCopy}>
                <p style={styles.roleEyebrow}>Directory</p>
                <h2 style={styles.roleTitle}>Find users by email</h2>
                <p style={styles.roleSubtitle}>
                  Search for staff accounts using any part of their email, then push them into the assignment form below.
                </p>
              </div>
              <form style={styles.searchForm} onSubmit={handleSearchUsers}>
                <input
                  type="text"
                  placeholder="e.g. staff@example.com"
                  value={emailQuery}
                  onChange={(event) => setEmailQuery(event.target.value)}
                  style={styles.roleInput}
                />
                <button type="submit" style={styles.roleButton} disabled={searching}>
                  {searching ? "Searching..." : "Search"}
                </button>
              </form>
              {searchError && <p style={styles.searchError}>{searchError}</p>}
              {searchResults.length > 0 && (
                <div style={styles.resultsList}>
                  {searchResults.map((result) => (
                    <div key={result.userID} style={styles.resultRow}>
                      <div>
                        <p style={styles.resultEmail}>{result.email}</p>
                        <p style={styles.resultMeta}>
                          #{result.userID} · {result.username} · {result.role}
                        </p>
                      </div>
                      <button
                        type="button"
                        style={styles.resultButton}
                        onClick={() => handleApplyUser(result)}
                      >
                        Use for assignment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={styles.rolePanel}>
              <div style={styles.rolePanelCopy}>
                <p style={styles.roleEyebrow}>User access</p>
                <h2 style={styles.roleTitle}>Assign roles</h2>
                <p style={styles.roleSubtitle}>
                  Superadmins can elevate managers or onboard employees. Managers can add new employees
                  but cannot modify other managers or superadmins.
                </p>
              </div>
              <form style={styles.roleForm} onSubmit={handleAssignRole}>
                <label style={styles.roleField}>
                  <span style={styles.roleLabel}>Target user ID</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 42"
                    value={targetUserId}
                    onChange={(event) => setTargetUserId(event.target.value)}
                    style={styles.roleInput}
                  />
                </label>

                <label style={styles.roleField}>
                  <span style={styles.roleLabel}>Role to assign</span>
                  <select
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    style={styles.roleSelect}
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  style={styles.roleButton}
                  disabled={assigning || !isValidTarget}
                >
                  {assigning ? "Assigning..." : "Assign role"}
                </button>
                <p style={styles.roleHelper}>
                  Use the numeric user ID from the customer table or the directory above.
                </p>
              </form>
              {status && (
                <div
                  style={{
                    ...styles.feedbackBase,
                    ...(status.type === "success" ? styles.feedbackSuccess : styles.feedbackError),
                  }}
                  role="status"
                >
                  {status.message}
                </div>
              )}
            </section>
          </>
        )}

        <section style={styles.grid}>
          {tiles.map((tile) => (
            <article key={tile.title} style={styles.card}>
              <div>
                <div style={styles.cardHeader}>
                  <h2 style={styles.cardTitle}>{tile.title}</h2>
                  {tile.status && (
                    <span style={styles.status}>{tile.status}</span>
                  )}
                </div>
                <p style={styles.cardText}>{tile.description}</p>
              </div>
              {tile.to ? (
                <Link to={tile.to} style={styles.cardLink}>
                  {tile.cta}
                </Link>
              ) : (
                <button type="button" style={styles.cardButton} disabled>
                  {tile.cta}
                </button>
              )}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
  },
  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1.5rem 3rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1.5rem",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  },
  eyebrow: {
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    fontSize: "0.75rem",
    color: "#40916c",
    marginBottom: "0.5rem",
  },
  title: {
    margin: 0,
    fontSize: "2.25rem",
    color: "#1b4332",
  },
  subtitle: {
    marginTop: "0.5rem",
    color: "#495057",
    maxWidth: "640px",
    lineHeight: 1.5,
  },
  badge: {
    alignSelf: "flex-start",
    padding: "0.6rem 1.2rem",
    borderRadius: "999px",
    backgroundColor: "#d8f3dc",
    color: "#1b4332",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  grid: {
    marginTop: "2rem",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.5rem",
  },
  searchPanel: {
    marginTop: "2rem",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  searchForm: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  searchError: {
    margin: 0,
    color: "#a4161a",
    fontWeight: 500,
  },
  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1rem",
    borderRadius: "10px",
    border: "1px solid #dee2e6",
    backgroundColor: "#f8f9fa",
    gap: "1rem",
    flexWrap: "wrap",
  },
  resultEmail: {
    margin: 0,
    fontWeight: 600,
    color: "#1b4332",
  },
  resultMeta: {
    margin: 0,
    color: "#6c757d",
    fontSize: "0.9rem",
  },
  resultButton: {
    border: "none",
    backgroundColor: "#1b4332",
    color: "#fff",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  rolePanel: {
    marginTop: "2rem",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  rolePanelCopy: {
    maxWidth: "640px",
  },
  roleEyebrow: {
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    fontSize: "0.7rem",
    color: "#1b4332",
    marginBottom: "0.5rem",
  },
  roleTitle: {
    margin: 0,
    fontSize: "1.75rem",
    color: "#1b4332",
  },
  roleSubtitle: {
    marginTop: "0.5rem",
    color: "#495057",
    lineHeight: 1.5,
  },
  roleForm: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
    alignItems: "flex-end",
  },
  roleField: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  roleLabel: {
    fontWeight: 600,
    color: "#495057",
  },
  roleInput: {
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid #ced4da",
    fontSize: "1rem",
  },
  roleSelect: {
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid #ced4da",
    backgroundColor: "#fff",
    fontSize: "1rem",
  },
  roleButton: {
    padding: "0.85rem 1.5rem",
    borderRadius: "8px",
    border: "none",
    fontWeight: 600,
    backgroundColor: "#1b4332",
    color: "#fff",
    cursor: "pointer",
  },
  roleHelper: {
    gridColumn: "1 / -1",
    margin: 0,
    fontSize: "0.85rem",
    color: "#6c757d",
  },
  feedbackBase: {
    padding: "0.9rem 1rem",
    borderRadius: "8px",
    fontWeight: 500,
  },
  feedbackSuccess: {
    backgroundColor: "#d8f3dc",
    color: "#1b4332",
  },
  feedbackError: {
    backgroundColor: "#ffe3e3",
    color: "#a4161a",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "1.75rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.08)",
    minHeight: "220px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
    gap: "0.5rem",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1.25rem",
    color: "#1b4332",
  },
  status: {
    fontSize: "0.75rem",
    padding: "0.25rem 0.75rem",
    borderRadius: "999px",
    backgroundColor: "#e9ecef",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  cardText: {
    color: "#495057",
    lineHeight: 1.5,
    flexGrow: 1,
  },
  cardLink: {
    marginTop: "1rem",
    alignSelf: "flex-start",
    textDecoration: "none",
    backgroundColor: "#1b4332",
    color: "#ffffff",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    fontWeight: 600,
  },
  cardButton: {
    marginTop: "1rem",
    alignSelf: "flex-start",
    backgroundColor: "#adb5bd",
    color: "#ffffff",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    fontWeight: 600,
    border: "none",
    cursor: "not-allowed",
    opacity: 0.8,
  },
};

export default AdminDashboard;
