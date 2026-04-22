import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

interface CartItem {
  order_id: number;
  product_id: number;
  name: string;
  price: number;
  category: string;
  quantity: number;
  price_at_checkout: number;
  weight_at_checkout: number;
}

const Cart: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set());

  const customerId = user?.customerID;

  const fetchCart = useCallback(async () => {
    if (!customerId) {
      setError("You need to be signed in to view your cart.");
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
      const response = await fetch(`/api/cart/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
  }, [customerId]);

  useEffect(() => {
    if (!authLoading) {
      fetchCart();
    }
  }, [authLoading, fetchCart]);

  const handleQuantityChange = async (item: CartItem, delta: number) => {
    const currentQty = item.quantity;
    const newQty = currentQty + delta;

    // Prevent going below 0
    if (newQty < 0) {
      return;
    }

    // Don't allow updates if already pending
    if (pendingUpdates.has(item.product_id)) {
      return;
    }

    if (!user) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    // Mark this product as pending
    setPendingUpdates((prev) => new Set(prev).add(item.product_id));

    try {
      // Send the delta (change amount), not the absolute quantity
      // The backend will add this to the existing quantity
      const response = await fetch(`/api/cart/${user.customerID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: item.product_id, quantity: delta }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update cart");
      }

      // Update local state with the new absolute quantity
      setItems((prevItems) =>
        prevItems
          .map((i) =>
            i.product_id === item.product_id ? { ...i, quantity: newQty } : i
          )
          .filter((i) => i.quantity > 0)
      );
    } catch (err) {
      console.error(err);
    } finally {
      // Clear pending state
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(item.product_id);
        return next;
      });
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    // Don't allow updates if already pending
    if (pendingUpdates.has(item.product_id)) {
      return;
    }

    if (!user) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    // Mark this product as pending
    setPendingUpdates((prev) => new Set(prev).add(item.product_id));

    try {
      // Remove all quantity of this item (set to 0)
      const response = await fetch(`/api/cart/${user.customerID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: item.product_id, quantity: -item.quantity }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to remove item");
      }

      // Remove item from local state
      setItems((prevItems) =>
        prevItems.filter((i) => i.product_id !== item.product_id)
      );
    } catch (err) {
      console.error(err);
    } finally {
      // Clear pending state
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(item.product_id);
        return next;
      });
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price_at_checkout * item.quantity,
    0
  );

  const totalWeight = items.reduce(
    (sum, item) => sum + item.weight_at_checkout * item.quantity,
    0
  );

  const deliveryCharge = totalWeight >= 20 ? 10 : 0;
  const total = subtotal + deliveryCharge;

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

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
                      <th style={styles.th}>Action</th>
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
                        <td style={styles.td}>
                          <div style={styles.quantityContainer}>
                            <button
                              onClick={() => handleQuantityChange(item, -1)}
                              style={{
                                ...styles.quantityButton,
                                opacity: item.quantity === 0 || pendingUpdates.has(item.product_id) ? 0.5 : 1,
                                cursor: item.quantity === 0 || pendingUpdates.has(item.product_id) ? "not-allowed" : "pointer",
                              }}
                              disabled={item.quantity === 0 || pendingUpdates.has(item.product_id)}
                            >
                              -
                            </button>
                            <span style={styles.quantityValue}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item, 1)}
                              style={{
                                ...styles.quantityButton,
                                opacity: pendingUpdates.has(item.product_id) ? 0.5 : 1,
                                cursor: pendingUpdates.has(item.product_id) ? "not-allowed" : "pointer",
                              }}
                              disabled={pendingUpdates.has(item.product_id)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={styles.td}>
                          ${(item.price_at_checkout * item.quantity).toFixed(2)}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleRemoveItem(item)}
                            style={styles.removeButton}
                          >
                            Remove
                          </button>
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
                  <span style={styles.totalValue}>${subtotal.toFixed(2)}</span>
                </div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>
                    Delivery ({totalWeight.toFixed(1)} lbs)
                  </span>
                  <span style={styles.totalValue}>
                    {deliveryCharge === 0 ? "FREE" : `$${deliveryCharge.toFixed(2)}`}
                  </span>
                </div>
                <div style={styles.deliveryInfo}>
                  {deliveryCharge === 0 ? (
                    <p>✓ FREE delivery — your order is under 20 lbs!</p>
                  ) : (
                    <p>Delivery charge applied for orders 20 lbs or more</p>
                  )}
                </div>
                <div style={styles.totalRowBold}>
                  <span style={styles.totalLabelBold}>Total</span>
                  <span style={styles.totalValueBold}>${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => navigate("/checkout")}
                  style={styles.checkoutButton}
                >
                  Proceed to Checkout
                </button>
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
  totalRowBold: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "2px solid #2d6a4f",
  },
  deliveryInfo: {
    marginTop: "0.75rem",
    fontSize: "0.9rem",
    color: "#2d6a4f",
    fontWeight: 500,
  },
  checkoutButton: {
    marginTop: "1.5rem",
    width: "100%",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "1rem",
    border: "none",
    borderRadius: "6px",
    fontSize: "1.1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
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
  quantityContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  quantityButton: {
    width: "28px",
    height: "28px",
    backgroundColor: "#e9ecef",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s ease",
  },
  quantityValue: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#1b4332",
    minWidth: "25px",
    textAlign: "center",
  },
  removeButton: {
    backgroundColor: "#dc3545",
    color: "#ffffff",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
};

export default Cart;
