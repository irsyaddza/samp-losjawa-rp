/*
	Bus Driver Sidejob Module
	Los Jawa Roleplay
*/

#include <YSI_Coding\y_hooks>

#define MAX_SIDEJOB_SPAWNS      (50)
#define MAX_BUS_ROUTES          (100)
#define MAX_ROUTE_CHECKPOINTS   (100)

// Sidejob Spawn Point
enum E_SIDEJOB_SPAWN
{
    sjID,
    sjType, // 1 = Canny Bus Group
    Float:sjPos[3],
    sjInterior,
    sjWorld,
    sjPickup,
    Text3D:sjText
};
new SidejobSpawns[MAX_SIDEJOB_SPAWNS][E_SIDEJOB_SPAWN];
new Iterator:sj_spawn<MAX_SIDEJOB_SPAWNS>;

// Bus Route
enum E_BUS_ROUTE
{
    brID,
    brPlate[24],
    brSalary,
    brTotalCheckpoints
};
new BusRoutes[MAX_BUS_ROUTES][E_BUS_ROUTE];
new Iterator:bus_route<MAX_BUS_ROUTES>;

// Bus Route Checkpoints
enum E_ROUTE_CHECKPOINT
{
    rcID,
    rcRouteID,
    rcStep,
    Float:rcPos[3],
    rcType // 0 = normal, 1 = cpstop, 2 = finish
};
new RouteCheckpoints[MAX_BUS_ROUTES][MAX_ROUTE_CHECKPOINTS][E_ROUTE_CHECKPOINT];

// Admin Route Creation Session Variables
new CreatingRouteRouteID[MAX_PLAYERS] = {-1, ...};
new CreatingRoutePlate[MAX_PLAYERS][24];
new CreatingRouteSalary[MAX_PLAYERS];
new CreatingRouteCheckpointsCount[MAX_PLAYERS] = {0, ...};
new Float:CreatingRouteCPs[MAX_PLAYERS][MAX_ROUTE_CHECKPOINTS][3];
new CreatingRouteCPTypes[MAX_PLAYERS][MAX_ROUTE_CHECKPOINTS];

// Reset Player Active Bus Job Variables on Connect
hook OnPlayerConnect(playerid)
{
    PlayerBusVehicle[playerid] = INVALID_VEHICLE_ID;
    PlayerBusVehicleIndex[playerid] = -1;
    PlayerBusCheckpointStep[playerid] = 0;
    PlayerBusRouteIndex[playerid] = -1;
    return 1;
}
new PlayerBusAbandonTimer[MAX_PLAYERS] = {-1, ...};
new PlayerBusStopTimer[MAX_PLAYERS] = {0, ...};
new PlayerBusStopTimerID[MAX_PLAYERS] = {-1, ...};

// Target vehicle for /editsidejobveh
new EditingSidejobVeh[MAX_PLAYERS] = {-1, ...};

// Spawning target for player spawn dialog selection
new ActiveSpawningSpawnPoint[MAX_PLAYERS] = {-1, ...};

// Helper function to find server vehicle index
stock GetVehicleServerID(vehicleid)
{
    foreach(new i : sv_servercar)
    {
        if(vehicleVariables[i][vVehicleScriptID] == vehicleid)
            return i;
    }
    return -1;
}

// Helper to check if player is near a sidejob spawn point
stock GetNearestSidejobSpawn(playerid, Float:range = 3.0)
{
    foreach(new i : sj_spawn)
    {
        if(IsPlayerInRangeOfPoint(playerid, range, SidejobSpawns[i][sjPos][0], SidejobSpawns[i][sjPos][1], SidejobSpawns[i][sjPos][2]))
        {
            if(GetPlayerVirtualWorld(playerid) == SidejobSpawns[i][sjWorld] && GetPlayerInterior(playerid) == SidejobSpawns[i][sjInterior])
            {
                return i;
            }
        }
    }
    return -1;
}

stock BusJob_SetupTable()
{
    // Create tables
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `sidejob_spawns` (\
        `id` INT AUTO_INCREMENT PRIMARY KEY,\
        `type` INT DEFAULT 1,\
        `posX` FLOAT,\
        `posY` FLOAT,\
        `posZ` FLOAT,\
        `interior` INT DEFAULT 0,\
        `world` INT DEFAULT 0\
    )");

    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `bus_routes` (\
        `id` INT AUTO_INCREMENT PRIMARY KEY,\
        `vehiclePlate` VARCHAR(24) UNIQUE,\
        `salary` INT,\
        `total_checkpoints` INT\
    )");

    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `bus_checkpoints` (\
        `id` INT AUTO_INCREMENT PRIMARY KEY,\
        `routeId` INT,\
        `step` INT,\
        `posX` FLOAT,\
        `posY` FLOAT,\
        `posZ` FLOAT,\
        `type` INT\
    )");

    // Run alerts
    mysql_tquery(dbCon, "ALTER TABLE `vehicles` ADD COLUMN `vehicleSideJob` INT DEFAULT 0;");
    mysql_tquery(dbCon, "ALTER TABLE `vehicles` ADD COLUMN `vehicleSideJobSpawn` INT DEFAULT -1;");
    mysql_tquery(dbCon, "ALTER TABLE `characters` ADD COLUMN `busJobDelay` INT DEFAULT 0;");

    // Load spawns and routes
    mysql_tquery(dbCon, "SELECT * FROM `sidejob_spawns` WHERE `type` = '1' ORDER BY `id` ASC", "BusJob_LoadSpawns");
    mysql_tquery(dbCon, "SELECT * FROM `bus_routes` ORDER BY `id` ASC", "BusJob_LoadRoutes");

    return 1;
}

