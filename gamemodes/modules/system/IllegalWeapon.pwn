// =============================================================================
// IllegalWeapon.pwn - Illegal Weapon Crafting System
// =============================================================================
// Illegal Job: Weapon Supplier
//   - Admin commands: /illegaljob create|delete|list
//   - Admin commands: /weaponsupplier create|edit
//   - Player commands: /weaponsupplier join, /buymaterial, /buyschematic
//   - Player commands: /gun create [weapon] [ammo]
// =============================================================================

// --- Defines ---

#define MAX_ILLEGAL_JOB_PICKUPS     (10)
#define ILLEGAL_JOB_WS              (0)     // Weapon Supplier job index
#define IWS_PICKUP_JOIN             (0)     // Pickup type: join point
#define IWS_PICKUP_MATERIAL         (1)     // Pickup type: material
#define IWS_PICKUP_SCHEMATIC        (2)     // Pickup type: schematic

// Weapon IDs for craftable schematics
#define CRAFT_COLT                  (22)    // Colt 45
#define CRAFT_SHOTGUN               (25)    // Shotgun
#define CRAFT_SILENCED              (23)    // Silenced Pistol
#define CRAFT_RIFLE                 (33)    // Country Rifle
#define CRAFT_UZI                   (28)    // Micro UZI
#define CRAFT_TEC9                  (32)    // Tec-9
#define CRAFT_AK47                  (30)    // AK-47
#define CRAFT_DEAGLE                (24)    // Desert Eagle

#define MAX_SCHEMATICS              (8)
#define MAX_CRAFT_WEAPONS           (8)

// Schematic indices
#define SCH_COLT                    (0)
#define SCH_SHOTGUN                 (1)
#define SCH_SILENCED                (2)
#define SCH_RIFLE                   (3)
#define SCH_UZI                     (4)
#define SCH_TEC9                    (5)
#define SCH_AK47                    (6)
#define SCH_DEAGLE                  (7)

#define CRAFT_COOLDOWN              (1200)  // 20 minutes in seconds
#define MATERIAL_PICKUP_MODEL       (1575)
#define SCHEMATIC_PICKUP_MODEL      (1575)
#define ILLEGALJOB_PICKUP_MODEL     (1254)
#define MATERIAL_OBJECT_MODEL       (1279)  // ponytail: same model as pickup, reuse
#define SCHEMATIC_OBJECT_MODEL      (3111)

// Forward declarations for Train System TextDraws (compilation order dependency)
forward ShowTrainBoardingBar(playerid, headerText[], Float:barWidth, barColor);
forward HideTrainBoardingBar(playerid);

// --- Data Structures ---

enum E_IWS_PICKUP
{
    iws_Type,
    iws_Pickup,
    Text3D:iws_Label,
    iws_MatPrice,
    iws_MatStock,
    iws_SchPrice,
    Float:iws_X,         // stored spawn position
    Float:iws_Y,
    Float:iws_Z
};

new IWSPickup[MAX_ILLEGAL_JOB_PICKUPS][E_IWS_PICKUP];
new IWSPickupCount;

// Per-player state
new pIllegalJob[MAX_PLAYERS];       // 0 = none, 1 = weapon supplier
new pMaterials[MAX_PLAYERS];        // material count on hand
new pSchematics[MAX_PLAYERS][MAX_SCHEMATICS];   // schematic[8], 1 = owned
new pGunCraftDelay[MAX_PLAYERS];    // unix timestamp: can craft again after
new bool:pCrafting[MAX_PLAYERS];    // crafting in progress

// craft timers - CraftTimer declared in roleplay.pwn

// --- Schematic / Weapon data table ---

