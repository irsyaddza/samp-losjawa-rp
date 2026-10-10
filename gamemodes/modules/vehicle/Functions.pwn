stock encode_tires(tire1, tire2, tire3, tire4)
{
	return tire1 | (tire2 << 1) | (tire3 << 2) | (tire4 << 3);
}
stock encode_tires_bike(rear, front)
{
	return rear | (front << 1);
}

stock IsStingerVehicle(vehicleid)
{
	if(IsAPlane(vehicleid) || IsABoatModel(vehicleid)) return false;
	return true;
}

stock IsAHelicopter(carid)
{
	switch(GetVehicleModel(carid))
	{
		case 548, 425, 417, 487, 488, 497, 563, 447, 469:
			return true;
	}
	return false;
}

stock IsAPlane(carid)
{
	switch(GetVehicleModel(carid))
	{
		case 592, 577, 511, 512, 593, 520, 553, 476, 519, 460, 513, 548, 425, 417, 487, 488, 497, 563, 447, 469:
			return true;
	}
	return false;
}

stock TwoPointCompare(Float:radi, Float:ox, Float:oy, Float:oz, Float:x, Float:y, Float:z)
{
	new Float:tempposx, Float:tempposy, Float:tempposz;

	tempposx = (ox -x);
	tempposy = (oy -y);
	tempposz = (oz -z);

	if(((tempposx < radi) && (tempposx > -radi)) && ((tempposy < radi) && (tempposy > -radi)) && ((tempposz < radi) && (tempposz > -radi)))
	{
		return true;
	}
	return 0;
}

stock GetAvailableSeat(vehicleid, start = 1)
{
	new seats = GetVehicleMaxSeats(vehicleid);

	for(new i = start; i < seats; ++i)
	{
		if(!IsVehicleSeatUsed(vehicleid, i))
		{
		    return i;
		}
	}
	return -1;
}

stock GetVehicleMaxSeats(vehicleid)
{
    new const g_arrMaxSeats[] = 
	{
		4, 2, 2, 2, 4, 4, 1, 2, 2, 4, 2, 2, 2, 4, 2, 2, 4, 2, 4, 2, 4, 4, 2, 2, 2, 1, 4, 4, 4, 2,
		1, 7, 1, 2, 2, 0, 2, 7, 4, 2, 4, 1, 2, 2, 2, 4, 1, 2, 1, 0, 0, 2, 1, 1, 1, 2, 2, 2, 4, 4,
		2, 2, 2, 2, 1, 1, 4, 4, 2, 2, 4, 2, 1, 1, 2, 2, 1, 2, 2, 4, 2, 1, 4, 3, 1, 1, 1, 4, 2, 2,
		4, 2, 4, 1, 2, 2, 2, 4, 4, 2, 2, 1, 2, 2, 2, 2, 2, 4, 2, 1, 1, 2, 1, 1, 2, 2, 4, 2, 2, 1,
		1, 2, 2, 2, 2, 2, 2, 2, 2, 4, 1, 1, 1, 2, 2, 2, 2, 7, 7, 1, 4, 2, 2, 2, 2, 2, 4, 4, 2, 2,
		4, 4, 2, 1, 2, 2, 2, 2, 2, 2, 4, 4, 2, 2, 1, 2, 4, 4, 1, 0, 0, 1, 1, 2, 1, 2, 2, 1, 2, 4,
		4, 2, 4, 1, 0, 4, 2, 2, 2, 2, 0, 0, 7, 2, 2, 1, 4, 4, 4, 2, 2, 2, 2, 2, 4, 2, 0, 0, 0, 4,
		0, 0
	};

	new model = GetVehicleModel(vehicleid);

	if(400 <= model <= 611)
	    return g_arrMaxSeats[model - 400];

	return 0;
}

stock IsVehicleSeatUsed(vehicleid, seat)
{
	foreach (new i : VehicleOccupant(vehicleid))
	{
		if(GetPlayerVehicleSeat(i) == seat)
		{
	    	return true;
		}
	}

	return false;
}

SetVehicleDamageStatus(vehicleid, damage1, damage2, damage3, damage4)
{
    UpdateVehicleDamageStatus(vehicleid, damage1, damage2, damage3, damage4);
    return true;
}

CountVehiclePlayers(vehicleid)
{
	new count;

	foreach (new i : VehicleOccupant(vehicleid))
	{
		if(GetPlayerState(i) != PLAYER_STATE_DRIVER)
		{
			count++;
		}
	}

	return count;
}

