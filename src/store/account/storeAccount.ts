import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import { defineStore } from 'pinia'

export const storeAccount = defineStore('account', {
	state: () => ({
		syncDataWithServer: { type:"toggle", value:false, label:"Sync parameters to server", id:401 },
		publicDonation: { type:"toggle", value:false, label:"Make my donation public", id:402 },
	} as TwitchatDataTypes.IAccountParamsCategory),



	getters: {
	},



	actions: {
	},
})