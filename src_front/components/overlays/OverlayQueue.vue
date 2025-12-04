<template>
        <div class="overlayqueue" :class="['position-'+position]">
                <template v-for="section in sectionsOrder" :key="section">
                        <div v-if="section === 'title' && title" class="title section queue-title" :style="titleStyles">{{ title }}</div>
                        <div v-else-if="section === 'subtitle' && subTitle" class="subtitle section queue-subtitle" :style="subTitleStyles">{{ subTitle }}</div>
                        <div v-else-if="section === 'state' && ((paused && statePaused && showPausedState) || (!paused && stateRunning && showRunningState))" class="state section queue-state" :class="{'state-paused': paused, 'state-running': !paused}" :style="stateStyles">{{ paused? statePaused : stateRunning }}</div>
                        
                        <template v-else-if="section === 'progress' && showInProgress && inProgress.length">
                                <transition name="fade">
                                        <div class="inprogress section queue-inprogress" v-if="rotateDelay==0 || currentView=='progress'" :style="{backgroundColor: hexToRgba(progressBgColor, progressBgOpacity/100)}">
                                                <div class="sectionTitle progress-title" :style="queueLabelStyles">{{ progressLabel }}</div>
                                                <TransitionGroup name="list" tag="div" class="progress-list">
                                                        <div v-for="e in inProgress" :key="e.user.id" class="entry progress-entry" :style="progressEntryStyles">
                                                                <img :src="e.user.avatarPath" class="avatar progress-avatar" :style="{height: progressEntrySize+'px'}" />
                                                                <span class="name progress-name">{{e.user.displayName}}</span>
                                                        </div>
                                                </TransitionGroup>
                                        </div>
                                </transition>
                        </template>
                        
                        <template v-else-if="section === 'queue'">
                                <transition name="fade">
                                        <div class="queue section queue-section" v-if="rotateDelay==0 || currentView=='queue'" :style="{backgroundColor: hexToRgba(queueBgColor, queueBgOpacity/100)}">
                                                <div class="sectionTitle queue-label" :style="queueLabelStyles">{{ queueLabel }}</div>
                                                <TransitionGroup name="list" tag="div" class="queue-list">
                                                        <div v-for="e in entries" :key="e.user.id" class="entry queue-entry" :style="queueEntryStyles">
                                                                <img :src="e.user.avatarPath" class="avatar queue-avatar" :style="{height: queueEntrySize+'px'}" />
                                                                <span class="name queue-name">{{e.user.displayName}}</span>
                                                        </div>
                                                </TransitionGroup>
                                                <div v-if="entries.length === 0 && showEmptyQueueMessage" class="empty queue-empty" :style="emptyQueueStyles">
                                                        {{ emptyQueueMessage || $t('overlay.queue.empty') }}
                                                </div>
                                        </div>
                                </transition>
                        </template>
                </template>
        </div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TransitionGroup } from 'vue';

@Component({
        components:{
                TransitionGroup
        }
})
class OverlayQueue extends AbstractOverlay {
        public entries:TwitchatDataTypes.QueueEntry[] = [];
        public inProgress:TwitchatDataTypes.QueueEntry[] = [];
        public showInProgress:boolean = true;
        public rotateDelay:number = 0;
        public position:TwitchatDataTypes.ScreenPosition = 'bl';
        public titleFont:string = 'Roboto';
        public titleSize:number = 30;
        public titleColor:string = '#ffffff';
        public titleBgColor:string = '#000000';
        public titleBgOpacity:number = 80;
        public subTitleFont:string = 'Roboto';
        public subTitleSize:number = 30;
        public subTitleColor:string = '#ffffff';
        public subTitleBgColor:string = '#000000';
        public subTitleBgOpacity:number = 80;
        public queueLabelFont:string = 'Roboto';
        public queueLabelSize:number = 30;
        public queueLabelColor:string = '#ffffff';
        public queueBgColor:string = '#000000';
        public queueBgOpacity:number = 80;
        public queueEntryFont:string = 'Roboto';
        public queueEntrySize:number = 30;
        public queueEntryColor:string = '#ffffff';
        public queueEntryBgColor:string = '#000000';
        public queueEntryBgOpacity:number = 0;
        public progressEntryFont:string = 'Roboto';
        public progressEntrySize:number = 30;
        public progressEntryColor:string = '#ffffff';
        public progressBgColor:string = '#000000';
        public progressBgOpacity:number = 80;
        public stateFont:string = 'Roboto';
        public stateSize:number = 30;
        public stateColor:string = '#ffffff';
        public stateBgColor:string = '#000000';
        public stateBgOpacity:number = 80;
        public statePausedFont:string = 'Roboto';
        public statePausedSize:number = 30;
        public statePausedColor:string = '#ffffff';
        public statePausedBgColor:string = '#000000';
        public statePausedBgOpacity:number = 80;
        public stateRunningFont:string = 'Roboto';
        public stateRunningSize:number = 30;
        public stateRunningColor:string = '#ffffff';
        public stateRunningBgColor:string = '#000000';
        public stateRunningBgOpacity:number = 80;
        public title:string = '';
        public subTitle:string = '';
        public queueLabel:string = '';
        public progressLabel:string = '';
        public paused:boolean = false;
        public currentView:'queue'|'progress' = 'queue';
        public showEmptyQueueMessage:boolean = true;
        public emptyQueueMessage:string = '';
        public emptyQueueFont:string = 'Roboto';
        public emptyQueueSize:number = 30;
        public emptyQueueColor:string = '#ffffff';
        public emptyQueueBgColor:string = '#000000';
        public emptyQueueBgOpacity:number = 0;
        public statePaused:string = '';
        public stateRunning:string = '';
        public showPausedState:boolean = true;
        public showRunningState:boolean = true;
        public sectionsOrder:string[] = ['title', 'subtitle', 'state', 'queue', 'progress'];

