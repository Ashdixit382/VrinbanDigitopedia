/**
 * Portfolio site interactions: theme, navigation, scroll reveals,
 * animated stats, contact form, resume download.
 */

(function () {
  "use strict";

  const THEME_KEY = "dm-portfolio-theme";
  const THEME_MODE_KEY = "dm-portfolio-theme-mode";
  const DAY_START_HOUR = 7;
  const NIGHT_START_HOUR = 19;
  const doc = document.documentElement;

  /* -------------------------------------------------------------------------- */
  /* Theme (light / dark)                                                       */
  /* -------------------------------------------------------------------------- */

  function getThemeMode() {
    const storedMode = localStorage.getItem(THEME_MODE_KEY);
    if (storedMode === "light" || storedMode === "dark" || storedMode === "auto") return storedMode;
    return "auto";
  }

  function applyTheme(theme) {
    doc.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function getTimeBasedTheme() {
    const hour = new Date().getHours();
    const isDaylight = hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR;
    return isDaylight ? "light" : "dark";
  }

  function resolveTheme(mode) {
    if (mode === "light" || mode === "dark") return mode;
    return getTimeBasedTheme();
  }

  function applyThemeMode(mode) {
    const resolvedTheme = resolveTheme(mode);
    applyTheme(resolvedTheme);
    localStorage.setItem(THEME_MODE_KEY, mode);
    if (themeToggle) {
      const modeLabel = mode === "auto" ? "auto (daylight)" : mode;
      themeToggle.setAttribute("aria-label", `Theme: ${modeLabel}. Click to change.`);
      themeToggle.title = `Theme: ${modeLabel}`;
    }
  }

  const themeToggle = document.getElementById("theme-toggle");
  applyThemeMode(getThemeMode());

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const mode = getThemeMode();
      const nextMode = mode === "auto" ? "dark" : mode === "dark" ? "light" : "auto";
      applyThemeMode(nextMode);
    });
  }

  // Keep auto mode in sync with daylight changes.
  setInterval(() => {
    if (getThemeMode() === "auto") applyThemeMode("auto");
  }, 60000);

  // Use ambient light data when available (secure contexts / supported browsers).
  if ("AmbientLightSensor" in window) {
    try {
      const sensor = new AmbientLightSensor();
      sensor.addEventListener("reading", () => {
        if (getThemeMode() !== "auto") return;
        applyTheme(sensor.illuminance >= 50 ? "light" : "dark");
      });
      sensor.start();
    } catch (error) {
      // If unavailable or blocked, time-based mode still works.
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Mobile navigation                                                          */
  /* -------------------------------------------------------------------------- */

  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.getElementById("nav-menu");

  function closeNav() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function openNav() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", "true");
    navMenu.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      if (open) closeNav();
      else openNav();
    });

    navMenu.querySelectorAll("[data-nav-link]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 1023px)").matches) closeNav();
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) closeNav();
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Smooth scroll for in-page anchors (respect reduced motion)               */
  /* -------------------------------------------------------------------------- */

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    const id = anchor.getAttribute("href");
    if (!id || id === "#") return;
    anchor.addEventListener("click", (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* Scroll reveal + stat counter + tool bars                                   */
  /* -------------------------------------------------------------------------- */

  const revealElements = document.querySelectorAll(".reveal");

  function animateCount(el, target, duration) {
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (target - from) * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-visible");

        // Stat numbers
        if (el.classList.contains("stat")) {
          const num = el.querySelector(".stat__value");
          if (num && num.dataset.count && !num.dataset.done) {
            num.dataset.done = "1";
            animateCount(num, parseInt(num.dataset.count, 10), 1400);
          }
        }

        // Tool progress bars (parent .tool-row)
        if (el.classList.contains("tool-row")) {
          el.classList.add("is-visible");
        }

        if (!el.classList.contains("stat")) {
          io.unobserve(el);
        }
      });
    },
    { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  revealElements.forEach((el) => io.observe(el));

  /* -------------------------------------------------------------------------- */
  /* Contact form (validation + live email delivery)                            */
  /* -------------------------------------------------------------------------- */

  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");

  if (form && formStatus) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      formStatus.textContent = "";
      formStatus.classList.remove("success", "error");

      const name = form.querySelector("#contact-name");
      const email = form.querySelector("#contact-email");
      const message = form.querySelector("#contact-message");

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        formStatus.textContent = "Please fill in all fields.";
        formStatus.classList.add("error");
        return;
      }

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!emailOk) {
        formStatus.textContent = "Please enter a valid email address.";
        formStatus.classList.add("error");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Form submission failed");
        }

        formStatus.textContent = "Thanks — your message has been sent. We’ll get back to you shortly.";
        formStatus.classList.add("success");
        form.reset();
      } catch (error) {
        formStatus.textContent = "Sorry, message could not be sent right now. Please try again or email us directly.";
        formStatus.classList.add("error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Portfolio slider                                                           */
  /* -------------------------------------------------------------------------- */

  const slider = document.querySelector(".portfolio-slider");
  if (slider) {
    const track = slider.querySelector("[data-slider-track]");
    const prevBtn = slider.querySelector("[data-slider-prev]");
    const nextBtn = slider.querySelector("[data-slider-next]");
    const dotsWrap = slider.querySelector("[data-slider-dots]");
    const slides = Array.from(track ? track.children : []);
    const AUTOPLAY_MS = 4500;

    let currentIndex = 0;
    let autoplayTimer = null;
    let autoplayStart = 0;
    let progressRaf = 0;
    let autoplayFill = null;
    let touchStartX = 0;
    let touchDeltaX = 0;

    function setupAutoplayBar() {
      const bar = document.createElement("div");
      bar.className = "portfolio-slider__autoplay";
      bar.setAttribute("aria-hidden", "true");
      autoplayFill = document.createElement("span");
      autoplayFill.className = "portfolio-slider__autoplay-fill";
      bar.appendChild(autoplayFill);
      slider.appendChild(bar);
    }

    function renderDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      slides.forEach((_, idx) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "portfolio-slider__dot";
        dot.setAttribute("aria-label", `Go to video ${idx + 1}`);
        dot.addEventListener("click", () => {
          currentIndex = idx;
          updateSlider();
        });
        dotsWrap.appendChild(dot);
      });
    }

    function updateSlider() {
      if (!track) return;
      slides.forEach((slide, idx) => {
        slide.classList.remove("is-active", "is-prev", "is-next", "is-hidden-left", "is-hidden-right");
        const leftDistance = (currentIndex - idx + slides.length) % slides.length;
        const rightDistance = (idx - currentIndex + slides.length) % slides.length;

        if (idx === currentIndex) {
          slide.classList.add("is-active");
        } else if (rightDistance === 1) {
          slide.classList.add("is-next");
        } else if (leftDistance === 1) {
          slide.classList.add("is-prev");
        } else if (rightDistance <= leftDistance) {
          slide.classList.add("is-hidden-right");
        } else {
          slide.classList.add("is-hidden-left");
        }
      });

      if (prevBtn) prevBtn.disabled = slides.length < 2;
      if (nextBtn) nextBtn.disabled = slides.length < 2;

      if (dotsWrap) {
        dotsWrap.querySelectorAll(".portfolio-slider__dot").forEach((dot, idx) => {
          dot.classList.toggle("is-active", idx === currentIndex);
        });
      }
    }

    function nextSlide() {
      if (slides.length < 2) return;
      currentIndex = (currentIndex + 1) % slides.length;
      updateSlider();
    }

    function resetProgress() {
      if (autoplayFill) autoplayFill.style.transform = "scaleX(0)";
    }

    function runProgress() {
      if (!autoplayFill) return;
      const elapsed = performance.now() - autoplayStart;
      const ratio = Math.max(0, Math.min(elapsed / AUTOPLAY_MS, 1));
      autoplayFill.style.transform = `scaleX(${ratio})`;
      if (ratio < 1) {
        progressRaf = requestAnimationFrame(runProgress);
      }
    }

    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = null;
      if (progressRaf) cancelAnimationFrame(progressRaf);
      progressRaf = 0;
      resetProgress();
    }

    function startAutoplay() {
      if (slides.length < 2) return;
      stopAutoplay();
      autoplayStart = performance.now();
      progressRaf = requestAnimationFrame(runProgress);
      autoplayTimer = setInterval(() => {
        nextSlide();
        autoplayStart = performance.now();
        if (progressRaf) cancelAnimationFrame(progressRaf);
        progressRaf = requestAnimationFrame(runProgress);
      }, AUTOPLAY_MS);
    }

    if (slides.length > 0) {
      setupAutoplayBar();
      renderDots();
      updateSlider();
      startAutoplay();
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (slides.length < 2) return;
        currentIndex = currentIndex <= 0 ? slides.length - 1 : currentIndex - 1;
        updateSlider();
        startAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        nextSlide();
        startAutoplay();
      });
    }

    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", startAutoplay);
    slider.addEventListener("focusin", stopAutoplay);
    slider.addEventListener("focusout", (event) => {
      // Resume only when focus leaves the entire slider.
      if (!slider.contains(event.relatedTarget)) startAutoplay();
    });

    slider.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        currentIndex = currentIndex <= 0 ? slides.length - 1 : currentIndex - 1;
        updateSlider();
        startAutoplay();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextSlide();
        startAutoplay();
      }
    });
    slider.setAttribute("tabindex", "0");

    slider.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.touches[0].clientX;
        touchDeltaX = 0;
      },
      { passive: true }
    );

    slider.addEventListener(
      "touchmove",
      (event) => {
        touchDeltaX = event.touches[0].clientX - touchStartX;
      },
      { passive: true }
    );

    slider.addEventListener("touchend", () => {
      if (Math.abs(touchDeltaX) < 45) return;
      if (touchDeltaX < 0) nextSlide();
      else currentIndex = currentIndex <= 0 ? slides.length - 1 : currentIndex - 1;
      updateSlider();
      startAutoplay();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Download resume (sample .txt — replace with your PDF URL)                  */
  /* -------------------------------------------------------------------------- */

  // Resume download is intentionally disabled for now.

  /* -------------------------------------------------------------------------- */
  /* Footer year                                                                */
  /* -------------------------------------------------------------------------- */

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
