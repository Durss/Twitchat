<template>
	<div class="paramsdiscord parameterContent">
		<Icon name="discord" class="icon" />

		<div class="head">
			<i18n-t scope="global"  tag="p" keypath="discord.header"></i18n-t>
			<TTButton icon="discord" primary type="link" :href="$config.DISCORD_BOT_URL" target="_blank">{{ $t("discord.install_bt") }}</TTButton>
		</div>

		<TTButton class="unlinkBt" icon="cross"
			v-if="$store.discord.discordLinked"
			alert @click="unlink()"
			:loading="submitting">{{ $t("discord.unkinkBt", {GUILD:$store.discord.linkedToGuild}) }}</TTButton>


		<TTButton class="refreshBt" icon="refresh"
			v-if="$store.discord.discordLinked"
			@click="refreshChannels()"
			:loading="refreshingChans">{{ $t("discord.refreshChansBt") }}</TTButton>

		<div class="content">
			<template v-if="$store.discord.discordLinked">

				<section class="card-item colSelector">
					<Icon name="split" />
					<span>{{$t("discord.chat_col")}}</span>
					<div class="columnList">
						<TTButton v-for="col, index in $store.params.chatColumnsConfig"
						:key="index"
						@click="selectColumn(col.order)"
						:secondary="$store.discord.chatCols.indexOf(col.order) > -1">{{ index+1 }}</TTButton>
					</div>
				</section>

				<section class="card-item reactions">
					<Icon name="emote" />
					<ParamItem :paramData="param_reactions" noBackground v-model="$store.discord.reactionsEnabled" @change="saveParams()" />
					<div class="message"><MessageItem :messageData="messagePreview"></MessageItem></div>
				</section>

				<section class="card-item">
					<Icon name="mod" />
					<span>{{$t("discord.channel_ban_log")}}</span>
					<select v-model="$store.discord.banLogTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">{{ chan.name }}</option>
					</select>
					<ParamItem :paramData="param_banLogThread" noBackground v-model="$store.discord.banLogThread" @change="saveParams()" />
				</section>

				<section class="card-item">
					<Icon name="commands" />
					<i18n-t scope="global" tag="p" keypath="discord.channel_cmd">
						<template #CMD><mark>{{ $store.chat.commands.find(v=>v.id == "discord")?.cmd }}</mark></template>
					</i18n-t>
					<select v-model="$store.discord.chatCmdTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">{{ chan.name }}</option>
					</select>
				</section>

				<section class="card-item">
					<Icon name="rightClick" />
					<span>{{$t("discord.quick_actions")}}</span>
					<ParamsDiscordQuickActions channelList @change="saveParams()" />
				</section>

				<section class="card-item">
					<Icon name="save" />
					<span>{{$t("discord.channel_logs")}}</span>
					<select v-model="$store.discord.logChanTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">{{ chan.name }}</option>
					</select>
					<div class="card-item info">
						<Icon name="info" />
						<i18n-t scope="global"  tag="span" keypath="discord.channel_logs_info">
							<template #OPTION><mark>{{ $t("chat.context_menu.export_discord") }}</mark></template>
						</i18n-t>
					</div>
				</section>

				<section class="card-item slashCmd">
					<Icon name="broadcast" />
					<i18n-t scope="global" tag="span" keypath="discord.public_triggers">
						<template #TRIGGER_LINK><a @click.stop="openTriggers()">{{ $t("params.categories.triggers") }}</a></template>
						<template #SLASH_CMD><strong>{{ $t("triggers.events.SLASH_COMMAND.label") }}</strong></template>
						<template #OPTION><strong>{{ $t("triggers.slash_cmd.param_discord") }}</strong></template>
						<template #ICON><Icon name="info" /></template>
					</i18n-t>
				</section>

				<section class="card-item helpDesk">
					<Icon name="helpDesk" />
					<span>{{ $t("discord.ticket") }}</span>
					<span>{{ $t("discord.ticket_chan") }}</span>
					<select v-model="$store.discord.ticketChanTarget" @change="saveParams()">
						<option v-for="chan in channelList" :key="chan.id" :value="chan.id">{{ chan.name }}</option>
					</select>
					<div class="card-item info">
						<Icon name="info" />
						<i18n-t scope="global" tag="span" keypath="discord.ticket_chan_info">
							<template #ACTION><strong>{{ $t("chat.context_menu.discord_ticket") }}</strong></template>
						</i18n-t>
					</div>
				</section>
			</template>

			<section class="card-item confirm" v-else-if="askLinkConfirmation">
				<div>{{ $t("discord.install_confirm") }}</div>
				<mark class="discordName">{{ discordName }}</mark>
				<div class="ctas">
					<TTButton icon="cross" alert @click="askLinkConfirmation = false; errorCode=''">{{ $t("global.cancel") }}</TTButton>
					<TTButton icon="checkmark" primary @click="confirmLink()" :loading="submitting">{{ $t("global.confirm") }}</TTButton>
				</div>
			</section>

			<section class="card-item codeForm" v-else>
				<i18n-t scope="global"  tag="p" keypath="discord.install_code">
					<template #CMD><mark>/link</mark></template>
				</i18n-t>
				<div class="code">
					<input type="text" placeholder="_"
						v-for="i, index in codeLength"
						@keydown="onKeyDown"
						@input="onChange"
						:value="code[index]"
						v-click2Select
						ref="codeInput">
				</div>

				<div class="info">
					<Icon name="alert" />
					<i18n-t scope="global" keypath="discord.install_warn">
						<template #CMD><mark>/link</mark></template>
					</i18n-t>
				</div>
				<Icon class="loader" name="loader" v-if="linkLoading" />
			</section>

		</div>
		<div @click="errorCode = ''" v-if="errorCode" class="card-item alert error">{{ $t("error.discord."+errorCode, {CHANNEL:errorChan}) }}</div>

	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import MessageItem from '@/components/messages/MessageItem.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import type IParameterContent from '../IParameterContent';
