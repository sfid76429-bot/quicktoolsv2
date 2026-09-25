/* QuickTools is intentionally dependency-free. Every tool runs in this document. */
(function () {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const byId = (id) => document.getElementById(id);
  const text = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  const show = (id, visible = true) => { const el = byId(id); if (el) el.hidden = !visible; };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const download = (name, content, type = "text/plain") => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 800);
  };
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };
  const setError = (id, message) => { text(id, message || ""); show(id, Boolean(message)); };
  const on = (id, event, handler) => { const el = byId(id); if (el) el.addEventListener(event, handler); };
  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        /* Fall back for clipboard permission or browser support issues. */
      }
    }
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      return copied;
    } catch {
      return false;
    }
  }

  function initNav() {
    const toggle = byId("nav-toggle");
    if (toggle) toggle.textContent = "Menu";
    on("nav-toggle", "click", () => {
      const nav = $(".nav-links"); if (!nav) return;
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function initWordCounter() {
    const input = byId("word-input"); if (!input) return;
    const wordSegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "word" }) : null;
    const characterSegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
    const calculate = () => {
      const value = input.value;
      const words = wordSegmenter
        ? Array.from(wordSegmenter.segment(value)).filter((part) => part.isWordLike).length
        : value.trim() ? value.trim().split(/\s+/).length : 0;
      const countCharacters = (inputValue) => characterSegmenter
        ? Array.from(characterSegmenter.segment(inputValue)).length
        : Array.from(inputValue).length;
      const chars = countCharacters(value);
      const noSpaces = countCharacters(value.replace(/\s/gu, ""));
      const sentences = value.trim() ? (value.match(/[.!?。！？]+(?=\s|$)/gu) || []).length : 0;
      text("word-count", words.toLocaleString()); text("char-count", chars.toLocaleString());
      text("char-nospace-count", noSpaces.toLocaleString()); text("sentence-count", sentences.toLocaleString());
      text("reading-time", words ? `${Math.max(1, Math.ceil(words / 200))} min` : "0 min");
    };
    input.addEventListener("input", calculate); calculate();
  }

  function initCaseConverter() {
    const input = byId("case-input"); if (!input) return;
    const convert = (mode) => {
      const value = input.value;
      if (mode === "upper") input.value = value.toLocaleUpperCase();
      if (mode === "lower") input.value = value.toLocaleLowerCase();
      if (mode === "title") input.value = value.toLocaleLowerCase().replace(/\b([a-zÀ-ÿ])/g, (m) => m.toLocaleUpperCase());
      if (mode === "sentence") input.value = value.toLocaleLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toLocaleUpperCase());
    };
    $$("[data-case]").forEach((button) => button.addEventListener("click", () => convert(button.dataset.case)));
    on("case-copy", "click", async () => { text("case-status", await copyText(input.value) ? "Copied to clipboard." : "Clipboard access is unavailable."); });
}

  function secureRandomInt(max) {
    const range = 0x100000000;
    const limit = Math.floor(range / max) * max;
    const array = new Uint32Array(1);
    do { crypto.getRandomValues(array); } while (array[0] >= limit);
    return array[0] % max;
  }
  function initPassword() {
    const output = byId("password-output"); if (!output) return;
    const generate = () => {
      const length = Number(byId("password-length").value);
      const sets = [];
      if (byId("use-lower").checked) sets.push("abcdefghijklmnopqrstuvwxyz");
      if (byId("use-upper").checked) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      if (byId("use-numbers").checked) sets.push("0123456789");
      if (byId("use-symbols").checked) sets.push("!@#$%^&*()-_=+[]{};:,.?");
      setError("password-error", sets.length ? "" : "Choose at least one character set.");
      if (!sets.length) { output.value = ""; return; }
      let result = sets.map((set) => set[secureRandomInt(set.length)]).join("");
      const all = sets.join("");
      while (result.length < length) result += all[secureRandomInt(all.length)];
      const characters = Array.from(result.slice(0, length));
      for (let i = characters.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [characters[i], characters[j]] = [characters[j], characters[i]];
      }
      result = characters.join("");
      output.value = result;
      const score = Math.min(4, (length >= 12 ? 1 : 0) + (sets.length >= 2 ? 1 : 0) + (sets.length >= 3 ? 1 : 0) + (length >= 20 ? 1 : 0));
      const labels = ["Needs more variety", "Short and simple", "Decent", "Strong", "Excellent"];
      text("password-strength", labels[score]); byId("password-meter").style.width = `${Math.max(10, score * 25)}%`;
    };
    on("password-length", "input", () => text("length-value", byId("password-length").value));
    on("generate-password", "click", generate);
    on("copy-password", "click", async () => { text("password-status", await copyText(output.value) ? "Password copied." : "Clipboard access is unavailable."); });
    $$("input[name=password-option]").forEach((el) => el.addEventListener("change", generate)); generate();
  }

  function initQr() {
    const input = byId("qr-input"); if (!input) return;
    const make = () => {
      const value = input.value.trim(); const target = byId("qr-output");
      if (!value) { target.innerHTML = '<p class="help">Your QR code will appear here.</p>'; show("qr-download", false); return; }
      if (typeof window.qrcode !== "function") { target.textContent = "The local QR library is unavailable."; return; }
      try {
        const qr = window.qrcode(0, byId("qr-level").value); qr.addData(value); qr.make();
        target.innerHTML = qr.createSvgTag(8, 4); show("qr-download", true);
        const svg = target.querySelector("svg"); if (svg) svg.setAttribute("role", "img");
      } catch (error) { target.textContent = "This text is too long for a QR code. Try a shorter message."; show("qr-download", false); }
    };
    on("generate-qr", "click", make); on("qr-input", "input", make);
    on("qr-download", "click", () => { const svg = byId("qr-output").querySelector("svg"); if (svg) download("quicktools-qr.svg", svg.outerHTML, "image/svg+xml"); });
  }

  function initImage() {
    const input = byId("image-file"); if (!input) return;
    let sourceFile = null, resultBlob = null;
    let imageError = byId("image-error");
    if (!imageError) {
      imageError = document.createElement("p");
      imageError.id = "image-error";
      imageError.className = "error";
      imageError.setAttribute("role", "alert");
      imageError.hidden = true;
      input.closest(".field")?.append(imageError);
    }
    const updateQuality = () => text("quality-value", `${byId("image-quality").value}%`);
    const compress = () => {
      if (!sourceFile) return;
      const file = sourceFile;
      if (!file.type.startsWith("image/")) { setError("image-error", "Choose a supported image file."); return; }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const requestedWidth = Number(byId("image-width").value) || img.naturalWidth;
        const requestedScale = requestedWidth / img.naturalWidth;
        const pixelLimitScale = Math.sqrt(16000000 / (img.naturalWidth * img.naturalHeight));
        const scale = Math.min(requestedScale, pixelLimitScale);
        const canvas = document.createElement("canvas"); canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
        const context = canvas.getContext("2d");
        if (!context) { setError("image-error", "Your browser could not prepare this image."); return; }
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = byId("image-format").value; canvas.toBlob((blob) => {
          if (!blob) { setError("image-error", "This image could not be converted to that format."); return; }
          resultBlob = blob; setError("image-error", ""); text("image-before", formatBytes(file.size)); text("image-after", formatBytes(blob.size));
          text("image-dimensions", `${canvas.width} × ${canvas.height}px`); show("image-result", true); show("download-image", true);
        }, mime, Number(byId("image-quality").value) / 100);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); setError("image-error", "This file could not be opened as an image."); };
      img.src = objectUrl;
    };
    on("image-file", "change", () => { sourceFile = input.files[0] || null; if (sourceFile) { resultBlob = null; show("download-image", false); compress(); } });
    on("compress-image", "click", compress); on("image-quality", "input", updateQuality); on("download-image", "click", () => { if (resultBlob) download(`quicktools-compressed.${byId("image-format").value.split("/")[1]}`, resultBlob, resultBlob.type); });
    updateQuality();
  }

  function initUnits() {
    const amount = byId("unit-amount"); if (!amount) return;
    const tables = {
      length: { meter: 1, kilometer: 1000, centimeter: .01, foot: .3048, inch: .0254, mile: 1609.344 },
      weight: { kilogram: 1, gram: .001, pound: .45359237, ounce: .0283495 },
    };
    const recalc = () => {
      const category = byId("unit-category").value, from = byId("unit-from").value, to = byId("unit-to").value, value = Number(amount.value);
      if (!amount.value.trim() || !Number.isFinite(value)) return text("unit-result", "Enter a number to convert.");
      let result;
      if (category === "temperature") {
        const celsius = from === "celsius" ? value : from === "fahrenheit" ? (value - 32) * 5 / 9 : value - 273.15;
        result = to === "celsius" ? celsius : to === "fahrenheit" ? celsius * 9 / 5 + 32 : celsius + 273.15;
      } else result = value * tables[category][from] / tables[category][to];
      text("unit-result", `${value} ${from} = ${Number(result.toFixed(6))} ${to}`);
    };
    const populate = () => {
      const category = byId("unit-category").value;
      const units = category === "length" ? [["meter", "Meters"], ["kilometer", "Kilometers"], ["centimeter", "Centimeters"], ["foot", "Feet"], ["inch", "Inches"], ["mile", "Miles"]] : category === "weight" ? [["kilogram", "Kilograms"], ["gram", "Grams"], ["pound", "Pounds"], ["ounce", "Ounces"]] : [["celsius", "Celsius"], ["fahrenheit", "Fahrenheit"], ["kelvin", "Kelvin"]];
      ["unit-from", "unit-to"].forEach((id) => { const select = byId(id); select.innerHTML = units.map(([v, l]) => `<option value="${v}">${l}</option>`).join(""); });
      recalc();
    };
    on("unit-category", "change", populate); ["unit-amount", "unit-from", "unit-to"].forEach((id) => on(id, "input", recalc)); ["unit-from", "unit-to"].forEach((id) => on(id, "change", recalc)); populate();
  }

  function initBmi() {
    const form = byId("bmi-form"); if (!form) return;
    const calculate = (event) => {
      event?.preventDefault(); const system = $("input[name=bmi-system]:checked").value;
      let bmi;
      if (system === "metric") bmi = Number(byId("bmi-weight").value) / (Number(byId("bmi-height").value) / 100) ** 2;
      else bmi = Number(byId("bmi-weight").value) * 703 / Number(byId("bmi-height").value) ** 2;
      if (!Number.isFinite(bmi) || bmi <= 0) return setError("bmi-error", "Enter a valid height and weight.");
      setError("bmi-error", ""); const label = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obesity range";
      text("bmi-value", bmi.toFixed(1)); text("bmi-label", label); byId("bmi-marker").style.left = `${Math.min(98, Math.max(2, bmi / 40 * 100))}%`; show("bmi-result", true);
    };
    form.addEventListener("submit", calculate); $$("input[name=bmi-system]").forEach((radio) => radio.addEventListener("change", () => { const metric = radio.value === "metric"; byId("bmi-height-label").textContent = metric ? "Height (cm)" : "Height (inches)"; byId("bmi-weight-label").textContent = metric ? "Weight (kg)" : "Weight (lb)"; }));
  }

  function initAge() {
    const input = byId("birth-date"); if (!input) return;
    on("age-form", "submit", (event) => {
      event.preventDefault();
      const [birthYear, birthMonth, birthDay] = input.value.split("-").map(Number);
      const birth = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
      const now = new Date();
      const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      if (!input.value || Number.isNaN(birth.getTime()) || birth > today) return setError("age-error", "Choose a valid date in the past.");
      setError("age-error", "");
      let years = today.getUTCFullYear() - birth.getUTCFullYear();
      let months = today.getUTCMonth() - birth.getUTCMonth();
      let days = today.getUTCDate() - birth.getUTCDate();
      if (days < 0) { months--; days += new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)).getUTCDate(); }
      if (months < 0) { years--; months += 12; }
      let next = Date.UTC(today.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
      if (next < today.getTime()) next = Date.UTC(today.getUTCFullYear() + 1, birth.getUTCMonth(), birth.getUTCDate());
      const daysUntil = Math.round((next - today.getTime()) / 86400000);
      text("age-value", `${years} years, ${months} months, ${days} days`); text("birthday-value", daysUntil === 0 ? "Today" : `In ${daysUntil} day${daysUntil === 1 ? "" : "s"}`); show("age-result", true);
    });
  }

  function initJson() {
    const input = byId("json-input"); if (!input) return;
    const format = (minify) => {
      try { const parsed = JSON.parse(input.value); input.value = JSON.stringify(parsed, null, minify ? 0 : 2); setError("json-error", ""); text("json-status", minify ? "JSON minified." : "Valid JSON, formatted."); }
      catch (error) { setError("json-error", `Invalid JSON: ${error.message}`); text("json-status", ""); }
    };
    on("json-format", "click", () => format(false)); on("json-minify", "click", () => format(true)); on("json-copy", "click", async () => { text("json-status", await copyText(input.value) ? "Copied to clipboard." : "Clipboard access is unavailable."); });
  }

  function initBase64() {
    const input = byId("base64-input"); if (!input) return;
    const encode = (value) => {
      const bytes = new TextEncoder().encode(value);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    };
    const decode = (value) => {
      const binary = atob(value);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    };
    on("base64-encode", "click", () => { try { input.value = encode(input.value); setError("base64-error", ""); } catch { setError("base64-error", "That text could not be encoded."); } });
    on("base64-decode", "click", () => { try { input.value = decode(input.value); setError("base64-error", ""); } catch { setError("base64-error", "That is not valid Base64 text."); } });
    on("base64-copy", "click", async () => { text("base64-status", await copyText(input.value) ? "Copied to clipboard." : "Clipboard access is unavailable."); });
  }

  function initUrl() {
    const input = byId("url-input"); if (!input) return;
    on("url-encode", "click", () => { input.value = encodeURIComponent(input.value); setError("url-error", ""); });
    on("url-decode", "click", () => { try { input.value = decodeURIComponent(input.value); setError("url-error", ""); } catch { setError("url-error", "That text contains an incomplete encoded sequence."); } });
    on("url-copy", "click", async () => { text("url-status", await copyText(input.value) ? "Copied to clipboard." : "Clipboard access is unavailable."); });
  }

  function markdownToSafeHtml(source) {
    const inline = (sourceText) => {
      const protectedBlocks = [];
      let html = escapeHtml(sourceText).replace(/`([^`]+)`/g, (_match, code) => {
        protectedBlocks.push(`<code>${code}</code>`);
        return `\uE000${protectedBlocks.length - 1}\uE001`;
      });
      html = html.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/gi, (_match, label, url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/~~(.+?)~~/g, "<del>$1</del>");
      return html.replace(/\uE000(\d+)\uE001/g, (_match, index) => protectedBlocks[Number(index)] || "");
    };
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let paragraph = [], listType = "", listItems = [], codeLines = [], inCode = false;
    const flushParagraph = () => {
      if (paragraph.length) blocks.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (listItems.length) {
        const tag = listType === "ordered" ? "ol" : "ul";
        blocks.push(`<${tag}>${listItems.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`);
      }
      listType = ""; listItems = [];
    };
    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        flushParagraph(); flushList();
        if (inCode) { blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`); codeLines = []; }
        inCode = !inCode;
        continue;
      }
      if (inCode) { codeLines.push(line); continue; }
      if (!line.trim()) { flushParagraph(); flushList(); continue; }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      const list = line.match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
      if (heading) {
        flushParagraph(); flushList();
        const level = Math.min(heading[1].length, 3);
        blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      } else if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushParagraph(); flushList(); blocks.push("<hr>");
      } else if (/^\s*>\s?/.test(line)) {
        flushParagraph(); flushList(); blocks.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ""))}</blockquote>`);
      } else if (list) {
        flushParagraph();
        const type = list[2] ? "ordered" : "unordered";
        if (listType && listType !== type) flushList();
        listType = type; listItems.push(list[3]);
      } else {
        flushList(); paragraph.push(line);
      }
    }
    flushParagraph(); flushList();
    if (inCode) blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    return blocks.join("\n") || '<p class="help">Your Markdown preview will appear here.</p>';
  }
  function initMarkdown() {
    const input = byId("markdown-input"); if (!input) return;
    const render = () => { byId("markdown-output").innerHTML = markdownToSafeHtml(input.value); };
    input.addEventListener("input", render); on("markdown-copy", "click", async () => { text("markdown-status", await copyText(input.value) ? "Markdown copied." : "Clipboard access is unavailable."); }); render();
  }

  function initDiff() {
    const left = byId("diff-left"); if (!left) return;
    const compare = () => {
      const a = left.value.split("\n"), b = byId("diff-right").value.split("\n");
      if (!left.value && !byId("diff-right").value) {
        byId("diff-output").innerHTML = '<p class="help">Add text on both sides to compare.</p>';
        return;
      }
      if (a.length * b.length > 4000000) {
        byId("diff-output").textContent = "This comparison is too large for the detailed view. Try comparing shorter sections.";
        return;
      }
      const matrix = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
      for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
          matrix[i][j] = a[i] === b[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
        }
      }
      const leftRows = [], rightRows = [];
      let i = 0, j = 0;
      const blank = '<div class="diff-line blank" aria-hidden="true"></div>';
      while (i < a.length || j < b.length) {
        if (i < a.length && j < b.length && a[i] === b[j]) {
          leftRows.push(`<div class="diff-line same">${escapeHtml(a[i++])}</div>`);
          rightRows.push(`<div class="diff-line same">${escapeHtml(b[j++])}</div>`);
        } else if (i < a.length && (j >= b.length || matrix[i + 1][j] >= matrix[i][j + 1])) {
          leftRows.push(`<div class="diff-line remove">− ${escapeHtml(a[i++])}</div>`);
          rightRows.push(blank);
        } else {
          leftRows.push(blank);
          rightRows.push(`<div class="diff-line add">+ ${escapeHtml(b[j++])}</div>`);
        }
      }
      byId("diff-output").innerHTML = `<div class="diff-pane">${leftRows.join("")}</div><div class="diff-pane">${rightRows.join("")}</div>`;
    };
    ["diff-left", "diff-right"].forEach((id) => on(id, "input", compare)); compare();
  }

  function initColor() {
    const picker = byId("color-input"); if (!picker) return;
    const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 }; };
    const update = () => {
      const hex = picker.value.toUpperCase(), { r, g, b } = hexToRgb(hex), max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, d = max - min;
      let h = 0; if (d) { const raw = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = Math.round(raw * 60); if (h < 0) h += 360; }
      const l = (max + min) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
      text("hex-value", hex); text("rgb-value", `rgb(${r}, ${g}, ${b})`); text("hsl-value", `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`);
      const colors = [hex, `#${((r + 40) % 256).toString(16).padStart(2, "0")}${((g + 80) % 256).toString(16).padStart(2, "0")}${((b + 110) % 256).toString(16).padStart(2, "0")}`, `#${(255 - r).toString(16).padStart(2, "0")}${(255 - g).toString(16).padStart(2, "0")}${(255 - b).toString(16).padStart(2, "0")}`, `#${Math.min(255, r + 55).toString(16).padStart(2, "0")}${Math.min(255, g + 55).toString(16).padStart(2, "0")}${Math.min(255, b + 55).toString(16).padStart(2, "0")}`, `#${Math.max(0, r - 55).toString(16).padStart(2, "0")}${Math.max(0, g - 55).toString(16).padStart(2, "0")}${Math.max(0, b - 55).toString(16).padStart(2, "0")}`];
      byId("swatches").innerHTML = colors.map((color) => `<div class="swatch"><div class="swatch-color" style="background:${color}"></div><code>${color}</code></div>`).join("");
    };
    picker.addEventListener("input", update); on("copy-color", "click", async () => { text("color-status", await copyText(byId("hex-value").textContent) ? "Hex value copied." : "Clipboard access is unavailable."); }); update();
  }

  function initLorem() {
    const input = byId("lorem-count"); if (!input) return;
    const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat".split(" ");
    const make = () => {
      const count = Math.max(1, Math.min(30, Number(input.value) || 3)), mode = byId("lorem-mode").value, size = mode === "words" ? count : count * 48, chunks = [];
      for (let i = 0; i < size; i++) chunks.push(words[i % words.length]);
      if (mode === "words") byId("lorem-output").textContent = `${chunks[0][0].toUpperCase()}${chunks.slice(0, count).join(" ").slice(1)}.`;
      else { const result = []; for (let i = 0; i < count; i++) result.push(`${chunks.slice(i * 48, (i + 1) * 48).join(" ")}.`); byId("lorem-output").textContent = result.join("\n\n"); }
    };
    on("generate-lorem", "click", make); on("lorem-copy", "click", async () => { text("lorem-status", await copyText(byId("lorem-output").textContent) ? "Text copied." : "Clipboard access is unavailable."); }); make();
  }

  initNav();
  const tool = document.body.dataset.tool;
  ({ words: initWordCounter, cases: initCaseConverter, password: initPassword, qr: initQr, image: initImage, units: initUnits, bmi: initBmi, age: initAge, json: initJson, base64: initBase64, url: initUrl, markdown: initMarkdown, diff: initDiff, color: initColor, lorem: initLorem }[tool] || function () {})();
}());