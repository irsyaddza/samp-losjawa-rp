// Defines

#define MAX_ENTRANCES (50)

// Variables

enum
{
	POINT_TYPE_ONFOOT,
	POINT_TYPE_VEHICLE,
	POINT_TYPE_BOTH,
	POINT_TYPE_ELEVATOR
};

enum E_ENTRANCE_DATA
{
	pointID,
	Float:outsidePos[4],
	Float:insidePos[4],
	outsideApartmentSQL,
	outsideApartmentID,
	insideApartmentSQL,
	insideApartmentID,
	Float:pointRange,
	pointType,
	pointName[80],
	pointLocked,
	pointFaction,
	pointPickup,
	pointPickupInside,
	outsideWorld,
	insideWorld,
	Text3D:pointLabel,
	Text3D:pointLabelInside
};

new const PointTypes[][] =
{
	"On Foot Only",
	"On Vehicle Only",
	"On Foot / Vehicle"
};

new EntranceData[MAX_ENTRANCES][E_ENTRANCE_DATA];
new Iterator:Entrance<MAX_ENTRANCES>;

// Functions

Point_Nearest(playerid, Float:radius = 2.5, ignoreid = -1)
{
    foreach (new i : Entrance)
	{
	    if(ignoreid == i) continue;

	    if(InApartment[playerid] != EntranceData[i][outsideApartmentID] && InApartment[playerid] != EntranceData[i][insideApartmentID]) continue;

		if(IsPlayerInRangeOfPoint(playerid, radius, EntranceData[i][outsidePos][0], EntranceData[i][outsidePos][1], EntranceData[i][outsidePos][2]) || IsPlayerInRangeOfPoint(playerid, radius, EntranceData[i][insidePos][0], EntranceData[i][insidePos][1], EntranceData[i][insidePos][2]))
		{
			return i;
		}
	}
	return -1;
}

ShowPointSettings(playerid, point)
{
	gstr[0] = EOS;

	new typeStr[32];
	new pType = EntranceData[point][pointType];
	if(pType >= 0 && pType < sizeof(PointTypes))
		format(typeStr, sizeof(typeStr), "%s", PointTypes[pType]);
	else
		format(typeStr, sizeof(typeStr), "Unknown (%d)", pType);

	format(gstr, sizeof(gstr), "{7e98b6}1\t{a9c4e4}Name [{7e98b6}%s{a9c4e4}]\n", EntranceData[point][pointName]);
	format(gstr, sizeof(gstr), "%s{7e98b6}2\t{a9c4e4}Outside Apartment ID [{7e98b6}%d{a9c4e4}]\n", gstr, EntranceData[point][outsideApartmentID]);
	format(gstr, sizeof(gstr), "%s{7e98b6}3\t{a9c4e4}Inside Apartment ID [{7e98b6}%d{a9c4e4}]\n", gstr, EntranceData[point][insideApartmentID]);
	format(gstr, sizeof(gstr), "%s{7e98b6}4\t{a9c4e4}Type [{7e98b6}%s{a9c4e4}]\n", gstr, typeStr);
	format(gstr, sizeof(gstr), "%s{7e98b6}5\t{a9c4e4}Range [{7e98b6}%.1f{a9c4e4}]\n", gstr, EntranceData[point][pointRange]);
	format(gstr, sizeof(gstr), "%s{7e98b6}6\t{a9c4e4}Faction [{7e98b6}%s{a9c4e4}]\n", gstr, ReturnFactionNameByType(EntranceData[point][pointFaction]));
	format(gstr, sizeof(gstr), "%s{7e98b6}Set enter coordinates (current position)\n{7e98b6}Set exit coordinates (current position)\n{7e98b6}Teleport\n{7e98b6}Delete Point", gstr);

	Dialog_Show(playerid, EditPoint, DIALOG_STYLE_LIST, "Edit Point", gstr, "Select", "Exit");
	return true;
}

