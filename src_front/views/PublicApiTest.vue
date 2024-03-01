<template>
	<div class="publicapitest">
		<div class="connectForm blured-background-window">
			<form @submit.prevent="connect()" v-if="!connected">
				<ParamItem :paramData="obsPort_conf" class="row" />
				<ParamItem :paramData="obsPass_conf" class="row" />
				<ParamItem :paramData="obsIP_conf" class="row" />
				
				<ToggleBlock class="info" small :open="false" title="Where can i find these values?">
					After you installed OBS-Websocket, open OBS, go on "Tools => obs-websocket Settings".
					<br>
					<br>This window will open with the credentials:
					<br><span class="warn">You'll probably want to leave the IP to <strong>127.0.0.1</strong>!</span>
					<img src="@/assets/img/obs-ws_credentials.png" alt="credentials">
				</ToggleBlock>

				<Button title="Connect" type="submit" class="connectBt" :loading="loading" />
			</form>
			<Button v-else @click="disconnect()" class="connectBt" :loading="loading" alert icon="cross">Disconnect</Button>
		</div>

		<div class="lists">
			<div class="list events">
				<div class="head">Events</div>
				<transition-group name="list" tag="p">
					<ToggleBlock v-for="e in eventList" :class="e.active? 'event active' : 'event'"
					:key="e.key"
					:icons="e.active? ['checkmark'] : []"
					:title="e.key"
					:open="false">
						<div v-if="e.data">{{e.data}}</div>
						<div v-else class="empty">- no data -</div>
					</ToggleBlock>
				</transition-group>
			</div>
			<div class="list actions">
				<div class="head">Actions</div>
				<Button class="action" v-for="a in actionList" small @click="executeAction(a)" :key="a.key">{{ a.key }}</Button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import { TwitchatActionTypeList, TwitchatEventTypeList, type TwitchatActionType, type TwitchatEventType } from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import type { JsonArray, JsonObject, JsonValue } from 'type-fest';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ToggleBlock,
	}
})
 class PublicApiTest extends Vue {

	public eventList:{key:TwitchatEventType, active:boolean, data:any|null}[] = [];
	public actionList:{key:TwitchatActionType}[] = [];
	
	public loading = false;
	public connected = false;
	public connectError = false;
	public connectSuccess = false;
	public openConnectForm = false;
	public obsPort_conf:TwitchatDataTypes.ParameterData<number> = { type:"number", value:4455, min:0, max:65535, step:1, fieldName:"obsport", labelKey:"obs.form_port" };
	public obsPass_conf:TwitchatDataTypes.ParameterData<string> = { type:"password", value:"", fieldName:"obspass", labelKey:"obs.form_pass" };
	public obsIP_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"127.0.0.1", fieldName:"obsip", labelKey:"obs.form_ip" };

	private idsDone:{[key:string]:boolean} = {};

	public beforeMount(): void {
		this.connected = OBSWebsocket.instance.connected;
		this.eventList = TwitchatEventTypeList.concat().map(v=>{
			return {key:v, active:false, data:null};
		}).sort((a,b)=> {
			if(a.key < b.key) return -1;
			if(a.key > b.key) return 1;
			return 0;
		});
		//@ts-ignore
		this.eventList.push({key:"CUSTOM_CHAT_MESSAGE", active:false, data:null});

		this.actionList = TwitchatActionTypeList.concat().map(v=>{
			return {key:v};
		}).sort((a,b)=> {
			if(a.key < b.key) return -1;
			if(a.key > b.key) return 1;
			return 0;
		});
		if(this.connected) {
			this.initAPI();
		}
	}

	/**
	 * Connect to OBS websocket
	 */
	public async connect():Promise<void> {
		this.loading = true;
		this.connectSuccess = false;
		this.connectError = false;

		//Make sure OBS will connect
		this.$store.obs.connectionEnabled = true;
		
		const connected = await OBSWebsocket.instance.connect(
							this.obsPort_conf.value.toString(),
							this.obsPass_conf.value,
							false,
							this.obsIP_conf.value
						);
		if(connected) {
			this.connected = true;
			this.connectSuccess = true;
			this.initAPI();
			setTimeout(()=> {
				this.connectSuccess = false;
				this.openConnectForm = false;
			}, 3000);
		}else{
			this.connectError = true;
		}
		this.loading = false;
	}

	public async disconnect():Promise<void> {
		OBSWebsocket.instance.disconnect();
	}

	public async executeAction(action:{key:TwitchatEventType|TwitchatActionType}):Promise<void> {
		let data:{[key:string]:any} = {};
		if(action.key == "CUSTOM_CHAT_MESSAGE") {
			data.message = "This is message";
			data.user = {
				name:"Twitch",
				color:"#dF841f",
			};
		}
		PublicAPI.instance.broadcast(action.key, data);
	}

	private initAPI():void {
		//@ts-ignore
		OBSWebsocket.instance.socket.on("CustomEvent", (e:{origin:"twitchat", type:TwitchatEventType, data:JsonObject | JsonArray | JsonValue}) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			const data = e.data as {id:string};
			if(data.id){
				if(this.idsDone[data.id] === true) return;
				this.idsDone[data.id] = true;
				const index = this.eventList.findIndex(v=>v.key === e.type);
				if(index == -1) return;
				const obj = this.eventList.splice(index, 1)[0];
				if(obj) {
					obj.active = true;
					obj.data = data;
				}
				this.eventList.unshift(obj);//Bring to top
			}
		})
	}

}
export default toNative(PublicApiTest);
</script>

<style scoped lang="less">
.publicapitest{
	padding: 1em;
	.connectForm {
		max-width: fit-content;
		margin: auto;
		//background: var(--color-light);

		text-align: center;

		:deep(input) {
			min-width: 100px;
			//These lines seems stupide AF but they allow the input
			//to autosize to it's min length
			width: 0%;
			flex-grow: 1;
			max-width: 100px;

			text-align: center;
			
			//Hide +/- arrows
			&::-webkit-outer-spin-button,
			&::-webkit-inner-spin-button {
				display: none;
			}
		}
	}

	.connectBt {
		margin: auto;
	}

	.lists {
		display: flex;
		flex-direction: row;
		.list {
			display: flex;
			flex-direction: column;
			margin-top: 1em;
			&.events {
				flex-grow: 1;
				margin-left: 5px;
			}

			.head {
				font-size: 1.5em;
				text-align: center;
				color: var(--color-light);
				margin-bottom: 5px;
			}

			.action {
				margin-bottom: 5px;
				font-size: .7em;
			}
			
			.event {
				opacity: .5;
				margin-bottom: 5px;
				font-size: .7em;
				flex-grow: 1;
				&.active {
					opacity: 1;
				}
				.empty {
					text-align: center;
					font-style: italic;
				}
			}
		}
	}
	.list-move {
		transition: transform 0.35s ease;
	}
}
</style>