forward BusJob_LoadSpawns();
public BusJob_LoadSpawns()
{
    new rows = cache_num_rows();
    Iter_Clear(sj_spawn);

    for(new i = 0; i < rows && i < MAX_SIDEJOB_SPAWNS; i++)
    {
        cache_get_value_name_int(i, "id", SidejobSpawns[i][sjID]);
        cache_get_value_name_int(i, "type", SidejobSpawns[i][sjType]);
        cache_get_value_name_float(i, "posX", SidejobSpawns[i][sjPos][0]);
        cache_get_value_name_float(i, "posY", SidejobSpawns[i][sjPos][1]);
        cache_get_value_name_float(i, "posZ", SidejobSpawns[i][sjPos][2]);
        cache_get_value_name_int(i, "interior", SidejobSpawns[i][sjInterior]);
        cache_get_value_name_int(i, "world", SidejobSpawns[i][sjWorld]);

        // Create pickup (1239 = Info icon / white I)
        SidejobSpawns[i][sjPickup] = CreateDynamicPickup(1239, 23, SidejobSpawns[i][sjPos][0], SidejobSpawns[i][sjPos][1], SidejobSpawns[i][sjPos][2], SidejobSpawns[i][sjWorld], SidejobSpawns[i][sjInterior]);

        new labelText[128];
        format(labelText, sizeof(labelText), "{00FFFF}Canny Bus Group\n{FFFFFF}[ID: %d]\n{00FF00}use /spawn", SidejobSpawns[i][sjID]);
        SidejobSpawns[i][sjText] = CreateDynamic3DTextLabel(labelText, COLOR_WHITE, SidejobSpawns[i][sjPos][0], SidejobSpawns[i][sjPos][1], SidejobSpawns[i][sjPos][2] + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, SidejobSpawns[i][sjWorld], SidejobSpawns[i][sjInterior]);

        Iter_Add(sj_spawn, i);
    }
    printf("[SERVER]: Loaded %d sidejob spawns...", Iter_Count(sj_spawn));
    return 1;
}

forward BusJob_LoadRoutes();
public BusJob_LoadRoutes()
{
    new rows = cache_num_rows();
    Iter_Clear(bus_route);

    for(new i = 0; i < rows && i < MAX_BUS_ROUTES; i++)
    {
        cache_get_value_name_int(i, "id", BusRoutes[i][brID]);
        cache_get_value_name(i, "vehiclePlate", BusRoutes[i][brPlate], 24);
        cache_get_value_name_int(i, "salary", BusRoutes[i][brSalary]);
        cache_get_value_name_int(i, "total_checkpoints", BusRoutes[i][brTotalCheckpoints]);

        Iter_Add(bus_route, i);

        // Query checkpoints for this route
        new q[128];
        mysql_format(dbCon, q, sizeof(q), "SELECT * FROM `bus_checkpoints` WHERE `routeId` = '%d' ORDER BY `step` ASC", BusRoutes[i][brID]);
        mysql_tquery(dbCon, q, "BusJob_LoadCheckpoints", "d", i);
    }
    printf("[SERVER]: Loaded %d bus routes...", Iter_Count(bus_route));
    return 1;
}

forward BusJob_LoadCheckpoints(route_idx);
public BusJob_LoadCheckpoints(route_idx)
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_ROUTE_CHECKPOINTS; i++)
    {
        cache_get_value_name_int(i, "id", RouteCheckpoints[route_idx][i][rcID]);
        cache_get_value_name_int(i, "routeId", RouteCheckpoints[route_idx][i][rcRouteID]);
        cache_get_value_name_int(i, "step", RouteCheckpoints[route_idx][i][rcStep]);
        cache_get_value_name_float(i, "posX", RouteCheckpoints[route_idx][i][rcPos][0]);
        cache_get_value_name_float(i, "posY", RouteCheckpoints[route_idx][i][rcPos][1]);
        cache_get_value_name_float(i, "posZ", RouteCheckpoints[route_idx][i][rcPos][2]);
        cache_get_value_name_int(i, "type", RouteCheckpoints[route_idx][i][rcType]);
    }
    return 1;
}

forward SweeperJob_OnSpawnCreated(playerid);

// Dialog: add spawn point
Dialog:CreateSidejobSpawn(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    new interior = GetPlayerInterior(playerid);
    new world = GetPlayerVirtualWorld(playerid);
    new q[256];

    if(listitem == 0) // Canny Bus Group
    {
        mysql_format(dbCon, q, sizeof(q), "INSERT INTO `sidejob_spawns` (`type`, `posX`, `posY`, `posZ`, `interior`, `world`) VALUES ('1', '%f', '%f', '%f', '%d', '%d')", x, y, z, interior, world);
        mysql_tquery(dbCon, q, "BusJob_OnSpawnCreated", "d", playerid);
    }
    else if(listitem == 1) // Sanitary Andreas (Sweeper)
    {
        mysql_format(dbCon, q, sizeof(q), "INSERT INTO `sidejob_spawns` (`type`, `posX`, `posY`, `posZ`, `interior`, `world`) VALUES ('2', '%f', '%f', '%f', '%d', '%d')", x, y, z, interior, world);
        mysql_tquery(dbCon, q, "SweeperJob_OnSpawnCreated", "d", playerid);
    }
    return 1;
}

