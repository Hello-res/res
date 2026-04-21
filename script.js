const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const generateButton = document.getElementById("generateButton");
const downloadButton = document.getElementById("downloadButton");
const copyButton = document.getElementById("copyButton");
const copyPromptButton = document.getElementById("copyPromptButton");
const usePastedJsonButton = document.getElementById("usePastedJsonButton");
const latexOutput = document.getElementById("latexOutput");
const statusBox = document.getElementById("status");
const fitScore = document.getElementById("fitScore");
const fitReason = document.getElementById("fitReason");
const honestyNotes = document.getElementById("honestyNotes");
const manualJsonInput = document.getElementById("manualJson");

const fields = {
  candidateName: document.getElementById("candidateName"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  location: document.getElementById("location"),
  links: document.getElementById("links"),
  realSkills: document.getElementById("realSkills"),
  baseResume: document.getElementById("baseResume"),
  targetRole: document.getElementById("targetRole"),
  jobDescription: document.getElementById("jobDescription"),
  extraDetails: document.getElementById("extraDetails")
};

let currentLatex = "";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    contact_lines: {
      type: "array",
      items: { type: "string" }
    },
    headline: { type: "string" },
    summary: {
      type: "array",
      items: { type: "string" }
    },
    matched_skills: {
      type: "array",
      items: { type: "string" }
    },
    supporting_skills: {
      type: "array",
      items: { type: "string" }
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          dates: { type: "string" },
          location: { type: "string" },
          bullets: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["company", "title", "dates", "location", "bullets"]
      }
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          subtitle: { type: "string" },
          bullets: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["name", "subtitle", "bullets"]
      }
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          dates: { type: "string" },
          location: { type: "string" },
          highlights: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["institution", "degree", "dates", "location", "highlights"]
      }
    },
    certifications: {
      type: "array",
      items: { type: "string" }
    },
    fit_score_estimate: { type: "integer" },
    fit_reasoning: { type: "string" },
    honesty_notes: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "name",
    "contact_lines",
    "headline",
    "summary",
    "matched_skills",
    "supporting_skills",
    "experience",
    "projects",
    "education",
    "certifications",
    "fit_score_estimate",
    "fit_reasoning",
    "honesty_notes"
  ]
};

const storageKeys = {
  model: "resume-builder-model",
  candidateName: "resume-builder-candidateName",
  email: "resume-builder-email",
  phone: "resume-builder-phone",
  location: "resume-builder-location",
  links: "resume-builder-links",
  realSkills: "resume-builder-realSkills",
  baseResume: "resume-builder-baseResume",
  targetRole: "resume-builder-targetRole",
  jobDescription: "resume-builder-jobDescription",
  extraDetails: "resume-builder-extraDetails"
};

function escapeLatex(value) {
  const source = String(value ?? "");
  const replacements = {
    "\\": "\\textbackslash{}",
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}"
  };
  return Array.from(source, (character) => replacements[character] || character).join("");
}

