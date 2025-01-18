import StoreProxy from '@/store/StoreProxy';
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
		const placeholdersList = TriggerEventPlaceholders(this.triggerData.type).concat();

		//Add command params
		if(this.triggerData.chatCommandParams) {
			this.triggerData.chatCommandParams.forEach(v=> {
				//If a staitc placeholder already exists with the same name, remove it.
				//Chat command params have priority over them.
				const existingIndex = placeholdersList.findIndex(u=>u.tag.toLowerCase() == v.tag.toLowerCase());
				if(existingIndex > -1) placeholdersList.splice(existingIndex, 1);
				
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
			//If its anything but a "random" or "http" action, skip it (only these ones create custom placeholders for now)
			if(a.type != "random" && a.type != "http" && a.type != "raffle" && a.type != "obs") continue;

			if(a.type == "random"){
				//If it's not a list or number random value mode, ignore it (onlye these have a custom placeholder)
				if(a.mode == "trigger") continue;
				//If custom placeholder isn't defined, ignore it
				if((a.mode == "number" || a.mode === "list") && a.placeholder) {
					//If a static placeholder already exists with the same name, remove it.
					//Dynamic placeholder have priority over them.
					const existingIndex = placeholdersList.findIndex(u=>u.tag.toLowerCase() == a.placeholder.toLowerCase());
					if(existingIndex > -1) placeholdersList.splice(existingIndex, 1);
	
					placeholdersList.push({
										tag:a.placeholder.toUpperCase(),
										pointer:"",
										isUserID:false,
										customTag:true,
										numberParsable:true,
										descKey:'triggers.random_placeholder',
										descReplacedValues:{NAME:"{"+a.placeholder.toUpperCase()+"}"},
									});
				}
				if((a.mode == "counter" || a.mode === "value") && a.valueCounterPlaceholders) {
					const placeholders = [
						a.valueCounterPlaceholders!.value,
					];
					if(a.mode == "counter"
					|| (a.mode == "value" && StoreProxy.values.valueList.find(v=>v.id == a.valueSource)?.perUser === true) ) {
						placeholders.unshift(
							a.valueCounterPlaceholders!.userId,
							a.valueCounterPlaceholders!.userName
						)
					}
					
					for (let i = 0; i < placeholders.length; i++) {
						const ph = placeholders[i];
						//If a static placeholder already exists with the same name, remove it.
						//Dynamic placeholder have priority over them.
						const existingIndex = placeholdersList.findIndex(u=>u.tag.toLowerCase() == ph.toLowerCase());
						if(existingIndex > -1) placeholdersList.splice(existingIndex, 1);
		
						placeholdersList.push({
											tag:ph.toUpperCase(),
											pointer:"",
											isUserID:ph === a.valueCounterPlaceholders!.userId,
											customTag:true,
											numberParsable:ph === a.valueCounterPlaceholders!.value,
											descKey:'triggers.random_placeholder',
											descReplacedValues:{NAME:"{"+ph.toUpperCase()+"}"},
										});
					}
				}
			}else
			
			if(a.type == "http") {
				if(a.outputPlaceholderList && a.outputPlaceholderList.length > 0) {
					for (let i = 0; i < a.outputPlaceholderList.length; i++) {
						const ph = a.outputPlaceholderList[i];
						if(!ph.placeholder || ph.placeholder.length === 0) continue;
						placeholdersList.push({
							tag:ph.placeholder.toUpperCase(),
							pointer:"",
							isUserID:false,
							customTag:true,
							numberParsable:true,
							descKey:'triggers.http_placeholder',
							descReplacedValues:{NAME:"{"+ph.placeholder.toUpperCase()+"}"},
						});
					}

				}else
				if(a.outputPlaceholder) {
					placeholdersList.push({
						tag:a.outputPlaceholder.toUpperCase(),
						pointer:"",
						isUserID:false,
						customTag:true,
						numberParsable:true,
						descKey:'triggers.http_placeholder',
						descReplacedValues:{NAME:"{"+a.outputPlaceholder.toUpperCase()+"}"},
					});
				}
			}else
			
			if(a.type == "raffle") {
				if(a.raffleData.triggerWaitForWinner) {
					placeholdersList.push({
						tag:"RAFFLE_WINNER_ENTRY",
						pointer:"",
						isUserID:false,
						customTag:true,
						numberParsable:false,
						descKey:'triggers.raffle_placeholder',
						example:"My raffle entry"
					});
				}
			}else
			
			if(a.type == "obs" && a.obsAction == "screenshot" && a.screenshotImgMode == "get" && a.screenshotImgSavePlaceholder) {
					placeholdersList.push({
						tag:a.screenshotImgSavePlaceholder.toUpperCase(),
						pointer:"",
						isUserID:false,
						customTag:true,
						numberParsable:false,
						descKey:'triggers.screenshot_placeholder',
						example:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAyADIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDx2iiimeYFFFFABRRRQAUUUUAWrWwlvLed4Bvki24j4G7J55J4wBmmLZzsisseQyxsDkdHOF/M02K9ntI5RCkMqyDDRTJuVv8AP9aIdb1OCCOEWVmwjREDMuSQv3c/N2PP1oN4Qpyjq9TX/wCEck+z7/P/AHuzPl7O+Omc/rVS30S9mlQSRGKMsQznHy4z2zk8j9c1A/iLWJAQ9taFCpVoyuQwPr83+c1Guuaiskcg02w8yNdiP5fKr6A7uBSNOSl3/Ekj02+kmeH7MwljVWddw4znGDnB6Hp6UkmnX0NuJ5oNkeWB+b5lIOOR79iM1Xj1fVYwoEEDEJEmWG7IjJIPJ689fyxVmXXdTvYmt7iC3SJupUHPBzxyaCZQppOzKtFFFM5gooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q=="
					});
			}
		}

		const placeholderIds:string[] = placeholdersList.map(v=>v.tag.toLowerCase()).sort();

		//Check if the placeholder list has changed since last time.
		//If so, call onPlaceholderUpdate to notify parent class
		if(placeholderIds.join(",") != this.placeholderIdCache.join(",")) {
			this.placeholderList = placeholdersList;
			this.placeholderIdCache = this.placeholderList.map(v=>v.tag.toLowerCase()).sort();
			this.onPlaceholderUpdate(this.placeholderList);
		}
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		//override
	}

}