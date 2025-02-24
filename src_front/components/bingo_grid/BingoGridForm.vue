<template>
	<div :class="classes">
		<div class="head" v-if="embedMode === false">
			<ClearButton :aria-label="$t('global.close')" @click="close()" />

			<h1 class="title"><Icon name="bingo_grid" class="icon" />{{ $t("bingo_grid.form.title") }}</h1>

			<div class="description">{{ $t("bingo_grid.form.description") }}</div>
		</div>

		<div class="content">
			<div class="createForm">
				<TTButton class="addBt"
				v-if="$store.auth.isPremium || $store.bingoGrid.gridList.length < $config.MAX_BINGO_GRIDS"
				@click="addGrid()" icon="add">{{ $t("bingo_grid.form.add_bt") }}</TTButton>

				<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.bingoGrid.gridList.length > $config.MAX_BINGO_GRIDS_PREMIUM">{{ $t("bingo_grid.form.premium_limit") }}</div>

				<div class="premium" v-else>
					<div>{{ $t("bingo_grid.form.non_premium_limit", {MAX:$config.MAX_BINGO_GRIDS_PREMIUM}) }}</div>
					<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
				</div>
			</div>

			<VueDraggable class="gridList"
			v-model="$store.bingoGrid.gridList"
			:group="{name:'bingo_grids'}"
			handle=".header"
			animation="250">
				<ToggleBlock v-for="bingo in $store.bingoGrid.gridList"
				editableTitle
				v-model:title="bingo.title"
				:titleDefault="$t('bingo_grid.form.default_title')"
				:titleMaxLengh="30"
				:open="false"
				:key="bingo.id"
				@update:title="save(bingo, true)">

					<template #left_actions>
						<div class="leftActions">
							<ToggleButton v-model="bingo.enabled" @click.native.stop @change="save(bingo, true)" v-if="$store.auth.isPremium || bingo.enabled || $store.bingoGrid.gridList.filter(v=>v.enabled).length < $config.MAX_BINGO_GRIDS" />
						</div>
					</template>

					<template #right_actions>
						<div class="rightActions">
							<TTButton @click.stop="duplicateGrid(bingo.id)" icon="copy" v-tooltip="$t('global.duplicate')" v-if="!maxGridReached" />
							<TTButton @click.stop="$store.bingoGrid.removeGrid(bingo.id)" icon="trash" alert />
						</div>
					</template>

					<div class="form">
						<div class="card-item install">
							<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
							<OverlayInstaller type="bingogrid" :sourceSuffix="bingo.title" :id="bingo.id" :queryParams="{bid:bingo.id}" />
						</div>

						<div class="card-item share">
							<label>
								<Icon name="share"/>
								<span>{{ $t("bingo_grid.form.share") }}</span>
							</label>
							<div class="urlHolder">
								<p class="url" v-click2Select>{{ getPublicURL(bingo.id) }}</p>
								<TTButton icon="whispers" transparent v-if="!sendingOnChat[bingo.id]" @click="sendChatURL(bingo.id)" v-tooltip="$t('bingo_grid.form.send_chat_url_tt')" />
								<Icon name="loader" v-else class="loader" />
								<TTButton icon="copy" transparent :copy="getPublicURL(bingo.id)" v-tooltip="$t('global.copy')" />
							</div>
							<div class="info" v-if="!$store.auth.isPremium">
								<Icon name="premium" />
								<span>{{ $t("bingo_grid.form.premium_multiplayer") }}</span>
								<TTButton @click="openPremium()" icon="premium" light premium>{{ $t("premium.become_premiumBt") }}</TTButton>
							</div>

							<div v-else-if="viewerCount > 1000" class="perfAlert">
								<img class="icon" src="@/assets/img/worried_face.svg" alt="worried face">
								<p>{{ $t("bingo_grid.form.perf_alert") }}</p>
							</div>
						</div>

						<div class="card-item sizes">
							<label>
								<Icon name="scale"/>
								<span>{{ $t("bingo_grid.form.param_size") }}</span>
							</label>
							<div class="forms">
								<ParamItem :paramData="param_cols[bingo.id]" v-model="bingo.cols" @change="save(bingo, true)" noBackground />
								<Icon name="cross"/>
								<ParamItem :paramData="param_rows[bingo.id]" v-model="bingo.rows" @change="save(bingo, true)" noBackground />
							</div>
						</div>

						<ParamItem :paramData="param_textColor[bingo.id]" v-model="bingo.textColor" @change="save(bingo)" />

						<ParamItem :paramData="param_textSize[bingo.id]" v-model="bingo.textSize" @change="save(bingo)" />

						<ParamItem :paramData="param_showGrid[bingo.id]" v-model="bingo.showGrid" @change="save(bingo)" />

						<ParamItem :paramData="param_backgroundColor[bingo.id]" v-model="bingo.backgroundColor" @change="save(bingo)" />

						<ParamItem :paramData="param_backgroundAlpha[bingo.id]" v-model="bingo.backgroundAlpha" @change="save(bingo)" />

						<VueDraggable
						class="card-item entryList"
						v-model="bingo.entries"
						filter=".locked"
						@start="onSortStart(bingo)"
						@end="onSortEnd(bingo)"
						animation="250"
						:group="{name:bingo.id+'_cell_entries'}">
							<TransitionGroup name="flip-list">
								<div v-for="element in bingo.entries"
								:key="element.id"
								:class="getEntryClasses(element)"
								:style="{width:'calc('+(1/bingo.cols*100)+'% - 3px)'}"
								@click="focusLabel(element.id)">
									<contenteditable class="cell" tag="div"
										v-model="element.label"
										:contenteditable="true"
										:no-html="true"
										:no-nl="false"
										:ref="'label_'+element.id"
										@blur="save(bingo, true)"
										@input="limitLabelSize(element)" />

									<ClearButton class="lockBt"
										v-tooltip="$t('bingo_grid.form.lock_bt_tt')"
										:icon="element.lock? 'lock' : 'unlock'"
										@click.stop="element.lock = !element.lock"></ClearButton>

									<ClearButton class="moveBt" icon="move" v-if="!element.lock"></ClearButton>
								</div>
							</TransitionGroup>

							<div class="ctas">
								<TTButton @click="$store.bingoGrid.shuffleGrid(bingo.id)" icon="dice">{{ $t("bingo_grid.form.shuffle_bt") }}</TTButton>
								<TTButton @click="$store.bingoGrid.resetCheckStates(bingo.id)" icon="refresh">{{ $t("bingo_grid.form.reset_bt") }}</TTButton>
								<TTButton @click="$store.bingoGrid.resetLabels(bingo.id)" icon="trash">{{ $t("bingo_grid.form.clear_labels_bt") }}</TTButton>
							</div>
						</VueDraggable>

						<ParamItem :paramData="param_additional_cells[bingo.id]">
							<template #custom><TTButton @click="$store.bingoGrid.addCustomCell(bingo.id)">{{ $t("bingo_grid.form.add_cellBt") }}</TTButton></template>
							<div class="additionalItemList">
								<div class="additionalItem" v-for="item in (bingo.additionalEntries || [])" :key="item.id">

									<TTButton @click="$store.bingoGrid.removeCustomCell(bingo.id, item.id)" alert icon="trash" />

									<contenteditable class="label" tag="div"
										v-model="item.label"
										:contenteditable="true"
										:no-html="true"
										:no-nl="false"
										:ref="'additionallabel_'+item.id"
										@blur="save(bingo, true)"
										@input="limitLabelSize(item)" />
								</div>
							</div>
						</ParamItem>

						<ParamItem :paramData="param_winSoundVolume[bingo.id]" @change="save(bingo, false, true)" v-model="bingo.winSoundVolume"></ParamItem>

						<ParamItem :paramData="param_autoHide[bingo.id]" @change="save(bingo)" v-model="bingo.autoShowHide"></ParamItem>

						<ParamItem :paramData="param_overlayAnnouncement[bingo.id]" v-model="bingo.overlayAnnouncement" @change="save(bingo)">
							<div class="parameter-child">
								<ToggleBlock :title="$t('bingo_grid.form.param_overlayAnnouncement_permissions')" small :open="false">
									<PermissionsForm v-model="bingo.overlayAnnouncementPermissions"></PermissionsForm>
								</ToggleBlock>
							</div>
						</ParamItem>

						<ParamItem :paramData="param_chatAnnouncementEnabled[bingo.id]" v-model="bingo.chatAnnouncementEnabled" @change="save(bingo)">
							<div class="parameter-child">
								<ParamItem :paramData="param_chatAnnouncement[bingo.id]"
								v-model="bingo.chatAnnouncement"
								noBackground
								@change="save(bingo); renderPreview(bingo.id, bingo.chatAnnouncement)"
								@focus="param_showMessage[bingo.id] = true; renderPreview(bingo.id, bingo.chatAnnouncement)"
								@blur="param_showMessage[bingo.id] = false">

									<div class="parameter-child preview" ref="preview" v-if="param_showMessage[bingo.id]">
										<ChatMessage class="message"
											lightMode
											contextMenuOff
											:messageData="param_messagePreview[bingo.id]" />
									</div>
								</ParamItem>
							</div>
						</ParamItem>

						<ParamItem :paramData="param_chatCmd_toggle[bingo.id]" v-model="param_chatCmd_toggle[bingo.id].value" @change="save(bingo)">
							<div class="parameter-child">
								<ParamItem class="cmdField" :paramData="param_chatCmd[bingo.id]" v-model="bingo.chatCmd" @change="save(bingo)" noBackground />
								<div class="instructions">
									<Icon name="info" />
									<i18n-t scope="global" keypath="bingo_grid.form.chat_cmd_usage">
										<template #CMD>
											<mark>{{ bingo.chatCmd }} X:Y</mark>
										</template>
									</i18n-t>
								</div>
								<ToggleBlock :icons="['lock_fit']" :title="$t('global.allowed_users')" small :open="false">
									<PermissionsForm v-model="bingo.chatCmdPermissions"></PermissionsForm>
								</ToggleBlock>
							</div>
						</ParamItem>

						<ParamItem :paramData="param_heat_toggle[bingo.id]" v-model="bingo.heatClick" @change="save(bingo)">
							<div class="parameter-child">
								<div class="instructions">
									<Icon name="info" />
									<span>{{ $t("bingo_grid.form.heat_usage") }}</span>
								</div>

								<TTButton class="heatButton" icon="heat" @click="openHeatParams()" secondary small>{{ $t("overlay.heatDistort.install_heat_link") }}</TTButton>

								<ToggleBlock :icons="['lock_fit']" :title="$t('global.allowed_users')" small :open="false">
									<PermissionsForm v-model="bingo.heatClickPermissions"></PermissionsForm>
								</ToggleBlock>
							</div>
						</ParamItem>
					</div>
				</ToggleBlock>
			</VueDraggable>
		</div>
	</div>
