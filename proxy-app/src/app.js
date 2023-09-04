import ProxyItem from "./components/ProxyItem.js";
import HeaderSection from "./components/HeaderSection.js";

customElements.define("proxy-item", ProxyItem, {extends:'form'});
customElements.define("header-section", HeaderSection);


const proxyList = [
	{id:"obs", name:"Obs", ip:"192.168.0.1", port:"4455", loading:false},
	{id:"goxlr", name:"Goxlr", ip:"192.168.0.1", port:"14564", loading:false},
	{id:"voicemod", name:"Voicemod", ip:"192.168.0.1", port:"59129", loading:false},
]

window.addEventListener("load", ()=> {
	const holder = document.getElementById("forms_holder");
	for (let i = 0; i < proxyList.length; i++) {
		const proxy = proxyList[i];
		const node = new ProxyItem();
		node.setAttribute("proxy", encodeURIComponent(JSON.stringify(proxy)));
		holder.appendChild(node);
	}
})