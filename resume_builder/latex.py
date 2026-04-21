from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .models import TailoredResume


LATEX_SPECIAL_CHARS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def escape_latex(value: str) -> str:
    escaped = value
    for char, replacement in LATEX_SPECIAL_CHARS.items():
        escaped = escaped.replace(char, replacement)
    return escaped


def join_latex(values: list[str]) -> str:
    return ", ".join(escape_latex(value) for value in values if value)


def render_resume_latex(resume: TailoredResume) -> str:
    template_dir = Path(__file__).resolve().parent.parent / "templates"
    env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(enabled_extensions=(), default_for_string=False),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["latex"] = escape_latex
    env.filters["join_latex"] = join_latex
    template = env.get_template("resume.tex.j2")
    return template.render(resume=resume)
