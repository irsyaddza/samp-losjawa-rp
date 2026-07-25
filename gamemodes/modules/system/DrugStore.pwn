/*
 * DrugStore.pwn - Dynamic Drug Store System for Los Jawa RP
 */

#include <YSI_Coding\y_hooks>

#define MAX_DRUG_STORES 20

enum E_DRUG_STORE {
    dsID,
    Float:dsX,
    Float:dsY,
    Float:dsZ,
    dsPickup,
    Text3D:dsLabel
};

new DrugStores[MAX_DRUG_STORES][E_DRUG_STORE];

// Prices for each drug per unit/gram
new Float:g_DrugBasePrice[] = {
    50.0,  // Cocaine ($50/g)
    15.0,  // Marijuana ($15/g)
    25.0,  // Xanax ($25/pill)
    30.0,  // MDMA ($30/pill)
    40.0,  // Heroin ($40/g)
    20.0,  // Ketamine ($20/g)
    60.0,  // Fentanyl ($60/pill)
    35.0,  // Methamphetamine ($35/g)
    25.0,  // Steroids ($25/g)
    30.0   // Oxycodone ($30/g)
};

// ── Database Initialization ──────────────────────────────────────────
stock DrugStore_Init()
{
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `drug_stores` (`id` INT AUTO_INCREMENT PRIMARY KEY, `posX` FLOAT NOT NULL, `posY` FLOAT NOT NULL, `posZ` FLOAT NOT NULL)", "OnDrugStoreTableCheck", "");
    return 1;
}

forward OnDrugStoreTableCheck();
public OnDrugStoreTableCheck()
{
    mysql_tquery(dbCon, "SELECT * FROM `drug_stores` LIMIT 20", "DrugStore_Load", "");
    return 1;
}

forward DrugStore_Load();
public DrugStore_Load()
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_DRUG_STORES; i++)
    {
        cache_get_value_name_int(i, "id", DrugStores[i][dsID]);
        cache_get_value_name_float(i, "posX", DrugStores[i][dsX]);
        cache_get_value_name_float(i, "posY", DrugStores[i][dsY]);
        cache_get_value_name_float(i, "posZ", DrugStores[i][dsZ]);

        DrugStores[i][dsPickup] = CreateDynamicPickup(1578, 23, DrugStores[i][dsX], DrugStores[i][dsY], DrugStores[i][dsZ], 0, -1);

        new labelStr[256];
        format(labelStr, sizeof(labelStr), "[ DRUG STORE ]\n{FFFFFF}Black Market Wholesale\n{00FF00}Restricted Access (Mafia/Gang)\n{FFFFFF}Use {FFFF00}/drugstore {FFFFFF}to open shop");
        DrugStores[i][dsLabel] = CreateDynamic3DTextLabel(labelStr, 0x00FF00FF, DrugStores[i][dsX], DrugStores[i][dsY], DrugStores[i][dsZ] + 0.5, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, -1);
    }
    printf("[Drug Store]: Loaded %d drug store locations from database.", rows);
    return 1;
}

// ── Admin Subcommand / Action Helper ─────────────────────────────────
stock CreateDrugStoreSpot(playerid)
{
    new slot = -1;
    for(new i = 0; i < MAX_DRUG_STORES; i++)
    {
        if(DrugStores[i][dsID] == 0)
        {
            slot = i;
            break;
        }
    }
    if(slot == -1) return SendErrorMessage(playerid, "Maximum drug store locations reached.");

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);

    new query[256];
    mysql_format(dbCon, query, sizeof(query), "INSERT INTO `drug_stores` (`posX`, `posY`, `posZ`) VALUES (%f, %f, %f)", x, y, z);
    mysql_tquery(dbCon, query, "OnDrugStoreCreated", "ddfff", playerid, slot, x, y, z);
    return 1;
}

forward OnDrugStoreCreated(playerid, slot, Float:x, Float:y, Float:z);
public OnDrugStoreCreated(playerid, slot, Float:x, Float:y, Float:z)
{
    new insertid = cache_insert_id();
    DrugStores[slot][dsID] = insertid;
    DrugStores[slot][dsX] = x;
    DrugStores[slot][dsY] = y;
    DrugStores[slot][dsZ] = z;

    DrugStores[slot][dsPickup] = CreateDynamicPickup(1270, 23, x, y, z, 0, -1);

    new labelStr[256];
    format(labelStr, sizeof(labelStr), "[ DRUG STORE ]\n{FFFFFF}Black Market Wholesale\n{00FF00}Restricted Access (Mafia/Gang)\n{FFFFFF}Use {FFFF00}/drugstore {FFFFFF}to open shop");
    DrugStores[slot][dsLabel] = CreateDynamic3DTextLabel(labelStr, 0x00FF00FF, x, y, z + 0.5, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, -1);

    SendClientMessageEx(playerid, COLOR_GREEN, "[DRUG STORE]: Dynamic Drug Store location created (ID: %d).", insertid);
    return 1;
}

