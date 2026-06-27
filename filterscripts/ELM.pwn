//ELM - created by Blacky 03/02/2018

// ---------------------------------------
#include <a_samp>
#include <a_http>
#include <a_mysql>
#include <foreach>
#include <sscanf2>
#include <streamer>
#include <zcmd>
// ---------------------------------------
#define KeyPressed(%0) (((newkeys & (%0)) == (%0)) && ((oldkeys & (%0)) != (%0)))
#define KeyRelease(%0) (((newkeys & (%0)) != (%0)) && ((oldkeys & (%0)) == (%0)))
#define LIGHT_TOGGLE_DELAY 500
// ---------------------------------------
#define COLOR_WHITE 		0xFFFFFFFF
#define COLOR_GREY          0xAFAFAFFF
// ---------------------------------------
enum vEnum
{
    bool:vELM,
    vEmergencyLights,
    vLights,
    vLightPattern // New variable to track pattern step
};

enum pEnum
{
		pLightToggleTick
};

new VehicleInfo[MAX_VEHICLES][vEnum];
new PlayerInfo[MAX_PLAYERS+1][pEnum];
// ---------------------------------------
native IsValidVehicle(vehicleid);

IsABoat(vehicleid)
{
    switch(GetVehicleModel(vehicleid))
    {
        case 430, 446, 452..454, 472, 473, 484, 493, 595: return 1;
    }

    return 0;
}

stock IsAHelicopter(vehicleid)
{
	new ModelID = GetVehicleModel(vehicleid);
	new vehModelArray[9] = {548,425,417,487,488,497,563,447,469};

	for(new v = 0; v < 9; v++)
	{
		if(ModelID == vehModelArray[v]) return true;
	}

	return false;
}

stock IsAPlane(vehicleid)
{
	new ModelID = GetVehicleModel(vehicleid);
	new vehModelArray[11] = {592,577,511,512,593,520,553,476,519,460,513};

	for(new v = 0; v < 11; v++)
	{
		if(ModelID == vehModelArray[v]) return true;
	}

	return false;
}
// ---------------------------------------
public OnFilterScriptInit()
{
	//timers
	SetTimer("ELMTimer", 100, 1);

	return 1;
}

public OnVehicleDeath(vehicleid, killerid)
{
	if(VehicleInfo[vehicleid][vELM] == false)
	{
		VehicleInfo[vehicleid][vEmergencyLights] = 0;
		ToggleVehicleLights(vehicleid, 0);
		VehicleInfo[vehicleid][vLights] = 0;
	}
    return 1;
}

public OnPlayerKeyStateChange(playerid, newkeys, oldkeys)
{
	new VehID = GetPlayerVehicleID(playerid);
	if(KeyPressed(KEY_SUBMISSION))
	{
		if(IsABoat(VehID) || IsAPlane(VehID) || IsAHelicopter(VehID)) return true;

		if(VehID > 0 && GetPlayerState(playerid) == PLAYER_STATE_DRIVER && !VehicleInfo[VehID][vELM])
		{
			// If lights on, turn off
			if(VehicleInfo[VehID][vLights] == 1)
			{
				ToggleVehicleLights(VehID, 0);
				VehicleInfo[VehID][vLights] = 0;
			}
			else // If lights off, turn on
			{
				ToggleVehicleLights(VehID, 1);
				VehicleInfo[VehID][vLights] = 1;
				PlayerInfo[playerid][pLightToggleTick] = GetTickCount();
			}
		}
	}

	else if(KeyRelease(KEY_SUBMISSION) && !IsAPlane(VehID))
	{
		// If not held for long (tapped), turn lights off
		new halfping = GetPlayerPing(playerid) / 2; // Lag comp
		if(GetTickCount()-PlayerInfo[playerid][pLightToggleTick] < LIGHT_TOGGLE_DELAY+halfping)
		{
			ToggleVehicleLights(VehID, 0);
			VehicleInfo[VehID][vLights] = 0;
		}
	}	

	return 1;
}
// ---------------------------------------
//ELM

