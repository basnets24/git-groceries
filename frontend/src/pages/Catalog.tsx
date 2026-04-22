import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  weight: number;
  quantityInStock: number;
}

interface Category {
  id: number;
  name: string;
}

const Catalog: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minWeight, setMinWeight] = useState<string>("");
  const [maxWeight, setMaxWeight] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [sortField, setSortField] = useState<"price" | "name" | "weight">("price");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const filteredProducts = selectedCategories.length > 0
    ? products.filter((p) =>
      selectedCategories.some(
        (catId) =>
          categories.find((c) => c.id === catId)?.name === p.category
      )
    )
    : products;

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;

    if (sortField === "price") {
      comparison = a.price - b.price;
    } else if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "weight") {
      comparison = a.weight - b.weight;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const fetchCategories = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }
    try {
      const response = await fetch("/api/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      setCategories(data.categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to browse products.");
      setLoading(false);
      return;
    }
    try {
      let url = "/api/products";
      const params = [];

      if (selectedCategories.length > 0) {
        selectedCategories.forEach((id) => {
          params.push(`category_id=${id}`);
        });
      }

      if (minPrice.trim() !== "") {
        params.push(`min_price=${minPrice}`);
      }

      if (maxPrice.trim() !== "") {
        params.push(`max_price=${maxPrice}`);
      }

      if (minWeight.trim() !== "") {
        params.push(`min_weight=${minWeight}`);
      }

      if (maxWeight.trim() !== "") {
        params.push(`max_weight=${maxWeight}`);
      }

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      setProducts(data.products);
      // Only initialize quantities for products that don't already have a quantity set
      // This prevents overwriting cart quantities from fetchCart
      setQuantities((prev) => {
        const newQuantities = { ...prev };
        data.products.forEach((product: Product) => {
          if (!(product.id in prev)) {
            newQuantities[product.id] = 0;
          }
        });
        return newQuantities;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedCategories, minPrice, maxPrice, minWeight, maxWeight]);

  const fetchCart = useCallback(async () => {
    if (!user) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }
    try {
      const response = await fetch(`/api/cart/${user.customerID}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }
      const data = await response.json();
      const cartQuantities: { [key: number]: number } = {};
      data.items.forEach((item: any) => {
        cartQuantities[item.product_id] = item.quantity;
      });
      setQuantities((prev) => ({ ...prev, ...cartQuantities }));
    } catch (err) {
      console.error("Error fetching cart:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchCategories();
      fetchProducts();
      fetchCart();
    }
  }, [authLoading, fetchCategories, fetchProducts, fetchCart, selectedCategories, minPrice, maxPrice, minWeight, maxWeight]);

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleQuantityChange = async (product: Product, delta: number) => {
    const currentQty = quantities[product.id] || 0;
    const newQty = currentQty + delta;

    // Prevent going below 0 or above stock
    if (newQty < 0 || newQty > product.quantityInStock) {
      return;
    }

    if (!user) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    try {
      // Send the delta (change amount), not the absolute quantity
      // The backend will add this to the existing quantity
      const response = await fetch(`/api/cart/${user.customerID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product.id, quantity: delta }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update cart");
      }

      // Update local state with the new absolute quantity
      setQuantities((prev) => ({
        ...prev,
        [product.id]: newQty,
      }));
    } catch (err) {
      console.error(err);
    }
  };



  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.pageContainer}>
      <Navbar />

      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.pageTitle}>Product Catalog</h1>
          <p style={styles.pageSubtitle}>
            Browse our selection of fresh, organic products
          </p>

          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading products...</p>
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
              <div style={styles.filtersSection}>
                <div style={styles.categoryRow}>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Filter by Category:</label>
                    <div style={styles.categoryButtonsContainer}>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryToggle(category.id)}
                          style={{
                            ...styles.categoryButton,
                            ...(selectedCategories.includes(category.id)
                              ? styles.categoryButtonActive
                              : styles.categoryButtonInactive),
                          }}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={styles.rangeAndSortRow}>
                  <div style={styles.sortSection}>
                    <label style={styles.filterLabel}>Sort Products:</label>
                    <div style={styles.sortControlsContainer}>
                      <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value as any)}
                        style={styles.sortSelect}
                      >
                        <option value="price">Sort by Price</option>
                        <option value="name">Sort by Name</option>
                        <option value="weight">Sort by Weight</option>
                      </select>
                      <button
                        onClick={() =>
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                        }
                        style={styles.sortButton}
                      >
                        {sortOrder === "asc" ? "Ascending ↑" : "Descending ↓"}
                      </button>
                    </div>
                  </div>

                  <div style={styles.priceFilterGroup}>
                    <label style={styles.filterLabel}>Filter by Price Range:</label>
                    <div style={styles.priceInputContainer}>
                      <div style={styles.priceInputWrapper}>
                        <label htmlFor="minPrice" style={styles.priceLabel}>Min ($)</label>
                        <input
                          id="minPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Min price"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          style={styles.priceInput}
                        />
                      </div>
                      <div style={styles.priceInputWrapper}>
                        <label htmlFor="maxPrice" style={styles.priceLabel}>Max ($)</label>
                        <input
                          id="maxPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Max price"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          style={styles.priceInput}
                        />
                      </div>
                      {(minPrice || maxPrice) && (
                        <button
                          onClick={() => {
                            setMinPrice("");
                            setMaxPrice("");
                          }}
                          style={styles.clearPriceButton}
                        >
                          Clear Price Filter
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={styles.weightFilterGroup}>
                    <label style={styles.filterLabel}>Filter by Weight Range:</label>
                    <div style={styles.weightInputContainer}>
                      <div style={styles.weightInputWrapper}>
                        <label htmlFor="minWeight" style={styles.weightLabel}>Min (lbs)</label>
                        <input
                          id="minWeight"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Min weight"
                          value={minWeight}
                          onChange={(e) => setMinWeight(e.target.value)}
                          style={styles.weightInput}
                        />
                      </div>
                      <div style={styles.weightInputWrapper}>
                        <label htmlFor="maxWeight" style={styles.weightLabel}>Max (lbs)</label>
                        <input
                          id="maxWeight"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Max weight"
                          value={maxWeight}
                          onChange={(e) => setMaxWeight(e.target.value)}
                          style={styles.weightInput}
                        />
                      </div>
                      {(minWeight || maxWeight) && (
                        <button
                          onClick={() => {
                            setMinWeight("");
                            setMaxWeight("");
                          }}
                          style={styles.clearWeightButton}
                        >
                          Clear Weight Filter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.productsGrid}>
                {sortedProducts.map((product) => (
                  <div key={product.id} style={styles.productCard}>
                    <div style={styles.imageContainer}>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={styles.productImage}
                        />
                      ) : (
                        <div style={styles.placeholderImage}>
                          <span style={styles.placeholderText}>No Image</span>
                        </div>
                      )}
                    </div>
                    <div style={styles.productInfo}>
                      <span style={styles.categoryBadge}>{product.category}</span>
                      <h3 style={styles.productName}>{product.name}</h3>
                      <p style={styles.productDescription}>{product.description}</p>
                      <p style={styles.productWeight}>{product.weight.toFixed(2)} lbs</p>
                      <p style={styles.productPrice}>${product.price.toFixed(2)}</p>

                      <div style={styles.quantityContainer}>
                        <button
                          onClick={() => handleQuantityChange(product, -1)}
                          style={{
                            ...styles.quantityButton,
                            opacity: quantities[product.id] === 0 ? 0.5 : 1,
                            cursor: quantities[product.id] === 0 ? "not-allowed" : "pointer",
                          }}
                          disabled={quantities[product.id] === 0}
                        >
                          -
                        </button>
                        <span style={styles.quantityValue}>
                          {quantities[product.id] || 0}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product, 1)}
                          style={{
                            ...styles.quantityButton,
                            opacity: (quantities[product.id] || 0) >= product.quantityInStock ? 0.5 : 1,
                            cursor: (quantities[product.id] || 0) >= product.quantityInStock ? "not-allowed" : "pointer",
                          }}
                          disabled={(quantities[product.id] || 0) >= product.quantityInStock}
                        >
                          +
                        </button>
                      </div>
                      {product.quantityInStock === 0 && (
                        <p style={styles.outOfStockText}>Out of Stock</p>
                      )}
                      {product.quantityInStock > 0 && product.quantityInStock <= 5 && (
                        <p style={styles.lowStockText}>Only {product.quantityInStock} left in stock</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {sortedProducts.length === 0 && (
                <div style={styles.emptyContainer}>
                  <p style={styles.emptyText}>
                    {selectedCategories.length > 0 || minPrice || maxPrice || minWeight || maxWeight
                      ? "No products match your current filters. Try adjusting your selections."
                      : "No products available at the moment."}
                  </p>
                </div>
              )}
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
    maxWidth: "1200px",
    margin: "0 auto",
  },
  pageTitle: {
    fontSize: "2.25rem",
    fontWeight: 700,
    color: "#1b4332",
    textAlign: "center",
    marginBottom: "0.5rem",
  },
  pageSubtitle: {
    fontSize: "1.1rem",
    color: "#6c757d",
    textAlign: "center",
    marginBottom: "2.5rem",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #d8f3dc",
    borderTop: "4px solid #2d6a4f",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "1rem",
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
  filtersSection: {
    marginBottom: "2rem",
    padding: "1.5rem",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  categoryRow: {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    flex: 1,
    minWidth: "300px",
  },
  filterLabel: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1b4332",
  },
  categoryButtonsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  categoryButton: {
    padding: "0.6rem 1.2rem",
    border: "2px solid #2d6a4f",
    borderRadius: "20px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  categoryButtonActive: {
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
  },
  categoryButtonInactive: {
    backgroundColor: "#ffffff",
    color: "#2d6a4f",
  },
  priceFilterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    flex: 1,
    minWidth: "300px",
  },
  priceInputContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "flex-end",
  },
  priceInputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  priceLabel: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#6c757d",
  },
  priceInput: {
    padding: "0.6rem 0.875rem",
    border: "1px solid #dee2e6",
    borderRadius: "4px",
    fontSize: "1rem",
    width: "150px",
    boxSizing: "border-box",
  },
  clearPriceButton: {
    padding: "0.6rem 1rem",
    backgroundColor: "#6c757d",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  weightFilterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    flex: 1,
    minWidth: "300px",
  },
  rangeAndSortRow: {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  weightInputContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "flex-end",
  },
  weightInputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  weightLabel: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#6c757d",
  },
  weightInput: {
    padding: "0.6rem 0.875rem",
    border: "1px solid #dee2e6",
    borderRadius: "4px",
    fontSize: "1rem",
    width: "150px",
    boxSizing: "border-box",
  },
  clearWeightButton: {
    padding: "0.6rem 1rem",
    backgroundColor: "#6c757d",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  sortSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    flex: 1,
    minWidth: "250px",
  },
  sortControlsContainer: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  sortSelect: {
    padding: "0.75rem 1rem",
    border: "1px solid #dee2e6",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
    backgroundColor: "#ffffff",
    color: "#1b4332",
  },
  sortButton: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  imageContainer: {
    width: "100%",
    height: "200px",
    overflow: "hidden",
    backgroundColor: "#e9ecef",
  },
  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dee2e6",
  },
  placeholderText: {
    color: "#6c757d",
    fontSize: "1rem",
  },
  productInfo: {
    padding: "1.25rem",
  },
  categoryBadge: {
    display: "inline-block",
    backgroundColor: "#d8f3dc",
    color: "#2d6a4f",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
  },
  productName: {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "#1b4332",
    marginBottom: "0.5rem",
  },
  productDescription: {
    fontSize: "0.9rem",
    color: "#6c757d",
    marginBottom: "0.75rem",
    lineHeight: 1.4,
  },
  productWeight: {
    fontSize: "0.95rem",
    color: "#6c757d",
    marginBottom: "0.75rem",
  },
  productPrice: {
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "#2d6a4f",
    marginBottom: "1rem",
  },
  quantityContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  quantityButton: {
    width: "36px",
    height: "36px",
    backgroundColor: "#e9ecef",
    border: "none",
    borderRadius: "4px",
    fontSize: "1.25rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s ease",
  },
  quantityValue: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#1b4332",
    minWidth: "30px",
    textAlign: "center",
  },
  outOfStockText: {
    color: "#dc3545",
    fontSize: "0.9rem",
    fontWeight: 600,
    margin: "0.5rem 0 0 0",
  },
  lowStockText: {
    color: "#ff9800",
    fontSize: "0.9rem",
    fontWeight: 600,
    margin: "0.5rem 0 0 0",
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

export default Catalog;
