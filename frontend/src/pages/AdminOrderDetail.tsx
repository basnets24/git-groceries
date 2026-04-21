import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

declare global {
    interface Window {
        google: any;
    }
}

interface OrderItem {
    product_id: number;
    name: string;
    category: string;
    quantity: number;
    price_at_checkout: number;
    weight_at_checkout: number;
}

interface OrderTrip {
    trip_id: number;
    status: string;
    polyline: string | null;
    origin: { address: string | null; lat: number | null; lng: number | null };
    destination: { address: string | null; lat: number | null; lng: number | null };
    distance_m: number | null;
    duration_sec: number | null;
    started_at: string | null;
    stop_index: number | null;
    eta: string | null;
}

interface OrderDetail {
    order_id: number;
    status: string;
    customer: { customer_id: number; username: string; email: string };
    address: { street: string; city: string; state: string; zip: string };
    items: OrderItem[];
    trip: OrderTrip | null;
}

const loadGoogleMaps = (apiKey: string): Promise<void> =>
    new Promise((resolve, reject) => {
        if (window.google?.maps?.geometry) {
            resolve();
            return;
        }
        const existing = document.getElementById("gmaps-sdk") as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
            return;
        }
        const s = document.createElement("script");
        s.id = "gmaps-sdk";
        s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(s);
    });

