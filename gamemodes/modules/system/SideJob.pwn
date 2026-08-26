/*
	Unified Sidejob Module (descriptor-driven)
	Los Jawa Roleplay

	Replaces BusJob.pwn + SweeperJob.pwn. Adding a new sidejob branch
	(e.g. trash hauler, forklift operator) = add one row to SJDefs plus
	its route/checkpoint tables in the database.

	Behaviour preserved exactly:
	  type 1 Bus     : halte checkpoints pause 30s, 60s exit grace,
	                   cooldown 20 minutes, tables bus_*
	  type 2 Sweeper : non-stop routes, no exit grace,
	                   cooldown 10 minutes, tables sweeper_*
*/

#include <YSI_Coding/y_hooks>

// ── Limits ───────────────────────────────────────────────────────────────────

#define MAX_SJ_TYPES            3   // index 0 unused; 1 = bus, 2 = sweeper
#define MAX_SJ_SPAWNS           50
#define MAX_SJ_ROUTES           100
#define MAX_SJ_CHECKPOINTS      100

#define SJ_BUS                  1
#define SJ_SWEEPER              2

// ── Job descriptors ──────────────────────────────────────────────────────────

enum E_SIDEJOB_DEF
{
	sjdType,
	sjdName[24],
	sjdTag[10],
	sjdRouteTable[20],
	sjdCpTable[26],
	sjdDelayField,          // PlayerData enum member holding the cooldown stamp
	sjdCooldown,            // seconds
	bool:sjdHasStops,       // route may contain 30s stop checkpoints
	sjdAbandonSecs          // 0 = no exit grace
}

static const SJDefs[][E_SIDEJOB_DEF] = {
	{SJ_BUS, "Canny Bus Group", "[BUSJOB]", "bus_routes", "bus_checkpoints",
	    pBusJobDelay, 1200, true, 60},
	{SJ_SWEEPER, "Sanitary Andreas", "[SWEEPER]", "sweeper_routes", "sweeper_checkpoints",
	    pSweeperJobDelay, 600, false, 60}
};

// Maps a DB sidejob type (1..n) onto its SJDefs row index.
// Returns -1 for unknown types; callers must not index SJDefs with -1.
stock SideJob_Row(type)
{
	for(new r = 0; r < sizeof SJDefs; ++r)
	    if(SJDefs[r][sjdType] == type) return r;
	return -1;
}

// ── Data ─────────────────────────────────────────────────────────────────────

enum E_SJ_SPAWN
{
	sjsID,                  // SQL id from sidejob_spawns
	sjsType,
	Float:sjsPos[3],
	sjsInterior,
	sjsWorld,
	sjsPickup,
	Text3D:sjsText
};
new SJSpawns[MAX_SJ_SPAWNS][E_SJ_SPAWN];
new Iterator:sj_spawn<MAX_SJ_SPAWNS>;

enum E_SJ_ROUTE
{
	sjrID,
	sjrPlate[24],
	sjrSalary,
	sjrTotalCheckpoints
};
new SJRoutes[MAX_SJ_TYPES][MAX_SJ_ROUTES][E_SJ_ROUTE];
new SJRouteCount[MAX_SJ_TYPES];
new SJRouteTypesLoaded;

enum E_SJ_CP
{
	sjcID,
	sjcStep,
	Float:sjcPos[3],
	sjcType                 // 0 = normal, 1 = stop, 2 = finish
};
new SJCheckpoints[MAX_SJ_TYPES][MAX_SJ_ROUTES][MAX_SJ_CHECKPOINTS][E_SJ_CP];

// ── Per-player state (keyed by job type) ─────────────────────────────────────

new PlayerSJVehicle[MAX_PLAYERS][MAX_SJ_TYPES];
new PlayerSJVehicleIndex[MAX_PLAYERS][MAX_SJ_TYPES];
new PlayerSJCheckpointStep[MAX_PLAYERS][MAX_SJ_TYPES];
new PlayerSJRouteIndex[MAX_PLAYERS][MAX_SJ_TYPES];
new PlayerSJAbandonTimer[MAX_PLAYERS][MAX_SJ_TYPES] = {{-1, ...}, ...};
new PlayerSJStopTimer[MAX_PLAYERS][MAX_SJ_TYPES];
new PlayerSJStopTimerID[MAX_PLAYERS][MAX_SJ_TYPES] = {{-1, ...}, ...};
new PlayerSJAbandonGrace[MAX_PLAYERS][MAX_SJ_TYPES];

// ── Admin route-creation session (one at a time, any type) ───────────────────

new SJCreatingType[MAX_PLAYERS] = {-1, ...};
new SJCreatingPlate[MAX_PLAYERS][24];
new SJCreatingSalary[MAX_PLAYERS];
new SJCreatingCPCount[MAX_PLAYERS];
new Float:SJCreatingCPs[MAX_PLAYERS][MAX_SJ_CHECKPOINTS][3];
new SJCreatingCPTypes[MAX_PLAYERS][MAX_SJ_CHECKPOINTS];

new EditingSidejobVeh[MAX_PLAYERS] = {-1, ...};
new ActiveSpawnPoint[MAX_PLAYERS] = {-1, ...};

// ── Helpers ──────────────────────────────────────────────────────────────────

static SJ_Def(type)
{
	if(type < 1 || type >= MAX_SJ_TYPES) return -1;
	return type;
}

stock GetVehicleServerID(vehicleid)
{
	foreach(new i : sv_servercar)
	{
		if(vehicleVariables[i][vVehicleScriptID] == vehicleid)
		    return i;
	}
	return -1;
}

stock SideJob_IsActiveVehicle(playerid, vehicleid)
{
	if(vehicleid == INVALID_VEHICLE_ID) return false;

	for(new t = 1; t < MAX_SJ_TYPES; ++t)
	{
	    if(PlayerSJVehicle[playerid][t] == vehicleid) return true;
	}
	return false;
}

static SideJob_ResetPlayer(playerid, type)
{
	PlayerSJVehicle[playerid][type]         = INVALID_VEHICLE_ID;
	PlayerSJVehicleIndex[playerid][type]    = -1;
	PlayerSJCheckpointStep[playerid][type]  = 0;
	PlayerSJRouteIndex[playerid][type]      = -1;
}

