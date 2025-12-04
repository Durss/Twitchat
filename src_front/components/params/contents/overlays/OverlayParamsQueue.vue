<template>
    <div class="overlayparamsqueue overlayParamsSection">
        <div class="header">{{ $t('overlay.queue.head') }}</div>
        <section>
            <TTButton @click="openQueueParams" icon="edit">{{ $t('overlay.queue.createQueue_bt') }}</TTButton>
        </section>
        <VueDraggable class="queueList"
            v-model="$store.queue.queueList"
            :group="{name:'queue'}"
            handle=".header"
            animation="250">
            <ToggleBlock v-for="entry in $store.queue.queueList" :title="entry.title" :open="false" :key="entry.id">
                <template #right_actions>
                    <TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
                </template>
                    <div class="card-item install">
                        <label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
                        <OverlayInstaller type="queue" :sourceSuffix="entry.title" :id="entry.id" :sourceTransform="{width:300, height:150}" />
                        
                        <ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
                            <div class="cssHead">{{ $t("overlay.queue.css") }}</div>
                            <ul class="cssStructure">
                                <li class="sublist">.overlayqueue { ... }
                                    <ul>
                                        <li class="sublist">.queue-title { ... }</li>
                                        <li class="sublist">.queue-subtitle { ... }</li>
                                        <li class="sublist">.queue-state { ... }
                                            <ul>
                                                <li class="sublist">.state-paused { ... }</li>
                                                <li class="sublist">.state-running { ... }</li>
                                            </ul>
                                        </li>
                                        <li class="sublist">.queue-section { ... }
                                            <ul>
                                                <li class="sublist">.queue-label { ... }</li>
                                                <li class="sublist">.queue-list { ... }
                                                    <ul>
                                                        <li class="sublist">.queue-entry { ... }
                                                            <ul>
                                                                <li class="sublist">.queue-avatar { ... }</li>
                                                                <li class="sublist">.queue-name { ... }</li>
                                                            </ul>
                                                        </li>
                                                    </ul>
                                                </li>
                                                <li class="sublist">.queue-empty { ... }</li>
                                            </ul>
                                        </li>
                                        <li class="sublist">.queue-inprogress { ... }
                                            <ul>
                                                <li class="sublist">.progress-title { ... }</li>
                                                <li class="sublist">.progress-list { ... }
                                                    <ul>
                                                        <li class="sublist">.progress-entry { ... }
                                                            <ul>
                                                                <li class="sublist">.progress-avatar { ... }</li>
                                                                <li class="sublist">.progress-name { ... }</li>
                                                            </ul>
                                                        </li>
                                                    </ul>
                                                </li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </ToggleBlock>
                    </div>
                    
                    <div class="card-item dark simulate">
                        <TTButton icon="test" @click="testAdd(entry)">{{ $t('overlay.queue.testAddBt') }}</TTButton>
                        <TTButton icon="test" @click="testMove(entry)">{{ $t('overlay.queue.testMoveBt') }}</TTButton>
                        <TTButton icon="test" @click="testRemove(entry)">{{ $t('overlay.queue.testRemoveBt') }}</TTButton>
                        <TTButton icon="test" v-if="entry.overlayParams!.showInProgress" @click="testRemoveProg(entry)">{{ $t('overlay.queue.testRemoveProgBt') }}</TTButton>
                    </div>
                    
                    <div class="card-item">
                        <strong>{{ $t('overlay.queue.section_title') }}</strong>
                        <ParamItem :paramData="param_title[entry.id]" v-model="entry.overlayParams!.title" @change="save(entry)" />
                        <div class="themeBlock">
                            <div class="font">
                                <ParamItem :paramData="param_titleFont[entry.id]" v-model="entry.overlayParams!.titleFont" @change="save(entry)" />
                                <ParamItem :paramData="param_titleSize[entry.id]" v-model="entry.overlayParams!.titleSize" @change="save(entry)" />
                            </div>
                            <div class="colors">
                                <ParamItem :paramData="param_titleColor[entry.id]" v-model="entry.overlayParams!.titleColor" @change="save(entry)" />
                                <ParamItem :paramData="param_titleBgColor[entry.id]" v-model="entry.overlayParams!.titleBgColor" @change="save(entry)" />
                                <ParamItem :paramData="param_titleBgOpacity[entry.id]" v-model="entry.overlayParams!.titleBgOpacity" @change="save(entry)" />
                            </div>
                        </div>
                    </div>

                    <div class="card-item">
                        <strong>{{ $t('overlay.queue.section_subtitle') }}</strong>
                        <ParamItem :paramData="param_subTitle[entry.id]" v-model="entry.overlayParams!.subTitle" @change="save(entry)" />
                        <div class="themeBlock">
                            <div class="font">
                                <ParamItem :paramData="param_subTitleFont[entry.id]" v-model="entry.overlayParams!.subTitleFont" @change="save(entry)" />
                                <ParamItem :paramData="param_subTitleSize[entry.id]" v-model="entry.overlayParams!.subTitleSize" @change="save(entry)" />
                            </div>
                            <div class="colors">
                                <ParamItem :paramData="param_subTitleColor[entry.id]" v-model="entry.overlayParams!.subTitleColor" @change="save(entry)" />
                                <ParamItem :paramData="param_subTitleBgColor[entry.id]" v-model="entry.overlayParams!.subTitleBgColor" @change="save(entry)" />
                                <ParamItem :paramData="param_subTitleBgOpacity[entry.id]" v-model="entry.overlayParams!.subTitleBgOpacity" @change="save(entry)" />
                            </div>
                        </div>
                    </div>

                    <div class="card-item">
                        <strong>{{ $t('overlay.queue.section_queue') }}</strong>
                        <ParamItem :paramData="param_queueLabel[entry.id]" v-model="entry.overlayParams!.queueLabel" @change="save(entry)" />
                        <div class="themeBlock">
                            <div class="font">
                                <ParamItem :paramData="param_queueLabelFont[entry.id]" v-model="entry.overlayParams!.queueLabelFont" @change="save(entry)" />
                                <ParamItem :paramData="param_queueLabelSize[entry.id]" v-model="entry.overlayParams!.queueLabelSize" @change="save(entry)" />
                            </div>
                            <div class="colors">
                                <ParamItem :paramData="param_queueLabelColor[entry.id]" v-model="entry.overlayParams!.queueLabelColor" @change="save(entry)" />
                                <ParamItem :paramData="param_queueBgColor[entry.id]" v-model="entry.overlayParams!.queueBgColor" @change="save(entry)" />
                                <ParamItem :paramData="param_queueBgOpacity[entry.id]" v-model="entry.overlayParams!.queueBgOpacity" @change="save(entry)" />
                            </div>
                        </div>
                        <strong>{{ $t('overlay.queue.param_queueEntry') }}</strong>
                        <div class="themeBlock">
                            <div class="font">
                                <ParamItem :paramData="param_queueEntryFont[entry.id]" v-model="entry.overlayParams!.queueEntryFont" @change="save(entry)" />
                                <ParamItem :paramData="param_queueEntrySize[entry.id]" v-model="entry.overlayParams!.queueEntrySize" @change="save(entry)" />
                            </div>
                            <div class="colors">
                                <ParamItem :paramData="param_queueEntryColor[entry.id]" v-model="entry.overlayParams!.queueEntryColor" @change="save(entry)" />
                                <ParamItem :paramData="param_queueEntryBgColor[entry.id]" v-model="entry.overlayParams!.queueEntryBgColor" @change="save(entry)" />
                                <ParamItem :paramData="param_queueEntryBgOpacity[entry.id]" v-model="entry.overlayParams!.queueEntryBgOpacity" @change="save(entry)" />
                            </div>
                        </div>
                        <ParamItem :paramData="param_showEmptyQueueMessage[entry.id]" v-model="entry.overlayParams!.showEmptyQueueMessage" @change="save(entry)">
                            <ParamItem :paramData="param_emptyQueueMessage[entry.id]" v-model="entry.overlayParams!.emptyQueueMessage" :childLevel="1" @change="save(entry)" v-if="entry.overlayParams!.showEmptyQueueMessage" />
                            <div class="themeBlock" v-if="entry.overlayParams!.showEmptyQueueMessage" :style="{marginLeft: '1em'}">
                                <div class="font">
                                    <ParamItem :paramData="param_emptyQueueFont[entry.id]" v-model="entry.overlayParams!.emptyQueueFont" @change="save(entry)" />
                                    <ParamItem :paramData="param_emptyQueueSize[entry.id]" v-model="entry.overlayParams!.emptyQueueSize" @change="save(entry)" />
                                </div>
                                <div class="colors">
                                    <ParamItem :paramData="param_emptyQueueColor[entry.id]" v-model="entry.overlayParams!.emptyQueueColor" @change="save(entry)" />
                                    <ParamItem :paramData="param_emptyQueueBgColor[entry.id]" v-model="entry.overlayParams!.emptyQueueBgColor" @change="save(entry)" />
                                    <ParamItem :paramData="param_emptyQueueBgOpacity[entry.id]" v-model="entry.overlayParams!.emptyQueueBgOpacity" @change="save(entry)" />
                                </div>
                            </div>
                        </ParamItem>
                    </div>

                    <div class="card-item" v-if="entry.inProgressEnabled">
                        <strong>{{ $t('overlay.queue.section_progress') }}</strong>
                        <ParamItem :paramData="param_showInProgress[entry.id]" v-model="entry.overlayParams!.showInProgress" @change="save(entry)">
                            <ParamItem v-if="entry.overlayParams!.showInProgress" :paramData="param_rotateDelay[entry.id]" :childLevel="1" v-model="entry.overlayParams!.rotateDelay" @change="save(entry)" />
                        </ParamItem>
                        <ParamItem :paramData="param_progressLabel[entry.id]" v-model="entry.overlayParams!.progressLabel" @change="save(entry)" />
                        <div class="themeBlock">
                            <div class="font">
                                <ParamItem :paramData="param_progressEntryFont[entry.id]" v-model="entry.overlayParams!.progressEntryFont" @change="save(entry)" />
                                <ParamItem :paramData="param_progressEntrySize[entry.id]" v-model="entry.overlayParams!.progressEntrySize" @change="save(entry)" />
                            </div>
                            <div class="colors">
                                <ParamItem :paramData="param_progressEntryColor[entry.id]" v-model="entry.overlayParams!.progressEntryColor" @change="save(entry)" />
                                <ParamItem :paramData="param_progressBgColor[entry.id]" v-model="entry.overlayParams!.progressBgColor" @change="save(entry)" />
                                <ParamItem :paramData="param_progressBgOpacity[entry.id]" v-model="entry.overlayParams!.progressBgOpacity" @change="save(entry)" />
                            </div>
                        </div>
                    </div>

                    <div class="card-item">
                        <strong>{{ $t('overlay.queue.section_state') }}</strong>
                        <ParamItem :paramData="param_showPausedState[entry.id]" v-model="entry.overlayParams!.showPausedState" @change="save(entry)">
                            <ParamItem :paramData="param_statePaused[entry.id]" v-model="entry.overlayParams!.statePaused" :childLevel="1" @change="save(entry)" v-if="entry.overlayParams!.showPausedState" />
                            <div class="themeBlock" v-if="entry.overlayParams!.showPausedState" :style="{marginLeft: '1em'}">
                                <div class="font">
                                    <ParamItem :paramData="param_statePausedFont[entry.id]" v-model="entry.overlayParams!.statePausedFont" @change="save(entry)" />
                                    <ParamItem :paramData="param_statePausedSize[entry.id]" v-model="entry.overlayParams!.statePausedSize" @change="save(entry)" />
                                </div>
                                <div class="colors">
                                    <ParamItem :paramData="param_statePausedColor[entry.id]" v-model="entry.overlayParams!.statePausedColor" @change="save(entry)" />
                                    <ParamItem :paramData="param_statePausedBgColor[entry.id]" v-model="entry.overlayParams!.statePausedBgColor" @change="save(entry)" />
                                    <ParamItem :paramData="param_statePausedBgOpacity[entry.id]" v-model="entry.overlayParams!.statePausedBgOpacity" @change="save(entry)" />
                                </div>
                            </div>
                        </ParamItem>
                        <ParamItem :paramData="param_showRunningState[entry.id]" v-model="entry.overlayParams!.showRunningState" @change="save(entry)">
                            <ParamItem :paramData="param_stateRunning[entry.id]" v-model="entry.overlayParams!.stateRunning" :childLevel="1" @change="save(entry)" v-if="entry.overlayParams!.showRunningState" />
                            <div class="themeBlock" v-if="entry.overlayParams!.showRunningState" :style="{marginLeft: '1em'}">
                                <div class="font">
                                    <ParamItem :paramData="param_stateRunningFont[entry.id]" v-model="entry.overlayParams!.stateRunningFont" @change="save(entry)" />
                                    <ParamItem :paramData="param_stateRunningSize[entry.id]" v-model="entry.overlayParams!.stateRunningSize" @change="save(entry)" />
                                </div>
                                <div class="colors">
                                    <ParamItem :paramData="param_stateRunningColor[entry.id]" v-model="entry.overlayParams!.stateRunningColor" @change="save(entry)" />
                                    <ParamItem :paramData="param_stateRunningBgColor[entry.id]" v-model="entry.overlayParams!.stateRunningBgColor" @change="save(entry)" />
                                    <ParamItem :paramData="param_stateRunningBgOpacity[entry.id]" v-model="entry.overlayParams!.stateRunningBgOpacity" @change="save(entry)" />
                                </div>
                            </div>
                        </ParamItem>
                    </div>
                    
                    <div class="card-item sectionsOrder">
                        <label>{{ $t('overlay.queue.param_sectionsOrder') }}</label>
                        <VueDraggable
                            v-model="sectionsOrder[entry.id]"
                            :group="{name:'sections_'+entry.id}"
                            animation="250"
                            @end="saveSectionsOrder(entry)"
                            class="sectionsList">
                            <template v-for="section in sectionsOrder[entry.id]" :key="section">
                                <div class="sectionItem" v-if="section !== 'progress' || entry.inProgressEnabled">
                                    <Icon name="dragZone" />
                                    <span>{{ $t('overlay.queue.section_' + section) }}</span>
                                </div>
                            </template>
                        </VueDraggable>
                    </div>
                    <div class="card-item placement">
                        <p>{{ $t('overlay.queue.param_placement') }}</p>
                        <PlacementSelector v-model="entry.overlayParams!.position" @change="save(entry)" />
                    </div>

            </ToggleBlock>
        </VueDraggable>
    </div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { TTButton } from '@/components/TTButton.vue';
