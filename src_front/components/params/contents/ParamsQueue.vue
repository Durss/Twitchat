<template>
    <div class="paramsqueue parameterContent">
        <Icon name="list" class="icon" v-if="panelContext == false" />

        <div class="head" v-if="panelContext == false">
            <i18n-t scope="global" tag="p" keypath="queue.header">
                <template #LINK_OVERLAY>
                    <a @click="openOverlays()" target="_blank">{{ $t('queue.header_link_overlay') }}</a>
                </template>
            </i18n-t>
        </div>

        <section class="ctas">
            <TTButton icon="add" v-if="canCreateQueues" @click="$store.queue.createQueue(); initParams()">{{ $t('queue.addBt') }}</TTButton>
            <div class="card-item premium premiumLimit" v-else>
                <span>{{ $t('queue.premium_limit', {MAX:$config.MAX_QUEUES, MAX_PREMIUM:$config.MAX_QUEUES_PREMIUM}) }}</span>
                <TTButton icon="premium" premium light @click="openPremium()">{{ $t('premium.become_premiumBt') }}</TTButton>
            </div>
            <TTButton icon="overlay" @click="openOverlays()">{{ $t('queue.overlayBt') }}</TTButton>
        </section>

        <draggable class="queueList"
            v-model="$store.queue.queueList"
            direction="vertical"
            group="queues"
            item-key="id"
            :animation="250"
            @sort="rebuildParams()">
            <template #item="{element:entry}">
                <ToggleBlock class="queueEntry"
                    :open="false"
                    :key="entry.id"
                    editableTitle
                    v-model:title="entry.title"
                    :titleDefault="$t('queue.default_title')"
                    :titleMaxLengh="50"
                    @update:title="save(entry)">
                    <template #left_actions>
                        <Icon name="list" class="queueIcon" />
                    </template>
                    <template #right_actions>
                        <div class="actions">
                            <ToggleButton v-model="entry.enabled" @change="save(entry)" @click.stop />
                            <TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
                            <TTButton class="actionBt" alert icon="trash" @click.stop="$store.queue.deleteQueue(entry.id)" />
                        </div>
                    </template>
                    <div class="content">
                        <div class="card-item placeholder" v-tooltip="$t('queue.form.param_placeholder_tt')">
                            <Icon name="placeholder"/>
                            <span class="label">{{ $t("queue.form.param_placeholder") }}</span>
                            <PlaceholderField class="field"
                                v-model="entry.placeholderKey"
                                :prefix="'QUEUE_'"
                                @change="save(entry)" />
                        </div>
                        <ParamItem :paramData="param_max_per_user[entry.id]" v-model="entry.maxPerUser" @change="save(entry)" v-tooltip="$t('queue.form.param_max_per_user_tt')" />
                        <ParamItem :paramData="param_max_entries[entry.id]" v-model="entry.maxEntries" @change="save(entry)" v-tooltip="$t('queue.form.param_max_entries_tt')" />
                        <ParamItem :paramData="param_enableInProgress[entry.id]" v-model="entry.inProgressEnabled" @change="save(entry)" v-tooltip="$t('queue.form.param_enable_in_progress_tt')" />
                        
                        <ToggleBlock class="commands" small :title="$t('queue.form.commands_title')" :open="false" v-tooltip="$t('queue.form.commands_tt')">
                            <div class="commandInputs">
                                <ParamItem :paramData="param_command_join[entry.id]" v-model="param_command_join[entry.id].value" @change="onCommandChange(entry, 'join')" v-tooltip="$t('queue.form.param_command_join_tt')" />
                                <ParamItem :paramData="param_command_leave[entry.id]" v-model="param_command_leave[entry.id].value" @change="onCommandChange(entry, 'leave')" v-tooltip="$t('queue.form.param_command_leave_tt')" />
                                <ParamItem :paramData="param_command_position[entry.id]" v-model="param_command_position[entry.id].value" @change="onCommandChange(entry, 'position')" v-tooltip="$t('queue.form.param_command_position_tt')" />
                            </div>
                        </ToggleBlock>
                        
                        <ToggleBlock class="messages" small :title="$t('queue.form.messages_title')" :open="false" v-tooltip="$t('queue.form.messages_tt')">
                            <div class="messageInputs">
                                <ParamItem :paramData="param_message_join_success[entry.id]" v-model="param_message_join_success[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_join_success_tt')" />
                                <ParamItem :paramData="param_message_join_already[entry.id]" v-model="param_message_join_already[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_join_already_tt')" />
                                <ParamItem :paramData="param_message_join_full[entry.id]" v-model="param_message_join_full[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_join_full_tt')" />
                                <ParamItem :paramData="param_message_join_max_per_user[entry.id]" v-model="param_message_join_max_per_user[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_join_max_per_user_tt')" />
                                <ParamItem :paramData="param_message_join_paused[entry.id]" v-model="param_message_join_paused[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_join_paused_tt')" />
                                <ParamItem :paramData="param_message_join_disabled[entry.id]" v-model="param_message_join_disabled[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_join_disabled_tt')" />
                                <ParamItem :paramData="param_message_leave_success[entry.id]" v-model="param_message_leave_success[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_leave_success_tt')" />
                                <ParamItem :paramData="param_message_leave_not_in[entry.id]" v-model="param_message_leave_not_in[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_leave_not_in_tt')" />
                                <ParamItem :paramData="param_message_position[entry.id]" v-model="param_message_position[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_position_tt')" />
                                <ParamItem :paramData="param_message_position_not_in[entry.id]" v-model="param_message_position_not_in[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_position_not_in_tt')" />
                                <ParamItem :paramData="param_message_position_paused[entry.id]" v-model="param_message_position_paused[entry.id].value" @change="save(entry)" v-tooltip="$t('queue.form.param_message_position_paused_tt')" />
                            </div>
                        </ToggleBlock>
                        
                        <div class="ctas">
                            <TTButton icon="pause" v-if="!entry.paused" @click="$store.queue.pauseQueue(entry.id)">{{ $t('queue.pauseBt') }}</TTButton>
                            <TTButton icon="play" v-else @click="$store.queue.resumeQueue(entry.id)">{{ $t('queue.resumeBt') }}</TTButton>
                        </div>
                        <ToggleBlock class="entries" small :title="$t('queue.form.list_entries')" :open="false" v-tooltip="$t('queue.form.list_entries_tt')">
                            <div class="viewer" v-for="(v, index) in entry.entries" :key="v.user.id">
                                <div class="userInfo" @click="openUserCard(v.user)">
                                    <Icon :name="v.user.platform" class="platformIcon" />
                                    <img :src="v.user.avatarPath" class="avatar" v-if="v.user.avatarPath" />
                                    <span class="name">{{ v.user.displayName }} ({{ v.user.id }})</span>
                                </div>
                                <div class="actions">
                                    <TTButton icon="scrollUp" small v-if="index > 0" @click="moveUp(entry, index)" v-tooltip="$t('queue.form.move_up_tt')" />
                                    <TTButton icon="scrollDown" small v-if="index < entry.entries.length - 1" @click="moveDown(entry, index)" v-tooltip="$t('queue.form.move_down_tt')" />
                                    <TTButton icon="right" small v-if="entry.inProgressEnabled" @click="moveToProgress(entry, v)" v-tooltip="$t('queue.form.move_to_progress_tt')" />
                                    <TTButton icon="trash" alert small @click="removeViewer(entry, v)" v-tooltip="$t('queue.form.remove_viewer_tt')" />
                                </div>
                            </div>
                        </ToggleBlock>
                        <ToggleBlock class="inprogress" small v-if="entry.inProgressEnabled" :title="$t('queue.form.list_in_progress')" :open="false" v-tooltip="$t('queue.form.list_in_progress_tt')">
                            <div class="viewer" v-for="(v, index) in entry.inProgress" :key="v.user.id">
                                <div class="userInfo" @click="openUserCard(v.user)">
                                    <Icon :name="v.user.platform" class="platformIcon" />
                                    <img :src="v.user.avatarPath" class="avatar" v-if="v.user.avatarPath" />
                                    <span class="name">{{ v.user.displayName }} ({{ v.user.id }})</span>
                                </div>
                                <div class="actions">
                                    <TTButton icon="left" small @click="moveBackToQueue(entry, v)" v-tooltip="$t('queue.form.move_back_to_queue_tt')" />
                                    <TTButton icon="trash" alert small @click="removeFromProgress(entry, v)" v-tooltip="$t('queue.form.remove_viewer_tt')" />
                                </div>
                            </div>
                        </ToggleBlock>
                    </div>
                </ToggleBlock>
            </template>
        </draggable>
    </div>
