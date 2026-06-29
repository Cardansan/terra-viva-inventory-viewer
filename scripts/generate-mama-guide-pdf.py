from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "docs" / "GUIA_MAMA_INTERFAZ.pdf"


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="GuideTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#24342f"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="GuideSubtitle",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#7a533a"),
            spaceAfter=14,
        )
    )
    styles.add(
        ParagraphStyle(
            name="GuideHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#b96f48"),
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="GuideBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#24342f"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="GuideSmall",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#4c5a56"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="GuideCallout",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#24342f"),
            spaceAfter=0,
        )
    )
    return styles


def bullet_list(items, style):
    return ListFlowable(
        [
            ListItem(Paragraph(item, style), leftIndent=10)
            for item in items
        ],
        bulletType="bullet",
        start="circle",
        leftIndent=18,
        bulletFontName="Helvetica",
        bulletFontSize=10,
    )


def step_table(step_number, title, body_lines):
    title_html = (
        f"<font color='#ffffff'><b>Paso {step_number}</b></font>"
        f"<br/><font color='#24342f'><b>{title}</b></font>"
    )
    body_html = "<br/>".join(body_lines)
    table = Table(
        [
            [
                Paragraph(title_html, build_styles()["GuideBody"]),
                Paragraph(body_html, build_styles()["GuideBody"]),
            ]
        ],
        colWidths=[1.35 * inch, 5.55 * inch],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#b96f48")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#f8f3e8")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#decab8")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#decab8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def build_story():
    styles = build_styles()
    story = []

    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("Terra Viva", styles["GuideSubtitle"]))
    story.append(Paragraph("Guia sencilla para usar la interfaz", styles["GuideTitle"]))
    story.append(
        Paragraph(
            "Pensada para usarla desde el celular, sin palabras tecnicas.",
            styles["GuideSubtitle"],
        )
    )

    callout = Table(
        [
            [
                Paragraph(
                    "Orden de siempre:<br/><b>Subir videos -> Crear borrador -> Revisar -> Publicar</b>",
                    styles["GuideCallout"],
                )
            ]
        ],
        colWidths=[6.9 * inch],
    )
    callout.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eef6ef")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#9fb7a3")),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(callout)
    story.append(Spacer(1, 0.18 * inch))

    story.append(Paragraph("Antes de empezar", styles["GuideHeading"]))
    story.append(
        bullet_list(
            [
                "La laptop debe estar prendida.",
                "La laptop debe tener internet.",
                "La laptop no debe quedarse dormida.",
                "En el celular, abre tu marcador de <b>Edicion de catalogo</b>.",
            ],
            styles["GuideBody"],
        )
    )
    story.append(Spacer(1, 0.1 * inch))

    story.append(
        step_table(
            1,
            "Subir los videos del dia",
            [
                "Abre la parte que dice <b>Cargar videos para preparar catalogo</b>.",
                "Toca <b>Seleccionar videos</b>.",
                "Elige los videos del dia.",
                "Toca <b>Subir videos al Inbox</b>.",
            ],
        )
    )
    story.append(Spacer(1, 0.14 * inch))

    story.append(
        step_table(
            2,
            "Crear el borrador nuevo",
            [
                "Busca el bloque <b>Paso 1</b>.",
                "Toca <b>Crear borrador nuevo</b>.",
                "Despues mira la parte que dice <b>Ver ultimo avance</b>.",
                "Cuando salga <b>Terminado</b>, ya puedes revisar.",
            ],
        )
    )
    story.append(Spacer(1, 0.14 * inch))

    story.append(
        step_table(
            3,
            "Revisar las piezas",
            [
                "Ve pieza por pieza en la lista.",
                "Si una pieza si debe salir, dejala como <b>Disponible</b>.",
                "Si una pieza no debe salir, cambiala para que no quede visible.",
                "La idea es dejar solo lo que si quieres mostrar.",
            ],
        )
    )
    story.append(Spacer(1, 0.14 * inch))

    story.append(
        step_table(
            4,
            "Publicar el catalogo",
            [
                "Busca el bloque <b>Paso 2</b>.",
                "Toca <b>Publicar catalogo</b>.",
                "Vuelve a mirar <b>Ver ultimo avance</b>.",
                "Cuando salga <b>Terminado</b>, ya quedo enviado a publicacion.",
            ],
        )
    )
    story.append(Spacer(1, 0.18 * inch))

    story.append(Paragraph("Si sale una ventana de Google", styles["GuideHeading"]))
    story.append(
        bullet_list(
            [
                "Es normal.",
                "Elige la cuenta correcta.",
                "Acepta y vuelve a la pagina.",
            ],
            styles["GuideBody"],
        )
    )

    story.append(Paragraph("Si algo no avanza", styles["GuideHeading"]))
    story.append(
        bullet_list(
            [
                "Toca <b>Actualizar estado</b>.",
                "Espera un poco mas.",
                "Si sigue igual varios minutos, normalmente la laptop no esta trabajando en ese momento.",
            ],
            styles["GuideBody"],
        )
    )

    story.append(Paragraph("Lo importante", styles["GuideHeading"]))
    story.append(
        Paragraph(
            "No hace falta mover configuraciones ni usar palabras tecnicas. Solo recuerda: <b>subir, esperar, revisar y publicar</b>.",
            styles["GuideBody"],
        )
    )

    return story


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="Guia sencilla para usar Terra Viva",
        author="Codex",
    )
    doc.build(build_story())
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
