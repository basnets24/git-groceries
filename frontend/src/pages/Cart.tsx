import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface CartItem {
  order_id: number;
  product_id: number;
  name: string;
  price: number;
  category: string;
  quantity: number;
  price_at_checkout: number;
}

const CUSTOMER_ID = 1;

const Cart: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    try {
      const response = await fetch(`/api/cart/${CUSTOMER_ID}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }
      const data = await response.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const total = items.reduce(
    (sum, item) => sum + item.price_at_checkout * item.quantity,
    0
  );

  return (
    <div style={styles.pageContainer}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.pageTitle}>Shopping Cart</h1>

          {loading && (
            <div style={styles.loadingContainer}>
              <p style={styles.loadingText}>Loading cart...</p>
            </div>
          )}

          {error && (
            <div style={styles.errorContainer}>
              <p style={styles.errorText}>Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                style={styles.retryButton}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div style={styles.emptyCard}>
              <p style={styles.emptyTitle}>Your cart is empty</p>
              <p style={styles.emptySubtext}>
                Browse our catalog and add some products!
              </p>
              <Link to="/catalog" style={styles.shopLink}>
                Shop Now
              </Link>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Qty</th>
                      <th style={styles.th}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.product_id} style={styles.tableRow}>
                        <td style={styles.td}>{item.name}</td>
                        <td style={styles.td}>
                          <span style={styles.categoryBadge}>
                            {item.category}
                          </span>
                        </td>
                        <td style={styles.td}>
                          ${item.price_at_checkout.toFixed(2)}
                        </td>
                        <td style={styles.td}>{item.quantity}</td>
                        <td style={styles.td}>
                          ${(item.price_at_checkout * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.totalCard}>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>
                    Items ({items.reduce((s, i) => s + i.quantity, 0)})
                  </span>
                  <span style={styles.totalValue}>${total.toFixed(2)}</span>
                </div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabelBold}>Total</span>
                  <span style={styles.totalValueBold}>${total.toFixed(2)}</span>
                </div>
              </div>

              <div style={styles.deliverySection}>
                <h2 style={styles.deliverySectionTitle}>Delivery Options</h2>
                <p style={styles.deliveryText}>
                  Track your delivery in real-time with our automated delivery
                  bots.
                </p>
                <Link to="/delivery-bots" style={styles.deliveryBotsLink}>
                  View Delivery Bots
                </Link>
              </div>
            </>
          )}
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
    maxWidth: "900px",
    margin: "0 auto",
  },
  pageTitle: {
    fontSize: "2.25rem",
    fontWeight: 700,
    color: "#1b4332",
    textAlign: "center",
    marginBottom: "2rem",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "4rem",
  },
  loadingText: {
    color: "#6c757d",
    fontSize: "1rem",
  },
  errorContainer: {
    textAlign: "center",
    padding: "4rem",
  },
  errorText: {
    color: "#dc3545",
    fontSize: "1.1rem",
    marginBottom: "1rem",
  },
  retryButton: {
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  emptyCard: {
    textAlign: "center",
    padding: "4rem 2rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },
  emptyTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1b4332",
    marginBottom: "0.5rem",
  },
  emptySubtext: {
    fontSize: "1rem",
    color: "#6c757d",
    marginBottom: "1.5rem",
  },
  shopLink: {
    display: "inline-block",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1rem",
  },
  tableContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "1rem",
    textAlign: "left",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  td: {
    padding: "1rem",
    borderBottom: "1px solid #e9ecef",
    fontSize: "0.95rem",
    color: "#333",
  },
  tableRow: {
    backgroundColor: "#ffffff",
  },
  categoryBadge: {
    display: "inline-block",
    backgroundColor: "#d8f3dc",
    color: "#2d6a4f",
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  totalCard: {
    marginTop: "1.5rem",
    padding: "1.5rem",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
  },
  totalLabel: {
    fontSize: "1rem",
    color: "#6c757d",
  },
  totalValue: {
    fontSize: "1rem",
    color: "#333",
  },
  totalLabelBold: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#1b4332",
  },
  totalValueBold: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#2d6a4f",
  },
  deliverySection: {
    marginTop: "1.5rem",
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
