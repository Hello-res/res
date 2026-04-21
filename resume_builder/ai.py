from __future__ import annotations

import json
import os
from dataclasses import dataclass
from textwrap import dedent

from openai import OpenAI

from .models import TailoredResume


@dataclass
class TailorRequest:
    candidate_name: str
    email: str
    phone: str
    links: str
    location: str
    base_resume: str
    real_skills: str
    job_description: str


class ResumeTailor:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        resolved_api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not resolved_api_key:
            raise ValueError("Missing OPENAI_API_KEY. Add it to your environment or enter it in the app.")

        self.client = OpenAI(api_key=resolved_api_key)
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    def generate(self, request: TailorRequest) -> TailoredResume:
        system_prompt = dedent(
            """
            You are an expert resume writer and ATS optimizer.

            Your job is to tailor a candidate's resume to a target job description while staying strictly truthful.
            Hard rules:
            - Never invent skills, employers, titles, dates, education, certifications, metrics, or projects.
            - Use ONLY information present in the base resume, explicit personal details, or explicit real_skills list.
            - You may rephrase bullets, reorder emphasis, remove irrelevant items, and align wording to the JD.
            - The result should aim for an estimated 70-90% fit when honestly possible.
            - If the candidate lacks a required skill, do not fake it. Mention the gap in honesty_notes.
            - Prefer concise, ATS-friendly wording and measurable impact only when already supported by the source resume.

            Return a single JSON object with this shape:
            {
              "name": "string",
              "contact_lines": ["string"],
              "headline": "string",
              "summary": ["string"],
              "matched_skills": ["string"],
              "supporting_skills": ["string"],
              "experience": [
                {
                  "company": "string",
                  "title": "string",
                  "dates": "string",
                  "location": "string",
                  "bullets": ["string"]
                }
              ],
              "projects": [
                {
                  "name": "string",
                  "subtitle": "string",
                  "bullets": ["string"]
                }
              ],
              "education": [
                {
                  "institution": "string",
                  "degree": "string",
                  "dates": "string",
                  "location": "string",
                  "highlights": ["string"]
                }
              ],
              "certifications": ["string"],
              "fit_score_estimate": 0,
              "fit_reasoning": "string",
              "honesty_notes": ["string"]
            }

            Keep the JSON valid. Do not wrap it in markdown.
            """
        ).strip()

        user_prompt = dedent(
            f"""
            PERSONAL DETAILS
            name: {request.candidate_name}
            email: {request.email}
            phone: {request.phone}
            location: {request.location}
            links: {request.links}

            REAL SKILLS
            {request.real_skills}

            BASE RESUME
            {request.base_resume}

            TARGET JOB DESCRIPTION
            {request.job_description}

            Additional instructions:
            - Build a strong but honest resume version for this job.
            - Put the most relevant experience first.
            - Matched skills should be the strongest overlap with the JD.
            - Supporting skills can include adjacent but still truthful technologies.
            - Summary should be 2-4 bullets.
            - Keep experience bullets punchy and targeted.
            - Fit score must be a realistic estimate, not marketing fluff.
            """
        ).strip()

        completion = self.client.chat.completions.create(
            model=self.model,
            temperature=0.35,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content = completion.choices[0].message.content
        if not content:
            raise ValueError("The model returned an empty response.")

        payload = json.loads(content)
        return TailoredResume.model_validate(payload)
