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
				follower_duration_ms: {type:"integer", minimum:0, maximum:100 * 365 * 24 * 60 * 60 * 1000},
				all: {type:"boolean"},
				usersAllowed: {
					type:"array",
					minItems:0,
					maxItems:10000,
					items:{type:"string", maxLength:40},
				},
				usersRefused: {
					type:"array",
					minItems:0,
					maxItems:10000,
					items:{type:"string", maxLength:40},
				},
				users: {type:"string", maxLength:1000000},//Keep it a little, remove it once most of the users have migrated their data
			}
		},
		conditionGroup: {
			type:"object",
			additionalProperties: false,
			properties: {
				id: {type:"string", maxLength:50},
				type: {const:"group"},
				operator: {type:"string", maxLength:20},
				conditions:{
					type:"array",
					minItems:0,
					maxItems:200,
					items:{
						type: "object",
						if: { properties: { type: {const:"group"} } },
						then: { $ref: "#/definitions/conditionGroup" },
						else: { $ref: "#/definitions/condition" }
					}
				}
			}
		},
		condition: {
			type:"object",
			additionalProperties: false,
			properties: {
				id: {type:"string", maxLength:50},
				type: {const:"condition"},
				placeholder: {type:"string", maxLength:100},
				operator: {type:"string", maxLength:20},
				value: {
					anyOf:[
						{type:"string", maxLength:500},
						{type:"boolean"},
						{type:"number"},
					]
				},
			}
		},
		botMessage: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				allowAnon: {type:"boolean"},
				message: {type:"string", maxLength:500},
				cooldown: {type:"integer", minimum:0, maximum:3600},
			}
		},
		triggerTreeEntry: {
			type:"array",
			minItems:0,
			maxItems:1000,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					type: {enum: ["folder","trigger"]},
					id: {type:"string", maxLength:40},
					triggerId: {type:"string", maxLength:40},
					name: {type:"string", maxLength:100},
					color: {type:"string", maxLength:10},
					children: { $ref: "#/definitions/triggerTreeEntry" },
					expand: {type:"boolean"},
					enabled: {type:"boolean"},
				}
			}
		},

		raffleData:{
			type: "object",
			additionalProperties: false,
			properties: {
				mode: { enum: ["chat", "sub", "manual", "values", "tips"] },
				command: { type: "string", maxLength:100 },
				reward_id: { type: "string", maxLength:100 },
				value_id: { type: "string", maxLength:100 },
				value_splitter: { type: "string", maxLength:10 },
				multipleJoin: {type:"boolean"},
				autoClose: {type:"boolean"},
				triggerWaitForWinner: {type:"boolean"},
				duration_s: {type:"integer", minimum:0, maximum:120 * 60000},
				maxEntries: {type:"integer", minimum:0, maximum:1000000},
				created_at: {type:"integer", minimum:0, maximum:9999999999999},
				entries: {
					type:"array",
					minItems:0,
					maxItems:10000,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							id:{type:"string", maxLength:100},
							label:{type:"string", maxLength:200},
							score:{type:"integer", minimum:0, maximum:100},
							joinCount: { type: "number" },
							user: {
								type: "object",
								properties: {
									id: { type: "string", maxLength:100 },
									channel_id: { type: "string", maxLength:100 },
									platform: { type: "string", maxLength:20 }
								},
							},
							tip: {
								type: "object",
								properties: {
									amount: {
										anyOf:[
											{type:"string", maxLength:50},
											{type:"number", minimum:0 , maximum:99999}
										]
									},
									source: { type: "string", maxLength:20 }
								},
							},
						}
					}
				},
				tip_kofi: {type:"boolean"},
				tip_streamlabs: {type:"boolean"},
				tip_streamlabsCharity: {type:"boolean"},
				tip_streamelements: {type:"boolean"},
				tip_tipeee: {type:"boolean"},
				tip_tiltify: {type:"boolean"},
				tip_twitchCharity: {type:"boolean"},
				tip_kofi_minAmount: {type:"integer", minimum:0, maximum:999999},
				tip_streamlabs_minAmount: {type:"integer", minimum:0, maximum:999999},
				tip_streamlabsCharity_minAmount: {type:"integer", minimum:0, maximum:999999},
				tip_streamelements_minAmount: {type:"integer", minimum:0, maximum:999999},
				tip_tipeee_minAmount: {type:"integer", minimum:0, maximum:999999},
				tip_tiltify_minAmount: {type:"integer", minimum:0, maximum:999999},
				tip_twitchCharity_minAmount: {type:"integer", minimum:0, maximum:999999},
				tip_kofi_ponderate: {type:"integer", minimum:0, maximum:999999},
				tip_streamlabs_ponderate: {type:"integer", minimum:0, maximum:999999},
				tip_streamlabsCharity_ponderate: {type:"integer", minimum:0, maximum:999999},
				tip_streamelements_ponderate: {type:"integer", minimum:0, maximum:999999},
				tip_tipeee_ponderate: {type:"integer", minimum:0, maximum:999999},
				tip_tiltify_ponderate: {type:"integer", minimum:0, maximum:999999},
				tip_twitchCharity_ponderate: {type:"integer", minimum:0, maximum:999999},
				followRatio: {type:"integer", minimum:0, maximum:100},
				vipRatio: {type:"integer", minimum:0, maximum:100},
				subRatio: {type:"integer", minimum:0, maximum:100},
				subT2Ratio: {type:"integer", minimum:0, maximum:100},
				subT3Ratio: {type:"integer", minimum:0, maximum:100},
				subgiftRatio: {type:"integer", minimum:0, maximum:100},
				subMode_includeGifters: {type:"boolean"},
				subMode_excludeGifted: {type:"boolean"},
				showCountdownOverlay: {type:"boolean"},
				removeWinningEntry: {type:"boolean"},
				customEntries: { type: "string", maxLength:10000 },
				winners: {
					type:"array",
					minItems:0,
					maxItems:1000,
					items:{
						type: "object",
						properties: {
							id: { type: "string" },
							label: { type: "string", maxLength:300 },
							score: { type: "number" },
							joinCount: { type: "number" },
							user: {
								type: "object",
								properties: {
									id: { type: "string", maxLength:100 },
									channel_id: { type: "string", maxLength:100 },
									platform: { type: "string", maxLength:20 }
								},
							},
							tip: {
								type: "object",
								properties: {
									amount: {
										anyOf:[
											{type:"string", maxLength:50},
											{type:"number", minimum:0 , maximum:99999}
										]
									},
									source: { type: "string", maxLength:20 }
								},
							},
						},
					},
				},
				messages: {
					type: "object",
					additionalProperties: false,
					properties: {
						raffleStart:{
							type: "object",
							additionalProperties: false,
							properties: {
								message: {type:"string", maxLength:500},
								enabled: {type:"boolean"},
							}
						},
						raffleJoin:{
							type: "object",
							additionalProperties: false,
							properties: {
								message: {type:"string", maxLength:500},
								enabled: {type:"boolean"},
							}
						},
						raffleWinner:{
							type: "object",
							additionalProperties: false,
							properties: {
								message: {type:"string", maxLength:500},
								enabled: {type:"boolean"},
							}
						},
					},
				},
			},
		},
		pollOverlayData: {
			type:"object",
			additionalProperties: false,
			properties: {
				listMode: {type:"boolean"},
				listModeOnlyMore2: {type:"boolean"},
				showTitle: {type:"boolean"},
				showLabels: {type:"boolean"},
				showVotes: {type:"boolean"},
				showVoters: {type:"boolean"},
				showPercent: {type:"boolean"},
				showTimer: {type:"boolean"},
				showOnlyResult: {type:"boolean"},
				hideUntilResolved: {type:"boolean"},
				resultDuration_s: {type:"number", minimum:1, maximum:10*60},
				placement: {enum: ["tl", "t", "tr", "l", "m", "r", "bl", "b", "br"]},
				permissions: { $ref: "defs.json#/definitions/permissions" },
			}
		},
		chatPollData: {
			type: "object",
			additionalProperties: false,
			properties: {
				title: {type:"string", maxLength:100},
				duration_s: {type:"integer", minimum:0, maximum:999999999},
				started_at: {type:"integer", minimum:0, maximum:Number.MAX_SAFE_INTEGER},
				maxVotePerUser: {type:"integer", minimum:1, maximum:20},
				permissions:{ $ref: "defs.json#/definitions/permissions" },
				choices: {
					type:"array",
					minItems:0,
					maxItems:20,
					items:{
						type: "object",
						additionalProperties: false,
						properties: {
							id:{type:"string", maxLength:50},
							votes:{type:"number", minimum:0, maximum:Number.MAX_SAFE_INTEGER},
							label:{type:"string", maxLength:50},
						}
					}
				},
				votes: {
					type:"object",
					additionalProperties: true,
					patternProperties: {
						".{0,100}": {
							type: "object",
							additionalProperties: false,
							properties: {
								platform: {type:"string", maxLength:15},
								index:{type:"number", minimum:0, maximum:1000},
							}
						},
					}
				},
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
			minItems:0,
			maxItems:10000,
			items:{
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
							sceneUuid:{type:"string", maxLength:100},
						}
					},
					command:{type:"string", maxLength:100},
				}
			}
		},
		triggers: {
			type:"array",
			minItems:0,
			maxItems:1000,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:50},
					type: {type:"string", maxLength:5},
					enabled: {type:"boolean"},
					enableForRemoteChans: {type:"boolean"},
					addToContextMenu: {type:"boolean"},
					addToDiscord: {type:"boolean"},
					rewardId:{type:"string", maxLength:100},
					name:{type:"string", maxLength:100},
					chatCommand:{type:"string", maxLength:100},
					obsSource:{type:"string", maxLength:200},
					obsScene:{type:"string", maxLength:200},
					obsInput:{type:"string", maxLength:200},
					obsFilter:{type:"string", maxLength:200},
					created_at: {type:"integer", minimum:0, maximum:32503672800000},
					adBreakDelay: {type:"integer", minimum:0, maximum:5 * 60000},
					goxlrButtons:{
						type:"array",
						minItems:0,
						maxItems:24,
						items: {type:"string", maxLength:20},
					},
					counterId: {type:"string", maxLength:50},
					valueId: {type:"string", maxLength:50},
					queue: {type:"string", maxLength:100, nullable:true},
					queuePriority: {type:"integer", minimum:-100, maximum:100},
					conditions: { $ref: "#/definitions/conditionGroup" },
					permissions: { $ref: "defs.json#/definitions/permissions" },
					heatAllowAnon: {type:"boolean"},
					heatObsSource: {type:"string", maxLength:100},
					heatClickSource: {type:"string", maxLength:10},
					heatAreaIds:{
										type:"array",
										minItems:0,
										maxItems:100,
										items:{type:"string", maxLength:40},
									},
					chatCommandAliases:{
										type:"array",
										minItems:0,
										maxItems:10,
										items:{type:"string", maxLength:50},
									},
					chatCommandParams:{
										type:"array",
										minItems:0,
										maxItems:30,
										items:{
											type: "object",
											additionalProperties: false,
											properties: {
												type:{type:"string", maxLength:20},
												tag:{type:"string", maxLength:50},
											}
										},
									},
					scheduleParams: {
						type:"object",
						properties: {
							type: {type:"string", maxLength:10},
							repeatDuration: {type:"number", minimum:0, maximum:48*60000},
							repeatMinMessages: {type:"integer", minimum:0, maximum:9999},
							dates:{
								type:"array",
								minItems:0,
								maxItems:10000,
								items: {
									type: "object",
									additionalProperties: false,
									properties: {
										daily: {type:"boolean"},
										monthly: {type:"boolean"},
										yearly: {type:"boolean"},
										value: {type:"string", maxLength:20},
									}
								}
							}
						}
					},
					cooldown: {
						type:"object",
						properties: {
							global: {type:"integer", minimum:0, maximum:60*60*12},
							user: {type:"integer", minimum:0, maximum:60*60*12},
							alert: {type:"boolean"},
						}
					},
					actions:{
						type:"array",
						minItems:0,
						maxItems:100,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								id: {type:"string", maxLength:100},
								conditionList: { $ref: "#/definitions/conditionGroup" },
								sourceName: {type:"string", maxLength:100},
								//remove this property after some time
								show: {
									anyOf:[
										{type:"string", maxLength:20},
										{type:"boolean"},
									]
								},
								delay: {
									anyOf:[
										{type:"string", maxLength:50},
										{type:"number", minimum:0 , maximum:99999}
									]
								},
								action: {type:"string", maxLength:20},
								obsAction: {enum:[
													"sources",
													"startstream",
													"stopstream",
													"startrecord",
													"pauserecord",
													"resumerecord",
													"stoprecord",
													"emitevent",
													"startvirtualcam",
													"stopvirtualcam",
													"createchapter",
													"hotKey",
													"screenshot",
												]},
								triggerId: {type:"string", maxLength:50},
								filterName: {type:"string", maxLength:100},
								text: {type:"string", maxLength:1000},
								sendAsReply: {type:"boolean"},
								url: {type:"string", maxLength:1000},
								browserSourceCss: {type:"string", maxLength:10000},
								mediaPath: {type:"string", maxLength:1000},
								waitMediaEnd: {type:"boolean"},
								pos_x: {type:"string", maxLength:500},
								pos_y: {type:"string", maxLength:500},
								width: {type:"string", maxLength:500},
								height: {type:"string", maxLength:500},
								angle: {type:"string", maxLength:500},
								animate: {type:"boolean"},
								animateEasing: {type:"string", maxLength:30},
								animateDuration: {type:"number", minimum:0, maximum:3600000},
								relativeTransform: {type:"boolean"},
								type: {type:"string", maxLength:50, nullable: true},
								musicAction: {type:"string", maxLength:3},
								musicSelectionType: {enum: ["1","2","3","top3","top5","top10","top15","top20","top25","top30","top40","top50"]},
								track: {type:"string", maxLength:500},
								limitDuration: {type:"boolean"},
								maxDuration: {type:"number", minimum:0 , maximum:3600},
								maxPerUser: {type:"number", minimum:0 , maximum:1000},
								failMessage: {type:"string", maxLength:500},
								confirmMessage: {type:"string", maxLength:500},
								playlist: {type:"string", maxLength:500},
								voiceID: {type:"string", maxLength:100},
								soundID: {type:"string", maxLength:100},
								triggerKey: {type:"string", maxLength:100},
								method: {type:"string", maxLength:10},
								browserEventName: {type:"string", maxLength:100},
								browserEventParams: {type:"string", maxLength:10000},
								sendAsBody: {type:"boolean"},
								customHeaders: {type:"boolean"},
								interpretMaths: {type:"boolean"},
								hotKeyAction: {type:"string", maxLength:100},
								screenshotImgMode: {enum: ["save","get"]},
								screenshotImgFormat: {type:"string", maxLength:20},
								screenshotImgCustomSize: {type:"boolean"},
								screenshotImgWidth: {type:"number", minimum:8 , maximum:4096},
								screenshotImgHeight: {type:"number", minimum:8 , maximum:4096},
								screenshotImgSavePath: {type:"string", maxLength:500},
								screenshotImgSavePlaceholder: {type:"string", maxLength:30},
								headers:{
									type:"array",
									minItems:0,
									maxItems:20,
									items:{
										type:"object",
										additionalProperties: false,
										patternProperties: {
											".*": {type: "string", maxLength: 1000},
										},
									},
								},
								addValue: {type:"string", maxLength:100},
								counter: {type:"string", maxLength:40},
								faderId: {type:"string", maxLength:20},
								faderValue: {type:"string", maxLength:100},
								profile: {type:"string", maxLength:100},
								counterUserSources: {
									type:"object",
									additionalProperties: false,
									patternProperties: {
										".{8}-.{4}-.{4}-.{4}-.{12}": {type: "string"},
									},
								},
								valueUserSources: {
									type:"object",
									additionalProperties: false,
									patternProperties: {
										".{8}-.{4}-.{4}-.{4}-.{12}": {type: "string"},
									},
								},
								userAction: {
									type:"object",
									additionalProperties: false,
									patternProperties: {
										".{8}-.{4}-.{4}-.{4}-.{12}": {type: "string"},
									},
								},
								placeholder:{type:"string", maxLength:50},
								outputPlaceholder:{type:"string", maxLength:30},
								outputPlaceholderList:{
									type:"array",
									minItems:0,
									maxItems:50,
									items:{
										type:"object",
										additionalProperties: false,
										properties: {
											type: {type:"string", maxLength:20},
											path: {type:"string", maxLength:500},
											placeholder: {type:"string", maxLength:30},
										}
									}
								},
								customBody:{type:"string", maxLength:5000},
								min: {type:"integer", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
								max: {type:"integer", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
								float: {type:"boolean"},
								condition: {type:"boolean"},
								skipDisabled: {type:"boolean"},
								removePickedEntry: {type:"boolean"},
								disableAfterExec: {type:"boolean"},
								mode: {type:"string", maxLength:20},
								title: {type:"string", maxLength:140},
								categoryId: {type:"string", maxLength:30},
								topic: {type:"string", maxLength:255},
								pattern: {type:"string", maxLength:15},
								counterSource: {type:"string", maxLength:40},
								valueSource: {type:"string", maxLength:40},
								payload: {type:"string", maxLength:10000},
								valueSplitter: {type:"string", maxLength:5},
								branded:{type:"boolean"},
								fxPresetIndex:{type:"integer", minimum:-1, maximum:5},
								sampleIndex:{
									type:"array",
									minItems:0,
									maxItems:2,
									items:{type:"string", maxLength:20},
								},
								labels:{
									type:"array",
									minItems:0,
									maxItems:10,
									items:{
										type:"object",
										additionalProperties: false,
										properties:{
											id:{type:"string", maxLength:40},
											enabled:{type:"boolean"},
										}
									},
								},
								tags: {
									type:"array",
									minItems:0,
									maxItems:20,
									items:{type:"string", maxLength:25},
								},
								list: {
									type:"array",
									minItems:0,
									maxItems:10000,
									items:{type:"string", maxLength:500},
								},
								triggers: {
									type:"array",
									minItems:0,
									maxItems:1000,
									items:{type:"string", maxLength:100},
								},
								newValue: {type:"string", maxLength:1000000},
								values: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:40},
								},
								counters: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:40},
								},
								queryParams: {
									type:"array",
									minItems:0,
									maxItems:10000,
									items:{type:"string", maxLength:50},
								},
								params: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:50},
								},
								customUsername:{type:"string", maxLength:50},
								customUsernameUserSource:{type:"string", maxLength:50},
								customBadgeUserSource:{type:"string", maxLength:50},
								customBadgeAdd: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:50},
								},
								customBadgeDel: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{type:"string", maxLength:50},
								},
								valueCounterPlaceholders: {
									type: "object",
									additionalProperties: false,
									properties: {
										userId: {type:"string", maxLength:100},
										userName: {type:"string", maxLength:100},
										value: {type:"string", maxLength:10000},
									}
								},
								raffleData: { $ref: "#/definitions/raffleData" },
								bingoData: {
									type: "object",
									additionalProperties: false,
									properties: {
										guessNumber: {type:"boolean"},
										guessEmote: {type:"boolean"},
										guessCustom: {type:"boolean"},
										min: {type:"integer", minimum:0, maximum:Number.MAX_SAFE_INTEGER},
										max: {type:"integer", minimum:0, maximum:Number.MAX_SAFE_INTEGER},
										numberValue: {type:"number", maximum:Number.MAX_SAFE_INTEGER},
										customValue: {type:"string", maxLength:500},
										customValueTolerance: {type:"number", minimum:0, maximum:10},
										genericValue: {
											anyOf:[
												{type:"string", maxLength:500},
												{type:"number", minimum:1, maximum:Number.MAX_SAFE_INTEGER},
											]
										},
										emoteValue: {
											type: "object",
											additionalProperties: false,
											properties: {
												code:{type:"string", maxLength:500},
												image:{
													type: "object",
													additionalProperties: false,
													properties: {
														sd:{type:"string", maxLength:500},
														hd:{type:"string", maxLength:500},
													}
												}
											}
										}
									}
								},
								bingoGrid: {
									type: "object",
									additionalProperties: false,
									properties: {
										grid: {type:"string", maxLength:40},
										cellId: {type:"string", maxLength:40},
										label: {type:"string", maxLength:60},
										action: {enum: ["tick", "untick", "toggle", "tick_all", "untick_all", "rename", "add_cell", "shuffle"]},
										cellActionMode: {enum: ["id", "coords"]},
										x: {type:["integer","string"], minimum:1, maximum:10, maxLength:100},
										y: {type:["integer","string"], minimum:1, maximum:10, maxLength:100},
									}
								},
								pollData: {
									type: "object",
									additionalProperties: false,
									properties: {
										pointsPerVote: {type:"integer", minimum:0, maximum:999999999},
										voteDuration: {type:"integer", minimum:0, maximum:999999999},
										title: {type:"string", maxLength:60},
										answers: {
											type:"array",
											minItems:0,
											maxItems:50,
											items:{type:"string", maxLength:25},
										},
									}
								},
								chatPollData: { $ref: "defs.json#/definitions/chatPollData" },
								predictionData: {
									type: "object",
									additionalProperties: false,
									properties: {
										voteDuration: {type:"integer", minimum:0, maximum:999999999},
										title: {type:"string", maxLength:60},
										answers: {
											type:"array",
											minItems:0,
											maxItems:10,
											items:{type:"string", maxLength:25},
										},
									}
								},
								suggData: {
									type: "object",
									additionalProperties: false,
									properties: {
										command: {type:"string", maxLength:30},
										maxLength: {type:"integer", minimum:0, maximum:500},
										duration: {type:"integer", minimum:0, maximum:1440},
										allowMultipleAnswers: {type:"boolean"},
										startTime: {type:"integer", maximum:999999999999999},
										choices: {
											type:"array",
											minItems:0,
											maxItems:0,
											items: {type:"string", maxLength:0},//Not the right type but it will never be filled
										},
										winners: {
											type:"array",
											minItems:0,
											maxItems:0,
											items: {type:"string", maxLength:0},//Not the right type but it will never be filled
										},
									}
								},
								customMessage: {
									type: "object",
									additionalProperties: false,
									properties: {
										message: {type:"string", maxLength:1000},
										icon: {type:"string", maxLength:100},
										col: {type:"integer", maximum:100},
										style: {enum: ["highlight","error","message"]},
										highlightColor: {type:"string", maxLength:10},
										user:{
											type: "object",
											additionalProperties: false,
											properties: {
												name: {type:"string", maxLength:50},
												color: {type:"string", maxLength:10},
											}
										},
										actions:{
											type:"array",
											minItems:0,
											maxItems:20,
											items: {
												type: "object",
												additionalProperties: false,
												properties: {
													id: {type:"string", maxLength:50},
													icon: {type:"string", maxLength:100},
													label: {type:"string", maxLength:100},
													url: {type:"string", maxLength:1000},
													message: {type:"string", maxLength:500},
													triggerId: {type:"string", maxLength:50},
													actionType: {enum: ["url","trigger","message"]},
													theme: {enum: ["primary","secondary","alert","","default","light"]},
												}
											}
										}
									}
								},
								voiceParams: {
									type: "object",
									additionalProperties: false,
									properties: {
										voice: {type:"string", maxLength:100},
										volume: {type:"number", minimum:0, maximum:1},
										rate: {type:"number", minimum:0, maximum:5},
										pitch: {type:"number", minimum:0, maximum:2},
										elevenlabs_lang: {type:"string", maxLength:10},
										elevenlabs_model: {type:"string", maxLength:50},
										elevenlabs_stability: {type:"number", minimum:0, maximum:1},
										elevenlabs_similarity: {type:"number", minimum:0, maximum:1},
										elevenlabs_style: {type:"number", minimum:0, maximum:1},
									}
								},
								heatClickData: {
									type: "object",
									additionalProperties: false,
									properties: {
										overlayId: {type:"string", maxLength:50},
										x: {type:"string", maxLength:500},
										y: {type:"string", maxLength:500},
										forward: {type:"boolean"},
										ctrl: {type:"boolean"},
										shift: {type:"boolean"},
										alt: {type:"boolean"},
									}
								},
								rewardAction: {
									type: "object",
									additionalProperties: false,
									properties: {
										rewardId: {type:"string", maxLength:50},
										state: {enum: ["enable","disable","toggle"]},
										action: {enum: ["toggle", "edit", "create", "delete","refund"]},
										rewardEdit:{
											type: "object",
											additionalProperties: false,
											properties: {
												title: {type:"string", maxLength:45},
												cost: {
													anyOf:[
														{type:"string", maxLength:50},
														{type:"number", minimum:1, maximum:1000000000},
													]
												},
												prompt: {type:"string", maxLength:200},
												is_paused: {type:"boolean"},
												is_enabled: {type:"boolean"},
												background_color: {type:"string", maxLength:9},
												is_user_input_required: {type:"boolean"},
												is_max_per_stream_enabled: {type:"boolean"},
												max_per_stream: {type:"number", minimum:0, maximum:1000000000},
												is_max_per_user_per_stream_enabled: {type:"boolean"},
												max_per_user_per_stream: {type:"number", minimum:0, maximum:1000000000},
												is_global_cooldown_enabled: {type:"boolean"},
												global_cooldown_seconds: {type:"number", minimum:0, maximum:1000000000},
												should_redemptions_skip_request_queue: {type:"boolean"},
											}
										}
									}
								},
								extension: {
									type: "object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:50},
										enable: {type:"boolean"},
										slotIndex: {enum: ["","1","2","3"]},
										slotType: {enum: ["","component", "overlay", "panel"]},
									}
								},
								discordAction: {
									type: "object",
									additionalProperties: false,
									properties: {
										action: {enum: ["message"]},
										message: {type:"string", maxLength:2000},
										channelId: {type:"string", maxLength:100},
									}
								},
								lumia: {
									type: "object",
									additionalProperties: false,
									properties: {
										action: {enum: ["color", "tts"]},
										color: {type:"string", maxLength:7},
										colorTransition_s: {type:"number", minimum:0, maximum:1000000000},
										colorDuration_s: {type:"number", minimum:0, maximum:1000000000},
										colorBrightness: {type:"number", minimum:0, maximum:100},
										max_per_stream: {type:"number", minimum:0, maximum:1000000000},
										message: {type:"string", maxLength:500},
										voice: {type:"string", maxLength:100},
									}
								},
								streamerbotData: {
									type: "object",
									additionalProperties: false,
									properties: {
										actionId: {type:"string", maxLength:100},
										params: {
											type:"array",
											minItems:0,
											maxItems:40,
											items: {
												type: "object",
												additionalProperties: false,
												properties: {
													key: {type:"string", maxLength:50},
													value: {type:"string", maxLength:1000},
												}
											}
										}
									}
								},
								sammiData: {
									type: "object",
									additionalProperties: false,
									properties: {
										buttonId: {type:"string", maxLength:40},
									}
								},
								mixitupData: {
									type: "object",
									additionalProperties: false,
									properties: {
										commandId: {type:"string", maxLength:100},
										params: {
											type:"array",
											minItems:0,
											maxItems:40,
											items: {
												type: "object",
												additionalProperties: false,
												properties: {
													value: {type:"string", maxLength:1000},
												}
											}
										}
									}
								},
								playabilityData: {
									type: "object",
									additionalProperties: false,
									properties: {
										outputs: {
											type:"array",
											minItems:0,
											maxItems:40,
											items: {
												type: "object",
												additionalProperties: false,
												properties: {
													code: {type:"string", maxLength:20},
													type: {type:"string", maxLength:20},
													value:{
														anyOf: [
															{ enum: ["press_release"] },
															{ type: "number", minimum: -1, maximum: 1 },
															{ type: "boolean" }
														]
													},
												}
											}
										}
									}
								},
								groqData: {
									type: "object",
									additionalProperties: false,
									properties: {
										jsonMode:{ type: "boolean" },
										model:{ type: "string", maxLength:100 },
										json:{ type: "string", maxLength:100000 },
										prompt:{ type: "string", maxLength:100000 },
										preprompt:{ type: "string", maxLength:100000 },
										outputPlaceholderList:{
											type:"array",
											minItems:0,
											maxItems:50,
											items:{
												type:"object",
												additionalProperties: false,
												properties: {
													type: {type:"string", maxLength:20},
													path: {type:"string", maxLength:500},
													placeholder: {type:"string", maxLength:30},
												}
											}
										},
									}
								},

								timerData:{
									type: "object",
									additionalProperties: false,
									properties: {
										timerId: {type:"string", maxLength:50},
										action: { enum: ["start","pause","resume","stop","reset","add","remove","set"] },
										duration: {
											anyOf: [
												{ type: "integer", minimum:0, maximum:Number.MAX_SAFE_INTEGER, nullable: true },
												{ type: "string",  minLength: 0, maxLength: 100 }
											]
										}
									}
								},

								animatedTextData:{
									type: "object",
									additionalProperties: false,
									properties: {
										overlayId: {type:"string", maxLength:50},
										action: { enum: ["show", "hide"] },
										autoHide: { type: "boolean" },
										pauseUntilComplete: { type: "boolean" },
										text: { type: "string",  minLength: 0, maxLength: 1000 }
									}
								},

								customTrainData:{
									type: "object",
									additionalProperties: false,
									properties: {
										trainId: {type:"string", maxLength:50},
										action: { enum: ["add", "del"] },
										value: { type: "string",  minLength: 0, maxLength: 1000 }
									}
								},
							}
						},
					}
				}
			}
		},
		triggersTree: { $ref: "#/definitions/triggerTreeEntry" },
		botMessages: {
			type:"object",
			additionalProperties: false,
			properties: {
				raffleJoin: { $ref: "#/definitions/botMessage" },
				raffleStart: { $ref: "#/definitions/botMessage" },
				raffleTipsStart: { $ref: "#/definitions/botMessage" },
				raffleTipsJoin: { $ref: "#/definitions/botMessage" },
				raffleValuesWinner: { $ref: "#/definitions/botMessage" },
				raffleListWinner: { $ref: "#/definitions/botMessage" },
				raffleSubsWinner: { $ref: "#/definitions/botMessage" },
				raffle: { $ref: "#/definitions/botMessage" },
				raffleTipsWinner: { $ref: "#/definitions/botMessage" },
				bingoStart: { $ref: "#/definitions/botMessage" },
				bingo: { $ref: "#/definitions/botMessage" },
				shoutout: { $ref: "#/definitions/botMessage" },
				twitchatAd: { $ref: "#/definitions/botMessage" },
				chatSuggStart: { $ref: "#/definitions/botMessage" },
				heatSpotify: { $ref: "#/definitions/botMessage" },
				heatUlule: { $ref: "#/definitions/botMessage" },
				qnaStart: { $ref: "#/definitions/botMessage" },
			}
		},
		voiceActions: {
			type:"array",
			minItems:0,
			maxItems:1000,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:100},
					sentences: {type:"string", maxLength:100000},
				}
			},
		},
		voiceLang: {type:"string", maxLength:20},
		streamInfoPresets:{
			type:"array",
			minItems:0,
			maxItems:1000,
			items: {
				type:"object",
				additionalProperties: false,
				properties:{
					name:{type:"string", maxLength:50},
					id:{type:"string", maxLength:40},
					title:{type:"string", maxLength:200},
					categoryID:{type:"string", maxLength:10},
					branded:{type:"boolean"},
					tags:{
						type:"array",
						minItems:0,
						maxItems:30,
						items:{type:"string", maxLength:100},
					},
					labels:{
						type:"array",
						minItems:0,
						maxItems:10,
						items:{
							type:"object",
							additionalProperties: false,
							properties:{
								id:{type:"string", maxLength:40},
								enabled:{type:"boolean"},
							}
						},
					},
				}
			}
		},
		"p:hideChat": {type:"boolean"},
		"p:bttvEmotes": {type:"boolean"},
		"p:ffzEmotes": {type:"boolean"},
		"p:sevenTVEmotes": {type:"boolean"},
		"p:conversationsEnabled": {type:"boolean"},
		"p:defaultSize": {type:"integer", minimum:0, maximum:21},
		"p:displayTime": {type:"boolean"},
		"p:displayTimeRelative": {type:"boolean"},
		"p:dyslexicFont": {type:"boolean"},
		"p:firstMessage": {type:"boolean"},
		"p:firstUserBadge": {type:"boolean"},
		"p:groupIdenticalMessage": {type:"boolean"},
		"p:highlightMentions": {type:"boolean"},
		"p:highlightMentions_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightMods": {type:"boolean"},
		"p:highlightMods_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightNonFollowers": {type:"boolean"},
		"p:highlightNonFollowers_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightSubs": {type:"boolean"},
		"p:highlightSubs_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightVips": {type:"boolean"},
		"p:highlightVips_color": {type:"string", maxLength:7, minLength:7},
		"p:highlightPartners": {type:"boolean"},
		"p:highlightPartners_color": {type:"string", maxLength:7, minLength:7},
		"p:highlight1stToday": {type:"boolean"},
		"p:highlight1stToday_color": {type:"string", maxLength:7, minLength:7},
		"p:highlight1stEver": {type:"boolean"},
		"p:highlight1stEver_color": {type:"string", maxLength:7, minLength:7},
		"p:raidHighlightUser": {type:"boolean"},
		"p:raidHighlightUserTrack": {type:"boolean"},
		"p:raidHighlightUserDuration": {type:"integer"},
		"p:raidHighlightUser_color": {type:"string", maxLength:7, minLength:7},
		"p:raffleHighlightUser": {type:"boolean"},
		"p:raffleHighlightUserDuration": {type:"integer"},
		"p:highlightMentions_custom": {
			type:"array",
			minItems:0,
			maxItems:10,
			items:{type:"string", maxLength:100},
		},
		"p:lockAutoScroll": {type:"boolean"},
		"p:liveMessages": {type:"boolean"},
		"p:liveAlerts": {type:"boolean"},
		"p:markAsRead": {type:"boolean"},
		"p:minimalistBadges": {type:"boolean"},
		"p:showBadges": {type:"boolean"},
		"p:showEmotes": {type:"boolean"},
		"p:autoRemod": {type:"boolean"},
		"p:showModTools": {type:"boolean"},
		"p:splitViewVertical": {type:"boolean"},
		"p:showUserPronouns": {type:"boolean"},
		"p:showViewersCount": {type:"boolean"},
		"p:alternateMessageBackground": {type:"boolean"},
		"p:showRaidViewersCount": {type:"boolean"},
		"p:showRaidStreamInfo": {type:"boolean"},
		"p:offlineEmoteOnly": {type:"boolean"},
		"p:stopStreamOnRaid": {type:"boolean"},
		"p:userHistoryEnabled": {type:"boolean"},
		"p:translateNames": {type:"boolean"},
		"p:spoilersEnabled": {type:"boolean"},
		"p:alertMode": {type:"boolean"},
		"p:chatShoutout": {type:"boolean"},
		"p:showRewardsInfos": {type:"boolean"},
		"p:censorDeletedMessages": {type:"boolean"},
		"p:saveHistory": {type:"boolean"},
		"p:highlightusernames": {type:"boolean"},
		"p:recentAccountUserBadge": {type:"boolean"},
		"p:mergeConsecutive": {type:"boolean"},
		"p:mergeConsecutive_maxSize": {type:"integer", minimum:1, maximum:500},
		"p:mergeConsecutive_maxSizeTotal": {type:"integer", minimum:10, maximum:2000},
		"p:mergeConsecutive_minDuration": {type:"integer", minimum:0, maximum:3600},
		"p:autoTranslateFirst": {type:"boolean"},
		"p:antiHateRaid": {type:"boolean"},
		"p:antiHateRaidDeleteMessage": {type:"boolean"},
		"p:antiHateRaidEmergency": {type:"boolean"},
		"p:multiChatAvatar": {type:"boolean"},
		"p:sharedChatHide": {type:"boolean"},
		"p:autoTranslateFirstLang":{
			type:"array",
			minItems:0,
			maxItems:1,
			items:{type:"string", maxLength:3},
		},
		"p:autoTranslateFirstSpoken":{
			type:"array",
			minItems:0,
			maxItems:60,
			items:{type:"string", maxLength:3},
		},
		v: {type:"number"},
		saveVersion: {type:"number"},
		censorViewerCount: {type:"boolean"},
		collapseParamAdInfo: {type:"boolean"},
		lang: {type:"string", maxLength:4},
		theme: {type:"string", maxLength:10},
		obsIP: {type:"string", maxLength:100},
		obsPort: {
			anyOf: [
				{ type: "integer", minimum: 0, maximum: 65535 },
				{ type: "string",  minLength: 0, maxLength: 5 }
			]
		},
		updateIndex: {type:"integer"},
		raffle_message: {type:"string", maxLength:500},
		raffle_messageEnabled: {type:"boolean"},
		bingo_message: {type:"string", maxLength:500},
		bingo_messageEnabled: {type:"boolean"},
		greetScrollDownAuto: {type:"boolean"},
		greetAutoDeleteAfter: {type:"integer", minimum:-1, maximum:3600},
		devmode: {type:"boolean"},
		greetHeight: {type:"number"},
		adNextTS: {type:"integer"},
		adWarned: {type:"boolean"},
		adBreakScopesRequested: {type:"boolean"},
		sponsorPublicPrompt: {type:"boolean"},
		cypherKey: {type:"string", maxLength:500},
		raffle_showCountdownOverlay: {type:"boolean"},
		donorLevel: {type:"integer", minimum:-1, maximum:10},
		rightClickHintPrompt: {
			anyOf:[
				{type:"string", maxLength:5},
				{type:"boolean"},
			]
		},
		triggerSortType: {type:"string", maxLength:20},
		ululeProject: {type:"string", maxLength:200},
		ululeGoals: {type:"string", maxLength:200},
		ululeTitle: {type:"string", maxLength:100},
		ululeCurrency: {type:"string", maxLength:5},
		heatEnabled: {type:"boolean"},
		usercardPinnedChannel: {
			type:"array",
			minItems:0,
			maxItems:50,
			items:{ type:"string", maxLength:30},
		},
		customUsernames: {
			type:"object",
			additionalProperties: false,
			maxProperties:10000,
			patternProperties: {
				".{1,20}": {
					type:"object",
					additionalProperties: false,
					properties: {
						name:{type: "string", maxLength:25},
						channel: {type:"string", maxLength:50},
						platform: {type:"string", maxLength:15},
					}
				}
			},
		},
		customBadgeList: {
			type:"array",
			minItems:0,
			maxItems:100,
			items:{
				type:"object",
				additionalProperties: false,
				properties: {
					id:{type: "string", maxLength:40},
					img:{type: "string", maxLength:6000},
					name:{type: "string", maxLength:50},
					enabled:{type:"boolean"},
				}
			}
		},
		customUserBadges: {
			type:"object",
			additionalProperties: false,
			maxProperties:10000,
			patternProperties: {
				".{1,10}": {
					type:"array",
					minItems:0,
					maxItems:20,
					items:{
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:40},
							channel: {type:"string", maxLength:50},
							platform: {type:"string", maxLength:15},
						},
					},
				},
			},
		},
		ttsParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				volume: {type:"number", minimum:0, maximum:1},
				rate: {type:"number", minimum:0.1, maximum:10},
				pitch: {type:"number", minimum:0, maximum:2},
				elevenlabs_model: {type:"string", maxLength:100},
				elevenlabs_stability: {type:"number", minimum:0, maximum:1},
				elevenlabs_similarity: {type:"number", minimum:0, maximum:1},
				elevenlabs_style: {type:"number", minimum:0, maximum:1},
				elevenlabs_lang: {type:"string", maxLength:10},
				maxLength: {type:"integer", minimum:0, maximum:500},
				maxDuration: {type:"integer", minimum:0, maximum:120},
				timeout: {type:"integer", minimum:0, maximum:300},
				inactivityPeriod: {type:"integer", minimum:0, maximum:60},
				voice: {
					anyOf: [
						{type:"string", maxLength:500},
						{
							type:"object",
							additionalProperties: false,
							properties:{
								id: {type:"string", maxLength:100},
								platform: {type:"string", maxLength:40},
							}
						}
					],
				},
				removeURL: {type:"boolean"},
				replaceURL: {type:"string", maxLength:100},
				allRemoteChans: {type:"boolean"},
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
				readBitsMinAmount: {type:"integer", minimum:0, maximum:1000000},
				readBitsPattern:{type:"string", maxLength:300},
				readRaids: {type:"boolean"},
				readRaidsPattern:{type:"string", maxLength:300},
				readFollow: {type:"boolean"},
				readFollowPattern:{type:"string", maxLength:300},
				readPolls: {type:"boolean"},
				readPollsPattern:{type:"string", maxLength:300},
				readChatPolls: {type:"boolean"},
				readChatPollsPattern:{type:"string", maxLength:300},
				readPredictions: {type:"boolean"},
				readPredictionsPattern:{type:"string", maxLength:300},
				readBingos: {type:"boolean"},
				readBingosPattern:{type:"string", maxLength:300},
				readRaffle: {type:"boolean"},
				readRafflePattern:{type:"string", maxLength:300},
				readMonitored: {type:"boolean"},
				readMonitoredPattern:{type:"string", maxLength:300},
				readRestricted: {type:"boolean"},
				readRestrictedPattern:{type:"string", maxLength:300},
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
				readKofiTip: {type:"boolean"},
				readKofiTipPattern: {type:"string", maxLength:300},
				readKofiMerch: {type:"boolean"},
				readKofiMerchPattern: {type:"string", maxLength:300},
				readKofiSub: {type:"boolean"},
				readKofiSubPattern: {type:"string", maxLength:300},
				readStreamlabsTip: {type:"boolean"},
				readStreamlabsTipPattern: {type:"string", maxLength:300},
				readStreamlabsMerch: {type:"boolean"},
				readStreamlabsMerchPattern: {type:"string", maxLength:300},
				readStreamlabsPatreon: {type:"boolean"},
				readStreamlabsPatreonPattern: {type:"string", maxLength:300},
				readStreamelementsTip: {type:"boolean"},
				readStreamelementsTipPattern: {type:"string", maxLength:300},
				readUsers:{
					type:"array",
					minItems:0,
					maxItems:10000,
					items:{type:"string", maxLength:50},
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
				followOnlyDuration:{type:"integer"},
				slowModeDuration:{type:"integer"},
				toUsers:{
					type:"array",
					minItems:0,
					maxItems:1000,
					items:{type:"string", maxLength:50},
				},
				obsScene:{type:"string", maxLength:500},
				obsSources:{
					type:"array",
					minItems:0,
					maxItems:1000,
					items:{type:"string", maxLength:100},
				},
				autoEnableOnFollowbot:{type:"boolean"},
				autoEnableOnShieldmode:{type:"boolean"},
				enableShieldMode:{type:"boolean"},
			}
		},
		emergencyFollowers: {
			type:"array",
			minItems:0,
			maxItems:1500,
			items: {
				type:"object",
				additionalProperties: false,
				properties: {
					uid:{type:"string", maxLength:50},
					channelId:{type:"string", maxLength:50},
					login:{type:"string", maxLength:50},
					date:{type:"integer"},
					platform:{type:"string", maxLength:15},
				}
			}
		},
		spoilerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				permissions:{ $ref: "defs.json#/definitions/permissions" },
				autoSpoilNewUsers:{type:"boolean"},
			}
		},
		chatHighlightParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				position: {enum: ["tl", "t", "tr", "l", "m", "r", "bl", "b", "br"]},
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
				vibrate: {type:"boolean"},
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
					type:"array",
					minItems:0,
					maxItems:100,
					items: {
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:36},
							label: {type:"string", maxLength:100},
							regex: {type:"string", maxLength:5000},
							enabled: {type:"boolean"},
							serverSync: {type:"boolean"},
							emergency: {type:"boolean"},
							firstTimeChatters: {type:"boolean"},
						}
					}
				},
			}
		},

		chatColumnsConf: {
			type:"array",
			minItems:0,
			maxItems:100,
			items: {
				type:"object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:40},
					commandsBlockList: {
						type:"array",
						minItems:0,
						maxItems:10000,
						items:{type:"string", maxLength:100},
					},
					userBlockList: {
						type:"array",
						minItems:0,
						maxItems:10000,
						items:{type:"string", maxLength:30},
					},
					liveLockCount: {type:"integer", minimum:0, maximum:10},
					order: {type:"integer", minimum:0, maximum:1000},
					size: {type:"number", minimum:0, maximum:10},
					whispersPermissions: { $ref: "defs.json#/definitions/permissions" },
					showPanelsHere: { type:"boolean" },
					showGreetHere: { type:"boolean" },
					backgroundColor: { type:"string", maxLength:11 },
					mandatoryBadges_flag: { type:"boolean" },
					forbiddenBadges_flag: { type:"boolean" },
					mandatoryBadges: {
						type:"array",
						minItems:0,
						maxItems:100,
						items:{type:"string", maxLength:40},
					},
					forbiddenBadges: {
						type:"array",
						minItems:0,
						maxItems:100,
						items:{type:"string", maxLength:40},
					},
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
					},
					channelIDs: {
						type:"object",
						additionalProperties: true,
						maxProperties:100,
						patternProperties: {
							".{1,100}": {
								type:"object",
								additionalProperties: false,
								properties: {
									platform: { type:"string", maxLength:30 },
									date: { type:"number", minimum:0, maximum:4121027331000 },
								}
							}
						}
					},
				}
			}
		},

		values: {
			type:"array",
			minItems:0,
			maxItems:10000,
			items:{
				type:"object",
				additionalProperties: false,
				properties:{
					id: {type:"string", maxLength:40},
					name: {type:"string", maxLength:50},
					placeholderKey: {type:"string", maxLength:50},
					value: {type:"string", maxLength:100000},
					enabled:{type:"boolean"},
					perUser: {type:"boolean"},
					users: {
						type:"object",
						additionalProperties: true,
						patternProperties: {
							".*": {
								anyOf: [
									{type:"string", maxLength:100000},
									{
										type:"object",
										additionalProperties: false,
										properties:{
											login: {type:"string", maxLength:100},
											platform: {type:"string", maxLength:40},
											value: {type:"string", maxLength:100000},
										}
									}
								],
							}
						}
					}
				}
			}
		},

		counters: {
			type:"array",
			minItems:0,
			maxItems:10000,
			items:{
				type:"object",
				additionalProperties: false,
				properties:{
					id: {type:"string", maxLength:40},
					name: {type:"string", maxLength:50},
					placeholderKey: {type:"string", maxLength:50},
					enabled:{type:"boolean"},
					value: {type:"number", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
					min: {
						anyOf:[
							{type:"number", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
							{type:"boolean"},
						]
					},
					max: {
						anyOf:[
							{type:"number", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
							{type:"boolean"},
						]
					},
					loop: {type:"boolean"},
					perUser: {type:"boolean"},
					users: {
						type:"object",
						additionalProperties: true,
						patternProperties: {
							".*": {
								anyOf: [
									{type:"number", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
									{
										type:"object",
										additionalProperties: false,
										properties:{
											login: {type:"string", maxLength:100},
											platform: {type:"string", maxLength:40},
											value: {type:"number", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
										}
									}
								],
							}
						}
					}
				}
			}
		},

		websocketTrigger: {
			type:"object",
			additionalProperties: false,
			properties: {
				ip: {type:"string", maxLength:100},
				port: {type:"integer", minimum:0, maximum:65535},
				secured: {type:"boolean"},
			}
		},

		heatScreens: {
			type:"array",
			minItems:0,
			maxItems:100,
			items:{
				type:"object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:40},
					enabled: {type:"boolean"},
					activeOBSScene: {type:"string", maxLength:100},
					areas: {
						type:"array",
						minItems:0,
						maxItems:100,
						items:{
							type:"object",
							additionalProperties: false,
							properties: {
								id: {type:"string", maxLength:40},
								points: {
									type:"array",
									minItems:0,
									maxItems:100,
									items:{
										type:"object",
										additionalProperties: false,
										properties: {
											x: {type:"number", minimum:-10, maximum:10},
											y: {type:"number", minimum:-10, maximum:10},
										}
									}
								},
							}
						}
					},
				}
			}
		},

		goxlrConfig: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				ip: {type:"string", maxLength:100},
				port: {type:"integer", minimum:0, maximum:65535},
				chatScrollSources: {
					type:"array",
					minItems:0,
					maxItems:10,
					items:{
						type:"array",
						minItems:0,
						maxItems:2,
						items:{type:"string", maxLength:30},
					}
				},
				chatReadMarkSources: {
					type:"array",
					minItems:0,
					maxItems:10,
					items:{
							anyOf: [{
								type:"array",
								minItems:0,
								maxItems:2,
								items: { type: "string", maxLength: 30 },
							},
							//Can be null if only setting params for the 2nd column for example, the first
							//index will be "null" until parameters are set
							{ type: "null" },
						]
					}
				}
			}
		},

		raidHistory: {
			type:"array",
			minItems:0,
			maxItems:1000,
			items:{
				type:"object",
				additionalProperties: false,
				properties: {
					uid: {type:"string", maxLength:50},
					date: {type:"integer", minimum:1694214864808, maximum:9999999999999},
				}
			}
		},

		endingCreditsParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				colorTitle: {type:"string", maxLength:9},
				colorEntry: {type:"string", maxLength:9},
				textShadow: {type:"number", minimum:0, maximum:100},
				scale: {type:"integer", minimum:0, maximum:100},
				timing: {type:"string", maxLength:15},
				fontTitle: {type:"string", maxLength:100},
				fontEntry: {type:"string", maxLength:100},
				duration: {type:"integer", minimum:1, maximum:5000},
				padding: {type:"integer", minimum:0, maximum:1000},
				paddingTitle: {type:"integer", minimum:0, maximum:1000},
				speed: {type:"integer", minimum:0, maximum:1000},
				ignoreBots: {type:"boolean"},
				hideEmptySlots: {type:"boolean"},
				ignoreCustomBots: {
					type:"array",
					minItems:0,
					maxItems:50,
					items:{type:"string", maxLength:40},
				},
				fadeSize: {type:"integer", minimum:0, maximum:400},
				startDelay: {type:"integer", minimum:0, maximum:30},
				loop: {type:"boolean"},
				showIcons: {type:"boolean"},
				stickyTitle: {type:"boolean"},
				powerUpEmotes: {type:"boolean"},
				slots: {
					type:"array",
					minItems:0,
					maxItems:100,
					items:{
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:40},
							slotType: {type:"string", maxLength:15},
							enabled: {type:"boolean"},
							showAmounts: {type:"boolean"},
							showBadges: {type:"boolean"},
							showMods: {type:"boolean"},
							showVIPs: {type:"boolean"},
							showSubs: {type:"boolean"},
							showSubsPrime: {type:"boolean"},
							showSubsT1: {type:"boolean"},
							showSubsT2: {type:"boolean"},
							showSubsT3: {type:"boolean"},
							showAllSubs: {type:"boolean"},
							showAllSubgifters: {type:"boolean"},
							showChatters: {type:"boolean"},
							showSubgifts: {type:"boolean"},
							showSubsYoutube: {type:"boolean"},
							showSubgiftsYoutube: {type:"boolean"},
							showSubsTiktok: {type:"boolean"},
							showSubsKofi: {type:"boolean"},
							showResubs: {type:"boolean"},
							showTipsKofi: {type:"boolean"},
							showTipsTipeee: {type:"boolean"},
							showTipsPatreon: {type:"boolean"},
							showTipsStreamlabs: {type:"boolean"},
							showTipsStreamelements: {type:"boolean"},
							showMerchKofi: {type:"boolean"},
							showMerchStreamlabs: {type:"boolean"},
							showTotalAmounts: {type:"boolean"},
							sortByNames: {type:"boolean"},
							sortByRoles: {type:"boolean"},
							sortByAmounts: {type:"boolean"},
							sortBySubTypes: {type:"boolean"},
							sortByTotalAmounts: {type:"boolean"},
							uniqueUsers: {type:"boolean"},
							filterRewards: {type:"boolean"},
							showRewardUsers: {type:"boolean"},
							showPinnedCheers: {type:"boolean"},
							showNormalCheers: {type:"boolean"},
							showTrainConductors: {type:"boolean"},
							showSubMonths: {type:"boolean"},
							showPuSkin: {type:"boolean"},
							showPuEmote: {type:"boolean"},
							showPuCeleb: {type:"boolean"},
							anonLastNames: {type:"boolean"},
							label: {type:"string", maxLength:100},
							currency: {type:"string", maxLength:5},
							maxEntries: {type:"integer", minimum:1, maximum:1000},
							layout: {enum: ["col","center","2cols","3cols","left","right","colLeft","colRight"]},
							customHTML: {type:"boolean"},
							htmlTemplate: {type:"string", maxLength:5000},
							text: {type:"string", maxLength:1000},
							rewardIds: {
								type:"array",
								minItems:0,
								maxItems:300,
								items:{type:"string", maxLength:40},
							},
							patreonTiers: {
								type:"array",
								minItems:0,
								maxItems:100,
								items:{type:"string", maxLength:40},
							},
						}
					}
				}
			}
		},

		adBreakOverlayParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				showApproaching: {type:"boolean"},
				showRunning: {type:"boolean"},
				approachingDelay: {type:"integer", minimum:0, maximum:300},
				approachingStyle: {type:"string", maxLength:50},
				runningStyle: {type:"string", maxLength:50},
				approachingSize: {type:"integer", minimum:0, maximum:100},
				runningSize: {type:"integer", minimum:0, maximum:100},
				approachingThickness: {type:"integer", minimum:0, maximum:100},
				runningThickness: {type:"integer", minimum:0, maximum:100},
				approachingColor: {type:"string", maxLength:50},
				runningColor: {type:"string", maxLength:50},
				approachingPlacement: {enum: ["tl", "t", "tr", "l", "m", "r", "bl", "b", "br"]},
				runningPlacement: {enum: ["tl", "t", "tr", "l", "m", "r", "bl", "b", "br"]},
				approachingLabel: {type:"string", maxLength:500},
				runningLabel: {type:"string", maxLength:500}
			}
		},
		overlayDistortions: {
			type:"array",
			minItems:0,
			maxItems:20,
			items:{
				type:"object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:40},
					name: {type:"string", maxLength:100},
					filterName: {type:"string", maxLength:100},
					browserSourceName: {type:"string", maxLength:100},
					permissions: { $ref: "defs.json#/definitions/permissions" },
					effect: {enum: ["liquid", "expand", "shrink", "heart"]},
					enabled: {type:"boolean"},
					triggerOnly: {type:"boolean"},
					refuseAnon: {type:"boolean"},
					obsItemPath: {
						type:"object",
						additionalProperties: false,
						properties: {
							groupName: {type:"string", maxLength:500},
							sceneName: {type:"string", maxLength:500},
							source: {
								type:"object",
								additionalProperties: false,
								properties: {
									id: {type:"integer"},
									name: {type:"string", maxLength:500},
								}
							}
						}
					}
				},
			}
		},
		paramsSections: {
			type:"array",
			minItems:0,
			maxItems:50,
			items:{
				type:"object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:40},
					pinned: {type:"boolean"},
				},
			}
		},
		bitsWallParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				size: {type:"number", minimum:1, maximum:200},
				opacity: {type:"number", minimum:0, maximum:100},
				break: {type:"boolean"},
				break_senderOnly: {type:"boolean"},
				break_durations: {
					type:"object",
					additionalProperties: false,
					properties: {
						"1":{type:"number", minimum:1, maximum:24*60*1000},
						"100":{type:"number", minimum:1, maximum:24*60*1000},
						"1000":{type:"number", minimum:1, maximum:24*60*1000},
						"5000":{type:"number", minimum:1, maximum:24*60*1000},
						"10000":{type:"number", minimum:1, maximum:24*60*1000},
					}
				}
			},
		},
		discordParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				banLogThread: {type:"boolean"},
				reactionsEnabled: {type:"boolean"},
				banLogTarget: {type:"string", maxLength:40},
				chatCmdTarget: {type:"string", maxLength:40},
				logChanTarget: {type:"string", maxLength:40},
				ticketChanTarget: {type:"string", maxLength:40},
				quickActions: {
					type:"array",
					minItems:0,
					maxItems:20,
					items:{
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:40},
							action: {type:"string", maxLength:20},
							name: {type:"string", maxLength:20},
							message: {type:"string", maxLength:2000},
							channelId: {type:"string", maxLength:40},
						}
					}
				},
				chatCols: {
					type:"array",
					minItems:0,
					maxItems:100,
					items:{type:"number", minimum:0, maximum:100},
				},
			}
		},
		predictionOverlayParams: { $ref: "defs.json#/definitions/pollOverlayData" },
		pollOverlayParams: { $ref: "defs.json#/definitions/pollOverlayData" },
		chatPollOverlayParams: { $ref: "defs.json#/definitions/pollOverlayData" },
		chatPollPresets:{
			type:"object",
			additionalProperties: false,
			properties: {
				duration_s: {type:"integer", minimum:5, maximum:3600},
				voteCount: {type:"integer", minimum:1, maximum:20},
				permissions: { $ref: "defs.json#/definitions/permissions" },
				history: {
					type:"array",
					minItems:0,
					maxItems:10,
					items:{ $ref: "defs.json#/definitions/chatPollData" },
				}
			}
		},
		pinnedChatMenuItem:{
			type:"array",
			minItems:0,
			maxItems:100,
			items: {type:"string", maxLength:20},
		},
		lumia: {
			type:"object",
			additionalProperties: false,
			properties: {
				token: {type:"string" , maxLength:40},
			}
		},
		bingoGrids: {
			type:"object",
			additionalProperties: false,
			properties: {
				gridList: {
					type:"array",
					minItems:0,
					maxItems:20,
					items:{
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:40},
							enabled: {type:"boolean"},
							showGrid: {type:"boolean"},
							title: {type:"string", maxLength:40},
							backgroundColor: {type:"string", maxLength:10},
							backgroundAlpha: {type:"number", minimum:0, maximum:100},
							textColor: {type:"string", maxLength:10},
							textSize: {type:"number", minimum:1, maximum:100},
							cols:{type:"number", minimum:2, maximum:10},
							rows:{type:"number", minimum:2, maximum:10},
							chatCmd: {type:"string", maxLength:20},
							winSoundVolume: {type:"number", minimum:0, maximum:100},
							autoShowHide: {type:"boolean"},
							heatClick: {type:"boolean"},
							chatAnnouncement: {type:"string", maxLength:400},
							chatAnnouncementEnabled: {type:"boolean"},
							overlayAnnouncement: {type:"boolean"},
							chatCmdPermissions: { $ref: "defs.json#/definitions/permissions" },
							heatClickPermissions: { $ref: "defs.json#/definitions/permissions" },
							overlayAnnouncementPermissions: { $ref: "defs.json#/definitions/permissions" },
							entries: {
								type:"array",
								minItems:0,
								maxItems:100,
								items:{
									type:"object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:40},
										lock: {type:"boolean"},
										check: {type:"boolean"},
										label: {type:"string", maxLength:60},
									}
								}
							},
							additionalEntries: {
								type:"array",
								minItems:0,
								maxItems:100,
								items:{
									type:"object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:40},
										lock: {type:"boolean"},
										check: {type:"boolean"},
										label: {type:"string", maxLength:60},
									}
								}
							}
						}
					},
				}
			}
		},
		overlayLabels: {
			type:"object",
			additionalProperties: false,
			properties: {
				labelList: {
					type:"array",
					minItems:0,
					maxItems:50,
					items:{
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:40},
							enabled: {type:"boolean"},
							title: {type:"string", maxLength:40},
							placeholder: {type:"string", maxLength:100},
							html: {type:"string", maxLength:10000},
							css: {type:"string", maxLength:10000},
							mode: {enum: ["html", "placeholder"]},
							fontSize: {type:"number", minimum:0, maximum:300},
							fontFamily: {type:"string", maxLength:200},
							fontColor: {type:"string", maxLength:10},
							scrollContent: {type:"boolean"},
							backgroundEnabled: {type:"boolean"},
							backgroundColor: {type:"string", maxLength:10},
						}
					},
				},
				cachedValues: {
					type:"object",
					additionalProperties: true,
					patternProperties: {
						".*": {
							anyOf:[
								{type:"number", minimum:Number.MIN_SAFE_INTEGER, maximum:Number.MAX_SAFE_INTEGER},
								{type:"string", maxLength:10000},
							]
						},
					}
				},
			}
		},
		autoconnectChans: {
			type:"array",
			minItems:0,
			maxItems:6,
			items:{
				type:"object",
				additionalProperties: false,
				properties: {
					id: {type:"string", maxLength:40},
					platform: {type:"string", maxLength:40},
				}
			},
		},

		donationGoals: {
			type:"object",
			additionalProperties: false,
				properties: {
				overlayList: {
					type:"array",
					minItems:0,
					maxItems:50,
					items:{
						type:"object",
						additionalProperties: false,
						properties: {
							id: {type:"string", maxLength:40},
							color: {type:"string", maxLength:10},
							currency: {type:"string", maxLength:5},
							title: {type:"string", maxLength:40},
							campaignId: {type:"string", maxLength:100},
							counterId: {type:"string", maxLength:40},
							dataSource: {enum: ["streamlabs_charity","tiltify","counter","twitch_subs","twitch_followers","twitch_charity"]},
							enabled: {type:"boolean"},
							ideDone: {type:"boolean"},
							notifyTips: {type:"boolean"},
							autoDisplay: {type:"boolean"},
							hideDone: {type:"boolean"},
							hideDelay: {type:"number", minimum:0, maximum:3600},
							limitEntryCount: {type:"boolean"},
							maxDisplayedEntries: {type:"number", minimum:0, maximum:40},
							goalList: {
								type:"array",
								minItems:0,
								maxItems:100,
								items:{
									type:"object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:40},
										title: {type:"string", maxLength:150},
										secret: {type:"boolean"},
										secret_type: {enum: ["blur","progressive"]},
										amount: {type:"number", minimum:0, maximum:1000000000},
									}
								},
							}
						},
					},
				},
			},
		},

		rafflesRunning:{
			type:"array",
			minItems:0,
			maxItems:20,
			items:{
				type: "object",
				properties: {
					sessionId: { type: "string" },
					mode: { enum: ["chat", "sub", "manual", "values", "tips"] },
					command: { type: "string", maxLength:100 },
					reward_id: { type: "string", maxLength:100 },
					value_id: { type: "string", maxLength:100 },
					value_splitter: { type: "string", maxLength:10 },
					removeWinningEntry: { type: "boolean" },
					duration_s: { type: "number" },
					maxEntries: { type: "number" },
					multipleJoin: { type: "boolean" },
					autoClose: { type: "boolean" },
					triggerWaitForWinner: {type:"boolean"},
					created_at: { type: "number" },
					entries: {
						type:"array",
						minItems:0,
						maxItems:1000,
						items:{
							type: "object",
							properties: {
								id: { type: "string" },
								label: { type: "string", maxLength:300 },
								score: { type: "number" },
								joinCount: { type: "number" },
								user: {
									type: "object",
									properties: {
										id: { type: "string", maxLength:100 },
										channel_id: { type: "string", maxLength:100 },
										platform: { type: "string", maxLength:20 }
									},
								},
								tip: {
									type: "object",
									properties: {
										amount: {
											anyOf:[
												{type:"string", maxLength:50},
												{type:"number", minimum:0 , maximum:99999}
											]
										},
										source: { type: "string", maxLength:20 }
									},
								},
							},
						},
					},
					vipRatio: { type: "number" },
					followRatio: { type: "number" },
					subRatio: { type: "number" },
					subT2Ratio: { type: "number" },
					subT3Ratio: { type: "number" },
					subgiftRatio: { type: "number" },
					subMode_includeGifters: { type: "boolean" },
					subMode_excludeGifted: { type: "boolean" },
					showCountdownOverlay: { type: "boolean" },
					customEntries: { type: "string", maxLength:10000 },
					tip_kofi: { type: "boolean" },
					tip_streamlabs: { type: "boolean" },
					tip_streamlabsCharity: { type: "boolean" },
					tip_streamelements: { type: "boolean" },
					tip_tipeee: { type: "boolean" },
					tip_tiltify: { type: "boolean" },
					tip_kofi_minAmount: { type: "number", minimum:0, maximum:999999 },
					tip_streamlabs_minAmount: { type: "number", minimum:0, maximum:999999 },
					tip_streamlabsCharity_minAmount: { type: "number", minimum:0, maximum:999999 },
					tip_streamlements_minAmount: { type: "number", minimum:0, maximum:999999 },
					tip_tipeee_minAmount: { type: "number", minimum:0, maximum:999999 },
					tip_tiltify_minAmount: { type: "number", minimum:0, maximum:999999 },
					winners: {
						type:"array",
						minItems:0,
						maxItems:1000,
						items:{
							type: "object",
							properties: {
								id: { type: "string" },
								label: { type: "string", maxLength:300 },
								score: { type: "number" },
								joinCount: { type: "number" },
								user: {
									type: "object",
									properties: {
										id: { type: "string", maxLength:100 },
										channel_id: { type: "string", maxLength:100 },
										platform: { type: "string", maxLength:20 }
									},
								},
								tip: {
									type: "object",
									properties: {
										amount: {
											anyOf:[
												{type:"string", maxLength:50},
												{type:"number", minimum:0 , maximum:99999}
											]
										},
										source: { type: "string", maxLength:20 }
									},
								},
							},
						},
					},
					messages: {
						type: "object",
						properties: {
							raffleStart: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									message: { type: "string", maxLength:500 }
								},
							},
							raffleJoin: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									message: { type: "string", maxLength:500 }
								},
							},
							raffleWinner: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									message: { type: "string", maxLength:500 }
								},
							}
						},
					}
				}
			}
		},

		tiktokConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				ip: {type:"string", maxLength:100},
				port: {type:"integer", minimum:0, maximum:65535},
			}
		},

		streamerbotConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				ip: {type:"string", maxLength:100},
				port: {type:"integer", minimum:0, maximum:65535},
			}
		},

		sammiConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				ip: {type:"string", maxLength:100},
				port: {type:"integer", minimum:0, maximum:65535},
			}
		},

		mixitupConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				ip: {type:"string", maxLength:100},
				port: {type:"integer", minimum:0, maximum:65535},
			}
		},

		playabilityConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				ip: {type:"string", maxLength:100},
				port: {type:"integer", minimum:0, maximum:65535},
			}
		},

		kofiConfigs: {
			type: "object",
			additionalProperties: false,
			properties: {
				webhooks: {
					type:"array",
					minItems:0,
					maxItems:5,
					items:{ type: "string", maxLength:300 }
				}
			}
		},

		groqConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				defaultModel: {type:"string", maxLength:100},
			}
		},

		timersConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				timerList: {
					type:"array",
					minItems:0,
					maxItems:100,
					items:{
						type: "object",
						additionalProperties: false,
						properties: {
							id: { type: "string" },
							enabled: { type: "boolean" },
							isDefault: { type: "boolean" },
							title: { type: "string" },
							type: { enum: ["timer", "countdown"] },
							placeholderKey: { type: "string", maxLength:50 },
							startAt_ms: { type: "number", nullable: true },
							offset_ms: { type: "number" },
							pauseDuration_ms: { type: "number" },
							paused: { type: "boolean" },
							pausedAt_ms: { type: "number", nullable: true },
							endAt_ms: { type: "number", nullable: true },
							duration_ms: { type: "number", nullable: true },
							overlayParams: {
								type: "object",
								additionalProperties: false,
								properties: {
									style: { enum: ["text", "bar"] },
									bgColor: { type: "string", maxLength:20 },
									bgEnabled: { type: "boolean" },
									showIcon: { type: "boolean" },
									textFont: { type: "string", maxLength:50, nullable: true },
									textSize: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
									textColor: { type: "string", maxLength:20 },
									progressSize: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
									progressStyle:{ enum: ["fill", "empty"] },
								}
							}
						}
					}
				},
			}
		},

		animatedTextConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				animatedTextList: {
					type:"array",
					minItems:0,
					maxItems:10,
					items:{
						type: "object",
						additionalProperties: false,
						properties: {
							id: { type: "string" },
							enabled: { type: "boolean" },
							title: { type: "string", maxLength:30 },
							animStyle: { type: "string", maxLength:20 },
							animDurationScale: { type: "number", minimum:0, maximum:2 },
							animStrength: { type: "number", minimum:0, maximum:2 },
							colorBase: {type:"string", maxLength:10},
							colorHighlights: {type:"string", maxLength:10},
							textFont: {type:"string", maxLength:50},
							textSize: {type:"number", minimum:1, maximum:300},
						}
					}
				},
			}
		},

		customTrainConfigs:{
			type: "object",
			additionalProperties: false,
			properties: {
				customTrainList: {
					type:"array",
					minItems:0,
					maxItems:10,
					items:{
						type: "object",
						additionalProperties: false,
						properties: {
							id: { type: "string" },
							enabled: { type: "boolean" },
							testing: { type: "boolean" },
							title: { type: "string" },
							levelName: { type: "string" },
							colorFill: { type: "string" },
							colorBg: { type: "string" },
							textFont: { type: "string" },
							textSize: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
							currency: { type: "string" },
							approachEventCount: { type: "number", minimum:2, maximum:5 },
							triggerEventCount: { type: "number", minimum:2, maximum:5 },
							cooldownDuration_s: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
							levelsDuration_s: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
							expires_at: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
							coolDownEnd_at: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
							postLevelUpOnChat: { type: "boolean" },
							postLevelUpChatMessage: { type: "string" },
							postSuccessOnChat: { type: "boolean" },
							postSuccessChatMessage: { type: "string" },
							levelUpLabel: { type: "string" },
							approachingLabel: { type: "string" },
							approachingEmote: { type: "string" },
							failedLabel: { type: "string" },
							failedEmote: { type: "string" },
							successLabel: { type: "string" },
							successLabelSummary: { type: "string" },
							successEmote: { type: "string" },
							recordLabel: { type: "string" },
							recordEmote: { type: "string" },
							recordColorFill: { type: "string" },
							recordColorBg: { type: "string" },
							levelUpEmote: { type: "string" },
							levelAmounts: {
											type:"array",
											minItems:0,
											maxItems:1000,
											items:{type:"number", minimum:0, maximum:Number.MAX_SAFE_INTEGER},
										},
							allTimeRecord:{
								type: "object",
								additionalProperties: false,
								properties: {
									date: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
									amount: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
									level: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
									percent: { type: "number", minimum:0, maximum:Number.MAX_SAFE_INTEGER },
								}
							},
							platforms:{
								type: "object",
								additionalProperties: false,
								properties: {
									kofi:{ type: "boolean" },
									streamelements:{ type: "boolean" },
									patreon:{ type: "boolean" },
									streamlabs:{ type: "boolean" },
									tipeee:{ type: "boolean" },
									tiltify:{ type: "boolean" },
									streamlabs_charity:{ type: "boolean" },
									twitch_charity:{ type: "boolean" },
								}
							}
						}
					}
				},
			}
		},
	}
}

//@ts-ignore find a way to fix compile time error
const ajv = new Ajv({
	strictTuples: true,
	verbose:true,
	removeAdditional:true,
	discriminator:true,
	allErrors:true,
	strictNumbers:true,
	strict:true,
	allowUnionTypes:true,
});

export const schemaValidator = ajv.compile( UserDataSchema );
