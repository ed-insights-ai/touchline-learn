#!/usr/bin/env python3
"""Generate the Prairie Lakes sample data home.

Everything here is invented: the conference, the schools, the players, the
scores and the web pages. Nothing is copied from a real dataset. The files
follow the field names and layout of Touchline's season files so the labs
exercise the same shapes the real platform uses.

The generator is deterministic. It uses one seeded random stream per unit and
no clock, so running it twice writes byte-identical files:

    python sample/generate.py            # rewrite sample/
    python sample/generate.py --check    # exit 1 if the committed files differ

Standard library only.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import random
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONF = "PLC"
CONF_NAME = "Prairie Lakes Conference"
SEASONS = (2025, 2026)
GENDERS = ("men", "women")
COLLECTED = {2025: "2025-12-16T12:30:00+00:00", 2026: "2026-11-20T12:30:00+00:00"}
SHADOW_COLLECTED = "2026-11-23T09:05:00+00:00"

# slug: (display name, abbreviation, nickname, city, platform, names as published)
MEMBERS = {
    "alder-ridge": ("Alder Ridge", "ARU", "Herons", "Alder Ridge, Minn.", "tally",
                    ["Alder Ridge", "Alder Ridge Univ."]),
    "brightwater-state": ("Brightwater State", "BSU", "Pike", "Brightwater, S.D.", "tally",
                          ["Brightwater State", "Brightwater St.", "BSU"]),
    "cedar-hollow": ("Cedar Hollow", "CHU", "Foxes", "Cedar Hollow, Iowa", "pressbox",
                     ["Cedar Hollow", "Cedar Hollow (Iowa)"]),
    "dunmore": ("Dunmore", "DUN", "Drovers", "Dunmore, Neb.", "tally",
                ["Dunmore", "Dunmore College"]),
    "eastmarch-state": ("Eastmarch State", "EMSU", "Marshals", "Eastmarch, N.D.", "pressbox",
                        ["Eastmarch State", "Eastmarch St.", "EMSU"]),
    "fallow-point": ("Fallow Point", "FPU", "Kestrels", "Fallow Point, Minn.", "tally",
                     ["Fallow Point", "Fallow Pt."]),
    "st-oswin": ("St. Oswin", "SOU", "Monks", "Oswin Falls, Wis.", "pressbox",
                 ["St. Oswin", "Saint Oswin", "St. Oswin (Wis.)"]),
    "hartwell-tech": ("Hartwell Tech", "HTU", "Gears", "Hartwell, Iowa", "tally",
                      ["Hartwell Tech", "Hartwell Technical"]),
}
# Opponents from outside the conference. Their sites are not collected.
NON_MEMBERS = {
    "westmarch-state": ("Westmarch State", "WMSU", ["Westmarch State", "Westmarch St."]),
    "lakeshore-am": ("Lakeshore A&M", "LAM", ["Lakeshore A&M", "Lakeshore A&M (Minn.)"]),
    "pine-barrens": ("Pine Barrens", "PBU", ["Pine Barrens"]),
    "north-quarry": ("North Quarry", "NQC", ["North Quarry", "North Quarry College"]),
    "st-brannoc": ("St. Brannoc", "SBC", ["St. Brannoc", "Saint Brannoc"]),
    "oswin-state": ("Oswin State", "OSU", ["Oswin State", "Oswin St."]),
}
# Hartwell Tech joined in 2026. Before that it played as an independent.
MEMBERS_BY_SEASON = {
    2025: [s for s in MEMBERS if s != "hartwell-tech"],
    2026: list(MEMBERS),
}
# Planned gaps, so the coverage record has every state to teach with.
# (season, gender, slug, layer) -> (state, reason)
GAPS: dict[tuple[int, str, str, str], tuple[str, str]] = {}
for g in GENDERS:
    for layer in ("schedule", "roster", "stats", "matches"):
        GAPS[(2025, g, "dunmore", layer)] = (
            "no-collector", "dunmore: site ran on a platform with no reader in 2025")
GAPS[(2025, "men", "fallow-point", "matches")] = (
    "unavailable", "[2025] box score pages are no longer served")
GAPS[(2025, "men", "eastmarch-state", "schedule")] = (
    "unavailable", "[2025] cannot prove which season was served")
GAPS[(2025, "men", "eastmarch-state", "matches")] = (
    "unavailable", "[2025] no proven schedule to take box-score links from")
GAPS[(2025, "women", "st-oswin", "stats")] = (
    "empty", "[2025] the 2025 statistics page proved its season but listed no players")

FIRST = {
    "men": ["Aldo", "Bram", "Caius", "Dov", "Emeric", "Fenn", "Garrick", "Hale", "Ilan", "Joss",
            "Kell", "Lorne", "Maro", "Nils", "Orrin", "Pax", "Quill", "Rafe", "Soren", "Teague",
            "Ulric", "Vance", "Wim", "Yarrow", "Zeke", "Anselm", "Corwin", "Dax", "Evander", "Tobin"],
    "women": ["Ada", "Brisa", "Calla", "Dessa", "Elin", "Fia", "Greer", "Hollis", "Ines", "Juno",
              "Kaia", "Linnea", "Mara", "Nell", "Oona", "Petra", "Quinn", "Romy", "Signe", "Tamsin",
              "Una", "Vesna", "Wren", "Yael", "Zadie", "Annika", "Corin", "Delphine", "Esme", "Thea"],
}
SYL_A = ["Bar", "Cal", "Dor", "Fen", "Gar", "Hal", "Jor", "Kes", "Lam", "Mer", "Nor", "Os", "Pel",
         "Quen", "Ros", "Sel", "Tor", "Ul", "Var", "Wes", "Yar", "Zel", "Ash", "Bren", "Cor", "Thal"]
SYL_B = ["a", "e", "i", "o", "u", "an", "en", "in", "or", "el", "ar", "et"]
SYL_C = ["dane", "wick", "more", "stad", "by", "ren", "vik", "holt", "mark", "ley", "quist", "sen",
         "ford", "ster", "lund", "nell", "rick", "bell"]
TOWNS = ["Marrow Creek", "Tallgrass", "Coldwater Bend", "Larkspur", "Iron Fork", "Sable Lake",
         "Quarry Hill", "Wren Hollow", "Stonebridge", "Hazel Run", "Redfern", "Mill Prairie"]
STATES = ["Minn.", "Iowa", "S.D.", "N.D.", "Neb.", "Wis."]
CLASSES = ["Freshman", "Sophomore", "Junior", "Senior"]
POSITIONS = ["GK"] * 2 + ["D"] * 6 + ["M"] * 6 + ["F"] * 6


def rng_for(*parts: object) -> random.Random:
    """One reproducible random stream per named thing."""
    return random.Random(zlib.crc32("/".join(str(p) for p in parts).encode()))


def poisson(rng: random.Random, lam: float) -> int:
    limit, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limit:
            return k
        k += 1


def name_of(slug: str) -> str:
    return MEMBERS[slug][0] if slug in MEMBERS else NON_MEMBERS[slug][0]


def abbr_of(slug: str) -> str:
    return MEMBERS[slug][1] if slug in MEMBERS else NON_MEMBERS[slug][1]


def site(slug: str) -> str:
    return f"https://athletics.{slug}.example"


def sport(gender: str) -> str:
    return "mens-soccer" if gender == "men" else "womens-soccer"


def squad(slug: str, gender: str, season: int) -> list[dict]:
    """A 20-player squad. Three quarters of it carries over between seasons."""
    players = []
    for i, pos in enumerate(POSITIONS):
        cohort = season if rng_for("stay", slug, gender, i, season).random() < 0.25 else 2025
        r = rng_for("player", slug, gender, i, cohort)
        first = r.choice(FIRST[gender])
        last = r.choice(SYL_A) + r.choice(SYL_B) + r.choice(SYL_C)
        pid = str(1000 + zlib.crc32(f"{slug}/{gender}/{i}/{cohort}".encode()) % 9000)
        players.append({
            "name": f"{first} {last}", "player_id": pid, "number": str(i if i else 1) if i < 2 else str(i + 1),
            "position": pos, "height": f"{r.randint(5, 6)}'{r.randint(0, 11)}\"",
            "hometown": f"{r.choice(TOWNS)}, {r.choice(STATES)}",
            "class_year": CLASSES[(season - cohort + r.randint(0, 2)) % 4],
        })
    players[0]["number"], players[1]["number"] = "1", "30"
    return players


def strength(slug: str, gender: str, season: int) -> float:
    if (slug, gender, season) == ("fallow-point", "men", 2025):
        return 2.3  # deliberately the highest-scoring side; see the coverage lab
    return 0.8 + rng_for("strength", slug, gender, season).random() * 1.1


def round_robin(teams: list[str]) -> list[list[tuple[str, str]]]:
    ts = list(teams) + ([None] if len(teams) % 2 else [])
    n, rounds = len(ts), []
    for r in range(n - 1):
        pairs = []
        for i in range(n // 2):
            a, b = ts[i], ts[n - 1 - i]
            if a and b:
                pairs.append((a, b) if (r + i) % 2 == 0 else (b, a))
        rounds.append(pairs)
        ts = [ts[0]] + [ts[-1]] + ts[1:-1]
    return rounds + [[(b, a) for a, b in rnd] for rnd in rounds]


def add_days(season: int, day: int) -> str:
    """Day 0 is 21 August of the season."""
    months = [(8, 31), (9, 30), (10, 31), (11, 30), (12, 31)]
    d = 21 + day
    for m, length in months:
        if d <= length:
            return f"{season}-{m:02d}-{d:02d}"
        d -= length
    raise ValueError(day)


def collected(season: int, gender: str, slug: str, layer: str) -> bool:
    return slug in MEMBERS and (season, gender, slug, layer) not in GAPS


def build_unit(season: int, gender: str) -> dict:
    """Simulate one season of one gender. Returns every file's content."""
    rng = rng_for("unit", season, gender)
    members = MEMBERS_BY_SEASON[season]
    others = list(NON_MEMBERS) + [s for s in MEMBERS if s not in members]
    games: list[dict] = []

    def game(day, home, away, **extra):
        games.append({"day": day, "home": home, "away": away, **extra})

    # Preseason exhibitions, then non-conference games, then the double round robin.
    for i, slug in enumerate(members[:4]):
        game(i % 2, slug, others[i % len(others)], match_type="exhibition")
    for i, slug in enumerate(members):
        for k in range(3):
            opp = others[(i + k * 2 + (season % 2)) % len(others)]
            home, away = (slug, opp) if (i + k) % 2 == 0 else (opp, slug)
            game(4 + k * 4 + i % 3, home, away)
    for r, pairs in enumerate(round_robin(members)):
        for home, away in pairs:
            game(18 + r * 4 + (r % 2), home, away, conference_game=True)

    def publisher(g):
        """The collected site that lists this game, home side first. None if neither does."""
        for side in (g["home"], g["away"]):
            if collected(season, gender, side, "schedule"):
                return side
        return None

    def play(g, decide=False):
        r = rng_for("game", season, gender, g["home"], g["away"], g["day"])
        lam_h = strength(g["home"], gender, season) * 1.15
        lam_a = strength(g["away"], gender, season)
        hs, as_ = poisson(r, lam_h), poisson(r, lam_a)
        periods = [[r.randint(0, hs)], [r.randint(0, as_)]]
        periods[0].append(hs - periods[0][0])
        periods[1].append(as_ - periods[1][0])
        if decide and hs == as_:
            w = r.randint(0, 1)
            periods[w].append(1)
            periods[1 - w].append(0)
            hs, as_ = hs + (w == 0), as_ + (w == 1)
        g.update(home_score=hs, away_score=as_, periods=periods)

    for g in games:
        play(g)

    # Standings decide the four-team tournament.
    table = {s: [0, 0] for s in members}
    for g in games:
        if g.get("conference_game"):
            h, a = g["home_score"], g["away_score"]
            table[g["home"]][0] += 3 if h > a else 1 if h == a else 0
            table[g["away"]][0] += 3 if a > h else 1 if h == a else 0
            table[g["home"]][1] += h - a
            table[g["away"]][1] += a - h
    seeds = sorted(members, key=lambda s: (-table[s][0], -table[s][1], s))[:4]
    tourney = f"{season} {CONF} {'Men' if gender == 'men' else 'Women'}'s Soccer Tournament"
    semis = []
    for hi, lo in ((0, 3), (1, 2)):
        g = {"day": 86, "home": seeds[hi], "away": seeds[lo], "conference_game": False, "neutral": False,
             "stage": {"phase": "postseason", "competition": "conference", "source": tourney,
                       "round_published": "Semifinals"}}
        play(g, decide=True)
        semis.append(g)
        games.append(g)
    winners = [g["home"] if g["home_score"] > g["away_score"] else g["away"] for g in semis]
    final = {"day": 93, "home": winners[0], "away": winners[1], "conference_game": False, "neutral": True,
             "stage": {"phase": "postseason", "competition": "conference", "source": tourney,
                       "round_published": "Championship"}}
    play(final, decide=True)
    games.append(final)

    # Number the games per publishing site, as a site's own ids would be.
    games.sort(key=lambda g: (g["day"], g["home"], g["away"]))
    counters: dict[str, int] = {}
    for g in games:
        pub = publisher(g)
        g["publisher"] = pub
        if pub:
            base = 3000 + zlib.crc32(f"{pub}/{gender}".encode()) % 6000 + (season - 2025) * 40
            counters[pub] = counters.get(pub, 0) + 1
            g["id"] = f"{MEMBERS[pub][4]}:{pub}:{base + counters[pub]}"
            g["date"] = add_days(season, g["day"])

    listed = [g for g in games if g["publisher"]]

    # What was still to be played when the 2026 files were collected.
    late = set()
    if season == 2026:
        late.add(final["id"])
        regular = [g for g in listed if g.get("conference_game")]
        for g in regular[-2:]:
            g["day"], g["date"], g["makeup"] = 92, add_days(season, 92), True
            late.add(g["id"])
    # One final whose score the site never printed.
    silent = next(g for g in listed if g.get("conference_game") and g["day"] > 30)["id"] \
        if (season, gender) == (2026, "men") else None

    rosters = {s: squad(s, gender, season) for s in set(members) | set(others)}
    season_lines: dict[str, dict[str, dict]] = {s: {} for s in members}
    matches, fixtures = {}, []

    def line(slug, p):
        return season_lines[slug].setdefault(p["player_id"], {
            "name": p["name"], "player_id": p["player_id"], "number": p["number"],
            "gp": 0, "gs": 0, "minutes": 0, "goals": 0, "assists": 0, "shots": 0, "sog": 0,
            "game_winners": 0, "yellow": 0, "red": 0, "goals_against": 0, "saves": 0,
            "wins": 0, "losses": 0, "ties": 0, "pos": p["position"]})

    for g in listed:
        played = g["id"] not in late
        f = {"id": g["id"], "date": g["date"], "home": g["home"], "away": g["away"],
             "status": "final" if played else "scheduled",
             "source_url": f"{site(g['publisher'])}/sports/{sport(gender)}/schedule/{season}",
             "conference_game": bool(g.get("conference_game")),
             "stage": g.get("stage", {"phase": "regular"})}
        if g.get("match_type"):
            f["match_type"] = g["match_type"]
            del f["stage"]
        if g.get("neutral"):
            f["neutral"] = True
        f["time"] = "19:00" if g["day"] % 2 else "13:00"
        f["venue"] = "Lakefront Stadium" if g.get("neutral") else f"{name_of(g['home'])} Soccer Field"
        if played and g["id"] != silent:
            f["home_score"], f["away_score"] = g["home_score"], g["away_score"]
        fixtures.append(f)
        if not played:
            continue

        # The box score: simulated for every played game, kept only where the
        # publishing site's box scores were collected.
        r = rng_for("box", g["id"])
        length = 90 + 20 * (len(g["periods"][0]) > 2)
        teams, scoring, cards, plays = [], [], [], []
        sides = (g["home"], g["away"])
        goals = (g["home_score"], g["away_score"])
        for t, slug in enumerate(sides):
            sq = rosters[slug]
            keeper = sq[0] if r.random() < 0.8 else sq[1]
            outfield = r.sample(sq[2:], 13)
            starters, subs = outfield[:10], outfield[10:]
            sog = goals[t] + poisson(r, 3.0)
            shots = sog + poisson(r, 4.5)
            plines = {}
            for p in starters + subs:
                mins = length - r.choice([0, 0, 0, 20, 30]) if p in starters else r.choice([20, 30])
                plines[p["player_id"]] = {
                    "name": p["name"], "player_id": p["player_id"], "position": p["position"],
                    "number": p["number"], "started": p in starters, "shots": 0, "sog": 0,
                    "goals": 0, "assists": 0, "minutes": mins,
                    "player_ref": {"id": p["player_id"], "source": "page"}}
            weights = [3 if p["position"] == "F" else 2 if p["position"] == "M" else 1 for p in starters + subs]
            pool = starters + subs
            for _ in range(goals[t]):
                scorer = r.choices(pool, weights)[0]
                helper = r.choices(pool, weights)[0]
                minute = r.randint(1, length - 1)
                plines[scorer["player_id"]]["goals"] += 1
                item = {"time": f"{minute:02d}:{r.randint(0, 59):02d}", "team": t, "scorer": scorer["name"]}
                if helper is not scorer and r.random() < 0.7:
                    plines[helper["player_id"]]["assists"] += 1
                    item["assist"] = helper["name"]
                item["description"] = r.choice(["Header from the six", "Low shot to the far post",
                                                "Finish from a corner", "Penalty kick", "Shot from distance"])
                scoring.append(item)
            for i in range(shots):
                p = r.choices(pool, weights)[0]
                plines[p["player_id"]]["shots"] += 1
                if i < sog:
                    plines[p["player_id"]]["sog"] += 1
            for pl in plines.values():  # a goal is a shot on goal
                pl["sog"] = max(pl["sog"], pl["goals"])
                pl["shots"] = max(pl["shots"], pl["sog"])
            sog = sum(pl["sog"] for pl in plines.values())
            shots = sum(pl["shots"] for pl in plines.values())
            for _ in range(poisson(r, 1.4)):
                p = r.choice(pool)
                roll = r.random()
                cards.append({"type": "red" if roll < 0.06 else "unknown" if roll < 0.09 else "yellow",
                              "player": p["name"], "number": p["number"],
                              "time": f"{r.randint(5, length - 1):02d}:{r.randint(0, 59):02d}", "team": t})
            teams.append({
                "name": r.choice((MEMBERS.get(slug) or NON_MEMBERS[slug])[-1]),
                "abbr": abbr_of(slug), "score": goals[t], "periods": g["periods"][t],
                "shots": shots, "sog": sog, "saves": 0, "corners": poisson(r, 4.5), "fouls": poisson(r, 10),
                "players": list(plines.values()),
                "keepers": [{"name": keeper["name"], "player_id": keeper["player_id"], "position": "GK",
                             "number": keeper["number"], "minutes": length, "goals_against": goals[1 - t],
                             "saves": 0, "player_ref": {"id": keeper["player_id"], "source": "page"}}]})
            if r.random() < 0.3:  # rankings ride along in front of some published names
                teams[-1]["name"] = r.choice(["#9 ", "No. 14 ", "RV ", "(3) "]) + teams[-1]["name"]
        for t in (0, 1):
            saves = teams[1 - t]["sog"] - goals[1 - t]
            teams[t]["saves"] = teams[t]["keepers"][0]["saves"] = saves
            if goals[t] != goals[1 - t]:
                teams[t]["winner"] = goals[t] > goals[1 - t]
        scoring.sort(key=lambda s: s["time"])
        cards.sort(key=lambda c: c["time"])
        for s in scoring:
            who = teams[s["team"]]["abbr"]
            text = f"GOAL by {who} {s['scorer']}"
            if s["description"] == "Penalty kick":
                text = f"PENALTY KICK GOAL by {who} {s['scorer']}"
            if "assist" in s:
                text += f", Assist by {s['assist']}"
            plays.append({"period": "1" if s["time"] < "45" else "2" if s["time"] < "90" else "OT",
                          "text": text + ".", "clock": s["time"], "team": s["team"], "type": "goal"})
        for c in cards:
            label = {"yellow": "Yellow card", "red": "Red card", "unknown": "Card"}[c["type"]]
            play_ = {"period": "1" if c["time"] < "45" else "2" if c["time"] < "90" else "OT",
                     "text": f"{label} on {teams[c['team']]['abbr']} {c['player']}.",
                     "clock": c["time"], "team": c["team"]}
            if c["type"] != "unknown":
                play_["type"] = c["type"]
            plays.append(play_)
        plays.append({"period": "1", "text": "Kickoff delayed ten minutes for lightning in the area.",
                      "clock": "00:00"})
        plays.sort(key=lambda p: p["clock"])
        box = {"source_url": f"{site(g['publisher'])}/sports/{sport(gender)}/stats/{season}/"
                             f"{g['away'] if g['publisher'] == g['home'] else g['home']}/boxscore/{g['id'].rsplit(':', 1)[1]}",
               "teams": teams, "scoring": scoring, "cards": cards, "plays": plays,
               "stadium": f["venue"], "attendance": 120 + r.randint(0, 900), "kickoff": f["time"],
               "home_index": 0}
        if not cards:
            del box["cards"]
        g["box"] = box
        if collected(season, gender, g["publisher"], "matches") and g["id"] != silent:
            matches[g["id"]] = box

    # Season statistics as each school's own site totals them: every game that
    # school played, whether or not anyone collected its box score. Exhibitions
    # and games whose opponent's site we could not list still count on the site.
    for g in games:
        if g.get("match_type") == "exhibition" or (g.get("id") in late) or g.get("id") == silent:
            continue
        if "box" not in g:  # a game no collected site lists is outside the sample
            continue
        box = g["box"]
        winner_goal = None
        if g["home_score"] != g["away_score"]:
            wt = 0 if g["home_score"] > g["away_score"] else 1
            need = min(g["home_score"], g["away_score"]) + 1
            winner_goal = [s for s in box["scoring"] if s["team"] == wt][need - 1]["scorer"]
        for t, slug in enumerate((g["home"], g["away"])):
            if slug not in season_lines:
                continue
            by_id = {p["player_id"]: p for p in rosters[slug]}
            for pl in box["teams"][t]["players"]:
                ln = line(slug, by_id[pl["player_id"]])
                ln["gp"] += 1
                ln["gs"] += pl["started"]
                for k in ("minutes", "goals", "assists", "shots", "sog"):
                    ln[k] += pl[k]
                if winner_goal == pl["name"] and (g["home_score"] > g["away_score"]) == (t == 0):
                    ln["game_winners"] += 1
            for c in box.get("cards", []):
                if c["team"] == t and c["type"] in ("yellow", "red"):
                    pid = next(p["player_id"] for p in rosters[slug] if p["name"] == c["player"])
                    if pid in season_lines[slug]:
                        season_lines[slug][pid][c["type"]] += 1
            k = box["teams"][t]["keepers"][0]
            ln = line(slug, by_id[k["player_id"]])
            ln["gp"] += 1
            ln["gs"] += 1
            ln["minutes"] += k["minutes"]
            ln["goals_against"] += k["goals_against"]
            ln["saves"] += k["saves"]
            mine, theirs = box["teams"][t]["score"], box["teams"][1 - t]["score"]
            ln["wins" if mine > theirs else "losses" if mine < theirs else "ties"] += 1

    def pct(a, b):
        return round(a / b, 3) if b else 0.0

    stats_teams, roster_teams = {}, {}
    for slug in members:
        base = f"{site(slug)}/sports/{sport(gender)}"
        if collected(season, gender, slug, "roster"):
            roster_teams[slug] = {"programme": slug, "source_url": f"{base}/roster/{season}", "players": [
                {"name": p["name"], "number": p["number"],
                 "position": {"GK": "Goalkeeper", "D": "Defender", "M": "Midfielder", "F": "Forward"}[p["position"]],
                 "height": p["height"], "hometown": p["hometown"], "class_year": p["class_year"],
                 "source_url": f"{base}/roster/{p['name'].lower().replace(' ', '-')}/{p['player_id']}"}
                for p in rosters[slug]]}
        state = GAPS.get((season, gender, slug, "stats"), ("complete",))[0]
        if state == "complete":
            players, keepers = [], []
            for ln in sorted(season_lines[slug].values(), key=lambda x: (-x["goals"], -x["minutes"], x["name"])):
                common = {"name": ln["name"], "player_id": ln["player_id"], "number": ln["number"],
                          "bio_url": f"{base}/roster/{ln['name'].lower().replace(' ', '-')}/{ln['player_id']}",
                          "gp": ln["gp"], "gs": ln["gs"], "minutes": ln["minutes"]}
                if ln["pos"] == "GK":
                    keepers.append({**common, "goals_against": ln["goals_against"],
                                    "gaa": round(ln["goals_against"] * 90 / ln["minutes"], 2),
                                    "saves": ln["saves"],
                                    "save_pct": pct(ln["saves"], ln["saves"] + ln["goals_against"]),
                                    "wins": ln["wins"], "losses": ln["losses"], "ties": ln["ties"],
                                    "shots_faced": ln["saves"] + ln["goals_against"]})
                else:
                    players.append({**common, "goals": ln["goals"], "assists": ln["assists"],
                                    "points": 2 * ln["goals"] + ln["assists"], "shots": ln["shots"],
                                    "shot_pct": pct(ln["goals"], ln["shots"]), "sog": ln["sog"],
                                    "sog_pct": pct(ln["sog"], ln["shots"]),
                                    "game_winners": ln["game_winners"], "yellow": ln["yellow"], "red": ln["red"]})
            stats_teams[slug] = {"programme": slug, "source_url": f"{base}/stats/{season}",
                                 "players": players, "keepers": keepers}
        elif state == "empty":
            stats_teams[slug] = {"programme": slug, "source_url": f"{base}/stats/{season}",
                                 "players": [], "keepers": []}

    head = {"season": season, "gender": gender}
    stamp = {"collected_at": COLLECTED[season]}
    named = sorted({f["home"] for f in fixtures} | {f["away"] for f in fixtures})
    return {
        "games": games, "late": late, "silent": silent,
        "fixtures": {"schema": "touchline.fixtures/2", **head, "conference": CONF, **stamp,
                     "membership_extrapolated": False, "conference_game_source": "published:schedule-page",
                     "programmes": [{"slug": s, "name": name_of(s), "conference": CONF if s in members else
                                     "independent" if s in MEMBERS else "non_member", "abbr": abbr_of(s)}
                                    for s in named],
                     "fixtures": fixtures},
        "rosters": {"schema": "touchline.rosters/1", **head, **stamp, "rosters": roster_teams},
        "stats": {"schema": "touchline.stats/1", **head, **stamp, "teams": stats_teams},
        "matches": {"schema": "touchline.matches/2", **head, **stamp, "matches": matches},
    }