// ── Dialog Handlers ───────────────────────────────────────────────────
Dialog:DrugStore_Type(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    SetPVarInt(playerid, "ds_SelectedDrug", listitem);

    new body[512];
    body[0] = EOS;

    for(new d = 0; d < sizeof(s_NAMES); ++d)
    {
        strcat(body, s_NAMES[d]);
        strcat(body, "\n");
    }

    Dialog_Show(playerid, DrugStore_Storage, DIALOG_STYLE_LIST, "Drug Store - Select Container:", body, "Next", "Back");
    return 1;
}

Dialog:DrugStore_Storage(playerid, response, listitem, inputtext[])
{
    if(!response)
    {
        // Go back to type selection
        new body[256];
        body[0] = EOS;
        for(new d = 0; d < sizeof(d_DATA); ++d)
        {
            strcat(body, d_DATA[d][dName]);
            strcat(body, "\n");
        }
        return Dialog_Show(playerid, DrugStore_Type, DIALOG_STYLE_LIST, "Drug Store - Select Drug:", body, "Next", "Cancel");
    }

    SetPVarInt(playerid, "ds_SelectedStorage", listitem);

    new drug = GetPVarInt(playerid, "ds_SelectedDrug");
    new storage = listitem;
    new Float:maxCap = ReturnStorageCapacity(storage, drug);

    new body[400];
    format(body, sizeof(body), "{A9C4E4}Item: {7E98B6}%s\n{A9C4E4}Container: {7E98B6}%s\n{A9C4E4}Max Capacity: {7E98B6}%.1f %s\n\n{FFFFFF}Base Rate: {00FF00}$%.0f per unit\n\n{A9C4E4}Please enter the amount you wish to buy:",
        d_DATA[drug][dName], s_NAMES[storage], maxCap, (d_DATA[drug][IsPill] ? ("Pills") : ("g")), g_DrugBasePrice[drug]);

    Dialog_Show(playerid, DrugStore_Amount, DIALOG_STYLE_INPUT, "Drug Store - Input Amount:", body, "Purchase", "Cancel");
    return 1;
}

Dialog:DrugStore_Amount(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new drug = GetPVarInt(playerid, "ds_SelectedDrug");
    new storage = GetPVarInt(playerid, "ds_SelectedStorage");
    new Float:maxCap = ReturnStorageCapacity(storage, drug);

    new Float:amount;
    if(sscanf(inputtext, "f", amount) || amount <= 0.0)
    {
        SendErrorMessage(playerid, "Invalid amount specified. Must be greater than 0.0.");
        return 1;
    }

    if(amount > maxCap)
    {
        SendErrorMessage(playerid, "Amount exceeds container max capacity (%.1f).", maxCap);
        return 1;
    }

    // Calculate total price
    new totalPrice = floatround(amount * g_DrugBasePrice[drug]);
    if(totalPrice < 1) totalPrice = 1;

    if(PlayerData[playerid][pCash] < totalPrice)
    {
        return SendErrorMessage(playerid, "You don't have enough money (%d needed).", totalPrice);
    }

    // Check inventory slot
    new freeSlot = -1;
    for(new i = 0; i < MAX_PLAYER_DRUGS; ++i)
    {
        if(Player_Drugs[playerid][i][dID] == -1)
        {
            freeSlot = i;
            break;
        }
    }

    if(freeSlot == -1)
    {
        return SendErrorMessage(playerid, "You don't have any free drug slots left in your inventory.");
    }

    // Deduct money & give drug package
    TakePlayerMoney(playerid, totalPrice);
    RefundPlayerDrug(playerid, drug, amount, 100.0, storage);

    SendClientMessageEx(playerid, COLOR_GREEN, "[DRUG STORE]: You purchased %.1f %s of %s (%s) for $%d.", 
        amount, (d_DATA[drug][IsPill] ? ("Pills") : ("g")), d_DATA[drug][dName], s_NAMES[storage], totalPrice);

    return 1;
}
