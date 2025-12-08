import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IQueueActions, type IQueueGetters, type IQueueState } from '../StoreProxy';

const getDefaultOverlayParams = ():NonNullable<TwitchatDataTypes.QueueData["overlayParams"]> => ({
        showInProgress:true,
        rotateDelay:0,
        position:"bl",
        titleFont:"Roboto",
        titleSize:30,
        titleColor:"#ffffff",
        titleBgColor:"#000000",
        titleBgOpacity:80,
        subTitleFont:"Roboto",
        subTitleSize:30,
        subTitleColor:"#ffffff",
        subTitleBgColor:"#000000",
        subTitleBgOpacity:80,
        queueLabelFont:"Roboto",
        queueLabelSize:30,
        queueLabelColor:"#ffffff",
        queueBgColor:"#000000",
        queueBgOpacity:80,
        queueEntryFont:"Roboto",
        queueEntrySize:30,
        queueEntryColor:"#ffffff",
        queueEntryBgColor:"#000000",
        queueEntryBgOpacity:0,
        progressEntryFont:"Roboto",
        progressEntrySize:30,
        progressEntryColor:"#ffffff",
        progressBgColor:"#000000",
        progressBgOpacity:80,
        stateFont:"Roboto",
        stateSize:30,
        stateColor:"#ffffff",
        stateBgColor:"#000000",
        stateBgOpacity:80,
        statePausedFont:"Roboto",
        statePausedSize:30,
        statePausedColor:"#ffffff",
        statePausedBgColor:"#000000",
        statePausedBgOpacity:80,
        stateRunningFont:"Roboto",
        stateRunningSize:30,
        stateRunningColor:"#ffffff",
        stateRunningBgColor:"#000000",
        stateRunningBgOpacity:80,
        title:StoreProxy.i18n.t('queue.default_title') as string,
        subTitle:"",
        queueLabel:StoreProxy.i18n.t('queue.default_title') as string,
        progressLabel:StoreProxy.i18n.t('overlay.queue.param_progressLabel') as string,
        showEmptyQueueMessage:true,
        emptyQueueMessage:StoreProxy.i18n.t('overlay.queue.empty') as string,
        emptyQueueFont:"Roboto",
        emptyQueueSize:30,
        emptyQueueColor:"#ffffff",
        emptyQueueBgColor:"#000000",
        emptyQueueBgOpacity:0,
        statePaused:StoreProxy.i18n.t('overlay.queue.state_paused') as string,
        stateRunning:StoreProxy.i18n.t('overlay.queue.state_running') as string,
        showPausedState:true,
        showRunningState:true,
        sectionsOrder:['title', 'subtitle', 'state', 'queue', 'progress'],
});

