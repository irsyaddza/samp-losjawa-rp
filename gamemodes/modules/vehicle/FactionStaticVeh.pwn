/*
 * FactionStaticVeh.pwn — Faction Static Vehicles on Demand
 * Allows admins to configure static faction vehicle attributes and lets
 * faction members spawn/despawn them on demand from spawn pickups.
 */

#include <YSI_Coding/y_hooks>

#define MAX_STATIC_SPAWNS 20

enum E_STATIC_SPAWN {
    ssID,
    ssFaction,
    Float:ssX,
    Float:ssY,
    Float:ssZ,
    ssWorld,
    ssInterior,
    ssPickup,
    Text3D:ssLabel
};

new StaticSpawns[MAX_STATIC_SPAWNS][E_STATIC_SPAWN];

// ── Initialization ───────────────────────────────────────────────────
stock FactionStaticVeh_Init()
{
    // Ensure all custom columns exist in `vehicles` table
    mysql_tquery(dbCon, "ALTER TABLE `vehicles` ADD COLUMN `vehiclePaintjob` INT NOT NULL DEFAULT '-1'", "", "");
    mysql_tquery(dbCon, "ALTER TABLE `vehicles` ADD COLUMN `vehicleModWheels` INT NOT NULL DEFAULT '0'", "", "");
    mysql_tquery(dbCon, "ALTER TABLE `vehicles` ADD COLUMN `vehicleModNitro` INT NOT NULL DEFAULT '0'", "", "");
    mysql_tquery(dbCon, "ALTER TABLE `vehicles` ADD COLUMN `vehicleHealth` FLOAT NOT NULL DEFAULT '1000.0'", "", "");
    mysql_tquery(dbCon, "ALTER TABLE `vehicles` ADD COLUMN `vehicleStaticSpawn` INT NOT NULL DEFAULT '0'", "", "");

    // Create the faction static spawns table
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `faction_static_spawns` (`id` INT AUTO_INCREMENT PRIMARY KEY, `factionId` INT NOT NULL, `posX` FLOAT NOT NULL, `posY` FLOAT NOT NULL, `posZ` FLOAT NOT NULL)", "OnFactionStaticSpawnsTableCheck", "");
    // Migrate: add world & interior columns if not exist (errors silently ignored)
    mysql_tquery(dbCon, "ALTER TABLE `faction_static_spawns` ADD COLUMN `posWorld` INT NOT NULL DEFAULT '0'", "", "");
    mysql_tquery(dbCon, "ALTER TABLE `faction_static_spawns` ADD COLUMN `posInterior` INT NOT NULL DEFAULT '-1'", "", "");
    return 1;
}

forward OnFactionStaticSpawnsTableCheck();
public OnFactionStaticSpawnsTableCheck()
{
    mysql_tquery(dbCon, "SELECT `id`, `factionId`, `posX`, `posY`, `posZ`, `posWorld`, `posInterior` FROM `faction_static_spawns` LIMIT 20", "FactionStaticSpawns_Load", "");
    return 1;
}

forward FactionStaticSpawns_Load();
public FactionStaticSpawns_Load()
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_STATIC_SPAWNS; i++)
    {
        cache_get_value_name_int(i, "id", StaticSpawns[i][ssID]);
        cache_get_value_name_int(i, "factionId", StaticSpawns[i][ssFaction]);
        cache_get_value_name_float(i, "posX", StaticSpawns[i][ssX]);
        cache_get_value_name_float(i, "posY", StaticSpawns[i][ssY]);
        cache_get_value_name_float(i, "posZ", StaticSpawns[i][ssZ]);
        cache_get_value_name_int(i, "posWorld", StaticSpawns[i][ssWorld]);
        cache_get_value_name_int(i, "posInterior", StaticSpawns[i][ssInterior]);

        StaticSpawns[i][ssPickup] = CreateDynamicPickup(1239, 23, StaticSpawns[i][ssX], StaticSpawns[i][ssY], StaticSpawns[i][ssZ], StaticSpawns[i][ssWorld], StaticSpawns[i][ssInterior]);
        
        new labelStr[256];
        format(labelStr, sizeof(labelStr), "[%s's Vehicles]\n{FFFFFF}Use {FFFF00}/spawnstatic {FFFFFF}to spawn\nUse {FFFF00}/despawnstatic {FFFFFF}to despawn", FactionData[StaticSpawns[i][ssFaction]][factionName]);
        StaticSpawns[i][ssLabel] = CreateDynamic3DTextLabel(labelStr, 0xFFFFFFFF, StaticSpawns[i][ssX], StaticSpawns[i][ssY], StaticSpawns[i][ssZ] + 0.5, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, StaticSpawns[i][ssWorld], StaticSpawns[i][ssInterior]);
    }
    printf("[Faction Static Spawns]: Loaded %d spawns from database.", rows);
    return 1;
}

