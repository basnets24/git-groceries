import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

declare global {
  interface Window {
    google: any;
  }
}

interface Robot {
  robot_id: number;
  label: string;
  status: "IDLE" | "DISPATCHED" | "RETURNING" | "OFFLINE";
  lat: number;
  lng: number;
  trip_id: number | null;
  updated_at: string | null;
}

interface PendingOrder {
  order_id: number;
  status: string;
  customer: { customer_id: number; username: string; email: string };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    formatted: string;
    lat: number | null;
    lng: number | null;
    geocode_status: string;
  };
  total_weight: number;
  subtotal: number;
  ready_at: string | null;
  seconds_since_ready: number | null;
  seconds_until_auto_dispatch: number | null;
  auto_dispatch_ready: boolean;
}

interface TripResult {
  trip_id: number;
  robot_id: number;
  polyline: string | null;
  distance_m: number;
  duration_sec: number;
  stops: Array<{
    stop_index: number;
    order_id: number;
    address: string;
    eta: string;
    leg_duration_sec: number;
  }>;
}

const REFRESH_INTERVAL_MS = 10000;
const COUNTDOWN_INTERVAL_MS = 1000;

const loadGoogleMaps = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
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

const ROBOT_COLORS = [
  "#e63946", "#1d3557", "#2a9d8f", "#e76f51", "#6a4c93",
  "#ff9f1c", "#007f5f", "#c9184a", "#3d348b", "#8d99ae",
];

