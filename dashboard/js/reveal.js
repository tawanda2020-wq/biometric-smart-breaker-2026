/* reveal.js — scroll-triggered fade-in for elements with class="reveal" */
document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || items.length === 0) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => io.observe(el));

  // Safety net: a screenshot tool, a crawler, or a very fast scroll could
  // mean some elements never fire an intersection event. Don't let the
  // animation be the reason real content stays invisible.
  setTimeout(() => {
    items.forEach((el) => el.classList.add("visible"));
  }, 2500);
});
