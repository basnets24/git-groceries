import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

interface Order {
  order_id: number;
  status: string;
  total_amount: number;
  order_date: string;
  items: { quantity: number; name: string }[];
}

const categories = [
  { name: "Fruits", description: "Fresh seasonal fruits" },
  { name: "Vegetables", description: "Farm-fresh vegetables" },
  { name: "Dairy", description: "Milk, cheese & eggs" },
  { name: "Meat", description: "Premium quality meats" },
  { name: "Bakery", description: "Fresh baked goods" },
  { name: "Beverages", description: "Juices & drinks" },
];

const authCategories = [
  { name: "Fresh Produce", description: "Fruits & farm-fresh vegetables", query: "?category=Fruits&category=Vegetables" },
  { name: "Dairy", description: "Milk, cheese & eggs", query: "?category=Dairy" },
  { name: "Meat", description: "Premium quality meats", query: "?category=Meat" },
  { name: "Bakery", description: "Fresh baked goods", query: "?category=Bakery" },
  { name: "Beverages", description: "Juices & drinks", query: "?category=Beverages" },
];

const orderSteps = [
  { step: 1, title: "Browse Products", description: "Explore our wide selection of organic products in the catalog" },
  { step: 2, title: "Add to Cart", description: "Select your items and add them to your shopping cart" },
  { step: 3, title: "Checkout & Deliver", description: "Complete your order and we'll deliver fresh to your door" },
];

