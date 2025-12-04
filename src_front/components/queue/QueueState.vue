<template>
	<div class="queuestate">
		<div v-if="activeQueues.length === 0 && queueIds && queueIds.length > 0" class="no-queues">
			{{ $t('queue.empty') }}
		</div>
		
		<template v-if="activeQueues.length > 0">
		<div class="header">
			<div class="title">
				<h1>{{ $t("queue.default_title") }} <span class="count" v-if="totalCount > 0">({{ totalCount }})</span></h1>
			</div>
			<button class="toggleBt" @click="removeQueue()" v-tooltip="$t('global.hide')">
				<Icon name="cross" />
			</button>
		</div>
		<div class="messageList" v-if="showList || !collapsible">
			<div v-for="queue in activeQueues" :key="queue.id" :class="['queue-item', {disabled: !queue.enabled}]">
				<div class="queue-header">
					<Icon name="list" class="icon" />
					<div class="title-wrapper">
						<span class="title">{{ queue.title || $t('queue.default_title') }}</span>
						<span class="disabled-badge" v-if="!queue.enabled">{{ $t('global.disabled') }}</span>
						<button class="copyIdBt" @click="copyQueueId(queue)" v-tooltip="copiedId === queue.id ? $t('global.copied') : $t('queue.copy_id_tt')">
							<Icon name="copy" />
						</button>
					</div>
					<span class="status" v-if="queue.paused">({{ $t('queue.paused') }})</span>
					<div class="header-buttons">
						<button class="headerBt" @click="pickFirst(queue)" v-if="queue.entries.length > 0 && queue.enabled" v-tooltip="$t('queue.pick_first_tt')">
							<Icon name="next" />
						</button>
						<button class="headerBt" @click="pickRandom(queue)" v-if="queue.entries.length > 0 && queue.enabled" v-tooltip="$t('queue.pick_random_tt')">
							<Icon name="dice" />
						</button>
						<button class="headerBt" @click="togglePause(queue)" v-if="queue.enabled" v-tooltip="queue.paused ? $t('queue.form.resume_queue_tt') : $t('queue.form.pause_queue_tt')">
							<Icon :name="queue.paused ? 'play' : 'pause'" />
						</button>
					</div>
				</div>
				
				<div class="columns-container">
					<!-- Queue entries column -->
					<div class="column entries" v-if="queue.entries.length > 0 || (queue.entries.length === 0 && (!queue.inProgress || queue.inProgress.length === 0))">
						<div class="section-title">
							<span>{{ $t('queue.form.list_entries') }} <span class="count">({{ queue.entries.length }})</span></span>
							<div class="clearActions" v-if="queue.entries.length > 0 && queue.enabled">
								<button class="clearBt" @click="toggleClearConfirm('queue_'+queue.id)" v-if="!confirmingClear['queue_'+queue.id]" v-tooltip="$t('queue.clear_queue_tt')">
									<Icon name="trash" />
								</button>
								<template v-else>
									<button class="confirmBt" @click="confirmClear('queue_'+queue.id, 'queue', queue.id)" v-tooltip="$t('global.confirm')">
										<Icon name="checkmark" />
									</button>
									<button class="cancelBt" @click="cancelClear('queue_'+queue.id)" v-tooltip="$t('global.cancel')">
										<Icon name="cross" />
									</button>
								</template>
							</div>
						</div>
						<div class="user-list" v-if="queue.entries.length > 0">
							<div v-for="(entry, index) in queue.entries" :key="entry.user.id" class="messageListItem user-entry">
								<span class="position">{{ index + 1 }}.</span>
								<Icon :name="entry.user.platform" class="platform-icon" />
								<img :src="entry.user.avatarPath" class="avatar" v-if="entry.user.avatarPath" @click.stop="openUserCard(entry.user)" />
								<a class="username" @click.stop="openUserCard(entry.user)">{{ entry.user.displayName }}</a>
								<div class="actions">
									<button class="actionBt" @click="moveUp(queue.id, entry.user.id, index)" v-if="index > 0 && queue.enabled" v-tooltip="$t('queue.form.move_up_tt')">
										<Icon name="arrowDown" class="icon up" />
									</button>
									<button class="actionBt" @click="moveDown(queue.id, entry.user.id, index)" v-if="index < queue.entries.length - 1 && queue.enabled" v-tooltip="$t('queue.form.move_down_tt')">
										<Icon name="arrowDown" class="icon" />
									</button>
									<button class="actionBt" @click="moveToInProgress(queue.id, entry.user.id)" v-if="queue.inProgressEnabled && queue.enabled" v-tooltip="$t('queue.form.move_to_progress_tt')">
										<Icon name="next" class="icon" />
									</button>
									<button class="actionBt delete" @click="removeEntry(queue.id, entry.user.id)" v-if="queue.enabled" v-tooltip="$t('queue.form.remove_viewer_tt')">
										<Icon name="trash" class="icon" />
									</button>
								</div>
							</div>
						</div>
						<!-- Empty state -->
						<div class="empty" v-if="queue.entries.length === 0">
							{{ $t('queue.empty') }}
						</div>
					</div>
					
					<!-- In progress entries column -->
					<div class="column in-progress" v-if="queue.inProgressEnabled && queue.inProgress && queue.inProgress.length > 0">
						<div class="section-title">
							<span>{{ $t('queue.form.list_in_progress') }} <span class="count">({{ queue.inProgress.length }})</span></span>
							<div class="clearActions" v-if="queue.inProgress.length > 0 && queue.enabled">
								<button class="clearBt" @click="toggleClearConfirm('progress_'+queue.id)" v-if="!confirmingClear['progress_'+queue.id]" v-tooltip="$t('queue.clear_in_progress_tt')">
									<Icon name="trash" />
								</button>
								<template v-else>
									<button class="confirmBt" @click="confirmClear('progress_'+queue.id, 'progress', queue.id)" v-tooltip="$t('global.confirm')">
										<Icon name="checkmark" />
									</button>
									<button class="cancelBt" @click="cancelClear('progress_'+queue.id)" v-tooltip="$t('global.cancel')">
										<Icon name="cross" />
									</button>
								</template>
							</div>
						</div>
						<div class="user-list">
							<div v-for="(entry, indexProgress) in queue.inProgress" :key="entry.user.id" class="messageListItem user-entry in-progress">
								<Icon :name="entry.user.platform" class="platform-icon" />
								<img :src="entry.user.avatarPath" class="avatar" v-if="entry.user.avatarPath" @click.stop="openUserCard(entry.user)" />
								<a class="username" @click.stop="openUserCard(entry.user)">{{ entry.user.displayName }}</a>
								<div class="actions">
									<button class="actionBt" @click="moveToQueue(queue.id, entry.user.id)" v-if="queue.enabled" v-tooltip="$t('queue.form.move_back_to_queue_tt')">
										<Icon name="prev" class="icon" />
									</button>
									<button class="actionBt delete" @click="removeInProgressEntry(queue.id, entry.user.id)" v-if="queue.enabled" v-tooltip="$t('queue.form.remove_viewer_tt')">
										<Icon name="trash" class="icon" />
									</button>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Recently removed entries column (only if in progress is disabled) -->
					<div class="column removed" v-else-if="!queue.inProgressEnabled && removedUsers[queue.id] && removedUsers[queue.id].length > 0">
						<div class="section-title">
							<span>{{ $t('queue.recently_removed') }} <span class="count">({{ removedUsers[queue.id].length }})</span></span>
							<div class="clearActions" v-if="removedUsers[queue.id].length > 0">
								<button class="clearBt" @click="toggleClearConfirm('removed_'+queue.id)" v-if="!confirmingClear['removed_'+queue.id]" v-tooltip="$t('queue.clear_removed_tt')">
									<Icon name="trash" />
								</button>
								<template v-else>
									<button class="confirmBt" @click="confirmClear('removed_'+queue.id, 'removed', queue.id)" v-tooltip="$t('global.confirm')">
										<Icon name="checkmark" />
									</button>
									<button class="cancelBt" @click="cancelClear('removed_'+queue.id)" v-tooltip="$t('global.cancel')">
										<Icon name="cross" />
									</button>
								</template>
							</div>
						</div>
						<div class="user-list">
							<div v-for="(entry, indexRemoved) in removedUsers[queue.id]" :key="'removed_'+entry.user.id+'_'+indexRemoved" class="messageListItem user-entry removed">
								<Icon :name="entry.user.platform" class="platform-icon" />
								<img :src="entry.user.avatarPath" class="avatar" v-if="entry.user.avatarPath" @click.stop="openUserCard(entry.user)" />
								<a class="username" @click.stop="openUserCard(entry.user)">{{ entry.user.displayName }}</a>
								<div class="actions">
									<button class="actionBt delete" @click="removeFromRemovedList(queue.id, indexRemoved)" v-tooltip="$t('queue.remove_permanently_tt')">
										<Icon name="trash" class="icon" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		</template>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative, Prop, Watch } from 'vue-facing-decorator';
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';

