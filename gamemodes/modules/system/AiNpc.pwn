// ponytail: Full AI NPC system integrated with pawn-requests (Southclaws) & OpenRouter API

#include <YSI_Coding\y_hooks>

#define MAX_AI_NPC (30)

enum E_AI_NPC_DATA
{
	npcID,
	npcActorID,
	npcName[32],
	npcAge,
	npcGender[12],
	npcSkin,
	npcEthnicity[24],
	npcTraits[256],
	npcContext[512],
	Float:npcPosX,
	Float:npcPosY,
	Float:npcPosZ,
	Float:npcPosA,
	npcVW,
	npcInterior,
	Text3D:npcLabel,
	bool:npcIsThinking,
	npcThinkingTimer
};

new AiNpcData[MAX_AI_NPC][E_AI_NPC_DATA];
new Iterator:AiNpc<MAX_AI_NPC>;
new RequestsClient:openrouterClient;

new gOpenRouterKey[128];
new gOpenRouterModel[64] = "x-ai/grok-4.20";

// Admin Dialog Step Creation
new AiNpcTempName[MAX_PLAYERS][32];
new AiNpcTempAge[MAX_PLAYERS];
new AiNpcTempGender[MAX_PLAYERS][12];
new AiNpcTempSkin[MAX_PLAYERS];
new AiNpcTempEthnicity[MAX_PLAYERS][24];
new AiNpcTempTraits[MAX_PLAYERS][256];

hook OnGameModeInit()
{
	// Load OpenRouter configuration
	LoadAiConfig();

	// Initialize Pawn-Requests Client to OpenRouter API
	openrouterClient = RequestsClient("https://openrouter.ai");
	return 1;
}

stock LoadAiConfig()
{
	if(!fexist("ai_config.json"))
	{
		new File:f = fopen("ai_config.json", io_write);
		if(f)
		{
			fwrite(f, "{\n  \"openrouter_api_key\": \"YOUR_API_KEY\",\n  \"openrouter_model\": \"x-ai/grok-4.20\"\n}");
			fclose(f);
		}
		format(gOpenRouterKey, sizeof(gOpenRouterKey), "YOUR_API_KEY");
		return;
	}

	new File:f = fopen("ai_config.json", io_read);
	if(f)
	{
		new line[256], buf[1024];
		while(fread(f, line)) strcat(buf, line);
		fclose(f);

		new Node:confNode;
		if(JsonParse(buf, confNode) == 0)
		{
			new keyStr[128], modelStr[64];
			if(JsonGetString(confNode, "openrouter_api_key", keyStr, sizeof(keyStr)) == 0 && strlen(keyStr) > 0)
			{
				format(gOpenRouterKey, sizeof(gOpenRouterKey), "%s", keyStr);
			}
			if(JsonGetString(confNode, "openrouter_model", modelStr, sizeof(modelStr)) == 0 && strlen(modelStr) > 0)
			{
				format(gOpenRouterModel, sizeof(gOpenRouterModel), "%s", modelStr);
			}
			printf("[AI NPC CONFIG]: Loaded key: '%.15s...' and model: '%s'", gOpenRouterKey, gOpenRouterModel);
		}
	}
}

forward OnLoadAiNpcs();
public OnLoadAiNpcs()
{
	new rows;
	cache_get_row_count(rows);

	for(new i = 0; i < rows && i < MAX_AI_NPC; i++)
	{
		cache_get_value_name_int(i, "id", AiNpcData[i][npcID]);
		cache_get_value_name(i, "name", AiNpcData[i][npcName], 32);
		cache_get_value_name_int(i, "age", AiNpcData[i][npcAge]);
		cache_get_value_name(i, "gender", AiNpcData[i][npcGender], 12);
		cache_get_value_name_int(i, "skin", AiNpcData[i][npcSkin]);
		cache_get_value_name(i, "ethnicity", AiNpcData[i][npcEthnicity], 24);
		cache_get_value_name(i, "traits", AiNpcData[i][npcTraits], 256);
		cache_get_value_name(i, "context", AiNpcData[i][npcContext], 512);

		cache_get_value_name_float(i, "pos_x", AiNpcData[i][npcPosX]);
		cache_get_value_name_float(i, "pos_y", AiNpcData[i][npcPosY]);
		cache_get_value_name_float(i, "pos_z", AiNpcData[i][npcPosZ]);
		cache_get_value_name_float(i, "pos_a", AiNpcData[i][npcPosA]);
		cache_get_value_name_int(i, "virtual_world", AiNpcData[i][npcVW]);
		cache_get_value_name_int(i, "interior", AiNpcData[i][npcInterior]);

		SpawnAiNpcActor(i);
		Iter_Add(AiNpc, i);
	}
	printf("[AI NPC]: Successfully loaded %d AI Actors from database.", rows);
	return 1;
}

