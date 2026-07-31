// ============================================================================
// Module: MedicinePoint.pwn
// Description: Medical Pickup Points, Medical Supplies, Overdose & Medicine Distribution
// ============================================================================

#define MAX_MEDICINE_POINTS 32

enum E_MEDICINE_POINT
{
	mpID,
	bool:mpExists,
	Float:mpPosX,
	Float:mpPosY,
	Float:mpPosZ,
	mpWorld,
	mpInterior,
	mpPickup
};

new MedicinePoints[MAX_MEDICINE_POINTS][E_MEDICINE_POINT];

// Load medicine points from MySQL on startup
forward OnMedicinePointsLoaded();
public OnMedicinePointsLoaded()
{
	new rows = cache_num_rows();

	for(new i = 0; i < rows && i < MAX_MEDICINE_POINTS; i++)
	{
		MedicinePoints[i][mpExists] = true;
		cache_get_value_name_int(i, "id", MedicinePoints[i][mpID]);
		cache_get_value_name_float(i, "pos_x", MedicinePoints[i][mpPosX]);
		cache_get_value_name_float(i, "pos_y", MedicinePoints[i][mpPosY]);
		cache_get_value_name_float(i, "pos_z", MedicinePoints[i][mpPosZ]);
		cache_get_value_name_int(i, "world", MedicinePoints[i][mpWorld]);
		cache_get_value_name_int(i, "interior", MedicinePoints[i][mpInterior]);

		if(IsValidDynamicPickup(MedicinePoints[i][mpPickup]))
			DestroyDynamicPickup(MedicinePoints[i][mpPickup]);

		MedicinePoints[i][mpPickup] = CreateDynamicPickup(1240, 23, 
			MedicinePoints[i][mpPosX], MedicinePoints[i][mpPosY], MedicinePoints[i][mpPosZ], 
			MedicinePoints[i][mpWorld], MedicinePoints[i][mpInterior]);
	}
	printf("[SYSTEM] Loaded %d Medical Pickup Points from database.", rows);
	return 1;
}

stock LoadMedicinePoints()
{
	for(new i = 0; i < MAX_MEDICINE_POINTS; i++)
	{
		MedicinePoints[i][mpExists] = false;
		if(IsValidDynamicPickup(MedicinePoints[i][mpPickup]))
		{
			DestroyDynamicPickup(MedicinePoints[i][mpPickup]);
			MedicinePoints[i][mpPickup] = 0;
		}
	}
	mysql_tquery(dbCon, "SELECT * FROM `medicine_points`", "OnMedicinePointsLoaded", "");
	return 1;
}

stock GetNearestMedicinePoint(playerid, Float:maxDist = 3.0)
{
	new Float:px, Float:py, Float:pz;
	GetPlayerPos(playerid, px, py, pz);
	new vw = GetPlayerVirtualWorld(playerid);
	new intid = GetPlayerInterior(playerid);

	for(new i = 0; i < MAX_MEDICINE_POINTS; i++)
	{
		if(MedicinePoints[i][mpExists])
		{
			if(MedicinePoints[i][mpWorld] == vw && MedicinePoints[i][mpInterior] == intid)
			{
				if(GetPlayerDistanceFromPoint(playerid, MedicinePoints[i][mpPosX], MedicinePoints[i][mpPosY], MedicinePoints[i][mpPosZ]) <= maxDist)
				{
					return i;
				}
			}
		}
	}
	return -1;
}

// ----------------------------------------------------------------------------
// ADMIN COMMANDS: /medicinepoint [create/delete/list]
// ----------------------------------------------------------------------------

