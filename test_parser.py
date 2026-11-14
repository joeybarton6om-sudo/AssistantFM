import unittest
from enum import Enum
from types import SimpleNamespace
from unittest.mock import patch

from parser import blessures_courantes, classements_par_club, extraire_finances, extraire_selections, extraire_tactiques, historique_carriere_par_joueur, statistiques_championnat_equipes, statistiques_saison_par_joueur, uids_graphique_nations


class BlessuresCourantesTest(unittest.TestCase):
    def test_ne_retient_que_les_blessures_actives_des_joueurs_du_club(self):
        blessures = blessures_courantes(
            [
                {"kind": "typed", "player_uid": 12, "type_name": "Entorse", "date": "2026-11-20"},
                {"kind": "history", "player_uid": 12, "type_name": "Blessure passée", "date": "2026-10-01"},
                {"kind": "typed", "player_uid": 99, "type_name": "Blessure externe", "date": "2026-11-20"},
            ],
            {12},
        )
        self.assertEqual(
            blessures,
            {12: [{"nom": "Entorse", "date_retour": "2026-11-20"}]},
        )


class HistoriqueCarriereTest(unittest.TestCase):
    def test_saison_actuelle_par_joueur_sans_totaux_annee_civile(self):
        class Type(Enum):
            LEAGUE = "league"
            CALENDAR = "calendar_year_overall"

        def ligne(uid, kind, club):
            return SimpleNamespace(
                player_uid=uid, kind=kind, club_uid=club, club_name="Club",
                starts=2, substitute_appearances=1, goals=0, assists=1, average_rating=7.0875,
            )

        resultat = statistiques_saison_par_joueur([
            ligne(1, Type.LEAGUE, 10), ligne(1, Type.LEAGUE, 11),
            ligne(1, Type.CALENDAR, 10), ligne(2, Type.LEAGUE, 12),
            ligne(None, Type.LEAGUE, 10),
        ])
        self.assertEqual(set(resultat), {1, 2})
        self.assertEqual([row["club_uid"] for row in resultat[1]], [10, 11])
        self.assertEqual(resultat[1][0]["note"], 7.0875)
        self.assertEqual(resultat[1][0]["buts"], 0)

    def test_regroupe_les_lignes_par_identifiant_sans_melanger_les_joueurs(self):
        class Type(Enum):
            LEAGUE = "league"

        def ligne(uid, annee, club):
            return SimpleNamespace(
                player_uid=uid, season_year=annee, club_uid=None, club_name=club,
                kind=Type.LEAGUE, starts=0, substitute_appearances=2, goals=1,
                assists=0, average_rating=None,
            )

        resultat = historique_carriere_par_joueur([
            ligne(12, 2025, "Premier club"), ligne(99, 2024, None),
            ligne(12, 2026, "Second club"), ligne(None, 2026, None),
        ])
        self.assertEqual(set(resultat), {12, 99})
        self.assertEqual([ligne["annee"] for ligne in resultat[12]], [2025, 2026])
        self.assertEqual(resultat[12][0]["type"], "league")
        self.assertEqual(resultat[12][0]["titulaires"], 0)
        self.assertIsNone(resultat[99][0]["club"])
        self.assertIsNone(resultat[99][0]["note"])


class NationsGraphiquesTest(unittest.TestCase):
    def test_mappe_et_dedoublonne_les_nationalites_connues(self):
        self.assertEqual(
            uids_graphique_nations(10, [20, 10, 30], {10: 700, 20: 800}),
            [700, 800],
        )

    def test_retourne_une_liste_vide_si_aucune_nationalite_n_est_connue(self):
        self.assertEqual(uids_graphique_nations(None, [], {}), [])