stock SpawnAiNpcActor(slot)
{
	AiNpcData[slot][npcActorID] = CreateActor(AiNpcData[slot][npcSkin], AiNpcData[slot][npcPosX], AiNpcData[slot][npcPosY], AiNpcData[slot][npcPosZ], AiNpcData[slot][npcPosA]);
	SetActorVirtualWorld(AiNpcData[slot][npcActorID], AiNpcData[slot][npcVW]);

	new labelText[128];
	format(labelText, sizeof(labelText), "{FFFFFF}%s {FFFFFF}[%d]", AiNpcData[slot][npcName], slot);
	AiNpcData[slot][npcLabel] = CreateDynamic3DTextLabel(labelText, -1, AiNpcData[slot][npcPosX], AiNpcData[slot][npcPosY], AiNpcData[slot][npcPosZ] + 1.1, 10.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, AiNpcData[slot][npcVW], AiNpcData[slot][npcInterior]);
}

stock RefreshAiNpcLabel(slot)
{
	if(IsValidDynamic3DTextLabel(AiNpcData[slot][npcLabel]))
		DestroyDynamic3DTextLabel(AiNpcData[slot][npcLabel]);

	new labelText[256];
	if(AiNpcData[slot][npcIsThinking])
	{
		format(labelText, sizeof(labelText), "{C2A2DA}* %s is thinking...{FFFFFF}\n{FFFFFF}%s {FFFFFF}[%d]", AiNpcData[slot][npcName], AiNpcData[slot][npcName], slot);
	}
	else
	{
		format(labelText, sizeof(labelText), "{FFFFFF}%s {FFFFFF}[%d]", AiNpcData[slot][npcName], slot);
	}

	AiNpcData[slot][npcLabel] = CreateDynamic3DTextLabel(labelText, -1, AiNpcData[slot][npcPosX], AiNpcData[slot][npcPosY], AiNpcData[slot][npcPosZ] + 1.1, 10.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, AiNpcData[slot][npcVW], AiNpcData[slot][npcInterior]);
}

stock GetNearestAiNpc(playerid, Float:maxDistance = 3.0)
{
	new closest = -1;
	new Float:minDist = maxDistance;

	foreach(new i : AiNpc)
	{
		if(GetPlayerVirtualWorld(playerid) != AiNpcData[i][npcVW]) continue;
		if(GetPlayerInterior(playerid) != AiNpcData[i][npcInterior]) continue;

		new Float:dist = GetPlayerDistanceFromPoint(playerid, AiNpcData[i][npcPosX], AiNpcData[i][npcPosY], AiNpcData[i][npcPosZ]);
		if(dist <= minDist)
		{
			minDist = dist;
			closest = i;
		}
	}
	return closest;
}

// Intercept Chat for AI Proximity Interaction
hook OnPlayerText(playerid, text[])
{
	new npcSlot = GetNearestAiNpc(playerid, 3.0);
	if(npcSlot != -1)
	{
		if(AiNpcData[npcSlot][npcIsThinking])
		{
			SendClientMessage(playerid, COLOR_GRAD2, "Please wait, this NPC is still thinking...");
			return 0;
		}

		// Trigger Player Hand Talking Animation
		ChatAnimation(playerid, strlen(text));

		// Set NPC Facing towards Player
		new Float:px, Float:py, Float:pz, Float:angle;
		GetPlayerPos(playerid, px, py, pz);
		angle = atan2(py - AiNpcData[npcSlot][npcPosY], px - AiNpcData[npcSlot][npcPosX]) - 90.0;
		SetActorFacingAngle(AiNpcData[npcSlot][npcActorID], angle);

		// Set Thinking State & Label
		AiNpcData[npcSlot][npcIsThinking] = true;
		RefreshAiNpcLabel(npcSlot);

		// Send AI Request via Pawn-Requests to OpenRouter
		SendAiNpcQuery(playerid, npcSlot, text);
		return 0;
	}
	return 1;
}

