// ============================================================================
// Marriage.pwn — Marriage System & Propose Points Module
// ============================================================================

#define MAX_PROPOSE_POINTS (20)

enum E_PROPOSE_POINT_DATA
{
    ppID,
    Float:ppX,
    Float:ppY,
    Float:ppZ,
    ppInterior,
    ppWorld,
    ppPickup,
    Text3D:ppTextLabel
}

new ProposePoints[MAX_PROPOSE_POINTS][E_PROPOSE_POINT_DATA];
new ProposePointNames[MAX_PROPOSE_POINTS][64];
new ProposerTarget[MAX_PLAYERS] = {INVALID_PLAYER_ID, ...};
new ProposePointUsed[MAX_PLAYERS] = {-1, ...};

forward OnProposePointCreated(id);
public OnProposePointCreated(id)
{
    ProposePoints[id][ppID] = cache_insert_id();
    RefreshProposePoint(id);
    return 1;
}

forward LoadProposePoints();
public LoadProposePoints()
{
    new rows;
    cache_get_row_count(rows);

    for(new i = 0; i < rows && i < MAX_PROPOSE_POINTS; i++)
    {
        cache_get_value_name_int(i, "id", ProposePoints[i][ppID]);
        cache_get_value_name(i, "name", ProposePointNames[i], 64);
        cache_get_value_name_float(i, "posX", ProposePoints[i][ppX]);
        cache_get_value_name_float(i, "posY", ProposePoints[i][ppY]);
        cache_get_value_name_float(i, "posZ", ProposePoints[i][ppZ]);
        cache_get_value_name_int(i, "interior", ProposePoints[i][ppInterior]);
        cache_get_value_name_int(i, "world", ProposePoints[i][ppWorld]);

        if(isnull(ProposePointNames[i]))
            format(ProposePointNames[i], 64, "Propose Point");

        RefreshProposePoint(i);
    }
    printf("[SQL] %d Propose Points loaded from database.", rows);
    return 1;
}

stock RefreshProposePoint(id)
{
    if(ProposePoints[id][ppID] != 0)
    {
        if(IsValidDynamicPickup(ProposePoints[id][ppPickup]))
            DestroyDynamicPickup(ProposePoints[id][ppPickup]);

        if(ProposePoints[id][ppTextLabel] != Text3D:INVALID_3DTEXT_ID && ProposePoints[id][ppTextLabel] != Text3D:0)
            DestroyDynamic3DTextLabel(ProposePoints[id][ppTextLabel]);

        ProposePoints[id][ppPickup] = CreateDynamicPickup(1240, 23, 
            ProposePoints[id][ppX], ProposePoints[id][ppY], ProposePoints[id][ppZ], 
            ProposePoints[id][ppWorld], ProposePoints[id][ppInterior], -1, 100.0);

        if(isnull(ProposePointNames[id]))
            format(ProposePointNames[id], 64, "Propose Point");

        new label[160];
        format(label, sizeof(label), "{FFFFFF}[PPID: %d]\n{FF6699}[%s]\n{FFFF00}Use /propose [playerid]", id, ProposePointNames[id]);
        ProposePoints[id][ppTextLabel] = CreateDynamic3DTextLabel(label, 0xFFFFFFFF, 
            ProposePoints[id][ppX], ProposePoints[id][ppY], ProposePoints[id][ppZ] + 0.7, 
            10.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, ProposePoints[id][ppWorld], ProposePoints[id][ppInterior]);
    }
    return 1;
}

stock IsPlayerNearProposePoint(playerid, Float:radius = 3.0)
{
    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    new intid = GetPlayerInterior(playerid);
    new vworld = GetPlayerVirtualWorld(playerid);

    for(new i = 0; i < MAX_PROPOSE_POINTS; i++)
    {
        if(ProposePoints[i][ppID] != 0)
        {
            if(ProposePoints[i][ppWorld] == vworld && ProposePoints[i][ppInterior] == intid)
            {
                if(IsPlayerInRangeOfPoint(playerid, radius, ProposePoints[i][ppX], ProposePoints[i][ppY], ProposePoints[i][ppZ]))
                {
                    return i;
                }
            }
        }
    }
    return -1;
}

