import unittest
from types import SimpleNamespace

from parser import statistiques_saison_club


class TableFictive:
    def __init__(self, rows):
        self.rows = rows

    def where(self, **criteria):
        return TableFictive([
            row for row in self.rows
            if all(row.get(key) == value for key, value in criteria.items())
        ])

    def to_dicts(self, json_ready=False):
        return self.rows


class StatistiquesSaisonTest(unittest.TestCase):
    def test_isole_club_et_garde_les_lignes_distinctes(self):
        rows = [
            {"club_uid": 12, "player_uid": 1, "kind": "league", "minutes": 900, "goals": 5},
            {"club_uid": 12, "player_uid": 1, "kind": "cup", "minutes": 90, "goals": 1},
            {"club_uid": 13, "player_uid": 2, "kind": "league", "minutes": 1000},
        ]
        save = SimpleNamespace(
            managed_clubs=lambda: [SimpleNamespace(club_uid=12)],
            player_season_stats=lambda: TableFictive(rows),
        )
        result = statistiques_saison_club(save)
        self.assertEqual([row["kind"] for row in result], ["league", "cup"])
        self.assertEqual([row["minutes"] for row in result], [900, 90])
        self.assertTrue(all("club_uid" not in row for row in result))

    def test_sans_club_ne_lit_pas_les_statistiques(self):
        save = SimpleNamespace(managed_clubs=lambda: [])
        self.assertEqual(statistiques_saison_club(save), [])


if __name__ == "__main__":
    unittest.main()