forward BusJob_OnSpawnCreated(playerid);
public BusJob_OnSpawnCreated(playerid)
{
    SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Spawn point created successfully!");
    // Reload spawns
    mysql_tquery(dbCon, "SELECT * FROM `sidejob_spawns` WHERE `type` = '1' ORDER BY `id` ASC", "BusJob_LoadSpawns");
    return 1;
}

// Dialog: edit sidejob veh menu
Dialog:EditSidejobVehMenu(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;
    new id = EditingSidejobVeh[playerid];
    if(id == -1) return 1;

    switch(listitem)
    {
        case 0: // Set Sidejob
        {
            Dialog_Show(playerid, SidejobVehSetJob, DIALOG_STYLE_LIST, "Set Sidejob", "Canny Bus Group\nSanitary Andreas (Sweeper)\nNone", "Select", "Back");
        }
        case 1: // Color
        {
            Dialog_Show(playerid, SidejobVehColor, DIALOG_STYLE_INPUT, "Edit Color", "Enter Color 1 and Color 2 (space separated, e.g. '1 1'):", "Save", "Back");
        }
        case 2: // Park Here
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
            // Re-show menu
            Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
        }
        case 3: // Spawn Point
        {
            new str[1000];
            format(str, sizeof(str), "ID\tType\tCoords\n");
            new count = 0;
            
            if(vehicleVariables[id][vVehicleSideJob] == 1) // Bus
            {
                foreach(new sj : sj_spawn)
                {
                    new temp[128];
                    format(temp, sizeof(temp), "%d\tCanny Bus Group\tX:%.1f Y:%.1f Z:%.1f\n", SidejobSpawns[sj][sjID], SidejobSpawns[sj][sjPos][0], SidejobSpawns[sj][sjPos][1], SidejobSpawns[sj][sjPos][2]);
                    strcat(str, temp);
                    count++;
                }
            }
            else if(vehicleVariables[id][vVehicleSideJob] == 2) // Sweeper (will be handled by calling external iterator/array)
            {
                // We'll declare forward function in SweeperJob.pwn
                count = SweeperJob_GetSpawnList(str, sizeof(str));
            }
            
            if(count == 0) return SendErrorMessage(playerid, "No sidejob spawn points available for this job type. Create one first using /addsidejobspawn.");
            Dialog_Show(playerid, SidejobVehSetSpawn, DIALOG_STYLE_TABLIST_HEADERS, "Select Spawn Point", str, "Select", "Back");
        }
        case 4: // Health
        {
            Dialog_Show(playerid, SidejobVehHealth, DIALOG_STYLE_INPUT, "Edit Health", "Enter health value (100-1000):", "Save", "Back");
        }
        case 5: // Plate
        {
            Dialog_Show(playerid, SidejobVehPlate, DIALOG_STYLE_INPUT, "Edit Plate", "Enter license plate (max 24 characters):", "Save", "Back");
        }
    }
    return 1;
}

Dialog:SidejobVehSetJob(playerid, response, listitem, inputtext[])
{
    if(!response) return Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    new id = EditingSidejobVeh[playerid];
    if(id == -1) return 1;

    if(listitem == 0) // Canny Bus Group
    {
        vehicleVariables[id][vVehicleSideJob] = 1;
        SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle assigned to Canny Bus Group.");
    }
    else if(listitem == 1) // Sanitary Andreas (Sweeper)
    {
        vehicleVariables[id][vVehicleSideJob] = 2;
        SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle assigned to Sanitary Andreas (Sweeper).");
    }
    else // None
    {
        vehicleVariables[id][vVehicleSideJob] = 0;
        vehicleVariables[id][vVehicleSideJobSpawn] = -1;
        SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle removed from sidejob.");
    }
    Vehicle_Save(id);
    Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    return 1;
}

Dialog:SidejobVehColor(playerid, response, listitem, inputtext[])
{
    if(!response) return Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    new id = EditingSidejobVeh[playerid];
    if(id == -1) return 1;

    new col1, col2;
    if(sscanf(inputtext, "dd", col1, col2)) return Dialog_Show(playerid, SidejobVehColor, DIALOG_STYLE_INPUT, "Edit Color", "Invalid format.\nEnter Color 1 and Color 2 (space separated):", "Save", "Back");

    vehicleVariables[id][vVehicleColour][0] = col1;
    vehicleVariables[id][vVehicleColour][1] = col2;

    new scriptid = vehicleVariables[id][vVehicleScriptID];
    if(scriptid != INVALID_VEHICLE_ID)
    {
        ChangeVehicleColor(scriptid, col1, col2);
    }
    Vehicle_Save(id);
    SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Colors updated successfully!");
    Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    return 1;
}

Dialog:SidejobVehSetSpawn(playerid, response, listitem, inputtext[])
{
    if(!response) return Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    new id = EditingSidejobVeh[playerid];
    if(id == -1) return 1;

    new spawnid = strval(inputtext); // TABLIST ID column starts with the spawn SQL ID
    vehicleVariables[id][vVehicleSideJobSpawn] = spawnid;
    Vehicle_Save(id);

    SendClientMessageEx(playerid, COLOR_GREEN, "[SIDEJOB]: Vehicle assigned to spawn point ID: %d.", spawnid);
    Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    return 1;
}