def coverage(units: dict) -> dict:
    cells = {}
    for (season, gender), u in sorted(units.items()):
        for slug in MEMBERS_BY_SEASON[season]:
            base = f"{site(slug)}/sports/{sport(gender)}"
            counts = {
                "schedule": sum(1 for g in u["games"] if g.get("publisher") == slug),
                "roster": len(u["rosters"]["rosters"].get(slug, {}).get("players", [])),
                "stats": len(u["stats"]["teams"].get(slug, {}).get("players", [])),
                "matches": sum(1 for i in u["matches"]["matches"] if i.split(":")[1] == slug),
            }
            for layer in ("matches", "roster", "schedule", "stats"):
                state, reason = GAPS.get((season, gender, slug, layer), ("complete", None))
                cell = {"collector": "none" if state == "no-collector" else f"{MEMBERS[slug][4]}-live",
                        "confirmed_at": COLLECTED[season], "gender": gender, "layer": layer,
                        "programme": slug, "season": season, "state": state}
                if state in ("complete", "empty"):
                    cell["count"] = counts[layer] if state == "complete" else 0
                if reason:
                    cell["reason"] = reason
                if layer != "matches" and state in ("complete", "empty"):
                    cell["source_url"] = f"{base}/{layer}/{season}"
                cells[f"{season}/{gender}/{slug}/{layer}"] = dict(sorted(cell.items()))
    return {"schema": "touchline.coverage/1", "updated_at": COLLECTED[2026], "cells": cells}