@Component({
	components:{
		Icon,
	},
	emits:["update:collapsed", "remove"]
})
class QueueState extends Vue {

	@Prop()
	public queueIds?: string[];

	@Prop({ default: true })
	public collapsible!: boolean;

	@Prop({ default: false })
	public collapsed!: boolean;

	public showList: boolean = true;
	public removedUsers:{[queueId:string]:TwitchatDataTypes.QueueEntry[]} = {};
	public confirmingClear:{[key:string]:boolean} = {};
	public copiedId: string | null = null;
	private clearTimeouts:{[key:string]:number} = {};
	private copiedTimeout: number = -1;
	private queueUserRemovedHandler!: (e: GlobalEvent) => void;
	private queueClearRemovedHandler!: (e: GlobalEvent) => void;

	public mounted():void {
		// Only apply collapsed state if collapsible is true
		if (this.collapsible) {
			this.showList = !this.collapsed;
		}
		
		// Listen for queue events
		this.queueUserRemovedHandler = (e: GlobalEvent) => this.onQueueUserRemoved(e);
		this.queueClearRemovedHandler = (e: GlobalEvent) => this.onQueueClearRemoved(e);
		EventBus.instance.addEventListener(GlobalEvent.QUEUE_USER_REMOVED, this.queueUserRemovedHandler);
		EventBus.instance.addEventListener(GlobalEvent.QUEUE_CLEAR_REMOVED, this.queueClearRemovedHandler);
	}
	
