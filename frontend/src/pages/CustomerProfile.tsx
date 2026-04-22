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

type AddressForm = {
  label: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions: string;
  isDefault: boolean;
};

const EMPTY_ADDRESS_FORM: AddressForm = {
  label: "",
  streetLine1: "",
  streetLine2: "",
  city: "",
  state: "",
  postalCode: "",
  deliveryInstructions: "",
  isDefault: false,
};

const CustomerProfile: React.FC = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);

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

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressError(null);
    setShowAddressModal(true);
  };

  const handleOpenEdit = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2 ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      deliveryInstructions: address.deliveryInstructions ?? "",
      isDefault: address.isDefault,
    });
    setAddressError(null);
    setShowAddressModal(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);

    if (!addressForm.label.trim()) return setAddressError("Label is required.");
    if (!addressForm.streetLine1.trim()) return setAddressError("Street is required.");
    if (!addressForm.city.trim()) return setAddressError("City is required.");
    if (!addressForm.state.trim()) return setAddressError("State is required.");
    if (!addressForm.postalCode.trim()) return setAddressError("Postal code is required.");

    setAddressSaving(true);
    try {
      const token = localStorage.getItem("token");
      const body = {
        label: addressForm.label.trim(),
        streetLine1: addressForm.streetLine1.trim(),
        streetLine2: addressForm.streetLine2.trim() || null,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postalCode: addressForm.postalCode.trim(),
        deliveryInstructions: addressForm.deliveryInstructions.trim() || null,
        isDefault: addressForm.isDefault,
      };

      const url = editingAddress
        ? `/api/customers/${user!.customerID}/addresses/${editingAddress.id}`
        : `/api/customers/${user!.customerID}/addresses`;

      const res = await fetch(url, {
        method: editingAddress ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save address");

      setShowAddressModal(false);
      await fetchProfile();
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!window.confirm("Remove this address?")) return;
    setBusy(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/customers/${user!.customerID}/addresses/${addressId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to delete address");
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setBusy(false);
    }
  };

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
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h2 style={styles.sectionTitle}>Addresses</h2>
              <span style={styles.badge}>{addresses.length} saved</span>
            </div>
            <button type="button" style={styles.addButton} onClick={handleOpenAdd}>
              + Add Address
            </button>
          </div>
          {addresses.length === 0 ? (
            <p style={{ color: "#6c757d", marginTop: "0.5rem" }}>
              No saved addresses yet. Add one to get started.
            </p>
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
                  <div style={styles.addressActions}>
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
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => handleOpenEdit(address)}
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => handleDeleteAddress(address.id)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {showAddressModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>
              {editingAddress ? "Edit Address" : "Add Address"}
            </h2>
            <form onSubmit={handleAddressSubmit} style={styles.modalForm}>
              <label style={styles.fieldLabel}>
                Label
                <input
                  type="text"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  style={styles.fieldInput}
                  placeholder="e.g. Home, Work"
                />
              </label>

              <label style={styles.fieldLabel}>
                Street Line 1
                <input
                  type="text"
                  value={addressForm.streetLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, streetLine1: e.target.value })}
                  style={styles.fieldInput}
                  placeholder="123 Main St"
                />
              </label>

              <label style={styles.fieldLabel}>
                Street Line 2 (optional)
                <input
                  type="text"
                  value={addressForm.streetLine2}
                  onChange={(e) => setAddressForm({ ...addressForm, streetLine2: e.target.value })}
                  style={styles.fieldInput}
                  placeholder="Apt, Suite, Unit..."
                />
              </label>

              <div style={styles.formRow}>
                <label style={styles.fieldLabel}>
                  City
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    style={styles.fieldInput}
                    placeholder="San Jose"
                  />
                </label>
                <label style={styles.fieldLabel}>
                  State
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    style={styles.fieldInput}
                    placeholder="CA"
                    maxLength={2}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Postal Code
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    style={styles.fieldInput}
                    placeholder="95112"
                  />
                </label>
              </div>

              <label style={styles.fieldLabel}>
                Delivery Instructions (optional)
                <input
                  type="text"
                  value={addressForm.deliveryInstructions}
                  onChange={(e) => setAddressForm({ ...addressForm, deliveryInstructions: e.target.value })}
                  style={styles.fieldInput}
                  placeholder="Leave at door, ring bell, etc."
                />
              </label>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                />
                Set as default address
              </label>

              {addressError && <p style={styles.modalError}>{addressError}</p>}

              <div style={styles.modalActions}>
                <button type="submit" style={styles.primaryButton} disabled={addressSaving}>
                  {addressSaving ? "Saving..." : editingAddress ? "Save Changes" : "Add Address"}
                </button>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowAddressModal(false)}
                  disabled={addressSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    backgroundColor: "#fff",
    border: "1px solid #1b4332",
    borderRadius: "8px",
    padding: "0.45rem 1rem",
    color: "#1b4332",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  addressActions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    alignSelf: "center",
    flexShrink: 0,
  },
  addButton: {
    backgroundColor: "#1b4332",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.5rem 1.1rem",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  deleteButton: {
    backgroundColor: "#fff",
    border: "1px solid #dc3545",
    borderRadius: "8px",
    padding: "0.45rem 1rem",
    color: "#dc3545",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "2rem",
    width: "100%",
    maxWidth: "540px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#1b4332",
    margin: "0 0 1.5rem 0",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 80px 1fr",
    gap: "0.75rem",
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#495057",
  },
  fieldInput: {
    padding: "0.6rem 0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    fontSize: "1rem",
    color: "#212529",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#495057",
    cursor: "pointer",
  },
  modalError: {
    margin: 0,
    color: "#dc3545",
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  modalActions: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "0.25rem",
  },
  primaryButton: {
    flex: 1,
    padding: "0.75rem",
    backgroundColor: "#1b4332",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  cancelButton: {
    flex: 1,
    padding: "0.75rem",
    backgroundColor: "#e9ecef",
    color: "#495057",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default CustomerProfile;