Dialog:SidejobVehHealth(playerid, response, listitem, inputtext[])
{
    if(!response) return Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    new id = EditingSidejobVeh[playerid];
    if(id == -1) return 1;

    new Float:hp = floatstr(inputtext);
    if(hp < 100.0 || hp > 1000.0) return Dialog_Show(playerid, SidejobVehHealth, DIALOG_STYLE_INPUT, "Edit Health", "Invalid value.\nEnter health value (100-1000):", "Save", "Back");

    vehicleVariables[id][vVehicleHealth] = hp;
    new scriptid = vehicleVariables[id][vVehicleScriptID];
    if(scriptid != INVALID_VEHICLE_ID)
    {
        SetVehicleHealth(scriptid, hp);
    }
    Vehicle_Save(id);
    SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Health updated successfully!");
    Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    return 1;
}

Dialog:SidejobVehPlate(playerid, response, listitem, inputtext[])
{
    if(!response) return Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    new id = EditingSidejobVeh[playerid];
    if(id == -1) return 1;

    if(strlen(inputtext) < 1 || strlen(inputtext) > 23) return Dialog_Show(playerid, SidejobVehPlate, DIALOG_STYLE_INPUT, "Edit Plate", "Invalid size.\nEnter license plate (max 24 characters):", "Save", "Back");

    format(vehicleVariables[id][vVehiclePlate], 24, "%s", inputtext);
    new scriptid = vehicleVariables[id][vVehicleScriptID];
    if(scriptid != INVALID_VEHICLE_ID)
    {
        SetVehicleNumberPlate(scriptid, inputtext);
    }
    Vehicle_Save(id);
    SendClientMessage(playerid, COLOR_GREEN, "[SIDEJOB]: Plate updated successfully!");
    Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    return 1;
}

// Commands: sidejob creation and management

CMD:addsidejobspawn(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    Dialog_Show(playerid, CreateSidejobSpawn, DIALOG_STYLE_LIST, "Create Sidejob Spawn", "Canny Bus Group\nSanitary Andreas (Sweeper)", "Create", "Cancel");
    return 1;
}

CMD:editsidejobveh(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    new vehicleid = GetPlayerVehicleID(playerid);
    if(vehicleid == 0) return SendErrorMessage(playerid, "You must be inside the saved server vehicle to edit it.");

    new id = GetVehicleServerID(vehicleid);
    if(id == -1) return SendErrorMessage(playerid, "This vehicle is not a saved server vehicle (Permanent vehicle). Use /saveveh first.");

    EditingSidejobVeh[playerid] = id;
    Dialog_Show(playerid, EditSidejobVehMenu, DIALOG_STYLE_LIST, "Edit Sidejob Vehicle", "1. Set Sidejob\n2. Color\n3. Park Here\n4. Spawn Point\n5. Health\n6. Plate", "Select", "Close");
    return 1;
}