static SideJob_ClearTimers(playerid, type)
{
	if(PlayerSJAbandonTimer[playerid][type] != -1)
	{
		KillTimer(PlayerSJAbandonTimer[playerid][type]);
		PlayerSJAbandonTimer[playerid][type] = -1;
	}
	if(PlayerSJStopTimerID[playerid][type] != -1)
	{
		KillTimer(PlayerSJStopTimerID[playerid][type]);
		PlayerSJStopTimerID[playerid][type] = -1;
	}
}

stock GetNearestSidejobSpawn(playerid, Float:range = 3.0)
{
	foreach(new i : sj_spawn)
	{
	    if(IsPlayerInRangeOfPoint(playerid, range, SJSpawns[i][sjsPos][0], SJSpawns[i][sjsPos][1], SJSpawns[i][sjsPos][2]))
	    {
			if(GetPlayerVirtualWorld(playerid) == SJSpawns[i][sjsWorld] && GetPlayerInterior(playerid) == SJSpawns[i][sjsInterior])
			    return i;
		}
	}
	return -1;
}

// ── Spawn label availability ────────────────────────────────────────────────

stock SideJob_CountAvailable(type, spawn_sql_id)
{
	new c;
	foreach(new i : sv_servercar)
	{
	    if(vehicleVariables[i][vVehicleSideJob] == type &&
	       vehicleVariables[i][vVehicleSideJobSpawn] == spawn_sql_id &&
	       vehicleVariables[i][vVehicleScriptID] == INVALID_VEHICLE_ID)
	        c++;
	}
	return c;
}

static SideJob_RefreshSpawnLabel(spawn_idx)
{
	if(spawn_idx < 0 || spawn_idx >= MAX_SJ_SPAWNS) return;
	if(!Iter_Contains(sj_spawn, spawn_idx)) return;

	new t = SJSpawns[spawn_idx][sjsType];
	new avail = SideJob_CountAvailable(t, SJSpawns[spawn_idx][sjsID]);

	new labelText[160];
	format(labelText, sizeof(labelText), "{00FFFF}%s\n{FFFFFF}[ID: %d]\n{FFFF00}%d vehicle(s) available\n{00FF00}use /spawn",
	    SJDefs[SideJob_Row(t)][sjdName], SJSpawns[spawn_idx][sjsID], avail);
	UpdateDynamic3DTextLabelText(SJSpawns[spawn_idx][sjsText], COLOR_WHITE, labelText);
}

stock SideJob_RefreshAllLabels()
{
	foreach(new i : sj_spawn)
	    SideJob_RefreshSpawnLabel(i);
}

// ── Setup & loading ──────────────────────────────────────────────────────────

stock SideJob_SetupTable()
{
	mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `sidejob_spawns` (\
		`id` INT AUTO_INCREMENT PRIMARY KEY,\
		`type` INT DEFAULT 1,\
		`posX` FLOAT,\
		`posY` FLOAT,\
		`posZ` FLOAT,\
		`interior` INT DEFAULT 0,\
		`world` INT DEFAULT 0\
	)");

	for(new t = 1; t < MAX_SJ_TYPES; ++t)
	{
		new q[512];
		format(q, sizeof(q),
			"CREATE TABLE IF NOT EXISTS `%s`(\
			`id` INT AUTO_INCREMENT PRIMARY KEY,\
			`vehiclePlate` VARCHAR(24) UNIQUE,\
			`salary` INT,\
			`total_checkpoints` INT)",
			SJDefs[SideJob_Row(t)][sjdRouteTable]);
		mysql_tquery(dbCon, q);

		format(q, sizeof(q),
			"CREATE TABLE IF NOT EXISTS `%s`(\
			`id` INT AUTO_INCREMENT PRIMARY KEY,\
			`routeId` INT,\
			`step` INT,\
			`posX` FLOAT,\
			`posY` FLOAT,\
			`posZ` FLOAT,\
			`type` INT)",
			SJDefs[SideJob_Row(t)][sjdCpTable]);
		mysql_tquery(dbCon, q);

		new col[24];
		SJ_DelayColumnName(t, col, sizeof col);
		format(q, sizeof(q), "ALTER TABLE `characters` ADD COLUMN `%s` INT DEFAULT 0;", col);
		mysql_tquery(dbCon, q);
	}

	mysql_tquery(dbCon, "SELECT * FROM `sidejob_spawns` ORDER BY `id` ASC", "SideJob_LoadSpawns");

	for(new t = 1; t < MAX_SJ_TYPES; ++t)
	{
		new q[256];
		format(q, sizeof(q), "SELECT * FROM `%s` ORDER BY `id` ASC", SJDefs[SideJob_Row(t)][sjdRouteTable]);
		mysql_tquery(dbCon, q, "SideJob_LoadRoutes", "d", t);
	}
	return 1;
}

// Delay column name lives in the descriptor as an indirect reference; the
// ALTER above needs it as literal text, so resolve through a tiny mapper.
static stock SJ_DelayColumnName(t, out[], len)
{
	switch(SJDefs[SideJob_Row(t)][sjdDelayField])
	{
	    case pBusJobDelay:     format(out, len, "busJobDelay");
	    case pSweeperJobDelay: format(out, len, "sweeperJobDelay");
	    default:               format(out, len, "sjDelay");
	}
}

forward SideJob_LoadSpawns();
public SideJob_LoadSpawns()
{
	new rows = cache_num_rows();
	Iter_Clear(sj_spawn);

	for(new i = 0; i < rows && i < MAX_SJ_SPAWNS; i++)
	{
		cache_get_value_name_int(i, "id", SJSpawns[i][sjsID]);
		cache_get_value_name_int(i, "type", SJSpawns[i][sjsType]);
		cache_get_value_name_float(i, "posX", SJSpawns[i][sjsPos][0]);
		cache_get_value_name_float(i, "posY", SJSpawns[i][sjsPos][1]);
		cache_get_value_name_float(i, "posZ", SJSpawns[i][sjsPos][2]);
		cache_get_value_name_int(i, "interior", SJSpawns[i][sjsInterior]);
		cache_get_value_name_int(i, "world", SJSpawns[i][sjsWorld]);

		new t = SJSpawns[i][sjsType];
		if(SideJob_Row(t) == -1) continue;   // unknown branch: skip, don't abort the load

		SJSpawns[i][sjsPickup] = CreateDynamicPickup(1239, 23,
		    SJSpawns[i][sjsPos][0], SJSpawns[i][sjsPos][1], SJSpawns[i][sjsPos][2],
		    SJSpawns[i][sjsWorld], SJSpawns[i][sjsInterior]);

		new labelText[144];
		format(labelText, sizeof(labelText), "{00FFFF}%s\n{FFFFFF}[ID: %d]\n{00FF00}use /spawn",
		    SJDefs[SideJob_Row(t)][sjdName], SJSpawns[i][sjsID]);

		SJSpawns[i][sjsText] = CreateDynamic3DTextLabel(labelText, COLOR_WHITE,
		    SJSpawns[i][sjsPos][0], SJSpawns[i][sjsPos][1], SJSpawns[i][sjsPos][2] + 0.8,
		    15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0,
		    SJSpawns[i][sjsWorld], SJSpawns[i][sjsInterior]);

		Iter_Add(sj_spawn, i);
		SideJob_RefreshSpawnLabel(i);
	}
	printf("[SERVER]: Loaded %d sidejob spawns...", Iter_Count(sj_spawn));
	Init_StepDone();   // sidejob spawns
	return 1;
}

