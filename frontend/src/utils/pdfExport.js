// PDF export — renders a wellness summary as a multi-page PDF using jsPDF.
// Intended for the user to bring to a therapy appointment.
//
// Design goals:
//   - Readable on paper. Generous whitespace, no decorative noise.
//   - Honest about what it is. Headers say "Wellness summary," not "Diagnosis."
//   - Self-contained. Includes the patient's name, the date range, and the
//     date the report was generated.
//   - Robust to long content. All long text (journals, reflections) wraps
//     and paginates correctly.

import jsPDF from "jspdf";

// Same scoring map used elsewhere in the app.
const MOOD_SCORE = { happy: 5, neutral: 3, sad: 2, anxious: 2, stressed: 1 };
const MOOD_LABEL = {
  happy: "Happy",
  neutral: "Neutral",
  sad: "Sad",
  anxious: "Anxious",
  stressed: "Stressed",
};

// Brand-ish teal that matches the app's primary color (Tailwind primary-600).
const TEAL = [26, 168, 140]; // RGB
const GREY = [115, 115, 115];
const DARK = [30, 30, 30];

const MARGIN = 50;
const LINE_HEIGHT = 14;

// Util: add a new page if needed, return the next y-position.
function ensureSpace(doc, y, needed) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function setText(doc, color, size, weight = "normal") {
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFontSize(size);
  doc.setFont("helvetica", weight);
}

function drawDivider(doc, y) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  const pageW = doc.internal.pageSize.getWidth();
  doc.line(MARGIN, y, pageW - MARGIN, y);
}

function drawSectionTitle(doc, y, title) {
  setText(doc, TEAL, 11, "bold");
  // small dot before title
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.circle(MARGIN + 3, y - 3, 2, "F");
  doc.text(title.toUpperCase(), MARGIN + 12, y);
  return y + 18;
}

