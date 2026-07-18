/*
 * Elevators.pwn — Multi-floor dynamic elevator system for Los Jawa RP
 * Allows admins to configure elevators and floors, and players to use them.
 */

#include <YSI_Coding\y_hooks>

#define MAX_ELEVATORS 50
#define MAX_ELEVATOR_FLOORS 200

enum E_ELEVATOR_DATA {
    eID,
    eName[64]
};

enum E_FLOOR_DATA {
    efID,
    efElevatorID,
    efName[64],
    Float:efX,
    Float:efY,
    Float:efZ,
    Float:efA,
    efInterior,
    efWorld,
    efFactionLock,
    efPickup,
    Text3D:efLabel
};

new Elevators[MAX_ELEVATORS][E_ELEVATOR_DATA];
new ElevatorFloors[MAX_ELEVATOR_FLOORS][E_FLOOR_DATA];

new Iterator:ElevatorGroup<MAX_ELEVATORS>;
new Iterator:ElevatorFloor<MAX_ELEVATOR_FLOORS>;

// ── Initialization & DB Loading ─────────────────────────────────────────

stock Elevators_Init()
{
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `elevators` (`id` INT AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(64) NOT NULL)", "OnElevatorsTableCheck", "");
    return 1;
}

forward OnElevatorsTableCheck();
public OnElevatorsTableCheck()
{
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `elevator_floors` (`id` INT AUTO_INCREMENT PRIMARY KEY, `elevatorId` INT NOT NULL, `floorName` VARCHAR(64) NOT NULL, `posX` FLOAT NOT NULL, `posY` FLOAT NOT NULL, `posZ` FLOAT NOT NULL, `posA` FLOAT NOT NULL, `interior` INT NOT NULL DEFAULT '0', `world` INT NOT NULL DEFAULT '0', `factionLock` INT NOT NULL DEFAULT '-1', FOREIGN KEY (`elevatorId`) REFERENCES `elevators` (`id`) ON DELETE CASCADE)", "OnElevatorFloorsTableCheck", "");
    return 1;
}

forward OnElevatorFloorsTableCheck();
public OnElevatorFloorsTableCheck()
{
    mysql_tquery(dbCon, "SELECT * FROM `elevators` ORDER BY `id` ASC", "Elevators_Load", "");
    return 1;
}

forward Elevators_Load();
public Elevators_Load()
{
    new rows = cache_num_rows();
    Iter_Clear(ElevatorGroup);
    for(new i = 0; i < rows && i < MAX_ELEVATORS; i++)
    {
        cache_get_value_name_int(i, "id", Elevators[i][eID]);
        cache_get_value_name(i, "name", Elevators[i][eName]);
        Iter_Add(ElevatorGroup, i);
    }
    printf("[Elevators]: Loaded %d elevator groups.", rows);

    mysql_tquery(dbCon, "SELECT * FROM `elevator_floors` ORDER BY `id` ASC", "ElevatorFloors_Load", "");
    return 1;
}

forward ElevatorFloors_Load();
public ElevatorFloors_Load()
{
    new rows = cache_num_rows();
    
    // Clean up existing pickups and labels if any
    foreach(new i : ElevatorFloor)
    {
        if(IsValidDynamicPickup(ElevatorFloors[i][efPickup]))
            DestroyDynamicPickup(ElevatorFloors[i][efPickup]);
        if(IsValidDynamic3DTextLabel(ElevatorFloors[i][efLabel]))
            DestroyDynamic3DTextLabel(ElevatorFloors[i][efLabel]);
    }
    Iter_Clear(ElevatorFloor);

    for(new i = 0; i < rows && i < MAX_ELEVATOR_FLOORS; i++)
    {
        cache_get_value_name_int(i, "id", ElevatorFloors[i][efID]);
        cache_get_value_name_int(i, "elevatorId", ElevatorFloors[i][efElevatorID]);
        cache_get_value_name(i, "floorName", ElevatorFloors[i][efName]);
        cache_get_value_name_float(i, "posX", ElevatorFloors[i][efX]);
        cache_get_value_name_float(i, "posY", ElevatorFloors[i][efY]);
        cache_get_value_name_float(i, "posZ", ElevatorFloors[i][efZ]);
        cache_get_value_name_float(i, "posA", ElevatorFloors[i][efA]);
        cache_get_value_name_int(i, "interior", ElevatorFloors[i][efInterior]);
        cache_get_value_name_int(i, "world", ElevatorFloors[i][efWorld]);
        cache_get_value_name_int(i, "factionLock", ElevatorFloors[i][efFactionLock]);

        Iter_Add(ElevatorFloor, i);
        ElevatorFloor_Refresh(i);
    }
    printf("[Elevators]: Loaded %d elevator floors.", rows);
    return 1;
}

