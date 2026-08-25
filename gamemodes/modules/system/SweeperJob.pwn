/*
	Sanitary Andreas (Sweeper) Sidejob Module
	Los Jawa Roleplay
*/

#include <YSI_Coding/y_hooks>

#define MAX_SWEEPER_SPAWNS      (50)
#define MAX_SWEEPER_ROUTES      (100)
#define MAX_SWEEPER_CHECKPOINTS (100)

// Sweeper Spawn Point
enum E_SWEEPER_SPAWN
{
    swID,
    swType, // 2 = Sanitary Andreas
    Float:swPos[3],
    swInterior,
    swWorld,
    swPickup,
    Text3D:swText
};
new SweeperSpawns[MAX_SWEEPER_SPAWNS][E_SWEEPER_SPAWN];
new Iterator:sw_spawn<MAX_SWEEPER_SPAWNS>;

// Sweeper Route
enum E_SWEEPER_ROUTE
{
    srID,
    srPlate[24],
    srSalary,
    srTotalCheckpoints
};
new SweeperRoutes[MAX_SWEEPER_ROUTES][E_SWEEPER_ROUTE];
new Iterator:sweeper_route<MAX_SWEEPER_ROUTES>;

// Sweeper Route Checkpoints
enum E_SWEEPER_CHECKPOINT
{
    scID,
    scRouteID,
    scStep,
    Float:scPos[3],
    scType // 0 = normal, 2 = finish
};
new SweeperCheckpoints[MAX_SWEEPER_ROUTES][MAX_SWEEPER_CHECKPOINTS][E_SWEEPER_CHECKPOINT];

// Admin Sweeper Route Creation Session Variables
new CreatingSweeperRouteID[MAX_PLAYERS] = {-1, ...};
new CreatingSweeperPlate[MAX_PLAYERS][24];
new CreatingSweeperSalary[MAX_PLAYERS];
new CreatingSweeperCPCount[MAX_PLAYERS] = {0, ...};
new Float:CreatingSweeperCPs[MAX_PLAYERS][MAX_SWEEPER_CHECKPOINTS][3];
new CreatingSweeperCPTypes[MAX_PLAYERS][MAX_SWEEPER_CHECKPOINTS];



// Spawning target for player spawn dialog selection
new ActiveSweeperSpawnPoint[MAX_PLAYERS] = {-1, ...};

// Helper to check if player is near a sweeper spawn point
stock GetNearestSweeperSpawn(playerid, Float:range = 3.0)
{
    foreach(new i : sw_spawn)
    {
        if(IsPlayerInRangeOfPoint(playerid, range, SweeperSpawns[i][swPos][0], SweeperSpawns[i][swPos][1], SweeperSpawns[i][swPos][2]))
        {
            if(GetPlayerVirtualWorld(playerid) == SweeperSpawns[i][swWorld] && GetPlayerInterior(playerid) == SweeperSpawns[i][swInterior])
            {
                return i;
            }
        }
    }
    return -1;
}

// Initializer Hook Called from main init
stock SweeperJob_SetupTable()
{
    // Create tables
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `sweeper_routes` (\
        `id` INT AUTO_INCREMENT PRIMARY KEY,\
        `vehiclePlate` VARCHAR(24) UNIQUE,\
        `salary` INT,\
        `total_checkpoints` INT\
    )");

    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `sweeper_checkpoints` (\
        `id` INT AUTO_INCREMENT PRIMARY KEY,\
        `routeId` INT,\
        `step` INT,\
        `posX` FLOAT,\
        `posY` FLOAT,\
        `posZ` FLOAT,\
        `type` INT\
    )");

    mysql_tquery(dbCon, "ALTER TABLE `characters` ADD COLUMN `sweeperJobDelay` INT DEFAULT 0;");

    // Load spawns and routes
    mysql_tquery(dbCon, "SELECT * FROM `sidejob_spawns` WHERE `type` = '2' ORDER BY `id` ASC", "SweeperJob_LoadSpawns");
    mysql_tquery(dbCon, "SELECT * FROM `sweeper_routes` ORDER BY `id` ASC", "SweeperJob_LoadRoutes");

    return 1;
}