// Subcommands for /busroute and /busjobroute
CMD:busroute(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    new cmd[32], options[128];
    if(sscanf(params, "s[32]S()[128]", cmd, options))
    {
        SendSyntaxMessage(playerid, "/busroute [create/cp/cpstop/finish/delete]");
        return 1;
    }

    if(!strcmp(cmd, "create", true))
    {
        new plate[24], salary;
        if(sscanf(options, "s[24]d", plate, salary))
        {
            SendSyntaxMessage(playerid, "/busroute create [PLATE] [SALARY]");
            return 1;
        }

        if(!IsPlayerInAnyVehicle(playerid))
        {
            return SendErrorMessage(playerid, "You must be in a vehicle to create checkpoints.");
        }

        format(CreatingRoutePlate[playerid], 24, "%s", plate);
        CreatingRouteSalary[playerid] = salary;
        CreatingRouteCheckpointsCount[playerid] = 0;
        CreatingRouteRouteID[playerid] = 0; // mark active session

        SendClientMessageEx(playerid, COLOR_YELLOW, "[BUSJOB]: Started route creation for plate: %s with salary: $%d.", plate, salary);
        SendClientMessage(playerid, COLOR_YELLOW, "[BUSJOB]: Use /busroute cp or /busroute cpstop to add checkpoints. Use /busroute finish when done.");
        return 1;
    }
    else if(!strcmp(cmd, "cp", true))
    {
        if(CreatingRouteRouteID[playerid] == -1)
            return SendErrorMessage(playerid, "You don't have an active route creation session. Use /busroute create first.");

        if(!IsPlayerInAnyVehicle(playerid))
            return SendErrorMessage(playerid, "You must be in a vehicle to add a checkpoint.");

        new count = CreatingRouteCheckpointsCount[playerid];
        if(count >= MAX_ROUTE_CHECKPOINTS)
            return SendErrorMessage(playerid, "Maximum checkpoints reached.");

        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);
        CreatingRouteCPs[playerid][count][0] = x;
        CreatingRouteCPs[playerid][count][1] = y;
        CreatingRouteCPs[playerid][count][2] = z;
        CreatingRouteCPTypes[playerid][count] = 0; // Normal CP

        CreatingRouteCheckpointsCount[playerid]++;
        SendClientMessageEx(playerid, COLOR_GREEN, "[BUSJOB]: Normal Checkpoint %d added at current position.", count + 1);
        return 1;
    }
    else if(!strcmp(cmd, "cpstop", true))
    {
        if(CreatingRouteRouteID[playerid] == -1)
            return SendErrorMessage(playerid, "You don't have an active route creation session. Use /busroute create first.");

        if(!IsPlayerInAnyVehicle(playerid))
            return SendErrorMessage(playerid, "You must be in a vehicle to add a checkpoint.");

        new count = CreatingRouteCheckpointsCount[playerid];
        if(count >= MAX_ROUTE_CHECKPOINTS)
            return SendErrorMessage(playerid, "Maximum checkpoints reached.");

        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);
        CreatingRouteCPs[playerid][count][0] = x;
        CreatingRouteCPs[playerid][count][1] = y;
        CreatingRouteCPs[playerid][count][2] = z;
        CreatingRouteCPTypes[playerid][count] = 1; // Bus Stop CP

        CreatingRouteCheckpointsCount[playerid]++;
        SendClientMessageEx(playerid, COLOR_GREEN, "[BUSJOB]: Bus Stop Checkpoint (30s) %d added at current position.", count + 1);
        return 1;
    }
    else if(!strcmp(cmd, "finish", true))
    {
        if(CreatingRouteRouteID[playerid] == -1)
            return SendErrorMessage(playerid, "You don't have an active route creation session. Use /busroute create first.");

        new count = CreatingRouteCheckpointsCount[playerid];
        if(count < 1)
            return SendErrorMessage(playerid, "You must add at least one checkpoint before finishing.");

        if(!IsPlayerInAnyVehicle(playerid))
            return SendErrorMessage(playerid, "You must be in a vehicle to place the finish checkpoint.");

        // Add final checkpoint
        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);
        CreatingRouteCPs[playerid][count][0] = x;
        CreatingRouteCPs[playerid][count][1] = y;
        CreatingRouteCPs[playerid][count][2] = z;
        CreatingRouteCPTypes[playerid][count] = 2; // Finish CP
        CreatingRouteCheckpointsCount[playerid]++;
        count++;

        // Despawn the vehicle the admin is in
        new vehicleid = GetPlayerVehicleID(playerid);
        new id = GetVehicleServerID(vehicleid);
        if(id != -1)
        {
            DestroyVehicle(vehicleid);
            vehicleVariables[id][vVehicleScriptID] = INVALID_VEHICLE_ID;
            Iter_Remove(sv_vehicles, vehicleid);
        }

        // Save route to database
        new q[256];
        mysql_format(dbCon, q, sizeof(q), "SELECT `id` FROM `bus_routes` WHERE `vehiclePlate` = '%e' LIMIT 1", CreatingRoutePlate[playerid]);
        mysql_tquery(dbCon, q, "BusJob_OnRouteSaved", "dd", playerid, count);

        return 1;
    }
    else if(!strcmp(cmd, "delete", true))
    {
        new plate[24];
        if(sscanf(options, "s[24]", plate))
        {
            SendSyntaxMessage(playerid, "/busroute delete [PLATE]");
            return 1;
        }

        new q[256];
        mysql_format(dbCon, q, sizeof(q), "DELETE FROM `bus_routes` WHERE `vehiclePlate` = '%e'", plate);
        mysql_tquery(dbCon, q, "BusJob_OnRouteDeleted", "ds", playerid, plate);
        return 1;
    }
    else
    {
        SendSyntaxMessage(playerid, "/busroute [create/cp/cpstop/finish/delete]");
    }
    return 1;
}

YCMD:busjobroute(playerid, params[], help) = busroute;

forward BusJob_OnRouteSaved(playerid, total_cps);
public BusJob_OnRouteSaved(playerid, total_cps)
{
    new route_id = 0;
    new q[256];
    
    if(cache_num_rows() > 0)
    {
        cache_get_value_name_int(0, "id", route_id);

        // Update route data
        mysql_format(dbCon, q, sizeof(q), "UPDATE `bus_routes` SET `salary` = '%d', `total_checkpoints` = '%d' WHERE `id` = '%d'", CreatingRouteSalary[playerid], total_cps, route_id);
        mysql_tquery(dbCon, q);

        // Delete old checkpoints
        mysql_format(dbCon, q, sizeof(q), "DELETE FROM `bus_checkpoints` WHERE `routeId` = '%d'", route_id);
        mysql_tquery(dbCon, q);
    }
    else
    {
        // Insert new route
        mysql_format(dbCon, q, sizeof(q), "INSERT INTO `bus_routes` (`vehiclePlate`, `salary`, `total_checkpoints`) VALUES ('%e', '%d', '%d')", CreatingRoutePlate[playerid], CreatingRouteSalary[playerid], total_cps);
        new Cache:c = mysql_query(dbCon, q);
        route_id = cache_insert_id();
        cache_delete(c);
    }

    if(route_id > 0)
    {
        // Insert checkpoints
        for(new i = 0; i < total_cps; i++)
        {
            mysql_format(dbCon, q, sizeof(q), "INSERT INTO `bus_checkpoints` (`routeId`, `step`, `posX`, `posY`, `posZ`, `type`) VALUES ('%d', '%d', '%f', '%f', '%f', '%d')",
                route_id, i, CreatingRouteCPs[playerid][i][0], CreatingRouteCPs[playerid][i][1], CreatingRouteCPs[playerid][i][2], CreatingRouteCPTypes[playerid][i]);
            mysql_tquery(dbCon, q);
        }
    }

    CreatingRouteRouteID[playerid] = -1;
    SendClientMessage(playerid, COLOR_GREEN, "[BUSJOB]: Bus route and checkpoints saved successfully!");

    // Reload routes
    mysql_tquery(dbCon, "SELECT * FROM `bus_routes` ORDER BY `id` ASC", "BusJob_LoadRoutes");
    return 1;
}