CMD:medicinepoint(playerid, params[])
{
	if(PlayerData[playerid][pAdmin] < 4)
		return SendErrorMessage(playerid, "You do not have permission to use this command.");

	new option[32], extra[64];
	if(sscanf(params, "s[32]S()[64]", option, extra))
	{
		SendSyntaxMessage(playerid, "/medicinepoint [option]");
		SendClientMessage(playerid, COLOR_WHITE, "Options: create, delete, list");
		return 1;
	}

	if(!strcmp(option, "create", true))
	{
		new slot = -1;
		for(new i = 0; i < MAX_MEDICINE_POINTS; i++)
		{
			if(!MedicinePoints[i][mpExists])
			{
				slot = i;
				break;
			}
		}

		if(slot == -1)
			return SendErrorMessage(playerid, "Maximum medicine pickup points limit reached (%d).", MAX_MEDICINE_POINTS);

		new Float:x, Float:y, Float:z;
		GetPlayerPos(playerid, x, y, z);
		new vw = GetPlayerVirtualWorld(playerid);
		new intid = GetPlayerInterior(playerid);

		new query[256];
		mysql_format(dbCon, query, sizeof(query), 
			"INSERT INTO `medicine_points` (`pos_x`, `pos_y`, `pos_z`, `world`, `interior`) VALUES ('%.4f', '%.4f', '%.4f', '%d', '%d')",
			x, y, z, vw, intid);
		
		new Cache:result = mysql_query(dbCon, query);
		new insertID = cache_insert_id();
		cache_delete(result);

		MedicinePoints[slot][mpExists] = true;
		MedicinePoints[slot][mpID] = insertID;
		MedicinePoints[slot][mpPosX] = x;
		MedicinePoints[slot][mpPosY] = y;
		MedicinePoints[slot][mpPosZ] = z;
		MedicinePoints[slot][mpWorld] = vw;
		MedicinePoints[slot][mpInterior] = intid;

		if(IsValidDynamicPickup(MedicinePoints[slot][mpPickup]))
			DestroyDynamicPickup(MedicinePoints[slot][mpPickup]);

		MedicinePoints[slot][mpPickup] = CreateDynamicPickup(1240, 23, x, y, z, vw, intid);

		SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "Admin %s has created Medical Pickup Point ID: %d (Slot: %d).", ReturnName(playerid, 0), insertID, slot);
		return 1;
	}
	else if(!strcmp(option, "delete", true))
	{
		new id;
		if(sscanf(extra, "d", id))
			return SendSyntaxMessage(playerid, "/medicinepoint delete [point_id]");

		new slot = -1;
		for(new i = 0; i < MAX_MEDICINE_POINTS; i++)
		{
			if(MedicinePoints[i][mpExists] && MedicinePoints[i][mpID] == id)
			{
				slot = i;
				break;
			}
		}

		if(slot == -1)
			return SendErrorMessage(playerid, "Medical Pickup Point ID %d not found.", id);

		new query[128];
		mysql_format(dbCon, query, sizeof(query), "DELETE FROM `medicine_points` WHERE `id` = '%d' LIMIT 1", id);
		mysql_tquery(dbCon, query);

		if(IsValidDynamicPickup(MedicinePoints[slot][mpPickup]))
			DestroyDynamicPickup(MedicinePoints[slot][mpPickup]);

		MedicinePoints[slot][mpExists] = false;
		MedicinePoints[slot][mpPickup] = 0;

		SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "Admin %s has deleted Medical Pickup Point ID: %d.", ReturnName(playerid, 0), id);
		return 1;
	}
	else if(!strcmp(option, "list", true))
	{
		new count = 0;
		SendClientMessage(playerid, COLOR_GREEN, "|___________ Medical Pickup Points ___________|");
		for(new i = 0; i < MAX_MEDICINE_POINTS; i++)
		{
			if(MedicinePoints[i][mpExists])
			{
				SendClientMessageEx(playerid, COLOR_WHITE, "ID: %d | Slot: %d | Pos: (%.1f, %.1f, %.1f) | VW: %d | Int: %d",
					MedicinePoints[i][mpID], i, MedicinePoints[i][mpPosX], MedicinePoints[i][mpPosY], MedicinePoints[i][mpPosZ],
					MedicinePoints[i][mpWorld], MedicinePoints[i][mpInterior]);
				count++;
			}
		}
		if(count == 0)
			SendClientMessage(playerid, COLOR_GRAD2, "No medical pickup points created yet.");

		return 1;
	}

	SendSyntaxMessage(playerid, "/medicinepoint [create/delete/list]");
	return 1;
}

