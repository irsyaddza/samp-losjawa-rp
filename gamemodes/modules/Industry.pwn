// Defines

#define MAX_ITEM_STORAGE (70)

// Variables

new const g_arrIndItemNames[26][15] =
{
	"dyes","gunpowder","coins","scrap metal","wood logs","cotton","milk","beverages","meat","cereal","eggs","appliances","clothes",
	"fuel","furniture","fruit","transformer","vehicles", "aggregate", "weapons", "steel shapes","paper", "bricks", "car parts", "meal", "malt"
};

new const g_arrIndItemProperNames[26][15] =
{
	"Dyes","Gunpowder","Coins","Scrap metal","Wood logs","Cotton","Milk","Beverages","Meat","Cereal","Eggs","Appliances","Clothes",
	"Fuel","Furniture","Fruit","Transformer","Vehicles", "Aggregate", "Weapons", "Steel shapes","Paper", "Bricks", "Car parts", "Meal", "Malt"
};

new const g_arrIndustryNames[31][35] = 
{
	"The Ship", "FleischBerg Distribution Hub", "Easter Bay Chemicals", "San Andreas Federal Mint", "Whetstone Scrap Yard", "The Panopticon Forest - West", "The Panopticon Forest - East",
	"The Impounder's Farm", "The Farm On a Rock", "The Flint Range Farm", "The Beacon Hill Eggs", "EasterBoard Farm", "The Palomino Farm", "The Leafy Hollow Orchards", "The Hilltop Farm",
	"Fort Carson Quarry", "San Andreas Federal Weapon Factory", "San Andreas Steel Mill", "Angel Pine Sawmill", "Doherty Textile Factory", "Green Palms Refinery", "SA Food Processing Plant",
	"Ocean Docks Concrete Plant", "Fort Carson Distillery", "Las Payasdas Malt House", "Shafted Appliances", "Solarin Autos", "Rockshore Construction Site", "Doherty Construction Site",
	"Bone County Substation", "Sherman Dam Powerplant"
};

enum E_INDUSTRY_DATA
{
	in_close,
	in_type // 0 - Primary, 1 - Secondary, 2 - Special
}

enum E_STORAGE_DATA
{
	in_id,
	Float:in_posx,
	Float:in_posy,
	Float:in_posz,
	in_item,
	in_industryid,
	in_trading_type, // 0 for sale, 1 wanted
	in_price,
	in_consumption,
	in_stock,
	in_maximum,
	Text3D:in_label,
	in_pickup
};

new IndustryData[MAX_INDUSTRY][E_INDUSTRY_DATA];
new StorageData[MAX_ITEM_STORAGE][E_STORAGE_DATA];
new Iterator:Industry<MAX_ITEM_STORAGE>;

// Functions

SetupIndustry()
{
	for(new i = 0; i != MAX_INDUSTRY; ++i)
	{
		if(i > 26)
		{
	    	IndustryData[i][in_type] = 2;
		}
		else if(i > 15)
		{
		    IndustryData[i][in_type] = 1;
		}
		else IndustryData[i][in_type] = 0;

		IndustryData[i][in_close] = 0;
	}
}

ShowIndustry(playerid, industryid)
{
	gstr[0] = EOS;

	format(gstr, sizeof(gstr),
		"{FFFFFF}Welcome to {A4D247}%s{FFFFFF}!\n\nThe industry is currently %s{FFFFFF}.\n\n{A4D247}For Sale:\n{B4B5B7}Commodity\tPrice\tProduction/Hour\tIn (storage size)\n",
		g_arrIndustryNames[industryid],
		(IndustryData[industryid][in_close]) ? ("{CD324D}closed") : ("{A4D247}open")
	);

	foreach (new i : Industry)
	{
		if(StorageData[i][in_id] && !StorageData[i][in_trading_type] && StorageData[i][in_industryid] == industryid) //For Sale
		{
		    new type = IndustryData[industryid][in_type];

			if(type == 2) continue;

		    if(!type)
		    {
				format(gstr, sizeof(gstr),
				"%s{FFFFFF}%s%s$%d\t+%d\t\t\t%d %s {B4B5B7}(%d)\n",
				gstr,
				g_arrIndItemProperNames[StorageData[i][in_item]],
				(strlen(g_arrIndItemProperNames[StorageData[i][in_item]]) < 8) ? ("\t\t"):("\t"),
				StorageData[i][in_price],
				StorageData[i][in_consumption],
				StorageData[i][in_stock],
				ReturnCargoUnits(StorageData[i][in_item]),
				StorageData[i][in_maximum]);
			}
			else
			{
				format(gstr, sizeof(gstr),
				"%s{FFFFFF}%s%s$%d\t+%d {B4B5B7}per resource{FFFFFF}\t%d %s {B4B5B7}(%d)\n",
				gstr,
				g_arrIndItemProperNames[StorageData[i][in_item]],
				(strlen(g_arrIndItemProperNames[StorageData[i][in_item]]) < 8) ? ("\t\t"):("\t"),
				StorageData[i][in_price],
				StorageData[i][in_consumption],
				StorageData[i][in_stock],
				ReturnCargoUnits(StorageData[i][in_item]),
				StorageData[i][in_maximum]);
		    }
		}
	}

	format(gstr, sizeof(gstr), "%s\n{A4D247}Wanted:\n{B4B5B7}Comodity\tPrice\tProduction/Hour\tIn Stock(storage size)\n", gstr);

	foreach (new i : Industry)
	{
		if(StorageData[i][in_id] && StorageData[i][in_trading_type] && StorageData[i][in_industryid] == industryid) //Wanted
		{
		    new type = IndustryData[industryid][in_type];

		    if(!type)
		    {
				format(gstr, sizeof(gstr), "%s{B4B5B7}This is a primary industry and does not need any resources.", gstr);
				break;
			}
			else
			{
				format(gstr, sizeof(gstr),
				"%s{FFFFFF}%s%s$%d\t-%d {B4B5B7}units{FFFFFF}%s%d %s {B4B5B7}(%d)\n",
				gstr,
				g_arrIndItemProperNames[StorageData[i][in_item]],
				(strlen(g_arrIndItemProperNames[StorageData[i][in_item]]) < 8) ? ("\t\t"):("\t"),
				StorageData[i][in_price],
				StorageData[i][in_consumption],
				(StorageData[i][in_consumption] < 10) ? ("\t\t\t"):("\t\t"),
				StorageData[i][in_stock],
				ReturnCargoUnits(StorageData[i][in_item]),
				StorageData[i][in_maximum]);
		    }
		}
	}

	SetPVarInt(playerid, "IndustrySelected", industryid);

    Dialog_Show(playerid, TruckerPDAProcess, DIALOG_STYLE_MSGBOX, g_arrIndustryNames[industryid], gstr, "Proceed", "Exit");
}

