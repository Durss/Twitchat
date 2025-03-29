<template>
	<div class="triggeractionlist">
		<div class="card-item secondary description" data-noselect>
			<img src="@/assets/icons/info.svg" class="icon">
			<i18n-t scope="global" tag="span" v-if="triggerDescriptionLabel" :keypath="triggerDescriptionLabel">
				<template #SUB_ITEM_NAME>
					<mark>{{ subTypeLabel }}</mark>
				</template>
				<template #INFO v-if="$te(triggerDescriptionLabel+'_info')">
					<i18n-t tag="i" class="details" scope="global"
					v-if="$te(triggerDescriptionLabel+'_info')"
					:keypath="triggerDescriptionLabel+'_info'">
						<template #CMD v-if="$te(triggerDescriptionLabel+'_info_cmd')">
							<mark>{{ $t(triggerDescriptionLabel+'_info_cmd') }}</mark>
						</template>
					</i18n-t>
				</template>
				<template #CMD v-if="$te(triggerDescriptionLabel+'_cmd')">
					<mark v-html="$t(triggerDescriptionLabel+'_cmd')"></mark>
				</template>
			</i18n-t>
		</div>

		<div class="card-item params" data-noselect>
			<ParamItem noBackground :paramData="param_enabled" v-model="triggerData.enabled" />
			<ParamItem noBackground :paramData="param_name" v-model="triggerData.name" />

			<TriggerActionChatCommandParams
				v-if="isChatCmd"
				:triggerData="triggerData"
			/>

			<TriggerActionScheduleParams
				v-if="isSchedule"
				:triggerData="triggerData"
			/>

			<TriggerActionSlashCommandParams
				v-if="isSlashCommand"
				:triggerData="triggerData"
			/>

			<TriggerActionCommandArgumentParams
				v-if="isAnyChatMessageCommand"
				:triggerData="triggerData"
			/>

			<TriggerActionHeatParams
				v-if="isHeatTrigger"
				:obsSources="obsSources"
				:triggerData="triggerData"
			/>

			<TriggerGoXLRParams
				v-if="isGoXLRButtonTrigger"
				:obsSources="obsSources"
				:triggerData="triggerData"
			/>

			<TriggerAdApproachParams
				v-if="isAdBreakApproach"
				:triggerData="triggerData"
			/>

			<TriggerActionAnyMessageParams
				v-if="isAnyMessages"
				:triggerData="triggerData"
			/>

			<div class="queue">
				<div class="info" v-tooltip="$t('triggers.trigger_queue_info')">
					<Icon name="list" class="icon" />
					<span>{{ $t("triggers.trigger_queue") }}</span>
				</div>
				<ParamItem noBackground class="selector" :paramData="param_queue" v-model="triggerData.queue">
					<template #composite>
						<ParamItem noBackground class="priority"
							v-tooltip="$t('triggers.trigger_queue_priority')"
							:paramData="param_queue_priority"
							v-model="triggerData.queuePriority" />
					</template>
				</ParamItem>
			</div>
		</div>

		<TriggerConditionList class="card-item conditions" :triggerData="triggerData" data-noselect />

		<div :class="listClasses">
			<div v-if="hasCondition" class="conditionSelector" data-noselect>
				<TTButton icon="cross" alert @click="matchingCondition = false" :selected="matchingCondition == false" />
				<img src="@/assets/icons/condition.svg" class="conditionLink" />
				<TTButton icon="checkmark" @click="matchingCondition = true" :selected="matchingCondition == true" primary />
			</div>
			<svg class="conditionJoint" v-if="hasCondition" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
				width="104.8px" height="24.4px" viewBox="0 0 104.8 24.4" style="enable-background:new 0 0 104.8 24.4;" xml:space="preserve">
				<polygon class="false" style="fill:#B71F1F;" points="0,24.4 0,0 2,0 2,22.4 52.4,22.4 52.4,24.4 "/>
				<polygon class="true" style="fill:#008667;" points="52.4,24.4 52.4,22.4 102.8,22.4 102.8,0 104.8,0 104.8,24.4 "/>
			</svg>

			<div class="dash long"></div>

			<button class="addBt" @click="addActionAt(0)" data-noselect>
				<img src="@/assets/icons/add.svg" class="icon">
			</button>

			<draggable
			v-model="filteredActionList"
			group="actions"
			item-key="id"
			ghost-class="ghost"
			direction="vertical"
			handle=".header, .orderBt"
			:animation="250">
				<template #item="{element, index}:{element:TriggerActionTypes, index:number}">
					<div class="listItem">
						<div class="dash"></div>
						<TriggerActionEntry data-noselect
							:ref="'actionEntry_'+element.id"
							:class="getActionClasses(element)"
							:data-actionid="element.id"
							:action="element"
							:index="index"
							:obsScenes="obsScenes"
							:obsSources="obsSources"
							:obsInputs="obsInputs"
							:rewards="rewards"
							:extensions="extensions"
							:triggerData="triggerData"
							@delete="deleteAction(element.id)"
							@duplicate="duplicateAction(element, index)"
						/>
						<div class="dash"></div>
						<button class="addBt" @click="addActionAfter(element.id)" data-noselect>
							<img src="@/assets/icons/add.svg" class="icon">
						</button>
					</div>
				</template>
			</draggable>
		</div>

		<div class="selectRect" :style="selectStyles" v-if="selecting"></div>
	</div>