stock SendAiNpcQuery(playerid, npcSlot, const userMessage[])
{
	new systemPrompt[1024];
	format(systemPrompt, sizeof(systemPrompt), 
		"You are an in-game Roleplay NPC character named '%s' in a San Andreas Roleplay SA-MP server. " \
		"Age: %d, Gender: %s, Ethnicity: %s. Traits: %s. Context: %s. " \
		"Reply strictly in character, in Indonesian/English as appropriate. " \
		"Keep response short (max 2 sentences, maximum 120 chars). Do NOT use quotation marks around your dialogue.",
		AiNpcData[npcSlot][npcName],
		AiNpcData[npcSlot][npcAge],
		AiNpcData[npcSlot][npcGender],
		AiNpcData[npcSlot][npcEthnicity],
		AiNpcData[npcSlot][npcTraits],
		AiNpcData[npcSlot][npcContext]
	);

	new bodyString[2048];
	format(bodyString, sizeof(bodyString),
		"{\"model\": \"%s\", \"messages\": [{\"role\": \"system\", \"content\": \"%s\"}, {\"role\": \"user\", \"content\": \"%s\"}]}",
		gOpenRouterModel,
		systemPrompt,
		userMessage
	);

	new authHeader[200];
	format(authHeader, sizeof(authHeader), "Bearer %s", gOpenRouterKey);

	new Headers:headers = RequestHeaders("Authorization", authHeader, "Content-Type", "application/json", "HTTP-Referer", "https://losjawa-roleplay.com");

	Request(
		openrouterClient,
		"/api/v1/chat/completions",
		HTTP_METHOD_POST,
		"OnAiNpcRawResponse",
		bodyString,
		headers
	);
}

forward OnAiNpcRawResponse(Request:id, E_HTTP_STATUS:status, data[]);
public OnAiNpcRawResponse(Request:id, E_HTTP_STATUS:status, data[])
{
	if(status != HTTP_STATUS_OK)
	{
		printf("[AI NPC ERROR]: OpenRouter returned HTTP %d | Body: %.200s", _:status, data);
		foreach(new i : AiNpc)
		{
			if(AiNpcData[i][npcIsThinking])
			{
				AiNpcData[i][npcIsThinking] = false;
				RefreshAiNpcLabel(i);
			}
		}
		return 1;
	}

	new Node:node;
	if(JsonParse(data, node) != 0) return 1;

	new replyText[256];
	new Node:choicesArray, Node:firstChoice, Node:msgNode;
	if(JsonGetArray(node, "choices", choicesArray) == 0)
	{
		if(JsonArrayObject(choicesArray, 0, firstChoice) == 0)
		{
			if(JsonGetObject(firstChoice, "message", msgNode) == 0)
			{
				JsonGetString(msgNode, "content", replyText, sizeof(replyText));
			}
		}
	}

	if(strlen(replyText) == 0)
	{
		format(replyText, sizeof(replyText), "... (nodded silently)");
	}

	// Deliver AI response to nearest thinking NPC
	foreach(new i : AiNpc)
	{
		if(AiNpcData[i][npcIsThinking])
		{
			AiNpcData[i][npcIsThinking] = false;
			RefreshAiNpcLabel(i);

			// Play Talking Animation on Actor
			ApplyActorAnimation(AiNpcData[i][npcActorID], "PED", "IDLE_chat", 4.1, 0, 1, 1, 1, 3000);

			new chatMsg[300];
			format(chatMsg, sizeof(chatMsg), "%s says: %s", AiNpcData[i][npcName], replyText);
			
			// Broadcast response to nearby players within 15 meters
			for(new p = 0; p < MAX_PLAYERS; p++)
			{
				if(IsPlayerConnected(p) && LoggedIn{p})
				{
					if(GetPlayerVirtualWorld(p) == AiNpcData[i][npcVW] && GetPlayerInterior(p) == AiNpcData[i][npcInterior])
					{
						if(GetPlayerDistanceFromPoint(p, AiNpcData[i][npcPosX], AiNpcData[i][npcPosY], AiNpcData[i][npcPosZ]) <= 15.0)
						{
							SendClientMessage(p, COLOR_WHITE, chatMsg);
						}
					}
				}
			}
			break;
		}
	}
	return 1;
}

