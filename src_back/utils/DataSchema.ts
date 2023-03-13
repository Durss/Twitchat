import Ajv from "ajv";


/**
 * Data schema to make sure people don't send random or invalid data to the server
 */
 const UserDataSchema = {
	$id: "http://twitchat.fr/schemas/defs.json",
	definitions: {
		permissions: {
			type:"object",
			additionalProperties: false,
			properties: {
				broadcaster: {type:"boolean"},
				mods: {type:"boolean"},
				vips: {type:"boolean"},
				subs: {type:"boolean"},
				follower: {type:"boolean"},
				follower_duration_ms: {type:"number", minimum:0, maximum:100 * 365 * 24 * 60 * 60 * 1000},
				all: {type:"boolean"},
				usersAllowed: {
					type:"array",
					maxItems:10000,
					items:[{type:"string", maxLength:40}],
				},
				usersRefused: {
					type:"array",
					maxItems:10000,
					items:[{type:"string", maxLength:40}],
				},
				users: {type:"string", maxLength:1000000},//Keep it a little, remove it once most of the users have migrated their data
			}
		}
	},

	type:"object",
	additionalProperties: false,
	properties:{
		obsConnectionEnabled: {type:"boolean"},
		obsConf_muteUnmute: {
			type:"object",
			properties: {
				audioSourceName:{type:"string", maxLength:500},
				muteCommand:{type:"string", maxLength:500},
				unmuteCommand:{type:"string", maxLength:500},
			}
		},
		obsConf_permissions: { $ref: "defs.json#/definitions/permissions" },
		obsConf_scenes: {
			type:"array",
			maxItems:10000,
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties:{
						scene: 
						{
							type:"object",
							additionalProperties: false,
							properties:{
								sceneIndex:{type:"integer"},
								sceneName:{type:"string", maxLength:100},
							}
						},
						command:{type:"string", maxLength:100},
					}
				}
			]
		},
		triggers: {
			type:["object"],
			additionalProperties: true,
			patternProperties: {
				".*": {
					type: "object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						name: {type:"string", maxLength:100},
						queue: {type:"string", maxLength:100},
						chatCommand: {type:"string", maxLength:100},//Deprecated
						scheduleParams: {
							type:"object",
							properties: {
								type: {type:"string", maxLength:10},
								repeatDuration: {type:"number", minimum:0, maximum:48*60},
								repeatMinMessages: {type:"number", minimum:0, maximum:9999},
								dates:{
									type:"array",
									maxItems:10000,
									items: [
										{
											type: "object",
											additionalProperties: false,
											properties: {
												daily: {type:"boolean"},
												yearly: {type:"boolean"},
												value: {type:"string", maxLength:20},
											}
										}
									]
								}
							}
						},
						permissions: { $ref: "defs.json#/definitions/permissions" },
						cooldown: {
							type:"object",
							properties: {
								global: {type:"number", minimum:0, maximum:60*60*12},
								user: {type:"number", minimum:0, maximum:60*60*12},
								alert: {type:"boolean"},
							}
						},
						actions:{
							type:"array",
							maxItems:100,
							items: [
								{
									type: "object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:100},
										sourceName: {type:"string", maxLength:100},
										show: {
											anyOf:[
												{type:"string", maxLength:20},
												{type:"boolean"},
											]
										},
										delay: {type:"number"},
										filterName: {type:"string", maxLength:100},
										text: {type:"string", maxLength:500},
										url: {type:"string", maxLength:1000},
										mediaPath: {type:"string", maxLength:1000},
										type: {type:"string", maxLength:50},
										musicAction: {type:"string", maxLength:3},
										track: {type:"string", maxLength:500},
										confirmMessage: {type:"string", maxLength:500},
										playlist: {type:"string", maxLength:500},
										voiceID: {type:"string", maxLength:100},
										triggerKey: {type:"string", maxLength:100},
										method: {type:"string", maxLength:10},
										addValue: {type:"string", maxLength:100},
										counter: {type:"string", maxLength:40},
										placeholder:{type:"string", maxLength:20},
										min: {type:"number", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
										max: {type:"number", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
										float: {type:"boolean"},
										mode: {type:"string", maxLength:20},
										title: {type:"string", maxLength:20},
										categoryId: {type:"string", maxLength:30},
										tags: {
											type:"array",
											maxItems:20,
											items:[{type:"string", maxLength:10}],
										},
										list: {
											type:"array",
											maxItems:10000,
											items:[{type:"string", maxLength:500}],
										},
										counters: {
											type:"array",
											maxItems:100,
											items:[{type:"string", maxLength:40}],
										},
										queryParams: {
											type:"array",
											maxItems:100,
											items:[{type:"string", maxLength:50}],
										},
										raffleData: {
											type: "object",
											additionalProperties: false,
											properties: {
												mode: {type:"string", maxLength:20},
												command: {type:"string", maxLength:100},
												duration_s: {type:"number", minimum:0, maximum:120 * 60000},
												maxEntries: {type:"number", minimum:0, maximum:1000000},
												created_at: {type:"number", minimum:0, maximum:9999999999999},
												entries: {
													type:"array",
													maxItems:10000,
													items: [
														{
															type: "object",
															additionalProperties: false,
															properties: {
																id:{type:"string", maxLength:100},
																label:{type:"string", maxLength:200},
																score:{type:"number", minimum:0, maximum:100},
															}
														}
													]
												},
												followRatio: {type:"number", minimum:0, maximum:100},
												vipRatio: {type:"number", minimum:0, maximum:100},
												subRatio: {type:"number", minimum:0, maximum:100},
												subgiftRatio: {type:"number", minimum:0, maximum:100},
												subMode_includeGifters: {type:"boolean"},
												subMode_excludeGifted: {type:"boolean"},
												showCountdownOverlay: {type:"boolean"},
												customEntries: {type:"string", maxLength:1000000},
											},
										},
										bingoData: {
											type: "object",
											additionalProperties: false,
											properties: {
												guessNumber: {type:"boolean"},
												guessEmote: {type:"boolean"},
												guessCustom: {type:"boolean"},
												min: {type:"number", minimum:0, maximum:999999999},
												max: {type:"number", minimum:0, maximum:999999999},
												customValue: {type:"string", maxLength:1000000},
											}
										},
										pollData: {
											type: "object",
											additionalProperties: false,
											properties: {
												pointsPerVote: {type:"number", minimum:0, maximum:999999999},
												voteDuration: {type:"number", minimum:0, maximum:999999999},
												title: {type:"string", maxLength:60},
												answers: {
													type:"array",
													maxItems:50,
													items:[{type:"string", maxLength:25}],
												},
											}
										},
										predictionData: {
											type: "object",
											additionalProperties: false,
											properties: {
												voteDuration: {type:"number", minimum:0, maximum:999999999},
												title: {type:"string", maxLength:60},
												answers: {
													type:"array",
													maxItems:50,
													items:[{type:"string", maxLength:25}],
												},
											}
										}
									}
								},
							]
						}
					}
				},
			}
		},
		botMessages: {
			type:"object",
			additionalProperties: false,
			properties: {
				raffleStart: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
				raffleJoin: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
				raffle: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
				bingoStart: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
				bingo: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
				shoutout: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
				twitchatAd: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
				chatSuggStart: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:500},
					}
				},
			}
		},
		voiceActions: {
			type:"array",
			maxItems:1000,
			items: [
				{
					type: "object",
					additionalProperties: false,
					properties: {
						id: {type:"string", maxLength:100},
						sentences: {type:"string", maxLength:1000000},
					}
				},
			]
		},
		voiceLang: {type:"string", maxLength:20},
		streamInfoPresets:{
			type:"array",
			maxItems:1000,
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties:{
						name:{type:"string", maxLength:50},
						id:{type:"string", maxLength:10},
						title:{type:"string", maxLength:200},
						categoryID:{type:"string", maxLength:10},
						tags:{
							type:"array",
							maxItems:30,
							items:[{type:"string", maxLength:100}],
						},
					}
				}
			]
		},
		"p:bttvEmotes": {type:"boolean"},
		"p:ffzEmotes": {type:"boolean"},
		"p:sevenTVEmotes": {type:"boolean"},
		"p:conversationsEnabled": {type:"boolean"},
		"p:defaultSize": {type:"integer", minimum:0, maximum:5},
		"p:displayTime": {type:"boolean"},
		"p:displayTimeRelative": {type:"boolean"},
		"p:dyslexicFont": {type:"boolean"},
		"p:firstMessage": {type:"boolean"},
		"p:firstUserBadge": {type:"boolean"},
		"p:groupIdenticalMessage": {type:"boolean"},
		"p:highlightMentions": {type:"boolean"},
		"p:highlightMods": {type:"boolean"},
		"p:highlightNonFollowers": {type:"boolean"},
		"p:highlightSubs": {type:"boolean"},
		"p:highlightVips": {type:"boolean"},
		"p:highlightPartners": {type:"boolean"},
		"p:lockAutoScroll": {type:"boolean"},
		"p:liveMessages": {type:"boolean"},
		"p:liveAlerts": {type:"boolean"},
		"p:markAsRead": {type:"boolean"},
		"p:minimalistBadges": {type:"boolean"},
		"p:raidHighlightUser": {type:"boolean"},
		"p:raffleHighlightUser": {type:"boolean"},
		"p:showBadges": {type:"boolean"},
		"p:showEmotes": {type:"boolean"},
		"p:showModTools": {type:"boolean"},
		"p:splitViewVertical": {type:"boolean"},
		"p:showUserPronouns": {type:"boolean"},
		"p:showViewersCount": {type:"boolean"},
		"p:offlineEmoteOnly": {type:"boolean"},
		"p:stopStreamOnRaid": {type:"boolean"},
		"p:userHistoryEnabled": {type:"boolean"},
		"p:translateNames": {type:"boolean"},
		"p:spoilersEnabled": {type:"boolean"},
		"p:alertMode": {type:"boolean"},
		"p:chatShoutout": {type:"boolean"},
		"p:hideUsers": {type:"string"},//Keep it a little, remove it once most of the users have migrated their data
		"p:censorDeletedMessages": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showSelf": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:blockedCommands": {type:"string"},//Keep it a little, remove it once most of the users have migrated their data
		"p:ignoreListCommands": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:ignoreCommands": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showSlashMe": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showBots": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:keepDeletedMessages": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:firstTimeMessage": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:keepHighlightMyMessages": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:historySize": {type:"integer", minimum:50, maximum:500},//Keep it a little, remove it once most of the users have migrated their data
		"p:notifyJoinLeave": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:raidStreamInfo": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:receiveWhispers": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showWhispersOnChat": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showCheers": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showFollow": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showHypeTrain": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showNotifications": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showRaids": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showRewards": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showRewardsInfos": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:showSubs": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:splitView": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:splitViewSwitch": {type:"boolean"},//Keep it a little, remove it once most of the users have migrated their data
		"p:emergencyButton": {type:"boolean"},//Keep it a little to avoid loosing data, remove it later
		leftColSize: {type:"number"},//Keep it a little to avoid loosing data, remove it later
		activityFeedFilters: {//Keep it a little to avoid loosing data, remove it later
			type:"object",
			additionalProperties: false,
			properties: {
				sub:{
					type:"boolean",
				},
				follow:{
					type:"boolean",
				},
				bits:{
					type:"boolean",
				},
				raid:{
					type:"boolean",
				},
				rewards:{
					type:"boolean",
				},
				poll:{
					type:"boolean",
				},
				prediction:{
					type:"boolean",
				},
				bingo:{
					type:"boolean",
				},
				raffle:{
					type:"boolean",
				}
			}
		},
		v: {type:"integer"},
		collapseParamAdInfo: {type:"boolean"},
		lang: {type:"string", maxLength:4},
		obsIP: {type:"string", maxLength:20},
		obsPort: {type:"integer"},
		updateIndex: {type:"integer"},
		raffle_message: {type:"string", maxLength:500},
		raffle_messageEnabled: {type:"boolean"},
		bingo_message: {type:"string", maxLength:500},
		bingo_messageEnabled: {type:"boolean"},
		greetScrollDownAuto: {type:"boolean"},
		greetAutoDeleteAfter: {type:"integer", minimum:-1, maximum:3600},
		devmode: {type:"boolean"},
		greetHeight: {type:"number"},
		adNextTS: {type:"number"},
		adWarned: {type:"boolean"},
		sponsorPublicPrompt: {type:"boolean"},
		cypherKey: {type:"string", maxLength:500},
		raffle_showCountdownOverlay: {type:"boolean"},
		donorLevel: {type:"number", minimum:-1, maximum:10},
		ttsParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				volume: {type:"number", minimum:0, maximum:1},
				rate: {type:"number", minimum:0.1, maximum:10},
				pitch: {type:"number", minimum:0, maximum:2},
				maxLength: {type:"integer", minimum:0, maximum:500},
				maxDuration: {type:"integer", minimum:0, maximum:120},
				timeout: {type:"integer", minimum:0, maximum:300},
				inactivityPeriod: {type:"integer", minimum:0, maximum:60},
				voice: {type:"string", maxLength:500},
				removeURL: {type:"boolean"},
				replaceURL: {type:"string", maxLength:100},
				removeEmotes: {type:"boolean"},
				readMessages:{type:"boolean"},
				readMessagePatern: {type:"string", maxLength:300},
				readWhispers:{type:"boolean"},
				readWhispersPattern: {type:"string", maxLength:300},
				readNotices:{type:"boolean"},
				readNoticesPattern: {type:"string", maxLength:300},
				readRewards: {type:"boolean"},
				readRewardsPattern: {type:"string", maxLength:300},
				readSubs: {type:"boolean"},
				readSubsPattern:{type:"string", maxLength:300},
				readSubgifts: {type:"boolean"},
				readSubgiftsPattern:{type:"string", maxLength:300},
				readBits: {type:"boolean"},
				readBitsMinAmount: {type:"number", minimum:0, maximum:1000000},
				readBitsPattern:{type:"string", maxLength:300},
				readRaids: {type:"boolean"},
				readRaidsPattern:{type:"string", maxLength:300},
				readFollow: {type:"boolean"},
				readFollowPattern:{type:"string", maxLength:300},
				readPolls: {type:"boolean"},
				readPollsPattern:{type:"string", maxLength:300},
				readPredictions: {type:"boolean"},
				readPredictionsPattern:{type:"string", maxLength:300},
				readBingos: {type:"boolean"},
				readBingosPattern:{type:"string", maxLength:300},
				readRaffle: {type:"boolean"},
				readRafflePattern:{type:"string", maxLength:300},
				readAutomod: {type:"boolean"},
				readAutomodPattern:{type:"string", maxLength:300},
				read1stMessageToday: {type:"boolean"},
				read1stMessageTodayPattern:{type:"string", maxLength:300},
				read1stTimeChatters: {type:"boolean"},
				read1stTimeChattersPattern:{type:"string", maxLength:300},
				readTimeouts: {type:"boolean"},
				readTimeoutsPattern: {type:"string", maxLength:300},
				readBans: {type:"boolean"},
				readBansPattern: {type:"string", maxLength:300},
				readUnbans: {type:"boolean"},
				readUnbansPattern: {type:"string", maxLength:300},
				readUsers:{
					type:"array",
					maxItems:10000,
					items:[{type:"string", maxLength:50}],
				},
				ttsPerms:{ $ref: "defs.json#/definitions/permissions" },
			}
		},
		emergencyParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled:{type:"boolean"},
				chatCmd:{type:"string", maxLength:100},
				chatCmdPerms:{ $ref: "defs.json#/definitions/permissions" },
				slowMode:{type:"boolean"},
				emotesOnly:{type:"boolean"},
				subOnly:{type:"boolean"},
				followOnly:{type:"boolean"},
				noTriggers:{type:"boolean"},
				followOnlyDuration:{type:"number"},
				slowModeDuration:{type:"number"},
				toUsers:{
					type:"array",
					maxItems:1000,
					items:[{type:"string", maxLength:50}],
				},
				obsScene:{type:"string", maxLength:500},
				obsSources:{
					type:"array",
					maxItems:1000,
					items:[{type:"string", maxLength:100}],
				},
				autoEnableOnFollowbot:{type:"boolean"},
				autoEnableOnShieldmode:{type:"boolean"},
				enableShieldMode:{type:"boolean"},
			}
		},
		emergencyFollowers: {
			type:"object",
			additionalProperties: false,
			properties: {
				uid:{type:"string", maxLength:50},
				login:{type:"string", maxLength:50},
				date:{type:"number"},
				blocked:{type:"boolean"},
				unblocked:{type:"boolean"},
			}
		},
		spoilerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				permissions:{ $ref: "defs.json#/definitions/permissions" },
			}
		},
		chatHighlightParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				position:{type:"string", maxLength:2},
			}
		},
		
		chatAlertParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				chatCmd:{type:"string", maxLength:100},
				message: {type:"boolean"},
				shake: {type:"boolean"},
				sound: {type:"boolean"},
				blink: {type:"boolean"},
				permissions:{ $ref: "defs.json#/definitions/permissions" },
			}
		},
		
		musicPlayerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				noScroll: {type:"boolean"},
				autoHide: {type:"boolean"},
				erase: {type:"boolean"},
				showCover: {type:"boolean"},
				showArtist: {type:"boolean"},
				showTitle: {type:"boolean"},
				showProgressbar: {type:"boolean"},
				openFromLeft: {type:"boolean"},
				customInfoTemplate: {type:"string", maxLength:1000000},
			}
		},

		voicemodParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				voiceIndicator: {type:"boolean"},
				commandToVoiceID:{
					type:"object",
					additionalProperties: true,
					patternProperties: {
						".*": {type:"string", maxLength:100},
					}
				},
				chatCmdPerms:{ $ref: "defs.json#/definitions/permissions" },
			}
		},

		automodParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				banUserNames: {type:"boolean"},
				exludedUsers: { $ref: "defs.json#/definitions/permissions" },
				keywordsFilters:{
					type:"object",
					additionalProperties: false,
					properties: {
						id: {type:"string", maxLength:36},
						label: {type:"string", maxLength:100},
						regex: {type:"string", maxLength:5000},
						enabled: {type:"boolean"},
						serverSync: {type:"boolean"},
					}
				},
			}
		},

		chatColumnsConf: {
			type:"array",
			maxItems:100,
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties: {
						id: {type:"string", maxLength:40},
						commandsBlockList: {
							type:"array",
							maxItems:10000,
							items:[{type:"string", maxLength:100}],
						},
						userBlockList: {
							type:"array",
							maxItems:10000,
							items:[{type:"string", maxLength:40}],
						},
						liveLockCount: {type:"number", minimum:0, maximum:10},
						order: {type:"number", minimum:0, maximum:1000},
						size: {type:"number", minimum:0, maximum:10},
						whispersPermissions: { $ref: "defs.json#/definitions/permissions" },
						showPanelsHere: { type:"boolean" },
						filters:{
							type:"object",
							additionalProperties: true,
							patternProperties: {
								".*": { type:"boolean" }
							}
						},
						messageFilters:{
							type:"object",
							additionalProperties: true,
							patternProperties: {
								".*": { type:"boolean" }
							}
						}
					}
				}
			]
		},

		counters: {
			type:"array",
			maxItems:10000,
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties:{
						id: {type:"string", maxLength:40},
						name: {type:"string", maxLength:50},
						value: {type:"number", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
						min: {
							anyOf:[
								{type:"number", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
								{type:"boolean"},
							]
						},
						max: {
							anyOf:[
								{type:"number", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
								{type:"boolean"},
							]
						},
						loop: {type:"boolean"},
						perUser: {type:"boolean"},
						users: {
							type:"object",
							additionalProperties: true,
							patternProperties: {
								".*": {type:"number", minimum:-Number.MAX_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
							}
						}
					}
				}
			]
		},
	}
}

const ajv = new Ajv({
	strictTuples: false,
	verbose:true,
	removeAdditional:true,
	discriminator:true,
	allErrors:true,
});
export const schemaValidator = ajv.compile( UserDataSchema );