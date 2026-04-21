from __future__ import annotations

import json
import shutil
import subprocess
import os
from datetime import datetime
from pathlib import Path
from typing import List

import streamlit as st
from dotenv import load_dotenv

from resume_builder import ResumeTailor, TailorRequest, render_resume_latex


load_dotenv()

OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)


def build_contact_lines(email: str, phone: str, location: str, links: str) -> List[str]:
    lines = [value.strip() for value in [email, phone, location] if value.strip()]
    if links.strip():
        extra_links = [item.strip() for item in links.splitlines() if item.strip()]
        lines.extend(extra_links)
    return lines


def slugify(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "-" for char in value.strip())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "resume"


def try_compile_pdf(tex_path: Path) -> tuple[bool, str]:
    pdflatex = shutil.which("pdflatex")
    if not pdflatex:
        return False, "pdflatex is not installed, so the app generated only the .tex file."

    process = subprocess.run(
        [pdflatex, "-interaction=nonstopmode", tex_path.name],
        cwd=tex_path.parent,
        capture_output=True,
        text=True,
        check=False,
    )
    if process.returncode != 0:
        return False, process.stderr or process.stdout
    return True, str(tex_path.with_suffix(".pdf"))


st.set_page_config(page_title="AI Resume Builder", layout="wide")

st.title("AI Resume Builder (LaTeX Based)")
st.caption(
    "Paste your real resume, list only your actual skills, and the app will tailor a targeted LaTeX resume "
    "to the job description without inventing experience."
)

with st.sidebar:
    st.header("Model Settings")
    api_key = st.text_input("OpenAI API Key", type="password", help="Stored only in memory for this session.")
    model = st.text_input("Model", value=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"))
    compile_pdf = st.checkbox("Try compiling PDF if LaTeX is installed locally", value=False)

with st.form("resume_form"):
    col1, col2 = st.columns(2)

    with col1:
        candidate_name = st.text_input("Full Name")
        email = st.text_input("Email")
        phone = st.text_input("Phone")
        location = st.text_input("Location")
        links = st.text_area("Links (LinkedIn, GitHub, Portfolio - one per line)", height=100)

    with col2:
        real_skills = st.text_area(
            "Real Skills",
            height=180,
            placeholder="Python, FastAPI, SQL, Docker, AWS, React...",
            help="Only include skills you truly have. The generator will not add anything outside this list or your resume.",
        )

    base_resume = st.text_area(
        "Base Resume",
        height=320,
        placeholder="Paste your current resume here in plain text or markdown.",
    )
    job_description = st.text_area(
        "Job Description",
        height=320,
        placeholder="Paste the target JD here.",
    )

    submitted = st.form_submit_button("Generate Tailored Resume", type="primary")

if submitted:
    if not base_resume.strip() or not job_description.strip() or not real_skills.strip():
        st.error("Base resume, real skills, and job description are required.")
    else:
        try:
            tailor = ResumeTailor(api_key=api_key or None, model=model.strip() or None)
            request = TailorRequest(
                candidate_name=candidate_name.strip(),
                email=email.strip(),
                phone=phone.strip(),
                links=links.strip(),
                location=location.strip(),
                base_resume=base_resume.strip(),
                real_skills=real_skills.strip(),
                job_description=job_description.strip(),
            )
            result = tailor.generate(request)
            result.name = result.name or candidate_name.strip() or "Candidate Name"

            if not result.contact_lines:
                result.contact_lines = build_contact_lines(email, phone, location, links)

            latex_source = render_resume_latex(result)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_prefix = f"{slugify(result.name or candidate_name or 'resume')}_{timestamp}"
            tex_path = OUTPUT_DIR / f"{file_prefix}.tex"
            json_path = OUTPUT_DIR / f"{file_prefix}.json"
            tex_path.write_text(latex_source, encoding="utf-8")
            json_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")

            st.success("Tailored resume generated.")
            metric_col1, metric_col2 = st.columns(2)
            metric_col1.metric("Estimated Fit", f"{result.fit_score_estimate}%")
            metric_col2.caption(result.fit_reasoning or "The model estimated your fit based on skill overlap and role alignment.")

            if result.honesty_notes:
                st.warning("\n".join(result.honesty_notes))

            tab1, tab2, tab3 = st.tabs(["Preview", "LaTeX", "Structured JSON"])

            with tab1:
                st.subheader(result.name)
                if result.headline:
                    st.write(result.headline)

                st.markdown("**Matched Skills**")
                st.write(", ".join(result.matched_skills) if result.matched_skills else "None identified")

                st.markdown("**Supporting Skills**")
                st.write(", ".join(result.supporting_skills) if result.supporting_skills else "None identified")

                st.markdown("**Summary**")
                for bullet in result.summary:
                    st.write(f"- {bullet}")

                if result.experience:
                    st.markdown("**Experience**")
                    for item in result.experience:
                        st.write(f"{item.title} | {item.company}")
                        for bullet in item.bullets:
                            st.write(f"- {bullet}")

                if result.projects:
                    st.markdown("**Projects**")
                    for project in result.projects:
                        st.write(project.name)
                        for bullet in project.bullets:
                            st.write(f"- {bullet}")

            with tab2:
                st.code(latex_source, language="latex")
                st.download_button("Download .tex", latex_source, file_name=tex_path.name, mime="application/x-tex")

            with tab3:
                pretty_json = json.dumps(result.model_dump(), indent=2)
                st.code(pretty_json, language="json")
                st.download_button("Download JSON", pretty_json, file_name=json_path.name, mime="application/json")

            st.info(f"Saved files to {tex_path.resolve()} and {json_path.resolve()}")

            if compile_pdf:
                success, payload = try_compile_pdf(tex_path)
                if success:
                    pdf_path = Path(payload)
                    st.success(f"Compiled PDF at {pdf_path.resolve()}")
                    st.download_button(
                        "Download PDF",
                        pdf_path.read_bytes(),
                        file_name=pdf_path.name,
                        mime="application/pdf",
                    )
                else:
                    st.warning(payload)

        except Exception as exc:
            st.exception(exc)
