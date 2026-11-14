import http.client
import json
import os
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import parser
import server


class ProgressionTest(unittest.TestCase):
    def test_script_outils_persistants_est_servi(self):
        with patch.object(server.AssistantHandler, "log_message"):
            httpd = server.AssistantServer(("127.0.0.1", 0), server.AssistantHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
            try:
                connection.request("GET", "/outils_persistants.js")
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertIn("javascript", response.getheader("Content-Type"))
                self.assertIn(b"validerOutilsPersistants", response.read())
            finally:
                connection.close()
                httpd.shutdown()
                httpd.server_close()
                thread.join(10)

    def test_module_licence_est_servi_et_embarque(self):
        with patch.object(server.AssistantHandler, "log_message"):
            httpd = server.AssistantServer(("127.0.0.1", 0), server.AssistantHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
            try:
                connection.request("GET", "/license_binding.js")
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertIn("javascript", response.getheader("Content-Type"))
                self.assertIn(b"window.LicenseBinding", response.read())
                self.assertIn('"license_binding.js"', Path("assistant_desktop.spec").read_text(encoding="utf-8"))
            finally:
                connection.close()
                httpd.shutdown()
                httpd.server_close()
                thread.join(10)

    def test_donnees_extraites_sont_servies_sans_charger_le_fichier_entier(self):
        with tempfile.TemporaryDirectory() as dossier:
            contenu = b'{"joueurs":[],"staff":[]}' + b" " * (3 * 1024 * 1024)
            (Path(dossier) / "players_data.json").write_bytes(contenu)
            with patch.dict(os.environ, {"ASSISTANT_FM_DATA_DIR": dossier}), \
                    patch.object(server.AssistantHandler, "log_message"), \
                    patch.object(Path, "read_bytes", side_effect=AssertionError("Lecture complète interdite")):
                httpd = server.AssistantServer(("127.0.0.1", 0), server.AssistantHandler)
                thread = threading.Thread(target=httpd.serve_forever, daemon=True)
                thread.start()
                connection = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
                try:
                    connection.request("GET", "/players_data.json")
                    response = connection.getresponse()
                    self.assertEqual(response.status, 200)
                    self.assertEqual(int(response.getheader("Content-Length")), len(contenu))
                    self.assertEqual(response.read(), contenu)
                finally:
                    connection.close()
                    httpd.shutdown()
                    httpd.server_close()
                    thread.join(10)

    def test_signalement_atomique_et_facultatif(self):
        with tempfile.TemporaryDirectory() as dossier:
            path = Path(dossier) / "progress.json"
            with patch.dict(os.environ, {"ASSISTANT_FM_PROGRESS_FILE": str(path)}):
                parser.signaler_etape("Extraction des joueurs")
                self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"etape": "Extraction des joueurs"})
                parser.signaler_etape("Extraction des tactiques")
                self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"etape": "Extraction des tactiques"})
                self.assertFalse(path.with_suffix(".tmp").exists())
            with patch.dict(os.environ, {}, clear=True):
                parser.signaler_etape("Sans suivi")
                self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["etape"], "Extraction des tactiques")

    def test_suivi_et_extraction_exclusive(self):
        with tempfile.TemporaryDirectory() as dossier:
            root = Path(dossier)
            (root / "players_data.json").write_text('{"joueurs": [], "staff": []}', encoding="utf-8")
            demarre, continuer = threading.Event(), threading.Event()

            def extraction_fictive(*args, **kwargs):
                path = Path(kwargs["env"]["ASSISTANT_FM_PROGRESS_FILE"])
                path.write_text('{"etape":"Extraction des tactiques"}', encoding="utf-8")
                demarre.set()
                if not continuer.wait(10):
                    raise TimeoutError("Test interrompu : extraction non libérée")
                return subprocess.CompletedProcess(args[0], 0, stdout="", stderr="")

            with patch.object(server, "ROOT", root), \
                    patch.object(server.subprocess, "run", side_effect=extraction_fictive), \
                    patch.object(server.AssistantHandler, "log_message"):
                httpd = server.AssistantServer(("127.0.0.1", 0), server.AssistantHandler)
                thread = threading.Thread(target=httpd.serve_forever, daemon=True)
                thread.start()
                port = httpd.server_address[1]

                def requete(method, path, body=None):
                    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
                    try:
                        connection.request(method, path, body=body)
                        response = connection.getresponse()
                        return response.status, json.loads(response.read())
                    finally:
                        connection.close()

                resultat = []
                token = "a" * 32
                worker = threading.Thread(target=lambda: resultat.append(
                    requete("POST", f"/api/extract?filename=test.fm&id={token}", b"save")
                ))
                try:
                    worker.start()
                    self.assertTrue(demarre.wait(10))
                    status, payload = requete("GET", f"/api/extract-status?id={token}")
                    self.assertEqual((status, payload["etape"]), (200, "Extraction des tactiques"))
                    self.assertEqual(requete("GET", f"/api/extract-status?id={'b' * 32}")[0], 404)
                    self.assertEqual(requete("POST", f"/api/extract?filename=test.fm&id={'b' * 32}", b"save")[0], 409)
                finally:
                    continuer.set()
                    worker.join(10)
                    httpd.shutdown()
                    httpd.server_close()
                    thread.join(10)
                self.assertFalse(worker.is_alive())
                self.assertEqual(resultat[0][0], 200)
                self.assertEqual((resultat[0][1]["joueurs"], resultat[0][1]["staff"]), (0, 0))
                self.assertNotIn("data", resultat[0][1])
                self.assertNotIn(token, server._EXTRACTION_STATUS)
                self.assertFalse(server._EXTRACTION_LOCK.locked())

    def test_erreur_parseur_libere_verrou_et_statut(self):
        with tempfile.TemporaryDirectory() as dossier, \
                patch.object(server, "ROOT", Path(dossier)), \
                patch.object(server.subprocess, "run", return_value=subprocess.CompletedProcess(
                    [], 1, stdout="", stderr="Sauvegarde invalide"
                )), patch.object(server.AssistantHandler, "log_message"):
            httpd = server.AssistantServer(("127.0.0.1", 0), server.AssistantHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
            token = "c" * 32
            try:
                connection.request("POST", f"/api/extract?filename=test.fm&id={token}", body=b"save")
                response = connection.getresponse()
                self.assertEqual(response.status, 500)
                self.assertIn("Sauvegarde invalide", json.loads(response.read())["error"])
            finally:
                connection.close()
                httpd.shutdown()
                httpd.server_close()
                thread.join(10)
            self.assertNotIn(token, server._EXTRACTION_STATUS)
            self.assertFalse(server._EXTRACTION_LOCK.locked())

    def test_application_installee_utilise_extracteur_dedie(self):
        with tempfile.TemporaryDirectory() as dossier, \
                patch.object(server, "ROOT", Path(dossier)), \
                patch.object(server.sys, "frozen", True, create=True), \
                patch.object(server.sys, "executable", str(Path(dossier) / "AssistantFM.exe")), \
                patch.object(server.subprocess, "run", return_value=subprocess.CompletedProcess(
                    [], 1, stdout="", stderr="Sauvegarde invalide"
                )) as lancer, patch.object(server.AssistantHandler, "log_message"):
            httpd = server.AssistantServer(("127.0.0.1", 0), server.AssistantHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
            try:
                connection.request("POST", "/api/extract?filename=test.fm", body=b"save")
                response = connection.getresponse()
                self.assertEqual(response.status, 500)
                self.assertIn("Sauvegarde invalide", json.loads(response.read())["error"])
                self.assertEqual(lancer.call_args.args[0][:2],
                                 [str(Path(dossier) / "AssistantFM-extracteur.exe"), "--parse"])
                self.assertEqual(lancer.call_args.kwargs["creationflags"],
                                 getattr(subprocess, "CREATE_NO_WINDOW", 0))
            finally:
                connection.close()
                httpd.shutdown()
                httpd.server_close()
                thread.join(10)


if __name__ == "__main__":
    unittest.main()