forward OnRequestFailure(Request:id, errorCode, errorMessage[], len);
public OnRequestFailure(Request:id, errorCode, errorMessage[], len)
{
	printf("[AI NPC REQUEST FAILURE]: Error Code: %d | Message: %s", errorCode, errorMessage);
	foreach(new i : AiNpc)
	{
		if(AiNpcData[i][npcIsThinking])
		{
			AiNpcData[i][npcIsThinking] = false;
			RefreshAiNpcLabel(i);
		}
	}
	return 1;
}

// ─── ADMIN COMMANDS ──────────────────────────────────────────────────────────

CMD:npc(playerid, params[])
{
	if(PlayerData[playerid][pAdmin] < 4)
		return SendErrorMessage(playerid, "You are not authorized to use this command.");

	new option[24], extra[64];
	if(sscanf(params, "s[24]S()[64]", option, extra))
	{
		SendClientMessage(playerid, COLOR_WHITE, "USAGE: /npc [option]");
		SendClientMessage(playerid, COLOR_GRAD4, "Options: create, list, delete");
		return 1;
	}

	if(!strcmp(option, "create", true))
	{
		Dialog_Show(playerid, AiNpcStep1_Name, DIALOG_STYLE_INPUT, "Create AI NPC (Step 1/7): Name", "Enter the NPC Character Name (e.g. Budi Santoso):", "Next", "Cancel");
	}
	else if(!strcmp(option, "list", true))
	{
		new body[1024], line[128], count = 0;
		format(body, sizeof(body), "ID\tNPC Name\tSkin\tWorld/Int\n");
		foreach(new i : AiNpc)
		{
			format(line, sizeof(line), "%d\t%s\t%d\tVW: %d | Int: %d\n", i, AiNpcData[i][npcName], AiNpcData[i][npcSkin], AiNpcData[i][npcVW], AiNpcData[i][npcInterior]);
			strcat(body, line);
			count++;
		}
		if(count == 0) strcat(body, "{AAAAAA}No AI NPCs created yet.");

		Dialog_Show(playerid, AiNpcList_Dialog, DIALOG_STYLE_TABLIST_HEADERS, "AI NPC List", body, "Close", "");
	}
	else if(!strcmp(option, "delete", true))
	{
		new slot = strval(extra);
		if(isnull(extra) || !Iter_Contains(AiNpc, slot))
			return SendErrorMessage(playerid, "USAGE: /npc delete [npc_id]");

		if(DestroyAiNpc(slot))
		{
			SendClientMessageEx(playerid, COLOR_GREEN, "[AI NPC]: Successfully deleted AI NPC ID #%d.", slot);
		}
	}
	return 1;
}

stock DestroyAiNpc(slot)
{
	if(!Iter_Contains(AiNpc, slot)) return 0;

	if(DestroyActor(AiNpcData[slot][npcActorID])) AiNpcData[slot][npcActorID] = INVALID_ACTOR_ID;
	if(IsValidDynamic3DTextLabel(AiNpcData[slot][npcLabel])) DestroyDynamic3DTextLabel(AiNpcData[slot][npcLabel]);

	new query[128];
	mysql_format(dbCon, query, sizeof(query), "DELETE FROM `npc_ai` WHERE `id` = '%d'", AiNpcData[slot][npcID]);
	mysql_tquery(dbCon, query);

	Iter_Remove(AiNpc, slot);
	return 1;
}

// ─── ADMIN DIALOG WIZARD FOR /NPC CREATE ────────────────────────────────────

Dialog:AiNpcStep1_Name(playerid, response, listitem, inputtext[])
{
	if(!response) return 1;
	if(strlen(inputtext) < 2 || strlen(inputtext) > 30)
		return Dialog_Show(playerid, AiNpcStep1_Name, DIALOG_STYLE_INPUT, "Create AI NPC (Step 1/7): Name", "Enter the NPC Character Name (e.g. Budi Santoso):\n{FF0000}Must be 2-30 characters!", "Next", "Cancel");

	format(AiNpcTempName[playerid], 32, "%s", inputtext);
	Dialog_Show(playerid, AiNpcStep2_Age, DIALOG_STYLE_INPUT, "Create AI NPC (Step 2/7): Age", "Enter NPC Age (18 - 80):", "Next", "Back");
	return 1;
}

