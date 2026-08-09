#include <YSI_Coding\y_hooks>

// ─── Crop config ───────────────────────────────────────────────────────────────
#define MAX_CROPS       3
#define MAX_FARM_PLOTS  1000 // Effectively unlimited active planted crops server-wide
#define FARM_COUNT      2

// Crop IDs
#define CROP_WHEAT      0
#define CROP_COTTON     1
#define CROP_FRUIT      2

// Growth stages (0=planted, 1=growing, 2=mature-half, 3=ready)
#define CROP_STAGES     4

// Industry commodity IDs (from Industry.pwn g_arrIndItemNames index)
// dyes=0, gunpowder=1, coins=2, scrap=3, wood=4, cotton=5, milk=6, bev=7, meat=8, cereal=9, eggs=10, ...fruit=15
new const gCropCommodity[MAX_CROPS] = { 9, 5, 15 };         // cereal, cotton, fruit
new const gCropSeedPrice[MAX_CROPS] = { 150, 350, 600 };    // buy price per batch
new const gCropGrowTime[MAX_CROPS]  = { 40, 50, 60 };       // minutes per full growth
new const gCropYield[MAX_CROPS]     = { 10, 8, 8 };         // units per harvest
new const gCropCoopPrice[MAX_CROPS] = { 20, 50, 85 };       // $ per unit at co-op

new const gCropName[MAX_CROPS][] = { "Wheat", "Cotton", "Fruit" };

// Plant object models (SA-MP existing plant models)
// Wheat (806), Cotton (862), Fruit Tree (19473)
new const gCropModel[MAX_CROPS] = { 806, 862, 19473 };
new const Float:gCropZOffset[MAX_CROPS] = { -0.5, -1.2, -1.2 };

// World Produce Bale (Model 1453) dropped on ground when Combine harvests plants
#define MAX_WORLD_BALES 100
#define PRODUCE_BALE_MODEL 1453

enum E_WORLD_BALE
{
    baleActive,
    baleAmount,                             // exact product units inside this bale
    balePlantCount,                         // number of plants harvested into this bale (max 50)
    baleObject,                             // Streamer Dynamic Object ID (Model 1453)
    STREAMER_TAG_3D_TEXT_LABEL:baleLabel,   // Streamer 3D Text Label ID
    Float:balePosX,
    Float:balePosY,
    Float:balePosZ
};
new WorldBale[MAX_WORLD_BALES][E_WORLD_BALE];

// Number of Model 1453 bales and total products loaded in pickup trucks (Sadler:543, Bobcat:422, Walton:478)
new vBaleCount[MAX_VEHICLES];
new vBaleProducts[MAX_VEHICLES];

// Active bale index currently being filled by Combine per player
new gPlayerActiveBale[MAX_PLAYERS];





// ─── Farm Zone Areas (hardcoded from Zone Editor) ───────────────────────────
// 4 zones: Flint Range 1, Flint Range 2, Flint Range 3, Blueberry Land 1
#define FARM_ZONE_COUNT 4
new STREAMER_TAG_AREA:gFarmZoneAreaID[FARM_ZONE_COUNT];

// Zone polygon points from FarmZone.txt
new Float:gFarmZonePoints_0[] = {
    -471.0,-1409.0,-401.0,-1400.0,-372.0,-1381.0,-354.0,-1322.0,-342.0,-1264.0,-435.0,-1278.0,-463.0,-1287.0,-505.0,-1288.0,-556.0,-1288.0,-589.0,-1288.0,
    -591.0,-1379.0,-593.0,-1411.0,-554.0,-1440.0,-521.0,-1419.0,-503.0,-1412.0,-471.0,-1409.0
}; // Flint Range 1
new Float:gFarmZonePoints_1[] = {
    -327.0,-1311.0,-285.0,-1312.0,-220.0,-1309.0,-190.0,-1305.0,-160.0,-1297.0,-165.0,-1330.0,-165.0,-1370.0,-162.0,-1410.0,-160.0,-1416.0,-206.0,-1424.0,
    -226.0,-1426.0,-307.0,-1433.0,-332.0,-1433.0,-334.0,-1431.0,-327.0,-1311.0
}; // Flint Range 2
new Float:gFarmZonePoints_2[] = {
    -336.0,-1466.0,-212.0,-1466.0,-212.0,-1520.0,-241.0,-1559.0,-333.0,-1560.0,-337.0,-1541.0,-339.0,-1513.0,-336.0,-1466.0
}; // Flint Range 3
new Float:gFarmZonePoints_3[] = {
    -231.0,103.0,-244.0,79.0,-271.0,-9.0,-279.0,-41.0,-276.0,-56.0,-264.0,-70.0,-237.0,-81.0,-220.0,-85.0,-193.0,-85.0,-181.0,-85.0,
    -121.0,61.0,-231.0,103.0
}; // Blueberry Land 1

// ─── Farm plot in-memory state ─────────────────────────────────────────────────
enum E_PLOT
{
    plotFarmId,
    plotIdx,
    plotCropId,     // -1 = empty
    plotStage,      // 0-3
    plotOwnerId,    // character DB id
    plotOwnerName[MAX_PLAYER_NAME],
    plotPlantTime,  // unix timestamp of planting
    plotDBId,       // row id in farm_plots table (0 = not in DB yet)
    plotObject,     // Streamer dynamic object id
    STREAMER_TAG_CP:plotCP,               // Red dynamic checkpoint id
    STREAMER_TAG_3D_TEXT_LABEL:plotLabel, // Dynamic 3D text label id
    Float:plotPosX,
    Float:plotPosY,
    Float:plotPosZ
};
new PlotData[MAX_FARM_PLOTS][E_PLOT];
new gPlotCount = 0;

// Per-player produce inventory
new pProduce[MAX_PLAYERS][MAX_CROPS];

// Per-player seed inventory
new pSeeds[MAX_PLAYERS][MAX_CROPS];

// Dynamic Seed Shop & Co-op Points
#define MAX_DYNAMIC_SEEDSHOPS 20
#define MAX_DYNAMIC_COOPS     20

enum E_FARM_POINT
{
    pointDBId,
    STREAMER_TAG_PICKUP:pointPickup,
    STREAMER_TAG_3D_TEXT_LABEL:pointLabel,
    Float:pointPosX,
    Float:pointPosY,
    Float:pointPosZ
};

new DynamicSeedShop[MAX_DYNAMIC_SEEDSHOPS][E_FARM_POINT];
new DynamicCoop[MAX_DYNAMIC_COOPS][E_FARM_POINT];

// ─── Helpers ──────────────────────────────────────────────────────────────────

stock IsPickupTruck(vehicleid)
{
    if(vehicleid <= 0 || vehicleid >= MAX_VEHICLES) return 0;
    new model = GetVehicleModel(vehicleid);
    if(model == 543 || model == 422 || model == 478) return 1; // Sadler (543), Bobcat (422), Walton (478)
    return 0;
}

stock Farmer_SpawnWorldBale(Float:x, Float:y, Float:z, initialAmount)
{
    new slot = -1;
    for(new i = 0; i < MAX_WORLD_BALES; i++)
    {
        if(!WorldBale[i][baleActive])
        {
            slot = i;
            break;
        }
    }
    if(slot == -1) return -1;

    WorldBale[slot][baleActive]     = 1;
    WorldBale[slot][baleAmount]     = initialAmount;
    WorldBale[slot][balePlantCount] = 1;
    WorldBale[slot][balePosX]       = x;
    WorldBale[slot][balePosY]       = y;
    WorldBale[slot][balePosZ]       = z;

    // Model 1453 Z offset lowered to -1.0 so it rests firmly on the ground
    WorldBale[slot][baleObject] = CreateDynamicObject(PRODUCE_BALE_MODEL, x, y, z - 1.0, 0.0, 0.0, 0.0, 0, 0);

    new labelStr[160];
    format(labelStr, sizeof(labelStr), "{FFCC00}Produce Bale\n{FFFFFF}Model 1453 ({A4D247}%d Products{FFFFFF})\n{CCCCCC}Use /farm load (Sadler 543 / Bobcat 422 / Walton 478)", initialAmount);
    WorldBale[slot][baleLabel] = CreateDynamic3DTextLabel(labelStr, 0xFFFFFFFF, x, y, z + 0.5, 15.0, 0, 0, 0);

    return slot;
}