Dialog:EditPoint_Type(playerid, response, listitem, inputtext[])
{
    new point = GetPVarInt(playerid, "EditingPoint");

	if(!response)
	{
	    return ShowPointSettings(playerid, point);
	}

    EntranceData[point][pointType] = listitem;

	mysql_format(dbCon, gquery, sizeof(gquery), "UPDATE `points` SET `pointType` = '%d' WHERE `ID` = '%d' LIMIT 1", listitem, EntranceData[point][pointID]);
	mysql_pquery(dbCon, gquery);

	SendClientMessageEx(playerid, COLOR_YELLOW, "-> You've successfully set Point %d's type to: %s", EntranceData[point][pointID], PointTypes[listitem]);

	ShowPointSettings(playerid, point);
	return true;
}

Dialog:EditPoint_Range(playerid, response, listitem, inputtext[])
{
    new point = GetPVarInt(playerid, "EditingPoint");

	if(!response)
	{
	    return ShowPointSettings(playerid, point);
	}

	new Float:input = float(strval(inputtext));

	if(input < 2.0 || input > 10.0)
	{
	    SendErrorMessage(playerid, "Invalid range specified, 2.0 to 10.0 allowed only.");

	    return ShowPointSettings(playerid, point);
	}

    EntranceData[point][pointRange] = input;

	mysql_format(dbCon, gquery, sizeof(gquery), "UPDATE `points` SET `pointRange` = '%f' WHERE `ID` = '%d' LIMIT 1", input, EntranceData[point][pointID]);
	mysql_pquery(dbCon, gquery);

	SendClientMessageEx(playerid, COLOR_YELLOW, "-> You've successfully set Point %d's range to: %.1f", EntranceData[point][pointID], input);

	ShowPointSettings(playerid, point);
	return true;
}

Dialog:EditPoint_Faction(playerid, response, listitem, inputtext[])
{
    new point = GetPVarInt(playerid, "EditingPoint");

	if(!response)
	{
	    return ShowPointSettings(playerid, point);
	}

	if(listitem == 0) EntranceData[point][pointFaction] = -1;
    else EntranceData[point][pointFaction] = listitem;

	mysql_format(dbCon, gquery, sizeof(gquery), "UPDATE `points` SET `pointFaction` = '%d' WHERE `ID` = '%d' LIMIT 1", EntranceData[point][pointFaction], EntranceData[point][pointID]);
	mysql_pquery(dbCon, gquery);

	Point_Refresh(point);

	SendClientMessageEx(playerid, COLOR_YELLOW, "-> You've successfully set Point %d's Faction to: %s", EntranceData[point][pointID], ReturnFactionNameByType(EntranceData[point][pointFaction]));

	ShowPointSettings(playerid, point);
	return true;
}

