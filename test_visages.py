import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class IndexVisagesTest(unittest.TestCase):
    def test_packs_et_correspondances_sans_ambiguite(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            sous_dossier = racine / "pack"
            sous_dossier.mkdir()
            for nom in ("messi.jpg", "visage.png", "autre.png"):
                (sous_dossier / nom).write_bytes(b"image")
            (sous_dossier / "config.xml").write_text(
                '<record><list id="maps">'
                '<record from="messi" to="graphics/pictures/person/7458500/portrait"/>'
                '<!-- Joueur Exemple -->'
                '<record from="visage" to="graphics/pictures/person/r-200/portrait"/>'
                '<!-- Joueur Exemple -->'
                '<record from="autre" to="graphics/pictures/person/r-201/portrait"/>'
                '<record from="../outside" to="graphics/pictures/person/123/portrait"/>'
                '</list></record>',
                encoding="utf-8",
            )
            with patch.object(server, "FACES_ROOT", racine), patch.object(server, "_FACE_INDEX", None):
                index = server.face_index(refresh=True)
            self.assertEqual(index["ids"], {"7458500": "7458500"})
            self.assertEqual(index["images"]["7458500"], (sous_dossier / "messi.jpg").resolve())
            self.assertNotIn("joueurexemple", index["names"])
            self.assertNotIn("200", index["ids"])
            self.assertNotIn("123", index["ids"])

    def test_conflits_et_erreurs_explicites(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            for dossier in ("a", "b"):
                repertoire = racine / dossier
                repertoire.mkdir()
                (repertoire / "visage.png").write_bytes(dossier.encode())
                (repertoire / "config.xml").write_text(
                    '<record><list><!-- Même nom -->'
                    '<record from="visage" to="graphics/pictures/person/42/portrait"/>'
                    '</list></record>', encoding="utf-8"
                )
            with patch.object(server, "FACES_ROOT", racine), patch.object(server, "_FACE_INDEX", None):
                index = server.face_index(refresh=True)
                self.assertNotIn("42", index["ids"])
                self.assertNotIn("memenom", index["names"])
                (racine / "a" / "config.xml").write_text("<record>", encoding="utf-8")
                with self.assertRaisesRegex(RuntimeError, "Configuration de visages illisible"):
                    server.face_index(refresh=True)


if __name__ == "__main__":
    unittest.main()
