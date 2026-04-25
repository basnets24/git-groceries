import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useAuth } from "./context/AuthContext";

const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setSession } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          emailOrUsername,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSession(data.token, {
          customerID: data.customerID,
          username: data.username,
          role: data.role
        });

        setSuccess(`Welcome ${data.username}! Redirecting...`);
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        setError(data.error || "Login failed. Try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Server error. Try again.");
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <h2 style={styles.title}>Sign In</h2>
            {error && <div style={styles.errorBox}>{error}</div>}
            {success && <div style={styles.successBox}>{success}</div>}
            <div style={styles.field}>
              <label htmlFor="emailOrUsername" style={styles.label}>
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Enter your email or username"
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={styles.input}
                required
              />
            </div>
            <button type="submit" style={styles.button}>
              Sign In
            </button>
            <p style={styles.registerText}>
              Don't have an account?{" "}
              <Link to="/register" style={styles.registerLink}>
                Sign up
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
  errorBox: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "0.75rem",
    borderRadius: "6px",
    marginBottom: "1.25rem",
    border: "1px solid #f5c6cb",
    textAlign: "center",
    fontSize: "0.95rem",
  },
  successBox: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "0.75rem",
    borderRadius: "6px",
    marginBottom: "1.25rem",
    border: "1px solid #c3e6cb",
    textAlign: "center",
    fontSize: "0.95rem",
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
    border: "1px solid #ced4da",
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
  registerText: {
    textAlign: "center",
    marginTop: "1.5rem",
    color: "#6c757d",
    fontSize: "0.95rem",
  },
  registerLink: {
    color: "#2d6a4f",
    textDecoration: "none",
    fontWeight: 600,
  },
};

export default Login;
