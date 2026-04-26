import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

interface TripSummary {
    trip_id: number;
    order_id: number;
    polyline: string;
    origin: { lat: number; lng: number; address: string };
    destination: { lat: number; lng: number; address: string };
    total_duration_sec: number;
    real_duration_sec: number;
    distance_m: number;
    progress: number;
    eta_sec: number;
    finished: boolean;
}

interface PendingOrder {
    order_id: number;
    address: string;
}

const POLL_MS = 3000;

function formatEta(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const Delivery: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [trips, setTrips] = useState<TripSummary[]>([]);
    const [pending, setPending] = useState<PendingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const completedTripIds = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const token = localStorage.getItem("token");
        const fetchTrips = async () => {
            try {
                const res = await fetch("/api/delivery/mine", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to load deliveries");
                const data = await res.json();
                const trips: TripSummary[] = data.trips || [];
                const pending: PendingOrder[] = data.pending || [];
                setTrips(trips);
                setPending(pending);
                setError(null);

                for (const trip of trips) {
                    if (trip.finished && !completedTripIds.current.has(trip.trip_id)) {
                        completedTripIds.current.add(trip.trip_id);
                        fetch(`/api/delivery/${trip.trip_id}/complete`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ order_id: trip.order_id }),
                        });
                    }
                }

                return { trips, pending };
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load deliveries");
                return { trips: [], pending: [] };
            } finally {
                setLoading(false);
            }
        };

        fetchTrips();
        const id = setInterval(() => {
            fetchTrips().then(({ trips, pending }) => {
                const hasActiveWork = trips.some((t) => !t.finished) || pending.length > 0;
                if (!hasActiveWork) clearInterval(id);
            });
        }, POLL_MS);
        return () => clearInterval(id);
    }, [user, authLoading]);

    const openTrack = (trip: TripSummary) => {
        navigate(`/track/${trip.trip_id}`, {
            state: {
                trip: {
                    trip_id: trip.trip_id,
                    order_id: trip.order_id,
                    polyline: trip.polyline,
                    origin: trip.origin,
                    destination: trip.destination,
                    total_duration_sec: trip.total_duration_sec,
                    real_duration_sec: trip.real_duration_sec,
                    distance_m: trip.distance_m,
                },
            },
        });
    };

    return (
        <div style={styles.pageContainer}>
            <Navbar />
            <main style={styles.main}>
                <div style={styles.container}>
                    <h1 style={styles.pageTitle}>My Deliveries</h1>

                    {!authLoading && !user && (
                        <div style={styles.empty}>
                            <p>Please log in to view your deliveries.</p>
                        </div>
                    )}

                    {user && loading && (
                        <div style={styles.empty}>
                            <p>Loading deliveries...</p>
                        </div>
                    )}

                    {user && !loading && error && (
                        <div style={styles.errorBox}>
                            <p>{error}</p>
                        </div>
                    )}

                    {user && !loading && !error && trips.length === 0 && pending.length === 0 && (
                        <div style={styles.empty}>
                            <p style={styles.text}>No deliveries yet</p>
                            <p style={styles.subtext}>
                                Place an order to start tracking a delivery.
                            </p>
                        </div>
                    )}

                    {user && !loading && (() => {
                        const active = trips.filter((t) => !t.finished);
                        const past = trips.filter((t) => t.finished);

                        const renderPendingCard = (order: PendingOrder) => (
                            <div key={order.order_id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h2 style={styles.cardTitle}>Order #{order.order_id}</h2>
                                    <span style={{ ...styles.badge, backgroundColor: "#e2eafc", color: "#1d3557" }}>
                                        Pending Dispatch
                                    </span>
                                </div>
                                {order.address && (
                                    <p style={styles.addressLine}>
                                        <strong>To:</strong> {order.address}
                                    </p>
                                )}
                                <p style={styles.subtext}>
                                    Your order is packed and waiting to be assigned to a delivery robot.
                                </p>
                            </div>
                        );

                        const renderActiveCard = (trip: TripSummary) => (
                            <div key={trip.trip_id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h2 style={styles.cardTitle}>Order #{trip.order_id}</h2>
                                    <span style={{ ...styles.badge, backgroundColor: "#fff3cd", color: "#856404" }}>
                                        In Transit
                                    </span>
                                </div>
                                <p style={styles.addressLine}>
                                    <strong>To:</strong> {trip.destination.address}
                                </p>
                                <div style={styles.progressBar}>
                                    <div style={{ ...styles.progressFill, width: `${Math.round(trip.progress * 100)}%` }} />
                                </div>
                                <div style={styles.metaRow}>
                                    <span>{Math.round(trip.progress * 100)}% complete</span>
                                    <span>ETA {formatEta(trip.eta_sec)}</span>
                                </div>
                                <button onClick={() => openTrack(trip)} style={styles.trackButton}>
                                    Track on Map
                                </button>
                            </div>
                        );

                        const renderPastCard = (trip: TripSummary) => (
                            <div key={trip.trip_id} style={styles.pastCard}>
                                <div style={styles.pastRow}>
                                    <span style={styles.pastTitle}>Order #{trip.order_id}</span>
                                    <span style={styles.pastAddress}>{trip.destination.address}</span>
                                    <span style={{ ...styles.badge, backgroundColor: "#d8f3dc", color: "#1b4332" }}>
                                        Delivered
                                    </span>
                                </div>
                            </div>
                        );

                        if (pending.length === 0 && active.length === 0 && past.length === 0) return null;

                        return (
                            <>
                                {pending.length > 0 && (
                                    <section style={styles.section}>
                                        <h2 style={styles.sectionTitle}>Pending Dispatch</h2>
                                        <div style={styles.list}>{pending.map(renderPendingCard)}</div>
                                    </section>
                                )}
                                {active.length > 0 && (
                                    <section style={styles.section}>
                                        <h2 style={styles.sectionTitle}>Active Deliveries</h2>
                                        <div style={styles.list}>{active.map(renderActiveCard)}</div>
                                    </section>
                                )}
                                {past.length > 0 && (
                                    <section style={styles.section}>
                                        <h2 style={styles.sectionTitle}>Past Deliveries</h2>
                                        <div style={styles.list}>{past.map(renderPastCard)}</div>
                                    </section>
                                )}
                            </>
                        );
                    })()}
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
        maxWidth: "900px",
        margin: "0 auto",
    },
    pageTitle: {
        fontSize: "2.25rem",
        fontWeight: 700,
        color: "#1b4332",
        textAlign: "center",
        marginBottom: "2rem",
    },
    empty: {
        textAlign: "center",
        padding: "3rem 2rem",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },
    errorBox: {
        padding: "1rem",
        backgroundColor: "#f8d7da",
        color: "#721c24",
        borderRadius: 8,
    },
    text: {
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "#1b4332",
        marginBottom: "0.5rem",
    },
    subtext: {
        fontSize: "1rem",
        color: "#6c757d",
    },
    section: {
        marginBottom: "2rem",
    },
    sectionTitle: {
        fontSize: "1.25rem",
        fontWeight: 700,
        color: "#1b4332",
        marginBottom: "1rem",
        paddingBottom: "0.4rem",
        borderBottom: "2px solid #d8f3dc",
    },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.75rem",
    },
    cardTitle: {
        fontSize: "1.25rem",
        fontWeight: 700,
        color: "#1b4332",
        margin: 0,
    },
    badge: {
        padding: "0.25rem 0.75rem",
        borderRadius: 999,
        fontSize: "0.8rem",
        fontWeight: 600,
    },
    addressLine: {
        color: "#333",
        marginBottom: "1rem",
        fontSize: "0.95rem",
    },
    progressBar: {
        width: "100%",
        height: 8,
        backgroundColor: "#e9ecef",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: "0.5rem",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#2d6a4f",
        transition: "width 0.5s linear",
    },
    metaRow: {
        display: "flex",
        justifyContent: "space-between",
        color: "#6c757d",
        fontSize: "0.9rem",
        marginBottom: "1rem",
    },
    pastCard: {
        backgroundColor: "#ffffff",
        borderRadius: 8,
        padding: "0.75rem 1rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    },
    pastRow: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
    },
    pastTitle: {
        fontWeight: 600,
        color: "#1b4332",
        fontSize: "0.95rem",
        whiteSpace: "nowrap" as const,
    },
    pastAddress: {
        flex: 1,
        color: "#6c757d",
        fontSize: "0.875rem",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
    },
    trackButton: {
        backgroundColor: "#2d6a4f",
        color: "#ffffff",
        padding: "0.6rem 1.25rem",
        border: "none",
        borderRadius: 6,
        fontWeight: 600,
        cursor: "pointer",
    },
};

export default Delivery;
