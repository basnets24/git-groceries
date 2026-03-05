import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const About: React.FC = () => {
  return (
    <div style={styles.pageContainer}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.pageTitle}>About OFS</h1>
          <div style={styles.placeholder}>
            <p style={styles.text}>Organic Food Store</p>
            <p style={styles.subtext}>
              This page is under construction. Company information coming soon!
            </p>
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
};

export default About;