stock Farmer_UpdateWorldBale(slot)
{
    if(slot < 0 || slot >= MAX_WORLD_BALES || !WorldBale[slot][baleActive]) return 0;
    new labelStr[160];
    format(labelStr, sizeof(labelStr), "{FFCC00}Produce Bale\n{FFFFFF}Model 1453 ({A4D247}%d Products{FFFFFF})\n{CCCCCC}Use /farm load (Sadler 543 / Bobcat 422 / Walton 478)", WorldBale[slot][baleAmount]);
    UpdateDynamic3DTextLabelText(WorldBale[slot][baleLabel], 0xFFFFFFFF, labelStr);
    return 1;
}

stock Farmer_DestroyWorldBale(slot)
{
    if(slot < 0 || slot >= MAX_WORLD_BALES) return 0;
    if(WorldBale[slot][baleObject] != 0)
    {
        DestroyDynamicObject(WorldBale[slot][baleObject]);
        WorldBale[slot][baleObject] = 0;
    }
    if(WorldBale[slot][baleLabel] != STREAMER_TAG_3D_TEXT_LABEL:0)
    {
        DestroyDynamic3DTextLabel(WorldBale[slot][baleLabel]);
        WorldBale[slot][baleLabel] = STREAMER_TAG_3D_TEXT_LABEL:0;
    }
    WorldBale[slot][baleActive]     = 0;
    WorldBale[slot][baleAmount]     = 0;
    WorldBale[slot][balePlantCount] = 0;
    return 1;
}

// Returns zone index (0-3) if player is inside any farm zone, -1 otherwise
stock IsPlayerInFarmland(playerid)
{
    for(new i = 0; i < FARM_ZONE_COUNT; i++)
    {
        if(gFarmZoneAreaID[i] != INVALID_STREAMER_ID && IsPlayerInDynamicArea(playerid, gFarmZoneAreaID[i]))
            return i;
    }
    return -1;
}



stock Farmer_SavePlayerData(playerid)
{
    if(PlayerData[playerid][pID] <= 0) return 0;
    new query[128];
    format(query, sizeof(query), "UPDATE `characters` SET `farmerSeeds` = '%d,%d,%d', `farmerProduce` = '%d,%d,%d' WHERE `ID` = '%d'",
        pSeeds[playerid][0], pSeeds[playerid][1], pSeeds[playerid][2],
        pProduce[playerid][0], pProduce[playerid][1], pProduce[playerid][2],
        PlayerData[playerid][pID]);
    mysql_tquery(dbCon, query);
    return 1;
}

stock Farmer_LoadPlayerData(playerid)
{
    if(PlayerData[playerid][pID] <= 0) return 0;
    new query[128];
    format(query, sizeof(query), "SELECT `farmerSeeds`, `farmerProduce` FROM `characters` WHERE `ID` = '%d'", PlayerData[playerid][pID]);
    mysql_tquery(dbCon, query, "Farmer_OnLoadPlayerData", "i", playerid);
    return 1;
}

forward Farmer_OnLoadPlayerData(playerid);
public Farmer_OnLoadPlayerData(playerid)
{
    if(cache_num_rows() > 0)
    {
        new seedsStr[32], prodStr[32];
        cache_get_value_name(0, "farmerSeeds", seedsStr);
        cache_get_value_name(0, "farmerProduce", prodStr);
        sscanf(seedsStr, "p<,>ddd", pSeeds[playerid][0], pSeeds[playerid][1], pSeeds[playerid][2]);
        sscanf(prodStr, "p<,>ddd", pProduce[playerid][0], pProduce[playerid][1], pProduce[playerid][2]);
    }
    return 1;
}



// Find a StorageData entry for sale matching commodity
stock Farmer_FindStorage(const commodityId)
{
    foreach(new i : Industry)
    {
        if(StorageData[i][in_item] == commodityId && StorageData[i][in_trading_type] == 0)
            return i;
    }
    return -1;
}

// Growth: minutes elapsed from plantTime
stock Farmer_ComputeStage(const pIndex)
{
    new totalSeconds = gCropGrowTime[PlotData[pIndex][plotCropId]] * 60;
    new elapsed      = gettime() - PlotData[pIndex][plotPlantTime];
    if(totalSeconds <= 0) totalSeconds = 1;
    new stage = elapsed * (CROP_STAGES - 1) / totalSeconds;
    if(stage >= CROP_STAGES - 1) stage = CROP_STAGES - 1;
    return stage;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

stock Farmer_SetupTable()
{
    // Create tables
    mysql_tquery(dbCon,
        "CREATE TABLE IF NOT EXISTS `farm_plots` (\
        `id` INT AUTO_INCREMENT PRIMARY KEY,\
        `farmId` INT NOT NULL DEFAULT 0,\
        `plotIdx` INT NOT NULL,\
        `cropId` INT NOT NULL DEFAULT -1,\
        `stage` INT NOT NULL DEFAULT 0,\
        `plantedBy` INT NOT NULL DEFAULT 0,\
        `plantedByName` VARCHAR(24) DEFAULT '',\
        `plantTime` INT NOT NULL DEFAULT 0,\
        `wateredAt` INT NOT NULL DEFAULT 0\
        )");


    // Add character and plot columns (idempotent)
    mysql_tquery(dbCon, "ALTER TABLE `characters` ADD COLUMN `farmerRank` INT NOT NULL DEFAULT 1;");
    mysql_tquery(dbCon, "ALTER TABLE `characters` ADD COLUMN `farmerExp` INT NOT NULL DEFAULT 0;");
    mysql_tquery(dbCon, "ALTER TABLE `characters` ADD COLUMN `farmerSeeds` VARCHAR(32) NOT NULL DEFAULT '0,0,0';");
    mysql_tquery(dbCon, "ALTER TABLE `characters` ADD COLUMN `farmerProduce` VARCHAR(32) NOT NULL DEFAULT '0,0,0';");
    mysql_tquery(dbCon, "ALTER TABLE `farm_plots` ADD COLUMN `posX` FLOAT NOT NULL DEFAULT 0.0;");
    mysql_tquery(dbCon, "ALTER TABLE `farm_plots` ADD COLUMN `posY` FLOAT NOT NULL DEFAULT 0.0;");
    mysql_tquery(dbCon, "ALTER TABLE `farm_plots` ADD COLUMN `posZ` FLOAT NOT NULL DEFAULT 0.0;");

    // Create hardcoded farm zone polygons from Zone Editor
    gFarmZoneAreaID[0] = CreateDynamicPolygon(gFarmZonePoints_0, -100.0, 500.0, sizeof(gFarmZonePoints_0) / 2);
    gFarmZoneAreaID[1] = CreateDynamicPolygon(gFarmZonePoints_1, -100.0, 500.0, sizeof(gFarmZonePoints_1) / 2);
    gFarmZoneAreaID[2] = CreateDynamicPolygon(gFarmZonePoints_2, -100.0, 500.0, sizeof(gFarmZonePoints_2) / 2);
    gFarmZoneAreaID[3] = CreateDynamicPolygon(gFarmZonePoints_3, -100.0, 500.0, sizeof(gFarmZonePoints_3) / 2);
    printf("[FARMER]: Created %d farm zone polygons.", FARM_ZONE_COUNT);


    // Reset all plot slots in memory to empty (-1)
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        PlotData[i][plotCropId] = -1;
        PlotData[i][plotDBId]   = 0;
        PlotData[i][plotObject] = 0;
        PlotData[i][plotCP]     = STREAMER_TAG_CP:0;
        PlotData[i][plotLabel]  = STREAMER_TAG_3D_TEXT_LABEL:0;
        PlotData[i][plotPosX]   = 0.0;
        PlotData[i][plotPosY]   = 0.0;
        PlotData[i][plotPosZ]   = 0.0;
    }

    // Reset world produce bales
    for(new i = 0; i < MAX_WORLD_BALES; i++)
    {
        WorldBale[i][baleActive]     = 0;
        WorldBale[i][baleAmount]     = 0;
        WorldBale[i][balePlantCount] = 0;
        WorldBale[i][baleObject]     = 0;
        WorldBale[i][baleLabel]      = STREAMER_TAG_3D_TEXT_LABEL:0;
    }

    for(new i = 0; i < MAX_PLAYERS; i++)
        gPlayerActiveBale[i] = -1;

    // Load live plots
    mysql_tquery(dbCon, "SELECT * FROM `farm_plots`", "Farmer_LoadPlots");

    // Dynamic Seed Shops & Co-op Sell Points tables
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `farm_seedshops` (`id` INT AUTO_INCREMENT PRIMARY KEY, `posX` FLOAT, `posY` FLOAT, `posZ` FLOAT)");
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `farm_coops` (`id` INT AUTO_INCREMENT PRIMARY KEY, `posX` FLOAT, `posY` FLOAT, `posZ` FLOAT)");

    for(new i = 0; i < MAX_DYNAMIC_SEEDSHOPS; i++)
    {
        DynamicSeedShop[i][pointDBId]   = 0;
        DynamicSeedShop[i][pointPickup] = STREAMER_TAG_PICKUP:0;
        DynamicSeedShop[i][pointLabel]  = STREAMER_TAG_3D_TEXT_LABEL:0;
    }
    for(new i = 0; i < MAX_DYNAMIC_COOPS; i++)
    {
        DynamicCoop[i][pointDBId]   = 0;
        DynamicCoop[i][pointPickup] = STREAMER_TAG_PICKUP:0;
        DynamicCoop[i][pointLabel]  = STREAMER_TAG_3D_TEXT_LABEL:0;
    }

    mysql_tquery(dbCon, "SELECT * FROM `farm_seedshops`", "Farmer_LoadSeedShops");
    mysql_tquery(dbCon, "SELECT * FROM `farm_coops`",     "Farmer_LoadCoops");

    return 1;
}

