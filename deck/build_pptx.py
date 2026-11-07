"""Build deck/helix-deck.pptx (16:9, dark brand, speaker notes, transitions + entrance animations).

Usage:  python3 -I deck/build_pptx.py
Reads screenshots from ../docs/screens/*.png (placeholder panels if missing) and the speaker
notes from index.html (<aside class="notes">), so both formats stay in sync. Re-run after
recapturing screenshots.
"""
import html
import io
import math
import os
import re

import numpy as np
from lxml import etree
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
SCREENS = os.path.normpath(os.path.join(HERE, "..", "docs", "screens"))
OUT = os.path.join(HERE, "helix-deck.pptx")

# ---------------------------------------------------------------- brand
BG, PANEL, PANEL2, BORDER, BORDER2 = "08080A", "111114", "16161B", "26262D", "33333C"
INK, MUTED, DIM, DIMMER = "F4F4EF", "9A9AA3", "6F6F78", "4A4A53"
LIME, PEACH, PINK = "E4F56A", "F6D7A7", "F2B5E3"
VIS, SPK, OCR, SND, FMT = "D9F99D", "F9A8D4", "7DD3FC", "FCD34D", "C4B5FD"
TRACKS = [VIS, SPK, OCR, SND, FMT]
GRAD = [(LIME, 0), (PEACH, 50000), (PINK, 100000)]
SANS, MONO = "Arial", "Courier New"

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
P159 = "http://schemas.microsoft.com/office/powerpoint/2015/09/main"


def E(v):  # stage px (1920x1080) -> EMU ; 1px = 6350 EMU = 0.5pt
    return Emu(int(round(v * 6350)))


def rgb(h):
    return RGBColor.from_string(h.upper())


def el(xml):
    return etree.fromstring(xml)


# ---------------------------------------------------------------- low-level styling
def _strip_style(shape):
    st = shape._element.find(qn("p:style"))
    if st is not None:
        shape._element.remove(st)


def _alpha(clr_parent, alpha):
    if alpha is None or alpha >= 1:
        return
    clr = clr_parent.find(qn("a:srgbClr"))
    a = etree.SubElement(clr, qn("a:alpha"))
    a.set("val", str(int(alpha * 100000)))


def grad_xml(stops=GRAD, ang=0):
    gs = "".join(f'<a:gs pos="{p}"><a:srgbClr val="{c}"/></a:gs>' for c, p in stops)
    return (f'<a:gradFill xmlns:a="{NS["a"]}" rotWithShape="1"><a:gsLst>{gs}</a:gsLst>'
            f'<a:lin ang="{int(ang * 60000)}" scaled="0"/></a:gradFill>')


def fill(shape, color=None, alpha=None, grad=None, ang=0):
    if grad:
        shape.fill.gradient()
        spPr = shape._element.spPr
        old = spPr.find(qn("a:gradFill"))
        spPr.replace(old, el(grad_xml(grad, ang)))
    elif color is None:
        shape.fill.background()
    else:
        shape.fill.solid()
        shape.fill.fore_color.rgb = rgb(color)
        _alpha(shape._element.spPr.find(qn("a:solidFill")), alpha)


def line(shape, color=None, width=1.0, alpha=None, grad=None):
    ln = shape.line
    if color is None and grad is None:
        ln.fill.background()
        return
    ln.width = E(width)
    if grad:
        lnel = shape._element.spPr.find(qn("a:ln"))
        for child in list(lnel):
            lnel.remove(child)
        lnel.insert(0, el(grad_xml(grad, 0)))
    else:
        ln.color.rgb = rgb(color)
        _alpha(shape._element.spPr.find(qn("a:ln")).find(qn("a:solidFill")), alpha)


def effects(shape, glow=None, shadow=False):
    spPr = shape._element.spPr
    parts = []
    if glow:
        c, rad, a = glow
        parts.append(f'<a:glow rad="{int(rad * 6350)}"><a:srgbClr val="{c}"><a:alpha val="{int(a * 100000)}"/></a:srgbClr></a:glow>')
    if shadow:
        parts.append('<a:outerShdw blurRad="762000" dist="254000" dir="5400000" algn="t" rotWithShape="0">'
                     '<a:srgbClr val="000000"><a:alpha val="60000"/></a:srgbClr></a:outerShdw>')
    if parts:
        spPr.append(el(f'<a:effectLst xmlns:a="{NS["a"]}">{"".join(parts)}</a:effectLst>'))


# ---------------------------------------------------------------- shape helpers
def rect(sh, x, y, w, h, color=None, alpha=None, border=None, bw=1.0, radius=0, grad=None, ang=0,
         bgrad=None, name=None, shape=None):
    kind = shape or (MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE)
    s = sh.add_shape(kind, E(x), E(y), E(w), E(h))
    _strip_style(s)
    if radius and kind == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = min(0.5, radius / min(w, h))
    fill(s, color, alpha, grad, ang)
    line(s, border, bw, grad=bgrad)
    if name:
        s.name = name
    return s


def oval(sh, cx, cy, r, color, alpha=None, border=None, bw=1.0, glow=None, grad=None):
    s = sh.add_shape(MSO_SHAPE.OVAL, E(cx - r), E(cy - r), E(2 * r), E(2 * r))
    _strip_style(s)
    fill(s, color, alpha, grad)
    line(s, border, bw)
    if glow:
        effects(s, glow=glow)
    return s


def seg(sh, x1, y1, x2, y2, color, width=1.0, alpha=None):
    c = sh.add_connector(MSO_CONNECTOR.STRAIGHT, E(x1), E(y1), E(x2), E(y2))
    _strip_style(c)
    c.line.width = E(width)
    c.line.color.rgb = rgb(color)
    _alpha(c._element.spPr.find(qn("a:ln")).find(qn("a:solidFill")), alpha)
    return c


def poly(sh, pts, color, width=2.0, alpha=None):
    fb = sh.build_freeform(E(pts[0][0]), E(pts[0][1]), scale=1.0)
    fb.add_line_segments([(E(x), E(y)) for x, y in pts[1:]], close=False)
    s = fb.convert_to_shape()
    _strip_style(s)
    s.fill.background()
    line(s, color, width, alpha)
    return s