forward SideJob_LoadRoutes(type);
public SideJob_LoadRoutes(type)
{
	if(type < 1 || type >= MAX_SJ_TYPES) return 0;

	new rows = cache_num_rows();
	SJRouteCount[type] = 0;

	new cap = rows;
	if(cap > MAX_SJ_ROUTES) cap = MAX_SJ_ROUTES;

	for(new i = 0; i < cap; ++i)
	{
		cache_get_value_name_int(i, "id", SJRoutes[type][i][sjrID]);
		cache_get_value_name(i, "vehiclePlate", SJRoutes[type][i][sjrPlate], 24);
		cache_get_value_name_int(i, "salary", SJRoutes[type][i][sjrSalary]);
		cache_get_value_name_int(i, "total_checkpoints", SJRoutes[type][i][sjrTotalCheckpoints]);
		SJRouteCount[type]++;

		new q[160];
		mysql_format(dbCon, q, sizeof(q), "SELECT * FROM `%s` WHERE `routeId` = '%d' ORDER BY `step` ASC",
		    SJDefs[SideJob_Row(type)][sjdCpTable], SJRoutes[type][i][sjrID]);
		mysql_tquery(dbCon, q, "SideJob_LoadCheckpoints", "dd", type, i);
	}
	SJRouteTypesLoaded++;
	if(SJRouteTypesLoaded == MAX_SJ_TYPES - 1) Init_StepDone();   // all sidejob route sets loaded
	printf("[SERVER]: Loaded %d %s routes...", SJRouteCount[type], SJDefs[SideJob_Row(type)][sjdName]);
	return 1;
}

forward SideJob_LoadCheckpoints(type, route_idx);
public SideJob_LoadCheckpoints(type, route_idx)
{
	new rows = cache_num_rows();

	for(new i = 0; i < rows && i < MAX_SJ_CHECKPOINTS; ++i)
	{
		cache_get_value_name_int(i, "id", SJCheckpoints[type][route_idx][i][sjcID]);
		cache_get_value_name_int(i, "step", SJCheckpoints[type][route_idx][i][sjcStep]);
		cache_get_value_name_float(i, "posX", SJCheckpoints[type][route_idx][i][sjcPos][0]);
		cache_get_value_name_float(i, "posY", SJCheckpoints[type][route_idx][i][sjcPos][1]);
		cache_get_value_name_float(i, "posZ", SJCheckpoints[type][route_idx][i][sjcPos][2]);
		cache_get_value_name_int(i, "type", SJCheckpoints[type][route_idx][i][sjcType]);
	}
	return 1;
}

// ── Checkpoint display ───────────────────────────────────────────────────────

static ShowSideJobCheckpoint(playerid, type)
{
	new route_idx = PlayerSJRouteIndex[playerid][type];
	new step      = PlayerSJCheckpointStep[playerid][type];
	new total     = SJRoutes[type][route_idx][sjrTotalCheckpoints];

	if(step >= total) return;

	SetPlayerCheckpoint(playerid,
	    SJCheckpoints[type][route_idx][step][sjcPos][0],
	    SJCheckpoints[type][route_idx][step][sjcPos][1],
	    SJCheckpoints[type][route_idx][step][sjcPos][2], 5.0);

	switch(SJCheckpoints[type][route_idx][step][sjcType])
	{
	    case 1: GameTextForPlayer(playerid, "~b~Bus Stop Checkpoint", 3000, 1);
	    case 2: GameTextForPlayer(playerid, "~y~Finish Checkpoint", 3000, 1);
	}
}

// ── Despawn helper (finish / death / abandon / disconnect) ───────────────────

static SideJob_DespawnVehicle(playerid, type)
{
	new i = PlayerSJVehicleIndex[playerid][type];

	new assigned_spawn = -1;
	if(i != -1)
	{
	    assigned_spawn = vehicleVariables[i][vVehicleSideJobSpawn];
		if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID)
		{
			DestroyVehicle(vehicleVariables[i][vVehicleScriptID]);
			vehicleVariables[i][vVehicleScriptID] = INVALID_VEHICLE_ID;
			Iter_Remove(sv_vehicles, PlayerSJVehicle[playerid][type]);
		}
	}
	DisablePlayerCheckpoint(playerid);
	SideJob_ResetPlayer(playerid, type);
	SideJob_ClearTimers(playerid, type);

	// Availability count changed -> update that spawn's label.
	foreach(new s : sj_spawn)
	{
	    if(SJSpawns[s][sjsID] == assigned_spawn && SJSpawns[s][sjsType] == type)
	    {
	        SideJob_RefreshSpawnLabel(s);
	        break;
	    }
	}
}

// ── Hooks ────────────────────────────────────────────────────────────────────

hook OnPlayerConnect(playerid)
{
	for(new t = 1; t < MAX_SJ_TYPES; ++t)
	    SideJob_ResetPlayer(playerid, t);
	return 1;
}