// ── Admin Command: /addstaticspawn ──────────────────────────────────
CMD:addstaticspawn(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    new str[1024], count;
    str[0] = EOS;

    for(new i = 0; i < MAX_FACTIONS; i++)
    {
        if(FactionData[i][factionExists])
        {
            format(str, sizeof(str), "%s[%d] %s\n", str, i, FactionData[i][factionName]);
            count++;
        }
    }

    if(!count)
        return SendErrorMessage(playerid, "No factions exist to bind the static spawn to.");

    Dialog_Show(playerid, AddStaticSpawnFac, DIALOG_STYLE_LIST, "Select Faction for Static Spawn", str, "Select", "Cancel");
    return 1;
}

Dialog:AddStaticSpawnFac(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    // Cari faction ID ke-N dari daftar faction yang exist (sesuai urutan listitem)
    new facId = -1, count = -1;
    for(new i = 0; i < MAX_FACTIONS; i++)
    {
        if(FactionData[i][factionExists])
        {
            count++;
            if(count == listitem)
            {
                facId = i;
                break;
            }
        }
    }

    if(facId == -1)
        return SendErrorMessage(playerid, "Invalid faction selected.");

    new slot = -1;
    for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
    {
        if(StaticSpawns[i][ssID] == 0)
        {
            slot = i;
            break;
        }
    }
    if(slot == -1)
        return SendErrorMessage(playerid, "Maximum static spawn spots reached.");

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    new world = GetPlayerVirtualWorld(playerid);
    new interior = GetPlayerInterior(playerid);

    new query[256];
    mysql_format(dbCon, query, sizeof(query), "INSERT INTO `faction_static_spawns` (`factionId`, `posX`, `posY`, `posZ`, `posWorld`, `posInterior`) VALUES (%d, %f, %f, %f, %d, %d)", facId, x, y, z, world, interior);
    mysql_tquery(dbCon, query, "OnFactionStaticSpawnCreated", "dddfffdd", playerid, slot, facId, x, y, z, world, interior);
    return 1;
}

forward OnFactionStaticSpawnCreated(playerid, slot, facId, Float:x, Float:y, Float:z, world, interior);
public OnFactionStaticSpawnCreated(playerid, slot, facId, Float:x, Float:y, Float:z, world, interior)
{
    new insertid = cache_insert_id();
    StaticSpawns[slot][ssID] = insertid;
    StaticSpawns[slot][ssFaction] = facId;
    StaticSpawns[slot][ssX] = x;
    StaticSpawns[slot][ssY] = y;
    StaticSpawns[slot][ssZ] = z;
    StaticSpawns[slot][ssWorld] = world;
    StaticSpawns[slot][ssInterior] = interior;

    StaticSpawns[slot][ssPickup] = CreateDynamicPickup(1239, 23, x, y, z, world, interior);
    
    new labelStr[256];
    format(labelStr, sizeof(labelStr), "[%s's Vehicles]\n{FFFFFF}Use {FFFF00}/spawnstatic {FFFFFF}to spawn\nUse {FFFF00}/despawnstatic {FFFFFF}to despawn", FactionData[facId][factionName]);
    StaticSpawns[slot][ssLabel] = CreateDynamic3DTextLabel(labelStr, 0xFFFFFFFF, x, y, z + 0.5, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, world, interior);

    SendClientMessageEx(playerid, COLOR_GREEN, "Static spawn point for %s created successfully (ID: %d).", FactionData[facId][factionName], insertid);
    return 1;
}

// ── Admin Command: /editveh ─────────────────────────────────────────
// Overwriting the existing /editveh with a GUI Dialog-based editor.
// We must place this in a way that avoids duplicate definition if AdminCommands.pwn has CMD:editveh.
// Since Pawn compiles sequentially, we can rename the one in AdminCommands.pwn or replace it.
// To do this safely, we will replace CMD:editveh in AdminCommands.pwn or define it here.
// Let's first make sure we can handle the dialog events.

