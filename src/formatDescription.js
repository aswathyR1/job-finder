// Turns a plain-text job description into structured blocks:
//   { type: "heading", text } | { type: "paragraph", text } | { type: "list", items: [] }

const BULLET = /^\s*(?:[•●▪◦·‣∙○■□➢➤►✓✔\-–—*]|\(?\d{1,2}[.)]|[a-z][.)])\s+/;
const INLINE_BULLET = /\s+[•●▪◦·‣∙■➢➤►✓✔]\s+/;

// Common section names in job postings, used to find headings in text with no line breaks.
const SECTION_WORDS = [
  "About (?:the|this) (?:role|job|position|company|team|opportunity)",
  "About us",
  "Who we are",
  "Who you are",
  "The role",
  "Overview",
  "Job (?:summary|description|overview)",
  "Position (?:summary|overview)",
  "(?:Key |Primary |Essential |Main )?(?:responsibilities|duties)(?: and responsibilities)?",
  "What you(?:'|’)ll (?:do|bring|need|get)",
  "What we(?:'|’)re looking for",
  "What we offer",
  "(?:Minimum |Basic |Preferred |Required )?(?:qualifications|requirements|skills|experience)",
  "Nice to have",
  "Education",
  "(?:Benefits|Perks)(?: and perks| & perks)?",
  "Compensation",
  "Salary",
  "Pay (?:range|rate)",
  "Schedule",
  "Work (?:location|environment|schedule)",
  "Location",
  "How to apply",
  "Equal (?:opportunity|employment)[^:]*",
  "EEO statement",
];
const SECTION_RE = new RegExp(`\\s(?=(?:${SECTION_WORDS.join("|")})\\s*:)`, "gi");
const SECTION_LINE = new RegExp(`^(?:${SECTION_WORDS.join("|")})\\s*:?$`, "i");

export function formatDescription(raw) {
  if (!raw) return [];
  let text = raw.replace(/\r\n?/g, "\n").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();

  // Wall of text: split before known section headings, and before inline bullets.
  if (!text.includes("\n")) {
    text = text.replace(SECTION_RE, "\n\n");
  }

  const lines = text
    .split("\n")
    .flatMap((line) => splitInlineBullets(line.trim()));

  const blocks = [];
  let list = null;
  const closeList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      closeList();
      continue;
    }

    if (BULLET.test(line)) {
      const item = line.replace(BULLET, "").trim();
      if (!item) continue;
      if (!list) list = { type: "list", items: [] };
      list.items.push(item);
      continue;
    }

    // "Responsibilities: Do X, do Y" → heading + paragraph
    const inline = line.match(/^([A-Z][^:.!?]{2,60}):\s+(.{20,})$/);
    if (inline && isHeadingText(inline[1])) {
      closeList();
      blocks.push({ type: "heading", text: inline[1] });
      blocks.push(...paragraphs(inline[2]));
      continue;
    }

    if (isHeadingLine(line, lines[i + 1])) {
      closeList();
      blocks.push({ type: "heading", text: line.replace(/[:\s]+$/, "") });
      continue;
    }

    // A short line inside a list (no bullet char) that continues the list, e.g. wrapped bullets.
    if (list && line.length < 200 && !/[.!?]$/.test(lines[i - 1] || "") && /^[a-z]/.test(line)) {
      list.items[list.items.length - 1] += " " + line;
      continue;
    }

    closeList();
    blocks.push(...paragraphs(line));
  }
  closeList();
  return mergeShortParagraphsIntoLists(blocks);
}

function splitInlineBullets(line) {
  // "Skills: • SQL • Python • Tableau" → ["Skills:", "• SQL", "• Python", "• Tableau"]
  if (!INLINE_BULLET.test(line)) return [line];
  const [first, ...rest] = line.split(INLINE_BULLET);
  return [first, ...rest.map((p) => `• ${p}`)].filter(Boolean);
}

function isHeadingText(text) {
  const t = text.trim();
  return t.length <= 60 && t.split(/\s+/).length <= 8 && !/[.!?,;]$/.test(t);
}

function isHeadingLine(line, next) {
  const t = line.trim();
  if (t.length > 70 || t.split(/\s+/).length > 9) return false;
  if (/[.!?,;]$/.test(t)) return false;
  if (/:$/.test(t) || SECTION_LINE.test(t)) return true;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 4 && letters === letters.toUpperCase()) return true; // ALL CAPS
  // Title-like short line followed by a bullet or a longer paragraph.
  return Boolean(next) && (BULLET.test(next) || next.length > t.length * 2) && /^[A-Z]/.test(t) && t.split(/\s+/).length <= 6;
}

// Very long single paragraphs become several shorter ones (about 3 sentences each).
function paragraphs(text) {
  if (text.length < 700) return [{ type: "paragraph", text }];
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  const out = [];
  for (let i = 0; i < sentences.length; i += 3) {
    out.push({ type: "paragraph", text: sentences.slice(i, i + 3).join("").trim() });
  }
  return out;
}

// Runs of 3+ short, sentence-less lines directly after a heading read better as a list.
function mergeShortParagraphsIntoLists(blocks) {
  const listLike = (b) => b?.type === "paragraph" && b.text.length < 120 && !/[.!?]$/.test(b.text);
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const prev = out[out.length - 1];
    if (prev?.type === "heading" && listLike(b)) {
      let j = i;
      while (j < blocks.length && listLike(blocks[j])) j++;
      if (j - i >= 3) {
        out.push({ type: "list", items: blocks.slice(i, j).map((p) => p.text) });
        i = j - 1;
        continue;
      }
    }
    out.push(b);
  }
  return out;
}
