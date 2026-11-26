"""Refonte d'une ancienne unité de texte au grain d'un niveau (voir SKILL.md, § 11).

Usage : PYTHONUTF8=1 python .claude/skills/unite-texte/refonte.py plan.yaml [--dry]

Le plan dit, leçon par leçon, ce que devient l'unité ; le script y remonte
les cartes existantes mot pour mot, mise en relief comprise. Une
carte-citation va d'elle-même dans la leçon dont le segment contient tous
ses trous, recentrée sur ce segment (elle garde son identifiant, donc sa
révision) ; si ses trous couvrent plusieurs segments, elle cite leur
réunion et va dans la leçon du dernier. Les autres cartes de l'ancienne
leçon vont dans le segment que nomme `x:` ou, à défaut, dans le dernier.

Plan :
  unit: content/courses/<cours>/units/<id>.yaml
  comment: "ligne ajoutée au commentaire d'en-tête"
  header: {title: …, depth: normale, intro: …}     # champs remplacés
  lessons:
  - keep: <id>              # ancienne leçon gardée ; title, notes, tables,
    notes: …                # add (cartes ajoutées à la fin), drop (ids), edit
  - new: {id: …, title: …, notes: …, passage: {label: …}, points: […]}
  - split: <id>             # ancienne leçon de texte, coupée en segments
    segments:
    - id: <id>              # nouvelle leçon ; la première garde d'ordinaire l'ancien id
      title: …
      upto: "fin du segment"  # le segment va jusqu'à cette chaîne incluse
      part: …               # facultatif
      notes: …
      x: [ids]              # cartes non-citation à placer ici
      add: […]              # nouvelles cartes, à la fin
      tables: […]
    drop: [ids]
    edit: {<id>: {sentence: …, answer: …}}
"""
import json
import re
import sys

import yaml

MARK = re.compile(r"\*\*|__")


