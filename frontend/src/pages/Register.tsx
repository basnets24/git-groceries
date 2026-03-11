import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Account created! Please login.");
        window.location.href = "/login";
      } else {
        alert(data.error || "Registration failed");
      }

    } catch (error) {
      console.error(error);
      alert("Server error. Please try again later.");
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <h2 style={styles.title}>Create Account</h2>
            
            <div style={styles.field}>
              <label htmlFor="username" style={styles.label}>
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="password" style={styles.label}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="confirmPassword" style={styles.label}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                style={styles.input}
                required
              />
            </div>

            <button type="submit" style={styles.button}>
              Sign Up
            </button>

            <p style={styles.loginText}>
              Already have an account?{" "}
              <Link to="/login" style={styles.loginLink}>
                Sign in
              </Link>
            </p>
          </form>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  },
  container: {
    width: "100%",
    maxWidth: "450px",
  },
  form: {
    backgroundColor: "#ffffff",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  title: {
    textAlign: "center",
    marginBottom: "1.5rem",
    color: "#1b4332",
    fontSize: "1.75rem",
    fontWeight: 700,
  },
  field: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: 600,
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "0.875rem",
    backgroundColor: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  loginText: {
    textAlign: "center",
    marginTop: "1.5rem",
    color: "#6c757d",
    fontSize: "0.95rem",
  },
  loginLink: {
    color: "#2d6a4f",
    textDecoration: "none",
    fontWeight: 600,
  },
};

export default Register;
