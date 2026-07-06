#!/usr/bin/env python3
"""Render a marketing audit JSON file into a client-ready PDF report.

Usage: python3 generate_report.py <report-data.json> <output.pdf>
Requires: reportlab (pip install reportlab)
"""

import json
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

INK = colors.HexColor("#1a2233")
MUTED = colors.HexColor("#5a6478")
ACCENT = colors.HexColor("#2f6fed")
LIGHT = colors.HexColor("#eef2fb")
BORDER = colors.HexColor("#d7dce8")

SEVERITY_COLORS = {
    "critical": colors.HexColor("#c0392b"),
    "high": colors.HexColor("#e67e22"),
    "medium": colors.HexColor("#d4a017"),
    "low": colors.HexColor("#3d8b5f"),
}

def score_color(score):
    if score >= 80:
        return colors.HexColor("#3d8b5f")
    if score >= 65:
        return colors.HexColor("#d4a017")
    if score >= 50:
        return colors.HexColor("#e67e22")
    return colors.HexColor("#c0392b")


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold",
                                fontSize=24, textColor=INK, spaceAfter=2, alignment=TA_CENTER),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontSize=11,
                                   textColor=MUTED, alignment=TA_CENTER, spaceAfter=14),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold",
                             fontSize=14, textColor=INK, spaceBefore=18, spaceAfter=8),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName="Helvetica-Bold",
                             fontSize=11, textColor=ACCENT, spaceBefore=10, spaceAfter=4),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=10, leading=14,
                               textColor=INK),
        "muted": ParagraphStyle("muted", parent=base["Normal"], fontSize=9, leading=13,
                                textColor=MUTED),
        "score_big": ParagraphStyle("score_big", parent=base["Normal"], fontName="Helvetica-Bold",
                                    fontSize=40, leading=44, alignment=TA_CENTER,
                                    textColor=colors.white),
        "score_label": ParagraphStyle("score_label", parent=base["Normal"], fontSize=10,
                                      leading=13, alignment=TA_CENTER, textColor=colors.white),
        "chip": ParagraphStyle("chip", parent=base["Normal"], fontName="Helvetica-Bold",
                               fontSize=8, textColor=colors.white, alignment=TA_CENTER),
    }
    return styles


