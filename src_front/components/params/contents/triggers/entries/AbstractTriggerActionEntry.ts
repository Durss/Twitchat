import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { watch } from 'vue';
import { ComponentBase, Prop, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractTriggerActionEntry"
})
export default class AbstractTriggerActionEntry extends Vue {
	
	@Prop
	declare action:TriggerActionData;

	@Prop
	public triggerData!:TriggerData;

	protected placeholders:ITriggerPlaceholder<any>[] = [];

	private placeholderIdCache:string[] = [];

	public beforeMount():void {
		let updateDebounce = -1;
		//Watch for any change on the actions and update placeholders when
		//it happens.
		watch(()=>this.triggerData.actions, (a, b)=> {
			clearTimeout(updateDebounce);
			updateDebounce = setTimeout(()=> {
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
		const placeholdersList = TriggerEventPlaceholders(this.triggerData.type).concat();

		//Add command params
		if(this.triggerData.chatCommandParams) {
			this.triggerData.chatCommandParams.forEach(v=> {
				placeholdersList.push({
					tag:v.tag,
					pointer:"",
					isUserID:false,
					customTag:true,
					numberParsable:true,
					descKey:'triggers.condition.placeholder_cmd_param',
					descReplacedValues:{NAME:"{"+v.tag.toUpperCase()+"}"},
				});
			})
		}

		//Search for custom placeholders defined on previous actions (eg: random value action)
		for (let i = 0; i < this.triggerData.actions.length; i++) {
			const a = this.triggerData.actions[i];
			//If it's current action, stop there
			if(a.id == this.action.id) break;
			//If it's on a different condition, placeholder won't be shared, skip it
			if(a.condition !== this.action.condition
			&& (a.condition !== undefined || this.action.condition === false)
			&& (a.condition === false || this.action.condition !== undefined)) continue;
			//If its anything but a "random" action, skip it (only this one creates custom placeholders for now)
			if(a.type != "random") continue;
			//If it's not a list or number random value mode, ignore it (onlye these have a custom placeholder)
			if(a.mode != "list" && a.mode != "number") continue;
			//If custom placeholder isn't defined, ignore it
			if(!a.placeholder) continue;

			placeholdersList.push({
								tag:a.placeholder,
								pointer:"",
								isUserID:false,
								customTag:true,
								numberParsable:true,
								descKey:'triggers.random_placeholder',
								descReplacedValues:{NAME:"{"+a.placeholder.toUpperCase()+"}"},
							});
			
		}

		const placeholderIds:string[] = placeholdersList.map(v=>v.tag.toLowerCase()).sort();

		//Check if the placeholder list has changed since last time.
		//If so, call onPlaceholderUpdate to notify parent class
		if(placeholderIds.join(",") != this.placeholderIdCache.join(",")) {
			this.placeholders = placeholdersList;
			this.placeholderIdCache = this.placeholders.map(v=>v.tag.toLowerCase()).sort();
			this.onPlaceholderUpdate(this.placeholders);
		}
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		//override
	}

}