Dialog:EditPoint(playerid, response, listitem, inputtext[])
{
	if(!response)
	{
	    DeletePVar(playerid, "EditingPoint");
	    return true;
	}

	new point = GetPVarInt(playerid, "EditingPoint");

	switch(listitem)
	{
	    case 3:
	    {
			return Dialog_Show(playerid, EditPoint_Type, DIALOG_STYLE_LIST, "Point Type", "{7e98b6}On Foot Only\n{7e98b6}On Vehicle Only\n{7e98b6}On Foot / Vehicle", "Select", "<< Go Back");
	    }
	    case 4:
	    {
			return Dialog_Show(playerid, EditPoint_Range, DIALOG_STYLE_INPUT, "Point Range", "{7e98b6}Change point range (Default 3.0)", "Change", "<< Go Back");
	    }
	    case 5:
	    {
			return Dialog_Show(playerid, EditPoint_Faction, DIALOG_STYLE_LIST, "Point Faction", "{7e98b6}NONE\n{7e98b6}POLICE\n{7e98b6}NEWS\n{7e98b6}MEDIC\n{7e98b6}GOV\n{7e98b6}GANG\n{7e98b6}SHERIFF\n{7e98b6}CORRECTIONAL", "Change", "<< Go Back");
	    }		
	    case 6:
	    {
			new Float:playerPos[4], apt = InApartment[playerid];

			GetPlayerPos(playerid, playerPos[0], playerPos[1], playerPos[2]);
			GetPlayerFacingAngle(playerid, playerPos[3]);

			if(IsPlayerInRangeOfPoint(playerid, 4.0, EntranceData[point][insidePos][0], EntranceData[point][insidePos][1], EntranceData[point][insidePos][2]) && apt == EntranceData[point][insideApartmentID])
			{
			    SendErrorMessage(playerid, "You're too close to the exit coordinates.");
			    return ShowPointSettings(playerid, point);
			}

			EntranceData[point][outsidePos][0] = playerPos[0];
			EntranceData[point][outsidePos][1] = playerPos[1];
			EntranceData[point][outsidePos][2] = playerPos[2];
			EntranceData[point][outsidePos][3] = playerPos[3];
			EntranceData[point][outsideWorld] = GetPlayerVirtualWorld(playerid);

			if(apt == -1)
			{
				EntranceData[point][outsideApartmentSQL] = -1;
				EntranceData[point][outsideApartmentID] = -1;
			}
			else
			{
				EntranceData[point][outsideApartmentSQL] = ComplexData[apt][aID];
				EntranceData[point][outsideApartmentID] = apt;
			}

			mysql_format(dbCon, gquery, sizeof(gquery), "UPDATE `points` SET `outsideX` = '%f', `outsideY` = '%f', `outsideZ` = '%f', `outsideA` = '%f', `outsideApartment` = '%d', `outsideWorld` = '%d' WHERE `ID` = '%d' LIMIT 1", playerPos[0], playerPos[1], playerPos[2], playerPos[3], EntranceData[point][outsideApartmentSQL], EntranceData[point][outsideWorld], EntranceData[point][pointID]);
			mysql_pquery(dbCon, gquery);

			Point_Refresh(point);

	        SendClientMessageEx(playerid, COLOR_YELLOW, "-> Successfully edited Point %d's enter coordinates: %f, %f, %f", EntranceData[point][pointID], playerPos[0], playerPos[1], playerPos[2]);
	        return true;
	    }
	    case 7:
	    {
			new Float:playerPos[4], apt = InApartment[playerid];

			GetPlayerPos(playerid, playerPos[0], playerPos[1], playerPos[2]);
			GetPlayerFacingAngle(playerid, playerPos[3]);

			if(IsPlayerInRangeOfPoint(playerid, 4.0, EntranceData[point][outsidePos][0], EntranceData[point][outsidePos][1], EntranceData[point][outsidePos][2]) && apt == EntranceData[point][outsideApartmentID])
			{
			    SendErrorMessage(playerid, "You're too close to the enter coordinates.");
			    return ShowPointSettings(playerid, point);
			}

			EntranceData[point][insidePos][0] = playerPos[0];
			EntranceData[point][insidePos][1] = playerPos[1];
			EntranceData[point][insidePos][2] = playerPos[2];
			EntranceData[point][insidePos][3] = playerPos[3];
			EntranceData[point][insideWorld] = GetPlayerVirtualWorld(playerid);

			if(apt == -1)
			{
				EntranceData[point][insideApartmentSQL] = -1;
				EntranceData[point][insideApartmentID] = -1;
			}
			else
			{
				EntranceData[point][insideApartmentSQL] = ComplexData[apt][aID];
				EntranceData[point][insideApartmentID] = apt;
			}

			mysql_format(dbCon, gquery, sizeof(gquery), "UPDATE `points` SET `insideX` = '%f', `insideY` = '%f', `insideZ` = '%f', `insideA` = '%f', `insideApartment` = '%d', `insideWorld` = '%d' WHERE `ID` = '%d' LIMIT 1", playerPos[0], playerPos[1], playerPos[2], playerPos[3], EntranceData[point][insideApartmentSQL], EntranceData[point][insideWorld], EntranceData[point][pointID]);
			mysql_pquery(dbCon, gquery);

	        SendClientMessageEx(playerid, COLOR_YELLOW, "-> Successfully edited Point %d's exit coordinates: %f, %f, %f", EntranceData[point][pointID], playerPos[0], playerPos[1], playerPos[2]);
	        return true;
	    }
	    case 8:
	    {
	        DeletePVar(playerid, "EditingPoint");

	        SetPlayerPosEx(playerid, EntranceData[point][outsidePos][0], EntranceData[point][outsidePos][1], EntranceData[point][outsidePos][2]);

	        if(EntranceData[point][outsideApartmentID] != -1)
	        {
				SetPlayerInteriorEx(playerid, ComplexData[ EntranceData[point][outsideApartmentID] ][aInterior]);
				SetPlayerVirtualWorldEx(playerid, ComplexData[ EntranceData[point][outsideApartmentID] ][aWorld]);

				PlayerData[playerid][pLocal] = EntranceData[point][outsideApartmentID] + LOCAL_APARTMENT;
	        }
	        else PlayerData[playerid][pLocal] = 255;

            InApartment[playerid] = EntranceData[point][outsideApartmentID];
            return true;
	    }
	    case 9:
	    {
	        DeletePVar(playerid, "EditingPoint");

			if(IsValidDynamicPickup(EntranceData[point][pointPickup]))
			{
				DestroyDynamicPickup(EntranceData[point][pointPickup]);
				EntranceData[point][pointPickup] = INVALID_STREAMER_ID;
			}
			if(IsValidDynamicPickup(EntranceData[point][pointPickupInside]))
			{
				DestroyDynamicPickup(EntranceData[point][pointPickupInside]);
				EntranceData[point][pointPickupInside] = INVALID_STREAMER_ID;
			}
			if(IsValidDynamic3DTextLabel(EntranceData[point][pointLabel]))
			{
				DestroyDynamic3DTextLabel(EntranceData[point][pointLabel]);
				EntranceData[point][pointLabel] = Text3D:INVALID_STREAMER_ID;
			}
			if(IsValidDynamic3DTextLabel(EntranceData[point][pointLabelInside]))
			{
				DestroyDynamic3DTextLabel(EntranceData[point][pointLabelInside]);
				EntranceData[point][pointLabelInside] = Text3D:INVALID_STREAMER_ID;
			}

			mysql_format(dbCon, gquery, sizeof(gquery), "DELETE FROM `points` WHERE `ID` = '%d' LIMIT 1", EntranceData[point][pointID]);
			mysql_pquery(dbCon, gquery);

	        EntranceData[point][pointID] = -1;

	        Iter_Remove(Entrance, point);

	        SendClientMessageEx(playerid, COLOR_YELLOW, "-> Successfully removed the point.", EntranceData[point][pointID]);
	        return true;
	    }
	}

    ShowPointSettings(playerid, point);
	return true;
}

