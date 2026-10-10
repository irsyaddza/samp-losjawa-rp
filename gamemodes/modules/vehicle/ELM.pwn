/*
	Siren & Emergency Light Flasher (ELM) Module
	Los Jawa Roleplay
*/

new bool:vELMActive[MAX_VEHICLES];
new vELMPattern[MAX_VEHICLES];
new vELMOriginalLights[MAX_VEHICLES];

// Global active ELM timer handle
new gELMTimer = -1;

stock ELM_Init()
{
	// Timer is created dynamically when first vehicle activates ELM
	return 1;
}

forward ELM_FlashTimer();
public ELM_FlashTimer()
{
	new activeCount = 0;
	new poolSize = GetVehiclePoolSize();

	for(new v = 1; v <= poolSize; v++)
	{
		if(vELMActive[v])
		{
			activeCount++;

			new panels, doors_status, lights_status, tires;
			GetVehicleDamageStatus(v, panels, doors_status, lights_status, tires);

			// Force lights ON if they got turned OFF by sync or other scripts
			new engine, lights, alarm, doors, bonnet, boot, objective;
			GetVehicleParamsEx(v, engine, lights, alarm, doors, bonnet, boot, objective);
			if(lights != 1)
			{
				SetVehicleParamsEx(v, engine, 1, alarm, doors, bonnet, boot, objective);
			}

			new new_lights = 0;
			switch(vELMPattern[v])
			{
				case 0: new_lights = 4; // Right on (bit 2 broken)
				case 1: new_lights = 0; // Right off (none broken)
				case 2: new_lights = 4; // Right on
				case 3: new_lights = 0; // Right off
				case 4: new_lights = 2; // Left on (bit 1 broken)
				case 5: new_lights = 0; // Left off (none broken)
				case 6: new_lights = 2; // Left on
				case 7: new_lights = 0; // Left off
				case 8: new_lights = 6; // Both on (bit 1 & 2 broken)
				case 9: new_lights = 0; // Both off (none broken)
			}
			vELMPattern[v] = (vELMPattern[v] + 1) % 10;

			UpdateVehicleDamageStatus(v, panels, doors_status, new_lights, tires);
		}
	}

	// Auto-kill timer when no vehicles are using ELM to prevent long callback log spam
	if(activeCount == 0 && gELMTimer != -1)
	{
		KillTimer(gELMTimer);
		gELMTimer = -1;
	}
	return 1;
}

stock ToggleEmergencyLights(vehicleid, bool:toggle)
{
	if(toggle)
	{
		if(!vELMActive[vehicleid])
		{
			vELMActive[vehicleid] = true;
			vELMPattern[vehicleid] = 0;

			// Start timer if not running
			if(gELMTimer == -1)
			{
				gELMTimer = SetTimer("ELM_FlashTimer", 150, true);
			}

			// Save original lights param and force them ON
			new engine, lights, alarm, doors, bonnet, boot, objective;
			GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);
			vELMOriginalLights[vehicleid] = lights;
			SetVehicleParamsEx(vehicleid, engine, 1, alarm, doors, bonnet, boot, objective);
		}
	}
	else
	{
		if(vELMActive[vehicleid])
		{
			vELMActive[vehicleid] = false;
			vELMPattern[vehicleid] = 0;

			// Restore undamaged status for all lights first
			new panels, doors_status, lights_status, tires;
			GetVehicleDamageStatus(vehicleid, panels, doors_status, lights_status, tires);
			UpdateVehicleDamageStatus(vehicleid, panels, doors_status, 0, tires);

			// Restore original lights param
			new engine, lights, alarm, doors, bonnet, boot, objective;
			GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);
			SetVehicleParamsEx(vehicleid, engine, vELMOriginalLights[vehicleid], alarm, doors, bonnet, boot, objective);
		}
	}
	return 1;
}

// Hook OnVehicleSirenStateChange (native H key)
public OnVehicleSirenStateChange(playerid, vehicleid, newstate)
{
	if(newstate == 1)
	{
		ToggleEmergencyLights(vehicleid, true);
	}
	else
	{
		ToggleEmergencyLights(vehicleid, false);
	}

	#if defined ELM_OnVehicleSirenStateChange
		return ELM_OnVehicleSirenStateChange(playerid, vehicleid, newstate);
	#else
		return 1;
	#endif
}
#if defined _ALS_OnVehicleSirenStateChange
	#undef OnVehicleSirenStateChange
#else
	#define _ALS_OnVehicleSirenStateChange
#endif
#define OnVehicleSirenStateChange ELM_OnVehicleSirenStateChange
#if defined ELM_OnVehicleSirenStateChange
	forward ELM_OnVehicleSirenStateChange(playerid, vehicleid, newstate);
#endif

// Hook OnVehicleSpawn to reset status
public OnVehicleSpawn(vehicleid)
{
	if(vELMActive[vehicleid])
	{
		ToggleEmergencyLights(vehicleid, false);
	}

	#if defined ELM_OnVehicleSpawn
		return ELM_OnVehicleSpawn(vehicleid);
	#else
		return 1;
	#endif
}
#if defined _ALS_OnVehicleSpawn
	#undef OnVehicleSpawn
#else
	#define _ALS_OnVehicleSpawn
#endif
#define OnVehicleSpawn ELM_OnVehicleSpawn
#if defined ELM_OnVehicleSpawn
	forward ELM_OnVehicleSpawn(vehicleid);
#endif

// Hook OnVehicleDeath to reset status
public OnVehicleDeath(vehicleid, killerid)
{
	if(vELMActive[vehicleid])
	{
		ToggleEmergencyLights(vehicleid, false);
	}

	#if defined ELM_OnVehicleDeath
		return ELM_OnVehicleDeath(vehicleid, killerid);
	#else
		return 1;
	#endif
}
#if defined _ALS_OnVehicleDeath
	#undef OnVehicleDeath
#else
	#define _ALS_OnVehicleDeath
#endif
#define OnVehicleDeath ELM_OnVehicleDeath
#if defined ELM_OnVehicleDeath
	forward ELM_OnVehicleDeath(vehicleid, killerid);
#endif
