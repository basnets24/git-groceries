import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Cart: React.FC = () => {
  return (
    <div style={styles.pageContainer}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.pageTitle}>Shopping Cart</h1>
          <div style={styles.placeholder}>
            <p style={styles.text}>Your cart is empty</p>
            <p style={styles.subtext}>
              This page is under construction. Cart functionality coming soon!
            </p>
          </div>

          <div style={styles.deliverySection}>
            <h2 style={styles.deliverySectionTitle}>Delivery Options</h2>
            <p style={styles.deliveryText}>
              Track your delivery in real-time with our automated delivery bots.
            </p>
            <Link to="/delivery-bots" style={styles.deliveryBotsLink}>
              View Delivery Bots
            </Link>
          </div>
        </div>
      </main>
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
  main: {
    flex: 1,
    padding: "2rem 1rem",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  pageTitle: {
    fontSize: "2.25rem",
    fontWeight: 700,
    color: "#1b4332",
    textAlign: "center",
    marginBottom: "2rem",
  },
  placeholder: {
    textAlign: "center",
    padding: "4rem 2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },
  text: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1b4332",
    marginBottom: "0.5rem",
  },
  subtext: {
    fontSize: "1rem",
    color: "#6c757d",
  },
  deliverySection: {
    marginTop: "2rem",
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    textAlign: "center",
  },
  deliverySectionTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1b4332",
    marginBottom: "0.75rem",
  },
  deliveryText: {
    fontSize: "1rem",
    color: "#6c757d",
    marginBottom: "1rem",
  },
  deliveryBotsLink: {
    display: "inline-block",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1rem",
  },
};

export default Cart;