forward Farmer_LoadPlots();
public Farmer_LoadPlots()
{
    new rows = cache_num_rows();
    gPlotCount = 0;

    for(new i = 0; i < rows && i < MAX_FARM_PLOTS; i++)
    {
        cache_get_value_name_int(i, "id",          PlotData[i][plotDBId]);
        cache_get_value_name_int(i, "farmId",      PlotData[i][plotFarmId]);
        cache_get_value_name_int(i, "plotIdx",     PlotData[i][plotIdx]);
        cache_get_value_name_int(i, "cropId",      PlotData[i][plotCropId]);
        cache_get_value_name_int(i, "stage",       PlotData[i][plotStage]);
        cache_get_value_name_int(i, "plantedBy",   PlotData[i][plotOwnerId]);
        cache_get_value_name(i,    "plantedByName",PlotData[i][plotOwnerName], MAX_PLAYER_NAME);
        cache_get_value_name_int(i, "plantTime",   PlotData[i][plotPlantTime]);
        cache_get_value_name_float(i, "posX",      PlotData[i][plotPosX]);
        cache_get_value_name_float(i, "posY",      PlotData[i][plotPosY]);
        cache_get_value_name_float(i, "posZ",      PlotData[i][plotPosZ]);



        // Recalculate stage from timestamps
        if(PlotData[i][plotCropId] >= 0)
            PlotData[i][plotStage] = Farmer_ComputeStage(i);

        // Spawn object
        Farmer_SpawnObject(i);
        gPlotCount++;
    }
    printf("[FARMER]: Loaded %d active farm plots.", gPlotCount);
    return 1;
}

forward OnSeedShopCreated(slot);
public OnSeedShopCreated(slot)
{
    DynamicSeedShop[slot][pointDBId] = cache_insert_id();
    return 1;
}

forward OnCoopCreated(slot);
public OnCoopCreated(slot)
{
    DynamicCoop[slot][pointDBId] = cache_insert_id();
    return 1;
}

forward Farmer_LoadSeedShops();
public Farmer_LoadSeedShops()
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_DYNAMIC_SEEDSHOPS; i++)
    {
        cache_get_value_name_int(i, "id", DynamicSeedShop[i][pointDBId]);
        cache_get_value_name_float(i, "posX", DynamicSeedShop[i][pointPosX]);
        cache_get_value_name_float(i, "posY", DynamicSeedShop[i][pointPosY]);
        cache_get_value_name_float(i, "posZ", DynamicSeedShop[i][pointPosZ]);

        new Float:px = DynamicSeedShop[i][pointPosX];
        new Float:py = DynamicSeedShop[i][pointPosY];
        new Float:pz = DynamicSeedShop[i][pointPosZ];

        DynamicSeedShop[i][pointPickup] = CreateDynamicPickup(1239, 23, px, py, pz, 0, 0);
        DynamicSeedShop[i][pointLabel]  = CreateDynamic3DTextLabel("{00CCFF}Seed Shop\n{FFFFFF}Use /farm buyseeds here", 0xFFFFFFFF, px, py, pz + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, 0);
    }
    printf("[FARMER]: Loaded %d dynamic seed shops.", rows);
    return 1;
}

forward Farmer_LoadCoops();
public Farmer_LoadCoops()
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_DYNAMIC_COOPS; i++)
    {
        cache_get_value_name_int(i, "id", DynamicCoop[i][pointDBId]);
        cache_get_value_name_float(i, "posX", DynamicCoop[i][pointPosX]);
        cache_get_value_name_float(i, "posY", DynamicCoop[i][pointPosY]);
        cache_get_value_name_float(i, "posZ", DynamicCoop[i][pointPosZ]);

        new Float:px = DynamicCoop[i][pointPosX];
        new Float:py = DynamicCoop[i][pointPosY];
        new Float:pz = DynamicCoop[i][pointPosZ];

        DynamicCoop[i][pointPickup] = CreateDynamicPickup(1318, 23, px, py, pz, 0, 0);
        DynamicCoop[i][pointLabel]  = CreateDynamic3DTextLabel("{FFCC00}Farm Co-op\n{FFFFFF}Use /farm sell here", 0xFFFFFFFF, px, py, pz + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, 0);
    }
    printf("[FARMER]: Loaded %d dynamic co-op sell points.", rows);
    return 1;
}

// Spawn/update dynamic object, red checkpoint, and 3D text label for a plot
Farmer_SpawnObject(pIndex)
{
    // Remove old object, checkpoint, label
    if(PlotData[pIndex][plotObject] != INVALID_OBJECT_ID && PlotData[pIndex][plotObject] != 0)
    {
        DestroyDynamicObject(PlotData[pIndex][plotObject]);
        PlotData[pIndex][plotObject] = 0;
    }
    if(PlotData[pIndex][plotCP] != STREAMER_TAG_CP:0)
    {
        DestroyDynamicCP(PlotData[pIndex][plotCP]);
        PlotData[pIndex][plotCP] = STREAMER_TAG_CP:0;
    }
    if(PlotData[pIndex][plotLabel] != STREAMER_TAG_3D_TEXT_LABEL:0)
    {
        DestroyDynamic3DTextLabel(PlotData[pIndex][plotLabel]);
        PlotData[pIndex][plotLabel] = STREAMER_TAG_3D_TEXT_LABEL:0;
    }

    if(PlotData[pIndex][plotCropId] < 0) return; // empty, no object

    new cropId = PlotData[pIndex][plotCropId];
    new model  = gCropModel[cropId];
    new Float:objectZ = PlotData[pIndex][plotPosZ] + gCropZOffset[cropId];

    // Spawn plant 3D object directly (wheat=806, cotton=862, fruit=19473)
    PlotData[pIndex][plotObject] = CreateDynamicObject(model,
        PlotData[pIndex][plotPosX],
        PlotData[pIndex][plotPosY],
        objectZ,
        0.0, 0.0, 0.0, 0, 0);

    // Create red dynamic checkpoint at plant position
    PlotData[pIndex][plotCP] = CreateDynamicCP(
        PlotData[pIndex][plotPosX],
        PlotData[pIndex][plotPosY],
        PlotData[pIndex][plotPosZ],
        1.5, 0, 0, -1, 15.0);

    // Calculate remaining growth time
    new growMins = gCropGrowTime[cropId];
    new elapsed  = (gettime() - PlotData[pIndex][plotPlantTime]) / 60;
    new remaining = growMins - elapsed;
    if(remaining < 0) remaining = 0;

    // Create 3D text label above plant object showing Crop Name, Owner, and Estimated Growth Time
    new labelText[200];
    if(PlotData[pIndex][plotStage] >= CROP_STAGES - 1 || remaining <= 0)
    {
        format(labelText, sizeof(labelText), "{FFCC00}%s Plant\n{FFFFFF}Owner: {A4D247}%s\n{00FF00}Status: Ready to Harvest!",
            gCropName[cropId], PlotData[pIndex][plotOwnerName]);
    }
    else
    {
        format(labelText, sizeof(labelText), "{FFCC00}%s Plant\n{FFFFFF}Owner: {A4D247}%s\n{FFFFFF}Growth Time Estimated: {FFCC00}~%d mins",
            gCropName[cropId], PlotData[pIndex][plotOwnerName], remaining);
    }

    PlotData[pIndex][plotLabel] = CreateDynamic3DTextLabel(labelText, 0xFFFFFFFF,
        PlotData[pIndex][plotPosX],
        PlotData[pIndex][plotPosY],
        PlotData[pIndex][plotPosZ] + 1.2,
        15.0, 0, 0, 0);
}