function paragraph(doc, y, text, color = DARK, size = 10) {
  if (!text) return y;
  setText(doc, color, size);
  const pageW = doc.internal.pageSize.getWidth();
  const lines = doc.splitTextToSize(String(text), pageW - MARGIN * 2);
  for (const line of lines) {
    y = ensureSpace(doc, y, LINE_HEIGHT);
    doc.text(line, MARGIN, y);
    y += LINE_HEIGHT;
  }
  return y;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRange(start, end) {
  if (!start && !end) return "All available data";
  if (start && !end) return `From ${formatDate(start)}`;
  if (!start && end) return `Until ${formatDate(end)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// Computes per-mood-type counts and the average mood score.
function summarizeMoods(moods) {
  const counts = { happy: 0, neutral: 0, sad: 0, anxious: 0, stressed: 0 };
  let scoreSum = 0;
  let scoreN = 0;
  const dayKeys = new Set();

  for (const m of moods) {
    counts[m.mood_type] = (counts[m.mood_type] || 0) + 1;
    const s = MOOD_SCORE[m.mood_type];
    if (s != null) {
      scoreSum += s;
      scoreN += 1;
    }
    dayKeys.add(new Date(m.mood_date).toISOString().slice(0, 10));
  }
  return {
    counts,
    average: scoreN > 0 ? scoreSum / scoreN : null,
    distinctDays: dayKeys.size,
  };
}

export function exportWellnessPDF({
  user,
  moods = [],
  journals = [],
  reflections = [],
  correlations = null,
  startDate,
  endDate,
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  // ─── HEADER BAND ────────────────────────────────────────────────
  // Solid teal stripe along the top
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.rect(0, 0, pageW, 36, "F");
  setText(doc, [255, 255, 255], 14, "bold");
  doc.text("MindMate", MARGIN, 23);
  setText(doc, [255, 255, 255], 9);
  doc.text("Wellness summary", pageW - MARGIN, 23, { align: "right" });

  y = 60;

  // Patient block
  setText(doc, DARK, 18, "bold");
  doc.text(user?.username || "Member", MARGIN, y);
  y += 22;

  setText(doc, GREY, 10);
  doc.text(user?.email || "", MARGIN, y);
  y += 14;
  doc.text(`Period: ${formatRange(startDate, endDate)}`, MARGIN, y);
  y += 14;
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`,
    MARGIN,
    y
  );
  y += 22;

  // Disclaimer
  setText(doc, GREY, 8, "italic");
  const disclaimer =
    "This report summarizes self-reported mood and journaling data. It is not a clinical assessment, " +
    "diagnosis, or substitute for professional mental health care.";
  y = paragraph(doc, y, disclaimer, GREY, 8);
  y += 8;

  drawDivider(doc, y);
  y += 18;

  // ─── AT A GLANCE ────────────────────────────────────────────────
  y = drawSectionTitle(doc, y, "At a glance");

  const summary = summarizeMoods(moods);
  const lines = [
    `Total mood entries: ${moods.length}`,
    `Distinct days logged: ${summary.distinctDays}`,
    `Journal entries: ${journals.length}`,
    `Weekly reflections written: ${reflections.length}`,
    summary.average != null
      ? `Average mood score: ${summary.average.toFixed(2)} / 5`
      : `Average mood score: —`,
  ];
  for (const line of lines) {
    y = ensureSpace(doc, y, LINE_HEIGHT);
    setText(doc, DARK, 10);
    doc.text(line, MARGIN, y);
    y += LINE_HEIGHT;
  }
  y += 10;

  // ─── MOOD BREAKDOWN ────────────────────────────────────────────
  y = ensureSpace(doc, y, 80);
  y = drawSectionTitle(doc, y, "Mood breakdown");

  const order = ["happy", "neutral", "sad", "anxious", "stressed"];
  const totalForBars = moods.length || 1;
  // Simple horizontal bars
  for (const k of order) {
    y = ensureSpace(doc, y, 22);
    const count = summary.counts[k] || 0;
    const pct = (count / totalForBars) * 100;
    // Label
    setText(doc, DARK, 10);
    doc.text(MOOD_LABEL[k], MARGIN, y);
    // Count + percent
    setText(doc, GREY, 9);
    doc.text(
      `${count}  (${pct.toFixed(0)}%)`,
      pageW - MARGIN,
      y,
      { align: "right" }
    );
    // Bar background
    const barX = MARGIN + 80;
    const barW = pageW - MARGIN * 2 - 80 - 60;
    doc.setFillColor(235, 235, 235);
    doc.rect(barX, y - 9, barW, 8, "F");
    // Bar fill
    doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
    doc.rect(barX, y - 9, (barW * pct) / 100, 8, "F");
    y += 16;
  }
  y += 10;

  // ─── PATTERNS / CORRELATIONS ───────────────────────────────────
  if (correlations?.insights?.length > 0) {
    y = ensureSpace(doc, y, 60);
    y = drawSectionTitle(doc, y, "Patterns we noticed");
    for (const ins of correlations.insights) {
      y = ensureSpace(doc, y, 36);
      setText(doc, DARK, 10, "bold");
      doc.text(`• ${ins.headline}`, MARGIN, y);
      y += 12;
      y = paragraph(doc, y, ins.detail, GREY, 9);
      y += 4;
    }
    y += 6;
  }

  // ─── WEEKLY REFLECTIONS (user-written) ─────────────────────────
  if (reflections.length > 0) {
    y = ensureSpace(doc, y, 60);
    y = drawSectionTitle(doc, y, "Weekly reflections");
    const sorted = [...reflections].sort(
      (a, b) => new Date(b.week_start) - new Date(a.week_start)
    );
    for (const r of sorted) {
      y = ensureSpace(doc, y, 40);
      setText(doc, DARK, 10, "bold");
      doc.text(`Week of ${formatDate(r.week_start)}`, MARGIN, y);
      y += LINE_HEIGHT;
      y = paragraph(doc, y, r.summary, DARK, 10);
      y += 8;
    }
    y += 6;
  }

  // ─── JOURNAL ENTRIES ───────────────────────────────────────────
  if (journals.length > 0) {
    y = ensureSpace(doc, y, 60);
    y = drawSectionTitle(doc, y, "Journal entries");
    const sorted = [...journals].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    for (const j of sorted) {
      y = ensureSpace(doc, y, 60);
      setText(doc, DARK, 11, "bold");
      doc.text(j.title || "(untitled)", MARGIN, y);
      y += 14;
      setText(doc, GREY, 9);
      doc.text(formatDate(j.created_at), MARGIN, y);
      y += 14;
      y = paragraph(doc, y, j.content || "", DARK, 10);
      y += 14;
    }
  }

  // ─── FOOTER (every page) ───────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setText(doc, GREY, 8);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(
      `MindMate Wellness Summary  ·  ${user?.username || ""}  ·  Page ${p} of ${pageCount}`,
      pageW / 2,
      pageH - 20,
      { align: "center" }
    );
  }

  // ─── SAVE ──────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const safeName = (user?.username || "user").replace(/[^a-z0-9_-]+/gi, "-");
  doc.save(`MindMate-summary-${safeName}-${today}.pdf`);
}