import ParamsDiscordQuickActions from '../discord/ParamsDiscordQuickActions.vue';
import { ParamItem } from '../../ParamItem.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		MessageItem,
		ParamsDiscordQuickActions,
	},
	emits:[],
})
class ConnectDiscord extends Vue implements IParameterContent {

	public code:string = "";
	public codeLength:number = 4;
	public duration:number = 0;
	public discordName:string = "";
	public validateDebounce:number = -1;
	public submitting:boolean = false;
	public refreshingChans:boolean = false;
	public linkLoading:boolean = false;
	public askLinkConfirmation:boolean = false;
	public errorCode:string = "";
	public errorChan:string = "";
	public param_reactions:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"discord.reactions"};
	public param_banLogThread:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"discord.channel_ban_log_thread"};
	public messagePreview:TwitchatDataTypes.MessageCustomData = {
		channel_id:"",
		date:Date.now(),
		id:Utils.getUUID(),
		platform:"twitchat",
		type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
		message:"Lorem ipsum dolor sit amet.",
		icon:"discord",
		user:{
			name:"DiscordUser"
		}
	}

	/**
	 * Get discord channel list
	 */
	public get channelList():{id:string, name:string}[] {
		let list = (this.$store.discord.channelList || []).concat();
		list.unshift({id:"", name:this.$t("global.select_placeholder")});
		return list;
	}

	public async beforeMount():Promise<void> {
		this.saveParams();
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Called when pressing a key on an input of the code form
	 * @param event
	 */
	public onKeyDown(event:KeyboardEvent):void {
		if(event.key == "Backspace") {
			//Set focus to prev input
			const inputs = this.$refs.codeInput as HTMLInputElement[];
			let index = inputs.findIndex(v=>v === event.target);
			let currentInput = event.target as HTMLInputElement;
			if(currentInput.selectionEnd) {
				//Remove all chars after the carret
				currentInput.value = "";
			}
			index --;
			if(index < 0) index = 0;
			inputs[index].focus();
			inputs[index].select();
			event.stopPropagation();
			event.preventDefault();
			//Define new code as a concatenation of all inputs values
			this.code = inputs.map(v=>v.value).join("").substring(0, this.codeLength);
		}
	}

	/**
	 * Called anytime an input's value changes
	 * cycles the focus and manage copy/paste properly
	 * @param event
	 */
	public onChange(event:Event):void {
		const inputs = this.$refs.codeInput as HTMLInputElement[];
		const currentInput = event.target as HTMLInputElement;
		if(currentInput.selectionEnd) {
			//Remove all chars after the carret
			currentInput.value = currentInput.value.substring(0,currentInput.selectionEnd);
		}

		//Set focus to next input
		let index = inputs.findIndex(v=>v === event.target);
		index ++;
		if(index > inputs.length-1) index = 0;
		inputs[index].focus();
		inputs[index].select();

		//Define new code as a concatenation of all inputs values
		this.code = inputs.map(v=>v.value).join("").substring(0, this.codeLength);

		if(this.code.length == this.codeLength) {
			this.linkLoading = true;
			this.errorCode = "";
			//Debounce updates to avoid spamming server
			clearTimeout(this.validateDebounce);
			this.validateDebounce = window.setTimeout(()=>{
				this.validateCode();
			}, 500);
		}
	}

	/**
	 * Validate current code
	 */
	public async validateCode():Promise<void> {
		this.linkLoading = true;

		const res = await this.$store.discord.validateCode(this.code);
		if(res.success) {
			this.discordName = res.guildName || "???";
			this.askLinkConfirmation = true;
		}else{
			this.errorCode = res.errorCode || "UNKNOWN";
		}

		this.linkLoading = false;
	}

	/**
	 * Validate discord linking
	 */
	public async confirmLink():Promise<void> {
		this.submitting = true;

		const res = await this.$store.discord.submitCode(this.code);
		if(res !== true) {
			this.errorCode = res.code;
			this.errorChan = res.channelName || "???";
		}
		this.askLinkConfirmation = false;

		this.submitting = false;
		await this.$nextTick();
		this.saveParams();
	}

	/**
	 * Unlink discord
	 */
	public async unlink():Promise<void> {
		this.submitting = true;

		const res = await this.$store.discord.unlinkDiscord();
		if(res !== true) this.errorCode = res;

		this.submitting = false;
	}

	/**
	 * Unlink discord
	 */
	public async refreshChannels():Promise<void> {
		this.refreshingChans = true;

		await this.$store.discord.loadChannelList();

		//Make sure loader is visible and avoid spam
		await Utils.promisedTimeout(500);

		this.refreshingChans = false;
	}

	/**
	 * Called when selecting a column
	 */
	public selectColumn(index:number):void {
		const arrayIndex = this.$store.discord.chatCols.indexOf(index);
		if(arrayIndex == -1) {
			this.$store.discord.chatCols.push(index);
		}else{
			this.$store.discord.chatCols.splice(arrayIndex, 1);
		}
		this.saveParams();
	}

	/**
	 * Saves params
	 */
	public async saveParams():Promise<void> {
		if(this.$store.discord.reactionsEnabled) {
			const actions:TwitchatDataTypes.MessageCustomData["actions"] = [];
			["👌","❤️","😂","😟","⛔"].forEach(reaction => {
				actions.push({
					label:reaction,
				})
			})
			this.messagePreview.actions = actions;
		}else{
			this.messagePreview.actions = [];
		}
		this.$store.discord.saveParams();
	}

	/**
	 * Open triggers page
	 */
	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

}
export default toNative(ConnectDiscord);
</script>