// Save plot to DB
Farmer_SavePlot(idx)
{
    new q[320];
    if(PlotData[idx][plotDBId] == 0)
    {
        // Insert
        mysql_format(dbCon, q, sizeof(q),
            "INSERT INTO `farm_plots` (`farmId`,`plotIdx`,`cropId`,`stage`,`plantedBy`,`plantedByName`,`plantTime`,`posX`,`posY`,`posZ`) VALUES ('%d','%d','%d','%d','%d','%e','%d','%.4f','%.4f','%.4f')",
            PlotData[idx][plotFarmId], PlotData[idx][plotIdx], PlotData[idx][plotCropId],
            PlotData[idx][plotStage], PlotData[idx][plotOwnerId], PlotData[idx][plotOwnerName],
            PlotData[idx][plotPlantTime],
            PlotData[idx][plotPosX], PlotData[idx][plotPosY], PlotData[idx][plotPosZ]);
        mysql_tquery(dbCon, q, "Farmer_OnPlotInserted", "d", idx);
    }
    else
    {
        mysql_format(dbCon, q, sizeof(q),
            "UPDATE `farm_plots` SET `cropId`='%d',`stage`='%d',`plantTime`='%d',`posX`='%.4f',`posY`='%.4f',`posZ`='%.4f' WHERE `id`='%d'",
            PlotData[idx][plotCropId], PlotData[idx][plotStage],
            PlotData[idx][plotPlantTime],
            PlotData[idx][plotPosX], PlotData[idx][plotPosY], PlotData[idx][plotPosZ],
            PlotData[idx][plotDBId]);
        mysql_tquery(dbCon, q);
    }
}

forward Farmer_OnPlotInserted(idx);
public Farmer_OnPlotInserted(idx)
{
    PlotData[idx][plotDBId] = cache_insert_id();
    return 1;
}

Farmer_DeletePlot(idx)
{
    if(PlotData[idx][plotDBId] > 0)
    {
        new q[64];
        format(q, sizeof(q), "DELETE FROM `farm_plots` WHERE `id`='%d'", PlotData[idx][plotDBId]);
        mysql_tquery(dbCon, q);
    }

    if(PlotData[idx][plotObject] != 0)
    {
        DestroyDynamicObject(PlotData[idx][plotObject]);
        PlotData[idx][plotObject] = 0;
    }
    if(PlotData[idx][plotCP] != STREAMER_TAG_CP:0)
    {
        DestroyDynamicCP(PlotData[idx][plotCP]);
        PlotData[idx][plotCP] = STREAMER_TAG_CP:0;
    }
    if(PlotData[idx][plotLabel] != STREAMER_TAG_3D_TEXT_LABEL:0)
    {
        DestroyDynamic3DTextLabel(PlotData[idx][plotLabel]);
        PlotData[idx][plotLabel] = STREAMER_TAG_3D_TEXT_LABEL:0;
    }

    PlotData[idx][plotCropId]   = -1;
    PlotData[idx][plotStage]    = 0;
    PlotData[idx][plotOwnerId]  = 0;
    PlotData[idx][plotOwnerName][0] = EOS;
    PlotData[idx][plotPlantTime]= 0;
    PlotData[idx][plotDBId]     = 0;
    gPlotCount--;
}

// ─── Server growth tick (called from task Server[60000]) ──────────────────────

Farmer_PlotTick()
{
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] < 0) continue;

        new newStage = Farmer_ComputeStage(i);
        PlotData[i][plotStage] = newStage;
        Farmer_SpawnObject(i); // update 3D label & growth time countdown
    }
}

// ─── Restock industry ─────────────────────────────────────────────────────────

Farmer_Restock(cropId, amount)
{
    new commodityId = gCropCommodity[cropId];
    new storIdx     = Farmer_FindStorage(commodityId);
    if(storIdx == -1)
    {
        // ponytail: log only; user still gets paid
        printf("[FARMER]: No for-sale storage for commodity %d (crop %d). Stock not updated.", commodityId, cropId);
        return 0;
    }

    StorageData[storIdx][in_stock] += amount;
    if(StorageData[storIdx][in_stock] > StorageData[storIdx][in_maximum])
        StorageData[storIdx][in_stock] = StorageData[storIdx][in_maximum];

    UpdateStorage(storIdx);
    saveStorage(storIdx);
    return 1;
}

// ─── Commands: /farm [sub] ────────────────────────────────────────────────────

CMD:farm(playerid, params[])
{
    new sub[16], rest[64];
    if(sscanf(params, "s[16]S()[64]", sub, rest) || isnull(sub))
    {
        SendClientMessage(playerid, 0xFFFFFFFF, "[FARM] Usage: /farm [plant/harvest/load/sell/buyseeds/info]");
        return 1;
    }

    // Route sub-commands
    if(!strcmp(sub, "buyseeds", true))  return Farmer_CmdBuySeeds(playerid, rest);
    if(!strcmp(sub, "plant",    true))  return Farmer_CmdPlant   (playerid, rest);
    if(!strcmp(sub, "harvest",  true))  return Farmer_CmdHarvest (playerid);
    if(!strcmp(sub, "load",     true))  return Farmer_CmdLoad    (playerid);
    if(!strcmp(sub, "sell",     true))  return Farmer_CmdSell    (playerid, rest);
    if(!strcmp(sub, "info",     true))  return Farmer_CmdInfo    (playerid);
    if(!strcmp(sub, "stopharvest", true))
    {
        // Legacy alias
        if(far_start[playerid])
        {
            DisablePlayerCheckpoint(playerid);
            gPlayerCheckpointStatus[playerid] = CHECKPOINT_NONE;
            far_start[playerid] = 0;
            far_veh[playerid]   = INVALID_VEHICLE_ID;
            SendClientMessage(playerid, 0xFFFFFFFF, "[FARM] Stopped harvesting.");
        }
        else SendClientMessage(playerid, 0xFFFFFFFF, "[FARM] You are not harvesting.");
        return 1;
    }
    // Admin
    if(!strcmp(sub, "plots",  true))  return Farmer_AdminPlots (playerid);
    if(!strcmp(sub, "reset",  true))  return Farmer_AdminReset (playerid, rest);
    if(!strcmp(sub, "speed",  true))  return Farmer_AdminSpeed (playerid, rest);

    SendClientMessage(playerid, 0xFFFFFFFF, "[FARM] Unknown sub-command. Try /farm info.");
    return 1;
}

