import React, { useState } from "react";

const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: handle login
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Login</h2>
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
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  form: {
    backgroundColor: "#ffffff",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    width: "100%",
    maxWidth: "400px",
  },
  title: {
    textAlign: "center",
    marginBottom: "1.5rem",
    color: "#333",
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
    padding: "0.75rem",
    backgroundColor: "#4a90d9",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
};

export default Login;