stock ElevatorFloor_Refresh(index)
{
    if(index < 0 || index >= MAX_ELEVATOR_FLOORS) return 0;

    // Destroy existing if valid
    if(IsValidDynamicPickup(ElevatorFloors[index][efPickup]))
    {
        DestroyDynamicPickup(ElevatorFloors[index][efPickup]);
        ElevatorFloors[index][efPickup] = STREAMER_TAG_PICKUP:INVALID_STREAMER_ID;
    }
    if(IsValidDynamic3DTextLabel(ElevatorFloors[index][efLabel]))
    {
        DestroyDynamic3DTextLabel(ElevatorFloors[index][efLabel]);
        ElevatorFloors[index][efLabel] = STREAMER_TAG_3D_TEXT_LABEL:INVALID_3DTEXT_ID;
    }

    // Find elevator group name
    new elevName[64] = "Unknown";
    new elevId = ElevatorFloors[index][efElevatorID];
    foreach(new i : ElevatorGroup)
    {
        if(Elevators[i][eID] == elevId)
        {
            format(elevName, sizeof(elevName), "%s", Elevators[i][eName]);
            break;
        }
    }

    // Create Pickup (model 19134, type 23 to work on foot, virtualworld, interior)
    ElevatorFloors[index][efPickup] = CreateDynamicPickup(19134, 23, 
        ElevatorFloors[index][efX], ElevatorFloors[index][efY], ElevatorFloors[index][efZ], 
        ElevatorFloors[index][efWorld], ElevatorFloors[index][efInterior]);

    // Create 3D Text Label
    new labelStr[256];
    format(labelStr, sizeof(labelStr), 
        "{00FFFF}[Elevator: %s]\n{FFFFFF}Floor: {FFFF00}%s\n{FFFFFF}Use {FFFF00}/elevator\n{999999}(Elevator ID: %d | Floor ID: %d)", 
        elevName, ElevatorFloors[index][efName], elevId, ElevatorFloors[index][efID]);
        
    ElevatorFloors[index][efLabel] = CreateDynamic3DTextLabel(labelStr, 0xFFFFFFFF, 
        ElevatorFloors[index][efX], ElevatorFloors[index][efY], ElevatorFloors[index][efZ] + 0.6, 15.0, 
        INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, ElevatorFloors[index][efWorld], ElevatorFloors[index][efInterior]);

    return 1;
}

// ── Interaction Logic ──────────────────────────────────────────────────

stock Elevator_OnPlayerUse(playerid)
{
    new nearestFloorIndex = -1;
    new Float:minDist = 2.5;
    
    new Float:px, Float:py, Float:pz;
    GetPlayerPos(playerid, px, py, pz);
    new playerWorld = GetPlayerVirtualWorld(playerid);
    new playerInterior = GetPlayerInterior(playerid);

    foreach(new i : ElevatorFloor)
    {
        if(ElevatorFloors[i][efWorld] == playerWorld && ElevatorFloors[i][efInterior] == playerInterior)
        {
            if(IsPlayerInRangeOfPoint(playerid, minDist, ElevatorFloors[i][efX], ElevatorFloors[i][efY], ElevatorFloors[i][efZ]))
            {
                nearestFloorIndex = i;
                break;
            }
        }
    }

    if(nearestFloorIndex == -1)
        return 0; // Not near a dynamic elevator floor

    new elevId = ElevatorFloors[nearestFloorIndex][efElevatorID];
    new str[1024];
    str[0] = EOS;
    
    new listedFloors[20];
    new count = 0;

    new elevName[64] = "Elevator";
    foreach(new e : ElevatorGroup)
    {
        if(Elevators[e][eID] == elevId)
        {
            format(elevName, sizeof(elevName), "%s", Elevators[e][eName]);
            break;
        }
    }

    foreach(new i : ElevatorFloor)
    {
        if(ElevatorFloors[i][efElevatorID] == elevId)
        {
            listedFloors[count] = i;
            
            new line[128];
            if(ElevatorFloors[i][efFactionLock] != -1)
            {
                if(PlayerData[playerid][pFaction] == ElevatorFloors[i][efFactionLock])
                {
                    format(line, sizeof(line), "%s {00FF00}(%s Only)\n", ElevatorFloors[i][efName], FactionData[ElevatorFloors[i][efFactionLock]][factionName]);
                }
                else
                {
                    format(line, sizeof(line), "%s {FF0000}(Locked)\n", ElevatorFloors[i][efName]);
                }
            }
            else
            {
                format(line, sizeof(line), "%s\n", ElevatorFloors[i][efName]);
            }
            
            strcat(str, line);
            count++;
            if(count >= 20) break;
        }
    }

    if(count == 0)
    {
        SendErrorMessage(playerid, "This elevator has no floors configured.");
        return 1;
    }

    // Save map in player vars
    for(new idx = 0; idx < count; idx++)
    {
        new pvarName[32];
        format(pvarName, sizeof(pvarName), "ElevatorFloorMap_%d", idx);
        SetPVarInt(playerid, pvarName, listedFloors[idx]);
    }
    SetPVarInt(playerid, "ElevatorFloorsCount", count);

    new title[128];
    format(title, sizeof(title), "Elevator: %s", elevName);
    Dialog_Show(playerid, UseElevatorDialog, DIALOG_STYLE_LIST, title, str, "Select", "Close");
    return 1;
}