hook OnPlayerEnterCheckpoint(playerid)
{
	for(new t = 1; t < MAX_SJ_TYPES; ++t)
	{
	    if(PlayerSJVehicle[playerid][t] == INVALID_VEHICLE_ID) continue;

		new vehicleid = GetPlayerVehicleID(playerid);
		if(vehicleid != PlayerSJVehicle[playerid][t] || GetPlayerState(playerid) != PLAYER_STATE_DRIVER)
		    continue;

		new route_idx = PlayerSJRouteIndex[playerid][t];
		new step      = PlayerSJCheckpointStep[playerid][t];
		new type      = SJCheckpoints[t][route_idx][step][sjcType];

		DisablePlayerCheckpoint(playerid);

		if(type == 1 && SJDefs[SideJob_Row(t)][sjdHasStops])
		{
			TogglePlayerControllable(playerid, false);
			PlayerPlaySound(playerid, 1058, 0.0, 0.0, 0.0);

			PlayerSJStopTimer[playerid][t] = 30;
			if(PlayerSJStopTimerID[playerid][t] != -1) KillTimer(PlayerSJStopTimerID[playerid][t]);
			PlayerSJStopTimerID[playerid][t] = SetTimerEx("SideJob_StopCountdown", 1000, true, "dd", playerid, t);
		}
		else if(type == 2) // Finish
		{
			PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);

			new salary = SJRoutes[t][route_idx][sjrSalary];
			PlayerData[playerid][SJDefs[SideJob_Row(t)][sjdDelayField]] = gettime() + SJDefs[SideJob_Row(t)][sjdCooldown];
			PlayerData[playerid][pPayCheck] += salary;

			new srcname[40];
			format(srcname, sizeof(srcname), "%s Route", SJDefs[SideJob_Row(t)][sjdName]);
			AddSalaryHistory(playerid, salary, srcname);

			SendClientMessageEx(playerid, COLOR_GREEN, "%s Route completed! Salary $%d has been added to your paycheck.", SJDefs[SideJob_Row(t)][sjdTag], salary);
			SideJob_DespawnVehicle(playerid, t);
		}
		else // Normal
		{
			PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);
			PlayerSJCheckpointStep[playerid][t]++;
			ShowSideJobCheckpoint(playerid, t);
		}
	}
	return 1;
}

forward SideJob_StopCountdown(playerid, type);
public SideJob_StopCountdown(playerid, type)
{
	if(PlayerSJVehicle[playerid][type] == INVALID_VEHICLE_ID)
	{
		KillTimer(PlayerSJStopTimerID[playerid][type]);
		PlayerSJStopTimerID[playerid][type] = -1;
		return 1;
	}

	if(PlayerSJStopTimer[playerid][type] > 0)
	{
		new str[64];
		format(str, sizeof(str), "~r~Bus Stop~n~~w~Waiting... ~y~%d sec", PlayerSJStopTimer[playerid][type]);
		GameTextForPlayer(playerid, str, 1000, 3);
		PlayerSJStopTimer[playerid][type]--;
	}
	else
	{
		KillTimer(PlayerSJStopTimerID[playerid][type]);
		PlayerSJStopTimerID[playerid][type] = -1;

		TogglePlayerControllable(playerid, true);
		PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);

		PlayerSJCheckpointStep[playerid][type]++;
		ShowSideJobCheckpoint(playerid, type);
		SendClientMessage(playerid, COLOR_GREEN, "[BUSJOB]: Passengers loaded. Proceed to the next checkpoint.");
	}
	return 1;
}

hook OnPlayerDisconnect(playerid, reason)
{
	for(new t = 1; t < MAX_SJ_TYPES; ++t)
	{
	    if(PlayerSJVehicle[playerid][t] != INVALID_VEHICLE_ID)
	        SideJob_DespawnVehicle(playerid, t);
	    else
	        SideJob_ClearTimers(playerid, t);
	}
	return 1;
}

hook OnVehicleDeath(vehicleid, killerid)
{
	foreach(new i : Player)
	{
		for(new t = 1; t < MAX_SJ_TYPES; ++t)
		{
		    if(PlayerSJVehicle[i][t] != vehicleid) continue;

			SendClientMessageEx(i, COLOR_LIGHTRED, "%s Your %s was destroyed! The sidejob is cancelled.",
			    SJDefs[SideJob_Row(t)][sjdTag], SJDefs[SideJob_Row(t)][sjdName]);

			new idx = PlayerSJVehicleIndex[i][t];
			vehicleVariables[idx][vVehicleScriptID] = INVALID_VEHICLE_ID;
			Iter_Remove(sv_vehicles, vehicleid);

			SideJob_ResetPlayer(i, t);
			SideJob_ClearTimers(i, t);
		}
	}
	return 1;
}

hook OnPlayerStateChange(playerid, newstate, oldstate)
{
	if(oldstate == PLAYER_STATE_DRIVER && newstate != PLAYER_STATE_DRIVER)
	{
		for(new t = 1; t < MAX_SJ_TYPES; ++t)
		{
		    if(PlayerSJVehicle[playerid][t] == INVALID_VEHICLE_ID) continue;

			new row = SideJob_Row(t);
			new secs = SJDefs[row][sjdAbandonSecs];

			SendClientMessageEx(playerid, COLOR_YELLOW, "%s You left your %s! You have %d seconds to get back in before it despawns.",
			    SJDefs[row][sjdTag], SJDefs[row][sjdName], secs);

			PlayerSJAbandonGrace[playerid][t] = secs;
			PlayerSJAbandonTimer[playerid][t] = SetTimerEx("SideJob_AbandonTimer", 1000, true, "dd", playerid, t);
		}
	}
	else if(newstate == PLAYER_STATE_DRIVER && oldstate != PLAYER_STATE_DRIVER)
	{
		for(new t = 1; t < MAX_SJ_TYPES; ++t)
		{
			if(PlayerSJVehicle[playerid][t] != INVALID_VEHICLE_ID &&
			   GetPlayerVehicleID(playerid) == PlayerSJVehicle[playerid][t] &&
			   PlayerSJAbandonTimer[playerid][t] != -1)
			{
				KillTimer(PlayerSJAbandonTimer[playerid][t]);
				PlayerSJAbandonTimer[playerid][t] = -1;
				GameTextForPlayer(playerid, "~g~Welcome back", 1500, 3);
			}
		}
	}
	return 1;
}

// Per-second grace countdown while the driver is outside an active sidejob
// vehicle. Cancels itself when they re-enter or when the job ends elsewhere.
forward SideJob_AbandonTimer(playerid, type);
public SideJob_AbandonTimer(playerid, type)
{
	// Job ended / re-entered through another code path -> stop ticking.
	if(PlayerSJVehicle[playerid][type] == INVALID_VEHICLE_ID ||
	   GetPlayerVehicleID(playerid) == PlayerSJVehicle[playerid][type])
	{
		KillTimer(PlayerSJAbandonTimer[playerid][type]);
		PlayerSJAbandonTimer[playerid][type] = -1;
		return 1;
	}

	if(PlayerSJAbandonGrace[playerid][type] > 0)
	{
		new row = SideJob_Row(type);
		new str[96];
		format(str, sizeof(str), "~r~%s~n~~w~Return to vehicle: ~y~%d sec",
		    SJDefs[row][sjdName], PlayerSJAbandonGrace[playerid][type]);
		GameTextForPlayer(playerid, str, 1100, 3);
		PlayerSJAbandonGrace[playerid][type]--;
		return 1;
	}

	new row = SideJob_Row(type);
	SendClientMessageEx(playerid, COLOR_LIGHTRED, "%s You failed to return to your %s in time. The job has been cancelled.",
	    SJDefs[row][sjdTag], SJDefs[row][sjdName]);

	SideJob_DespawnVehicle(playerid, type);
	return 1;
}

