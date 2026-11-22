
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { toast } from "sonner";
import ReviewSection from "../../../components/reviews/ReviewSection";

import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  ShoppingBag,
  CalendarDays,
  ShieldCheck,
  Pizza,
  LoaderCircle,
  CheckCircle,
  Store,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

interface MenuItem {
  _id: string;
  itemName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  vendorId: string;
  vendorName?: string;
  businessName?: string;
  vendor?: {
    name?: string;
    businessName?: string;
  };
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isBlocked?: boolean;
}

function formatPrice(amount: number) {
  return `\u09F3${amount.toLocaleString("en-BD")}`;
}

function today() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function PizzaDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params.id;

  const [item, setItem] =
    useState<MenuItem | null>(null);

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [message, setMessage] = useState("");

  // NEW: CUSTOMER QUANTITY
  const [quantity, setQuantity] = useState(1);

  // LOAD AUTHENTICATED USER AND PIZZA

  useEffect(() => {
    const controller = new AbortController();

    async function loadDetails() {
      try {
        setLoading(true);
        setError("");
        setItem(null);
        setOrdered(false);
        setQuantity(1);
        setSelectedImage(0);
        setImageFailed(false);

        const sessionResponse = await fetch(
          `${API}/api/auth/get-session`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (sessionResponse.status === 401) {
          router.replace("/sign-in");
          return;
        }

        if (!sessionResponse.ok) {
          throw new Error("Unable to verify your session.");
        }

        const session = await sessionResponse.json();

        if (!session?.user) {
          router.replace("/sign-in");
          return;
        }

        if (session.user.isBlocked) {
          throw new Error("Your account is blocked.");
        }

        setUser(session.user);

        const response = await fetch(
          `${API}/api/menu/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Pizza not found or no longer available."
          );
        }

        const result = await response.json();
        const pizza = result.data ?? result;

        if (!pizza?._id || pizza.status !== "approved") {
          throw new Error("This pizza is unavailable.");
        }

        if (!controller.signal.aborted) {
          setItem(pizza);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => controller.abort();
  }, [id, router]);

  // PLACE CUSTOMER ORDER

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!item || !user || ordering || ordered) return;

    if (user.role !== "customer" || user.isBlocked) {
      toast.error("Only customers can place orders.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      toast.error("Quantity must be between 1 and 99.");
      return;
    }

    if (!deliveryDate || deliveryDate <= today()) {
      toast.error("Select a valid future delivery date.");
      return;
    }

    if (deliveryAddress.trim().length < 5) {
      toast.error("Enter a valid delivery address.");
      return;
    }

    try {
      setOrdering(true);

      const tokenResponse = await fetch(
        `${API}/api/auth/token`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (tokenResponse.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (!tokenResponse.ok) {
        throw new Error("Unable to verify authentication.");
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.token) {
        router.replace("/sign-in");
        return;
      }

      const response = await fetch(
        `${API}/api/orders`,
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenData.token}`,
          },

          body: JSON.stringify({
            itemId: item._id,
            quantity,
            deliveryDate,
            deliveryAddress: deliveryAddress.trim(),
            message: message.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message ||
          (response.status === 409
            ? "A duplicate order already exists."
            : "Unable to place the order.")
        );
      }

      setOrdered(true);

      toast.success("Order placed successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to place your order."
      );
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle
            size={38}
            className="animate-spin text-[#E51B23]"
          />

          <p>Loading pizza details...</p>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">
        <div className="text-center">
          <Pizza
            size={65}
            className="mx-auto mb-6 text-[#E51B23]"
          />

          <h1 className="text-3xl font-bold">
            Unable to display pizza
          </h1>

          <p className="mt-4">
            {error || "Pizza not found."}
          </p>

          <Link
            href="/menu"
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-6 py-3 font-semibold"
          >
            Back to Menu
          </Link>
        </div>
      </main>
    );
  }

  const images = Array.isArray(item.images)
    ? item.images.filter(Boolean)
    : [];

  // NEW: LIVE SUBTOTAL
  const subtotal = item.price * quantity;

  const vendorName =
    item.vendor?.businessName ||
    item.vendor?.name ||
    item.businessName ||
    item.vendorName;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#080808] text-white">

        {/* NAVBAR */}

        <header className="sticky top-0 z-40 border-b border-[#351010] bg-[#0B0B0B]">
          <nav className="mx-auto flex min-h-20 max-w-7xl items-center justify-between px-5">

            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#C9151B] font-serif text-3xl font-bold italic ph-brand-mark">
                P
              </span>

              <span className="font-serif text-3xl font-bold">
                Pizza<span className="text-[#E51B23]">Hub.</span>
              </span>
            </Link>

            <Link
              href="/menu"
              className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF4545]"
            >
              <ArrowLeft size={18} />
              Browse Menu
            </Link>

          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-10">

          {/* PRODUCT DETAILS */}

          <div className="grid items-start gap-10 lg:grid-cols-2">

            {/* IMAGE GALLERY */}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="overflow-hidden rounded-2xl border border-[#351010] bg-[#101010]">

                <div className="aspect-4/3 overflow-hidden">

                  {images[selectedImage] && !imageFailed ? (
                    <img
                      src={images[selectedImage]}
                      alt={item.itemName}
                      onError={() => setImageFailed(true)}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Pizza
                        size={75}
                        className="text-[#E51B23]"
                      />
                    </div>
                  )}

                </div>

              </div>

              {images.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-3">

                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      aria-label={`View pizza image ${index + 1}`}
                      aria-pressed={selectedImage === index}
                      onClick={() => {
                        setSelectedImage(index);
                        setImageFailed(false);
                      }}
                      className={`h-20 w-24 overflow-hidden rounded-xl border-2 ${
                        selectedImage === index
                          ? "border-[#E51B23]"
                          : "border-[#351010]"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${item.itemName} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}

                </div>
              )}

            </motion.div>

            {/* INFORMATION */}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex rounded-full border border-[#351010] bg-[#141414] px-4 py-2 text-xs font-semibold text-[#FF4545]">
                {item.category}
              </span>

              <h1 className="mt-5 font-serif text-4xl font-bold leading-tight sm:text-5xl">
                {item.itemName}
              </h1>

              <div className="mt-5 text-4xl font-extrabold text-[#FF4545]">
                {formatPrice(item.price)}
              </div>

              <p className="mt-5 leading-7">
                {item.description}
              </p>

              <div className="mt-6 space-y-4 border-y border-[#351010] py-5">

                <div className="flex items-center gap-3">
                  <MapPin
                    size={20}
                    className="text-[#E51B23]"
                  />

                  {item.location}
                </div>

                <div className="flex items-center gap-3">
                  <Store
                    size={20}
                    className="text-[#E51B23]"
                  />

                  {vendorName || "Vendor name unavailable"}
                </div>

                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={20}
                    className="text-[#E51B23]"
                  />

                  Approved Menu Item
                </div>

              </div>

              {/* ORDER FORM */}

              {ordered ? (
                <div className="mt-8 rounded-2xl border border-[#E51B23] bg-[#141414] p-6 text-center">

                  <CheckCircle
                    size={46}
                    className="mx-auto text-[#FF4545]"
                  />

                  <h2 className="mt-4 text-xl font-bold">
                    Order Successful
                  </h2>

                  <p className="mt-3">
                    Your order request has been submitted.
                  </p>

                  <Link
                    href="/menu"
                    className="mt-6 inline-flex rounded-lg bg-[#C9151B] px-6 py-3 font-semibold"
                  >
                    Continue Browsing
                  </Link>

                </div>
              ) : user?.role === "customer" && !user.isBlocked ? (

                <form
                  onSubmit={placeOrder}
                  className="mt-8 rounded-2xl border border-[#351010] bg-[#141414] p-6"
                >

                  <h2 className="flex items-center gap-3 text-2xl font-bold">
                    <ShoppingBag
                      className="text-[#E51B23]"
                    />

                    Place Your Order
                  </h2>

                  <div className="mt-6 space-y-5">

                    {/* QUANTITY SELECTOR */}

                    <div className="rounded-xl border border-[#351010] bg-[#080808] p-4">

                      <div className="flex items-center justify-between gap-4">

                        <div>
                          <p className="font-semibold">
                            Quantity
                          </p>

                          <p className="mt-1 text-sm text-gray-400">
                            Choose 1 to 99 pizzas
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 sm:gap-4">

                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={quantity <= 1 || ordering}
                            onClick={() =>
                              setQuantity((current) =>
                                Math.max(1, current - 1)
                              )
                            }
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#5A2020] text-xl font-bold transition hover:bg-[#351010] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {"\u2212"}
                          </button>

                          <span className="min-w-8 text-center text-xl font-bold tabular-nums">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            aria-label="Increase quantity"
                            disabled={quantity >= 99 || ordering}
                            onClick={() =>
                              setQuantity((current) =>
                                Math.min(99, current + 1)
                              )
                            }
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#5A2020] text-xl font-bold transition hover:bg-[#351010] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            +
                          </button>

                        </div>

                      </div>

                    </div>

                    {/* DELIVERY DATE */}

                    <label className="block">

                      <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <CalendarDays size={16} />
                        Delivery Date
                      </span>

                      <input
                        type="date"
                        required
                        min={today()}
                        value={deliveryDate}
                        onChange={(event) =>
                          setDeliveryDate(event.target.value)
                        }
                        className="w-full rounded-xl border border-[#351010] bg-[#080808] p-3 text-white outline-none focus:border-[#E51B23]"
                      />

                    </label>

                    {/* DELIVERY ADDRESS */}

                    <label className="block">

                      <span className="mb-2 block text-sm font-semibold">
                        Delivery Address
                      </span>

                      <textarea
                        required
                        minLength={5}
                        rows={3}
                        value={deliveryAddress}
                        onChange={(event) =>
                          setDeliveryAddress(event.target.value)
                        }
                        placeholder="House, road, area and city"
                        className="w-full resize-y rounded-xl border border-[#351010] bg-[#080808] p-3 text-white outline-none focus:border-[#E51B23]"
                      />

                    </label>

                    {/* CUSTOMER MESSAGE */}

                    <label className="block">

                      <span className="mb-2 block text-sm font-semibold">
                        Customer Message
                      </span>

                      <textarea
                        rows={3}
                        value={message}
                        onChange={(event) =>
                          setMessage(event.target.value)
                        }
                        placeholder="Special instructions (optional)"
                        className="w-full resize-y rounded-xl border border-[#351010] bg-[#080808] p-3 text-white outline-none focus:border-[#E51B23]"
                      />

                    </label>

                    {/* PRICE SUMMARY */}

                    <div className="space-y-3 border-t border-[#351010] pt-5">

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-400">
                          Unit Price
                        </span>

                        <span className="font-semibold">
                          {formatPrice(item.price)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-400">
                          Quantity
                        </span>

                        <span className="font-semibold">
                          {"\u00D7"} {quantity}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-[#351010] pt-4">
                        <span className="text-lg font-bold">
                          Subtotal
                        </span>

                        <span className="text-2xl font-extrabold text-[#FF4545]">
                          {formatPrice(subtotal)}
                        </span>
                      </div>

                    </div>

                    {/* SUBMIT ORDER */}

                    <button
                      type="submit"
                      disabled={ordering}
                      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#C9151B] px-5 font-bold text-white transition hover:bg-[#E51B23] disabled:opacity-50"
                    >

                      {ordering ? (
                        <>
                          <LoaderCircle
                            size={20}
                            className="animate-spin"
                          />

                          Placing Order...
                        </>
                      ) : (
                        <>
                          Place Order
                          <ArrowRight size={19} />
                        </>
                      )}

                    </button>

                  </div>

                </form>

              ) : (

                <div className="mt-8 rounded-xl border border-[#351010] bg-[#141414] p-5">

                  Only customer accounts can place orders.

                </div>

              )}

            </motion.div>

          </div>

          <ReviewSection
            itemId={item._id}
            vendorId={item.vendorId}
            user={user}
          />

        </main>

        <footer className="mt-12 border-t border-[#351010] bg-[#0B0B0B] px-5 py-8 text-center">

          <p>
            {"\u2212"}
            All rights reserved.
          </p>

        </footer>

      </div>
    </MotionConfig>
  );
}
