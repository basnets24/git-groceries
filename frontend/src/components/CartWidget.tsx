import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";

const CartWidget: React.FC = () => {
  const { user } = useAuth();
  const { cartItemCount, cartTotal, cartOpen, setCartOpen } = useCart();
  const { pathname } = useLocation();

  if (!user || user.role !== "CUSTOMER" || pathname === "/cart" || pathname === "/checkout") return null;

  return (
    <>
      {cartItemCount > 0 && (
        <button style={styles.tab} onClick={() => setCartOpen(true)}>
          <span style={styles.tabLabel}>Cart</span>
          <span style={styles.tabBadge}>{cartItemCount}</span>
          <span style={styles.tabTotal}>${cartTotal.toFixed(2)}</span>
        </button>
      )}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
};

export default CartWidget;

const styles: { [key: string]: React.CSSProperties } = {
  tab: {
    position: "fixed",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px 0 0 12px",
    padding: "1.5rem 1.25rem",
    cursor: "pointer",
    zIndex: 900,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
    boxShadow: "-6px 0 20px rgba(0,0,0,0.25)",
    minWidth: "72px",
  },
  tabLabel: {
    fontSize: "1rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  tabBadge: {
    backgroundColor: "#ffffff",
    color: "#2d6a4f",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    fontSize: "1rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tabTotal: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#d8f3dc",
  },
};
