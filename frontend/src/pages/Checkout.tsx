import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { loadStripe, Stripe as StripeType, StripeElements } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

interface CheckoutSummary {
    items: Array<{
        order_id: number;
        product_id: number;
        name: string;
        price: number;
        category: string;
        quantity: number;
        price_at_checkout: number;
        weight_at_checkout: number;
    }>;
    subtotal: number;
    total_weight: number;
    delivery_charge: number;
    total_amount: number;
}

interface PaymentIntent {
    payment_intent_id: string;
    client_secret: string;
    amount: number;
    currency: string;
    status: string;
}

interface CheckoutResponse {
    order_id: number;
    checkout: CheckoutSummary;
    payment_intent: PaymentIntent;
}

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

const CheckoutForm: React.FC<{ clientSecret: string; onSuccess: () => void }> = ({
    clientSecret,
    onSuccess,
}) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);
        setError(null);

        const { error: submitError } = await elements.submit();
        if (submitError?.message) {
            setError(submitError.message);
            setProcessing(false);
            return;
        }

        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardElement)!,
                billing_details: {},
            },
        });

        if (confirmError) {
            setError(confirmError.message || "Payment failed");
            setProcessing(false);
        } else {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.cardContainer}>
                <label style={styles.label}>Card Details</label>
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: "16px",
                                color: "#424770",
                                "::placeholder": {
                                    color: "#aab7c4",
                                },
                            },
                            invalid: {
                                color: "#9e2146",
                            },
                        },
                    }}
                />
            </div>
            {error && <div style={styles.errorMessage}>{error}</div>}
            <button
                type="submit"
                disabled={processing || !stripe}
                style={{
                    ...styles.submitButton,
                    opacity: processing || !stripe ? 0.6 : 1,
                    cursor: processing || !stripe ? "not-allowed" : "pointer",
                }}
            >
                {processing ? "Processing..." : "Complete Payment"}
            </button>
        </form>
    );
};