// ----------------------------------------------------------------------------
// Admin Commands: /proposepoint
// ----------------------------------------------------------------------------

CMD:proposepoint(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendUnauthMessage(playerid, "You are not authorized to use this command.");

    new subcmd[32], rest[64];
    if(sscanf(params, "s[32]S()[64]", subcmd, rest))
    {
        SendSyntaxMessage(playerid, "/proposepoint [create / remove / goto / list]");
        return 1;
    }

    if(!strcmp(subcmd, "create", true))
    {
        new inputPointName[64];
        if(sscanf(rest, "s[64]", inputPointName))
            return SendSyntaxMessage(playerid, "/proposepoint create [propose point name]");

        new freeSlot = -1;
        for(new i = 0; i < MAX_PROPOSE_POINTS; i++)
        {
            if(ProposePoints[i][ppID] == 0)
            {
                freeSlot = i;
                break;
            }
        }

        if(freeSlot == -1)
            return SendErrorMessage(playerid, "Maximum propose points limit reached (%d).", MAX_PROPOSE_POINTS);

        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);
        new intid = GetPlayerInterior(playerid);
        new vworld = GetPlayerVirtualWorld(playerid);

        format(ProposePointNames[freeSlot], 64, "%s", inputPointName);
        ProposePoints[freeSlot][ppX] = x;
        ProposePoints[freeSlot][ppY] = y;
        ProposePoints[freeSlot][ppZ] = z;
        ProposePoints[freeSlot][ppInterior] = intid;
        ProposePoints[freeSlot][ppWorld] = vworld;

        new query[384];
        mysql_format(dbCon, query, sizeof(query), 
            "INSERT INTO `propose_points` (`name`, `posX`, `posY`, `posZ`, `interior`, `world`) VALUES ('%e', '%.4f', '%.4f', '%.4f', '%d', '%d')", 
            inputPointName, x, y, z, intid, vworld);
        mysql_tquery(dbCon, query, "OnProposePointCreated", "d", freeSlot);

        SendClientMessageEx(playerid, COLOR_GREEN, "Propose Point '%s' (ID %d) created successfully at your position.", inputPointName, freeSlot);
        return 1;
    }
    else if(!strcmp(subcmd, "remove", true))
    {
        new id;
        if(sscanf(rest, "d", id))
            return SendSyntaxMessage(playerid, "/proposepoint remove [point id]");

        if(id < 0 || id >= MAX_PROPOSE_POINTS || ProposePoints[id][ppID] == 0)
            return SendErrorMessage(playerid, "Invalid propose point ID.");

        if(IsValidDynamicPickup(ProposePoints[id][ppPickup]))
            DestroyDynamicPickup(ProposePoints[id][ppPickup]);

        if(ProposePoints[id][ppTextLabel] != Text3D:INVALID_3DTEXT_ID && ProposePoints[id][ppTextLabel] != Text3D:0)
            DestroyDynamic3DTextLabel(ProposePoints[id][ppTextLabel]);

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `propose_points` WHERE `id` = '%d'", ProposePoints[id][ppID]);
        mysql_tquery(dbCon, query);

        ProposePoints[id][ppID] = 0;
        ProposePoints[id][ppPickup] = 0;
        ProposePoints[id][ppTextLabel] = Text3D:INVALID_3DTEXT_ID;
        ProposePointNames[id][0] = EOS;

        SendClientMessageEx(playerid, COLOR_GREEN, "Propose Point ID %d removed successfully.", id);
        return 1;
    }
    else if(!strcmp(subcmd, "goto", true))
    {
        new id;
        if(sscanf(rest, "d", id))
            return SendSyntaxMessage(playerid, "/proposepoint goto [point id]");

        if(id < 0 || id >= MAX_PROPOSE_POINTS || ProposePoints[id][ppID] == 0)
            return SendErrorMessage(playerid, "Invalid propose point ID.");

        SetPlayerPos(playerid, ProposePoints[id][ppX], ProposePoints[id][ppY], ProposePoints[id][ppZ]);
        SetPlayerInterior(playerid, ProposePoints[id][ppInterior]);
        SetPlayerVirtualWorld(playerid, ProposePoints[id][ppWorld]);

        SendClientMessageEx(playerid, COLOR_GREEN, "Teleported to Propose Point ID %d (%s).", id, ProposePointNames[id]);
        return 1;
    }
    else if(!strcmp(subcmd, "list", true))
    {
        new pointListStr[1024], count = 0;
        format(pointListStr, sizeof(pointListStr), "ID\tName\tInterior\tWorld\n");

        for(new i = 0; i < MAX_PROPOSE_POINTS; i++)
        {
            if(ProposePoints[i][ppID] != 0)
            {
                format(pointListStr, sizeof(pointListStr), "%s%d\t%s\t%d\t%d\n", 
                    pointListStr, i, ProposePointNames[i], ProposePoints[i][ppInterior], ProposePoints[i][ppWorld]);
                count++;
            }
        }

        if(!count) return SendErrorMessage(playerid, "No propose points created yet.");

        Dialog_Show(playerid, ProposePointList, DIALOG_STYLE_TABLIST_HEADERS, "Propose Points List", pointListStr, "Teleport", "Cancel");
        return 1;
    }
    else
    {
        SendSyntaxMessage(playerid, "/proposepoint [create / remove / goto / list]");
    }
    return 1;
}