ShowCargoShip(playerid)
{
	gstr[0] = EOS;

	format(gstr, sizeof(gstr),
	"{FFFFFF}Welcome to {A4D247}The Ship{FFFFFF}!\n\nThe ship is currently %s{FFFFFF}.\n\nThe following times are approximate, not exact!\n\n",
	(IndustryData[0][in_close]) ? ("{CD324D}not in the port") : ("{A4D247}docked"));

	new gShipHour, gShipMinute, gShipSecond;

	if(IndustryData[0][in_close])
	{
	    TimestampToTime(gShipTime, gShipHour, gShipMinute, gShipSecond);

	    format(gstr, sizeof(gstr), "%sShip Will Arrive At:\t%02d:%02d:%02d\n\n", gstr, gShipHour, gShipMinute, gShipSecond);
	}
	else
	{
	    TimestampToTime(gShipTime, gShipHour, gShipMinute, gShipSecond);

	    format(gstr, sizeof(gstr), "%sShip Has Arrived At:\t%02d:%02d:%02d\n", gstr, gShipHour, gShipMinute, gShipSecond);

        TimestampToTime(gShipTime + 2440, gShipHour, gShipMinute, gShipSecond);
		format(gstr, sizeof(gstr), "%sShip Departs At:\t%02d:%02d:%02d\n", gstr, gShipHour, gShipMinute, gShipSecond);

	    TimestampToTime(gShipTime + 2740, gShipHour, gShipMinute, gShipSecond);
	    format(gstr, sizeof(gstr), "%sNext Arrival At:\t%02d:%02d:%02d\n\n", gstr, gShipHour, gShipMinute, gShipSecond);
	}

	format(gstr, sizeof(gstr), "%s{A4D247}For Sale:\n{B4B5B7}The ship doesn't sell anything. It only buys cargo from San Andreas.\n", gstr);
	format(gstr, sizeof(gstr), "%s\n{A4D247}Wanted:\n{B4B5B7}Comodity\t\tPrice\t\tIn (storage size)\n", gstr);

	foreach (new i : Industry)
	{
		if(StorageData[i][in_id] && StorageData[i][in_trading_type] && StorageData[i][in_industryid] == 0) //Wanted
		{
			format(gstr, sizeof(gstr),
				"%s{FFFFFF}%s%s$%d\t\t%d %s {B4B5B7}(%d)\n",
				gstr,
				g_arrIndItemProperNames[StorageData[i][in_item]],
				(strlen(g_arrIndItemProperNames[StorageData[i][in_item]]) < 8) ? ("\t\t\t"):("\t\t"),
				StorageData[i][in_price],
				StorageData[i][in_stock],
				ReturnCargoUnits(StorageData[i][in_item]),
				StorageData[i][in_maximum]
			);
		}
	}

	SetPVarInt(playerid, "IndustrySelected", 0);

    Dialog_Show(playerid, TruckerPDAProcess, DIALOG_STYLE_MSGBOX, "The Ship", gstr, "Navigate", "Exit" );
	return true;
}

ShowAllIndustry(playerid)
{
    gstr[0] = EOS;

	for(new i = 1; i != sizeof(g_arrIndustryNames); ++i)
	{
		format(gstr, sizeof(gstr), "%s%s {B4B5B7}(%s, %s)\n", gstr, g_arrIndustryNames[i], GetIndustryType(i), (IndustryData[i][in_close]) ? ("{CD324D}closed{B4B5B7}") : ("{A4D247}open{B4B5B7}"));
	}

	Dialog_Show(playerid, TruckerPDADetail, DIALOG_STYLE_LIST, "Trucker PDA - All Industries", gstr, "Select", "Back");
}

GetIndustryType(id)
{
	new type[16];

	switch(IndustryData[id][in_type])
	{
	    case 0: format(type, 16, "primary");
	    case 1: format(type, 16, "secondary");
	    case 2: format(type, 16, "special");
	}
	return type;
}

ReturnCargoUnit(cargoid)
{
	new name[16], id = -1;

	id = IsVehicleCargo(cargoid);

	switch(id)
	{
	    case 0: format(name, 16, "tonne");
	    case 1: format(name, 16, "cubic metre");
	    case 2:
		{
	        switch(cargoid)
	        {
	            case 4: format(name, 16, "wood log");
	            case 16: format(name, 16, "transformer");
	            case 17: format(name, 16, "vehicle");
	            case 22: format(name, 16, "brick pallets");
	        }
	    }
	    default: format(name, 16, "container");
	}

	return name;
}

ReturnCargoUnits(cargoid)
{
	new name[16];

	switch(cargoid)
	{
	    //scrap metal, cotton, cereal, malt, aggregate
		case 3, 5, 9, 25, 18: format(name, 16, "tonnes");
		//fuel, dyes
		case 13, 0: format(name, 16, "cubic metres");
		//transformer, vehicles, wood logs, bricks
		case 16: format(name, 16, "transformer");
		case 17: format(name, 16, "vehicles");
		case 4: format(name, 16, "logs");
		case 22: format(name, 16, "pallets");
		//Milk
		case 6: format(name, 16, "litres");
		//weapons, coins
	    case 19, 2: format(name, 16, "strongboxes");
		//other
	    default: format(name, 16, "crates");
	}
	return name;
}

Dialog:VehicleCargoStorage(playerid, response, listitem, inputtext[])
{
	if(response)
	{
	    if(IsPlayerInAnyVehicle(playerid)) return SendClientMessage(playerid, COLOR_WHITE, "You need to be on foot.");

        if(carryCrate[playerid] == -1 && !IsPlayerAttachedObjectSlotUsed(playerid, 9))
		{
			new count, cargoid, vehicleid = Car_Nearest(playerid);

			if(vehicleid && (GetTrunkStatus(vehicleid) || IsVehicleTrunkBroken(vehicleid)) && IsPlayerNearBoot(playerid, vehicleid))
			{
				for(new i = 0; i < MAX_TRUCKER_ITEMS; ++i)
				{
					if(CoreVehicles[vehicleid][vehicleCrate][i])
					{
						if(listitem == count)
						{
							cargoid = i;
							break;
						}
						
						count++;
					}
				}

                if(IsVehicleCargo(cargoid) == -1)
				{
					if(CoreVehicles[vehicleid][vehicleCrate][cargoid])
					{
					    CoreVehicles[vehicleid][vehicleCrate][cargoid]--;
					    UpdateVehicleObject(vehicleid);

					    carryCrate[playerid] = cargoid;

						ApplyAnimation(playerid, "CARRY","liftup105", 4.1, 0, 0, 0, 0, 0, 1);

						SetTimerEx("PickupCrate", 200, false, "ii", playerid, (!strcmp(ReturnCargoUnits(cargoid), "strongboxes", true) ? 1 : 0));
					}
					else SendClientMessage(playerid, COLOR_WHITE, "Nothing at all.");
				}
				else SendClientMessage(playerid, COLOR_WHITE, "You cannot pickup this type of crate.");
			}
			else SendClientMessage(playerid, COLOR_WHITE, "No{FFFF00} unlocked{FFFFFF} vehicle's trunk found around you.");
		}
		else SendClientMessage(playerid, COLOR_WHITE, "You're already holding a crate.");
	}
	return true;
}