// ponytail: static table avoids repeated format calls
new const craft_weapon_id[MAX_CRAFT_WEAPONS]   = { CRAFT_COLT, CRAFT_SHOTGUN, CRAFT_SILENCED, CRAFT_RIFLE, CRAFT_UZI, CRAFT_TEC9, CRAFT_AK47, CRAFT_DEAGLE };
new const craft_base_mat[MAX_CRAFT_WEAPONS]    = { 100,        300,           150,            200,         350,        300,         500,          400         };
new const craft_mat_per_ammo[MAX_CRAFT_WEAPONS]= { 2,          5,             3,              4,           3,          3,           6,            5           };
new const craft_max_ammo[MAX_CRAFT_WEAPONS]    = { 250,        250,           250,            150,         1500,       1500,        1500,         250         };
new const craft_time_sec[MAX_CRAFT_WEAPONS]    = { 10,         15,            12,             13,          20,         18,          25,           20          };
new const craft_mafia_only[MAX_CRAFT_WEAPONS]  = { 0,          0,             0,              0,           1,          1,           1,            1           };
new const craft_sch_idx[MAX_CRAFT_WEAPONS]     = { SCH_COLT,   SCH_SHOTGUN,   SCH_SILENCED,   SCH_RIFLE,   SCH_UZI,    SCH_TEC9,    SCH_AK47,     SCH_DEAGLE  };

// schematic names (parallel to craft_sch_idx 0-7) - new const 2D string array
new schematic_names[MAX_SCHEMATICS][24] = {
    "Colt 45",
    "Shotgun",
    "Silenced Pistol",
    "Country Rifle",
    "Micro UZI",
    "Tec-9",
    "AK-47",
    "Desert Eagle"
};

// --- Helpers ---

// Returns craft index (0..7) for a weapon id, or -1
IWS_WeaponToCraftIdx(weaponid)
{
    for(new i = 0; i < MAX_CRAFT_WEAPONS; ++i)
        if(craft_weapon_id[i] == weaponid) return i;
    return -1;
}

// Returns craft index for schematic name input (case-insensitive prefix match)
IWS_NameToCraftIdx(const name[])
{
    // ponytail: aliases array size must fit the longest string ("silenced" is 8 chars + null = 9 cells)
    new const aliases[MAX_CRAFT_WEAPONS][12] = {
        "colt", "shotgun", "silenced", "rifle",
        "uzi",  "tec9",    "ak47",     "deagle"
    };

    for(new i = 0; i < MAX_CRAFT_WEAPONS; ++i)
    {
        if(strfind(name, aliases[i], true) != -1)
            return i;
    }
    return -1;
}

// Returns true if player is a weapon supplier illegal worker
bool:IWS_IsSupplier(playerid)
{
    return (pIllegalJob[playerid] == 1);
}

// Returns true if player's faction is mafia (type 5 = FACTION_GANG)
bool:IWS_IsMafia(playerid)
{
    return (GetFactionType(playerid) == FACTION_GANG);
}

// Rebuild label text for a pickup slot
IWS_UpdatePickupLabel(slot)
{
    if(!IsValidDynamic3DTextLabel(IWSPickup[slot][iws_Label]))
        return;

    new lbl[128];
    switch(IWSPickup[slot][iws_Type])
    {
        case IWS_PICKUP_JOIN:
        {
            format(lbl, sizeof(lbl), "{FFFF00}[Illegal Job - Weapon Supplier]\n{FFFFFF}Use /weaponsupplier join");
        }
        case IWS_PICKUP_MATERIAL:
        {
            format(lbl, sizeof(lbl), "{FF6347}[Material Supply]\n{FFFFFF}Stock: %d | Price: $%d each\nUse /buymaterial [amount]",
                IWSPickup[slot][iws_MatStock], IWSPickup[slot][iws_MatPrice]);
        }
        case IWS_PICKUP_SCHEMATIC:
        {
            format(lbl, sizeof(lbl), "{FF6347}[Schematic Shop]\n{FFFFFF}Price: $%d per schematic\nUse /buyschematic",
                IWSPickup[slot][iws_SchPrice]);
        }
    }

    UpdateDynamic3DTextLabelText(IWSPickup[slot][iws_Label], 0xFFFFFFFF, lbl);
}

