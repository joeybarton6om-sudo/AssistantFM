"""
Bot d'accueil Assistant FM.

Fonction :
  - À chaque nouveau membre, envoie un message de bienvenue dans le salon d'accueil.
  - Les salons sont ciblés par ID (mentions cliquables garanties), avec repli
    par mot-clé si un ID est introuvable.
  - Commande !accueil-test pour tester le rendu.

Prérequis :
  1. pip install discord.py
  2. Portail développeur → ton application → Bot → activer :
       - SERVER MEMBERS INTENT
       - MESSAGE CONTENT INTENT
  3. Inviter le bot avec : Voir les salons, Envoyer des messages, Lire l'historique.
  4. Variables d'environnement :
       $env:DISCORD_TOKEN = "..."
  5. Lancer : python bot_assistant_fm.py
"""

import os
import re

import discord
from discord.ext import commands

TOKEN = os.environ.get("DISCORD_TOKEN")

DOWNLOAD_URL = "https://www.dropbox.com/t/Gz5RY46Ncc7brDVM"

# Salon où poster le message de bienvenue
SALON_ACCUEIL_ID = 1570447936469471284

# Salons à mentionner : (libellé, ID, mot-clé de repli)
SALONS_A_MENTIONNER = [
    ("Présente-toi", 1570447934225649734, "présentation"),
    ("Raconte ta partie", 1570447942647545969, "partie"),
    ("Questions", 1570447962134421725, "aide"),
    ("Bugs", 1570447963585781812, "bug"),
]


def nettoyer_token(valeur):
    if not valeur:
        return ""
    t = valeur.strip()
    if len(t) >= 2 and t[0] == t[-1] and t[0] in "\"'":
        t = t[1:-1].strip()
    if t.lower().startswith("bot "):
        t = t[4:].strip()
    return t


def normaliser(texte):
    """Minuscule, sans emojis ni ponctuation, pour comparer les noms de salons."""
    return re.sub(r"[^\w\s]", "", (texte or "").lower()).strip()


def trouver_par_mot_cle(guild, mot_cle):
    cle = normaliser(mot_cle)
    if not cle:
        return None
    for ch in guild.text_channels:
        if cle in normaliser(ch.name):
            return ch
    return None


def resoudre_salon(guild, channel_id, mot_cle=None):
    """Résout un salon par ID, puis par mot-clé en repli."""
    ch = guild.get_channel(int(channel_id))
    if isinstance(ch, discord.TextChannel):
        return ch
    if mot_cle:
        return trouver_par_mot_cle(guild, mot_cle)
    return None


def trouver_salon_accueil(guild):
    ch = resoudre_salon(guild, SALON_ACCUEIL_ID, "présentation")
    if ch is not None:
        return ch
    ch = trouver_par_mot_cle(guild, "général")
    if ch is not None:
        return ch
    return next((c for c in guild.text_channels if c.permissions_for(guild.me).send_messages), None)


intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


def construire_embed(member):
    guild = member.guild

    lignes = []
    for libelle, channel_id, mot_cle in SALONS_A_MENTIONNER:
        ch = resoudre_salon(guild, channel_id, mot_cle)
        if ch is not None:
            lignes.append(f"• {libelle} → {ch.mention}")

    description = (
        f"Salut {member.mention} !\n\n"
        "**Assistant FM** est l'assistant d'analyse pour **Football Manager 2027** : "
        "extraction des sauvegardes `.fm`, recrutement, tactique, suivi de carrière.\n\n"
    )
    if lignes:
        description += "📍 **Commence ici :**\n" + "\n".join(lignes) + "\n\n"
    description += f"⬇️ **Téléchargement Windows :** {DOWNLOAD_URL}"

    embed = discord.Embed(
        title="👋 Bienvenue sur Assistant FM !",
        description=description,
        color=0x5B9BD5,
    )
    try:
        embed.set_thumbnail(url=member.display_avatar.url)
    except Exception:
        pass
    embed.set_footer(text="Assistant FM · discord.gg/YR2e8kMHeF")
    return embed


async def envoyer_accueil(member):
    channel = trouver_salon_accueil(member.guild)
    if channel is None:
        print("Aucun salon d'accueil accessible.")
        return False
    try:
        await channel.send(content=member.mention, embed=construire_embed(member))
        return True
    except discord.Forbidden:
        print(f"Permission refusée dans {channel.name}.")
        return False


@bot.event
async def on_ready():
    print(f"Connecté en tant que {bot.user} (ID {bot.user.id})")
    print("Bot d'accueil prêt.")


@bot.event
async def on_member_join(member):
    if member.bot:
        return
    if await envoyer_accueil(member):
        print(f"Accueil envoyé à {member} ({member.id}).")


@bot.command(name="accueil-test")
@commands.has_permissions(manage_guild=True)
async def accueil_test(ctx):
    """Teste le message d'accueil sur le salon configuré."""
    if await envoyer_accueil(ctx.author):
        await ctx.send("✅ Message d'accueil envoyé.")
    else:
        await ctx.send("⚠️ Impossible d'envoyer le message (salon ou permission manquants).")


def main():
    token = nettoyer_token(TOKEN)
    if not token:
        raise SystemExit("DISCORD_TOKEN manquant.")
    if token.count(".") != 2 or len(token) < 50:
        raise SystemExit("Token invalide : copie le token du bot (Bot → Reset Token).")
    bot.run(token)


if __name__ == "__main__":
    main()