Dialog:UseElevatorDialog(playerid, response, listitem, inputtext[])
{
    new count = GetPVarInt(playerid, "ElevatorFloorsCount");
    if(!response || count == 0)
    {
        for(new idx = 0; idx < count; idx++)
        {
            new pvarName[32];
            format(pvarName, sizeof(pvarName), "ElevatorFloorMap_%d", idx);
            DeletePVar(playerid, pvarName);
        }
        DeletePVar(playerid, "ElevatorFloorsCount");
        return 1;
    }

    new pvarName[32];
    format(pvarName, sizeof(pvarName), "ElevatorFloorMap_%d", listitem);
    new targetFloorIdx = GetPVarInt(playerid, pvarName);

    // Clean up
    for(new idx = 0; idx < count; idx++)
    {
        new pvarNameTemp[32];
        format(pvarNameTemp, sizeof(pvarNameTemp), "ElevatorFloorMap_%d", idx);
        DeletePVar(playerid, pvarNameTemp);
    }
    DeletePVar(playerid, "ElevatorFloorsCount");

    // Locked check
    if(ElevatorFloors[targetFloorIdx][efFactionLock] != -1 && PlayerData[playerid][pFaction] != ElevatorFloors[targetFloorIdx][efFactionLock])
    {
        return SendErrorMessage(playerid, "You do not have access to this floor.");
    }

    // Teleport
    SetPlayerPosEx(playerid, ElevatorFloors[targetFloorIdx][efX], ElevatorFloors[targetFloorIdx][efY], ElevatorFloors[targetFloorIdx][efZ]);
    SetPlayerFacingAngle(playerid, ElevatorFloors[targetFloorIdx][efA]);
    SetPlayerInteriorEx(playerid, ElevatorFloors[targetFloorIdx][efInterior]);
    SetPlayerVirtualWorldEx(playerid, ElevatorFloors[targetFloorIdx][efWorld]);

    SendClientMessageEx(playerid, COLOR_GREEN, "You used the elevator to floor: %s", ElevatorFloors[targetFloorIdx][efName]);
    return 1;
}

// ── Admin Command: /aelev ──────────────────────────────────────────────