// /farm buyseeds [wheat/cotton/fruit] [amount] OR /farm buyseeds create/delete (admin)
Farmer_CmdBuySeeds(playerid, const params[])
{
    new sub[16], arg[32];
    sscanf(params, "s[16]S()[32]", sub, arg);

    // Admin create/delete
    if(!strcmp(sub, "create", true))
    {
        if(PlayerData[playerid][pAdmin] < 3)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Admin level 3+ required.");

        new slot = -1;
        for(new i = 0; i < MAX_DYNAMIC_SEEDSHOPS; i++)
        {
            if(DynamicSeedShop[i][pointDBId] == 0)
            {
                slot = i;
                break;
            }
        }
        if(slot == -1)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM ADMIN] Maximum dynamic seed shops reached.");

        new Float:px, Float:py, Float:pz;
        GetPlayerPos(playerid, px, py, pz);

        DynamicSeedShop[slot][pointPosX] = px;
        DynamicSeedShop[slot][pointPosY] = py;
        DynamicSeedShop[slot][pointPosZ] = pz;
        DynamicSeedShop[slot][pointPickup] = CreateDynamicPickup(1239, 23, px, py, pz, 0, 0);
        DynamicSeedShop[slot][pointLabel]  = CreateDynamic3DTextLabel("{00CCFF}Seed Shop\n{FFFFFF}Use /farm buyseeds here", 0xFFFFFFFF, px, py, pz + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, 0);

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `farm_seedshops` (`posX`, `posY`, `posZ`) VALUES ('%.4f', '%.4f', '%.4f')", px, py, pz);
        mysql_tquery(dbCon, query, "OnSeedShopCreated", "i", slot);

        return SendClientMessage(playerid, 0xA4D247FF, "[FARM ADMIN] Created new Seed Shop point at your position.");
    }
    if(!strcmp(sub, "delete", true))
    {
        if(PlayerData[playerid][pAdmin] < 3)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Admin level 3+ required.");

        new Float:px, Float:py, Float:pz;
        GetPlayerPos(playerid, px, py, pz);

        new found = -1;
        for(new i = 0; i < MAX_DYNAMIC_SEEDSHOPS; i++)
        {
            if(DynamicSeedShop[i][pointDBId] == 0) continue;
            if(VectorSize(px - DynamicSeedShop[i][pointPosX], py - DynamicSeedShop[i][pointPosY], pz - DynamicSeedShop[i][pointPosZ]) <= 5.0)
            {
                found = i;
                break;
            }
        }
        if(found == -1)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM ADMIN] No Seed Shop point nearby (within 5.0 meters).");

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `farm_seedshops` WHERE `id` = '%d'", DynamicSeedShop[found][pointDBId]);
        mysql_tquery(dbCon, query);

        if(DynamicSeedShop[found][pointPickup] != STREAMER_TAG_PICKUP:0) DestroyDynamicPickup(DynamicSeedShop[found][pointPickup]);
        if(DynamicSeedShop[found][pointLabel] != STREAMER_TAG_3D_TEXT_LABEL:0) DestroyDynamic3DTextLabel(DynamicSeedShop[found][pointLabel]);

        DynamicSeedShop[found][pointDBId]   = 0;
        DynamicSeedShop[found][pointPickup] = STREAMER_TAG_PICKUP:0;
        DynamicSeedShop[found][pointLabel]  = STREAMER_TAG_3D_TEXT_LABEL:0;

        return SendClientMessage(playerid, 0xA4D247FF, "[FARM ADMIN] Seed Shop point deleted successfully.");
    }

    if(PlayerData[playerid][pJob] != JOB_FARMER)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You need to be a farmer.");

    // Check near any dynamic seed shop
    new nearShop = -1;
    new Float:px, Float:py, Float:pz;
    GetPlayerPos(playerid, px, py, pz);
    for(new i = 0; i < MAX_DYNAMIC_SEEDSHOPS; i++)
    {
        if(DynamicSeedShop[i][pointDBId] == 0) continue;
        if(VectorSize(px - DynamicSeedShop[i][pointPosX], py - DynamicSeedShop[i][pointPosY], pz - DynamicSeedShop[i][pointPosZ]) <= 4.0)
        {
            nearShop = i;
            break;
        }
    }
    if(nearShop == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You are not standing near a Seed Shop. (Admins: /farm buyseeds create/delete)");

    new cropName[16], amount = 1;
    if(sscanf(params, "s[16]I(1)", cropName, amount) || isnull(cropName))
    {
        // Show dialog with header
        new dStr[256];
        format(dStr, sizeof(dStr), "Crop\tPrice\tStatus\n");
        for(new c = 0; c < MAX_CROPS; c++)
        {
            new line[64];
            format(line, sizeof(line), "%s\t$%d\t{A4D247}Available\n", gCropName[c], gCropSeedPrice[c]);
            strcat(dStr, line, sizeof(dStr));
        }
        Dialog_Show(playerid, FarmBuySeeds, DIALOG_STYLE_TABLIST_HEADERS,
            "Seed Shop", dStr, "Buy", "Cancel");
        return 1;
    }

    // Direct buy
    new cropId = -1;
    if(!strcmp(cropName, "wheat",  true)) cropId = CROP_WHEAT;
    if(!strcmp(cropName, "cotton", true)) cropId = CROP_COTTON;
    if(!strcmp(cropName, "fruit",  true)) cropId = CROP_FRUIT;

    if(cropId == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Usage: /farm buyseeds [wheat/cotton/fruit] [amount]");

    return Farmer_BuySeed(playerid, cropId, amount);
}

Farmer_BuySeed(playerid, cropId, amount = 1)
{
    if(amount < 1 || amount > 100)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Amount must be between 1 and 100.");

    new unitPrice  = gCropSeedPrice[cropId];
    new totalPrice = unitPrice * amount;
    if(PlayerData[playerid][pCash] < totalPrice)
    {
        new msg[64];
        format(msg, sizeof(msg), "[FARM] Not enough cash ($%d required).", totalPrice);
        return SendClientMessage(playerid, 0xFF6666FF, msg);
    }

    SendPlayerMoney(playerid, -totalPrice);
    pSeeds[playerid][cropId] += amount;
    Farmer_SavePlayerData(playerid);

    new msg[128];
    format(msg, sizeof(msg), "[FARM] Bought %d batch(es) of %s seeds for $%d. Total seeds: %d", amount, gCropName[cropId], totalPrice, pSeeds[playerid][cropId]);
    return SendClientMessage(playerid, 0xA4D247FF, msg);
}

// /farm plant [wheat/cotton/fruit]
Farmer_CmdPlant(playerid, const params[])
{
    if(PlayerData[playerid][pJob] != JOB_FARMER)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You need to be a farmer.");

    new cropName[16];
    if(sscanf(params, "s[16]", cropName) || isnull(cropName))
        return SendClientMessage(playerid, 0xFFFFFFFF, "[FARM] Usage: /farm plant [wheat/cotton/fruit]");

    new cropId = -1;
    if(!strcmp(cropName, "wheat",  true)) cropId = CROP_WHEAT;
    if(!strcmp(cropName, "cotton", true)) cropId = CROP_COTTON;
    if(!strcmp(cropName, "fruit",  true)) cropId = CROP_FRUIT;

    if(cropId == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Valid crops: wheat, cotton, fruit");

    if(pSeeds[playerid][cropId] < 1)
    {
        new msg[64];
        format(msg, sizeof(msg), "[FARM] You have no %s seeds. Buy some at the seed shop.", gCropName[cropId]);
        return SendClientMessage(playerid, 0xFF6666FF, msg);
    }

    // Check if player is standing inside any registered farmland polygon
    new farmlandIdx = IsPlayerInFarmland(playerid);
    if(farmlandIdx == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You are not standing inside any registered farmland polygon.");

    new Float:px, Float:py, Float:pz;
    GetPlayerPos(playerid, px, py, pz);

    // Check proximity to existing active plants (prevent stacking)
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] < 0) continue;
        if(IsPlayerInRangeOfPoint(playerid, 2.0, PlotData[i][plotPosX], PlotData[i][plotPosY], PlotData[i][plotPosZ]))
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You are too close to an existing plant. Move a few steps away.");
    }

    // Find free slot in PlotData array
    new slot = -1;
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] == -1)
        {
            slot = i;
            break;
        }
    }
    if(slot == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] All plot slots are full.");

    // Plant at exact position
    pSeeds[playerid][cropId]--;
    PlotData[slot][plotFarmId]    = farmlandIdx;
    PlotData[slot][plotIdx]       = slot;
    PlotData[slot][plotCropId]    = cropId;
    PlotData[slot][plotStage]     = 0;
    PlotData[slot][plotOwnerId]   = PlayerData[playerid][pID];
    PlotData[slot][plotPlantTime] = gettime();
    PlotData[slot][plotDBId]      = 0;
    PlotData[slot][plotPosX]      = px;
    PlotData[slot][plotPosY]      = py;
    PlotData[slot][plotPosZ]      = pz;
    GetPlayerName(playerid, PlotData[slot][plotOwnerName], MAX_PLAYER_NAME);
    gPlotCount++;

    Farmer_SpawnObject(slot);
    Farmer_SavePlot(slot);
    Farmer_SavePlayerData(playerid);

    new zoneNames[FARM_ZONE_COUNT][] = {"Flint Range 1", "Flint Range 2", "Flint Range 3", "Blueberry Land 1"};
    new msg[128];
    format(msg, sizeof(msg), "[FARM] Planted %s in %s! Come back in ~%d minutes to harvest.", gCropName[cropId], zoneNames[farmlandIdx], gCropGrowTime[cropId]);
    return SendClientMessage(playerid, 0xA4D247FF, msg);
}