</template>

<script lang="ts">
import PermissionsForm from '@/components/PermissionsForm.vue';
import TTButton from '@/components/TTButton.vue';
import { TriggerSubTypeLabel, TriggerTypes, TriggerTypesDefinitionList, type TriggerActionEmptyData, type TriggerActionTypes, type TriggerData, type TriggerTypeDefinition, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import ParamItem from '../../ParamItem.vue';
import TriggerActionChatCommandParams from './TriggerActionChatCommandParams.vue';
import TriggerActionCommandArgumentParams from './TriggerActionCommandArgumentParams.vue';
import TriggerActionEntry from './TriggerActionEntry.vue';
import TriggerActionHeatParams from './TriggerActionHeatParams.vue';
import TriggerActionScheduleParams from './TriggerActionScheduleParams.vue';
import TriggerActionSlashCommandParams from './TriggerActionSlashCommandParams.vue';
import TriggerAdApproachParams from './TriggerAdApproachParams.vue';
import TriggerConditionList from './TriggerConditionList.vue';
import TriggerGoXLRParams from './TriggerGoXLRParams.vue';
import TriggerActionAnyMessageParams from './TriggerActionAnyMessageParams.vue';

@Component({
	components:{
		TTButton,
		draggable,
		ParamItem,
		PermissionsForm,
		TriggerActionEntry,
		TriggerGoXLRParams,
		TriggerConditionList,
		TriggerAdApproachParams,
		TriggerActionHeatParams,
		TriggerActionScheduleParams,
		TriggerActionAnyMessageParams,
		TriggerActionChatCommandParams,
		TriggerActionSlashCommandParams,
		TriggerActionCommandArgumentParams,
	},
	emits:[],
})
class TriggerActionList extends Vue {

	@Prop
	public triggerData!:TriggerData;
	@Prop({default:[]})
	public obsScenes!:OBSSceneItem[];
	@Prop({default:[]})
	public obsSources!:OBSSourceItem[];
	@Prop({default:[]})
	public obsInputs!:OBSInputItem[];
	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];
	@Prop({default:[]})
	public extensions!:TwitchDataTypes.Extension[];

	public selecting:boolean = false;
	public selectStyles:{[key:string]:string} = {};
	public selectedActions:string[] = [];
	public matchingCondition:boolean = true;
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:true, icon:"disable", labelKey:"global.enabled" };
	public param_name:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"label", placeholder:"...", labelKey:"triggers.trigger_name" };
	public param_queue:TwitchatDataTypes.ParameterData<string> = {type:"editablelist", value:"", maxLength:100, max:1, placeholderKey:"triggers.trigger_queue_input_placeholder"}
	public param_queue_priority:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:-100, max:100}

	private selectOffset = {x:0, y:0};
	private scrollDir:number = 0;
	private disposed:boolean = false;
	private pointerDownHandler!:(e:PointerEvent) => void;
	private pointerMoveHandler!:(e:PointerEvent) => void;
	private pointerUpHandler!:(e:PointerEvent) => void;
	private keyDownHandler!:(e:KeyboardEvent) => void;
	private keyUpHandler!:(e:KeyboardEvent) => void;

	/**
	 * Get a trigger's description
	 */
	public get triggerDescriptionLabel():string|undefined {
		const item = TriggerTypesDefinitionList().find(v => v.value == this.triggerData.type) as TriggerTypeDefinition|null;
		return item?.descriptionKey;
	}

	/**
	 * Get a trigger's description
	 */
	public get filteredActionList():TriggerActionTypes[] {
		let res = this.triggerData.actions;
		if(this.hasCondition) {
			return res.filter(t=> {
				return t.condition == this.matchingCondition || (t.condition !== false && this.matchingCondition);
			})
		}
		return res;
	}

	/**
	 * Get filtered actions depending on condition result if any
	 */
	public set filteredActionList(value:TriggerActionTypes[]) {
		if(this.hasCondition) {

			//Remove all sorted actions from the original trigger data
			for (let i = 0; i < this.triggerData.actions.length; i++) {
				const item = this.triggerData.actions[i];
				if(value.findIndex(v=> v.id == item.id) == -1) continue;
				this.triggerData.actions.splice(i, 1);
				i--;
			}
			//Push sorted actions
			this.triggerData.actions = this.triggerData.actions.concat(value);
		}else{
			this.triggerData.actions = value;
		}
	}

	public get isChatCmd():boolean { return this.triggerData.type === TriggerTypes.CHAT_COMMAND; }
	public get isAnyMessages():boolean { return this.triggerData.type === TriggerTypes.ANY_MESSAGE; }
	public get isSchedule():boolean { return this.triggerData.type === TriggerTypes.SCHEDULE; }
	public get isSlashCommand():boolean { return this.triggerData.type === TriggerTypes.SLASH_COMMAND; }
	public get isAdBreakApproach():boolean { return this.triggerData.type === TriggerTypes.AD_APPROACHING; }
	public get isAnyChatMessageCommand():boolean { return this.triggerData.type === TriggerTypes.ANY_MESSAGE; }
	public get isHeatTrigger():boolean { return this.triggerData.type === TriggerTypes.HEAT_CLICK; }
	public get hasCondition():boolean { return this.triggerData.conditions != undefined && this.triggerData.conditions.conditions.length > 0; }
	public get isGoXLRButtonTrigger():boolean {
		const list:TriggerTypesValue[] = [
			TriggerTypes.GOXLR_BUTTON_PRESSED,
			TriggerTypes.GOXLR_BUTTON_RELEASED,
		]
		return list.indexOf(this.triggerData.type) > -1;
	}
	public get listClasses():string[] {
		const res = ["list"];
		if(this.hasCondition && !this.matchingCondition) res.push("alert");
		return res;
	}

	/**
	 * Get a trigger's sub type's label (reward name, counter name, ...)
	 */
	public get subTypeLabel():string|undefined {
		return TriggerSubTypeLabel(this.triggerData);
	}

	public getActionClasses(action:TriggerActionTypes):string[] {
		const res = ["action", "actionItemEntry"];
		if(this.selectedActions.includes(action.id)) res.push("selected");
		return res;
	}

	public beforeMount():void {
		this.param_queue.options = this.$store.triggers.queues;
		// if(this.triggerData.actions.length === 0) {
		// 	this.addActionAt(0);
		// }

		//Not super clean way of getting the param content holder but don't
		//know any cleaner one.
		this.pointerDownHandler	= (e:PointerEvent) => this.onPointerDown(e);
		this.pointerMoveHandler	= (e:PointerEvent) => this.onPointerMove(e);
		this.pointerUpHandler	= (e:PointerEvent) => this.onPointerUp(e);
		this.keyUpHandler		= (e:KeyboardEvent) => this.onKeyUp(e);
		this.keyDownHandler		= (e:KeyboardEvent) => this.onKeyDown(e);
		const holder = document.getElementById("paramContentHolder")!;
		//Make sure holder exists. Apparently someone succeeded to have not existing holder (?!). See Sentry TWITCHAT-1Q
		if(holder) holder.addEventListener("pointerdown", this.pointerDownHandler);
		document.addEventListener("pointermove", this.pointerMoveHandler);
		document.addEventListener("pointerup", this.pointerUpHandler);
		document.addEventListener("keyup", this.keyUpHandler, true);
		document.addEventListener("keydown", this.keyDownHandler, true);

		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
		const holder = document.getElementById("paramContentHolder")!;
		if(holder) holder.removeEventListener("pointerdown", this.pointerDownHandler);
		document.removeEventListener("pointermove", this.pointerMoveHandler);
		document.removeEventListener("pointerup", this.pointerUpHandler);
		document.removeEventListener("keyup", this.keyUpHandler, true);
		document.removeEventListener("keydown", this.keyDownHandler, true);
	}

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(actionId:string):void {
		this.$confirm(this.$t("triggers.delete_action_confirm")).then(async ()=> {
			let index = this.triggerData.actions.findIndex(v=>v.id == actionId);
			this.triggerData.actions.splice(index, 1);
		}).catch(()=> {});
	}

	/**
	 * Called when duplicating an action item
	 */
	public duplicateAction(action:TriggerActionTypes, index:number):void {
		const clone:TriggerActionTypes = JSON.parse(JSON.stringify(action));
		clone.id = Utils.getUUID(),
		this.triggerData.actions.splice(index+1, 0, clone);

		this.highlightItemById(action.id);
	}

	/**
	 * Adds an action after the specified trigger ID
	 * @param id
	 */
	public addActionAfter(id:string):void {
		let index = this.triggerData.actions.findIndex(v=>v.id == id);
		if(index == -1) return;
		console.log("Add after", id, index);
		this.addActionAt(index + 1);
	}

	/**
	 * Adds an action at a specific index
	 * @param id
	 */
	public addActionAt(index:number):void {
		const action:TriggerActionEmptyData = {
			id:Utils.getUUID(),
			type:null,
		}
		if(this.hasCondition) {
			action.condition = this.matchingCondition;
		}
		this.triggerData.actions.splice(index, 0, action);

		this.highlightItemById(action.id);
	}

	private onPointerDown(e:PointerEvent):void {
		const parent = document.getElementById("paramContentHolder")!;
		let target = e.target as HTMLElement;
		//Go up on hierarchy until reaching the parameters holder
		//stop if finding a button or an element with "data-noselect" attribute
		while(target != parent && target.dataset.noselect == undefined && target.nodeName != "BUTTON") {
			target = target.parentElement as HTMLElement;
		}

		//Not a valid drag start place
		if(target != parent) return;

		Utils.unselectDom();
		const offsetBounds = this.$el.getBoundingClientRect();

		this.selecting = true;
		this.selectOffset.x = e.clientX - offsetBounds.left;
		this.selectOffset.y = e.clientY - offsetBounds.top;
		this.onPointerMove(e);
	}

	private onPointerMove(e:PointerEvent):void {
		if(!this.selecting) return;

		const offsetBounds = (this.$el as HTMLElement).getBoundingClientRect();

		const margin = 20;
		const x1 = Math.min(offsetBounds.width + margin, Math.max(-margin, Math.min(this.selectOffset.x, e.clientX - offsetBounds.left)));
		const y1 = Math.min(offsetBounds.height, Math.max(0, Math.min(this.selectOffset.y, e.clientY - offsetBounds.top)));
		const x2 = Math.min(offsetBounds.width + margin, Math.max(this.selectOffset.x, e.clientX - offsetBounds.left));
		const y2 = Math.min(offsetBounds.height, Math.max(this.selectOffset.y, e.clientY - offsetBounds.top));
		this.selectStyles.left = x1+"px";
		this.selectStyles.top = y1+"px";
		this.selectStyles.width = (x2 - x1)+"px";
		this.selectStyles.height = (y2 - y1)+"px";

		// const entries = this.$refs.entry as TriggerActionEntry[];
		const entries = (this.$el as HTMLElement).querySelectorAll(".actionItemEntry");
		const selected:string[] = []
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i] as HTMLElement;
			const bounds = entry.getBoundingClientRect();
			const overlap = !( x1 + offsetBounds.left > bounds.right
							|| x2 + offsetBounds.left < bounds.left
							|| y1 + offsetBounds.top > bounds.bottom
							|| y2 + offsetBounds.top < bounds.top );
			if(overlap) {
				selected.push(entry.dataset.actionid as string);
			}
		}

		this.scrollDir = 0;
		if(y2-y1 > 10) {
			if(e.clientY > document.body.clientHeight * .8) this.scrollDir = (e.clientY - document.body.clientHeight * .8) * .1;
			if(e.clientY < document.body.clientHeight * .2) this.scrollDir = -(document.body.clientHeight * .2) * .1;
		}

		this.selectedActions = selected;

		//If moved 10px away in a direction, avoid selecting something on the page
		if(x2-x1 > 10 || y2-y1 > 10) {
			Utils.unselectDom();
			e.preventDefault();
		}
	}

	private onPointerUp(e:PointerEvent):void {
		this.selecting = false;
	}

	private onKeyDown(e:KeyboardEvent):void {
		//Avoid closing parameters page if actions are selected
		if(e.key == "Escape" && this.selectedActions.length > 0) {
			e.stopPropagation();
		}
	}

	private onKeyUp(e:KeyboardEvent):void {
		//Do not copy/past actions if focus is on a form input
		const nodeName = (e.target as HTMLElement).nodeName;
		if(["TEXTAREA", "INPUT"].indexOf(nodeName) > -1) return;

		//Delete selected actions
		if(e.key == "Delete" && this.selectedActions.length > 0) {
			const list = this.selectedActions;
			this.$confirm(this.$t("triggers.delete_actions_confirm")).then(async ()=> {
				for (let i = 0; i < this.triggerData.actions.length; i++) {
					const t = this.triggerData.actions[i];
					if(list.find(v=> v == t.id)) {
						this.triggerData.actions.splice(i, 1);
						i--;
					}
				}
			}).catch(()=> {});
		}

		if(e.key == "c" && e.ctrlKey && this.selectedActions.length > 0) {
			const clipboar:TriggerActionTypes[] = [];
			for (let i = 0; i < this.triggerData.actions.length; i++) {
				const a = this.triggerData.actions[i];
				if(this.selectedActions.includes(a.id)) {
					clipboar.push(a);
				}
			}
			this.selectedActions = [];
			this.$store.triggers.clipboard = clipboar;
		}else
		if(e.key == "v" && e.ctrlKey && this.$store.triggers.clipboard.length > 0) {
			for (let i = 0; i < this.$store.triggers.clipboard.length; i++) {
				const action = JSON.parse(JSON.stringify(this.$store.triggers.clipboard[i])) as TriggerActionTypes;
				action.id = Utils.getUUID();//Override ID by a new one to avoid conflicts
				action.condition = this.matchingCondition;
				this.triggerData.actions.push(action);
			}
		}
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		if(!this.selecting) return;
		if(this.scrollDir == 0) return;
		const scrollableHolder = document.getElementById("paramContentScrollableHolder") as HTMLDivElement;
		if(!scrollableHolder) return;
		scrollableHolder.scrollTop += this.scrollDir;
	}

	private async highlightItemById(id:string):Promise<void> {
		await this.$nextTick();
		const ref = (this.$refs["actionEntry_"+id] as Vue).$el;
		if(ref){
			gsap.from(ref, {duration:.5, overflow:"hidden", width:0, height:0, ease:"back.out", clearProps:"all", onUpdate:()=>{
				ref.scrollIntoView();
			}});
		}
	}
}
export default toNative(TriggerActionList);
</script>