CMD:aelev(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    new action[32], tail[128];
    if(sscanf(params, "s[32]S[128]", action, tail))
    {
        SendSyntaxMessage(playerid, "/aelev [create / addfloor / deletefloor / delete / list / setfaction]");
        return 1;
    }

    if(!strcmp(action, "create", true))
    {
        if(isnull(tail))
            return SendSyntaxMessage(playerid, "/aelev create [Elevator Name]");

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `elevators` (`name`) VALUES ('%e')", tail);
        mysql_tquery(dbCon, query, "OnElevatorGroupCreated", "ds", playerid, tail);
        return 1;
    }
    else if(!strcmp(action, "addfloor", true))
    {
        new elevId, floorName[64];
        if(sscanf(tail, "ds[64]", elevId, floorName))
            return SendSyntaxMessage(playerid, "/aelev addfloor [Elevator ID] [Floor Name]");

        new found = 0;
        foreach(new i : ElevatorGroup)
        {
            if(Elevators[i][eID] == elevId)
            {
                found = 1;
                break;
            }
        }
        if(!found)
            return SendErrorMessage(playerid, "Elevator Group ID %d not found. Use /aelev list to see groups.", elevId);

        new Float:x, Float:y, Float:z, Float:a;
        GetPlayerPos(playerid, x, y, z);
        GetPlayerFacingAngle(playerid, a);
        new interior = GetPlayerInterior(playerid);
        new world = GetPlayerVirtualWorld(playerid);

        new query[384];
        mysql_format(dbCon, query, sizeof(query), 
            "INSERT INTO `elevator_floors` (`elevatorId`, `floorName`, `posX`, `posY`, `posZ`, `posA`, `interior`, `world`) VALUES (%d, '%e', %f, %f, %f, %f, %d, %d)", 
            elevId, floorName, x, y, z, a, interior, world);
        
        mysql_tquery(dbCon, query, "OnElevatorFloorCreated", "ddsffffdd", playerid, elevId, floorName, x, y, z, a, interior, world);
        return 1;
    }
    else if(!strcmp(action, "deletefloor", true))
    {
        new floorId;
        if(sscanf(tail, "d", floorId))
            return SendSyntaxMessage(playerid, "/aelev deletefloor [Floor ID]");

        new slot = -1;
        foreach(new i : ElevatorFloor)
        {
            if(ElevatorFloors[i][efID] == floorId)
            {
                slot = i;
                break;
            }
        }
        if(slot == -1)
            return SendErrorMessage(playerid, "Floor ID %d not found.", floorId);

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `elevator_floors` WHERE `id` = %d", floorId);
        mysql_tquery(dbCon, query, "OnElevatorFloorDeleted", "dd", playerid, slot);
        return 1;
    }
    else if(!strcmp(action, "delete", true))
    {
        new elevId;
        if(sscanf(tail, "d", elevId))
            return SendSyntaxMessage(playerid, "/aelev delete [Elevator ID]");

        new slot = -1;
        foreach(new i : ElevatorGroup)
        {
            if(Elevators[i][eID] == elevId)
            {
                slot = i;
                break;
            }
        }
        if(slot == -1)
            return SendErrorMessage(playerid, "Elevator Group ID %d not found.", elevId);

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `elevators` WHERE `id` = %d", elevId);
        mysql_tquery(dbCon, query, "OnElevatorGroupDeleted", "dd", playerid, slot);
        return 1;
    }
    else if(!strcmp(action, "list", true))
    {
        new str[1024];
        str[0] = EOS;
        new count = 0;
        new listedElevs[50];
        foreach(new i : ElevatorGroup)
        {
            listedElevs[count] = Elevators[i][eID];
            format(str, sizeof(str), "%s%d - %s\n", str, Elevators[i][eID], Elevators[i][eName]);
            count++;
        }
        if(count == 0)
            return SendErrorMessage(playerid, "No elevator groups configured.");

        for(new idx = 0; idx < count; idx++)
        {
            new pvarName[32];
            format(pvarName, sizeof(pvarName), "AdminElevMap_%d", idx);
            SetPVarInt(playerid, pvarName, listedElevs[idx]);
        }
        SetPVarInt(playerid, "AdminElevCount", count);

        Dialog_Show(playerid, ElevatorsListDialog, DIALOG_STYLE_LIST, "Elevators List (Select to TP)", str, "Teleport", "Close");
        return 1;
    }
    else if(!strcmp(action, "setfaction", true))
    {
        new floorId, facId;
        if(sscanf(tail, "dd", floorId, facId))
            return SendSyntaxMessage(playerid, "/aelev setfaction [Floor ID] [Faction ID (-1 to disable)]");

        new slot = -1;
        foreach(new i : ElevatorFloor)
        {
            if(ElevatorFloors[i][efID] == floorId)
            {
                slot = i;
                break;
            }
        }
        if(slot == -1)
            return SendErrorMessage(playerid, "Floor ID %d not found.", floorId);

        if(facId != -1 && (facId < 0 || facId >= MAX_FACTIONS || !FactionData[facId][factionExists]))
            return SendErrorMessage(playerid, "Invalid Faction ID.");

        ElevatorFloors[slot][efFactionLock] = facId;
        
        new query[128];
        mysql_format(dbCon, query, sizeof(query), "UPDATE `elevator_floors` SET `factionLock` = %d WHERE `id` = %d", facId, floorId);
        mysql_tquery(dbCon, query);

        ElevatorFloor_Refresh(slot);

        if(facId == -1)
            SendClientMessageEx(playerid, COLOR_GREEN, "Floor ID %d has been unlocked (public access).", floorId);
        else
            SendClientMessageEx(playerid, COLOR_GREEN, "Floor ID %d has been locked to Faction: %s (ID: %d).", floorId, FactionData[facId][factionName], facId);
        return 1;
    }
    else
    {
        SendSyntaxMessage(playerid, "/aelev [create / addfloor / deletefloor / delete / list / setfaction]");
    }
    return 1;
}