// /farm harvest (on foot: adds to /items up to max 50 products)
Farmer_CmdHarvest(playerid)
{
    if(PlayerData[playerid][pJob] != JOB_FARMER)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You need to be a farmer.");

    // Check if player is in combine harvester
    new vehicleid = GetPlayerVehicleID(playerid);
    if(vehicleid != INVALID_VEHICLE_ID && GetVehicleModel(vehicleid) == 532)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Combine Harvester harvests crops automatically as you drive over them!");

    // Check current produce total in /items
    new currentTotal = pProduce[playerid][0] + pProduce[playerid][1] + pProduce[playerid][2];
    if(currentTotal >= 50)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Your /items produce bag is full! (Max 50 products). Sell at co-op first.");

    // Find nearest ready plot owned by this player
    new found = -1;
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] < 0) continue;
        if(PlotData[i][plotOwnerId] != PlayerData[playerid][pID]) continue;
        if(PlotData[i][plotStage] < CROP_STAGES - 1) continue; // not ready

        if(IsPlayerInRangeOfPoint(playerid, 6.0, PlotData[i][plotPosX], PlotData[i][plotPosY], PlotData[i][plotPosZ]))
        {
            found = i;
            break;
        }
    }

    if(found == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] No ready crops nearby. Use /farm info to check your plots.");

    new cropId = PlotData[found][plotCropId];
    new harvestYield = (cropId == CROP_FRUIT) ? (random(4) + 3) : 1; // Fruit: 3-6 random, Wheat/Cotton: 1

    if(currentTotal + harvestYield > 50)
        harvestYield = 50 - currentTotal;

    pProduce[playerid][cropId] += harvestYield;

    // Clear plot
    Farmer_DeletePlot(found);
    Farmer_SavePlayerData(playerid);

    new newTotal = pProduce[playerid][0] + pProduce[playerid][1] + pProduce[playerid][2];

    new msg[144];
    format(msg, sizeof(msg), "[FARM] Harvested %s (+%d units)! Added to /items (%d/50 products).", gCropName[cropId], harvestYield, newTotal);
    SendClientMessage(playerid, 0xA4D247FF, msg);
    PlayerPlaySoundEx(playerid, 17803);
    return 1;
}

// /farm load — load nearby Produce Bale (Model 1453) into Sadler (543), Bobcat (422), or Walton (478)
Farmer_CmdLoad(playerid)
{
    if(PlayerData[playerid][pJob] != JOB_FARMER)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You need to be a farmer.");

    new Float:px, Float:py, Float:pz;
    GetPlayerPos(playerid, px, py, pz);

    // Find nearest Sadler (543), Bobcat (422), Walton (478) within 6.0 range
    new veh = INVALID_VEHICLE_ID;
    for(new v = 1; v < MAX_VEHICLES; v++)
    {
        if(!IsPickupTruck(v)) continue;
        new Float:vx, Float:vy, Float:vz;
        GetVehiclePos(v, vx, vy, vz);
        if(VectorSize(px - vx, py - vy, pz - vz) <= 6.0)
        {
            veh = v;
            break;
        }
    }

    if(veh == INVALID_VEHICLE_ID)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You must stand near a pickup truck.");

    if(vBaleCount[veh] >= 3)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] This pickup truck is full! Maximum capacity is 3 Produce Bales.");

    // Find nearest World Bale (Model 1453) within 5.0 range
    new foundBale = -1;
    new Float:minDist = 9999.0;
    for(new i = 0; i < MAX_WORLD_BALES; i++)
    {
        if(!WorldBale[i][baleActive]) continue;
        new Float:dist = VectorSize(px - WorldBale[i][balePosX], py - WorldBale[i][balePosY], pz - WorldBale[i][balePosZ]);
        if(dist <= 5.0 && dist < minDist)
        {
            minDist = dist;
            foundBale = i;
        }
    }

    if(foundBale == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] No Produce Bale found nearby on the ground.");

    new amount = WorldBale[foundBale][baleAmount];
    vBaleCount[veh]++;
    vBaleProducts[veh] += amount;

    // Reset active bale tracker if any player was filling this bale
    for(new p = 0; p < MAX_PLAYERS; p++)
    {
        if(gPlayerActiveBale[p] == foundBale)
            gPlayerActiveBale[p] = -1;
    }

    Farmer_DestroyWorldBale(foundBale);

    new msg[144];
    format(msg, sizeof(msg), "[FARM] Loaded Produce Bale (%d products) into pickup truck! Truck Cargo: %d/3 Bales (%d total products).",
        amount, vBaleCount[veh], vBaleProducts[veh]);
    SendClientMessage(playerid, 0xA4D247FF, msg);
    PlayerPlaySoundEx(playerid, 17803);
    return 1;
}

// /farm sell — sell produce from pickup truck cargo or /items at Co-op OR /farm sell create/delete (admin)
Farmer_CmdSell(playerid, const params[])
{
    new sub[16];
    sscanf(params, "s[16]", sub);

    // Admin create/delete
    if(!strcmp(sub, "create", true))
    {
        if(PlayerData[playerid][pAdmin] < 3)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Admin level 3+ required.");

        new slot = -1;
        for(new i = 0; i < MAX_DYNAMIC_COOPS; i++)
        {
            if(DynamicCoop[i][pointDBId] == 0)
            {
                slot = i;
                break;
            }
        }
        if(slot == -1)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM ADMIN] Maximum dynamic co-op sell points reached.");

        new Float:px, Float:py, Float:pz;
        GetPlayerPos(playerid, px, py, pz);

        DynamicCoop[slot][pointPosX] = px;
        DynamicCoop[slot][pointPosY] = py;
        DynamicCoop[slot][pointPosZ] = pz;
        DynamicCoop[slot][pointPickup] = CreateDynamicPickup(1318, 23, px, py, pz, 0, 0);
        DynamicCoop[slot][pointLabel]  = CreateDynamic3DTextLabel("{FFCC00}Farm Co-op\n{FFFFFF}Use /farm sell here", 0xFFFFFFFF, px, py, pz + 0.8, 15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, 0, 0);

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `farm_coops` (`posX`, `posY`, `posZ`) VALUES ('%.4f', '%.4f', '%.4f')", px, py, pz);
        mysql_tquery(dbCon, query, "OnCoopCreated", "i", slot);

        return SendClientMessage(playerid, 0xA4D247FF, "[FARM ADMIN] Created new Farm Co-op sell point at your position.");
    }
    if(!strcmp(sub, "delete", true))
    {
        if(PlayerData[playerid][pAdmin] < 3)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Admin level 3+ required.");

        new Float:px, Float:py, Float:pz;
        GetPlayerPos(playerid, px, py, pz);

        new found = -1;
        for(new i = 0; i < MAX_DYNAMIC_COOPS; i++)
        {
            if(DynamicCoop[i][pointDBId] == 0) continue;
            if(VectorSize(px - DynamicCoop[i][pointPosX], py - DynamicCoop[i][pointPosY], pz - DynamicCoop[i][pointPosZ]) <= 5.0)
            {
                found = i;
                break;
            }
        }
        if(found == -1)
            return SendClientMessage(playerid, 0xFF6666FF, "[FARM ADMIN] No Farm Co-op point nearby (within 5.0 meters).");

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `farm_coops` WHERE `id` = '%d'", DynamicCoop[found][pointDBId]);
        mysql_tquery(dbCon, query);

        if(DynamicCoop[found][pointPickup] != STREAMER_TAG_PICKUP:0) DestroyDynamicPickup(DynamicCoop[found][pointPickup]);
        if(DynamicCoop[found][pointLabel] != STREAMER_TAG_3D_TEXT_LABEL:0) DestroyDynamic3DTextLabel(DynamicCoop[found][pointLabel]);

        DynamicCoop[found][pointDBId]   = 0;
        DynamicCoop[found][pointPickup] = STREAMER_TAG_PICKUP:0;
        DynamicCoop[found][pointLabel]  = STREAMER_TAG_3D_TEXT_LABEL:0;

        return SendClientMessage(playerid, 0xA4D247FF, "[FARM ADMIN] Farm Co-op sell point deleted successfully.");
    }

    if(PlayerData[playerid][pJob] != JOB_FARMER)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You need to be a farmer.");

    // Check near dynamic co-op sell point
    new nearCoop = -1;
    new Float:px, Float:py, Float:pz;
    GetPlayerPos(playerid, px, py, pz);
    for(new i = 0; i < MAX_DYNAMIC_COOPS; i++)
    {
        if(DynamicCoop[i][pointDBId] == 0) continue;
        if(VectorSize(px - DynamicCoop[i][pointPosX], py - DynamicCoop[i][pointPosY], pz - DynamicCoop[i][pointPosZ]) <= 10.0)
        {
            nearCoop = i;
            break;
        }
    }
    if(nearCoop == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] You must be at a Farm Co-op sell point. (Admins: /farm sell create/delete)");

    // Mode 1: Sell from pickup truck (Model 543, 422, 478)
    new veh = GetPlayerVehicleID(playerid);
    if(veh == INVALID_VEHICLE_ID || !IsPickupTruck(veh))
    {
        veh = INVALID_VEHICLE_ID;
        for(new v = 1; v < MAX_VEHICLES; v++)
        {
            if(!IsPickupTruck(v)) continue;
            new Float:vx, Float:vy, Float:vz;
            GetVehiclePos(v, vx, vy, vz);
            if(VectorSize(px - vx, py - vy, pz - vz) <= 10.0)
            {
                veh = v;
                break;
            }
        }
    }

    if(veh != INVALID_VEHICLE_ID && IsPickupTruck(veh) && vBaleCount[veh] > 0)
    {
        new bales = vBaleCount[veh];
        new products = vBaleProducts[veh];
        new pricePerUnit = 50; // $50 per product unit
        new totalEarned = products * pricePerUnit;

        vBaleCount[veh] = 0;
        vBaleProducts[veh] = 0;
        Farmer_Restock(CROP_WHEAT, products);

        SendPlayerMoney(playerid, totalEarned);
        PlayerData[playerid][pPayCheck] += totalEarned;

        new msg[144];
        format(msg, sizeof(msg), "[FARM] Sold %d Produce Bales (%d total products) from pickup truck for $%d! Industry stock updated.", bales, products, totalEarned);
        SendClientMessage(playerid, 0xA4D247FF, msg);
        PlayerPlaySoundEx(playerid, 17803);
        return 1;
    }

    // Mode 2: Sell from /items (on foot)
    new totalItems = pProduce[playerid][0] + pProduce[playerid][1] + pProduce[playerid][2];
    if(totalItems > 0)
    {
        new totalEarned = 0;
        for(new c = 0; c < MAX_CROPS; c++)
        {
            if(pProduce[playerid][c] <= 0) continue;

            new units = pProduce[playerid][c];
            new earned = units * gCropCoopPrice[c];
            totalEarned += earned;

            Farmer_Restock(c, units);
            pProduce[playerid][c] = 0;
        }

        SendPlayerMoney(playerid, totalEarned);
        PlayerData[playerid][pPayCheck] += totalEarned;
        Farmer_SavePlayerData(playerid);

        new msg[128];
        format(msg, sizeof(msg), "[FARM] Sold %d products from /items for $%d! Industry stock updated.", totalItems, totalEarned);
        SendClientMessage(playerid, 0xA4D247FF, msg);
        PlayerPlaySoundEx(playerid, 17803);
        return 1;
    }

    SendClientMessage(playerid, 0xFF6666FF, "[FARM] No produce found in /items or in nearby Sadler/Bobcat/Walton pickup truck.");
    return 1;
}