        public get titleStyles():Record<string,string>{
                const opacity = this.titleBgOpacity / 100;
                const bgColor = this.hexToRgba(this.titleBgColor, opacity);
                return {fontFamily:this.titleFont, fontSize:this.titleSize+'px', color:this.titleColor, backgroundColor:bgColor};
        }
        public get subTitleStyles():Record<string,string>{
                const opacity = this.subTitleBgOpacity / 100;
                const bgColor = this.hexToRgba(this.subTitleBgColor, opacity);
                return {fontFamily:this.subTitleFont, fontSize:this.subTitleSize+'px', color:this.subTitleColor, backgroundColor:bgColor};
        }
        public get queueLabelStyles():Record<string,string>{
                const opacity = this.queueBgOpacity / 100;
                const bgColor = this.hexToRgba(this.queueBgColor, opacity);
                return {fontFamily:this.queueLabelFont, fontSize:this.queueLabelSize+'px', color:this.queueLabelColor, backgroundColor:bgColor};
        }
        public get queueEntryStyles():Record<string,string>{
                const opacity = this.queueEntryBgOpacity / 100;
                const bgColor = this.hexToRgba(this.queueEntryBgColor, opacity);
                return {fontFamily:this.queueEntryFont, fontSize:this.queueEntrySize+'px', color:this.queueEntryColor, backgroundColor:bgColor};
        }
        public get progressEntryStyles():Record<string,string>{
                return {fontFamily:this.progressEntryFont, fontSize:this.progressEntrySize+'px', color:this.progressEntryColor};
        }
        public get stateStyles():Record<string,string>{
                if(this.paused) {
                        const opacity = this.statePausedBgOpacity / 100;
                        const bgColor = this.hexToRgba(this.statePausedBgColor, opacity);
                        return {fontFamily:this.statePausedFont, fontSize:this.statePausedSize+'px', color:this.statePausedColor, backgroundColor:bgColor};
                } else {
                        const opacity = this.stateRunningBgOpacity / 100;
                        const bgColor = this.hexToRgba(this.stateRunningBgColor, opacity);
                        return {fontFamily:this.stateRunningFont, fontSize:this.stateRunningSize+'px', color:this.stateRunningColor, backgroundColor:bgColor};
                }
        }
        public get emptyQueueStyles():Record<string,string>{
                const opacity = this.emptyQueueBgOpacity / 100;
                const bgColor = this.hexToRgba(this.emptyQueueBgColor, opacity);
                return {fontFamily:this.emptyQueueFont, fontSize:this.emptyQueueSize+'px', color:this.emptyQueueColor, backgroundColor:bgColor};
        }

        
        public get hasContent():boolean { 
                return this.entries.length > 0 || this.inProgress.length > 0;
        }

        private rotationTimer:number|undefined;
        private overlayId:string = "";

        private updateHandler!:(e:TwitchatEvent)=>void;

        public mounted():void {
                this.overlayId = this.$route.query.twitchat_overlay_id as string || "";
                this.updateHandler = e=>this.onUpdate(e);
                PublicAPI.instance.addEventListener(TwitchatEvent.QUEUE_STATE, this.updateHandler);
                this.requestInfo();
        }
        public beforeUnmount():void {
                super.beforeUnmount();
                PublicAPI.instance.removeEventListener(TwitchatEvent.QUEUE_STATE, this.updateHandler);
                if(this.rotationTimer) window.clearInterval(this.rotationTimer);
        }

        public requestInfo():void {
                PublicAPI.instance.broadcast(TwitchatEvent.GET_QUEUE_STATE, {id: this.overlayId});
        }