forward OnElevatorGroupCreated(playerid, name[]);
public OnElevatorGroupCreated(playerid, name[])
{
    new insertid = cache_insert_id();
    new slot = -1;
    for(new i = 0; i < MAX_ELEVATORS; i++)
    {
        if(!Iter_Contains(ElevatorGroup, i))
        {
            slot = i;
            break;
        }
    }

    if(slot == -1)
    {
        SendErrorMessage(playerid, "Failed to register Elevator Group in memory (MAX reached).");
        return 1;
    }

    Elevators[slot][eID] = insertid;
    format(Elevators[slot][eName], 64, "%s", name);
    Iter_Add(ElevatorGroup, slot);

    SendClientMessageEx(playerid, COLOR_GREEN, "Elevator group '%s' created successfully (Group ID: %d).", name, insertid);
    return 1;
}

forward OnElevatorFloorCreated(playerid, elevId, floorName[], Float:x, Float:y, Float:z, Float:a, interior, world);
public OnElevatorFloorCreated(playerid, elevId, floorName[], Float:x, Float:y, Float:z, Float:a, interior, world)
{
    new insertid = cache_insert_id();
    new slot = -1;
    for(new i = 0; i < MAX_ELEVATOR_FLOORS; i++)
    {
        if(!Iter_Contains(ElevatorFloor, i))
        {
            slot = i;
            break;
        }
    }

    if(slot == -1)
    {
        SendErrorMessage(playerid, "Failed to register Elevator Floor in memory (MAX reached).");
        return 1;
    }

    ElevatorFloors[slot][efID] = insertid;
    ElevatorFloors[slot][efElevatorID] = elevId;
    format(ElevatorFloors[slot][efName], 64, "%s", floorName);
    ElevatorFloors[slot][efX] = x;
    ElevatorFloors[slot][efY] = y;
    ElevatorFloors[slot][efZ] = z;
    ElevatorFloors[slot][efA] = a;
    ElevatorFloors[slot][efInterior] = interior;
    ElevatorFloors[slot][efWorld] = world;
    ElevatorFloors[slot][efFactionLock] = -1;

    Iter_Add(ElevatorFloor, slot);
    ElevatorFloor_Refresh(slot);

    SendClientMessageEx(playerid, COLOR_GREEN, "Floor '%s' added successfully to Elevator ID: %d (Floor ID: %d).", floorName, elevId, insertid);
    return 1;
}

forward OnElevatorFloorDeleted(playerid, slot);
public OnElevatorFloorDeleted(playerid, slot)
{
    new floorId = ElevatorFloors[slot][efID];
    
    if(IsValidDynamicPickup(ElevatorFloors[slot][efPickup]))
        DestroyDynamicPickup(ElevatorFloors[slot][efPickup]);
    if(IsValidDynamic3DTextLabel(ElevatorFloors[slot][efLabel]))
        DestroyDynamic3DTextLabel(ElevatorFloors[slot][efLabel]);

    ElevatorFloors[slot][efID] = 0;
    Iter_Remove(ElevatorFloor, slot);

    SendClientMessageEx(playerid, COLOR_GREEN, "Floor ID %d deleted successfully.", floorId);
    return 1;
}

forward OnElevatorGroupDeleted(playerid, slot);
public OnElevatorGroupDeleted(playerid, slot)
{
    new elevId = Elevators[slot][eID];
    Elevators[slot][eID] = 0;
    Iter_Remove(ElevatorGroup, slot);

    new query[128];
    mysql_format(dbCon, query, sizeof(query), "DELETE FROM `elevator_floors` WHERE `elevatorId` = %d", elevId);
    mysql_tquery(dbCon, query);

    foreach(new i : ElevatorFloor)
    {
        if(ElevatorFloors[i][efElevatorID] == elevId)
        {
            if(IsValidDynamicPickup(ElevatorFloors[i][efPickup]))
                DestroyDynamicPickup(ElevatorFloors[i][efPickup]);
            if(IsValidDynamic3DTextLabel(ElevatorFloors[i][efLabel]))
                DestroyDynamic3DTextLabel(ElevatorFloors[i][efLabel]);
            
            ElevatorFloors[i][efID] = 0;
            Iter_SafeRemove(ElevatorFloor, i, i);
        }
    }

    SendClientMessageEx(playerid, COLOR_GREEN, "Elevator Group ID %d and all its floors deleted successfully.", elevId);
    return 1;
}

