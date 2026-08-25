#include <YSI_Coding/y_hooks>

#define MAX_AD_POINTS (50)

enum E_AD_POINT_DATA
{
    adp_id,
    Float:adp_x,
    Float:adp_y,
    Float:adp_z,
    adp_vw,
    adp_interior,
    adp_pickup,
    Text3D:adp_text
}

new AdPointData[MAX_AD_POINTS][E_AD_POINT_DATA];

forward OnCreateAdPointsTable();
public OnCreateAdPointsTable()
{
    mysql_tquery(dbCon, "SELECT * FROM `advertisement_points` ORDER BY `id` ASC", "OnLoadAdPoints");
    return 1;
}

forward OnLoadAdPoints();
public OnLoadAdPoints()
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_AD_POINTS; i++)
    {
        cache_get_value_name_int(i, "id", AdPointData[i][adp_id]);
        cache_get_value_name_float(i, "pos_x", AdPointData[i][adp_x]);
        cache_get_value_name_float(i, "pos_y", AdPointData[i][adp_y]);
        cache_get_value_name_float(i, "pos_z", AdPointData[i][adp_z]);
        cache_get_value_name_int(i, "vw", AdPointData[i][adp_vw]);
        cache_get_value_name_int(i, "interior", AdPointData[i][adp_interior]);

        CreateAdPointVisuals(i);
    }
    printf("[SERVER]: Loaded %d advertisement pickup points.", rows);
    return 1;
}

stock CreateAdPointVisuals(slot)
{
    if(AdPointData[slot][adp_pickup]) DestroyDynamicPickup(AdPointData[slot][adp_pickup]);
    if(AdPointData[slot][adp_text]) DestroyDynamic3DTextLabel(AdPointData[slot][adp_text]);

    AdPointData[slot][adp_pickup] = CreateDynamicPickup(1239, 23, AdPointData[slot][adp_x], AdPointData[slot][adp_y], AdPointData[slot][adp_z], AdPointData[slot][adp_vw], AdPointData[slot][adp_interior]);

    new labelStr[160];
    format(labelStr, sizeof(labelStr), "{33CCFF}[Advertisement]\n{FFFFFF}ID: %d\n{FFFF00}Use /ad /ads /advert /cad", AdPointData[slot][adp_id]);
    AdPointData[slot][adp_text] = CreateDynamic3DTextLabel(labelStr, 0xFFFFFFFF, AdPointData[slot][adp_x], AdPointData[slot][adp_y], AdPointData[slot][adp_z] + 0.7, 10.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, AdPointData[slot][adp_vw], AdPointData[slot][adp_interior]);
    return 1;
}

stock IsPlayerNearAdPoint(playerid)
{
    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    new vw = GetPlayerVirtualWorld(playerid);
    new int = GetPlayerInterior(playerid);

    for(new i = 0; i < MAX_AD_POINTS; i++)
    {
        if(AdPointData[i][adp_id])
        {
            if(vw == AdPointData[i][adp_vw] && int == AdPointData[i][adp_interior])
            {
                if(IsPlayerInRangeOfPoint(playerid, 3.0, AdPointData[i][adp_x], AdPointData[i][adp_y], AdPointData[i][adp_z]))
                {
                    return i;
                }
            }
        }
    }
    return -1;
}