def membership() -> dict:
    def window(conf, a, b=None):
        w = {"conference": conf, "from_season": a,
             "source": f"{CONF_NAME} standings pages (invented for this sample)"}
        if b:
            w["to_season"] = b
        return w
    rows = {}
    for slug in MEMBERS:
        if slug == "hartwell-tech":
            wins = [window("independent", 2025, 2025), window(CONF, 2026)]
        else:
            wins = [window(CONF, 2025)]
        rows[slug] = {"men": wins, "women": wins}
    return {"version": 1,
            "description": "Season-aware conference membership per programme. Invented for the sample.",
            "seasons": {"from": 2025, "to": 2026},
            "conferences": [CONF, "independent", "non_member"],
            "conference_profiles": {CONF: {"level": "d2", "names": [CONF_NAME, "Prairie Lakes"]}},
            "memberships": rows}


def programmes() -> dict:
    out = {}
    for slug, (name, abbr, nick, city, _platform, _names) in sorted(MEMBERS.items()):
        out[slug] = {"name": name, "nickname": nick, "abbreviation": abbr, "city": city}
    for slug, (name, abbr, _names) in sorted(NON_MEMBERS.items()):
        out[slug] = {"name": name, "abbreviation": abbr}
    return {"schema": "learn.programmes/1",
            "description": "Display facts for every programme the sample fixtures name. All invented.",
            "programmes": out}