forward SweeperJob_LoadSpawns();
public SweeperJob_LoadSpawns()
{
    new rows = cache_num_rows();
    Iter_Clear(sw_spawn);

    for(new i = 0; i < rows && i < MAX_SWEEPER_SPAWNS; i++)
    {
        cache_get_value_name_int(i, "id", SweeperSpawns[i][swID]);
        cache_get_value_name_int(i, "type", SweeperSpawns[i][swType]);
        cache_get_value_name_float(i, "posX", SweeperSpawns[i][swPos][0]);
        cache_get_value_name_float(i, "posY", SweeperSpawns[i][swPos][1]);
        cache_get_value_name_float(i, "posZ", SweeperSpawns[i][swPos][2]);
        cache_get_value_name_int(i, "interior", SweeperSpawns[i][swInterior]);
        cache_get_value_name_int(i, "world", SweeperSpawns[i][swWorld]);

        // Create pickup (1239 = Info icon)
        SweeperSpawns[i][swPickup] = CreateDynamicPickup(1239, 23, SweeperSpawns[i][swPos][0], SweeperSpawns[i][swPos][1], SweeperSpawns[i][swPos][2], SweeperSpawns[i][swWorld], SweeperSpawns[i][swInterior]);

        new labelText[128];
        format(labelText, sizeof(labelText), "{00FFFF}Sanitary Andreas (Sweeper)\n{FFFFFF}[ID: %d]\n{00FF00}use /spawn", SweeperSpawns[i][swID]);
        SweeperSpawns[i][swText] = CreateDynamic3DTextLabel(labelText, COLOR_WHITE, SweeperSpawns[i][swPos][0], SweeperSpawns[i][swPos][1], SweeperSpawns[i][swPos][2] + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, SweeperSpawns[i][swWorld], SweeperSpawns[i][swInterior]);

        Iter_Add(sw_spawn, i);
    }
    printf("[SERVER]: Loaded %d sweeper spawns...", Iter_Count(sw_spawn));
    return 1;
}

forward SweeperJob_OnSpawnCreated(playerid);
public SweeperJob_OnSpawnCreated(playerid)
{
    SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Sweeper spawn point created successfully!");
    // Reload spawns
    mysql_tquery(dbCon, "SELECT * FROM `sidejob_spawns` WHERE `type` = '2' ORDER BY `id` ASC", "SweeperJob_LoadSpawns");
    return 1;
}

// Function to serve the spawn point selection in editsidejobveh
forward SweeperJob_GetSpawnList(str[], len);
public SweeperJob_GetSpawnList(str[], len)
{
    new count = 0;
    foreach(new i : sw_spawn)
    {
        new temp[128];
        format(temp, sizeof(temp), "%d\tSanitary Andreas\tX:%.1f Y:%.1f Z:%.1f\n", SweeperSpawns[i][swID], SweeperSpawns[i][swPos][0], SweeperSpawns[i][swPos][1], SweeperSpawns[i][swPos][2]);
        strcat(str, temp, len);
        count++;
    }
    return count;
}

forward SweeperJob_LoadRoutes();
public SweeperJob_LoadRoutes()
{
    new rows = cache_num_rows();
    Iter_Clear(sweeper_route);

    for(new i = 0; i < rows && i < MAX_SWEEPER_ROUTES; i++)
    {
        cache_get_value_name_int(i, "id", SweeperRoutes[i][srID]);
        cache_get_value_name(i, "vehiclePlate", SweeperRoutes[i][srPlate], 24);
        cache_get_value_name_int(i, "salary", SweeperRoutes[i][srSalary]);
        cache_get_value_name_int(i, "total_checkpoints", SweeperRoutes[i][srTotalCheckpoints]);

        Iter_Add(sweeper_route, i);

        // Query checkpoints for this route
        new q[128];
        mysql_format(dbCon, q, sizeof(q), "SELECT * FROM `sweeper_checkpoints` WHERE `routeId` = '%d' ORDER BY `step` ASC", SweeperRoutes[i][srID]);
        mysql_tquery(dbCon, q, "SweeperJob_LoadCheckpoints", "d", i);
    }
    printf("[SERVER]: Loaded %d sweeper routes...", Iter_Count(sweeper_route));
    return 1;
}