// ── Player commands & dialogs ────────────────────────────────────────────────

CMD:spawn(playerid, params[])
{
	new spawn_idx = GetNearestSidejobSpawn(playerid);
	if(spawn_idx == -1)
	    return SendErrorMessage(playerid, "You must stand near a sidejob spawn point to use this command.");

	new t = SJSpawns[spawn_idx][sjsType];
	new str[1000];
	format(str, sizeof(str), "Plate\tSalary\tStatus\n");

	new count = 0;
	foreach(new i : sv_servercar)
	{
		if(vehicleVariables[i][vVehicleSideJob] == t &&
		   vehicleVariables[i][vVehicleSideJobSpawn] == SJSpawns[spawn_idx][sjsID])
		{
			new salary = 0;
			for(new r = 0; r < SJRouteCount[t]; ++r)
			{
				if(!strcmp(SJRoutes[t][r][sjrPlate], vehicleVariables[i][vVehiclePlate], true))
				{
				    salary = SJRoutes[t][r][sjrSalary];
				    break;
				}
			}

			new status_str[24];
			if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID) status_str = "{FF0000}[spawned]";
			else status_str = "{00FF00}[despawned]";

			new temp[128];
			format(temp, sizeof(temp), "%s\t$%d\t%s\n", vehicleVariables[i][vVehiclePlate], salary, status_str);
			strcat(str, temp);
			count++;
		}
	}

	if(count == 0)
	    return SendErrorMessage(playerid, "No vehicles are assigned to this spawn point yet.");

	ActiveSpawnPoint[playerid] = spawn_idx;

	new title[96];
	format(title, sizeof(title), "%s - Spawn Vehicle", SJDefs[SideJob_Row(t)][sjdName]);
	Dialog_Show(playerid, SideJobSpawnMenu, DIALOG_STYLE_TABLIST_HEADERS, title, str, "Spawn", "Close");
	return true;
}

Dialog:SideJobSpawnMenu(playerid, response, listitem, inputtext[])
{
	if(!response) return 1;

	new spawn_idx = ActiveSpawnPoint[playerid];
	if(spawn_idx == -1) return 1;

	new t = SJSpawns[spawn_idx][sjsType];
	new count = 0;

	foreach(new i : sv_servercar)
	{
		if(vehicleVariables[i][vVehicleSideJob] != t ||
		   vehicleVariables[i][vVehicleSideJobSpawn] != SJSpawns[spawn_idx][sjsID])
		    continue;

		if(count++ != listitem) continue;

		if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID)
		    return SendErrorMessage(playerid, "This vehicle is already spawned and active. Choose another one.");

		new remaining = PlayerData[playerid][SJDefs[SideJob_Row(t)][sjdDelayField]] - gettime();
		if(remaining > 0)
		    return SendErrorMessage(playerid, "You must wait %d minutes and %d seconds before you can do this job again.", remaining / 60, remaining % 60);

		new route_idx = -1;
		for(new r = 0; r < SJRouteCount[t]; ++r)
		{
			if(!strcmp(SJRoutes[t][r][sjrPlate], vehicleVariables[i][vVehiclePlate], true))
			{
			    route_idx = r;
			    break;
			}
		}
		if(route_idx == -1)
		    return SendErrorMessage(playerid, "This vehicle does not have a route defined. Ask an Admin to set up its route.");

		if(SJRoutes[t][route_idx][sjrTotalCheckpoints] < 1)
		    return SendErrorMessage(playerid, "The route for this vehicle has 0 checkpoints.");

		new scriptid = CreateVehicle(
		    vehicleVariables[i][vVehicleModelID],
		    vehicleVariables[i][vVehiclePosition][0],
		    vehicleVariables[i][vVehiclePosition][1],
		    vehicleVariables[i][vVehiclePosition][2],
		    vehicleVariables[i][vVehicleRotation],
		    vehicleVariables[i][vVehicleColour][0],
		    vehicleVariables[i][vVehicleColour][1],
		    60000,
		    vehicleVariables[i][vVehicleSiren]);

		ResetVehicle(scriptid);
		SetVehicleNumberPlate(scriptid, vehicleVariables[i][vVehiclePlate]);
		SetVehicleHealth(scriptid, 1000.0);
		vehicleVariables[i][vVehicleScriptID] = scriptid;
		Iter_Add(sv_vehicles, scriptid);

		PlayerSJVehicle[playerid][t]        = scriptid;
		PlayerSJVehicleIndex[playerid][t]   = i;
		PlayerSJCheckpointStep[playerid][t] = 0;
		PlayerSJRouteIndex[playerid][t]     = route_idx;

		if(PlayerSJAbandonTimer[playerid][t] != -1)
		{
			KillTimer(PlayerSJAbandonTimer[playerid][t]);
			PlayerSJAbandonTimer[playerid][t] = -1;
		}

		PutPlayerInVehicle(playerid, scriptid, 0);
		TogglePlayerControllable(playerid, true);
		ShowSideJobCheckpoint(playerid, t);

		SendClientMessageEx(playerid, COLOR_GREEN, "%s Vehicle spawned! Follow the checkpoints to complete the route.", SJDefs[SideJob_Row(t)][sjdTag]);
		SideJob_RefreshSpawnLabel(spawn_idx);
		return 1;
	}
	return 1;
}

// ── Admin: spawn points ──────────────────────────────────────────────────────

CMD:addsidejobspawn(playerid, params[])
{
	UnauthGate(playerid, 4);

	new list[128];
	for(new t = 1; t < MAX_SJ_TYPES; ++t)
		format(list, sizeof(list), "%s%s\n", list, SJDefs[SideJob_Row(t)][sjdName]);

	Dialog_Show(playerid, CreateSidejobSpawn, DIALOG_STYLE_LIST, "Create Sidejob Spawn", list, "Create", "Cancel");
	return 1;
}

