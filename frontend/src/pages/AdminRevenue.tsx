import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

type Period = "daily" | "weekly" | "all_time";

interface PeriodStats {
  revenue: number;
  order_count: number;
  avg_order_value: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  units_sold: number;
}

interface Transaction {
  payment_id: number;
  amount: number;
  occurred_at: string | null;
  order_id: number;
  customer: string;
}

interface RevenueData {
  summary: Record<Period, PeriodStats>;
  top_products: TopProduct[];
  recent_transactions: Transaction[];
}

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Today",
  weekly: "Last 7 days",
  all_time: "All time",
};

const AdminRevenue: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("daily");

  useEffect(() => {
    if (authLoading) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    fetch("/api/admin/revenue", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.json().catch(() => ({}));
          throw new Error(msg?.error || `Request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((d: RevenueData) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authLoading]);

  if (!authLoading && (!user || user.role === "CUSTOMER")) {
    return <Navigate to="/" replace />;
  }

  const stats = data?.summary[period];

  const maxProductRevenue =
    data && data.top_products.length > 0
      ? Math.max(...data.top_products.map((p) => p.revenue))
      : 1;

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Admin · Revenue</p>
            <h1 style={styles.title}>Revenue Tracker</h1>
            <p style={styles.subtitle}>
              Completed-payment earnings, top sellers, and recent transactions.
            </p>
          </div>
          <Link to="/admin" style={styles.backLink}>← Dashboard</Link>
        </header>

        {loading && <p style={styles.loading}>Loading revenue data...</p>}
        {error && <div style={styles.errorBox}>{error}</div>}

        {!loading && !error && data && (
          <>
            {/* Period selector + KPI strip */}
            <section style={styles.kpiSection}>
              <div style={styles.periodRow}>
                {(["daily", "weekly", "all_time"] as Period[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    style={{
                      ...styles.periodBtn,
                      ...(period === p ? styles.periodBtnActive : {}),
                    }}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>

              <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                  <p style={styles.kpiLabel}>Revenue</p>
                  <p style={styles.kpiValue}>
                    ${stats!.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div style={styles.kpiCard}>
                  <p style={styles.kpiLabel}>Orders</p>
                  <p style={styles.kpiValue}>{stats!.order_count.toLocaleString()}</p>
                </div>
                <div style={styles.kpiCard}>
                  <p style={styles.kpiLabel}>Avg order value</p>
                  <p style={styles.kpiValue}>
                    ${stats!.avg_order_value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </section>

            {/* Top products */}
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>Top products by revenue</h2>
              <p style={styles.panelSub}>All-time rankings from completed payments.</p>
              {data.top_products.length === 0 ? (
                <p style={styles.empty}>No product data yet.</p>
              ) : (
                <div style={styles.productList}>
                  {data.top_products.map((product, i) => (
                    <div key={product.name} style={styles.productRow}>
                      <div style={styles.productRank}>#{i + 1}</div>
                      <div style={styles.productInfo}>
                        <p style={styles.productName}>{product.name}</p>
                        <div style={styles.barTrack}>
                          <div
                            style={{
                              ...styles.barFill,
                              width: `${(product.revenue / maxProductRevenue) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div style={styles.productStats}>
                        <p style={styles.productRevenue}>
                          ${product.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p style={styles.productUnits}>{product.units_sold} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent transactions */}
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>Recent transactions</h2>
              <p style={styles.panelSub}>Last 15 completed payments, newest first.</p>
              {data.recent_transactions.length === 0 ? (
                <p style={styles.empty}>No transactions yet.</p>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Payment #</th>
                        <th style={styles.th}>Order #</th>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_transactions.map((tx) => (
                        <tr key={tx.payment_id}>
                          <td style={styles.td}>#{tx.payment_id}</td>
                          <td style={styles.td}>
                            <Link to={`/admin/orders/${tx.order_id}`} style={styles.orderLink}>
                              #{tx.order_id}
                            </Link>
                          </td>
                          <td style={styles.td}>{tx.customer}</td>
                          <td style={styles.td}>
                            ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={styles.td}>
                            {tx.occurred_at ? new Date(tx.occurred_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  page: { minHeight: "100vh", backgroundColor: "#f5f7fb" },
  main: { maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem 3rem" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1.5rem",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  eyebrow: {
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    fontSize: "0.75rem",
    color: "#40916c",
    marginBottom: "0.5rem",
  },
  title: { margin: 0, fontSize: "2.25rem", color: "#1b4332" },
  subtitle: { marginTop: "0.5rem", color: "#495057", lineHeight: 1.5 },
  backLink: {
    alignSelf: "flex-start",
    textDecoration: "none",
    color: "#40916c",
    fontWeight: 600,
    whiteSpace: "nowrap",
    marginTop: "0.25rem",
  },
  loading: { marginTop: "2rem", color: "#6c757d" },
  errorBox: {
    marginTop: "2rem",
    padding: "1rem",
    backgroundColor: "#ffe3e3",
    color: "#a4161a",
    borderRadius: "8px",
    fontWeight: 500,
  },
  kpiSection: {
    marginTop: "2rem",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  periodRow: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  periodBtn: {
    padding: "0.5rem 1.1rem",
    borderRadius: "999px",
    border: "1px solid #ced4da",
    backgroundColor: "#f8f9fa",
    color: "#495057",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  periodBtnActive: {
    backgroundColor: "#1b4332",
    color: "#ffffff",
    border: "1px solid #1b4332",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
  },
  kpiCard: {
    padding: "1.25rem 1.5rem",
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
    border: "1px solid #e9ecef",
  },
  kpiLabel: { margin: "0 0 0.4rem", fontSize: "0.8rem", color: "#6c757d", textTransform: "uppercase", letterSpacing: "0.1em" },
  kpiValue: { margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#1b4332" },
  panel: {
    marginTop: "2rem",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  panelTitle: { margin: 0, fontSize: "1.25rem", color: "#1b4332" },
  panelSub: { margin: "-0.75rem 0 0", color: "#6c757d", fontSize: "0.9rem" },
  empty: { color: "#6c757d" },
  productList: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  productRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  productRank: {
    minWidth: "2rem",
    fontWeight: 700,
    color: "#adb5bd",
    fontSize: "0.9rem",
  },
  productInfo: { flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" },
  productName: { margin: 0, fontWeight: 600, color: "#1b4332" },
  barTrack: { height: "6px", backgroundColor: "#e9ecef", borderRadius: "999px", overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#40916c", borderRadius: "999px" },
  productStats: { textAlign: "right", minWidth: "100px" },
  productRevenue: { margin: 0, fontWeight: 700, color: "#1b4332" },
  productUnits: { margin: 0, fontSize: "0.8rem", color: "#6c757d" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    borderBottom: "2px solid #e9ecef",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "0.85rem 1rem",
    borderBottom: "1px solid #f1f3f5",
    color: "#212529",
    fontSize: "0.95rem",
  },
  orderLink: { color: "#40916c", fontWeight: 600, textDecoration: "none" },
};

export default AdminRevenue;
