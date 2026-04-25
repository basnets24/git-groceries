import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

declare global {
    interface Window {
        google: any;
    }
}

interface TripInit {
    trip_id: number;
    order_id: number;
    polyline: string;
    origin: { lat: number; lng: number; address: string };
    destination: { lat: number; lng: number; address: string };
    total_duration_sec: number;
    real_duration_sec: number;
    distance_m: number;
}

const POLL_INTERVAL_MS = 2000;

function formatEta(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const loadGoogleMaps = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
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
};

function positionAlongPath(path: any[], cumulative: number[], total: number, f: number): any {
    const google = window.google;
    if (path.length === 0) return null;
    if (f <= 0) return path[0];
    if (f >= 1) return path[path.length - 1];

    const target = total * f;
    for (let i = 1; i < path.length; i++) {
        if (cumulative[i] >= target) {
            const segStart = cumulative[i - 1];
            const segEnd = cumulative[i];
            const segFrac = segEnd === segStart ? 0 : (target - segStart) / (segEnd - segStart);
            return google.maps.geometry.spherical.interpolate(path[i - 1], path[i], segFrac);
        }
    }
    return path[path.length - 1];
}

const TrackDelivery: React.FC = () => {
    const { tripId } = useParams<{ tripId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const trip = (location.state as any)?.trip as TripInit | undefined;

    const mapRef = useRef<HTMLDivElement>(null);
    const robotMarkerRef = useRef<any>(null);
    const pathRef = useRef<any[]>([]);
    const cumulativeRef = useRef<number[]>([]);
    const totalDistRef = useRef<number>(0);

    const [eta, setEta] = useState<number | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [finished, setFinished] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!trip) {
            setError("No trip data available. Start a delivery from checkout.");
            return;
        }
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setError("Google Maps API key is not configured");
            return;
        }

        loadGoogleMaps(apiKey)
            .then(() => {
                const google = window.google;
                const decoded = google.maps.geometry.encoding.decodePath(trip.polyline);
                pathRef.current = decoded;

                const cumulative: number[] = [0];
                let total = 0;
                for (let i = 1; i < decoded.length; i++) {
                    total += google.maps.geometry.spherical.computeDistanceBetween(
                        decoded[i - 1],
                        decoded[i]
                    );
                    cumulative.push(total);
                }
                cumulativeRef.current = cumulative;
                totalDistRef.current = total;

                const originPos = decoded[0] ?? trip.origin;
                const destPos = decoded[decoded.length - 1] ?? trip.destination;

                const map = new google.maps.Map(mapRef.current!, {
                    center: originPos,
                    zoom: 13,
                });

                new google.maps.Polyline({
                    path: decoded,
                    strokeColor: "#2d6a4f",
                    strokeWeight: 5,
                    strokeOpacity: 0.85,
                    map,
                });

                new google.maps.Marker({
                    position: originPos,
                    map,
                    label: "A",
                    title: "SJSU Engineering Building",
                });
                new google.maps.Marker({
                    position: destPos,
                    map,
                    label: "B",
                    title: trip.destination.address,
                });

                robotMarkerRef.current = new google.maps.Marker({
                    position: originPos,
                    map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#ff6b35",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 3,
                    },
                    title: "Delivery Robot",
                    zIndex: 999,
                });

                const bounds = new google.maps.LatLngBounds();
                bounds.extend(originPos);
                bounds.extend(destPos);
                map.fitBounds(bounds);
            })
            .catch((e) => setError(e.message || "Map failed to load"));
    }, [trip]);

    useEffect(() => {
        if (!trip || finished) return;
        const token = localStorage.getItem("token");

        const poll = async () => {
            try {
                const res = await fetch(`/api/delivery/${trip.trip_id}/status`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) return;
                const data = await res.json();
                setEta(data.eta_sec);
                setProgress(data.progress);
                setFinished(data.finished);

                if (
                    pathRef.current.length &&
                    robotMarkerRef.current &&
                    window.google?.maps?.geometry
                ) {
                    const pos = positionAlongPath(
                        pathRef.current,
                        cumulativeRef.current,
                        totalDistRef.current,
                        data.progress
                    );
                    if (pos) robotMarkerRef.current.setPosition(pos);
                }
            } catch {
                /* ignore transient errors; next tick will retry */
            }
        };

        poll();
        const id = setInterval(poll, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [trip, finished]);

    if (error) {
        return (
            <div style={styles.pageContainer}>
                <Navbar />
                <main style={styles.main}>
                    <div style={styles.errorCard}>
                        <p style={styles.errorText}>{error}</p>
                        <button style={styles.button} onClick={() => navigate("/orders")}>
                            View Orders
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div style={styles.pageContainer}>
            <Navbar />
            <main style={styles.main}>
                <div style={styles.container}>
                    <h1 style={styles.title}>
                        Tracking Order #{trip?.order_id ?? tripId}
                    </h1>

                    <div style={styles.statusBar}>
                        {finished ? (
                            <span style={styles.delivered}>Delivered ✓</span>
                        ) : (
                            <>
                                <span>
                                    ETA: <strong>{eta != null ? formatEta(eta) : "—"}</strong>
                                </span>
                                <span>
                                    Progress: <strong>{Math.round(progress * 100)}%</strong>
                                </span>
                                <span>
                                    To: <strong>{trip?.destination.address}</strong>
                                </span>
                            </>
                        )}
                    </div>

                    <div ref={mapRef} style={styles.map} />
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
        maxWidth: 1100,
        margin: "0 auto",
    },
    title: {
        fontSize: "1.8rem",
        fontWeight: 700,
        color: "#1b4332",
        textAlign: "center",
        marginBottom: "1rem",
    },
    statusBar: {
        display: "flex",
        gap: "1.5rem",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        backgroundColor: "#ffffff",
        borderRadius: 8,
        padding: "1rem",
        marginBottom: "1rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        color: "#333",
    },
    delivered: {
        color: "#2d6a4f",
        fontWeight: 700,
        fontSize: "1.1rem",
    },
    map: {
        width: "100%",
        height: 520,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    errorCard: {
        maxWidth: 500,
        margin: "4rem auto",
        padding: "2rem",
        backgroundColor: "#f8d7da",
        border: "1px solid #f5c6cb",
        borderRadius: 8,
        textAlign: "center",
    },
    errorText: {
        color: "#721c24",
        marginBottom: "1rem",
    },
    button: {
        backgroundColor: "#2d6a4f",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "0.75rem 1.5rem",
        fontWeight: 600,
        cursor: "pointer",
    },
};

export default TrackDelivery;