	public beforeUnmount():void {
		EventBus.instance.removeEventListener(GlobalEvent.QUEUE_USER_REMOVED, this.queueUserRemovedHandler);
		EventBus.instance.removeEventListener(GlobalEvent.QUEUE_CLEAR_REMOVED, this.queueClearRemovedHandler);
		if(this.copiedTimeout !== -1) {
			clearTimeout(this.copiedTimeout);
		}
	}

	@Watch('collapsed')
	public onCollapsedChange(newVal: boolean):void {
		this.showList = !newVal;
	}

	public get activeQueues():TwitchatDataTypes.QueueData[] {
		// Filter by specific queue IDs if provided, otherwise show all queues
		return this.$store.queue.queueList.filter(q => {
			// If queueIds is provided AND not empty, only show queues that are in the list
			if(this.queueIds !== undefined && this.queueIds.length > 0) {
				// Only include if the queue ID is in the list
				return this.queueIds.includes(q.id);
			}
			// If no queueIds provided or empty array, show all queues (enabled and disabled)
			return true;
		});
	}

	public get totalCount():number {
		return this.activeQueues.reduce((total, queue) => {
			const queueCount = queue.entries.length;
			const inProgressCount = queue.inProgressEnabled && queue.inProgress ? queue.inProgress.length : 0;
			return total + queueCount + inProgressCount;
		}, 0);
	}

	public toggleList():void {
		if (this.collapsible) {
			this.showList = !this.showList;
			this.$emit('update:collapsed', !this.showList);
		}
	}