function escapeHtml(value) {
  const source = String(value ?? "");
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return Array.from(source, (character) => replacements[character] || character).join("");
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.top = "-1000px";
  helper.style.left = "-1000px";
  document.body.appendChild(helper);
  helper.focus();
  helper.select();

  const successful = document.execCommand("copy");
  document.body.removeChild(helper);

  if (!successful) {
    throw new Error("Copy command was blocked by the browser.");
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function toObjectArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildContactLines(data) {
  const lines = [];
  [data.email, data.phone, data.location].forEach((item) => {
    if (item && item.trim()) {
      lines.push(item.trim());
    }
  });

  if (data.links) {
    data.links
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => lines.push(item));
  }

  return lines;
}

function normalizeResume(result, formData) {
  return {
    name: (result.name || formData.candidateName || "Candidate Name").trim(),
    contact_lines: safeArray(result.contact_lines).length ? safeArray(result.contact_lines) : buildContactLines(formData),
    headline: String(result.headline || "").trim(),
    summary: safeArray(result.summary),
    matched_skills: safeArray(result.matched_skills),
    supporting_skills: safeArray(result.supporting_skills),
    experience: toObjectArray(result.experience).map((item) => ({
      company: String(item.company || "").trim(),
      title: String(item.title || "").trim(),
      dates: String(item.dates || "").trim(),
      location: String(item.location || "").trim(),
      bullets: safeArray(item.bullets)
    })),
    projects: toObjectArray(result.projects).map((item) => ({
      name: String(item.name || "").trim(),
      subtitle: String(item.subtitle || "").trim(),
      bullets: safeArray(item.bullets)
    })),
    education: toObjectArray(result.education).map((item) => ({
      institution: String(item.institution || "").trim(),
      degree: String(item.degree || "").trim(),
      dates: String(item.dates || "").trim(),
      location: String(item.location || "").trim(),
      highlights: safeArray(item.highlights)
    })),
    certifications: safeArray(result.certifications),
    fit_score_estimate: Math.max(0, Math.min(100, Number.parseInt(result.fit_score_estimate, 10) || 0)),
    fit_reasoning: String(result.fit_reasoning || "").trim(),
    honesty_notes: safeArray(result.honesty_notes)
  };
}

function renderBullets(items) {
  if (!items.length) {
    return "";
  }

  const lines = ["\\begin{itemize}"];
  items.forEach((item) => lines.push(`  \\item ${escapeLatex(item)}`));
  lines.push("\\end{itemize}");
  return lines.join("\n");
}

function renderLatex(resume) {
  const lines = [
    "\\documentclass[10pt]{article}",
    "\\usepackage[margin=0.55in]{geometry}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{enumitem}",
    "\\usepackage{titlesec}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage{lmodern}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{4pt}",
    "\\pagenumbering{gobble}",
    "\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]",
    "\\setlist[itemize]{leftmargin=1.2em, topsep=2pt, itemsep=1pt}",
    "",
    "\\begin{document}",
    "",
    `{\\LARGE \\textbf{${escapeLatex(resume.name)}}}\\\\`
  ];

  if (resume.contact_lines.length) {
    lines.push(resume.contact_lines.map((item) => escapeLatex(item)).join(" \\quad | \\quad "));
  }

  if (resume.headline) {
    lines.push("", `{\large ${escapeLatex(resume.headline)}}`);
  }

  if (resume.summary.length) {
    lines.push("", "\\section*{Professional Summary}", renderBullets(resume.summary));
  }

  if (resume.matched_skills.length || resume.supporting_skills.length) {
    lines.push("", "\\section*{Skills}");
    if (resume.matched_skills.length) {
      lines.push(`\\textbf{Matched Skills:} ${resume.matched_skills.map((item) => escapeLatex(item)).join(", ")}\\\\`);
    }
    if (resume.supporting_skills.length) {
      lines.push(`\\textbf{Supporting Skills:} ${resume.supporting_skills.map((item) => escapeLatex(item)).join(", ")}`);
    }
  }

  if (resume.experience.length) {
    lines.push("", "\\section*{Experience}");
    resume.experience.forEach((item) => {
      lines.push(`\\textbf{${escapeLatex(item.title)}}${item.company ? ` \\hfill ${escapeLatex(item.company)}` : ""}\\\\`);
      if (item.location || item.dates) {
        const locationPart = item.location ? escapeLatex(item.location) : "";
        const datesPart = item.dates ? escapeLatex(item.dates) : "";
        lines.push(`${locationPart}${locationPart && datesPart ? " \\hfill " : ""}${datesPart}\\\\`);
      }
      if (item.bullets.length) {
        lines.push(renderBullets(item.bullets));
      }
    });
  }

  if (resume.projects.length) {
    lines.push("", "\\section*{Projects}");
    resume.projects.forEach((item) => {
      lines.push(`\\textbf{${escapeLatex(item.name)}}${item.subtitle ? ` -- ${escapeLatex(item.subtitle)}` : ""}\\\\`);
      if (item.bullets.length) {
        lines.push(renderBullets(item.bullets));
      }
    });
  }

  if (resume.education.length) {
    lines.push("", "\\section*{Education}");
    resume.education.forEach((item) => {
      lines.push(`\\textbf{${escapeLatex(item.degree)}}${item.institution ? ` \\hfill ${escapeLatex(item.institution)}` : ""}\\\\`);
      if (item.location || item.dates) {
        const locationPart = item.location ? escapeLatex(item.location) : "";
        const datesPart = item.dates ? escapeLatex(item.dates) : "";
        lines.push(`${locationPart}${locationPart && datesPart ? " \\hfill " : ""}${datesPart}\\\\`);
      }
      if (item.highlights.length) {
        lines.push(renderBullets(item.highlights));
      }
    });
  }

  if (resume.certifications.length) {
    lines.push("", "\\section*{Certifications}", renderBullets(resume.certifications));
  }

  lines.push("", "\\end{document}");
  return lines.join("\n");
}

function slugify(value) {
  return (value || "resume")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "resume";
}

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.color = isError ? "#9a2f22" : "";
}

function updateNotes(notes) {
  if (!notes.length) {
    honestyNotes.classList.add("hidden");
    honestyNotes.innerHTML = "";
    return;
  }

  honestyNotes.classList.remove("hidden");
  honestyNotes.innerHTML = `<strong>Honesty notes:</strong><br>${notes.map((item) => `&bull; ${escapeHtml(item)}`).join("<br>")}`;
}

function getFormData() {
  return Object.fromEntries(
    Object.entries(fields).map(([key, element]) => [key, element.value.trim()])
  );
}

