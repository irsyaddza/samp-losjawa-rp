/*
	CCTV System for Police and Sheriff Factions
	Los Jawa Roleplay
*/

#define MAX_CCTV (50)
#define CCTV_VW_OFFSET (10000) // Virtual World offset for CCTV viewers (invisible to main world)


enum E_CCTV_DATA
{
	cctvID,
	cctvName[64],
	cctvObjID,
	Text3D:cctvLabel,
	Float:cctvObjX,
	Float:cctvObjY,
	Float:cctvObjRZ,
	Float:cctvObjZ,
	Float:cctvObjRX,
	Float:cctvObjRY,
	Float:cctvCamX,
	Float:cctvCamY,
	Float:cctvCamZ,
	Float:cctvLookX,
	Float:cctvLookY,
	Float:cctvLookZ,
	cctvInterior,
	cctvWorld,
	bool:cctvExist
};

new CCTVData[MAX_CCTV][E_CCTV_DATA];

// Player view tracking
new bool:ViewingCCTV[MAX_PLAYERS];
new ViewingCCTV_ID[MAX_PLAYERS] = {-1, ...};
new bool:CCTVOpenedFromMDC[MAX_PLAYERS];
new CCTVPreviousHUDState[MAX_PLAYERS]; // stores previous HUD state (1=hidden, 0=shown)
new Float:CCTV_OldPlayerPos[MAX_PLAYERS][3]; // stores player position before viewing CCTV
new CCTV_OldPlayerVehicle[MAX_PLAYERS] = {INVALID_VEHICLE_ID, ...};
new CCTV_OldPlayerSeat[MAX_PLAYERS] = {-1, ...};
new Float:CCTV_OldObjPos[MAX_CCTV][6]; // stores original obj pos before editing


// TextDraw handles - from cctv_ui-open.mp.txt
// Sprite: global (static frame, same for all)
new Text:TD_CCTV_Sprite = Text:INVALID_TEXT_DRAW;