forward PlaceCrate(playerid);
public PlaceCrate(playerid)
{
	SetPlayerSpecialAction(playerid, SPECIAL_ACTION_NONE);
	RemovePlayerAttachedObject(playerid, 9);
}

forward PickupCrate(playerid, type);
public PickupCrate(playerid, type)
{
	SetPlayerSpecialAction(playerid, SPECIAL_ACTION_CARRY);

	if(type)
		SetPlayerAttachedObject(playerid, 9, 964, 5, 0.626, 0.164999, 0.115999, -77.2, -16, -83.4 , 1.0000, 1.0000, 1.0000);
	else
		SetPlayerAttachedObject(playerid, 9, 2912, 1, -0.019, 0.713999, -0.076, 0, 87.1, -9.4, 1.0000, 1.0000, 1.0000);

	return true;
}

forward PutdownCrate(playerid, id, cargoid);
public PutdownCrate(playerid, id, cargoid)
{
	new cargo_name[32];

	if(!CrateInfo[id][cOn])
	{
		SetPlayerSpecialAction(playerid, SPECIAL_ACTION_NONE);
		RemovePlayerAttachedObject(playerid, 9);

		GetPlayerPos(playerid, CrateInfo[id][cX], CrateInfo[id][cY], CrateInfo[id][cZ]);
		GetXYInFrontOfPlayer(playerid, CrateInfo[id][cX], CrateInfo[id][cY], 1.5);

		CrateInfo[id][cOn] = 1;
		CrateInfo[id][cID] = cargoid;
		CrateInfo[id][cOwned] = PlayerData[playerid][pID];

		new objectid;

		if(!strcmp(ReturnCargoUnits(cargoid), "strongboxes", true))
		{
			objectid = 964;
		}
		else
		{
			objectid = 2912;
		}

		format(cargo_name, 32, "%s", g_arrIndItemNames[cargoid]);

		CrateInfo[id][clabel] = CreateDynamic3DTextLabel(cargo_name, 0xFFFFFFFF,CrateInfo[id][cX], CrateInfo[id][cY], CrateInfo[id][cZ], 100, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, -1, -1, -1, 50.0);
		CrateInfo[id][cObject] = CreateDynamicObject(objectid, CrateInfo[id][cX], CrateInfo[id][cY], CrateInfo[id][cZ] - 1.0, 0.0000000, 0.0000000, 0.0000000);

		Streamer_Update(playerid, STREAMER_TYPE_OBJECT);
		return true;
	}
	return false;
}

