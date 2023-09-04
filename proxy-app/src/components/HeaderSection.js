export default class HeaderSection extends HTMLElement {

	constructor(){
		super();
		this.buildHTML()
	}

	buildHTML() {
		this.classList.add("header");
		this.innerHTML = `
		<style>
			.header {
				width: 100%;
				display: flex;
				flex-direction: row;
			}
			.header > h1 {
				flex-grow: 1;
				margin: 0;
				font-size: 1.2em;
				text-align: center;
				text-decoration: underline;
			}

			.windowActions {
				gap: .25em;
				display: flex;
				flex-direction: row;
				position: absolute;
				top: .75em;
				right: .75em;
			}
			.windowActions>button {
				background: transparent;
				transition: all .25s;
				padding: .25em;
				font-size: .8em;
			}
			.windowActions>button:hover {
				transform: scale(1.1);
				background-color: rgba(255, 255, 255, .2);
			}
		</style>
		
		<h1>Twitchat Proxy</h1>
		<div class="windowActions">
			<button id="minimize"><img src="assets/minus.svg" alt="minimize"></button>
			<button id="close"><img src="assets/cross.svg" alt="close"></button>
		</div>
		`;

		this.querySelector("#close").addEventListener("click", this.closeWindow);
		this.querySelector("#minimize").addEventListener("click", this.minimizeWindow);
	}


	closeWindow() {
		window.api.invoke("close");
	}
	
	minimizeWindow() {
		window.api.invoke("minimize");
	}
}