<style scoped lang="less">
.paramsdiscord{
	max-width: calc(100vw - 350px) !important;

	.error {
		cursor: pointer;
		align-self: center;
	}

	.loader {
		height: 2em;
		margin: auto;
		display: block;
	}

	.unlinkBt, .refreshBt {
		align-self: center;
	}

	.content {
		align-self: center;
		max-width: 1000px;
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		align-items: flex-start;

		section {
			margin: unset;
			&:not(.codeForm) {
				max-width: 320px;
			}
			&>.icon {
				height: 2em;
				margin: auto;
				vertical-align: middle;
			}
			span {
				line-height: 1.25em;
				white-space: pre-line;
			}

			ul {
				max-height: 200px;
				overflow: auto;
				li {
					margin-bottom: .25em;
					.button {
						width: 100%;
					}
				}
			}
			.info {
				font-size: .8em;
				text-align: justify;
				background-color: var(--color-secondary-fadest);
				.icon {
					height: 1em;
					margin-right: .25em;
				}
			}
			.columnList {
				gap: .5em;
				row-gap: .25em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				align-items: center;
				justify-content: center;
			}

			&.reactions {
				max-width: 320px;
				.message {
					border-radius: var(--border-radius);
					background-color: var(--background-color-primary);
				}
			}
			&.slashCmd {
				font-size: .9em;
				span .icon {
					height: 1em;
					vertical-align: middle;
				}
			}
		}
	}

	.confirm {
		text-align: center;
		align-items: center;
		.discordName {
			font-size: 1.5em;
		}

		.ctas {
			gap: 1em;
			row-gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
	.codeForm {
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 400px;
		line-height: 1.2em;
		.code {
			gap: 1em;
			display: flex;
			flex-direction: row;
			input {
				text-transform: uppercase;
				font-size: 3em;
				width: 1.5em;
				text-align: center;
				padding: .25em;
			}
		}
	}
}
@media only screen and (max-width: 800px) {
	.paramsdiscord{
		max-width: unset !important;
		.codeForm {
			.code {
				input {
					font-size: 2.5em;
				}
			}
		}
	}
}
</style>
