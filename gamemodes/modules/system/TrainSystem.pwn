/*
    ============================================================================
    Los Jawa RP - Dynamic Train System & Train Driver Job Module
    ============================================================================
    Features:
    1. Dynamic Train Station Admin Suite (/trainstation) & Station Ticket Purchase (/buyticket)
    2. Dynamic Train Driver Center Admin Suite (/traincenter) & /trainjob join
    3. Dynamic Train Route Checkpoint Admin Suite (/traincheckpoint)
    4. 2-Checkpoint Relay Shift Duty System with 2-Minute Station Freeze (100%-0% / 0%-100%)
    5. Automatic Railroad Crossing Gates (/railcrossing)
    6. Camera Bug Fix & /me Horn RP Color Alignment
    7. TextDraw HUD Integration (Exported from RAILROAD_PROJECT-open.mp.txt)
    ============================================================================
*/

#include <YSI_Coding\y_hooks>

#define MAX_TRAIN_STATIONS (20)
#define MAX_TRAIN_CENTERS (10)
#define MAX_RAIL_CROSSINGS (30)
#define MAX_TRAIN_CHECKPOINTS (30)
#define TRAIN_DISPATCH_TIMEOUT (300) // 5 Minutes (300 seconds)

#if !defined TEXT_DRAW_FONT_0
#define TEXT_DRAW_FONT_0 (0)
#endif
#if !defined TEXT_DRAW_FONT_1
#define TEXT_DRAW_FONT_1 (1)
#endif
#if !defined TEXT_DRAW_FONT_2
#define TEXT_DRAW_FONT_2 (2)
#endif
#if !defined TEXT_DRAW_FONT_SPRITE_DRAW
#define TEXT_DRAW_FONT_SPRITE_DRAW (4)
#endif

// --- Data Structures ---

enum E_TRAIN_STATION
{
    tsID,
    tsName[64],
    Float:tsX,
    Float:tsY,
    Float:tsZ,
    tsWorld,
    tsInterior,
    tsPrice,
    tsPickup,
    Text3D:tsTextLabel
};

new TrainStations[MAX_TRAIN_STATIONS][E_TRAIN_STATION];

enum E_TRAIN_CENTER
{
    tcID,
    tcName[64],
    Float:tcX,
    Float:tcY,
    Float:tcZ,
    tcWorld,
    tcInterior,
    tcPickup,
    Text3D:tcTextLabel
};

new TrainCenters[MAX_TRAIN_CENTERS][E_TRAIN_CENTER];

enum E_RAIL_CROSSING
{
    rcID,
    rcObject,
    Float:rcX,
    Float:rcY,
    Float:rcZ,
    Float:rcRX,
    Float:rcRY,
    Float:rcRZ,
    Float:rcMoveRX,
    Float:rcMoveRY,
    Float:rcMoveRZ,
    bool:rcIsClosed
};

new RailCrossings[MAX_RAIL_CROSSINGS][E_RAIL_CROSSING];

enum E_TRAIN_CHECKPOINT
{
    cpID,
    cpName[64],
    Float:cpX,
    Float:cpY,
    Float:cpZ,
    Float:cpAngle,
    Float:cpSpeedLimit
};

new TrainCheckpoints[MAX_TRAIN_CHECKPOINTS][E_TRAIN_CHECKPOINT];
new TrainCheckpointCount = 0;

// Default Fallback Train Checkpoints (San Andreas Rail Loop)
new const gDefaultTrainRoute[5][E_TRAIN_CHECKPOINT] = {
    {1, "Unity Station", 1753.8125, -1953.6406, 13.5469, 270.0, 60.0},
    {2, "Market Station", 827.6000, -1364.5000, -0.5000, 270.0, 50.0},
    {3, "Cranberry Station", -1943.0000, 158.0000, 25.7000, 180.0, 60.0},
    {4, "Yellow Bell Station", 1450.0000, 2635.0000, 10.8000, 90.0, 60.0},
    {5, "Linden Station", 2862.0000, 1280.0000, 10.8000, 90.0, 55.0}
};

// --- Queue & Driver Data ---

new gCurrentRouteIndex = 0; // Current track position index
new bool:PlayerInTrainQueue[MAX_PLAYERS];
new PlayerTrainQueuePos[MAX_PLAYERS];
new PlayerDispatchTimer[MAX_PLAYERS];
new bool:PlayerDispatchActive[MAX_PLAYERS];
new PlayerTrainVehicle[MAX_PLAYERS];
new gStaticTrainLocomotive = INVALID_VEHICLE_ID;
new gStaticTrainCarriage = INVALID_VEHICLE_ID;

new PlayerTrainStep[MAX_PLAYERS];
new PlayerLegsCompleted[MAX_PLAYERS];
new bool:PlayerHasTrainTicket[MAX_PLAYERS];
new PlayerBoardingTimer[MAX_PLAYERS];
new bool:PlayerBoardingActive[MAX_PLAYERS];
new Float:PlayerShiftStartPos[MAX_PLAYERS][3];
new gDispatchDelayTimer = 0;

new PlayerDepartureTimer[MAX_PLAYERS];
new bool:PlayerDepartureWarning[MAX_PLAYERS];
new PlayerExitTimer[MAX_PLAYERS];
new PlayerMountTimer[MAX_PLAYERS];

// --- Global TextDraws ---

new Text:gTrainDispatchBG = Text:INVALID_TEXT_DRAW;
new Text:gTrainDispatchHeader = Text:INVALID_TEXT_DRAW;
new Text:gTrainPassengerBG = Text:INVALID_TEXT_DRAW;
new Text:gTrainPassengerHeader = Text:INVALID_TEXT_DRAW;
new Text:gTrainBoardingHeader = Text:INVALID_TEXT_DRAW;
new Text:gTrainBoardingBG = Text:INVALID_TEXT_DRAW;

// --- Player TextDraws ---

