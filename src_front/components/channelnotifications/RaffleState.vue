<template>
	<div class="rafflestate gameStateWindow">
		<h1 class="title">
			<img src="@/assets/icons/ticket.svg">
			<span>{{ $t('raffle.state_title') }}</span>
			<mark class="cmd" v-if="raffleData.command">{{raffleData.command}}</mark>
		</h1>

		<ProgressBar class="progress" secondary v-if="timerPercent < 1"
			:percent="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  1 : timerPercent"
			:duration="raffleData.entries?.length == raffleData.maxEntries && raffleData.maxEntries > 0?  0 : raffleData.duration_s * 1000"
		/>

		<div class="item entries">
			<img src="@/assets/icons/user.svg" alt="user">
			<i18n-t scope="global" tag="p" keypath="raffle.state_users" :plural="raffleData.entries?.length">
				<template #COUNT>
					<span>{{raffleData.entries?.length}}</span>
					<span v-if="raffleData.maxEntries">/{{raffleData.maxEntries}}</span>
				</template>
			</i18n-t>
		</div>

		<div class="item entries" v-if="cumulatedEntryCount != raffleData.entries?.length">
			<img src="@/assets/icons/ticket.svg" alt="ticket">
			<i18n-t scope="global" tag="p" keypath="raffle.state_users_cumulated" :plural="cumulatedEntryCount"
			v-if="cumulatedEntryCount != raffleData.maxEntries">
				<template #COUNT>
					<span>{{cumulatedEntryCount}}</span>
				</template>
			</i18n-t>
		</div>

		<div class="item card-item winners" v-if="raffleData.winners && raffleData.winners.length > 0">
			<div class="entries">
				<template v-for="w in raffleData.winners" :key="w.label">
					<TTButton v-if="w.user" small light
					icon="sub"
					type="link"
					target="_blank"
					:href="'https://twitch.tv/'+getUserFromEntry(w)?.login"
					@click.prevent="openUserCard(getUserFromEntry(w))">{{ w.label }}</TTButton>
					<div class="entry" v-else>{{ w.label }}</div>
				</template>
			</div>
		</div>

		<div class="ctas">
			<TTButton icon="cross"
				highlight
				alert
				@click="closeRaffle()">{{ $t('raffle.state_stopBt') }}</TTButton>
			<TTButton icon="ticket"
				@click="pickWinner()"
				secondary
				:loading="picking"
				:disabled="!canPick">{{ $t('raffle.state_pickBt') }}</TTButton>
		</div>
 
		<div class="card-item overlayStatus" v-if="obsConnected && !checkingOverlay && !overlayFound">
			<div>{{ $t("raffle.state_overlay_not_found") }}</div>
			<OverlayInstaller type="wheel" @obsSourceCreated="checkOverlay()" />
		</div>
 
		<div class="card-item overlayStatus" v-else-if="obsConnected && !checkingOverlay && !sourceVisible">
			<div>{{ $t("raffle.state_overlay_not_visible") }}</div>
			<TTButton icon="show" @click="showOverlay()">{{$t("global.show")}}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, {type OBSSourceItem} from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ProgressBar from '../ProgressBar.vue';
import TTButton from '../TTButton.vue';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';