        public onUpdate(e:TwitchatEvent):void {
                const data = e.data as unknown as TwitchatDataTypes.QueueData;
                if(!data) return;
                // Only process updates for our specific queue ID
                if(this.overlayId && data.id !== this.overlayId) return;
                this.entries = data.entries;
                this.inProgress = data.inProgress || [];
                this.showInProgress = data.overlayParams?.showInProgress !== false;
                this.rotateDelay = data.overlayParams?.rotateDelay || 0;
                this.position = data.overlayParams?.position || 'bl';
                this.titleFont = data.overlayParams?.titleFont || 'Roboto';
                this.titleSize = data.overlayParams?.titleSize || 30;
                this.titleColor = data.overlayParams?.titleColor || '#ffffff';
                this.subTitleFont = data.overlayParams?.subTitleFont || 'Roboto';
                this.subTitleSize = data.overlayParams?.subTitleSize || 30;
                this.subTitleColor = data.overlayParams?.subTitleColor || '#ffffff';
                this.queueLabelFont = data.overlayParams?.queueLabelFont || 'Roboto';
                this.queueLabelSize = data.overlayParams?.queueLabelSize || 30;
                this.queueLabelColor = data.overlayParams?.queueLabelColor || '#ffffff';
                this.queueEntryFont = data.overlayParams?.queueEntryFont || 'Roboto';
                this.queueEntrySize = data.overlayParams?.queueEntrySize || 30;
                this.queueEntryColor = data.overlayParams?.queueEntryColor || '#ffffff';
                this.queueEntryBgColor = data.overlayParams?.queueEntryBgColor || '#000000';
                this.queueEntryBgOpacity = data.overlayParams?.queueEntryBgOpacity ?? 0;
                this.progressEntryFont = data.overlayParams?.progressEntryFont || 'Roboto';
                this.progressEntrySize = data.overlayParams?.progressEntrySize || 30;
                this.progressEntryColor = data.overlayParams?.progressEntryColor || '#ffffff';
                this.stateFont = data.overlayParams?.stateFont || 'Roboto';
                this.stateSize = data.overlayParams?.stateSize || 30;
                this.stateColor = data.overlayParams?.stateColor || '#ffffff';
                this.statePausedFont = data.overlayParams?.statePausedFont || data.overlayParams?.stateFont || 'Roboto';
                this.statePausedSize = data.overlayParams?.statePausedSize || data.overlayParams?.stateSize || 30;
                this.statePausedColor = data.overlayParams?.statePausedColor || data.overlayParams?.stateColor || '#ffffff';
                this.statePausedBgColor = data.overlayParams?.statePausedBgColor || data.overlayParams?.stateBgColor || '#000000';
                this.statePausedBgOpacity = data.overlayParams?.statePausedBgOpacity ?? data.overlayParams?.stateBgOpacity ?? 80;
                this.stateRunningFont = data.overlayParams?.stateRunningFont || data.overlayParams?.stateFont || 'Roboto';
                this.stateRunningSize = data.overlayParams?.stateRunningSize || data.overlayParams?.stateSize || 30;
                this.stateRunningColor = data.overlayParams?.stateRunningColor || data.overlayParams?.stateColor || '#ffffff';
                this.stateRunningBgColor = data.overlayParams?.stateRunningBgColor || data.overlayParams?.stateBgColor || '#000000';
                this.stateRunningBgOpacity = data.overlayParams?.stateRunningBgOpacity ?? data.overlayParams?.stateBgOpacity ?? 80;
                this.title = data.overlayParams?.title || '';
                this.subTitle = data.overlayParams?.subTitle || '';
                this.queueLabel = data.overlayParams?.queueLabel || 'Queue';
                this.progressLabel = data.overlayParams?.progressLabel || 'In progress';
                this.showEmptyQueueMessage = data.overlayParams?.showEmptyQueueMessage !== false;
                this.emptyQueueMessage = data.overlayParams?.emptyQueueMessage || '';
                this.emptyQueueFont = data.overlayParams?.emptyQueueFont || 'Roboto';
                this.emptyQueueSize = data.overlayParams?.emptyQueueSize || 30;
                this.emptyQueueColor = data.overlayParams?.emptyQueueColor || '#ffffff';
                this.emptyQueueBgColor = data.overlayParams?.emptyQueueBgColor || '#000000';
                this.emptyQueueBgOpacity = data.overlayParams?.emptyQueueBgOpacity ?? 0;
                this.statePaused = data.overlayParams?.statePaused || this.$t('overlay.queue.state_paused') as string;
                this.stateRunning = data.overlayParams?.stateRunning || this.$t('overlay.queue.state_running') as string;
                this.showPausedState = data.overlayParams?.showPausedState !== false;
                this.showRunningState = data.overlayParams?.showRunningState !== false;
                this.sectionsOrder = data.overlayParams?.sectionsOrder || ['title', 'subtitle', 'state', 'queue', 'progress'];
                this.titleBgColor = data.overlayParams?.titleBgColor || '#000000';
                this.titleBgOpacity = data.overlayParams?.titleBgOpacity ?? 80;
                this.subTitleBgColor = data.overlayParams?.subTitleBgColor || '#000000';
                this.subTitleBgOpacity = data.overlayParams?.subTitleBgOpacity ?? 80;
                this.queueBgColor = data.overlayParams?.queueBgColor || '#000000';
                this.queueBgOpacity = data.overlayParams?.queueBgOpacity ?? 80;
                this.progressBgColor = data.overlayParams?.progressBgColor || '#000000';
                this.progressBgOpacity = data.overlayParams?.progressBgOpacity ?? 80;
                this.stateBgColor = data.overlayParams?.stateBgColor || '#000000';
                this.stateBgOpacity = data.overlayParams?.stateBgOpacity ?? 80;
                this.paused = data.paused;
                this.startRotation();
        }