UpdateVehicleObject(vehicleid)
{
	new model = GetVehicleModel(vehicleid), count;

	switch(model)
	{
	    case 422:
		{
	        count = CountVehicleSlot(vehicleid);

			for(new i = 0; i != 3; ++i)
			{
			    if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]))
				{
			    	DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]);
				}

				if(i < count)
				{
					CoreVehicles[vehicleid][vehicleObj][i] = CreateDynamicObject(2912, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);

					switch(i)
					{
						case 0: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.344999, -0.769999, -0.294999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
						case 1: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.364999, -0.769999, -0.299999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
						case 2: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.159999, -1.839998, -0.299999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
					}
				}

			}
	    }
	    case 543, 605:
		{
	        count = CountVehicleSlot(vehicleid);

			for(new i = 0; i != 2; ++i)
			{
			    if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]))
				{
			    	DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]);
				}

				if(i < count)
				{
					CoreVehicles[vehicleid][vehicleObj][i] = CreateDynamicObject(2912, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);

					switch(i)
					{
						case 0: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.344999, -0.769999, -0.294999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
						case 1: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.344999, -0.769999, -0.294999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
					}

				}
			}
	    }
		case 600:
		{
		    count = CountVehicleSlot(vehicleid);

			for(new i = 0; i != 2; ++i)
			{
			    if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]))
				{
			    	DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]);
				}

				if(i < count)
				{
					CoreVehicles[vehicleid][vehicleObj][i] = CreateDynamicObject(2912, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);

					switch(i)
					{
						case 0: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.344999, -0.92, -0.294999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
						case 1: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.364999, -0.92, -0.299999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
					}
				}

			}
		}
		case 530:
		{
		    count = CountVehicleSlot(vehicleid);

			for(new i = 0; i != 3; ++i)
			{
			    if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]))
				{
			    	DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]);
				}

				if(i < count)
				{
					CoreVehicles[vehicleid][vehicleObj][i] = CreateDynamicObject(2912, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);

					switch(i)
					{
						case 0: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.354999, 0.489999, -0.059999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
						case 1: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.344999, 0.489999, -0.059999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
						case 2: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.009999, 0.484999, 0.634999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 | CRATE
					}
				}

			}
		}
		case 478:
		{
			count = CountVehicleSlot(vehicleid);

			for(new i = 0; i != 4; ++i)
			{
			    if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]))
				{
			    	DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]);
				}

				if(i < count)
				{
					CoreVehicles[vehicleid][vehicleObj][i] = CreateDynamicObject(2912, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);

					switch(i)
					{
						case 0: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.354999, -0.949999, 0.000000, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
						case 1: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.354999, -0.949999, 0.000000, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
						case 2: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.354999, -1.664998, 0.000000, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
						case 3: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.354999, -1.664998, 0.000000, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
					}
				}

			}
		}
		case 554:
		{
            if(CoreVehicles[vehicleid][vehicleCrate][22])
            {
                //bricks
				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]))
				{
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]);
				}

                CoreVehicles[vehicleid][vehicleObj][0] = CreateDynamicObject(1685, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
                AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][0], vehicleid, 0.000000, -1.754998, 0.859999, 0.000000, 0.000000, 0.000000); //Object Model: 1685 |
            }
            else
			{
	      		count = CountVehicleSlot(vehicleid);

				for(new i = 0; i != 4; ++i)
				{
				    if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]))
					{
				    	DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][i]);
					}

					if(i < count)
					{
						CoreVehicles[vehicleid][vehicleObj][i] = CreateDynamicObject(2912, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);

						switch(i)
						{
							case 0: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.294999, -0.989999, -0.239999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
							case 1: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.409999, -1.694998, -0.239999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
							case 2: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.295000, -1.694998, -0.239999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
							case 3: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, -0.414999, -2.405007, -0.239999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
							case 4: AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][i], vehicleid, 0.295000, -2.410007, -0.239999, 0.000000, 0.000000, 0.000000); //Object Model: 2912 |
						}
					}

				}
			}
		}
		case 578: // DFT-30
		{
            if(CoreVehicles[vehicleid][vehicleCrate][4])  // wood logs
			{
				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]);

				CoreVehicles[vehicleid][vehicleObj][0] = CreateDynamicObject(18609, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][0], vehicleid, 0.205000, -5.895015, 0.839999, 0.000000, 0.000000, 3.900000);
            }
			else if(CoreVehicles[vehicleid][vehicleCrate][22]) // bricks
			{
				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]);

				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][1]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][1]);

				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][2]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][2]);

				CoreVehicles[vehicleid][vehicleObj][0] = CreateDynamicObject(1685, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				CoreVehicles[vehicleid][vehicleObj][1] = CreateDynamicObject(1685, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				CoreVehicles[vehicleid][vehicleObj][2] = CreateDynamicObject(1685, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][0], vehicleid, 0.000000, -0.269999, 0.459999, 0.000000, 0.000000, 0.000000); //Object Model: 1685 |
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][1], vehicleid, 0.000000, -2.044999, 0.459999, 0.000000, 0.000000, 0.000000); //Object Model: 1685 |
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][2], vehicleid, 0.000000, -3.820039, 0.459999, 0.000000, 0.000000, 0.000000); //Object Model: 1685 |
            }
			else if(CoreVehicles[vehicleid][vehicleCrate][16]) // transformer
			{
				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]);

				CoreVehicles[vehicleid][vehicleObj][0] = CreateDynamicObject(3273, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][0], vehicleid, -0.000000, -0.404999, 0.799999, 0.000000, 90.449951, -90.449951); //Object Model: 3273 |
			}
		}
		case 443: // Packer
		{
            if(CoreVehicles[vehicleid][vehicleCrate][17] == 1)
			{
				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]);

				CoreVehicles[vehicleid][vehicleObj][0] = CreateDynamicObject(3593, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][0], vehicleid, 0.205000, -5.895015, 0.839999, 0.000000, 0.000000, 3.900000);
			}
			else
			{
				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][0]);

				if(IsValidDynamicObject(CoreVehicles[vehicleid][vehicleObj][1]))
					DestroyDynamicObject(CoreVehicles[vehicleid][vehicleObj][1]);

				CoreVehicles[vehicleid][vehicleObj][0] = CreateDynamicObject(3593, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][0], vehicleid, 0.000000, 0.344999, 1.819998, 15.074999, 0.000000, 0.000000); //Object Model: 3593 |  CAR DESTROY
				CoreVehicles[vehicleid][vehicleObj][1] = CreateDynamicObject(3593, 0.0, 0.0, -20.0, 0.0, 0.0, 0.0);
				AttachDynamicObjectToVehicle(CoreVehicles[vehicleid][vehicleObj][1], vehicleid, -0.005000, -6.455012, 0.024998, 15.074999, 0.000000, 0.000000); //Object Model: 3593 |  CAR DESTROY
			}
		}
	}
}

IsVehicleTransport(vehicleid, cargoid)
{
    new trailerid = GetVehicleTrailer(vehicleid), model = GetVehicleModel(vehicleid);

	switch(model)
	{
	    case 403:
		{
			if(trailerid)
			{
				switch(GetVehicleModel(trailerid))
				{
				    case 435, 591: // Article Trailer 1 & Article Trailer 2
					{
						switch(cargoid)
						{
						    //crates, bricks
			 				case 1, 20, 12, 7, 24, 23, 11, 15, 8, 10, 22: return true;
			            }
				    }
				    case 584: // Petrol Trailer
					{
						switch(cargoid)
						{
							//fuel, milk, dyes
							case 13, 6, 0: return true;
						}
				    }
				    case 450: // Dump Trailer
					{
						switch(cargoid)
						{
						    //scrap metal, cotton, cereal, malt, aggregate
							case 3, 5, 9, 25, 18: return true;
						}
				    }
				}
			}
	    }
	    case 443:
		{
			if(cargoid == 17) return true; // vehicle
		}
	    case 578:
		{
			switch(cargoid)
			{
				//transformer, vehicles, wood logs, bricks
				case 16, 17, 4, 22: return true;
			}
	    }
	    case 428:
		{
			switch(cargoid)
			{
				//coins, weapons
				case 2, 19: return true;
			}
	    }
	    case 455: // Flatbed
		{
			switch(cargoid)
			{
				//scrap metal, cotton, cereal, malt, aggregate
				case 3, 5, 9, 25, 18: return true;
			}
	    }
	    case 456, 499, 414, 554: // Yankee, Benson, Mule, Yosemite
		{
			switch(cargoid)
			{
			    //crates, bricks
 				case 1, 20, 12, 7, 24, 23, 11, 15, 8, 10, 22: return true;
            }
	    }
		case 498, 440, 482, 459, 413, 478, 422, 543, 605, 600:
		{
			switch(cargoid)
			{
			    //crates
 				case 1, 20, 12, 7, 24, 23, 11, 15, 8, 10: return true;
            }
		}
	}
	return false;
}

IsVehicleCargo(cargoid) // Loose Material 0 | Liquids 1 | Other 2
{
	switch(cargoid)
	{
	    //scrap metal, cotton, cereal, malt, aggregate
		case 3, 5, 9, 25, 18: return 0;
		//fuel, milk, dyes
		case 13, 6, 0: return 1;
		//transformer, vehicles, wood logs
		case 16, 17, 4: return 2;
	}
	return -1;
}

GetVehicleCargoSlot(model)
{
	switch(model)
	{
		case 600, 543, 605, 443: return 2;
		case 422: return 3;
		case 478: return 4;
		case 554: return 6;
		case 413, 459, 482: return 10;
		case 440, 498: return 12;
		case 499, 428, 455: return 16;
		case 414, 578: return 18;
		case 456: return 24;
		case 435, 591: return 36;
		case 450: return 30;
		case 584: return 40;
	}
	return -1;
}