@Component({
	components:{
		TTButton,
		ProgressBar,
		OverlayInstaller,
	},
	emits:["close"]
})
 class RaffleState extends Vue {

	public picking:boolean = false;
	public disposed:boolean = false;
	public overlayFound:boolean = false;
	public sourceVisible:boolean = false;
	public checkingOverlay:boolean = false;
	public timerPercent:number = 0;
	public raffleData!:TwitchatDataTypes.RaffleData;
	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];
	
	private overlaySource:OBSSourceItem|null = null;

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	
	public get canPick():boolean {
		return (this.raffleData.entries && this.raffleData.entries.length > 0)
			&& (this.raffleData.winners == undefined
			|| this.raffleData.winners?.length < this.raffleData.entries.length)
	}

	public get cumulatedEntryCount():number {
		let count = 0;
		this.raffleData.entries.forEach(v=> {
			count += v.joinCount;
		})
		return count;
	}
	
	public getUserFromEntry(entry:TwitchatDataTypes.RaffleEntry):TwitchatDataTypes.TwitchatUser|null {
		if(!entry.user) return null;
		return this.$store.users.getUserFrom(entry.user.platform, entry.user.channel_id, entry.user.id);
	}

	public beforeMount():void {
		this.winnerPlaceholders	= [{tag:"USER", descKey:"raffle.params.username_placeholder", example:this.$store.auth.twitch.user.displayName}];
		this.raffleData			= this.$store.raffle.data!;

		//Check if wheel's overlay exists
		PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
	}
	
	public mounted():void {
		this.renderFrame();
		this.checkOverlay();
	}
	
	public beforeUnmount():void {
		this.disposed = true;
	}

	public closeRaffle():void {
		this.$confirm(this.$t('raffle.delete_confirm.title'), this.$t('raffle.delete_confirm.description'))
		.then(async ()=> {
			this.$store.raffle.stopRaffle();
			this.$emit("close");
		}).catch(()=> {
			//ignore
		});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser | null):void {
		if(!user) return;
		this.$store.users.openUserCard(user);
	}

	public async pickWinner():Promise<void> {
		this.picking = true;
		
		await this.$store.raffle.pickWinner();

		this.picking = false;
	}

	public async showOverlay():Promise<void> {
		if(this.overlaySource) {
			this.checkingOverlay = true;
			await OBSWebsocket.instance.socket.call("SetSceneItemEnabled", {sceneItemEnabled:true, sceneItemId:this.overlaySource.sceneItemId, sceneName:this.overlaySource.sceneName!});
			this.checkOverlay();
		}
	}

	public async checkOverlay():Promise<void> {
		if(!this.obsConnected) return;

		const res = await OBSWebsocket.instance.getSources(true);
		const urlRef = new URL(this.$overlayURL("wheel"));
		this.overlayFound = false;
		this.checkingOverlay = res.length > 0;
		let remainingCount = res.length;
		res.forEach(source=> {
			if(source.inputKind != "browser_source") {
				this.checkingOverlay = (--remainingCount) > 0;
				return;
			}

			OBSWebsocket.instance.getSourceSettings<{is_local_file:boolean, url:string, local_file:string}>(source.sourceName).then(async (res) => {
				const localFile = res.inputSettings.is_local_file === true;
				let url = "";
				if(localFile) {
					url = res.inputSettings.local_file as string || "";
				}else{
					url = res.inputSettings.url as string || "";
				}
				url = url.toLowerCase();
				if(url.indexOf(document.location.host.toLowerCase()) > -1
				&& url.indexOf(urlRef.pathname.toLowerCase()) > -1) {
					this.overlayFound = true;
					if(source.sceneName) {
						const visibleRes = await OBSWebsocket.instance.socket.call("GetSceneItemEnabled", {
							sceneName:source.sceneName,
							sceneItemId:source.sceneItemId,
						});
						this.overlaySource = source;
						this.sourceVisible ||= visibleRes.sceneItemEnabled;
					}
				}
				this.checkingOverlay = (--remainingCount) > 0;
			});
		})
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const elapsed	= Date.now() - new Date(this.raffleData.created_at).getTime();
		const duration	= this.raffleData.duration_s * 1000;
		this.timerPercent = 1 - (duration-elapsed)/duration;
	}
}
export default toNative(RaffleState);
</script>

<style scoped lang="less">
.rafflestate{

	.cmd {
		margin-left: .5em;
	}

	&>.entries {
		display: flex;
		flex-direction: row;
		align-items: center;
		font-style: italic;
		img {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .5em;
		}
	}

	.winners {
		flex-shrink: 0;
	}

	.ctas {
		gap: 1em;
		row-gap: .5em;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}

	.overlayStatus {
		.bevel();
		background-color: var(--grayout-fadest);
		font-size: .85em;
		gap: .5em;
		padding: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>