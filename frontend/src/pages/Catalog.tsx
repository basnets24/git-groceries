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
}

const Catalog: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [sortField, setSortField] = useState<"price" | "name" | "weight">("price");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const sortedProducts = [...products].sort((a, b) => {
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

  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to browse products.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      setProducts(data.products);
      const initialQuantities: { [key: number]: number } = {};
      data.products.forEach((product: Product) => {
        initialQuantities[product.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchProducts();
    }
  }, [authLoading, fetchProducts]);

  const handleQuantityChange = (productId: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta),
    }));
  };

  const handleAddToCart = async (product: Product) => {
    if (!user) {
      alert("Please log in to add items to your cart.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }
    const quantity = quantities[product.id] || 1;
    try {
      const response = await fetch(`/api/cart/${user.customerID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product.id, quantity }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to add to cart");
      }
      alert(`Added ${quantity} x ${product.name} to cart!`);
      setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add to cart");
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

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
          >
            <option value="price">Price</option>
            <option value="name">Name</option>
            <option value="weight">Weight</option>
          </select>
          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
          >
            {sortOrder === "asc" ? "Ascending ↑" : "Descending ↓"}
          </button>

          {!loading && !error && (
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
                        onClick={() => handleQuantityChange(product.id, -1)}
                        style={styles.quantityButton}
                      >
                        -
                      </button>
                      <span style={styles.quantityValue}>
                        {quantities[product.id] || 1}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(product.id, 1)}
                        style={styles.quantityButton}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      style={styles.addToCartButton}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div style={styles.emptyContainer}>
              <p style={styles.emptyText}>No products available at the moment.</p>
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
  },
  quantityValue: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#1b4332",
    minWidth: "30px",
    textAlign: "center",
  },
  addToCartButton: {
    width: "100%",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "0.875rem",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
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
