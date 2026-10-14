const header = document.querySelector(".site-header");
const progress = document.querySelector(".scroll-progress");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

function updateScrollState() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0}%`;
  header.classList.toggle("scrolled", window.scrollY > 20);
}

window.addEventListener("scroll", updateScrollState, { passive: true });
updateScrollState();

menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
  mainNav.classList.toggle("open", !expanded);
  document.body.classList.toggle("menu-open", !expanded);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    mainNav.classList.remove("open");
    document.body.classList.remove("menu-open");
  });
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal, .process-section").forEach((element) => revealObserver.observe(element));

const quoteForm = document.querySelector("#quote-form");
const quoteButton = quoteForm.querySelector(".form-submit");
const quoteResponse = quoteForm.querySelector(".form-response");
const quoteCooldownKey = "stark-heaters-quote-cooldown-until";
const quoteCooldownMs = 60_000;
const quoteButtonLabel = quoteButton.firstChild.textContent;
let quoteCooldownTimer;

function showQuoteStorageError() {
  quoteResponse.textContent = "Your browser could not apply the quote-form cooldown. Please try again after enabling site storage.";
  quoteResponse.classList.add("error");
  quoteButton.disabled = true;
}

function getQuoteCooldownUntil() {
  const value = localStorage.getItem(quoteCooldownKey);
  if (value === null) return 0;

  const until = Number(value);
  if (!Number.isFinite(until)) {
    localStorage.removeItem(quoteCooldownKey);
    return 0;
  }
  return until;
}

function updateQuoteCooldown() {
  let until;
  try {
    until = getQuoteCooldownUntil();
  } catch {
    window.clearInterval(quoteCooldownTimer);
    showQuoteStorageError();
    return;
  }

  const secondsRemaining = Math.ceil((until - Date.now()) / 1000);
  if (secondsRemaining <= 0) {
    window.clearInterval(quoteCooldownTimer);
    quoteCooldownTimer = undefined;
    quoteButton.disabled = false;
    quoteButton.firstChild.textContent = quoteButtonLabel;
    quoteResponse.textContent = "";
    quoteResponse.classList.remove("error");
    return;
  }

  quoteButton.disabled = true;
  quoteButton.firstChild.textContent = `Please wait ${Math.floor(secondsRemaining / 60)
    .toString().padStart(2, "0")}:${(secondsRemaining % 60).toString().padStart(2, "0")} `;
  quoteResponse.textContent = "To limit repeated enquiries, please wait before submitting another quote request.";
  if (!quoteCooldownTimer) {
    quoteCooldownTimer = window.setInterval(updateQuoteCooldown, 1000);
  }
}

function startQuoteCooldown() {
  try {
    localStorage.setItem(quoteCooldownKey, String(Date.now() + quoteCooldownMs));
  } catch {
    showQuoteStorageError();
    return false;
  }
  updateQuoteCooldown();
  updateQuoteCooldown();
  return true;
}

window.addEventListener("storage", (event) => {
  if (event.key === quoteCooldownKey) updateQuoteCooldown();
});
updateQuoteCooldown();

quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(quoteForm);
  const file = formData.get("attachment");

  if (file && file.size > 10 * 1024 * 1024) {
    quoteResponse.textContent = "Please choose a file smaller than 10 MB.";
    quoteResponse.classList.add("error");
    return;
  }

  let cooldownUntil;
  try {
    cooldownUntil = getQuoteCooldownUntil();
  } catch {
    showQuoteStorageError();
    return;
  }

  if (cooldownUntil > Date.now()) {
    updateQuoteCooldown();
    return;
  }

  if (!startQuoteCooldown()) return;

  const subject = encodeURIComponent(`STARK HEATERS quote enquiry${formData.get("product") ? ` — ${formData.get("product")}` : ""}`);
  const body = encodeURIComponent([
    `Name: ${formData.get("name")}`,
    `Company: ${formData.get("company") || "Not provided"}`,
    `Phone: ${formData.get("phone")}`,
    `Email: ${formData.get("email")}`,
    `Product required: ${formData.get("product") || "Not specified"}`,
    `Temperature requirement: ${formData.get("temperature") || "Not specified"}`,
    `Voltage: ${formData.get("voltage") || "Not specified"}`,
    `Wattage: ${formData.get("wattage") || "Not specified"}`,
    `Quantity: ${formData.get("quantity") || "Not specified"}`,
    `Application details: ${formData.get("application") || "Not provided"}`,
    `Drawing/specification: ${file && file.name ? file.name : "Not attached"}`
  ].join("\n"));

  quoteResponse.classList.remove("error");
  quoteResponse.textContent = file && file.name
    ? "Your email app will open with the enquiry. Please attach your selected file before sending."
    : "Your email app will open with the enquiry details ready to send.";
  window.location.href = `mailto:starkheaters@gmail.com?subject=${subject}&body=${body}`;
});