Dialog:ElevatorsListDialog(playerid, response, listitem, inputtext[])
{
    new count = GetPVarInt(playerid, "AdminElevCount");
    if(!response || count == 0)
    {
        for(new idx = 0; idx < count; idx++)
        {
            new pvarName[32];
            format(pvarName, sizeof(pvarName), "AdminElevMap_%d", idx);
            DeletePVar(playerid, pvarName);
        }
        DeletePVar(playerid, "AdminElevCount");
        return 1;
    }

    new pvarName[32];
    format(pvarName, sizeof(pvarName), "AdminElevMap_%d", listitem);
    new targetElevId = GetPVarInt(playerid, pvarName);

    // Clean up
    for(new idx = 0; idx < count; idx++)
    {
        new pvarNameTemp[32];
        format(pvarNameTemp, sizeof(pvarNameTemp), "AdminElevMap_%d", idx);
        DeletePVar(playerid, pvarNameTemp);
    }
    DeletePVar(playerid, "AdminElevCount");

    new slot = -1;
    foreach(new i : ElevatorGroup)
    {
        if(Elevators[i][eID] == targetElevId)
        {
            slot = i;
            break;
        }
    }

    if(slot == -1)
        return SendErrorMessage(playerid, "Elevator not found.");

    new foundFloorIdx = -1;
    foreach(new i : ElevatorFloor)
    {
        if(ElevatorFloors[i][efElevatorID] == targetElevId)
        {
            foundFloorIdx = i;
            break;
        }
    }

    if(foundFloorIdx == -1)
        return SendErrorMessage(playerid, "This elevator has no floors configured yet. Cannot teleport.");

    // Teleport admin
    SetPlayerPosEx(playerid, ElevatorFloors[foundFloorIdx][efX], ElevatorFloors[foundFloorIdx][efY], ElevatorFloors[foundFloorIdx][efZ]);
    SetPlayerFacingAngle(playerid, ElevatorFloors[foundFloorIdx][efA]);
    SetPlayerInteriorEx(playerid, ElevatorFloors[foundFloorIdx][efInterior]);
    SetPlayerVirtualWorldEx(playerid, ElevatorFloors[foundFloorIdx][efWorld]);

    SendClientMessageEx(playerid, COLOR_GREEN, "Teleported to Elevator: %s (Floor: %s).", Elevators[slot][eName], ElevatorFloors[foundFloorIdx][efName]);
    return 1;
}

stock IsPlayerNearElevator(playerid)
{
    // Check dynamic elevator floors
    new Float:px, Float:py, Float:pz;
    GetPlayerPos(playerid, px, py, pz);
    new playerWorld = GetPlayerVirtualWorld(playerid);
    new playerInterior = GetPlayerInterior(playerid);

    foreach(new i : ElevatorFloor)
    {
        if(ElevatorFloors[i][efWorld] == playerWorld && ElevatorFloors[i][efInterior] == playerInterior)
        {
            if(IsPlayerInRangeOfPoint(playerid, 2.5, ElevatorFloors[i][efX], ElevatorFloors[i][efY], ElevatorFloors[i][efZ]))
            {
                return 1;
            }
        }
    }

    // Check static elevator points
    foreach(new i : Entrance)
    {
        if(EntranceData[i][pointType] != POINT_TYPE_ELEVATOR) continue;

        if(InApartment[playerid] != EntranceData[i][outsideApartmentID] && InApartment[playerid] != EntranceData[i][insideApartmentID]) continue;

        if(IsPlayerInRangeOfPoint(playerid, EntranceData[i][pointRange], EntranceData[i][outsidePos][0], EntranceData[i][outsidePos][1], EntranceData[i][outsidePos][2]))
        {
            return 1;
        }
        if(IsPlayerInRangeOfPoint(playerid, EntranceData[i][pointRange], EntranceData[i][insidePos][0], EntranceData[i][insidePos][1], EntranceData[i][insidePos][2]))
        {
            return 1;
        }
    }
    return 0;
}