Dialog:ProposePointList(playerid, response, listitem, inputtext[])
{
    if(response)
    {
        new id = strval(inputtext);
        if(id >= 0 && id < MAX_PROPOSE_POINTS && ProposePoints[id][ppID] != 0)
        {
            SetPlayerPos(playerid, ProposePoints[id][ppX], ProposePoints[id][ppY], ProposePoints[id][ppZ]);
            SetPlayerInterior(playerid, ProposePoints[id][ppInterior]);
            SetPlayerVirtualWorld(playerid, ProposePoints[id][ppWorld]);
            SendClientMessageEx(playerid, COLOR_GREEN, "Teleported to Propose Point ID %d (%s).", id, ProposePointNames[id]);
        }
    }
    return 1;
}

// ----------------------------------------------------------------------------
// Player Commands: /propose, /divorce, /spouse, /sw, /findspouse
// ----------------------------------------------------------------------------

CMD:propose(playerid, params[])
{
    new pointid = IsPlayerNearProposePoint(playerid, 3.0);
    if(pointid == -1)
        return SendErrorMessage(playerid, "You must be standing at a designated Propose Point (Church / City Hall) to propose!");

    new targetid;
    if(sscanf(params, "u", targetid))
        return SendSyntaxMessage(playerid, "/propose [playerid / PartOfName]");

    if(!IsPlayerConnected(targetid) || !SQL_IsLogged(targetid))
        return SendErrorMessage(playerid, "The specified player is not online or logged in.");

    if(targetid == playerid)
        return SendErrorMessage(playerid, "You cannot propose to yourself.");

    if(strcmp(PlayerData[playerid][pMarriedTo], "None") != 0)
        return SendErrorMessage(playerid, "You are already married to %s!", PlayerData[playerid][pMarriedTo]);

    if(strcmp(PlayerData[targetid][pMarriedTo], "None") != 0)
        return SendErrorMessage(playerid, "%s is already married to %s!", ReturnName(targetid, 0), PlayerData[targetid][pMarriedTo]);

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    if(!IsPlayerInRangeOfPoint(targetid, 5.0, x, y, z))
        return SendErrorMessage(playerid, "%s is too far away from you.", ReturnName(targetid, 0));

    ProposerTarget[targetid] = playerid;
    ProposePointUsed[targetid] = pointid;

    new dialogStr[256];
    format(dialogStr, sizeof(dialogStr), 
        "{FFFFFF}%s has proposed to marry you at {FF6699}%s{FFFFFF}!\n\nDo you accept this marriage proposal and agree to take {FF6699}%s{FFFFFF} as your lawful spouse?", 
        ReturnName(playerid, 0), ProposePointNames[pointid], ReturnName(playerid, 0));

    Dialog_Show(targetid, MarriageProposalConfirm, DIALOG_STYLE_MSGBOX, 
        "Marriage Proposal", dialogStr, "Accept", "Decline");

    SendClientMessageEx(playerid, COLOR_YELLOW, "You have proposed to marry %s at %s. Awaiting response...", ReturnName(targetid, 0), ProposePointNames[pointid]);
    return 1;
}