<style scoped lang="less">
.triggeractionlist{
	display: flex;
	flex-direction: column;
	gap: 1em;
	position: relative;

	.list {
		.conditionSelector {
			display: flex;
			flex-direction: row;
			align-items: flex-end;
			margin: auto;
			width: fit-content;
			.button {
				margin-bottom: 3px;
				&:not(.selected) {
					opacity: .5;
				}
			}
			.icon {
				width: 75px;
			}
		}
		.conditionJoint {
			display: block;
			margin: auto;
			width: 105px;
			.true {
				fill-opacity:1;
			}
			.false {
				fill-opacity:.25;
			}
		}
		.dash {
			width: 2px;
			background-color: var(--color-primary);
			height: 10px;
			margin: auto;
			&.long {
				height:15px;
			}
		}

		.action.selected {
			outline: 2px dashed var(--color-text);
		}

		.addBt {
			display: block;
			margin: auto;
			border-radius: 50%;
			width: 2em;
			height: 2em;
			background-color: var(--color-primary);
			transition: background-color .25s;
			.icon {
				padding: .35em;
				height: 100%;
				width: 100%;
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
		}

		&.alert {
			.addBt {
				background-color: var(--color-alert);
				&:hover {
					background-color: var(--color-alert-light);
				}
			}

			.dash {
				background-color: var(--color-alert);
			}

			.conditionJoint {
				.true {
					fill-opacity:.25;
				}
				.false {
					fill-opacity:1;
				}
			}
		}
	}

	&>.params, &>.conditions, &>.description {
		box-shadow: 0px 1px 1px rgba(0,0,0,0.25);

		&>.head {
			text-align: center;
			margin-bottom: .5em;
		}

		&.description {
			line-height: 1.3em;
		}

		&.params {
			display: flex;
			flex-direction: column;
			gap: .5em;
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: fill;
			margin-right: 0.5em;
			vertical-align: top;
		}

		.details {
			display: block;
			font-size: .9em;
			opacity: .9;
			line-height: 1.2em;
		}

		.queue {
			display: flex;
			flex-grow: 1;
			align-items: center;
			width: 100%;
			.info {
				flex-grow: 1;
				cursor: pointer;
			}
			.selector {
				flex-basis: 300px;
				:deep(.list.editable) {
					gap: 1px;
					flex-direction: row;
					justify-content: stretch;
					align-items: stretch;
					.v-select {
						flex: 1;
					}
					.vs__dropdown-toggle {
						border-top-right-radius: 0 !important;
						border-bottom-right-radius: 0 !important;
					}
				}
				.priority {
					flex-basis: 50px;
					:deep(.content),
					:deep(.holder),
					:deep(input){
						height: 100%;
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}
				}
			}
		}

		&.conditions {
			border: 2px solid var(--color-primary);
			margin-bottom: -1em;
		}
	}

	.selectRect {
		z-index: 1;
		position: absolute;
		border: 1px solid var(--color-text);
		background-color: var(--background-color-fader);
	}
}
</style>
