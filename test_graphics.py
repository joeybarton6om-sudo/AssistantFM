import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen
from unittest.mock import patch

import server


class IndexGraphiquesTest(unittest.TestCase):
    def test_configurations_recursives_et_sources_distantes(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            clubs = racine / "Men" / "clubs"
            competitions = racine / "Men" / "competitions"
            config_nations = racine / "Men" / "nations" / "config"
            images_nations = racine / "Men" / "nations"
            for dossier in (clubs, competitions, config_nations):
                dossier.mkdir(parents=True)
            (clubs / "TCM1_42.png").write_bytes(b"club")
            (competitions / "TCM2_71.png").write_bytes(b"competition")
            (images_nations / "TCM3_9.png").write_bytes(b"nation")
            (clubs / "config.xml").write_text(
                "<record><list>"
                "<record from='TCM1_42' to='graphics/pictures/club/42/logo'/>"
                "<record from='../competitions/TCM2_71' to='graphics/pictures/club/99/logo'/>"
                "</list></record>", encoding="utf-8"
            )
            (competitions / "config.xml").write_text(
                '<record><record from="TCM2_71" to="graphics/pictures/comp/71/logo"/></record>',
                encoding="utf-8"
            )
            (config_nations / "config.xml").write_text(
                '<fm:record xmlns:fm="urn:football-manager">'
                '<fm:record from="TCM3_9" to="graphics/pictures/nation/9/logo"/>'
                '</fm:record>',
                encoding="utf-8"
            )
            with patch.object(server, "GRAPHICS_ROOT", racine), patch.object(server, "_GRAPHIC_INDEX", None):
                index = server.graphic_index()
                self.assertIs(index, server.graphic_index())
            self.assertEqual(index[("club", "42")], (clubs / "TCM1_42.png").resolve())
            self.assertEqual(index[("comp", "71")], (competitions / "TCM2_71.png").resolve())
            self.assertEqual(index[("nation", "9")], (images_nations / "TCM3_9.png").resolve())
            self.assertEqual(index[("club", "99")], (competitions / "TCM2_71.png").resolve())

    def test_sans_verification_par_image_et_priorite_locale(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            local = racine / "Men" / "clubs"
            distant = racine / "autre"
            local.mkdir(parents=True)
            distant.mkdir()
            (local / "logo.png").write_bytes(b"local")
            (local / "logo.jpg").write_bytes(b"autre format")
            (distant / "logo.png").write_bytes(b"distant")
            (local / "config.xml").write_text(
                '<record><record from="logo" to="graphics/pictures/club/42/logo"/>'
                '<record from="logo.jpg" to="graphics/pictures/club/43/logo"/></record>',
                encoding="utf-8"
            )
            with patch.object(server, "GRAPHICS_ROOT", racine), patch.object(server, "_GRAPHIC_INDEX", None), \
                    patch.object(Path, "is_file", side_effect=AssertionError("Vérification de fichier inutile")):
                index = server.graphic_index()
            self.assertEqual(index[("club", "42")], local / "logo.png")
            self.assertEqual(index[("club", "43")], local / "logo.jpg")

    def test_index_construit_une_seule_fois_pour_des_requetes_concurrentes(self):
        debut = threading.Event()
        continuer = threading.Event()
        index = {("club", "1"): Path("logo.png")}

        def construire():
            debut.set()
            if not continuer.wait(timeout=5):
                raise TimeoutError("La construction de l'index n'a pas été libérée.")
            return index

        with patch.object(server, "_GRAPHIC_INDEX", None), \
                patch.object(server, "_build_graphic_index", side_effect=construire) as build, \
                ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(server.graphic_index) for _ in range(4)]
            try:
                self.assertTrue(debut.wait(timeout=5))
            finally:
                continuer.set()
            self.assertTrue(all(future.result(timeout=5) is index for future in futures))
            self.assertEqual(build.call_count, 1)

    def test_configuration_invalide_signalee(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            (racine / "config.xml").write_text("<record>", encoding="utf-8")
            with patch.object(server, "GRAPHICS_ROOT", racine), patch.object(server, "_GRAPHIC_INDEX", None):
                with self.assertRaisesRegex(RuntimeError, "Configuration graphique illisible"):
                    server.graphic_index()

    def test_livraison_locale_et_refus_hors_racine(self):
        with tempfile.TemporaryDirectory() as temporaire:
            racine = Path(temporaire)
            graphiques = racine / "graphics"
            graphiques.mkdir()
            image = graphiques / "logo.png"
            image.write_bytes(b"image locale")
            hors_racine = racine / "secret.png"
            hors_racine.write_bytes(b"hors racine")
            index = {
                ("club", "1"): image,
                ("club", "2"): hors_racine,
                ("club", "3"): graphiques / "absent.png",
            }
            with patch.object(server, "GRAPHICS_ROOT", graphiques), patch.object(server, "_GRAPHIC_INDEX", index):
                httpd = server.AssistantServer(("127.0.0.1", 0), server.AssistantHandler)
                thread = threading.Thread(target=httpd.serve_forever)
                thread.start()
                try:
                    adresse = f"http://127.0.0.1:{httpd.server_port}"
                    with urlopen(f"{adresse}/api/logo/club/1") as response:
                        self.assertEqual(response.read(), b"image locale")
                        self.assertEqual(response.headers.get_content_type(), "image/png")
                    for identifiant in ("2", "3", "4"):
                        with self.assertRaises(HTTPError) as error:
                            urlopen(f"{adresse}/api/logo/club/{identifiant}")
                        self.assertEqual(error.exception.code, 404)
                        error.exception.close()
                finally:
                    httpd.shutdown()
                    thread.join()
                    httpd.server_close()


if __name__ == "__main__":
    unittest.main()
