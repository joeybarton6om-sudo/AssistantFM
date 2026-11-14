import json
import os
import sys
import unicodedata
import warnings
from datetime import date, datetime
from pathlib import Path

import fmsave
from fmsave.export import record_to_dict
from fmsave._version import read_summary_clock as _original_read_summary_clock
from fmsave._version import read_summary_facts as _original_read_summary_facts
from fmsave.models.tactics import TacticPosition

from noms_fm import noms_competitions

# Ignorer le warning UnknownBuildWarning pour les builds FM27 non enregistrés
warnings.filterwarnings("ignore", category=fmsave.UnknownBuildWarning)
warnings.filterwarnings("ignore", message=".*was saved by FM27 build.*")


# ---------------------------------------------------------------------------
# Patch fmsave pour ignorer l'erreur "FM27 summary does not fit its structured clock layout"
# Cette erreur survient sur certains builds FM27 o\u00f9 l'horloge structur\u00e9e du r\u00e9sum\u00e9 ne correspond pas
# ---------------------------------------------------------------------------
def _patched_read_summary_clock(summary, layout, version):
    try:
        return _original_read_summary_clock(summary, layout, version)
    except fmsave.ReaderCheckError as e:
        if "FM27 summary does not fit its structured clock layout" in str(e):
            return None
        raise


def _patched_read_summary_facts(container_index):
    try:
        return _original_read_summary_facts(container_index)
    except fmsave.ReaderCheckError as e:
        if "FM27 summary does not fit its structured clock layout" in str(e):
            from fmsave._version import (
                SummaryFacts, read_summary_strings, find_layout, find_game_version,
                section_schema, read_metadata_section, SAVE_SUMMARY_SECTION,
                SUPPORTED_GAME_MAJOR, UnsupportedGameError, ISSUES_URL,
            )
            file_name = container_index.file_name
            summary = read_metadata_section(container_index, SAVE_SUMMARY_SECTION)
            summary_schema = section_schema(
                summary,
                container_index.sections[SAVE_SUMMARY_SECTION].extension,
                SAVE_SUMMARY_SECTION,
                file_name,
            )
            summary_layout = find_layout(
                fmsave._version.SaveSummaryLayout, SAVE_SUMMARY_SECTION, summary_schema, ""
            ).layout
            version = find_game_version(summary, summary_layout, file_name)
            if version.major == 27:
                summary_layout = find_layout(
                    fmsave._version.SaveSummaryLayout, SAVE_SUMMARY_SECTION, summary_schema, version.build
                ).layout
            elif version.major != SUPPORTED_GAME_MAJOR:
                raise UnsupportedGameError(
                    f"{file_name} is an {version.game} save ({version.build}). fmsave {fmsave.__version__} reads FM26 and FM27 saves; "
                    f"{version.game} build {version.build} is not supported. See {ISSUES_URL}"
                )
            strings_layout = find_layout(
                fmsave._version.SummaryStringsLayout,
                SAVE_SUMMARY_SECTION,
                summary_schema,
                version.build if version.major == 27 else "",
            ).layout
            return SummaryFacts(
                version,
                read_summary_strings(summary, strings_layout),
                None,  # date
                0,     # time_slot
            )
        raise


fmsave._version.read_summary_clock = _patched_read_summary_clock
fmsave._version.read_summary_facts = _patched_read_summary_facts


class DateTimeEncoder(json.JSONEncoder):
    """Encodeur JSON qui g\u00e8re les objets date/datetime."""
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


def signaler_etape(message):
    chemin = os.environ.get("ASSISTANT_FM_PROGRESS_FILE")
    if chemin:
        destination = Path(chemin)
        temporaire = destination.with_suffix(".tmp")
        try:
            temporaire.write_text(json.dumps({"etape": message}, ensure_ascii=False), encoding="utf-8")
            temporaire.replace(destination)
        finally:
            if temporaire.exists():
                temporaire.unlink()


def entier(valeur):
    if valeur is None:
        return None
    try:
        return int(valeur)
    except (ValueError, TypeError):
        return None


def cle_nom(nom):
    if not nom:
        return ""
    n = unicodedata.normalize("NFD", nom.lower())
    return "".join(c for c in n if unicodedata.category(c) != "Mn").replace(" ", "").replace("-", "").replace("'", "")


def uids_graphique_nations(nation_id, second_nation_ids, identifiants_graphiques_nations):
    uids = set()
    if nation_id is not None:
        uid = identifiants_graphiques_nations.get(nation_id)
        if uid is not None:
            uids.add(uid)
    if second_nation_ids:
        for sid in second_nation_ids:
            uid = identifiants_graphiques_nations.get(sid)
            if uid is not None:
                uids.add(uid)
    return sorted(uids)


def extraire_personnalite(personnalite):
    if not personnalite:
        return {"type": None, "description": None, "media_handling": None, "pressure": None, "professionalism": None, "sportsmanship": None, "temperament": None, "controversy": None}
    return {
        "type": personnalite.get("type"),
        "description": personnalite.get("description"),
        "media_handling": entier(personnalite.get("media_handling")),
        "pressure": entier(personnalite.get("pressure")),
        "professionalism": entier(personnalite.get("professionalism")),
        "sportsmanship": entier(personnalite.get("sportsmanship")),
        "temperament": entier(personnalite.get("temperament")),
        "controversy": entier(personnalite.get("controversy")),
    }