	public removeQueue():void {
		// Emit event to remove all queues from this column
		if (this.queueIds) {
			this.$emit('remove', this.queueIds);
		}
	}

	public moveUp(queueId:string, userId:string, index:number):void {
		this.$store.queue.moveUserUp(queueId, userId);
	}

	public moveDown(queueId:string, userId:string, index:number):void {
		this.$store.queue.moveUserDown(queueId, userId);
	}

	public moveToInProgress(queueId:string, userId:string):void {
		this.$store.queue.moveToInProgress(queueId, userId);
	}

	public moveToQueue(queueId:string, userId:string):void {
		this.$store.queue.moveUserBackToQueue(queueId, userId);
	}

	public removeViewer(queueId:string, userId:string):void {
		this.$store.queue.removeViewer(queueId, userId);
	}

	public removeEntry(queueId:string, userId:string):void {
		this.$store.queue.removeViewerFromQueue(queueId, userId);
	}

	public removeInProgressEntry(queueId:string, userId:string):void {
		this.$store.queue.removeViewerFromInProgress(queueId, userId);
	}

	public togglePause(queue:TwitchatDataTypes.QueueData):void {
		if(queue.paused) {
			this.$store.queue.resumeQueue(queue.id);
		} else {
			this.$store.queue.pauseQueue(queue.id);
		}
	}
	
	public copyQueueId(queue:TwitchatDataTypes.QueueData):void {
		navigator.clipboard.writeText(queue.id);
		this.copiedId = queue.id;
		
		// Clear any existing timeout
		if(this.copiedTimeout !== -1) {
			clearTimeout(this.copiedTimeout);
		}
		
		// Reset after 2 seconds
		this.copiedTimeout = window.setTimeout(() => {
			this.copiedId = null;
			this.copiedTimeout = -1;
		}, 2000);
	}

	public pickFirst(queue:TwitchatDataTypes.QueueData):void {
		if(queue.entries.length === 0) return;

		const entry = queue.entries[0];

		// Move to in progress if enabled, otherwise add to removed list
		if(queue.inProgressEnabled) {
			try {
				this.$store.queue.pickFirstUser(queue.id);
			} catch(e) {
				// Queue empty or in-progress not enabled
			}
		} else {
			// Remove from queue
			queue.entries.splice(0, 1);

			// Add to removed list
			if(!this.removedUsers[queue.id]) {
				this.removedUsers[queue.id] = [];
			}
			this.removedUsers[queue.id].push(entry);

			this.$store.queue.saveData();
			this.$store.queue.broadcastStates(queue.id);
		}
	}

	public pickRandom(queue:TwitchatDataTypes.QueueData):void {
		if(queue.entries.length === 0) return;

		const entry = queue.entries[Math.floor(Math.random() * queue.entries.length)];

		// Move to in progress if enabled, otherwise add to removed list
		if(queue.inProgressEnabled) {
			try {
				this.$store.queue.pickRandomUser(queue.id);
			} catch(e) {
				// Queue empty or in-progress not enabled
			}
		} else {
			// Remove from queue
			const index = queue.entries.findIndex(e => e.user.id === entry.user.id);
			if(index > -1) queue.entries.splice(index, 1);

			// Add to removed list
			if(!this.removedUsers[queue.id]) {
				this.removedUsers[queue.id] = [];
			}
			this.removedUsers[queue.id].push(entry);

			this.$store.queue.saveData();
			this.$store.queue.broadcastStates(queue.id);
		}
	}

	public removeFromRemovedList(queueId:string, index:number):void {
		if(!this.removedUsers[queueId] || index < 0 || index >= this.removedUsers[queueId].length) return;
		this.removedUsers[queueId].splice(index, 1);
		if(this.removedUsers[queueId].length === 0) {
			delete this.removedUsers[queueId];
		}
	}

	public clearQueue(queueId:string):void {
		this.$store.queue.clearQueue(queueId);
	}