forward SweeperJob_LoadCheckpoints(route_idx);
public SweeperJob_LoadCheckpoints(route_idx)
{
    new rows = cache_num_rows();
    printf("[DEBUG SWEEPER]: SweeperJob_LoadCheckpoints callback. route_idx = %d, loaded rows = %d", route_idx, rows);
    for(new i = 0; i < rows && i < MAX_SWEEPER_CHECKPOINTS; i++)
    {
        cache_get_value_name_int(i, "id", SweeperCheckpoints[route_idx][i][scID]);
        cache_get_value_name_int(i, "routeId", SweeperCheckpoints[route_idx][i][scRouteID]);
        cache_get_value_name_int(i, "step", SweeperCheckpoints[route_idx][i][scStep]);
        cache_get_value_name_float(i, "posX", SweeperCheckpoints[route_idx][i][scPos][0]);
        cache_get_value_name_float(i, "posY", SweeperCheckpoints[route_idx][i][scPos][1]);
        cache_get_value_name_float(i, "posZ", SweeperCheckpoints[route_idx][i][scPos][2]);
        cache_get_value_name_int(i, "type", SweeperCheckpoints[route_idx][i][scType]);
        printf("  - CP step %d: pos=(%.2f, %.2f, %.2f), type=%d", i, SweeperCheckpoints[route_idx][i][scPos][0], SweeperCheckpoints[route_idx][i][scPos][1], SweeperCheckpoints[route_idx][i][scPos][2], SweeperCheckpoints[route_idx][i][scType]);
    }
    return 1;
}

// Commands: Admin Sweeper Route creation