def extraire_traits(traits_list, traits_codes=None):
    if not traits_list:
        return []
    if traits_list and hasattr(traits_list[0], "label_text"):
        resultats = []
        for t in traits_list:
            nom_trait = t.label_text if hasattr(t, "label_text") else str(t.label)
            description = nom_trait.replace("_", " ").capitalize()
            raw_val = t.raw if hasattr(t, "raw") else None
            resultats.append({"nom": nom_trait, "description": description, "raw": raw_val})
        return resultats
    if isinstance(traits_list, list) and all(isinstance(t, str) for t in traits_list):
        if traits_codes and isinstance(traits_codes, list) and len(traits_codes) == len(traits_list):
            return [
                {"nom": label, "description": label.replace("_", " ").capitalize(), "raw": code}
                for label, code in zip(traits_list, traits_codes)
            ]
        return [
            {"nom": label, "description": label.replace("_", " ").capitalize(), "raw": None}
            for label in traits_list
        ]
    if isinstance(traits_list, str):
        return [{"nom": traits_list, "description": traits_list.replace("_", " ").capitalize(), "raw": None}]
    return []


def extraire_preferences_staff(preferences):
    if not preferences:
        return []
    if isinstance(preferences, list):
        return [str(p).replace("_", " ").capitalize() for p in preferences]
    return [str(preferences).replace("_", " ").capitalize()]


# ---------------------------------------------------------------------------
# Mapping postes anglais (fmsave) -> français (affichage)
# ---------------------------------------------------------------------------
POSTES_FR = {
    "gk": "Gardien de but (GB)",
    "sw": "Libéro",
    "dr": "Défenseur droit (DD)",
    "dl": "Défenseur gauche (DG)",
    "dc": "Défenseur central (DC)",
    "dcg": "Défenseur central gauche (DCG)",
    "dcd": "Défenseur central droit (DCD)",
    "dm": "Milieu défensif (MD)",
    "mdg": "Milieu défensif gauche (MDG)",
    "mdd": "Milieu défensif droit (MDD)",
    "mc": "Milieu central (MC)",
    "mcg": "Milieu central gauche (MCG)",
    "mcd": "Milieu central droit (MCD)",
    "mr": "Milieu latéral droit (MD)",
    "ml": "Milieu latéral gauche (MG)",
    "amr": "Ailier droit / Milieu offensif excentré droit (MOD)",
    "aml": "Ailier gauche / Milieu offensif excentré gauche (MOG)",
    "amc": "Milieu offensif central (MOC)",
    "stc": "Buteur / Attaquant (BT)",
    "btg": "Attaquant gauche (BTG)",
    "btd": "Attaquant droit (BTD)",
    "wbr": "Latéral offensif droit (ALD)",
    "wbl": "Latéral offensif gauche (ALG)",
}


def poste_fr(code):
    """Convertit un code de poste anglais en libellé français."""
    if not code:
        return ""
    return POSTES_FR.get(str(code).lower(), str(code))


def postes_fr(codes):
    """Convertit une liste de codes de poste anglais en libellés français."""
    if not codes:
        return []
    return [poste_fr(c) for c in codes]


def extraire_selections(sauvegarde, clubs_geres):
    try:
        toutes = [
            record_to_dict(ligne, json_ready=True)
            for ligne in sauvegarde.selections()
            if ligne.club_uid in clubs_geres
        ]
        return toutes, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        return [], str(error)


def extraire_selections_nationales(sauvegarde, nations_uids=None):
    try:
        toutes = [
            record_to_dict(ligne, json_ready=True)
            for ligne in sauvegarde.selections()
        ]
        par_joueur = {}
        for sel in toutes:
            uid = sel.get("joueur_uid") or sel.get("player_uid")
            if uid is None:
                continue
            team_id = sel.get("team_id") or sel.get("competition_team_id")
            if nations_uids is not None and team_id not in nations_uids:
                continue
            par_joueur.setdefault(uid, []).append({
                "team_id": team_id,
                "slot": sel.get("slot"),
                "joueur": sel.get("joueur") or sel.get("player_name") or "",
                "remplacant": bool(sel.get("remplacant") or sel.get("substitute")),
            })
        return par_joueur, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        return {}, str(error)


# ---------------------------------------------------------------------------
# Proposition 1 : Tactiques sans erreur de poste
# ---------------------------------------------------------------------------
# fmsave ne nomme que onze bits de poste. Le bit 10 n'est pas nomm\u00e9 par la
# biblioth\u00e8que alors qu'il est utilis\u00e9 dans les formations r\u00e9elles : sur les
# sauvegardes FM27 analys\u00e9es (4-2-3-1 « GenPress » et « 4231 genpress »), il
# appara\u00eet sur les slots axiaux, entre DM (bit 7) et AM (bits 11/12/13), et
# jamais sur un slot d'aile. Il correspond donc au poste M(C).
_POSITION_BIT_CODE = {
    0: "gk",
    2: "dr",
    3: "dl",
    4: "dc",
    7: "dm",
    8: "mr",
    9: "ml",
    10: "mc",
    11: "amr",
    12: "aml",
    13: "amc",
    14: "stc",
}

_POSITION_CODE_MAP = {
    TacticPosition.GOALKEEPER: "gk",
    TacticPosition.DEFENDER_RIGHT: "dr",
    TacticPosition.DEFENDER_CENTRE: "dc",
    TacticPosition.DEFENDER_LEFT: "dl",
    TacticPosition.DEFENSIVE_MIDFIELDER: "dm",
    TacticPosition.MIDFIELDER_RIGHT: "mr",
    TacticPosition.MIDFIELDER_LEFT: "ml",
    TacticPosition.ATTACKING_MIDFIELDER_CENTRE: "amc",
    TacticPosition.ATTACKING_MIDFIELDER_RIGHT: "amr",
    TacticPosition.ATTACKING_MIDFIELDER_LEFT: "aml",
    TacticPosition.STRIKER_CENTRE: "stc",
    TacticPosition.UNKNOWN: "unknown",
}