</template>

<script lang="ts">
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import PlaceholderField from '@/components/PlaceholderField.vue';
import ParamItem from '../ParamItem.vue';
import draggable from 'vuedraggable';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TriggerTypes } from '@/types/TriggerActionDataTypes';

@Component({
    components:{Icon, TTButton, ToggleBlock, ToggleButton, PlaceholderField, ParamItem, draggable}
})
class ParamsQueue extends Vue {

    @Prop({type:Boolean, default:false})
    public panelContext!:boolean;

    public param_max_per_user:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_max_entries:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_enableInProgress:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
    public param_command_join:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_command_leave:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_command_position:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_join_success:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_join_already:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_join_full:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_join_max_per_user:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_join_paused:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_join_disabled:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_leave_success:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_leave_not_in:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_position:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_position_not_in:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_message_position_paused:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};

    public mounted():void {
        this.initParams();
        this.$watch(()=>this.$store.queue.queueList,
            ()=>this.rebuildParams(), {deep:true, immediate:true});
        
        // Validate all commands on mount and after params are initialized
        this.$nextTick(() => {
            setTimeout(() => {
                this.$store.queue.queueList.forEach(queue => {
                    if(queue.commands) {
                        this.validateCommand(queue, 'join');
                        this.validateCommand(queue, 'leave');
                        this.validateCommand(queue, 'position');
                    }
                });
            }, 100);
        });
    }

    public get canCreateQueues():boolean {
        const count = this.$store.queue.queueList.length;
        if(this.$store.auth.isPremium) return count < this.$config.MAX_QUEUES_PREMIUM;
        return count < this.$config.MAX_QUEUES;
    }

    public initParams():void {
        this.$store.queue.queueList.forEach(q=>{
            const id = q.id;
            if(this.param_max_per_user[id]) return;
            this.param_max_per_user[id] = {type:'number', value:q.maxPerUser, labelKey:'queue.form.param_max_per_user', icon:'group', min:1, max:100};
            this.param_max_entries[id] = {type:'number', value:q.maxEntries, labelKey:'queue.form.param_max_entries', icon:'list', min:0, max:100};
            this.param_enableInProgress[id] = {type:'boolean', value:q.inProgressEnabled ?? true, labelKey:'queue.form.param_enable_in_progress', icon:'list'};
            this.param_command_join[id] = {type:'string', value:q.commands?.join || `!join${this.$store.queue.queueList.indexOf(q)+1}`, labelKey:'queue.form.param_command_join', icon:'chatCommand', maxLength:50, allowedCharsRegex:'^[a-zA-Z0-9!_-]+$'};
            this.param_command_leave[id] = {type:'string', value:q.commands?.leave || `!leave${this.$store.queue.queueList.indexOf(q)+1}`, labelKey:'queue.form.param_command_leave', icon:'chatCommand', maxLength:50, allowedCharsRegex:'^[a-zA-Z0-9!_-]+$'};
            this.param_command_position[id] = {type:'string', value:q.commands?.position || `!position${this.$store.queue.queueList.indexOf(q)+1}`, labelKey:'queue.form.param_command_position', icon:'chatCommand', maxLength:50, allowedCharsRegex:'^[a-zA-Z0-9!_-]+$'};
            
            // Initialize message parameters with proper placeholders
            this.param_message_join_success[id] = {type:'string', value:q.messages?.joinSuccess || "{USER} a rejoint la file à la position {POSITION}", labelKey:'queue.form.param_message_join_success', icon:'message', maxLength:500, placeholderKey:'{USER}, {POSITION}, {TOTAL}, {QUEUE_NAME}'};
            this.param_message_join_already[id] = {type:'string', value:q.messages?.joinAlreadyIn || "{USER}, tu es déjà dans la file à la position {POSITION}", labelKey:'queue.form.param_message_join_already', icon:'message', maxLength:500, placeholderKey:'{USER}, {POSITION}, {QUEUE_NAME}'};
            this.param_message_join_full[id] = {type:'string', value:q.messages?.joinFull || "La file est pleine !", labelKey:'queue.form.param_message_join_full', icon:'message', maxLength:500, placeholderKey:'{USER}, {QUEUE_NAME}'};
            this.param_message_join_max_per_user[id] = {type:'string', value:q.messages?.joinMaxPerUser || "{USER}, tu as atteint la limite de {MAX_PER_USER} entrée(s). Tu es déjà à la/aux position(s) : {POSITIONS}", labelKey:'queue.form.param_message_join_max_per_user', icon:'message', maxLength:500, placeholderKey:'{USER}, {MAX_PER_USER}, {POSITIONS}, {QUEUE_NAME}'};
            this.param_message_join_paused[id] = {type:'string', value:q.messages?.joinPaused || "La file est actuellement en pause", labelKey:'queue.form.param_message_join_paused', icon:'message', maxLength:500, placeholderKey:'{USER}, {QUEUE_NAME}'};
            this.param_message_join_disabled[id] = {type:'string', value:q.messages?.joinDisabled || "La file est désactivée", labelKey:'queue.form.param_message_join_disabled', icon:'message', maxLength:500, placeholderKey:'{USER}, {QUEUE_NAME}'};
            this.param_message_leave_success[id] = {type:'string', value:q.messages?.leaveSuccess || "{USER} a quitté la file", labelKey:'queue.form.param_message_leave_success', icon:'message', maxLength:500, placeholderKey:'{USER}, {QUEUE_NAME}'};
            this.param_message_leave_not_in[id] = {type:'string', value:q.messages?.leaveNotIn || "{USER}, tu n'es pas dans la file", labelKey:'queue.form.param_message_leave_not_in', icon:'message', maxLength:500, placeholderKey:'{USER}, {QUEUE_NAME}'};
            this.param_message_position[id] = {type:'string', value:q.messages?.position || "{USER}, tu es à la position {POSITION}/{TOTAL}", labelKey:'queue.form.param_message_position', icon:'message', maxLength:500, placeholderKey:'{USER}, {POSITION}, {TOTAL}, {QUEUE_NAME}'};
            this.param_message_position_not_in[id] = {type:'string', value:q.messages?.positionNotIn || "{USER}, tu n'es pas dans la file", labelKey:'queue.form.param_message_position_not_in', icon:'message', maxLength:500, placeholderKey:'{USER}, {QUEUE_NAME}'};
            this.param_message_position_paused[id] = {type:'string', value:q.messages?.positionPaused || "La file est en pause. {USER}, tu es à la position {POSITION}/{TOTAL}", labelKey:'queue.form.param_message_position_paused', icon:'message', maxLength:500, placeholderKey:'{USER}, {POSITION}, {TOTAL}, {QUEUE_NAME}, {QUEUE_STATUS}'};
        });
    }

    public rebuildParams():void {
        this.param_max_per_user = {};
        this.param_max_entries = {};
        this.param_enableInProgress = {};
        this.param_command_join = {};
        this.param_command_leave = {};
        this.param_command_position = {};
        this.param_message_join_success = {};
        this.param_message_join_already = {};
        this.param_message_join_full = {};
        this.param_message_join_max_per_user = {};
        this.param_message_join_paused = {};
        this.param_message_join_disabled = {};
        this.param_message_leave_success = {};
        this.param_message_leave_not_in = {};
        this.param_message_position = {};
        this.param_message_position_not_in = {};
        this.param_message_position_paused = {};
        this.initParams();
    }

    public onCommandChange(entry:TwitchatDataTypes.QueueData, commandType: 'join' | 'leave' | 'position'):void {
        // Validate this command
        this.validateCommand(entry, commandType);
        
        // Revalidate all commands of all queues since changing one might affect others
        this.$store.queue.queueList.forEach(queue => {
            if(queue.commands) {
                this.validateCommand(queue, 'join');
                this.validateCommand(queue, 'leave');
                this.validateCommand(queue, 'position');
            }
        });
        
        // Only save if there are no errors
        this.save(entry);
    }

    public validateCommand(entry:TwitchatDataTypes.QueueData, commandType: 'join' | 'leave' | 'position'):void {
        const id = entry.id;
        let commandValue: string;
        
        // Type-safe access to command parameters
        if (commandType === 'join') {
            commandValue = this.param_command_join[id].value;
        } else if (commandType === 'leave') {
            commandValue = this.param_command_leave[id].value;
        } else {
            commandValue = this.param_command_position[id].value;
        }
        
        // Reset error state
        if (commandType === 'join') {
            this.param_command_join[id].error = undefined;
            this.param_command_join[id].errorMessage = undefined;
        } else if (commandType === 'leave') {
            this.param_command_leave[id].error = undefined;
            this.param_command_leave[id].errorMessage = undefined;
        } else {
            this.param_command_position[id].error = undefined;
            this.param_command_position[id].errorMessage = undefined;
        }
        
        // Don't validate empty commands
        if (!commandValue) return;
        
        // Force command to start with "!"
        if (!commandValue.startsWith('!')) {
            commandValue = '!' + commandValue;
            
            // Type-safe assignment
            if (commandType === 'join') {
                this.param_command_join[id].value = commandValue;
            } else if (commandType === 'leave') {
                this.param_command_leave[id].value = commandValue;
            } else {
                this.param_command_position[id].value = commandValue;
            }
            
            entry.commands = entry.commands || {};
            entry.commands[commandType] = commandValue;
        }
        
        // Remove any "/" at the beginning
        if (commandValue.startsWith('/')) {
            // Type-safe error assignment
            if (commandType === 'join') {
                this.param_command_join[id].error = true;
                this.param_command_join[id].errorMessage = this.$t("queue.form.command_must_start_with_exclamation");
            } else if (commandType === 'leave') {
                this.param_command_leave[id].error = true;
                this.param_command_leave[id].errorMessage = this.$t("queue.form.command_must_start_with_exclamation");
            } else {
                this.param_command_position[id].error = true;
                this.param_command_position[id].errorMessage = this.$t("queue.form.command_must_start_with_exclamation");
            }
            return;
        }
        
        commandValue = commandValue.toLowerCase();
        
        // Get all existing "!" commands only
        const existingCommands = new Set<string>();
        
        // Add trigger custom "!" commands only
        const triggerCommands = this.$store.triggers.triggerList.filter(t => 
            t.type === TriggerTypes.CHAT_COMMAND && 
            t.enabled && 
            t.chatCommand &&
            t.chatCommand.startsWith('!')
        );
        triggerCommands.forEach(t => {
            if(t.chatCommand) existingCommands.add(t.chatCommand.toLowerCase());
        });
        
        // Check for conflicts with commands in the same queue
        const currentQueueCommands = [
            { type: 'join' as const, value: this.param_command_join[id].value?.toLowerCase() },
            { type: 'leave' as const, value: this.param_command_leave[id].value?.toLowerCase() },
            { type: 'position' as const, value: this.param_command_position[id].value?.toLowerCase() }
        ];
        
        // Check if current command conflicts with other commands in the same queue
        currentQueueCommands.forEach(cmd => {
            if (cmd.type !== commandType && cmd.value === commandValue) {
                // Type-safe error assignment
                if (commandType === 'join') {
                    this.param_command_join[id].error = true;
                    this.param_command_join[id].errorMessage = this.$t("queue.form.command_duplicate_error");
                } else if (commandType === 'leave') {
                    this.param_command_leave[id].error = true;
                    this.param_command_leave[id].errorMessage = this.$t("queue.form.command_duplicate_error");
                } else {
                    this.param_command_position[id].error = true;
                    this.param_command_position[id].errorMessage = this.$t("queue.form.command_duplicate_error");
                }
            }
        });
        
        // Check for conflicts with other queue commands
        this.$store.queue.queueList.forEach(queue => {
            if(queue.id === entry.id || !queue.commands) return;
            
            if(queue.commands.join?.toLowerCase() === commandValue ||
               queue.commands.leave?.toLowerCase() === commandValue ||
               queue.commands.position?.toLowerCase() === commandValue) {
                // Type-safe error assignment
                if (commandType === 'join') {
                    this.param_command_join[id].error = true;
                    this.param_command_join[id].errorMessage = this.$t("queue.form.command_duplicate_error");
                } else if (commandType === 'leave') {
                    this.param_command_leave[id].error = true;
                    this.param_command_leave[id].errorMessage = this.$t("queue.form.command_duplicate_error");
                } else {
                    this.param_command_position[id].error = true;
                    this.param_command_position[id].errorMessage = this.$t("queue.form.command_duplicate_error");
                }
            }
        });
        
        // Check against existing "!" trigger commands
        let hasError = false;
        if (commandType === 'join') {
            hasError = this.param_command_join[id].error || false;
        } else if (commandType === 'leave') {
            hasError = this.param_command_leave[id].error || false;
        } else {
            hasError = this.param_command_position[id].error || false;
        }
        
        if(existingCommands.has(commandValue) && !hasError) {
            // Type-safe error assignment
            if (commandType === 'join') {
                this.param_command_join[id].error = true;
                this.param_command_join[id].errorMessage = this.$t("queue.form.command_exists_error");
            } else if (commandType === 'leave') {
                this.param_command_leave[id].error = true;
                this.param_command_leave[id].errorMessage = this.$t("queue.form.command_exists_error");
            } else {
                this.param_command_position[id].error = true;
                this.param_command_position[id].errorMessage = this.$t("queue.form.command_exists_error");
            }
        }
    }

    public save(entry:TwitchatDataTypes.QueueData):void {
        const id = entry.id;
        
        // Check if there are any errors in ANY queue before saving
        let hasErrors = false;
        this.$store.queue.queueList.forEach(queue => {
            const qid = queue.id;
            if(this.param_command_join[qid]?.error || 
               this.param_command_leave[qid]?.error || 
               this.param_command_position[qid]?.error) {
                hasErrors = true;
            }
        });
        
        if(hasErrors) {
            // Don't save if there are validation errors in any queue
            console.log("Cannot save: validation errors present");
            return;
        }
        
        // Update commands from params
        if(!entry.commands) entry.commands = {};
        entry.commands.join = this.param_command_join[entry.id].value;
        entry.commands.leave = this.param_command_leave[entry.id].value;
        entry.commands.position = this.param_command_position[entry.id].value;
        
        // Update messages from params
        if(!entry.messages) entry.messages = {};
        entry.messages.joinSuccess = this.param_message_join_success[entry.id].value;
        entry.messages.joinAlreadyIn = this.param_message_join_already[entry.id].value;
        entry.messages.joinFull = this.param_message_join_full[entry.id].value;
        entry.messages.joinMaxPerUser = this.param_message_join_max_per_user[entry.id].value;
        entry.messages.joinPaused = this.param_message_join_paused[entry.id].value;
        entry.messages.joinDisabled = this.param_message_join_disabled[entry.id].value;
        entry.messages.leaveSuccess = this.param_message_leave_success[entry.id].value;
        entry.messages.leaveNotIn = this.param_message_leave_not_in[entry.id].value;
        entry.messages.position = this.param_message_position[entry.id].value;
        entry.messages.positionNotIn = this.param_message_position_not_in[entry.id].value;
        entry.messages.positionPaused = this.param_message_position_paused[entry.id].value;
        
        this.$store.queue.saveData();
    }

    public openOverlays():void {
        this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, 'queue');
    }

    public moveUp(queue:TwitchatDataTypes.QueueData, index:number):void {
        if(index === 0) return;
        const entry = queue.entries[index];
        this.$store.queue.moveUserUp(queue.id, entry.user.id);
    }

    public moveDown(queue:TwitchatDataTypes.QueueData, index:number):void {
        if(index >= queue.entries.length - 1) return;
        const entry = queue.entries[index];
        this.$store.queue.moveUserDown(queue.id, entry.user.id);
    }

    public moveToProgress(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        this.$store.queue.moveToInProgress(queue.id, entry.user.id);
    }

    public removeViewer(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        this.$store.queue.removeViewerFromQueue(queue.id, entry.user.id);
    }

    public removeFromProgress(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        this.$store.queue.removeViewerFromInProgress(queue.id, entry.user.id);
    }

    public moveBackToQueue(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        this.$store.queue.moveUserBackToQueue(queue.id, entry.user.id);
    }

    public openPremium():void {
        this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
    }

    public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
        this.$store.users.openUserCard(user, this.$store.auth.twitch.user.id, user.platform);
        
        // Close the parameters panel completely if we're not in the QueueForm panel
        if(!this.panelContext) {
            this.$store.params.closeParameters();
        }
    }

    public onNavigateBack():boolean { return false; }
}
export default toNative(ParamsQueue);
</script>