def text(sh, x, y, w, h, paras, size=15, color=INK, bold=False, font=SANS, align="l", anchor="t",
         spc=None, lsp=None, after=0, name=None, inset=0, upper=False):
    """paras: str | list of paragraphs; paragraph: str | list of runs; run: str | (str, dict)."""
    tb = sh.add_textbox(E(x), E(y), E(w), E(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = E(inset)
    tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[anchor]
    style_text(tf, paras, size, color, bold, font, align, spc, lsp, after, upper)
    if name:
        tb.name = name
    return tb


def style_text(tf, paras, size, color, bold, font, align, spc, lsp, after, upper=False):
    if isinstance(paras, str):
        paras = [paras]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT}[align]
        if lsp:
            p.line_spacing = lsp
        if after:
            p.space_after = Pt(after)
        runs = [para] if isinstance(para, (str, tuple)) else para
        for r in runs:
            t, o = (r, {}) if isinstance(r, str) else r
            run = p.add_run()
            run.text = t.upper() if (o.get("upper", upper)) else t
            f = run.font
            f.size = Pt(o.get("size", size))
            f.bold = o.get("bold", bold)
            f.name = o.get("font", font)
            rpr = run._r.get_or_add_rPr()
            if o.get("spc", spc) is not None:
                rpr.set("spc", str(int(o.get("spc", spc) * 100)))
            if o.get("grad"):
                rpr.insert(0, el(grad_xml(GRAD, 0)))
            else:
                f.color.rgb = rgb(o.get("color", color))


def shape_text(s, paras, size=13, color=INK, bold=False, font=SANS, align="l", anchor="m", inset=12, spc=None):
    tf = s.text_frame
    tf.word_wrap = False
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = E(inset)
    tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[anchor]
    style_text(tf, paras, size, color, bold, font, align, spc, None, 0)
    return s


def group(sh, name=None):
    g = sh.add_group_shape()
    if name:
        g.name = name
    return g


# ---------------------------------------------------------------- composite pieces
def eyebrow(sh, x, y, label, size=11, color=MUTED, dot=True, w=900):
    g = group(sh, "eyebrow")
    if dot:
        oval(g.shapes, x + 6, y + 11, 6, LIME, grad=GRAD)
    text(g.shapes, x + (24 if dot else 0), y, w, 26, label.upper(), size=size, color=color, bold=True, spc=2.6)
    return g


def title(sh, t, y=128, size=40, w=1680, x=120, h=110):
    return text(sh, x, y, w, h, [t] if isinstance(t, (str, tuple)) else t, size=size, bold=True, spc=-1.2, lsp=0.95)


def footer(sh, n, brand=True):
    if brand:
        mark = text(sh, 120, 1006, 120, 40, "Helix", size=13, bold=True, spc=-0.3, name="!!wordmark", anchor="m")
        text(sh, 200, 1006, 600, 40, "Hack the Feed · built on Oriane", size=10, color=DIM, font=MONO, anchor="m")
    text(sh, 1560, 1006, 240, 40, [[(f"{n:02d}", {"color": INK}), (" / 10", {"color": DIM})]], size=11,
         font=MONO, bold=True, align="r", anchor="m")


def background(slide, bg_png):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = rgb(BG)
    pic = slide.shapes.add_picture(bg_png, 0, 0, E(1920), E(1080))
    pic.name = "bg glow"
    return pic


def make_bg():
    W, H = 1920, 1080
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    img = np.zeros((H, W, 3), np.float32) + np.array([8, 8, 10], np.float32)

    def glow(cx, cy, rx, ry, col, a):
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        k = np.clip(1 - d, 0, 1) ** 2 * a
        return k[..., None] * (np.array(col, np.float32) - img)

    img += glow(0.08 * W, -0.10 * H, 1000, 680, (228, 245, 106), 0.10)
    img += glow(1.05 * W, 1.10 * H, 1000, 780, (242, 181, 227), 0.11)
    # faint dot grid, radially masked
    mask = np.clip(1 - np.sqrt(((xx - W * 0.5) / (W * 0.62)) ** 2 + ((yy - H * 0.4) / (H * 0.75)) ** 2), 0, 1)
    dots = (((xx % 32) < 1.6) & ((yy % 32) < 1.6)).astype(np.float32) * mask * 9
    img += dots[..., None]
    img += np.random.default_rng(3).normal(0, 0.6, img.shape)  # dither against banding
    buf = io.BytesIO()
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(buf, "PNG", optimize=True)
    buf.seek(0)
    return buf


def helix(sh, cx, cy, length, amp, turns, tilt, rungs, horizontal=False, a=1.0, node=7, phase=0.9, name="helix"):
    g = group(sh, name)
    S = g.shapes
    TAU = math.pi * 2

    def P(u, s):
        th = u * turns * TAU + phase + s * math.pi
        aa, z, b = amp * math.sin(th), math.cos(th), -length / 2 + length * u
        lx, ly = (b, aa) if horizontal else (aa, b)
        return (cx + lx * math.cos(tilt) - ly * math.sin(tilt), cy + lx * math.sin(tilt) + ly * math.cos(tilt), z)

    def strand(s, front):
        steps, runs, cur = 200, [], []
        for i in range(steps + 1):
            x, y, z = P(i / steps, s)
            if (z >= 0) == front:
                cur.append((x, y))
            elif cur:
                runs.append(cur)
                cur = []
        if cur:
            runs.append(cur)
        col = PINK if s else LIME
        for r in runs:
            if len(r) > 1:
                poly(S, r, col, 3.0, (0.85 if front else 0.28) * a)

    strand(0, False)
    strand(1, False)
    items = []
    for k in range(rungs):
        u = (k + 0.5) / rungs
        A, B, col = P(u, 0), P(u, 1), TRACKS[k % 5]
        items.append(((A[2] + B[2]) / 2 - 0.01, "r", A, B, col))
        items.append((A[2], "n", A, None, col))
        items.append((B[2], "n", B, None, col))
    for z, kind, A, B, col in sorted(items, key=lambda t: t[0]):
        depth = (z + 1) / 2
        if kind == "r":
            seg(S, A[0], A[1], B[0], B[1], col, 3.5, (0.22 + 0.5 * depth) * a)
        else:
            r = max(2.0, node + 3.5 * A[2])
            oval(S, A[0], A[1], r, col, (0.35 + 0.65 * depth) * a,
                 glow=(col, 10, 0.45 * a) if A[2] > 0.4 else None)
    strand(0, True)
    strand(1, True)
    return g


def chip(sh, x, y, label, color, w=None, size=11, dotc=None, font=MONO, h=34, fillc=PANEL2, border=BORDER2):
    w = w or (len(label) * size * 1.25 + (44 if dotc else 26))
    g = group(sh, "chip")
    rect(g.shapes, x, y, w, h, fillc, border=border, radius=h / 2)
    if dotc:
        oval(g.shapes, x + 18, y + h / 2, 5, dotc)
    text(g.shapes, x + (32 if dotc else 13), y, w - 40, h, label, size=size, color=color, font=font, anchor="m")
    return g


def screenshot(sh, name, x, y, w, h, crop, label):
    """crop = (left, width, top) fractions of the source image; placeholder panel if file is missing."""
    path = os.path.join(SCREENS, name)
    if not os.path.exists(path):
        s = rect(sh, x, y, w, h, PANEL, border=BORDER2, radius=18, name="!!screen")
        shape_text(s, [[(label, {"bold": True, "size": 18})], [(f"docs/screens/{name} not found", {"color": MUTED, "size": 12, "font": MONO})]],
                   align="c", anchor="m")
        return s
    iw, ih = Image.open(path).size
    cx, cw, cy = crop
    hf = (h / w) * cw * (iw / ih)
    pic = sh.add_picture(path, E(x), E(y), E(w), E(h))
    pic.crop_left, pic.crop_right = cx, max(0.0, 1 - cx - cw)
    pic.crop_top, pic.crop_bottom = cy, max(0.0, 1 - cy - hf)
    pic.auto_shape_type = MSO_SHAPE.ROUNDED_RECTANGLE
    geom = pic._element.spPr.find(qn("a:prstGeom"))
    av = geom.find(qn("a:avLst"))
    if av is None:
        av = etree.SubElement(geom, qn("a:avLst"))
    gd = etree.SubElement(av, qn("a:gd"))
    gd.set("name", "adj")
    gd.set("fmla", "val 2600")
    pic.line.color.rgb = rgb(BORDER2)
    pic.line.width = E(2)
    effects(pic, shadow=True)
    pic.name = "!!screen"
    pic._element.nvPicPr.cNvPr.set("descr", label)
    return pic


# ---------------------------------------------------------------- motion: transitions + timing
def set_transition(slide, morph=False):
    sld = slide._element
    if morph:
        x = (f'<mc:AlternateContent xmlns:mc="{MC}"><mc:Choice xmlns:p159="{P159}" Requires="p159">'
             f'<p:transition xmlns:p="{NS["p"]}" spd="slow"><p159:morph option="byObject"/></p:transition></mc:Choice>'
             f'<mc:Fallback><p:transition xmlns:p="{NS["p"]}" spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>')
    else:
        x = f'<p:transition xmlns:p="{NS["p"]}" spd="slow"><p:fade/></p:transition>'
    anchor = sld.find(qn("p:clrMapOvr"))
    if anchor is None:
        anchor = sld.find(qn("p:cSld"))
    sld.insert(list(sld).index(anchor) + 1, el(x))


def add_timing(slide, fx):
    """fx: list of (shape, delay_ms, kind, dur_ms). kinds: fade | wipe | fly | path:<dx>|<repeat>.
    All effects start automatically when the slide appears (first = After Previous, rest = With Previous)."""
    if not fx:
        return
    ids = iter(range(5, 100000))
    pars, bld = [], []
    for i, (shp, delay, kind, dur) in enumerate(fx):
        spid = shp.shape_id
        node = "afterEffect" if i == 0 else "withEffect"
        tgt = f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'
        vis = (f'<p:set><p:cBhvr><p:cTn id="{next(ids)}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
               f'{tgt}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>')
        eid = next(ids)
        if kind == "fade":
            head = f'presetID="10" presetClass="entr" presetSubtype="0"'
            body = vis + f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{next(ids)}" dur="{dur}"/>{tgt}</p:cBhvr></p:animEffect>'
        elif kind == "wipe":
            head = f'presetID="22" presetClass="entr" presetSubtype="8"'
            body = vis + f'<p:animEffect transition="in" filter="wipe(left)"><p:cBhvr><p:cTn id="{next(ids)}" dur="{dur}"/>{tgt}</p:cBhvr></p:animEffect>'
        elif kind == "fly":  # fly in from right, decelerating
            head = f'presetID="2" presetClass="entr" presetSubtype="2" decel="100000"'

            def anim(attr, a, b):
                return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{next(ids)}" dur="{dur}" fill="hold"/>{tgt}'
                        f'<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst>'
                        f'<p:tav tm="0"><p:val><p:strVal val="{a}"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="{b}"/></p:val></p:tav></p:tavLst></p:anim>')
            body = vis + anim("ppt_x", "1+#ppt_w/2", "#ppt_x") + anim("ppt_y", "#ppt_y", "#ppt_y")
        elif kind.startswith("path:"):
            dx = float(kind.split(":")[1])
            head = f'presetID="0" presetClass="path" presetSubtype="0" repeatCount="indefinite"'
            body = (f'<p:animMotion origin="layout" path="M 0 0 L {dx:.4f} 0 E" pathEditMode="relative" ptsTypes="">'
                    f'<p:cBhvr><p:cTn id="{next(ids)}" dur="{dur}" fill="hold"/>{tgt}'
                    f'<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>')
        else:
            raise ValueError(kind)
        pars.append(f'<p:par><p:cTn id="{eid}" {head} fill="hold" grpId="0" nodeType="{node}">'
                    f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>{body}</p:childTnLst></p:cTn></p:par>')
        if shp._element.tag == qn("p:sp") and spid not in bld:
            bld.append(spid)
    bldx = "".join(f'<p:bldP spid="{s}" grpId="0" animBg="1"/>' for s in bld)
    x = (f'<p:timing xmlns:p="{NS["p"]}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
         f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
         f'<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
         f'<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{"".join(pars)}</p:childTnLst></p:cTn></p:par>'
         f'</p:childTnLst></p:cTn></p:par>'
         f'</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
         f'<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
         f'</p:childTnLst></p:cTn></p:par></p:tnLst>{"<p:bldLst>" + bldx + "</p:bldLst>" if bldx else ""}</p:timing>')
    slide._element.append(el(x))


def stagger(items, start=150, step=140, kind="fade", dur=600):
    return [(s, start + i * step, kind, dur) for i, s in enumerate(items)]


# ---------------------------------------------------------------- notes from index.html
def load_notes():
    src = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
    return [html.unescape(re.sub(r"\s+", " ", n)).strip() for n in re.findall(r'<aside class="notes">(.*?)</aside>', src, re.S)]


# ================================================================ slides
def build():
    prs = Presentation()
    prs.slide_width, prs.slide_height = E(1920), E(1080)
    blank = prs.slide_layouts[6]
    bg = make_bg()
    notes = load_notes()
    slides = []

    def new():
        s = prs.slides.add_slide(blank)
        bg.seek(0)
        background(s, bg)
        slides.append(s)
        return s, s.shapes

    # ---------------- 1 TITLE
    s, sh = new()
    hx = helix(sh, 1440, 540, 1000, 165, 2.3, -0.2, 30)
    tags = []
    for (tx, ty, lab, ts, col) in [(1090, 212, "Contrarian hook", "", SPK), (1600, 372, "Text-heavy", "", OCR),
                                   (1060, 548, "Hands + product", "", VIS), (1610, 716, "Licensed music", "", SND),
                                   (1130, 884, "30–60s length", "", FMT)]:
        w = (len(lab) + len(ts) + 1) * 12.6 + 64
        g = group(sh, "gene tag")
        rect(g.shapes, tx, ty, w, 44, "0A0A0C", alpha=0.85, border=BORDER2, radius=10)
        oval(g.shapes, tx + 20, ty + 22, 5, col, glow=(col, 6, 0.6))
        text(g.shapes, tx + 34, ty, w - 40, 44, [[(lab, {}), ((" " + ts) if ts else "", {"color": MUTED})]], size=10, font=MONO, bold=True, anchor="m")
        tags.append(g)
    eb = eyebrow(sh, 120, 210, "Hack the Feed · Amplitude HQ · Nov 6 2026", size=12)
    wm = text(sh, 104, 262, 900, 330, [[("Helix", {"grad": True})]], size=150, bold=True, spc=-5, name="!!wordmark")
    tg = text(sh, 120, 600, 900, 170, ["Every viral video", "has a genome."], size=31, spc=-0.8, lsp=1.0)
    c1 = chip(sh, 120, 800, "Built on Oriane video intelligence", INK, w=500, size=13, dotc=LIME, font=SANS, h=56)
    c2 = chip(sh, 636, 800, "TikTok + Instagram", MUTED, w=280, size=13, font=SANS, h=56)
    lg = group(sh, "legend")
    lx = 120
    for name, col in zip(["Visual", "Spoken", "On-screen", "Sound", "Format"], TRACKS):
        oval(lg.shapes, lx + 6, 985, 6, col)
        text(lg.shapes, lx + 22, 972, 160, 28, name.upper(), size=10, color=MUTED, bold=True, spc=2, anchor="m")
        lx += 40 + len(name) * 15 + 40
    add_timing(s, [(eb, 100, "fade", 500), (wm, 250, "fade", 900), (tg, 550, "fade", 700), (c1, 750, "fade", 500),
                   (c2, 850, "fade", 500), (hx, 300, "wipe", 1600)] + stagger(tags, 1300, 160) + [(lg, 2200, "fade", 600)])

    # ---------------- 2 PROBLEM
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "The problem")
    tt = text(sh, 120, 128, 1680, 220, [[("Creators guess.", {})], [("The advice is vibes.", {"color": DIM})]], size=46, bold=True, spc=-1.4, lsp=0.95)
    rows = []
    for k, (h4, p) in enumerate([("Creators", "Post, pray, and copy whatever blew up last week."),
                                 ("Agencies running 50 creators", "Fifty briefs every Monday, written on gut feel."),
                                 ("Text-based tools", "Read captions and hashtags. Blind to what a video shows, says, overlays and sounds like.")]):
        y = 400 + k * 168
        g = group(sh, f"pain {k + 1}")
        seg(g.shapes, 120, y, 980, y, BORDER, 1.5)
        text(g.shapes, 120, y + 34, 60, 30, f"{k + 1:02d}", size=11, color=DIM, font=MONO, bold=True)
        text(g.shapes, 188, y + 26, 790, 50, h4, size=20, bold=True, spc=-0.4)
        text(g.shapes, 188, y + 76, 760, 80, p, size=15, color=MUTED)
        rows.append(g)
    seg(sh, 120, 904, 980, 904, BORDER, 1.5)
    pn = rect(sh, 1040, 390, 760, 514, PANEL, border=BORDER, radius=26, name="stat panel")
    big = text(sh, 1086, 420, 640, 230, [[("76", {"grad": True}), ("%", {"grad": True, "size": 54})]], size=104, bold=True, spc=-5)
    para = text(sh, 1090, 650, 670, 90, [[("of brand exposure lives in what creators ", {}), ("say", {"bold": True}), (" and ", {}),
                                          ("show", {"bold": True}), (" — not in what they tag.", {})]], size=16, color=INK)
    ba = rect(sh, 1090, 758, 160, 56, "2A2A31", radius=12)
    shape_text(ba, "captions", size=11, font=MONO, color=INK)
    bb = rect(sh, 1258, 758, 492, 56, grad=GRAD, radius=12)
    shape_text(bb, "said · shown · overlaid · heard", size=11, font=MONO, color="111111", bold=True)
    lab = group(sh, "bar labels")
    text(lab.shapes, 1090, 826, 330, 26, "What caption search sees", size=10, color=MUTED, font=MONO)
    text(lab.shapes, 1420, 826, 330, 26, "What it misses", size=10, color=MUTED, font=MONO, align="r")
    text(lab.shapes, 1090, 862, 330, 24, "SOURCE: ORIANE", size=9, color=DIM, font=MONO, bold=True, spc=1)
    add_timing(s, [(eb, 100, "fade", 500), (tt, 200, "fade", 700)] + stagger(rows, 500, 160) +
               [(pn, 600, "fade", 600), (big, 750, "fade", 700), (para, 950, "fade", 600), (ba, 1150, "fade", 400),
                (bb, 1400, "wipe", 1100), (lab, 1700, "fade", 500)])

    # ---------------- 3 INSIGHT
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "The insight")
    tt = title(sh, [[("A video is a sequence of ", {}), ("genes", {"grad": True}), (".", {})]], size=46)
    X0, TW = 470, 1330
    rl = group(sh, "ruler")
    for i, t in enumerate(["0:00", "0:05", "0:10", "0:15", "0:20", "0:25"]):
        text(rl.shapes, X0 + TW * i * 5 / 27 - (0 if i == 0 else 30), 268, 60, 24, t, size=10, color=DIM, font=MONO, align="l" if i == 0 else "c")
    lanes = [
        ("Visual", "AI Vision · frames[]", VIS, [(0, .14, "Face to camera", ""), (.155, .27, "Hands + product", "@0:01"), (.66, .23, "Before / after", "@0:18")]),
        ("Spoken", "transcriptChunks[]", SPK, [(0, .15, "Question hook", ""), (.24, .22, "Number claim", "@0:07"), (.82, .18, "CTA · link in bio", "")]),
        ("On-screen", "onScreenTextRegions", OCR, [(0, .20, "Text hook · frame 1", ""), (.32, .18, "Price overlay", "@0:09"), (.55, .22, "Listicle counter", "")]),
        ("Sound", "audioTitle · original / ©", SND, []),
        ("Format", "duration · cuts · aspect", FMT, []),
    ]
    labels, genes = [], []
    for k, (nm, src, col, gs) in enumerate(lanes):
        y0 = 300 + k * 106
        seg(sh, 120, y0, 1800, y0, BORDER, 1.5)
        g = group(sh, f"{nm} label")
        oval(g.shapes, 128, y0 + 40, 7, col)
        text(g.shapes, 146, y0 + 22, 320, 40, nm, size=16, bold=True, anchor="m")
        text(g.shapes, 146, y0 + 64, 320, 24, src, size=10, color=MUTED, font=MONO)
        labels.append(g)
        rect(sh, X0, y0 + 20, TW, 66, "101013", border="1C1C22", radius=12)
        for (l, w, lab_, ts) in gs:
            b = rect(sh, X0 + TW * l, y0 + 28, TW * w, 50, col, radius=10)
            shape_text(b, [[(lab_, {}), ((" " + ts) if ts else "", {"font": MONO, "size": 9, "color": "4A4A4A", "bold": False})]], size=11, bold=True, color="0B0B0D", inset=12)
            genes.append(b)
        if nm == "Sound":
            wg = group(sh, "waveform")
            rect(wg.shapes, X0, y0 + 28, TW, 50, SND, alpha=0.10, border=SND, bw=1, radius=10)
            rng = np.random.default_rng(7)
            n = 104
            for i in range(n):
                env = 0.45 + 0.55 * abs(math.sin(i / n * math.pi * 3.2 + 0.6))
                hh = max(4, (0.18 + rng.random() * 0.82) * env * 38)
                rect(wg.shapes, X0 + 16 + i * ((TW - 200) / n), y0 + 53 - hh / 2, 6, hh, SND, alpha=0.9)
            pill = rect(wg.shapes, X0 + TW - 168, y0 + 37, 152, 32, SND, radius=8)
            shape_text(pill, "Trending sound", size=10, bold=True, color="0B0B0D", align="c", inset=4)
            genes.append(wg)
        if nm == "Format":
            fg = group(sh, "format")
            rect(fg.shapes, X0, y0 + 28, TW, 50, FMT, alpha=0.10, border=FMT, bw=1, radius=10)
            for p in [6, 14, 21, 30, 38, 47, 55, 63, 72, 81, 90]:
                if X0 + TW * p / 100 > X0 + 440:
                    rect(fg.shapes, X0 + TW * p / 100, y0 + 32, 2, 42, FMT, alpha=0.7)
            text(fg.shapes, X0 + 16, y0 + 28, 420, 50, "9:16 · 27s · 11 cuts · loop ending", size=11, bold=True, color=FMT, anchor="m")
            genes.append(fg)
    seg(sh, 120, 830, 1800, 830, BORDER, 1.5)
    ft = text(sh, 120, 862, 1300, 40, [[("32", {"bold": True, "color": INK}), (" genes     ", {}), ("5", {"bold": True, "color": INK}),
                                        (" tracks     every gene timestamped to the frame", {})]], size=16, color=MUTED)
    add_timing(s, [(eb, 100, "fade", 500), (tt, 200, "fade", 700), (rl, 450, "fade", 500)] + stagger(labels, 500, 110) +
               stagger(genes, 900, 120, "wipe", 700) + [(ft, 2600, "fade", 600)])

    # ---------------- 4 PRODUCT
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "The product")
    tt = title(sh, [[("Sequence. Measure lift. ", {}), ("Fork.", {"grad": True})]], size=46)
    cards = []
    specs = [("01 · SEQUENCE", "Sequence a niche", "Three named Oriane sub-queries, OR-ed. Every video knows how it was found."),
             ("02 · MEASURE", "Measure lift", "Median views-per-follower with the gene ÷ without, plus top- vs bottom-quartile share."),
             ("03 · FORK", "Fork the genome", "Structure inherited, content original. A shot list you can film on Monday.")]
    for k, (lab, h3, p) in enumerate(specs):
        x, y = 120 + k * 580, 300
        g = group(sh, f"step {k + 1}")
        G = g.shapes
        rect(G, x, y, 520, 600, PANEL, border=BORDER, radius=26)
        text(G, x + 40, y + 40, 440, 26, lab, size=11, color=MUTED, font=MONO, bold=True, spc=1.5)
        text(G, x + 40, y + 82, 440, 64, h3, size=26, bold=True, spc=-0.8)
        text(G, x + 40, y + 156, 440, 150, p, size=15, color=MUTED)
        if k == 0:
            for j, (q, d, c) in enumerate([("said", "transcript match", SPK), ("onscreen", "on-screen text match", OCR),
                                           ("caption", "caption match", "8B8B94"), ("AI Vision", "6 visual gene probes", VIS)]):
                qx, qy = x + 40 + (j % 2) * 225, y + 338 + (j // 2) * 92
                rect(G, qx, qy, 215, 82, PANEL2, border=BORDER, radius=12)
                oval(G, qx + 22, qy + 28, 6, c)
                text(G, qx + 36, qy + 14, 170, 30, q, size=13, bold=True, font=MONO, anchor="m")
                text(G, qx + 16, qy + 48, 190, 26, d, size=10, color=MUTED)
            px_ = x + 40
            for f, c in [(32, SPK), (70, OCR), (14, "5B5B64")]:
                w = 440 * f / 116 - 3
                rect(G, px_, y + 530, w, 16, c, radius=8)
                px_ += w + 3
            text(G, x + 40, y + 556, 440, 24, "said 32 · on-screen 70 · caption 14", size=9.5, color=MUTED, font=MONO)
        if k == 1:
            rect(G, x + 40, y + 360, 96, 170, grad=GRAD, ang=90, radius=12)
            rect(G, x + 156, y + 506, 96, 24, "34343C", radius=8)
            text(G, x + 40, y + 540, 96, 24, "with", size=10, color=MUTED, font=MONO, align="c")
            text(G, x + 156, y + 540, 96, 24, "without", size=10, color=MUTED, font=MONO, align="c")
            text(G, x + 262, y + 392, 220, 110, [[("×7.2", {"grad": True})]], size=50, bold=True, align="r", spc=-2)
            text(G, x + 258, y + 502, 224, 60, ["30–60s length · n=24", "live Oriane data"], size=9, color=MUTED, font=MONO, align="r")
        if k == 2:
            for j, (bt, tx_, c, badge) in enumerate([("HOOK", "Contrarian “you” hook", SPK, "inherited"), ("SETUP", "Text-heavy, 4–6 words", OCR, "inherited"),
                                                    ("PROOF", "Hands + product", VIS, "inherited"), ("CTA", "Your product + voice", FMT, "swapped")]):
                by = y + 330 + j * 60
                rect(G, x + 40, by, 440, 50, PANEL2, border=BORDER, radius=12)
                text(G, x + 56, by, 90, 50, bt, size=11, bold=True, font=MONO, color=c, anchor="m")
                text(G, x + 130, by, 232, 50, tx_, size=11.5, anchor="m")
                bd = rect(G, x + 362, by + 13, 108, 24, c if badge == "inherited" else "2A2A31", radius=6)
                shape_text(bd, badge, size=9, font=MONO, bold=True, color="0B0B0D" if badge == "inherited" else INK, align="c", inset=2)
        cards.append(g)
    arrows = []
    for ax, col in [(670, LIME), (1250, PINK)]:
        a = oval(sh, ax, 600, 24, BG, border=BORDER2, bw=1.5)
        shape_text(a, "→", size=14, bold=True, color=col, align="c", inset=0)
        arrows.append(a)
    add_timing(s, [(eb, 100, "fade", 500), (tt, 200, "fade", 700), (cards[0], 450, "fade", 600), (arrows[0], 800, "fade", 400),
                   (cards[1], 950, "fade", 600), (arrows[1], 1300, "fade", 400), (cards[2], 1450, "fade", 600)])

    # ---------------- 5 NICHE GENOME
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "Live demo · 1 / 3")
    tt = title(sh, "The Niche Genome", size=40)
    shot = screenshot(sh, "niche.png", 120, 250, 1060, 650, (0.075, 0.85, 0.0), "Helix Niche Genome page")
    eb2 = eyebrow(sh, 1236, 92, "Winning genome", w=560)
    sub = text(sh, 1236, 134, 564, 40, "Live from Oriane · top genes by lift", size=15, color=MUTED)
    st = group(sh, "strand")
    for sgn, col, al in [(1, LIME, 0.9), (-1, PINK, 0.55)]:
        pts = [(1266 + sgn * 26 * math.sin(i / 120 * 5 * math.pi), 196 + 694 * i / 120) for i in range(121)]
        poly(st.shapes, pts, col, 3, al)
    wcards = []
    for i, (trk, col, gene, lift, rc) in enumerate([
            ("FORMAT", FMT, "30–60s length", "7.2", "media.duration · n=24"),
            ("SOUND", SND, "Licensed music", "5.7", "audioTitle / audioAuthor"),
            ("FORMAT", FMT, "Long story caption", "4.2", "caption"),
            ("ON-SCREEN", OCR, "Text-heavy", "3.4", "onScreenTextRegions"),
            ("SPOKEN", SPK, "Contrarian hook", "1.8", "transcriptChunks[0]"),
            ("SPOKEN", SPK, "Direct ‘you’ hook", "1.4", "transcriptChunks[0]"),
            ("VISUAL", VIS, "Hands + product", "1.3", "AI-Vision probe")]):
        y = 196 + i * 102
        seg(st.shapes, 1266, y + 45, 1312, y + 45, col, 2, 0.8)
        g = group(sh, f"gene card {gene}")
        rect(g.shapes, 1312, y, 488, 90, PANEL, border=BORDER2, radius=16)
        text(g.shapes, 1336, y + 12, 330, 36, gene, size=15, bold=True, spc=-0.3, anchor="m")
        oval(g.shapes, 1343, y + 64, 5, col, glow=(col, 6, 0.5))
        text(g.shapes, 1356, y + 52, 284, 24, rc, size=9, color=MUTED, font=MONO, anchor="m")
        text(g.shapes, 1640, y + 14, 140, 62, [[("×", {"size": 13, "color": MUTED, "bold": False}), (lift, {})]], size=26, bold=True, align="r", anchor="m", spc=-1)
        wcards.append(g)
    co = group(sh, "callouts")
    text(co.shapes, 120, 928, 810, 40, [[("●  ", {"color": LIME, "size": 11}), ("84% invisible to caption search: ", {"bold": True, "color": INK}),
                                         ("caption-only finds 14 of 89", {})]], size=13, color=MUTED, anchor="m")
    text(co.shapes, 950, 928, 850, 40, [[("●  ", {"color": PINK, "size": 11}), ("Click a gene ", {"bold": True, "color": INK}),
                                         ("→ the wall filters to videos carrying it", {})]], size=13, color=MUTED, anchor="m")
    add_timing(s, [(eb, 100, "fade", 500), (tt, 200, "fade", 600), (eb2, 300, "fade", 500), (sub, 400, "fade", 500),
                   (shot, 500, "fade", 800)] + stagger(wcards, 900, 170, "fly", 700) + [(st, 2000, "wipe", 900), (co, 2400, "fade", 600)])

    # ---------------- 6 VIDEO GENOME
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "Live demo · 2 / 3")
    tt = text(sh, 120, 128, 540, 200, ["The Video", "Genome"], size=46, bold=True, spc=-1.4, lsp=0.95)
    ld = text(sh, 120, 340, 520, 90, "Five tracks on one timeline. Every gene ships with its receipt.", size=16, color=MUTED)
    shot = screenshot(sh, "genome.png", 680, 150, 1120, 790, (0.14, 0.72, 0.03), "Helix Video Genome strip")
    rc = []
    for i, (col, nm, field, rest) in enumerate([(OCR, "Text hook in first 3s", "frames[].onScreenTextRegions", " @0:02 · “SANTE” · 2.1× in niche"),
                                                (VIS, "Hands + product", "AI-Vision probe", " @0:02 · 1.3× in niche"),
                                                (FMT, "Long caption", "caption", " · 344 chars · 4.2× in niche")]):
        y = 452 + i * 150
        g = group(sh, f"receipt {i + 1}")
        rect(g.shapes, 120, y, 500, 128, PANEL, border=BORDER, radius=18)
        oval(g.shapes, 148, y + 38, 7, col)
        text(g.shapes, 166, y + 20, 440, 36, nm, size=18, bold=True, spc=-0.4, anchor="m")
        text(g.shapes, 146, y + 66, 460, 56, [[(field, {"color": INK, "bold": True}), (rest, {})]], size=10.5, color=MUTED, font=MONO)
        rc.append(g)
    add_timing(s, [(eb, 100, "fade", 500), (tt, 200, "fade", 600), (ld, 400, "fade", 600), (shot, 300, "fade", 800)] + stagger(rc, 800, 200))

    # ---------------- 7 FORK + ROSTER
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "Live demo · 3 / 3")
    tt = title(sh, [[("Fork the genome. Then fork it ", {}), ("50 times.", {"grad": True})]], size=38)
    shot = screenshot(sh, "fork.png", 120, 260, 1050, 690, (0.10, 0.80, 0.03), "Helix Fork shot list")
    rp = group(sh, "roster panel")
    rect(rp.shapes, 1220, 260, 580, 690, PANEL, border=BORDER, radius=26)
    text(rp.shapes, 1250, 290, 520, 44, "Agency roster mode", size=20, bold=True, spc=-0.5)
    text(rp.shapes, 1250, 338, 520, 56, [[("Example roster. ", {"bold": True, "color": LIME}), ("Paste 5–50 creators + products → one proven genome → a Monday brief for everyone.", {})]], size=11, color=MUTED)
    rows = []
    for i, (prod, col) in enumerate(zip(["Oat protein latte", "Matcha whey shake", "Cold brew + collagen", "Mocha protein bar", "Vanilla cold foam"], TRACKS)):
        y = 410 + i * 74
        g = group(sh, f"roster row {i + 1}")
        seg(g.shapes, 1250, y, 1772, y, BORDER, 1.2)
        av = oval(g.shapes, 1272, y + 37, 22, col)
        shape_text(av, f"{i + 1:02d}", size=10, bold=True, font=MONO, color="0B0B0D", align="c", inset=0)
        text(g.shapes, 1310, y + 12, 300, 28, f"Example creator {i + 1:02d}", size=13, bold=True)
        text(g.shapes, 1310, y + 40, 300, 26, prod, size=11, color=MUTED)
        text(g.shapes, 1600, y + 12, 172, 50, "✓ brief ready", size=10, color=LIME, font=MONO, bold=True, align="r", anchor="m")
        rows.append(g)
    seg(sh, 1250, 784, 1772, 784, BORDER, 1.2)
    n50 = text(sh, 1248, 784, 300, 110, [[("50", {"grad": True})]], size=54, bold=True, spc=-2)
    lab = text(sh, 1250, 908, 300, 26, "MONDAY BRIEFS", size=10, color=MUTED, bold=True, spc=2)
    btn = rect(sh, 1572, 852, 200, 62, grad=GRAD, radius=14)
    shape_text(btn, "Batch fork →", size=14, bold=True, color="0B0B0D", align="c", inset=4)
    add_timing(s, [(eb, 100, "fade", 500), (tt, 200, "fade", 600), (shot, 400, "fade", 800), (rp, 600, "fade", 600)] +
               stagger(rows, 1000, 220, "fly", 600) + [(n50, 2200, "fade", 700), (lab, 2300, "fade", 500), (btn, 2500, "fade", 500)])

    # ---------------- 8 HOW IT WORKS
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "How it works")
    tt = title(sh, "From Oriane fields to a Monday brief.", size=40)
    rect(sh, 245, 376, 1430, 4, "24242B", radius=2)
    packets = [oval(sh, 245, 378, 7, c, glow=(c, 8, 0.7)) for c in TRACKS]
    rail = rect(sh, 245, 376, 1430, 4, grad=GRAD, radius=2, name="rail")
    stations = []
    data = [("Oriane REST\n/contents/search", "Named sub-queries", "said · onscreen · caption, OR-ed. Top by views + most recent, projection=full.", LIME),
            ("Oriane\nAI Vision", "6 AI-Vision probes", "Restricted to corpus IDs: face-to-camera, hands + product, screen rec, outdoors, text card, before / after.", VIS),
            ("deterministic\n5 tracks", "32 gene extractors", "Every gene keeps its source field + timestamp.", OCR),
            ("per niche\nwith n", "Lift stats", "Median views / follower with ÷ without, plus top- vs bottom-quartile share.", SND),
            ("template +\nGMI Cloud LLM", "Fork engine", "4-beat shot list from the template; optional LLM polish of the spoken lines.", SPK),
            ("Next.js 16 · React 19\nTailwind v4", "Helix UI", "framer-motion views; live sequences file-cached so the demo survives bad wifi.", FMT)]
    for k, (tag, h5, p, col) in enumerate(data):
        cx = 245 + k * 286
        g = group(sh, f"station {k + 1}")
        text(g.shapes, cx - 143, 276, 286, 52, tag.split("\n"), size=10, color=MUTED, font=MONO, align="c", anchor="b")
        nd = oval(g.shapes, cx, 378, 42, BG, border=col, bw=3, glow=(col, 12, 0.35))
        shape_text(nd, f"{k + 1:02d}", size=13, bold=True, font=MONO, color=INK, align="c", inset=0)
        rect(g.shapes, cx - 125, 446, 250, 300, PANEL, border=BORDER, radius=18)
        text(g.shapes, cx - 105, 468, 210, 70, h5, size=15, bold=True, spc=-0.3)
        text(g.shapes, cx - 105, 540, 214, 200, p, size=12, color=MUTED)
        stations.append(g)
    cr = group(sh, "criterion")
    rect(cr.shapes, 120, 780, 1680, 180, PANEL, bgrad=GRAD, bw=2, radius=26)
    oval(cr.shapes, 168, 822, 6, LIME, grad=GRAD)
    text(cr.shapes, 184, 810, 700, 24, "JUDGING CRITERION #1 · VIDEO INTELLIGENCE", size=10, color=MUTED, bold=True, spc=2, anchor="m")
    text(cr.shapes, 160, 846, 700, 100, ["Every gene = an Oriane", "field + timestamp."], size=25, bold=True, spc=-0.8, lsp=0.95)
    chips_ = [("transcriptChunks[] @t", SPK), ("frames[].onScreenTextRegions · polygons", OCR), ("AI Vision probe @frame", VIS),
              ("audioTitle · original / copyrighted", SND), ("duration · views · followers", FMT)]
    rows_ = [chips_[:2], chips_[2:4], chips_[4:]]
    for r, row in enumerate(rows_):
        xr = 1760
        for lab_, col in reversed(row):
            w = len(lab_) * 12.2 + 50
            xr -= w
            chip(cr.shapes, xr, 806 + r * 48, lab_, INK, w=w, size=10, dotc=col, h=38)
            xr -= 10
    fx = [(eb, 100, "fade", 500), (tt, 200, "fade", 600), (rail, 500, "wipe", 2800)] + stagger(stations, 450, 470, "fade", 600)
    fx += [(pk, 3400 + i * 840, f"path:{1430 / 1920:.4f}", 4200) for i, pk in enumerate(packets)]
    fx += [(cr, 3300, "fade", 700)]
    add_timing(s, fx)

    # ---------------- 9 BUSINESS
    s, sh = new()
    eb = eyebrow(sh, 120, 92, "Business & moat")
    tt = title(sh, "Who pays on Monday.", size=40)
    prices = []
    for k, (who, amt, unit, p, hot) in enumerate([("Creators · Pro", "$19", " / mo", "Sequence your niche, fork your next video.", False),
                                                  ("Agencies · roster", "$499", " / mo per 50 creators", "Batch-forked Monday briefs for the whole roster.", True),
                                                  ("Brands · API", "Usage-based", "", "Metered on top of Oriane credits.", False)]):
        x = 120 + k * 570
        g = group(sh, f"price {k + 1}")
        if hot:
            rect(g.shapes, x, 250, 540, 240, PANEL, bgrad=GRAD, bw=2, radius=24)
        else:
            rect(g.shapes, x, 250, 540, 240, PANEL, border=BORDER, radius=24)
        text(g.shapes, x + 34, 280, 470, 26, who.upper(), size=10, bold=True, color=LIME if hot else MUTED, spc=2)
        text(g.shapes, x + 32, 318, 490, 90, [[(amt, {}), (unit, {"size": 14, "bold": False, "color": MUTED, "spc": 0})]],
             size=42 if k < 2 else 34, bold=True, spc=-1.6, anchor="m")
        text(g.shapes, x + 34, 420, 470, 56, p, size=13, color=MUTED)
        prices.append(g)
    mo = group(sh, "moat")
    rect(mo.shapes, 120, 520, 825, 420, PANEL, border=BORDER, radius=26)
    eyebrow(mo.shapes, 154, 552, "Moat + market", size=10, w=600)
    text(mo.shapes, 154, 590, 760, 50, "A gene-lift dataset that compounds.", size=20, bold=True, spc=-0.5)
    for i, (col, b, rest) in enumerate([(VIS, "Every sequence improves the priors", " for its niche. More users → sharper lift."),
                                        (OCR, "Only possible with multimodal indexing", ": caption tools see ~¼ of what's in a video."),
                                        (SPK, "Bottom-up:", " 1,000 agencies × $499/mo ≈ $6M ARR, before creators and API.")]):
        y = 660 + i * 88
        seg(mo.shapes, 154, y, 910, y, BORDER, 1.2)
        oval(mo.shapes, 160, y + 28, 5, col)
        text(mo.shapes, 182, y + 14, 720, 70, [[(b, {"bold": True, "color": INK}), (rest, {})]], size=13.5, color=MUTED)
    rt = group(sh, "red team")
    rect(rt.shapes, 975, 520, 825, 420, PANEL, border=BORDER, radius=26)
    eyebrow(rt.shapes, 1009, 552, "Red-teamed before we built it", size=10, w=700)
    text(rt.shapes, 1009, 590, 760, 50, "10 ideas · 100 judge-persona agents.", size=20, bold=True, spc=-0.5)
    bars = []
    for i, (nm, v, frac, col, vc) in enumerate([("Helix", "39", 1.0, None, None), ("Next best", "14", 14 / 39, "3A3A43", MUTED)]):
        y = 668 + i * 78
        text(rt.shapes, 1009, y, 150, 50, nm, size=14, bold=True, color=INK if i == 0 else MUTED, anchor="m")
        rect(rt.shapes, 1160, y + 3, 480, 44, "17171C", radius=12)
        bf = rect(sh, 1160, y + 3, 480 * frac, 44, col, grad=None if col else GRAD, radius=12)
        bars.append(bf)
        text(sh, 1650, y - 6, 120, 62, [[(v, {"grad": i == 0, "color": vc or INK})]], size=28, bold=True, align="r", anchor="m")
    for i, lab_ in enumerate(["first-place votes / 100", "9.1/10 on video-data usage", "personas modeled on this panel"]):
        chip(rt.shapes, 1009 + [0, 352, 0][i], 836 + [0, 0, 48][i], lab_, MUTED, w=[340, 384, 430][i], size=10, h=38)
    add_timing(s, [(eb, 100, "fade", 500), (tt, 200, "fade", 600)] + stagger(prices, 400, 150) +
               [(mo, 900, "fade", 600), (rt, 1050, "fade", 600)] + stagger(bars, 1500, 200, "wipe", 1200))

    # ---------------- 10 CLOSE
    s, sh = new()
    hx2 = helix(sh, 960, 960, 2000, 92, 3.4, -0.04, 44, horizontal=True, a=0.55, node=6, phase=0.4)
    eb = eyebrow(sh, 120, 120, "Helix")
    big = text(sh, 116, 170, 1020, 330, [[("Structure,", {})], [("never content.", {"grad": True})]], size=74, bold=True, spc=-3, lsp=0.92)
    sub = text(sh, 120, 510, 960, 50, "Like songs share chord progressions.", size=18, color=MUTED)
    repo = chip(sh, 120, 590, "github.com/vnmoorthy/helix", INK, w=560, size=15, h=70, fillc="111114")
    for shp in repo.shapes:  # whole pill clickable, without recoloring the text as a hyperlink
        shp.click_action.hyperlink.address = "https://github.com/vnmoorthy/helix"
    ty = text(sh, 120, 690, 900, 40, "Thank you. Questions welcome.", size=15, color=MUTED)
    ask = group(sh, "ask")
    rect(ask.shapes, 1160, 110, 640, 366, PANEL, border=BORDER, radius=26)
    eyebrow(ask.shapes, 1192, 140, "The ask", size=10, w=500)
    text(ask.shapes, 1192, 176, 580, 46, "Run it on your roster.", size=20, bold=True, spc=-0.5)
    for i, (b, rest) in enumerate([("3 agency pilots", " this month: one roster, 50 Monday briefs."),
                                   ("Oriane partnership", ": make gene-lift a shared, growing dataset."),
                                   ("Creators in the room", ": sequence your niche tonight.")]):
        y = 238 + i * 80
        seg(ask.shapes, 1192, y, 1768, y, BORDER, 1.2)
        text(ask.shapes, 1192, y + 16, 40, 24, f"{i + 1:02d}", size=10, bold=True, font=MONO, color=LIME)
        text(ask.shapes, 1236, y + 12, 530, 64, [[(b, {"bold": True, "color": INK}), (rest, {})]], size=13, color=MUTED)
    faqs = []
    for i, (q, a_) in enumerate([("“Isn't forking copying?”", "We copy structure, never content, the way songs share chord progressions."),
                                 ("“Do genes cause views?”", "We don't claim causation: lift with n, quartile share and timestamped receipts. Every fork is a testable hypothesis.")]):
        y = [492, 636][i]
        g = group(sh, f"faq {i + 1}")
        rect(g.shapes, 1160, y, 640, [128, 168][i], PANEL, border=BORDER, radius=22)
        text(g.shapes, 1190, y + 20, 580, 24, q, size=10.5, color=MUTED, font=MONO, bold=True)
        text(g.shapes, 1190, y + 50, 584, 110, a_, size=13, color=INK)
        faqs.append(g)
    add_timing(s, [(hx2, 200, "wipe", 2200), (eb, 100, "fade", 500), (big, 250, "fade", 900), (sub, 700, "fade", 600),
                   (ask, 800, "fade", 600), (repo, 1100, "fade", 600), (ty, 1300, "fade", 600)] + stagger(faqs, 1400, 200))

    # footers, notes, transitions
    for i, sl in enumerate(slides):
        if 0 < i < 9:
            footer(sl.shapes, i + 1)
        elif i == 9:
            footer(sl.shapes, i + 1, brand=False)
        sl.notes_slide.notes_text_frame.text = notes[i] if i < len(notes) else ""
        set_transition(sl, morph=i in (1, 5, 6))
        # transition must precede timing
        sld = sl._element
        tm = sld.find(qn("p:timing"))
        if tm is not None:
            sld.remove(tm)
            sld.append(tm)

    prs.core_properties.title = "Helix — Every viral video has a genome"
    prs.core_properties.author = "Helix team"
    prs.save(OUT)
    print("wrote", OUT, "| screenshots:", [f for f in ("niche.png", "genome.png", "fork.png") if os.path.exists(os.path.join(SCREENS, f))])


if __name__ == "__main__":
    build()
