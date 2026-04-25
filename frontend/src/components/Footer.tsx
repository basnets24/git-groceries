import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <span style={styles.brandName}>OFS</span>
        <span style={styles.divider}>·</span>
        <span style={styles.brandAddress}>1 Washington Sq, Downtown San Jose, CA 95192</span>
        <span style={styles.divider}>·</span>
        <Link to="/catalog" style={styles.link}>Catalog</Link>
        <Link to="/about" style={styles.link}>About</Link>
        <Link to="/delivery" style={styles.link}>Delivery</Link>
        <span style={styles.divider}>·</span>
        <span style={styles.contact}>support@ofs.com</span>
        <span style={styles.contact}>(123) 456-7891</span>
        <span style={styles.divider}>·</span>
        <span style={styles.social}>Facebook</span>
        <span style={styles.social}>Instagram</span>
      </div>
      <div style={styles.bottomBar}>
        <p style={styles.copyright}>
          &copy; {new Date().getFullYear()} OFS - Organic Food Store. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  footer: {
    backgroundColor: "#1b4332",
    marginTop: "auto",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "1.25rem 1rem",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  brandName: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#95d5b2",
    letterSpacing: "2px",
  },
  brandAddress: {
    fontSize: "0.9rem",
    color: "#d8f3dc",
  },
  link: {
    color: "#d8f3dc",
    textDecoration: "none",
    fontSize: "0.9rem",
  },
  contact: {
    color: "#d8f3dc",
    fontSize: "0.9rem",
  },
  social: {
    color: "#d8f3dc",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  divider: {
    color: "#40916c",
    fontSize: "1rem",
  },
  bottomBar: {
    borderTop: "1px solid #2d6a4f",
    padding: "0.5rem 1rem",
    textAlign: "center",
  },
  copyright: {
    fontSize: "0.82rem",
    color: "#95d5b2",
    margin: 0,
  },
};

export default Footer;
