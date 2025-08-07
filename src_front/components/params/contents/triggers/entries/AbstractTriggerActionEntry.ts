import { type ITriggerPlaceholder, type TriggerActionData, type TriggerData } from '@/types/TriggerActionDataTypes';
import TriggerUtils from '@/utils/TriggerUtils';
import { watch } from 'vue';
import { ComponentBase, Prop, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractTriggerActionEntry",
	emits:["placeholdersUpdate"]
})
export default class AbstractTriggerActionEntry extends Vue {

	@Prop
	declare action:TriggerActionData;

	@Prop
	public triggerData!:TriggerData;

	public placeholderList:ITriggerPlaceholder<any>[] = [];

	private placeholderIdCache:string[] = [];

	public beforeMount():void {
		let updateDebounce = -1;
		//Watch for any change on the actions and update placeholders when
		//it happens.
		watch(()=>this.triggerData.actions, (a, b)=> {
			clearTimeout(updateDebounce);
			updateDebounce = window.setTimeout(()=> {
				this.updatePlaceholderList();
			}, 100);
		}, {deep:true});

		watch(()=>this.triggerData.chatCommandParams, ()=> this.updatePlaceholderList(), {deep:true});

		this.updatePlaceholderList();
	}

	/**
	 * Get all placeholders available for the current trigger action
	 * Loads up all trigger related placeholders, chat command params and looks
	 * for any Random Value trigger action declaring a placeholder BEFORE the
	 * current action.
	 */
	private updatePlaceholderList():void {
		//Get trigger's related placeholders
		const placeholdersList = TriggerUtils.getActionPlaceholderList(this.action, this.triggerData);
		const placeholderIds:string[] = placeholdersList.map(v=>v.tag.toLowerCase()).sort();

		//Check if the placeholder list has changed since last time.
		//If so, call onPlaceholderUpdate to notify parent class
		if(placeholderIds.join(",") != this.placeholderIdCache.join(",")) {
			this.placeholderList = placeholdersList;
			this.placeholderIdCache = this.placeholderList.map(v=>v.tag.toLowerCase()).sort();
			this.onPlaceholderUpdate(this.placeholderList);
			this.$emit("placeholdersUpdate", this.placeholderList)
		}
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<unknown>[]):void {
		//override
	}

}