CMD:sweeperroute(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    new cmd[32], options[128];
    if(sscanf(params, "s[32]S()[128]", cmd, options))
    {
        SendSyntaxMessage(playerid, "/sweeperroute [create/cp/finish/delete]");
        return 1;
    }

    if(!strcmp(cmd, "create", true))
    {
        new plate[24], salary;
        if(sscanf(options, "s[24]d", plate, salary))
        {
            SendSyntaxMessage(playerid, "/sweeperroute create [PLATE] [SALARY]");
            return 1;
        }

        if(!IsPlayerInAnyVehicle(playerid))
        {
            return SendErrorMessage(playerid, "You must be in a vehicle to create checkpoints.");
        }

        format(CreatingSweeperPlate[playerid], 24, "%s", plate);
        CreatingSweeperSalary[playerid] = salary;
        CreatingSweeperCPCount[playerid] = 0;
        CreatingSweeperRouteID[playerid] = 0; // active session

        SendClientMessageEx(playerid, COLOR_YELLOW, "[SWEEPER]: Started route creation for plate: %s with salary: $%d.", plate, salary);
        SendClientMessage(playerid, COLOR_YELLOW, "[SWEEPER]: Use /sweeperroute cp to add checkpoints. Use /sweeperroute finish when done.");
        return 1;
    }
    else if(!strcmp(cmd, "cp", true))
    {
        if(CreatingSweeperRouteID[playerid] == -1)
            return SendErrorMessage(playerid, "You don't have an active route creation session. Use /sweeperroute create first.");

        if(!IsPlayerInAnyVehicle(playerid))
            return SendErrorMessage(playerid, "You must be in a vehicle to add a checkpoint.");

        new count = CreatingSweeperCPCount[playerid];
        if(count >= MAX_SWEEPER_CHECKPOINTS)
            return SendErrorMessage(playerid, "Maximum checkpoints reached.");

        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);
        CreatingSweeperCPs[playerid][count][0] = x;
        CreatingSweeperCPs[playerid][count][1] = y;
        CreatingSweeperCPs[playerid][count][2] = z;
        CreatingSweeperCPTypes[playerid][count] = 0; // Normal CP

        CreatingSweeperCPCount[playerid]++;
        SendClientMessageEx(playerid, COLOR_GREEN, "[SWEEPER]: Checkpoint %d added at current position.", count + 1);
        return 1;
    }
    else if(!strcmp(cmd, "finish", true))
    {
        if(CreatingSweeperRouteID[playerid] == -1)
            return SendErrorMessage(playerid, "You don't have an active route creation session. Use /sweeperroute create first.");

        new count = CreatingSweeperCPCount[playerid];
        if(count < 1)
            return SendErrorMessage(playerid, "You must add at least one checkpoint before finishing.");

        if(!IsPlayerInAnyVehicle(playerid))
            return SendErrorMessage(playerid, "You must be in a vehicle to place the finish checkpoint.");

        // Add final checkpoint
        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);
        CreatingSweeperCPs[playerid][count][0] = x;
        CreatingSweeperCPs[playerid][count][1] = y;
        CreatingSweeperCPs[playerid][count][2] = z;
        CreatingSweeperCPTypes[playerid][count] = 2; // Finish CP
        CreatingSweeperCPCount[playerid]++;
        count++;

        // Despawn the vehicle the admin is in
        new vehicleid = GetPlayerVehicleID(playerid);
        new id = GetVehicleServerID(vehicleid); // defined globally or in helper
        if(id != -1)
        {
            DestroyVehicle(vehicleid);
            vehicleVariables[id][vVehicleScriptID] = INVALID_VEHICLE_ID;
            Iter_Remove(sv_vehicles, vehicleid);
        }

        // Save route to database
        new q[256];
        mysql_format(dbCon, q, sizeof(q), "SELECT `id` FROM `sweeper_routes` WHERE `vehiclePlate` = '%e' LIMIT 1", CreatingSweeperPlate[playerid]);
        mysql_tquery(dbCon, q, "SweeperJob_OnRouteSaved", "dd", playerid, count);

        return 1;
    }
    else if(!strcmp(cmd, "delete", true))
    {
        new plate[24];
        if(sscanf(options, "s[24]", plate))
        {
            SendSyntaxMessage(playerid, "/sweeperroute delete [PLATE]");
            return 1;
        }

        new q[256];
        mysql_format(dbCon, q, sizeof(q), "DELETE FROM `sweeper_routes` WHERE `vehiclePlate` = '%e'", plate);
        mysql_tquery(dbCon, q, "SweeperJob_OnRouteDeleted", "ds", playerid, plate);
        return 1;
    }
    else
    {
        SendSyntaxMessage(playerid, "/sweeperroute [create/cp/finish/delete]");
    }
    return 1;
}

YCMD:sweeperjobroute(playerid, params[], help) = sweeperroute;

