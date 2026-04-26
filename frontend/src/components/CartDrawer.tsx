import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ open, onClose }) => {
  const { items, pendingUpdates, updateQuantity, cartItemCount, cartTotal } = useCart();

  const totalWeight = items.reduce((s, i) => s + i.weight_at_checkout * i.quantity, 0);
  const deliveryFee = totalWeight >= 20 ? 10 : 0;
  const grandTotal = cartTotal + deliveryFee;

  return (
    <>
      <div style={{ ...styles.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }}>
        <div style={styles.header}>
          <h2 style={styles.title}>Your Cart ({cartItemCount})</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div style={styles.itemsList}>
              {items.map((item) => (
                <div key={item.product_id} style={styles.item}>
                  <div style={styles.itemInfo}>
                    <p style={styles.itemName}>{item.name}</p>
                    <p style={styles.itemUnitPrice}>${item.price_at_checkout.toFixed(2)} each</p>
                    {item.quantity >= item.quantity_in_stock && (
                      <p style={styles.stockWarning}>No more stock available</p>
                    )}
                  </div>
                  <div style={styles.itemRight}>
                    <div style={styles.itemQty}>
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        disabled={pendingUpdates.has(item.product_id)}
                        style={styles.qtyBtn}
                      >−</button>
                      <span style={styles.qtyValue}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        disabled={item.quantity >= item.quantity_in_stock || pendingUpdates.has(item.product_id)}
                        style={{
                          ...styles.qtyBtn,
                          opacity: item.quantity >= item.quantity_in_stock || pendingUpdates.has(item.product_id) ? 0.4 : 1,
                          cursor: item.quantity >= item.quantity_in_stock || pendingUpdates.has(item.product_id) ? "not-allowed" : "pointer",
                        }}
                      >+</button>
                    </div>
                    <p style={styles.itemSubtotal}>${(item.price_at_checkout * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.footer}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Subtotal</span>
                <span style={styles.summaryValue}>${cartTotal.toFixed(2)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Weight ({totalWeight.toFixed(2)} lbs)</span>
                <span style={{ ...styles.summaryValue, color: deliveryFee === 0 ? "#2d6a4f" : "#495057" }}>
                  {deliveryFee === 0 ? "FREE delivery" : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Total</span>
                <span style={styles.totalValue}>${grandTotal.toFixed(2)}</span>
              </div>
              <Link to="/checkout" onClick={onClose} style={styles.checkoutButton}>
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;

const styles: { [key: string]: React.CSSProperties } = {
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "400px",
    height: "100vh",
    backgroundColor: "#ffffff",
    boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
    zIndex: 1001,
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.3s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 1.5rem",
    borderBottom: "1px solid #e9ecef",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#1b4332",
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "1.1rem",
    color: "#6c757d",
    cursor: "pointer",
    padding: "0.25rem 0.5rem",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#6c757d",
    fontSize: "1rem",
  },
  itemsList: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  itemInfo: {
    flex: 1,
    marginRight: "1rem",
  },
  itemName: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#1b4332",
    margin: "0 0 0.25rem 0",
  },
  itemUnitPrice: {
    fontSize: "0.85rem",
    color: "#6c757d",
    margin: 0,
  },
  itemRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.4rem",
  },
  itemQty: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  qtyBtn: {
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
  },
  qtyValue: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#1b4332",
    minWidth: "20px",
    textAlign: "center",
  },
  stockWarning: {
    fontSize: "0.75rem",
    color: "#dc3545",
    fontWeight: 600,
    margin: 0,
  },
  itemSubtotal: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#2d6a4f",
    margin: 0,
  },
  footer: {
    padding: "1.25rem 1.5rem",
    borderTop: "1px solid #e9ecef",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "0.5rem",
  },
  summaryLabel: {
    fontSize: "0.9rem",
    color: "#6c757d",
  },
  summaryValue: {
    fontSize: "0.9rem",
    color: "#495057",
    fontWeight: 500,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #e9ecef",
    paddingTop: "0.75rem",
  },
  totalLabel: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1b4332",
  },
  totalValue: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#2d6a4f",
  },
  checkoutButton: {
    display: "block",
    textAlign: "center",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    padding: "0.85rem",
    borderRadius: "4px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "1rem",
  },
};
