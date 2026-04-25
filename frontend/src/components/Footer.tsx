import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.section}>
          <h3 style={styles.heading}>OFS - Organic Food Store</h3>
          <p style={styles.text}>Downtown San Jose, CA</p>
          <p style={styles.text}>1 Washington Sq, San Jose, CA 95192</p>
        </div>
        <div style={styles.section}>
          <h4 style={styles.subHeading}>Quick Links</h4>
          <div style={styles.links}>
            <Link to="/catalog" style={styles.link}>
              Catalog
            </Link>
            <Link to="/about" style={styles.link}>
              About Us
            </Link>
            <Link to="/delivery" style={styles.link}>
              Delivery Info
            </Link>
          </div>
        </div>
        <div style={styles.section}>
          <h4 style={styles.subHeading}>Contact</h4>
          <p style={styles.text}>Email: support@ofs.com</p>
          <p style={styles.text}>Phone: (123) 456-7891</p>
        </div>
        <div style={styles.section}>
          <h4 style={styles.subHeading}>Follow Us</h4>
          <div style={styles.socialLinks}>
            <span style={styles.socialIcon}>Facebook</span>
            <span style={styles.socialIcon}>Twitter</span>
            <span style={styles.socialIcon}>Instagram</span>
          </div>
        </div>
      </div>
      <div style={styles.bottomBar}>
        <p style={styles.copyright}>
          &copy; {new Date().getFullYear()} OFS - Organic Food Store. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  footer: {
    backgroundColor: "#1b4332",
    color: "#ffffff",
    padding: "2rem 0 0 0",
    marginTop: "auto",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "2rem",
  },
  section: {
    marginBottom: "1rem",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: "0.75rem",
    color: "#95d5b2",
  },
  subHeading: {
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
    color: "#95d5b2",
  },
  text: {
    fontSize: "0.9rem",
    color: "#d8f3dc",
    marginBottom: "0.5rem",
    lineHeight: 1.5,
  },
  links: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  link: {
    color: "#d8f3dc",
    textDecoration: "none",
    fontSize: "0.9rem",
    transition: "color 0.2s ease",
  },
  socialLinks: {
    display: "flex",
    gap: "1rem",
  },
  socialIcon: {
    color: "#d8f3dc",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  bottomBar: {
    borderTop: "1px solid #2d6a4f",
    marginTop: "2rem",
    padding: "1rem",
    textAlign: "center",
  },
  copyright: {
    fontSize: "0.85rem",
    color: "#95d5b2",
    margin: 0,
  },
};

export default Footer;