Dialog:MarriageProposalConfirm(playerid, response, listitem, inputtext[])
{
    new proposerid = ProposerTarget[playerid];
    new pointid = ProposePointUsed[playerid];
    ProposerTarget[playerid] = INVALID_PLAYER_ID;
    ProposePointUsed[playerid] = -1;

    if(!IsPlayerConnected(proposerid) || !SQL_IsLogged(proposerid))
    {
        SendErrorMessage(playerid, "The player who proposed to you has disconnected.");
        return 1;
    }

    new locationName[64];
    if(pointid != -1 && ProposePoints[pointid][ppID] != 0)
    {
        format(locationName, sizeof(locationName), "%s", ProposePointNames[pointid]);
    }
    else
    {
        format(locationName, sizeof(locationName), "Propose Point");
    }

    if(response)
    {
        format(PlayerData[playerid][pMarriedTo], MAX_PLAYER_NAME, "%s", ReturnName(proposerid, 0));
        format(PlayerData[proposerid][pMarriedTo], MAX_PLAYER_NAME, "%s", ReturnName(playerid, 0));

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "UPDATE `characters` SET `MarriedTo` = '%e' WHERE `ID` = '%d'", ReturnName(proposerid, 0), PlayerData[playerid][pID]);
        mysql_tquery(dbCon, query);

        mysql_format(dbCon, query, sizeof(query), "UPDATE `characters` SET `MarriedTo` = '%e' WHERE `ID` = '%d'", ReturnName(playerid, 0), PlayerData[proposerid][pID]);
        mysql_tquery(dbCon, query);

        PlayerPlaySound(playerid, 1058, 0.0, 0.0, 0.0);
        PlayerPlaySound(proposerid, 1058, 0.0, 0.0, 0.0);

        ApplyAnimation(playerid, "OTB", "wtchrace_win", 4.1, 0, 0, 0, 0, 0);
        ApplyAnimation(proposerid, "OTB", "wtchrace_win", 4.1, 0, 0, 0, 0, 0);

        SendClientMessageEx(playerid, COLOR_GREEN, "Congratulations! You are now married to %s!", ReturnName(proposerid, 0));
        SendClientMessageEx(proposerid, COLOR_GREEN, "Congratulations! %s accepted your proposal! You are now married!", ReturnName(playerid, 0));

        SendClientMessageToAllEx(COLOR_PINK, "[MARRIAGE]: Congratulations! %s and %s have just gotten married at %s!", 
            ReturnName(proposerid, 0), ReturnName(playerid, 0), locationName);
    }
    else
    {
        SendClientMessageEx(playerid, COLOR_LIGHTRED, "You declined the marriage proposal.");
        SendClientMessageEx(proposerid, COLOR_LIGHTRED, "%s declined your marriage proposal.", ReturnName(playerid, 0));
    }
    return 1;
}