def aliases() -> dict:
    """The hand-maintained spelling list the identity lab starts from. It is
    deliberately incomplete: some published spellings are left for the student."""
    out = {}
    for slug, row in list(MEMBERS.items()) + list(NON_MEMBERS.items()):
        names = row[-1]
        out[slug] = sorted({names[0], row[1]})
    return out


# --- the raw zone: pages as an invented athletics site would serve them ---------

def schedule_page(slug, gender, season, fixtures, title_year=True, payload_year=None) -> str:
    label = "Men's" if gender == "men" else "Women's"
    title = f"{season} {label} Soccer Schedule" if title_year else f"{label} Soccer Schedule"
    rows = []
    for f in fixtures:
        if slug not in (f["home"], f["away"]):
            continue
        at_home = f["home"] == slug
        opp = name_of(f["away"] if at_home else f["home"])
        if "home_score" in f:
            mine, theirs = (f["home_score"], f["away_score"]) if at_home else (f["away_score"], f["home_score"])
            result = f"{'W' if mine > theirs else 'L' if mine < theirs else 'T'} {mine}-{theirs}"
        else:
            result = "Final" if f["status"] == "final" else ""
        link = ""
        if f["status"] == "final" and f["id"].split(":")[1] == slug:
            link = f'<a class="box" href="boxscore/{f["id"].rsplit(":", 1)[1]}">Box Score</a>'
        rows.append(f'    <tr data-game="{f["id"].rsplit(":", 1)[1]}"><td>{f["date"]}</td>'
                    f'<td>{"vs" if at_home else "at"}</td><td>{html.escape(opp)}</td>'
                    f'<td>{result}</td><td>{link}</td></tr>')
    body = "\n".join(rows)
    return (f"<!doctype html>\n<html>\n<head>\n  <title>{html.escape(title)} - {html.escape(name_of(slug))} Athletics</title>\n"
            f"</head>\n<body>\n  <h1>{html.escape(title)}</h1>\n  <table>\n    <caption>Schedule</caption>\n"
            f"    <tr><th>Date</th><th></th><th>Opponent</th><th>Result</th><th>Links</th></tr>\n{body}\n"
            f"  </table>\n</body>\n</html>\n")


