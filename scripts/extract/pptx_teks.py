"""Ekstrak teks per slide + catatan pembicara dari PPTX, cetak JSON."""
import json
import sys

from pptx import Presentation


def teks_dari_bentuk(bentuk) -> list[str]:
    teks: list[str] = []
    if getattr(bentuk, "has_text_frame", False):
        for paragraf in bentuk.text_frame.paragraphs:
            baris = "".join(r.text for r in paragraf.runs).strip()
            if baris:
                teks.append(baris)
    if getattr(bentuk, "has_table", False):
        for baris in bentuk.table.rows:
            sel = [c.text.strip() for c in baris.cells]
            if any(sel):
                teks.append(" | ".join(sel))
    if getattr(bentuk, "shape_type", None) == 6:  # GROUP
        for sub in bentuk.shapes:
            teks.extend(teks_dari_bentuk(sub))
    return teks


def main() -> None:
    prs = Presentation(sys.argv[1])
    slides = []
    for n, slide in enumerate(prs.slides, start=1):
        teks: list[str] = []
        for bentuk in slide.shapes:
            teks.extend(teks_dari_bentuk(bentuk))
        catatan = ""
        if slide.has_notes_slide:
            catatan = slide.notes_slide.notes_text_frame.text.strip()
        slides.append({"n": n, "teks": teks, "catatan": catatan})
    json.dump({"slides": slides}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
