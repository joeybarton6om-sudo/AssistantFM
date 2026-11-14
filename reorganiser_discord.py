"""
Réorganisation du serveur Discord Assistant FM.

Prérequis :
  1. pip install discord.py
  2. Créer une application sur https://discord.com/developers/applications
  3. Créer un bot, activer le token, inviter le bot sur le serveur avec les permissions :
     - Gérer les salons (Manage Channels)
     - Gérer les rôles (Manage Roles)
     - Voir les salons, Envoyer des messages, Lire l'historique
  4. Définir les variables d'environnement :
       DISCORD_TOKEN  = le token du bot
       DISCORD_GUILD_ID = l'ID du serveur (optionnel, sinon le premier serveur du bot)
  5. Lancer : python reorganiser_discord.py

Le script crée les salons manquants, les range dans les bonnes catégories et
applique les droits d'écriture. Il ne supprime aucun salon existant.
"""

import os

import discord

try:
    GUILD_ID = int(os.environ.get("DISCORD_GUILD_ID") or "0")
except ValueError:
    GUILD_ID = 0

# (nom du salon, lecture seule pour @everyone ?)
CATEGORIES = [
    ("🏠 ACCUEIL", [
        ("📌 annonces", True),
        ("📜 règles", True),
        ("👋 présentations", False),
        ("🚀 mises-à-jour", True),
        ("🗳️ sondages", False),
    ]),
    ("💬 DISCUSSION", [
        ("💬 général", False),
        ("⚽ parlons-fm27", False),
        ("📖 ma-partie", False),
        ("🎯 tactiques", False),
        ("🔄 mercato", False),
        ("🌟 jeunes-pépites", False),
        ("🖼️ captures", False),
        ("😂 memes", False),
    ]),
    ("🛠️ SUPPORT", [
        ("❓ aide", False),
        ("🐛 bugs", False),
        ("💡 suggestions", False),
        ("📥 installation", False),
    ]),
    ("📚 RESSOURCES", [
        ("🔗 liens-utiles", True),
        ("📥 téléchargements", True),
    ]),
]


class AssistantFMClient(discord.Client):
    async def on_ready(self):
        print(f"Connecté en tant que {self.user}")
        guild = self.get_guild(GUILD_ID) if GUILD_ID else (self.guilds[0] if self.guilds else None)
        if guild is None:
            print("Aucun serveur trouvé. Vérifie DISCORD_GUILD_ID.")
            await self.close()
            return
        await self.reorganiser(guild)
        await self.close()

    async def reorganiser(self, guild):
        everyone = guild.default_role

        for category_name, channels in CATEGORIES:
            category = discord.utils.get(guild.categories, name=category_name)
            if category is None:
                category = await guild.create_category(category_name)

            for channel_name, read_only in channels:
                overwrites = {
                    everyone: discord.PermissionOverwrite(
                        view_channel=True,
                        read_messages=True,
                        read_message_history=True,
                        send_messages=not read_only,
                        add_reactions=not read_only,
                    )
                }
                channel = discord.utils.get(guild.text_channels, name=channel_name)
                if channel is None:
                    await guild.create_text_channel(
                        channel_name, category=category, overwrites=overwrites
                    )
                else:
                    await channel.edit(category=category, overwrites=overwrites)

        # Salon vocal dans la catégorie SUPPORT
        support = discord.utils.get(guild.categories, name="🛠️ SUPPORT")
        voice_name = "🔊 vocal"
        voice = discord.utils.get(guild.voice_channels, name=voice_name)
        if voice is None:
            await guild.create_voice_channel(voice_name, category=support)
        elif support is not None:
            await voice.edit(category=support)

        print("Réorganisation terminée.")


def nettoyer_token(valeur):
    """Nettoie le token : espaces, guillemets et préfixe 'Bot '."""
    if not valeur:
        return ""
    t = valeur.strip()
    if len(t) >= 2 and t[0] == t[-1] and t[0] in "\"'":
        t = t[1:-1].strip()
    if t.lower().startswith("bot "):
        t = t[4:].strip()
    return t


def probleme_token(token):
    """Retourne un message d'erreur si le token est invalide, sinon None."""
    if not token:
        return (
            "DISCORD_TOKEN manquant.\n"
            "Dans le MÊME terminal, lance :\n"
            '  $env:DISCORD_TOKEN = "colle_le_token_ici"\n'
            "  python reorganiser_discord.py"
        )
    if len(token) < 50:
        return (
            "Token trop court : ce n'est probablement pas un token de bot.\n"
            "Va dans le portail développeur → ton application → Bot → Reset Token."
        )
    if token.count(".") != 2:
        return (
            "Format invalide : un token de bot contient 2 points (AAA.BBB.CCC).\n"
            "Vérifie que tu as copié le champ Token (Bot), pas le Client Secret (OAuth2)."
        )
    if any(c.isspace() for c in token):
        return "Le token contient un espace ou un retour à la ligne. Copie-le sans espaces."
    return None


def main():
    token = nettoyer_token(os.environ.get("DISCORD_TOKEN"))
    probleme = probleme_token(token)
    if probleme:
        raise SystemExit(probleme)
    client = AssistantFMClient(intents=discord.Intents.default())
    try:
        client.run(token)
    except discord.LoginFailure:
        raise SystemExit(
            "Token refusé par Discord (401 Unauthorized).\n"
            "Régénère-le dans : portail développeur → ton application → Bot → Reset Token,\n"
            "puis relance le script dans le même terminal."
        )


if __name__ == "__main__":
    main()