Dialog:CreateSidejobSpawn(playerid, response, listitem, inputtext[])
{
	if(!response) return 1;

	new t = listitem + 1;
	if(t >= MAX_SJ_TYPES) return 1;

	new Float:x, Float:y, Float:z, q[256];
	GetPlayerPos(playerid, x, y, z);
	mysql_format(dbCon, q, sizeof(q),
	    "INSERT INTO `sidejob_spawns` (`type`, `posX`, `posY`, `posZ`, `interior`, `world`) VALUES ('%d', '%f', '%f', '%f', '%d', '%d')",
	    t, x, y, z, GetPlayerInterior(playerid), GetPlayerVirtualWorld(playerid));
	mysql_tquery(dbCon, q, "SideJob_OnSpawnCreated", "d", playerid);
	return 1;
}

forward SideJob_OnSpawnCreated(playerid);
public SideJob_OnSpawnCreated(playerid)
{
	SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Spawn point created successfully!");
	mysql_tquery(dbCon, "SELECT * FROM `sidejob_spawns` ORDER BY `id` ASC", "SideJob_LoadSpawns");
	return 1;
}

// ── Admin: sidejob vehicle editor ────────────────────────────────────────────

CMD:editsidejobveh(playerid, params[])
{
	UnauthGate(playerid, 4);

	new vehicleid = GetPlayerVehicleID(playerid);
	if(vehicleid == 0) return SendErrorMessage(playerid, "You must be inside the saved server vehicle to edit it.");

	new id = GetVehicleServerID(vehicleid);
	if(id == -1) return SendErrorMessage(playerid, "This vehicle is not a saved server vehicle (Permanent vehicle). Use /saveveh first.");

	EditingSidejobVeh[playerid] = id;
	ShowSidejobVehMenu(playerid);
	return 1;
}

stock ShowSidejobVehMenu(playerid)
{
	Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle",
	    "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
	return 1;
}

Dialog:EditSidejobVehMenu(playerid, response, listitem, inputtext[])
{
	if(!response) return 1;
	new id = EditingSidejobVeh[playerid];
	if(id == -1) return 1;

	switch(listitem)
	{
		case 0:
		{
			new list[128];
			for(new t = 1; t < MAX_SJ_TYPES; ++t)
				format(list, sizeof(list), "%s%s\n", list, SJDefs[SideJob_Row(t)][sjdName]);
			strcat(list, "None");
			Dialog_Show(playerid, SidejobVehSetJob, DIALOG_STYLE_LIST, "Set Sidejob", list, "Select", "Back");
		}
		case 1: Dialog_Show(playerid, SidejobVehColor, DIALOG_STYLE_INPUT, "Edit Color", "Enter Color 1 and Color 2 (space separated, e.g. '1 1'):", "Save", "Back");
		case 2:
		{
			new vehicleid = vehicleVariables[id][vVehicleScriptID];
			if(vehicleid == INVALID_VEHICLE_ID) return SendErrorMessage(playerid, "Vehicle must be spawned to park it.");

			new Float:x, Float:y, Float:z, Float:a;
			GetVehiclePos(vehicleid, x, y, z);
			GetVehicleZAngle(vehicleid, a);

			vehicleVariables[id][vVehiclePosition][0] = x;
			vehicleVariables[id][vVehiclePosition][1] = y;
			vehicleVariables[id][vVehiclePosition][2] = z;
			vehicleVariables[id][vVehicleRotation] = a;

			Vehicle_Save(id);
			SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle spawn coordinates updated to current position!");
			ShowSidejobVehMenu(playerid);
		}
		case 3:
		{
			new str[1000];
			format(str, sizeof(str), "ID\tType\tCoords\n");

			new count = 0;
			new veh_type = vehicleVariables[id][vVehicleSideJob];

			foreach(new sj : sj_spawn)
			{
			    if(SJSpawns[sj][sjsType] != veh_type) continue;

				new temp[128];
				format(temp, sizeof(temp), "%d\t%s\tX:%.1f Y:%.1f Z:%.1f\n",
				    SJSpawns[sj][sjsID], SJDefs[SideJob_Row(veh_type)][sjdName],
				    SJSpawns[sj][sjsPos][0], SJSpawns[sj][sjsPos][1], SJSpawns[sj][sjsPos][2]);
				strcat(str, temp);
				count++;
			}

			if(count == 0) return SendErrorMessage(playerid, "No sidejob spawn points available for this job type. Create one first using /addsidejobspawn.");
			Dialog_Show(playerid, SidejobVehSetSpawn, DIALOG_STYLE_TABLIST_HEADERS, "Select Spawn Point", str, "Select", "Back");
		}
		case 4: Dialog_Show(playerid, SidejobVehHealth, DIALOG_STYLE_INPUT, "Edit Health", "Enter health value (100-1000):", "Save", "Back");
		case 5: Dialog_Show(playerid, SidejobVehPlate, DIALOG_STYLE_INPUT, "Edit Plate", "Enter license plate (max 24 characters):", "Save", "Back");
	}
	return 1;
}

