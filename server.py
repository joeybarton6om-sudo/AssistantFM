import json
import mimetypes
import os
import re
import socket
import subprocess
import sys
import tempfile
import threading
import unicodedata
import webbrowser
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from noms_fm import noms_competitions


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 8765
MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024
GRAPHICS_ROOT = (
    Path.home()
    / "Documents"
    / "Sports Interactive"
    / "Football Manager 27"
    / "graphics"
)
FACES_ROOT = GRAPHICS_ROOT / "faces"
_GRAPHIC_INDEX = None
_GRAPHIC_INDEX_LOCK = threading.Lock()
_FACE_INDEX = None
_EXTRACTION_LOCK = threading.Lock()
_EXTRACTION_STATUS_LOCK = threading.Lock()
_EXTRACTION_STATUS = {}


def _identifiant_joueur(joueur):
    return str(joueur.get("unique_id") or joueur.get("uid") or "")


def _jours_restants(date_fin, reference):
    if not date_fin or reference is None:
        return None
    try:
        fin = datetime.strptime(str(date_fin)[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return None
    return (fin - reference).days


def _commandes_parseur():
    """Commandes possibles pour lancer l'extraction, de la plus spécifique à la plus générale."""
    if getattr(sys, "frozen", False):
        extracteur = Path(sys.executable).with_name("AssistantFM-extracteur.exe")
        return [[str(extracteur), "--parse"], [sys.executable, "--parse"]]
    return [[sys.executable, str(ROOT / "parser.py")]]


def _lancer_parseur(save_path, environment):
    """Lance le parseur ; bascule sur l'exécutable principal si l'extracteur dédié est absent."""
    derniere_erreur = None
    for commande in _commandes_parseur():
        try:
            return subprocess.run(
                [*commande, str(save_path)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                env=environment,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                timeout=1800,
                check=False,
            )
        except FileNotFoundError as error:
            derniere_erreur = error
    if derniere_erreur is not None:
        raise derniere_erreur


class AssistantServer(ThreadingHTTPServer):
    if sys.platform == "win32":
        allow_reuse_address = False

    def server_bind(self):
        if sys.platform == "win32":
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def graphic_index():
    global _GRAPHIC_INDEX
    if _GRAPHIC_INDEX is not None:
        return _GRAPHIC_INDEX

    with _GRAPHIC_INDEX_LOCK:
        if _GRAPHIC_INDEX is None:
            _GRAPHIC_INDEX = _build_graphic_index()
        return _GRAPHIC_INDEX


def _build_graphic_index():
    if GRAPHICS_ROOT is None:
        return {}
    image_extensions = (".png", ".jpg", ".jpeg", ".webp")
    images_by_name = {}
    images_by_path = {}
    configurations = []
    root = GRAPHICS_ROOT.resolve()
    for folder, directories, filenames in os.walk(root):
        directories.sort()
        for filename in filenames:
            if filename.casefold() == "config.xml":
                configurations.append(Path(folder) / filename)
                continue
            if Path(filename).suffix.lower() not in image_extensions:
                continue
            path = os.path.join(folder, filename)
            absolute_path = os.path.abspath(path)
            images_by_path[os.path.normcase(absolute_path)] = absolute_path
            stem, extension = os.path.splitext(filename)
            if extension.lower() in image_extensions:
                images_by_name.setdefault(stem.casefold(), []).append(absolute_path)

    graphics = {}
    for paths in images_by_name.values():
        paths.sort()
    target_pattern = re.compile(
        r"^graphics/pictures/(club|comp|nation)/(\d+)/logo$",
        re.IGNORECASE,
    )
    for config_path in sorted(configurations):
        try:
            config = ET.parse(config_path)
        except (OSError, ET.ParseError) as error:
            raise RuntimeError(f"Configuration graphique illisible {config_path}: {error}") from error

        for record in config.iter():
            if record.tag.rsplit("}", 1)[-1].casefold() != "record":
                continue
            source = record.get("from")
            target = record.get("to", "").strip()
            target_match = target_pattern.fullmatch(target)
            if not source or not target_match:
                continue

            source_path = Path(source.replace("\\", "/"))
            if source_path.is_absolute():
                continue
            local_source = Path(os.path.abspath(config_path.parent / source_path))
            if not local_source.is_relative_to(root):
                continue
            if local_source.suffix:
                candidates = [images_by_path.get(os.path.normcase(str(local_source)))]
            else:
                candidates = [
                    images_by_path.get(os.path.normcase(str(local_source.with_suffix(extension))))
                    for extension in image_extensions
                ]
            image_path = next((candidate for candidate in candidates if candidate), None)
            if image_path is None:
                image_path = next(iter(images_by_name.get(source_path.stem.casefold(), [])), None)
            if image_path is None:
                continue

            kind, identifier = target_match.groups()
            key = (kind.lower(), identifier)
            relative_parts = Path(os.path.relpath(image_path, root)).parts
            is_men_pack = "Men" in relative_parts
            has_tcm_name = os.path.splitext(os.path.basename(image_path))[0].casefold().startswith(
                {"club": "tcm1_", "comp": "tcm2_", "nation": "tcm3_"}[kind.lower()]
            )
            priority = (int(is_men_pack), int(has_tcm_name))
            existing = graphics.get(key)
            if existing is None or priority > existing[0]:
                graphics[key] = (priority, image_path)

    return {key: Path(value[1]) for key, value in graphics.items()}


def normaliser_nom_visage(nom):
    normalise = unicodedata.normalize("NFKD", str(nom or "").casefold())
    return "".join(
        caractere for caractere in normalise
        if caractere.isalnum() and not unicodedata.combining(caractere)
    )


def face_index(refresh=False):
    global _FACE_INDEX
    if _FACE_INDEX is not None and not refresh:
        return _FACE_INDEX
    noms = {}
    images = {}
    conflits = set()
    pattern = re.compile(r"graphics/pictures/person/(r-)?(\d+)/portrait", re.IGNORECASE)
    if FACES_ROOT is None or not FACES_ROOT.is_dir():
        _FACE_INDEX = {"names": {}, "ids": {}, "images": {}}
        return _FACE_INDEX
    racine = FACES_ROOT.resolve()
    for configuration in sorted(FACES_ROOT.rglob("config.xml")):
        try:
            parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))
            arbre = ET.parse(configuration, parser=parser)
        except (OSError, ET.ParseError) as error:
            raise RuntimeError(f"Configuration de visages illisible {configuration}: {error}") from error
        for parent in arbre.iter():
            nom = None
            for record in parent:
                if record.tag is ET.Comment:
                    nom = record.text or ""
                    continue
                correspondance = pattern.fullmatch(record.get("to", ""))
                source = record.get("from", "")
                if record.tag != "record" or not correspondance or not source:
                    nom = None
                    continue
                chemin = Path(source.replace("\\", "/"))
                if chemin.is_absolute() or ".." in chemin.parts:
                    nom = None
                    continue
                base = configuration.parent / chemin
                candidats = [base] if base.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") else [
                    base.with_suffix(extension) for extension in (".png", ".jpg", ".jpeg", ".webp")
                ]
                image = next((p.resolve() for p in candidats if p.is_file()), None)
                if image is None or not image.is_relative_to(racine):
                    nom = None
                    continue
                cle = f"{'r-' if correspondance.group(1) else ''}{correspondance.group(2)}"
                if cle in images and images[cle] != image:
                    conflits.add(cle)
                else:
                    images[cle] = image
                nom_cle = normaliser_nom_visage(nom)
                if nom_cle:
                    noms.setdefault(nom_cle, set()).add(cle)
                nom = None
    for cle in conflits:
        images.pop(cle, None)
    noms_par_image = {}
    for nom, cles in noms.items():
        for cle in cles:
            noms_par_image.setdefault(cle, set()).add(nom)
    _FACE_INDEX = {
        "names": {
            nom: next(iter(cles))
            for nom, cles in noms.items()
            if len(cles) == 1
            and next(iter(cles)) in images
            and len(noms_par_image[next(iter(cles))]) == 1
        },
        "ids": {cle: cle for cle in images if cle.isdigit()},
        "images": images,
    }
    return _FACE_INDEX