forward SweeperJob_OnRouteSaved(playerid, total_cps);
public SweeperJob_OnRouteSaved(playerid, total_cps)
{
    new route_id = 0;
    new q[256];

    if(cache_num_rows() > 0)
    {
        cache_get_value_name_int(0, "id", route_id);

        // Update route data
        mysql_format(dbCon, q, sizeof(q), "UPDATE `sweeper_routes` SET `salary` = '%d', `total_checkpoints` = '%d' WHERE `id` = '%d'", CreatingSweeperSalary[playerid], total_cps, route_id);
        mysql_tquery(dbCon, q);

        // Delete old checkpoints
        mysql_format(dbCon, q, sizeof(q), "DELETE FROM `sweeper_checkpoints` WHERE `routeId` = '%d'", route_id);
        mysql_tquery(dbCon, q);
    }
    else
    {
        // Insert new route
        mysql_format(dbCon, q, sizeof(q), "INSERT INTO `sweeper_routes` (`vehiclePlate`, `salary`, `total_checkpoints`) VALUES ('%e', '%d', '%d')", CreatingSweeperPlate[playerid], CreatingSweeperSalary[playerid], total_cps);
        new Cache:c = mysql_query(dbCon, q);
        route_id = cache_insert_id();
        cache_delete(c);
    }

    if(route_id > 0)
    {
        // Insert checkpoints
        for(new i = 0; i < total_cps; i++)
        {
            mysql_format(dbCon, q, sizeof(q), "INSERT INTO `sweeper_checkpoints` (`routeId`, `step`, `posX`, `posY`, `posZ`, `type`) VALUES ('%d', '%d', '%f', '%f', '%f', '%d')",
                route_id, i, CreatingSweeperCPs[playerid][i][0], CreatingSweeperCPs[playerid][i][1], CreatingSweeperCPs[playerid][i][2], CreatingSweeperCPTypes[playerid][i]);
            mysql_tquery(dbCon, q);
        }
        printf("[DEBUG SWEEPER]: SweeperJob_OnRouteSaved. route_id = %d, total_cps = %d saved.", route_id, total_cps);
    }
    else
    {
        printf("[DEBUG SWEEPER]: SweeperJob_OnRouteSaved failed (route_id is 0).");
    }

    CreatingSweeperRouteID[playerid] = -1;
    SendClientMessage(playerid, COLOR_GREEN, "[SWEEPER]: Sweeper route and checkpoints saved successfully!");

    // Reload routes
    mysql_tquery(dbCon, "SELECT * FROM `sweeper_routes` ORDER BY `id` ASC", "SweeperJob_LoadRoutes");
    return 1;
}

forward SweeperJob_OnRouteDeleted(playerid, plate[]);
public SweeperJob_OnRouteDeleted(playerid, plate[])
{
    SendClientMessageEx(playerid, COLOR_GREEN, "[SWEEPER]: Sweeper route deleted for plate: %s.", plate);
    // Reload routes
    mysql_tquery(dbCon, "SELECT * FROM `sweeper_routes` ORDER BY `id` ASC", "SweeperJob_LoadRoutes");
    return 1;
}

