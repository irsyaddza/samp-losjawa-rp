/*
 * HarvesterRental.pwn — Harvester Rental System for Los Jawa RP
 * Handles dynamic harvester rental spots created by admins.
 */

#include <YSI_Coding/y_hooks>

#define MAX_HARVESTER_RENTALS 20

enum E_HARVESTER_RENTAL {
    hrentID,
    Float:hrentX,
    Float:hrentY,
    Float:hrentZ,
    hrentPrice,
    hrentPickup,
    Text3D:hrentLabel
};

new HarvesterRentals[MAX_HARVESTER_RENTALS][E_HARVESTER_RENTAL];
new RentedHarvester[MAX_PLAYERS] = {INVALID_VEHICLE_ID, ...};
new HarvesterRentalCooldown[MAX_PLAYERS];

// ── Database Table Creation ──────────────────────────────────────────
stock HarvesterRental_Init()
{
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `harvester_rentals` (`id` INT AUTO_INCREMENT PRIMARY KEY, `posX` FLOAT NOT NULL, `posY` FLOAT NOT NULL, `posZ` FLOAT NOT NULL, `price` INT NOT NULL DEFAULT 500)", "OnHarvesterTableCheck", "");
    return 1;
}

forward OnHarvesterTableCheck();
public OnHarvesterTableCheck()
{
    mysql_tquery(dbCon, "SELECT * FROM `harvester_rentals` LIMIT 20", "HarvesterRental_Load", "");
    return 1;
}

// ── Loading from Database ───────────────────────────────────────────
forward HarvesterRental_Load();
public HarvesterRental_Load()
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_HARVESTER_RENTALS; i++)
    {
        cache_get_value_name_int(i, "id", HarvesterRentals[i][hrentID]);
        cache_get_value_name_float(i, "posX", HarvesterRentals[i][hrentX]);
        cache_get_value_name_float(i, "posY", HarvesterRentals[i][hrentY]);
        cache_get_value_name_float(i, "posZ", HarvesterRentals[i][hrentZ]);
        cache_get_value_name_int(i, "price", HarvesterRentals[i][hrentPrice]);

        HarvesterRentals[i][hrentPickup] = CreateDynamicPickup(1239, 23, HarvesterRentals[i][hrentX], HarvesterRentals[i][hrentY], HarvesterRentals[i][hrentZ], 0, -1);
        
        new labelStr[256];
        format(labelStr, sizeof(labelStr), "[Harvester Rental]\n{FFFFFF}Type: {FFFF00}Harvester\n{FFFFFF}Price: {00FF00}%s\n{FFFFFF}Use {FFFF00}/rentharvester {FFFFFF}to rent", FormatNumber(HarvesterRentals[i][hrentPrice]));
        HarvesterRentals[i][hrentLabel] = CreateDynamic3DTextLabel(labelStr, 0x33CCFFFF, HarvesterRentals[i][hrentX], HarvesterRentals[i][hrentY], HarvesterRentals[i][hrentZ] + 0.5, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, -1);
    }
    printf("[Harvester Rental]: Loaded %d rentals from database.", rows);
    return 1;
}

// ── Clean up on disconnect ──────────────────────────────────────────
hook OnPlayerDisconnect(playerid, reason)
{
    if(RentedHarvester[playerid] != INVALID_VEHICLE_ID)
    {
        new vehicleid = RentedHarvester[playerid];
        RentedHarvester[playerid] = INVALID_VEHICLE_ID;
        if(Iter_Contains(sv_vehicles, vehicleid)) Iter_Remove(sv_vehicles, vehicleid);
        DestroyVehicle(vehicleid);
    }
    HarvesterRentalCooldown[playerid] = 0;
    return 1;
}

// ── Admin Command: /addrental ───────────────────────────────────────
CMD:addrental(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    Dialog_Show(playerid, AddRentalType, DIALOG_STYLE_LIST, "Add Rental", "Harvester", "Select", "Cancel");
    return 1;
}

