
export default class ProxyItem extends HTMLFormElement {

	/**
	 * Get list of attributed that should be observed to
	 * trigger the attributeChangedCallback() method
	 */
	static get observedAttributes() { return ["proxy"]; }

	constructor(){
		super();
		this.loading = false;
		this.connected = false;
		this.buildHTML();
	}

	/**
	 * Element added to DOM
	 */
	connectedCallback() {
	}

	/**
	 * Element removed from DOM
	 */
	disconnectedCallback() {

	}

	/**
	 * A component's attribute has changed
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		this.proxy = JSON.parse(decodeURIComponent(this.getAttribute("proxy") || encodeURIComponent("{}")));
		this.buildHTML();
	}

	buildHTML() {
		if(!this.proxy || !this.proxy.id) return;
		
		const ip = localStorage.getItem("ip_"+this.proxy.id);
		const port = localStorage.getItem("port_"+this.proxy.id);
		if(ip) this.proxy.ip = ip;
		if(port) this.proxy.port = port;

		this.classList.add("proxyItem")
		this.addEventListener("submit", this.connect);
		this.innerHTML = `
			<style>
				.proxyItem {
					gap: .25em;
					display: flex;
					flex-direction: row;
					align-items: center;
				}
				.proxyItem>label {
					width: 130px;
					text-align: right;
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: flex-end;
				}
				.proxyItem>label>img {
					height: 1em;
					max-width: 2em;
					margin-right: .5em;
				}
				.proxyItem .ip {
					width: 160px;
				}
				.proxyItem .port {
					width: 80px;
				}
			</style>
			<label><img src="assets/${this.proxy.id}.svg" alt="${this.proxy.id}">${this.proxy.name}</label>
			<input type="text" class="ip" name="ip" placeholder="${this.proxy.ip}" value="${this.proxy.ip}">
			<input type="text" class="port" name="port" placeholder="${this.proxy.port}" value="${this.proxy.port}">
		`;

		const connectBt = `<button type="submit" class="light"><img src="assets/connect.svg" alt="connect"></button>`;
		const disconnectBt = `<button type="button" class="alert disconnectBt"><img src="assets/cross.svg" alt="disconnect"></button>`;
		const loader = `<button type="button" class="light" disabled><img src="assets/loader.svg" alt="loader"></button>`;
		if(this.loading) {
			this.innerHTML += loader;
		}else if(this.connected) {
			this.innerHTML += disconnectBt;
		}else {
			this.innerHTML += connectBt;
		}

		this.querySelector(".disconnectBt")?.addEventListener("click", ()=>{
			window.api.invoke("disconnect", {ip:this.proxy.ip, port:this.proxy.port});
			this.connected = false;
			this.buildHTML();
		})
	}

	async connect(event) {
		event.preventDefault();
		
		const data = new FormData(this);
		const id = this.proxy.id;
		const ip = data.get("ip");
		const port = data.get("port");
		this.proxy.ip = ip;
		this.proxy.port = port;
		
		localStorage.setItem("ip_"+id, ip);
		localStorage.setItem("port_"+id, port);

		console.log(ip, port);

		this.loading = true;
		this.buildHTML();

		const {success} = await window.api.invoke("connect", {ip, port});
		this.connected = success;
		this.loading = false;

		this.buildHTML();

		return false;
	}
}
