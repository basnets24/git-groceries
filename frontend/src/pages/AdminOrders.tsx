import React, { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS: Record<string, string> = {
  ALL:        "All",
  INPROGRESS: "In Progress",
  PAID:       "Paid",
  DISPATCHED: "Dispatched",
  DELIVERED:  "Delivered",
};

interface AdminOrder {
    order_id: number;
    status: string;
    customer: { customer_id: number; username: string; email: string };
    address: { street: string; city: string; state: string; zip: string };
    subtotal: number;
    total_weight: number;
    order_date: string | null;
    payment_status: string | null;
    trip_id: number | null;
}

const AdminOrders: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("ALL");
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (authLoading) return;
        const token = localStorage.getItem("token");
        if (!token) {
            setError("Not authenticated");
            setLoading(false);
            return;
        }

        fetch("/api/admin/orders", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (!res.ok) {
                    const msg = await res.json().catch(() => ({}));
                    throw new Error(msg?.error || `Request failed: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => setOrders(data.orders || []))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [authLoading]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: orders.length };
        for (const o of orders) {
            counts[o.status] = (counts[o.status] ?? 0) + 1;
        }
        return counts;
    }, [orders]);

    const visibleOrders = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            const matchesStatus = filter === "ALL" || o.status === filter;
            const matchesSearch = !q ||
                o.customer.username.toLowerCase().includes(q) ||
                o.customer.email.toLowerCase().includes(q) ||
                String(o.order_id).includes(q);
            return matchesStatus && matchesSearch;
        });
    }, [orders, filter, search]);

    if (!authLoading && (!user || user.role === "CUSTOMER")) {
        return <Navigate to="/" replace />;
    }

    return (
        <div style={styles.page}>
            <Navbar />
            <main style={styles.main}>
                <header style={styles.header}>
                    <div>
                        <p style={styles.eyebrow}>Admin · Orders</p>
                        <h1 style={styles.title}>Order Queue</h1>
                        <p style={styles.subtitle}>
                            Monitor every order, open details, and review the route a delivery bot took.
                        </p>
                    </div>
                    <div style={styles.filterRow}>
                        {["ALL", "INPROGRESS", "PAID", "DISPATCHED", "DELIVERED"].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                style={{
                                    ...styles.filterButton,
                                    backgroundColor: filter === s ? "#1b4332" : "#e9ecef",
                                    color: filter === s ? "#ffffff" : "#495057",
                                }}
                            >
                                {STATUS_LABELS[s]}
                                {statusCounts[s] !== undefined && (
                                    <span style={{
                                        ...styles.filterCount,
                                        backgroundColor: filter === s ? "rgba(255,255,255,0.2)" : "#d0d0d0",
                                        color: filter === s ? "#ffffff" : "#495057",
                                    }}>
                                        {statusCounts[s] ?? 0}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </header>

                <input
                    type="text"
                    placeholder="Search by customer name, email, or order #..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={styles.searchInput}
                />

                {loading && <p style={styles.loading}>Loading orders...</p>}
                {error && <div style={styles.errorBox}>{error}</div>}

                {!loading && !error && visibleOrders.length === 0 && (
                    <div style={styles.empty}>
                        {search.trim() ? "No orders match your search." : "No orders match the selected filter."}
                    </div>
                )}

                {!loading && !error && visibleOrders.length > 0 && (
                    <div style={styles.tableWrap}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Order #</th>
                                    <th style={styles.th}>Customer</th>
                                    <th style={styles.th}>Address</th>
                                    <th style={styles.th}>Subtotal</th>
                                    <th style={styles.th}>Weight</th>
                                    <th style={styles.th}>Payment</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Trip</th>
                                    <th style={styles.th}>Date</th>
                                    <th style={styles.th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleOrders.map((o) => (
                                    <tr key={o.order_id}>
                                        <td style={styles.td}>#{o.order_id}</td>
                                        <td style={styles.td}>
                                            <div style={styles.customerName}>{o.customer.username}</div>
                                            <div style={styles.customerEmail}>{o.customer.email}</div>
                                        </td>
                                        <td style={styles.td}>
                                            {o.address.city
                                                ? `${o.address.street}, ${o.address.city}, ${o.address.state} ${o.address.zip}`
                                                : o.address.street || "—"}
                                        </td>
                                        <td style={styles.td}>${o.subtotal.toFixed(2)}</td>
                                        <td style={styles.td}>{o.total_weight.toFixed(1)} lbs</td>
                                        <td style={styles.td}>{o.payment_status || "—"}</td>
                                        <td style={styles.td}>
                                            <span style={styles[`status_${o.status}` as keyof typeof styles] || styles.statusGeneric}>
                                                {STATUS_LABELS[o.status] ?? o.status}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            {o.trip_id ? `#${o.trip_id}` : "—"}
                                        </td>
                                        <td style={styles.td}>
                                            {o.order_date ? new Date(o.order_date).toLocaleString() : "—"}
                                        </td>
                                        <td style={styles.td}>
                                            <Link to={`/admin/orders/${o.order_id}`} style={styles.viewLink}>
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    page: { minHeight: "100vh", backgroundColor: "#f5f7fb" },
    main: { maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem 3rem" },
    header: {
        padding: "2rem",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        marginBottom: "1.5rem",
    },
    searchInput: {
        width: "100%",
        padding: "0.85rem 1rem",
        border: "1px solid #ced4da",
        borderRadius: 8,
        fontSize: "0.95rem",
        marginBottom: "1rem",
        boxSizing: "border-box",
    },
    filterCount: {
        marginLeft: "0.4rem",
        padding: "0.1rem 0.45rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 700,
    },
    eyebrow: {
        letterSpacing: "0.3em",
        textTransform: "uppercase",
        fontSize: "0.75rem",
        color: "#40916c",
        marginBottom: "0.5rem",
    },
    title: { margin: 0, fontSize: "2rem", color: "#1b4332" },
    subtitle: { marginTop: "0.5rem", color: "#495057" },
    filterRow: { marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" },
    filterButton: {
        padding: "0.5rem 1rem",
        border: "none",
        borderRadius: 999,
        fontWeight: 600,
        fontSize: "0.85rem",
        cursor: "pointer",
    },
    loading: { color: "#6c757d", textAlign: "center", padding: "2rem" },
    errorBox: {
        padding: "1rem",
        backgroundColor: "#ffe3e3",
        color: "#a4161a",
        borderRadius: 8,
    },
    empty: {
        padding: "3rem",
        textAlign: "center",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        color: "#6c757d",
    },
    tableWrap: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        overflowX: "auto",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
        backgroundColor: "#1b4332",
        color: "#ffffff",
        padding: "0.75rem 1rem",
        textAlign: "left",
        fontWeight: 600,
        fontSize: "0.85rem",
        whiteSpace: "nowrap",
    },
    td: {
        padding: "0.75rem 1rem",
        borderBottom: "1px solid #e9ecef",
        fontSize: "0.9rem",
        color: "#333",
        verticalAlign: "top",
    },
    customerName: { fontWeight: 600, color: "#1b4332" },
    customerEmail: { fontSize: "0.8rem", color: "#6c757d" },
    statusGeneric: {
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: "#e9ecef",
        color: "#495057",
    },
    status_INPROGRESS: {
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: "#fff3cd",
        color: "#856404",
    },
    status_PAID: {
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: "#e2eafc",
        color: "#1d3557",
    },
    status_DISPATCHED: {
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: "#ffe8cc",
        color: "#7d4e00",
    },
    status_DELIVERED: {
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: "#d8f3dc",
        color: "#1b4332",
    },
    status_REFUNDED: {
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: "#e2e3e5",
        color: "#495057",
    },
    status_VOID: {
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: "#f8d7da",
        color: "#721c24",
    },
    viewLink: {
        backgroundColor: "#1b4332",
        color: "#ffffff",
        padding: "0.45rem 0.9rem",
        borderRadius: 6,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: "0.85rem",
    },
};

export default AdminOrders;
