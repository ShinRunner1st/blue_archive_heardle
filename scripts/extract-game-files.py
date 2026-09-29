"""
Unpacks the game's files that BA-AD downloaded, for the build scripts
(scripts/lib/gameFiles.mjs runs it): the pictures and text files inside Unity
asset bundles. (The voice lines' zips are opened by BA-AX.)

  python scripts/extract-game-files.py bundles <bundle dir> <out dir> [prefix ...]
  python scripts/extract-game-files.py models <bundle dir> <out dir> <model ...>

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

models: the halo of each 3D model named (the chibi the game battles with,
"aru_original", "ch0084"), from its meshes, materials and textures bundles
under <bundle dir>. <model>.json in <out dir> holds each piece of the halo:
its vertices where the model places them (Unity's axes: y up, the model
facing +z), its UVs, triangles and texture (a PNG beside it). The model's
own outline copies (OL_), effects (FX_) and cut-ins are left out. An empty
list when the model has no halo. Made again only when its bundles change.
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


def rotate(q, v):
    """v turned by the quaternion q (x, y, z, w)."""
    x, y, z, w = q
    matrix = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    return [sum(matrix[r][c] * v[c] for c in range(3)) for r in range(3)]


def placed(transform, point):
    """A mesh's vertex where the model puts it: through each Transform up to
    the model's root."""
    while transform is not None:
        s, r, p = transform.m_LocalScale, transform.m_LocalRotation, transform.m_LocalPosition
        point = rotate((r.x, r.y, r.z, r.w), [point[0] * s.x, point[1] * s.y, point[2] * s.z])
        point = [point[0] + p.x, point[1] + p.y, point[2] + p.z]
        father = transform.m_Father
        transform = father.read() if father and father.m_PathID else None
    return point


def ancestors(transform):
    """The names of the objects a Transform hangs from, itself first."""
    names = []
    while transform is not None:
        names.append(transform.m_GameObject.read().m_Name)
        father = transform.m_Father
        transform = father.read() if father and father.m_PathID else None
    return names


HALO_MESH = re.compile(r"halo", re.I)
NOT_HALO = re.compile(r"^(OL|FX)_|cutin", re.I)


def halo_pieces(env, model, out):
    """The model's halo pieces, as models' docs above say."""
    from UnityPy.helpers.MeshHelper import MeshHandler

    pieces = []
    for obj in env.objects:
        if obj.type.name != "MeshFilter":
            continue
        try:
            mesh_filter = obj.read()
            mesh = mesh_filter.m_Mesh.read()
        except Exception:  # A mesh in a bundle not downloaded: not the halo.
            continue
        name = mesh.m_Name
        if not HALO_MESH.search(name) or NOT_HALO.match(name):
            continue
        holder = mesh_filter.m_GameObject.read()
        parts = {c.type.name: c for c in holder.m_Components}
        if "MeshRenderer" not in parts or "Transform" not in parts:
            continue
        texture = None
        try:
            material = parts["MeshRenderer"].read().m_Materials[0].read()
            for key, env_tex in material.m_SavedProperties.m_TexEnvs:
                if key == "_MainTex":
                    texture = env_tex.m_Texture.read()
        except Exception:  # Its material or texture is elsewhere: drawn white.
            texture = None
        handler = MeshHandler(mesh)
        handler.process()
        if not handler.m_Vertices or not handler.m_UV0:
            continue
        transform = parts["Transform"].read()
        if any(NOT_HALO.search(above) for above in ancestors(transform)):
            continue
        texture_file = None
        if texture is not None:
            texture_file = safe_name(f"{model}.{texture.m_Name}") + ".png"
            texture.image.convert("RGBA").save(os.path.join(out, texture_file))
        pieces.append(
            {
                "name": name,
                "vertices": [placed(transform, list(v)) for v in handler.m_Vertices],
                "uvs": [list(uv[:2]) for uv in handler.m_UV0],
                "triangles": [list(t) for sub in handler.get_triangles() for t in sub],
                "texture": texture_file,
            }
        )
    # Models of students who share a scene carry the others' halos too; the
    # model's own are named after it where they're named at all. A mesh
    # placed twice is drawn once.
    prefix = model.split("_")[0].lower()
    own = [piece for piece in pieces if piece["name"].lower().startswith(prefix)]
    seen = set()
    kept = []
    for piece in own or pieces:
        if piece["name"] not in seen:
            seen.add(piece["name"])
            kept.append(piece)
    return kept


def extract_models(source, out, models):
    import UnityPy

    os.makedirs(out, exist_ok=True)
    bundles = files_under(source, lambda name: name.endswith(".bundle"))
    for model in models:
        mine = sorted(
            (
                path
                for path in bundles
                if f"_mx-characters-{model}-_mxdependency-" in os.path.basename(path)
            ),
            key=bundle_date,
        )
        file = os.path.join(out, f"{model}.json")
        if not mine:
            continue
        stamps = [stamp(path) for path in mine]
        if load_json(file, {}).get("stamps") == stamps:
            continue
        try:
            pieces = halo_pieces(UnityPy.load(*mine), model, out)
        except Exception as error:  # One bad model doesn't stop the rest.
            print(f"Could not read {model}'s model: {error}", file=sys.stderr)
            continue
        save_json(file, {"stamps": stamps, "pieces": pieces})
        print(f"{model}: {len(pieces)} halo piece(s).")


if __name__ == "__main__":
    commands = {"bundles": extract_bundles, "models": extract_models}
    if len(sys.argv) < 4 or sys.argv[1] not in commands:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    commands[sys.argv[1]](sys.argv[2], sys.argv[3], sys.argv[4:])