import { ToggleBlock } from '@/components/ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import { VueDraggable } from 'vue-draggable-plus';
import { ParamItem } from '../../ParamItem.vue';
import PlacementSelector from '@/components/PlacementSelector.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
    components:{TTButton, ToggleBlock, OverlayInstaller, VueDraggable, ParamItem, PlacementSelector},
    emits:[]
})
class OverlayParamsQueue extends Vue {
    public param_showInProgress:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
    public param_rotateDelay:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_position:{[k:string]:TwitchatDataTypes.ParameterData<TwitchatDataTypes.ScreenPosition>} = {};
    public param_titleFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_titleSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_titleColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_titleBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_titleBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_subTitleFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_subTitleSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_subTitleColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_subTitleBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_subTitleBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_queueLabelFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueLabelSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_queueLabelColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_queueEntryFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueEntrySize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_queueEntryColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueEntryBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueEntryBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_progressEntryFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_progressEntrySize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_progressEntryColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_progressBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_progressBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_stateFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_stateColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_title:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_subTitle:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueLabel:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_progressLabel:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_showEmptyQueueMessage:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
    public param_emptyQueueMessage:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_emptyQueueFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_emptyQueueSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_emptyQueueColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_emptyQueueBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_emptyQueueBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_statePaused:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateRunning:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_showPausedState:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
    public param_showRunningState:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
    public param_statePausedFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_statePausedSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_statePausedColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_statePausedBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_statePausedBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_stateRunningFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateRunningSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_stateRunningColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateRunningBgColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateRunningBgOpacity:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public sectionsOrder:{[k:string]:string[]} = {};