class ClassementsTest(unittest.TestCase):
    def test_statistiques_championnat_limitees_aux_equipes_des_tables(self):
        class Type(Enum):
            LEAGUE = "league"
            CUP = "cup"

        def ligne(uid, equipe, kind, buts=0):
            return SimpleNamespace(
                player_uid=uid, player_name=f"Joueur {uid}", team_id=equipe, kind=kind,
                starts=1, substitute_appearances=0, rated_appearances=1,
                average_rating=7.1, goals=buts, assists=0,
            )

        tables = [{"rows": [{"team_id": 10}, {"team_id": 10}, {"team_id": None}]}]
        result = statistiques_championnat_equipes(
            [ligne(1, 10, Type.LEAGUE, 3), ligne(2, 10, Type.CUP),
             ligne(3, 11, Type.LEAGUE), ligne(4, None, Type.LEAGUE)], tables
        )
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["player_uid"], 1)
        self.assertEqual(result[0]["goals"], 3)
        self.assertEqual(result[0]["assists"], 0)
        self.assertEqual(result[0]["team_id"], 10)

    def test_tables_distinctes_pour_meme_competition_et_meme_club(self):
        tables = [
            {"competition_id": 13, "club_count": 18,
             "rows": [{"club_uid": 876, "team_id": 715, "position": 11, "played": 12, "points": 16,
                       "goals_for": 0, "goals_against": 14}]},
            {"competition_id": 13, "club_count": 2,
             "rows": [{"club_uid": 876, "team_id": 715, "position": 1, "played": 11, "points": 15}]},
        ]
        resultat = classements_par_club(tables, {13: 18})
        self.assertEqual([ligne["table_id"] for ligne in resultat[876]], [0, 1])
        self.assertEqual([ligne["competition_uid"] for ligne in resultat[876]], [18, 18])
        self.assertEqual([ligne["nombre_clubs"] for ligne in resultat[876]], [18, 2])
        self.assertEqual(resultat[876][0]["buts_marques"], 0)
        self.assertEqual(resultat[876][0]["buts_encaisses"], 14)
        self.assertIsNone(resultat[876][1]["buts_marques"])
        self.assertIsNone(resultat[876][1]["buts_encaisses"])


class ExtractionTactiquesTest(unittest.TestCase):
    def test_tactiques_indisponibles_ne_font_pas_echouer_lextraction(self):
        import fmsave

        class Sauvegarde:
            def tactics(self):
                raise fmsave.UnsupportedGameError("Layout tactics_man inconnu.")

        tactiques, erreur = extraire_tactiques(Sauvegarde(), {42})

        self.assertEqual(tactiques, [])
        self.assertIn("tactics_man", erreur)

    def test_conserve_les_tactiques_du_club_geré(self):
        class Sauvegarde:
            def tactics(self):
                return [
                    SimpleNamespace(club_uid=42, name="Tactique du club"),
                    SimpleNamespace(club_uid=99, name="Autre club"),
                ]

        with patch("parser.record_to_dict", side_effect=lambda ligne, json_ready: vars(ligne)):
            tactiques, erreur = extraire_tactiques(Sauvegarde(), {42})

        self.assertEqual(erreur, None)
        self.assertEqual([ligne["name"] for ligne in tactiques], ["Tactique du club"])

    def test_erreur_de_composition_est_isolee(self):
        import fmsave

        class Sauvegarde:
            def selections(self):
                raise fmsave.ReaderCheckError("Layout des compositions invalide.")

        selections, erreur = extraire_selections(Sauvegarde(), {42})

        self.assertEqual(selections, [])
        self.assertIn("compositions", erreur)


class ExtractionFinancesTest(unittest.TestCase):
    def test_erreur_de_verification_des_sponsors_n_arrete_pas_lextraction(self):
        import fmsave

        class Sauvegarde:
            def finances(self):
                raise fmsave.ReaderCheckError("sponsor_lists_rejected=4 (expected 0)")

        finances, erreur = extraire_finances(Sauvegarde(), {42})

        self.assertEqual(finances, [])
        self.assertIn("sponsor_lists_rejected=4", erreur)

    def test_conserve_les_finances_du_club_geré(self):
        class Sauvegarde:
            def finances(self):
                return [
                    SimpleNamespace(club_uid=42, balance=100),
                    SimpleNamespace(club_uid=99, balance=200),
                ]

        with patch("parser.record_to_dict", side_effect=lambda ligne, json_ready: vars(ligne)):
            finances, erreur = extraire_finances(Sauvegarde(), {42})

        self.assertIsNone(erreur)
        self.assertEqual(finances, [{"club_uid": 42, "balance": 100}])


if __name__ == "__main__":
    unittest.main()