stock ToggleVehicleLights(vehicleid, toggle)
{
	new engine, lights, alarm, doors, bonnet, boot, objective;
	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);
	SetVehicleParamsEx(vehicleid, engine, toggle, alarm, doors, bonnet, boot, objective);
	return true;
}

CMD:nooneknowthis(playerid)
{
    new vehicleid = GetPlayerVehicleID(playerid);
    
    if(GetPlayerState(playerid) != PLAYER_STATE_DRIVER && (GetPlayerVehicleSeat(playerid) != 1 && GetPlayerState(playerid) == PLAYER_STATE_PASSENGER))
    {
        return SendClientMessage(playerid, COLOR_GREY, "You must be the driver or the front passenger.");
    }   

    if(!VehicleInfo[vehicleid][vELM])
    {
        ToggleVehicleLights(vehicleid, 1);
        VehicleInfo[vehicleid][vEmergencyLights] = 0;
        VehicleInfo[vehicleid][vLightPattern] = 0; // Initialize pattern step
        VehicleInfo[vehicleid][vELM] = true;
        GameTextForPlayer(playerid, "~n~~n~~n~~n~~n~~n~~n~~n~~n~~n~~g~Emergency Lights ON!", 1000, 3);
    }
    else if(VehicleInfo[vehicleid][vELM])
    {
        VehicleInfo[vehicleid][vEmergencyLights] = 0;
        VehicleInfo[vehicleid][vLightPattern] = 0; // Reset pattern step
        ToggleVehicleLights(vehicleid, VehicleInfo[vehicleid][vLights]);

        new panels, doors, lights, tires;
        GetVehicleDamageStatus(vehicleid, panels, doors, lights, tires);
        UpdateVehicleDamageStatus(vehicleid, panels, doors, 0, tires);
        GameTextForPlayer(playerid, "~n~~n~~n~~n~~n~~n~~n~~n~~n~~n~~r~Emergency Lights Off!", 1000, 3);
        VehicleInfo[vehicleid][vELM] = false;
    }

    return 1;
}

forward ELMTimer();
public ELMTimer()
{
    for(new v = 1, x = GetVehiclePoolSize(); v <= x; v++)
    {
        if(VehicleInfo[v][vELM])
        {
            new panels, doors, lights, tires;
            GetVehicleDamageStatus(v, panels, doors, lights, tires);

            // Pattern sequence:
            // 0-1: Right light blink (first)
            // 2-3: Right light blink (second)
            // 4-5: Left light blink (first)
            // 6-7: Left light blink (second)
            // 8-9: Both lights blink
            // Then repeat (10 steps total)

            switch(VehicleInfo[v][vLightPattern])
            {
                // Right light first blink
                case 0: lights = encode_lights(0, 0, 1, 0); // Right on
                case 1: lights = encode_lights(0, 0, 0, 0); // Right off

                // Right light second blink
                case 2: lights = encode_lights(0, 0, 1, 0); // Right on
                case 3: lights = encode_lights(0, 0, 0, 0); // Right off

                // Left light first blink
                case 4: lights = encode_lights(0, 1, 0, 0); // Left on
                case 5: lights = encode_lights(0, 0, 0, 0); // Left off

                // Left light second blink
                case 6: lights = encode_lights(0, 1, 0, 0); // Left on
                case 7: lights = encode_lights(0, 0, 0, 0); // Left off

                // Both lights blink
                case 8: lights = encode_lights(0, 1, 1, 0); // Both on
                case 9: lights = encode_lights(0, 0, 0, 0); // Both off
            }

            // Update pattern step
            VehicleInfo[v][vLightPattern]++;
            if(VehicleInfo[v][vLightPattern] >= 10) // Reset after completing pattern
                VehicleInfo[v][vLightPattern] = 0;

            UpdateVehicleDamageStatus(v, panels, doors, lights, tires);
        }
    }
    return 1;
}

stock encode_lights(light1, light2, light3, light4)
{
	return light1 | (light2 << 1) | (light3 << 2) | (light4 << 3);
}

public OnVehicleSirenStateChange(playerid, vehicleid, newstate)
{
    if(newstate) 
	{
		return cmd_nooneknowthis(playerid);
	} else {
		return cmd_nooneknowthis(playerid);
	}
}

//END ELM
//is bad ik