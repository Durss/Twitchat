
# Connect Twitchat with Spotify
Lisez **attentivement** ce qui suit pour comprendre ce que vous allez faire !

# Table des matières
* [Disclaimer](#disclaimer)
* [Quels risques ?](#quels-risques)
* [Créer une application Spotify](#créer-une-application-spotify)
<br><br>
## Disclaimer
La manière qu'à Twitchat de vous connecter à Spotify n'est pas normale. Vous ne devriez avoir qu'à cliquer 1 bouton pour vous connecter au lieu de vous demander des identifiants.\
Mais Spotify a refusé l'application Twitchat parce que c'est une application liée au streaming, chose contraire à leurs CGU.\
\
A cause de cela, la seule manière pour vous de connecter Twitchat à Spotify est de faire une partie du boulot de votre côté, à savoir [`créer une application Spotify`](#créer-une-application-spotify) comme expliquer plus bas.
<br><br>

## Quels risques ?
Ces identifiants ne permettent de faire rien de plus que si les choses étaient faites normalement.\
Mais, demander ces identifiants signifie que je *(le développeur de Twitchat)* pourrait potentiellement les récupérer pour les utiliser pour d'autres outils.\
\
Mais à cause des limitations Spotify, ça ne serait pas vraiment utile car ces identifiants ne pourraient être utilisés par plus de 25 personnes.\
Mais si un jour vous souhaitez révoquer les accès de Twitchat à votre application Spotify, vous voudrez `"réinitialiser"` le `client secret` et Twitchat ne pourra plus les utiliser.
\
\
Ceci étant dit, ces identifiants ne seront jamais enregistrés ailleurs que dans votre navigateur.\
**Ils ne seront jamais envoyés sur le serveur Twitchat.**
<br><br>

## Créer une application Spotify
Rendez-vous sur cette page et connectez-vous avec votre compte Spotify :\
https://developer.spotify.com/dashboard

Une fois les CGU acceptées, vous arriverez sur votre Dashvboard dévelopeur.\
Cliquez le bouton `"Create an app"`.\
\
Il vous sera demandé un nom et une description pour votre application.\
Écrivez ce que vous souhaitez puis validez.\
\
Cliquez sur le bouton `"Settings"` en haut à droite :\
![image](https://user-images.githubusercontent.com/721001/231935112-ae1f929b-2695-481a-9bd8-96beb8c10337.png)

Ceci ouvrira les infos de votre application ainsi qu'un bouton `"Show client secret"`.\
Cliquez ce bouton pour révéler la valeur.\
![image](https://user-images.githubusercontent.com/721001/231935377-9ce182f0-5004-4f7c-b775-48e8ee4235c2.png)

\
Avant de mettre ces valeurs dans Twitchat, cliquez sur le bouton `"Edit"` en bas de la page.\
Dans la section `"Redirect URIs"` ajoutez l'URL suivante :
```
https://twitchat.fr/spotify/auth
```
![image](https://user-images.githubusercontent.com/721001/231935570-fc532ecb-30c1-41b3-bf2e-8ec6a0885a7a.png)

Enregistrez les modifications.\
Vous pouvez maintenant copier/coller le `Client ID` et le `Client Secret` dans Twitchat et tout devrait fonctionner 🥳