// Create a pickup+label at player's position
IWS_CreatePickup(playerid, type)
{
    if(IWSPickupCount >= MAX_ILLEGAL_JOB_PICKUPS)
        return SendErrorMessage(playerid, "Max pickup limit reached.");

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);

    new slot = IWSPickupCount++;
    IWSPickup[slot][iws_Type]     = type;
    IWSPickup[slot][iws_MatPrice] = 500;   // default
    IWSPickup[slot][iws_MatStock] = 100;   // default
    IWSPickup[slot][iws_SchPrice] = 5000;  // default

    new model;
    switch(type)
    {
        case IWS_PICKUP_JOIN:      model = ILLEGALJOB_PICKUP_MODEL;
        case IWS_PICKUP_MATERIAL:  model = MATERIAL_PICKUP_MODEL;
        case IWS_PICKUP_SCHEMATIC: model = SCHEMATIC_PICKUP_MODEL;
        default: model = ILLEGALJOB_PICKUP_MODEL;
    }

    IWSPickup[slot][iws_X] = x;
    IWSPickup[slot][iws_Y] = y;
    IWSPickup[slot][iws_Z] = z;
    IWSPickup[slot][iws_Pickup] = CreateDynamicPickup(model, 23, x, y, z);
    IWSPickup[slot][iws_Label]  = CreateDynamic3DTextLabel("...", 0xFFFFFFFF, x, y, z + 0.75, 12.0);

    IWS_UpdatePickupLabel(slot);

    IWS_SavePickups();
    SendClientMessageEx(playerid, COLOR_LIGHTRED, "[ ! ]{FFFFFF} Pickup created at your position (slot %d).", slot);
    return 1;
}

// Find which pickup slot a pickup id belongs to, -1 if none
IWS_FindPickupSlot(pickupid)
{
    for(new i = 0; i < IWSPickupCount; ++i)
        if(IWSPickup[i][iws_Pickup] == pickupid) return i;
    return -1;
}

// --- Persistence (scriptfiles) ---
// ponytail: simple flat file, no MySQL needed for pickup positions

#define IWS_FILE "iws_pickups.cfg"

IWS_SavePickups()
{
    new File:f = fopen(IWS_FILE, io_write);
    if(!f) return;

    new line[256];
    format(line, sizeof(line), "%d\n", IWSPickupCount);
    fwrite(f, line);

    for(new i = 0; i < IWSPickupCount; ++i)
    {
        format(line, sizeof(line), "%d %.4f %.4f %.4f %d %d %d\n",
            IWSPickup[i][iws_Type],
            IWSPickup[i][iws_X], IWSPickup[i][iws_Y], IWSPickup[i][iws_Z],
            IWSPickup[i][iws_MatPrice],
            IWSPickup[i][iws_MatStock],
            IWSPickup[i][iws_SchPrice]
        );
        fwrite(f, line);
    }
    fclose(f);
}

IWS_LoadPickups()
{
    new File:f = fopen(IWS_FILE, io_read);
    if(!f) return;

    new line[256];
    fread(f, line, sizeof(line));
    IWSPickupCount = strval(line);
    if(IWSPickupCount > MAX_ILLEGAL_JOB_PICKUPS) IWSPickupCount = MAX_ILLEGAL_JOB_PICKUPS;

    for(new i = 0; i < IWSPickupCount; ++i)
    {
        fread(f, line, sizeof(line));
        new itype, matprice, matstock, schprice;
        new Float:x, Float:y, Float:z;

        sscanf(line, "d f f f d d d", itype, x, y, z, matprice, matstock, schprice);

        IWSPickup[i][iws_Type]     = itype;
        IWSPickup[i][iws_MatPrice] = matprice;
        IWSPickup[i][iws_MatStock] = matstock;
        IWSPickup[i][iws_SchPrice] = schprice;
        IWSPickup[i][iws_X]        = x;
        IWSPickup[i][iws_Y]        = y;
        IWSPickup[i][iws_Z]        = z;

        new model;
        switch(itype)
        {
            case IWS_PICKUP_JOIN:      model = ILLEGALJOB_PICKUP_MODEL;
            case IWS_PICKUP_MATERIAL:  model = MATERIAL_PICKUP_MODEL;
            case IWS_PICKUP_SCHEMATIC: model = SCHEMATIC_PICKUP_MODEL;
            default: model = ILLEGALJOB_PICKUP_MODEL;
        }

        IWSPickup[i][iws_Pickup] = CreateDynamicPickup(model, 23, x, y, z);
        IWSPickup[i][iws_Label]  = CreateDynamic3DTextLabel("...", 0xFFFFFFFF, x, y, z + 0.75, 12.0);
        IWS_UpdatePickupLabel(i);
    }

    fclose(f);
}

