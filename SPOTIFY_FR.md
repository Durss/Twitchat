# Connecter Twitchat avec Spotify

Rendez-vous sur ce lien et connectez-vous avec votre compte Spotify :
https://developer.spotify.com/dashboard

Une fois que vous avez accepté les conditions d'utilisation, vous serez sur votre tableau de bord développeur.

Il y a maintenant deux options :

<details>
  <summary>Vous avez déjà une application Spotify existante</summary>

Ouvrez l'application existante, cliquez sur "`Modifier`" en bas.\
Trouvez la section `Redirect URIs` et ajoutez cette URL :

```
https://twitchat.fr/spotify/auth
```

</details>
<br>
<details>
  <summary>Vous n'avez pas encore d'application Spotify</summary>

Vous devriez avoir un bouton "`Créer une application`", cliquez dessus.

Vous serez invité à entrer un Nom et une Description pour votre application.\
Écrivez ce que vous voulez et validez.

En haut à droite, vous aurez un bouton "`Paramètres`", cliquez dessus :
![image](https://user-images.githubusercontent.com/721001/231935112-ae1f929b-2695-481a-9bd8-96beb8c10337.png)

La page affichera les informations de votre application avec un bouton "`Afficher le secret client`".\
Cliquez dessus pour révéler la valeur du secret client.
![image](https://user-images.githubusercontent.com/721001/231935377-9ce182f0-5004-4f7c-b775-48e8ee4235c2.png)

Avant de mettre ces valeurs sur Twitchat, il y a une dernière chose à faire.\
Cliquez sur le bouton "`Modifier`" en bas de la page.\
Faites défiler jusqu'à la section "`Redirect URIs`" et ajoutez l'URL suivante :

```
https://twitchat.fr/spotify/auth
```

![image](https://user-images.githubusercontent.com/721001/231935570-fc532ecb-30c1-41b3-bf2e-8ec6a0885a7a.png)
<br>

Faites défiler vers le bas pour enregistrer les modifications.\
Vous pouvez maintenant copier/coller le `Client ID` et le `Client Secret` sur Twitchat, et tout devrait fonctionner 🥳