const AdminOrderDetail: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { user, loading: authLoading } = useAuth();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (authLoading || !orderId) return;
        const token = localStorage.getItem("token");
        if (!token) {
            setError("Not authenticated");
            setLoading(false);
            return;
        }

        fetch(`/api/admin/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (!res.ok) {
                    const msg = await res.json().catch(() => ({}));
                    throw new Error(msg?.error || `Request failed: ${res.status}`);
                }
                return res.json();
            })
            .then((data: OrderDetail) => setOrder(data))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [orderId, authLoading]);

    useEffect(() => {
        if (!order?.trip?.polyline) return;
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setMapError("Google Maps API key is not configured");
            return;
        }

        loadGoogleMaps(apiKey)
            .then(() => {
                if (!mapRef.current || !order.trip) return;
                const google = window.google;
                const decoded = google.maps.geometry.encoding.decodePath(order.trip.polyline);

                const map = new google.maps.Map(mapRef.current, {
                    zoom: 13,
                    center: decoded[0] || { lat: 37.3382, lng: -121.8863 },
                });

                new google.maps.Polyline({
                    path: decoded,
                    strokeColor: "#2d6a4f",
                    strokeWeight: 5,
                    strokeOpacity: 0.85,
                    map,
                });

                if (order.trip.origin.lat && order.trip.origin.lng) {
                    new google.maps.Marker({
                        position: { lat: order.trip.origin.lat, lng: order.trip.origin.lng },
                        map,
                        label: "A",
                        title: order.trip.origin.address || "Origin",
                    });
                }
                if (order.trip.destination.lat && order.trip.destination.lng) {
                    new google.maps.Marker({
                        position: { lat: order.trip.destination.lat, lng: order.trip.destination.lng },
                        map,
                        label: "B",
                        title: order.trip.destination.address || "Destination",
                    });
                }

                const bounds = new google.maps.LatLngBounds();
                decoded.forEach((p: any) => bounds.extend(p));
                if (!bounds.isEmpty()) map.fitBounds(bounds);
            })
            .catch((e) => setMapError(e.message || "Map failed to load"));
    }, [order]);

    if (!authLoading && (!user || user.role === "CUSTOMER")) {
        return <Navigate to="/" replace />;
    }

    const itemsSubtotal = (order?.items || []).reduce(
        (sum, it) => sum + it.price_at_checkout * it.quantity,
        0
    );
    const totalWeight = (order?.items || []).reduce(
        (sum, it) => sum + it.weight_at_checkout * it.quantity,
        0
    );

    return (
        <div style={styles.page}>
            <Navbar />
            <main style={styles.main}>
                <Link to="/admin/orders" style={styles.backLink}>
                    ← Back to orders
                </Link>

                {loading && <p style={styles.loading}>Loading order...</p>}
                {error && <div style={styles.errorBox}>{error}</div>}

                {order && (
                    <>
                        <header style={styles.header}>
                            <div>
                                <p style={styles.eyebrow}>Order #{order.order_id}</p>
                                <h1 style={styles.title}>
                                    {order.customer.username} · {order.status}
                                </h1>
                                <p style={styles.subtitle}>
                                    {order.customer.email} · Shipping to {order.address.street}, {order.address.city}, {order.address.state} {order.address.zip}
                                </p>
                            </div>
                        </header>

                        <div style={styles.grid}>
                            <section style={styles.card}>
                                <h2 style={styles.cardTitle}>Items ({order.items.length})</h2>
                                <table style={styles.itemsTable}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Product</th>
                                            <th style={styles.th}>Category</th>
                                            <th style={styles.th}>Qty</th>
                                            <th style={styles.th}>Price</th>
                                            <th style={styles.th}>Weight</th>
                                            <th style={styles.th}>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((it) => (
                                            <tr key={it.product_id}>
                                                <td style={styles.td}>{it.name}</td>
                                                <td style={styles.td}>
                                                    <span style={styles.badge}>{it.category}</span>
                                                </td>
                                                <td style={styles.td}>{it.quantity}</td>
                                                <td style={styles.td}>${it.price_at_checkout.toFixed(2)}</td>
                                                <td style={styles.td}>{it.weight_at_checkout.toFixed(1)} lbs</td>
                                                <td style={styles.td}>
                                                    ${(it.price_at_checkout * it.quantity).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={styles.totals}>
                                    <span>Weight: {totalWeight.toFixed(1)} lbs</span>
                                    <span>Subtotal: ${itemsSubtotal.toFixed(2)}</span>
                                </div>
                            </section>

                            <section style={styles.card}>
                                <h2 style={styles.cardTitle}>Delivery Route</h2>
                                {!order.trip && (
                                    <div style={styles.noTrip}>
                                        No delivery trip has been recorded for this order yet.
                                    </div>
                                )}
                                {order.trip && (
                                    <>
                                        <div style={styles.tripMeta}>
                                            <div>
                                                <strong>Trip #{order.trip.trip_id}</strong> · {order.trip.status}
                                            </div>
                                            {order.trip.started_at && (
                                                <div>Started: {new Date(order.trip.started_at).toLocaleString()}</div>
                                            )}
                                            {order.trip.distance_m != null && (
                                                <div>
                                                    Distance: {(order.trip.distance_m / 1609).toFixed(2)} mi
                                                </div>
                                            )}
                                            {order.trip.duration_sec != null && (
                                                <div>
                                                    Estimated duration: {Math.round(order.trip.duration_sec / 60)} min
                                                </div>
                                            )}
                                            {order.trip.origin.address && (
                                                <div>From: {order.trip.origin.address}</div>
                                            )}
                                            {order.trip.destination.address && (
                                                <div>To: {order.trip.destination.address}</div>
                                            )}
                                        </div>

                                        {mapError && <div style={styles.errorBox}>{mapError}</div>}

                                        {order.trip.polyline ? (
                                            <div ref={mapRef} style={styles.map} />
                                        ) : (
                                            <div style={styles.noTrip}>
                                                Route geometry was not saved for this trip.
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    page: { minHeight: "100vh", backgroundColor: "#f5f7fb" },
    main: { maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem 3rem" },
    backLink: {
        display: "inline-block",
        marginBottom: "1rem",
        color: "#1b4332",
        fontWeight: 600,
        textDecoration: "none",
    },
    header: {
        padding: "2rem",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        marginBottom: "1.5rem",
    },
    eyebrow: {
        letterSpacing: "0.3em",
        textTransform: "uppercase",
        fontSize: "0.75rem",
        color: "#40916c",
        marginBottom: "0.5rem",
    },
    title: { margin: 0, fontSize: "1.75rem", color: "#1b4332" },
    subtitle: { marginTop: "0.5rem", color: "#495057" },
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1.5rem",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    },
    cardTitle: { margin: "0 0 1rem", fontSize: "1.25rem", color: "#1b4332" },
    itemsTable: { width: "100%", borderCollapse: "collapse" },
    th: {
        backgroundColor: "#1b4332",
        color: "#ffffff",
        padding: "0.6rem",
        textAlign: "left",
        fontSize: "0.8rem",
    },
    td: {
        padding: "0.6rem",
        borderBottom: "1px solid #e9ecef",
        fontSize: "0.9rem",
        color: "#333",
    },
    badge: {
        backgroundColor: "#d8f3dc",
        color: "#2d6a4f",
        padding: "0.15rem 0.55rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
    },
    totals: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "1rem",
        fontWeight: 600,
        color: "#1b4332",
    },
    tripMeta: {
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
        marginBottom: "1rem",
        fontSize: "0.9rem",
        color: "#495057",
    },
    map: {
        width: "100%",
        height: 400,
        borderRadius: 8,
        overflow: "hidden",
    },
    noTrip: {
        padding: "1rem",
        backgroundColor: "#f8f9fa",
        border: "1px dashed #ced4da",
        borderRadius: 8,
        color: "#6c757d",
        textAlign: "center",
    },
    loading: { color: "#6c757d", textAlign: "center", padding: "2rem" },
    errorBox: {
        padding: "1rem",
        backgroundColor: "#ffe3e3",
        color: "#a4161a",
        borderRadius: 8,
        marginBottom: "1rem",
    },
};

export default AdminOrderDetail;
