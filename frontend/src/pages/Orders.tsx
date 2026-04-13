import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

interface OrderItem {
  quantity: number;
  name: string;
  weight: string;
}

interface Order {
  order_id: number;
  status: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  total_amount: number;
  payment_status: string;
  order_date: string;
  items: OrderItem[];
}

const Orders: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const customerId = user?.customerID;

  const fetchOrders = useCallback(async () => {
    if (!customerId) {
      setError("You need to be signed in to view your orders.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await response.text();

      if (!response.ok) {
        console.error("Backend error:", text);
        throw new Error(`Error ${response.status}: ${text}`);
      }

      const data = JSON.parse(text);
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!authLoading) {
      fetchOrders();
    }
  }, [authLoading, fetchOrders]);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.pageContainer}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.pageTitle}>My Orders</h1>

          {loading && (
            <div style={styles.loadingContainer}>
              <p style={styles.loadingText}>Loading orders...</p>
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

          {!loading && !error && orders.length === 0 && (
            <div style={styles.emptyCard}>
              <p style={styles.emptyTitle}>No orders yet</p>
              <p style={styles.emptySubtext}>
                Your completed orders will appear here. Start shopping to place your first order!
              </p>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div style={styles.ordersList}>
              {orders.map((order) => (
                <div key={order.order_id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <div style={styles.orderInfo}>
                      <h3 style={styles.orderId}>Order #{order.order_id}</h3>
                      <p style={styles.orderDate}>
                        {order.order_date
                          ? new Date(order.order_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                          : "No date"}
                      </p>
                    </div>
                    <div style={styles.orderStatus}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: order.status === "COMPLETED" ? "#d4edda" : "#fff3cd",
                        color: order.status === "COMPLETED" ? "#155724" : "#856404",
                      }}>
                        {order.status}
                      </span>
                      <span style={{
                        ...styles.paymentBadge,
                        backgroundColor: order.payment_status === "SUCCESS" ? "#d4edda" : "#f8d7da",
                        color: order.payment_status === "SUCCESS" ? "#155724" : "#721c24",
                      }}>
                        Payment: {order.payment_status}
                      </span>
                    </div>
                  </div>

                  <div style={styles.orderDetails}>
                    <div style={styles.addressSection}>
                      <h4 style={styles.sectionTitle}>Delivery Address</h4>
                      <p style={styles.address}>
                        {order.address.street}<br />
                        {order.address.city}, {order.address.state} {order.address.zip}
                      </p>
                    </div>

                    <div style={styles.itemsSection}>
                      <h4 style={styles.sectionTitle}>Items</h4>
                      <div style={styles.itemsList}>
                        {order.items.map((item, index) => (
                          <div key={index} style={styles.itemRow}>
                            <span style={styles.itemName}>
                              {item.quantity}x {item.name}
                            </span>
                            <span style={styles.itemWeight}>({item.weight})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={styles.totalSection}>
                      <p style={styles.totalAmount}>
                        Total: ${order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
  },
  ordersList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    padding: "2rem",
  },
  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #e9ecef",
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#1b4332",
    margin: "0 0 0.5rem 0",
  },
  orderDate: {
    fontSize: "0.9rem",
    color: "#6c757d",
    margin: 0,
  },
  orderStatus: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.5rem",
  },
  statusBadge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  paymentBadge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  orderDetails: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: "2rem",
  },
  addressSection: {
    gridColumn: "1 / 2",
  },
  itemsSection: {
    gridColumn: "2 / 3",
  },
  totalSection: {
    gridColumn: "3 / 4",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1b4332",
    margin: "0 0 0.75rem 0",
  },
  address: {
    fontSize: "0.9rem",
    color: "#495057",
    lineHeight: "1.4",
    margin: 0,
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: "0.9rem",
    color: "#495057",
  },
  itemWeight: {
    fontSize: "0.8rem",
    color: "#6c757d",
  },
  totalAmount: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#2d6a4f",
    margin: 0,
  },
};

export default Orders;