new PlayerText:pTrainDummy[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:pTrainReportTo[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:pTrainTimeLeft[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:pTrainPassengerName[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:pTrainPassengerNext[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:pTrainBoardingBar[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

new PlayerTrainDistanceTimer[MAX_PLAYERS];

// Queue List Storage
new TrainQueueList[MAX_PLAYERS];
new TrainQueueCount = 0;

// --- Forward Declarations ---
forward CheckAndDispatchNextDriver();

// --- Init & Setup ---

hook OnGameModeInit()
{
    // Create Global TextDraws (Revised layout from trainjobv3-open.mp.txt)

    gTrainDispatchBG = TextDrawCreate(15.000, 242.000, "LD_SPAC:white");
    TextDrawTextSize(gTrainDispatchBG, 111.000, 35.000);
    TextDrawAlignment(gTrainDispatchBG, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(gTrainDispatchBG, 200);
    TextDrawSetShadow(gTrainDispatchBG, 0);
    TextDrawSetOutline(gTrainDispatchBG, 0);
    TextDrawBackgroundColour(gTrainDispatchBG, 255);
    TextDrawFont(gTrainDispatchBG, TEXT_DRAW_FONT_SPRITE_DRAW);
    TextDrawSetProportional(gTrainDispatchBG, true);

    gTrainDispatchHeader = TextDrawCreate(17.000, 232.000, "Railroad Dispatch Call");
    TextDrawLetterSize(gTrainDispatchHeader, 0.300, 1.500);
    TextDrawAlignment(gTrainDispatchHeader, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(gTrainDispatchHeader, -1);
    TextDrawSetShadow(gTrainDispatchHeader, 1);
    TextDrawSetOutline(gTrainDispatchHeader, 1);
    TextDrawBackgroundColour(gTrainDispatchHeader, 150);
    TextDrawFont(gTrainDispatchHeader, TEXT_DRAW_FONT_0);
    TextDrawSetProportional(gTrainDispatchHeader, true);

    gTrainPassengerBG = TextDrawCreate(15.000, 292.000, "LD_SPAC:white");
    TextDrawTextSize(gTrainPassengerBG, 111.000, 35.000);
    TextDrawAlignment(gTrainPassengerBG, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(gTrainPassengerBG, 200);
    TextDrawSetShadow(gTrainPassengerBG, 0);
    TextDrawSetOutline(gTrainPassengerBG, 0);
    TextDrawBackgroundColour(gTrainPassengerBG, 255);
    TextDrawFont(gTrainPassengerBG, TEXT_DRAW_FONT_SPRITE_DRAW);
    TextDrawSetProportional(gTrainPassengerBG, true);

    gTrainPassengerHeader = TextDrawCreate(17.000, 282.000, "Passenger Ride Status");
    TextDrawLetterSize(gTrainPassengerHeader, 0.300, 1.500);
    TextDrawAlignment(gTrainPassengerHeader, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(gTrainPassengerHeader, -1);
    TextDrawSetShadow(gTrainPassengerHeader, 1);
    TextDrawSetOutline(gTrainPassengerHeader, 1);
    TextDrawBackgroundColour(gTrainPassengerHeader, 150);
    TextDrawFont(gTrainPassengerHeader, TEXT_DRAW_FONT_0);
    TextDrawSetProportional(gTrainPassengerHeader, true);

    // Progress Bar TextDraws (Exported from progress_bar-open.mp.txt)
    gTrainBoardingHeader = TextDrawCreate(264.000, 304.000, "Unboarding Passengers.....");
    TextDrawLetterSize(gTrainBoardingHeader, 0.230, 1.199);
    TextDrawAlignment(gTrainBoardingHeader, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(gTrainBoardingHeader, -1);
    TextDrawSetShadow(gTrainBoardingHeader, 1);
    TextDrawSetOutline(gTrainBoardingHeader, 1);
    TextDrawBackgroundColour(gTrainBoardingHeader, 150);
    TextDrawFont(gTrainBoardingHeader, TEXT_DRAW_FONT_3);
    TextDrawSetProportional(gTrainBoardingHeader, true);

    gTrainBoardingBG = TextDrawCreate(263.000, 319.000, "LD_SPAC:white");
    TextDrawTextSize(gTrainBoardingBG, 112.000, 19.000);
    TextDrawAlignment(gTrainBoardingBG, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(gTrainBoardingBG, 200);
    TextDrawSetShadow(gTrainBoardingBG, 0);
    TextDrawSetOutline(gTrainBoardingBG, 0);
    TextDrawBackgroundColour(gTrainBoardingBG, 255);
    TextDrawFont(gTrainBoardingBG, TEXT_DRAW_FONT_SPRITE_DRAW);
    TextDrawSetProportional(gTrainBoardingBG, true);

    // Pre-create static train locomotive & carriage on server startup (SA-MP train track requirement)
    gStaticTrainLocomotive = AddStaticVehicleEx(538, 1753.8125, -1953.6406, 13.5469, 270.0, 1, 1, -1);
    gStaticTrainCarriage = AddStaticVehicleEx(570, 1753.8125, -1933.6406, 13.5469, 270.0, 1, 1, -1);
    AttachTrailerToVehicle(gStaticTrainCarriage, gStaticTrainLocomotive);

    return 1;
}

forward LoadTrainStations();
public LoadTrainStations()
{
    new rows;
    cache_get_row_count(rows);

    for(new i = 0; i < rows && i < MAX_TRAIN_STATIONS; i++)
    {
        cache_get_value_name_int(i, "ID", TrainStations[i][tsID]);
        cache_get_value_name(i, "Name", TrainStations[i][tsName], 64);
        cache_get_value_name_float(i, "X", TrainStations[i][tsX]);
        cache_get_value_name_float(i, "Y", TrainStations[i][tsY]);
        cache_get_value_name_float(i, "Z", TrainStations[i][tsZ]);
        cache_get_value_name_int(i, "World", TrainStations[i][tsWorld]);
        cache_get_value_name_int(i, "Interior", TrainStations[i][tsInterior]);
        cache_get_value_name_int(i, "Price", TrainStations[i][tsPrice]);

        RefreshTrainStation(i);
    }
    printf("[SQL] %d Train Stations loaded.", rows);
    return 1;
}

forward LoadTrainCenters();
public LoadTrainCenters()
{
    new rows;
    cache_get_row_count(rows);

    for(new i = 0; i < rows && i < MAX_TRAIN_CENTERS; i++)
    {
        cache_get_value_name_int(i, "ID", TrainCenters[i][tcID]);
        cache_get_value_name(i, "Name", TrainCenters[i][tcName], 64);
        cache_get_value_name_float(i, "X", TrainCenters[i][tcX]);
        cache_get_value_name_float(i, "Y", TrainCenters[i][tcY]);
        cache_get_value_name_float(i, "Z", TrainCenters[i][tcZ]);
        cache_get_value_name_int(i, "World", TrainCenters[i][tcWorld]);
        cache_get_value_name_int(i, "Interior", TrainCenters[i][tcInterior]);

        RefreshTrainCenter(i);
    }
    printf("[SQL] %d Train Driver Centers loaded.", rows);
    return 1;
}

forward LoadRailCrossings();
public LoadRailCrossings()
{
    new rows;
    cache_get_row_count(rows);

    for(new i = 0; i < rows && i < MAX_RAIL_CROSSINGS; i++)
    {
        cache_get_value_name_int(i, "ID", RailCrossings[i][rcID]);
        cache_get_value_name_float(i, "X", RailCrossings[i][rcX]);
        cache_get_value_name_float(i, "Y", RailCrossings[i][rcY]);
        cache_get_value_name_float(i, "Z", RailCrossings[i][rcZ]);
        cache_get_value_name_float(i, "RX", RailCrossings[i][rcRX]);
        cache_get_value_name_float(i, "RY", RailCrossings[i][rcRY]);
        cache_get_value_name_float(i, "RZ", RailCrossings[i][rcRZ]);
        cache_get_value_name_float(i, "MoveRX", RailCrossings[i][rcMoveRX]);
        cache_get_value_name_float(i, "MoveRY", RailCrossings[i][rcMoveRY]);
        cache_get_value_name_float(i, "MoveRZ", RailCrossings[i][rcMoveRZ]);
        RailCrossings[i][rcIsClosed] = false;

        RailCrossings[i][rcObject] = CreateDynamicObject(968, 
            RailCrossings[i][rcX], RailCrossings[i][rcY], RailCrossings[i][rcZ], 
            RailCrossings[i][rcRX], RailCrossings[i][rcRY], RailCrossings[i][rcRZ]);
    }
    printf("[SQL] %d Railroad Crossings loaded.", rows);
    return 1;
}

forward LoadTrainRouteCheckpoints();
public LoadTrainRouteCheckpoints()
{
    new rows;
    cache_get_row_count(rows);

    TrainCheckpointCount = 0;
    for(new i = 0; i < rows && i < MAX_TRAIN_CHECKPOINTS; i++)
    {
        cache_get_value_name_int(i, "ID", TrainCheckpoints[i][cpID]);
        cache_get_value_name(i, "Name", TrainCheckpoints[i][cpName], 64);
        cache_get_value_name_float(i, "X", TrainCheckpoints[i][cpX]);
        cache_get_value_name_float(i, "Y", TrainCheckpoints[i][cpY]);
        cache_get_value_name_float(i, "Z", TrainCheckpoints[i][cpZ]);
        cache_get_value_name_float(i, "Angle", TrainCheckpoints[i][cpAngle]);
        cache_get_value_name_float(i, "SpeedLimit", TrainCheckpoints[i][cpSpeedLimit]);
        TrainCheckpointCount++;
    }

    if(TrainCheckpointCount == 0)
    {
        // Copy defaults
        for(new i = 0; i < 5; i++)
        {
            TrainCheckpoints[i][cpID] = gDefaultTrainRoute[i][cpID];
            format(TrainCheckpoints[i][cpName], 64, "%s", gDefaultTrainRoute[i][cpName]);
            TrainCheckpoints[i][cpX] = gDefaultTrainRoute[i][cpX];
            TrainCheckpoints[i][cpY] = gDefaultTrainRoute[i][cpY];
            TrainCheckpoints[i][cpZ] = gDefaultTrainRoute[i][cpZ];
            TrainCheckpoints[i][cpAngle] = gDefaultTrainRoute[i][cpAngle];
            TrainCheckpoints[i][cpSpeedLimit] = gDefaultTrainRoute[i][cpSpeedLimit];
        }
        TrainCheckpointCount = 5;
    }
    printf("[SQL] %d Train Route Checkpoints loaded.", TrainCheckpointCount);
    return 1;
}

stock RefreshTrainStation(id)
{
    if(TrainStations[id][tsID] != 0)
    {
        if(IsValidDynamicPickup(TrainStations[id][tsPickup]))
            DestroyDynamicPickup(TrainStations[id][tsPickup]);

        if(TrainStations[id][tsTextLabel] != Text3D:INVALID_3DTEXT_ID && TrainStations[id][tsTextLabel] != Text3D:0)
            DestroyDynamic3DTextLabel(TrainStations[id][tsTextLabel]);

        TrainStations[id][tsPickup] = CreateDynamicPickup(1239, 23, 
            TrainStations[id][tsX], TrainStations[id][tsY], TrainStations[id][tsZ], 
            TrainStations[id][tsWorld], TrainStations[id][tsInterior], -1, 100.0);

        new label[180];
        format(label, sizeof(label), "{00FFFF}[%s]\n{FFFFFF}Station ID: %d\nTicket Price: {33AA33}$%d\n{FFFF00}Use /buyticket to purchase", 
            TrainStations[id][tsName], id, TrainStations[id][tsPrice]);

        TrainStations[id][tsTextLabel] = CreateDynamic3DTextLabel(label, 0xFFFFFFFF, 
            TrainStations[id][tsX], TrainStations[id][tsY], TrainStations[id][tsZ] + 0.7, 
            10.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, TrainStations[id][tsWorld], TrainStations[id][tsInterior]);
    }
    return 1;
}

stock RefreshTrainCenter(id)
{
    if(TrainCenters[id][tcID] != 0)
    {
        if(IsValidDynamicPickup(TrainCenters[id][tcPickup]))
            DestroyDynamicPickup(TrainCenters[id][tcPickup]);

        if(TrainCenters[id][tcTextLabel] != Text3D:INVALID_3DTEXT_ID && TrainCenters[id][tcTextLabel] != Text3D:0)
            DestroyDynamic3DTextLabel(TrainCenters[id][tcTextLabel]);

        TrainCenters[id][tcPickup] = CreateDynamicPickup(1210, 23, 
            TrainCenters[id][tcX], TrainCenters[id][tcY], TrainCenters[id][tcZ], 
            TrainCenters[id][tcWorld], TrainCenters[id][tcInterior], -1, 100.0);

        new label[180];
        format(label, sizeof(label), "{00FFFF}[%s - Train Driver Center]\n{FFFFFF}Center ID: %d\n{FFFF00}Use /trainjob join to get this job", 
            TrainCenters[id][tcName], id);

        TrainCenters[id][tcTextLabel] = CreateDynamic3DTextLabel(label, 0xFFFFFFFF, 
            TrainCenters[id][tcX], TrainCenters[id][tcY], TrainCenters[id][tcZ] + 0.7, 
            10.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0, TrainCenters[id][tcWorld], TrainCenters[id][tcInterior]);
    }
    return 1;
}

// --- Player Connect / Disconnect Hook ---

hook OnPlayerConnect(playerid)
{
    PlayerInTrainQueue[playerid] = false;
    PlayerTrainQueuePos[playerid] = -1;
    PlayerDispatchTimer[playerid] = 0;
    PlayerDispatchActive[playerid] = false;
    PlayerOnTrainJob[playerid] = false;
    PlayerTrainVehicle[playerid] = INVALID_VEHICLE_ID;
    PlayerLegsCompleted[playerid] = 0;
    PlayerTrainSpeedLimit[playerid] = 60.0; // Default 60 MPH
    PlayerHasTrainTicket[playerid] = false;
    PlayerBoardingTimer[playerid] = 0;
    PlayerOverspeedWarns[playerid] = 0;
    PlayerTotalFines[playerid] = 0;
    PlayerBoardingActive[playerid] = false;
    SalaryHistoryCount[playerid] = 0;
    PlayerHornCooldown[playerid] = 0;
    PlayerDepartureTimer[playerid] = 0;
    PlayerDepartureWarning[playerid] = false;
    PlayerExitTimer[playerid] = 0;
    PlayerMountTimer[playerid] = 0;
    PlayerTrainJobDelay[playerid] = 0;
    PlayerTrainDistanceTimer[playerid] = 0;

    // Init Player TextDraws (Revised layout from trainjobv2-open.mp.txt)
    CreateTrainPlayerTextDraws(playerid);
    return 1;
}

hook OnPlayerDisconnect(playerid, reason)
{
    RemovePlayerFromTrainQueue(playerid);
    HideTrainDispatchHUD(playerid);
    HideTrainPassengerHUD(playerid);
    HideTrainBoardingBar(playerid);

    if(pTrainDummy[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainDummy[playerid]); pTrainDummy[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainReportTo[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainReportTo[playerid]); pTrainReportTo[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainTimeLeft[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainTimeLeft[playerid]); pTrainTimeLeft[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainPassengerName[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainPassengerName[playerid]); pTrainPassengerName[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainPassengerNext[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainPassengerNext[playerid]); pTrainPassengerNext[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainBoardingBar[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainBoardingBar[playerid]); pTrainBoardingBar[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    return 1;
}

hook OnPlayerEnterVehicle(playerid, vehicleid, ispassenger)
{
    if(!ispassenger)
    {
        new model = GetVehicleModel(vehicleid);
        if(model == 538 || model == 537)
        {
            if(!PlayerOnTrainJob[playerid])
            {
                SendErrorMessage(playerid, "You are not currently on an active train driver shift. Use /trainjob to start work!");
                ClearAnimations(playerid);

                new Float:px, Float:py, Float:pz;
                GetPlayerPos(playerid, px, py, pz);
                SetPlayerPos(playerid, px + 2.0, py + 2.0, pz + 3.0); // Slap player 3.0 units up on foot!
                return 1;
            }
        }
    }
    return 1;
}

hook OnPlayerStateChange(playerid, newstate, oldstate)
{
    if(newstate == PLAYER_STATE_DRIVER)
    {
        new veh = GetPlayerVehicleID(playerid);
        new model = GetVehicleModel(veh);
        if(model == 538 || model == 537)
        {
            if(!PlayerOnTrainJob[playerid])
            {
                SendErrorMessage(playerid, "You are not currently on an active train driver shift. Use /trainjob to start work!");
                ClearAnimations(playerid);
                RemovePlayerFromVehicle(playerid);

                new Float:px, Float:py, Float:pz;
                GetPlayerPos(playerid, px, py, pz);
                SetPlayerPos(playerid, px + 2.0, py + 2.0, pz + 3.0); // Slap player 3.0 units up on foot!
                return 1;
            }
            else
            {
                PlayerTrainDistanceTimer[playerid] = 25; // First chat message arrives in 5s

                new step = PlayerTrainStep[playerid];
                new targetName[64];
                if(TrainCheckpointCount > 0 && step < TrainCheckpointCount)
                    format(targetName, sizeof(targetName), "%s", TrainCheckpoints[step][cpName]);
                else
                    format(targetName, sizeof(targetName), "%s", gDefaultTrainRoute[step % 5][cpName]);

                new strStartNext[128];
                format(strStartNext, sizeof(strStartNext), "~y~NEXT STATION~n~~w~%s", targetName);
                GameTextForPlayer(playerid, strStartNext, 3000, 3);
            }
        }
    }
    else if(newstate == PLAYER_STATE_PASSENGER)
    {
        new veh = GetPlayerVehicleID(playerid);
        new model = GetVehicleModel(veh);

        if(model == 538 || model == 570)
        {
            ShowTrainPassengerHUD(playerid);

            // Dynamically update Next Station TextDraw for passenger upon boarding
            new driverid = INVALID_PLAYER_ID;
            for(new d = 0; d < MAX_PLAYERS; d++)
            {
                if(IsPlayerConnected(d) && PlayerOnTrainJob[d] && IsPlayerInAnyVehicle(d) && GetPlayerState(d) == PLAYER_STATE_DRIVER)
                {
                    driverid = d;
                    break;
                }
            }

            new strNextPass[64];
            if(driverid != INVALID_PLAYER_ID)
            {
                new step = PlayerTrainStep[driverid];
                new targetName[64];
                if(TrainCheckpointCount > 0 && step < TrainCheckpointCount)
                    format(targetName, sizeof(targetName), "%s", TrainCheckpoints[step][cpName]);
                else
                    format(targetName, sizeof(targetName), "%s", gDefaultTrainRoute[step % 5][cpName]);

                format(strNextPass, sizeof(strNextPass), "Next: %s", targetName);
            }
            else
            {
                format(strNextPass, sizeof(strNextPass), "Next: Unity Station");
            }
            PlayerTextDrawSetString(playerid, pTrainPassengerNext[playerid], strNextPass);

            if(PlayerHasTrainTicket[playerid])
            {
                SendClientMessage(playerid, COLOR_GREEN, "[TRAIN]: Welcome aboard the Brown Streak Express! Enjoy your journey.");
            }
            else
            {
                SendClientMessage(playerid, COLOR_YELLOW, "[TRAIN WARNING]: You are riding the Brown Streak Express without a valid ticket! Purchase one at the next station (/buyticket).");
            }
        }
    }
    else if(oldstate == PLAYER_STATE_PASSENGER)
    {
        HideTrainPassengerHUD(playerid);
    }
    else if(oldstate == PLAYER_STATE_DRIVER)
    {
        HideTrainBoardingBar(playerid);
    }
    return 1;
}

stock SendTrainAnnouncement(Float:x, Float:y, Float:z, const message[], vehid = INVALID_VEHICLE_ID)
{
    for(new i = 0; i < MAX_PLAYERS; i++)
    {
        if(IsPlayerConnected(i))
        {
            if(IsPlayerInRangeOfPoint(i, 100.0, x, y, z) || (vehid != INVALID_VEHICLE_ID && IsPlayerInVehicle(i, vehid)))
            {
                SendClientMessage(i, COLOR_YELLOW, message);
                PlayerPlaySound(i, 6401, x, y, z);
            }
        }
    }
    return 1;
}

// Train Horn RP Action (/me color alignment & 100m Whistle Sound ID 3201)
hook OnPlayerKeyStateChange(playerid, newkeys, oldkeys)
{
    if(IsPlayerInAnyVehicle(playerid) && GetPlayerState(playerid) == PLAYER_STATE_DRIVER)
    {
        new veh = GetPlayerVehicleID(playerid);
        new model = GetVehicleModel(veh);
        if(model == 538 || model == 537)
        {
            // Strictly check ONLY KEY_CROUCH (H key in SA-MP vehicle)
            if((newkeys & KEY_CROUCH) && !(oldkeys & KEY_CROUCH))
            {
                if(gettime() < PlayerHornCooldown[playerid])
                    return 1; // 3-second cooldown

                PlayerHornCooldown[playerid] = gettime() + 3;

                new Float:vx, Float:vy, Float:vz;
                GetPlayerPos(playerid, vx, vy, vz);

                for(new i = 0; i < MAX_PLAYERS; i++)
                {
                    if(IsPlayerConnected(i) && (IsPlayerInRangeOfPoint(i, 100.0, vx, vy, vz) || IsPlayerInVehicle(i, veh)))
                    {
                        PlayerPlaySound(i, 3201, vx, vy, vz);
                    }
                }

                new strHorn[128];
                format(strHorn, sizeof(strHorn), "blows the loud locomotive train whistle horn (CHO-CHOO!).");
                SendNearbyMessage(playerid, 30.0, COLOR_PURPLE, "* %s %s", ReturnName(playerid, 0), strHorn);
            }
        }
    }
    return 1;
}

// --- TextDraw Display Functions ---

stock CreateTrainPlayerTextDraws(playerid)
{
    if(pTrainDummy[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainDummy[playerid]); pTrainDummy[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainReportTo[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainReportTo[playerid]); pTrainReportTo[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainTimeLeft[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainTimeLeft[playerid]); pTrainTimeLeft[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainPassengerName[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainPassengerName[playerid]); pTrainPassengerName[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainPassengerNext[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainPassengerNext[playerid]); pTrainPassengerNext[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    if(pTrainBoardingBar[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, pTrainBoardingBar[playerid]); pTrainBoardingBar[playerid] = PlayerText:INVALID_TEXT_DRAW; }

    pTrainDummy[playerid] = CreatePlayerTextDraw(playerid, 0.000, 0.000, " ");

    pTrainReportTo[playerid] = CreatePlayerTextDraw(playerid, 17.000, 250.000, "Report to: Unity Station");
    PlayerTextDrawLetterSize(playerid, pTrainReportTo[playerid], 0.159, 1.098);
    PlayerTextDrawAlignment(playerid, pTrainReportTo[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, pTrainReportTo[playerid], -1);
    PlayerTextDrawSetShadow(playerid, pTrainReportTo[playerid], 1);
    PlayerTextDrawSetOutline(playerid, pTrainReportTo[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, pTrainReportTo[playerid], 150);
    PlayerTextDrawFont(playerid, pTrainReportTo[playerid], TEXT_DRAW_FONT_2);
    PlayerTextDrawSetProportional(playerid, pTrainReportTo[playerid], true);

    pTrainTimeLeft[playerid] = CreatePlayerTextDraw(playerid, 17.000, 260.000, "Time Left: 05:00");
    PlayerTextDrawLetterSize(playerid, pTrainTimeLeft[playerid], 0.159, 1.098);
    PlayerTextDrawAlignment(playerid, pTrainTimeLeft[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, pTrainTimeLeft[playerid], -1);
    PlayerTextDrawSetShadow(playerid, pTrainTimeLeft[playerid], 1);
    PlayerTextDrawSetOutline(playerid, pTrainTimeLeft[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, pTrainTimeLeft[playerid], 150);
    PlayerTextDrawFont(playerid, pTrainTimeLeft[playerid], TEXT_DRAW_FONT_2);
    PlayerTextDrawSetProportional(playerid, pTrainTimeLeft[playerid], true);

    pTrainPassengerName[playerid] = CreatePlayerTextDraw(playerid, 17.000, 300.000, "Brown Streak Express");
    PlayerTextDrawLetterSize(playerid, pTrainPassengerName[playerid], 0.159, 1.098);
    PlayerTextDrawAlignment(playerid, pTrainPassengerName[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, pTrainPassengerName[playerid], -1);
    PlayerTextDrawSetShadow(playerid, pTrainPassengerName[playerid], 1);
    PlayerTextDrawSetOutline(playerid, pTrainPassengerName[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, pTrainPassengerName[playerid], 150);
    PlayerTextDrawFont(playerid, pTrainPassengerName[playerid], TEXT_DRAW_FONT_2);
    PlayerTextDrawSetProportional(playerid, pTrainPassengerName[playerid], true);

    pTrainPassengerNext[playerid] = CreatePlayerTextDraw(playerid, 17.000, 311.000, "Next: Unity Station");
    PlayerTextDrawLetterSize(playerid, pTrainPassengerNext[playerid], 0.159, 1.098);
    PlayerTextDrawAlignment(playerid, pTrainPassengerNext[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, pTrainPassengerNext[playerid], -1);
    PlayerTextDrawSetShadow(playerid, pTrainPassengerNext[playerid], 1);
    PlayerTextDrawSetOutline(playerid, pTrainPassengerNext[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, pTrainPassengerNext[playerid], 150);
    PlayerTextDrawFont(playerid, pTrainPassengerNext[playerid], TEXT_DRAW_FONT_2);
    PlayerTextDrawSetProportional(playerid, pTrainPassengerNext[playerid], true);

    // Progress Bar PlayerText (progress_red from progress_bar-open.mp.txt)
    pTrainBoardingBar[playerid] = CreatePlayerTextDraw(playerid, 265.000, 322.000, "LD_SPAC:white");
    PlayerTextDrawTextSize(playerid, pTrainBoardingBar[playerid], 108.000, 13.000);
    PlayerTextDrawAlignment(playerid, pTrainBoardingBar[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, pTrainBoardingBar[playerid], -1962934017);
    PlayerTextDrawSetShadow(playerid, pTrainBoardingBar[playerid], 0);
    PlayerTextDrawSetOutline(playerid, pTrainBoardingBar[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, pTrainBoardingBar[playerid], 255);
    PlayerTextDrawFont(playerid, pTrainBoardingBar[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, pTrainBoardingBar[playerid], true);
    return 1;
}

stock ShowTrainBoardingBar(playerid, headerText[], Float:barWidth, barColor)
{
    TextDrawSetString(gTrainBoardingHeader, headerText);
    TextDrawShowForPlayer(playerid, gTrainBoardingHeader);
    TextDrawShowForPlayer(playerid, gTrainBoardingBG);

    if(pTrainBoardingBar[playerid] == PlayerText:INVALID_TEXT_DRAW)
    {
        CreateTrainPlayerTextDraws(playerid);
    }

    if(pTrainBoardingBar[playerid] != PlayerText:INVALID_TEXT_DRAW)
    {
        PlayerTextDrawColour(playerid, pTrainBoardingBar[playerid], barColor);
        PlayerTextDrawTextSize(playerid, pTrainBoardingBar[playerid], barWidth, 13.000);
        PlayerTextDrawShow(playerid, pTrainBoardingBar[playerid]);
    }
    return 1;
}

stock HideTrainBoardingBar(playerid)
{
    TextDrawHideForPlayer(playerid, gTrainBoardingHeader);
    TextDrawHideForPlayer(playerid, gTrainBoardingBG);

    if(pTrainBoardingBar[playerid] != PlayerText:INVALID_TEXT_DRAW)
    {
        PlayerTextDrawHide(playerid, pTrainBoardingBar[playerid]);
    }
    return 1;
}

stock ShowTrainDriverHUD(playerid)
{
    #pragma unused playerid
    return 1;
}

stock HideTrainDriverHUD(playerid)
{
    #pragma unused playerid
    return 1;
}

stock ShowTrainDispatchHUD(playerid)
{
    if(pTrainReportTo[playerid] == PlayerText:INVALID_TEXT_DRAW)
    {
        CreateTrainPlayerTextDraws(playerid);
    }

    TextDrawShowForPlayer(playerid, gTrainDispatchBG);
    TextDrawShowForPlayer(playerid, gTrainDispatchHeader);

    PlayerTextDrawShow(playerid, pTrainReportTo[playerid]);
    PlayerTextDrawShow(playerid, pTrainTimeLeft[playerid]);
    return 1;
}

stock HideTrainDispatchHUD(playerid)
{
    TextDrawHideForPlayer(playerid, gTrainDispatchBG);
    TextDrawHideForPlayer(playerid, gTrainDispatchHeader);

    PlayerTextDrawHide(playerid, pTrainReportTo[playerid]);
    PlayerTextDrawHide(playerid, pTrainTimeLeft[playerid]);
    return 1;
}

stock ShowTrainPassengerHUD(playerid)
{
    TextDrawShowForPlayer(playerid, gTrainPassengerBG);
    TextDrawShowForPlayer(playerid, gTrainPassengerHeader);

    PlayerTextDrawShow(playerid, pTrainPassengerName[playerid]);
    PlayerTextDrawShow(playerid, pTrainPassengerNext[playerid]);
    return 1;
}

stock HideTrainPassengerHUD(playerid)
{
    TextDrawHideForPlayer(playerid, gTrainPassengerBG);
    TextDrawHideForPlayer(playerid, gTrainPassengerHeader);

    PlayerTextDrawHide(playerid, pTrainPassengerName[playerid]);
    PlayerTextDrawHide(playerid, pTrainPassengerNext[playerid]);
    return 1;
}

// --- Queue Management Functions ---

stock AddPlayerToTrainQueue(playerid)
{
    if(PlayerInTrainQueue[playerid])
        return 0;

    PlayerInTrainQueue[playerid] = true;
    TrainQueueList[TrainQueueCount] = playerid;
    PlayerTrainQueuePos[playerid] = TrainQueueCount + 1;
    TrainQueueCount++;

    if(TrainQueueCount == 1)
    {
        gDispatchDelayTimer = 60; // 1 Minute delay before sending first SMS dispatch call
        SendClientMessage(playerid, COLOR_CYAN, "[TRAIN SYSTEM]: You have joined the driver queue (Pos: #1). Dispatch call will arrive in 1 minute.");
    }
    else
    {
        CheckAndDispatchNextDriver();
    }
    return 1;
}

stock RemovePlayerFromTrainQueue(playerid)
{
    if(!PlayerInTrainQueue[playerid])
        return 0;

    PlayerInTrainQueue[playerid] = false;
    PlayerDispatchActive[playerid] = false;
    PlayerDispatchTimer[playerid] = 0;
    HideTrainDispatchHUD(playerid);

    new index = -1;
    for(new i = 0; i < TrainQueueCount; i++)
    {
        if(TrainQueueList[i] == playerid)
        {
            index = i;
            break;
        }
    }

    if(index != -1)
    {
        for(new i = index; i < TrainQueueCount - 1; i++)
        {
            TrainQueueList[i] = TrainQueueList[i + 1];
            PlayerTrainQueuePos[TrainQueueList[i]] = i + 1;
        }
        TrainQueueCount--;
    }

    CheckAndDispatchNextDriver();
    return 1;
}

public CheckAndDispatchNextDriver()
{
    if(TrainQueueCount == 0)
        return 0;

    new nextPlayer = TrainQueueList[0];
    if(IsPlayerConnected(nextPlayer) && !PlayerDispatchActive[nextPlayer] && !PlayerOnTrainJob[nextPlayer])
    {
        PlayerDispatchActive[nextPlayer] = true;
        PlayerDispatchTimer[nextPlayer] = TRAIN_DISPATCH_TIMEOUT; // 5 Minutes (300 seconds)

        // Get physical location of train locomotive to dispatch driver to exact current station
        new Float:trainX, Float:trainY, Float:trainZ;
        GetVehiclePos(gStaticTrainLocomotive, trainX, trainY, trainZ);

        // Find nearest /trainstation to physical train location
        new stationIdx = -1;
        new Float:closestDist = 99999.0;
        for(new i = 0; i < MAX_TRAIN_STATIONS; i++)
        {
            if(TrainStations[i][tsID] != 0)
            {
                new Float:d = VectorSize(trainX - TrainStations[i][tsX], trainY - TrainStations[i][tsY], trainZ - TrainStations[i][tsZ]);
                if(d < closestDist)
                {
                    closestDist = d;
                    stationIdx = i;
                }
            }
        }

        // Also find nearest route leg index to update gCurrentRouteIndex
        new Float:closestCpDist = 99999.0;
        new closestLeg = 0;
        for(new c = 0; c < (TrainCheckpointCount > 0 ? TrainCheckpointCount : 5); c++)
        {
            new Float:cposX, Float:cposY, Float:cposZ;
            if(TrainCheckpointCount > 0 && c < TrainCheckpointCount)
            {
                cposX = TrainCheckpoints[c][cpX];
                cposY = TrainCheckpoints[c][cpY];
                cposZ = TrainCheckpoints[c][cpZ];
            }
            else
            {
                cposX = gDefaultTrainRoute[c % 5][cpX];
                cposY = gDefaultTrainRoute[c % 5][cpY];
                cposZ = gDefaultTrainRoute[c % 5][cpZ];
            }

            new Float:dCp = VectorSize(trainX - cposX, trainY - cposY, trainZ - cposZ);
            if(dCp < closestCpDist)
            {
                closestCpDist = dCp;
                closestLeg = c;
            }
        }
        gCurrentRouteIndex = closestLeg;

        new stationName[64];
        new Float:dispatchX, Float:dispatchY, Float:dispatchZ;

        if(stationIdx != -1)
        {
            format(stationName, sizeof(stationName), "%s", TrainStations[stationIdx][tsName]);
            dispatchX = TrainStations[stationIdx][tsX];
            dispatchY = TrainStations[stationIdx][tsY];
            dispatchZ = TrainStations[stationIdx][tsZ];
        }
        else
        {
            if(TrainCheckpointCount > 0 && closestLeg < TrainCheckpointCount)
                format(stationName, sizeof(stationName), "%s", TrainCheckpoints[closestLeg][cpName]);
            else
                format(stationName, sizeof(stationName), "%s", gDefaultTrainRoute[closestLeg % 5][cpName]);

            dispatchX = trainX;
            dispatchY = trainY;
            dispatchZ = trainZ;
        }

        new str[128];
        format(str, sizeof(str), "Report to: %s", stationName);
        PlayerTextDrawSetString(nextPlayer, pTrainReportTo[nextPlayer], str);

        ShowTrainDispatchHUD(nextPlayer);

        SendClientMessageEx(nextPlayer, COLOR_YELLOW, "[SMS from Railroad Dispatcher (8888)]: Attention Driver %s! Shift at %s is available.", ReturnName(nextPlayer, 0), stationName);
        SendClientMessageEx(nextPlayer, COLOR_YELLOW, "Please report to %s within 5 minutes. Waypoint marked on radar. Board locomotive & type '/trainjob start' to begin.", stationName);

        SetPlayerCheckpoint(nextPlayer, dispatchX, dispatchY, dispatchZ, 5.0);
    }
    return 1;
}

// --- 1-Second Timer Ticker for Dispatch, Speed Checks, Boarding, Freeze & Gates ---

ptask TrainSystemTimer[1000](playerid)
{
    // Handle 1-Minute Initial Queue Dispatch Delay
    if(gDispatchDelayTimer > 0)
    {
        gDispatchDelayTimer--;
        if(gDispatchDelayTimer == 0 && TrainQueueCount > 0)
        {
            CheckAndDispatchNextDriver();
        }
    }

    // Handle 5-Minute Dispatch Timer
    if(PlayerDispatchActive[playerid])
    {
        if(PlayerDispatchTimer[playerid] > 0)
        {
            PlayerDispatchTimer[playerid]--;

            new mins = PlayerDispatchTimer[playerid] / 60;
            new secs = PlayerDispatchTimer[playerid] % 60;

            new timeStr[32];
            format(timeStr, sizeof(timeStr), "Time Left: %02d:%02d", mins, secs);
            PlayerTextDrawSetString(playerid, pTrainTimeLeft[playerid], timeStr);

            if(PlayerDispatchTimer[playerid] == 0)
            {
                SendClientMessage(playerid, COLOR_LIGHTRED, "[SMS from Railroad Dispatcher]: Shift cancelled due to 5-minute timeout. You have been removed from queue.");
                DisablePlayerCheckpoint(playerid);
                RemovePlayerFromTrainQueue(playerid);
            }
        }
    }

    // Handle 1-Minute Mount Cabin Timeout after /trainjob start
    if(PlayerMountTimer[playerid] > 0)
    {
        if(IsPlayerInAnyVehicle(playerid) && GetPlayerState(playerid) == PLAYER_STATE_DRIVER)
        {
            PlayerMountTimer[playerid] = 0;
        }
        else
        {
            PlayerMountTimer[playerid]--;
            if(PlayerMountTimer[playerid] <= 0)
            {
                SendClientMessage(playerid, COLOR_LIGHTRED, "[RAILROAD DISPATCH]: Shift cancelled because you did not enter the train cabin within 1 minute.");
                PlayerOnTrainJob[playerid] = false;
                HideTrainDriverHUD(playerid);
                DisablePlayerCheckpoint(playerid);
                RemovePlayerFromTrainQueue(playerid);
                CheckAndDispatchNextDriver();
                return 1;
            }
        }
    }

    // Handle Active Train Job Driver Ticker
    if(PlayerOnTrainJob[playerid])
    {
        // Handle 1-Minute Left Cabin Timeout
        if(!IsPlayerInAnyVehicle(playerid) || GetPlayerState(playerid) != PLAYER_STATE_DRIVER)
        {
            if(PlayerExitTimer[playerid] == 0)
            {
                PlayerExitTimer[playerid] = 60;
            }
            else
            {
                PlayerExitTimer[playerid]--;
                new strExit[64];
                format(strExit, sizeof(strExit), "~r~LEFT TRAIN CABIN!~n~~w~Return to seat in: ~y~%d s", PlayerExitTimer[playerid]);
                GameTextForPlayer(playerid, strExit, 1000, 3);

                if(PlayerExitTimer[playerid] <= 0)
                {
                    SendClientMessageEx(playerid, COLOR_LIGHTRED, "[RAILROAD DISPATCH]: Shift cancelled for staying outside the train cabin longer than 1 minute.");
                    PlayerExitTimer[playerid] = 0;
                    PlayerOnTrainJob[playerid] = false;
                    HideTrainDriverHUD(playerid);
                    DisablePlayerCheckpoint(playerid);
                    TogglePlayerControllable(playerid, true);
                    RemovePlayerFromTrainQueue(playerid);
                    CheckAndDispatchNextDriver();
                    return 1;
                }
            }
        }
        else
        {
            PlayerExitTimer[playerid] = 0;
        }

        if(IsPlayerInAnyVehicle(playerid) && GetPlayerState(playerid) == PLAYER_STATE_DRIVER)
        {
            new veh = GetPlayerVehicleID(playerid);
            new model = GetVehicleModel(veh);

            if(model == 538 || model == 537)
            {
                ShowTrainDriverHUD(playerid);

                new step = PlayerTrainStep[playerid];
                new Float:targetX, Float:targetY, Float:targetZ, Float:limit;
                new targetName[64];

                if(TrainCheckpointCount > 0 && step < TrainCheckpointCount)
                {
                    targetX = TrainCheckpoints[step][cpX];
                    targetY = TrainCheckpoints[step][cpY];
                    targetZ = TrainCheckpoints[step][cpZ];
                    limit = TrainCheckpoints[step][cpSpeedLimit];
                    format(targetName, sizeof(targetName), "%s", TrainCheckpoints[step][cpName]);
                }
                else
                {
                    targetX = gDefaultTrainRoute[step % 5][cpX];
                    targetY = gDefaultTrainRoute[step % 5][cpY];
                    targetZ = gDefaultTrainRoute[step % 5][cpZ];
                    limit = gDefaultTrainRoute[step % 5][cpSpeedLimit];
                    format(targetName, sizeof(targetName), "%s", gDefaultTrainRoute[step % 5][cpName]);
                }
                PlayerTrainSpeedLimit[playerid] = limit;

                // Ensure active route checkpoint is visible on radar
                SetPlayerCheckpoint(playerid, targetX, targetY, targetZ, 12.0);

                new Float:dist = GetPlayerDistanceFromPoint(playerid, targetX, targetY, targetZ);

                // 30-Second English Distance Chatlog
                PlayerTrainDistanceTimer[playerid]++;
                if(PlayerTrainDistanceTimer[playerid] >= 100)
                {
                    PlayerTrainDistanceTimer[playerid] = 0;
                    new distYards = floatround(dist * 1.09361);
                    SendClientMessageEx(playerid, COLOR_CYAN, "[TRAIN DISPATCH]: Next station (%s) is %d yards away. (Speed Limit: %.0f MPH)", targetName, distYards, limit);
                }

                // Update Next Station TextDraw for passengers inside train
                new targetStep = (PlayerBoardingActive[playerid] || dist < 20.0) ? ((step + 1) % (TrainCheckpointCount > 0 ? TrainCheckpointCount : 5)) : step;
                new nextTargetName[64];
                if(TrainCheckpointCount > 0 && targetStep < TrainCheckpointCount)
                    format(nextTargetName, sizeof(nextTargetName), "%s", TrainCheckpoints[targetStep][cpName]);
                else
                    format(nextTargetName, sizeof(nextTargetName), "%s", gDefaultTrainRoute[targetStep % 5][cpName]);

                new strNext[64];
                format(strNext, sizeof(strNext), "Next: %s", nextTargetName);

                for(new p = 0; p < MAX_PLAYERS; p++)
                {
                    if(IsPlayerConnected(p) && IsPlayerInVehicle(p, veh) && GetPlayerState(p) == PLAYER_STATE_PASSENGER)
                    {
                        PlayerTextDrawSetString(p, pTrainPassengerNext[p], strNext);
                    }
                }

                // Speed in true MPH
                new Float:vx, Float:vy, Float:vz;
                GetVehicleVelocity(veh, vx, vy, vz);
                new Float:speedMPH = floatsqroot(vx*vx + vy*vy + vz*vz) * 62.1371;

                // Departure AFK Check (30 seconds timeout)
                if(PlayerDepartureWarning[playerid])
                {
                    if(speedMPH > 2.0)
                    {
                        PlayerDepartureWarning[playerid] = false;
                        PlayerDepartureTimer[playerid] = 0;
                    }
                    else
                    {
                        PlayerDepartureTimer[playerid]--;
                        new strDepart[64];
                        format(strDepart, sizeof(strDepart), "~r~DEPARTURE AFK WARNING!~n~~w~Start train in: ~y~%d s", PlayerDepartureTimer[playerid]);
                        GameTextForPlayer(playerid, strDepart, 1000, 3);

                        if(PlayerDepartureTimer[playerid] <= 0)
                        {
                            SendClientMessageEx(playerid, COLOR_LIGHTRED, "[RAILROAD DISPATCH]: Removed from shift due to 30s departure AFK timeout (train did not move).");
                            PlayerDepartureWarning[playerid] = false;
                            PlayerOnTrainJob[playerid] = false;
                            HideTrainDriverHUD(playerid);
                            DisablePlayerCheckpoint(playerid);
                            RemovePlayerFromVehicle(playerid);
                            SetCameraBehindPlayer(playerid);
                            TogglePlayerControllable(playerid, true);
                            RemovePlayerFromTrainQueue(playerid);

                            // Teleport driver safely to nearest /trainstation pickup platform
                            new nearestStationAFK = -1;
                            new Float:minDistAFK = 99999.0;
                            for(new s = 0; s < MAX_TRAIN_STATIONS; s++)
                            {
                                if(TrainStations[s][tsID] != 0)
                                {
                                    new Float:stDist = GetPlayerDistanceFromPoint(playerid, TrainStations[s][tsX], TrainStations[s][tsY], TrainStations[s][tsZ]);
                                    if(stDist < minDistAFK)
                                    {
                                        minDistAFK = stDist;
                                        nearestStationAFK = s;
                                    }
                                }
                            }
                            if(nearestStationAFK != -1)
                            {
                                SetPlayerPos(playerid, TrainStations[nearestStationAFK][tsX], TrainStations[nearestStationAFK][tsY], TrainStations[nearestStationAFK][tsZ] + 0.5);
                                SetPlayerVirtualWorld(playerid, TrainStations[nearestStationAFK][tsWorld]);
                                SetPlayerInterior(playerid, TrainStations[nearestStationAFK][tsInterior]);
                            }

                            CheckAndDispatchNextDriver();
                            return 1;
                        }
                    }
                }

                // Overspeed Alert (RED color) & Fine Penalty System
                static bool:bHV2Red[MAX_PLAYERS];
                if(speedMPH > limit)
                {
                    if(!bHV2Red[playerid])
                    {
                        bHV2Red[playerid] = true;
                        PlayerTextDrawColour(playerid, HV2_Speed[playerid], 0xFF0000FF); // Red
                        PlayerTextDrawShow(playerid, HV2_Speed[playerid]);
                    }

                    PlayerOverspeedWarns[playerid]++;
                    if(PlayerOverspeedWarns[playerid] % 3 == 0)
                    {
                        PlayerTotalFines[playerid] += 50;
                        GivePlayerMoney(playerid, -50);
                        SendClientMessageEx(playerid, COLOR_LIGHTRED, "[RAILROAD WARNING]: Overspeeding (%.1f / %.1f MPH)! Fine: -$50.", speedMPH, limit);
                    }
                }
                else
                {
                    if(bHV2Red[playerid])
                    {
                        bHV2Red[playerid] = false;
                        PlayerTextDrawColour(playerid, HV2_Speed[playerid], -1); // White
                        PlayerTextDrawShow(playerid, HV2_Speed[playerid]);
                    }
                }

                // Station Stop Boarding (2 Minutes = 120 Seconds Stop)
                if(dist < 20.0)
                {
                    if(!PlayerBoardingActive[playerid])
                    {
                        PlayerBoardingActive[playerid] = true;
                        PlayerBoardingTimer[playerid] = 0;

                        GameTextForPlayer(playerid, "~w~Station Stop~n~~y~Boarding: 2 Mins", 4000, 3);
                        SendClientMessage(playerid, COLOR_CYAN, "[TRAIN SYSTEM]: Arrived at station peron! Passenger transit is in progress (2 mins), wait until boarding 100 percent.");
                        SendNearbyMessage(playerid, 30.0, COLOR_PURPLE, "* %s pulls the throttle back, applies pneumatic air brakes, and unlocks passenger doors.", ReturnName(playerid, 0));

                        new strAnnounce[128];
                        format(strAnnounce, sizeof(strAnnounce), "[ANNOUNCEMENT]: The Brown Streak Express has arrived at %s. Passengers may board/unboard.", targetName);
                        SendTrainAnnouncement(targetX, targetY, targetZ, strAnnounce, veh);
                    }

                    PlayerBoardingTimer[playerid]++;
                    new secs = PlayerBoardingTimer[playerid];
                    new pct = 0;

                    if(secs <= 60)
                    {
                        // Minute 1: Unboarding (100% -> 0%) - Yellow/Orange color bar
                        pct = floatround(100.0 - ((float(secs) * 100.0) / 60.0));
                        new Float:bWidth = (float(pct) / 100.0) * 108.0;
                        if(bWidth < 0.1) bWidth = 0.1;
                        ShowTrainBoardingBar(playerid, "Unboarding Passengers.....", bWidth, 0xFFFF00FF);
                    }
                    else if(secs <= 120)
                    {
                        // Minute 2: Boarding (0% -> 100%) - Green color bar
                        pct = floatround(((float(secs - 60) * 100.0) / 60.0));
                        new Float:bWidth = (float(pct) / 100.0) * 108.0;
                        if(bWidth < 0.1) bWidth = 0.1;
                        ShowTrainBoardingBar(playerid, "Boarding Passengers.....", bWidth, 0x33AA33FF);
                    }

                    if(secs >= 120)
                    {
                        // 2-Minute station boarding completed!
                        PlayerBoardingActive[playerid] = false;
                        PlayerBoardingTimer[playerid] = 0;
                        HideTrainBoardingBar(playerid);

                        gCurrentRouteIndex = step;
                        PlayerLegsCompleted[playerid]++;

                        if(PlayerLegsCompleted[playerid] < 2)
                        {
                            // Driver still has 1 more CP to complete
                            new nextStep = (step + 1) % (TrainCheckpointCount > 0 ? TrainCheckpointCount : 5);
                            PlayerTrainStep[playerid] = nextStep;

                            new nextName[64];
                            if(TrainCheckpointCount > 0 && nextStep < TrainCheckpointCount)
                                format(nextName, sizeof(nextName), "%s", TrainCheckpoints[nextStep][cpName]);
                            else
                                format(nextName, sizeof(nextName), "%s", gDefaultTrainRoute[nextStep % 5][cpName]);

                            // Show 3-second Next Station GameText on departure
                            new strNextGameText[128];
                            format(strNextGameText, sizeof(strNextGameText), "~y~NEXT STATION~n~~w~%s", nextName);
                            GameTextForPlayer(playerid, strNextGameText, 3000, 3);

                            for(new p = 0; p < MAX_PLAYERS; p++)
                            {
                                if(IsPlayerConnected(p) && IsPlayerInVehicle(p, veh) && GetPlayerState(p) == PLAYER_STATE_PASSENGER)
                                {
                                    GameTextForPlayer(p, strNextGameText, 3000, 3);
                                }
                            }

                            new strAnnounce2[128];
                            format(strAnnounce2, sizeof(strAnnounce2), "[ANNOUNCEMENT]: The Brown Streak Express is departing %s for %s.", targetName, nextName);
                            SendTrainAnnouncement(targetX, targetY, targetZ, strAnnounce2, veh);

                            // Trigger 30-second Departure AFK timer
                            PlayerDepartureWarning[playerid] = true;
                            PlayerDepartureTimer[playerid] = 30;
                        }
                        else
                        {
                            // Completed 2 Checkpoints! Shift finished cleanly!
                            new Float:distMeters = GetPlayerDistanceFromPoint(playerid, PlayerShiftStartPos[playerid][0], PlayerShiftStartPos[playerid][1], PlayerShiftStartPos[playerid][2]);
                            new Float:shiftYards = distMeters * 1.09361;

                            new basePay = floatround((shiftYards / 100.0) * 100.0);
                            if(basePay < 150) basePay = 150; // Minimum base pay floor

                            new finalPay = basePay - PlayerTotalFines[playerid];
                            if(finalPay < 50) finalPay = 50;

                            PlayerData[playerid][pPayCheck] += finalPay;
                            AddSalaryHistory(playerid, finalPay, "Train Driver Shift");
                            SendClientMessageEx(playerid, COLOR_GREEN, "[TRAIN JOB]: 2-Station Shift completed! Distance: %.0f yards | Base Pay: $%d ($100/100yd) | Fines: -$%d | Net Paycheck: $%d.", shiftYards, basePay, PlayerTotalFines[playerid], finalPay);
                            SendNearbyMessage(playerid, 30.0, COLOR_PURPLE, "* %s powers down the locomotive engine, signs off the dispatch log, and steps down to the station peron.", ReturnName(playerid, 0));

                            PlayerOnTrainJob[playerid] = false;
                            PlayerTrainJobDelay[playerid] = gettime() + 1800; // 30-minute delay after shift
                            DisablePlayerCheckpoint(playerid);

                            // Clean Eject & Teleport directly to Train Station Pickup Point
                            RemovePlayerFromVehicle(playerid);

                            new nearestStation = -1;
                            new Float:minDist = 99999.0;
                            for(new s = 0; s < MAX_TRAIN_STATIONS; s++)
                            {
                                if(TrainStations[s][tsID] != 0)
                                {
                                    new Float:stDist = GetPlayerDistanceFromPoint(playerid, TrainStations[s][tsX], TrainStations[s][tsY], TrainStations[s][tsZ]);
                                    if(stDist < minDist)
                                    {
                                        minDist = stDist;
                                        nearestStation = s;
                                    }
                                }
                            }

                            if(nearestStation != -1)
                            {
                                SetPlayerPos(playerid, TrainStations[nearestStation][tsX], TrainStations[nearestStation][tsY], TrainStations[nearestStation][tsZ] + 0.5);
                                SetPlayerVirtualWorld(playerid, TrainStations[nearestStation][tsWorld]);
                                SetPlayerInterior(playerid, TrainStations[nearestStation][tsInterior]);
                            }
                            else
                            {
                                SetPlayerPos(playerid, targetX + 3.0, targetY + 3.0, targetZ + 0.5);
                            }

                            SetCameraBehindPlayer(playerid);
                            TogglePlayerControllable(playerid, true);

                            RemovePlayerFromTrainQueue(playerid);

                            new strAnnounce3[128];
                            format(strAnnounce3, sizeof(strAnnounce3), "[ANNOUNCEMENT]: The Brown Streak Express is parked at %s awaiting the next shift driver.", targetName);
                            SendTrainAnnouncement(targetX, targetY, targetZ, strAnnounce3, veh);
                        }
                    }
                }

                // Automatic Railroad Crossing Barrier Gates Handling (< 80m radius)
                for(new c = 0; c < MAX_RAIL_CROSSINGS; c++)
                {
                    if(RailCrossings[c][rcID] != 0)
                    {
                        new Float:rcDist = GetPlayerDistanceFromPoint(playerid, RailCrossings[c][rcX], RailCrossings[c][rcY], RailCrossings[c][rcZ]);
                        if(rcDist < 80.0 && !RailCrossings[c][rcIsClosed])
                        {
                            RailCrossings[c][rcIsClosed] = true;
                            MoveDynamicObject(RailCrossings[c][rcObject], RailCrossings[c][rcX], RailCrossings[c][rcY], RailCrossings[c][rcZ], 2.0, 
                                RailCrossings[c][rcMoveRX], RailCrossings[c][rcMoveRY], RailCrossings[c][rcMoveRZ]);
                        }
                        else if(rcDist >= 80.0 && RailCrossings[c][rcIsClosed])
                        {
                            RailCrossings[c][rcIsClosed] = false;
                            MoveDynamicObject(RailCrossings[c][rcObject], RailCrossings[c][rcX], RailCrossings[c][rcY], RailCrossings[c][rcZ], 2.0, 
                                RailCrossings[c][rcRX], RailCrossings[c][rcRY], RailCrossings[c][rcRZ]);
                        }
                    }
                }
            }
        }
    }

    return 1;
}

// --- Player Ticket Purchase Command ---

CMD:buyticket(playerid, params[])
{
    new stationid = -1;
    for(new i = 0; i < MAX_TRAIN_STATIONS; i++)
    {
        if(TrainStations[i][tsID] != 0)
        {
            if(IsPlayerInRangeOfPoint(playerid, 3.0, TrainStations[i][tsX], TrainStations[i][tsY], TrainStations[i][tsZ]))
            {
                stationid = i;
                break;
            }
        }
    }

    if(stationid == -1)
        return SendErrorMessage(playerid, "You are not standing near any Train Station Ticket Counter.");

    new price = TrainStations[stationid][tsPrice];
    if(GetPlayerMoney(playerid) < price)
        return SendErrorMessage(playerid, "You do not have enough money ($%d required).", price);

    GivePlayerMoney(playerid, -price);
    PlayerHasTrainTicket[playerid] = true;

    SendClientMessageEx(playerid, COLOR_GREEN, "[TRAIN TICKET]: You purchased a train ticket for %s for $%d.", TrainStations[stationid][tsName], price);
    SendClientMessage(playerid, COLOR_YELLOW, "[ANNOUNCEMENT]: Please board the Brown Streak Express when it arrives at the platform.");
    return 1;
}

// --- Train Driver Job Commands ---

CMD:trainjob(playerid, params[])
{
    new subcmd[32];
    if(sscanf(params, "s[32]", subcmd))
    {
        SendSyntaxMessage(playerid, "/trainjob [join / queue / leavequeue / leave / status / start]");
        return 1;
    }

    if(!strcmp(subcmd, "join", true))
    {
        new centerid = -1;
        for(new i = 0; i < MAX_TRAIN_CENTERS; i++)
        {
            if(TrainCenters[i][tcID] != 0)
            {
                if(IsPlayerInRangeOfPoint(playerid, 3.0, TrainCenters[i][tcX], TrainCenters[i][tcY], TrainCenters[i][tcZ]))
                {
                    centerid = i;
                    break;
                }
            }
        }

        if(centerid == -1)
            return SendErrorMessage(playerid, "You must be standing at a Train Driver Center to /trainjob join.");

        if(PlayerData[playerid][pJob] == JOB_TRAIN_DRIVER)
            return SendErrorMessage(playerid, "You are already employed as a Train Driver.");

        if(PlayerData[playerid][pJob] != 0)
            return SendErrorMessage(playerid, "You already have another job (%s). Type /leavejob to leave first.", ReturnJobName(playerid, PlayerData[playerid][pJob]));

        PlayerData[playerid][pJob] = JOB_TRAIN_DRIVER;

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "UPDATE `characters` SET `playerJob` = '8' WHERE `ID` = '%d'", PlayerData[playerid][pID]);
        mysql_tquery(dbCon, query);

        SendClientMessageEx(playerid, COLOR_GREEN, "[TRAIN JOB]: Congratulations! You are now employed as a Train Driver at %s.", TrainCenters[centerid][tcName]);
        SendClientMessage(playerid, COLOR_YELLOW, "Check /stats to see your updated job. Use /trainjob queue to join the active shift dispatch queue.");
        return 1;
    }

    // Require Player to be employed as Train Driver for all other subcommands
    if(PlayerData[playerid][pJob] != JOB_TRAIN_DRIVER)
        return SendErrorMessage(playerid, "You must be employed as a Train Driver first. Visit a Train Driver Center to /trainjob join.");

    if(!strcmp(subcmd, "queue", true))
    {
        if(gettime() < PlayerTrainJobDelay[playerid])
        {
            new remaining = PlayerTrainJobDelay[playerid] - gettime();
            new mins = remaining / 60;
            new secs = remaining % 60;
            return SendErrorMessage(playerid, "You must wait %d minutes and %d seconds before joining the Train Driver queue again (/delays).", mins, secs);
        }

        if(PlayerInTrainQueue[playerid])
            return SendErrorMessage(playerid, "You are already in the Train Driver queue (Position #%d).", PlayerTrainQueuePos[playerid]);

        AddPlayerToTrainQueue(playerid);
        SendClientMessageEx(playerid, COLOR_GREEN, "[RAILROAD DISPATCH]: You joined the Train Driver queue. Your Position: #%d.", PlayerTrainQueuePos[playerid]);
        SendClientMessage(playerid, COLOR_YELLOW, "You will receive an SMS and a 5-minute timer when a train shift is ready.");
        return 1;
    }
    else if(!strcmp(subcmd, "leavequeue", true))
    {
        if(!PlayerInTrainQueue[playerid])
            return SendErrorMessage(playerid, "You are not in the Train Driver queue.");

        RemovePlayerFromTrainQueue(playerid);
        SendClientMessage(playerid, COLOR_LIGHTRED, "[RAILROAD DISPATCH]: You left the Train Driver queue.");
        return 1;
    }
    else if(!strcmp(subcmd, "leave", true))
    {
        if(!PlayerOnTrainJob[playerid] && !PlayerInTrainQueue[playerid] && !PlayerDispatchActive[playerid])
            return SendErrorMessage(playerid, "You are not currently on a train shift or in queue.");

        PlayerOnTrainJob[playerid] = false;
        PlayerDispatchActive[playerid] = false;
        PlayerDepartureWarning[playerid] = false;
        PlayerDepartureTimer[playerid] = 0;
        PlayerExitTimer[playerid] = 0;
        PlayerMountTimer[playerid] = 0;

        HideTrainDriverHUD(playerid);
        HideTrainDispatchHUD(playerid);
        DisablePlayerCheckpoint(playerid);

        if(IsPlayerInAnyVehicle(playerid))
        {
            RemovePlayerFromVehicle(playerid);
            SetCameraBehindPlayer(playerid);
            TogglePlayerControllable(playerid, true);
        }

        RemovePlayerFromTrainQueue(playerid);
        SendClientMessage(playerid, COLOR_YELLOW, "[TRAIN JOB]: You have voluntarily resigned from your train driver shift/queue.");
        SendNearbyMessage(playerid, 30.0, COLOR_PURPLE, "* %s turns off the locomotive main power switches, collects personal gear, and leaves the shift.", ReturnName(playerid, 0));
        CheckAndDispatchNextDriver();
        return 1;
    }
    else if(!strcmp(subcmd, "status", true))
    {
        if(!PlayerInTrainQueue[playerid])
            return SendErrorMessage(playerid, "You are not in the Train Driver queue.");

        SendClientMessageEx(playerid, COLOR_CYAN, "[RAILROAD DISPATCH]: Queue Position: #%d of %d.", PlayerTrainQueuePos[playerid], TrainQueueCount);
        if(PlayerDispatchActive[playerid])
        {
            SendClientMessageEx(playerid, COLOR_YELLOW, "Shift Call Active! Time Left to report: %d seconds.", PlayerDispatchTimer[playerid]);
        }
        return 1;
    }
    else if(!strcmp(subcmd, "start", true))
    {
        if(!PlayerDispatchActive[playerid])
            return SendErrorMessage(playerid, "You do not have an active Dispatch Call shift.");

        new leg = gCurrentRouteIndex;

        // Verify player is standing near a valid Train Station (/trainstation) or platform
        new bool:nearStation = false;
        for(new i = 0; i < MAX_TRAIN_STATIONS; i++)
        {
            if(TrainStations[i][tsID] != 0 && IsPlayerInRangeOfPoint(playerid, 6.0, TrainStations[i][tsX], TrainStations[i][tsY], TrainStations[i][tsZ]))
            {
                nearStation = true;
                break;
            }
        }
        if(!nearStation)
        {
            if(TrainCheckpointCount > 0 && leg < TrainCheckpointCount)
            {
                if(IsPlayerInRangeOfPoint(playerid, 15.0, TrainCheckpoints[leg][cpX], TrainCheckpoints[leg][cpY], TrainCheckpoints[leg][cpZ]))
                    nearStation = true;
            }
            else
            {
                if(IsPlayerInRangeOfPoint(playerid, 15.0, gDefaultTrainRoute[leg % 5][cpX], gDefaultTrainRoute[leg % 5][cpY], gDefaultTrainRoute[leg % 5][cpZ]))
                    nearStation = true;
            }
        }

        if(!nearStation)
            return SendErrorMessage(playerid, "You must be standing at a Train Station or station platform to /trainjob start.");

        new Float:x, Float:y, Float:z, Float:angle;
        new startName[64], targetName[64];

        if(TrainCheckpointCount > 0 && leg < TrainCheckpointCount)
        {
            x = TrainCheckpoints[leg][cpX];
            y = TrainCheckpoints[leg][cpY];
            z = TrainCheckpoints[leg][cpZ];
            angle = TrainCheckpoints[leg][cpAngle];
            format(startName, sizeof(startName), "%s", TrainCheckpoints[leg][cpName]);

            new nextIdx = (leg + 1) % TrainCheckpointCount;
            format(targetName, sizeof(targetName), "%s", TrainCheckpoints[nextIdx][cpName]);
            PlayerTrainSpeedLimit[playerid] = TrainCheckpoints[leg][cpSpeedLimit];
        }
        else
        {
            x = gDefaultTrainRoute[leg % 5][cpX];
            y = gDefaultTrainRoute[leg % 5][cpY];
            z = gDefaultTrainRoute[leg % 5][cpZ];
            angle = gDefaultTrainRoute[leg % 5][cpAngle];
            format(startName, sizeof(startName), "%s", gDefaultTrainRoute[leg % 5][cpName]);

            new nextIdx = (leg + 1) % 5;
            format(targetName, sizeof(targetName), "%s", gDefaultTrainRoute[nextIdx][cpName]);
            PlayerTrainSpeedLimit[playerid] = gDefaultTrainRoute[leg % 5][cpSpeedLimit];
        }

        DisablePlayerCheckpoint(playerid);
        PlayerDispatchActive[playerid] = false;
        HideTrainDispatchHUD(playerid);

        PlayerOnTrainJob[playerid] = true;
        PlayerTrainStep[playerid] = (leg + 1) % (TrainCheckpointCount > 0 ? TrainCheckpointCount : 5);
        PlayerLegsCompleted[playerid] = 0;
        PlayerBoardingTimer[playerid] = 0;
        PlayerBoardingActive[playerid] = false;
        PlayerOverspeedWarns[playerid] = 0;
        PlayerTotalFines[playerid] = 0;
        PlayerShiftStartPos[playerid][0] = x;
        PlayerShiftStartPos[playerid][1] = y;
        PlayerShiftStartPos[playerid][2] = z;
        PlayerMountTimer[playerid] = 60; // 1-Minute timeout to enter train cabin
        PlayerDepartureTimer[playerid] = 0;
        PlayerDepartureWarning[playerid] = false;
        PlayerExitTimer[playerid] = 0;

        // Teleport player near track coordinates so streaming & vehicle sync work 100%
        SetPlayerPos(playerid, x, y, z + 2.0);
        SetPlayerVirtualWorld(playerid, 0);
        SetPlayerInterior(playerid, 0);

        new veh = gStaticTrainLocomotive;

        // Position static train locomotive at current leg station track facing exact checkpoint angle
        SetVehiclePos(veh, x, y, z);
        SetVehicleZAngle(veh, angle);
        SetVehicleVirtualWorld(veh, 0);
        LinkVehicleToInterior(veh, 0);

        // Put player into static train driver seat 0
        PutPlayerInVehicle(playerid, veh, 0);
        PlayerTrainVehicle[playerid] = veh;

        // Set standard SA-MP free-look vehicle camera behind player
        SetCameraBehindPlayer(playerid);

        ShowTrainDriverHUD(playerid);

        SendClientMessageEx(playerid, COLOR_GREEN, "[TRAIN JOB]: 2 station shift started! Target Route: %s -> %s.", startName, targetName);
        SendNearbyMessage(playerid, 30.0, COLOR_PURPLE, "* %s inserts the master key into the locomotive console, checking brake pressures before starting the engine.", ReturnName(playerid, 0));
        new strStartAnnounce[128];
        format(strStartAnnounce, sizeof(strStartAnnounce), "[ANNOUNCEMENT]: The Brown Streak Express is now departing %s for %s.", startName, targetName);
        SendTrainAnnouncement(x, y, z, strStartAnnounce, veh);
        return 1;
    }

    return 1;
}

// --- Dynamic Admin Suite: /traincheckpoint ---

CMD:traincheckpoint(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You do not have permission to use this command.");

    new subcmd[32], optionStr[64];
    if(sscanf(params, "s[32]S()[64]", subcmd, optionStr))
    {
        SendSyntaxMessage(playerid, "/traincheckpoint [create / remove / list / goto]");
        return 1;
    }

    if(!strcmp(subcmd, "create", true))
    {
        new name[64], Float:speedLimit;
        if(sscanf(optionStr, "f s[64]", speedLimit, name))
            return SendSyntaxMessage(playerid, "/traincheckpoint create [speed_limit] [checkpoint_name]");

        if(TrainCheckpointCount >= MAX_TRAIN_CHECKPOINTS)
            return SendErrorMessage(playerid, "Maximum train checkpoint limit reached (%d).", MAX_TRAIN_CHECKPOINTS);

        new Float:x, Float:y, Float:z, Float:angle;
        GetPlayerPos(playerid, x, y, z);
        GetPlayerFacingAngle(playerid, angle);

        new slot = TrainCheckpointCount;
        TrainCheckpoints[slot][cpX] = x;
        TrainCheckpoints[slot][cpY] = y;
        TrainCheckpoints[slot][cpZ] = z;
        TrainCheckpoints[slot][cpAngle] = angle;
        TrainCheckpoints[slot][cpSpeedLimit] = speedLimit;
        format(TrainCheckpoints[slot][cpName], 64, "%s", name);

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `train_route_checkpoints` (`Name`, `X`, `Y`, `Z`, `Angle`, `SpeedLimit`) VALUES ('%e', '%f', '%f', '%f', '%f', '%f')",
            name, x, y, z, angle, speedLimit);
        mysql_tquery(dbCon, query, "OnTrainCheckpointCreated", "d", slot);

        SendServerMessage(playerid, "Created Train Route Checkpoint #%d '%s' (Speed Limit: %.1f MPH) at your location & angle.", slot + 1, name, speedLimit);
        return 1;
    }
    else if(!strcmp(subcmd, "remove", true))
    {
        new id;
        if(sscanf(optionStr, "d", id))
            return SendSyntaxMessage(playerid, "/traincheckpoint remove [checkpoint_index_1_based]");

        id = id - 1;
        if(id < 0 || id >= TrainCheckpointCount)
            return SendErrorMessage(playerid, "Invalid Train Checkpoint index.");

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `train_route_checkpoints` WHERE `ID` = '%d'", TrainCheckpoints[id][cpID]);
        mysql_tquery(dbCon, query);

        for(new i = id; i < TrainCheckpointCount - 1; i++)
        {
            TrainCheckpoints[i] = TrainCheckpoints[i + 1];
        }
        TrainCheckpointCount--;
        SendServerMessage(playerid, "Train Route Checkpoint #%d deleted.", id + 1);
        return 1;
    }
    else if(!strcmp(subcmd, "list", true))
    {
        new lstr[512];
        format(lstr, sizeof(lstr), "Index\tName\tSpeed Limit\n");
        for(new i = 0; i < TrainCheckpointCount; i++)
        {
            format(lstr, sizeof(lstr), "%s#%d\t%s\t%.1f MPH\n", lstr, i + 1, TrainCheckpoints[i][cpName], TrainCheckpoints[i][cpSpeedLimit]);
        }
        if(TrainCheckpointCount == 0) return SendErrorMessage(playerid, "No Train Route Checkpoints created yet.");

        Dialog_Show(playerid, TrainCheckpointList, DIALOG_STYLE_TABLIST_HEADERS, "Train Route Checkpoint List", lstr, "Goto", "Close");
        return 1;
    }
    else if(!strcmp(subcmd, "goto", true))
    {
        new id;
        if(sscanf(optionStr, "d", id))
            return SendSyntaxMessage(playerid, "/traincheckpoint goto [checkpoint_index_1_based]");

        id = id - 1;
        if(id < 0 || id >= TrainCheckpointCount)
            return SendErrorMessage(playerid, "Invalid Train Checkpoint index.");

        SetPlayerPos(playerid, TrainCheckpoints[id][cpX], TrainCheckpoints[id][cpY], TrainCheckpoints[id][cpZ]);
        SetPlayerFacingAngle(playerid, TrainCheckpoints[id][cpAngle]);
        SendServerMessage(playerid, "Teleported to Train Checkpoint #%d '%s'.", id + 1, TrainCheckpoints[id][cpName]);
        return 1;
    }

    return 1;
}

forward OnTrainCheckpointCreated(slot);
public OnTrainCheckpointCreated(slot)
{
    TrainCheckpoints[slot][cpID] = cache_insert_id();
    TrainCheckpointCount++;
    return 1;
}

Dialog:TrainCheckpointList(playerid, response, listitem, inputtext[])
{
    if(response)
    {
        if(listitem >= 0 && listitem < TrainCheckpointCount)
        {
            SetPlayerPos(playerid, TrainCheckpoints[listitem][cpX], TrainCheckpoints[listitem][cpY], TrainCheckpoints[listitem][cpZ]);
            SetPlayerFacingAngle(playerid, TrainCheckpoints[listitem][cpAngle]);
            SendServerMessage(playerid, "Teleported to Train Checkpoint #%d '%s'.", listitem + 1, TrainCheckpoints[listitem][cpName]);
        }
    }
    return 1;
}

// --- Dynamic Admin Suite: /traincenter ---

CMD:traincenter(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You do not have permission to use this command.");

    new subcmd[32], optionStr[64];
    if(sscanf(params, "s[32]S()[64]", subcmd, optionStr))
    {
        SendSyntaxMessage(playerid, "/traincenter [create / remove / list / goto]");
        return 1;
    }

    if(!strcmp(subcmd, "create", true))
    {
        new name[64];
        if(sscanf(optionStr, "s[64]", name))
            return SendSyntaxMessage(playerid, "/traincenter create [center_name]");

        new slot = -1;
        for(new i = 0; i < MAX_TRAIN_CENTERS; i++)
        {
            if(TrainCenters[i][tcID] == 0)
            {
                slot = i;
                break;
            }
        }

        if(slot == -1)
            return SendErrorMessage(playerid, "Maximum train center limit reached (%d).", MAX_TRAIN_CENTERS);

        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);

        TrainCenters[slot][tcX] = x;
        TrainCenters[slot][tcY] = y;
        TrainCenters[slot][tcZ] = z;
        TrainCenters[slot][tcWorld] = GetPlayerVirtualWorld(playerid);
        TrainCenters[slot][tcInterior] = GetPlayerInterior(playerid);
        format(TrainCenters[slot][tcName], 64, "%s", name);

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `train_centers` (`Name`, `X`, `Y`, `Z`, `World`, `Interior`) VALUES ('%e', '%f', '%f', '%f', '%d', '%d')",
            name, x, y, z, TrainCenters[slot][tcWorld], TrainCenters[slot][tcInterior]);
        mysql_tquery(dbCon, query, "OnTrainCenterCreated", "d", slot);

        SendServerMessage(playerid, "Created Train Driver Center '%s' at your location.", name);
        return 1;
    }
    else if(!strcmp(subcmd, "remove", true))
    {
        new id;
        if(sscanf(optionStr, "d", id))
            return SendSyntaxMessage(playerid, "/traincenter remove [center_id]");

        if(id < 0 || id >= MAX_TRAIN_CENTERS || TrainCenters[id][tcID] == 0)
            return SendErrorMessage(playerid, "Invalid Train Driver Center ID.");

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `train_centers` WHERE `ID` = '%d'", TrainCenters[id][tcID]);
        mysql_tquery(dbCon, query);

        if(IsValidDynamicPickup(TrainCenters[id][tcPickup]))
            DestroyDynamicPickup(TrainCenters[id][tcPickup]);

        if(TrainCenters[id][tcTextLabel] != Text3D:INVALID_3DTEXT_ID && TrainCenters[id][tcTextLabel] != Text3D:0)
            DestroyDynamic3DTextLabel(TrainCenters[id][tcTextLabel]);

        TrainCenters[id][tcID] = 0;
        SendServerMessage(playerid, "Train Driver Center ID %d deleted.", id);
        return 1;
    }
    else if(!strcmp(subcmd, "list", true))
    {
        new lstr[512], count = 0;
        format(lstr, sizeof(lstr), "ID\tName\tWorld\n");
        for(new i = 0; i < MAX_TRAIN_CENTERS; i++)
        {
            if(TrainCenters[i][tcID] != 0)
            {
                format(lstr, sizeof(lstr), "%s%d\t%s\t%d\n", lstr, i, TrainCenters[i][tcName], TrainCenters[i][tcWorld]);
                count++;
            }
        }
        if(count == 0) return SendErrorMessage(playerid, "No Train Driver Centers created yet.");

        Dialog_Show(playerid, TrainCenterList, DIALOG_STYLE_TABLIST_HEADERS, "Train Driver Center List", lstr, "Goto", "Close");
        return 1;
    }
    else if(!strcmp(subcmd, "goto", true))
    {
        new id;
        if(sscanf(optionStr, "d", id))
            return SendSyntaxMessage(playerid, "/traincenter goto [center_id]");

        if(id < 0 || id >= MAX_TRAIN_CENTERS || TrainCenters[id][tcID] == 0)
            return SendErrorMessage(playerid, "Invalid Train Driver Center ID.");

        SetPlayerPos(playerid, TrainCenters[id][tcX], TrainCenters[id][tcY], TrainCenters[id][tcZ]);
        SetPlayerVirtualWorld(playerid, TrainCenters[id][tcWorld]);
        SetPlayerInterior(playerid, TrainCenters[id][tcInterior]);
        SendServerMessage(playerid, "Teleported to Train Driver Center '%s' (ID %d).", TrainCenters[id][tcName], id);
        return 1;
    }

    return 1;
}

forward OnTrainCenterCreated(slot);
public OnTrainCenterCreated(slot)
{
    TrainCenters[slot][tcID] = cache_insert_id();
    RefreshTrainCenter(slot);
    return 1;
}

Dialog:TrainCenterList(playerid, response, listitem, inputtext[])
{
    if(response)
    {
        new count = 0;
        for(new i = 0; i < MAX_TRAIN_CENTERS; i++)
        {
            if(TrainCenters[i][tcID] != 0)
            {
                if(count == listitem)
                {
                    SetPlayerPos(playerid, TrainCenters[i][tcX], TrainCenters[i][tcY], TrainCenters[i][tcZ]);
                    SetPlayerVirtualWorld(playerid, TrainCenters[i][tcWorld]);
                    SetPlayerInterior(playerid, TrainCenters[i][tcInterior]);
                    SendServerMessage(playerid, "Teleported to Train Driver Center '%s' (ID %d).", TrainCenters[i][tcName], i);
                    return 1;
                }
                count++;
            }
        }
    }
    return 1;
}

// --- Dynamic Admin Suite: /trainstation ---

CMD:trainstation(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You do not have permission to use this command.");

    new subcmd[32], optionStr[64];
    if(sscanf(params, "s[32]S()[64]", subcmd, optionStr))
    {
        SendSyntaxMessage(playerid, "/trainstation [create / remove / list / goto]");
        return 1;
    }

    if(!strcmp(subcmd, "create", true))
    {
        new name[64], price;
        if(sscanf(optionStr, "d s[64]", price, name))
            return SendSyntaxMessage(playerid, "/trainstation create [price] [station_name]");

        new slot = -1;
        for(new i = 0; i < MAX_TRAIN_STATIONS; i++)
        {
            if(TrainStations[i][tsID] == 0)
            {
                slot = i;
                break;
            }
        }

        if(slot == -1)
            return SendErrorMessage(playerid, "Maximum train station limit reached (%d).", MAX_TRAIN_STATIONS);

        new Float:x, Float:y, Float:z;
        GetPlayerPos(playerid, x, y, z);

        TrainStations[slot][tsX] = x;
        TrainStations[slot][tsY] = y;
        TrainStations[slot][tsZ] = z;
        TrainStations[slot][tsWorld] = GetPlayerVirtualWorld(playerid);
        TrainStations[slot][tsInterior] = GetPlayerInterior(playerid);
        TrainStations[slot][tsPrice] = price;
        format(TrainStations[slot][tsName], 64, "%s", name);

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `train_stations` (`Name`, `X`, `Y`, `Z`, `World`, `Interior`, `Price`) VALUES ('%e', '%f', '%f', '%f', '%d', '%d', '%d')",
            name, x, y, z, TrainStations[slot][tsWorld], TrainStations[slot][tsInterior], price);
        mysql_tquery(dbCon, query, "OnTrainStationCreated", "d", slot);

        SendServerMessage(playerid, "Created Train Station '%s' (Price: $%d) at your location.", name, price);
        return 1;
    }
    else if(!strcmp(subcmd, "remove", true))
    {
        new id;
        if(sscanf(optionStr, "d", id))
            return SendSyntaxMessage(playerid, "/trainstation remove [station_id]");

        if(id < 0 || id >= MAX_TRAIN_STATIONS || TrainStations[id][tsID] == 0)
            return SendErrorMessage(playerid, "Invalid Train Station ID.");

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `train_stations` WHERE `ID` = '%d'", TrainStations[id][tsID]);
        mysql_tquery(dbCon, query);

        if(IsValidDynamicPickup(TrainStations[id][tsPickup]))
            DestroyDynamicPickup(TrainStations[id][tsPickup]);

        if(TrainStations[id][tsTextLabel] != Text3D:INVALID_3DTEXT_ID && TrainStations[id][tsTextLabel] != Text3D:0)
            DestroyDynamic3DTextLabel(TrainStations[id][tsTextLabel]);

        TrainStations[id][tsID] = 0;
        SendServerMessage(playerid, "Train Station ID %d deleted.", id);
        return 1;
    }
    else if(!strcmp(subcmd, "list", true))
    {
        new lstr[512], count = 0;
        format(lstr, sizeof(lstr), "ID\tName\tPrice\tWorld\n");
        for(new i = 0; i < MAX_TRAIN_STATIONS; i++)
        {
            if(TrainStations[i][tsID] != 0)
            {
                format(lstr, sizeof(lstr), "%s%d\t%s\t$%d\t%d\n", lstr, i, TrainStations[i][tsName], TrainStations[i][tsPrice], TrainStations[i][tsWorld]);
                count++;
            }
        }
        if(count == 0) return SendErrorMessage(playerid, "No Train Stations created yet.");

        Dialog_Show(playerid, TrainStationList, DIALOG_STYLE_TABLIST_HEADERS, "Train Station List", lstr, "Goto", "Close");
        return 1;
    }
    else if(!strcmp(subcmd, "goto", true))
    {
        new id;
        if(sscanf(optionStr, "d", id))
            return SendSyntaxMessage(playerid, "/trainstation goto [station_id]");

        if(id < 0 || id >= MAX_TRAIN_STATIONS || TrainStations[id][tsID] == 0)
            return SendErrorMessage(playerid, "Invalid Train Station ID.");

        SetPlayerPos(playerid, TrainStations[id][tsX], TrainStations[id][tsY], TrainStations[id][tsZ]);
        SetPlayerVirtualWorld(playerid, TrainStations[id][tsWorld]);
        SetPlayerInterior(playerid, TrainStations[id][tsInterior]);
        SendServerMessage(playerid, "Teleported to Train Station '%s' (ID %d).", TrainStations[id][tsName], id);
        return 1;
    }

    return 1;
}

forward OnTrainStationCreated(slot);
public OnTrainStationCreated(slot)
{
    TrainStations[slot][tsID] = cache_insert_id();
    RefreshTrainStation(slot);
    return 1;
}

Dialog:TrainStationList(playerid, response, listitem, inputtext[])
{
    if(response)
    {
        new count = 0;
        for(new i = 0; i < MAX_TRAIN_STATIONS; i++)
        {
            if(TrainStations[i][tsID] != 0)
            {
                if(count == listitem)
                {
                    SetPlayerPos(playerid, TrainStations[i][tsX], TrainStations[i][tsY], TrainStations[i][tsZ]);
                    SetPlayerVirtualWorld(playerid, TrainStations[i][tsWorld]);
                    SetPlayerInterior(playerid, TrainStations[i][tsInterior]);
                    SendServerMessage(playerid, "Teleported to Train Station '%s' (ID %d).", TrainStations[i][tsName], i);
                    return 1;
                }
                count++;
            }
        }
    }
    return 1;
}

// --- Dynamic Admin Suite: /railcrossing ---

CMD:railcrossing(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 4)
        return SendErrorMessage(playerid, "You do not have permission to use this command.");

    new subcmd[32], optionStr[64];
    if(sscanf(params, "s[32]S()[64]", subcmd, optionStr))
    {
        SendSyntaxMessage(playerid, "/railcrossing [create / remove / list]");
        return 1;
    }

    if(!strcmp(subcmd, "create", true))
    {
        new slot = -1;
        for(new i = 0; i < MAX_RAIL_CROSSINGS; i++)
        {
            if(RailCrossings[i][rcID] == 0)
            {
                slot = i;
                break;
            }
        }

        if(slot == -1)
            return SendErrorMessage(playerid, "Maximum rail crossing limit reached (%d).", MAX_RAIL_CROSSINGS);

        new Float:x, Float:y, Float:z, Float:rz;
        GetPlayerPos(playerid, x, y, z);
        GetPlayerFacingAngle(playerid, rz);

        RailCrossings[slot][rcX] = x;
        RailCrossings[slot][rcY] = y;
        RailCrossings[slot][rcZ] = z;
        RailCrossings[slot][rcRX] = 0.0;
        RailCrossings[slot][rcRY] = 0.0;
        RailCrossings[slot][rcRZ] = rz;
        RailCrossings[slot][rcMoveRX] = 0.0;
        RailCrossings[slot][rcMoveRY] = -90.0;
        RailCrossings[slot][rcMoveRZ] = rz;
        RailCrossings[slot][rcIsClosed] = false;

        RailCrossings[slot][rcObject] = CreateDynamicObject(968, x, y, z, 0.0, 0.0, rz);

        new query[256];
        mysql_format(dbCon, query, sizeof(query), "INSERT INTO `rail_crossings` (`X`, `Y`, `Z`, `RX`, `RY`, `RZ`, `MoveRX`, `MoveRY`, `MoveRZ`) VALUES ('%f', '%f', '%f', '%f', '%f', '%f', '%f', '%f', '%f')",
            x, y, z, 0.0, 0.0, rz, 0.0, -90.0, rz);
        mysql_tquery(dbCon, query, "OnRailCrossingCreated", "d", slot);

        SendServerMessage(playerid, "Created Rail Crossing Barrier (ID %d) at your location.", slot);
        return 1;
    }
    else if(!strcmp(subcmd, "remove", true))
    {
        new id;
        if(sscanf(optionStr, "d", id))
            return SendSyntaxMessage(playerid, "/railcrossing remove [crossing_id]");

        if(id < 0 || id >= MAX_RAIL_CROSSINGS || RailCrossings[id][rcID] == 0)
            return SendErrorMessage(playerid, "Invalid Rail Crossing ID.");

        new query[128];
        mysql_format(dbCon, query, sizeof(query), "DELETE FROM `rail_crossings` WHERE `ID` = '%d'", RailCrossings[id][rcID]);
        mysql_tquery(dbCon, query);

        if(DestroyDynamicObject(RailCrossings[id][rcObject]))
            RailCrossings[id][rcObject] = 0;

        RailCrossings[id][rcID] = 0;
        SendServerMessage(playerid, "Rail Crossing ID %d deleted.", id);
        return 1;
    }

    return 1;
}

forward OnRailCrossingCreated(slot);
public OnRailCrossingCreated(slot)
{
    RailCrossings[slot][rcID] = cache_insert_id();
    return 1;
}

forward SetTrainCinematicCamera(playerid);
public SetTrainCinematicCamera(playerid)
{
    SetCameraBehindPlayer(playerid);
    return 1;
}
