import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server
from assistant_desktop import DesktopApi


class DesktopPathsTest(unittest.TestCase):
    def test_initial_paths_optional_and_user_override(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            initial = root / "initial.txt"
            initial.write_text(f"\n\n{root}\n", encoding="utf-8")
            api = DesktopApi(root, initial)
            self.assertEqual(api.charger_dossiers(), {"logos": "", "visages": "", "sauvegardes": str(root)})
            api.enregistrer_dossiers({"logos": str(root), "visages": "", "sauvegardes": ""})
            self.assertEqual(api.charger_dossiers()["logos"], str(root))
            self.assertEqual(api.charger_dossiers()["sauvegardes"], "")

    def test_invalid_paths_and_data_preserve_existing_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            api = DesktopApi(root, root / "initial.txt")
            api.enregistrer_dossiers({"logos": "", "visages": "", "sauvegardes": ""})
            before = api.config_file.read_text(encoding="utf-8")
            with self.assertRaises(ValueError):
                api.enregistrer_dossiers({"logos": str(root / "absent"), "visages": "", "sauvegardes": ""})
            self.assertEqual(api.config_file.read_text(encoding="utf-8"), before)
            api.config_file.write_text(json.dumps({"logos": 123}), encoding="utf-8")
            with self.assertRaises(ValueError):
                api.charger_dossiers()

    def test_initial_paths_utf16_preserve_unicode_and_empty_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            initial = root / "initial.txt"
            initial.write_text("C:\\Données\\Logos\n\nC:\\Parties\\Sauvegardes\n", encoding="utf-16")
            api = DesktopApi(root, initial)
            self.assertEqual(api.charger_dossiers(), {
                "logos": "C:\\Données\\Logos", "visages": "",
                "sauvegardes": "C:\\Parties\\Sauvegardes",
            })

    def test_optional_graphics_are_empty(self):
        with patch.object(server, "GRAPHICS_ROOT", None), patch.object(server, "FACES_ROOT", None), \
                patch.object(server, "_FACE_INDEX", None):
            self.assertEqual(server._build_graphic_index(), {})
            self.assertEqual(server.face_index(), {"names": {}, "ids": {}, "images": {}})


if __name__ == "__main__":
    unittest.main()
