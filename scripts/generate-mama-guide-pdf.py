from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "docs" / "GUIA_MAMA_INTERFAZ.pdf"
BASE_URL = "https://cardansan.github.io/terra-viva-inventory-viewer"
EDIT_URL = f"{BASE_URL}/edicion-catalogo/"
DRAFT_URL = f"{BASE_URL}/drafts/current/"
PUBLIC_URL = f"{BASE_URL}/"


class RoundedCard(Flowable):
    def __init__(self, width, height, fill_color, stroke_color, radius=16):
        super().__init__()
        self.width = width
        self.height = height
        self.fill_color = fill_color
        self.stroke_color = stroke_color
        self.radius = radius

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        self.canv.saveState()
        self.canv.setFillColor(self.fill_color)
        self.canv.setStrokeColor(self.stroke_color)
        self.canv.setLineWidth(0.9)
        self.canv.roundRect(
            0, 0, self.width, self.height, self.radius, stroke=1, fill=1
        )
        self.canv.restoreState()


class LinkButton(Flowable):
    def __init__(self, label, url, width=112, height=22):
        super().__init__()
        self.label = label
        self.url = url
        self.width = width
        self.height = height

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        self.canv.saveState()
        self.canv.setFillColor(colors.HexColor("#f2d9c6"))
        self.canv.setStrokeColor(colors.HexColor("#d4b195"))
        self.canv.roundRect(0, 0, self.width, self.height, 10, stroke=1, fill=1)
        self.canv.setFillColor(colors.HexColor("#24342f"))
        self.canv.setFont("Helvetica-Bold", 9.2)
        label_width = stringWidth(self.label, "Helvetica-Bold", 9.2)
        self.canv.drawString((self.width - label_width) / 2, 6.4, self.label)
        self.canv.linkURL(self.url, (0, 0, self.width, self.height), relative=0)
        self.canv.restoreState()


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="MamaGuideTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=23,
            textColor=colors.HexColor("#24342f"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MamaGuideSubtitle",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#8a5b3d"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MamaGuideSection",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=15,
            textColor=colors.HexColor("#b96f48"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MamaGuideBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.4,
            leading=11.4,
            textColor=colors.HexColor("#24342f"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MamaGuideSmall",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=10.8,
            textColor=colors.HexColor("#4f5e58"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MamaGuideStrong",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10.2,
            leading=12.5,
            textColor=colors.HexColor("#24342f"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MamaGuideCardTitle",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10.6,
            leading=12.4,
            textColor=colors.HexColor("#24342f"),
        )
    )
    return styles


def draw_paragraph(canv, text, style, x, y, width, height):
    paragraph = Paragraph(text, style)
    paragraph.wrapOn(canv, width, height)
    paragraph.drawOn(canv, x, y)


def draw_link_card(canv, styles, x, y, width, height, title, body, button_label, url):
    RoundedCard(
        width,
        height,
        colors.HexColor("#fbf6ee"),
        colors.HexColor("#dcc6b0"),
        radius=16,
    ).drawOn(canv, x, y)
    draw_paragraph(canv, title, styles["MamaGuideCardTitle"], x + 12, y + height - 22, width - 24, 14)
    draw_paragraph(canv, body, styles["MamaGuideSmall"], x + 12, y + 30, width - 24, 34)
    button = LinkButton(button_label, url)
    button.canv = canv
    canv.saveState()
    canv.translate(x + 12, y + 8)
    button.draw()
    canv.restoreState()


def draw_step_card(canv, styles, x, y, width, height, number, title, body):
    RoundedCard(
        width,
        height,
        colors.HexColor("#f9f3ea"),
        colors.HexColor("#dcc6b0"),
        radius=16,
    ).drawOn(canv, x, y)
    canv.saveState()
    canv.setFillColor(colors.HexColor("#b96f48"))
    canv.roundRect(x + 10, y + height - 23, 47, 16, 8, stroke=0, fill=1)
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 8.8)
    canv.drawCentredString(x + 33.5, y + height - 18, f"Paso {number}")
    canv.restoreState()
    draw_paragraph(canv, title, styles["MamaGuideCardTitle"], x + 64, y + height - 22, width - 74, 14)
    draw_paragraph(canv, body, styles["MamaGuideSmall"], x + 12, y + 10, width - 24, height - 36)


def paint_layout(canv, doc):
    styles = build_styles()
    page_width, page_height = letter
    left = doc.leftMargin
    right = page_width - doc.rightMargin
    width = right - left

    draw_paragraph(canv, "Terra Viva", styles["MamaGuideSubtitle"], left, page_height - 54, width, 14)
    draw_paragraph(
        canv,
        "Guia sencilla para usar la interfaz",
        styles["MamaGuideTitle"],
        left,
        page_height - 82,
        width,
        26,
    )
    draw_paragraph(
        canv,
        "Todo en un solo lugar, pensado para usarlo desde el celular.",
        styles["MamaGuideSubtitle"],
        left,
        page_height - 101,
        width,
        14,
    )

    callout_y = page_height - 140
    RoundedCard(
        width,
        34,
        colors.HexColor("#eef6ef"),
        colors.HexColor("#a7bfa9"),
        radius=17,
    ).drawOn(canv, left, callout_y)
    draw_paragraph(
        canv,
        "<b>Orden de siempre:</b> Subir videos -> Crear borrador -> Revisar -> Publicar",
        styles["MamaGuideStrong"],
        left + 14,
        callout_y + 9,
        width - 28,
        16,
    )

    draw_paragraph(canv, "Antes de empezar", styles["MamaGuideSection"], left, page_height - 176, 170, 16)
    draw_paragraph(
        canv,
        "El <b>servidor (la laptop de Carlos)</b> debe estar encendido, con internet y sin quedarse dormido.",
        styles["MamaGuideBody"],
        left,
        page_height - 198,
        width,
        24,
    )

    draw_paragraph(canv, "Enlaces utiles", styles["MamaGuideSection"], left, page_height - 245, 150, 16)
    gap = 9
    card_width = (width - gap * 2) / 3
    cards_y = page_height - 338
    card_height = 76
    draw_link_card(
        canv,
        styles,
        left,
        cards_y,
        card_width,
        card_height,
        "Edicion",
        "Subir videos, crear borrador, revisar y publicar.",
        "Abrir edicion",
        EDIT_URL,
    )
    draw_link_card(
        canv,
        styles,
        left + card_width + gap,
        cards_y,
        card_width,
        card_height,
        "Borrador actual",
        "Ver como va quedando la revision antes de publicar.",
        "Ver borrador",
        DRAFT_URL,
    )
    draw_link_card(
        canv,
        styles,
        left + (card_width + gap) * 2,
        cards_y,
        card_width,
        card_height,
        "Catalogo publicado",
        "Ver lo que ya esta visible para las clientas.",
        "Ver catalogo",
        PUBLIC_URL,
    )

    draw_paragraph(canv, "Pasos", styles["MamaGuideSection"], left, page_height - 360, 90, 16)
    step_gap = 11
    step_width = (width - step_gap) / 2
    step_height = 84
    top_row_y = page_height - 450
    bottom_row_y = top_row_y - step_height - 10
    draw_step_card(
        canv,
        styles,
        left,
        top_row_y,
        step_width,
        step_height,
        1,
        "Subir videos",
        "1. Abre Edicion de catalogo.<br/>2. Entra a Cargar videos.<br/>3. Elige los videos del dia.<br/>4. Toca Subir videos al Inbox.",
    )
    draw_step_card(
        canv,
        styles,
        left + step_width + step_gap,
        top_row_y,
        step_width,
        step_height,
        2,
        "Crear borrador",
        "1. Busca Paso 1.<br/>2. Toca Crear borrador nuevo.<br/>3. Mira Ver ultimo avance.<br/>4. Espera a que diga Terminado.",
    )
    draw_step_card(
        canv,
        styles,
        left,
        bottom_row_y,
        step_width,
        step_height,
        3,
        "Revisar piezas",
        "1. Mira pieza por pieza.<br/>2. Si si debe salir, dejala Disponible.<br/>3. Si no debe salir, ocultala.<br/>4. Deja solo lo que quieres mostrar.",
    )
    draw_step_card(
        canv,
        styles,
        left + step_width + step_gap,
        bottom_row_y,
        step_width,
        step_height,
        4,
        "Publicar",
        "1. Busca Paso 2.<br/>2. Toca Publicar catalogo.<br/>3. Mira Ver ultimo avance.<br/>4. Espera a que diga Terminado.",
    )

    draw_paragraph(
        canv,
        "<b>Si sale una ventana de Google:</b> es normal. Elige la cuenta correcta, acepta y vuelve a la pagina.",
        styles["MamaGuideSmall"],
        left,
        138,
        width,
        20,
    )
    draw_paragraph(
        canv,
        "<b>Si algo no avanza:</b> toca <b>Actualizar estado</b>. Si pasan varios minutos sin cambio, normalmente el servidor (la laptop de Carlos) no esta trabajando en ese momento.",
        styles["MamaGuideSmall"],
        left,
        112,
        width,
        30,
    )
    RoundedCard(
        width,
        32,
        colors.HexColor("#fff6eb"),
        colors.HexColor("#e0c5a9"),
        radius=15,
    ).drawOn(canv, left, 70)
    draw_paragraph(
        canv,
        "<b>Lo importante:</b> no hace falta mover configuraciones. Solo recuerda: <b>subir, esperar, revisar y publicar</b>.",
        styles["MamaGuideBody"],
        left + 12,
        79,
        width - 24,
        18,
    )


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.35 * inch,
        bottomMargin=0.35 * inch,
        title="Guia sencilla para usar Terra Viva",
        author="Codex",
    )
    doc.build([Spacer(1, 1)], onFirstPage=paint_layout)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