	public clearInProgress(queueId:string):void {
		this.$store.queue.clearInProgress(queueId);
	}

	public clearRemovedList(queueId:string):void {
		if(!this.removedUsers[queueId]) return;
		delete this.removedUsers[queueId];
	}
	
	private onQueueUserRemoved(e: GlobalEvent):void {
		const data = e.data as { queueId: string, entry: TwitchatDataTypes.QueueEntry };
		
		// Only add to removed users if this QueueState is displaying the relevant queue
		if(!this.queueIds || this.queueIds.includes(data.queueId)) {
			if(!this.removedUsers[data.queueId]) {
				this.removedUsers[data.queueId] = [];
			}
			this.removedUsers[data.queueId].push(data.entry);
		}
	}
	
	private onQueueClearRemoved(e: GlobalEvent):void {
		const data = e.data as { queueId: string };
		
		// Only clear if this QueueState is displaying the relevant queue
		if(!this.queueIds || this.queueIds.includes(data.queueId)) {
			this.clearRemovedList(data.queueId);
		}
	}

	public toggleClearConfirm(key:string):void {
		// Clear any existing timeout
		if(this.clearTimeouts[key]) {
			clearTimeout(this.clearTimeouts[key]);
		}
		
		// Toggle confirmation state
		this.confirmingClear[key] = true;
		
		// Set timeout to reset after 3 seconds
		this.clearTimeouts[key] = window.setTimeout(() => {
			this.confirmingClear[key] = false;
			delete this.clearTimeouts[key];
		}, 3000);
	}

	public cancelClear(key:string):void {
		if(this.clearTimeouts[key]) {
			clearTimeout(this.clearTimeouts[key]);
			delete this.clearTimeouts[key];
		}
		this.confirmingClear[key] = false;
	}

	public confirmClear(key:string, type:'queue'|'progress'|'removed', queueId:string):void {
		if(this.clearTimeouts[key]) {
			clearTimeout(this.clearTimeouts[key]);
			delete this.clearTimeouts[key];
		}
		this.confirmingClear[key] = false;

		switch(type) {
			case 'queue': this.clearQueue(queueId); break;
			case 'progress': this.clearInProgress(queueId); break;
			case 'removed': this.clearRemovedList(queueId); break;
		}
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.openUserCard(user);
	}

}
export default toNative(QueueState);
</script>

