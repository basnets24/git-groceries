import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
}

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch("/api/inventory");
        if (!response.ok) {
          throw new Error("Failed to fetch inventory");
        }
        const data = await response.json();
        setInventory(data.inventory);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const handleEditClick = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity);
  };

  const handleSaveQuantity = async (id: number) => {
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: editQuantity }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update quantity");
      }
      const data = await response.json();
      setInventory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: data.item.quantity } : item
        )
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update quantity");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQuantity(0);
  };

  const isLowStock = (item: InventoryItem) => {
    return item.quantity <= item.lowStockThreshold;
  };

  return (
    <div style={styles.pageContainer}>
      <Navbar />

      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.pageTitle}>Inventory Management</h1>
            <p style={styles.pageSubtitle}>
              Employee access only - Track and manage product inventory
            </p>
          </div>

          {loading && (
            <div style={styles.loadingContainer}>
              <p style={styles.loadingText}>Loading inventory...</p>
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

          {!loading && !error && (
            <>
              <div style={styles.statsRow}>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>{inventory.length}</p>
                  <p style={styles.statLabel}>Total Products</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>
                    {inventory.filter((item) => isLowStock(item)).length}
                  </p>
                  <p style={styles.statLabel}>Low Stock Items</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>
                    {inventory.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                  <p style={styles.statLabel}>Total Units</p>
                </div>
              </div>

              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Product Name</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr
                        key={item.id}
                        style={
                          isLowStock(item)
                            ? styles.lowStockRow
                            : styles.tableRow
                        }
                      >
                        <td style={styles.td}>{item.id}</td>
                        <td style={styles.td}>{item.name}</td>
                        <td style={styles.td}>{item.category}</td>
                        <td style={styles.td}>${item.price.toFixed(2)}</td>
                        <td style={styles.td}>
                          {editingId === item.id ? (
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) =>
                                setEditQuantity(parseInt(e.target.value) || 0)
                              }
                              style={styles.quantityInput}
                              min="0"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={
                              isLowStock(item)
                                ? styles.lowStockBadge
                                : styles.inStockBadge
                            }
                          >
                            {isLowStock(item) ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {editingId === item.id ? (
                            <div style={styles.actionButtons}>
                              <button
                                onClick={() => handleSaveQuantity(item.id)}
                                style={styles.saveButton}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={styles.cancelButton}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditClick(item)}
                              style={styles.editButton}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && !error && inventory.length === 0 && (
            <div style={styles.emptyContainer}>
              <p style={styles.emptyText}>No inventory items found.</p>
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
  header: {
    marginBottom: "2rem",
  },
  pageTitle: {
    fontSize: "2.25rem",
    fontWeight: 700,
    color: "#1b4332",
    textAlign: "center",
    marginBottom: "0.5rem",
  },
  pageSubtitle: {
    fontSize: "1rem",
    color: "#6c757d",
    textAlign: "center",
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
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  statCard: {
    backgroundColor: "#ffffff",
    padding: "1.5rem",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#2d6a4f",
    margin: 0,
  },
  statLabel: {
    fontSize: "0.9rem",
    color: "#6c757d",
    margin: "0.5rem 0 0 0",
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
  lowStockRow: {
    backgroundColor: "#fff3cd",
  },
  inStockBadge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    backgroundColor: "#d4edda",
    color: "#155724",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  lowStockBadge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    backgroundColor: "#f8d7da",
    color: "#721c24",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  quantityInput: {
    width: "80px",
    padding: "0.5rem",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    fontSize: "0.95rem",
  },
  actionButtons: {
    display: "flex",
    gap: "0.5rem",
  },
  editButton: {
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  saveButton: {
    backgroundColor: "#28a745",
    color: "#ffffff",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
    color: "#ffffff",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "4rem",
  },
  emptyText: {
    color: "#6c757d",
    fontSize: "1.1rem",
  },
};

export default Inventory;