// /farm info
Farmer_CmdInfo(playerid)
{
    // Items produce bag info
    new totalProduce = pProduce[playerid][0] + pProduce[playerid][1] + pProduce[playerid][2];
    new pMsg[128];
    format(pMsg, sizeof(pMsg), "[FARM] /items produce bag: %d/50 products (Wheat:%d | Cotton:%d | Fruit:%d)",
        totalProduce, pProduce[playerid][CROP_WHEAT], pProduce[playerid][CROP_COTTON], pProduce[playerid][CROP_FRUIT]);
    SendClientMessage(playerid, 0xFFFFFFFF, pMsg);

    // Pickup truck cargo info if in/near pickup
    new veh = GetPlayerVehicleID(playerid);
    if(veh != INVALID_VEHICLE_ID && IsPickupTruck(veh))
    {
        new vMsg[128];
        format(vMsg, sizeof(vMsg), "[FARM] Pickup Truck Bales (Model 1453): %d/3 Bales", vBaleCount[veh]);
        SendClientMessage(playerid, 0xFFFFFFFF, vMsg);
    }

    // Seeds
    new seedMsg[128] = "[FARM] Seeds: ";
    new hasSeeds = 0;
    for(new c = 0; c < MAX_CROPS; c++)
    {
        if(pSeeds[playerid][c] <= 0) continue;
        hasSeeds = 1;
        new tmp[32];
        format(tmp, sizeof(tmp), "%s:%d ", gCropName[c], pSeeds[playerid][c]);
        strcat(seedMsg, tmp, sizeof(seedMsg));
    }
    if(hasSeeds) SendClientMessage(playerid, 0xFFFFFFFF, seedMsg);

    // My plots
    new charId = PlayerData[playerid][pID];
    new plotsFound = 0;
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] < 0) continue;
        if(PlotData[i][plotOwnerId] != charId) continue;
        plotsFound++;

        new cropId   = PlotData[i][plotCropId];
        new stage    = Farmer_ComputeStage(i);
        new growMins = gCropGrowTime[cropId];
        new elapsed  = (gettime() - PlotData[i][plotPlantTime]) / 60;
        new remaining = growMins - elapsed;
        if(remaining < 0) remaining = 0;

        new pMsg2[128];
        if(stage >= CROP_STAGES - 1)
            format(pMsg2, sizeof(pMsg2), "[FARM] Plot %d: %s - {A4D247}READY TO HARVEST",
                PlotData[i][plotIdx] + 1, gCropName[cropId]);
        else
            format(pMsg2, sizeof(pMsg2), "[FARM] Plot %d: %s - ~%d min left",
                PlotData[i][plotIdx] + 1, gCropName[cropId], remaining);
        SendClientMessage(playerid, 0xCCCCCCFF, pMsg2);
    }
    if(!plotsFound) SendClientMessage(playerid, 0xCCCCCCFF, "[FARM] No active plots. Use /farm plant to start.");

    return 1;
}

// ─── Combine Harvester Auto-Harvest Timer ─────────────────────────────────────

ptask CombineHarvestTimer[1000](playerid)
{
    if(PlayerData[playerid][pJob] != JOB_FARMER) return 1;
    new vehicleid = GetPlayerVehicleID(playerid);
    if(vehicleid == INVALID_VEHICLE_ID || GetVehicleModel(vehicleid) != 532 || GetPlayerState(playerid) != PLAYER_STATE_DRIVER)
    {
        gPlayerActiveBale[playerid] = -1;
        return 1;
    }

    new Float:vx, Float:vy, Float:vz, Float:va;
    GetVehiclePos(vehicleid, vx, vy, vz);
    GetVehicleZAngle(vehicleid, va);

    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] < 0) continue;
        if(PlotData[i][plotStage] < CROP_STAGES - 1) continue; // not ready

        if(IsPlayerInRangeOfPoint(playerid, 8.0, PlotData[i][plotPosX], PlotData[i][plotPosY], PlotData[i][plotPosZ]))
        {
            new cropId = PlotData[i][plotCropId];
            new yield  = (cropId == CROP_FRUIT) ? (random(4) + 3) : 1; // Fruit: 3-6 random, Wheat/Cotton: 1

            Farmer_DeletePlot(i);

            new bSlot = gPlayerActiveBale[playerid];
            if(bSlot == -1 || !WorldBale[bSlot][baleActive] || WorldBale[bSlot][balePlantCount] >= 50)
            {
                // Calculate position 4.5 units BEHIND the Combine so it doesn't get stuck
                new Float:behindX = vx - (4.5 * floatsin(-va, degrees));
                new Float:behindY = vy - (4.5 * floatcos(-va, degrees));

                bSlot = Farmer_SpawnWorldBale(behindX, behindY, vz, yield);
                gPlayerActiveBale[playerid] = bSlot;

                new msg[144];
                format(msg, sizeof(msg), "[FARM COMBINE] Started Produce Bale! (+%d %s products). Use /farm load.", yield, gCropName[cropId]);
                SendClientMessage(playerid, 0xA4D247FF, msg);
                PlayerPlaySoundEx(playerid, 17803);
            }
            else
            {
                WorldBale[bSlot][baleAmount] += yield;
                WorldBale[bSlot][balePlantCount]++;
                Farmer_UpdateWorldBale(bSlot);
            }
            break; // 1 plot per tick
        }
    }
    return 1;
}