Dialog:AddRentalType(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    if(listitem == 0) // Harvester
    {
        Dialog_Show(playerid, AddRentalPrice, DIALOG_STYLE_INPUT, "Add Rental - Price", "Enter rental price per hour:", "Add", "Cancel");
    }
    return 1;
}

Dialog:AddRentalPrice(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new price = strval(inputtext);
    if(price <= 0)
        return Dialog_Show(playerid, AddRentalPrice, DIALOG_STYLE_INPUT, "Add Rental - Price", "Enter rental price per hour:\n{FF0000}Price must be greater than 0!", "Add", "Cancel");

    new slot = -1;
    for(new i = 0; i < MAX_HARVESTER_RENTALS; i++)
    {
        if(HarvesterRentals[i][hrentID] == 0)
        {
            slot = i;
            break;
        }
    }
    if(slot == -1) return SendErrorMessage(playerid, "Maximum harvester rental spots reached.");

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);

    new query[256];
    mysql_format(dbCon, query, sizeof(query), "INSERT INTO `harvester_rentals` (`posX`, `posY`, `posZ`, `price`) VALUES (%f, %f, %f, %d)", x, y, z, price);
    mysql_tquery(dbCon, query, "OnHarvesterRentalCreated", "dddfff", playerid, slot, price, x, y, z);
    return 1;
}

forward OnHarvesterRentalCreated(playerid, slot, price, Float:x, Float:y, Float:z);
public OnHarvesterRentalCreated(playerid, slot, price, Float:x, Float:y, Float:z)
{
    new insertid = cache_insert_id();
    HarvesterRentals[slot][hrentID] = insertid;
    HarvesterRentals[slot][hrentX] = x;
    HarvesterRentals[slot][hrentY] = y;
    HarvesterRentals[slot][hrentZ] = z;
    HarvesterRentals[slot][hrentPrice] = price;

    HarvesterRentals[slot][hrentPickup] = CreateDynamicPickup(1239, 23, x, y, z, 0, -1);
    
    new labelStr[256];
    format(labelStr, sizeof(labelStr), "[Harvester Rental]\n{FFFFFF}Type: {FFFF00}Harvester\n{FFFFFF}Price: {00FF00}%s\n{FFFFFF}Use {FFFF00}/rentharvester {FFFFFF}to rent", FormatNumber(price));
    HarvesterRentals[slot][hrentLabel] = CreateDynamic3DTextLabel(labelStr, 0x33CCFFFF, x, y, z + 0.5, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, -1);

    SendClientMessageEx(playerid, COLOR_GREEN, "Harvester rental spot created successfully (ID: %d).", insertid);
    return 1;
}

// ── Player Command: /rentharvester ─────────────────────────────────
CMD:rentharvester(playerid, params[])
{
    new slot = -1;
    for(new i = 0; i < MAX_HARVESTER_RENTALS; i++)
    {
        if(HarvesterRentals[i][hrentID] != 0 && IsPlayerInRangeOfPoint(playerid, 3.0, HarvesterRentals[i][hrentX], HarvesterRentals[i][hrentY], HarvesterRentals[i][hrentZ]))
        {
            slot = i;
            break;
        }
    }

    if(slot == -1)
        return SendErrorMessage(playerid, "You are not near a Harvester rental spot.");

    if(RentedHarvester[playerid] != INVALID_VEHICLE_ID)
        return SendErrorMessage(playerid, "You are already renting a Harvester. Type /unrentharvester to return it.");

    if(gettime() < HarvesterRentalCooldown[playerid])
    {
        new remaining = HarvesterRentalCooldown[playerid] - gettime();
        new minutes = remaining / 60;
        new seconds = remaining % 60;
        return SendErrorMessage(playerid, "You must wait %d minutes and %d seconds before renting a Harvester again.", minutes, seconds);
    }

    new cost = HarvesterRentals[slot][hrentPrice];
    if(PlayerData[playerid][pCash] < cost)
        return SendErrorMessage(playerid, "You don't have enough money to rent a Harvester.");

    TakePlayerMoney(playerid, cost);

    new Float:px, Float:py, Float:pz, Float:pa;
    GetPlayerPos(playerid, px, py, pz);
    GetPlayerFacingAngle(playerid, pa);

    new vehicleid = CreateVehicle(532, px, py, pz + 1.0, pa, 1, 1, 300); // 5 minutes respawn delay
    if(vehicleid == INVALID_VEHICLE_ID)
        return SendErrorMessage(playerid, "Failed to spawn rental vehicle.");

    Iter_Add(sv_vehicles, vehicleid);
    ResetVehicle(vehicleid);
    SetVehicleNumberPlate(vehicleid, "{000000}RENTAL");
    SetEngineStatus(vehicleid, true);

    RentedHarvester[playerid] = vehicleid;

    PutPlayerInVehicle(playerid, vehicleid, 0);

    SendClientMessage(playerid, COLOR_GRAD1, "Rental Company:");
    SendClientMessage(playerid, COLOR_GRAD2, "-------------------");
    SendClientMessageEx(playerid, COLOR_GREY, " You're now renting a Harvester for %s.", FormatNumber(cost));
    SendClientMessage(playerid, COLOR_GREY, " To return it, you may use the command \"/unrentharvester\".");
    SendClientMessage(playerid, COLOR_GREY, " You can lock the vehicle using /lock and toggle lights with ALT+Space.");
    SendClientMessage(playerid, COLOR_GRAD2, "-------------------");
    return 1;
}