forward BusJob_OnRouteDeleted(playerid, plate[]);
public BusJob_OnRouteDeleted(playerid, plate[])
{
    SendClientMessageEx(playerid, COLOR_GREEN, "[BUSJOB]: Route deleted for plate: %s.", plate);
    // Reload routes
    mysql_tquery(dbCon, "SELECT * FROM `bus_routes` ORDER BY `id` ASC", "BusJob_LoadRoutes");
    return 1;
}

// Dialog: player spawn menu
Dialog:BusSpawnMenu(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;
    new spawn_idx = ActiveSpawningSpawnPoint[playerid];
    if(spawn_idx == -1) return 1;

    new count = 0;
    foreach(new i : sv_servercar)
    {
        if(vehicleVariables[i][vVehicleSideJob] == 1 && vehicleVariables[i][vVehicleSideJobSpawn] == SidejobSpawns[spawn_idx][sjID])
        {
            if(count == listitem)
            {
                // Check if already spawned
                if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID)
                {
                    return SendErrorMessage(playerid, "This bus is already spawned and active. Choose another one.");
                }

                // Check delay
                if(gettime() < PlayerData[playerid][pBusJobDelay])
                {
                    new remaining = PlayerData[playerid][pBusJobDelay] - gettime();
                    return SendErrorMessage(playerid, "You must wait %d minutes and %d seconds before you can do the bus job again.", remaining / 60, remaining % 60);
                }

                // Find route index
                new route_idx = -1;
                foreach(new r : bus_route)
                {
                    if(!strcmp(BusRoutes[r][brPlate], vehicleVariables[i][vVehiclePlate], true))
                    {
                        route_idx = r;
                        break;
                    }
                }

                if(route_idx == -1)
                {
                    return SendErrorMessage(playerid, "This bus does not have a route defined. Ask an Admin to set up its route.");
                }

                if(BusRoutes[route_idx][brTotalCheckpoints] < 1)
                {
                    return SendErrorMessage(playerid, "The route for this bus has 0 checkpoints.");
                }

                // Spawn vehicle at its parked position
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
                PlayerBusVehicle[playerid] = scriptid;
                PlayerBusVehicleIndex[playerid] = i;
                PlayerBusCheckpointStep[playerid] = 0;
                PlayerBusRouteIndex[playerid] = route_idx;

                if(PlayerBusAbandonTimer[playerid] != -1)
                {
                    KillTimer(PlayerBusAbandonTimer[playerid]);
                    PlayerBusAbandonTimer[playerid] = -1;
                }

                PutPlayerInVehicle(playerid, scriptid, 0);
                TogglePlayerControllable(playerid, true);

                // Show first checkpoint
                ShowPlayerBusCheckpoint(playerid);

                SendClientMessage(playerid, COLOR_GREEN, "[BUSJOB]: Bus spawned! Follow the checkpoints to complete the route.");
                return 1;
            }
            count++;
        }
    }
    return 1;
}

// Function to display the player checkpoint
stock ShowPlayerBusCheckpoint(playerid)
{
    new route_idx = PlayerBusRouteIndex[playerid];
    new step = PlayerBusCheckpointStep[playerid];
    new total = BusRoutes[route_idx][brTotalCheckpoints];

    if(step >= total) return;

    new Float:cx = RouteCheckpoints[route_idx][step][rcPos][0];
    new Float:cy = RouteCheckpoints[route_idx][step][rcPos][1];
    new Float:cz = RouteCheckpoints[route_idx][step][rcPos][2];
    new type = RouteCheckpoints[route_idx][step][rcType];

    // Checkpoint size
    new Float:size = 5.0;

    // Show checkpoint
    if(type == 2) // Finish
    {
        SetPlayerCheckpoint(playerid, cx, cy, cz, size);
        GameTextForPlayer(playerid, "~y~Finish Checkpoint", 3000, 1);
    }
    else if(type == 1) // Bus stop
    {
        SetPlayerCheckpoint(playerid, cx, cy, cz, size);
        GameTextForPlayer(playerid, "~b~Bus Stop Checkpoint", 3000, 1);
    }
    else
    {
        SetPlayerCheckpoint(playerid, cx, cy, cz, size);
    }
}

