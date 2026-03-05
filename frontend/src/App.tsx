import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./Login";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import About from "./pages/About";
import Register from "./pages/Register";
import Delivery from "./pages/Delivery";
import Inventory from "./pages/Inventory";
import DeliveryBots from "./pages/DeliveryBots";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/about" element={<About />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/delivery-bots" element={<DeliveryBots />} />

        {/* Hidden employee routes - not linked in navbar */}
        <Route path="/employee/inventory" element={<Inventory />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
