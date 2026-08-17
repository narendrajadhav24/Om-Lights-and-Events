console.log("OM LIGHTS & EVENTS loaded");

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = "https://vazizqotfjxrljhdwlbo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZqJHDTw3NXW0kl51M2SDEg_q3VlGHwp";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

/* =========================================================
   SHOP INFORMATION
========================================================= */

const shopInfo = {
    name: "Om Lights and Events",
    phone: "9158143252",
    whatsapp: "919158143252",
    hours: "8:00 AM - 10:00 PM",
    address: "Ajinkya Hotel, Kolhar Road, Hutatma Kotwal Nagar, Belapur, Maharashtra 413715",
    mapLocation: "Ajinkya Hotel, Kolhar Road, Hutatma Kotwal Nagar, Belapur, Maharashtra 413715"
};

let products = [];
let allProducts = [];
let categories = [];
let activeCategoryId = null;

/* =========================================================
   MOBILE NAV
========================================================= */

const menuButton = document.getElementById("menuButton");
const navigation = document.getElementById("navigation");

if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
        navigation.classList.toggle("active");
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => navigation.classList.remove("active"));
    });
}

/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function categoryIcon(name) {
    const text = String(name || "").toLowerCase();

    if (text.includes("wedding") || text.includes("marriage")) return "💍";
    if (text.includes("stage")) return "🎭";
    if (text.includes("event") || text.includes("decoration")) return "🎉";
    if (text.includes("led")) return "💡";
    if (text.includes("curtain")) return "✨";
    if (text.includes("hanging")) return "🏮";
    if (text.includes("outdoor")) return "🌟";
    if (text.includes("festival")) return "🎊";

    return "✦";
}

function getCategoryName(product) {
    if (product.category_name) return product.category_name;

    const category = categories.find(
        item => Number(item.id) === Number(product.category_id)
    );

    return category ? category.name : "Lighting";
}

function getProductPrice(product) {
    const discounted = Number(product.discount_price);
    const regular = Number(product.price);

    if (discounted > 0 && discounted < regular) return discounted;
    return regular;
}

/* =========================================================
   GET LOCATION
========================================================= */

function openLocation() {
    const query = encodeURIComponent(shopInfo.mapLocation);

    const url =
        "https://www.google.com/maps/search/?api=1&query=" +
        query;

    window.open(url, "_blank", "noopener");
}

/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadCategories() {
    const categoryList = document.getElementById("categoryList");

    if (!categoryList) return;

    const { data, error } = await supabaseClient
        .from("categories")
        .select("id,name,slug")
        .order("name", { ascending: true });

    if (error) {
        console.error("Categories error:", error);
        categoryList.innerHTML = `
            <div class="no-products">
                Unable to load categories right now.
            </div>
        `;
        return;
    }

    categories = data || [];
    renderCategories();
}

