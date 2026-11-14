# Configuration Discord Webhook

## 1. Créer un webhook Discord

1. Va dans ton serveur Discord
2. **Server Settings** → **Integrations** → **Webhooks** → **New Webhook**
3. Choisis le salon `update` (ou crée-le)
4. Copie l'URL du webhook (format : `https://discord.com/api/webhooks/...`)

## 2. Ajouter le secret GitHub

1. Va sur ton repo `releases` : https://github.com/joeyb Barton6om-sudo/releases/settings/secrets/actions
2. **New repository secret**
3. Nom : `DISCORD_WEBHOOK_URL`
4. Valeur : colle l'URL du webhook Discord
5. **Add secret**

## 3. C'est tout !

À chaque nouvelle Release publiée sur GitHub, un message sera automatiquement envoyé dans le salon `update` de ton Discord.

---

## Test manuel

Pour tester sans publier de Release, tu peux lancer le workflow manuellement :
- GitHub → onglet **Actions** → **Discord Release Notification** → **Run workflow**

## Format du message

Le message contiendra :
- **Titre** : 🚀 Assistant FM - Nouvelle mise à jour
- **Version** : le tag de la release (ex: v1.0.2-beta)
- **Date** : date de publication
- **Description** : le changelog de la release
- **Couleur** : bleu foncé
- **Footer** : Assistant FM Updates