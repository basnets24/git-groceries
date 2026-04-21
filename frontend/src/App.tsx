import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./Login";
import Logout from "./Logout";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import About from "./pages/About";
import Register from "./pages/Register";
import Delivery from "./pages/Delivery";
import Inventory from "./pages/Inventory";
import DeliveryBots from "./pages/DeliveryBots";
import TrackDelivery from "./pages/TrackDelivery";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import CustomerProfile from "./pages/CustomerProfile";
import { AuthProvider } from "./context/AuthContext";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/about" element={<About />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/register" element={<Register />} />
          <Route path="/delivery-bots" element={<DeliveryBots />} />
          <Route path="/track/:tripId" element={<TrackDelivery />} />
          <Route path="/profile" element={<CustomerProfile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />

          {/* Hidden employee routes - not linked in navbar */}
          <Route path="/employee/inventory" element={<Inventory />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