// --- Player Data Persistence ---

IWS_SavePlayer(playerid)
{
    // Save pIllegalJob, pMaterials, pGunCraftDelay, schematics as string
    new schstr[MAX_SCHEMATICS * 2 + 1];
    for(new i = 0; i < MAX_SCHEMATICS; ++i)
        schstr[i] = '0' + pSchematics[playerid][i];
    schstr[MAX_SCHEMATICS] = EOS;

    new query[256];
    mysql_format(dbCon, query, sizeof(query),
        "UPDATE `characters` SET `IllegalJob` = '%d', `Materials` = '%d', `GunCraftDelay` = '%d', `Schematics` = '%e' WHERE `ID` = '%d' LIMIT 1",
        pIllegalJob[playerid],
        pMaterials[playerid],
        pGunCraftDelay[playerid],
        schstr,
        PlayerData[playerid][pID]
    );
    mysql_tquery(dbCon, query);
}

IWS_LoadPlayer(playerid)
{
    new query[128];
    mysql_format(dbCon, query, sizeof(query),
        "SELECT `IllegalJob`, `Materials`, `GunCraftDelay`, `Schematics` FROM `characters` WHERE `ID` = '%d' LIMIT 1",
        PlayerData[playerid][pID]
    );
    mysql_tquery(dbCon, query, "IWS_OnPlayerLoaded", "d", playerid);
}

forward IWS_OnPlayerLoaded(playerid);
public IWS_OnPlayerLoaded(playerid)
{
    if(!IsPlayerConnected(playerid)) return 1;
    if(!cache_num_rows())            return 1;

    cache_get_value_name_int(0, "IllegalJob",      pIllegalJob[playerid]);
    cache_get_value_name_int(0, "Materials",       pMaterials[playerid]);
    cache_get_value_name_int(0, "GunCraftDelay",   pGunCraftDelay[playerid]);

    new schstr[MAX_SCHEMATICS + 1];
    cache_get_value_name(0, "Schematics", schstr, sizeof(schstr));
    for(new i = 0; i < MAX_SCHEMATICS; ++i)
        pSchematics[playerid][i] = (schstr[i] == '1') ? 1 : 0;

    return 1;
}

IWS_ResetPlayer(playerid)
{
    pIllegalJob[playerid]   = 0;
    pMaterials[playerid]    = 0;
    pGunCraftDelay[playerid]= 0;
    pCrafting[playerid]     = false;
    for(new i = 0; i < MAX_SCHEMATICS; ++i)
        pSchematics[playerid][i] = 0;
}

// --- Pickup handler (called from OnPlayerPickUpDynamicPickup) ---

// --- Admin Commands ---



Dialog:IWS_CreateJobDialog(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;
    // Only weapon supplier for now; listitem 0 = join point
    IWS_CreatePickup(playerid, IWS_PICKUP_JOIN);
    return 1;
}