def box_page(f, box, gender, layout=1, third_team=False) -> str:
    y, m, d = f["date"].split("-")
    label = "Men's" if gender == "men" else "Women's"
    home, away = box["teams"]
    title = f"{label} Soccer vs {away['name']} on {int(m)}/{int(d)}/{y} - Box Score - {home['name']} Athletics"
    n = max(len(home["periods"]), len(away["periods"]))
    heads = "".join(f"<th>{['1', '2', 'OT', 'OT2'][i]}</th>" for i in range(n))

    def score_row(t):
        return (f"    <tr><th>{html.escape(t['name'])}</th>"
                + "".join(f"<td>{p}</td>" for p in t["periods"]) + f"<td>{t['score']}</td></tr>")
    extra = "    <tr><th>Reserves</th>" + "<td>0</td>" * (n + 1) + "</tr>\n" if third_team else ""
    score = (f"  <table>\n    <caption>Score by Period</caption>\n    <tr><th>Team</th>{heads}<th>F</th></tr>\n"
             f"{score_row(away)}\n{score_row(home)}\n{extra}  </table>\n")
    # The template's row ids are not to be trusted: the Fouls row is marked "offsides".
    stat_rows = [("shots", "Shots", "shots"), ("sog", "Shots on Goal", "sog"), ("saves", "Saves", "saves"),
                 ("corners", "Corner Kicks", "corners"), ("offsides", "Fouls", "fouls")]
    team_stats = ("  <table>\n    <caption>Team Statistics</caption>\n"
                  f"    <tr><th>Statistic</th><th>{html.escape(away['abbr'])}</th><th>{html.escape(home['abbr'])}</th></tr>\n"
                  + "".join(f'    <tr id="{rid}"><th>{lab}</th><td>{away[k]}</td><td>{home[k]}</td></tr>\n'
                            for rid, lab, k in stat_rows) + "  </table>\n")
    goals = ("  <table>\n    <caption>Scoring Summary</caption>\n"
             "    <tr><th>Time</th><th>Team</th><th>Goal Scorer</th><th>Assist</th><th>Description</th></tr>\n"
             + "".join(f"    <tr><td>{s['time']}</td><td>{html.escape(box['teams'][s['team']]['abbr'])}</td>"
                       f"<td>{html.escape(s['scorer'])}</td><td>{html.escape(s.get('assist', ''))}</td>"
                       f"<td>{html.escape(s['description'])}</td></tr>\n" for s in box["scoring"])
             + "  </table>\n")
    cls = {"yellow": ' class="card card-y"', "red": ' class="card card-r"', "unknown": ' class="card"'}
    cards = ("  <table>\n    <caption>Cautions and Ejections</caption>\n"
             "    <tr><th>Time</th><th>Team</th><th>No.</th><th>Player</th></tr>\n"
             + "".join(f"    <tr><td>{c['time']}</td><td>{html.escape(box['teams'][c['team']]['abbr'])}</td>"
                       f"<td>{c['number']}</td><td{cls[c['type']]}>{html.escape(c['player'])}</td></tr>\n"
                       for c in box.get("cards", []))
             + "  </table>\n")
    plays = ("  <table>\n    <caption>Play-by-Play</caption>\n    <tr><th>Clock</th><th>Play</th></tr>\n"
             + "".join(f"    <tr><td>{p['clock']}</td><td>{html.escape(p['text'])}</td></tr>\n" for p in box["plays"])
             + "  </table>\n")
    order = [score, team_stats, goals, cards, plays] if layout == 1 else [goals, cards, score, plays, team_stats]
    return (f"<!doctype html>\n<html>\n<head>\n  <title>{html.escape(title)}</title>\n</head>\n<body>\n"
            f"  <h1>{html.escape(away['name'])} at {html.escape(home['name'])}</h1>\n" + "".join(order) + "</body>\n</html>\n")