<style scoped lang="less">
.paramsqueue{
    .queueList{
        display:flex;
        flex-direction:column;
        gap:.5em;
    }
    .ctas{
        display:flex;
        gap:.25em;
        margin-top:.5em;
        flex-wrap:wrap;
        justify-content:center;
    }
    .content {
        display: flex;
        flex-direction: column;
        gap: .25em;
        
        .placeholder {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            row-gap: .25em;
            .icon {
                width: 1em;
                height: 1em;
                margin-right: .5em;
            }
            .label {
                flex-grow: 1;
                justify-self: flex-start;
            }
        }
    }
    .entries,
    .inprogress {
        margin-top:.5em;
        
        .viewer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: .5em;
            margin-bottom: .25em;
            background-color: var(--color-dark-fadest);
            border-radius: var(--border-radius);
            
            .userInfo {
                display: flex;
                align-items: center;
                gap: .5em;
                flex-grow: 1;
                margin-right: .5em;
                overflow: hidden;
                cursor: pointer;
                transition: all .2s;
                
                &:hover {
                    transform: translateX(2px);
                }
                
                .platformIcon {
                    width: 1.2em;
                    height: 1.2em;
                    flex-shrink: 0;
                }
                
                .avatar {
                    width: 1.5em;
                    height: 1.5em;
                    border-radius: 50%;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                
                .name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    text-decoration: none;
                    color: inherit;
                    
                    &:hover {
                        text-decoration: underline;
                    }
                }
            }
            
            .actions {
                display: flex;
                gap: .25em;
                flex-shrink: 0;
            }
        }
    }
    .actions {
        gap: .25em;
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: -.25em 0;
        align-self: stretch;
        .actionBt {
            width: 1.5em;
            min-width: 1.5em;
            border-radius: 0;
            align-self: stretch;
            &:last-child {
                margin-left: -.25em;//avoid gap between buttons without putting them in a dedicated container
            }
        }
    }
    
    .queueIcon {
        width: 1em;
        z-index: 1;
    }
    
    .commands,
    .messages {
        margin-top: .5em;
        
        .commandInputs,
        .messageInputs {
            display: flex;
            flex-direction: column;
            gap: .5em;
            padding: .5em 0;
        }
    }
}
</style>