<style scoped lang="less">
.queuestate{
	background-color: var(--background-color-secondary);
	display: flex;
	flex-direction: column;
	min-height: 100px;
	z-index: 1;
	position: relative;
	margin-bottom: .5em;
	overflow: visible;
	width: 100%;
	box-sizing: border-box;

	.header {
		background-color: var(--color-primary);
		padding: .5em 0;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		position: relative;
		
		.title {
			display: flex;
			flex-direction: row;
			justify-content: center;
			color: var(--color-light);
			flex-grow: 1;
			h1 {
				text-align: center;
				margin: 0 10px;
				font-size: 1em;

				.count {
					font-size: .65em;
					font-weight: normal;
				}
			}
		}
		
		.toggleBt {
			position: absolute;
			right: .5em;
			top: 50%;
			transform: translateY(-50%);
			background: none;
			border: none;
			color: var(--color-light);
			cursor: pointer;
			padding: .25em;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: .25em;
			transition: background-color .2s;
			
			&:hover {
				background-color: rgba(255, 255, 255, 0.2);
			}
			
			.icon {
				width: 1.2em;
				height: 1.2em;
			}
		}
	}

	.messageList {
		flex-grow: 1;
		background-color: var(--background-color-primary);
		border: 2px solid var(--color-primary);
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: 0 2px 2px 0 rgba(0,0,0,0.5);
		padding: .5em;
		overflow: visible;
		
		.queue-item {
			padding: 0;
			
			&:not(:last-child) {
				margin-bottom: 1em;
			}
			
			&.disabled {
				opacity: 0.6;
				
				.queue-header {
					background-color: var(--color-dark-fadest);
				}
				
				.header-buttons .headerBt {
					cursor: not-allowed;
					opacity: 0.5;
					pointer-events: none;
				}
				
				.actionBt {
					cursor: not-allowed;
					opacity: 0.5;
					pointer-events: none;
				}
			}
			
			.queue-header {
				display: flex;
				align-items: center;
				gap: .5em;
				margin-bottom: .75em;
				padding: .5em;
				background-color: var(--color-primary-fader);
				border-radius: var(--border-radius);
				color: var(--color-text);
				font-weight: bold;
				
				.icon {
					width: 1em;
					height: 1em;
					filter: brightness(0) invert(1);
					opacity: 0.8;
				}
				
				.title-wrapper {
					display: flex;
					align-items: center;
					flex-grow: 1;
				}
				
				.title {
					font-size: 1.1em;
				}
				
				.disabled-badge {
					background-color: var(--color-alert);
					color: var(--color-light);
					padding: .2em .5em;
					border-radius: var(--border-radius);
					font-size: .75em;
					font-weight: normal;
					margin-left: .5em;
				}
				
				.status {
					font-size: .8em;
					font-style: italic;
					opacity: .7;
					font-weight: normal;
				}
				
				.copyIdBt {
					background: none;
					border: none;
					cursor: pointer;
					padding: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: .25em;
					transition: background-color .2s, color .2s;
					width: 1.4em;
					height: 1.4em;
					box-sizing: border-box;
					color: var(--color-text-fade);
					margin-left: .5em;
					
					&:hover {
						background-color: rgba(255, 255, 255, 0.1);
						color: var(--color-text);
					}
					
					.icon {
						width: .8em;
						height: .8em;
						filter: brightness(0) invert(1);
						opacity: 0.7;
						display: flex;
						align-items: center;
						justify-content: center;
						transition: opacity .2s;
						
						:deep(svg) {
							width: 100%;
							height: 100%;
						}
					}
					
					&:hover .icon {
						opacity: 0.9;
					}
				}
				
				.header-buttons {
					display: flex;
					gap: .25em;
					
					.headerBt {
						background: none;
						border: none;
						color: var(--color-light);
						cursor: pointer;
						padding: 0;
						display: flex;
						align-items: center;
						justify-content: center;
						border-radius: .25em;
						transition: background-color .2s;
						width: 1.8em;
						height: 1.8em;
						box-sizing: border-box;
						
						&:hover {
							background-color: rgba(255, 255, 255, 0.2);
						}
						
						.icon {
							width: 1.2em;
							height: 1.2em;
							filter: brightness(0) invert(1);
							display: flex;
							align-items: center;
							justify-content: center;
							:deep(svg) {
								width: 100%;
								height: 100%;
							}
						}
					}
				}
			}
			
			.picked-user {
				display: flex;
				align-items: center;
				gap: .5em;
				padding: .5em;
				background-color: var(--color-secondary-fader);
				border-radius: var(--border-radius);
				margin-bottom: .5em;
				
				.icon {
					width: 1em;
					height: 1em;
					filter: brightness(0) invert(1);
					opacity: 0.8;
				}
				
				.label {
					font-size: .9em;
					opacity: .8;
				}
				
				.platform-icon {
					width: 1em;
					height: 1em;
				}
				
				.avatar {
					width: 1.5em;
					height: 1.5em;
					border-radius: 50%;
				}
				
				.username {
					font-weight: bold;
				}
			}
			
			.columns-container {
				display: flex;
				gap: 1em;
				align-items: flex-start;
				
				.column {
					flex: 1;
					min-width: 0;
					
					&.entries {
						border-right: 1px solid var(--color-dark-fadest);
						padding-right: 1em;
					}
					
					&.in-progress {
						padding-left: 1em;
					}
					
					&.removed {
						padding-left: 1em;
					}
				}
			}
			
			.section-title {
				display: flex;
				justify-content: space-between;
				align-items: center;
				font-size: .9em;
				font-weight: bold;
				margin-bottom: .5em;
				opacity: .8;
				color: var(--color-text);
				
				.count {
					font-size: .8em;
					font-weight: normal;
					opacity: .7;
				}
				
				.clearActions {
					display: flex;
					gap: .25em;
					
					.clearBt, .confirmBt, .cancelBt {
						background: none;
						border: none;
						cursor: pointer;
						padding: 0;
						border-radius: .25em;
						transition: background-color .2s;
						display: flex;
						align-items: center;
						justify-content: center;
						width: 1.4em;
						height: 1.4em;
						box-sizing: border-box;
						
						.icon {
							width: .8em;
							height: .8em;
							filter: brightness(0) invert(1);
							display: flex;
							align-items: center;
							justify-content: center;
							:deep(svg) {
								width: 100%;
								height: 100%;
							}
						}
					}
					
					.clearBt {
						background-color: var(--color-alert-fader);
						
						&:hover {
							background-color: var(--color-alert-fade);
						}
					}
					
					.confirmBt {
						background-color: var(--color-secondary-fader);
						
						&:hover {
							background-color: var(--color-secondary-fade);
						}
					}
					
					.cancelBt {
						background-color: var(--color-alert-fader);
						
						&:hover {
							background-color: var(--color-alert-fade);
						}
					}
				}
			}
			
			.user-list {
				display: flex;
				flex-direction: column;
				gap: 2px;
				overflow: visible;
			}
			
			.messageListItem {
				cursor: default;
				overflow: visible;
				font-family: var(--font-inter);
				transition: background-color .25s;
				margin: 0;
				padding: .3em .5em;
				display: flex;
				align-items: center;
				gap: .4em;
				position: relative;
				
				&:last-child {
					margin-bottom: .5em;
				}

				&:nth-child(odd) {
					background-color: fade(#ffffff, 5%);
				}
				
				&.in-progress {
					background-color: var(--color-secondary-fadest);
					&:nth-child(odd) {
						background-color: var(--color-secondary-fadest);
					}
				}

				&:hover {
					.actions {
						opacity: 1;
					}
				}
				
				.actions:hover {
					opacity: 1;
				}
				
				.position {
					font-size: .8em;
					opacity: .6;
					min-width: 1.5em;
					color: var(--color-text);
				}
				
				.platform-icon {
					width: 1em;
					height: 1em;
					flex-shrink: 0;
					filter: brightness(0) invert(1);
					opacity: 0.8;
				}
				
				.avatar {
					width: 1.5em;
					height: 1.5em;
					border-radius: 50%;
					flex-shrink: 0;
					cursor: pointer;
					transition: transform .1s;
					&:hover {
						transform: scale(1.1);
					}
				}

				.username {
					font-size: .95em;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					color: var(--color-text);
					flex-grow: 1;
					cursor: pointer;
					text-decoration: none;
					&:hover {
						text-decoration: underline;
					}
				}

				.actions {
					display: flex;
					gap: .25em;
					opacity: 0;
					transition: opacity .2s ease;
					position: relative;
					z-index: 10;
					
					.actionBt {
						padding: 0;
						border-radius: .25em;
						background-color: var(--color-primary-fader);
						border: none;
						cursor: pointer;
						transition: background-color .25s;
						display: flex;
						align-items: center;
						justify-content: center;
						width: 1.4em;
						height: 1.4em;
						box-sizing: border-box;
						
						&:hover {
							background-color: var(--color-primary-fade);
						}
						
						&.delete {
							background-color: var(--color-alert-fader);
							
							&:hover {
								background-color: var(--color-alert-fade);
							}
						}
						
						.icon {
							width: .8em;
							height: .8em;
							filter: brightness(0) invert(1);
							display: flex;
							align-items: center;
							justify-content: center;
							
							&.up {
								transform: rotate(180deg);
							}
							
							:deep(svg) {
								width: 100%;
								height: 100%;
							}
						}
					}
				}
			}
			
			.empty {
				text-align: center;
				font-style: italic;
				opacity: .6;
				font-size: .9em;
				padding: .5em;
				color: var(--color-text);
			}
		}
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>