CountVehicleSlot(vehicleid)
{
	new count;

	for(new i = 0; i < MAX_TRUCKER_ITEMS; ++i)
	{
		if(CoreVehicles[vehicleid][vehicleCrate][i])
		{
		    if(i == 22) count += CoreVehicles[vehicleid][vehicleCrate][i] * 6;
		    else if(i == 4 || i == 16) count += CoreVehicles[vehicleid][vehicleCrate][i] * 18;
			else count += CoreVehicles[vehicleid][vehicleCrate][i];
		}
	}

	return count;
}

GetCargoSlot(cargoid)
{
	if(cargoid == 22) return 6;
	else if(cargoid == 4 || cargoid == 16) return 18;
	return true;
}

UpdateStorage(cargoid)
{
	if(!IndustryData[StorageData[cargoid][in_industryid]][in_close])
	{
		if(!IsValidDynamicPickup(StorageData[cargoid][in_pickup])) StorageData[cargoid][in_pickup] = CreateDynamicPickup(1318, 23, StorageData[cargoid][in_posx], StorageData[cargoid][in_posy], StorageData[cargoid][in_posz] + 0.3, 0, 0);

		format(sgstr, sizeof(sgstr),
			"[{A4D247}%s{FFFFFF}] - %s\nCommodity: {E5FF00}%s{FFFFFF}\nPrice: %s / unit\nStock: %d / %d\n{AAAAAA}[IndID: %d | StorageID: %d]",
			g_arrIndustryNames[StorageData[cargoid][in_industryid]],
			(StorageData[cargoid][in_trading_type] == 0) ? ("{A4D247}For Sale{FFFFFF}") : ("{CD324D}Wanted{FFFFFF}"),
			g_arrIndItemProperNames[StorageData[cargoid][in_item]],
			FormatNumber(StorageData[cargoid][in_price]),
			StorageData[cargoid][in_stock], StorageData[cargoid][in_maximum],
			StorageData[cargoid][in_industryid], StorageData[cargoid][in_id]
		);

		if(!IsValidDynamic3DTextLabel(StorageData[cargoid][in_label]))
		{
			StorageData[cargoid][in_label] = CreateDynamic3DTextLabel(sgstr, COLOR_WHITE, StorageData[cargoid][in_posx], StorageData[cargoid][in_posy], StorageData[cargoid][in_posz] + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, 0);
			return 1;
		}

		UpdateDynamic3DTextLabelText(StorageData[cargoid][in_label], COLOR_WHITE, sgstr);
	}
	else
	{
		if(IsValidDynamic3DTextLabel(StorageData[cargoid][in_label])) DestroyDynamic3DTextLabel(StorageData[cargoid][in_label]);
		if(IsValidDynamicPickup(StorageData[cargoid][in_pickup])) DestroyDynamicPickup(StorageData[cargoid][in_pickup]);
	}
	return true;
}

saveStorage(cargoid)
{
	format(gquery, sizeof(gquery), "UPDATE `industry` SET `stock` = '%d' WHERE `id` = %d", StorageData[cargoid][in_stock], StorageData[cargoid][in_id]);
	mysql_pquery(dbCon, gquery);
}

Industry_Nearest(playerid, Float:radius = 2.5)
{
    foreach (new i : Industry)
	{
		if(IsPlayerInRangeOfPoint(playerid, radius, StorageData[i][in_posx], StorageData[i][in_posy], StorageData[i][in_posz]))
		{
			return i;
		}
	}
	return -1;
}

Dialog:TruckerPDA(playerid, response, listitem, inputtext[])
{
	if(response)
	{
		switch(listitem)
		{
		    case 0:
			{
				ShowAllIndustry(playerid);
			}
		    case 1:
			{
				new menu[10], count;

				gstr[0] = EOS;

				format(gstr, sizeof(gstr), " \t \t \t \n");
				format(gstr, sizeof(gstr), "%s{A4D247}Page 1{FFFFFF}\t\t\t\n", gstr);

				SetPVarInt(playerid, "page", 1);

				foreach (new i : Business)
				{
					if(BusinessData[i][bPriceProd] && GetBusinessCargoCanBuy(i) && GetProductCargo(BusinessData[i][bType]) != -1)
					{
						if(count == 10)
						{
							format(gstr, sizeof(gstr), "%s{A4D247}Page 2{FFFFFF}\t\t\t\n", gstr);
							break;
						}

						format(menu, 10, "menu%d", count + 1);

						SetPVarInt(playerid, menu, i);

						format(gstr, sizeof(gstr), "%s%s\t%s / unit\twanted: %d %s\t%s\n", gstr, g_arrIndItemNames[GetProductCargo(BusinessData[i][bType])], FormatNumber(BusinessData[i][bPriceProd]), GetBusinessCargoCanBuy(i), ReturnCargoUnits(GetProductCargo(BusinessData[i][bType])), ClearGameTextColor(BusinessData[i][bInfo]));

						count++;
					}
				}

				if(!count) return Dialog_Show(playerid, ShowOnly, DIALOG_STYLE_MSGBOX, "Trucker PDA - Businesses", "No business needs products.", "Ok", "");

				Dialog_Show(playerid, TruckerPDABusiness, DIALOG_STYLE_TABLIST_HEADERS, "Trucker PDA - Businesses", gstr, "Navigate", "Back");
		    }
		    case 2:
			{
				ShowCargoShip(playerid);
			}
		}
	}
	return true;
}

Dialog:TruckerPDADetail(playerid, response, listitem, inputtext[])
{
	if(response)
	{
	    ShowIndustry(playerid, listitem + 1);
	}
	else Dialog_Show(playerid, TruckerPDA, DIALOG_STYLE_LIST, "Trucker PDA", "{B4B5B7}Show{FFFFFF} All Industries\n{B4B5B7}Show{FFFFFF} Businesses Accepting Cargo\n{B4B5B7}Show{FFFFFF} Ship Information", "Select", "Exit");

	return true;
}

