<template>
	<div class="twitchatannouncement sidePanel">
		<div class="head">
			<div class="title">
				<Icon name="announcement" />
				<i18n-t scope="global" tag="h1" keypath="announcement.title">
				</i18n-t>
			</div>
			
			<i18n-t scope="global" class="description" tag="span" keypath="announcement.subtitle">
			</i18n-t>

			<CloseButton @click="close()" />
		</div>

		<div class="content">
			<form @submit.prevent="submitForm()">
				<ParamItem :paramData="param_dateStart" />
				<ParamItem :paramData="param_dateEnd" />
				<ParamItem :paramData="param_versionMax" />
				<ParamItem :paramData="param_important" />
				<ParamItem v-for="title in param_title" :paramData="title" />
				<ParamItem v-for="text in param_text" :paramData="text" />
				<Button type="submit" :loading="submitting">{{ $t("announcement.postBt") }}</Button>
			</form>

			<Splitter>{{ $t("announcement.list") }}</Splitter>

			<div class="list">
				<Icon class="loader" name="loader" v-if="loading" />
				<div class="card-item announcement" v-for="a in announcements" :key="a.id">
					<div class="ctas">
						<Button class="deleteBt" icon="trash" alert @click="deleteAnnounce(a.id)"></Button>
					</div>
					<div class="infos">
						<p class="title"><strong><ChatMessageChunksParser :chunks="getAnnouncementTitle(a)" :channel="$store('auth').twitch.user.id" platform="twitch" /></strong></p>
						<p class="date">
							<span>{{ formatDate(a.dateStart) }}</span>
							<span v-if="a.dateEnd" class="split">=&gt;</span>
							<span v-if="a.dateEnd">{{ formatDate(a.dateEnd) }}</span>
						</p>
						<p class="text"><ChatMessageChunksParser :chunks="getAnnouncementMessage(a)" :channel="$store('auth').twitch.user.id" platform="twitch" /></p>
					</div>
				</div>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import Icon from '../Icon.vue';
import ParamItem from '../params/ParamItem.vue';
import Config from '@/utils/Config';
import Splitter from '../Splitter.vue';
import Utils from '@/utils/Utils';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import ChatMessageChunksParser from '../messages/components/ChatMessageChunksParser.vue';

@Component({
	components:{
		Icon,
		Button,
		Splitter,
		ParamItem,
		CloseButton,
		ChatMessageChunksParser,
	},
	emits:[],
})
export default class TwitchatAnnouncement extends AbstractSidePanel {

