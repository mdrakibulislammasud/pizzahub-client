
"use client";

/* eslint-disable @next/next/no-img-element */

import AccountMenu from "./AccountMenu";
import ThemeToggle from './components/ThemeToggle';
import { usePathname as phUsePathname, useRouter } from "next/navigation";
import "./menu-layout.css";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  motion,
  MotionConfig,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";

import {
  ArrowRight,
  ArrowUpRight,
  Pizza,
  Search,
  MapPin,
  Menu,
  X,
  UserRound,
  LogOut,
  Leaf,
  Beef,
  ChefHat,
  Sandwich,
  CupSoda,
  ShieldCheck,
  Store,
  CalendarDays,
  ShoppingBag,
  Utensils,
  ShoppingCart,
  Heart,
  PackageCheck,
  PackageSearch,
} from "lucide-react";

import { toast } from "sonner";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const HERO_IMAGE = "/images/pizzahub-dark-hero.png";

interface MenuItem {
  _id: string;
  itemName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  vendorId: string;
  status: string;
  isActive?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

const categories = [
  { name: "Classic Pizzas", icon: Pizza },
  { name: "Vegetarian Pizzas", icon: Leaf },
  { name: "Meat Lovers", icon: Beef },
  { name: "Specialty / Gourmet Pizzas", icon: ChefHat },
  { name: "Sides & Appetizers", icon: Sandwich },
  { name: "Beverages & Desserts", icon: CupSoda },
];

const benefits = [
  {
    icon: Store,
    title: "Local Kitchens",
    text: "Discover restaurants near you.",
  },
  {
    icon: ShieldCheck,
    title: "Approved Menus",
    text: "Browse reviewed food items.",
  },
  {
    icon: CalendarDays,
    title: "Easy Ordering",
    text: "Choose a suitable delivery date.",
  },
  {
    icon: PackageCheck,
    title: "Order Tracking",
    text: "Follow your order status.",
  },
];

const collections = [
  {
    title: "The Classics",
    image: "/images/classic-pizza.jpg",
    category: "Classic Pizzas",
  },
  {
    title: "Vegetarian Favourites",
    image: "/images/margherita-pizza.jpg",
    category: "Vegetarian Pizzas",
  },
  {
    title: "Explore Local Kitchens",
    image: "/images/pizza-kitchen.jpg",
    category: "All",
  },
];

const steps = [
  {
    icon: Search,
    title: "Find Your Food",
    text: "Discover your favourite pizza.",
  },
  {
    icon: Utensils,
    title: "Choose a Dish",
    text: "Explore the price and food details.",
  },
  {
    icon: ShoppingBag,
    title: "Place Your Order",
    text: "Order and follow your delivery status.",
  },
];

const navigation = [
  { label: "Home", href: "#home" },
  { label: "Browse Menu", href: "#menu" },
  { label: "Categories", href: "#categories" },
  { label: "About Us", href: "#about" },
];

function formatPrice(price: number) {
  return `\u09F3${price.toLocaleString("en-BD")}`;
}

function FoodImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`ph-image-fallback ${className}`}>
        <Pizza size={42} strokeWidth={1.3} />
        <span>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
      className={className}
      draggable={false}
    />
  );
}

function SectionHeading({
  title,
  highlight,
  subtitle,
}: {
  title: string;
  highlight?: string;
  subtitle: string;
}) {
  return (
    <div className="ph-section-heading">
      <div className="ph-heading-row">
        <span className="ph-heading-line" />

        <h2>
          {title}
          {highlight && <em> {highlight}</em>}
        </h2>

        <span className="ph-heading-line" />
      </div>

      <p>{subtitle}</p>
    </div>
  );
}