Dialog:TruckerPDAProcess(playerid, response, listitem, inputtext[])
{
    new industryid = GetPVarInt(playerid, "IndustrySelected");

	if(response)
	{
        new menu[10], count;

		gstr[0] = EOS;

		foreach (new i : Industry)
		{
		    if(StorageData[i][in_id] && StorageData[i][in_industryid] == industryid)
			{
		        format(menu, 10, "menu%d", count);
		        SetPVarInt(playerid, menu, i);

				format(gstr, sizeof(gstr), "%s{B4B5B7}Storage of {A4D247}%s{B4B5B7} ({FFFFFF}%s{B4B5B7}, {FFFFFF}$%d{B4B5B7} / unit, {FFFFFF}%d{B4B5B7} / %d)\n", gstr, g_arrIndItemNames[StorageData[i][in_item]], (StorageData[i][in_trading_type]) ? ("wanted"):("for sale"), StorageData[i][in_price], StorageData[i][in_stock], StorageData[i][in_maximum]);
                count++;
			}
		}

		Dialog_Show(playerid, TruckerPDANavigate, DIALOG_STYLE_LIST, "Industry Navigation", gstr, "Navigate", "Back");
	}
	else
	{
	    if(!industryid) return Dialog_Show(playerid, TruckerPDA, DIALOG_STYLE_LIST, "Trucker PDA", "{B4B5B7}Show{FFFFFF} All Industries\n{B4B5B7}Show{FFFFFF} Businesses Accepting Cargo\n{B4B5B7}Show{FFFFFF} Ship Information", "Select", "Exit");

		ShowAllIndustry(playerid);
	}
	return true;
}

Dialog:TruckerPDABusiness(playerid, response, listitem, inputtext[])
{
	if(response)
	{
		new menu[10];

		//Navigate
		if(listitem != 0 && listitem != 11)
		{
			new str_biz[8];
			format(str_biz, 10, "menu%d", listitem);
			new bizid = GetPVarInt(playerid, str_biz);
			SetPlayerRaceCheckpointEx(playerid, 2, RCHECKPOINT_TRUCKER, BusinessData[bizid][bEntranceX], BusinessData[bizid][bEntranceY], BusinessData[bizid][bEntranceZ]);
			return true;
		}

		new currentPage = GetPVarInt(playerid, "page");

		if(!listitem)
		{
			if(currentPage > 1)
			{
				currentPage--;
			}
		}
		else if(listitem == 11)
		{
			currentPage ++;
		}

		new count;

		gstr[0] = EOS;

		format(gstr, sizeof(gstr), " \t \t \t \n");
		format(gstr, sizeof(gstr), "%s{A4D247}Page %d{FFFFFF}\t\t\t\n", gstr, (currentPage == 1) ? 1 : currentPage-1);

		SetPVarInt(playerid, "page", currentPage);

		new skipitem = (currentPage-1) * 10;

		foreach (new i : Business)
		{
			if(BusinessData[i][bPriceProd] && GetBusinessCargoCanBuy(i))
			{
				if(skipitem)
				{
					skipitem--;
					continue;
				}

				if(count == 10)
				{
					format(gstr, sizeof(gstr), "%s{A4D247}Page %d{FFFFFF}\t\t\t\n", gstr, currentPage+1);
					break;
				}

				format(menu, 10, "menu %d", count + 1);

				SetPVarInt(playerid, menu, i);

				format(gstr, sizeof(gstr), "%s%s\t%s / unit\twanted: %d %s\t%s\n", gstr, g_arrIndItemNames[GetProductCargo(BusinessData[i][bType])], FormatNumber(BusinessData[i][bPriceProd]), GetBusinessCargoCanBuy(i), ReturnCargoUnits(GetProductCargo(BusinessData[i][bType])), ClearGameTextColor(BusinessData[i][bInfo]));
			}
		}

		Dialog_Show(playerid, TruckerPDABusiness, DIALOG_STYLE_TABLIST_HEADERS, "Trucker PDA - Businesses", gstr, "Navigate", "Back");
	}
	return true;
}

Dialog:TruckerPDANavigate(playerid, response, listitem, inputtext[])
{
	if(response)
	{
	    new menu[10], storageid;
	    format(menu, 10, "menu%d", listitem);
	    storageid = GetPVarInt(playerid, menu);

		SetPlayerRaceCheckpointEx(playerid, 2, RCHECKPOINT_TRUCKER, StorageData[storageid][in_posx], StorageData[storageid][in_posy], StorageData[storageid][in_posz]);
	}
	else
	{
		new industryid = GetPVarInt(playerid, "IndustrySelected");

		if(industryid) ShowIndustry(playerid, GetPVarInt(playerid, "IndustrySelected"));
		else ShowCargoShip(playerid);
	}
	return true;
}

UpdateShipStorage()
{
 	if(gShipDeparture)
	{
		//StartMovingTimer();

		SetTimer("ShipArrival", 120000, false);

        new gShipHour, gShipMinute, gShipSecond;
	    TimestampToTime(gShipTime, gShipHour, gShipMinute, gShipSecond);
		format(sgstr, sizeof(sgstr), "Arrival: %02d:%02d:%02d", gShipHour, gShipMinute, gShipSecond);

		SetDynamicObjectMaterialText(gShipTextLine1, 0, "OCEAN DOCKS SHIP", OBJECT_MATERIAL_SIZE_256x256, "Arial", 16, 1, 0xFFFFFFFF, 0, 1);
   		SetDynamicObjectMaterialText(gShipTextLine2, 0, "", OBJECT_MATERIAL_SIZE_256x256, "Arial", 16, 1, 0xFFFFFFFF, 0, 1);

		IndustryData[0][in_close] = 1;

		foreach (new i : Industry)
		{
			if(StorageData[i][in_industryid] == 0)
			{
				UpdateStorage(i);
			}
		}
	}
	else
	{
		IndustryData[0][in_close] = 0;

		foreach (new i : Industry)
		{
			if(StorageData[i][in_industryid] == 0)
			{
				StorageData[i][in_stock] = 0;

				UpdateStorage(i);
			}
		}
	}   
}

GetBusinessCargoDesc(index)
{
	return g_arrIndItemNames[index];
}

GetBusinessCargoBuy(bizid)
{
    new cargo = GetProductPerCargo(BusinessData[bizid][bType]);

    return BusinessData[bizid][bMaxProducts]/cargo - floatround((float(BusinessData[bizid][bProducts])/float(cargo)), floatround_ceil);
}

GetBusinessCargoNeeded(bizid)
{
    return floatround(BusinessData[bizid][bTill]/BusinessData[bizid][bPriceProd], floatround_floor);
}

GetBusinessCargoCanBuy(bizid)
{
	new buy = GetBusinessCargoBuy(bizid), need = GetBusinessCargoNeeded(bizid), canbuy;

	if(buy && need)
	{
		if(need >= buy)
		{
			canbuy = buy;
		}
		else
		{
			canbuy = need;
		}
	}

	return canbuy;
}