// ─── Admin commands ───────────────────────────────────────────────────────────

Farmer_AdminPlots(playerid)
{
    if(PlayerData[playerid][pAdmin] < 3)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Admin level 3+ required.");

    SendClientMessage(playerid, 0xFFCC00FF, "[FARM ADMIN] Active plots:");
    new found = 0;
    new zoneNames[FARM_ZONE_COUNT][] = {"Flint Range 1", "Flint Range 2", "Flint Range 3", "Blueberry Land 1"};
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] < 0) continue;
        found++;
        new zoneIdx = PlotData[i][plotFarmId];
        new msg[128];
        format(msg, sizeof(msg), "  Slot #%d | Zone: %s | Crop: %s | Stage: %d | Owner: %s",
            i + 1, (zoneIdx >= 0 && zoneIdx < FARM_ZONE_COUNT) ? zoneNames[zoneIdx] : "Unknown",
            gCropName[PlotData[i][plotCropId]], PlotData[i][plotStage],
            PlotData[i][plotOwnerName]);
        SendClientMessage(playerid, 0xFFFFFFFF, msg);
    }
    if(!found) SendClientMessage(playerid, 0xCCCCCCFF, "  No active plots.");
    return 1;
}

// /farm reset [slotID / optional: stand near crop] — admin hard-reset a plot
Farmer_AdminReset(playerid, const params[])
{
    if(PlayerData[playerid][pAdmin] < 3)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Admin level 3+ required.");

    new found = -1;

    // Option 1: Specified slot ID (1 - 1000)
    if(!isnull(params))
    {
        new slot = strval(params);
        if(slot >= 1 && slot <= MAX_FARM_PLOTS)
        {
            new idx = slot - 1;
            if(PlotData[idx][plotCropId] >= 0)
                found = idx;
        }
    }

    // Option 2: Stand near crop plant (5.0 range)
    if(found == -1)
    {
        for(new i = 0; i < MAX_FARM_PLOTS; i++)
        {
            if(PlotData[i][plotCropId] < 0) continue;
            if(IsPlayerInRangeOfPoint(playerid, 5.0, PlotData[i][plotPosX], PlotData[i][plotPosY], PlotData[i][plotPosZ]))
            {
                found = i;
                break;
            }
        }
    }

    if(found == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Usage: /farm reset [slotID] OR stand near an active crop.");

    Farmer_DeletePlot(found);
    SendClientMessage(playerid, 0xA4D247FF, "[FARM ADMIN] Crop plot cleared successfully.");
    return 1;
}

// /farm speed [slotID / "all" / optional: stand near crop] — admin instantly speed up crop growth to ready state
Farmer_AdminSpeed(playerid, const params[])
{
    if(PlayerData[playerid][pAdmin] < 3)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Admin level 3+ required.");

    new found = -1;

    // Mode 1: Check if "all" specified
    if(!isnull(params) && !strcmp(params, "all", true))
    {
        new count = 0;
        for(new i = 0; i < MAX_FARM_PLOTS; i++)
        {
            if(PlotData[i][plotCropId] < 0) continue;
            new cropId = PlotData[i][plotCropId];
            PlotData[i][plotPlantTime] = gettime() - (gCropGrowTime[cropId] * 60 + 10);
            PlotData[i][plotStage]     = CROP_STAGES - 1;
            Farmer_SpawnObject(i);
            Farmer_SavePlot(i);
            count++;
        }
        new msg[128];
        format(msg, sizeof(msg), "[FARM ADMIN] Speeded up all %d active crops! All crops are now ready to harvest.", count);
        return SendClientMessage(playerid, 0xA4D247FF, msg);
    }

    // Mode 2: Specified slot ID (1 - 1000)
    if(!isnull(params))
    {
        new slot = strval(params);
        if(slot >= 1 && slot <= MAX_FARM_PLOTS)
        {
            new idx = slot - 1;
            if(PlotData[idx][plotCropId] >= 0)
                found = idx;
        }
    }

    // Mode 3: Stand near crop plant (5.0 range)
    if(found == -1)
    {
        for(new i = 0; i < MAX_FARM_PLOTS; i++)
        {
            if(PlotData[i][plotCropId] < 0) continue;
            if(IsPlayerInRangeOfPoint(playerid, 5.0, PlotData[i][plotPosX], PlotData[i][plotPosY], PlotData[i][plotPosZ]))
            {
                found = i;
                break;
            }
        }
    }

    if(found == -1)
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Usage: /farm speed [slotID/all] OR stand near an active crop.");

    new cropId = PlotData[found][plotCropId];
    PlotData[found][plotPlantTime] = gettime() - (gCropGrowTime[cropId] * 60 + 10);
    PlotData[found][plotStage]     = CROP_STAGES - 1;

    Farmer_SpawnObject(found);
    Farmer_SavePlot(found);

    new msg[128];
    format(msg, sizeof(msg), "[FARM ADMIN] Speeded up Plot #%d (%s)! It is now ready to harvest.", found + 1, gCropName[cropId]);
    SendClientMessage(playerid, 0xA4D247FF, msg);
    return 1;
}

// ─── Dialog handler ────────────────────────────────────────────────────────────

Dialog:FarmBuySeeds(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;
    if(listitem < 0 || listitem >= MAX_CROPS) return 1;

    SetPVarInt(playerid, "BuySeed_Crop", listitem);

    new body[160], title[64];
    format(title, sizeof(title), "Buy Seeds - %s", gCropName[listitem]);
    format(body, sizeof(body), "Enter number of %s seed batches to buy (1-100):\nPrice per batch: $%d", gCropName[listitem], gCropSeedPrice[listitem]);
    Dialog_Show(playerid, FarmBuySeedsAmount, DIALOG_STYLE_INPUT, title, body, "Buy", "Cancel");
    return 1;
}

Dialog:FarmBuySeedsAmount(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new cropId = GetPVarInt(playerid, "BuySeed_Crop");
    DeletePVar(playerid, "BuySeed_Crop");

    new amount = strval(inputtext);
    if(amount < 1 || amount > 100)
    {
        return SendClientMessage(playerid, 0xFF6666FF, "[FARM] Invalid amount. Must be between 1 and 100.");
    }

    Farmer_BuySeed(playerid, cropId, amount);
    return 1;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

hook OnPlayerEnterDynamicCP(playerid, STREAMER_TAG_CP:checkpointid)
{
    for(new i = 0; i < MAX_FARM_PLOTS; i++)
    {
        if(PlotData[i][plotCropId] < 0) continue;
        if(PlotData[i][plotCP] == checkpointid)
        {
            new cropId = PlotData[i][plotCropId];
            new growMins = gCropGrowTime[cropId];
            new elapsed  = (gettime() - PlotData[i][plotPlantTime]) / 60;
            new remaining = growMins - elapsed;
            if(remaining < 0) remaining = 0;

            new msg[144];
            if(PlotData[i][plotStage] >= CROP_STAGES - 1 || remaining <= 0)
            {
                format(msg, sizeof(msg), "~y~Crop: ~w~%s~n~~w~Owner: ~g~%s~n~~g~READY TO HARVEST! (/farm harvest)",
                    gCropName[cropId], PlotData[i][plotOwnerName]);
                GameTextForPlayer(playerid, msg, 4000, 3);
            }
            else
            {
                format(msg, sizeof(msg), "~y~Crop: ~w~%s~n~~w~Owner: ~g~%s~n~~w~Growth Time Estimated: ~y~~h~%d mins",
                    gCropName[cropId], PlotData[i][plotOwnerName], remaining);
                GameTextForPlayer(playerid, msg, 4000, 3);
            }
            break;
        }
    }
    return 1;
}

hook Farmer_OnPlayerSpawn(playerid)
{
    Farmer_LoadPlayerData(playerid);
    return 1;
}

hook Farmer_OnPlayerDisconnect(playerid, reason)
{
    Farmer_SavePlayerData(playerid);
    for(new c = 0; c < MAX_CROPS; c++)
    {
        pProduce[playerid][c] = 0;
        pSeeds[playerid][c]   = 0;
    }
    return 1;
}