Dialog:IWS_DeleteDialog(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;
    if(listitem < 0 || listitem >= IWSPickupCount) return 1;

    DestroyDynamicPickup(IWSPickup[listitem][iws_Pickup]);
    DestroyDynamic3DTextLabel(IWSPickup[listitem][iws_Label]);

    // Shift array down
    for(new i = listitem; i < IWSPickupCount - 1; ++i)
        IWSPickup[i] = IWSPickup[i + 1];

    IWSPickupCount--;
    IWS_SavePickups();
    SendClientMessageEx(playerid, COLOR_LIGHTRED, "[ ! ]{FFFFFF} Pickup slot %d deleted.", listitem);
    return 1;
}




Dialog:IWS_SchematicDialog(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new near = GetPVarInt(playerid, "IWS_SchShop");
    if(near < 0 || near >= IWSPickupCount) return 1;

    // Rebuild visible list to map listitem -> schematic idx
    new bool:isMafia = IWS_IsMafia(playerid);
    new visible_map[MAX_CRAFT_WEAPONS], vcount;
    for(new i = 0; i < MAX_CRAFT_WEAPONS; ++i)
    {
        if(craft_mafia_only[i] && !isMafia) continue;
        visible_map[vcount++] = i;
    }

    if(listitem < 0 || listitem >= vcount) return 1;

    new craft_i  = visible_map[listitem];
    new sch_idx  = craft_sch_idx[craft_i];

    if(pSchematics[playerid][sch_idx])
        return SendErrorMessage(playerid, "You already own this schematic.");

    new price = IWSPickup[near][iws_SchPrice];
    if(PlayerData[playerid][pCash] < price)
        return SendErrorMessage(playerid, "You need $%d.", price);

    TakePlayerMoney(playerid, price);
    pSchematics[playerid][sch_idx] = 1;
    IWS_SavePlayer(playerid);

    SendClientMessageEx(playerid, COLOR_LIGHTRED, "[ ! ]{FFFFFF} You bought the %s schematic.", schematic_names[sch_idx]);
    SQL_LogAction(playerid, "Bought schematic: %s for $%d", schematic_names[sch_idx], price);
    return 1;
}




IWS_GunCreateParsed(playerid, const weapon_name[], ammo)
{
    if(!IWS_IsSupplier(playerid))
        return SendErrorMessage(playerid, "You are not a Weapon Supplier.");

    if(pCrafting[playerid])
        return SendErrorMessage(playerid, "You are already crafting something.");

    new now = gettime();
    if(pGunCraftDelay[playerid] > now)
    {
        new remaining = pGunCraftDelay[playerid] - now;
        return SendErrorMessage(playerid, "You must wait %d min %d sec before crafting again. (/delays)", remaining / 60, remaining % 60);
    }

    new ci = IWS_NameToCraftIdx(weapon_name);
    if(ci == -1)
        return SendErrorMessage(playerid, "Unknown weapon. Options: colt, shotgun, silenced, rifle, uzi, tec9, ak47, deagle");

    // Mafia restriction
    if(craft_mafia_only[ci] && !IWS_IsMafia(playerid))
        return SendErrorMessage(playerid, "You need to be a Mafia member to craft this weapon.");

    // Schematic check
    new sch_idx = craft_sch_idx[ci];
    if(!pSchematics[playerid][sch_idx])
        return SendErrorMessage(playerid, "You don't have the %s schematic. Buy it with /buyschematic.", schematic_names[sch_idx]);

    // Ammo range
    new max_ammo = craft_max_ammo[ci];
    if(ammo < 1 || ammo > max_ammo)
        return SendErrorMessage(playerid, "Ammo must be between 1 and %d for this weapon.", max_ammo);

    // Material cost
    new total_mat = craft_base_mat[ci] + (ammo * craft_mat_per_ammo[ci]);
    if(pMaterials[playerid] < total_mat)
        return SendErrorMessage(playerid, "You need %d materials to craft this. You have %d.", total_mat, pMaterials[playerid]);

    // Package slot check
    new free_slot = FindFreePackageSlot(playerid);
    if(free_slot == -1)
        return SendErrorMessage(playerid, "Your weapon package slots are full. Unpackage something first.");

    // Store craft context
    SetPVarInt(playerid, "IWS_CraftCI",    ci);
    SetPVarInt(playerid, "IWS_CraftAmmo",  ammo);
    SetPVarInt(playerid, "IWS_CraftMat",   total_mat);
    SetPVarInt(playerid, "IWS_CraftSlot",  free_slot);

    // Confirmation dialog
    new dstr[256];
    format(dstr, sizeof(dstr),
        "Crafting: {FF6347}%s{FFFFFF}\nAmmo: {FF6347}%d{FFFFFF}\nMaterials needed: {FF6347}%d{FFFFFF}\nYou have: {FF6347}%d{FFFFFF} materials\nCrafting time: {FF6347}%d seconds{FFFFFF}\n\nProceed?",
        schematic_names[sch_idx], ammo, total_mat, pMaterials[playerid], craft_time_sec[ci]);

    Dialog_Show(playerid, IWS_CraftConfirm, DIALOG_STYLE_MSGBOX, "Craft Weapon", dstr, "Craft", "Cancel");
    return 1;
}