Dialog:EditStaticVehMain(playerid, response, listitem, inputtext[])
{
    if(!response)
    {
        DeletePVar(playerid, "EditingStaticVehIndex");
        return 1;
    }

    new id = GetPVarInt(playerid, "EditingStaticVehIndex");

    switch(listitem)
    {
        case 0: // Set Faction
        {
            new str[1024];
            str[0] = EOS;
            format(str, sizeof(str), "-1 - None/No Faction\n");
            for(new i = 0; i < MAX_FACTIONS; i++)
            {
                if(FactionData[i][factionExists])
                {
                    format(str, sizeof(str), "%s%d - %s\n", str, i, FactionData[i][factionName]);
                }
            }
            Dialog_Show(playerid, EditStaticVehFaction, DIALOG_STYLE_LIST, "Select Faction", str, "Select", "Back");
        }
        case 1: // Color
        {
            Dialog_Show(playerid, EditStaticVehColor, DIALOG_STYLE_INPUT, "Edit Vehicle Color", "Enter Primary and Secondary Color IDs (e.g. 0 1):", "Save", "Back");
        }
        case 2: // Plate
        {
            Dialog_Show(playerid, EditStaticVehPlate, DIALOG_STYLE_INPUT, "Edit Vehicle Plate", "Enter license plate text (max 24 chars):", "Save", "Back");
        }
        case 3: // Siren
        {
            Dialog_Show(playerid, EditStaticVehSiren, DIALOG_STYLE_LIST, "Toggle Siren", "No\nYes", "Select", "Back");
        }
        case 4: // Paintjob
        {
            Dialog_Show(playerid, EditStaticVehPaintjob, DIALOG_STYLE_LIST, "Set Paintjob", "None (Remove)\nPaintjob 0\nPaintjob 1\nPaintjob 2\nPaintjob 3", "Select", "Back");
        }
        case 5: // Mods
        {
            Dialog_Show(playerid, EditStaticVehMods, DIALOG_STYLE_LIST, "Vehicle Mods", "Wheels\nNitro", "Select", "Back");
        }
        case 6: // Health
        {
            Dialog_Show(playerid, EditStaticVehHealth, DIALOG_STYLE_INPUT, "Set Vehicle Health", "Enter health value (1000 - 10000):", "Save", "Back");
        }
        case 7: // Park
        {
            new vehicleid = GetPlayerVehicleID(playerid);
            if(vehicleid != vehicleVariables[id][vVehicleScriptID] && vehicleVariables[id][vVehicleScriptID] != INVALID_VEHICLE_ID)
                return SendErrorMessage(playerid, "You must be inside this specific vehicle to park it.");

            new Float:vx, Float:vy, Float:vz, Float:va;
            if(IsPlayerInAnyVehicle(playerid))
            {
                GetVehiclePos(vehicleid, vx, vy, vz);
                GetVehicleZAngle(vehicleid, va);
            }
            else
            {
                GetPlayerPos(playerid, vx, vy, vz);
                GetPlayerFacingAngle(playerid, va);
            }

            vehicleVariables[id][vVehiclePosition][0] = vx;
            vehicleVariables[id][vVehiclePosition][1] = vy;
            vehicleVariables[id][vVehiclePosition][2] = vz;
            vehicleVariables[id][vVehicleRotation] = va;

            Vehicle_Save(id);
            SendClientMessage(playerid, COLOR_GREEN, "Vehicle spawn position has been saved to this spot.");
            
            // Re-show main dialog
            ShowEditStaticVehMain(playerid, id);
        }
        case 8: // Spawn Point Selection
        {
            if(vehicleVariables[id][vVehicleFaction] == -1)
            {
                SendErrorMessage(playerid, "You must set the vehicle's faction first before assigning a spawn point.");
                return ShowEditStaticVehMain(playerid, id);
            }

            new str[1024];
            str[0] = EOS;
            format(str, sizeof(str), "0 - None/Unassigned\n");
            for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
            {
                if(StaticSpawns[i][ssID] != 0 && StaticSpawns[i][ssFaction] == vehicleVariables[id][vVehicleFaction])
                {
                    format(str, sizeof(str), "%s%d - Spawn Point ID: %d\n", str, StaticSpawns[i][ssID], StaticSpawns[i][ssID]);
                }
            }
            Dialog_Show(playerid, EditStaticVehSpawnPoint, DIALOG_STYLE_LIST, "Select Spawn Point", str, "Select", "Back");
        }
    }
    return 1;
}

stock ShowEditStaticVehMain(playerid, id)
{
    new title[64], str[512];
    format(title, sizeof(title), "Edit Static Vehicle (ID: %d)", vehicleVariables[id][vVehicleID]);
    
    new facName[32];
    if(vehicleVariables[id][vVehicleFaction] == -1) format(facName, 32, "None");
    else format(facName, 32, "%s", FactionData[vehicleVariables[id][vVehicleFaction]][factionName]);

    new plateStr[32];
    if(!vehicleVariables[id][vVehiclePlate][0]) format(plateStr, sizeof(plateStr), "None");
    else format(plateStr, sizeof(plateStr), "%s", vehicleVariables[id][vVehiclePlate]);

    new spawnPointStr[32];
    if(vehicleVariables[id][vVehicleStaticSpawn] == 0) format(spawnPointStr, sizeof(spawnPointStr), "None");
    else format(spawnPointStr, sizeof(spawnPointStr), "ID: %d", vehicleVariables[id][vVehicleStaticSpawn]);

    format(str, sizeof(str), "1. Set Faction (%s)\n2. Color (%d, %d)\n3. Plate (%s)\n4. Siren (%s)\n5. Paintjob (%d)\n6. Mods (Wheels/Nitro)\n7. Health (%.1f)\n8. Park Here\n9. Spawn Point (%s)",
        facName,
        vehicleVariables[id][vVehicleColour][0],
        vehicleVariables[id][vVehicleColour][1],
        plateStr,
        vehicleVariables[id][vVehicleSiren] ? "Yes" : "No",
        vehicleVariables[id][vVehiclePaintjob],
        vehicleVariables[id][vVehicleHealth],
        spawnPointStr);
        
    SetPVarInt(playerid, "EditingStaticVehIndex", id);
    Dialog_Show(playerid, EditStaticVehMain, DIALOG_STYLE_LIST, title, str, "Select", "Close");
    return 1;
}