class AssistantHandler(BaseHTTPRequestHandler):
    server_version = "AssistantFM/1.0"

    def log_message(self, format_string, *args):
        print(f"[Assistant FM] {format_string % args}")

    def _json(self, status, payload):
        content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def _send_transparent_pixel(self):
        pixel = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x00\x1d\x0b\x1d\x0e\x00\x00\x00\x00IEND\xaeB`\x82"
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(pixel)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(pixel)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/activation-key":
            public_key_path = ROOT / "activation_public.pem"
            if not public_key_path.is_file():
                self._json(404, {"error": "Le système d’activation n’est pas configuré."})
                return
            try:
                content = public_key_path.read_bytes()
            except OSError as error:
                print(f"[Assistant FM] Clé publique d’activation illisible : {error}")
                self._json(500, {"error": "Clé publique d’activation illisible."})
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)
            return

        if path == "/api/extract-status":
            token = parse_qs(urlsplit(self.path).query).get("id", [""])[0]
            with _EXTRACTION_STATUS_LOCK:
                status = _EXTRACTION_STATUS.get(token)
                if status is not None:
                    status = dict(status)
            if status is None:
                self._json(404, {"error": "Extraction introuvable ou terminée."})
                return
            progress_path = status.pop("progress_path", None)
            if progress_path:
                try:
                    with open(progress_path, encoding="utf-8") as progress_file:
                        progress = json.load(progress_file)
                    status["etape"] = progress["etape"]
                except FileNotFoundError:
                    pass
                except (OSError, ValueError, KeyError) as error:
                    self._json(500, {"error": f"Progression illisible : {error}"})
                    return
            self._json(200, status)
            return

        if path == "/api/noms-competitions":
            try:
                self._json(200, noms_competitions())
            except (OSError, UnicodeError, ValueError) as error:
                print(f"[Assistant FM] Noms de compétitions illisibles : {error}")
                self._json(500, {"error": f"Noms de compétitions illisibles : {error}"})
            return

        if path == "/api/dossiers":
            try:
                data_dir = Path(os.environ.get("ASSISTANT_FM_DATA_DIR", ROOT))
                config_file = data_dir / "dossiers.json"
                if config_file.is_file():
                    data = json.loads(config_file.read_text(encoding="utf-8"))
                else:
                    data = {"logos": "", "visages": "", "sauvegardes": "", "tactiques": ""}
                self._json(200, data)
            except (OSError, json.JSONDecodeError) as error:
                print(f"[Assistant FM] Dossiers illisibles : {error}")
                self._json(500, {"error": f"Dossiers illisibles : {error}"})
            return

        if path == "/api/face-index":
            try:
                index = face_index(refresh=True)
                self._json(200, {"names": index["names"], "ids": index["ids"]})
            except RuntimeError as error:
                print(f"[Assistant FM] {error}")
                self._json(500, {"error": str(error)})
            return

        face_match = re.fullmatch(r"/api/face/((?:r-)?\d+)", path)
        if face_match:
            identifiant = face_match.group(1)
            try:
                image_path = face_index()["images"].get(identifiant)
            except RuntimeError as error:
                print(f"[Assistant FM] {error}")
                self.send_error(500, "Configuration de visages illisible.")
                return
            if image_path is None or not image_path.is_file():
                self.send_error(404, "Visage local introuvable pour cet identifiant.")
                return
            content = image_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(image_path.name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(content)
            return

        logo_match = re.fullmatch(r"/api/logo/(club|comp|nation)/(\d+)", path)
        if logo_match:
            try:
                logo_path = graphic_index().get(logo_match.groups())
            except RuntimeError as error:
                print(f"[Assistant FM] {error}")
                self.send_error(500, "Configuration graphique illisible.")
                return
            if logo_path is None:
                return self._send_transparent_pixel()
            try:
                logo_path = logo_path.resolve(strict=True)
                if not logo_path.is_relative_to(GRAPHICS_ROOT.resolve()):
                    return self._send_transparent_pixel()
                content = logo_path.read_bytes()
            except FileNotFoundError:
                return self._send_transparent_pixel()
            except OSError as error:
                print(f"[Assistant FM] Logo local illisible {logo_path}: {error}")
                self.send_error(500, "Logo local illisible.")
                return
            self.send_response(200)
            self.send_header(
                "Content-Type",
                mimetypes.guess_type(logo_path.name)[0] or "application/octet-stream",
            )
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(content)
            return

        allowed = {
            "/": ROOT / "index.html",
            "/index.html": ROOT / "index.html",
            "/app.js": ROOT / "app.js",
            "/analyse_recrutement.js": ROOT / "analyse_recrutement.js",
            "/alertes.js": ROOT / "alertes.js",
            "/suivi.js": ROOT / "suivi.js",
            "/comparateur.js": ROOT / "comparateur.js",
            "/donnees_locales.js": ROOT / "donnees_locales.js",
            "/ponderations.js": ROOT / "ponderations.js",
            "/plan_sportif.js": ROOT / "plan_sportif.js",
            "/performances.js": ROOT / "performances.js",
            "/directeur_sportif.js": ROOT / "directeur_sportif.js",
            "/recrutement_poste.js": ROOT / "recrutement_poste.js",
            "/optimisation_tactique.js": ROOT / "optimisation_tactique.js",
            "/outils_persistants.js": ROOT / "outils_persistants.js",
            "/desktop_bridge.js": ROOT / "desktop_bridge.js",
            "/tcmlogos-logo.png": ROOT / "tcmlogos-logo.png",
            "/players_data.json": Path(os.environ.get("ASSISTANT_FM_DATA_DIR", ROOT)) / "players_data.json",
        }
        file_path = allowed.get(path)
        if file_path is None:
            self.send_error(404)
            return
        if not file_path.is_file():
            self.send_error(404)
            return
        content_type = {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
        }.get(file_path.suffix, mimetypes.guess_type(file_path.name)[0] or "application/octet-stream")
        content_length = file_path.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(content_length))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with file_path.open("rb") as file:
            while chunk := file.read(1024 * 1024):
                self.wfile.write(chunk)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path != "/api/extract":
            self.send_error(404)
            return
        try:
            content_length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self._json(400, {"error": "Taille de fichier manquante ou invalide."})
            return
        if content_length <= 0 or content_length > MAX_UPLOAD_BYTES:
            self._json(413, {"error": "La sauvegarde doit faire moins de 2 Go."})
            return

        query = parse_qs(urlsplit(self.path).query)
        filename = Path(query.get("filename", [""])[0]).name
        if not filename.lower().endswith((".fm", ".fmf")):
            self._json(400, {"error": "Sélectionnez un fichier de sauvegarde .fm ou .fmf."})
            return

        token = query.get("id", [""])[0]
        if token and not re.fullmatch(r"[a-f0-9]{32}", token):
            self._json(400, {"error": "Identifiant d'extraction invalide."})
            return
        if not _EXTRACTION_LOCK.acquire(blocking=False):
            self._json(409, {"error": "Une extraction est déjà en cours. Attendez sa fin."})
            return
        if token:
            with _EXTRACTION_STATUS_LOCK:
                _EXTRACTION_STATUS[token] = {"etape": "Réception de la sauvegarde"}
        try:
            self._extraire(filename, content_length, token)
        finally:
            if token:
                with _EXTRACTION_STATUS_LOCK:
                    _EXTRACTION_STATUS.pop(token, None)
            _EXTRACTION_LOCK.release()

    def _extraire(self, filename, content_length, token):
        try:
            with tempfile.TemporaryDirectory(prefix="assistantfm_save_") as temporary_dir:
                save_path = Path(temporary_dir) / filename
                remaining = content_length
                with save_path.open("wb") as save_file:
                    while remaining:
                        chunk = self.rfile.read(min(1024 * 1024, remaining))
                        if not chunk:
                            self._json(400, {"error": "Envoi interrompu avant la fin de la sauvegarde."})
                            return
                        save_file.write(chunk)
                        remaining -= len(chunk)

                progress_path = str(Path(temporary_dir) / "progress.json")
                if token:
                    with _EXTRACTION_STATUS_LOCK:
                        _EXTRACTION_STATUS[token] = {
                            "etape": "Démarrage du parseur",
                            "progress_path": progress_path,
                        }
                environment = os.environ.copy()
                environment["ASSISTANT_FM_PROGRESS_FILE"] = progress_path
                try:
                    result = _lancer_parseur(save_path, environment)
                except subprocess.TimeoutExpired:
                    self._json(504, {"error": "L'extraction a dépassé le délai maximal de 30 minutes."})
                    return

            if result.returncode != 0:
                details = result.stderr.strip() or result.stdout.strip()
                if not details:
                    if sys.platform == "win32" and result.returncode == 0xC0000142:
                        details = (
                            "Windows n'a pas pu démarrer le parseur "
                            "(0xC0000142). Fermez toutes les fenêtres du serveur "
                            "Assistant FM, puis relancez « Lancer Assistant FM.bat » "
                            "et réessayez."
                        )
                    else:
                        details = (
                            "Le parseur s'est arrêté sans message "
                            f"(code de sortie {result.returncode})."
                        )
                self._json(500, {"error": details[-4000:]})
                return

            data_path = Path(os.environ.get("ASSISTANT_FM_DATA_DIR", ROOT)) / "players_data.json"
            with data_path.open("r", encoding="utf-8") as data_file:
                data = json.load(data_file)
            self._json(
                200,
                {
                    "message": (
                        f"Extraction terminée ! Joueurs : {len(data.get('joueurs', []))} "
                        f"| Staff : {len(data.get('staff', []))}"
                    ),
                    "joueurs": len(data.get("joueurs", [])),
                    "staff": len(data.get("staff", [])),
                },
            )
        except (OSError, json.JSONDecodeError) as error:
            self._json(500, {"error": f"Erreur locale lors de l'extraction : {error}"})


def main():
    try:
        server = AssistantServer((HOST, PORT), AssistantHandler)
    except OSError as error:
        if error.errno == 10048 or getattr(error, "winerror", None) in (10013, 10048):
            print(
                f"Impossible de démarrer le serveur sur {HOST}:{PORT} : "
                "le port est peut-être déjà utilisé. Fermez l'autre serveur "
                "Assistant FM ou ouvrez le site déjà lancé."
            )
            return 1
        raise
    url = f"http://{HOST}:{PORT}/"
    print(f"Assistant FM disponible sur {url}")
    print("Laissez cette fenêtre ouverte pendant l'utilisation du site.")
    if os.environ.get("ASSISTANT_FM_NO_BROWSER") != "1":
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur Assistant FM.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