def _coded_value_to_position_code(cv):
    """Convertit un CodedValue TacticPosition en code de poste lisible.

    La valeur brute est le num\u00e9ro du bit de poste : c'est elle qui fait foi, car
    certains bits r\u00e9els (10 = M(C)) ne sont pas nomm\u00e9s par fmsave.
    """
    if cv is None:
        return "unknown"
    for valeur in (getattr(cv, "raw", None), getattr(cv, "label", None)):
        bit = getattr(valeur, "value", valeur)
        if isinstance(bit, int) and bit >= 0:
            return _POSITION_BIT_CODE.get(bit, "unknown")
    return "unknown"


def _extract_slot_positions(slot):
    """Extrait les positions avec/ sans ballon pour un slot, en remplaçant UNKNOWN par la possession."""
    avec_ball = [_coded_value_to_position_code(p) for p in (slot.in_possession_positions or [])]
    sans_ball = [_coded_value_to_position_code(p) for p in (slot.out_of_possession_positions or [])]
    # Si sans_ball contient 'unknown' et que avec_ball a une valeur r\u00e9elle, on l'utilise comme fallback
    if sans_ball and all(p == "unknown" for p in sans_ball) and avec_ball and any(p != "unknown" for p in avec_ball):
        sans_ball = list(avec_ball)
    return avec_ball, sans_ball


def _extract_slot_role_duty(slot):
    """Tente d'extraire le r\u00f4le et le duty d'un slot depuis ses settings bit-encod\u00e9s."""
    role = None
    duty = None
    settings = slot.in_possession_settings or []
    for s in settings:
        # first_bits encodage : bits 0-5 = role, bits 6-11 = duty (approximatif selon build)
        fb = s.first_bits if hasattr(s, "first_bits") else 0
        if fb:
            role = fb & 0x3F
            duty = (fb >> 6) & 0x3F
            break
    return {"role": role, "duty": duty}


def extraire_tactiques(sauvegarde, clubs_geres):
    try:
        brutes = list(sauvegarde.tactics())
        print(f"[Debug] Tactiques brutes trouvées: {len(brutes)}")
        resultats = []
        for t in brutes:
            club_uid = getattr(t, "club_uid", None)
            if club_uid is None or club_uid not in clubs_geres:
                continue
            slots = []
            for slot in (t.slots or []):
                avec_ball, sans_ball = _extract_slot_positions(slot)
                role_duty = _extract_slot_role_duty(slot)
                slots.append({
                    "numero": getattr(slot, "number", None),
                    "avec_ball": avec_ball,
                    "sans_ball": sans_ball,
                    "role": role_duty.get("role"),
                    "duty": role_duty.get("duty"),
                })
            mentality = getattr(t, "mentality", None)
            if hasattr(mentality, "label"):
                mentality = str(mentality.label)
            style_name = getattr(t, "style_name", None)
            if hasattr(style_name, "label"):
                style_name = str(style_name.label)
            resultats.append({
                "id": f"{getattr(t, 'team_id', None)}-{getattr(t, 'index', None)}",
                "team_id": getattr(t, "team_id", None),
                "team_slot": getattr(t, "team_slot", None),
                "nom": getattr(t, "name", None) or "Tactique sans nom",
                "style": style_name or "",
                "mentalite": mentality or "",
                "postes": slots,
            })
        print(f"[Debug] Tactiques filtrées pour clubs gérés: {len(resultats)}")
        return resultats, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"[Debug] Erreur tactiques: {error}")
        return [], str(error)


# ---------------------------------------------------------------------------
# Proposition 2 : Blessures actuelles (kind TYPED = blessure en cours)
# ---------------------------------------------------------------------------
def extraire_blessures_actuelles(sauvegarde, joueurs_geres_uids):
    """Extrait uniquement les blessures en cours (InjuryRecordKind.TYPED) pour les joueurs gérés."""
    try:
        toutes = sauvegarde.injuries().to_dicts(json_ready=True)
        par_uid = {}
        for b in toutes:
            if b.get("kind") != "typed":
                continue
            uid = b.get("player_uid")
            if uid is None or uid not in joueurs_geres_uids:
                continue
            par_uid.setdefault(uid, []).append({
                "date": b.get("date"),
                "severity": b.get("severity"),
                "cause": b.get("cause"),
                "type_name": b.get("type_name"),
                "club_name": b.get("club_name"),
            })
        return par_uid, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"[Debug] Erreur blessures actuelles: {error}")
        return {}, str(error)


def blessures_toutes(sauvegarde):
    """Toutes les blessures (historique + actuelles) pour r\u00e9f\u00e9rence."""
    try:
        return sauvegarde.injuries().to_dicts(json_ready=True), None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        return [], str(error)