export const storeQueue = defineStore('queue', {
        state: () => ({
                queueList: [] as TwitchatDataTypes.QueueData[],
        } as IQueueState),

        getters: {
        },

        actions: {
                populateData() {
                        const json = DataStore.get(DataStore.QUEUE_CONFIGS);
                        console.log("[Queue Debug] Raw localStorage data:", json);
                        if(json) {
                                const data = JSON.parse(json) as IStoreData;
                                console.log("[Queue Debug] Parsed queue data:", data);
                                this.queueList = data.queueList || [];
                                console.log("[Queue Debug] Queue list after assignment:", this.queueList);
                                //If queueList is empty, don't create a default queue
                                //User explicitly deleted all queues, respect their choice
                                if(this.queueList.length === 0) {
                                        console.log("[Queue Debug] No queues found, keeping empty list");
                                }
                                //fallback defaults for new properties
                                for (let i = 0; i < this.queueList.length; i++) {
                                        const q = this.queueList[i];
                                        const queueNumber = i + 1;
                                        if(q.inProgressEnabled === undefined) q.inProgressEnabled = true;
                                        if(!q.commands) {
                                                q.commands = {
                                                        join: `!join${queueNumber}`,
                                                        leave: `!leave${queueNumber}`,
                                                        position: `!position${queueNumber}`,
                                                };
                                        } else {
                                                // Migration: add position command if missing
                                                if(!q.commands.position) {
                                                        q.commands.position = `!position${queueNumber}`;
                                                }
                                        }
                                        if(!q.messages) {
                                                q.messages = {
                                                        joinSuccess:"{USER} a rejoint la file à la position {POSITION}",
                                                        joinAlreadyIn:"{USER}, tu es déjà dans la file à la position {POSITION}",
                                                        joinFull:"La file est pleine !",
                                                        joinPaused:"La file est actuellement en pause",
                                                        joinDisabled:"La file est désactivée",
                                                        leaveSuccess:"{USER} a quitté la file",
                                                        leaveNotIn:"{USER}, tu n'es pas dans la file",
                                                        position:"{USER}, tu es à la position {POSITION}/{TOTAL}",
                                                        positionNotIn:"{USER}, tu n'es pas dans la file",
                                                        positionPaused:"La file est en pause. {USER}, tu es à la position {POSITION}/{TOTAL}",
                                                };
                                        }
                                        if(!q.overlayParams) q.overlayParams = getDefaultOverlayParams();
                                        else {
                                                const def = getDefaultOverlayParams();
                                                q.overlayParams.showInProgress ??= def.showInProgress;
                                                q.overlayParams.rotateDelay ??= def.rotateDelay;
                                                q.overlayParams.position ??= def.position;
                                                q.overlayParams.titleFont ??= def.titleFont;
                                                q.overlayParams.titleSize ??= def.titleSize;
                                                q.overlayParams.titleColor ??= def.titleColor;
                                                q.overlayParams.titleBgColor ??= def.titleBgColor;
                                                q.overlayParams.titleBgOpacity ??= def.titleBgOpacity;
                                                q.overlayParams.subTitleFont ??= def.subTitleFont;
                                                q.overlayParams.subTitleSize ??= def.subTitleSize;
                                                q.overlayParams.subTitleColor ??= def.subTitleColor;
                                                q.overlayParams.subTitleBgColor ??= def.subTitleBgColor;
                                                q.overlayParams.subTitleBgOpacity ??= def.subTitleBgOpacity;
                                                q.overlayParams.queueLabelFont ??= def.queueLabelFont;
                                                q.overlayParams.queueLabelSize ??= def.queueLabelSize;
                                                q.overlayParams.queueLabelColor ??= def.queueLabelColor;
                                                q.overlayParams.queueBgColor ??= def.queueBgColor;
                                                q.overlayParams.queueBgOpacity ??= def.queueBgOpacity;
                                                q.overlayParams.queueEntryFont ??= def.queueEntryFont;
                                                q.overlayParams.queueEntrySize ??= def.queueEntrySize;
                                                q.overlayParams.queueEntryColor ??= def.queueEntryColor;
                                                q.overlayParams.queueEntryBgColor ??= def.queueEntryBgColor;
                                                q.overlayParams.queueEntryBgOpacity ??= def.queueEntryBgOpacity;
                                                q.overlayParams.progressEntryFont ??= def.progressEntryFont;
                                                q.overlayParams.progressEntrySize ??= def.progressEntrySize;
                                                q.overlayParams.progressEntryColor ??= def.progressEntryColor;
                                                q.overlayParams.progressBgColor ??= def.progressBgColor;
                                                q.overlayParams.progressBgOpacity ??= def.progressBgOpacity;
                                                q.overlayParams.stateFont ??= def.stateFont;
                                                q.overlayParams.stateSize ??= def.stateSize;
                                                q.overlayParams.stateColor ??= def.stateColor;
                                                q.overlayParams.stateBgColor ??= def.stateBgColor;
                                                q.overlayParams.stateBgOpacity ??= def.stateBgOpacity;
                                                q.overlayParams.title ??= def.title;
                                                q.overlayParams.subTitle ??= def.subTitle;
                                                q.overlayParams.queueLabel ??= def.queueLabel;
                                                q.overlayParams.progressLabel ??= def.progressLabel;
                                                q.overlayParams.showEmptyQueueMessage ??= def.showEmptyQueueMessage;
                                                q.overlayParams.emptyQueueMessage ??= def.emptyQueueMessage;
                                                q.overlayParams.emptyQueueFont ??= def.emptyQueueFont;
                                                q.overlayParams.emptyQueueSize ??= def.emptyQueueSize;
                                                q.overlayParams.emptyQueueColor ??= def.emptyQueueColor;
                                                q.overlayParams.emptyQueueBgColor ??= def.emptyQueueBgColor;
                                                q.overlayParams.emptyQueueBgOpacity ??= def.emptyQueueBgOpacity;
                                                q.overlayParams.statePaused ??= def.statePaused;
                                                q.overlayParams.stateRunning ??= def.stateRunning;
                                                q.overlayParams.showPausedState ??= def.showPausedState;
                                                q.overlayParams.showRunningState ??= def.showRunningState;
                                                q.overlayParams.statePausedFont ??= def.statePausedFont;
                                                q.overlayParams.statePausedSize ??= def.statePausedSize;
                                                q.overlayParams.statePausedColor ??= def.statePausedColor;
                                                q.overlayParams.statePausedBgColor ??= def.statePausedBgColor;
                                                q.overlayParams.statePausedBgOpacity ??= def.statePausedBgOpacity;
                                                q.overlayParams.stateRunningFont ??= def.stateRunningFont;
                                                q.overlayParams.stateRunningSize ??= def.stateRunningSize;
                                                q.overlayParams.stateRunningColor ??= def.stateRunningColor;
                                                q.overlayParams.stateRunningBgColor ??= def.stateRunningBgColor;
                                                q.overlayParams.stateRunningBgOpacity ??= def.stateRunningBgOpacity;
                                                q.overlayParams.sectionsOrder ??= def.sectionsOrder;
                                        }
                                }
                        }else{
                                //Don't create a default queue on first start
                                //Let users create queues when they need them
                                console.log("[Queue Debug] No localStorage data, starting with empty queue list");
                        }
                        PublicAPI.instance.addEventListener(TwitchatEvent.GET_QUEUE_STATE, (event:TwitchatEvent<{ id?:string }>)=> {
                                if(event.data?.id) {
                                        this.broadcastStates(event.data.id);
                                }else{
                                        for (let i = 0; i < this.queueList.length; i++) {
                                                const entry = this.queueList[i];
                                                this.broadcastStates(entry.id);
                                        }
                                }
                        });
                },

                broadcastClearRemoved(queueId:string) {
                        EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.QUEUE_CLEAR_REMOVED, { queueId }));
                },
                
                broadcastStates(id?:string) {
                        for (let i = 0; i < this.queueList.length; i++) {
                                const entry = this.queueList[i];
                                if(id && entry.id !== id) continue;
                                PublicAPI.instance.broadcast(TwitchatEvent.QUEUE_STATE, entry as unknown as JsonObject);
                        }
                },

                createQueue() {
                        if(!StoreProxy.auth.isPremium && this.queueList.length >= Config.instance.MAX_QUEUES) return;
                        const queueNumber = this.queueList.length + 1;
                        const data:TwitchatDataTypes.QueueData = {
                                id:Utils.getUUID(),
                                enabled:true,
                                title:StoreProxy.i18n.t('queue.default_title') as string,
                                placeholderKey:'QUEUE_'+queueNumber,
                                maxPerUser:1,
                                maxEntries:0,
                                inProgressEnabled:true,
                                paused:false,
                                entries:[],
                                inProgress:[],
                                commands:{
                                        join:`!join${queueNumber}`,
                                        leave:`!leave${queueNumber}`,
                                        position:`!position${queueNumber}`,
                                },
                                messages:{
                                        joinSuccess:"{USER} a rejoint la file à la position {POSITION}",
                                        joinAlreadyIn:"{USER}, tu es déjà dans la file à la position {POSITION}",
                                        joinFull:"La file est pleine !",
                                        joinPaused:"La file est actuellement en pause",
                                        joinDisabled:"La file est désactivée",
                                        leaveSuccess:"{USER} a quitté la file",
                                        leaveNotIn:"{USER}, tu n'es pas dans la file",
                                        position:"{USER}, tu es à la position {POSITION}/{TOTAL}",
                                        positionNotIn:"{USER}, tu n'es pas dans la file",
                                        positionPaused:"La file est en pause. {USER}, tu es à la position {POSITION}/{TOTAL}",
                                },
                                overlayParams:getDefaultOverlayParams(),
                        };
                        this.queueList.push(data);
                        this.saveData();
                },

                deleteQueue(id:string) {
                        const idx = this.queueList.findIndex((q:TwitchatDataTypes.QueueData) => q.id === id);
                        if(idx >= 0) this.queueList.splice(idx,1);
                        this.saveData();
                },

                addViewer(id:string, user:TwitchatDataTypes.TwitchatUser) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        // Count entries in both queue and in-progress lists
                        const countInQueue = q.entries.filter((e:TwitchatDataTypes.QueueEntry)=>e.user.id==user.id).length;
                        const countInProgress = (q.inProgress || []).filter((e:TwitchatDataTypes.QueueEntry)=>e.user.id==user.id).length;
                        const totalCount = countInQueue + countInProgress;
                        if(totalCount >= q.maxPerUser) return;
                        if(q.maxEntries > 0 && q.entries.length >= q.maxEntries) return;
                        q.entries.push({user, joined_at:Date.now()});
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit queue join event
                        const position = q.entries.length;
                        const joinMessage: TwitchatDataTypes.MessageQueueJoinData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_JOIN,
                                date: Date.now(),
                                platform: user.platform || "twitchat",
                                channel_id: StoreProxy.auth.twitch.user.id,
                                user: user,
                                queueId: q.id,
                                queueTitle: q.title,
                                position: position
                        };
                        StoreProxy.chat.addMessage(joinMessage);
                },

                removeViewer(id:string, userId:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;

                        // Find entries before removing
                        const removedFromQueue = q.entries.find((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);
                        const removedFromProgress = q.inProgress?.find((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);

                        q.entries = q.entries.filter((e:TwitchatDataTypes.QueueEntry)=>e.user.id!=userId);
                        q.inProgress = q.inProgress?.filter((e:TwitchatDataTypes.QueueEntry)=>e.user.id!=userId);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit user removed event for queue entry
                        if(removedFromQueue) {
                                const removedMessage: TwitchatDataTypes.MessageQueueUserRemovedData = {
                                        id: Utils.getUUID(),
                                        type: TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_REMOVED,
                                        date: Date.now(),
                                        platform: "twitchat",
                                        channel_id: StoreProxy.auth.twitch.user.id,
                                        queueId: q.id,
                                        queueTitle: q.title,
                                        user: removedFromQueue.user
                                };
                                StoreProxy.chat.addMessage(removedMessage);
                        }

                        // Emit user removed event for in-progress entry
                        if(removedFromProgress) {
                                const removedMessage: TwitchatDataTypes.MessageQueueInProgressUserRemovedData = {
                                        id: Utils.getUUID(),
                                        type: TwitchatDataTypes.TwitchatMessageType.QUEUE_IN_PROGRESS_USER_REMOVED,
                                        date: Date.now(),
                                        platform: "twitchat",
                                        channel_id: StoreProxy.auth.twitch.user.id,
                                        queueId: q.id,
                                        queueTitle: q.title,
                                        user: removedFromProgress.user
                                };
                                StoreProxy.chat.addMessage(removedMessage);
                        }
                },

                removeViewerFromQueue(id:string, userId:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        const removedEntry = q.entries.find((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);
                        q.entries = q.entries.filter((e:TwitchatDataTypes.QueueEntry)=>e.user.id!=userId);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit user removed event
                        if(removedEntry) {
                                const removedMessage: TwitchatDataTypes.MessageQueueUserRemovedData = {
                                        id: Utils.getUUID(),
                                        type: TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_REMOVED,
                                        date: Date.now(),
                                        platform: "twitchat",
                                        channel_id: StoreProxy.auth.twitch.user.id,
                                        queueId: q.id,
                                        queueTitle: q.title,
                                        user: removedEntry.user
                                };
                                StoreProxy.chat.addMessage(removedMessage);
                        }
                },

                removeViewerFromInProgress(id:string, userId:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        const removedEntry = q.inProgress?.find((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);
                        q.inProgress = q.inProgress?.filter((e:TwitchatDataTypes.QueueEntry)=>e.user.id!=userId);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit in-progress user removed event (different from queue removed)
                        if(removedEntry) {
                                const removedMessage: TwitchatDataTypes.MessageQueueInProgressUserRemovedData = {
                                        id: Utils.getUUID(),
                                        type: TwitchatDataTypes.TwitchatMessageType.QUEUE_IN_PROGRESS_USER_REMOVED,
                                        date: Date.now(),
                                        platform: "twitchat",
                                        channel_id: StoreProxy.auth.twitch.user.id,
                                        queueId: q.id,
                                        queueTitle: q.title,
                                        user: removedEntry.user
                                };
                                StoreProxy.chat.addMessage(removedMessage);
                        }
                },

                moveToInProgress(id:string, userId:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        if(!q.inProgressEnabled) return;
                        const idx = q.entries.findIndex((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);
                        if(idx>-1) {
                                const entry = q.entries.splice(idx,1)[0];
                                q.inProgress = q.inProgress || [];
                                q.inProgress.push(entry);
                                this.saveData();
                                this.broadcastStates(id);

                                // Emit move to progress event
                                const moveMessage: TwitchatDataTypes.MessageQueueMoveToProgressData = {
                                        id: Utils.getUUID(),
                                        type: TwitchatDataTypes.TwitchatMessageType.QUEUE_MOVE_TO_PROGRESS,
                                        date: Date.now(),
                                        platform: "twitchat",
                                        channel_id: StoreProxy.auth.twitch.user.id,
                                        queueId: q.id,
                                        queueTitle: q.title,
                                        user: entry.user
                                };
                                StoreProxy.chat.addMessage(moveMessage);
                        }
                },

                pauseQueue(id:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        q.paused = true;
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit pause event
                        const channelId = StoreProxy.auth.twitch.user?.id;
                        console.log("[Queue Debug] pauseQueue - channelId:", channelId, "queueId:", q.id);
                        if(!channelId) {
                                console.warn("[Queue Debug] Cannot emit pause event - no channel ID");
                                return;
                        }
                        const pauseMessage: TwitchatDataTypes.MessageQueuePauseData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_PAUSE,
                                date: Date.now(),
                                platform: "twitchat",
                                channel_id: channelId,
                                queueId: q.id,
                                queueTitle: q.title
                        };
                        console.log("[Queue Debug] Adding pause message:", pauseMessage);
                        StoreProxy.chat.addMessage(pauseMessage);
                },

                resumeQueue(id:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        q.paused = false;
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit resume event
                        const resumeMessage: TwitchatDataTypes.MessageQueueResumeData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_RESUME,
                                date: Date.now(),
                                platform: "twitchat",
                                channel_id: StoreProxy.auth.twitch.user.id,
                                queueId: q.id,
                                queueTitle: q.title
                        };
                        StoreProxy.chat.addMessage(resumeMessage);
                },

                saveData() {
                        console.log("[Queue Debug] Saving queue data, current queueList:", this.queueList);
                        for(const q of this.queueList){
                                if(!q.inProgressEnabled){
                                        q.inProgress = [];
                                        if(q.overlayParams) q.overlayParams.showInProgress = false;
                                }
                                if(!q.overlayParams) q.overlayParams = getDefaultOverlayParams();
                        }
                        const data:IStoreData = { queueList:this.queueList };
                        console.log("[Queue Debug] Data to save:", data);
                        DataStore.set(DataStore.QUEUE_CONFIGS, data as unknown as JsonObject);
                        console.log("[Queue Debug] Data saved to localStorage");
                },

                async handleQueueCommand(message: TwitchatDataTypes.MessageChatData): Promise<boolean> {
                        const messageText = message.message.trim().toLowerCase();
                        
                        // Check all queues for matching commands
                        for(const queue of this.queueList) {
                                if(!queue.commands) continue;
                                
                                // Check join command
                                if(queue.commands.join && messageText === queue.commands.join.toLowerCase()) {
                                        await this.executeQueueJoin(queue, message);
                                        return true;
                                }
                                
                                // Check leave command
                                if(queue.commands.leave && messageText === queue.commands.leave.toLowerCase()) {
                                        await this.executeQueueLeave(queue, message);
                                        return true;
                                }
                                
                                // Check position command
                                if(queue.commands.position && messageText === queue.commands.position.toLowerCase()) {
                                        await this.executeQueuePosition(queue, message);
                                        return true;
                                }
                        }
                        
                        return false;
                },

                async executeQueueJoin(queue: TwitchatDataTypes.QueueData, message: TwitchatDataTypes.MessageChatData): Promise<void> {
                        const user = message.user;
                        const channelId = message.channel_id;
                        
                        // Check if queue is disabled
                        if(!queue.enabled) {
                                await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.joinDisabled || "La file est désactivée", {
                                        USER: user.displayName,
                                        QUEUE_NAME: queue.title
                                }));
                                return;
                        }
                        
                        // Check if queue is paused
                        if(queue.paused) {
                                await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.joinPaused || "La file est actuellement en pause", {
                                        USER: user.displayName,
                                        QUEUE_NAME: queue.title
                                }));
                                return;
                        }
                        
                        // Check queue limits
                        const userEntries = queue.entries.filter(e => e.user.id === user.id);
                        const userInProgress = queue.inProgress?.filter(e => e.user.id === user.id) || [];
                        const userEntryCount = userEntries.length + userInProgress.length;
                        
                        if(userEntryCount >= queue.maxPerUser) {
                                // Calculate positions for the user
                                const positions: number[] = [];
                                userEntries.forEach((entry, index) => {
                                        const position = queue.entries.indexOf(entry) + 1;
                                        positions.push(position);
                                });
                                if(userInProgress.length > 0) {
                                        positions.push(0); // 0 indicates in progress
                                }
                                
                                const positionsStr = positions.map(p => p === 0 ? "en cours" : p.toString()).join(", ");
                                
                                await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.joinMaxPerUser || "{USER}, tu as atteint la limite de {MAX_PER_USER} entrée(s). Tu es déjà à la/aux position(s) : {POSITIONS}", {
                                        USER: user.displayName,
                                        MAX_PER_USER: queue.maxPerUser.toString(),
                                        POSITIONS: positionsStr,
                                        QUEUE_NAME: queue.title
                                }));
                                return;
                        }
                        
                        if(queue.maxEntries > 0 && queue.entries.length >= queue.maxEntries) {
                                await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.joinFull || "La file est pleine !", {
                                        USER: user.displayName,
                                        QUEUE_NAME: queue.title
                                }));
                                return;
                        }
                        
                        // Add user to queue
                        this.addViewer(queue.id, user);
                        
                        // Send success message
                        const position = queue.entries.length;
                        await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.joinSuccess || "{USER} a rejoint la file à la position {POSITION}", {
                                USER: user.displayName,
                                POSITION: position.toString(),
                                TOTAL: queue.entries.length.toString(),
                                QUEUE_NAME: queue.title
                        }));
                        
                        // Send queue join message event
                        const joinMessage: TwitchatDataTypes.MessageQueueJoinData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_JOIN,
                                date: Date.now(),
                                platform: message.platform,
                                channel_id: channelId,
                                user: user,
                                queueId: queue.id,
                                queueTitle: queue.title,
                                position: position
                        };
                        StoreProxy.chat.addMessage(joinMessage);
                },

                async executeQueueLeave(queue: TwitchatDataTypes.QueueData, message: TwitchatDataTypes.MessageChatData): Promise<void> {
                        const user = message.user;
                        const channelId = message.channel_id;
                        
                        // Find all entries for this user (only in the queue, not in progress)
                        const userEntries = queue.entries.filter(e => e.user.id === user.id);
                        
                        if(userEntries.length === 0) {
                                await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.leaveNotIn || "{USER}, tu n'es pas dans la file", {
                                        USER: user.displayName,
                                        QUEUE_NAME: queue.title
                                }));
                                return;
                        }
                        
                        // Remove only the last entry from queue
                        // Find the last entry index
                        let lastEntryIndex = -1;
                        for(let i = queue.entries.length - 1; i >= 0; i--) {
                                if(queue.entries[i].user.id === user.id) {
                                        lastEntryIndex = i;
                                        break;
                                }
                        }
                        
                        if(lastEntryIndex !== -1) {
                                // Remove only the last entry
                                queue.entries.splice(lastEntryIndex, 1);
                                this.saveData();
                                this.broadcastStates(queue.id);
                        }
                        
                        // Send success message
                        await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.leaveSuccess || "{USER} a quitté la file", {
                                USER: user.displayName,
                                QUEUE_NAME: queue.title
                        }));
                        
                        // Send queue leave message event
                        const leaveMessage: TwitchatDataTypes.MessageQueueLeaveData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_LEAVE,
                                date: Date.now(),
                                platform: message.platform,
                                channel_id: channelId,
                                user: user,
                                queueId: queue.id,
                                queueTitle: queue.title
                        };
                        StoreProxy.chat.addMessage(leaveMessage);
                },

                async executeQueuePosition(queue: TwitchatDataTypes.QueueData, message: TwitchatDataTypes.MessageChatData): Promise<void> {
                        const user = message.user;
                        
                        // Find all entries for this user
                        const userEntries = queue.entries.filter(e => e.user.id === user.id);
                        const userInProgress = queue.inProgress?.filter(e => e.user.id === user.id) || [];
                        
                        if(userEntries.length === 0 && userInProgress.length === 0) {
                                await this.sendQueueResponse(message, this.replacePlaceholders(queue.messages?.positionNotIn || "{USER}, tu n'es pas dans la file", {
                                        USER: user.displayName,
                                        QUEUE_NAME: queue.title
                                }));
                                return;
                        }
                        
                        const total = queue.entries.length;
                        let messageText = "";
                        
                        // Handle multiple entries in queue
                        if(userEntries.length > 0) {
                                const positions = userEntries.map(entry => queue.entries.indexOf(entry) + 1);
                                const positionsText = positions.join(", ");
                                
                                const messageTemplate = queue.paused 
                                        ? (queue.messages?.positionPaused || "La file est en pause. {USER}, tu es à la position {POSITION}/{TOTAL}")
                                        : (queue.messages?.position || "{USER}, tu es à la position {POSITION}/{TOTAL}");
                                
                                messageText = this.replacePlaceholders(messageTemplate, {
                                        USER: user.displayName,
                                        POSITION: positionsText,
                                        TOTAL: total.toString(),
                                        QUEUE_NAME: queue.title,
                                        QUEUE_STATUS: queue.paused ? "en pause" : "active"
                                });
                        }
                        
                        // Add in-progress status if applicable
                        if(userInProgress.length > 0) {
                                if(messageText) messageText += " - ";
                                messageText += this.replacePlaceholders("{USER}, tu es en cours de traitement", {
                                        USER: user.displayName
                                });
                        }
                        
                        await this.sendQueueResponse(message, messageText);
                },

                replacePlaceholders(template: string, values: {[key:string]:string}): string {
                        let result = template;
                        for(const [key, value] of Object.entries(values)) {
                                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
                        }
                        return result;
                },

                async sendQueueResponse(originalMessage: TwitchatDataTypes.MessageChatData, responseText: string): Promise<void> {
                        // Import MessengerProxy dynamically to avoid circular dependencies
                        const MessengerProxy = (await import('@/messaging/MessengerProxy')).default;
                        
                        // Send message based on platform
                        if(originalMessage.platform === "twitch") {
                                await MessengerProxy.instance.sendMessage(responseText, ["twitch"], originalMessage.channel_id);
                        } else if(originalMessage.platform === "youtube") {
                                await MessengerProxy.instance.sendMessage(responseText, ["youtube"], originalMessage.channel_id);
                        } else if(originalMessage.platform === "tiktok") {
                                // TikTok doesn't support sending messages back, just show locally
                                const messageData: TwitchatDataTypes.MessageChatData = {
                                        id: Utils.getUUID(),
                                        date: Date.now(),
                                        channel_id: originalMessage.channel_id,
                                        user: StoreProxy.users.getUserFrom(originalMessage.platform, originalMessage.channel_id, originalMessage.channel_id),
                                        answers: [],
                                        is_short: false,
                                        message: responseText,
                                        message_html: responseText,
                                        message_chunks: [],
                                        message_size: 0,
                                        platform: "twitchat",
                                        type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
                                };
                                StoreProxy.chat.addMessage(messageData);
                        }
                },

                clearQueue(id:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        const count = q.entries.length;
                        q.entries = [];
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit cleared event
                        if(count > 0) {
                                const clearedMessage: TwitchatDataTypes.MessageQueueClearedData = {
                                        id: Utils.getUUID(),
                                        type: TwitchatDataTypes.TwitchatMessageType.QUEUE_CLEARED,
                                        date: Date.now(),
                                        platform: "twitchat",
                                        channel_id: StoreProxy.auth.twitch.user.id,
                                        queueId: q.id,
                                        queueTitle: q.title,
                                        count: count
                                };
                                StoreProxy.chat.addMessage(clearedMessage);
                        }
                },

                clearInProgress(id:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        const count = q.inProgress?.length || 0;
                        q.inProgress = [];
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit in-progress cleared event
                        if(count > 0) {
                                const clearedMessage: TwitchatDataTypes.MessageQueueInProgressClearedData = {
                                        id: Utils.getUUID(),
                                        type: TwitchatDataTypes.TwitchatMessageType.QUEUE_IN_PROGRESS_CLEARED,
                                        date: Date.now(),
                                        platform: "twitchat",
                                        channel_id: StoreProxy.auth.twitch.user.id,
                                        queueId: q.id,
                                        queueTitle: q.title,
                                        count: count
                                };
                                StoreProxy.chat.addMessage(clearedMessage);
                        }
                },

                pickFirstUser(id:string):TwitchatDataTypes.TwitchatUser {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q || q.entries.length === 0) throw new Error("Queue empty or not found");
                        if(!q.inProgressEnabled) throw new Error("In-progress not enabled");

                        const entry = q.entries.shift()!;
                        q.inProgress = q.inProgress || [];
                        q.inProgress.push(entry);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit user picked event
                        const pickedMessage: TwitchatDataTypes.MessageQueueUserPickedData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_PICKED,
                                date: Date.now(),
                                platform: "twitchat",
                                channel_id: StoreProxy.auth.twitch.user.id,
                                queueId: q.id,
                                queueTitle: q.title,
                                user: entry.user,
                                pickMethod: "first"
                        };
                        StoreProxy.chat.addMessage(pickedMessage);

                        return entry.user;
                },

                pickRandomUser(id:string):TwitchatDataTypes.TwitchatUser {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q || q.entries.length === 0) throw new Error("Queue empty or not found");
                        if(!q.inProgressEnabled) throw new Error("In-progress not enabled");

                        const randomIndex = Math.floor(Math.random() * q.entries.length);
                        const entry = q.entries.splice(randomIndex, 1)[0];
                        q.inProgress = q.inProgress || [];
                        q.inProgress.push(entry);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit user picked event
                        const pickedMessage: TwitchatDataTypes.MessageQueueUserPickedData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_PICKED,
                                date: Date.now(),
                                platform: "twitchat",
                                channel_id: StoreProxy.auth.twitch.user.id,
                                queueId: q.id,
                                queueTitle: q.title,
                                user: entry.user,
                                pickMethod: "random"
                        };
                        StoreProxy.chat.addMessage(pickedMessage);

                        return entry.user;
                },

                moveUserUp(id:string, userId:string) {
                        console.log("[Queue Debug] moveUserUp called - id:", id, "userId:", userId);
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) {
                                console.log("[Queue Debug] moveUserUp - queue not found");
                                return;
                        }
                        const idx = q.entries.findIndex((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);
                        console.log("[Queue Debug] moveUserUp - idx:", idx);
                        if(idx <= 0) {
                                console.log("[Queue Debug] moveUserUp - idx <= 0, cannot move up");
                                return;
                        }

                        const entry = q.entries[idx];
                        q.entries.splice(idx, 1);
                        q.entries.splice(idx - 1, 0, entry);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit move up event
                        const channelId = StoreProxy.auth.twitch.user?.id;
                        console.log("[Queue Debug] moveUserUp - channelId:", channelId);
                        if(!channelId) {
                                console.log("[Queue Debug] moveUserUp - no channelId, skipping message");
                                return;
                        }
                        const moveMessage: TwitchatDataTypes.MessageQueueUserMovedUpData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_MOVED_UP,
                                date: Date.now(),
                                platform: "twitchat",
                                channel_id: channelId,
                                queueId: q.id,
                                queueTitle: q.title,
                                user: entry.user,
                                newPosition: idx // idx is now the new position (0-based), so position is idx (since we moved from idx to idx-1)
                        };
                        console.log("[Queue Debug] moveUserUp - adding message:", moveMessage);
                        StoreProxy.chat.addMessage(moveMessage);
                },

                moveUserDown(id:string, userId:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q) return;
                        const idx = q.entries.findIndex((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);
                        if(idx < 0 || idx >= q.entries.length - 1) return;

                        const entry = q.entries[idx];
                        q.entries.splice(idx, 1);
                        q.entries.splice(idx + 1, 0, entry);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit move down event
                        const channelId = StoreProxy.auth.twitch.user?.id;
                        if(!channelId) return;
                        const moveMessage: TwitchatDataTypes.MessageQueueUserMovedDownData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_MOVED_DOWN,
                                date: Date.now(),
                                platform: "twitchat",
                                channel_id: channelId,
                                queueId: q.id,
                                queueTitle: q.title,
                                user: entry.user,
                                newPosition: idx + 2 // new position is idx+1 (0-based), so 1-based is idx+2
                        };
                        StoreProxy.chat.addMessage(moveMessage);
                },

                moveUserBackToQueue(id:string, userId:string) {
                        const q = this.queueList.find((v:TwitchatDataTypes.QueueData)=>v.id==id);
                        if(!q || !q.inProgress) return;
                        const idx = q.inProgress.findIndex((e:TwitchatDataTypes.QueueEntry)=>e.user.id==userId);
                        if(idx < 0) return;

                        const entry = q.inProgress.splice(idx, 1)[0];
                        q.entries.push(entry);
                        this.saveData();
                        this.broadcastStates(id);

                        // Emit move back event
                        const channelId = StoreProxy.auth.twitch.user?.id;
                        if(!channelId) return;
                        const moveMessage: TwitchatDataTypes.MessageQueueUserMovedBackData = {
                                id: Utils.getUUID(),
                                type: TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_MOVED_BACK,
                                date: Date.now(),
                                platform: "twitchat",
                                channel_id: channelId,
                                queueId: q.id,
                                queueTitle: q.title,
                                user: entry.user,
                                newPosition: q.entries.length // new position is the last one
                        };
                        StoreProxy.chat.addMessage(moveMessage);
                },
        } as IQueueActions
        & ThisType<IQueueActions
                & UnwrapRef<IQueueState>
                & _StoreWithState<'queue', IQueueState, IQueueGetters, IQueueActions>
                & _StoreWithGetters<IQueueGetters>
                & PiniaCustomProperties
        >,
});

if(import.meta.hot) {
        import.meta.hot.accept(acceptHMRUpdate(storeQueue, import.meta.hot))
}

interface IStoreData {
        queueList:TwitchatDataTypes.QueueData[];
}