function renderCategories() {
    const categoryList = document.getElementById("categoryList");

    if (!categoryList) return;

    categoryList.innerHTML = "";

    const allCard = document.createElement("button");
    allCard.type = "button";
    allCard.className =
        "category-card" +
        (activeCategoryId === null ? " active" : "");

    allCard.innerHTML = `
        <div class="category-icon">✨</div>
        <h3>All Products</h3>
        <p>View everything</p>
    `;

    allCard.addEventListener("click", () => {
        activeCategoryId = null;
        renderCategories();
        renderProductGrid(allProducts);
        updateActiveFilter("All products");
        document.getElementById("products")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    categoryList.appendChild(allCard);

    categories.forEach(category => {
        const card = document.createElement("button");
        card.type = "button";
        card.className =
            "category-card" +
            (Number(activeCategoryId) === Number(category.id) ? " active" : "");

        card.innerHTML = `
            <div class="category-icon">${categoryIcon(category.name)}</div>
            <h3>${escapeHTML(category.name)}</h3>
            <p>View products</p>
        `;

        card.addEventListener("click", () => {
            activeCategoryId = category.id;
            renderCategories();

            const filtered = allProducts.filter(
                product => Number(product.category_id) === Number(category.id)
            );

            renderProductGrid(filtered);
            updateActiveFilter(category.name);

            document.getElementById("products")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        categoryList.appendChild(card);
    });
}

/* =========================================================
   LOAD ALL PRODUCTS
========================================================= */

async function loadProducts() {
    const productGrid = document.getElementById("productGrid");

    if (productGrid) {
        productGrid.innerHTML = `<div class="loading-state">Loading products…</div>`;
    }

    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Products error:", error);

        if (productGrid) {
            productGrid.innerHTML = `
                <div class="no-products">
                    <h3>Unable to load products</h3>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;
        }

        return;
    }

    products = data || [];
    allProducts = [...products];

    renderProductGrid(products);
    loadSpecialProducts(products);
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const categoryName = getCategoryName(product);
    const price = getProductPrice(product);

    let priceHTML = `
        <span class="discount-price">₹${price.toLocaleString("en-IN")}</span>
    `;

    if (
        Number(product.discount_price) > 0 &&
        Number(product.discount_price) < Number(product.price)
    ) {
        priceHTML += `
            <span class="original-price">
                ₹${Number(product.price).toLocaleString("en-IN")}
            </span>
        `;
    }

    const imageHTML = product.main_image_url
        ? `
            <img
                src="${escapeHTML(product.main_image_url)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy"
            >
        `
        : `<span class="fallback">💡</span>`;

    const badge =
        product.is_new
            ? `<span class="product-badge">NEW</span>`
            : product.is_featured
                ? `<span class="product-badge">FEATURED</span>`
                : "";

    card.innerHTML = `
        <div class="product-image">
            ${imageHTML}
            ${badge}
        </div>

        <div class="product-content">
            <span class="product-category">
                ${escapeHTML(categoryName)}
            </span>

            <h3>${escapeHTML(product.name)}</h3>

            <p class="product-description">
                ${escapeHTML(
                    product.description ||
                    "Beautiful lighting product from Om Lights & Events."
                )}
            </p>

            <div class="product-price">
                ${priceHTML}
            </div>

            <button
                type="button"
                class="product-button"
                data-product-id="${product.id}"
            >
                View Product
            </button>
        </div>
    `;

    card
        .querySelector(".product-button")
        .addEventListener("click", () => {
            openProductDetails(product.id);
        });

    return card;
}

/* =========================================================
   DISPLAY PRODUCTS
========================================================= */

function renderProductGrid(productList) {
    const productGrid = document.getElementById("productGrid");

    if (!productGrid) return;

    productGrid.innerHTML = "";

    if (!productList || productList.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products">
                <h3>No products found</h3>
                <p>Try another category or search term.</p>
            </div>
        `;
        return;
    }

    productList.forEach(product => {
        productGrid.appendChild(createProductCard(product));
    });
}

/* =========================================================
   FEATURED + NEW ARRIVALS
========================================================= */

function renderIntoContainer(productList, containerId) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    if (!productList.length) {
        container.innerHTML = `
            <div class="no-products">
                <p>Products will appear here soon.</p>
            </div>
        `;
        return;
    }

    productList.forEach(product => {
        container.appendChild(createProductCard(product));
    });
}

function loadSpecialProducts(productList) {
    const featured = productList
        .filter(product => product.is_featured === true)
        .slice(0, 8);

    const newest = productList
        .filter(product => product.is_new === true)
        .slice(0, 8);

    renderIntoContainer(featured, "featuredProducts");
    renderIntoContainer(newest, "newProducts");
}

/* =========================================================
   SEARCH
========================================================= */

const productSearch = document.getElementById("productSearch");

if (productSearch) {
    productSearch.addEventListener("input", () => {
        const query = productSearch.value.trim().toLowerCase();

        let result = [...allProducts];

        if (activeCategoryId !== null) {
            result = result.filter(
                product =>
                    Number(product.category_id) === Number(activeCategoryId)
            );
        }

        if (query) {
            result = result.filter(product => {
                const name = String(product.name || "").toLowerCase();
                const description = String(product.description || "").toLowerCase();
                const category = getCategoryName(product).toLowerCase();

                return (
                    name.includes(query) ||
                    description.includes(query) ||
                    category.includes(query)
                );
            });
        }

        renderProductGrid(result);

        const category =
            categories.find(
                item => Number(item.id) === Number(activeCategoryId)
            )?.name || "All products";

        updateActiveFilter(
            query
                ? `Search: "${productSearch.value}"${activeCategoryId !== null ? ` • ${category}` : ""}`
                : category
        );
    });
}

function updateActiveFilter(text) {
    const target = document.getElementById("activeFilter");

    if (target) {
        target.textContent =
            text && text !== "All products"
                ? `Showing: ${text}`
                : "";
    }
}

const clearFilter = document.getElementById("clearFilter");

if (clearFilter) {
    clearFilter.addEventListener("click", () => {
        activeCategoryId = null;

        if (productSearch) {
            productSearch.value = "";
        }

        renderCategories();
        renderProductGrid(allProducts);
        updateActiveFilter("All products");
    });
}

/* =========================================================
   OPEN PRODUCT DETAILS
========================================================= */

function openProductDetails(productId) {
    window.location.href =
        `product-details.html?id=${encodeURIComponent(productId)}`;
}

/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    await loadCategories();
    await loadProducts();
});
