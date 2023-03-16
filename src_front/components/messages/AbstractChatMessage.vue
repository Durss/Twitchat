
<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch } from 'vue';
import { ComponentBase, Prop, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractChatMessage"
})
export default class AbstractChatMessage extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.ChatMessageTypes;

	public time:string = "";

	private refreshTimeout:number = -1;
	private clickHandler!:(e:MouseEvent)=>void;

	public beforeMount() {
		this.refreshDate();
		//Watch for "relative" param update to refresh time accordingly
		watch(()=>this.$store("params").appearance.displayTimeRelative.value, ()=> {
			clearTimeout(this.refreshTimeout);
			this.refreshDate();
		})
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent)=> {
			if(e.ctrlKey) {
				this.copyJSON();
				e.stopPropagation();
			}else{
				this.$emit("onRead", this.messageData, e)
			}
		}
		this.$el.addEventListener("click", this.clickHandler);
	}

	public beforeUnmount():void {
		clearTimeout(this.refreshTimeout);
		this.$el.removeEventListener("click", this.clickHandler);
	}

	/**
	 * Refreshes the date at a regular interval if needed
	 */
	public refreshDate() {
		const elapsedMode = this.$store("params").appearance.displayTimeRelative.value === true;
		const d = new Date(this.messageData.date);
		
		if(elapsedMode) {
			let elapsed = Date.now() - d.getTime();
			let duration = elapsed < 60000? 1000 : elapsed < 60000*5? 5000 : elapsed < 60000*10? 10000 : 60000;
			
			//Round value to nearest update step to avoid having durations with random offsets
			elapsed = Math.floor(elapsed/duration) * duration;
			
			if(elapsed < 60000) {
				this.time = "00:"+Utils.toDigits( Math.round(elapsed/1000) );
			}else
			if(elapsed < 60000 * 60) {
				const minutes = Math.floor(elapsed/60000);
				this.time = Utils.toDigits(minutes) + ":";
				this.time += Utils.toDigits( Math.round((elapsed - minutes*60000)/1000) );
			}else{
				const hours = Math.floor(elapsed/(60000*60));
				this.time = hours + "h";
				this.time += Utils.toDigits( Math.round((elapsed - hours*(60000*60))/60000) );
			}
			
			this.refreshTimeout = setTimeout(()=> {
				this.refreshDate();
			}, duration);
		}else{
			this.time = Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
		}
	}

	/**
	 * Copy JSON data of the message
	 */
	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>