def dump(obj) -> bytes:
    return (json.dumps(obj, indent=1, ensure_ascii=False) + "\n").encode()


def build() -> dict[str, bytes]:
    """Every file of the sample, as path -> bytes."""
    units = {(s, g): build_unit(s, g) for s in SEASONS for g in GENDERS}
    files: dict[str, bytes] = {}
    for (season, gender), u in units.items():
        for layer in ("fixtures", "rosters", "stats", "matches"):
            files[f"data/{layer}/{season}-{gender}-{CONF.lower()}.json"] = dump(u[layer])
    files["data/coverage.json"] = dump(coverage(units))
    files["data/reference/membership.json"] = dump(membership())
    files["data/reference/programmes.json"] = dump(programmes())
    files["data/reference/aliases.json"] = dump(aliases())

    # The raw zone for 2026 men: schedule pages, a few box scores, and some traps.
    u = units[(2026, "men")]
    fx = u["fixtures"]["fixtures"]
    by_id = {f["id"]: f for f in fx}

    def page(path, body, requested, final, etag_of=None):
        files[f"raw_html/{path}"] = body.encode()
        files[f"raw_html/{path}.meta.json"] = dump({
            "requested_url": requested, "final_url": final, "status": 200,
            "etag": '"' + hashlib.sha256((etag_of or body).encode()).hexdigest()[:16] + '"'})

    for slug in MEMBERS:
        base = f"{site(slug)}/sports/mens-soccer/schedule"
        # Brightwater State redirects the current season to the bare address.
        final = base if slug == "brightwater-state" else f"{base}/2026"
        page(f"{slug}/2026-men-schedule.html", schedule_page(slug, "men", 2026, fx), f"{base}/2026", final)
    # Two requests for 2019 that were answered with something else, both with HTTP 200.
    base = f"{site('cedar-hollow')}/sports/mens-soccer/schedule"
    page("cedar-hollow/2019-men-schedule.html", schedule_page("cedar-hollow", "men", 2026, fx),
         f"{base}/2019", f"{base}/2019")
    base = f"{site('dunmore')}/sports/mens-soccer/schedule"
    page("dunmore/2019-men-schedule.html", schedule_page("dunmore", "men", 2026, fx, title_year=False),
         f"{base}/2019", base)

    boxes = [i for i in u["matches"]["matches"] if i.split(":")[1] == "alder-ridge"]
    for n, fid in enumerate(boxes):
        box = u["matches"]["matches"][fid]
        num = fid.rsplit(":", 1)[1]
        page(f"alder-ridge/2026-men-box-tally-alder-ridge-{num}.html",
             box_page(by_id[fid], box, "men", layout=2 if n % 3 == 2 else 1),
             box["source_url"], box["source_url"])
    # A page that is not a box score for two teams. A reader must refuse it.
    fid = boxes[0]
    files["raw_html/traps/three-team-box.html"] = box_page(
        by_id[fid], u["matches"]["matches"][fid], "men", third_team=True).encode()

    # The shadow copy: what a second pipeline wrote three days later. Three games
    # have since been played, and one old score disagrees.
    shadow = json.loads(files["data/fixtures/2026-men-plc.json"])
    shadow["collected_at"] = SHADOW_COLLECTED
    games = {g["id"]: g for g in u["games"] if g.get("id")}
    for f in shadow["fixtures"]:
        if f["id"] in u["late"]:
            f["status"] = "final"
            f["home_score"], f["away_score"] = games[f["id"]]["home_score"], games[f["id"]]["away_score"]
    old = next(f for f in shadow["fixtures"] if f.get("conference_game") and "home_score" in f)
    old["away_score"] += 1
    files["shadow/fixtures/2026-men-plc.json"] = dump(shadow)
    shadow_r = json.loads(files["data/rosters/2026-men-plc.json"])
    shadow_r["collected_at"] = SHADOW_COLLECTED
    files["shadow/rosters/2026-men-plc.json"] = dump(shadow_r)

    listed = sorted(p for p in files if p.startswith("data/"))
    files["data/sample.json"] = dump({
        "schema": "learn.sample/1",
        "description": "An invented conference in the shape of a Touchline data home. No real school, "
                       "player, score or page appears in it.",
        "level": "d2", "seasons": list(SEASONS), "conference": CONF, "genders": list(GENDERS),
        "files": [{"path": p, "bytes": len(files[p]), "sha256": hashlib.sha256(files[p]).hexdigest()}
                  for p in listed]})
    return files


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true", help="compare with the files on disk; write nothing")
    args = ap.parse_args()
    files = build()
    if args.check:
        on_disk = {str(p.relative_to(ROOT)): p.read_bytes()
                   for d in ("data", "raw_html", "shadow") for p in (ROOT / d).rglob("*") if p.is_file()}
        bad = sorted(k for k in files.keys() | on_disk.keys() if files.get(k) != on_disk.get(k))
        for k in bad:
            print(f"differs: sample/{k}")
        print(f"{len(files)} files generated, {len(bad)} differ from disk")
        return 1 if bad else 0
    for path, body in files.items():
        out = ROOT / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(body)
    print(f"wrote {len(files)} files, {sum(len(b) for b in files.values()) / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
