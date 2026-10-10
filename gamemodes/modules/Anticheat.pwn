stock OnPlayerNOPEngine(playerid)
{
	if(!IsPlayerConnected(playerid))
	    return true;

 	if((gettime() - LastCheatDetection[playerid][HACKS_TYPE_NOP]) < AC_COOLDOWN)
	    return true;

	LastCheatDetection[playerid][HACKS_TYPE_NOP] = gettime();

	SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmWarn(1): [NOP Hacks] %s (%d) is driving a vehicle when the engine should be off.", ReturnName(playerid), playerid);

    SQL_LogAction(playerid, "[NOP Hacks] %s (%d) is driving a vehicle when the engine should be off.", ReturnName(playerid), playerid);
	return true;
}

stock OnPlayerSpeedHack(playerid, type, Float:speed, Float:X, Float:Y, Float:Z)
{
	if(!IsPlayerConnected(playerid))
	    return true;

 	if((gettime() - LastCheatDetection[playerid][HACKS_TYPE_SPEED]) < AC_COOLDOWN)
	    return true;

	LastCheatDetection[playerid][HACKS_TYPE_SPEED] = gettime();

	new Float:velocity = floatsqroot(X * X + Y * Y + Z * Z);

	switch(type)
	{
	    case 0: //OnFoot
	    {
			SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmWarn(1): [Foot Speed] Player %s (%d) velocity %.4f / KMH %.0f on foot CurrState: 1", ReturnName(playerid), playerid, velocity, speed);

            SQL_LogAction(playerid, "[Foot Speed] Player %s (%d) velocity %.4f / KMH %.0f on foot CurrState: 1", ReturnName(playerid), playerid, velocity, speed);
	    }
	    case 1: //InVehicle
	    {
	        new vehicleid = GetPlayerVehicleID(playerid);

			SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmWarn(1): [Vehicle Speed] Player %s (%d) velocity %.4f / KMH %.0f on vehicle %s (%d) CurrState: 2", ReturnName(playerid), playerid, velocity, speed, ReturnVehicleName(vehicleid), vehicleid);

            SQL_LogAction(playerid, "[Vehicle Speed] Player %s (%d) velocity %.4f / KMH %.0f on vehicle %s (%d) CurrState: 2", ReturnName(playerid), playerid, velocity, speed, ReturnVehicleName(vehicleid), vehicleid);
		}
	}
	return true;
}

stock OnPlayerTeleport(playerid, Float:distance, seconds)
{
	if(!IsPlayerConnected(playerid))
	    return true;

	LastCheatDetection[playerid][HACKS_TYPE_TELEPORT] = gettime();

	SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmWarn(1): [TP] Player %s (%d) has moved %.0f meters in %d seconds.", ReturnName(playerid), playerid, distance, seconds);

    SQL_LogAction(playerid, "[TP] Player %s (%d) has moved %.0f meters in %d seconds.", ReturnName(playerid), playerid, distance, seconds);
    return true;
}

stock OnPlayerWeaponHack(playerid, weaponid, ammo, custom_seconds)
{
	if(!IsPlayerConnected(playerid))
	    return true;

	if(custom_seconds != -1)
	{
		if((gettime() - LastCheatDetection[playerid][HACKS_TYPE_WEAPON]) < custom_seconds)
		    return true;
	}
	else
	{
		if((gettime() - LastCheatDetection[playerid][HACKS_TYPE_WEAPON]) < AC_COOLDOWN)
		    return true;
	}

	LastCheatDetection[playerid][HACKS_TYPE_WEAPON] = gettime();

	SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmWarn(1): %s (%d) has a %s but shouldn't have, ammo: %d", ReturnName(playerid), playerid, ReturnWeaponName(weaponid), ammo);

    SQL_LogAction(playerid, "%s (%d) has a %s but shouldn't have, ammo: %d", ReturnName(playerid), playerid, ReturnWeaponName(weaponid), ammo);
	return true;
}

stock OnPlayerAmmoHack(playerid, weaponid, has, should, custom_seconds)
{
	if(!IsPlayerConnected(playerid))
	    return true;

	if(custom_seconds != -1)
	{
		if((gettime() - LastCheatDetection[playerid][HACKS_TYPE_WEAPON]) < custom_seconds)
		    return true;
	}
	else
	{
		if((gettime() - LastCheatDetection[playerid][HACKS_TYPE_WEAPON]) < AC_COOLDOWN)
		    return true;
	}

	LastCheatDetection[playerid][HACKS_TYPE_WEAPON] = gettime();

	SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmWarn(1): %s (%d) has %d bullets in their %s, should have %d.", ReturnName(playerid), playerid, has, ReturnWeaponName(weaponid), should);

	SQL_LogAction(playerid, "%s (%d) has %d bullets in their %s, should have %d.", ReturnName(playerid), playerid, has, ReturnWeaponName(weaponid), should);
	return true;
}
