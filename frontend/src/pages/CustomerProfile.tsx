import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

type Profile = {
  userId: number;
  defaultAddressId: number | null;
  substitutionPreference: string | null;
  notes: string | null;
};

type Address = {
  id: number;
  label: string;
  streetLine1: string;
  streetLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions?: string | null;
  isDefault: boolean;
};

type CustomerContextResponse = {
  profile: Profile;
  addresses: Address[];
};

const CustomerProfile: React.FC = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/customers/${user.customerID}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Unable to load profile");
      }
      const data: CustomerContextResponse = await res.json();
      setProfile(data.profile);
      setAddresses(data.addresses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  const handleSetDefault = async (addressId: number) => {
    if (!user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/customers/${user.customerID}/default-address`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ addressId }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to update default address");
      }
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setBusy(false);
    }
  };

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Customer Profile</p>
            <h1 style={styles.title}>
              {user ? `Hello, ${user.username}` : "Loading profile..."}
            </h1>
            <p style={styles.subtitle}>
              Manage your delivery preferences and saved addresses in one place.
            </p>
          </div>
          <button
            type="button"
            style={styles.refreshButton}
            onClick={fetchProfile}
            disabled={busy || !user}
          >
            Refresh
          </button>
        </header>

        {error && <div style={styles.error}>{error}</div>}

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Preference</h2>
          {profile ? (
            <div style={styles.profileCard}>
              <p>
                <strong>Substitution preference:</strong>{" "}
                {profile.substitutionPreference || "Not set"}
              </p>
              <p>
                <strong>Notes:</strong> {profile.notes || "No notes yet"}
              </p>
              <p>
                <strong>Default address ID:</strong>{" "}
                {profile.defaultAddressId ?? "None"}
              </p>
            </div>
          ) : (
            <p>Loading profile...</p>
          )}
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Addresses</h2>
            <span style={styles.badge}>{addresses.length} saved</span>
          </div>
          {addresses.length === 0 ? (
            <p>No addresses yet. Add one via the mobile app or upcoming form.</p>
          ) : (
            <ul style={styles.addressList}>
              {addresses.map((address) => (
                <li key={address.id} style={styles.addressCard}>
                  <div>
                    <div style={styles.addressHeader}>
                      <h3 style={styles.addressTitle}>{address.label}</h3>
                      {address.isDefault && (
                        <span style={styles.defaultBadge}>Default</span>
                      )}
                    </div>
                    <p style={styles.addressLine}>
                      {address.streetLine1}
                      {address.streetLine2 ? `, ${address.streetLine2}` : ""}
                    </p>
                    <p style={styles.addressLine}>
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    {address.deliveryInstructions && (
                      <p style={styles.instructions}>
                        {address.deliveryInstructions}
                      </p>
                    )}
                  </div>
                  {!address.isDefault && (
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => handleSetDefault(address.id)}
                      disabled={busy}
                    >
                      Set as default
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
  },
  main: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "2rem 1.25rem 3rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    padding: "1.75rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.08)",
  },
  eyebrow: {
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    fontSize: "0.75rem",
    color: "#40916c",
    marginBottom: "0.4rem",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    color: "#1b4332",
  },
  subtitle: {
    margin: 0,
    color: "#495057",
    lineHeight: 1.5,
    maxWidth: "560px",
  },
  refreshButton: {
    backgroundColor: "#1b4332",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.65rem 1.25rem",
    cursor: "pointer",
    fontWeight: 600,
  },
  error: {
    marginTop: "1rem",
    padding: "0.75rem 1rem",
    backgroundColor: "#ffe3e3",
    borderRadius: "8px",
    color: "#c92a2a",
  },
  section: {
    marginTop: "2rem",
    backgroundColor: "#ffffff",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
  },
  sectionTitle: {
    margin: 0,
    color: "#1b4332",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  badge: {
    backgroundColor: "#d8f3dc",
    color: "#1b4332",
    borderRadius: "999px",
    padding: "0.25rem 0.9rem",
    fontWeight: 600,
  },
  profileCard: {
    marginTop: "1rem",
    lineHeight: 1.6,
    color: "#212529",
  },
  addressList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: "1rem",
  },
  addressCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    border: "1px solid #e9ecef",
    borderRadius: "10px",
    padding: "1rem",
  },
  addressHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  addressTitle: {
    margin: 0,
    fontSize: "1.1rem",
    color: "#1b4332",
  },
  defaultBadge: {
    backgroundColor: "#1b4332",
    color: "#fff",
    borderRadius: "999px",
    padding: "0.2rem 0.6rem",
    fontSize: "0.75rem",
    letterSpacing: "0.03em",
  },
  addressLine: {
    margin: "0.25rem 0",
    color: "#495057",
  },
  instructions: {
    marginTop: "0.25rem",
    fontStyle: "italic",
    color: "#6c757d",
  },
  secondaryButton: {
    alignSelf: "center",
    backgroundColor: "#fff",
    border: "1px solid #1b4332",
    borderRadius: "8px",
    padding: "0.45rem 1rem",
    color: "#1b4332",
    cursor: "pointer",
    fontWeight: 600,
  },
};

export default CustomerProfile;