const AuthenticatedHome: React.FC = () => {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const fetchRecentOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setRecentOrders(data.orders.slice(0, 3));
    } catch {
      // silently ignore
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);

  return (
    <div style={styles.pageContainer}>
      <Navbar />

      {/* Welcome Banner */}
      <section style={styles.welcomeBanner}>
        <div style={styles.sectionContainer}>
          <h1 style={styles.welcomeTitle}>Welcome back, {user?.username}!</h1>
          <p style={styles.welcomeSubtitle}>What are you shopping for today?</p>
          <Link to="/catalog" style={styles.shopButton}>Browse Catalog</Link>
        </div>
      </section>

      {/* Browse by Category */}
      <section style={styles.section}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Browse by Category</h2>
            <Link to="/catalog" style={styles.seeAllLink}>See all →</Link>
          </div>
          <div style={styles.categoriesGrid}>
            {authCategories.map((category) => (
              <Link to={`/catalog${category.query}`} key={category.name} style={styles.categoryCard}>
                <h3 style={styles.categoryName}>{category.name}</h3>
                <p style={styles.categoryDescription}>{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Orders */}
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
                      color: order.status === "COMPLETED" ? "#155724" : "#856404",
                    }}>{order.status}</span>
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

const GuestHome: React.FC = () => (
  <div style={styles.pageContainer}>
    <Navbar />

    {/* Hero Section */}
    <section style={styles.hero}>
      <div style={styles.heroContent}>
        <h1 style={styles.heroTitle}>Fresh Organic Food Delivered to Your Door</h1>
        <p style={styles.heroSubtitle}>
          OFS brings you the finest selection of locally sourced, organic produce.
        </p>
        <p style={styles.heroLocation}>Located in Downtown San Jose</p>
        <Link to="/catalog" style={styles.ctaButton}>Shop Now</Link>
      </div>
    </section>

    {/* How to Order Section */}
    <section style={styles.instructionsSection}>
      <div style={styles.sectionContainer}>
        <h2 style={styles.sectionTitle}>How to Order</h2>
        <div style={styles.stepsGrid}>
          {orderSteps.map((item) => (
            <div key={item.step} style={styles.stepCard}>
              <div style={styles.stepNumber}>{item.step}</div>
              <h3 style={styles.stepTitle}>{item.title}</h3>
              <p style={styles.stepDescription}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Browse by Category */}
    <section style={styles.section}>
      <div style={styles.sectionContainer}>
        <h2 style={styles.sectionTitle}>Browse by Category</h2>
        <div style={styles.categoriesGrid}>
          {categories.map((category) => (
            <Link to="/catalog" key={category.name} style={styles.categoryCard}>
              <h3 style={styles.categoryName}>{category.name}</h3>
              <p style={styles.categoryDescription}>{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* Why Choose OFS */}
    <section style={styles.infoBanner}>
      <div style={styles.sectionContainer}>
        <h2 style={styles.bannerTitle}>Why Choose OFS?</h2>
        <div style={styles.benefitsGrid}>
          {["100% Organic", "Local Farmers", "Eco-Friendly", "Free Delivery Under 20 lbs", "Real-Time Bot Tracking"].map((b) => (
            <div key={b} style={styles.benefitItem}>
              <span style={styles.benefitText}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

const Home: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <Navbar />
      </div>
    );
  }

  return user ? <AuthenticatedHome /> : <GuestHome />;
};

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f8f9fa",
  },

  // Guest styles
  hero: {
    background: "linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)",
    padding: "4rem 1rem",
    textAlign: "center",
  },
  heroContent: { maxWidth: "800px", margin: "0 auto" },
  heroTitle: { fontSize: "2.5rem", fontWeight: 700, color: "#ffffff", marginBottom: "1rem", lineHeight: 1.2 },
  heroSubtitle: { fontSize: "1.15rem", color: "#d8f3dc", marginBottom: "1rem", lineHeight: 1.6 },
  heroLocation: { fontSize: "0.95rem", color: "#95d5b2", marginBottom: "2rem", fontStyle: "italic" },
  ctaButton: {
    display: "inline-block",
    backgroundColor: "#ffffff",
    color: "#2d6a4f",
    padding: "1rem 3rem",
    borderRadius: "4px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "1.25rem",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
  },
  infoBanner: {
    padding: "3rem 1rem 5rem",
    backgroundColor: "#d8f3dc",
  },
  bannerTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#1b4332",
    marginBottom: "2rem",
    textAlign: "center",
  },
  benefitsGrid: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "2rem",
  },
  benefitItem: {
    display: "flex",
    alignItems: "center",
  },
  benefitText: {
    fontSize: "1.4rem",
    fontWeight: 600,
    color: "#2d6a4f",
  },
  heroBenefits: { display: "flex", flexWrap: "nowrap", justifyContent: "center", gap: "0.75rem", marginTop: "2rem" },
  heroBenefit: {
    backgroundColor: "#1b4332",
    color: "#ffffff",
    padding: "0.4rem 1rem",
    borderRadius: "50px",
    fontSize: "0.9rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  instructionsSection: { padding: "2rem 1rem 4rem", backgroundColor: "#ffffff" },
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" },
  stepCard: { textAlign: "center", padding: "1.5rem" },
  stepNumber: {
    width: "60px", height: "60px", backgroundColor: "#2d6a4f", color: "#ffffff",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.5rem", fontWeight: 700, margin: "0 auto 1rem",
  },
  stepTitle: { fontSize: "1.4rem", fontWeight: 600, color: "#1b4332", marginBottom: "0.75rem" },
  stepDescription: { fontSize: "1.1rem", color: "#6c757d", lineHeight: 1.5 },

  // Shared styles
  section: { padding: "2rem 1rem 6rem" },
  sectionContainer: { maxWidth: "1200px", margin: "0 auto" },
  sectionTitle: { fontSize: "2rem", fontWeight: 700, color: "#1b4332", marginBottom: "1.5rem", textAlign: "center" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  seeAllLink: { color: "#2d6a4f", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" },
  categoriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1.5rem",
    justifyContent: "center",
  },
  categoryCard: {
    backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem",
    textAlign: "center", textDecoration: "none",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)", cursor: "pointer",
  },
  categoryName: { fontSize: "1.25rem", fontWeight: 600, color: "#2d6a4f", marginBottom: "0.5rem" },
  categoryDescription: { fontSize: "1rem", color: "#6c757d", margin: 0 },

  // Authenticated styles
  welcomeBanner: {
    background: "linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)",
    padding: "3rem 1rem",
  },
  welcomeTitle: { fontSize: "2rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" },
  welcomeSubtitle: { fontSize: "1.05rem", color: "#d8f3dc", marginBottom: "1.5rem" },
  shopButton: {
    display: "inline-block",
    backgroundColor: "#ffffff",
    color: "#2d6a4f",
    padding: "0.75rem 2rem",
    borderRadius: "4px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "1rem",
  },
  ordersSection: { padding: "2rem 1rem 4rem", backgroundColor: "#ffffff" },
  ordersGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" },
  orderCard: {
    border: "1px solid #e9ecef", borderRadius: "12px",
    padding: "1.25rem", backgroundColor: "#f8f9fa",
  },
  orderCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" },
  orderIdText: { fontWeight: 600, color: "#1b4332", fontSize: "0.95rem" },
  statusBadge: { padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 },
  orderItems: { fontSize: "0.9rem", color: "#495057", marginBottom: "1rem", lineHeight: 1.4 },
  orderCardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderTotal: { fontSize: "1.1rem", fontWeight: 700, color: "#2d6a4f" },
  orderDate: { fontSize: "0.8rem", color: "#6c757d" },
  emptyOrders: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1rem" },
  mutedText: { color: "#6c757d", fontSize: "0.95rem" },
};

export default Home;