def norm(s):
    s = s.replace(" ", " ").replace(" ", " ")
    s = s.replace("“", '"').replace("”", '"').replace("«", '"').replace("»", '"')
    s = s.replace("’", "'")
    s = re.sub(r'" +', '"', s)
    s = re.sub(r' +"', '"', s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def plain_map(text):
    """Texte sans ** ni __, et pour chaque caractère gardé sa position d'origine."""
    out, pos, i = [], [], 0
    while i < len(text):
        m = MARK.match(text, i)
        if m and text[i:i + 3] != "___":
            i = m.end()
            continue
        out.append(text[i])
        pos.append(i)
        i += 1
    return "".join(out), pos


def is_citation(p):
    s = p["sentence"].strip()
    return s.startswith("«") and s.rstrip("*_ ").endswith("»") or p.get("citation")


def fill(sentence, answer):
    parts = sentence.split("___")
    answers = [a.strip() for a in answer.split(" ; ")] if len(parts) > 2 else [answer]
    if len(answers) != len(parts) - 1:
        return None, None
    text, blanks = parts[0], []
    for a, rest in zip(answers, parts[1:]):
        blanks.append((len(text), len(text) + len(a)))
        text += a + rest
    return text, blanks


def recentre(p, passage, segs, edits):
    """Rend (index du dernier segment, carte recentrée) ou (None, None)."""
    if p["id"] in edits:
        p = {**p, **edits[p["id"]]}
    body = p["sentence"].strip()
    body = re.sub(r"^«\s*", "", body)
    body = re.sub(r"\s*»\s*$", "", body)
    # ne garde que la carte : les trous restent marqués par ___
    filled, blanks = fill(body, p["answer"])
    if filled is None:
        return None, None
    plain, pos = plain_map(filled)
    # positions des trous dans le texte sans marques
    inv = {o: k for k, o in enumerate(pos)}
    pblanks = []
    for a, b in blanks:
        ka = next(k for k in range(len(pos)) if pos[k] >= a)
        kb = next((k for k in range(len(pos)) if pos[k] >= b), len(pos))
        pblanks.append((ka, kb))
    # aligne le texte de la carte sur le passage, caractère par caractère normalisé
    np_, npos = [], []
    for k, c in enumerate(plain):
        c2 = norm(c) if c.strip() else " "
        if c in "«»“”":
            c2 = '"'
        np_.append(c2 if c2 else " ")
        npos.append(k)
    card_n = norm("".join(np_))
    pass_n = norm(passage)
    start = pass_n.find(card_n)
    if start < 0:
        return None, None
    # correspondance index normalisé de la carte -> index dans plain
    cmap, buf = [], ""
    for k, c in enumerate(plain):
        cc = '"' if c in "«»“”" else (" " if not c.strip() else c)
        cand = norm(buf + cc)
        while len(cmap) < len(cand):
            cmap.append(k)
        buf += cc
    seg_idx = []
    for ka, kb in pblanks:
        na = next(i for i, k in enumerate(cmap) if k >= ka) + start
        nb = (next((i for i, k in enumerate(cmap) if k >= kb), len(cmap)) + start)
        for si, (sa, sb) in enumerate(segs):
            if sa <= na < sb:
                seg_idx.append(si)
                break
        else:
            return None, None
        for si, (sa, sb) in enumerate(segs):
            if sa < nb <= sb:
                seg_idx.append(si)
                break
    lo, hi = min(seg_idx), max(seg_idx)
    ca, cb = segs[lo][0] - start, segs[hi][1] - start
    ca, cb = max(ca, 0), min(cb, len(cmap))
    pa = cmap[ca] if ca < len(cmap) else len(plain)
    pb = cmap[cb - 1] + 1 if cb > 0 else 0
    oa = pos[pa] if pa < len(pos) else len(filled)
    ob = pos[pb - 1] + 1 if pb > 0 else 0
    cut = filled[oa:ob]
    # rétablit les trous dans le morceau coupé
    out = cut
    for (a, b), ans in sorted(zip(blanks, [x.strip() for x in p["answer"].split(" ; ")] if len(blanks) > 1 else [p["answer"]]), reverse=True):
        if oa <= a and b <= ob:
            out = out[:a - oa] + "___" + out[b - oa:]
    # équilibre les marques coupées
    for tok in ("**", "__"):
        n = len(re.findall(re.escape(tok) if tok == "**" else r"(?<!_)__(?!_)", out))
        if n % 2:
            idx = [m.start() for m in re.finditer(re.escape(tok) if tok == "**" else r"(?<!_)__(?!_)", out)]
            first_open = out.find(tok)
            # retire la marque orpheline la plus proche d'un bord
            j = idx[0] if idx[0] < len(out) - idx[-1] else idx[-1]
            out = out[:j] + out[j + 2:]
    out = out.strip()
    q = dict(p)
    q.pop("fragment", None)
    q["sentence"] = "« " + out + " »"
    return hi, q


def insert_after(pts, after):
    """Insère des cartes juste après celles qu'elles prolongent (ordre du commentaire)."""
    for anchor, cards in (after or {}).items():
        k = next((i for i, p in enumerate(pts) if p["id"] == anchor), None)
        if k is None:
            sys.exit(f"after : carte introuvable {anchor}")
        pts[k + 1:k + 1] = cards
    return pts


def dump(obj, ind=0):
    sp = " " * ind
    lines = []
    for k, v in obj.items():
        if isinstance(v, str):
            if "\n" in v or k in ("notes", "intro"):
                lines.append(f"{sp}{k}: |-")
                lines += [(sp + "  " + l) if l else "" for l in v.split("\n")]
            else:
                lines.append(f"{sp}{k}: {json.dumps(v, ensure_ascii=False)}")
        elif isinstance(v, bool) or isinstance(v, (int, float)) and not isinstance(v, bool):
            lines.append(f"{sp}{k}: {json.dumps(v)}")
        elif isinstance(v, dict):
            lines.append(f"{sp}{k}:")
            lines += dump(v, ind + 2)
        elif isinstance(v, list):
            if not v:
                lines.append(f"{sp}{k}: []")
            elif all(isinstance(x, str) for x in v):
                lines.append(f"{sp}{k}: [{', '.join(json.dumps(x, ensure_ascii=False) for x in v)}]")
            else:
                lines.append(f"{sp}{k}:")
                for x in v:
                    if isinstance(x, dict) and k == "exercises":
                        lines.append(f"{sp}- {{{', '.join(f'{a}: {b}' for a, b in x.items())}}}")
                    else:
                        sub = dump(x, ind + 2)
                        lines.append(f"{sp}- " + sub[0].lstrip())
                        lines += sub[1:]
        elif v is None:
            lines.append(f"{sp}{k}:")
    return lines


def main():
    plan = yaml.safe_load(open(sys.argv[1], encoding="utf-8"))
    path = plan["unit"]
    raw = open(path, encoding="utf-8").read().replace("\r\n", "\n")
    head = "".join(l + "\n" for l in raw.split("\n") if l.startswith("#") and raw.index(l) < raw.index("\nid:") + 1)
    unit = yaml.safe_load(raw)
    old = {l["id"]: l for l in unit["lessons"]}
    used, report, lessons = set(), [], []
    usedp = {}
    allpts = {p["id"]: p for l in unit["lessons"] for p in l.get("points", [])}
    taken = {pid for it in plan["lessons"] if "new" in it for pid in it["new"].get("take", [])}

    for item in plan["lessons"]:
        if "new" in item:
            l = dict(item["new"])
            take = l.pop("take", [])
            pts = l.get("points", [])
            l["points"] = [allpts[i] for i in take] + pts
            used |= set(take) | {p["id"] for p in pts}
            lessons.append(l)
            continue
        if "keep" in item:
            l = dict(old[item["keep"]])
            for f in ("title", "notes", "tables", "aside"):
                if f in item:
                    l[f] = item[f]
            if item.get("append"):
                l["notes"] = (l.get("notes") or "").rstrip() + "\n\n" + item["append"].strip()
            if "passage" in item:
                l["passage"] = {**l.get("passage", {}), **item["passage"]}
            drop = set(item.get("drop", []))
            edits = item.get("edit", {})
            pts = [{**p, **edits.get(p["id"], {})} for p in l.get("points", []) if p["id"] not in drop]
            pts += item.get("add", [])
            l["points"] = insert_after(pts, item.get("after"))
            used |= {p["id"] for p in old[item["keep"]].get("points", [])}
            lessons.append(l)
            continue
        src = old[item["split"]]
        text = src["passage"]["text"]
        tn = norm(text)
        segs, cur, segtexts = [], 0, []
        rest = text
        for s in item["segments"]:
            if "upto" in s:
                k = rest.find(s["upto"])
                if k < 0:
                    sys.exit(f"upto introuvable : {s['upto']!r} dans {item['split']}")
                piece, rest = rest[:k + len(s["upto"])], rest[k + len(s["upto"]):]
            else:
                piece, rest = rest, ""
            segtexts.append(piece.strip())
        if rest.strip():
            sys.exit(f"texte restant après le dernier segment de {item['split']} : {rest[:60]!r}")
        for st in segtexts:
            a = tn.find(norm(st), cur)
            segs.append((cur if segs else a, a + len(norm(st))))
            cur = a + len(norm(st))
        drop = set(item.get("drop", []))
        edits = item.get("edit", {})
        buckets = [[] for _ in segs]
        xs = {pid: i for i, s in enumerate(item["segments"]) for pid in s.get("x", [])}
        for p in src.get("points", []):
            used.add(p["id"])
            if p["id"] in drop or p["id"] in taken:
                continue
            if p["id"] in xs:
                buckets[xs[p["id"]]].append({**p, **edits.get(p["id"], {})})
            elif is_citation(p):
                i, q = recentre(p, text, segs, edits)
                if i is None:
                    report.append(f"non placée, laissée au dernier segment : {p['id']}")
                    buckets[-1].append(p)
                else:
                    buckets[i].append(q)
            else:
                buckets[-1].append({**p, **edits.get(p["id"], {})})
        for s, st, b in zip(item["segments"], segtexts, buckets):
            passage = {"label": src["passage"]["label"]}
            if s.get("part") or src["passage"].get("part"):
                passage["part"] = s.get("part", src["passage"].get("part"))
            if src["passage"].get("source"):
                passage["source"] = src["passage"]["source"]
            passage["text"] = st
            l = {"id": s["id"], "title": s["title"]}
            if s.get("aside"):
                l["aside"] = s["aside"]
            if "paras" in s:
                paras = [x for x in re.split(r"\n\s*\n", (src.get("notes") or "").strip()) if x.strip()]
                usedp.setdefault(item["split"], (len(paras), set()))[1].update(s["paras"])
                body = [paras[i] for i in s["paras"]]
                l["notes"] = "\n\n".join(([s["prepend"]] if s.get("prepend") else []) + body + ([s["append"]] if s.get("append") else []))
            else:
                l["notes"] = s["notes"]
            l["passage"] = passage
            if s.get("tables"):
                l["tables"] = s["tables"]
            cit = [p for p in b if is_citation(p)]
            oth = [p for p in b if not is_citation(p)]
            l["points"] = insert_after(cit + oth + s.get("add", []), s.get("after"))
            lessons.append(l)

    for sid, (n, got) in usedp.items():
        miss = sorted(set(range(n)) - got)
        if miss:
            report.append(f"paragraphes du rappel de {sid} non repris : {miss}")
    lost = [p["id"] for l in unit["lessons"] for p in l.get("points", []) if p["id"] not in used]
    if lost:
        report.append("cartes d'anciennes leçons non reprises : " + ", ".join(lost))
    ids = [p["id"] for l in lessons for p in l.get("points", [])]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        report.append("identifiants en double : " + ", ".join(sorted(dup)))

    for k, v in plan.get("header", {}).items():
        unit[k] = v
    order = ["id", "title", "subtitle", "icon", "color", "group", "depth", "intro"]
    hdr = {k: unit[k] for k in order if k in unit}
    hdr.update({k: v for k, v in unit.items() if k not in order and k != "lessons"})
    if plan.get("comment"):
        head += "".join("# " + l + "\n" for l in plan["comment"].strip().split("\n"))
    out = head + "\n" + "\n".join(dump(hdr)) + "\nlessons:\n"
    for l in lessons:
        sub = dump(l, 2)
        out += "- " + sub[0].lstrip() + "\n" + "\n".join(sub[1:]) + "\n"
    for r in report:
        print(r)
    print(f"{len(lessons)} leçons, {len(ids)} cartes (avant : {len(unit['lessons'])} leçons, "
          f"{sum(len(l.get('points', [])) for l in unit['lessons'])} cartes)")
    if "--dry" not in sys.argv:
        open(path, "w", encoding="utf-8", newline="").write(out)


if __name__ == "__main__":
    main()