CMD:divorce(playerid, params[])
{
    if(!strcmp(PlayerData[playerid][pMarriedTo], "None"))
        return SendErrorMessage(playerid, "You are not married to anyone.");

    new dialogStr[256];
    format(dialogStr, sizeof(dialogStr), 
        "{FFFFFF}Are you sure you want to divorce {FF6699}%s{FFFFFF}?\n\n{FF0000}Warning: This action will end your marriage permanently.", 
        PlayerData[playerid][pMarriedTo]);

    Dialog_Show(playerid, DivorceConfirm, DIALOG_STYLE_MSGBOX, 
        "Divorce Confirmation", dialogStr, "Divorce", "Cancel");
    return 1;
}

Dialog:DivorceConfirm(playerid, response, listitem, inputtext[])
{
    if(response)
    {
        new spouseName[MAX_PLAYER_NAME];
        format(spouseName, sizeof(spouseName), "%s", PlayerData[playerid][pMarriedTo]);

        new spouseid = GetIDByName(spouseName);

        format(PlayerData[playerid][pMarriedTo], MAX_PLAYER_NAME, "None");

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "UPDATE `characters` SET `MarriedTo` = 'None' WHERE `ID` = '%d'", PlayerData[playerid][pID]);
        mysql_tquery(dbCon, query);

        mysql_format(dbCon, query, sizeof(query), "UPDATE `characters` SET `MarriedTo` = 'None' WHERE `char_name` = '%e'", spouseName);
        mysql_tquery(dbCon, query);

        if(spouseid != INVALID_PLAYER_ID && SQL_IsLogged(spouseid))
        {
            format(PlayerData[spouseid][pMarriedTo], MAX_PLAYER_NAME, "None");
            SendClientMessageEx(spouseid, COLOR_LIGHTRED, "[MARRIAGE]: %s has filed for divorce. You are no longer married.", ReturnName(playerid, 0));
        }

        SendClientMessageEx(playerid, COLOR_LIGHTRED, "You have divorced %s. Your marriage status is now single.", spouseName);
    }
    return 1;
}

YCMD:sw(playerid, params[], help) = spouse;

CMD:spouse(playerid, params[])
{
    if(!strcmp(PlayerData[playerid][pMarriedTo], "None"))
        return SendErrorMessage(playerid, "You are not married to anyone.");

    if(isnull(params))
        return SendSyntaxMessage(playerid, "/spouse [message]");

    new spouseid = GetIDByName(PlayerData[playerid][pMarriedTo]);
    if(spouseid == INVALID_PLAYER_ID || !SQL_IsLogged(spouseid))
        return SendErrorMessage(playerid, "Your spouse (%s) is currently offline.", PlayerData[playerid][pMarriedTo]);

    SendClientMessageEx(playerid, COLOR_PINK, "[Spouse -> %s]: {FFFFFF}%s", ReturnName(spouseid, 0), params);
    SendClientMessageEx(spouseid, COLOR_PINK, "[Spouse <- %s]: {FFFFFF}%s", ReturnName(playerid, 0), params);
    return 1;
}

CMD:findspouse(playerid, params[])
{
    if(!strcmp(PlayerData[playerid][pMarriedTo], "None"))
        return SendErrorMessage(playerid, "You are not married to anyone.");

    new spouseid = GetIDByName(PlayerData[playerid][pMarriedTo]);
    if(spouseid == INVALID_PLAYER_ID || !SQL_IsLogged(spouseid))
        return SendErrorMessage(playerid, "Your spouse (%s) is currently offline.", PlayerData[playerid][pMarriedTo]);

    new Float:x, Float:y, Float:z;
    GetPlayerPos(spouseid, x, y, z);

    SetPlayerCheckpoint(playerid, x, y, z, 3.0);

    new Float:dist = GetPlayerDistanceFromPoint(playerid, x, y, z);
    SendClientMessageEx(playerid, COLOR_PINK, "[SPOUSE]: Your spouse %s is located at %s (Distance: %.1fm). Waypoint marked on your radar.", 
        ReturnName(spouseid, 0), ReturnLocation(spouseid), dist);
    return 1;
}
