from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field, field_validator


class ExperienceEntry(BaseModel):
    company: str
    title: str
    dates: str = ""
    location: str = ""
    bullets: List[str] = Field(default_factory=list)


class ProjectEntry(BaseModel):
    name: str
    subtitle: str = ""
    bullets: List[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    institution: str
    degree: str
    dates: str = ""
    location: str = ""
    highlights: List[str] = Field(default_factory=list)


class TailoredResume(BaseModel):
    name: str
    contact_lines: List[str] = Field(default_factory=list)
    headline: str = ""
    summary: List[str] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    supporting_skills: List[str] = Field(default_factory=list)
    experience: List[ExperienceEntry] = Field(default_factory=list)
    projects: List[ProjectEntry] = Field(default_factory=list)
    education: List[EducationEntry] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    fit_score_estimate: int = 0
    fit_reasoning: str = ""
    honesty_notes: List[str] = Field(default_factory=list)

    @field_validator("fit_score_estimate")
    @classmethod
    def clamp_score(cls, value: int) -> int:
        return max(0, min(100, value))
