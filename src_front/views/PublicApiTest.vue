<template>
	<div class="publicapitest">
		<div class="lists">
			<div class="list events">
				<div class="head">Events received</div>
				<transition-group name="list" tag="p">
					<ToggleBlock v-for="e in eventList" :class="e.active? 'event active' : 'event'"
					:key="e.key"
					:icons="e.active? ['checkmark'] : []"
					:title="e.key"
					:open="false"
					medium>
						<div class="container">
							<div class="ctas" v-if="e.data">
								<TTButton small icon="copy" :copy="JSON.stringify(e.data, null, 4)">JSON</TTButton>
								<TTButton small icon="copy" :copy="e.ts">TS</TTButton>
							</div>
							<div class="json" v-if="e.data">{{JSON.stringify(e.data, null, 2)}}</div>
							<div v-else class="empty">- no data -</div>
						</div>
					</ToggleBlock>
				</transition-group>
			</div>
			<div class="list actions">
				<div class="head">Actions</div>
				<TTButton class="action" v-for="a in actionList" small @click="executeAction(a)" :key="a.key">{{ a.key }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import TwitchatEvent, { TwitchatActionTypeList, TwitchatEventTypeList, type TwitchatActionType, type TwitchatEventType } from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
	}
})
class PublicApiTest extends Vue {

	public eventList:{key:TwitchatEventType, active:boolean, data:any|null, ts:string}[] = [];
	public actionList:{key:TwitchatActionType}[] = [];
	
	public loading = false;
	public connectError = false;
	public connectSuccess = false;
	public openConnectForm = false;
	public obsPort_conf:TwitchatDataTypes.ParameterData<number> = { type:"number", value:4455, min:0, max:65535, step:1, fieldName:"obsport", labelKey:"obs.form_port" };
	public obsPass_conf:TwitchatDataTypes.ParameterData<string> = { type:"password", value:"", fieldName:"obspass", labelKey:"obs.form_pass" };
	public obsIP_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"127.0.0.1", fieldName:"obsip", labelKey:"obs.form_ip" };

	private idsDone:{[key:string]:boolean} = {};

	public beforeMount(): void {
		this.eventList = TwitchatEventTypeList.concat().map(v=>{
			return {key:v, active:false, data:null, ts:""};
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
		this.initAPI();
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
		
		this.connectSuccess = true;
		this.initAPI();
		window.setTimeout(()=> {
			this.connectSuccess = false;
			this.openConnectForm = false;
		}, 3000);
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
		this.eventList.forEach(v=> {
			PublicAPI.instance.addEventListener(v.key, (e:TwitchatEvent) => {
				try {
					const index = this.eventList.findIndex(v=>v.key === e.type);
					if(index == -1) return;
					const obj = this.eventList.splice(index, 1)[0];
					if(obj) {
						obj.active = true;
						obj.data = e.data;
						obj.ts = Utils.jsonToTS(e.data);
					}
				}catch(error) {
					console.log(error)
				}
			})
		});
	}

}
export default toNative(PublicApiTest);
</script>

<style scoped lang="less">
.publicapitest{
	color: var(--color-text);
	padding: 1em;
	.connectForm, .connectForm>form {
		gap: .5em;
		display: flex;
		flex-direction: column;
		max-width: fit-content;
		justify-content: center;
		margin: auto;
		//background: var(--color-light);
		.param {
			:deep(.inputHolder) {
				flex-basis: 200px;
				flex-grow: 0 !important;
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
				margin-bottom: 5px;
			}

			.action {
				margin-bottom: 5px;
				font-size: .7em;
			}
			
			.event {
				opacity: .5;
				margin-bottom: 5px;
				flex-grow: 1;
				&.active {
					opacity: 1;
				}
				.container {
					position: relative;
					.empty {
						text-align: center;
						font-style: italic;
					}
					.json {
						white-space: pre-wrap;
						font-family: monospace;
					}
		
					.ctas {
						position: absolute;
						top: 5px;
						right: 5px;
						display: flex;
						flex-direction: row;
						gap: .25em;
					}
				}
			}
		}
	}
	.list-move {
		transition: transform 0.35s ease;
	}
}
</style>