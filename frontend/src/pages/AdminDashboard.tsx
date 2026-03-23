import React from "react";
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