GetRequiredTruckerRank(modelid)
{
	switch(modelid)
	{
	    case 600, 605, 543, 422, 478, 554: return 0;
	    case 413, 459, 482: return 1;
	    case 440, 498: return 2;
	    case 499, 414, 578, 443, 428: return 3;
	    case 456, 455: return 4;
	    case 403, 514, 515: return 5;
	}
	return -1;
}

IsTrucker(vehicleid)
{
	return (GetRequiredTruckerRank(GetVehicleModel(vehicleid)) != -1);
}

IsABoatModel(model)
{
	switch (model)
	{
		case 430, 446, 452, 453, 454, 472, 473, 484, 493, 595:
			return true;
	}
	return false;
}

IsNearBoatID(playerid)
{
	foreach (new c : StreamedVehicle[playerid])
	{
		switch(GetVehicleModel(c))
		{
			case 430, 446, 452, 453, 454, 472, 473, 484, 493, 595:
			{
				if(IsPlayerInRangeOfVehicle(playerid, c, 7.0))
				{
					return c;
				}
			}
		}
	}
	return -1;
}

IsVehicleRental(vehicleid)
{
	for(new c = 0; c < sizeof(CarRent); ++c)
	{
		if(vehicleid == CarRent[c])
		{
			return true;
		}
	}

	return false;
}

IsVehicleDMV(vehicleid)
{
	for(new c = 0; c < sizeof(CarDMV); ++c)
	{
		if(vehicleid == CarDMV[c])
		{
			return true;
		}
	}

	return false;
}

GetVehicleRentalPrice(model)
{
	switch(model)
	{
		case 492: 
			return 500;
		case 422:
			return 1000;
		case 473:
		    return 2000;
	}

	return 500;
}


IsVehicleRented(vehicleid)
{
	foreach (new i : Player)
	{
		if(RentCarKey[i] == vehicleid)
			return true;
	}

	return false;
}

IsPlayerInRangeOfVehicle(playerid, vehicleid, Float: radius)
{
	new
		Float:Floats[3];

	GetVehiclePos(vehicleid, Floats[0], Floats[1], Floats[2]);
	return IsPlayerInRangeOfPoint(playerid, radius, Floats[0], Floats[1], Floats[2]);
}

IsVehicleInRangeOfPoint(vehicleid, Float:range, Float:x, Float:y, Float:z)
{
    if(vehicleid == INVALID_VEHICLE_ID) return false;

    new Float:Distance = GetVehicleDistanceFromPoint(vehicleid, x, y, z);

    if(Distance <= range) return true;

    return false;
}

ReturnVehicleModelNameEx(model)
{
	new
	    name[32] = "None"
	;

    if(model < 400 || model > 611)
	    return name;

	format(name, sizeof(name), g_arrVehicleNames[model - 400]);

	for(new i = 0, len = strlen(name); i < len; ++i) if(name[i] == ' ') name[i] = '_';

	return name;
}

ReturnVehicleModelName(model)
{
	new
	    name[32] = "None"
	;

    if(model < 400 || model > 611)
	    return name;

	format(name, sizeof(name), g_arrVehicleNames[model - 400]);
	return name;
}

GetVehicleModelByName(const name[])
{
	if(IsNumeric(name) && (strval(name) >= 400 && strval(name) <= 611))
	    return strval(name);

	for(new i = 0; i < sizeof(g_arrVehicleNames); ++i)
	{
	    if(strfind(g_arrVehicleNames[i], name, true) != -1)
	    {
	        return i + 400;
		}
	}
	return 0;
}

IsPlayerNearHood(playerid, vehicleid)
{
	new
		Float:fX,
		Float:fY,
		Float:fZ;

	GetVehicleHood(vehicleid, fX, fY, fZ);

	return (GetPlayerVirtualWorld(playerid) == GetVehicleVirtualWorld(vehicleid)) && IsPlayerInRangeOfPoint(playerid, 1.5, fX, fY, fZ);
}

IsPlayerNearBoot(playerid, vehicleid)
{
	new
		Float:fX,
		Float:fY,
		Float:fZ;

	GetVehicleBoot(vehicleid, fX, fY, fZ);

	return (GetPlayerVirtualWorld(playerid) == GetVehicleVirtualWorld(vehicleid)) && IsPlayerInRangeOfPoint(playerid, 1.5, fX, fY, fZ);
}

IsPlayerNearDriverDoor(playerid, vehicleid)
{
	new
		Float:fX,
		Float:fY,
		Float:fZ;

	GetVehicleDriverDoor(vehicleid, fX, fY, fZ);

	return (GetPlayerVirtualWorld(playerid) == GetVehicleVirtualWorld(vehicleid)) && IsPlayerInRangeOfPoint(playerid, 2.0, fX, fY, fZ);
}

