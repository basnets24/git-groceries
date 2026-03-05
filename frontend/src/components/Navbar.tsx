import React from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/" style={styles.brand}>
          OFS
        </Link>
        <div style={styles.navLinks}>
          <Link to="/delivery" style={styles.link}>
            Delivery
          </Link>
          <Link to="/catalog" style={styles.link}>
            Catalog
          </Link>
          <Link to="/cart" style={styles.link}>
            Cart
          </Link>
          <Link to="/orders" style={styles.link}>
            Orders
          </Link>
          <Link to="/about" style={styles.link}>
            About
          </Link>
          <div style={styles.authLinks}>
            <Link to="/login" style={styles.loginLink}>
              Login
            </Link>
            <Link to="/register" style={styles.registerLink}>
              Register
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  navbar: {
    backgroundColor: "#2d6a4f",
    padding: "1rem 0",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#ffffff",
    textDecoration: "none",
    letterSpacing: "2px",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  link: {
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: 500,
    transition: "color 0.2s ease",
  },
  authLinks: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginLeft: "1rem",
  },
  loginLink: {
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: 500,
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "1px solid #ffffff",
    transition: "all 0.2s ease",
  },
  registerLink: {
    color: "#2d6a4f",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: 600,
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    backgroundColor: "#ffffff",
    transition: "all 0.2s ease",
  },
};

export default Navbar;