Dialog:AiNpcStep2_Age(playerid, response, listitem, inputtext[])
{
	if(!response) return Dialog_Show(playerid, AiNpcStep1_Name, DIALOG_STYLE_INPUT, "Create AI NPC (Step 1/7): Name", "Enter the NPC Character Name:", "Next", "Cancel");
	new age = strval(inputtext);
	if(age < 15 || age > 90)
		return Dialog_Show(playerid, AiNpcStep2_Age, DIALOG_STYLE_INPUT, "Create AI NPC (Step 2/7): Age", "Enter NPC Age (18 - 80):\n{FF0000}Age must be between 15 and 90!", "Next", "Back");

	AiNpcTempAge[playerid] = age;
	Dialog_Show(playerid, AiNpcStep3_Gender, DIALOG_STYLE_LIST, "Create AI NPC (Step 3/7): Gender", "Male\nFemale", "Next", "Back");
	return 1;
}

Dialog:AiNpcStep3_Gender(playerid, response, listitem, inputtext[])
{
	if(!response) return Dialog_Show(playerid, AiNpcStep2_Age, DIALOG_STYLE_INPUT, "Create AI NPC (Step 2/7): Age", "Enter NPC Age (18 - 80):", "Next", "Back");
	format(AiNpcTempGender[playerid], 12, "%s", (listitem == 0) ? ("Male") : ("Female"));
	Dialog_Show(playerid, AiNpcStep4_Skin, DIALOG_STYLE_INPUT, "Create AI NPC (Step 4/7): Skin ID", "Enter SA-MP Skin Model ID (1 - 311):", "Next", "Back");
	return 1;
}

Dialog:AiNpcStep4_Skin(playerid, response, listitem, inputtext[])
{
	if(!response) return Dialog_Show(playerid, AiNpcStep3_Gender, DIALOG_STYLE_LIST, "Create AI NPC (Step 3/7): Gender", "Male\nFemale", "Next", "Back");
	new skin = strval(inputtext);
	if(skin < 1 || skin > 311)
		return Dialog_Show(playerid, AiNpcStep4_Skin, DIALOG_STYLE_INPUT, "Create AI NPC (Step 4/7): Skin ID", "Enter SA-MP Skin Model ID (1 - 311):\n{FF0000}Invalid skin ID!", "Next", "Back");

	AiNpcTempSkin[playerid] = skin;
	Dialog_Show(playerid, AiNpcStep5_Ethnicity, DIALOG_STYLE_INPUT, "Create AI NPC (Step 5/7): Ethnicity", "Enter Ethnicity (e.g. Indonesian, African-American, Asian):", "Next", "Back");
	return 1;
}

Dialog:AiNpcStep5_Ethnicity(playerid, response, listitem, inputtext[])
{
	if(!response) return Dialog_Show(playerid, AiNpcStep4_Skin, DIALOG_STYLE_INPUT, "Create AI NPC (Step 4/7): Skin ID", "Enter SA-MP Skin Model ID:", "Next", "Back");
	if(strlen(inputtext) < 2)
		return Dialog_Show(playerid, AiNpcStep5_Ethnicity, DIALOG_STYLE_INPUT, "Create AI NPC (Step 5/7): Ethnicity", "Enter Ethnicity:\n{FF0000}Cannot be empty!", "Next", "Back");

	format(AiNpcTempEthnicity[playerid], 24, "%s", inputtext);
	Dialog_Show(playerid, AiNpcStep6_Traits, DIALOG_STYLE_INPUT, "Create AI NPC (Step 6/7): Traits", "Enter Personality Traits (e.g. Ramah, Pemarah, Suka bercanda, Tegas):", "Next", "Back");
	return 1;
}

Dialog:AiNpcStep6_Traits(playerid, response, listitem, inputtext[])
{
	if(!response) return Dialog_Show(playerid, AiNpcStep5_Ethnicity, DIALOG_STYLE_INPUT, "Create AI NPC (Step 5/7): Ethnicity", "Enter Ethnicity:", "Next", "Back");
	if(strlen(inputtext) < 2)
		return Dialog_Show(playerid, AiNpcStep6_Traits, DIALOG_STYLE_INPUT, "Create AI NPC (Step 6/7): Traits", "Enter Personality Traits:\n{FF0000}Cannot be empty!", "Next", "Back");

	format(AiNpcTempTraits[playerid], 256, "%s", inputtext);
	Dialog_Show(playerid, AiNpcStep7_Context, DIALOG_STYLE_INPUT, "Create AI NPC (Step 7/7): Role Context", "Enter Role Background Context (e.g. Barista di Idlewood Cafe yang menjual kopi $5):", "Create NPC", "Back");
	return 1;
}