Dialog:SidejobVehSetJob(playerid, response, listitem, inputtext[])
{
	if(!response) return ShowSidejobVehMenu(playerid);
	new id = EditingSidejobVeh[playerid];
	if(id == -1) return 1;

	if(listitem < MAX_SJ_TYPES - 1)
	{
		new t = listitem + 1;
		vehicleVariables[id][vVehicleSideJob] = t;
		vehicleVariables[id][vVehicleSideJobSpawn] = -1;
		SendClientMessageEx(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle assigned to %s.", SJDefs[SideJob_Row(t)][sjdName]);
	}
	else
	{
		vehicleVariables[id][vVehicleSideJob] = 0;
		vehicleVariables[id][vVehicleSideJobSpawn] = -1;
		SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle removed from sidejob.");
	}
	Vehicle_Save(id);
	ShowSidejobVehMenu(playerid);
	return 1;
}

Dialog:SidejobVehColor(playerid, response, listitem, inputtext[])
{
	if(!response) return ShowSidejobVehMenu(playerid);
	new id = EditingSidejobVeh[playerid];
	if(id == -1) return 1;

	new col1, col2;
	if(sscanf(inputtext, "dd")) return Dialog_Show(playerid, SidejobVehColor, DIALOG_STYLE_INPUT, "Edit Color", "Invalid format.\nEnter Color 1 and Color 2 (space separated):", "Save", "Back");

	vehicleVariables[id][vVehicleColour][0] = col1;
	vehicleVariables[id][vVehicleColour][1] = col2;

	new scriptid = vehicleVariables[id][vVehicleScriptID];
	if(scriptid != INVALID_VEHICLE_ID) ChangeVehicleColor(scriptid, col1, col2);

	Vehicle_Save(id);
	SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Colors updated successfully!");
	ShowSidejobVehMenu(playerid);
	return 1;
}

Dialog:SidejobVehSetSpawn(playerid, response, listitem, inputtext[])
{
	if(!response) return ShowSidejobVehMenu(playerid);
	new id = EditingSidejobVeh[playerid];
	if(id == -1) return 1;

	new spawnid = strval(inputtext);
	vehicleVariables[id][vVehicleSideJobSpawn] = spawnid;
	Vehicle_Save(id);

	foreach(new s : sj_spawn)
	{
	    if(SJSpawns[s][sjsID] == spawnid && SJSpawns[s][sjsType] == vehicleVariables[id][vVehicleSideJob])
	    {
	        SideJob_RefreshSpawnLabel(s);
	        break;
	    }
	}

	SendClientMessageEx(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle assigned to spawn point ID: %d.", spawnid);
	ShowSidejobVehMenu(playerid);
	return 1;
}

Dialog:SidejobVehHealth(playerid, response, listitem, inputtext[])
{
	if(!response) return ShowSidejobVehMenu(playerid);
	new id = EditingSidejobVeh[playerid];
	if(id == -1) return 1;

	new Float:hp = floatstr(inputtext);
	if(hp < 100.0 || hp > 1000.0) return Dialog_Show(playerid, SidejobVehHealth, DIALOG_STYLE_INPUT, "Edit Health", "Invalid value.\nEnter health value (100-1000):", "Save", "Back");

	vehicleVariables[id][vVehicleHealth] = hp;
	new scriptid = vehicleVariables[id][vVehicleScriptID];
	if(scriptid != INVALID_VEHICLE_ID) SetVehicleHealth(scriptid, hp);

	Vehicle_Save(id);
	SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Health updated successfully!");
	ShowSidejobVehMenu(playerid);
	return 1;
}

Dialog:SidejobVehPlate(playerid, response, listitem, inputtext[])
{
	if(!response) return ShowSidejobVehMenu(playerid);
	new id = EditingSidejobVeh[playerid];
	if(id == -1) return 1;

	if(strlen(inputtext) < 1 || strlen(inputtext) > 23) return Dialog_Show(playerid, SidejobVehPlate, DIALOG_STYLE_INPUT, "Edit Plate", "Invalid size.\nEnter license plate (max 24 characters):", "Save", "Back");

	format(vehicleVariables[id][vVehiclePlate], 24, "%s", inputtext);
	new scriptid = vehicleVariables[id][vVehicleScriptID];
	if(scriptid != INVALID_VEHICLE_ID) SetVehicleNumberPlate(scriptid, inputtext);

	Vehicle_Save(id);
	SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Plate updated successfully!");
	ShowSidejobVehMenu(playerid);
	return 1;
}

// ── Admin: route creation (generic) ──────────────────────────────────────────

SideJob_RouteCmd(playerid, type, const params[])
{
	if(PlayerData[playerid][pAdmin] < 4)
	    return SendUnauthMessage(playerid, "You're not authorized to use this command.");

	if(type < 1 || type >= MAX_SJ_TYPES) return 1;

	new cmdname[16];
	format(cmdname, sizeof(cmdname), "%sroute", (type == SJ_BUS) ? "bus" : "sweeper");

	new cmd[32], options[128];
	if(sscanf(params, "s[32]S()[128]", cmd, options))
	{
		new syn[160];
		format(syn, sizeof(syn), "/%s [create/cp/", cmdname);
		if(SJDefs[SideJob_Row(type)][sjdHasStops]) strcat(syn, "cpstop/");
		strcat(syn, "finish/delete]");
		return SendClientMessageEx(playerid, COLOR_LIGHTRED, "USAGE:{FFFFFF} %s", syn);
	}

	if(!strcmp(cmd, "create", true))
	{
		new plate[24], salary;
		if(sscanf(options, "s[24]d", plate, salary))
		{
			new syn[96];
			format(syn, sizeof(syn), "/%s create [PLATE] [SALARY]", cmdname);
			return SendClientMessageEx(playerid, COLOR_LIGHTRED, "USAGE:{FFFFFF} %s", syn);
		}

		if(!IsPlayerInAnyVehicle(playerid))
		    return SendErrorMessage(playerid, "You must be in a vehicle to create checkpoints.");

		format(SJCreatingPlate[playerid], 24, plate);
		SJCreatingSalary[playerid] = salary;
		SJCreatingCPCount[playerid] = 0;
		SJCreatingType[playerid] = type;

		SendClientMessageEx(playerid, COLOR_YELLOW, "%s Started route creation for plate: %s with salary: $%d.", SJDefs[SideJob_Row(type)][sjdTag], plate, salary);
		SendClientMessageEx(playerid, COLOR_YELLOW, "%s Use /%s cp%s to add checkpoints. Use /%s finish when done.",
		    SJDefs[SideJob_Row(type)][sjdTag], cmdname,
		    SJDefs[SideJob_Row(type)][sjdHasStops] ? (" /cpstop") : (""), cmdname);
		return 1;
	}
	else if(!strcmp(cmd, "cp", true) || (!strcmp(cmd, "cpstop", true) && SJDefs[SideJob_Row(type)][sjdHasStops]))
	{
		if(SJCreatingType[playerid] == -1)
		    return SendErrorMessage(playerid, "You don't have an active route creation session.");

		if(!IsPlayerInAnyVehicle(playerid))
		    return SendErrorMessage(playerid, "You must be in a vehicle to add a checkpoint.");

		new count = SJCreatingCPCount[playerid];
		if(count >= MAX_SJ_CHECKPOINTS)
		    return SendErrorMessage(playerid, "Maximum checkpoints reached.");

		new Float:x, Float:y, Float:z;
		GetPlayerPos(playerid, x, y, z);
		SJCreatingCPs[playerid][count][0] = x;
		SJCreatingCPs[playerid][count][1] = y;
		SJCreatingCPs[playerid][count][2] = z;
		SJCreatingCPTypes[playerid][count] = !strcmp(cmd, "cpstop", true) ? 1 : 0;

		SJCreatingCPCount[playerid]++;
		SendClientMessageEx(playerid, COLOR_GREEN, "%s Checkpoint %d added at current position.", SJDefs[SideJob_Row(type)][sjdTag], count + 1);
		return 1;
	}
	else if(!strcmp(cmd, "finish", true))
	{
		if(SJCreatingType[playerid] == -1)
		    return SendErrorMessage(playerid, "You don't have an active route creation session.");

		new count = SJCreatingCPCount[playerid];
		if(count < 1)
		    return SendErrorMessage(playerid, "You must add at least one checkpoint before finishing.");

		if(!IsPlayerInAnyVehicle(playerid))
		    return SendErrorMessage(playerid, "You must be in a vehicle to place the finish checkpoint.");

		new Float:x, Float:y, Float:z;
		GetPlayerPos(playerid, x, y, z);
		SJCreatingCPs[playerid][count][0] = x;
		SJCreatingCPs[playerid][count][1] = y;
		SJCreatingCPs[playerid][count][2] = z;
		SJCreatingCPTypes[playerid][count] = 2;
		count++;

		new vehicleid = GetPlayerVehicleID(playerid);
		new id = GetVehicleServerID(vehicleid);
		if(id != -1)
		{
			DestroyVehicle(vehicleid);
			vehicleVariables[id][vVehicleScriptID] = INVALID_VEHICLE_ID;
			Iter_Remove(sv_vehicles, vehicleid);
		}

		new q[256];
		mysql_format(dbCon, q, sizeof(q), "SELECT `id` FROM `%s` WHERE `vehiclePlate` = '%e' LIMIT 1",
		    SJDefs[SideJob_Row(type)][sjdRouteTable], SJCreatingPlate[playerid]);
		mysql_tquery(dbCon, q, "SideJob_OnRouteSaved", "ddd", playerid, count, type);
		return 1;
	}
	else if(!strcmp(cmd, "delete", true))
	{
		new plate[24];
		if(sscanf(options, "s[24]", plate))
		{
			new syn[96];
			format(syn, sizeof(syn), "/%s delete [PLATE]", cmdname);
			return SendClientMessageEx(playerid, COLOR_LIGHTRED, "USAGE:{FFFFFF} %s", syn);
		}

		new q[256];
		mysql_format(dbCon, q, sizeof(q), "DELETE FROM `%s` WHERE `vehiclePlate` = '%e'", SJDefs[SideJob_Row(type)][sjdRouteTable], plate);
		mysql_tquery(dbCon, q, "SideJob_OnRouteDeleted", "ds", playerid, type, plate);
		return 1;
	}

	new syn[160];
	format(syn, sizeof(syn), "/%s [create/cp/", cmdname);
	if(SJDefs[SideJob_Row(type)][sjdHasStops]) strcat(syn, "cpstop/");
	strcat(syn, "finish/delete]");
	SendClientMessageEx(playerid, COLOR_LIGHTRED, "USAGE:{FFFFFF} %s", syn);
	return 1;
}

CMD:busroute(playerid, params[])
{
	new tmp[128];
	format(tmp, sizeof(tmp), "%s", params);
	return SideJob_RouteCmd(playerid, SJ_BUS, tmp);
}
CMD:sweeperroute(playerid, params[])
{
	new tmp[128];
	format(tmp, sizeof(tmp), "%s", params);
	return SideJob_RouteCmd(playerid, SJ_SWEEPER, tmp);
}

forward SideJob_OnRouteSaved(playerid, total_cps, type);
public SideJob_OnRouteSaved(playerid, total_cps, type)
{
	new route_id = 0, q[256];

	if(cache_num_rows() > 0)
	{
		cache_get_value_name_int(0, "id", route_id);

		mysql_format(dbCon, q, sizeof(q), "UPDATE `%s` SET `salary` = '%d', `total_checkpoints` = '%d' WHERE `id` = '%d'",
		    SJDefs[SideJob_Row(type)][sjdRouteTable], SJCreatingSalary[playerid], total_cps, route_id);
		mysql_tquery(dbCon, q);

		mysql_format(dbCon, q, sizeof(q), "DELETE FROM `%s` WHERE `routeId` = '%d'", SJDefs[SideJob_Row(type)][sjdCpTable], route_id);
		mysql_tquery(dbCon, q);
	}
	else
	{
		mysql_format(dbCon, q, sizeof(q), "INSERT INTO `%s` (`vehiclePlate`, `salary`, `total_checkpoints`) VALUES ('%e', '%d', '%d')",
		    SJDefs[SideJob_Row(type)][sjdRouteTable], SJCreatingPlate[playerid], SJCreatingSalary[playerid], total_cps);
		new Cache:c = mysql_query(dbCon, q);
		route_id = cache_insert_id();
		cache_delete(c);
	}

	if(route_id > 0)
	{
		for(new i = 0; i < total_cps; ++i)
		{
			mysql_format(dbCon, q, sizeof(q),
			    "INSERT INTO `%s` (`routeId`, `step`, `posX`, `posY`, `posZ`, `type`) VALUES ('%d', '%d', '%f', '%f', '%f', '%d')",
			    SJDefs[SideJob_Row(type)][sjdCpTable], route_id, i,
			    SJCreatingCPs[playerid][i][0], SJCreatingCPs[playerid][i][1], SJCreatingCPs[playerid][i][2],
			    SJCreatingCPTypes[playerid][i]);
			mysql_tquery(dbCon, q);
		}
	}

	SJCreatingType[playerid] = -1;
	SendClientMessageEx(playerid, COLOR_GREEN, "%s Route and checkpoints saved successfully!", SJDefs[SideJob_Row(type)][sjdTag]);

	new q2[128];
	format(q2, sizeof(q2), "SELECT * FROM `%s` ORDER BY `id` ASC", SJDefs[SideJob_Row(type)][sjdRouteTable]);
	mysql_tquery(dbCon, q2, "SideJob_LoadRoutes", "d", type);
	return 1;
}

forward SideJob_OnRouteDeleted(playerid, type, plate[]);
public SideJob_OnRouteDeleted(playerid, type, plate[])
{
	SendClientMessageEx(playerid, COLOR_GREEN, "%s Route deleted for plate: %s.", SJDefs[SideJob_Row(type)][sjdTag], plate);

	new q[128];
	format(q, sizeof(q), "SELECT * FROM `%s` ORDER BY `id` ASC", SJDefs[SideJob_Row(type)][sjdRouteTable]);
	mysql_tquery(dbCon, q, "SideJob_LoadRoutes", "d", type);
	return 1;
}