// ── Player Command: /unrentharvester ───────────────────────────────
CMD:unrentharvester(playerid, params[])
{
    if(RentedHarvester[playerid] == INVALID_VEHICLE_ID)
        return SendErrorMessage(playerid, "You are not renting a Harvester.");

    new vehicleid = RentedHarvester[playerid];
    RentedHarvester[playerid] = INVALID_VEHICLE_ID;

    if(Iter_Contains(sv_vehicles, vehicleid))
        Iter_Remove(sv_vehicles, vehicleid);

    DestroyVehicle(vehicleid);

    HarvesterRentalCooldown[playerid] = gettime() + 1200; // 20 minutes cooldown

    SendClientMessage(playerid, COLOR_RADIO, "You have returned the rented Harvester.");
    return 1;
}

// ── Admin Command: /removerental ────────────────────────────────────
CMD:removerental(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    new slot = -1;
    for(new i = 0; i < MAX_HARVESTER_RENTALS; i++)
    {
        if(HarvesterRentals[i][hrentID] != 0 && IsPlayerInRangeOfPoint(playerid, 3.0, HarvesterRentals[i][hrentX], HarvesterRentals[i][hrentY], HarvesterRentals[i][hrentZ]))
        {
            slot = i;
            break;
        }
    }

    if(slot == -1)
        return SendErrorMessage(playerid, "You are not near any Harvester rental spot.");

    new id = HarvesterRentals[slot][hrentID];

    new query[128];
    mysql_format(dbCon, query, sizeof(query), "DELETE FROM `harvester_rentals` WHERE `id` = %d", id);
    mysql_tquery(dbCon, query, "", "");

    if(IsValidDynamicPickup(HarvesterRentals[slot][hrentPickup]))
        DestroyDynamicPickup(HarvesterRentals[slot][hrentPickup]);

    if(IsValidDynamic3DTextLabel(HarvesterRentals[slot][hrentLabel]))
        DestroyDynamic3DTextLabel(HarvesterRentals[slot][hrentLabel]);

    HarvesterRentals[slot][hrentID] = 0;
    HarvesterRentals[slot][hrentX] = 0.0;
    HarvesterRentals[slot][hrentY] = 0.0;
    HarvesterRentals[slot][hrentZ] = 0.0;
    HarvesterRentals[slot][hrentPrice] = 0;
    HarvesterRentals[slot][hrentPickup] = 0;
    HarvesterRentals[slot][hrentLabel] = Text3D:0;

    SendClientMessageEx(playerid, COLOR_GREEN, "Harvester rental spot (ID: %d) has been deleted successfully.", id);
    return 1;
}