stock Point_Refresh(i)
{
    if(IsValidDynamicPickup(EntranceData[i][pointPickup]))
    {
        DestroyDynamicPickup(EntranceData[i][pointPickup]);
        EntranceData[i][pointPickup] = INVALID_STREAMER_ID;
    }
    if(IsValidDynamicPickup(EntranceData[i][pointPickupInside]))
    {
        DestroyDynamicPickup(EntranceData[i][pointPickupInside]);
        EntranceData[i][pointPickupInside] = INVALID_STREAMER_ID;
    }
    if(IsValidDynamic3DTextLabel(EntranceData[i][pointLabel]))
    {
        DestroyDynamic3DTextLabel(EntranceData[i][pointLabel]);
        EntranceData[i][pointLabel] = Text3D:INVALID_STREAMER_ID;
    }
    if(IsValidDynamic3DTextLabel(EntranceData[i][pointLabelInside]))
    {
        DestroyDynamic3DTextLabel(EntranceData[i][pointLabelInside]);
        EntranceData[i][pointLabelInside] = Text3D:INVALID_STREAMER_ID;
    }
    
    // Outside/Enter Pickup (always active)
    new outWorld, outInterior;
    if(EntranceData[i][outsideApartmentID] == -1)
    {
        outWorld = EntranceData[i][outsideWorld];
        outInterior = -1;
    }
    else
    {
        new apt = EntranceData[i][outsideApartmentID];
        outWorld = ComplexData[apt][aWorld];
        outInterior = ComplexData[apt][aInterior];
    }
    
    EntranceData[i][pointPickup] = CreateDynamicPickup(19130, 23, EntranceData[i][outsidePos][0], EntranceData[i][outsidePos][1], EntranceData[i][outsidePos][2], outWorld, outInterior);
    
    // Create 3D Text Label for Outside
    new labelStr[256];
    format(labelStr, sizeof(labelStr), "{00FFFF}[Point: %s]\n{FFFFFF}Point ID: {FFFF00}%d\n{FFFFFF}Use {FFFF00}/enter, F, or H", EntranceData[i][pointName], i);
    EntranceData[i][pointLabel] = CreateDynamic3DTextLabel(labelStr, 0xFFFFFFFF, EntranceData[i][outsidePos][0], EntranceData[i][outsidePos][1], EntranceData[i][outsidePos][2] + 0.6, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, outWorld, outInterior);

    // Inside/Exit Pickup (only if exit coords set)
    if(EntranceData[i][insidePos][0] != 0.0)
    {
        new inWorld, inInterior;
        if(EntranceData[i][insideApartmentID] == -1)
        {
            inWorld = EntranceData[i][insideWorld];
            inInterior = -1;
        }
        else
        {
            new apt = EntranceData[i][insideApartmentID];
            inWorld = ComplexData[apt][aWorld];
            inInterior = ComplexData[apt][aInterior];
        }
        
        EntranceData[i][pointPickupInside] = CreateDynamicPickup(19130, 23, EntranceData[i][insidePos][0], EntranceData[i][insidePos][1], EntranceData[i][insidePos][2], inWorld, inInterior);
        
        // Create 3D Text Label for Inside (Exit)
        format(labelStr, sizeof(labelStr), "{00FFFF}[Point: %s (Exit)]\n{FFFFFF}Point ID: {FFFF00}%d\n{FFFFFF}Use {FFFF00}/enter, F, or H", EntranceData[i][pointName], i);
        EntranceData[i][pointLabelInside] = CreateDynamic3DTextLabel(labelStr, 0xFFFFFFFF, EntranceData[i][insidePos][0], EntranceData[i][insidePos][1], EntranceData[i][insidePos][2] + 0.6, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, inWorld, inInterior);
    }
    return 1;
}