# ---------------------------------------------------------------------------
# Proposition 3 : Finances du club (via s.finances() au lieu de transfer_windows)
# ---------------------------------------------------------------------------
def extraire_finances(sauvegarde, clubs_geres):
    """Extrait les finances mensuelles par club depuis la m\u00e9thode finances() de fmsave."""
    try:
        lignes = sauvegarde.finances().to_dicts(json_ready=True)
        par_club = {}
        for ligne in lignes:
            club_uid = ligne.get("club_uid")
            if club_uid is None or club_uid not in clubs_geres:
                continue
            par_club.setdefault(club_uid, []).append({
                "month": ligne.get("month"),
                "balance": entier(ligne.get("balance")),
                "transfer_budget_allocated": entier(ligne.get("transfer_budget_allocated")),
                "transfer_budget_remaining": entier(ligne.get("transfer_budget_remaining")),
                "wage_budget_weekly": entier(ligne.get("wage_budget_weekly")),
                "wage_payroll_weekly": entier(ligne.get("wage_payroll_weekly")),
                "wage_bill": entier(ligne.get("wage_bill")),
                "net": entier(ligne.get("net")),
                "total_income": entier(ligne.get("total_income")),
                "total_expenditure": entier(ligne.get("total_expenditure")),
                "net_transfers": entier(ligne.get("net_transfers")),
                "income_excluding_transfers": entier(ligne.get("income_excluding_transfers")),
                "expenditure_excluding_transfers": entier(ligne.get("expenditure_excluding_transfers")),
            })
        return par_club, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"[Debug] Erreur finances: {error}")
        return {}, str(error)


def extraire_transferts_club(sauvegarde, clubs_geres):
    """Garde la m\u00eame logique que l'original (transfer_windows) pour l'historique des transferts joueurs."""
    try:
        transferts_par_club = {}
        for ligne in sauvegarde.transfer_windows():
            club_uid = getattr(ligne, "club_uid", None)
            if club_uid is None or club_uid not in clubs_geres:
                continue
            transferts_par_club.setdefault(club_uid, {"arrivees": [], "departs": []})
            sens = "arrivees" if getattr(ligne, "type", "").startswith("in") else "departs"
            transferts_par_club[club_uid][sens].append({
                "joueur": getattr(ligne, "player_name", None),
                "montant": getattr(ligne, "fee", None),
                "date": getattr(ligne, "date", None),
                "type": getattr(ligne, "type", None),
            })
        return transferts_par_club, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        return {}, str(error)


# ---------------------------------------------------------------------------
# Proposition 5 : Statistiques de saison et historique de carri\u00e8re
# ---------------------------------------------------------------------------
def statistiques_saison_club(sauvegarde, clubs_geres):
    """Agr\u00e8ge les stats de saison par club g\u00e9r\u00e9."""
    try:
        stats = sauvegarde.player_season_stats().to_dicts(json_ready=True)
        par_club = {}
        for s in stats:
            cu = s.get("club_uid")
            if cu is None or cu not in clubs_geres:
                continue
            par_club.setdefault(cu, []).append(s)
        return par_club, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"[Debug] Erreur stats saison club: {error}")
        return {}, str(error)


def statistiques_championnat_equipes(player_stats, tables_championnat):
    """Rapproche les stats d'\u00e9quipe avec les classements de championnat."""
    try:
        resultats = {}
        for table in (tables_championnat or []):
            comp_id = table.get("competition_id")
            for row in (table.get("rows") or []):
                team_id = row.get("team_id")
                if team_id is None:
                    continue
                resultats.setdefault(comp_id, []).append({
                    "team_id": team_id,
                    "position": row.get("position"),
                    "played": row.get("played"),
                    "won": row.get("won"),
                    "drawn": row.get("drawn"),
                    "lost": row.get("lost"),
                    "goals_for": row.get("goals_for"),
                    "goals_against": row.get("goals_against"),
                    "points": row.get("points"),
                })
        return resultats, None
    except Exception as error:
        print(f"[Debug] Erreur stats championnat: {error}")
        return {}, str(error)


def statistiques_saison_par_joueur(player_stats_table):
    """Indexe les stats de saison par player_uid."""
    try:
        stats = player_stats_table.to_dicts(json_ready=True)
        par_joueur = {}
        for s in stats:
            uid = s.get("player_uid")
            if uid is None:
                continue
            par_joueur.setdefault(uid, []).append(s)
        return par_joueur, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"[Debug] Erreur stats saison joueur: {error}")
        return {}, str(error)


def historique_carriere_par_joueur(season_history_table):
    """Indexe l'historique de carri\u00e8re par player_uid."""
    try:
        hist = season_history_table.to_dicts(json_ready=True)
        par_joueur = {}
        for h in hist:
            uid = h.get("player_uid")
            if uid is None:
                continue
            par_joueur.setdefault(uid, []).append(h)
        return par_joueur, None
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"[Debug] Erreur historique carri\u00e8re: {error}")
        return {}, str(error)


# ---------------------------------------------------------------------------
# Proposition 6 : Classements par club (impl\u00e9mentation r\u00e9elle)
# ---------------------------------------------------------------------------
def classements_par_club(
    tables_championnat,
    identifiants_graphique_competition,
    equipes_par_club=None,
    noms_competitions=None,
):
    """Rattache chaque classement à son club via l'équipe (team_id -> club_uid).

    Les lignes de classement ne portent qu'un ``team_id`` : sans la table des
    équipes du club, le rattachement se faisait sur l'identifiant du club et ne
    correspondait qu'aux clubs dont l'équipe porte le même numéro (les autres
    perdaient leur compétition).
    """
    resultats = {}
    for table in (tables_championnat or []):
        comp_id = table.get("competition_id")
        db_id = identifiants_graphique_competition.get(comp_id)
        nom = (noms_competitions or {}).get(db_id) or (noms_competitions or {}).get(comp_id) or ""
        for row in (table.get("rows") or []):
            team_id = row.get("team_id")
            club_uid = row.get("club_uid")
            slot = row.get("team_slot")
            if club_uid is None and equipes_par_club:
                rattachement = equipes_par_club.get(team_id)
                if rattachement:
                    club_uid, slot = rattachement
            if club_uid is None:
                continue
            joues = row.get("played")
            resultats.setdefault(club_uid, []).append({
                "competition_id": comp_id,
                "competition_database_id": db_id,
                "competition_uid": db_id,
                "competition_nom": nom,
                "equipe_id": team_id,
                "equipe_slot": slot,
                "position": row.get("position"),
                "played": joues,
                "matches_joues": joues,
                "won": row.get("won"),
                "drawn": row.get("drawn"),
                "lost": row.get("lost"),
                "goals_for": row.get("goals_for"),
                "goals_against": row.get("goals_against"),
                "points": row.get("points"),
            })
    return resultats