def score_bar(score, width=2.6 * inch, height=9):
    """A horizontal score bar rendered as a two-cell table."""
    score = max(0, min(100, int(score)))
    filled = max(0.01, width * score / 100.0)
    empty = max(0.01, width - filled)
    bar = Table([["", ""]], colWidths=[filled, empty], rowHeights=[height])
    bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), score_color(score)),
        ("BACKGROUND", (1, 0), (1, 0), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    return bar


def severity_chip(severity, styles):
    color = SEVERITY_COLORS.get(severity.lower(), MUTED)
    chip = Table([[Paragraph(severity.upper(), styles["chip"])]],
                 colWidths=[0.75 * inch], rowHeights=[14])
    chip.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    return chip


def build_story(data, styles):
    story = []

    # Header
    story.append(Paragraph("Marketing Audit Report", styles["title"]))
    story.append(Paragraph(
        f"{data.get('business_name', '')} &nbsp;•&nbsp; {data.get('website', '')} "
        f"&nbsp;•&nbsp; {data.get('date', '')}", styles["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=14))

    # Overall score block
    score = int(data.get("overall_score", 0))
    grade = data.get("grade", "")
    score_cell = [
        Paragraph(str(score), styles["score_big"]),
        Spacer(1, 4),
        Paragraph(f"out of 100 &nbsp;|&nbsp; Grade: {grade}", styles["score_label"]),
    ]
    summary_cell = [
        Paragraph("<b>Executive Summary</b>", styles["body"]),
        Spacer(1, 4),
        Paragraph(data.get("executive_summary", ""), styles["body"]),
    ]
    block = Table([[score_cell, summary_cell]], colWidths=[1.9 * inch, 5.0 * inch])
    block.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), score_color(score)),
        ("BACKGROUND", (1, 0), (1, 0), LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    story.append(block)

    # Score breakdown
    breakdown = data.get("score_breakdown", [])
    if breakdown:
        story.append(Paragraph("Score Breakdown", styles["h2"]))
        rows = []
        for item in breakdown:
            cat_score = int(item.get("score", 0))
            rows.append([
                Paragraph(f"<b>{item.get('category', '')}</b>", styles["body"]),
                score_bar(cat_score),
                Paragraph(f"<b>{cat_score}</b>", styles["body"]),
                Paragraph(item.get("note", ""), styles["muted"]),
            ])
        table = Table(rows, colWidths=[1.7 * inch, 2.7 * inch, 0.45 * inch, 2.05 * inch])
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f7f9fd")]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
        ]))
        story.append(table)

    # Key findings
    findings = data.get("key_findings", [])
    if findings:
        story.append(Paragraph("Key Findings", styles["h2"]))
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        findings = sorted(findings, key=lambda f: order.get(str(f.get("severity", "low")).lower(), 4))
        rows = []
        for f in findings:
            rows.append([
                severity_chip(str(f.get("severity", "low")), styles),
                [Paragraph(f"<b>{f.get('title', '')}</b>", styles["body"]),
                 Spacer(1, 2),
                 Paragraph(f.get("detail", ""), styles["muted"])],
            ])
        table = Table(rows, colWidths=[0.95 * inch, 5.95 * inch])
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
        ]))
        story.append(table)

    # Action plan
    plan = data.get("action_plan", {})
    if plan:
        story.append(Paragraph("Prioritized Action Plan", styles["h2"]))
        sections = [
            ("Quick Wins — This Week", plan.get("quick_wins", [])),
            ("Medium-Term — 1 to 3 Months", plan.get("medium_term", [])),
            ("Strategic — 3 to 6 Months", plan.get("strategic", [])),
        ]
        for label, items in sections:
            if not items:
                continue
            story.append(Paragraph(label, styles["h3"]))
            for i, item in enumerate(items, 1):
                story.append(Paragraph(f"{i}. {item}", styles["body"]))
                story.append(Spacer(1, 3))

    # Competitive landscape
    competitors = data.get("competitors", [])
    if competitors:
        story.append(Paragraph("Competitive Landscape", styles["h2"]))
        header = [Paragraph(f"<b>{h}</b>", styles["body"])
                  for h in ["Competitor", "Tier", "Strengths", "Pricing", "Social Proof"]]
        rows = [header]
        for c in competitors:
            name = c.get("name", "")
            site = c.get("website", "")
            name_html = f"<b>{name}</b><br/><font size=8 color='#5a6478'>{site}</font>"
            rows.append([
                Paragraph(name_html, styles["body"]),
                Paragraph(c.get("tier", ""), styles["muted"]),
                Paragraph(c.get("strengths", ""), styles["muted"]),
                Paragraph(c.get("pricing", ""), styles["muted"]),
                Paragraph(c.get("social_proof", ""), styles["muted"]),
            ])
        table = Table(rows, colWidths=[1.5 * inch, 0.9 * inch, 1.75 * inch, 1.15 * inch, 1.6 * inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ]))
        story.append(table)

    # Methodology
    methodology = data.get("methodology", "")
    if methodology:
        story.append(Paragraph("Methodology", styles["h2"]))
        story.append(Paragraph(methodology, styles["muted"]))

    return story


def main():
    if len(sys.argv) != 3:
        sys.exit("Usage: generate_report.py <report-data.json> <output.pdf>")
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)

    doc = SimpleDocTemplate(
        sys.argv[2], pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
        title=f"Marketing Audit — {data.get('business_name', '')}",
    )
    doc.build(build_story(data, build_styles()))
    print(f"PDF report generated successfully: {sys.argv[2]}")


if __name__ == "__main__":
    main()