// Hook Player enter checkpoint
hook OnPlayerEnterCheckpoint(playerid)
{
    if(PlayerBusVehicle[playerid] != INVALID_VEHICLE_ID)
    {
        new vehicleid = GetPlayerVehicleID(playerid);
        if(vehicleid == PlayerBusVehicle[playerid] && GetPlayerState(playerid) == PLAYER_STATE_DRIVER)
        {
            new route_idx = PlayerBusRouteIndex[playerid];
            new step = PlayerBusCheckpointStep[playerid];
            new type = RouteCheckpoints[route_idx][step][rcType];

            if(type == 0) // Normal
            {
                PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);
                DisablePlayerCheckpoint(playerid);

                PlayerBusCheckpointStep[playerid]++;
                ShowPlayerBusCheckpoint(playerid);
            }
            else if(type == 1) // Bus Stop
            {
                // Freeze player vehicle
                TogglePlayerControllable(playerid, false);
                DisablePlayerCheckpoint(playerid);

                // Start 30 seconds countdown
                PlayerBusStopTimer[playerid] = 30;
                if(PlayerBusStopTimerID[playerid] != -1) KillTimer(PlayerBusStopTimerID[playerid]);
                PlayerBusStopTimerID[playerid] = SetTimerEx("OnPlayerBusStopCountdown", 1000, true, "d", playerid);

                PlayerPlaySound(playerid, 1058, 0.0, 0.0, 0.0);
            }
            else if(type == 2) // Finish
            {
                DisablePlayerCheckpoint(playerid);
                PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);

                new salary = BusRoutes[route_idx][brSalary];
                PlayerData[playerid][pPayCheck] += salary;

                SendClientMessageEx(playerid, COLOR_GREEN, "[BUSJOB]: Route completed! Salary $%d has been added to your paycheck.", salary);

                // Despawn bus
                new i = PlayerBusVehicleIndex[playerid];
                DestroyVehicle(vehicleVariables[i][vVehicleScriptID]);
                vehicleVariables[i][vVehicleScriptID] = INVALID_VEHICLE_ID;
                Iter_Remove(sv_vehicles, PlayerBusVehicle[playerid]);

                // Reset variables
                PlayerBusVehicle[playerid] = INVALID_VEHICLE_ID;
                PlayerBusVehicleIndex[playerid] = -1;
                PlayerBusCheckpointStep[playerid] = 0;
                PlayerBusRouteIndex[playerid] = -1;

                // Cooldown: 20 minutes
                PlayerData[playerid][pBusJobDelay] = gettime() + 1200;
            }
        }
    }
    return 1;
}

forward OnPlayerBusStopCountdown(playerid);
public OnPlayerBusStopCountdown(playerid)
{
    if(PlayerBusVehicle[playerid] == INVALID_VEHICLE_ID)
    {
        KillTimer(PlayerBusStopTimerID[playerid]);
        PlayerBusStopTimerID[playerid] = -1;
        return 1;
    }

    if(PlayerBusStopTimer[playerid] > 0)
    {
        new str[64];
        format(str, sizeof(str), "~r~Bus Stop~n~~w~Waiting... ~y~%d sec", PlayerBusStopTimer[playerid]);
        GameTextForPlayer(playerid, str, 1000, 3);
        PlayerBusStopTimer[playerid]--;
    }
    else
    {
        KillTimer(PlayerBusStopTimerID[playerid]);
        PlayerBusStopTimerID[playerid] = -1;

        TogglePlayerControllable(playerid, true);
        PlayerPlaySound(playerid, 1056, 0.0, 0.0, 0.0);

        PlayerBusCheckpointStep[playerid]++;
        ShowPlayerBusCheckpoint(playerid);
        SendClientMessage(playerid, COLOR_GREEN, "[BUSJOB]: Passengers loaded. Proceed to the next checkpoint.");
    }
    return 1;
}

// Hook disconnect
hook OnPlayerDisconnect(playerid, reason)
{
    if(PlayerBusVehicle[playerid] != INVALID_VEHICLE_ID)
    {
        new i = PlayerBusVehicleIndex[playerid];
        DestroyVehicle(vehicleVariables[i][vVehicleScriptID]);
        vehicleVariables[i][vVehicleScriptID] = INVALID_VEHICLE_ID;
        Iter_Remove(sv_vehicles, PlayerBusVehicle[playerid]);

        PlayerBusVehicle[playerid] = INVALID_VEHICLE_ID;
        PlayerBusVehicleIndex[playerid] = -1;
        PlayerBusCheckpointStep[playerid] = 0;
        PlayerBusRouteIndex[playerid] = -1;
    }

    if(PlayerBusAbandonTimer[playerid] != -1)
    {
        KillTimer(PlayerBusAbandonTimer[playerid]);
        PlayerBusAbandonTimer[playerid] = -1;
    }

    if(PlayerBusStopTimerID[playerid] != -1)
    {
        KillTimer(PlayerBusStopTimerID[playerid]);
        PlayerBusStopTimerID[playerid] = -1;
    }
    return 1;
}