// Function called from CMD:spawn in BusJob.pwn
forward SweeperJob_OnSpawnCommand(playerid);
public SweeperJob_OnSpawnCommand(playerid)
{
    new spawn_idx = GetNearestSweeperSpawn(playerid, 3.0);
    if(spawn_idx == -1)
    {
        return SendErrorMessage(playerid, "You must stand near a sidejob spawn point to use this command.");
    }

    new str[1000];
    format(str, sizeof(str), "Plate\tSalary\tStatus\n");

    new count = 0;
    foreach(new i : sv_servercar)
    {
        if(vehicleVariables[i][vVehicleSideJob] == 2 && vehicleVariables[i][vVehicleSideJobSpawn] == SweeperSpawns[spawn_idx][swID])
        {
            // Find salary
            new salary = 0;
            foreach(new r : sweeper_route)
            {
                if(!strcmp(SweeperRoutes[r][srPlate], vehicleVariables[i][vVehiclePlate], true))
                {
                    salary = SweeperRoutes[r][srSalary];
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
    {
        return SendErrorMessage(playerid, "No sweepers are assigned to this spawn point yet.");
    }

    ActiveSweeperSpawnPoint[playerid] = spawn_idx;
    Dialog_Show(playerid, SweeperSpawnMenu, DIALOG_STYLE_TABLIST_HEADERS, "Sanitary Andreas - Spawn Sweeper", str, "Spawn", "Close");
    return 1;
}

// Dialog: player spawn menu
Dialog:SweeperSpawnMenu(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;
    new spawn_idx = ActiveSweeperSpawnPoint[playerid];
    if(spawn_idx == -1) return 1;

    new count = 0;
    foreach(new i : sv_servercar)
    {
        if(vehicleVariables[i][vVehicleSideJob] == 2 && vehicleVariables[i][vVehicleSideJobSpawn] == SweeperSpawns[spawn_idx][swID])
        {
            if(count == listitem)
            {
                // Check if already spawned
                if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID)
                {
                    return SendErrorMessage(playerid, "This sweeper is already spawned and active. Choose another one.");
                }

                // Check delay
                if(gettime() < PlayerData[playerid][pSweeperJobDelay])
                {
                    new remaining = PlayerData[playerid][pSweeperJobDelay] - gettime();
                    return SendErrorMessage(playerid, "You must wait %d minutes and %d seconds before you can do the sweeper job again.", remaining / 60, remaining % 60);
                }

                // Find route index
                new route_idx = -1;
                foreach(new r : sweeper_route)
                {
                    if(!strcmp(SweeperRoutes[r][srPlate], vehicleVariables[i][vVehiclePlate], true))
                    {
                        route_idx = r;
                        break;
                    }
                }

                if(route_idx == -1)
                {
                    return SendErrorMessage(playerid, "This sweeper does not have a route defined. Ask an Admin to set up its route.");
                }

                if(SweeperRoutes[route_idx][srTotalCheckpoints] < 1)
                {
                    return SendErrorMessage(playerid, "The route for this sweeper has 0 checkpoints.");
                }

                // Spawn vehicle
                new scriptid = CreateVehicle(vehicleVariables[i][vVehicleModelID],
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

                // Set player variables
                PlayerSweeperVehicle[playerid] = scriptid;
                PlayerSweeperVehicleIndex[playerid] = i;
                PlayerSweeperCheckpointStep[playerid] = 0;
                PlayerSweeperRouteIndex[playerid] = route_idx;

                printf("[DEBUG SWEEPER]: Player spawned sweeper successfully. route_idx = %d, total_cps = %d", route_idx, SweeperRoutes[route_idx][srTotalCheckpoints]);

                PutPlayerInVehicle(playerid, scriptid, 0);
                TogglePlayerControllable(playerid, true);

                // Show first checkpoint
                ShowPlayerSweeperCheckpoint(playerid);

                SendClientMessage(playerid, COLOR_GREEN, "[SWEEPER]: Sweeper spawned! Follow the checkpoints to clean the streets.");
                return 1;
            }
            count++;
        }
    }
    return 1;
}

// Function to display the player checkpoint
stock ShowPlayerSweeperCheckpoint(playerid)
{
    new route_idx = PlayerSweeperRouteIndex[playerid];
    new step = PlayerSweeperCheckpointStep[playerid];
    new total = SweeperRoutes[route_idx][srTotalCheckpoints];

    printf("[DEBUG SWEEPER]: ShowPlayerSweeperCheckpoint. playerid = %d, route_idx = %d, step = %d, total = %d", playerid, route_idx, step, total);

    if(step >= total)
    {
        printf("[DEBUG SWEEPER]:   - Step (%d) >= Total (%d). Return early.", step, total);
        return;
    }

    new Float:cx = SweeperCheckpoints[route_idx][step][scPos][0];
    new Float:cy = SweeperCheckpoints[route_idx][step][scPos][1];
    new Float:cz = SweeperCheckpoints[route_idx][step][scPos][2];
    new type = SweeperCheckpoints[route_idx][step][scType];

    printf("[DEBUG SWEEPER]:   - CP coords = (%.2f, %.2f, %.2f), type = %d", cx, cy, cz, type);

    new Float:size = 5.0;

    // Show checkpoint
    if(type == 2) // Finish
    {
        SetPlayerCheckpoint(playerid, cx, cy, cz, size);
        GameTextForPlayer(playerid, "~y~Finish Checkpoint", 3000, 1);
    }
    else
    {
        SetPlayerCheckpoint(playerid, cx, cy, cz, size);
    }
}

// Hook Player enter checkpoint
hook OnPlayerEnterCheckpoint(playerid)
{
    if(PlayerSweeperVehicle[playerid] != INVALID_VEHICLE_ID)
    {
        new vehicleid = GetPlayerVehicleID(playerid);
        if(vehicleid == PlayerSweeperVehicle[playerid] && GetPlayerState(playerid) == PLAYER_STATE_DRIVER)
        {
            new route_idx = PlayerSweeperRouteIndex[playerid];
            new step = PlayerSweeperCheckpointStep[playerid];
            new type = SweeperCheckpoints[route_idx][step][scType];

            if(type == 0) // Normal
            {
                PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);
                DisablePlayerCheckpoint(playerid);

                PlayerSweeperCheckpointStep[playerid]++;
                ShowPlayerSweeperCheckpoint(playerid);
            }
            else if(type == 2) // Finish
            {
                DisablePlayerCheckpoint(playerid);
                PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);

                new salary = SweeperRoutes[route_idx][srSalary];
                PlayerData[playerid][pPayCheck] += salary;

                SendClientMessageEx(playerid, COLOR_GREEN, "[SWEEPER]: Route completed! Salary $%d has been added to your paycheck.", salary);

                // Despawn sweeper
                new i = PlayerSweeperVehicleIndex[playerid];
                DestroyVehicle(vehicleVariables[i][vVehicleScriptID]);
                vehicleVariables[i][vVehicleScriptID] = INVALID_VEHICLE_ID;
                Iter_Remove(sv_vehicles, PlayerSweeperVehicle[playerid]);

                // Reset variables
                PlayerSweeperVehicle[playerid] = INVALID_VEHICLE_ID;
                PlayerSweeperVehicleIndex[playerid] = -1;
                PlayerSweeperCheckpointStep[playerid] = 0;
                PlayerSweeperRouteIndex[playerid] = -1;

                // Cooldown: 10 minutes (600 seconds)
                PlayerData[playerid][pSweeperJobDelay] = gettime() + 600;
            }
        }
    }
    return 1;
}

// Hook disconnect
hook OnPlayerDisconnect(playerid, reason)
{
    if(PlayerSweeperVehicle[playerid] != INVALID_VEHICLE_ID)
    {
        new i = PlayerSweeperVehicleIndex[playerid];
        DestroyVehicle(vehicleVariables[i][vVehicleScriptID]);
        vehicleVariables[i][vVehicleScriptID] = INVALID_VEHICLE_ID;
        Iter_Remove(sv_vehicles, PlayerSweeperVehicle[playerid]);

        PlayerSweeperVehicle[playerid] = INVALID_VEHICLE_ID;
        PlayerSweeperVehicleIndex[playerid] = -1;
        PlayerSweeperCheckpointStep[playerid] = 0;
        PlayerSweeperRouteIndex[playerid] = -1;
    }
    return 1;
}

// Hook vehicle death
hook OnVehicleDeath(vehicleid, killerid)
{
    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(IsPlayerConnected(i) && PlayerSweeperVehicle[i] == vehicleid)
        {
            SendClientMessage(i, COLOR_LIGHTRED, "[SWEEPER]: Your sweeper was destroyed! The sidejob is cancelled.");

            new idx = PlayerSweeperVehicleIndex[i];
            vehicleVariables[idx][vVehicleScriptID] = INVALID_VEHICLE_ID;
            Iter_Remove(sv_vehicles, vehicleid);

            DisablePlayerCheckpoint(i);

            PlayerSweeperVehicle[i] = INVALID_VEHICLE_ID;
            PlayerSweeperVehicleIndex[i] = -1;
            PlayerSweeperCheckpointStep[i] = 0;
            PlayerSweeperRouteIndex[i] = -1;
            break;
        }
    }
    return 1;
}

// Hook player state change (exiting vehicle)
hook OnPlayerStateChange(playerid, newstate, oldstate)
{
    if(oldstate == PLAYER_STATE_DRIVER && newstate != PLAYER_STATE_DRIVER)
    {
        if(PlayerSweeperVehicle[playerid] != INVALID_VEHICLE_ID)
        {
            SendClientMessage(playerid, COLOR_YELLOW, "[SWEEPER]: You left your sweeper! If you disconnect or it gets destroyed, the job cancels.");
        }
    }
    return 1;
}

hook OnPlayerConnect(playerid)
{
    PlayerSweeperVehicle[playerid] = INVALID_VEHICLE_ID;
    PlayerSweeperVehicleIndex[playerid] = -1;
    PlayerSweeperCheckpointStep[playerid] = 0;
    PlayerSweeperRouteIndex[playerid] = -1;
    return 1;
}
