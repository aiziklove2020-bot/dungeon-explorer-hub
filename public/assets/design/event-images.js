// Adapted from the Stitch design's event-images.js: turns a .card-art (or
// .cover) element's CSS background-image into a framed real <img> with a
// blurred backdrop, matching the design's .event-image-frame treatment.
// The design's own copy auto-ran once at parse time against static demo
// markup; the real site injects cards after an async Firestore fetch, so
// this is exposed as callable functions instead and invoked right after
// each page renders its cards (see events.html / index.html / etc.).
(() => {
  const fallback = "assets/design/lounge.png";

  function frameImage(frame, src, alt) {
    if (frame.classList.contains("event-image-frame")) return;
    frame.classList.add("event-image-frame");
    frame.style.setProperty("--event-image", `url("${src}")`);
    const image = document.createElement("img");
    image.className = "event-image-content";
    image.src = src;
    image.alt = alt;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      frame.classList.add("image-unavailable");
      frame.style.removeProperty("--event-image");
      image.remove();
      const label = document.createElement("span");
      label.className = "image-fallback";
      label.textContent = "תמונת המסיבה תעודכן בקרוב";
      frame.prepend(label);
    }, { once: true });
    frame.prepend(image);
  }

  function frameCards(root) {
    root.querySelectorAll(".card-art").forEach((frame) => {
      if (frame.classList.contains("event-image-frame")) return;
      const card = frame.closest(".card");
      const bg = getComputedStyle(frame).backgroundImage;
      const match = bg.match(/url\(["']?(.*?)["']?\)/);
      frameImage(frame, match ? match[1] : fallback, card?.querySelector("h3")?.textContent || "תמונת המסיבה");
      const body = card?.querySelector(".card-body");
      const date = frame.querySelector(".date");
      if (date && body) {
        date.classList.add("event-date-label");
        body.prepend(date);
      }
      const heart = frame.querySelector(".heart");
      if (heart) {
        heart.classList.add("event-save-button");
        card?.querySelector(".card-bottom")?.append(heart);
      }
    });
  }

  function frameCover(root, src, alt) {
    const frame = root.querySelector(".cover");
    if (!frame || !src) return;
    frameImage(frame, src, alt || "תמונת המסיבה");
  }

  function adaptImages(root) {
    root.querySelectorAll(".my-event>a, .personal-favorites article>a, .matched-event").forEach((frame) => {
      if (frame.classList.contains("event-image-frame")) return;
      const img = frame.querySelector("img");
      if (!img) return;
      if (frame.classList.contains("matched-event")) {
        const wrap = document.createElement("span");
        wrap.className = "matched-event-image";
        img.replaceWith(wrap);
        frameImage(wrap, img.getAttribute("src"), img.alt);
      } else {
        const src = img.getAttribute("src"), alt = img.alt;
        img.remove();
        frameImage(frame, src, alt);
      }
    });
  }

  // Full-size flyer lightbox — click any framed card image to see it in full.
  let dialog = null;
  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "poster-dialog";
    dialog.innerHTML = '<header><strong id="poster-title">תמונת המסיבה</strong><button type="button" aria-label="סגירת התמונה">×</button></header><img alt=""><p>הפלייר מוצג בשלמותו.</p>';
    dialog.setAttribute("aria-labelledby", "poster-title");
    document.body.append(dialog);
    dialog.querySelector("button").onclick = () => dialog.close();
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
      }
    });
    return dialog;
  }

  function wireExpand(root) {
    root.querySelectorAll(".card-art.event-image-frame, .cover.event-image-frame").forEach((frame) => {
      if (frame.querySelector(".poster-expand")) return;
      const img = frame.querySelector(".event-image-content");
      if (!img) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "poster-expand";
      button.textContent = "הגדלת הפלייר ⤢";
      button.setAttribute("aria-label", "הגדלת הפלייר: " + img.alt);
      button.onclick = () => {
        const d = ensureDialog();
        d.querySelector("img").src = img.src;
        d.querySelector("img").alt = img.alt;
        d.querySelector("strong").textContent = img.alt;
        d.showModal();
      };
      frame.append(button);
    });
  }

  window.lpFrameEventImages = function lpFrameEventImages(container) {
    const root = container || document;
    frameCards(root);
    adaptImages(root);
    wireExpand(root);
  };

  window.lpFrameCoverImage = function lpFrameCoverImage(container, src, alt) {
    const root = container || document;
    frameCover(root, src, alt);
    wireExpand(root);
  };

  // For elements that manage their own .event-image-frame/.event-image-content
  // state directly (e.g. a single persistent banner reused across selections,
  // where the "already framed, skip" guard in frameImage() would be wrong) —
  // this only wires the expand-to-lightbox button, safe to call repeatedly.
  window.lpWireImageExpand = function lpWireImageExpand(container) {
    wireExpand(container || document);
  };
})();