// ----------------------------------------------------------------------------
// FACTION COMMAND: /takemedicine
// ----------------------------------------------------------------------------

CMD:takemedicine(playerid, params[])
{
	// Must be in LSFD (Faction type / ID for Medical)
	// Checking if player is in Fire / EMS faction or on duty
	if(PlayerData[playerid][pFaction] == -1)
		return SendErrorMessage(playerid, "You are not a member of a medical faction.");

	new point = GetNearestMedicinePoint(playerid, 3.5);
	if(point == -1)
		return SendErrorMessage(playerid, "You are not near any Medical Pickup Point.");

	Dialog_Show(playerid, TakeMedicine_Menu, DIALOG_STYLE_TABLIST_HEADERS,
		"Medical Dispensary - Take Medicine",
		"Medicine Name\tType\tStock / Info\n\
		{00FF88}Narcan (Naloxone)\t{FFFFFF}Injection\t{CCCCCC}Overdose Reversal\n\
		{FFBB55}First Aid Kit\t{FFFFFF}Medical\t{CCCCCC}Emergency Healing",
		"Take", "Close");
	return 1;
}

Dialog:TakeMedicine_Menu(playerid, response, listitem, inputtext[])
{
	if(!response) return 1;

	new point = GetNearestMedicinePoint(playerid, 4.0);
	if(point == -1)
		return SendErrorMessage(playerid, "You left the medical pickup point.");

	switch(listitem)
	{
		case 0: // Narcan
		{
			if(PlayerData[playerid][pNarcan] >= 5)
				return SendErrorMessage(playerid, "You cannot carry more than 5 Narcan doses.");

			PlayerData[playerid][pNarcan] += 2;
			if(PlayerData[playerid][pNarcan] > 5) PlayerData[playerid][pNarcan] = 5;

			SendClientMessageEx(playerid, COLOR_YELLOW, "You have taken Narcan from the dispensary. (Current: %d doses)", PlayerData[playerid][pNarcan]);
			ApplyAnimation(playerid, "BOMBER", "BOM_Plant", 4.0, 0, 0, 0, 0, 0, 1);
		}
		case 1: // First Aid Kit
		{
			if(PlayerData[playerid][pMedkits] >= 3)
				return SendErrorMessage(playerid, "You cannot carry more than 3 First Aid Kits.");

			PlayerData[playerid][pMedkits]++;
			SendClientMessageEx(playerid, COLOR_YELLOW, "You have taken a First Aid Kit from the dispensary. (Current: %d kits)", PlayerData[playerid][pMedkits]);
			ApplyAnimation(playerid, "BOMBER", "BOM_Plant", 4.0, 0, 0, 0, 0, 0, 1);
		}
	}
	return 1;
}

// ----------------------------------------------------------------------------
// PLAYER COMMAND: /givemedicine [playerid]
// ----------------------------------------------------------------------------

CMD:givemedicine(playerid, params[])
{
	new targetid;
	if(sscanf(params, "u", targetid))
		return SendSyntaxMessage(playerid, "/givemedicine [playerid/PartOfName]");

	if(targetid == INVALID_PLAYER_ID)
		return SendErrorMessage(playerid, "Invalid player specified.");

	if(targetid == playerid)
		return SendErrorMessage(playerid, "You cannot use this on yourself.");

	new Float:x, Float:y, Float:z;
	GetPlayerPos(targetid, x, y, z);
	if(GetPlayerDistanceFromPoint(playerid, x, y, z) > 4.0)
		return SendErrorMessage(playerid, "You are too far away from that player.");

	SetPVarInt(playerid, "GiveMedicine_Target", targetid);

	new body[512];
	format(body, sizeof(body), 
		"Medicine Item\tQuantity / Status\n\
		{00FF88}Narcan Injection\t{FFFFFF}%d Dose(s)\n\
		{FFBB55}First Aid Kit\t{FFFFFF}%d Kit(s)",
		PlayerData[playerid][pNarcan],
		PlayerData[playerid][pMedkits]);

	Dialog_Show(playerid, GiveMedicine_Menu, DIALOG_STYLE_TABLIST_HEADERS,
		"Give / Administer Medicine",
		body, "Administer", "Cancel");
	return 1;
}