</template>

<script lang="ts">
import { type TriggerActionBingoGridData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import contenteditable from 'vue-contenteditable';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import PermissionsForm from '../PermissionsForm.vue';
import TTButton from '../TTButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ToggleButton from '../ToggleButton.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';
import Utils from '@/utils/Utils';
import ChatMessage from '../messages/ChatMessage.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import MessengerProxy from '@/messaging/MessengerProxy';
import { reactive } from 'vue';
import Config from "@/utils/Config";

@Component({
	components:{
		TTButton,
		ParamItem,
		ChatMessage,
		ClearButton,
		ToggleBlock,
		VueDraggable,
		ToggleButton,
		PermissionsForm,
		PostOnChatParam,
		contenteditable,
		OverlayInstaller,
	},
	emits:["close"]
})
class BingoGridForm extends AbstractSidePanel {

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionBingoGridData;

	@Prop
	public triggerData!:TriggerData;

	@Prop({type:Boolean, default:false})
	public embedMode!:boolean;

	public param_cols:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_rows:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_backgroundColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_backgroundAlpha:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_textColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textSize:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_showGrid:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_chatCmd:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_chatCmd_toggle:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_heat_toggle:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_additional_cells:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_winSoundVolume:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_autoHide:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_chatAnnouncement:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_chatAnnouncementEnabled:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_overlayAnnouncement:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_messagePreview:{[key:string]:TwitchatDataTypes.MessageChatData} = {};
	public param_showMessage:{[key:string]:boolean} = {};
	public sendingOnChat:{[key:string]:boolean} = {};
	public isDragging:boolean = false;

	private lockedItems:{[key:string]:{index:number, data:TwitchatDataTypes.BingoGridConfig["entries"][number]}[]} = {};

	public get viewerCount():number {
		return this.$store.stream.currentStreamInfo[this.$store.auth.twitch.user.id]?.viewers || 0;
	}

	public getEntryClasses(col:TwitchatDataTypes.BingoGridConfig["entries"][number]) {
		let res:string[] = ["entry"];
		if(col.lock) res.push("locked");
		return res;
	}

	public get classes():string[] {
		const res = ["bingoform", "sidePanel"];
		if(this.embedMode !== false) res.push("embedMode");
		return res;
	}

	public get maxGridReached():boolean {
		if(this.$store.auth.isPremium) {
			return this.$store.bingoGrid.gridList.length >= this.$config.MAX_BINGO_GRIDS_PREMIUM;
		}else{
			return this.$store.bingoGrid.gridList.length >= this.$config.MAX_BINGO_GRIDS;
		}
	}

	public getPublicURL(gridId:string):string {
		const uid = this.$store.auth.twitch.user.id;
		const baseURL = Config.instance.DEMO_MODE? "https://twitchat.fr" : document.location.origin;
		return baseURL + this.$router.resolve({name:"bingo_grid_public", params:{uid, gridId}}).fullPath;
	}

	public async sendChatURL(gridId:string):Promise<void> {
		this.sendingOnChat[gridId] = true;
		const uid = this.$store.auth.twitch.user.id;
		const url = document.location.origin + this.$router.resolve({name:"bingo_grid_public", params:{uid, gridId}}).fullPath;
		await  MessengerProxy.instance.sendMessage(url, ["twitch"]);
		await Utils.promisedTimeout(250);
		this.sendingOnChat[gridId] = false;
	}

	public async beforeMount():Promise<void> {
		this.initParams();
	}

	public mounted(): void {
		if(this.embedMode == false) {
			super.open();
		}
	}

	/**
	 * Save data to storage
	 */
	public save(grid:TwitchatDataTypes.BingoGridConfig, broadcastUpdate:boolean = false, playWinSound:boolean = false):void {
		if(this.param_chatCmd_toggle[grid.id].value && !grid.chatCmd) {
			grid.chatCmd = "!bingo";
		}
		if(!this.param_chatCmd_toggle[grid.id].value) {
			delete grid.chatCmd;
		}
		this.$store.bingoGrid.saveData(grid.id, undefined, broadcastUpdate);

		if(playWinSound && grid.winSoundVolume) {
			const audio = new Audio(this.$asset("sounds/win.mp3"));
			audio.volume = this.param_winSoundVolume[grid.id].value/100;
			audio.play();
		}
	}

	/**
	 * Create a new grid
	 */
	public addGrid():void {
		const grid = this.$store.bingoGrid.addGrid();
		this.initParams();
	}

	/**
	 * Duplicate given grid ID
	 */
	public duplicateGrid(id:string):void {
		this.$store.bingoGrid.duplicateGrid(id)
		this.initParams();
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Limit the size of the label.
	 * Can't use maxLength because it's a content-editable tag.
	 * @param item
	 */
	public async limitLabelSize(entry:TwitchatDataTypes.BingoGridConfig["entries"][0]):Promise<void> {
		const maxLength = 60;
		const sel = window.getSelection();
		if(sel && sel.rangeCount > 0) {
			//Save caret index
			var range = sel.getRangeAt(0);
			let caretIndex = range.startOffset;
			await this.$nextTick();
			//Limit label's size
			entry.label = entry.label.substring(0, maxLength);
			await this.$nextTick();

			//Reset caret to previous position
			// if(range.endContainer instanceof HTMLElement) {
			// 	range.endContainer.innerText
			// }
			if(caretIndex > 0 && range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(entry.label.length-1, caretIndex-1));
		}else{
			entry.label = entry.label.substring(0, maxLength);
		}
	}

	/**
	 * Called after sorting items
	 */
	public onSortEnd(grid:TwitchatDataTypes.BingoGridConfig):void {
		this.isDragging = false;
		let items = grid.entries.filter(v=>v.lock !== true);
		this.lockedItems[grid.id].forEach(item => {
			items.splice(item.index, 0, item.data);
		})
		grid.entries = items;
		this.save(grid);
	}

	/**
	 * Called when starting to sort items
	 */
	public onSortStart(grid:TwitchatDataTypes.BingoGridConfig):void {
		this.isDragging = true;
		const entries = grid.entries;
		this.lockedItems[grid.id] = [];
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if(entry.lock === true) {
				this.lockedItems[grid.id].push({
					index:i,
					data:entry,
				})
			}
		}
	}

	/**
	 * Called when clicking a cell to reroute focus to editable element
	 */
	public focusLabel(id:string):void {
		((this.$refs["label_"+id] as Vue[])[0].$el as HTMLElement).focus();
	}

	/**
	 * Open heat params
	 */
	public openHeatParams():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.HEAT);
	}

	public async renderPreview(id:string, rawMessage:string):Promise<void> {
		const prevState = this.param_showMessage[id];
		this.param_showMessage[id] = false;
		await this.$nextTick();
		let announcementColor:"primary" | "purple" | "blue" | "green" | "orange" | undefined = undefined;
		if(rawMessage.indexOf("/announce") == 0) {
			announcementColor = rawMessage.replace(/\/announce([a-z]+)?\s.*/i, "$1") as "primary" | "purple" | "blue" | "green" | "orange";
			rawMessage = rawMessage.replace(/\/announce([a-z]+)?\s(.*)/i, "$2");
		}

		rawMessage = rawMessage.replace(/\{WINNERS\}/gi, this.param_chatAnnouncement[id]!.placeholderList![0].example!);

		const chunks = TwitchUtils.parseMessageToChunks(rawMessage, undefined, true);
		const message_html = TwitchUtils.messageChunksToHTML(chunks);

		this.param_messagePreview[id].message = rawMessage;
		this.param_messagePreview[id].message_chunks = chunks;
		this.param_messagePreview[id].message_html = message_html;
		this.param_messagePreview[id].twitch_announcementColor = announcementColor;
		this.param_showMessage[id] = prevState;
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.bingoGrid.gridList.forEach(entry=> {
			const id = entry.id;
			if(this.param_cols[id]) return;

			const winnersPlaceholder:TwitchatDataTypes.PlaceholderEntry[] = [
				{tag:"WINNERS", descKey:"bingo_grid.form.winners_placeholder", example: "Twitch (x1) ▬ Durss (x4) ▬ TwitchFR (x2)"}
			]

			this.param_cols[id] = {type:"number", value:5, min:2, max:10};
			this.param_rows[id] = {type:"number", value:5, min:2, max:10};
			this.param_backgroundColor[id] = {type:"color", value:"#000000", labelKey:"bingo_grid.form.param_background_color", icon:"color"};
			this.param_backgroundAlpha[id] = {type:"slider", value:0, min:0, max:100, labelKey:"bingo_grid.form.param_background_alpha", icon:"color"};
			this.param_textSize[id] = {type:"number", value:30, min:2, max:100, labelKey:"bingo_grid.form.param_text_size", icon:"fontSize"};
			this.param_textColor[id] = {type:"color", value:"#000000", labelKey:"bingo_grid.form.param_text_color", icon:"color"};
			this.param_showGrid[id] = {type:"boolean", value:false, labelKey:"bingo_grid.form.param_show_grid", icon:"show"};
			this.param_autoHide[id] = {type:"boolean", value:true, labelKey:"bingo_grid.form.param_autoHide", icon:"show"};
			this.param_chatCmd[id] = {type:"string", value:"", maxLength:20, labelKey:"bingo_grid.form.param_chat_cmd", icon:"chatCommand"};
			this.param_chatCmd_toggle[id] = {type:"boolean", value:entry.chatCmd != undefined, labelKey:"bingo_grid.form.param_chat_cmd_enabled", icon:"show"};
			this.param_heat_toggle[id] = {type:"boolean", value:false, labelKey:"bingo_grid.form.param_heat_enabled", icon:"heat"};
			this.param_additional_cells[id] = {type:"custom", value:true, labelKey:"bingo_grid.form.param_additional_cells", icon:"add"};
			this.param_winSoundVolume[id] = {type:"slider", value:100, min:0, max:100, step:10, labelKey:"bingo_grid.form.param_winSoundVolume", icon:"volume"};
			this.param_chatAnnouncement[id] = {type:"string", value:"", longText:true, labelKey:"bingo_grid.form.param_chatAnnouncement", icon:"whispers", placeholderList:winnersPlaceholder};
			this.param_chatAnnouncementEnabled[id] = {type:"boolean", value:this.$store.auth.isPremium, labelKey:"bingo_grid.form.param_chatAnnouncementEnabled", icon:"announcement", premiumOnly:true};
			this.param_overlayAnnouncement[id] = {type:"boolean", value:this.$store.auth.isPremium, labelKey:"bingo_grid.form.param_overlayAnnouncement", icon:"announcement", premiumOnly:true};

			const me = this.$store.auth.twitch.user;
			this.param_messagePreview[id] = reactive({
				id:Utils.getUUID(),
				date:Date.now(),
				channel_id:me.id,
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				answers:[],
				user:me,
				is_short:false,
				message:"",
				message_chunks:[],
				message_html:"",
				message_size: 0,
			});
		});
	}
}
export default toNative(BingoGridForm);
</script>

