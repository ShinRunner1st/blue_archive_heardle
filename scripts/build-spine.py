"""
Copies a Spine character from a raw game export into public/spine/<id>/,
ready for the site: the .skel as it is, the texture as WebP (about a third
of the PNG's size), and the .atlas pointing at the WebP.

Needs Python 3 with Pillow (pip install pillow). Run from the project root:

    python scripts/build-spine.py <skel file> <id>

for example

    python scripts/build-spine.py art/arona/arona_spr.skel arona

The .atlas and its .png must sit next to the .skel under the same name.
"""

import shutil
import sys
from pathlib import Path

from PIL import Image

OUTPUT = Path("public/spine")


def build(skel: Path, character: str) -> None:
    atlas = skel.with_suffix(".atlas")
    out = OUTPUT / character
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)

    shutil.copyfile(skel, out / skel.name)

    lines = atlas.read_text(encoding="utf8").splitlines()
    textures = []
    for i, line in enumerate(lines):
        # A page starts with its texture's file name.
        if line.endswith(".png"):
            textures.append(line)
            lines[i] = line[: -len(".png")] + ".webp"
    (out / atlas.name).write_text("\n".join(lines) + "\n", encoding="utf8")

    for texture in textures:
        # `exact` keeps the colour under transparent pixels: the atlas is not
        # premultiplied, so filtering reads it at every edge.
        Image.open(atlas.parent / texture).save(
            out / (texture[: -len(".png")] + ".webp"),
            quality=92,
            method=6,
            exact=True,
        )

    total = sum(f.stat().st_size for f in out.iterdir())
    print(f"{character}: {total // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    build(Path(sys.argv[1]), sys.argv[2])