#include <YSI_Coding\y_hooks>
hook OnPlayerKeyStateChange(playerid, newkeys, oldkeys)
{
    if(GetPlayerState(playerid) == PLAYER_STATE_DRIVER)
    {
        if((newkeys & KEY_CROUCH) || (newkeys & KEY_CTRL_BACK))
        {
            // Player is driver and pressed horn. Let's check if they are near a dynamic point.
            new bool:entered = false;
            foreach (new i : Entrance)
            {
                if(InApartment[playerid] != EntranceData[i][outsideApartmentID]) continue;
                if(EntranceData[i][outsideApartmentID] == -1 && GetPlayerVirtualWorld(playerid) != EntranceData[i][outsideWorld]) continue;

                if(IsPlayerInRangeOfPoint(playerid, EntranceData[i][pointRange], EntranceData[i][outsidePos][0], EntranceData[i][outsidePos][1], EntranceData[i][outsidePos][2]))
                {
                    // Check point type allows vehicles
                    if(EntranceData[i][pointType] == POINT_TYPE_VEHICLE || EntranceData[i][pointType] == POINT_TYPE_BOTH)
                    {
                        if(EntranceData[i][insidePos][0] == 0.0) continue;
                        if(EntranceData[i][pointLocked]) continue;

                        new vehicleid = GetPlayerVehicleID(playerid);
                        SetVehicleDynamicPos(vehicleid, EntranceData[i][insidePos][0], EntranceData[i][insidePos][1], EntranceData[i][insidePos][2], playerid);
                        SetVehicleZAngle(vehicleid, EntranceData[i][insidePos][3]);

                        if(EntranceData[i][insideApartmentID] != -1)
                        {
                            LinkVehicleToInterior(vehicleid, ComplexData[ EntranceData[i][insideApartmentID] ][aInterior]);
                            SetVehicleVirtualWorld(vehicleid, ComplexData[ EntranceData[i][insideApartmentID] ][aWorld]);
                        }
                        else
                        {
                            LinkVehicleToInterior(vehicleid, 0);
                            SetVehicleVirtualWorld(vehicleid, EntranceData[i][insideWorld]);
                        }

                        if(PlayerData[playerid][pLocal] != 999)
                        {
                            if(EntranceData[i][insideApartmentID] != -1)
                            {
                                SetPlayerInteriorEx(playerid, ComplexData[ EntranceData[i][insideApartmentID] ][aInterior]);
                                SetPlayerVirtualWorldEx(playerid, ComplexData[ EntranceData[i][insideApartmentID] ][aWorld]);
                                PlayerData[playerid][pLocal] = EntranceData[i][insideApartmentID] + LOCAL_APARTMENT;
                            }
                            else
                            {
                                SetPlayerInterior(playerid, 0);
                                SetPlayerVirtualWorldEx(playerid, EntranceData[i][insideWorld]);
                                DesyncPlayerInterior(playerid);
                            }
                        }

                        InApartment[playerid] = EntranceData[i][insideApartmentID];
                        entered = true;
                        break;
                    }
                }
            }

            if(!entered)
            {
                // Check exit:
                foreach (new i : Entrance)
                {
                    if(InApartment[playerid] != EntranceData[i][insideApartmentID]) continue;
                    if(EntranceData[i][insideApartmentID] == -1 && GetPlayerVirtualWorld(playerid) != EntranceData[i][insideWorld]) continue;

                    if(IsPlayerInRangeOfPoint(playerid, EntranceData[i][pointRange], EntranceData[i][insidePos][0], EntranceData[i][insidePos][1], EntranceData[i][insidePos][2]))
                    {
                        if(EntranceData[i][pointType] == POINT_TYPE_VEHICLE || EntranceData[i][pointType] == POINT_TYPE_BOTH)
                        {
                            if(EntranceData[i][pointLocked]) continue;

                            new vehicleid = GetPlayerVehicleID(playerid);
                            SetVehicleDynamicPos(vehicleid, EntranceData[i][outsidePos][0], EntranceData[i][outsidePos][1], EntranceData[i][outsidePos][2], playerid);
                            SetVehicleZAngle(vehicleid, EntranceData[i][outsidePos][3]);

                            if(EntranceData[i][outsideApartmentID] != -1)
                            {
                                LinkVehicleToInterior(vehicleid, ComplexData[ EntranceData[i][outsideApartmentID] ][aInterior]);
                                SetVehicleVirtualWorld(vehicleid, ComplexData[ EntranceData[i][outsideApartmentID] ][aWorld]);
                            }
                            else
                            {
                                LinkVehicleToInterior(vehicleid, 0);
                                SetVehicleVirtualWorld(vehicleid, EntranceData[i][outsideWorld]);
                            }

                            if(PlayerData[playerid][pLocal] != 999)
                            {
                                if(EntranceData[i][outsideApartmentID] != -1)
                                {
                                    SetPlayerInteriorEx(playerid, ComplexData[ EntranceData[i][outsideApartmentID] ][aInterior]);
                                    SetPlayerVirtualWorldEx(playerid, ComplexData[ EntranceData[i][outsideApartmentID] ][aWorld]);
                                    PlayerData[playerid][pLocal] = EntranceData[i][outsideApartmentID] + LOCAL_APARTMENT;
                                }
                                else
                                {
                                    SetPlayerInterior(playerid, 0);
                                    SetPlayerVirtualWorldEx(playerid, EntranceData[i][outsideWorld]);
                                    DesyncPlayerInterior(playerid);
                                }
                            }

                            InApartment[playerid] = EntranceData[i][outsideApartmentID];
                            break;
                        }
                    }
                }
            }
        }
    }
    return 1;
}