def competitions_depuis_fixtures(sauvegarde, identifiants_graphique_competition, noms_competitions):
    """Déduit la compétition de chaque club à partir de ses matchs.

    Certaines divisions ne sont pas détaillées dans la sauvegarde (les tables de
    championnat ne couvrent que les compétitions suivies) : le classement est
    alors absent. Les rencontres, elles, existent pour toutes les équipes, et la
    compétition la plus jouée par un club est son championnat.
    """
    compte = {}
    try:
        for match in sauvegarde.fixtures():
            competition_id = getattr(match, "competition_id", None)
            if competition_id is None:
                continue
            for cote in ("home", "away"):
                club_uid = getattr(match, f"{cote}_club_uid", None)
                if club_uid is None:
                    continue
                par_competition = compte.setdefault(club_uid, {})
                par_competition[competition_id] = par_competition.get(competition_id, 0) + 1
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"Compétitions par licencié indisponibles : {error}", file=sys.stderr)
        return {}

    resultats = {}
    for club_uid, par_competition in compte.items():
        # Un club qui n'a joué que deux ou trois matchs de coupe n'a pas de
        # championnat identifiable : on ne devine pas sa compétition.
        candidats = []
        for competition_id, joues in par_competition.items():
            db_id = identifiants_graphique_competition.get(competition_id)
            nom = (noms_competitions or {}).get(db_id) or (noms_competitions or {}).get(competition_id) or ""
            if joues < 5:
                continue
            candidats.append((joues, bool(nom), competition_id, db_id, nom))
        if not candidats:
            continue
        candidats.sort(reverse=True)
        joues, _, competition_id, db_id, nom = candidats[0]
        resultats[club_uid] = [{
            "competition_id": competition_id,
            "competition_database_id": db_id,
            "competition_uid": db_id,
            "competition_nom": nom,
            "equipe_id": None,
            "equipe_slot": None,
            "position": None,
            "played": joues,
            "matches_joues": joues,
            "won": None,
            "drawn": None,
            "lost": None,
            "goals_for": None,
            "goals_against": None,
            "points": None,
        }]
    return resultats


