import json
import os
import sys
import threading
import time
import urllib.request
import tempfile
import subprocess
from pathlib import Path

# Version de l'application (mettre à jour à chaque release)
APP_VERSION = "1.0.7-beta"
APP_VERSION_DATE = "2026-11-12"
# URL du fichier version.json (repo releases dédié)
UPDATE_CHECK_URL = "https://raw.githubusercontent.com/joeybarton6om-sudo/releases/main/version.json"
RELEASES_API_URL = "https://api.github.com/repos/joeybarton6om-sudo/releases/releases?per_page=100"


def fenetre_principale():
    """Handle (HWND) de la fenêtre de plus haut niveau du processus courant."""
    if sys.platform != "win32":
        return None
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    trouve = {"hwnd": None}
    prototype = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def collecte(hwnd, _param):
        if not user32.IsWindowVisible(hwnd):
            return True
        appartient = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(appartient))
        if appartient.value != os.getpid():
            return True
        if user32.GetWindowTextLengthW(hwnd) <= 0:
            return True
        if trouve["hwnd"] is None:
            trouve["hwnd"] = hwnd
            return False
        return True

    user32.EnumWindows(prototype(collecte), 0)
    return trouve["hwnd"]


class DesktopApi:
    def __init__(self, data_dir, initial_file, surveiller=True):
        self.data_dir = data_dir
        self.config_file = data_dir / "dossiers.json"
        self.save_config_file = data_dir / "save-config.json"
        self.initial_file = initial_file
        self.window = None
        self.save_config = self.charger_save_config()
        self.extraction = {"etat": "repos", "message": "", "fichier": ""}
        self.derniere_signature = None
        self.verrou_extraction = threading.Lock()
        if surveiller:
            self._demarrer_surveillance()

    def charger_save_config(self):
        if self.save_config_file.is_file():
            try:
                data = json.loads(self.save_config_file.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                data = {}
            if isinstance(data, dict):
                sauvegarde = data.get("sauvegarde")
                return {
                    "sauvegarde": sauvegarde if isinstance(sauvegarde, str) else "",
                    "auto": bool(data.get("auto", True)),
                }
        return {"sauvegarde": "", "auto": True}

    def enregistrer_save_config(self):
        temporaire = self.save_config_file.with_suffix(".tmp")
        try:
            temporaire.write_text(json.dumps(self.save_config, ensure_ascii=False, indent=2), encoding="utf-8")
            temporaire.replace(self.save_config_file)
        except OSError:
            if temporaire.exists():
                temporaire.unlink()

    def signature_sauvegarde(self):
        chemin = self.save_config["sauvegarde"]
        if not chemin:
            return None
        try:
            etat = Path(chemin).stat()
        except OSError:
            return None
        return (etat.st_mtime_ns, etat.st_size)

    def _demarrer_surveillance(self):
        thread = threading.Thread(target=self._surveiller, name="assistantfm-surveillance", daemon=True)
        thread.start()

    def _surveiller(self):
        while True:
            time.sleep(2)
            try:
                signature = self.signature_sauvegarde()
            except Exception:  # noqa: BLE001 - la surveillance ne doit jamais s'arrêter
                signature = None
            if signature is None:
                continue
            premiere = self.derniere_signature is None
            if not premiere and signature == self.derniere_signature:
                continue
            self.derniere_signature = signature
            if not self.save_config["auto"]:
                continue
            if premiere and not self.donnees_perimees(signature):
                continue
            self.lancer_extraction(auto=True)

    def donnees_perimees(self, signature):
        """Indique si les données extraites sont absentes ou plus anciennes que la sauvegarde."""
        chemin = self.data_dir / "players_data.json"
        try:
            etat = chemin.stat()
        except OSError:
            return signature is not None
        return signature[0] > etat.st_mtime_ns

    def lancer_extraction(self, auto=False, chemin=None):
        if chemin is None:
            chemin = self.save_config["sauvegarde"]
        if not chemin or not Path(chemin).is_file():
            self.extraction = {"etat": "erreur", "message": "Choisissez une sauvegarde .fm valide.", "fichier": ""}
            return self.extraction_etat()
        if not self.verrou_extraction.acquire(blocking=False):
            self.extraction = {"etat": "en_cours", "message": "Extraction déjà en cours.", "fichier": chemin}
            return self.extraction_etat()
        threading.Thread(target=self._extraire, args=(chemin, auto), daemon=True).start()
        return self.extraction_etat()

    def _extraire(self, chemin, auto):
        import server

        progress = self.data_dir / "extraction-progression.json"
        environnement = os.environ.copy()
        environnement["ASSISTANT_FM_PROGRESS_FILE"] = str(progress)
        self.extraction = {"etat": "en_cours", "message": "Extraction en cours…", "fichier": chemin}
        try:
            resultat = server._lancer_parseur(chemin, environnement)
            if resultat.returncode != 0:
                details = (resultat.stderr or resultat.stdout or "").strip()
                raise RuntimeError(details[-400:] or f"Le parseur s'est arrêté (code {resultat.returncode}).")
            self.extraction = {
                "etat": "ok",
                "message": f"Extraction terminée ({'automatique' if auto else 'manuelle'}).",
                "fichier": chemin,
            }
        except Exception as error:  # noqa: BLE001 - l'état est affiché dans l'interface
            self.extraction = {
                "etat": "erreur",
                "message": f"Extraction impossible : {error}",
                "fichier": chemin,
            }
        finally:
            self.verrou_extraction.release()

    def extraction_etat(self):
        return {
            "sauvegarde": self.save_config["sauvegarde"],
            "auto": self.save_config["auto"],
            "extraction": dict(self.extraction),
        }

    def choisir_sauvegarde(self):
        import webview

        if self.window is None:
            raise RuntimeError("La fenêtre n'est pas encore disponible.")
        dossier = Path(self.save_config["sauvegarde"]).parent if self.save_config["sauvegarde"] else Path.home()
        selection = self.window.create_file_dialog(
            webview.FileDialog.OPEN,
            directory=str(dossier if dossier.is_dir() else Path.home()),
            allow_multiple=False,
            file_types=("Sauvegardes Football Manager (*.fm, *.fmf)", "*.fm;*.fmf"),
        )
        if not selection:
            return self.extraction_etat()
        self.save_config["sauvegarde"] = selection[0]
        self.derniere_signature = None
        self.enregistrer_save_config()
        self.lancer_extraction(auto=False)
        return self.extraction_etat()

    def regler_auto(self, actif):
        self.save_config["auto"] = bool(actif)
        self.enregistrer_save_config()
        if self.save_config["auto"] and self.signature_sauvegarde() is not None:
            signature = self.signature_sauvegarde()
            self.derniere_signature = signature
            return {"success": True, "message": "Extraction automatique activée.", "etat": self.extraction_etat()}
        return {"success": True, "message": "Extraction automatique désactivée.", "etat": self.extraction_etat()}

    def recharger(self):
        self.derniere_signature = None
        etat = self.lancer_extraction(auto=False)
        message = etat["extraction"]["message"] if isinstance(etat, dict) else ""
        return {"success": True, "message": message}

    def charger_dossiers(self):
        if self.config_file.is_file():
            data = json.loads(self.config_file.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or set(data) != {"logos", "visages", "sauvegardes", "tactiques"} or any(
                not isinstance(value, str) for value in data.values()
            ):
                raise ValueError("Le fichier des dossiers est invalide ; il n'a pas été modifié.")
            return data
        if self.initial_file.is_file():
            contenu = self.initial_file.read_bytes()
            encoding = "utf-16" if contenu.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig"
            lines = contenu.decode(encoding).splitlines()
            if len(lines) != 4:
                raise ValueError("La configuration initiale des dossiers est invalide.")
            return dict(zip(("logos", "visages", "sauvegardes", "tactiques"), lines))
        return {"logos": "", "visages": "", "sauvegardes": "", "tactiques": ""}

    def choisir_dossier(self, chemin):
        import webview

        if self.window is None:
            raise RuntimeError("La fenêtre n'est pas encore disponible.")
        initial = chemin if chemin and Path(chemin).is_dir() else str(Path.home())
        selection = self.window.create_file_dialog(webview.FileDialog.FOLDER, directory=initial)
        return selection[0] if selection else None

    def enregistrer_dossiers(self, dossiers):
        if not isinstance(dossiers, dict) or set(dossiers) != {"logos", "visages", "sauvegardes", "tactiques"}:
            raise ValueError("Liste de dossiers invalide.")
        for value in dossiers.values():
            if not isinstance(value, str) or (value and not Path(value).is_dir()):
                raise ValueError(f"Dossier introuvable : {value}")
        temporaire = self.config_file.with_suffix(".tmp")
        try:
            temporaire.write_text(json.dumps(dossiers, ensure_ascii=False, indent=2), encoding="utf-8")
            temporaire.replace(self.config_file)
        finally:
            if temporaire.exists():
                temporaire.unlink()
        return "Dossiers enregistrés. Redémarrez l'application pour appliquer les changements."

    def ouvrir_sauvegardes(self):
        chemin = self.charger_dossiers()["sauvegardes"]
        if not chemin or not Path(chemin).is_dir():
            raise ValueError("Dossier de sauvegardes non défini ou introuvable : choisissez-le dans les paramètres.")
        os.startfile(chemin)

    def get_app_version(self):
        """Retourne la version actuelle de l'application."""
        return {"version": APP_VERSION, "date": APP_VERSION_DATE}

    def get_download_count(self):
        """Retourne le nombre total de téléchargements de l'application (assets .exe)."""
        try:
            req = urllib.request.Request(
                RELEASES_API_URL,
                headers={"User-Agent": "AssistantFM/1.0", "Accept": "application/vnd.github+json"},
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                releases = json.loads(response.read().decode())
            total = 0
            for release in releases:
                for asset in release.get("assets", []):
                    if str(asset.get("name", "")).lower().endswith(".exe"):
                        total += int(asset.get("download_count", 0))
            return {"success": True, "count": total}
        except Exception as e:
            return {"success": False, "error": str(e), "count": 0}

    def check_for_update(self):
        """Vérifie s'il y a une mise à jour disponible."""
        try:
            with urllib.request.urlopen(UPDATE_CHECK_URL, timeout=10) as response:
                data = json.loads(response.read().decode())
            latest = data.get("version", "")
            return {
                "available": latest != APP_VERSION,
                "current": APP_VERSION,
                "latest": latest,
                "url": data.get("url", ""),
                "changelog": data.get("changelog", ""),
                "date": data.get("date", "")
            }
        except Exception as e:
            return {"available": False, "error": str(e)}

    def download_and_install_update(self, url):
        """Télécharge l'installateur et retourne son chemin."""
        import urllib.request
        import urllib.error
        import tempfile
        import os

        installer_path = None
        try:
            # Téléchargement avec timeout et progression
            req = urllib.request.Request(url, headers={'User-Agent': 'AssistantFM/1.0'})
            with urllib.request.urlopen(req, timeout=120) as response:
                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0
                chunk_size = 8192

                with tempfile.NamedTemporaryFile(suffix=".exe", delete=False) as tmp:
                    installer_path = tmp.name
                    while True:
                        chunk = response.read(chunk_size)
                        if not chunk:
                            break
                        tmp.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0 and downloaded % (chunk_size * 100) == 0:
                            print(f"[Update] {int(downloaded * 100 / total_size)}% ({downloaded}/{total_size} bytes)")

            # Vérifier que le fichier n'est pas vide
            if os.path.getsize(installer_path) < 1000000:  # moins de 1 Mo
                raise Exception("Fichier téléchargé invalide (trop petit)")

            print(f"[Update] Téléchargement terminé ({os.path.getsize(installer_path)} bytes)")
            return {"success": True, "installer_path": installer_path}

        except urllib.error.HTTPError as e:
            return {"success": False, "error": f"HTTP {e.code}: {e.reason}"}
        except urllib.error.URLError as e:
            return {"success": False, "error": f"Erreur réseau: {e.reason}"}
        except Exception as e:
            # Nettoyer le fichier temporaire en cas d'erreur
            if installer_path and os.path.exists(installer_path):
                try:
                    os.unlink(installer_path)
                except:
                    pass
            return {"success": False, "error": str(e)}

    def run_installer_and_quit(self, installer_path):
        """Lance l'installateur en mode silencieux puis ferme l'application."""
        import subprocess
        import threading
        import time

        if not installer_path or not os.path.exists(installer_path):
            return {"success": False, "error": "Installateur introuvable."}
        try:
            subprocess.Popen([installer_path, "/S"], shell=False)
        except Exception as e:
            return {"success": False, "error": str(e)}

        def _quit():
            time.sleep(0.5)
            try:
                import webview
                for window in webview.windows:
                    window.destroy()
            except Exception:
                pass
            os._exit(0)

        threading.Thread(target=_quit, daemon=True).start()
        return {"success": True, "message": "Mise à jour lancée"}


def serveur_repondu():
    """Indique si un serveur Assistant FM écoute déjà sur le port local."""
    import socket

    try:
        with socket.create_connection((server_host(), server_port()), timeout=0.6):
            return True
    except OSError:
        return False


def server_host():
    return "127.0.0.1"


def server_port():
    return 8766


def main():
    arguments = sys.argv[1:]
    if arguments and arguments[0] == "--fmsave":
        from fmsave.cli import main as fmsave_main

        sys.argv.pop(1)
        return fmsave_main()
    if arguments and arguments[0] == "--parse":
        from parser import extraire_sauvegarde_totale

        if len(arguments) != 2:
            print("Usage : AssistantFM.exe --parse <sauvegarde>")
            return 2
        try:
            extraire_sauvegarde_totale(arguments[1])
            return 0
        except (FileNotFoundError, RuntimeError, ValueError, OSError) as error:
            print(f"Erreur d'extraction : {error}")
            return 1

    import server
    import webview

    local_app_data = os.environ.get("LOCALAPPDATA")
    if not local_app_data:
        raise RuntimeError("Le dossier LOCALAPPDATA de Windows est indisponible.")
    data_dir = Path(local_app_data) / "AssistantFM"
    data_dir.mkdir(parents=True, exist_ok=True)
    os.environ["ASSISTANT_FM_DATA_DIR"] = str(data_dir)
    app_dir = Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
    deja_la = serveur_repondu()
    api = DesktopApi(data_dir, app_dir / "dossiers-initiaux.txt", surveiller=not deja_la)
    dossiers = api.charger_dossiers()
    server.GRAPHICS_ROOT = Path(dossiers["logos"]) if dossiers["logos"] else None
    server.FACES_ROOT = Path(dossiers["visages"]) if dossiers["visages"] else None
    port = server_port()
    url = f"http://{server_host()}:{port}/"

    if deja_la:
        api.window = webview.create_window(
            "Assistant FM",
            url,
            js_api=api,
            width=1400,
            height=900,
            min_size=(800, 600),
        )
        webview.start(gui="edgechromium", private_mode=False, storage_path=str(data_dir / "webview"), debug=False)
        return 0

    httpd = server.AssistantServer((server_host(), port), server.AssistantHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        api.window = webview.create_window(
            "Assistant FM",
            url,
            js_api=api,
            width=1400,
            height=900,
            min_size=(800, 600),
        )
        webview.start(gui="edgechromium", private_mode=False, storage_path=str(data_dir / "webview"), debug=False)
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        if sys.platform == "win32" and len(sys.argv) == 1:
            import ctypes

            ctypes.windll.user32.MessageBoxW(0, f"Impossible de démarrer Assistant FM : {error}", "Assistant FM", 0x10)
        else:
            print(f"Erreur : {error}", file=sys.stderr)
        sys.exit(1)
