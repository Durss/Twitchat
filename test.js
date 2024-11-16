
let url = new URL("https://kofi-proxy.francois-dursus.workers.dev/");
url.searchParams.append("url", "https://a2c7-78-199-96-70.ngrok-free.app/api");

fetch(url).then(async (res) => {
	console.log(await res.text());
});


//https://beta.twitchat.fr/api/kofi/webhook