# ---------------------------------------------------------------------------
# Extraction principale
# ---------------------------------------------------------------------------
def extraire_sauvegarde_totale(chemin_save):
    chemin_save = Path(chemin_save).expanduser().resolve()
    if not chemin_save.is_file():
        raise FileNotFoundError(f"Sauvegarde introuvable : {chemin_save}")

    print("Lecture de la sauvegarde Football Manager 27...")
    signaler_etape("Lecture de la sauvegarde, des classements et des statistiques")

    sauvegarde = None
    try:
        sauvegarde = fmsave.open(chemin_save, competition_names=noms_competitions(), strict=False)
    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"Impossible d'ouvrir la sauvegarde (fmsave.open) : {error}", file=sys.stderr)
        error_data = {
            "joueurs": [], "staff": [], "tactiques": [], "selections": [],
            "clubs": [], "nations": [],
            "version_jeu": {"game": "FM27", "build": "inconnu", "known_build": False},
            "club_gere": None,
            "erreur_tactiques": str(error),
            "erreur_selections": str(error),
            "erreur_statistiques_saison": str(error),
            "erreur_historique_carriere": str(error),
            "erreur_blessures": str(error),
            "erreur_finances": str(error),
            "cadre_financier": {},
        }
        try:
            fichier_sortie = Path(os.environ.get("ASSISTANT_FM_DATA_DIR", Path(__file__).resolve().parent)) / "players_data.json"
            fichier_temporaire = fichier_sortie.with_suffix(".json.tmp")
            with fichier_temporaire.open("w", encoding="utf-8") as fichier:
                json.dump(error_data, fichier, ensure_ascii=False, cls=DateTimeEncoder)
            fichier_temporaire.replace(fichier_sortie)
        except OSError:
            pass
        return error_data

    with sauvegarde:
        try:
            date_jeu = sauvegarde.info.game_date
            date_sauvegarde = date_jeu.isoformat() if date_jeu else None
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            date_sauvegarde = None
            print(f"Date de jeu indisponible : {error}", file=sys.stderr)

        try:
            tables_championnat = sauvegarde.league_tables().to_dicts(json_ready=True)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            tables_championnat = []
            print(f"Classements indisponibles : {error}", file=sys.stderr)

        try:
            competitions = sauvegarde.competitions().to_dicts(json_ready=True)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            competitions = []
            print(f"Compétitions indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des statistiques de saison")
            stats_saison_table = sauvegarde.player_season_stats()
            historique_table = sauvegarde.player_season_history()
            statistiques_saison, err_ss = statistiques_saison_club(sauvegarde, set())
            statistiques_championnat, err_sc = statistiques_championnat_equipes(stats_saison_table, tables_championnat)
            statistiques_joueurs, err_sj = statistiques_saison_par_joueur(stats_saison_table)
            erreur_statistiques = err_ss or err_sc or err_sj
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            statistiques_saison = None
            statistiques_championnat = None
            statistiques_joueurs = None
            erreur_statistiques = str(error)
            print(f"Statistiques de saison indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction de l'historique de carrière des joueurs")
            historique_carriere, err_hc = historique_carriere_par_joueur(historique_table)
            erreur_historique_carriere = err_hc
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            historique_carriere = None
            erreur_historique_carriere = str(error)
            print(f"Historique de carrière indisponible : {error}", file=sys.stderr)

        try:
            blessures_toutes_liste, err_bt = blessures_toutes(sauvegarde)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            blessures_toutes_liste = []
            err_bt = str(error)
            print(f"Blessures (toutes) indisponibles : {error}", file=sys.stderr)

        try:
            version_jeu = {
                "game": sauvegarde.info.game,
                "build": sauvegarde.info.build,
                "known_build": sauvegarde.info.known_build,
            }
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            version_jeu = {"game": "FM27", "build": "inconnu", "known_build": False}
            print(f"Version jeu indisponible : {error}", file=sys.stderr)

        try:
            clubs_geres = {club.club_uid for club in sauvegarde.managed_clubs()}
            if not clubs_geres:
                print("Aucun club géré disponible dans la sauvegarde.", file=sys.stderr)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            print(f"Impossible de lire les clubs gérés : {error}", file=sys.stderr)
            clubs_geres = set()

        if not clubs_geres:
            print("Aucun club géré détecté - extraction limitée", file=sys.stderr)

        try:
            signaler_etape("Extraction de tous les joueurs")
            joueurs = sauvegarde.players().to_dicts(json_ready=True)
            joueurs_geree = [joueur for joueur in joueurs if joueur.get("club_uid") in clubs_geres]
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            joueurs = []
            joueurs_geree = []
            print(f"Joueurs indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction du staff")
            staff = sauvegarde.staff().to_dicts(json_ready=True)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            staff = []
            print(f"Staff indisponible : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des clubs")
            tous_les_clubs = sauvegarde.clubs().to_dicts(json_ready=True)
            clubs = [club for club in tous_les_clubs if club.get("uid") in clubs_geres]
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            tous_les_clubs = []
            clubs = []
            print(f"Clubs indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des pays")
            nations = sauvegarde.nations().to_dicts(json_ready=True)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            nations = []
            print(f"Pays indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des tactiques")
            tactiques, erreur_tactiques = extraire_tactiques(sauvegarde, clubs_geres)
            if erreur_tactiques:
                print(f"Tactiques indisponibles : {erreur_tactiques}", file=sys.stderr)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            tactiques = []
            erreur_tactiques = str(error)
            print(f"Tactiques indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des compositions")
            selections, erreur_selections = extraire_selections(sauvegarde, clubs_geres)
            if erreur_selections:
                print(f"Sélections indisponibles : {erreur_selections}", file=sys.stderr)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            selections = []
            erreur_selections = str(error)
            print(f"Sélections indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des finances (budget, salaire, solde)")
            finances_par_club, erreur_finances = extraire_finances(sauvegarde, clubs_geres)
            if erreur_finances:
                print(f"Finances indisponibles : {erreur_finances}", file=sys.stderr)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            finances_par_club = {}
            erreur_finances = str(error)
            print(f"Finances indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des sélections nationales")
            nations_uids = {
                nation.get("database_id")
                for nation in nations
                if nation.get("database_id") is not None
            }
            selections_nationales, erreur_selections_nationales = extraire_selections_nationales(sauvegarde, nations_uids)
            if erreur_selections_nationales:
                print(f"Sélections nationales indisponibles : {erreur_selections_nationales}", file=sys.stderr)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            selections_nationales = {}
            erreur_selections_nationales = str(error)
            print(f"Sélections nationales indisponibles : {error}", file=sys.stderr)

        try:
            signaler_etape("Extraction des transferts club (historique)")
            transferts_par_club, erreur_transferts = extraire_transferts_club(sauvegarde, clubs_geres)
            if erreur_transferts:
                print(f"Transferts club indisponibles : {erreur_transferts}", file=sys.stderr)
        except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
            transferts_par_club = {}
            erreur_transferts = str(error)
            print(f"Transferts club indisponibles : {error}", file=sys.stderr)

        identifiants_graphique_competition = {
            ligne["id"]: ligne.get("database_id")
            for ligne in competitions
            if ligne.get("id") is not None
        }
        noms_par_database_id = {
            ligne.get("database_id"): ligne.get("name")
            for ligne in competitions
            if ligne.get("database_id") is not None
        }
        equipes_par_club = {}
        for club in tous_les_clubs:
            for equipe in (club.get("teams") or []):
                team_id = equipe.get("team_id")
                if team_id is not None:
                    equipes_par_club[team_id] = (club.get("uid"), equipe.get("slot"))
        signaler_etape("Préparation et rapprochement des données")
        club_uid = clubs[0].get("uid") if clubs else None
        identifiants_graphiques_nations = {
            nation.get("nation_id"): nation.get("database_id")
            for nation in nations
            if nation.get("nation_id") is not None
        }
        classements_clubs = classements_par_club(
            tables_championnat,
            identifiants_graphique_competition,
            equipes_par_club,
            noms_par_database_id,
        )
        for uid_club, entrees in competitions_depuis_fixtures(
            sauvegarde, identifiants_graphique_competition, noms_par_database_id
        ).items():
            if not classements_clubs.get(uid_club):
                classements_clubs[uid_club] = entrees
        clubs_references = {
            ligne.get("club_uid")
            for ligne in joueurs + staff
            if ligne.get("club_uid") is not None
        }
        if club_uid is not None:
            clubs_references.add(club_uid)
        clubs_exportes = []
        for club in tous_les_clubs:
            if club.get("uid") not in clubs_references:
                continue
            club_exporte = dict(club)
            club_exporte["nation_uid"] = identifiants_graphiques_nations.get(
                club.get("nation_id")
            )
            club_exporte["classements"] = classements_clubs.get(club.get("uid"), [])
            club_gender = club.get("gender")
            if club_gender is not None:
                if isinstance(club_gender, dict) and "value" in club_gender:
                    club_exporte["gender"] = club_gender["value"]
                else:
                    club_exporte["gender"] = club_gender
            clubs_exportes.append(club_exporte)
        club_gere = next(
            (club for club in clubs_exportes if club.get("uid") == club_uid),
            clubs[0] if clubs else None,
        )
        if club_gere is not None and "nation_uid" not in club_gere:
            club_gere = dict(club_gere)
            club_gere["nation_uid"] = identifiants_graphiques_nations.get(
                club_gere.get("nation_id")
            )
        club_gere_gender = club_gere.get("gender") if club_gere else None

        # Finances du club géré : dernière ligne disponible
        club_finances = finances_par_club.get(club_uid, []) if club_uid else []
        club_finances_sorted = sorted(
            (f for f in club_finances if f.get("month")),
            key=lambda f: f.get("month", ""),
        )
        derniere_finance = club_finances_sorted[-1] if club_finances_sorted else {}

        # Blessures actuelles pour les joueurs gérés
        joueurs_geres_uids = {
            joueur.get("uid") for joueur in joueurs_geree if joueur.get("uid") is not None
        }
        blessures_actuelles, err_ba = extraire_blessures_actuelles(sauvegarde, joueurs_geres_uids)
        if err_ba:
            print(f"Blessures actuelles indisponibles : {err_ba}", file=sys.stderr)

        cles_staff = {
            (cle_nom(membre.get("name") or membre.get("full_name")), membre.get("club_uid"))
            for membre in staff
            if membre.get("name") or membre.get("full_name")
        }
        uids_staff = {membre.get("uid") for membre in staff if membre.get("uid") is not None}

        donnees_finales = {
            "joueurs": [],
            "staff": [],
            "tactiques": [],
            "selections": [],
            "clubs": clubs_exportes,
            "club_gere": club_gere,
            "date_sauvegarde": date_sauvegarde,
            "version_jeu": version_jeu,
            "statistiques_saison": statistiques_saison,
            "statistiques_championnat_equipes": statistiques_championnat,
            "erreur_statistiques_saison": erreur_statistiques,
            "historique_carriere_disponible": historique_carriere is not None,
            "erreur_historique_carriere": erreur_historique_carriere,
            "erreur_blessures": err_bt,
            "erreur_blessures_actuelles": err_ba,
            "erreur_tactiques": erreur_tactiques,
            "erreur_selections": erreur_selections,
            "erreur_finances": erreur_finances,
            "club_gere_gender": club_gere_gender,
            "cadre_financier": {
                "mois": derniere_finance.get("month"),
                "budget_transfert": entier(derniere_finance.get("transfer_budget_remaining")),
                "budget_salaires_hebdomadaire": entier(derniere_finance.get("wage_budget_weekly")),
                "masse_salariale_hebdomadaire": entier(derniere_finance.get("wage_payroll_weekly")),
                "solde": entier(derniere_finance.get("balance")),
                "budget_transfert_alloue": entier(derniere_finance.get("transfer_budget_allocated")),
                "masse_salariale": entier(derniere_finance.get("wage_bill")),
                "net": entier(derniere_finance.get("net")),
                "total_revenus": entier(derniere_finance.get("total_income")),
                "total_depenses": entier(derniere_finance.get("total_expenditure")),
                "net_transferts": entier(derniere_finance.get("net_transfers")),
            },
        }

        for joueur in joueurs:
            capacite = joueur.get("ability") or {}
            contrat = joueur.get("contract") or {}
            reputation = joueur.get("reputation") or {}
            etat_valeur = "ok"
            if joueur.get("transfer_value") is None:
                etat_valeur = "zero"
            elif isinstance(joueur.get("transfer_value"), str):
                etat_valeur = "inconnu"
            personnalite = extraire_personnalite(joueur.get("personality"))
            traits = extraire_traits(joueur.get("traits"), joueur.get("traits_code"))
            pied_gauche = entier(joueur.get("left_foot"))
            pied_droit = entier(joueur.get("right_foot"))
            pied_fort = (
                "gauche" if pied_gauche is not None and pied_droit is not None and pied_gauche > pied_droit
                else "droite" if pied_gauche is not None and pied_droit is not None and pied_droit > pied_gauche
                else "ambidextre" if pied_gauche is not None and pied_droit is not None
                else None
            )
            uid_j = joueur.get("uid")
            est_mon = (
                uid_j in joueurs_geres_uids
                or (club_uid is not None and joueur.get("club_uid") == club_uid)
            )
            donnees_finales["joueurs"].append({
                "uid": uid_j,
                "unique_id": joueur.get("unique_id"),
                "nom": joueur.get("name") or joueur.get("full_name") or "Joueur",
                "poste": " / ".join(postes_fr(joueur.get("natural_positions"))) or "Non défini",
                "positions": joueur.get("positions") or {},
                "age": entier(joueur.get("age")),
                "ca": entier(capacite.get("current")),
                "pa": entier(capacite.get("potential")),
                "club": joueur.get("club_name") or "Sans club",
                "club_uid": joueur.get("club_uid"),
                "team_id": joueur.get("team_id"),
                "team_slot": joueur.get("team_slot"),
                "left_foot": pied_gauche,
                "right_foot": pied_droit,
                "pied_fort": pied_fort,
                "nation_id": joueur.get("nation_id"),
                "nation_uid": identifiants_graphiques_nations.get(joueur.get("nation_id")),
                "nations_uid": uids_graphique_nations(
                    joueur.get("nation_id"),
                    joueur.get("second_nation_ids"),
                    identifiants_graphiques_nations,
                ),
                "taille_cm": entier(joueur.get("height_cm")),
                "positions_naturelles": postes_fr(joueur.get("natural_positions")),
                "positions_acquises": postes_fr(joueur.get("accomplished_positions")),
                "reputation": entier(reputation.get("current")),
                "valeur_marchande": (
                    entier(joueur.get("transfer_value")) if etat_valeur == "ok" else None
                ),
                "etat_valeur_marchande": etat_valeur,
                "fin_contrat": contrat.get("end"),
                "salaire_hebdomadaire": entier(contrat.get("wage")),
                "sous_contrat": any(
                    terme.get("has_terms", False) for terme in (contrat.get("chain") or [])
                ),
                "statut_effectif": contrat.get("squad_status"),
                "clauses": contrat.get("clauses") or [],
                "en_pret": bool(contrat.get("on_loan")),
                "club_preteur": contrat.get("loan_parent_club_name"),
                "blessures": blessures_actuelles.get(uid_j, []) if est_mon else [],
                "historique_carriere": (
                    historique_carriere.get(uid_j, [])
                    if (est_mon and historique_carriere is not None) else None
                ),
                "saison_carriere": (
                    statistiques_joueurs.get(uid_j, [])
                    if (est_mon and statistiques_joueurs is not None) else None
                ),
                "meilleur_role": "",
                "est_mon_club": est_mon,
                "stats": joueur.get("attributes") or {},
                "personnalite": personnalite,
                "traits": traits,
                "selections_nationales": selections_nationales.get(uid_j, []),
            })

        for membre in staff:
            capacite = membre.get("ability") or {}
            metier = membre.get("job") or "Fonction non renseignée"
            personnalite = extraire_personnalite(membre.get("personality"))
            preferences = extraire_preferences_staff(membre.get("preferences"))
            donnees_finales["staff"].append({
                "uid": membre.get("uid"),
                "unique_id": membre.get("unique_id"),
                "nom": membre.get("name") or membre.get("full_name") or "Membre du staff",
                "metier": str(metier).replace("_", " ").capitalize(),
                "age": entier(membre.get("age")),
                "ca": entier(capacite.get("current")),
                "pa": entier(capacite.get("potential")),
                "club": membre.get("club_name") or "Sans club",
                "club_uid": membre.get("club_uid"),
                "nation_id": membre.get("nation_id"),
                "nation_uid": identifiants_graphiques_nations.get(membre.get("nation_id")),
                "fin_contrat": membre.get("contract_end"),
                "salaire_hebdomadaire": entier(membre.get("wage")),
                "est_mon_club": club_uid is not None and membre.get("club_uid") == club_uid,
                "stats": membre.get("attributes") or {},
                "personnalite": personnalite,
                "preferences": preferences,
            })

        for tactique in tactiques:
            donnees_finales["tactiques"].append(tactique)

        donnees_finales["selections"] = [
            {
                "team_id": selection.get("team_id"),
                "slot": selection.get("slot"),
                "joueur_uid": selection.get("player_uid"),
                "joueur": selection.get("player_name") or "",
                "remplacant": bool(selection.get("substitute")),
            }
            for selection in selections
        ]

        fichier_sortie = Path(os.environ.get("ASSISTANT_FM_DATA_DIR", Path(__file__).resolve().parent)) / "players_data.json"
        signaler_etape("Enregistrement du fichier de résultats")
        fichier_temporaire = fichier_sortie.with_suffix(".json.tmp")
        try:
            with fichier_temporaire.open("w", encoding="utf-8") as fichier:
                json.dump(donnees_finales, fichier, ensure_ascii=False, cls=DateTimeEncoder)
            fichier_temporaire.replace(fichier_sortie)
        finally:
            if fichier_temporaire.exists():
                fichier_temporaire.unlink()

        print("Extraction terminée.")
        print(f"-> {len(donnees_finales['joueurs'])} joueurs indexés.")
        print(f"-> {len(donnees_finales['staff'])} membres du staff indexés.")
        print(f"-> {len(donnees_finales['tactiques'])} tactiques enregistrées.")
        if donnees_finales["club_gere"]:
            print(f"-> Club géré : {donnees_finales['club_gere'].get('name', 'inconnu')}.")
        cf = donnees_finales["cadre_financier"]
        if any(v is not None for v in cf.values()):
            print(f"-> Finances club géré : solde={cf['solde']}, budget_transfert={cf['budget_transfert']}, salaire_hebdo={cf['budget_salaires_hebdomadaire']}.")
        print("-> La tactique en cours n'étant pas marquée dans la sauvegarde, choisissez-la dans l'application.")

        return donnees_finales


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage : py parser.py <chemin_de_la_sauvegarde.fm>")
        sys.exit(2)
    result = extraire_sauvegarde_totale(sys.argv[1])
    if result and not result.get("joueurs") and not result.get("staff") and result.get("erreur_tactiques"):
        print(f"\n⚠ Extraction partielle : {result['erreur_tactiques']}")
        sys.exit(0)
    elif result and not result.get("joueurs") and not result.get("staff"):
        print(f"\n❌ Erreur d'extraction : impossible de lire la sauvegarde")
        sys.exit(1)
