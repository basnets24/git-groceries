import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface Order {
  order_id: number;
  status: string;
  total_amount: number;
  order_date: string;
  items: { quantity: number; name: string }[];
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

// ── Static data ───────────────────────────────────────────────────────────────

const GUEST_CATEGORIES = [
  { name: "Fruits",     description: "Fresh seasonal fruits" },
  { name: "Vegetables", description: "Farm-fresh vegetables" },
  { name: "Dairy",      description: "Milk, cheese & eggs" },
  { name: "Meat",       description: "Premium quality meats" },
  { name: "Bakery",     description: "Fresh baked goods" },
  { name: "Beverages",  description: "Juices & drinks" },
];

const BENEFITS = [
  { label: "100% Organic",               description: "No pesticides" },
  { label: "Local Farmers",              description: "Sourced from nearby farms" },
  { label: "Eco-Friendly",               description: "Sustainable packaging" },
  { label: "Free Delivery Under 20 lbs", description: "No fees on light orders" },
  { label: "Real-Time Bot Tracking",     description: "Watch your order arrive live" },
  { label: "Same-Day Delivery",          description: "Order by noon, get it today" },
];

const ORDER_STEPS = [
  { step: 1, title: "Browse Products",    description: "Explore our wide selection of organic products in the catalog" },
  { step: 2, title: "Add to Cart",        description: "Select your items and add them to your shopping cart" },
  { step: 3, title: "Checkout & Deliver", description: "Complete your order and we'll deliver fresh to your door" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatDaysSince(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return months === 1 ? "about a month" : `${months} months`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DeliveryNudgeProps {
  lastDeliveryDate: string | null;
  hasAnyOrder: boolean;
}

const DeliveryNudge: React.FC<DeliveryNudgeProps> = ({ lastDeliveryDate, hasAnyOrder }) => {
  const days = lastDeliveryDate ? daysSince(lastDeliveryDate) : null;

  if (days !== null && days >= 3) {
    return (
      <section style={styles.nudgeSection}>
        <div style={styles.sectionContainer}>
          <p style={styles.nudgeText}>
            It's been <strong>{formatDaysSince(lastDeliveryDate!)}</strong> since your last delivery. Time to restock?
          </p>
          <Link to="/catalog" style={styles.shopButton}>Place an Order</Link>
        </div>
      </section>
    );
  }

  if (!hasAnyOrder) {
    return (
      <section style={styles.nudgeSection}>
        <div style={styles.sectionContainer}>
          <p style={styles.nudgeText}>First time ordering? Browse the catalog and update your profile to get started.</p>
          <div style={styles.nudgeActions}>
            <Link to="/catalog" style={styles.shopButton}>Browse Catalog</Link>
            <Link to="/profile" style={styles.nudgeSecondaryButton}>Update Profile</Link>
          </div>
        </div>
      </section>
    );
  }

  return null;
};

// ── Authenticated view ────────────────────────────────────────────────────────

const AuthenticatedHome: React.FC = () => {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders]       = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading]     = useState(true);
  const [apiCategories, setApiCategories]     = useState<Category[]>([]);
  const [lastDeliveryDate, setLastDeliveryDate] = useState<string | null>(null);
  const [hasAnyOrder, setHasAnyOrder]         = useState(false);

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setOrdersLoading(false); return; }
    try {
      const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const orders: Order[] = data.orders;
      setRecentOrders(orders.slice(0, 3));
      setHasAnyOrder(orders.length > 0);
      // /api/orders only returns COMPLETED orders; first item is most recent delivery
      setLastDeliveryDate(orders[0]?.order_date ?? null);
    } catch {
      // silently ignore
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setApiCategories(data.categories ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchCategories();
  }, [fetchOrders, fetchCategories]);

  return (
    <div style={styles.pageContainer}>
      <Navbar />

      <section style={styles.welcomeBanner}>
        <div style={styles.sectionContainer}>
          <h1 style={styles.welcomeTitle}>Welcome back, {user?.username}!</h1>
          <p style={styles.welcomeSubtitle}>What are you shopping for today?</p>
          <Link to="/catalog" style={styles.shopButton}>Browse Catalog</Link>
        </div>
      </section>

      {!ordersLoading && (
        <DeliveryNudge lastDeliveryDate={lastDeliveryDate} hasAnyOrder={hasAnyOrder} />
      )}

      <section style={styles.section}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Browse by Category</h2>
            <Link to="/catalog" style={styles.seeAllLink}>See all →</Link>
          </div>
          <div style={styles.categoriesGrid}>
            {apiCategories.map((cat) => (
              <Link to={`/catalog?categories=${cat.id}`} key={cat.id} style={styles.categoryCard}>
                <h3 style={styles.categoryName}>{cat.name}</h3>
                {cat.description && <p style={styles.categoryDescription}>{cat.description}</p>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.ordersSection}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent Orders</h2>
            <Link to="/orders" style={styles.seeAllLink}>See all →</Link>
          </div>
          {ordersLoading ? (
            <p style={styles.mutedText}>Loading orders...</p>
          ) : recentOrders.length === 0 ? (
            <div style={styles.emptyOrders}>
              <p style={styles.mutedText}>No orders yet.</p>
              <Link to="/catalog" style={styles.shopButton}>Start Shopping</Link>
            </div>
          ) : (
            <div style={styles.ordersGrid}>
              {recentOrders.map((order) => (
                <div key={order.order_id} style={styles.orderCard}>
                  <div style={styles.orderCardHeader}>
                    <span style={styles.orderIdText}>Order #{order.order_id}</span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: order.status === "COMPLETED" ? "#d4edda" : "#fff3cd",
                      color:           order.status === "COMPLETED" ? "#155724" : "#856404",
                    }}>
                      {order.status}
                    </span>
                  </div>
                  <p style={styles.orderItems}>
                    {order.items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    {order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}
                  </p>
                  <div style={styles.orderCardFooter}>
                    <span style={styles.orderTotal}>${order.total_amount.toFixed(2)}</span>
                    <span style={styles.orderDate}>
                      {new Date(order.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

// ── Guest view ────────────────────────────────────────────────────────────────

const GuestHome: React.FC = () => (
  <div style={styles.pageContainer}>
    <Navbar />

    <section style={styles.hero}>
      <div style={styles.heroContent}>
        <h1 style={styles.heroTitle}>Fresh Organic Food Delivered to Your Door</h1>
        <p style={styles.heroSubtitle}>OFS brings you the finest selection of locally sourced, organic produce.</p>
        <p style={styles.heroLocation}>Located in Downtown San Jose</p>
        <Link to="/catalog" style={styles.ctaButton}>Shop Now</Link>
      </div>
    </section>

    <section style={styles.instructionsSection}>
      <div style={styles.sectionContainer}>
        <h2 style={styles.sectionTitle}>How to Order</h2>
        <div style={styles.stepsGrid}>
          {ORDER_STEPS.map((item) => (
            <div key={item.step} style={styles.stepCard}>
              <div style={styles.stepNumber}>{item.step}</div>
              <h3 style={styles.stepTitle}>{item.title}</h3>
              <p style={styles.stepDescription}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section style={styles.section}>
      <div style={styles.sectionContainer}>
        <h2 style={styles.sectionTitle}>Browse by Category</h2>
        <div style={styles.categoriesGrid}>
          {GUEST_CATEGORIES.map((cat) => (
            <Link to="/catalog" key={cat.name} style={styles.categoryCard}>
              <h3 style={styles.categoryName}>{cat.name}</h3>
              <p style={styles.categoryDescription}>{cat.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>

    <section style={{ ...styles.infoBanner, paddingBottom: "4rem" }}>
      <div style={styles.sectionContainer}>
        <h2 style={styles.bannerTitle}>Why Choose OFS?</h2>
        <div style={styles.benefitsGrid}>
          {BENEFITS.map((b) => (
            <div key={b.label} style={styles.benefitCard}>
              <p style={styles.benefitCardTitle}>{b.label}</p>
              <p style={styles.benefitCardDesc}>{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section style={styles.coverageSection}>
      <div style={styles.sectionContainer}>
        <h2 style={styles.sectionTitle}>Delivery Coverage</h2>
        <p style={styles.coverageSubtitle}>We currently deliver within 10 miles of Downtown San Jose</p>
        <div style={styles.coverageCards}>
          <div style={styles.coverageCard}>
            <h3 style={styles.coverageCardTitle}>Coverage Area</h3>
            <p style={styles.coverageCardText}>Within 10 miles of Downtown San Jose, CA</p>
          </div>
          <div style={styles.coverageCard}>
            <h3 style={styles.coverageCardTitle}>Live Tracking</h3>
            <p style={styles.coverageCardText}>Track your robot delivery in real time.</p>
          </div>
          <div style={styles.coverageCard}>
            <h3 style={styles.coverageCardTitle}>Outside Our Zone?</h3>
            <p style={styles.coverageCardText}>We're expanding soon.</p>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

// ── Root component ────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <Navbar />
      </div>
    );
  }

  if (user && user.role !== "CUSTOMER") {
    return <Navigate to="/admin" replace />;
  }

  return user ? <AuthenticatedHome /> : <GuestHome />;
};

export default Home;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f8f9fa",
  },

  // Shared
  sectionContainer:  { maxWidth: "1200px", margin: "0 auto" },
  sectionTitle:      { fontSize: "2rem", fontWeight: 700, color: "#1b4332", marginBottom: "1.5rem", textAlign: "center" },
  sectionHeader:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  seeAllLink:        { color: "#2d6a4f", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" },
  section:           { padding: "1.5rem 1rem 3rem" },
  categoriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1.5rem",
    justifyContent: "center",
  },
  categoryCard: {
    backgroundColor: "#f0faf4", borderRadius: "12px", padding: "1.5rem",
    textAlign: "center", textDecoration: "none",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)", cursor: "pointer",
  },
  categoryName:        { fontSize: "1.25rem", fontWeight: 600, color: "#2d6a4f", marginBottom: "0.5rem" },
  categoryDescription: { fontSize: "1rem", color: "#6c757d", margin: 0 },

  // Nudge
  nudgeSection: { backgroundColor: "#d8f3dc", padding: "1.5rem 1rem", textAlign: "center" },
  nudgeText:    { fontSize: "1.05rem", color: "#1b4332", marginBottom: "1rem" },
  nudgeActions: { display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" as const },
  nudgeSecondaryButton: {
    display: "inline-block", backgroundColor: "transparent", color: "#2d6a4f",
    padding: "0.75rem 2rem", borderRadius: "4px", textDecoration: "none",
    fontWeight: 700, fontSize: "1rem", border: "2px solid #2d6a4f",
  },

  // Authenticated
  welcomeBanner:   { background: "linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)", padding: "2rem 1rem" },
  welcomeTitle:    { fontSize: "2rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" },
  welcomeSubtitle: { fontSize: "1.05rem", color: "#d8f3dc", marginBottom: "1.5rem" },
  shopButton: {
    display: "inline-block", backgroundColor: "#ffffff", color: "#2d6a4f",
    padding: "0.75rem 2rem", borderRadius: "4px", textDecoration: "none",
    fontWeight: 700, fontSize: "1rem",
  },
  ordersSection:   { padding: "1.5rem 1rem 2.5rem", backgroundColor: "#ffffff" },
  ordersGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" },
  orderCard: {
    border: "1px solid #e9ecef", borderRadius: "12px",
    padding: "1.25rem", backgroundColor: "#f8f9fa",
  },
  orderCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" },
  orderIdText:     { fontWeight: 600, color: "#1b4332", fontSize: "0.95rem" },
  statusBadge:     { padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 },
  orderItems:      { fontSize: "0.9rem", color: "#495057", marginBottom: "1rem", lineHeight: 1.4 },
  orderCardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderTotal:      { fontSize: "1.1rem", fontWeight: 700, color: "#2d6a4f" },
  orderDate:       { fontSize: "0.8rem", color: "#6c757d" },
  emptyOrders:     { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1rem" },
  mutedText:       { color: "#6c757d", fontSize: "0.95rem" },

  // Guest
  infoBanner:   { padding: "1.5rem 1rem 2.5rem", backgroundColor: "#ffffff" },
  bannerTitle:  { fontSize: "2rem", fontWeight: 700, color: "#1b4332", marginBottom: "2rem", textAlign: "center" },
  benefitsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1.25rem",
  },
  benefitCard: {
    backgroundColor: "#f0faf4", borderRadius: "12px", padding: "1.5rem",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
    borderLeft: "4px solid #2d6a4f",
  },
  benefitCardTitle: { fontSize: "1.15rem", fontWeight: 700, color: "#1b4332", margin: "0 0 0.4rem 0" },
  benefitCardDesc:  { fontSize: "0.9rem", color: "#6c757d", margin: 0 },
  hero:           { background: "linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)", padding: "2.5rem 1rem", textAlign: "center" },
  heroContent:    { maxWidth: "800px", margin: "0 auto" },
  heroTitle:      { fontSize: "2.5rem", fontWeight: 700, color: "#ffffff", marginBottom: "1rem", lineHeight: 1.2 },
  heroSubtitle:   { fontSize: "1.15rem", color: "#d8f3dc", marginBottom: "1rem", lineHeight: 1.6 },
  heroLocation:   { fontSize: "0.95rem", color: "#95d5b2", marginBottom: "2rem", fontStyle: "italic" },
  ctaButton: {
    display: "inline-block", backgroundColor: "#ffffff", color: "#2d6a4f",
    padding: "1rem 3rem", borderRadius: "4px", textDecoration: "none",
    fontWeight: 700, fontSize: "1.25rem", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
  },
  instructionsSection: { padding: "1.5rem 1rem 2.5rem", backgroundColor: "#ffffff" },
  coverageSection:     { padding: "1.5rem 1rem 4rem", backgroundColor: "#f8f9fa" },
  coverageSubtitle:    { textAlign: "center", color: "#6c757d", fontSize: "1.05rem", marginBottom: "2rem" },
  coverageCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  },
  coverageCard: {
    backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem",
    textAlign: "center", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },
  coverageCardTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#1b4332", marginBottom: "0.5rem" },
  coverageCardText:  { fontSize: "1rem", color: "#495057", lineHeight: 1.5, margin: 0 },
  stepsGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" },
  stepCard:       { textAlign: "center", padding: "1.5rem" },
  stepNumber: {
    width: "60px", height: "60px", backgroundColor: "#2d6a4f", color: "#ffffff",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.5rem", fontWeight: 700, margin: "0 auto 1rem",
  },
  stepTitle:       { fontSize: "1.4rem", fontWeight: 600, color: "#1b4332", marginBottom: "0.75rem" },
  stepDescription: { fontSize: "1.1rem", color: "#6c757d", lineHeight: 1.5 },
};