function buildManualPrompt(formData) {
  return [
    "Create a tailored resume in strict JSON only.",
    "Do not add markdown fences.",
    "Do not invent skills, employers, titles, dates, education, certifications, projects, or metrics.",
    "Use only what appears in the base resume, explicit personal details, or the explicit real skills list.",
    "If the candidate lacks a required skill, include that gap in honesty_notes.",
    "",
    "Return JSON with this shape:",
    JSON.stringify(
      {
        name: "string",
        contact_lines: ["string"],
        headline: "string",
        summary: ["string"],
        matched_skills: ["string"],
        supporting_skills: ["string"],
        experience: [
          {
            company: "string",
            title: "string",
            dates: "string",
            location: "string",
            bullets: ["string"]
          }
        ],
        projects: [
          {
            name: "string",
            subtitle: "string",
            bullets: ["string"]
          }
        ],
        education: [
          {
            institution: "string",
            degree: "string",
            dates: "string",
            location: "string",
            highlights: ["string"]
          }
        ],
        certifications: ["string"],
        fit_score_estimate: 0,
        fit_reasoning: "string",
        honesty_notes: ["string"]
      },
      null,
      2
    ),
    "",
    "PERSONAL DETAILS",
    `name: ${formData.candidateName}`,
    `email: ${formData.email}`,
    `phone: ${formData.phone}`,
    `location: ${formData.location}`,
    `links: ${formData.links}`,
    "",
    "REAL SKILLS",
    formData.realSkills,
    "",
    "BASE RESUME",
    formData.baseResume,
    "",
    "TARGET ROLE",
    formData.targetRole,
    "",
    "JOB DESCRIPTION",
    formData.jobDescription,
    "",
    "EXTRA DETAILS",
    formData.extraDetails
  ].join("\n");
}

function saveFormData() {
  localStorage.setItem(storageKeys.model, modelInput.value.trim());
  Object.entries(fields).forEach(([key, element]) => {
    localStorage.setItem(storageKeys[key], element.value);
  });
}

function restoreFormData() {
  modelInput.value = localStorage.getItem(storageKeys.model) || modelInput.value;
  Object.entries(fields).forEach(([key, element]) => {
    const saved = localStorage.getItem(storageKeys[key]);
    if (saved !== null) {
      element.value = saved;
    }
  });
}

async function generateResume() {
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || "gpt-4.1-mini";
  const formData = getFormData();

  if (!apiKey) {
    setStatus("Enter your OpenAI API key first.", true);
    return;
  }

  if (!formData.realSkills || !formData.baseResume || !formData.jobDescription) {
    setStatus("Real skills, base resume, and job description are required.", true);
    return;
  }

  saveFormData();
  generateButton.disabled = true;
  downloadButton.disabled = true;
  copyButton.disabled = true;
  setStatus("Generating a tailored resume...");
  fitScore.textContent = "Fit: --";
  fitReason.textContent = "Analyzing your inputs.";
  updateNotes([]);

  const systemPrompt = [
    "You are an expert resume writer and ATS optimizer.",
    "Return valid JSON only.",
    "Never invent skills, employers, titles, dates, education, certifications, projects, or metrics.",
    "Use only what appears in the base resume, explicit personal details, or the explicit real skills list.",
    "You may reorder, tighten, and rephrase to fit the JD truthfully.",
    "Aim for a strong but honest resume, usually around 70-90% fit when the candidate genuinely overlaps.",
    "If the candidate lacks a required skill, do not fake it. Put the gap in honesty_notes."
  ].join(" ");

  const userPrompt = [
    "Build a truthful, tailored resume for this job.",
    "",
    "PERSONAL DETAILS",
    `name: ${formData.candidateName}`,
    `email: ${formData.email}`,
    `phone: ${formData.phone}`,
    `location: ${formData.location}`,
    `links: ${formData.links}`,
    "",
    "REAL SKILLS",
    formData.realSkills,
    "",
    "BASE RESUME",
    formData.baseResume,
    "",
    "TARGET ROLE",
    formData.targetRole,
    "",
    "JOB DESCRIPTION",
    formData.jobDescription,
    "",
    "EXTRA DETAILS",
    formData.extraDetails,
    "",
    "Additional instructions:",
    "- Summary should be 2 to 4 bullets.",
    "- Matched skills should reflect the strongest overlap with the JD.",
    "- Supporting skills can be adjacent but must remain truthful.",
    "- Keep experience bullets concise and ATS friendly.",
    "- Fit score must be realistic."
  ].join("\n");

  try {
    const response = await requestResume(apiKey, model, systemPrompt, userPrompt, true);

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const errorMessage = errorPayload?.error?.message || `Request failed with status ${response.status}.`;
      const looksLikeSchemaIssue =
        response.status === 400 &&
        /json_schema|structured outputs|response_format|schema/i.test(errorMessage);

      if (!looksLikeSchemaIssue) {
        throw new Error(errorMessage);
      }

      setStatus("Structured output was rejected by this model. Retrying with JSON mode...");

      const fallbackResponse = await requestResume(apiKey, model, systemPrompt, userPrompt, false);
      if (!fallbackResponse.ok) {
        const fallbackPayload = await fallbackResponse.json().catch(() => ({}));
        const fallbackMessage = fallbackPayload?.error?.message || `Request failed with status ${fallbackResponse.status}.`;
        throw new Error(fallbackMessage);
      }

      const fallbackPayload = await fallbackResponse.json();
      return handleSuccessfulPayload(fallbackPayload, formData);
    }

    const payload = await response.json();
    handleSuccessfulPayload(payload, formData);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Something went wrong while generating the resume.", true);
    fitReason.textContent = "Generation failed.";
  } finally {
    generateButton.disabled = false;
  }
}