Dialog:EditStaticVehSpawnPoint(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    new spawnId = 0;
    if(sscanf(inputtext, "d", spawnId))
    {
        SendErrorMessage(playerid, "Failed to parse Spawn Point ID.");
        return ShowEditStaticVehMain(playerid, id);
    }

    vehicleVariables[id][vVehicleStaticSpawn] = spawnId;
    Vehicle_Save(id);

    if(spawnId == 0)
        SendClientMessage(playerid, COLOR_GREEN, "Vehicle unassigned from specific static spawn point.");
    else
        SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle assigned to static spawn point ID: %d.", spawnId);

    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehFaction(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    new facId = -1;
    if(sscanf(inputtext, "d", facId))
    {
        SendErrorMessage(playerid, "Failed to parse Faction ID.");
        return ShowEditStaticVehMain(playerid, id);
    }

    vehicleVariables[id][vVehicleFaction] = facId;
    Vehicle_Save(id);

    new facName[32];
    if(facId == -1) format(facName, sizeof(facName), "None");
    else format(facName, sizeof(facName), "%s", FactionData[facId][factionName]);

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle faction set to: %s", facName);
    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehColor(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    new col1, col2;
    if(sscanf(inputtext, "dd", col1, col2))
        return Dialog_Show(playerid, EditStaticVehColor, DIALOG_STYLE_INPUT, "Edit Vehicle Color", "Enter Primary and Secondary Color IDs (e.g. 0 1):\n{FF0000}Invalid input format!", "Save", "Back");

    vehicleVariables[id][vVehicleColour][0] = col1;
    vehicleVariables[id][vVehicleColour][1] = col2;
    Vehicle_Save(id);

    new vehicleid = vehicleVariables[id][vVehicleScriptID];
    if(vehicleid != INVALID_VEHICLE_ID)
    {
        ChangeVehicleColor(vehicleid, col1, col2);
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle colors updated to %d and %d.", col1, col2);
    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehPlate(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    if(strlen(inputtext) > 24)
        return Dialog_Show(playerid, EditStaticVehPlate, DIALOG_STYLE_INPUT, "Edit Vehicle Plate", "Enter license plate text (max 24 chars):\n{FF0000}Text too long!", "Save", "Back");

    format(vehicleVariables[id][vVehiclePlate], 24, "%s", inputtext);
    Vehicle_Save(id);

    new vehicleid = vehicleVariables[id][vVehicleScriptID];
    if(vehicleid != INVALID_VEHICLE_ID)
    {
        SetVehicleNumberPlate(vehicleid, vehicleVariables[id][vVehiclePlate]);
        SetVehicleToRespawn(vehicleid);
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle license plate updated to: %s", inputtext);
    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehSiren(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    vehicleVariables[id][vVehicleSiren] = listitem;
    Vehicle_Save(id);

    new vehicleid = vehicleVariables[id][vVehicleScriptID];
    if(vehicleid != INVALID_VEHICLE_ID)
    {
        // Re-create vehicle to apply siren changes instantly
        DestroyVehicle(vehicleid);
        Iter_Remove(sv_vehicles, vehicleid);

        vehicleVariables[id][vVehicleScriptID] = CreateVehicle(vehicleVariables[id][vVehicleModelID], vehicleVariables[id][vVehiclePosition][0], vehicleVariables[id][vVehiclePosition][1], vehicleVariables[id][vVehiclePosition][2], vehicleVariables[id][vVehicleRotation], vehicleVariables[id][vVehicleColour][0], vehicleVariables[id][vVehicleColour][1], 60000, vehicleVariables[id][vVehicleSiren]);
        Iter_Add(sv_vehicles, vehicleVariables[id][vVehicleScriptID]);
        ResetVehicle(vehicleVariables[id][vVehicleScriptID]);
        SetVehicleNumberPlate(vehicleVariables[id][vVehicleScriptID], vehicleVariables[id][vVehiclePlate]);
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle siren set to: %s", listitem ? "Yes" : "No");
    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehPaintjob(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    new paintjob = listitem - 1; // listitem 0 is None (-1)
    vehicleVariables[id][vVehiclePaintjob] = paintjob;
    Vehicle_Save(id);

    new vehicleid = vehicleVariables[id][vVehicleScriptID];
    if(vehicleid != INVALID_VEHICLE_ID)
    {
        if(paintjob == -1)
        {
            // Remove paintjob
            ChangeVehiclePaintjob(vehicleid, 3); 
        }
        else
        {
            ChangeVehiclePaintjob(vehicleid, paintjob);
        }
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle paintjob set to: %d", paintjob);
    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehMods(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    if(listitem == 0) // Wheels
    {
        Dialog_Show(playerid, EditStaticVehWheels, DIALOG_STYLE_LIST, "Select Wheels", "None (Remove)\nShadow (1073)\n5-Spoke (1074)\nClassic (1075)\nCutter (1076)\nSwitch (1077)\nGrove (1078)\nImport (1079)\nBeast (1080)\nRadial (1081)\nDollar (1082)\nMega (1083)\nRimshine (1084)\nWires (1085)\nAccess (1096)\nVirtual (1097)\nMorrison (1098)", "Select", "Back");
    }
    else if(listitem == 1) // Nitro
    {
        Dialog_Show(playerid, EditStaticVehNitro, DIALOG_STYLE_LIST, "Select Nitro", "None\n2x (1009)\n5x (1008)\n10x (1010)", "Select", "Back");
    }
    return 1;
}

Dialog:EditStaticVehWheels(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    new wheelid = 0;
    switch(listitem)
    {
        case 1: wheelid = 1073;
        case 2: wheelid = 1074;
        case 3: wheelid = 1075;
        case 4: wheelid = 1076;
        case 5: wheelid = 1077;
        case 6: wheelid = 1078;
        case 7: wheelid = 1079;
        case 8: wheelid = 1080;
        case 9: wheelid = 1081;
        case 10: wheelid = 1082;
        case 11: wheelid = 1083;
        case 12: wheelid = 1084;
        case 13: wheelid = 1085;
        case 14: wheelid = 1096;
        case 15: wheelid = 1097;
        case 16: wheelid = 1098;
    }

    vehicleVariables[id][vVehicleModWheels] = wheelid;
    Vehicle_Save(id);

    new vehicleid = vehicleVariables[id][vVehicleScriptID];
    if(vehicleid != INVALID_VEHICLE_ID)
    {
        if(wheelid == 0)
        {
            SetVehicleToRespawn(vehicleid); // Respawn to remove wheel mod
        }
        else
        {
            AddVehicleComponent(vehicleid, wheelid);
        }
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle wheels updated successfully.");
    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehNitro(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    new nitroid = 0;
    switch(listitem)
    {
        case 1: nitroid = 1009;
        case 2: nitroid = 1008;
        case 3: nitroid = 1010;
    }

    vehicleVariables[id][vVehicleModNitro] = nitroid;
    Vehicle_Save(id);

    new vehicleid = vehicleVariables[id][vVehicleScriptID];
    if(vehicleid != INVALID_VEHICLE_ID)
    {
        if(nitroid == 0)
        {
            SetVehicleToRespawn(vehicleid);
        }
        else
        {
            AddVehicleComponent(vehicleid, nitroid);
        }
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle Nitro updated successfully.");
    return ShowEditStaticVehMain(playerid, id);
}

Dialog:EditStaticVehHealth(playerid, response, listitem, inputtext[])
{
    new id = GetPVarInt(playerid, "EditingStaticVehIndex");
    if(!response) return ShowEditStaticVehMain(playerid, id);

    new Float:health;
    if(sscanf(inputtext, "f", health) || health < 1000.0 || health > 10000.0)
        return Dialog_Show(playerid, EditStaticVehHealth, DIALOG_STYLE_INPUT, "Set Vehicle Health", "Enter health value (1000 - 10000):\n{FF0000}Invalid health value! Must be between 1000 and 10000.", "Save", "Back");

    vehicleVariables[id][vVehicleHealth] = health;
    Vehicle_Save(id);

    new vehicleid = vehicleVariables[id][vVehicleScriptID];
    if(vehicleid != INVALID_VEHICLE_ID)
    {
        SetVehicleHealth(vehicleid, health);
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle health set to: %.1f", health);
    return ShowEditStaticVehMain(playerid, id);
}

// ── Player Commands: /spawnstatic & /despawnstatic ──────────────────
CMD:spawnstatic(playerid, params[])
{
    new slot = -1;
    for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
    {
        if(StaticSpawns[i][ssID] != 0 && IsPlayerInRangeOfPoint(playerid, 3.0, StaticSpawns[i][ssX], StaticSpawns[i][ssY], StaticSpawns[i][ssZ]))
        {
            slot = i;
            break;
        }
    }

    if(slot == -1)
        return SendErrorMessage(playerid, "You are not standing near a static vehicle spawn point.");

    new factionid = StaticSpawns[slot][ssFaction];
    new spawnPointId = StaticSpawns[slot][ssID];
    if(PlayerData[playerid][pFaction] != factionid)
        return SendErrorMessage(playerid, "You do not belong to the faction associated with this spawn point.");

    // List all vehicles assigned to this faction and this specific spawn point
    new listStr[2048];
    format(listStr, sizeof(listStr), "Plate\tStatus\n");
    for(new i = 0; i < MAX_DYNAMIC_VEHICLES; i++)
    {
        if(Iter_Contains(sv_servercar, i) && vehicleVariables[i][vVehicleFaction] == factionid && vehicleVariables[i][vVehicleStaticSpawn] == spawnPointId)
        {
            new plate[32], status[16];
            if(!vehicleVariables[i][vVehiclePlate][0]) format(plate, sizeof(plate), "Static ID %d", vehicleVariables[i][vVehicleID]);
            else format(plate, sizeof(plate), "%s", vehicleVariables[i][vVehiclePlate]);

            if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID)
                format(status, sizeof(status), "{00FF00}Spawned");
            else
                format(status, sizeof(status), "{FF0000}Despawned");

            format(listStr, sizeof(listStr), "%s%s\t%s\n", listStr, plate, status);
        }
    }

    SetPVarInt(playerid, "StaticSpawnFactionID", factionid);
    SetPVarInt(playerid, "StaticSpawnPointID", spawnPointId);
    Dialog_Show(playerid, SpawnStaticVehSelect, DIALOG_STYLE_TABLIST_HEADERS, "Spawn Faction Vehicle", listStr, "Spawn", "Close");
    return 1;
}

Dialog:SpawnStaticVehSelect(playerid, response, listitem, inputtext[])
{
    if(!response)
    {
        DeletePVar(playerid, "StaticSpawnFactionID");
        DeletePVar(playerid, "StaticSpawnPointID");
        return 1;
    }

    new factionid = GetPVarInt(playerid, "StaticSpawnFactionID");
    new spawnPointId = GetPVarInt(playerid, "StaticSpawnPointID");
    DeletePVar(playerid, "StaticSpawnFactionID");
    DeletePVar(playerid, "StaticSpawnPointID");

    // Find the listitem-th vehicle belonging to factionid and spawnPointId
    new idx = -1, foundIndex = -1;
    for(new i = 0; i < MAX_DYNAMIC_VEHICLES; i++)
    {
        if(Iter_Contains(sv_servercar, i) && vehicleVariables[i][vVehicleFaction] == factionid && vehicleVariables[i][vVehicleStaticSpawn] == spawnPointId)
        {
            idx++;
            if(idx == listitem)
            {
                foundIndex = i;
                break;
            }
        }
    }

    if(foundIndex == -1)
        return SendErrorMessage(playerid, "Vehicle not found.");

    if(vehicleVariables[foundIndex][vVehicleScriptID] != INVALID_VEHICLE_ID)
        return SendErrorMessage(playerid, "This vehicle is already spawned.");

    // Spawn the vehicle
    new vehicleid = CreateVehicle(vehicleVariables[foundIndex][vVehicleModelID], 
                                  vehicleVariables[foundIndex][vVehiclePosition][0], 
                                  vehicleVariables[foundIndex][vVehiclePosition][1], 
                                  vehicleVariables[foundIndex][vVehiclePosition][2], 
                                  vehicleVariables[foundIndex][vVehicleRotation], 
                                  vehicleVariables[foundIndex][vVehicleColour][0], 
                                  vehicleVariables[foundIndex][vVehicleColour][1], 
                                  60000, 
                                  vehicleVariables[foundIndex][vVehicleSiren]);

    if(vehicleid == INVALID_VEHICLE_ID)
        return SendErrorMessage(playerid, "Failed to spawn the vehicle.");

    vehicleVariables[foundIndex][vVehicleScriptID] = vehicleid;

    // Apply properties
    ResetVehicle(vehicleid);

    if(!vehicleVariables[foundIndex][vVehiclePlate][0])
        SetVehicleNumberPlate(vehicleid, GetInitials(FactionData[factionid][factionName]));
    else
        SetVehicleNumberPlate(vehicleid, vehicleVariables[foundIndex][vVehiclePlate]);

    if(vehicleVariables[foundIndex][vVehiclePaintjob] != -1)
        ChangeVehiclePaintjob(vehicleid, vehicleVariables[foundIndex][vVehiclePaintjob]);

    if(vehicleVariables[foundIndex][vVehicleModWheels] != 0)
        AddVehicleComponent(vehicleid, vehicleVariables[foundIndex][vVehicleModWheels]);

    if(vehicleVariables[foundIndex][vVehicleModNitro] != 0)
        AddVehicleComponent(vehicleid, vehicleVariables[foundIndex][vVehicleModNitro]);

    SetVehicleHealth(vehicleid, vehicleVariables[foundIndex][vVehicleHealth]);

    Iter_Add(sv_vehicles, vehicleid);

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle (%s) spawned successfully.", vehicleVariables[foundIndex][vVehiclePlate]);
    return 1;
}

CMD:despawnstatic(playerid, params[])
{
    new slot = -1;
    for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
    {
        if(StaticSpawns[i][ssID] != 0 && IsPlayerInRangeOfPoint(playerid, 3.0, StaticSpawns[i][ssX], StaticSpawns[i][ssY], StaticSpawns[i][ssZ]))
        {
            slot = i;
            break;
        }
    }

    if(slot == -1)
        return SendErrorMessage(playerid, "You are not standing near a static vehicle spawn point.");

    new factionid = StaticSpawns[slot][ssFaction];
    new spawnPointId = StaticSpawns[slot][ssID];
    if(PlayerData[playerid][pFaction] != factionid)
        return SendErrorMessage(playerid, "You do not belong to the faction associated with this spawn point.");

    // List all spawned vehicles assigned to this faction and spawnPointId
    new listStr[2048];
    format(listStr, sizeof(listStr), "Plate\tStatus\n");
    for(new i = 0; i < MAX_DYNAMIC_VEHICLES; i++)
    {
        if(Iter_Contains(sv_servercar, i) && vehicleVariables[i][vVehicleFaction] == factionid && vehicleVariables[i][vVehicleStaticSpawn] == spawnPointId)
        {
            new plate[32], status[16];
            if(!vehicleVariables[i][vVehiclePlate][0]) format(plate, sizeof(plate), "Static ID %d", vehicleVariables[i][vVehicleID]);
            else format(plate, sizeof(plate), "%s", vehicleVariables[i][vVehiclePlate]);

            if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID)
            {
                format(status, sizeof(status), "{00FF00}Spawned");
                format(listStr, sizeof(listStr), "%s%s\t%s\n", listStr, plate, status);
            }
        }
    }

    SetPVarInt(playerid, "StaticDespawnFactionID", factionid);
    SetPVarInt(playerid, "StaticDespawnPointID", spawnPointId);
    Dialog_Show(playerid, DespawnStaticVehSelect, DIALOG_STYLE_TABLIST_HEADERS, "Despawn Faction Vehicle", listStr, "Despawn", "Close");
    return 1;
}

Dialog:DespawnStaticVehSelect(playerid, response, listitem, inputtext[])
{
    if(!response)
    {
        DeletePVar(playerid, "StaticDespawnFactionID");
        DeletePVar(playerid, "StaticDespawnPointID");
        return 1;
    }

    new factionid = GetPVarInt(playerid, "StaticDespawnFactionID");
    new spawnPointId = GetPVarInt(playerid, "StaticDespawnPointID");
    DeletePVar(playerid, "StaticDespawnFactionID");
    DeletePVar(playerid, "StaticDespawnPointID");

    // Find the listitem-th spawned vehicle belonging to factionid and spawnPointId
    new idx = -1, foundIndex = -1;
    for(new i = 0; i < MAX_DYNAMIC_VEHICLES; i++)
    {
        if(Iter_Contains(sv_servercar, i) && vehicleVariables[i][vVehicleFaction] == factionid && vehicleVariables[i][vVehicleStaticSpawn] == spawnPointId)
        {
            if(vehicleVariables[i][vVehicleScriptID] != INVALID_VEHICLE_ID)
            {
                idx++;
                if(idx == listitem)
                {
                    foundIndex = i;
                    break;
                }
            }
        }
    }

    if(foundIndex == -1)
        return SendErrorMessage(playerid, "Vehicle not found or not spawned.");

    new vehicleid = vehicleVariables[foundIndex][vVehicleScriptID];
    vehicleVariables[foundIndex][vVehicleScriptID] = INVALID_VEHICLE_ID;

    if(Iter_Contains(sv_vehicles, vehicleid))
        Iter_Remove(sv_vehicles, vehicleid);

    DestroyVehicle(vehicleid);

    SendClientMessageEx(playerid, COLOR_GREEN, "Vehicle (%s) despawned successfully.", vehicleVariables[foundIndex][vVehiclePlate]);
    return 1;
}

// ── Admin Command: /removestaticspawn ────────────────────────────────
CMD:removestaticspawn(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    new str[1024], count = 0;
    str[0] = EOS;

    for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
    {
        if(StaticSpawns[i][ssID] != 0)
        {
            format(str, sizeof(str), "%s[ID: %d] %s - (%.1f, %.1f, %.1f) VW:%d\n",
                str,
                StaticSpawns[i][ssID],
                FactionData[StaticSpawns[i][ssFaction]][factionName],
                StaticSpawns[i][ssX], StaticSpawns[i][ssY], StaticSpawns[i][ssZ],
                StaticSpawns[i][ssWorld]);
            count++;
        }
    }

    if(!count)
        return SendErrorMessage(playerid, "No static spawn points exist.");

    Dialog_Show(playerid, RemoveStaticSpawnList, DIALOG_STYLE_LIST, "Remove Static Spawn Point", str, "Delete", "Cancel");
    return 1;
}

Dialog:RemoveStaticSpawnList(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    // Map listitem to the actual slot
    new slot = -1, idx = -1;
    for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
    {
        if(StaticSpawns[i][ssID] != 0)
        {
            idx++;
            if(idx == listitem)
            {
                slot = i;
                break;
            }
        }
    }

    if(slot == -1)
        return SendErrorMessage(playerid, "Invalid selection.");

    // Destroy pickup and label
    if(IsValidDynamicPickup(StaticSpawns[slot][ssPickup]))
        DestroyDynamicPickup(StaticSpawns[slot][ssPickup]);

    if(IsValidDynamic3DTextLabel(StaticSpawns[slot][ssLabel]))
        DestroyDynamic3DTextLabel(StaticSpawns[slot][ssLabel]);

    // Delete from DB
    new query[128];
    mysql_format(dbCon, query, sizeof(query), "DELETE FROM `faction_static_spawns` WHERE `id` = %d LIMIT 1", StaticSpawns[slot][ssID]);
    mysql_tquery(dbCon, query);

    new removedId = StaticSpawns[slot][ssID];

    // Clear slot
    StaticSpawns[slot][ssID] = 0;
    StaticSpawns[slot][ssFaction] = 0;
    StaticSpawns[slot][ssX] = 0.0;
    StaticSpawns[slot][ssY] = 0.0;
    StaticSpawns[slot][ssZ] = 0.0;
    StaticSpawns[slot][ssWorld] = 0;
    StaticSpawns[slot][ssInterior] = -1;
    StaticSpawns[slot][ssPickup] = INVALID_STREAMER_ID;
    StaticSpawns[slot][ssLabel] = Text3D:INVALID_STREAMER_ID;

    SendClientMessageEx(playerid, COLOR_GREEN, "Static spawn point ID %d has been permanently deleted.", removedId);
    return 1;
}

// ── Admin Command: /liststaticspawn ──────────────────────────────────
CMD:liststaticspawn(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    new str[1024], count = 0;
    str[0] = EOS;

    for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
    {
        if(StaticSpawns[i][ssID] != 0)
        {
            format(str, sizeof(str), "%s[ID: %d] %s - (%.1f, %.1f, %.1f) VW:%d\n",
                str,
                StaticSpawns[i][ssID],
                FactionData[StaticSpawns[i][ssFaction]][factionName],
                StaticSpawns[i][ssX], StaticSpawns[i][ssY], StaticSpawns[i][ssZ],
                StaticSpawns[i][ssWorld]);
            count++;
        }
    }

    if(!count)
        return SendErrorMessage(playerid, "No static spawn points exist.");

    Dialog_Show(playerid, ListStaticSpawnSelect, DIALOG_STYLE_LIST, "Static Spawn Points", str, "Teleport", "Close");
    return 1;
}

Dialog:ListStaticSpawnSelect(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    // Map listitem to actual slot
    new slot = -1, idx = -1;
    for(new i = 0; i < MAX_STATIC_SPAWNS; i++)
    {
        if(StaticSpawns[i][ssID] != 0)
        {
            idx++;
            if(idx == listitem)
            {
                slot = i;
                break;
            }
        }
    }

    if(slot == -1)
        return SendErrorMessage(playerid, "Invalid selection.");

    SetPlayerVirtualWorldEx(playerid, StaticSpawns[slot][ssWorld]);
    SetPlayerInterior(playerid, (StaticSpawns[slot][ssInterior] == -1) ? 0 : StaticSpawns[slot][ssInterior]);
    SetPlayerPosEx(playerid, StaticSpawns[slot][ssX], StaticSpawns[slot][ssY], StaticSpawns[slot][ssZ]);

    SendClientMessageEx(playerid, COLOR_YELLOW, "Teleported to static spawn ID %d (%s) in VW %d.",
        StaticSpawns[slot][ssID],
        FactionData[StaticSpawns[slot][ssFaction]][factionName],
        StaticSpawns[slot][ssWorld]);
    return 1;
}

