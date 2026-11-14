import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import noms_fm


class NomsCompetitionsTest(unittest.TestCase):
    def test_corrections_francaises_et_fichier_personnel(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            lnc = racine / "jeu" / "shared" / "data" / "database" / "db" / "2700" / "lnc" / "all"
            lnc.mkdir(parents=True)
            (lnc / "a.lnc").write_text(
                '"COMP_LONG_NAME_CHANGE"\t100\t"Default"\t""\n'
                '"COMP_LONG_NAME_CHANGE"\t100\t"Français"\t"French"\n'
                '"COMP_LONG_NAME_CHANGE"\t100\t"Español"\t"Spanish"\n',
                encoding="utf-16",
            )
            (racine / "noms_competitions.csv").write_text(
                "database_id,name\n100,Personnalisé\n101,Deuxième\n",
                encoding="utf-8",
            )
            with patch.object(noms_fm, "__file__", str(racine / "noms_fm.py")):
                resultat = noms_fm.noms_competitions([racine / "jeu"])
            self.assertEqual(resultat[100], "Personnalisé")
            self.assertEqual(resultat[101], "Deuxième")
            self.assertEqual(resultat[5123054], "National League North")

    def test_noms_francais_preferes_et_csv_invalide_signale(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            lnc = racine / "jeu" / "shared" / "data" / "database" / "db" / "2700" / "lnc" / "all"
            lnc.mkdir(parents=True)
            (lnc / "noms.lnc").write_text(
                '"COMP_LONG_NAME_CHANGE" 100 "En français" "French"\n'
                '"COMP_LONG_NAME_CHANGE" 100 "Default" ""\n',
                encoding="utf-8",
            )
            with patch.object(noms_fm, "__file__", str(racine / "noms_fm.py")):
                self.assertEqual(noms_fm.noms_competitions([racine / "jeu"])[100], "En français")
                (racine / "noms_competitions.csv").write_text(
                    "database_id,name\n100,Un\n100,Autre\n", encoding="utf-8"
                )
                with self.assertRaises(ValueError):
                    noms_fm.noms_competitions([racine / "jeu"])

    def test_csv_du_dossier_de_donnees_prime_sur_la_base_installee(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            source = racine / "source"
            donnees = racine / "donnees"
            source.mkdir()
            donnees.mkdir()
            (source / "noms_competitions.csv").write_text(
                "database_id,name\n914523,Ancien\n", encoding="utf-8"
            )
            (donnees / "noms_competitions.csv").write_text(
                "database_id,name\n914523,Nom choisi\n", encoding="utf-8"
            )
            with patch.object(noms_fm, "__file__", str(source / "noms_fm.py")), \
                    patch.dict("os.environ", {"ASSISTANT_FM_DATA_DIR": str(donnees)}):
                self.assertEqual(noms_fm.noms_competitions([])[914523], "Nom choisi")


if __name__ == "__main__":
    unittest.main()