async function requestResume(apiKey, model, systemPrompt, userPrompt, useSchema) {
  const body = {
    model,
    temperature: 0.35,
    messages: [
      { role: "developer", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };

  if (useSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "tailored_resume",
        strict: true,
        schema
      }
    };
  } else {
    body.response_format = { type: "json_object" };
  }

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
}

function handleSuccessfulPayload(payload, formData) {
  const message = payload?.choices?.[0]?.message;

  if (message?.refusal) {
    throw new Error(message.refusal);
  }

  const rawContent = message?.content;
  let jsonText = "";

  if (typeof rawContent === "string") {
    jsonText = rawContent;
  } else if (Array.isArray(rawContent)) {
    jsonText = rawContent
      .map((part) => part?.text || "")
      .join("")
      .trim();
  }

  if (!jsonText) {
    throw new Error("The model returned an empty response.");
  }

  const parsed = JSON.parse(jsonText);
  const normalized = normalizeResume(parsed, formData);
  currentLatex = renderLatex(normalized);

  latexOutput.textContent = currentLatex;
  fitScore.textContent = `Fit: ${normalized.fit_score_estimate}%`;
  fitReason.textContent = normalized.fit_reasoning || "Generated successfully.";
  updateNotes(normalized.honesty_notes);
  downloadButton.disabled = false;
  copyButton.disabled = false;
  setStatus("Resume generated. You can download the .tex file or copy the LaTeX below.");
}

function applyManualJson() {
  const formData = getFormData();
  const rawJson = manualJsonInput.value.trim();

  if (!rawJson) {
    setStatus("Paste the JSON output from ChatGPT first.", true);
    return;
  }

  try {
    const parsed = JSON.parse(rawJson);
    const normalized = normalizeResume(parsed, formData);
    currentLatex = renderLatex(normalized);
    latexOutput.textContent = currentLatex;
    fitScore.textContent = `Fit: ${normalized.fit_score_estimate}%`;
    fitReason.textContent = normalized.fit_reasoning || "Loaded from pasted JSON.";
    updateNotes(normalized.honesty_notes);
    downloadButton.disabled = false;
    copyButton.disabled = false;
    setStatus("Pasted JSON accepted. LaTeX is ready below.");
  } catch (error) {
    console.error(error);
    setStatus("The pasted content is not valid JSON in the expected format.", true);
  }
}

async function copyManualPrompt() {
  const formData = getFormData();

  if (!formData.realSkills || !formData.baseResume || !formData.jobDescription) {
    setStatus("Fill in real skills, base resume, and job description before copying the prompt.", true);
    return;
  }

  try {
    await copyText(buildManualPrompt(formData));
    setStatus("Prompt copied. Paste it into ChatGPT, then paste the JSON response back here.");
  } catch (error) {
    console.error(error);
    setStatus("Could not copy automatically. Try serving the site with http://localhost:8000 instead of opening the file directly.", true);
  }
}

function downloadLatex() {
  if (!currentLatex) {
    return;
  }

  const name = fields.candidateName.value.trim() || "resume";
  const blob = new Blob([currentLatex], { type: "application/x-tex;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(name)}-tailored-resume.tex`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copyLatex() {
  if (!currentLatex) {
    return;
  }

  try {
    await copyText(currentLatex);
    setStatus("LaTeX copied to clipboard.");
  } catch (error) {
    console.error(error);
    setStatus("Could not copy automatically. Try serving the site with http://localhost:8000 instead of opening the file directly.", true);
  }
}

restoreFormData();

generateButton.addEventListener("click", generateResume);
downloadButton.addEventListener("click", downloadLatex);
copyButton.addEventListener("click", copyLatex);
copyPromptButton.addEventListener("click", copyManualPrompt);
usePastedJsonButton.addEventListener("click", applyManualJson);

Object.values(fields).forEach((element) => {
  element.addEventListener("input", saveFormData);
});

modelInput.addEventListener("input", saveFormData);