function DecorativeLeaves() {
  return (
    <div className="ph-leaves" aria-hidden="true">
      <Leaf className="ph-leaf ph-leaf-one" />
      <Leaf className="ph-leaf ph-leaf-two" />
      <Leaf className="ph-leaf ph-leaf-three" />
      <Leaf className="ph-leaf ph-leaf-four" />
      <Leaf className="ph-leaf ph-leaf-five" />
    </div>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const phPathname = phUsePathname();
  const phBrowseMode = phPathname === "/menu" || phPathname === "/browse-menu";

  const [items, setItems] = useState<MenuItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("default");
  const [showAll, setShowAll] = useState(false);

  const [mobileMenu, setMobileMenu] = useState(false);
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const reducedMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, {
    stiffness: 80,
    damping: 24,
  });

  const smoothY = useSpring(mouseY, {
    stiffness: 80,
    damping: 24,
  });

  // LOAD REAL DATABASE MENU

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenu() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/menu", {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load menu."
          );
        }

        if (!Array.isArray(result.data)) {
          throw new Error("Invalid menu response.");
        }

        if (!controller.signal.aborted) {
          setItems(
            result.data.filter(
              (item: MenuItem) =>
                item.status === "approved" &&
                item.isActive !== false
            )
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load menu."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMenu();

    return () => controller.abort();
  }, [retry]);

  // AUTHENTICATION SESSION

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch(
          `${API}/api/auth/get-session`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = response.ok
          ? await response.json()
          : null;

        if (!controller.signal.aborted) {
          const account = data?.user ?? null;
          setUser(account);

          if (account?.id) {
            try {
              const stored = JSON.parse(
                localStorage.getItem(`pizzahub-favorites:${account.id}`) || "[]"
              ) as unknown;
              setFavoriteIds(
                Array.isArray(stored)
                  ? [...new Set(stored.filter((id): id is string =>
                      typeof id === "string" && /^[0-9a-f]{24}$/i.test(id)
                    ))].slice(0, 100)
                  : []
              );
            } catch {
              setFavoriteIds([]);
            }
          } else {
            setFavoriteIds([]);
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setUser(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setAuthLoading(false);
        }
      }
    }

    void loadSession();

    return () => controller.abort();
  }, []);

  async function logout() {
    try {
      setLogoutLoading(true);

      const response = await fetch(
        `${API}/api/auth/sign-out`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{}",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to sign out.");
      }

      dialogRef.current?.close();

      setUser(null);
      setSelected(null);
      setMobileMenu(false);

      toast.success("Signed out successfully.");
    } catch {
      toast.error("Unable to sign out.");
    } finally {
      setLogoutLoading(false);
    }
  }

  function selectCategory(value: string) {
    setCategory(value);
    setSearch("");
    setShowAll(false);

    document
      .getElementById("menu")
      ?.scrollIntoView({ block: "start" });
  }

  function toggleFavorite(item: MenuItem) {
    if (authLoading) return;
    if (!user) {
      toast.error("Please sign in to save favorites.");
      router.push("/sign-in");
      return;
    }
    if (user.role !== "customer") {
      toast.error("Favorites are available for customer accounts only.");
      return;
    }

    const key = `pizzahub-favorites:${user.id}`;
    const exists = favoriteIds.includes(item._id);
    const updated = exists
      ? favoriteIds.filter((id) => id !== item._id)
      : [...favoriteIds, item._id].slice(-100);

    try {
      localStorage.setItem(key, JSON.stringify(updated));
      setFavoriteIds(updated);
      toast.success(exists ? "Removed from favorites." : "Added to favorites.");
    } catch {
      toast.error("Unable to update favorites. Check your browser storage settings.");
    }
  }

  function openDetails(item: MenuItem) {
    if (authLoading) return;

    if (!user) {
      router.push("/sign-in");
      return;
    }

    router.push("/menu/" + encodeURIComponent(item._id));
  }

  useEffect(() => {
    if (selected && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [selected]);

  const availableLocations = Array.from(
    new Set(
      items
        .map((item) => item.location?.trim())
        .filter((location): location is string => Boolean(location))
    )
  ).sort((a, b) => a.localeCompare(b));

  const filtered = items.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesCategory =
      category === "All" || item.category === category;

    const matchesLocation =
      locationFilter === "All" ||
      item.location?.trim() === locationFilter;

    const matchesSearch =
      item.itemName.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query);

    return matchesCategory && matchesLocation && matchesSearch;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortOrder === "price-asc") {
      return Number(a.price) - Number(b.price);
    }

    if (sortOrder === "price-desc") {
      return Number(b.price) - Number(a.price);
    }

    return 0;
  });

  const visibleItems = showAll
    ? sortedFiltered
    : sortedFiltered.slice(0, 6);

  return (
    <MotionConfig reducedMotion="user">
      <div className="ph">

        {/* NAVBAR */}

        <header className="ph-header">
          <nav className="ph-nav ph-container">

            <Link href="/" className="ph-logo">
              <span className="ph-logo-icon">P</span>

              <span>
                Pizza<em>Hub.</em>
              </span>
            </Link>

            <div className="ph-nav-links">
      {user && (
        <Link
          href="/favorites"
          className="ph-favorites-desktop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            color: "#E51B23",
            fontWeight: 700,
          }}
        >
          <Heart size={17} />
          Favorites
        </Link>
      )}
              {navigation.map((item) => (
                <a key={item.label} href={item.href}>
                  {item.label}
                </a>
              ))}
            </div>

            <div className="ph-nav-actions">
              <ThemeToggle />


              {authLoading ? (
                <span className="ph-auth-loading" />
              ) : user ? (
        <AccountMenu
          user={user}
          logout={logout}
          logoutLoading={logoutLoading}

        />
      ) : (
        <>
          <Link
            href="/sign-in"
            className="ph-sign-in"

          >
            Sign In
          </Link>

          <Link
            href="/sign-up"
            className="ph-sign-in"

          >
            Sign Up
          </Link>
        </>
      )}

              <Link href="/menu" className="ph-button">
                Order Now
                <ArrowRight size={16} />
              </Link>
            </div>

            <button
              type="button"
              className="ph-mobile-toggle"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenu}
            >
              {mobileMenu ? <X /> : <Menu />}
            </button>

          </nav>

          {mobileMenu && (
            <div className="ph-mobile-menu">
              <div className="ph-mobile-theme-toggle"><ThemeToggle /></div>
      {user && (
        <Link
          href="/favorites"
          className="ph-favorites-mobile"
          onClick={() => setMobileMenu(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            color: "#E51B23",
            fontWeight: 700,
          }}
        >
          <Heart size={18} />
          My Favorites
        </Link>
      )}


              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenu(false)}
                >
                  {item.label}
                </a>
              ))}

              {user ? (
                <AccountMenu
                  user={user}
                  logout={logout}
                  logoutLoading={logoutLoading}
                  mobile
                  onNavigate={() => setMobileMenu(false)}
                />
              ) : (
                <div className="ph-mobile-auth-links">
                  <Link
                    href="/sign-in"
                    className="ph-sign-in"
                    onClick={() => setMobileMenu(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="ph-sign-up-mobile"
                    onClick={() => setMobileMenu(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              <Link
                href="/menu"
                className="ph-button"
                onClick={() => setMobileMenu(false)}
              >
                Order Now
              </Link>
            </div>
          )}
        </header>

        <main>

          {/* PREMIUM HERO SECTION */}

          {!phBrowseMode && (<section
            id="home"
            className="ph-hero"
            onPointerMove={(event) => {
              if (
                reducedMotion ||
                event.pointerType !== "mouse"
              ) return;

              const rect =
                event.currentTarget.getBoundingClientRect();

              if (!rect.width || !rect.height) return;

              mouseX.set(
                ((event.clientX - rect.left) /
                  rect.width - 0.5) * -18
              );

              mouseY.set(
                ((event.clientY - rect.top) /
                  rect.height - 0.5) * -16
              );
            }}
            onPointerLeave={() => {
              mouseX.set(0);
              mouseY.set(0);
            }}
          >
            <DecorativeLeaves />


            <a
              href="#menu"
              className="ph-desktop-hero-link ph-desktop-hero-menu"
              aria-label="Explore Menu"
            >
              <span className="sr-only">Explore Menu</span>
            </a>

            <a
              href="#about"
              className="ph-desktop-hero-link ph-desktop-hero-about"
              aria-label="About Us"
            >
              <span className="sr-only">About Us</span>
            </a>

  <div className="ph-hero-grid ph-container">

              <motion.div
                className="ph-hero-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
              >
                <div className="ph-hero-badge">
                  <Pizza size={19} />
                  Fresh Ãƒâ€šÃ‚Â· Hot Ãƒâ€šÃ‚Â· Delicious
                </div>

                <h1>
                  Life is Better
                  <br />
                  with
                  <em> Pizza</em>
                </h1>

                <div
                  className="ph-heading-underline"
                  aria-hidden="true"
                />

                <p>
                  Discover your favourite pizzas from local
                  restaurants and bring something delicious
                  to your table.
                </p>

                <div className="ph-hero-actions">
                  <a href="#menu" className="ph-button">
                    <ShoppingCart size={20} />
                    Explore Menu
                    <ArrowRight size={18} />
                  </a>

                  <a
                    href="#about"
                    className="ph-secondary-button"
                  >
                    <Heart size={18} />
                    About Us
                  </a>
                </div>



                <div className="ph-hero-location">
                  <MapPin size={16} />
                  Your neighbourhood pizza destination
                </div>
              </motion.div>

              <motion.div
                className="ph-hero-visual"
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.75 }}
              >
                <div className="ph-hero-photo-frame">
                  <motion.div
                    className="ph-hero-photo-motion"
                    style={{
                      x: reducedMotion ? 0 : smoothX,
                      y: reducedMotion ? 0 : smoothY,
                    }}
                  >
                    <FoodImage
                      src={HERO_IMAGE}
                      alt="Freshly baked sliced pepperoni pizza"
                      className="ph-hero-photo"
                      priority
                    />
                  </motion.div>
                </div>

                <div className="ph-fresh-label">
                  Hot &amp;
                  <br />
                  Fresh!
                  <ArrowDownDecoration />
                </div>

                <Leaf className="ph-floating-leaf" />
              </motion.div>

            </div>

            <div
              className="ph-hero-wave"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 1440 75"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 48 C280 80 360 0 690 29 C980 55 1160 85 1440 10 L1440 75 L0 75 Z"
                  fill="#fff5e7"
                />
              </svg>
            </div>
          </section>)}

          {/* FEATURED MENU */}

          <section id="menu" className="ph-menu-section">

            <Pizza
              className="ph-pizza-decoration ph-pizza-left"
              aria-hidden="true"
            />

            <Pizza
              className="ph-pizza-decoration ph-pizza-right"
              aria-hidden="true"
            />

            <div className="ph-container">

              <SectionHeading
                title={phBrowseMode ? "Browse" : "Featured"}
                highlight="Menu"
                subtitle="Discover your next favourite."
              />

              <div className="ph-menu-filters">

                <div className="ph-search">
                  <Search size={19} />

                  <input
                    type="search"
                    value={search}
                    aria-label="Search menu"
                    placeholder="Search pizza or location"
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setShowAll(false);
                    }}
                  />

                  {search && (
                    <button
                      type="button"
                      className="ph-icon-button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <select
                  className="ph-select"
                  value={category}
                  aria-label="Filter categories"
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setShowAll(false);
                  }}
                >
                  <option value="All">
                    All Categories
                  </option>

                  {categories.map((item) => (
                    <option
                      key={item.name}
                      value={item.name}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>

                {phBrowseMode && (
                  <select
                    className="ph-select"
                    value={locationFilter}
                    aria-label="Filter by restaurant location"
                    onChange={(event) => {
                      setLocationFilter(event.target.value);
                      setShowAll(false);
                    }}
                  >
                    <option value="All">All Locations</option>
                    {availableLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                )}

                {phBrowseMode && (
                  <select
                    className="ph-select"
                    value={sortOrder}
                    aria-label="Sort menu by price"
                    onChange={(event) => {
                      setSortOrder(event.target.value);
                      setShowAll(true);
                    }}
                  >
                    <option value="default">Default Sorting</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                )}

              </div>

              {loading && (
                <div className="ph-product-grid">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div
                      key={index}
                      className="ph-product-skeleton"
                    >
                      <div />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="ph-empty-state" role="alert">
                  <Pizza size={40} />
                  <h3>Unable to load menu</h3>
                  <p>{error}</p>

                  <button
                    type="button"
                    className="ph-button"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && filtered.length === 0 && (
                <div className="ph-empty-state">
                  <Pizza size={42} />
                  <h3>No dishes found</h3>
                  <p>Try another search or category.</p>

                  <button
                    type="button"
                    className="ph-button"
                    onClick={() => {
                      setSearch("");
                      setCategory("All");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {!loading && !error && (
                <div className="ph-product-grid" data-ph-menu-grid="true">

                  {(visibleItems).slice(0, phBrowseMode ? undefined : 8).map((item, index) => (
                    <motion.article
                      key={item._id}
                      className="ph-product-card"
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.06 }}




      data-ph-clickable-pizza="true"
      onClickCapture={(event) => {
        // Let the dedicated favorite control handle its own click.
        if ((event.target as HTMLElement).closest("[data-favorite-toggle=\"true\"]")) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        openDetails(item);
      }}
    >
                      <div className="ph-product-image-wrap">

                        <button
                          type="button"
                          data-favorite-toggle="true"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(item);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          aria-label={favoriteIds.includes(item._id) ? `Remove ${item.itemName} from favorites` : `Add ${item.itemName} to favorites`}
                          aria-pressed={favoriteIds.includes(item._id)}
                          title={favoriteIds.includes(item._id) ? "Remove from Favorites" : "Add to Favorites"}
                          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-black/85"
                        >
                          <Heart size={19} className={favoriteIds.includes(item._id) ? "fill-[#E51B23] text-[#E51B23]" : "text-white"} />
                        </button>

                        <FoodImage
                          key={item.images?.[0]}
                          src={item.images?.[0]}
                          alt={item.itemName}
                          className="ph-product-image"
                        />

                        <span className="ph-category-badge">
                          {item.category}
                        </span>

                      </div>

                      <div className="ph-product-body">

                        <h3>{item.itemName}</h3>

                        <p className="ph-product-location">
                          <MapPin size={13} />
                          {item.location}
                        </p>

                        <div className="ph-product-bottom">

                          <strong>
                            {formatPrice(item.price)}
                          </strong>

                          <button
                            type="button"
                            disabled={authLoading}
                            onClick={() => openDetails(item)}
                            className="ph-cart-button"
                            aria-label={`View details for ${item.itemName}`}
                            title="View Details"
                          >
                            <ArrowUpRight size={18} />
                          </button>

                        </div>

                        <button
                          type="button"
                          className="ph-details-link"
                          disabled={authLoading}
                          onClick={() => openDetails(item)}
                         data-ph-details-action="true">
                          View Details
                          <ArrowRight size={13} />
                        </button>

                      </div>
                    </motion.article>
                  ))}

                </div>
              )}

              {!loading && !error && filtered.length > 6 && (
                <div className="ph-center">
                  <button
                    type="button"
                    className="ph-button"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? "Show Less" : "Explore More"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

            </div>

    {!phBrowseMode && (
      <div className="ph-view-all-wrap">
        <Link href="/menu" className="ph-view-all-button">
          View All Pizzas
          <span aria-hidden="true">{"\u2192"}</span>
        </Link>
      </div>
    )}
  </section>

          {/* WHY CHOOSE PIZZAHUB */}



          {/* CATEGORY SECTION */}

          {!phBrowseMode && (<section id="categories" className="ph-category-section">

            <div className="ph-container">

              <SectionHeading
                title="Explore Our"
                highlight="Categories"
                subtitle="Something delicious for every taste."
              />

              <div className="ph-category-grid">

                {categories.map((item) => (
                  <motion.button
                    key={item.name}
                    type="button"
                    whileHover={{ y: -4 }}
                    onClick={() => selectCategory(item.name)}
                    aria-pressed={category === item.name}
                    className={`ph-category-card ${
                      category === item.name
                        ? "ph-category-active"
                        : ""
                    }`}
                  >
                    <item.icon
                      size={32}
                      strokeWidth={1.6}
                    />

                    <span>{item.name}</span>

                  </motion.button>
                ))}

              </div>

            </div>
          </section>)}

          {/* PHOTO COLLECTIONS */}

          {!phBrowseMode && (<section className="ph-collections-section">

            <div className="ph-container">

              <SectionHeading
                title="Find Your"
                highlight="Favourite"
                subtitle="Explore our pizza collections."
              />

              <div className="ph-collection-grid">

                {collections.map((item, index) => (
                  <motion.button
                    type="button"
                    key={item.title}
                    className="ph-collection-card"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => selectCategory(item.category)}
                  >
                    <FoodImage
                      src={item.image}
                      alt={item.title}
                      className="ph-collection-image"
                    />

                    <div className="ph-collection-caption">
                      <h3>{item.title}</h3>
                      <ArrowUpRight size={21} />
                    </div>

                  </motion.button>
                ))}

              </div>

            </div>
          </section>)}

          {/* HOW IT WORKS */}

          {!phBrowseMode && (<section
            id="how-it-works"
            className="ph-steps-section"
          >
            <div className="ph-container">

              <SectionHeading
                title="How PizzaHub"
                highlight="Works"
                subtitle="Three simple steps."
              />

              <div className="ph-steps-grid">
                {steps.map((item, index) => (
                  <motion.article
                    key={item.title}
                    className="ph-step-card"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="ph-step-icon">
                      <item.icon size={30} />
                      <span>{index + 1}</span>
                    </div>

                    <h3>{item.title}</h3>
                    <p>{item.text}</p>

                  </motion.article>
                ))}
              </div>

            </div>
          </section>)}




    {!phBrowseMode && (
      <section id="about" className="ph-benefits-section">

            <div className="ph-container">

              <SectionHeading
                title="Why Choose"
                highlight="PizzaHub?"
                subtitle="Because good food brings people together."
              />

              <div className="ph-benefit-grid">

                {benefits.map((item, index) => (
                  <motion.article
                    key={item.title}
                    className="ph-benefit-card"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div className="ph-benefit-icon">
                      <item.icon size={29} strokeWidth={1.8} />
                    </div>

                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </motion.article>
                ))}

              </div>

            </div>

          </section>
    )}
  </main>

        {/* RED WAVE FOOTER */}

        <footer className="ph-footer">

          <svg
            className="ph-footer-wave"
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 0 C180 150 330 20 580 65 C850 120 1120 100 1440 0 L1440 100 L0 100 Z"
              fill="#a91616"
            />
          </svg>

          <DecorativeLeaves />

          <div className="ph-footer-grid ph-container">

            <div>
              <Link href="/" className="ph-logo ph-footer-logo">
                <span className="ph-logo-icon">P</span>
                <span>Pizza<em>Hub.</em></span>
              </Link>

              <p>
                Connecting pizza lovers with local restaurants
                and independent kitchens.
              </p>
            </div>

            <div>
              <h3>Explore</h3>

              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div>
              <h3>Information</h3>
    <Link href="/track-order">Track Order</Link>

              <Link href="/#about">About PizzaHub</Link>
              <Link href="/#how-it-works">How It Works</Link>

              {!user && (
                <Link href="/sign-in">
                  Sign In
                </Link>
              )}
            </div>

          </div>

          <div className="ph-copyright">
            Â© 2026 PizzaHub. All rights reserved.
          </div>

        </footer>

        {/* FOOD DETAILS */}

        <dialog
          ref={dialogRef}
          onClose={() => setSelected(null)}
          aria-labelledby="food-details-title"
          className="ph-dialog"
        >
          <div className="ph-dialog-header">

            <h2 id="food-details-title">
              Food Details
            </h2>

            <button
              type="button"
              className="ph-icon-button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close details"
            >
              <X size={23} />
            </button>

          </div>

          {selected && (
            <>
              <FoodImage
                key={selected._id}
                src={selected.images?.[0]}
                alt={selected.itemName}
                className="ph-dialog-image"
              />

              <div className="ph-dialog-body">

                <h2>{selected.itemName}</h2>

                <p className="ph-product-location">
                  <MapPin size={16} />
                  {selected.location}
                </p>

                <p>{selected.description}</p>

                <strong>
                  {formatPrice(selected.price)}
                </strong>

              </div>
            </>
          )}

        </dialog>

      </div>
    </MotionConfig>
  );
}

function ArrowDownDecoration() {
  return (
    <svg
      viewBox="0 0 70 45"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 5 Q42 1 61 35 M48 29 L62 36 L64 21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