GetVehicleDriverDoor(vehicleid, &Float:x, &Float:y, &Float:z)
{
	if(!GetVehicleModel(vehicleid) || vehicleid == INVALID_VEHICLE_ID)
	    return (x = 0.0, y = 0.0, z = 0.0), 0;

	new
	    Float:pos[7]
	;

	GetVehicleModelInfo(GetVehicleModel(vehicleid), VEHICLE_MODEL_INFO_SIZE, pos[0], pos[1], pos[2]);
	GetVehiclePos(vehicleid, pos[3], pos[4], pos[5]);
	GetVehicleZAngle(vehicleid, pos[6]);

	switch(GetVehicleModel(vehicleid))
	{
	    case 431, 407, 408, 437:
	    {
		 	x = pos[3] + ((floatsqroot(pos[1] + pos[1])/(floatsqroot(pos[1]))*floatsqroot(pos[1] + pos[1])/(pos[1]/floatsqroot(pos[1]))) * floatsin(-pos[6]+315.0+floatsqroot(pos[1] + pos[1]), degrees));
			y = pos[4] + ((floatsqroot(pos[1] + pos[1])/(floatsqroot(pos[1]))*floatsqroot(pos[1] + pos[1])/(pos[1]/floatsqroot(pos[1]))) * floatcos(-pos[6]+315.0+floatsqroot(pos[1] + pos[1]), degrees));
	    }
	    default:
	    {
			x = pos[3] + ((floatsqroot(pos[1] + pos[1])/(floatsqroot(pos[1]))*floatsqroot(pos[1] + pos[1])/(pos[1]/floatsqroot(pos[0]))) * floatsin(-pos[6]+300.0+floatsqroot(pos[1] + pos[1]), degrees));
			y = pos[4] + ((floatsqroot(pos[1] + pos[1])/(floatsqroot(pos[1]))*floatsqroot(pos[1] + pos[1])/(pos[1]/floatsqroot(pos[0]))) * floatcos(-pos[6]+300.0+floatsqroot(pos[1] + pos[1]), degrees));
	    }
	}

	z = pos[5];
	return true;
}

GetVehicleBootInside(vehicleid, &Float:x, &Float:y, &Float:z)
{
	if(!GetVehicleModel(vehicleid) || vehicleid == INVALID_VEHICLE_ID)
	    return (x = 0.0, y = 0.0, z = 0.0), 0;

	new
	    Float:pos[7]
	;

	GetVehicleModelInfo(GetVehicleModel(vehicleid), VEHICLE_MODEL_INFO_SIZE, pos[0], pos[1], pos[2]);
	GetVehiclePos(vehicleid, pos[3], pos[4], pos[5]);
	GetVehicleZAngle(vehicleid, pos[6]);

	x = pos[3] - (floatsqroot(pos[1] + pos[1] - ((pos[1]+pos[1])/2.3)) * floatsin(-pos[6], degrees));
	y = pos[4] - (floatsqroot(pos[1] + pos[1] - ((pos[1]+pos[1])/2.3)) * floatcos(-pos[6], degrees));
 	z = pos[5];
	return true;
}

GetVehicleBoot(vehicleid, &Float:x, &Float:y, &Float:z)
{
	if(!GetVehicleModel(vehicleid) || vehicleid == INVALID_VEHICLE_ID)
	    return (x = 0.0, y = 0.0, z = 0.0), 0;

	new
	    Float:pos[7]
	;

	GetVehicleModelInfo(GetVehicleModel(vehicleid), VEHICLE_MODEL_INFO_SIZE, pos[0], pos[1], pos[2]);
	GetVehiclePos(vehicleid, pos[3], pos[4], pos[5]);
	GetVehicleZAngle(vehicleid, pos[6]);

	x = pos[3] - (floatsqroot(pos[1] + pos[1]) * floatsin(-pos[6], degrees));
	y = pos[4] - (floatsqroot(pos[1] + pos[1]) * floatcos(-pos[6], degrees));
 	z = pos[5];
	return true;
}

GetVehicleHood(vehicleid, &Float:x, &Float:y, &Float:z)
{
    if(!GetVehicleModel(vehicleid) || vehicleid == INVALID_VEHICLE_ID)
	    return (x = 0.0, y = 0.0, z = 0.0), 0;

	new
	    Float:pos[7]
	;

	GetVehicleModelInfo(GetVehicleModel(vehicleid), VEHICLE_MODEL_INFO_SIZE, pos[0], pos[1], pos[2]);
	GetVehiclePos(vehicleid, pos[3], pos[4], pos[5]);
	GetVehicleZAngle(vehicleid, pos[6]);

	x = pos[3] + (floatsqroot(pos[1] + pos[1]) * floatsin(-pos[6], degrees));
	y = pos[4] + (floatsqroot(pos[1] + pos[1]) * floatcos(-pos[6], degrees));
 	z = pos[5];
	return true;
}

