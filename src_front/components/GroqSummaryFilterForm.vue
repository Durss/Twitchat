<template>
	<div :class="{groqsummaryfilterform:true, 'card-item':standalone === false, primary:standalone === false}">
		<ClearButton aria-label="close" @click="$emit('close')" class="closeBt" v-if="standalone === false" />
		<div class="title" v-if="standalone === false">{{$t("groq.summarize_title")}}</div>
		<div class="title" v-else>{{$t("groq.summarize_chat_title")}}</div>

		<ParamItem :paramData="param_filter" v-model="modeLocal" noBackground />
		<ParamItem v-if="modeLocal == 'duration'" :paramData="param_duration" v-model="duration" noBackground />
		<ParamItem v-if="modeLocal == 'count'" :paramData="param_count" v-model="count" noBackground />

		<ToggleBlock :open="false" :title="$t('global.advanced_params')" small>
			<div class="advancedParams">
				<ParamItem :paramData="param_preprompt_toggle" v-model="param_preprompt_toggle.value" noBackground>
					<ParamItem :childLevel="1" :paramData="param_preprompt_value" v-model="preprompt" noBackground />
				</ParamItem>

				<ParamItem :paramData="param_ignore_short" v-model="param_ignore_short.value" noBackground />

				<div class="channelList" v-if="channelList.size > 1">
					<button :class="{channel: true, selected: selectedChannels.includes(chan?.name)}"
					v-for="[key, chan] in channelList"
					:key="chan?.name"
					:style="{borderColor:chan?.color}"
					v-tooltip="{content:chan?.name}"
					@click="toggleChannel(chan)">
						<img v-if="chan?.pic" :src="chan.pic" alt="avatar">
					</button>
				</div>
			</div>
		</ToggleBlock>

		<TTButton @click="summarize"
			icon="groq"
			:primary="standalone === false"
			:light="standalone === false"
			:loading="loading"
			:disabled="filteredMessageList.length === 0">{{ $t("groq.summarize_duration_bt", {COUNT:filteredMessageList.length}, filteredMessageList.length) }}</TTButton>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import TTButton from './TTButton.vue';
import { ParamItem } from './params/ParamItem.vue';
import SwitchButton from './SwitchButton.vue';
import ClearButton from './ClearButton.vue';
import ToggleBlock from './ToggleBlock.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
		ClearButton,
		SwitchButton,
	},
	emits:["complete", 'close'],
})
class GroqSummaryFilterForm extends Vue {

	@Prop({type:Array, default:[]})
	public messageList!:TwitchatDataTypes.MessageChatData[];

	@Prop({type:String, default:null})
	public mode!:typeof this.modeLocal | null;

	@Prop({type:Number, default:-1})
	public filterValue!:number;

	@Prop({type:Boolean, default:false})
	public standalone!:boolean;

	public modeLocal:"duration"|"count"|"all" = "duration";
	public loading:boolean = false;
	public duration:number = 2*60;
	public count:number = 10;
	public preprompt:string = "";
	public selectedChannels:string[] = [];
	public param_filter:TwitchatDataTypes.ParameterData<"duration"|"count"> = {type:"list", value:"duration", labelKey:"groq.param_filter", icon:"filters"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"duration", value:2*60, min:1, max:1000000000, labelKey:"groq.param_duration", icon:"timer"};
	public param_count:TwitchatDataTypes.ParameterData<number> = {type:"number", value:10, min:1, max:100000, labelKey:"groq.param_count", icon:"number"};
	public param_ignore_short:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"groq.param_ignore_short", icon:"emote"};
	public param_preprompt_toggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"groq.param_preprompt", icon:"edit"};
	public param_preprompt_value:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, placeholderKey:"groq.param_preprompt_placeholder"};

	public get filteredMessageList():TwitchatDataTypes.MessageChatData[] {
		const me = this.$store.auth.twitch.user;
		const now = Date.now();
		let filtered:TwitchatDataTypes.MessageChatData[] = [];
		for (let i = this.messageList.length-1; i > -1; i--) {
			const m = this.messageList[i];
			if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
			if(m.channelSource && !this.selectedChannels.includes(m.channelSource.name)) continue;
			if(!m.channelSource && !this.selectedChannels.includes(me.login)) continue;
			if(this.modeLocal == "duration" && (now - m.date) > this.duration * 1000) break;
			filtered.push(m);
			if(this.modeLocal == "count" && filtered.length >= this.count) break;
		}
		if(this.param_ignore_short.value) {
			filtered = filtered.filter(m => !m.is_short
										&& m.message.trim().length > 0
										&& m.message_chunks.map(v=>{
											if(v.type != "text" && v.type != "highlight") return "";
											return v.value.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
										}).join(" ").trim().length >= 6);
		}
		return filtered.sort((a,b) => a.date - b.date);
	}

	public get channelList() {
		const me = this.$store.auth.twitch.user;
		const chans:Map<string, NonNullable<TwitchatDataTypes.AbstractTwitchatMessage["channelSource"]>> = new Map();
		for (let i = this.messageList.length-1; i > -1; i--) {
			const m = this.messageList[i];
			if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
			if(m.channelSource) chans.set(m.channelSource.name, m.channelSource);
			else chans.set(me.login, {color:me.color || "#ffffff", name:me.login, pic:me.avatarPath});
		}
		return chans;
	}

	public mounted():void {
		this.selectedChannels = Array.from(this.channelList.keys());
		if(this.mode) {
			this.modeLocal = this.mode;
		}
		if(this.filterValue != -1) {
			if(this.modeLocal == "count") this.count = this.filterValue;
			if(this.modeLocal == "duration") this.duration = this.filterValue;
		}
		this.param_filter.listValues = [
			{value:"duration", labelKey:"groq.param_filter_duration"},
			{value:"count", labelKey:"groq.param_filter_count"},
			{value:"all", labelKey:"groq.param_filter_all"},
		];
	}

	public async summarize():Promise<void> {
		this.loading = true;
		try {
			this.$store.groq.getSummary(this.filteredMessageList, this.preprompt);
		}catch(e) {
			console.error(e);
			return;
		}
		this.$emit("complete");
		this.$emit("close");
	}

	public toggleChannel(channel:typeof this.channelList extends Map<string, infer V> ? V : never):void {
		const index = this.selectedChannels.indexOf(channel.name);
		if(index == -1) this.selectedChannels.push(channel.name);
		else this.selectedChannels.splice(index, 1);
	}

}
export default toNative(GroqSummaryFilterForm);
</script>

<style scoped lang="less">
.groqsummaryfilterform{
	gap: .5em;
	display: flex;
	flex-direction: column;
	position: relative;
	// align-items: center;

	.closeBt {
		padding: .5em;
	}

	.title {
		padding: 0 1.5em;
		text-align: center;
		text-wrap: balance;
		line-height: 1.25em;
		white-space: pre-line;
	}

	.paramitem {
		:deep(select) {
			flex-basis: 150px;
		}
	}

	.advancedParams {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}

	.channelList {
		gap: .25em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: center;
		.channel {
			width: 2em;
			height: 2em;
			border-radius: 50%;
			overflow: hidden;
			border: 0px solid transparent;
			opacity: .3;
			transition: all .2s;
			img {
				width: 100%;
				height: 100%;
			}

			&.selected {
				opacity: 1;
				border-width: 1px;
			}
		}
	}
}
</style>