const Checkout: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const customerId = user?.customerID;

    useEffect(() => {
        const initializeCheckout = async () => {
            if (!customerId) return;

            const token = localStorage.getItem("token");
            if (!token) {
                setError("Session expired. Please log in again.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch("/api/checkout", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error || "Failed to initialize checkout"
                    );
                }

                const data = await response.json();
                setCheckout(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            initializeCheckout();
        }
    }, [customerId, authLoading]);

    if (!authLoading && !user) {
        return <Navigate to="/login" replace />;
    }

    if (paymentSuccess) {
        return (
            <div style={styles.pageContainer}>
                <Navbar />
                <main style={styles.main}>
                    <div style={styles.container}>
                        <div style={styles.successCard}>
                            <h1 style={styles.successTitle}>Payment Successful! ✓</h1>
                            <p style={styles.successText}>
                                Your order has been placed successfully. You can track your
                                delivery in real-time.
                            </p>
                            <div style={styles.successDetails}>
                                {checkout && (
                                    <>
                                        <p>
                                            <strong>Order ID:</strong> {checkout.order_id}
                                        </p>
                                        <p>
                                            <strong>Total Amount:</strong> $
                                            {checkout.checkout.total_amount.toFixed(2)}
                                        </p>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => navigate("/orders")}
                                style={styles.successButton}
                            >
                                View My Orders
                            </button>
                        </div>
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
                    <h1 style={styles.pageTitle}>Checkout</h1>

                    {loading && (
                        <div style={styles.loadingContainer}>
                            <p style={styles.loadingText}>Initializing checkout...</p>
                        </div>
                    )}

                    {error && (
                        <div style={styles.errorContainer}>
                            <p style={styles.errorText}>Error: {error}</p>
                            <button
                                onClick={() => navigate("/cart")}
                                style={styles.backButton}
                            >
                                Back to Cart
                            </button>
                        </div>
                    )}

                    {!loading && !error && checkout && (
                        <div style={styles.checkoutGrid}>
                            <div style={styles.orderSummarySection}>
                                <h2 style={styles.sectionTitle}>Order Summary</h2>

                                <div style={styles.itemsList}>
                                    {checkout.checkout.items.map((item) => (
                                        <div key={item.product_id} style={styles.itemRow}>
                                            <div style={styles.itemInfo}>
                                                <p style={styles.itemName}>{item.name}</p>
                                                <p style={styles.itemMeta}>
                                                    {item.quantity} × ${item.price_at_checkout.toFixed(2)}{" "}
                                                    ({item.weight_at_checkout.toFixed(1)} lbs each)
                                                </p>
                                            </div>
                                            <p style={styles.itemPrice}>
                                                $
                                                {(item.price_at_checkout * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div style={styles.divider} />

                                <div style={styles.summaryRow}>
                                    <span>Subtotal</span>
                                    <span>${checkout.checkout.subtotal.toFixed(2)}</span>
                                </div>

                                <div style={styles.summaryRow}>
                                    <span>
                                        Delivery ({checkout.checkout.total_weight.toFixed(1)} lbs)
                                    </span>
                                    <span>
                                        {checkout.checkout.delivery_charge === 0
                                            ? "FREE"
                                            : `$${checkout.checkout.delivery_charge.toFixed(2)}`}
                                    </span>
                                </div>

                                <div style={styles.totalRow}>
                                    <span style={styles.totalLabel}>Total</span>
                                    <span style={styles.totalValue}>
                                        ${checkout.checkout.total_amount.toFixed(2)}
                                    </span>
                                </div>

                                <div style={styles.deliveryNote}>
                                    <p>
                                        {checkout.checkout.delivery_charge === 0
                                            ? "✓ FREE delivery — your order is under 20 lbs!"
                                            : "Delivery charge of $10 applies for orders 20 lbs or more"}
                                    </p>
                                </div>
                            </div>

                            <div style={styles.paymentSection}>
                                <h2 style={styles.sectionTitle}>Payment Details</h2>
                                <Elements stripe={stripePromise}>
                                    <CheckoutForm
                                        clientSecret={checkout.payment_intent.client_secret}
                                        onSuccess={() => setPaymentSuccess(true)}
                                    />
                                </Elements>
                            </div>
                        </div>
                    )}
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
        maxWidth: "1000px",
        margin: "0 auto",
    },
    pageTitle: {
        fontSize: "2.25rem",
        fontWeight: 700,
        color: "#1b4332",
        textAlign: "center",
        marginBottom: "2rem",
    },
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        padding: "4rem",
    },
    loadingText: {
        color: "#6c757d",
        fontSize: "1rem",
    },
    errorContainer: {
        textAlign: "center",
        padding: "2rem",
        backgroundColor: "#f8d7da",
        borderRadius: "8px",
        border: "1px solid #f5c6cb",
    },
    errorText: {
        color: "#721c24",
        fontSize: "1.1rem",
        marginBottom: "1rem",
    },
    backButton: {
        backgroundColor: "#2d6a4f",
        color: "#ffffff",
        padding: "0.75rem 1.5rem",
        border: "none",
        borderRadius: "4px",
        fontSize: "1rem",
        cursor: "pointer",
    },
    checkoutGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2rem",
    },
    orderSummarySection: {
        backgroundColor: "#ffffff",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },
    paymentSection: {
        backgroundColor: "#ffffff",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },
    sectionTitle: {
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#1b4332",
        marginBottom: "1.5rem",
    },
    itemsList: {
        marginBottom: "1rem",
    },
    itemRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "1rem",
        paddingBottom: "1rem",
        borderBottom: "1px solid #e9ecef",
    },
    itemInfo: {
        flex: 1,
        marginRight: "1rem",
    },
    itemName: {
        fontSize: "1rem",
        fontWeight: 600,
        color: "#333",
        margin: "0 0 0.25rem 0",
    },
    itemMeta: {
        fontSize: "0.85rem",
        color: "#6c757d",
        margin: 0,
    },
    itemPrice: {
        fontSize: "1rem",
        fontWeight: 600,
        color: "#2d6a4f",
        margin: 0,
        whiteSpace: "nowrap",
    },
    divider: {
        height: "1px",
        backgroundColor: "#e9ecef",
        margin: "1rem 0",
    },
    summaryRow: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "0.75rem",
        fontSize: "0.95rem",
        color: "#6c757d",
    },
    totalRow: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "1rem",
        paddingTop: "1rem",
        borderTop: "2px solid #2d6a4f",
    },
    totalLabel: {
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "#1b4332",
    },
    totalValue: {
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "#2d6a4f",
    },
    deliveryNote: {
        marginTop: "1rem",
        padding: "1rem",
        backgroundColor: "#d8f3dc",
        borderRadius: "6px",
        color: "#1b4332",
        fontSize: "0.9rem",
    },
    form: {
        display: "flex",
        flexDirection: "column",
    },
    cardContainer: {
        marginBottom: "1.5rem",
    },
    label: {
        display: "block",
        marginBottom: "0.5rem",
        fontSize: "0.95rem",
        fontWeight: 600,
        color: "#333",
    },
    errorMessage: {
        color: "#dc3545",
        fontSize: "0.9rem",
        marginBottom: "1rem",
        padding: "0.5rem",
        backgroundColor: "#f8d7da",
        borderRadius: "4px",
    },
    submitButton: {
        backgroundColor: "#2d6a4f",
        color: "#ffffff",
        padding: "1rem",
        border: "none",
        borderRadius: "6px",
        fontSize: "1rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
    successCard: {
        backgroundColor: "#ffffff",
        padding: "3rem 2rem",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        textAlign: "center",
    },
    successTitle: {
        fontSize: "2rem",
        fontWeight: 700,
        color: "#1b4332",
        marginBottom: "1rem",
    },
    successText: {
        fontSize: "1.1rem",
        color: "#6c757d",
        marginBottom: "2rem",
    },
    successDetails: {
        backgroundColor: "#f8f9fa",
        padding: "1.5rem",
        borderRadius: "8px",
        marginBottom: "2rem",
        textAlign: "left",
        display: "inline-block",
    },
    successButton: {
        backgroundColor: "#2d6a4f",
        color: "#ffffff",
        padding: "0.75rem 2rem",
        border: "none",
        borderRadius: "6px",
        fontSize: "1rem",
        fontWeight: 600,
        cursor: "pointer",
    },
};

export default Checkout;