GetVehicleInside(vehicleid, &Float:x, &Float:y, &Float:z)
{
    if(!GetVehicleModel(vehicleid) || vehicleid == INVALID_VEHICLE_ID)
	    return (x = 0.0, y = 0.0, z = 0.0), 0;

	new
	    Float:pos[7]
	;

	GetVehicleModelInfo(GetVehicleModel(vehicleid), VEHICLE_MODEL_INFO_SIZE, pos[0], pos[1], pos[2]);
	GetVehiclePos(vehicleid, pos[3], pos[4], pos[5]);
	GetVehicleZAngle(vehicleid, pos[6]);

	x = pos[3] - (-0.25 * floatsin(-pos[6], degrees));
	y = pos[4] - (-0.25 * floatcos(-pos[6], degrees));
 	z = pos[5];
	return true;
}

Float:GetVehicleSpeed(vehicleid/*, bool:kmh = true*/)
{
    new Float:x, Float:y, Float:z, Float:speed;
        
    GetVehicleVelocity(vehicleid, x, y, z);
    speed = VectorSize(x, y, z);
    
	return speed;
    //return kmh ? floatround(speed * 195.12) : floatround(speed * 121.30); 
}

GetVehicleDriver(vehicleid)
{
	foreach (new i : VehicleOccupant(vehicleid))
	{
		if(GetPlayerState(i) == PLAYER_STATE_DRIVER)
		{
			return i;
		}
	}

	return INVALID_PLAYER_ID;
}

Float:GetVehicleConsumptionPerSecond(vehicleid, Float: speed)
{
	return (floatdiv(speed, 3600)) / (float(20) * GetVehicleDataFuelRate(GetVehicleModel(vehicleid)));
}

IsEngineVehicle(vehicleid)
{
	static const g_aEngineStatus[] =
	{
	    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1,
	    1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	    1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	    1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	    1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1,
	    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	    1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	    1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1,
	    1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0
	};

    new modelid = GetVehicleModel(vehicleid);

    if(modelid < 400 || modelid > 611)
        return 0;

    return (g_aEngineStatus[modelid - 400]);
}

GetLockStatus(vehicleid)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);

	if(doors != 1)
		return 0;

	return true;
}

GetLightStatus(vehicleid)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);

	if(lights != 1)
		return 0;

	return true;
}

SetLightStatus(vehicleid, bool:status)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);
	return SetVehicleParamsEx(vehicleid, engine, status, alarm, doors, bonnet, boot, objective);
}

GetEngineStatus(vehicleid) 
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);

	if(engine != 1)
		return 0;

	return true;
}

SetEngineStatus(vehicleid, bool:status)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

    CoreVehicles[vehicleid][vehicleEngineStamp] = gettime();
	CoreVehicles[vehicleid][vehicleEngineStatus] = status;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);
	return SetVehicleParamsEx(vehicleid, status, lights, alarm, doors, bonnet, boot, objective);
}

GetHoodStatus(vehicleid)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);

	if(bonnet != 1)
		return 0;

	return true;
}

SetHoodStatus(vehicleid, bool:status)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);
	return SetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, status, boot, objective);
}

GetTrunkStatus(vehicleid)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);

	if(boot != 1)
		return 0;

	return true;
}

SetTrunkStatus(vehicleid, bool:status)
{
	new
	    engine,
	    lights,
	    alarm,
	    doors,
	    bonnet,
	    boot,
	    objective;

	GetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, boot, objective);
	return SetVehicleParamsEx(vehicleid, engine, lights, alarm, doors, bonnet, status, objective);
}

IsDoorVehicle(vehicleid)
{
	switch (GetVehicleModel(vehicleid))
	{
		case 400..424, 426..429, 431..440, 442..445, 451, 455, 456, 458, 459, 466, 467, 470, 474, 475:
		    return 1;

		case 477..480, 482, 483, 486, 489, 490..492, 494..496, 498..500, 502..508, 514..518, 524..529, 533..536:
		    return 1;

		case 540..547, 549..552, 554..562, 565..568, 573, 575, 576, 578..580, 582, 585, 587..589, 596..605, 609:
			return true;
	}
	return 0;
}