// Time & Location: per-player (created on enter, destroyed on exit)
new PlayerText:CCTV_PTD_Time[MAX_PLAYERS]     = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:CCTV_PTD_Location[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new CCTV_ClockTimer[MAX_PLAYERS]              = {-1, ...};


// Initialize CCTV Tables and TextDraws
stock CCTV_Init()
{
	// Step 1: ensure table exists, then Step 2: SELECT to load data (via callback chain)
	mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `cctv_cameras` (\
		`id` int(11) NOT NULL AUTO_INCREMENT,\
		`name` varchar(64) NOT NULL DEFAULT 'CCTV Camera',\
		`obj_x` float NOT NULL DEFAULT '0',\
		`obj_y` float NOT NULL DEFAULT '0',\
		`obj_z` float NOT NULL DEFAULT '0',\
		`obj_rx` float NOT NULL DEFAULT '0',\
		`obj_ry` float NOT NULL DEFAULT '0',\
		`obj_rz` float NOT NULL DEFAULT '0',\
		`cam_x` float NOT NULL DEFAULT '0',\
		`cam_y` float NOT NULL DEFAULT '0',\
		`cam_z` float NOT NULL DEFAULT '0',\
		`look_x` float NOT NULL DEFAULT '0',\
		`look_y` float NOT NULL DEFAULT '0',\
		`look_z` float NOT NULL DEFAULT '0',\
		`interior` int(11) NOT NULL DEFAULT '0',\
		`world` int(11) NOT NULL DEFAULT '0',\
		PRIMARY KEY (`id`)\
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;", "CCTV_AfterCreate", "");

	// --- TextDraw: cctvui sprite (GLOBAL - static frame, same for all players) ---
	TD_CCTV_Sprite = TextDrawCreate(-37.000, 8.000, "mdl-1411:cctvui");
	TextDrawTextSize(TD_CCTV_Sprite, 712.000, 441.000);
	TextDrawAlignment(TD_CCTV_Sprite, 1); // TEXT_DRAW_ALIGN_LEFT
	TextDrawColor(TD_CCTV_Sprite, -1);
	TextDrawSetShadow(TD_CCTV_Sprite, 0);
	TextDrawSetOutline(TD_CCTV_Sprite, 0);
	TextDrawBackgroundColor(TD_CCTV_Sprite, 255);
	TextDrawFont(TD_CCTV_Sprite, 4); // SPRITE_DRAW
	TextDrawSetProportional(TD_CCTV_Sprite, 1);
	// NOTE: time_and_date & location are PlayerTextDraw - created per-player on EnterCCTVView
}

// Step 2 in init chain: after CREATE TABLE succeeds, do the actual SELECT load
forward CCTV_AfterCreate();
public CCTV_AfterCreate()
{
	mysql_tquery(dbCon, "SELECT * FROM `cctv_cameras` ORDER BY `id` ASC;", "CCTV_LoadAll", "");
}

forward CCTV_LoadAll();
public CCTV_LoadAll()
{
	new rows = cache_num_rows();
	for(new i = 0; i < rows && i < MAX_CCTV; i++)
	{
		CCTVData[i][cctvExist] = true;
		cache_get_value_name_int(i, "id", CCTVData[i][cctvID]);
		cache_get_value_name(i, "name", CCTVData[i][cctvName], 64);
		cache_get_value_name_float(i, "obj_x", CCTVData[i][cctvObjX]);
		cache_get_value_name_float(i, "obj_y", CCTVData[i][cctvObjY]);
		cache_get_value_name_float(i, "obj_z", CCTVData[i][cctvObjZ]);
		cache_get_value_name_float(i, "obj_rx", CCTVData[i][cctvObjRX]);
		cache_get_value_name_float(i, "obj_ry", CCTVData[i][cctvObjRY]);
		cache_get_value_name_float(i, "obj_rz", CCTVData[i][cctvObjRZ]);
		cache_get_value_name_float(i, "cam_x", CCTVData[i][cctvCamX]);
		cache_get_value_name_float(i, "cam_y", CCTVData[i][cctvCamY]);
		cache_get_value_name_float(i, "cam_z", CCTVData[i][cctvCamZ]);
		cache_get_value_name_float(i, "look_x", CCTVData[i][cctvLookX]);
		cache_get_value_name_float(i, "look_y", CCTVData[i][cctvLookY]);
		cache_get_value_name_float(i, "look_z", CCTVData[i][cctvLookZ]);
		cache_get_value_name_int(i, "interior", CCTVData[i][cctvInterior]);
		cache_get_value_name_int(i, "world", CCTVData[i][cctvWorld]);

		// Create dynamic object 1622
		CCTVData[i][cctvObjID] = CreateDynamicObject(1622, CCTVData[i][cctvObjX], CCTVData[i][cctvObjY], CCTVData[i][cctvObjZ], CCTVData[i][cctvObjRX], CCTVData[i][cctvObjRY], CCTVData[i][cctvObjRZ], CCTVData[i][cctvWorld], CCTVData[i][cctvInterior]);

		// Create 3D Text Label
		new labelText[128];
		format(labelText, sizeof(labelText), "{FFC700}[CCTV ID: %d]\n{FFFFFF}%s", i, CCTVData[i][cctvName]);
		CCTVData[i][cctvLabel] = CreateDynamic3DTextLabel(labelText, 0xFFFFFFFF, CCTVData[i][cctvObjX], CCTVData[i][cctvObjY], CCTVData[i][cctvObjZ] + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, CCTVData[i][cctvWorld], CCTVData[i][cctvInterior], -1, 15.0);
	}
	printf("[CCTV System] Loaded %d CCTV cameras.", rows);
	return 1;
}

stock CCTV_GetFreeSlot()
{
	for(new i = 0; i < MAX_CCTV; i++)
	{
		if(!CCTVData[i][cctvExist]) return i;
	}
	return -1;
}

stock CCTV_Count()
{
	new count = 0;
	for(new i = 0; i < MAX_CCTV; i++)
	{
		if(CCTVData[i][cctvExist]) count++;
	}
	return count;
}

// Forward for timer
forward CCTV_TimerUpdate(playerid);
public CCTV_TimerUpdate(playerid)
{
	if(!ViewingCCTV[playerid]) return 0;

	new h, m, s, d, mo, y, timeStr[32];
	gettime(h, m, s);
	getdate(y, mo, d);
	format(timeStr, sizeof(timeStr), "%02d:%02d:%02d %02d/%02d/%04d", h, m, s, d, mo, y);

	if(CCTV_PTD_Time[playerid] != PlayerText:INVALID_TEXT_DRAW)
		PlayerTextDrawSetString(playerid, CCTV_PTD_Time[playerid], timeStr);

	return 1;
}

// Create per-player time & location PlayerTextDraws, populate, and show all CCTV UI
static CCTV_ShowUI(playerid, index)
{
	// Global sprite
	if(TD_CCTV_Sprite != Text:INVALID_TEXT_DRAW)
		TextDrawShowForPlayer(playerid, TD_CCTV_Sprite);

	// Build time string
	new h, m, s, d, mo, y, timeStr[32];
	gettime(h, m, s);
	getdate(y, mo, d);
	format(timeStr, sizeof(timeStr), "%02d:%02d:%02d %02d/%02d/%04d", h, m, s, d, mo, y);

	// Build location string
	new locStr[64];
	if(index >= 0 && index < MAX_CCTV && CCTVData[index][cctvExist])
		format(locStr, sizeof(locStr), "%s", CCTVData[index][cctvName]);
	else
		format(locStr, sizeof(locStr), "CCTV");

	// Destroy old player TDs if they exist (safety)
	if(CCTV_PTD_Time[playerid] != PlayerText:INVALID_TEXT_DRAW)
	{
		PlayerTextDrawDestroy(playerid, CCTV_PTD_Time[playerid]);
		CCTV_PTD_Time[playerid] = PlayerText:INVALID_TEXT_DRAW;
	}
	if(CCTV_PTD_Location[playerid] != PlayerText:INVALID_TEXT_DRAW)
	{
		PlayerTextDrawDestroy(playerid, CCTV_PTD_Location[playerid]);
		CCTV_PTD_Location[playerid] = PlayerText:INVALID_TEXT_DRAW;
	}

	// --- PlayerTextDraw: time_and_date ---
	CCTV_PTD_Time[playerid] = CreatePlayerTextDraw(playerid, 315.000, 383.000, timeStr);
	PlayerTextDrawLetterSize(playerid, CCTV_PTD_Time[playerid], 0.240, 1.500);
	PlayerTextDrawAlignment(playerid, CCTV_PTD_Time[playerid], 2);
	PlayerTextDrawColor(playerid, CCTV_PTD_Time[playerid], -1);
	PlayerTextDrawSetShadow(playerid, CCTV_PTD_Time[playerid], 1);
	PlayerTextDrawSetOutline(playerid, CCTV_PTD_Time[playerid], 1);
	PlayerTextDrawBackgroundColor(playerid, CCTV_PTD_Time[playerid], 150);
	PlayerTextDrawFont(playerid, CCTV_PTD_Time[playerid], 2);
	PlayerTextDrawSetProportional(playerid, CCTV_PTD_Time[playerid], 1);
	PlayerTextDrawShow(playerid, CCTV_PTD_Time[playerid]);

	// --- PlayerTextDraw: location ---
	CCTV_PTD_Location[playerid] = CreatePlayerTextDraw(playerid, 315.000, 397.000, locStr);
	PlayerTextDrawLetterSize(playerid, CCTV_PTD_Location[playerid], 0.240, 1.500);
	PlayerTextDrawAlignment(playerid, CCTV_PTD_Location[playerid], 2);
	PlayerTextDrawColor(playerid, CCTV_PTD_Location[playerid], -1);
	PlayerTextDrawSetShadow(playerid, CCTV_PTD_Location[playerid], 1);
	PlayerTextDrawSetOutline(playerid, CCTV_PTD_Location[playerid], 1);
	PlayerTextDrawBackgroundColor(playerid, CCTV_PTD_Location[playerid], 150);
	PlayerTextDrawFont(playerid, CCTV_PTD_Location[playerid], 2);
	PlayerTextDrawSetProportional(playerid, CCTV_PTD_Location[playerid], 1);
	PlayerTextDrawShow(playerid, CCTV_PTD_Location[playerid]);

	// Start 1-second real-time clock timer
	if(CCTV_ClockTimer[playerid] != -1) KillTimer(CCTV_ClockTimer[playerid]);
	CCTV_ClockTimer[playerid] = SetTimerEx("CCTV_TimerUpdate", 1000, true, "i", playerid);
}

// Destroy per-player TDs and hide global sprite
static CCTV_HideUI(playerid)
{
	if(CCTV_ClockTimer[playerid] != -1)
	{
		KillTimer(CCTV_ClockTimer[playerid]);
		CCTV_ClockTimer[playerid] = -1;
	}

	if(TD_CCTV_Sprite != Text:INVALID_TEXT_DRAW)
		TextDrawHideForPlayer(playerid, TD_CCTV_Sprite);

	if(CCTV_PTD_Time[playerid] != PlayerText:INVALID_TEXT_DRAW)
	{
		PlayerTextDrawDestroy(playerid, CCTV_PTD_Time[playerid]);
		CCTV_PTD_Time[playerid] = PlayerText:INVALID_TEXT_DRAW;
	}
	if(CCTV_PTD_Location[playerid] != PlayerText:INVALID_TEXT_DRAW)
	{
		PlayerTextDrawDestroy(playerid, CCTV_PTD_Location[playerid]);
		CCTV_PTD_Location[playerid] = PlayerText:INVALID_TEXT_DRAW;
	}
}

// Update location & time strings for ongoing CCTV view (kamera switch)
static CCTV_UpdatePlayerUI(playerid, index)
{
	// Update time
	new h, m, s, d, mo, y, timeStr[32];
	gettime(h, m, s);
	getdate(y, mo, d);
	format(timeStr, sizeof(timeStr), "%02d:%02d:%02d %02d/%02d/%04d", h, m, s, d, mo, y);
	if(CCTV_PTD_Time[playerid] != PlayerText:INVALID_TEXT_DRAW)
		PlayerTextDrawSetString(playerid, CCTV_PTD_Time[playerid], timeStr);

	// Update location
	if(CCTV_PTD_Location[playerid] != PlayerText:INVALID_TEXT_DRAW)
	{
		if(index >= 0 && index < MAX_CCTV && CCTVData[index][cctvExist])
			PlayerTextDrawSetString(playerid, CCTV_PTD_Location[playerid], CCTVData[index][cctvName]);
		else
			PlayerTextDrawSetString(playerid, CCTV_PTD_Location[playerid], "CCTV");
	}
}

stock EnterCCTVView(playerid, index, bool:fromMDC = false)
{
	if(index < 0 || index >= MAX_CCTV || !CCTVData[index][cctvExist])
		return 0;

	// Cancel any select textdraw / cursor mode
	CancelSelectTextDraw(playerid);

	// Hide MDC TextDraws if opened from MDC (Save=true means don't destroy, just hide)
	if(fromMDC || UsingMDC{playerid})
	{
		CCTVOpenedFromMDC[playerid] = true;
		TogglePlayerMDC(playerid, false, true);
	}

	// Auto-toggle HUD Off (save previous state)
	if(!ViewingCCTV[playerid])
	{
		CCTVPreviousHUDState[playerid] = _:PlayerFlags[playerid][toggleHUD];
		PlayerFlags[playerid][toggleHUD] = true;
		HideHudV2Full(playerid);
		PlayerTextDrawHide(playerid, MaskTD[playerid]);
	}

	ViewingCCTV[playerid] = true;
	ViewingCCTV_ID[playerid] = index;

	// Save real player position & vehicle state before teleporting view
	GetPlayerPos(playerid, CCTV_OldPlayerPos[playerid][0], CCTV_OldPlayerPos[playerid][1], CCTV_OldPlayerPos[playerid][2]);
	if(IsPlayerInAnyVehicle(playerid))
	{
		CCTV_OldPlayerVehicle[playerid] = GetPlayerVehicleID(playerid);
		CCTV_OldPlayerSeat[playerid]    = GetPlayerVehicleSeat(playerid);
	}
	else
	{
		CCTV_OldPlayerVehicle[playerid] = INVALID_VEHICLE_ID;
		CCTV_OldPlayerSeat[playerid]    = -1;
	}

	TogglePlayerControllable(playerid, false);
	SetPlayerInterior(playerid, CCTVData[index][cctvInterior]);
	SetPlayerVirtualWorld(playerid, CCTVData[index][cctvWorld]);

	// Teleport player ped UNDERGROUND (-50.0 Z offset) in the target Virtual World/Interior!
	// This keeps player in the target world so they see ALL live player/vehicle activity,
	// while hiding their physical ped completely under the ground so no one sees them spawn!
	SetPlayerPos(playerid, CCTVData[index][cctvCamX], CCTVData[index][cctvCamY], CCTVData[index][cctvCamZ] - 50.0);

	// Set Camera at actual CCTV position & direction above ground
	SetPlayerCameraPos(playerid, CCTVData[index][cctvCamX], CCTVData[index][cctvCamY], CCTVData[index][cctvCamZ]);
	SetPlayerCameraLookAt(playerid, CCTVData[index][cctvLookX], CCTVData[index][cctvLookY], CCTVData[index][cctvLookZ]);

	// Stream objects around the camera position
	Streamer_UpdateEx(playerid, CCTVData[index][cctvCamX], CCTVData[index][cctvCamY], CCTVData[index][cctvCamZ], CCTVData[index][cctvWorld], CCTVData[index][cctvInterior], STREAMER_TYPE_OBJECT);

	// Show CCTV UI with updated time + location
	CCTV_ShowUI(playerid, index);
	return 1;
}

stock ExitCCTVView(playerid)
{
	if(!ViewingCCTV[playerid]) return 0;

	ViewingCCTV[playerid] = false;
	ViewingCCTV_ID[playerid] = -1;

	// Hide CCTV UI
	CCTV_HideUI(playerid);

	// Restore player position / vehicle
	SetPlayerInterior(playerid, PlayerData[playerid][pInterior]);
	SetPlayerVirtualWorld(playerid, PlayerData[playerid][pWorld]);

	if(CCTV_OldPlayerVehicle[playerid] != INVALID_VEHICLE_ID) // check vehicle valid
	{
		PutPlayerInVehicle(playerid, CCTV_OldPlayerVehicle[playerid], CCTV_OldPlayerSeat[playerid]);
	}
	else
	{
		SetPlayerPos(playerid, CCTV_OldPlayerPos[playerid][0], CCTV_OldPlayerPos[playerid][1], CCTV_OldPlayerPos[playerid][2]);
	}
	CCTV_OldPlayerVehicle[playerid] = INVALID_VEHICLE_ID;
	CCTV_OldPlayerSeat[playerid]    = -1;

	SetCameraBehindPlayer(playerid);
	TogglePlayerControllable(playerid, true);

	// Restore default SA-MP HUD
	// Restore custom HUD to previous state
	PlayerFlags[playerid][toggleHUD] = bool:CCTVPreviousHUDState[playerid];
	if(!PlayerFlags[playerid][toggleHUD])
	{
		ShowHudV2Full(playerid);
		if(IsMasked{playerid}) PlayerTextDrawShow(playerid, MaskTD[playerid]);
	}

	// Restore MDC UI if opened from MDC
	if(CCTVOpenedFromMDC[playerid])
	{
		CCTVOpenedFromMDC[playerid] = false;
		UsingMDC{playerid} = false; // reset flag so TogglePlayerMDC(true) works cleanly

		// Re-init MDC textdraws if destroyed, then show them
		if(!MDC_Created{playerid})
			InitMDC(playerid);

		TogglePlayerMDC(playerid, true);
		SelectTextDraw(playerid, COLOR_BLACK); // re-enable mouse cursor for MDC
	}
	return 1;
}

stock SwitchCCTVNext(playerid)
{
	if(!ViewingCCTV[playerid]) return 0;

	new current = ViewingCCTV_ID[playerid];
	new nextIndex = -1;

	for(new i = current + 1; i < MAX_CCTV; i++)
	{
		if(CCTVData[i][cctvExist])
		{
			nextIndex = i;
			break;
		}
	}

	if(nextIndex == -1) // wrap around
	{
		for(new i = 0; i <= current; i++)
		{
			if(CCTVData[i][cctvExist])
			{
				nextIndex = i;
				break;
			}
		}
	}

	if(nextIndex != -1)
	{
		// Pindah kamera: update posisi player underground (-50m Z) + kamera + streamer + UI per-player
		ViewingCCTV_ID[playerid] = nextIndex;
		SetPlayerInterior(playerid, CCTVData[nextIndex][cctvInterior]);
		SetPlayerVirtualWorld(playerid, CCTVData[nextIndex][cctvWorld]);

		SetPlayerPos(playerid, CCTVData[nextIndex][cctvCamX], CCTVData[nextIndex][cctvCamY], CCTVData[nextIndex][cctvCamZ] - 50.0);
		SetPlayerCameraPos(playerid, CCTVData[nextIndex][cctvCamX], CCTVData[nextIndex][cctvCamY], CCTVData[nextIndex][cctvCamZ]);
		SetPlayerCameraLookAt(playerid, CCTVData[nextIndex][cctvLookX], CCTVData[nextIndex][cctvLookY], CCTVData[nextIndex][cctvLookZ]);
		Streamer_UpdateEx(playerid, CCTVData[nextIndex][cctvCamX], CCTVData[nextIndex][cctvCamY], CCTVData[nextIndex][cctvCamZ], CCTVData[nextIndex][cctvWorld], CCTVData[nextIndex][cctvInterior], STREAMER_TYPE_OBJECT);
		CCTV_UpdatePlayerUI(playerid, nextIndex);
	}

	return 1;
}

// Show Dialog List of all CCTV for MDC
stock ShowCCTVListDialog(playerid)
{
	if(CCTV_Count() == 0)
		return SendErrorMessage(playerid, "No CCTV cameras have been installed.");

	new header[64], list[1024];
	format(header, sizeof(header), "CCTV Monitoring System");
	format(list, sizeof(list), "Location Name\tID\n");

	for(new i = 0; i < MAX_CCTV; i++)
	{
		if(CCTVData[i][cctvExist])
		{
			format(list, sizeof(list), "%s%s\t#%d\n", list, CCTVData[i][cctvName], i);
		}
	}

	Dialog_Show(playerid, DIALOG_CCTV_LIST, DIALOG_STYLE_TABLIST_HEADERS, header, list, "Select", "Close");
	return 1;
}

Dialog:DIALOG_CCTV_LIST(playerid, response, listitem, inputtext[])
{
	if(!response)
	{
		// Player closed dialog - restore MDC mouse cursor
		if(UsingMDC{playerid}) SelectTextDraw(playerid, COLOR_BLACK);
		return 1;
	}

	new count = 0;
	for(new i = 0; i < MAX_CCTV; i++)
	{
		if(CCTVData[i][cctvExist])
		{
			if(count == listitem)
			{
				EnterCCTVView(playerid, i, true);
				return 1;
			}
			count++;
		}
	}
	return 1;
}

// Command /cctv (admin level 4+)
CMD:cctv(playerid, params[])
{
	if(PlayerData[playerid][pAdmin] < 4)
		return SendErrorMessage(playerid, "Anda tidak memiliki izin untuk menggunakan perintah ini.");

	new option[32], subparam[128];
	if(sscanf(params, "s[32]S()[128]", option, subparam))
	{
		SendSyntaxMessage(playerid, "/cctv [create/edit/remove/view]");
		return 1;
	}

	if(!strcmp(option, "create", true))
	{
		if(isnull(subparam))
			return SendSyntaxMessage(playerid, "/cctv create [nama_cctv]");

		new slot = CCTV_GetFreeSlot();
		if(slot == -1)
			return SendErrorMessage(playerid, "Batas maksimal CCTV telah tercapai.");

		new Float:x, Float:y, Float:z, Float:angle;
		GetPlayerPos(playerid, x, y, z);
		GetPlayerFacingAngle(playerid, angle);

		CCTVData[slot][cctvExist] = true;
		format(CCTVData[slot][cctvName], 64, "%s", subparam);
		CCTVData[slot][cctvObjX]  = x + 1.0;
		CCTVData[slot][cctvObjY]  = y + 1.0;
		CCTVData[slot][cctvObjZ]  = z;
		CCTVData[slot][cctvObjRX] = 0.0;
		CCTVData[slot][cctvObjRY] = 0.0;
		CCTVData[slot][cctvObjRZ] = angle;
		CCTVData[slot][cctvCamX]  = x;
		CCTVData[slot][cctvCamY]  = y;
		CCTVData[slot][cctvCamZ]  = z + 1.5;
		CCTVData[slot][cctvLookX] = x + (3.0 * floatcos(angle + 90.0, degrees));
		CCTVData[slot][cctvLookY] = y + (3.0 * floatsin(angle + 90.0, degrees));
		CCTVData[slot][cctvLookZ] = z + 1.5;
		CCTVData[slot][cctvInterior] = GetPlayerInterior(playerid);
		CCTVData[slot][cctvWorld]    = GetPlayerVirtualWorld(playerid);

		CCTVData[slot][cctvObjID] = CreateDynamicObject(1622,
			CCTVData[slot][cctvObjX], CCTVData[slot][cctvObjY], CCTVData[slot][cctvObjZ],
			CCTVData[slot][cctvObjRX], CCTVData[slot][cctvObjRY], CCTVData[slot][cctvObjRZ],
			CCTVData[slot][cctvWorld], CCTVData[slot][cctvInterior]);

		new labelText[128];
		format(labelText, sizeof(labelText), "{FFC700}[CCTV ID: %d]\n{FFFFFF}%s", slot, CCTVData[slot][cctvName]);
		CCTVData[slot][cctvLabel] = CreateDynamic3DTextLabel(labelText, 0xFFFFFFFF,
			CCTVData[slot][cctvObjX], CCTVData[slot][cctvObjY], CCTVData[slot][cctvObjZ] + 0.8,
			15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0,
			CCTVData[slot][cctvWorld], CCTVData[slot][cctvInterior], -1, 15.0);

		new query[512];
		mysql_format(dbCon, query, sizeof(query), "INSERT INTO `cctv_cameras` (`name`, `obj_x`, `obj_y`, `obj_z`, `obj_rx`, `obj_ry`, `obj_rz`, `cam_x`, `cam_y`, `cam_z`, `look_x`, `look_y`, `look_z`, `interior`, `world`) VALUES ('%e', '%f', '%f', '%f', '%f', '%f', '%f', '%f', '%f', '%f', '%f', '%f', '%f', '%d', '%d');",
			CCTVData[slot][cctvName],
			CCTVData[slot][cctvObjX], CCTVData[slot][cctvObjY], CCTVData[slot][cctvObjZ],
			CCTVData[slot][cctvObjRX], CCTVData[slot][cctvObjRY], CCTVData[slot][cctvObjRZ],
			CCTVData[slot][cctvCamX], CCTVData[slot][cctvCamY], CCTVData[slot][cctvCamZ],
			CCTVData[slot][cctvLookX], CCTVData[slot][cctvLookY], CCTVData[slot][cctvLookZ],
			CCTVData[slot][cctvInterior], CCTVData[slot][cctvWorld]
		);
		mysql_tquery(dbCon, query, "OnCCTVCreated", "d", slot);

		SendNoticeMessage(playerid, "CCTV '#%d' (%s) berhasil dibuat. Object 1622 di-spawn.", slot, CCTVData[slot][cctvName]);
		return 1;
	}
	else if(!strcmp(option, "edit", true))
	{
		new cctv_id;
		if(sscanf(subparam, "d", cctv_id))
			return SendSyntaxMessage(playerid, "/cctv edit [id_cctv]");

		if(cctv_id < 0 || cctv_id >= MAX_CCTV || !CCTVData[cctv_id][cctvExist])
			return SendErrorMessage(playerid, "CCTV ID tidak valid.");

		// Store original position in case edit is cancelled
		CCTV_OldObjPos[cctv_id][0] = CCTVData[cctv_id][cctvObjX];
		CCTV_OldObjPos[cctv_id][1] = CCTVData[cctv_id][cctvObjY];
		CCTV_OldObjPos[cctv_id][2] = CCTVData[cctv_id][cctvObjZ];
		CCTV_OldObjPos[cctv_id][3] = CCTVData[cctv_id][cctvObjRX];
		CCTV_OldObjPos[cctv_id][4] = CCTVData[cctv_id][cctvObjRY];
		CCTV_OldObjPos[cctv_id][5] = CCTVData[cctv_id][cctvObjRZ];

		// Flag which CCTV is being edited (stored as cctv_id + 1 so ID 0 is distinguishable)
		SetPVarInt(playerid, "EditingCCTV", cctv_id + 1);

		EditDynamicObject(playerid, CCTVData[cctv_id][cctvObjID]);
		SendNoticeMessage(playerid, "Mengedit posisi object CCTV #%d...", cctv_id);
		return 1;
	}
	else if(!strcmp(option, "remove", true))
	{
		new cctv_id;
		if(sscanf(subparam, "d", cctv_id))
			return SendSyntaxMessage(playerid, "/cctv remove [id_cctv]");

		if(cctv_id < 0 || cctv_id >= MAX_CCTV || !CCTVData[cctv_id][cctvExist])
			return SendErrorMessage(playerid, "CCTV ID tidak valid.");

		if(IsValidDynamicObject(CCTVData[cctv_id][cctvObjID]))
			DestroyDynamicObject(CCTVData[cctv_id][cctvObjID]);

		if(IsValidDynamic3DTextLabel(CCTVData[cctv_id][cctvLabel]))
			DestroyDynamic3DTextLabel(CCTVData[cctv_id][cctvLabel]);

		new query[128];
		format(query, sizeof(query), "DELETE FROM `cctv_cameras` WHERE `id` = '%d';", CCTVData[cctv_id][cctvID]);
		mysql_tquery(dbCon, query);

		CCTVData[cctv_id][cctvExist] = false;
		SendNoticeMessage(playerid, "CCTV #%d berhasil dihapus.", cctv_id);
		return 1;
	}
	else if(!strcmp(option, "view", true))
	{
		new cctv_id, subsub[32];
		if(sscanf(subparam, "dS()[32]", cctv_id, subsub))
			return SendSyntaxMessage(playerid, "/cctv view [id_cctv] (opsional: save)");

		if(cctv_id < 0 || cctv_id >= MAX_CCTV || !CCTVData[cctv_id][cctvExist])
			return SendErrorMessage(playerid, "CCTV ID tidak valid.");

		if(!strcmp(subsub, "save", true))
		{
			// Harus berada dekat object CCTV (radius 15m)
			if(!IsPlayerInRangeOfPoint(playerid, 15.0, CCTVData[cctv_id][cctvObjX], CCTVData[cctv_id][cctvObjY], CCTVData[cctv_id][cctvObjZ]))
				return SendErrorMessage(playerid, "Anda harus berada dekat CCTV #%d (dalam radius 15m) untuk menyimpan posisi kamera.", cctv_id);

			new Float:cx, Float:cy, Float:cz, Float:fa;
			GetPlayerPos(playerid, cx, cy, cz);
			GetPlayerFacingAngle(playerid, fa);

			CCTVData[cctv_id][cctvCamX]  = cx;
			CCTVData[cctv_id][cctvCamY]  = cy;
			CCTVData[cctv_id][cctvCamZ]  = cz + 0.8;
			CCTVData[cctv_id][cctvLookX] = cx + (5.0 * floatcos(fa + 90.0, degrees));
			CCTVData[cctv_id][cctvLookY] = cy + (5.0 * floatsin(fa + 90.0, degrees));
			CCTVData[cctv_id][cctvLookZ] = cz + 0.5;

			new query[512];
			format(query, sizeof(query), "UPDATE `cctv_cameras` SET `cam_x`='%f', `cam_y`='%f', `cam_z`='%f', `look_x`='%f', `look_y`='%f', `look_z`='%f' WHERE `id`='%d';",
				CCTVData[cctv_id][cctvCamX], CCTVData[cctv_id][cctvCamY], CCTVData[cctv_id][cctvCamZ],
				CCTVData[cctv_id][cctvLookX], CCTVData[cctv_id][cctvLookY], CCTVData[cctv_id][cctvLookZ],
				CCTVData[cctv_id][cctvID]
			);
			mysql_tquery(dbCon, query);

			ExitCCTVView(playerid);
			SendNoticeMessage(playerid, "Posisi kamera CCTV #%d (%s) berhasil disimpan.", cctv_id, CCTVData[cctv_id][cctvName]);
			return 1;
		}
		else
		{
			// Harus berada dekat object CCTV (radius 15m)
			if(!IsPlayerInRangeOfPoint(playerid, 15.0, CCTVData[cctv_id][cctvObjX], CCTVData[cctv_id][cctvObjY], CCTVData[cctv_id][cctvObjZ]))
				return SendErrorMessage(playerid, "Anda harus berada dekat CCTV #%d (dalam radius 15m) untuk mengatur posisi kamera.", cctv_id);

			EnterCCTVView(playerid, cctv_id, false);
			SendNoticeMessage(playerid, "Preview kamera CCTV #%d. Berdiri di titik yang diinginkan & arahkan pandangan, lalu ketik '/cctv view %d save' untuk menyimpan.", cctv_id, cctv_id);
			return 1;
		}
	}
	else
	{
		SendSyntaxMessage(playerid, "/cctv [create/edit/remove/view]");
	}
	return 1;
}

forward OnCCTVCreated(slot);
public OnCCTVCreated(slot)
{
	CCTVData[slot][cctvID] = cache_insert_id();
	return 1;
}

// CCTV edit handling is done inside OnPlayerEditDynamicObject in roleplay.pwn
// using PVar "EditingCCTV" (value = cctv_id + 1) set above in /cctv edit

// Key Handler: Y = Next Camera, N = Exit CCTV Mode
public OnPlayerKeyStateChange(playerid, newkeys, oldkeys)
{
	if(ViewingCCTV[playerid])
	{
		// [Y] = Kamera Berikutnya
		if(newkeys & KEY_YES)
		{
			SwitchCCTVNext(playerid);
			return 1;
		}

		// [N] = Keluar dari mode CCTV
		if(newkeys & KEY_NO)
		{
			ExitCCTVView(playerid);
			return 1;
		}
	}

	#if defined CCTV_OnPlayerKeyStateChange
		return CCTV_OnPlayerKeyStateChange(playerid, newkeys, oldkeys);
	#else
		return 1;
	#endif
}
#if defined _ALS_OnPlayerKeyStateChange
	#undef OnPlayerKeyStateChange
#else
	#define _ALS_OnPlayerKeyStateChange
#endif
#define OnPlayerKeyStateChange CCTV_OnPlayerKeyStateChange
#if defined CCTV_OnPlayerKeyStateChange
	forward CCTV_OnPlayerKeyStateChange(playerid, newkeys, oldkeys);
#endif