	public error:boolean = false;
	public success:boolean = false;
	public loading:boolean = false;
	public submitting:boolean = false;
	public announcements:TwitchatDataTypes.TwitchatAnnouncementData[] = [];
	public param_title:TwitchatDataTypes.ParameterData<string>[] = [];
	public param_text:TwitchatDataTypes.ParameterData<string>[] = [];
	public param_important:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"announcement.param_important", icon:"alert"};
	public param_dateStart:TwitchatDataTypes.ParameterData<string> = {type:"datetime", value:new Date().toISOString().substring(0, 16), labelKey:"announcement.param_dateStart", icon:"date"};
	public param_dateEnd:TwitchatDataTypes.ParameterData<string> = {type:"datetime", value:"", labelKey:"announcement.param_dateEnd", icon:"date"};
	public param_versionMax:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"announcement.param_versionMax"};

	public getAnnouncementTitle(a:TwitchatDataTypes.TwitchatAnnouncementData):TwitchDataTypes.ParseMessageChunk[] {
		return TwitchUtils.parseMessageToChunks(a.title[this.$i18n.locale], undefined, true);
	}

	public getAnnouncementMessage(a:TwitchatDataTypes.TwitchatAnnouncementData):TwitchDataTypes.ParseMessageChunk[] {
		return TwitchUtils.parseMessageToChunks(a.text[this.$i18n.locale], undefined, true);
	}

	public beforeMount():void {
		this.$i18n.availableLocales.forEach(v=> {
			this.param_title.push({type:"string", value:"", storage:v, label:v.toUpperCase()+" "+this.$t("announcement.param_title")});
			this.param_text.push({type:"string", value:"", storage:v, longText:true, label:v.toUpperCase()+" "+this.$t("announcement.param_text")});
		});
		this.param_versionMax.value = import.meta.env.PACKAGE_VERSION;

		//Wait for emotes to be loaded to make sure they get parsed
		TwitchUtils.getEmotes().then(()=> {
			this.loadAnnouncements();
		})
	}

	public async loadAnnouncements():Promise<void> {
		this.loading = true;
		const options = {
			method:"GET",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer "+this.$store("auth").twitch.access_token,
				'App-Version': import.meta.env.PACKAGE_VERSION,
			}
		}
		const res = await fetch(Config.instance.API_PATH+"/announcements", options);
		if(res.status == 200) {
			const json:TwitchatDataTypes.TwitchatAnnouncementData[] = await res.json();
			this.announcements = json.reverse();
		}else{
			this.error = true;
		}
		this.loading = false;
	}

	public async submitForm():Promise<void> {
		this.error = true;
		this.success = true;
		this.submitting = true;
		const title:{[key:string]:string} = {};
		const text:{[key:string]:string} = {};
		this.param_title.forEach(v=> title[v.storage as string] = v.value);
		this.param_text.forEach(v=> text[v.storage as string] = v.value);

		this.$confirm(this.$t("announcement.create_confirm.title"), this.$t("announcement.create_confirm.description"))
		.then(async ()=>{
			const data = {
				title,
				text,
				dateStart:new Date(this.param_dateStart.value).getTime(),
				dateEnd:new Date(this.param_dateEnd.value).getTime(),
				versionMax:this.param_versionMax.value,
				important:this.param_important.value,
			};
			const options = {
				method:"POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+this.$store("auth").twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
				},
				body:JSON.stringify(data)
			}
			const res = await fetch(Config.instance.API_PATH+"/admin/announcements", options);
			if(res.status == 200) {
				const json = await res.json();
				if(json.success != true) {
					this.error = true;
				}else{
					this.success = true;
					this.loadAnnouncements();
				}
			}else{
				this.error = true;
			}
			this.submitting = false;
		}).catch(()=>{
			this.submitting = false;
		});
	}

	public deleteAnnounce(id:string):void {
		this.$confirm(this.$t("announcement.delete_confirm.title"), this.$t("announcement.delete_confirm.description"))
		.then(async ()=>{
			const options = {
				method:"DELETE",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Bearer "+this.$store("auth").twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
				},
				body:JSON.stringify({id})
			}
			const res = await fetch(Config.instance.API_PATH+"/admin/announcements", options);
			if(res.status == 200) {
				const json = await res.json();
				if(json.success != true) {
					this.error = true;
				}else{
					this.success = true;
					this.loadAnnouncements();
				}
			}
		})
	}

	public formatDate(timestamp:number):string {
		return Utils.formatDate(new Date(timestamp));
	}
	
}
</script>

<style scoped lang="less">
.twitchatannouncement{
	
	.loader {
		display: block;
		width: 2em;
		margin:auto;
	}
	
	.splitter {
		margin-top: 2em;
	}

	.list {
		gap: 1em;
		display: flex;
		flex-direction: column;
	
		.announcement {
			gap: .5em;
			display: flex;
			flex-direction: row;
			.ctas {
				.deleteBt {
					width: 1.5em;
				}
			}
			.infos {
				line-height: 1.25em;
				.title{
					font-size: 1.25em;
				}
				.date {
					font-style: italic;
					font-size: .8em;
					.split {
						margin: 0 .75em;
					}
				}
				.text {
					margin-top: .5em;
					white-space: pre-line;
				}
			}
		}
	}
}
</style>