Dialog:GiveMedicine_Menu(playerid, response, listitem, inputtext[])
{
	if(!response) return 1;

	new targetid = GetPVarInt(playerid, "GiveMedicine_Target");
	DeletePVar(playerid, "GiveMedicine_Target");

	if(!IsPlayerConnected(targetid))
		return SendErrorMessage(playerid, "Target player is no longer connected.");

	new Float:x, Float:y, Float:z;
	GetPlayerPos(targetid, x, y, z);
	if(GetPlayerDistanceFromPoint(playerid, x, y, z) > 4.0)
		return SendErrorMessage(playerid, "You are too far away from the target player.");

	switch(listitem)
	{
		case 0: // Administer Narcan
		{
			if(PlayerData[playerid][pNarcan] <= 0)
				return SendErrorMessage(playerid, "You do not have any Narcan doses in your inventory.");

			PlayerData[playerid][pNarcan]--;

			// Revive from Fentanyl Overdose if target is overdosing
			if(PlayerData[targetid][pOverdosing])
			{
				PlayerData[targetid][pOverdosing] = 0;
				ClearAnimations(targetid);
				TogglePlayerControllable(targetid, 1);

				SendClientMessageEx(playerid, COLOR_GREEN, "You administered Narcan to %s. They have recovered from the Overdose!", ReturnName(targetid, 0));
				SendClientMessageEx(targetid, COLOR_GREEN, "%s administered Narcan to you! Your overdose symptoms have cleared and you woke up.", ReturnName(playerid, 0));
				GameTextForPlayer(targetid, "~g~NARCAN ADMINISTERED~n~~w~Overdose Reversed!", 4000, 3);
			}
			else
			{
				SendClientMessageEx(playerid, COLOR_YELLOW, "You administered Narcan to %s.", ReturnName(targetid, 0));
				SendClientMessageEx(targetid, COLOR_YELLOW, "%s administered a dose of Narcan to you.", ReturnName(playerid, 0));
			}

			new str[128];
			format(str, sizeof(str), "* %s administers a dose of Narcan to %s.", ReturnName(playerid, 0), ReturnName(targetid, 0));
			SetPlayerChatBubble(playerid, str, COLOR_PURPLE, 30.0, 6000);
			ApplyAnimation(playerid, "MEDIC", "CPR", 4.0, 0, 0, 0, 0, 0, 1);
		}
		case 1: // First Aid Kit
		{
			if(PlayerData[playerid][pMedkits] <= 0)
				return SendErrorMessage(playerid, "You do not have any First Aid Kits in your inventory.");

			PlayerData[playerid][pMedkits]--;

			new Float:hp = PlayerData[targetid][pHealth];
			hp += 35.0;
			if(hp > 100.0) hp = 100.0;
			SetPlayerHealthEx(targetid, hp);

			SendClientMessageEx(playerid, COLOR_GREEN, "You used a First Aid Kit on %s (+35 HP).", ReturnName(targetid, 0));
			SendClientMessageEx(targetid, COLOR_GREEN, "%s treated your injuries with a First Aid Kit (+35 HP).", ReturnName(playerid, 0));

			new str[128];
			format(str, sizeof(str), "* %s treats %s's injuries using a First Aid Kit.", ReturnName(playerid, 0), ReturnName(targetid, 0));
			SetPlayerChatBubble(playerid, str, COLOR_PURPLE, 30.0, 6000);
			ApplyAnimation(playerid, "MEDIC", "CPR", 4.0, 0, 0, 0, 0, 0, 1);
		}
	}
	return 1;
}


