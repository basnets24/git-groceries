import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface Category {
  id: number;
  name: string;
}

interface InventoryItem {
  id: number;
  name: string;
  category_id: number;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
}

interface AddForm {
  name: string;
  price: string;
  weight: string;
  category_id: string;
  quantity: string;
}

const EMPTY_ADD_FORM: AddForm = {
  name: "",
  price: "",
  weight: "",
  category_id: "",
  quantity: "0",
};

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const groupedInventory = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const item of inventory) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({ category, items }));
  }, [inventory]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return inventory.filter((i) => {
      const matchesCategory = selectedCategory === "All" || i.category === selectedCategory;
      const matchesSearch = !query || i.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [inventory, selectedCategory, searchQuery]);

  useEffect(() => {
    setEditingId(null);
    setEditQuantity(0);
    setSearchQuery("");
  }, [selectedCategory]);

  const token = () => localStorage.getItem("token");

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const t = token();
        if (!t) throw new Error("Unauthorized: please log in first");

        const invRes = await fetch("/api/inventory", {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!invRes.ok) throw new Error("Failed to fetch inventory");
        const invData = await invRes.json();
        setInventory(invData.inventory);
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
      const t = token();
      if (!t) throw new Error("Unauthorized");

      const response = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
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

  const handleOpenAddModal = () => {
    // Derive unique categories from already-loaded inventory items
    const seen = new Set<string>();
    const cats: Category[] = [];
    for (const item of inventory) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        cats.push({ id: item.category_id, name: item.category });
      }
    }
    setCategories(cats);
    setAddForm({
      ...EMPTY_ADD_FORM,
      category_id: cats[0] ? String(cats[0].id) : "",
    });
    setAddError(null);
    setImageFile(null);
    setImagePreview(null);
    setShowAddModal(true);
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const price = parseFloat(addForm.price);
    const weight = parseFloat(addForm.weight);
    const quantity = parseInt(addForm.quantity) || 0;
    const category_id = parseInt(addForm.category_id);

    if (!addForm.name.trim()) return setAddError("Name is required.");
    if (isNaN(price) || price <= 0) return setAddError("Price must be a positive number.");
    if (isNaN(weight) || weight <= 0) return setAddError("Weight must be a positive number.");
    if (isNaN(category_id)) return setAddError("Select a category.");
    if (!imageFile) return setAddError("A product image is required.");

    setAddSaving(true);
    try {
      const t = token();
      if (!t) throw new Error("Unauthorized");

      let image_url: string | undefined;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadRes = await fetch("/api/products/image", {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload image");
        image_url = uploadData.url;
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: addForm.name.trim(), price, weight, category_id, quantity, image_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");

      const invRes = await fetch("/api/inventory", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const invData = await invRes.json();
      setInventory(invData.inventory);

      setShowAddModal(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteProduct = async (item: InventoryItem) => {
    if (!window.confirm(`Remove "${item.name}" from the catalog? This will hide it from customers.`)) {
      return;
    }
    try {
      const t = token();
      if (!t) throw new Error("Unauthorized");

      const res = await fetch(`/api/products/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete product");
      }
      setInventory((prev) => {
        const next = prev.filter((p) => p.id !== item.id);
        if (selectedCategory !== "All" && !next.some((p) => p.category === selectedCategory)) {
          setSelectedCategory("All");
        }
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Navbar />

      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.pageTitle}>Inventory Management</h1>
              <p style={styles.pageSubtitle}>
                Employee access only - Track and manage product inventory
              </p>
            </div>
            <div style={styles.headerActions}>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <button onClick={handleOpenAddModal} style={styles.addButton}>
                + Add Product
              </button>
            </div>
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
                  <p style={styles.statValue}>{visibleItems.length}</p>
                  <p style={styles.statLabel}>Total Products</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>
                    {visibleItems.filter((item) => isLowStock(item)).length}
                  </p>
                  <p style={styles.statLabel}>Low Stock Items</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statValue}>
                    {visibleItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                  <p style={styles.statLabel}>Total Units</p>
                </div>
              </div>

              <div style={styles.categoryGrid}>
                {[{ category: "All", items: inventory }, ...groupedInventory].map(({ category, items }) => {
                  const lowCount = items.filter(isLowStock).length;
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      style={{ ...styles.categoryCard, ...(active ? styles.categoryCardActive : {}) }}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <span style={{ ...styles.categoryCardName, ...(active ? styles.categoryCardNameActive : {}) }}>{category}</span>
                      <span style={{ ...styles.categoryCardCount, ...(active ? styles.categoryCardCountActive : {}) }}>{items.length} items</span>
                      {lowCount > 0 && (
                        <span style={styles.categoryLowStock}>{lowCount} low stock</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Product Name</th>
                      {selectedCategory === "All" && <th style={styles.th}>Category</th>}
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={selectedCategory === "All" ? 7 : 6}
                          style={{ ...styles.td, textAlign: "center", color: "#6c757d", padding: "3rem" }}
                        >
                          No items match your search.
                        </td>
                      </tr>
                    )}
                    {visibleItems.map((item) => (
                      <tr key={item.id} style={isLowStock(item) ? styles.lowStockRow : styles.tableRow}>
                        <td style={styles.td}>{item.id}</td>
                        <td style={styles.td}>{item.name}</td>
                        {selectedCategory === "All" && <td style={styles.td}>{item.category}</td>}
                        <td style={styles.td}>${item.price.toFixed(2)}</td>
                        <td style={styles.td}>
                          {editingId === item.id ? (
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                              style={styles.quantityInput}
                              min="0"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={isLowStock(item) ? styles.lowStockBadge : styles.inStockBadge}>
                            {isLowStock(item) ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {editingId === item.id ? (
                            <div style={styles.actionButtons}>
                              <button onClick={() => handleSaveQuantity(item.id)} style={styles.saveButton}>Save</button>
                              <button onClick={handleCancelEdit} style={styles.cancelButton}>Cancel</button>
                            </div>
                          ) : (
                            <div style={styles.actionButtons}>
                              <button onClick={() => handleEditClick(item)} style={styles.editButton}>Edit</button>
                              <button onClick={() => handleDeleteProduct(item)} style={styles.deleteButton}>Delete</button>
                            </div>
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

      {showAddModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Add New Product</h2>
            <form onSubmit={handleAddProduct} style={styles.modalForm}>
              <label style={styles.fieldLabel}>
                Product Name
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  style={styles.fieldInput}
                  placeholder="e.g. Organic Apples"
                />
              </label>

              <div style={styles.formRow}>
                <label style={styles.fieldLabel}>
                  Price ($)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                    style={styles.fieldInput}
                    placeholder="e.g. 3.99"
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Weight (lbs)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addForm.weight}
                    onChange={(e) => setAddForm({ ...addForm, weight: e.target.value })}
                    style={styles.fieldInput}
                    placeholder="e.g. 1.5"
                  />
                </label>
              </div>

              <div style={styles.formRow}>
                <label style={styles.fieldLabel}>
                  Category
                  <select
                    value={addForm.category_id}
                    onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
                    style={styles.fieldSelect}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={styles.fieldLabel}>
                  Initial Stock Qty
                  <input
                    type="number"
                    min="0"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                    style={styles.fieldInput}
                  />
                </label>
              </div>

              <label style={styles.fieldLabel}>
                Product Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  style={styles.fieldInput}
                />
              </label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={styles.imagePreview}
                />
              )}

              {addError && <p style={styles.modalError}>{addError}</p>}

              <div style={styles.modalActions}>
                <button type="submit" style={styles.primaryButton} disabled={addSaving}>
                  {addSaving ? "Adding..." : "Add Product"}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setShowAddModal(false)}
                  disabled={addSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    gap: "1rem",
    flexWrap: "wrap",
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
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  searchInput: {
    padding: "0.75rem 1rem",
    border: "1px solid #ced4da",
    borderRadius: "8px",
    fontSize: "0.95rem",
    width: "220px",
  },
  addButton: {
    backgroundColor: "#1b4332",
    color: "#ffffff",
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
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
  categoryGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  categoryCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
    padding: "0.875rem 1rem",
    width: "160px",
    backgroundColor: "#ffffff",
    border: "2px solid #e9ecef",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    outline: "none",
  },
  categoryCardActive: {
    backgroundColor: "#1b4332",
    borderColor: "#1b4332",
  },
  categoryCardName: {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#1b4332",
  },
  categoryCardNameActive: {
    color: "#ffffff",
  },
  categoryCardCount: {
    fontSize: "0.8rem",
    color: "#6c757d",
  },
  categoryCardCountActive: {
    color: "#d8f3dc",
  },
  categoryLowStock: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.15rem 0.5rem",
    borderRadius: "999px",
    marginTop: "0.25rem",
  },
  tableContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
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
  deleteButton: {
    backgroundColor: "#dc3545",
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
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "2rem",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#1b4332",
    margin: "0 0 1.5rem 0",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#495057",
  },
  fieldInput: {
    padding: "0.65rem 0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    fontSize: "1rem",
    color: "#212529",
  },
  fieldSelect: {
    padding: "0.65rem 0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    fontSize: "1rem",
    backgroundColor: "#fff",
    color: "#212529",
  },
  imagePreview: {
    width: "100%",
    maxHeight: "160px",
    objectFit: "contain",
    borderRadius: "6px",
    border: "1px solid #ced4da",
    backgroundColor: "#f8f9fa",
  },
  modalError: {
    margin: 0,
    color: "#dc3545",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  modalActions: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
  primaryButton: {
    flex: 1,
    padding: "0.75rem",
    backgroundColor: "#1b4332",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    flex: 1,
    padding: "0.75rem",
    backgroundColor: "#e9ecef",
    color: "#495057",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default Inventory;
