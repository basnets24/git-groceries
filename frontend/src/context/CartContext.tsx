import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

export interface CartItem {
  order_id: number;
  product_id: number;
  name: string;
  price: number;
  category: string;
  quantity: number;
  price_at_checkout: number;
  weight_at_checkout: number;
  quantity_in_stock: number;
}

interface CartContextValue {
  items: CartItem[];
  quantities: { [productId: number]: number };
  pendingUpdates: Set<number>;
  cartLoading: boolean;
  cartItemCount: number;
  cartTotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  fetchCart: () => Promise<void>;
  updateQuantity: (productId: number, delta: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set());
  const [cartLoading, setCartLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCartLoading(true);
    try {
      const res = await fetch(`/api/cart/${user.customerID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // silently ignore
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCart();
    else setItems([]);
  }, [user, fetchCart]);

  const updateQuantity = useCallback(async (productId: number, delta: number) => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (pendingUpdates.has(productId)) return;

    const currentQty = items.find((i) => i.product_id === productId)?.quantity ?? 0;
    if (currentQty + delta < 0) return;

    const isNewItem = currentQty === 0 && delta > 0;

    setPendingUpdates((prev) => new Set(prev).add(productId));
    try {
      const res = await fetch(`/api/cart/${user.customerID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, quantity: delta }),
      });
      if (!res.ok) return;

      if (isNewItem) {
        // Re-fetch to get full item details (name, price_at_checkout, etc.)
        const cartRes = await fetch(`/api/cart/${user.customerID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cartRes.ok) {
          const data = await cartRes.json();
          setItems(data.items ?? []);
        }
      } else {
        setItems((prev) =>
          prev
            .map((i) => i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i)
            .filter((i) => i.quantity > 0)
        );
      }
    } catch {
      // silently ignore
    } finally {
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [user, items, pendingUpdates]);

  const removeItem = useCallback(async (productId: number) => {
    const item = items.find((i) => i.product_id === productId);
    if (!item) return;
    await updateQuantity(productId, -item.quantity);
  }, [items, updateQuantity]);

  const quantities = useMemo(() => {
    const map: { [productId: number]: number } = {};
    items.forEach((i) => { map[i.product_id] = i.quantity; });
    return map;
  }, [items]);

  const cartItemCount = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );

  const cartTotal = useMemo(
    () => items.reduce((s, i) => s + i.price_at_checkout * i.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, quantities, pendingUpdates, cartLoading, cartItemCount, cartTotal, cartOpen, setCartOpen, fetchCart, updateQuantity, removeItem }),
    [items, quantities, pendingUpdates, cartLoading, cartItemCount, cartTotal, cartOpen, fetchCart, updateQuantity, removeItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