<style scoped lang="less">
.bingoform{
	min-width: 330px !important;

	.form {
		gap: .5em;
	}

	.content {
		gap: .5em;
	}

	.createForm {
		text-align: center;
		.premium {
			background-color: var(--color-premium);
			border-radius: var(--border-radius);
			padding: .5em;
			.button {
				margin-top: .5em;
			}
		}
	}

	.gridList {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}

	.entryList {
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 3px;
		.entry {
			display: block;
			aspect-ratio: 1/1;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			background-color: var(--grayout-fader);
			border-radius: var(--border-radius);
			position: relative;
			cursor: text;
			&.highlight {
				border: 2px solid red;
			}
			.cell {
				text-align: center;
				width: 100%;
			}
			.lockBt {
				position: absolute;
				top:0;
				right:0;
				padding: .25em;
				display: none;
				&:hover {
					background-color: var(--background-color-fader);
					border-bottom-left-radius: var(--border-radius);
				}
			}
			.moveBt {
				position: absolute;
				top:0;
				left:0;
				right:auto;
				padding: .25em;
				display: none;
				&:hover {
					background-color: var(--background-color-fader);
					border-bottom-right-radius: var(--border-radius);
				}
			}
			&:hover {
				.lockBt, .moveBt {
					display: block;
				}
			}

			&.locked {
				@c1: var(--grayout-fadest);
				@c2: transparent;
				background-color: @c2;
				background-image: repeating-linear-gradient(-45deg, @c1, @c1 20px, @c2 20px, @c2 40px);
			}
		}
	}

	.sizes, .install, .share {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		.icon {
			height: 1em;
		}
		label {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
		.forms {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
		&.install, &.share {
			flex-direction: column;
		}
		&.share {
			background-color: var(--color-premium-fader);
			.perfAlert {
				gap: 1em;
				display: flex;
				flex-direction: row;
				align-items: center;
				// background: white;
				// color: var(--color-premium);
				// font-weight: normal;
				font-weight: bold;
				line-height: 1.2em;
				font-size: .9em;
				white-space: pre-line;
				.icon {
					transform-origin: center;
					font-size: 4em;
					animation: scaleInOut .15s infinite ease-in-out;
				}

				@keyframes scaleInOut {
					0%, 100% { transform: scale(1) rotate(0); }
					50% { transform: scale(1.1) rotate(5deg); }
				}
			}
		}

		.info {
			font-weight: normal;
			padding: .5em;
			border-radius: var(--border-radius);
			background-color: var(--color-premium);
			.icon {
				margin-right: .5em;
				vertical-align: middle;
			}
			.button {
				display: flex;
				margin: 0 auto;
				margin-top: .5em;
			}
		}

		.urlHolder {
			background-color: var(--grayout);
			padding: .25em;
			padding-right: 0;
			border-radius: var(--border-radius);
			display: flex;
			max-width: 100%;
			flex-direction: row;
			align-items: center;
			.button {
				flex-shrink: 0;
			}
			.url {
				text-wrap: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				max-width: 100%;
			}
			.loader {
				flex-shrink: 0;
				margin: .2em;
			}
		}
	}

	.ctas {
		gap:.5em;
		display: flex;
		flex-direction: column;
		margin-top: .5em;
		width: 100%;
		align-items: center;
	}

	.flip-list-move {
		transition: all .25s;
	}
	.flip-list-leave-to {
		display: none !important;
	}

	.leftActions {
		align-self: stretch;
	}

	.rightActions, .leftActions {
		gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-shrink: 0;
		.button {
			margin: -.5em 0;
			align-self: stretch;
			border-radius: 0;
			flex-shrink: 0;
			padding: 0 .5em;
		}
	}

	.parameter-child {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}

	.preview {
		background-color: var(--grayout);
		padding: .25em;
		border-radius: var(--border-radius);
	}

	.cmdField {
		:deep(.inputHolder) {
			flex-basis: 200px;
		}
	}

	.heatButton {
		margin: auto;
	}

	.additionalItemList {
		margin-top: .5em;
		gap: .25em;
		display: flex;
		flex-direction: column;
		.additionalItem {
			display: flex;
			flex-direction: row;
			.label {
				padding: .25em;
				width: 100%;
				background-color: var(--grayout);
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
				text-align: center;
			}
			.button{
				flex-shrink: 0;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
		}
	}
}
</style>
