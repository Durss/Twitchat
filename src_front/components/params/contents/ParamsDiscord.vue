<template>
	<div class="paramsdiscord parameterContent">
		<Icon name="discord" class="icon" />

		<div class="head">
			<i18n-t scope="global"  tag="p" keypath="discord.header"></i18n-t>
			<TTButton icon="discord" primary type="link" :href="$config.DISCORD_BOT_URL" target="_blank">{{ $t("discord.install_bt") }}</TTButton>
		</div>
		
		<section class="card-item" v-if="stateLoading">
			<Icon class="loader" name="loader" />
		</section>
		
		<template v-else-if="linkedToGuild">
			<TTButton class="unlinkBt" icon="cross" alert @click="unlink()" :loading="submitting">{{ $t("discord.unkinkBt", {GUILD:linkedToGuild}) }}</TTButton>

			<section class="card-item reactions">
				<Icon name="emote" />
				<ParamItem :paramData="param_reactions" noBackground v-model="$store.discord.reactionsEnabled" @change="saveParams()" />
				<div class="message"><MessageItem :messageData="messagePreview"></MessageItem></div>
			</section>

			<section class="card-item colSelector">
				<Icon name="split" />{{$t("discord.chat_col")}}
				<div class="columnList">
					<TTButton v-for="col, index in $store.params.chatColumnsConfig"
					:key="index"
					@click="selectColumn(col.order)"
					:secondary="$store.discord.chatCols.indexOf(col.order) > -1">{{ index+1 }}</TTButton>
				</div>
			</section>

			<section class="card-item chanSelector">
				<Icon name="mod" />
				{{$t("discord.channel_ban_log")}}
				<select v-model="$store.discord.banLogTarget" @change="saveParams()">
					<option v-for="chan in channelList" :key="chan.id" :value="chan.id">{{ chan.name }}</option>
				</select>
				<ParamItem :paramData="param_banLogThread" noBackground v-model="$store.discord.banLogThread" @change="saveParams()" />
			</section>

			<section class="card-item chanSelector">
				<Icon name="commands" />
				<i18n-t scope="global" tag="p" keypath="discord.channel_cmd">
					<template #CMD><mark>{{ $store.chat.commands.find(v=>v.id == "discord")?.cmd }}</mark></template>
				</i18n-t>
				<select v-model="$store.discord.chatCmdTarget" @change="saveParams()">
					<option v-for="chan in channelList" :key="chan.id" :value="chan.id">{{ chan.name }}</option>
				</select>
			</section>

			<section class="card-item chanSelector">
				<Icon name="rightClick" />{{$t("discord.quick_actions")}}
				<ParamsDiscordQuickActions channelList @change="saveParams()" />
			</section>

			<section class="card-item chanSelector">
				<Icon name="save" />{{$t("discord.channel_logs")}}
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
		</template>
		
		<section class="card-item confirm" v-else-if="linkConfirm">
			<div>{{ $t("discord.install_confirm") }}</div>
			<mark class="discordName">{{ discordName }}</mark>
			<div class="ctas">
				<TTButton icon="cross" alert @click="linkConfirm = false; linkErrorCode=''">{{ $t("global.cancel") }}</TTButton>
				<TTButton icon="checkmark" primary @click="confirmLink()" :loading="submitting">{{ $t("global.confirm") }}</TTButton>
			</div>
			<div @click="linkErrorCode = ''" v-if="linkErrorCode" class="card-item alert error">{{ $t("error.discord."+linkErrorCode, {CHANNEL:channelName}) }}</div>
		</section>

		<section class="card-item codeForm" v-else>
			<i18n-t scope="global"  tag="p" keypath="discord.install_code">
				<template #CMD><mark>/link</mark></template>
			</i18n-t>
			<div class="code">
				<input type="text" placeholder="_"
					v-for="i, index in codeLength"
					@input="onChange"
					:value="code[index]"
					v-click2Select
					ref="codeInput">
			</div>
			<Icon class="loader" name="loader" v-if="linkLoading" />
			<div @click="linkErrorCode = ''" v-if="linkErrorCode" class="card-item alert error">{{ $t("error.discord."+linkErrorCode) }}</div>
		</section>

	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ApiHelper from '@/utils/ApiHelper';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamsDiscordQuickActions from './discord/ParamsDiscordQuickActions.vue';
import MessageItem from '@/components/messages/MessageItem.vue';
import Utils from '@/utils/Utils';

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
class ParamsDiscord extends Vue implements IParameterContent {

	public code:string = "";
	public codeLength:number = 4;
	public duration:number = 0;
	public discordName:string = "";
	public linkedToGuild:string = "";
	public channelName:string = "";
	public validateDebounce:number = -1;
	public submitting:boolean = false;
	public stateLoading:boolean = true;
	public linkLoading:boolean = false;
	public linkConfirm:boolean = false;
	public linkErrorCode:string = "";
	public channelList:{id:string, name:string}[] = [];
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
	
	public async beforeMount():Promise<void> {
		const result = await ApiHelper.call("discord/link");
		if(result.json.linked === true) {
			this.linkedToGuild = result.json.guildName;
		}
		this.channelList = this.$store.discord.channelList.concat();
		this.channelList.unshift({id:"", name:this.$t("global.select_placeholder")});

		this.stateLoading = false;

		this.saveParams();
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Called wanytime an input's value changes
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
			this.linkErrorCode = "";
			//Debounce updates to avoid spamming server
			clearTimeout(this.validateDebounce);
			this.validateDebounce = setTimeout(()=>{
				this.validateCode();
			}, 500);
		}
	}

	/**
	 * Validate current code
	 */
	public async validateCode():Promise<void> {
		try {
			const result = await ApiHelper.call("discord/code", "GET", {code:this.code});
			if(result.status !== 200) {
				this.linkErrorCode = result.json.errorCode || "UNKNOWN";
			}else{
				this.discordName = result.json.guildName || "???";
				this.linkConfirm = true;
			}
		}catch(error) {
		}
		this.linkLoading = false;
	}

	/**
	 * Validate discord linking
	 */
	public async confirmLink():Promise<void> {
		this.submitting = true;
		try {
			const result = await ApiHelper.call("discord/code", "POST", {code:this.code}, false);
			if(result.status !== 200) {
				this.channelName = result.json.channelName!;
				this.linkErrorCode = result.json.errorCode || "UNKNOWN";
			}else{
				this.linkedToGuild = result.json.guildName!;
				this.$store.auth.twitch.user.discordLinked = true;
			}
		}catch(error) {
		}
		this.submitting = false;
	}

	/**
	 * Unlink discord
	 */
	public async unlink():Promise<void> {
		this.submitting = true;
		try {
			const result = await ApiHelper.call("discord/link", "DELETE");
			if(result.json.success) {
				this.linkedToGuild = "";
				this.$store.auth.twitch.user.discordLinked = false;
			}
		}catch(error) {
		}
		this.submitting = false;
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

}
export default toNative(ParamsDiscord);
</script>

<style scoped lang="less">
.paramsdiscord{

	.error {
		cursor: pointer;
	}

	.loader {
		height: 2em;
		margin: auto;
	}

	.unlinkBt {
		align-self: center;
	}

	section:not(.codeForm) {
		&>.icon {
			height: 2em;
			vertical-align: middle;
			margin-right: .5em;
		}
	}

	.chanSelector, .colSelector {
		max-width: 350px;
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
	}

	.reactions {
		.message {
			border-radius: var(--border-radius);
			background-color: var(--background-color-primary);
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
</style>