CMD:advertisement(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    new option[32], subparams[128];
    if(sscanf(params, "s[32]S()[128]", option, subparams))
    {
        SendSyntaxMessage(playerid, "/advertisement [create / remove / goto / list]");
        return 1;
    }

    if(!strcmp(option, "create", true))
    {
        new slot = -1;
        for(new i = 0; i < MAX_AD_POINTS; i++)
        {
            if(!AdPointData[i][adp_id])
            {
                slot = i;
                break;
            }
        }
        if(slot == -1)
            return SendErrorMessage(playerid, "Maximum advertisement points limit reached (%d).", MAX_AD_POINTS);

        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);
        new vw = GetPlayerVirtualWorld(playerid);
        new int = GetPlayerInterior(playerid);

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `advertisement_points` (`pos_x`, `pos_y`, `pos_z`, `vw`, `interior`) VALUES ('%.4f', '%.4f', '%.4f', '%d', '%d')", x, y, z, vw, int);
        new Cache:cache = mysql_query(dbCon, query);
        new id = cache_insert_id();
        cache_delete(cache);

        AdPointData[slot][adp_id] = id;
        AdPointData[slot][adp_x] = x;
        AdPointData[slot][adp_y] = y;
        AdPointData[slot][adp_z] = z;
        AdPointData[slot][adp_vw] = vw;
        AdPointData[slot][adp_interior] = int;

        CreateAdPointVisuals(slot);

        SendAdminAlert(COLOR_YELLOW, JUNIOR_ADMINS, "AdmCmd: %s created Advertisement Point ID %d.", ReturnName(playerid, 0), id);
        return 1;
    }
    else if(!strcmp(option, "remove", true) || !strcmp(option, "delete", true))
    {
        new id;
        if(sscanf(subparams, "d", id))
            return SendSyntaxMessage(playerid, "/advertisement remove [ad_point_id]");

        new slot = -1;
        for(new i = 0; i < MAX_AD_POINTS; i++)
        {
            if(AdPointData[i][adp_id] == id)
            {
                slot = i;
                break;
            }
        }

        if(slot == -1)
            return SendErrorMessage(playerid, "Invalid Advertisement Point ID specified.");

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `advertisement_points` WHERE `id` = '%d'", id);
        mysql_tquery(dbCon, query);

        if(AdPointData[slot][adp_pickup]) DestroyDynamicPickup(AdPointData[slot][adp_pickup]);
        if(AdPointData[slot][adp_text]) DestroyDynamic3DTextLabel(AdPointData[slot][adp_text]);

        AdPointData[slot][adp_id] = 0;
        AdPointData[slot][adp_pickup] = 0;
        AdPointData[slot][adp_text] = Text3D:INVALID_3DTEXT_ID;

        SendAdminAlert(COLOR_YELLOW, JUNIOR_ADMINS, "AdmCmd: %s removed Advertisement Point ID %d.", ReturnName(playerid, 0), id);
        return 1;
    }
    else if(!strcmp(option, "goto", true))
    {
        new id;
        if(sscanf(subparams, "d", id))
            return SendSyntaxMessage(playerid, "/advertisement goto [ad_point_id]");

        for(new i = 0; i < MAX_AD_POINTS; i++)
        {
            if(AdPointData[i][adp_id] == id)
            {
                SetPlayerPos(playerid, AdPointData[i][adp_x], AdPointData[i][adp_y], AdPointData[i][adp_z]);
                SetPlayerVirtualWorld(playerid, AdPointData[i][adp_vw]);
                SetPlayerInterior(playerid, AdPointData[i][adp_interior]);
                SendClientMessageEx(playerid, COLOR_YELLOW, "Teleported to Advertisement Point ID %d.", id);
                return 1;
            }
        }
        return SendErrorMessage(playerid, "Invalid Advertisement Point ID specified.");
    }
    else if(!strcmp(option, "list", true))
    {
        new count = 0, str[1024];
        format(str, sizeof(str), "ID\tVW\tInterior\n");
        for(new i = 0; i < MAX_AD_POINTS; i++)
        {
            if(AdPointData[i][adp_id])
            {
                format(str, sizeof(str), "%s%d\t%d\t%d\n", str, AdPointData[i][adp_id], AdPointData[i][adp_vw], AdPointData[i][adp_interior]);
                count++;
            }
        }
        if(!count) return SendErrorMessage(playerid, "No advertisement points found.");
        Dialog_Show(playerid, None, DIALOG_STYLE_TABLIST_HEADERS, "Advertisement Points List", str, "Close", "");
        return 1;
    }
    else
    {
        SendSyntaxMessage(playerid, "/advertisement [create / remove / goto / list]");
    }
    return 1;
}
