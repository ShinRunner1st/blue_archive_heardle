"""
Unpacks the game's files that BA-AD downloaded, for the build scripts
(scripts/lib/gameFiles.mjs runs it): the pictures and text files inside Unity
asset bundles. (The voice lines' zips are opened by BA-AX.)

  python scripts/extract-game-files.py bundles <bundle dir> <out dir> [prefix ...]

Needs UnityPy, pinned in scripts/requirements.txt:
pip install -r scripts/requirements.txt.

bundles: every picture (as PNG) and text file (a sprite's .atlas and .skel)
in the bundles under <bundle dir>, or only those whose names start with a
prefix given. A picture in several bundles is taken from the newest, by the
date in the bundle's name. index.json in <out dir> lists each file by its
name in lower case, with a hash of its pixels (or bytes), so the build can
tell a picture that changed from one only encoded again.

Each bundle is unpacked once: done.json in <out dir> lists those done, by
name (which holds its checksum) and size.
"""

import hashlib
import json
import os
import re
import sys


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as file:
            return json.load(file)
    except (OSError, ValueError):
        return default


def save_json(path, value):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(value, file, indent=0, sort_keys=True)


def stamp(path):
    """A bundle, by its name and size: its name holds its checksum, and BA-AD
    downloads bundles again every run, so their times say nothing."""
    return f"{os.path.basename(path)}:{os.path.getsize(path)}"


def files_under(root, test):
    found = []
    for folder, _, names in os.walk(root):
        found.extend(os.path.join(folder, name) for name in names if test(name))
    return found


def bundle_date(path):
    """The date in a bundle's name, so a newer bundle's copy wins."""
    match = re.search(r"\d{4}-\d{2}-\d{2}", os.path.basename(path))
    return (match.group(0) if match else "", os.path.basename(path))


def safe_name(name):
    return re.sub(r"[^\w.\-]", "_", name)


def extract_bundles(source, out, prefixes):
    import UnityPy

    os.makedirs(out, exist_ok=True)
    done = set(load_json(os.path.join(out, "done.json"), []))
    index = load_json(os.path.join(out, "index.json"), {})
    bundles = sorted(
        files_under(source, lambda name: name.endswith(".bundle")), key=bundle_date
    )
    wanted = lambda name: not prefixes or name.startswith(tuple(prefixes))
    new = 0
    for path in bundles:
        key = stamp(path)
        if key in done:
            continue
        try:
            env = UnityPy.load(path)
        except Exception as error:  # A damaged download: BA-AD fetches it again.
            print(f"Could not open {os.path.basename(path)}: {error}", file=sys.stderr)
            continue
        for obj in env.objects:
            kind = obj.type.name
            if kind not in ("Texture2D", "TextAsset"):
                continue
            try:
                data = obj.read()
                name = data.m_Name
                if not name or not wanted(name):
                    continue
                if kind == "Texture2D":
                    image = data.image.convert("RGBA")
                    file = safe_name(name) + ".png"
                    image.save(os.path.join(out, file))
                    digest = hashlib.sha1(image.tobytes()).hexdigest()
                    size = [image.width, image.height]
                else:
                    raw = data.m_Script
                    if isinstance(raw, str):
                        raw = raw.encode("utf-8", "surrogateescape")
                    file = safe_name(name)
                    with open(os.path.join(out, file), "wb") as handle:
                        handle.write(bytes(raw))
                    digest = hashlib.sha1(bytes(raw)).hexdigest()
                    size = None
                index[name.lower()] = {"file": file, "hash": digest, "size": size}
            except Exception as error:  # One bad picture doesn't stop the rest.
                print(f"Skipped an object in {os.path.basename(path)}: {error}", file=sys.stderr)
        done.add(key)
        new += 1
    save_json(os.path.join(out, "index.json"), index)
    save_json(os.path.join(out, "done.json"), sorted(done))
    print(f"Unpacked {new} new bundle(s); {len(index)} files in {out}.")


if __name__ == "__main__":
    if len(sys.argv) < 4 or sys.argv[1] != "bundles":
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    extract_bundles(sys.argv[2], sys.argv[3], sys.argv[4:])
