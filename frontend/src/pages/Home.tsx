import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Home: React.FC = () => {
  const categories = [
    { name: "Fruits", description: "Fresh seasonal fruits" },
    { name: "Vegetables", description: "Farm-fresh vegetables" },
    { name: "Dairy", description: "Milk, cheese & eggs" },
    { name: "Meat", description: "Premium quality meats" },
    { name: "Bakery", description: "Fresh baked goods" },
    { name: "Beverages", description: "Juices & drinks" },
  ];

  const orderSteps = [
    {
      step: 1,
      title: "Browse Products",
      description: "Explore our wide selection of organic products in the catalog",
    },
    {
      step: 2,
      title: "Add to Cart",
      description: "Select your items and add them to your shopping cart",
    },
    {
      step: 3,
      title: "Checkout & Deliver",
      description: "Complete your order and we'll deliver fresh to your door",
    },
  ];

  return (
    <div style={styles.pageContainer}>
      <Navbar />
      
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Fresh Organic Food Delivered to Your Door</h1>
          <p style={styles.heroSubtitle}>
            OFS brings you the finest selection of locally sourced, organic produce.
            Supporting local farmers while delivering freshness straight to your table.
          </p>
          <Link to="/catalog" style={styles.ctaButton}>
            Shop Now
          </Link>
        </div>
      </section>

      {/* Food Categories Section */}
      <section style={styles.section}>
        <div style={styles.sectionContainer}>
          <h2 style={styles.sectionTitle}>Browse by Category</h2>
          <div style={styles.categoriesGrid}>
            {categories.map((category) => (
              <Link
                to="/catalog"
                key={category.name}
                style={styles.categoryCard}
              >
                <h3 style={styles.categoryName}>{category.name}</h3>
                <p style={styles.categoryDescription}>{category.description}</p>
              </Link>
            ))}
          </div>
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

      {/* Info Banner */}
      <section style={styles.infoBanner}>
        <div style={styles.sectionContainer}>
          <h2 style={styles.bannerTitle}>Why Choose OFS?</h2>
          <div style={styles.benefitsGrid}>
            <div style={styles.benefitItem}>
              <span style={styles.benefitText}>100% Organic</span>
            </div>
            <div style={styles.benefitItem}>
              <span style={styles.benefitText}>Fast Delivery</span>
            </div>
            <div style={styles.benefitItem}>
              <span style={styles.benefitText}>Local Farmers</span>
            </div>
            <div style={styles.benefitItem}>
              <span style={styles.benefitText}>Eco-Friendly</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f8f9fa",
  },
  hero: {
    background: "linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)",
    padding: "4rem 1rem",
    textAlign: "center",
  },
  heroContent: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  heroTitle: {
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "1rem",
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: "1.15rem",
    color: "#d8f3dc",
    marginBottom: "2rem",
    lineHeight: 1.6,
  },
  ctaButton: {
    display: "inline-block",
    backgroundColor: "#ffffff",
    color: "#2d6a4f",
    padding: "1rem 2.5rem",
    borderRadius: "50px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1.1rem",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
  },
  section: {
    padding: "4rem 1rem",
  },
  sectionContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  sectionTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#1b4332",
    textAlign: "center",
    marginBottom: "2.5rem",
  },
  categoriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1.5rem",
  },
  categoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1.5rem",
    textAlign: "center",
    textDecoration: "none",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer",
  },
  categoryName: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#2d6a4f",
    marginBottom: "0.5rem",
  },
  categoryDescription: {
    fontSize: "0.9rem",
    color: "#6c757d",
    margin: 0,
  },
  instructionsSection: {
    padding: "4rem 1rem",
    backgroundColor: "#ffffff",
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
  },
  stepCard: {
    textAlign: "center",
    padding: "1.5rem",
  },
  stepNumber: {
    width: "60px",
    height: "60px",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: 700,
    margin: "0 auto 1rem",
  },
  stepTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#1b4332",
    marginBottom: "0.75rem",
  },
  stepDescription: {
    fontSize: "1rem",
    color: "#6c757d",
    lineHeight: 1.5,
  },
  infoBanner: {
    padding: "3rem 1rem",
    backgroundColor: "#d8f3dc",
  },
  bannerTitle: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1b4332",
    textAlign: "center",
    marginBottom: "2rem",
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
    gap: "0.5rem",
  },
  benefitText: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#2d6a4f",
  },
};

export default Home;