    public mounted():void { 
        this.initParams();
        // Watcher pour détecter les changements dans sectionsOrder
        this.$watch('sectionsOrder', () => {
            // Sauvegarder et diffuser tous les changements d'ordre
            for(const entry of this.$store.queue.queueList) {
                if(this.sectionsOrder[entry.id] && entry.overlayParams) {
                    entry.overlayParams.sectionsOrder = [...this.sectionsOrder[entry.id]];
                    this.$store.queue.saveData();
                    this.$store.queue.broadcastStates(entry.id);
                }
            }
        }, { deep: true });
    }

    private initParams():void {
        this.$store.queue.queueList.forEach(q => {
            const id = q.id;
            this.param_showInProgress[id] = {type:'boolean', value:q.overlayParams?.showInProgress ?? true, labelKey:'queue.form.param_show_in_progress', icon:'show'};
            this.param_rotateDelay[id] = {type:'number', value:q.overlayParams?.rotateDelay ?? 0, labelKey:'queue.form.param_rotate_delay', icon:'timer', min:0, max:60};
            this.param_position[id] = {type:'list', value:q.overlayParams?.position ?? 'bl', labelKey:'overlay.queue.param_placement', icon:'move'};
            this.param_titleFont[id] = {type:'font', value:q.overlayParams?.titleFont ?? 'Roboto', labelKey:'overlay.queue.param_titleFont', icon:'font'};
            this.param_titleSize[id] = {type:'number', value:q.overlayParams?.titleSize ?? 30, labelKey:'overlay.queue.param_titleSize', icon:'fontSize', min:10, max:150};
            this.param_titleColor[id] = {type:'color', value:q.overlayParams?.titleColor ?? '#ffffff', labelKey:'overlay.queue.param_titleColor', icon:'color'};
            this.param_titleBgColor[id] = {type:'color', value:q.overlayParams?.titleBgColor ?? '#000000', labelKey:'overlay.queue.param_titleBgColor', icon:'color'};
            this.param_titleBgOpacity[id] = {type:'slider', value:q.overlayParams?.titleBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_subTitleFont[id] = {type:'font', value:q.overlayParams?.subTitleFont ?? 'Roboto', labelKey:'overlay.queue.param_subTitleFont', icon:'font'};
            this.param_subTitleSize[id] = {type:'number', value:q.overlayParams?.subTitleSize ?? 30, labelKey:'overlay.queue.param_subTitleSize', icon:'fontSize', min:10, max:150};
            this.param_subTitleColor[id] = {type:'color', value:q.overlayParams?.subTitleColor ?? '#ffffff', labelKey:'overlay.queue.param_subTitleColor', icon:'color'};
            this.param_subTitleBgColor[id] = {type:'color', value:q.overlayParams?.subTitleBgColor ?? '#000000', labelKey:'overlay.queue.param_subTitleBgColor', icon:'color'};
            this.param_subTitleBgOpacity[id] = {type:'slider', value:q.overlayParams?.subTitleBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_queueLabelFont[id] = {type:'font', value:q.overlayParams?.queueLabelFont ?? 'Roboto', labelKey:'overlay.queue.param_queueLabelFont', icon:'font'};
            this.param_queueLabelSize[id] = {type:'number', value:q.overlayParams?.queueLabelSize ?? 30, labelKey:'overlay.queue.param_queueLabelSize', icon:'fontSize', min:10, max:150};
            this.param_queueLabelColor[id] = {type:'color', value:q.overlayParams?.queueLabelColor ?? '#ffffff', labelKey:'overlay.queue.param_queueLabelColor', icon:'color'};
            this.param_queueBgColor[id] = {type:'color', value:q.overlayParams?.queueBgColor ?? '#000000', labelKey:'overlay.queue.param_queueBgColor', icon:'color'};
            this.param_queueBgOpacity[id] = {type:'slider', value:q.overlayParams?.queueBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_queueEntryFont[id] = {type:'font', value:q.overlayParams?.queueEntryFont ?? 'Roboto', labelKey:'overlay.queue.param_queueEntryFont', icon:'font'};
            this.param_queueEntrySize[id] = {type:'number', value:q.overlayParams?.queueEntrySize ?? 30, labelKey:'overlay.queue.param_queueEntrySize', icon:'fontSize', min:10, max:150};
            this.param_queueEntryColor[id] = {type:'color', value:q.overlayParams?.queueEntryColor ?? '#ffffff', labelKey:'overlay.queue.param_queueEntryColor', icon:'color'};
            this.param_queueEntryBgColor[id] = {type:'color', value:q.overlayParams?.queueEntryBgColor ?? '#000000', labelKey:'overlay.queue.param_queueEntryBgColor', icon:'color'};
            this.param_queueEntryBgOpacity[id] = {type:'slider', value:q.overlayParams?.queueEntryBgOpacity ?? 0, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_progressEntryFont[id] = {type:'font', value:q.overlayParams?.progressEntryFont ?? 'Roboto', labelKey:'overlay.queue.param_progressEntryFont', icon:'font'};
            this.param_progressEntrySize[id] = {type:'number', value:q.overlayParams?.progressEntrySize ?? 30, labelKey:'overlay.queue.param_progressEntrySize', icon:'fontSize', min:10, max:150};
            this.param_progressEntryColor[id] = {type:'color', value:q.overlayParams?.progressEntryColor ?? '#ffffff', labelKey:'overlay.queue.param_progressEntryColor', icon:'color'};
            this.param_progressBgColor[id] = {type:'color', value:q.overlayParams?.progressBgColor ?? '#000000', labelKey:'overlay.queue.param_progressBgColor', icon:'color'};
            this.param_progressBgOpacity[id] = {type:'slider', value:q.overlayParams?.progressBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_stateFont[id] = {type:'font', value:q.overlayParams?.stateFont ?? 'Roboto', labelKey:'overlay.queue.param_stateFont', icon:'font'};
            this.param_stateSize[id] = {type:'number', value:q.overlayParams?.stateSize ?? 30, labelKey:'overlay.queue.param_stateSize', icon:'fontSize', min:10, max:150};
            this.param_stateColor[id] = {type:'color', value:q.overlayParams?.stateColor ?? '#ffffff', labelKey:'overlay.queue.param_stateColor', icon:'color'};
            this.param_stateBgColor[id] = {type:'color', value:q.overlayParams?.stateBgColor ?? '#000000', labelKey:'overlay.queue.param_stateBgColor', icon:'color'};
            this.param_stateBgOpacity[id] = {type:'slider', value:q.overlayParams?.stateBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_title[id] = {type:'string', value:q.overlayParams?.title ?? '', maxLength:50, labelKey:'overlay.queue.param_title', icon:'text'};
            this.param_subTitle[id] = {type:'string', value:q.overlayParams?.subTitle ?? '', maxLength:50, labelKey:'overlay.queue.param_subTitle', icon:'text'};
            this.param_queueLabel[id] = {type:'string', value:q.overlayParams?.queueLabel ?? 'Queue', maxLength:50, labelKey:'overlay.queue.param_queueLabel', icon:'text'};
            this.param_progressLabel[id] = {type:'string', value:q.overlayParams?.progressLabel ?? 'In progress', maxLength:50, labelKey:'overlay.queue.param_progressLabel', icon:'text'};
            this.param_showEmptyQueueMessage[id] = {type:'boolean', value:q.overlayParams?.showEmptyQueueMessage !== false, labelKey:'overlay.queue.param_showEmptyQueueMessage', icon:'show'};
            this.param_emptyQueueMessage[id] = {type:'string', value:q.overlayParams?.emptyQueueMessage ?? '', maxLength:100, labelKey:'overlay.queue.param_emptyQueueMessage', icon:'text'};
            this.param_emptyQueueFont[id] = {type:'font', value:q.overlayParams?.emptyQueueFont ?? 'Roboto', labelKey:'overlay.queue.param_emptyQueueFont', icon:'font'};
            this.param_emptyQueueSize[id] = {type:'number', value:q.overlayParams?.emptyQueueSize ?? 30, labelKey:'overlay.queue.param_emptyQueueSize', icon:'fontSize', min:10, max:150};
            this.param_emptyQueueColor[id] = {type:'color', value:q.overlayParams?.emptyQueueColor ?? '#ffffff', labelKey:'overlay.queue.param_emptyQueueColor', icon:'color'};
            this.param_emptyQueueBgColor[id] = {type:'color', value:q.overlayParams?.emptyQueueBgColor ?? '#000000', labelKey:'overlay.queue.param_emptyQueueBgColor', icon:'color'};
            this.param_emptyQueueBgOpacity[id] = {type:'slider', value:q.overlayParams?.emptyQueueBgOpacity ?? 0, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_statePaused[id] = {type:'string', value:q.overlayParams?.statePaused ?? '', maxLength:50, labelKey:'overlay.queue.param_statePaused', icon:'text'};
            this.param_stateRunning[id] = {type:'string', value:q.overlayParams?.stateRunning ?? '', maxLength:50, labelKey:'overlay.queue.param_stateRunning', icon:'text'};
            this.param_showPausedState[id] = {type:'boolean', value:q.overlayParams?.showPausedState !== false, labelKey:'overlay.queue.param_showPausedState', icon:'checkmark'};
            this.param_showRunningState[id] = {type:'boolean', value:q.overlayParams?.showRunningState !== false, labelKey:'overlay.queue.param_showRunningState', icon:'checkmark'};
            this.param_statePausedFont[id] = {type:'font', value:q.overlayParams?.statePausedFont ?? q.overlayParams?.stateFont ?? 'Roboto', labelKey:'overlay.queue.param_stateFont', icon:'font'};
            this.param_statePausedSize[id] = {type:'number', value:q.overlayParams?.statePausedSize ?? q.overlayParams?.stateSize ?? 30, labelKey:'overlay.queue.param_stateSize', icon:'fontSize', min:10, max:150};
            this.param_statePausedColor[id] = {type:'color', value:q.overlayParams?.statePausedColor ?? q.overlayParams?.stateColor ?? '#ffffff', labelKey:'overlay.queue.param_stateColor', icon:'color'};
            this.param_statePausedBgColor[id] = {type:'color', value:q.overlayParams?.statePausedBgColor ?? q.overlayParams?.stateBgColor ?? '#000000', labelKey:'overlay.queue.param_stateBgColor', icon:'color'};
            this.param_statePausedBgOpacity[id] = {type:'slider', value:q.overlayParams?.statePausedBgOpacity ?? q.overlayParams?.stateBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_stateRunningFont[id] = {type:'font', value:q.overlayParams?.stateRunningFont ?? q.overlayParams?.stateFont ?? 'Roboto', labelKey:'overlay.queue.param_stateFont', icon:'font'};
            this.param_stateRunningSize[id] = {type:'number', value:q.overlayParams?.stateRunningSize ?? q.overlayParams?.stateSize ?? 30, labelKey:'overlay.queue.param_stateSize', icon:'fontSize', min:10, max:150};
            this.param_stateRunningColor[id] = {type:'color', value:q.overlayParams?.stateRunningColor ?? q.overlayParams?.stateColor ?? '#ffffff', labelKey:'overlay.queue.param_stateColor', icon:'color'};
            this.param_stateRunningBgColor[id] = {type:'color', value:q.overlayParams?.stateRunningBgColor ?? q.overlayParams?.stateBgColor ?? '#000000', labelKey:'overlay.queue.param_stateBgColor', icon:'color'};
            this.param_stateRunningBgOpacity[id] = {type:'slider', value:q.overlayParams?.stateRunningBgOpacity ?? q.overlayParams?.stateBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_titleBgColor[id] = {type:'color', value:q.overlayParams?.titleBgColor ?? '#000000', labelKey:'overlay.queue.param_bgColor', icon:'color'};
            this.param_titleBgOpacity[id] = {type:'slider', value:q.overlayParams?.titleBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_subTitleBgColor[id] = {type:'color', value:q.overlayParams?.subTitleBgColor ?? '#000000', labelKey:'overlay.queue.param_bgColor', icon:'color'};
            this.param_subTitleBgOpacity[id] = {type:'slider', value:q.overlayParams?.subTitleBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_queueBgColor[id] = {type:'color', value:q.overlayParams?.queueBgColor ?? '#000000', labelKey:'overlay.queue.param_bgColor', icon:'color'};
            this.param_queueBgOpacity[id] = {type:'slider', value:q.overlayParams?.queueBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_progressBgColor[id] = {type:'color', value:q.overlayParams?.progressBgColor ?? '#000000', labelKey:'overlay.queue.param_bgColor', icon:'color'};
            this.param_progressBgOpacity[id] = {type:'slider', value:q.overlayParams?.progressBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.param_stateBgColor[id] = {type:'color', value:q.overlayParams?.stateBgColor ?? '#000000', labelKey:'overlay.queue.param_bgColor', icon:'color'};
            this.param_stateBgOpacity[id] = {type:'slider', value:q.overlayParams?.stateBgOpacity ?? 80, min:0, max:100, labelKey:'overlay.queue.param_bgOpacity', icon:'percent'};
            this.sectionsOrder[id] = q.overlayParams?.sectionsOrder || ['title', 'subtitle', 'state', 'queue', 'progress'];
        });
    }
    public save(entry:TwitchatDataTypes.QueueData):void {
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(entry.id);
    }

    public saveSectionsOrder(entry:TwitchatDataTypes.QueueData):void {
        if(!entry.overlayParams) entry.overlayParams = {} as any;
        // Mettre à jour directement dans l'objet entry
        entry.overlayParams!.sectionsOrder = [...this.sectionsOrder[entry.id]];
        this.save(entry);
    }

    public openQueueParams():void {
        this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.QUEUES);
    }


    private getFakeUser(entry:TwitchatDataTypes.QueueData):TwitchatDataTypes.TwitchatUser {
        const id = 'queue_test_' + entry.id;
        const user = this.$store.users.getUserFrom('twitch', this.$store.auth.twitch.user.id, id, 'testuser', 'TestUser');
        // Add a placeholder avatar for the test user
        user.avatarPath = 'https://static-cdn.jtvnw.net/user-default-pictures-uv/41780b5a-def8-11e9-94d9-784f43822e80-profile_image-300x300.png';
        // Ensure the test user is not marked as blocked or errored
        user.is_blocked = false;
        user.errored = false;
        // Force proper display names to avoid API lookup issues
        user.login = 'testuser';
        user.displayNameOriginal = 'TestUser';
        return user;
    }

    public testAdd(entry:TwitchatDataTypes.QueueData):void {
        const user = this.getFakeUser(entry);
        this.$store.queue.addViewer(entry.id, user);
    }

    public testMove(entry:TwitchatDataTypes.QueueData):void {
        const id = 'queue_test_' + entry.id;
        this.$store.queue.moveToInProgress(entry.id, id);
    }

    public testRemove(entry:TwitchatDataTypes.QueueData):void {
        const id = 'queue_test_' + entry.id;
        this.$store.queue.removeViewerFromQueue(entry.id, id);
    }

    public testRemoveProg(entry:TwitchatDataTypes.QueueData):void {
        const id = 'queue_test_' + entry.id;
        this.$store.queue.removeViewerFromInProgress(entry.id, id);
    }
}
export default toNative(OverlayParamsQueue);
</script>

<style scoped lang="less">
.overlayparamsqueue{
    .queueList{display:flex;flex-direction:column;gap:.5em;}
    .placement{display:flex;flex-direction:column;align-items:center;}
    
    .simulate {
        display: flex;
        gap: .5em;
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .install {
        gap: .5em;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        .icon {
            height: 1em;
        }
        label {
            gap: .5em;
            display: flex;
            flex-direction: row;
            align-items: center;
        }
    }
    
    .themeBlock {
        margin: 1em 0;
        gap: .25em;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        &>.font {
            flex-grow: 10;
            gap: .25em;
            display: flex;
            flex-direction: column;
            flex-basis: 200px;
            &>* {
                flex-grow: 1;
            }
            // Override the default form gap for paramitems
            :deep(.paramitem:not(:first-child)) {
                margin-top: 0.25em;
            }
        }
        &>.colors {
            flex-grow: 1;
            gap: .25em;
            display: flex;
            flex-direction: column;
            flex-basis: 200px;
            &>* {
                flex-grow: 1;
            }
            // Override the default form gap for paramitems
            :deep(.paramitem:not(:first-child)) {
                margin-top: 0.1em;
            }
        }
    }
    
    strong {
        display: block;
        margin-bottom: .5em;
        text-align: center;
    }
    
    .card-item {
        & + .card-item {
            margin-top: 1em;
        }
    }
    
    .sectionsOrder {
        display: flex;
        flex-direction: column;
        gap: .5em;
        
        label {
            font-size: 1em;
            margin-bottom: .5em;
        }
        
        .sectionsList {
            display: flex;
            flex-direction: column;
            gap: .25em;
            
            .sectionItem {
                display: flex;
                align-items: center;
                gap: .5em;
                padding: .5em;
                background-color: var(--color-dark-fadest);
                border-radius: var(--border-radius);
                cursor: move;
                transition: all .2s;
                
                &:hover {
                    background-color: var(--color-dark-fader);
                }
                
                .icon {
                    width: 1em;
                    height: 1em;
                    opacity: .5;
                }
                
                span {
                    flex: 1;
                }
            }
        }
    }
    .cssHead {
        margin-bottom: 1em;
        text-align: center;
        opacity: .8;
    }
}
</style>