// Hook vehicle death
hook OnVehicleDeath(vehicleid, killerid)
{
    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(IsPlayerConnected(i) && PlayerBusVehicle[i] == vehicleid)
        {
            SendClientMessage(i, COLOR_LIGHTRED, "[BUSJOB]: Your bus was destroyed! The sidejob is cancelled.");

            new idx = PlayerBusVehicleIndex[i];
            vehicleVariables[idx][vVehicleScriptID] = INVALID_VEHICLE_ID;
            Iter_Remove(sv_vehicles, vehicleid);

            DisablePlayerCheckpoint(i);

            PlayerBusVehicle[i] = INVALID_VEHICLE_ID;
            PlayerBusVehicleIndex[i] = -1;
            PlayerBusCheckpointStep[i] = 0;
            PlayerBusRouteIndex[i] = -1;

            if(PlayerBusAbandonTimer[i] != -1)
            {
                KillTimer(PlayerBusAbandonTimer[i]);
                PlayerBusAbandonTimer[i] = -1;
            }

            if(PlayerBusStopTimerID[i] != -1)
            {
                KillTimer(PlayerBusStopTimerID[i]);
                PlayerBusStopTimerID[i] = -1;
            }
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
        if(PlayerBusVehicle[playerid] != INVALID_VEHICLE_ID)
        {
            SendClientMessage(playerid, COLOR_YELLOW, "[BUSJOB]: You left your bus! You have 60 seconds to get back in before it despawns.");
            PlayerBusAbandonTimer[playerid] = SetTimerEx("BusJob_AbandonTimer", 60000, false, "d", playerid);
        }
    }
    else if(newstate == PLAYER_STATE_DRIVER && oldstate != PLAYER_STATE_DRIVER)
    {
        if(PlayerBusVehicle[playerid] != INVALID_VEHICLE_ID && GetPlayerVehicleID(playerid) == PlayerBusVehicle[playerid])
        {
            if(PlayerBusAbandonTimer[playerid] != -1)
            {
                KillTimer(PlayerBusAbandonTimer[playerid]);
                PlayerBusAbandonTimer[playerid] = -1;
                SendClientMessage(playerid, COLOR_GREEN, "[BUSJOB]: You returned to your bus. Continue driving.");
            }
        }
    }
    return 1;
}

forward BusJob_AbandonTimer(playerid);
public BusJob_AbandonTimer(playerid)
{
    PlayerBusAbandonTimer[playerid] = -1;
    if(PlayerBusVehicle[playerid] != INVALID_VEHICLE_ID)
    {
        SendClientMessage(playerid, COLOR_LIGHTRED, "[BUSJOB]: You failed to return to your bus within 60 seconds. The job has been cancelled.");

        new i = PlayerBusVehicleIndex[playerid];
        DestroyVehicle(vehicleVariables[i][vVehicleScriptID]);
        vehicleVariables[i][vVehicleScriptID] = INVALID_VEHICLE_ID;
        Iter_Remove(sv_vehicles, PlayerBusVehicle[playerid]);

        DisablePlayerCheckpoint(playerid);

        PlayerBusVehicle[playerid] = INVALID_VEHICLE_ID;
        PlayerBusVehicleIndex[playerid] = -1;
        PlayerBusCheckpointStep[playerid] = 0;
        PlayerBusRouteIndex[playerid] = -1;

        if(PlayerBusStopTimerID[playerid] != -1)
        {
            KillTimer(PlayerBusStopTimerID[playerid]);
            PlayerBusStopTimerID[playerid] = -1;
        }
    }
    return 1;
}

forward SweeperJob_OnSpawnCommand(playerid);

// Commands: Player
CMD:spawn(playerid, params[])
{
    new spawn_idx = GetNearestSidejobSpawn(playerid, 3.0);
    if(spawn_idx == -1)
    {
        return SweeperJob_OnSpawnCommand(playerid);
    }

    if(SidejobSpawns[spawn_idx][sjType] == 1) // Canny Bus Group
    {
        new str[1000];
        format(str, sizeof(str), "Plate\tSalary\tStatus\n");

        new count = 0;
        foreach(new i : sv_servercar)
        {
            if(vehicleVariables[i][vVehicleSideJob] == 1 && vehicleVariables[i][vVehicleSideJobSpawn] == SidejobSpawns[spawn_idx][sjID])
            {
                // Find salary
                new salary = 0;
                foreach(new r : bus_route)
                {
                    if(!strcmp(BusRoutes[r][brPlate], vehicleVariables[i][vVehiclePlate], true))
                    {
                        salary = BusRoutes[r][brSalary];
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
            return SendErrorMessage(playerid, "No buses are assigned to this spawn point yet.");
        }

        ActiveSpawningSpawnPoint[playerid] = spawn_idx;
        Dialog_Show(playerid, BusSpawnMenu, DIALOG_STYLE_TABLIST_HEADERS, "Canny Bus Group - Spawn Bus", str, "Spawn", "Close");
    }
    return 1;
}

CMD:delays(playerid, params[])
{
    new str[512];
    format(str, sizeof(str), "Delay List:\n\n");

    new bus_delay = PlayerData[playerid][pBusJobDelay] - gettime();
    if(bus_delay > 0)
    {
        new temp[128];
        format(temp, sizeof(temp), "{FFFFFF}Bus Driver Job: {FF0000}%d min %d sec left\n", bus_delay / 60, bus_delay % 60);
        strcat(str, temp);
    }
    else
    {
        strcat(str, "{FFFFFF}Bus Driver Job: {00FF00}Available\n");
    }

    new sweeper_delay = PlayerData[playerid][pSweeperJobDelay] - gettime();
    if(sweeper_delay > 0)
    {
        new temp[128];
        format(temp, sizeof(temp), "{FFFFFF}Sweeper Job: {FF0000}%d min %d sec left\n", sweeper_delay / 60, sweeper_delay % 60);
        strcat(str, temp);
    }
    else
    {
        strcat(str, "{FFFFFF}Sweeper Job: {00FF00}Available\n");
    }

    Dialog_Show(playerid, None, DIALOG_STYLE_MSGBOX, "My Cooldowns & Delays", str, "Close", "");
    return 1;
}