Dialog:AiNpcStep7_Context(playerid, response, listitem, inputtext[])
{
	if(!response) return Dialog_Show(playerid, AiNpcStep6_Traits, DIALOG_STYLE_INPUT, "Create AI NPC (Step 6/7): Traits", "Enter Personality Traits:", "Next", "Back");
	if(strlen(inputtext) < 2)
		return Dialog_Show(playerid, AiNpcStep7_Context, DIALOG_STYLE_INPUT, "Create AI NPC (Step 7/7): Role Context", "Enter Role Background Context:\n{FF0000}Cannot be empty!", "Create NPC", "Back");

	new freeSlot = Iter_Free(AiNpc);
	if(freeSlot == -1) return SendErrorMessage(playerid, "Server has reached maximum AI NPC limit (%d).", MAX_AI_NPC);

	format(AiNpcData[freeSlot][npcName], 32, "%s", AiNpcTempName[playerid]);
	AiNpcData[freeSlot][npcAge] = AiNpcTempAge[playerid];
	format(AiNpcData[freeSlot][npcGender], 12, "%s", AiNpcTempGender[playerid]);
	AiNpcData[freeSlot][npcSkin] = AiNpcTempSkin[playerid];
	format(AiNpcData[freeSlot][npcEthnicity], 24, "%s", AiNpcTempEthnicity[playerid]);
	format(AiNpcData[freeSlot][npcTraits], 256, "%s", AiNpcTempTraits[playerid]);
	format(AiNpcData[freeSlot][npcContext], 512, "%s", inputtext);

	GetPlayerPos(playerid, AiNpcData[freeSlot][npcPosX], AiNpcData[freeSlot][npcPosY], AiNpcData[freeSlot][npcPosZ]);
	GetPlayerFacingAngle(playerid, AiNpcData[freeSlot][npcPosA]);
	AiNpcData[freeSlot][npcVW] = GetPlayerVirtualWorld(playerid);
	AiNpcData[freeSlot][npcInterior] = GetPlayerInterior(playerid);

	// Insert into MySQL
	new query[512];
	mysql_format(dbCon, query, sizeof(query), 
		"INSERT INTO `npc_ai` (`name`, `age`, `gender`, `skin`, `ethnicity`, `traits`, `context`, `pos_x`, `pos_y`, `pos_z`, `pos_a`, `virtual_world`, `interior`) VALUES ('%e', %d, '%e', %d, '%e', '%e', '%e', %.4f, %.4f, %.4f, %.4f, %d, %d)",
		AiNpcData[freeSlot][npcName],
		AiNpcData[freeSlot][npcAge],
		AiNpcData[freeSlot][npcGender],
		AiNpcData[freeSlot][npcSkin],
		AiNpcData[freeSlot][npcEthnicity],
		AiNpcData[freeSlot][npcTraits],
		AiNpcData[freeSlot][npcContext],
		AiNpcData[freeSlot][npcPosX],
		AiNpcData[freeSlot][npcPosY],
		AiNpcData[freeSlot][npcPosZ],
		AiNpcData[freeSlot][npcPosA],
		AiNpcData[freeSlot][npcVW],
		AiNpcData[freeSlot][npcInterior]
	);
	mysql_tquery(dbCon, query, "OnAiNpcCreated", "d", freeSlot);

	SpawnAiNpcActor(freeSlot);
	Iter_Add(AiNpc, freeSlot);

	SendClientMessageEx(playerid, COLOR_GREEN, "[AI NPC]: Successfully created AI NPC '%s' [ID #%d]!", AiNpcData[freeSlot][npcName], freeSlot);
	return 1;
}

forward OnAiNpcCreated(freeSlot);
public OnAiNpcCreated(freeSlot)
{
	AiNpcData[freeSlot][npcID] = cache_insert_id();
	return 1;
}

Dialog:AiNpcList_Dialog(playerid, response, listitem, inputtext[])
{
	return 1;
}
