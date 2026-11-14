from PIL import Image, ImageDraw, ImageFont

W, H = 1400, 1800
BG = (10, 16, 32)
PANEL = (17, 26, 45)
PANEL2 = (26, 39, 64)
ACCENT = (91, 155, 213)
ACCENT_STRONG = (58, 110, 165)
TEXT = (245, 248, 255)
MUTED = (170, 185, 207)
WHITE = (255, 255, 255)

FONT_DIR = "C:/Windows/Fonts/"


def font(name, size):
    return ImageFont.truetype(FONT_DIR + name, size)


F_TITLE = font("segoeuib.ttf", 62)
F_SUB = font("seguisb.ttf", 28)
F_H1 = font("segoeuib.ttf", 38)
F_CARD_TITLE = font("seguisb.ttf", 26)
F_BODY = font("segoeui.ttf", 21)
F_SMALL = font("segoeui.ttf", 18)
F_BOLD = font("segoeuib.ttf", 22)
F_FOOT = font("segoeui.ttf", 19)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)


def vgradient(y0, y1, c0, c1):
    for y in range(y0, y1):
        t = (y - y0) / max(1, (y1 - y0))
        c = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
        draw.line([(0, y), (W, y)], fill=c)


def wrap(text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_wrapped(text, fnt, fill, x, y, max_w, lh):
    for line in wrap(text, fnt, max_w):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += lh
    return y


def circle_num(x, y, n, color):
    r = 24
    draw.ellipse([x, y, x + 2 * r, y + 2 * r], fill=color)
    label = str(n)
    tw = draw.textlength(label, font=F_BOLD)
    draw.text((x + r - tw / 2, y + r - 14), label, font=F_BOLD, fill=WHITE)


def section_title(y, text):
    draw.rounded_rectangle([70, y + 6, 78, y + 44], radius=4, fill=ACCENT)
    draw.text((92, y), text, font=F_H1, fill=TEXT)


def step_card(x, y, w, h, n, title, desc):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=20, fill=PANEL, outline=(45, 60, 90), width=2)
    circle_num(x + 24, y + 24, n, ACCENT)
    draw.text((x + 24, y + 92), title, font=F_CARD_TITLE, fill=TEXT)
    draw_wrapped(desc, F_SMALL, MUTED, x + 24, y + 132, w - 48, 25)


def space_card(x, y, w, h, title, items, accent):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=PANEL, outline=accent, width=2)
    draw.rounded_rectangle([x, y, x + w, y + 60], radius=22, fill=accent)
    draw.rectangle([x, y + 40, x + w, y + 60], fill=accent)
    tw = draw.textlength(title, font=F_CARD_TITLE)
    draw.text((x + (w - tw) / 2, y + 16), title, font=F_CARD_TITLE, fill=(10, 16, 32))
    yy = y + 82
    for it in items:
        draw.ellipse([x + 26, yy + 8, x + 34, yy + 16], fill=accent)
        draw.text((x + 48, yy), it, font=F_BODY, fill=TEXT)
        yy += 38


def tip_item(x, y, w, h, title, desc):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=16, fill=PANEL2, outline=(50, 66, 96), width=2)
    draw.text((x + 20, y + 20), title, font=F_CARD_TITLE, fill=ACCENT)
    draw_wrapped(desc, F_SMALL, MUTED, x + 20, y + 62, w - 40, 25)


# ---------- Header ----------
vgradient(0, 300, (10, 16, 32), (17, 26, 45))
draw.text((70, 52), "ASSISTANT FM", font=F_TITLE, fill=ACCENT)
draw.text((72, 140), "Guide de démarrage · Football Manager 2027", font=F_SUB, fill=MUTED)
draw.rounded_rectangle([72, 198, 182, 205], radius=3, fill=ACCENT)

# ---------- Section 1 ----------
section_title(330, "Comment ça marche ?")
steps = [
    ("Installez", "Téléchargez l'installateur et suivez les étapes. Windows 10/11 requis."),
    ("Lancez", "Ouvrez Assistant FM et choisissez votre sauvegarde .fm à extraire."),
    ("Explorez", "Effectif, statistiques, finances, tactique et potentiels sont analysés."),
    ("Agissez", "Recrutez, comparez, suivez vos cibles et planifiez votre mercato."),
]
cw, ch, gap = 290, 250, 30
start_x = (W - (4 * cw + 3 * gap)) / 2
for i, (t, d) in enumerate(steps):
    x = start_x + i * (cw + gap)
    step_card(x, 395, cw, ch, i + 1, t, d)
    if i < 3:
        ax = x + cw + 6
        ay = 395 + ch / 2
        draw.polygon([(ax, ay - 9), (ax + 16, ay), (ax, ay + 9)], fill=ACCENT)

# ---------- Section 2 ----------
section_title(700, "Les 3 espaces principaux")
spaces = [
    ("RECRUTEMENT", [
        "Recherche joueurs & staff",
        "Profils similaires",
        "Recruter par poste",
        "Planificateur d'effectif",
        "Copilote mercato",
        "Bonnes affaires",
    ]),
    ("MON CLUB", [
        "Vue d'ensemble & finances",
        "Effectif filtrable",
        "Tactique & optimiseur",
        "Performances (stats, /90)",
        "Diagnostic par poste",
        "Développement des jeunes",
    ]),
    ("SUIVI", [
        "Notes & comparaison",
        "Alertes personnalisées",
        "Historique de partie",
        "Variations de CA",
        "Contrats < 6 mois",
        "Données 100% locales",
    ]),
]
sw, sh, sgap = 410, 540, 30
sstart = (W - (3 * sw + 2 * sgap)) / 2
for i, (title, items) in enumerate(spaces):
    x = sstart + i * (sw + sgap)
    space_card(x, 765, sw, sh, title, items, ACCENT)

# ---------- Section 3 ----------
section_title(1350, "Bon à savoir")
tips = [
    ("Données locales", "Vos sauvegardes et analyses restent sur votre PC."),
    ("Mode découverte", "Masque CA/PA pour analyser sans spoiler."),
    ("Recherche globale", "Touche / pour trouver un joueur, club ou poste."),
    ("Logos & visages", "Packs TCM Logos et DF11 Facepack supportés."),
]
tw_, th_, tgap = 297, 150, 24
tstart = (W - (4 * tw_ + 3 * tgap)) / 2
for i, (t, d) in enumerate(tips):
    x = tstart + i * (tw_ + tgap)
    tip_item(x, 1415, tw_, th_, t, d)

# ---------- Footer ----------
draw.rounded_rectangle([70, 1620, 1330, 1750], radius=20, fill=PANEL2, outline=ACCENT, width=2)
draw.text((100, 1645), "Téléchargement Windows", font=F_CARD_TITLE, fill=TEXT)
draw.text((100, 1685), "https://www.dropbox.com/t/Gz5RY46Ncc7brDVM", font=F_FOOT, fill=ACCENT)
draw.text((100, 1715), "Discord : https://discord.gg/YR2e8kMHeF", font=F_FOOT, fill=MUTED)

img.save("tutorial-assistant-fm.png")
print("OK tutorial-assistant-fm.png")