Dialog:IWS_CraftConfirm(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new ci        = GetPVarInt(playerid, "IWS_CraftCI");
    new ammo      = GetPVarInt(playerid, "IWS_CraftAmmo");
    new total_mat = GetPVarInt(playerid, "IWS_CraftMat");
    new free_slot = GetPVarInt(playerid, "IWS_CraftSlot");

    // Re-validate (player could have moved, etc.)
    if(!IWS_IsSupplier(playerid))          return 1;
    if(pCrafting[playerid])                return 1;
    if(pMaterials[playerid] < total_mat)
        return SendErrorMessage(playerid, "Not enough materials anymore.");
    if(FindFreePackageSlot(playerid) == -1)
        return SendErrorMessage(playerid, "No package slots available.");

    pCrafting[playerid] = true;
    pMaterials[playerid] -= total_mat;

    // Freeze + animation
    TogglePlayerControllable(playerid, 0);
    ApplyAnimation(playerid, "BOMBER", "BOM_Plant_Loop", 4.1, 1, 0, 0, 1, 0);

    new sec = craft_time_sec[ci];
    ShowTrainBoardingBar(playerid, "Crafting Weapon.....", 0.1, 0xFF6347FF);

    // Progress bar using SetTimerEx chain (1-second tick)
    SetPVarInt(playerid, "IWS_CraftTick",  0);
    SetPVarInt(playerid, "IWS_CraftTotal", sec);
    SetPVarInt(playerid, "IWS_CraftSlot2", free_slot);
    SetPVarInt(playerid, "IWS_CraftWpn",   craft_weapon_id[ci]);
    SetPVarInt(playerid, "IWS_CraftPID",   PlayerData[playerid][pID]);

    // Store start position for movement detection
    new Float:cx, Float:cy, Float:cz;
    GetPlayerPos(playerid, cx, cy, cz);
    SetPVarFloat(playerid, "IWS_StartX", cx);
    SetPVarFloat(playerid, "IWS_StartY", cy);
    SetPVarFloat(playerid, "IWS_StartZ", cz);

    KillTimer(CraftTimer[playerid]);
    CraftTimer[playerid] = SetTimerEx("IWS_CraftTick", 1000, true, "d", playerid);

    IWS_SavePlayer(playerid);
    return 1;
}

