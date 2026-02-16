import { gsap } from "gsap";
import { ComponentBase, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractSidePanel",
	emits: ["close"],
})
export default class AbstractSidePanel extends Vue {

	private closed:boolean = true;
	private keyDownHandler!:(e:KeyboardEvent) => void;

	public mounted():void {
		this.keyDownHandler = (e:KeyboardEvent) => this.onKeyDown(e);
		document.addEventListener("keydown", this.keyDownHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keydown", this.keyDownHandler);
	}

	/**
	 * Open animation
	 */
	public async open():Promise<void> {
		return new Promise((resolve)=>{
			this.closed = false;
			gsap.set(this.$el as HTMLElement, {translateY:0});
			gsap.from(this.$el as HTMLElement, {duration:.4, translateY:"100%", clearProps:"transform", ease:"back.out", onComplete:()=>{
				resolve();
			}});
		})
	}

	/**
	 * Close animation
	 */
	public async close():Promise<void> {
		//contenteditable component crashes if it has focus when destroyed.
		//The following makes sure nothing has focus when closing the form.
		//This can also trigger some save process depending on the forms.
		if(document.activeElement) (document.activeElement as HTMLElement).blur();

		return new Promise((resolve)=>{
			gsap.to(this.$el as HTMLElement, {duration:.25, translateY:"-100%", clearProps:"transform", ease:"back.in", onComplete:()=> {
				this.$emit('close');
				resolve();
			}});
		})
	}

	/**
	 * Close the window whan hitting escape key
	 * @param e
	 */
	private onKeyDown(e:KeyboardEvent):void {
		if(this.closed) return;
		const node = document.activeElement?.nodeName;
		if(e.key && e.key.toLowerCase() == "escape" && node != "INPUT") {
			this.closed = true;
			this.close();
		}
	}

}