GetProductPerCargo(type)
{
	switch(type)
	{
	    case 1: return 10; // Gas Station
	    case 2: return 10; // Ammunations
	    case 3: return 5; // 24/7
	    case 4: return 3; // Vehicle Dealerships
	    case 5: return 10; // Car Modding Shops
	    case 6: return 3; // Pay & Spray
	    case 7: return 5; // Clothing Shops
	    case 8: return 5; // Bars
	    case 9: return 5; // Restaurant
	    case 10: return 10; // Furniture Shop
	    case 11: return 20; // Advertisement Center
	    case 12: return 100; // Bank
	}
	return -1;
}

GetProductCargo(type)
{
	switch(type)
	{
	    case 1: return 13; // Gas Station
	    case 2: return 19; // Ammunations
	    case 3: return 11; // 24/7
	    case 4: return 17; // Vehicle Dealerships
	    case 5: return 23; // Car Modding Shops
	    case 6: return 0; // Pay & Spray
	    case 7: return 12; // Clothing Shops
     	case 8: return 7; // Bars
	    case 9: return 24; // Restaurant
	    case 10: return 14; // Furniture Shop
	    case 11: return 21; // Advertisement Center
	    case 12: return 2; // Bank
	}
	return -1;
}

// --- Dynamic Industry Admin System ---

forward OnIndustryCreated(slot);

stock Storage_CreateInGame(slot)
{
    if(!StorageData[slot][in_id]) return 0;

    if(StorageData[slot][in_pickup] != 0)
    {
        DestroyDynamicPickup(StorageData[slot][in_pickup]);
        StorageData[slot][in_pickup] = 0;
    }
    if(IsValidDynamic3DTextLabel(StorageData[slot][in_label]))
    {
        DestroyDynamic3DTextLabel(StorageData[slot][in_label]);
    }

    StorageData[slot][in_pickup] = CreateDynamicPickup(1318, 23, StorageData[slot][in_posx], StorageData[slot][in_posy], StorageData[slot][in_posz], 0, 0);

    new msg[256];
    format(msg, sizeof(msg),
        "[{A4D247}%s{FFFFFF}] - %s\nCommodity: {E5FF00}%s{FFFFFF}\nPrice: %s / unit\nStock: %d / %d\n{AAAAAA}[IndID: %d | StorageID: %d]",
        g_arrIndustryNames[StorageData[slot][in_industryid]],
        (StorageData[slot][in_trading_type] == 0) ? ("{A4D247}For Sale{FFFFFF}") : ("{CD324D}Wanted{FFFFFF}"),
        g_arrIndItemProperNames[StorageData[slot][in_item]],
        FormatNumber(StorageData[slot][in_price]),
        StorageData[slot][in_stock], StorageData[slot][in_maximum],
        StorageData[slot][in_industryid], StorageData[slot][in_id]
    );

    StorageData[slot][in_label] = CreateDynamic3DTextLabel(
        msg, COLOR_WHITE,
        StorageData[slot][in_posx], StorageData[slot][in_posy], StorageData[slot][in_posz] + 0.8,
        15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, 0
    );

    return 1;
}

stock Storage_GetFreeSlot()
{
    for(new i = 0; i < MAX_ITEM_STORAGE; i++)
    {
        if(!StorageData[i][in_id]) return i;
    }
    return -1;
}

stock Storage_FindByDBID(dbid)
{
    foreach (new i : Industry)
    {
        if(StorageData[i][in_id] == dbid) return i;
    }
    return -1;
}

stock Storage_Add(industryid, trading_type, item, price, consumption, maximum, Float:x, Float:y, Float:z)
{
    new slot = Storage_GetFreeSlot();
    if(slot == -1) return -1;

    StorageData[slot][in_posx]         = x;
    StorageData[slot][in_posy]         = y;
    StorageData[slot][in_posz]         = z;
    StorageData[slot][in_item]         = item;
    StorageData[slot][in_industryid]   = industryid;
    StorageData[slot][in_trading_type] = trading_type;
    StorageData[slot][in_price]        = price;
    StorageData[slot][in_consumption]  = consumption;
    StorageData[slot][in_stock]        = 0;
    StorageData[slot][in_maximum]      = maximum;

    new query[300];
    mysql_format(dbCon, query, sizeof(query),
        "INSERT INTO `industry` (`posx`, `posy`, `posz`, `item`, `industryid`, `trading_type`, `price`, `consumption`, `stock`, `maximum`) VALUES (%.4f, %.4f, %.4f, %d, %d, %d, %d, %d, 0, %d)",
        x, y, z, item, industryid, trading_type, price, consumption, maximum
    );
    mysql_tquery(dbCon, query, "OnIndustryCreated", "d", slot);

    return slot;
}

public OnIndustryCreated(slot)
{
    StorageData[slot][in_id] = cache_insert_id();
    Iter_Add(Industry, slot);
    Storage_CreateInGame(slot);
    return 1;
}

stock Storage_Remove(dbid)
{
    new slot = Storage_FindByDBID(dbid);
    if(slot == -1) return 0;

    new query[128];
    mysql_format(dbCon, query, sizeof(query), "DELETE FROM `industry` WHERE `id` = %d LIMIT 1", dbid);
    mysql_tquery(dbCon, query);

    if(StorageData[slot][in_pickup] != 0)
    {
        DestroyDynamicPickup(StorageData[slot][in_pickup]);
        StorageData[slot][in_pickup] = 0;
    }
    if(IsValidDynamic3DTextLabel(StorageData[slot][in_label]))
    {
        DestroyDynamic3DTextLabel(StorageData[slot][in_label]);
    }

    Iter_Remove(Industry, slot);
    StorageData[slot][in_id] = 0;
    return 1;
}

// Dialogs for Industry Wizard

Dialog:IndWizardStep1(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    SetPVarInt(playerid, "IndWiz_IndustryID", listitem);

    Dialog_Show(playerid, IndWizardStep2, DIALOG_STYLE_LIST, "Create Industry - Step 2: Select Trading Type", "For Sale (0) - Place where truckers BUY cargo\nWanted (1) - Place where truckers SELL cargo", "Select", "Back");
    return 1;
}

Dialog:IndWizardStep2(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    SetPVarInt(playerid, "IndWiz_TradingType", listitem);

    new listStr[1024];
    listStr[0] = EOS;
    for(new i = 0; i < sizeof(g_arrIndItemProperNames); i++)
    {
        format(listStr, sizeof(listStr), "%s[%d] %s (%s)\n", listStr, i, g_arrIndItemProperNames[i], ReturnCargoUnits(i));
    }

    Dialog_Show(playerid, IndWizardStep3, DIALOG_STYLE_LIST, "Create Industry - Step 3: Select Commodity", listStr, "Select", "Back");
    return 1;
}