forward IWS_CraftTick(playerid);
public IWS_CraftTick(playerid)
{
    if(!IsPlayerConnected(playerid) || !pCrafting[playerid])
    {
        KillTimer(CraftTimer[playerid]);
        IWS_CraftCancel(playerid, false);
        return 1;
    }

    // Check player moved from start position
    new Float:sx = GetPVarFloat(playerid, "IWS_StartX");
    new Float:sy = GetPVarFloat(playerid, "IWS_StartY");
    new Float:sz = GetPVarFloat(playerid, "IWS_StartZ");
    if(GetPlayerDistanceFromPoint(playerid, sx, sy, sz) > 1.5)
    {
        KillTimer(CraftTimer[playerid]);
        IWS_CraftCancel(playerid, true);
        return 1;
    }

    new tick  = GetPVarInt(playerid, "IWS_CraftTick") + 1;
    new total = GetPVarInt(playerid, "IWS_CraftTotal");
    SetPVarInt(playerid, "IWS_CraftTick", tick);

    new pct = floatround((float(tick) * 100.0) / float(total));
    new Float:bWidth = (float(pct) / 100.0) * 108.0;
    if(bWidth < 0.1) bWidth = 0.1;
    ShowTrainBoardingBar(playerid, "Crafting Weapon.....", bWidth, 0xFF6347FF);

    if(tick >= total)
    {
        KillTimer(CraftTimer[playerid]);
        IWS_CraftFinish(playerid);
    }

    return 1;
}

IWS_CraftCancel(playerid, bool:moved)
{
    if(!pCrafting[playerid]) return;
    pCrafting[playerid] = false;

    HideTrainBoardingBar(playerid);
    TogglePlayerControllable(playerid, 1);
    ClearAnimations(playerid);

    if(moved)
    {
        // Refund materials
        pMaterials[playerid] += GetPVarInt(playerid, "IWS_CraftMat");
        IWS_SavePlayer(playerid);
        SendErrorMessage(playerid, "Crafting cancelled - you moved! Materials refunded.");
    }
}

IWS_CraftFinish(playerid)
{
    if(!IsPlayerConnected(playerid)) return;
    if(GetPVarInt(playerid, "IWS_CraftPID") != PlayerData[playerid][pID]) return;

    pCrafting[playerid] = false;
    HideTrainBoardingBar(playerid);
    TogglePlayerControllable(playerid, 1);
    ClearAnimations(playerid);

    new weaponid   = GetPVarInt(playerid, "IWS_CraftWpn");
    new ammo       = GetPVarInt(playerid, "IWS_CraftAmmo");
    new free_slot  = FindFreePackageSlot(playerid);

    if(free_slot == -1)
    {
        SendErrorMessage(playerid, "No package slot available. Craft lost!");
        return;
    }

    PlayerData[playerid][pPackageWP][free_slot]   = weaponid;
    PlayerData[playerid][pPackageAmmo][free_slot] = ammo;

    pGunCraftDelay[playerid] = gettime() + CRAFT_COOLDOWN;

    Player_SavePackage(playerid);
    IWS_SavePlayer(playerid);

    new ci = IWS_WeaponToCraftIdx(weaponid);
    SendClientMessageEx(playerid, COLOR_LIGHTRED, "[ ! ]{FFFFFF} Crafting complete! %s (%d ammo) added to your weapon package (slot %d). Next craft available in 20 minutes.",
        (ci != -1) ? schematic_names[craft_sch_idx[ci]] : "Weapon", ammo, free_slot + 1);

    new ci2 = ci; // alias to satisfy log
    SQL_LogAction(playerid, "Crafted %s with %d ammo | Used %d materials",
        (ci2 != -1) ? schematic_names[craft_sch_idx[ci2]] : "Unknown", ammo, GetPVarInt(playerid, "IWS_CraftMat"));
}

// --- Delay entry (called from BusJob.pwn CMD:delays) ---

// Returns formatted delay line for /delays, or empty string if not on cooldown
IWS_GetDelayLine(playerid, dest[], maxlen)
{
    new remaining = pGunCraftDelay[playerid] - gettime();
    if(remaining > 0)
        format(dest, maxlen, "{FFFFFF}Gun Crafting: {FF0000}%d min %d sec left\n", remaining / 60, remaining % 60);
    else
        format(dest, maxlen, "{FFFFFF}Gun Crafting: {00FF00}Available\n");
}

// --- Module Init ---

IWS_Init()
{
    IWS_LoadPickups();
}