const formatCountdown = (secs: number | null): string => {
  if (secs === null || secs === undefined) return "—";
  if (secs <= 0) return "expired";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const AdminFleet: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [robots, setRobots] = useState<Robot[]>([]);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [autoDispatchAfterSec, setAutoDispatchAfterSec] = useState(300);
  const [assignments, setAssignments] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const robotMarkersRef = useRef<Record<number, any>>({});
  const orderMarkersRef = useRef<Record<number, any>>({});
  const autoDispatchRequestedRef = useRef<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("Not authenticated");
      return;
    }
    try {
      const [robotsRes, pendingRes] = await Promise.all([
        fetch("/api/admin/robots", { headers: authHeaders }),
        fetch("/api/admin/dispatch/pending", { headers: authHeaders }),
      ]);
      if (!robotsRes.ok) {
        const msg = await robotsRes.json().catch(() => ({}));
        throw new Error(msg?.error || `Robots: ${robotsRes.status}`);
      }
      if (!pendingRes.ok) {
        const msg = await pendingRes.json().catch(() => ({}));
        throw new Error(msg?.error || `Pending: ${pendingRes.status}`);
      }
      const robotsData = await robotsRes.json();
      const pendingData = await pendingRes.json();
      setRobots(robotsData.robots || []);
      setOrders(pendingData.orders || []);
      setAutoDispatchAfterSec(pendingData.auto_dispatch_after_sec ?? 300);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
    const id = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authLoading, fetchData]);

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), COUNTDOWN_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Clean up stale assignments when the pending list changes.
  useEffect(() => {
    setAssignments((prev) => {
      const next: Record<number, number | null> = {};
      for (const order of orders) {
        next[order.order_id] = prev[order.order_id] ?? null;
      }
      return next;
    });
  }, [orders]);

  // Map bootstrap.
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key is not configured");
      return;
    }
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.3352, lng: -121.8811 },
          zoom: 13,
        });
      })
      .catch((e) => setError(e.message || "Map failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Render robot markers on the map.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    const existing = robotMarkersRef.current;
    const seen = new Set<number>();

    robots.forEach((r) => {
      seen.add(r.robot_id);
      const color = ROBOT_COLORS[(r.robot_id - 1) % ROBOT_COLORS.length];
      const position = { lat: r.lat, lng: r.lng };
      if (existing[r.robot_id]) {
        existing[r.robot_id].setPosition(position);
        existing[r.robot_id].setTitle(`${r.label} (${r.status})`);
      } else {
        existing[r.robot_id] = new window.google.maps.Marker({
          position,
          map,
          label: { text: String(r.robot_id), color: "#ffffff", fontWeight: "700" },
          title: `${r.label} (${r.status})`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 500,
        });
      }
    });

    for (const key of Object.keys(existing)) {
      const id = Number(key);
      if (!seen.has(id)) {
        existing[id].setMap(null);
        delete existing[id];
      }
    }
  }, [robots]);

  // Render pending-order markers.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    const existing = orderMarkersRef.current;
    const seen = new Set<number>();

    orders.forEach((o) => {
      if (o.address.lat == null || o.address.lng == null) return;
      seen.add(o.order_id);
      const assignedRobot = assignments[o.order_id] ?? null;
      const color =
        assignedRobot !== null
          ? ROBOT_COLORS[(assignedRobot - 1) % ROBOT_COLORS.length]
          : "#495057";
      const position = { lat: o.address.lat, lng: o.address.lng };
      if (existing[o.order_id]) {
        existing[o.order_id].setPosition(position);
        existing[o.order_id].setIcon({
          path: "M -8 -8 H 8 V 8 H -8 Z",
          scale: 1,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        });
        existing[o.order_id].setTitle(
          `Order #${o.order_id} — ${o.customer.username}` +
            (assignedRobot ? ` (Robot #${assignedRobot})` : " (unassigned)"),
        );
      } else {
        existing[o.order_id] = new window.google.maps.Marker({
          position,
          map,
          label: { text: `#${o.order_id}`, color: "#ffffff", fontSize: "11px", fontWeight: "600" },
          title: `Order #${o.order_id} — ${o.customer.username}`,
          icon: {
            path: "M -8 -8 H 8 V 8 H -8 Z",
            scale: 1,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 300,
        });
      }
    });

    for (const key of Object.keys(existing)) {
      const id = Number(key);
      if (!seen.has(id)) {
        existing[id].setMap(null);
        delete existing[id];
      }
    }
  }, [orders, assignments]);

  const orderWeights = useMemo(() => {
    const m: Record<number, number> = {};
    for (const o of orders) m[o.order_id] = o.total_weight;
    return m;
  }, [orders]);

  const assignmentGroups = useMemo(() => {
    const groups: Record<number, number[]> = {};
    for (const [orderIdStr, robotId] of Object.entries(assignments)) {
      if (robotId == null) continue;
      const orderId = Number(orderIdStr);
      if (!groups[robotId]) groups[robotId] = [];
      groups[robotId].push(orderId);
    }
    return groups;
  }, [assignments]);

  const groupWeight = (robotId: number): number =>
    (assignmentGroups[robotId] || []).reduce(
      (acc, oid) => acc + (orderWeights[oid] || 0),
      0,
    );

  const unassigned = orders.filter((o) => !assignments[o.order_id]);

  const handleAssign = (orderId: number, robotId: number | null) => {
    setAssignments((prev) => ({ ...prev, [orderId]: robotId }));
  };

  const handleClearAll = () => {
    setAssignments((prev) => {
      const next: Record<number, number | null> = {};
      for (const key of Object.keys(prev)) next[Number(key)] = null;
      return next;
    });
  };

  const handleConfirm = async () => {
    const groups = Object.entries(assignmentGroups).map(([rid, oids]) => ({
      robot_id: Number(rid),
      order_ids: oids,
    }));
    if (!groups.length) {
      setStatus({ type: "error", message: "Assign at least one order before confirming." });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/dispatch/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ groups }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Dispatch failed: ${res.status}`);
      }
      const trips: TripResult[] = data.trips || [];
      setStatus({
        type: "success",
        message: `Dispatched ${trips.length} trip(s) covering ${trips.reduce(
          (n, t) => n + t.stops.length,
          0,
        )} order(s).`,
      });
      setAssignments({});
      fetchData();
    } catch (e) {
      setStatus({
        type: "error",
        message: e instanceof Error ? e.message : "Dispatch failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const runAutoDispatch = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dispatch/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Auto-dispatch failed");
      }
      const trips: TripResult[] = data.trips || [];
      if (trips.length) {
        setStatus({
          type: "success",
          message: `Auto-dispatched ${trips.length} trip(s) past the 5-minute window.`,
        });
        fetchData();
      }
    } catch (e) {
      setStatus({
        type: "error",
        message: e instanceof Error ? e.message : "Auto-dispatch failed",
      });
    }
  }, [authHeaders, fetchData]);

  // Trigger auto-dispatch at most once per minute while there are expired orders.
  useEffect(() => {
    const hasExpired = orders.some(
      (o) => o.seconds_until_auto_dispatch !== null && o.seconds_until_auto_dispatch <= 0,
    );
    if (!hasExpired) return;
    const now = Date.now();
    const last = autoDispatchRequestedRef.current;
    if (last && now - last < 60000) return;
    autoDispatchRequestedRef.current = now;
    runAutoDispatch();
  }, [orders, nowTick, runAutoDispatch]);

  if (!authLoading && (!user || user.role === "CUSTOMER")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Admin · Delivery Fleet</p>
            <h1 style={styles.title}>Dispatch Console</h1>
            <p style={styles.subtitle}>
              Assign pending orders to delivery bots. After five minutes, any
              unconfirmed orders are auto-dispatched onto idle robots.
            </p>
          </div>
          <div style={styles.headerStats}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{robots.length}</span>
              <span style={styles.statLabel}>Robots</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>
                {robots.filter((r) => r.status === "IDLE").length}
              </span>
              <span style={styles.statLabel}>Idle</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{orders.length}</span>
              <span style={styles.statLabel}>Pending</span>
            </div>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}
        {status && (
          <div
            style={
              status.type === "success" ? styles.successBox : styles.errorBox
            }
            role="status"
          >
            {status.message}
          </div>
        )}

        <section style={styles.layout}>
          <div ref={mapRef} style={styles.map} />

          <aside style={styles.sidebar}>
            <h2 style={styles.sidebarTitle}>Pending Orders</h2>
            {loading && <p style={styles.muted}>Loading…</p>}
            {!loading && orders.length === 0 && (
              <p style={styles.muted}>No orders awaiting dispatch.</p>
            )}

            {unassigned.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Unassigned ({unassigned.length})</h3>
                {unassigned.map((o) => {
                  const auto =
                    o.seconds_until_auto_dispatch === null
                      ? null
                      : Math.max(0, o.seconds_until_auto_dispatch - nowTick);
                  return (
                    <div key={o.order_id} style={styles.orderRow}>
                      <div>
                        <p style={styles.orderTitle}>
                          #{o.order_id} · {o.customer.username}
                        </p>
                        <p style={styles.orderMeta}>
                          {o.address.formatted || "(no address)"}
                        </p>
                        <p style={styles.orderMeta}>
                          {o.total_weight.toFixed(1)} lbs · $
                          {o.subtotal.toFixed(2)} · auto in{" "}
                          <strong
                            style={{
                              color: auto !== null && auto <= 0 ? "#a4161a" : "#1b4332",
                            }}
                          >
                            {formatCountdown(auto)}
                          </strong>
                        </p>
                      </div>
                      <select
                        value={""}
                        onChange={(e) =>
                          handleAssign(o.order_id, e.target.value ? Number(e.target.value) : null)
                        }
                        style={styles.select}
                      >
                        <option value="">Assign robot…</option>
                        {robots.map((r) => (
                          <option
                            key={r.robot_id}
                            value={r.robot_id}
                            disabled={r.status !== "IDLE"}
                          >
                            {r.label} {r.status !== "IDLE" ? `(${r.status})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {Object.keys(assignmentGroups).length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Planned Trips</h3>
                {Object.entries(assignmentGroups).map(([rid, oids]) => {
                  const robotId = Number(rid);
                  const robot = robots.find((r) => r.robot_id === robotId);
                  const color = ROBOT_COLORS[(robotId - 1) % ROBOT_COLORS.length];
                  return (
                    <div key={rid} style={styles.tripBlock}>
                      <div style={styles.tripHeader}>
                        <span
                          style={{
                            ...styles.robotBadge,
                            backgroundColor: color,
                          }}
                        >
                          {robot?.label || `Robot #${rid}`}
                        </span>
                        <span style={styles.tripWeight}>
                          {groupWeight(robotId).toFixed(1)} lbs · {oids.length} stop(s)
                        </span>
                      </div>
                      {oids.map((oid) => {
                        const order = orders.find((o) => o.order_id === oid);
                        return (
                          <div key={oid} style={styles.tripStop}>
                            <div>
                              <p style={styles.orderTitle}>#{oid}</p>
                              <p style={styles.orderMeta}>
                                {order?.address.formatted || ""} ·{" "}
                                {order?.total_weight.toFixed(1)} lbs
                              </p>
                            </div>
                            <button
                              type="button"
                              style={styles.unassignButton}
                              onClick={() => handleAssign(oid, null)}
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={handleClearAll}
                    disabled={submitting}
                  >
                    Clear assignments
                  </button>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={handleConfirm}
                    disabled={submitting}
                  >
                    {submitting ? "Dispatching…" : "Confirm & dispatch"}
                  </button>
                </div>
              </div>
            )}

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Fleet</h3>
              {robots.map((r) => {
                const color = ROBOT_COLORS[(r.robot_id - 1) % ROBOT_COLORS.length];
                return (
                  <div key={r.robot_id} style={styles.fleetRow}>
                    <span style={{ ...styles.robotDot, backgroundColor: color }}>
                      {r.robot_id}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={styles.orderTitle}>{r.label}</p>
                      <p style={styles.orderMeta}>
                        {r.status}
                        {r.trip_id ? ` · trip #${r.trip_id}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={styles.helper}>
              Auto-dispatch kicks in {autoDispatchAfterSec} seconds after an
              order becomes ready for delivery.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  page: { minHeight: "100vh", backgroundColor: "#f5f7fb" },
  main: { maxWidth: 1480, margin: "0 auto", padding: "2rem 1.5rem 3rem" },
  header: {
    padding: "2rem",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    marginBottom: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "1rem",
  },
  headerStats: { display: "flex", gap: "1.5rem", flexWrap: "wrap" },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.75rem 1.25rem",
    backgroundColor: "#f1f3f5",
    borderRadius: 10,
    minWidth: 80,
  },
  statValue: { fontSize: "1.5rem", fontWeight: 700, color: "#1b4332" },
  statLabel: {
    fontSize: "0.75rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6c757d",
  },
  eyebrow: {
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    fontSize: "0.75rem",
    color: "#40916c",
    marginBottom: "0.5rem",
  },
  title: { margin: 0, fontSize: "2rem", color: "#1b4332" },
  subtitle: {
    marginTop: "0.5rem",
    color: "#495057",
    maxWidth: 680,
    lineHeight: 1.5,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(360px, 1fr)",
    gap: "1.5rem",
  },
  map: {
    width: "100%",
    minHeight: 640,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  sidebar: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: 720,
    overflowY: "auto",
  },
  sidebarTitle: { margin: 0, color: "#1b4332", fontSize: "1.25rem" },
  section: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  sectionTitle: {
    margin: "0.5rem 0 0",
    fontSize: "0.95rem",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  orderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem",
    borderRadius: 8,
    border: "1px solid #e9ecef",
    backgroundColor: "#f8f9fa",
  },
  orderTitle: { margin: 0, fontWeight: 600, color: "#1b4332" },
  orderMeta: { margin: 0, fontSize: "0.8rem", color: "#6c757d" },
  select: {
    padding: "0.4rem 0.5rem",
    borderRadius: 6,
    border: "1px solid #ced4da",
    fontSize: "0.85rem",
    minWidth: 170,
  },
  tripBlock: {
    border: "1px solid #dee2e6",
    borderRadius: 10,
    padding: "0.75rem",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  tripHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  robotBadge: {
    color: "#ffffff",
    fontWeight: 700,
    padding: "0.2rem 0.6rem",
    borderRadius: 999,
    fontSize: "0.85rem",
  },
  tripWeight: { fontSize: "0.8rem", color: "#6c757d" },
  tripStop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem",
    borderRadius: 6,
    backgroundColor: "#f8f9fa",
    gap: "0.5rem",
  },
  unassignButton: {
    border: "1px solid #dee2e6",
    background: "#ffffff",
    color: "#495057",
    padding: "0.3rem 0.6rem",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  actionRow: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#1b4332",
    color: "#ffffff",
    border: "none",
    padding: "0.6rem 1.1rem",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    backgroundColor: "#e9ecef",
    color: "#495057",
    border: "none",
    padding: "0.6rem 1.1rem",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  fleetRow: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  robotDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  errorBox: {
    padding: "0.85rem 1rem",
    backgroundColor: "#ffe3e3",
    color: "#a4161a",
    borderRadius: 8,
    marginBottom: "1rem",
  },
  successBox: {
    padding: "0.85rem 1rem",
    backgroundColor: "#d8f3dc",
    color: "#1b4332",
    borderRadius: 8,
    marginBottom: "1rem",
  },
  helper: {
    fontSize: "0.8rem",
    color: "#6c757d",
    margin: 0,
    paddingTop: "0.5rem",
    borderTop: "1px dashed #dee2e6",
  },
  muted: { color: "#6c757d", margin: 0 },
};

export default AdminFleet;