Dialog:IndWizardStep3(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    SetPVarInt(playerid, "IndWiz_ItemID", listitem);

    new helpMsg[256];
    format(helpMsg, sizeof(helpMsg),
        "Enter price per unit, consumption/hour, and max stock capacity:\n\nFormat: [Price] [Consumption/Hour] [Max Stock]\nExample: 360 10 1000"
    );

    Dialog_Show(playerid, IndWizardStep4, DIALOG_STYLE_INPUT, "Create Industry - Step 4: Price & Capacity", helpMsg, "Create", "Back");
    return 1;
}

Dialog:IndWizardStep4(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new price, consumption, maxStock;
    if(sscanf(inputtext, "ddd", price, consumption, maxStock) || price <= 0 || maxStock <= 0)
    {
        SendClientMessage(playerid, COLOR_LIGHTRED, "Invalid input! Format: [Price] [Consumption] [MaxStock] (e.g. 360 10 1000)");
        Dialog_Show(playerid, IndWizardStep4, DIALOG_STYLE_INPUT, "Create Industry - Step 4: Price & Capacity", "Format: [Price] [Consumption/Hour] [Max Stock]\nExample: 360 10 1000", "Create", "Back");
        return 1;
    }

    new indID = GetPVarInt(playerid, "IndWiz_IndustryID");
    new tradingType = GetPVarInt(playerid, "IndWiz_TradingType");
    new itemID = GetPVarInt(playerid, "IndWiz_ItemID");

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);

    new slot = Storage_Add(indID, tradingType, itemID, price, consumption, maxStock, x, y, z);
    if(slot == -1)
        return SendClientMessageEx(playerid, COLOR_LIGHTRED, "Storage limit reached (%d max).", MAX_ITEM_STORAGE);

    SendAdminAlert(COLOR_YELLOW, 3, "AdmWarn(3) %s created Industry Point for %s (%s - %s) at %.1f, %.1f, %.1f.",
        ReturnName(playerid), g_arrIndustryNames[indID], g_arrIndItemProperNames[itemID],
        (tradingType == 0) ? ("For Sale") : ("Wanted"), x, y, z
    );
    SendClientMessageEx(playerid, COLOR_WHITE, "Industry point successfully created for %s!", g_arrIndustryNames[indID]);

    DeletePVar(playerid, "IndWiz_IndustryID");
    DeletePVar(playerid, "IndWiz_TradingType");
    DeletePVar(playerid, "IndWiz_ItemID");
    return 1;
}

Dialog:IndustryListDialog(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new count = 0;
    foreach (new i : Industry)
    {
        if(count == listitem)
        {
            SetPlayerInterior(playerid, 0);
            SetPlayerVirtualWorld(playerid, 0);
            SetPlayerDynamicPos(playerid, StorageData[i][in_posx], StorageData[i][in_posy], StorageData[i][in_posz]);

            SendClientMessageEx(playerid, COLOR_WHITE, "Teleported to Industry Point ID %d (%s - %s).",
                StorageData[i][in_id], g_arrIndustryNames[StorageData[i][in_industryid]], g_arrIndItemProperNames[StorageData[i][in_item]]
            );
            return 1;
        }
        count++;
    }
    return 1;
}

Dialog:IndustryEditMenu(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new dbid = GetPVarInt(playerid, "IndEdit_DBID");
    new slot = Storage_FindByDBID(dbid);
    if(slot == -1) return SendClientMessage(playerid, COLOR_LIGHTRED, "Industry point not found.");

    switch(listitem)
    {
        case 0: // Move position
        {
            GetPlayerPos(playerid, StorageData[slot][in_posx], StorageData[slot][in_posy], StorageData[slot][in_posz]);
            new query[256];
            mysql_format(dbCon, query, sizeof(query), "UPDATE `industry` SET `posx` = %.4f, `posy` = %.4f, `posz` = %.4f WHERE `id` = %d", StorageData[slot][in_posx], StorageData[slot][in_posy], StorageData[slot][in_posz], dbid);
            mysql_tquery(dbCon, query);

            Storage_CreateInGame(slot);
            SendClientMessageEx(playerid, COLOR_WHITE, "Industry Point ID %d position updated to your current location.", dbid);
        }
        case 1: // Change Price
        {
            Dialog_Show(playerid, IndEditPrice, DIALOG_STYLE_INPUT, "Edit Industry - Price", "Enter new price per unit ($):", "Save", "Cancel");
        }
        case 2: // Change Stock & Max
        {
            Dialog_Show(playerid, IndEditStock, DIALOG_STYLE_INPUT, "Edit Industry - Stock & Max Capacity", "Format: [Current Stock] [Max Stock]\nExample: 500 1000", "Save", "Cancel");
        }
    }
    return 1;
}

Dialog:IndEditPrice(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new price = strval(inputtext);
    if(price <= 0) return SendClientMessage(playerid, COLOR_LIGHTRED, "Invalid price amount.");

    new dbid = GetPVarInt(playerid, "IndEdit_DBID");
    new slot = Storage_FindByDBID(dbid);
    if(slot == -1) return SendClientMessage(playerid, COLOR_LIGHTRED, "Industry point not found.");

    StorageData[slot][in_price] = price;
    new query[128];
    mysql_format(dbCon, query, sizeof(query), "UPDATE `industry` SET `price` = %d WHERE `id` = %d", price, dbid);
    mysql_tquery(dbCon, query);

    Storage_CreateInGame(slot);
    SendClientMessageEx(playerid, COLOR_WHITE, "Industry Point ID %d price updated to $%d.", dbid, price);
    return 1;
}

Dialog:IndEditStock(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new stockVal, maxVal;
    if(sscanf(inputtext, "dd", stockVal, maxVal) || maxVal <= 0)
        return SendClientMessage(playerid, COLOR_LIGHTRED, "Invalid input! Format: [Current Stock] [Max Stock]");

    new dbid = GetPVarInt(playerid, "IndEdit_DBID");
    new slot = Storage_FindByDBID(dbid);
    if(slot == -1) return SendClientMessage(playerid, COLOR_LIGHTRED, "Industry point not found.");

    StorageData[slot][in_stock] = stockVal;
    StorageData[slot][in_maximum] = maxVal;

    new query[128];
    mysql_format(dbCon, query, sizeof(query), "UPDATE `industry` SET `stock` = %d, `maximum` = %d WHERE `id` = %d", stockVal, maxVal, dbid);
    mysql_tquery(dbCon, query);

    Storage_CreateInGame(slot);
    SendClientMessageEx(playerid, COLOR_WHITE, "Industry Point ID %d stock updated to %d/%d.", dbid, stockVal, maxVal);
    return 1;
}