        private startRotation():void {
                if(this.rotationTimer) window.clearInterval(this.rotationTimer);
                if(this.rotateDelay > 0 && this.showInProgress && this.inProgress.length>0){
                        this.currentView = 'queue';
                        this.rotationTimer = window.setInterval(()=>{
                                this.currentView = this.currentView === 'queue'? 'progress' : 'queue';
                        }, this.rotateDelay*1000);
                }else{
                        this.currentView = 'queue';
                }
        }

        public hexToRgba(hex:string, opacity:number):string {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                if(!result) return `rgba(0,0,0,${opacity})`;
                const r = parseInt(result[1], 16);
                const g = parseInt(result[2], 16);
                const b = parseInt(result[3], 16);
                return `rgba(${r},${g},${b},${opacity})`;
        }
}
export default toNative(OverlayQueue);
</script>

<style scoped lang="less">
.overlayqueue {
        position:absolute;
        background-color: var(--color-light);
        color: var(--color-dark);
        border-radius: var(--border-radius);
        box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
        text-align:left;
        font-family: var(--font-roboto);
        transition: all .3s;
        min-width: 200px;
        overflow: hidden;
        .section {
                padding: .5em 1em;
                transition: background-color .3s;
        }
        .title{
                font-weight:bold;
        }
        .subtitle{
                font-size:.8em;
                opacity:.8;
        }
        .state{
                font-size:.8em;
                opacity:.9;
        }
        .sectionTitle{
                font-weight:bold;
                margin-bottom:.25em;
        }
}
.entry{
        margin:2px 0;
        display:flex;
        align-items:center;
        gap:0.5em;
        padding: .25em .5em;
        background-color: var(--color-dark-fadest);
        border-radius: calc(var(--border-radius) * .5);
        transition: all .2s;
        
        &:hover {
                background-color: var(--color-dark-fader);
                transform: translateX(5px);
        }
        
        .avatar{
                border-radius:50%;
                width:auto;
                object-fit:cover;
                aspect-ratio:1;
                box-shadow: 0 0 .25em rgba(0, 0, 0, .3);
        }
        .name{
                flex:1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }
}
.inprogress, .queue {
        &:last-child {
                padding-bottom: 1em;
        }
}

.queue, .inprogress {
        &.fade-enter-active, &.fade-leave-active {
                transition: opacity .5s;
        }
        &.fade-enter-from, &.fade-leave-to {
                opacity: 0;
        }
}


// Classes de positionnement
@margin: 2vh;

&.position-tl{
        top:@margin;
        left:@margin;
}
&.position-t{
        top:@margin;
        left:50%;
        transform:translateX(-50%);
}
&.position-tr{
        top:@margin;
        right:@margin;
}
&.position-l{
        top:50%;
        left:@margin;
        transform:translateY(-50%);
}
&.position-m{
        top:50%;
        left:50%;
        transform:translate(-50%,-50%);
}
&.position-r{
        top:50%;
        right:@margin;
        transform:translateY(-50%);
}
&.position-bl{
        bottom:@margin;
        left:@margin;
}
&.position-b{
        bottom:@margin;
        left:50%;
        transform:translateX(-50%);
}
&.position-br{
        bottom:@margin;
        right:@margin;
}

// Animations de liste
.list-move,
.list-enter-active,
.list-leave-active {
        transition: all 0.5s ease;
}

.list-enter-from {
        opacity: 0;
        transform: translateX(-30px);
}

.list-leave-to {
        opacity: 0;
        transform: translateX(30px);
}

.list-leave-active {
        position: absolute;
        width: 100%;
}

.empty {
        opacity: 0.6;
        font-style: italic;
        padding: .5em;
        text-align: center;
}
</style>
