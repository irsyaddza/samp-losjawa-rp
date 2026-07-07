/*
 * HudV2.pwn — LJRP HUD V2 (open.mp)
 *
 * Layout:
 *   [GLOBAL] Server logo, separator line, date, time
 *   [PLAYER] Wind direction (short + long), location name
 *   [VEHICLE] Background sprite, ignition on/off, lock/unlock, speed (MPH)
 *   [RADIO]   Background sprite, channel name, slot
 *
 * Toggle: /toghud (uses PlayerFlags[playerid][toggleHUD])
 */

#if !defined TEXT_DRAW_ALIGN_LEFT
    #define TEXT_DRAW_ALIGN_LEFT 1
#endif
#if !defined TEXT_DRAW_ALIGN_CENTER
    #define TEXT_DRAW_ALIGN_CENTER 2
#endif
#if !defined TEXT_DRAW_ALIGN_RIGHT
    #define TEXT_DRAW_ALIGN_RIGHT 3
#endif

#if !defined TEXT_DRAW_FONT_2
    #define TEXT_DRAW_FONT_2 2
#endif
#if !defined TEXT_DRAW_FONT_3
    #define TEXT_DRAW_FONT_3 3
#endif
#if !defined TEXT_DRAW_FONT_SPRITE_DRAW
    #define TEXT_DRAW_FONT_SPRITE_DRAW 4
#endif

#define TextDrawColour TextDrawColor
#define TextDrawBackgroundColour TextDrawBackgroundColor
#define PlayerTextDrawColour PlayerTextDrawColor
#define PlayerTextDrawBackgroundColour PlayerTextDrawBackgroundColor

/* ─────────────────────────── Global TDs ─────────────────────────── */
new Text:HV2_Logo;
new Text:HV2_Line;
new Text:HV2_Date;
new Text:HV2_Time;

/* ─────────────────────────── Per-Player TDs ─────────────────────── */
new PlayerText:HV2_WindShort  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_WindLong   [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Location   [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

/* Vehicle HUD */
new PlayerText:HV2_BaseSpeed  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_IgnOn      [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_IgnOff     [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_LockCar    [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_UnlockCar  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Speed      [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

/* Radio HUD */
new PlayerText:HV2_BaseRadio  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_RadioChan  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_RadioSlot  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

/* ─────────────────────── Helper: Wind Direction ─────────────────── */
GetWindShort(Float:angle, dest[], size)
{
    if     (angle >= 337.5 || angle <  22.5)  strcat(dest, "N",  size);
    else if(angle >=  22.5 && angle <  67.5)  strcat(dest, "NE", size);
    else if(angle >=  67.5 && angle < 112.5)  strcat(dest, "E",  size);
    else if(angle >= 112.5 && angle < 157.5)  strcat(dest, "SE", size);
    else if(angle >= 157.5 && angle < 202.5)  strcat(dest, "S",  size);
    else if(angle >= 202.5 && angle < 247.5)  strcat(dest, "SW", size);
    else if(angle >= 247.5 && angle < 292.5)  strcat(dest, "W",  size);
    else                                       strcat(dest, "NW", size);
}

GetWindLong(Float:angle, dest[], size)
{
    if     (angle >= 337.5 || angle <  22.5)  strcat(dest, "north",      size);
    else if(angle >=  22.5 && angle <  67.5)  strcat(dest, "north east", size);
    else if(angle >=  67.5 && angle < 112.5)  strcat(dest, "east",       size);
    else if(angle >= 112.5 && angle < 157.5)  strcat(dest, "south east", size);
    else if(angle >= 157.5 && angle < 202.5)  strcat(dest, "south",      size);
    else if(angle >= 202.5 && angle < 247.5)  strcat(dest, "south west", size);
    else if(angle >= 247.5 && angle < 292.5)  strcat(dest, "west",       size);
    else                                       strcat(dest, "north west", size);
}

/* ════════════════════════ CREATE / DESTROY ══════════════════════════ */

/* Called once in OnGameModeInit */
CreateHudV2GlobalTDs()
{
    // ── Server Logo ───────────────────────────────────────────────────
    HV2_Logo = TextDrawCreate(265.000, 4.000, "mdl-1410:logo");
    TextDrawTextSize(HV2_Logo, 95.000, 36.000);
    TextDrawAlignment(HV2_Logo, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(HV2_Logo, -1);
    TextDrawSetShadow(HV2_Logo, 0);
    TextDrawSetOutline(HV2_Logo, 0);
    TextDrawBackgroundColour(HV2_Logo, 255);
    TextDrawFont(HV2_Logo, TEXT_DRAW_FONT_SPRITE_DRAW);
    TextDrawSetProportional(HV2_Logo, true);

    // ── Separator Line ────────────────────────────────────────────────
    HV2_Line = TextDrawCreate(173.000, 398.000, "I");
    TextDrawLetterSize(HV2_Line, 0.190, 4.999);
    TextDrawAlignment(HV2_Line, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(HV2_Line, -56);
    TextDrawSetShadow(HV2_Line, 1);
    TextDrawSetOutline(HV2_Line, 1);
    TextDrawBackgroundColour(HV2_Line, 150);
    TextDrawFont(HV2_Line, TEXT_DRAW_FONT_2);
    TextDrawSetProportional(HV2_Line, true);

    // ── Date ─────────────────────────────────────────────────────────
    HV2_Date = TextDrawCreate(181.000, 419.000, "01/01/2025");
    TextDrawLetterSize(HV2_Date, 0.170, 0.889);
    TextDrawAlignment(HV2_Date, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(HV2_Date, -56);
    TextDrawSetShadow(HV2_Date, 1);
    TextDrawSetOutline(HV2_Date, 1);
    TextDrawBackgroundColour(HV2_Date, 150);
    TextDrawFont(HV2_Date, TEXT_DRAW_FONT_3);
    TextDrawSetProportional(HV2_Date, true);

    // ── Time ─────────────────────────────────────────────────────────
    HV2_Time = TextDrawCreate(181.000, 410.000, "00:00:00");
    TextDrawLetterSize(HV2_Time, 0.170, 0.889);
    TextDrawAlignment(HV2_Time, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(HV2_Time, -56);
    TextDrawSetShadow(HV2_Time, 1);
    TextDrawSetOutline(HV2_Time, 1);
    TextDrawBackgroundColour(HV2_Time, 150);
    TextDrawFont(HV2_Time, TEXT_DRAW_FONT_3);
    TextDrawSetProportional(HV2_Time, true);
}

/* Called once in OnGameModeExit */
DestroyHudV2GlobalTDs()
{
    if(HV2_Logo != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Logo);
    if(HV2_Line != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Line);
    if(HV2_Date != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Date);
    if(HV2_Time != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Time);
}

/* Called per player on character spawn */
CreateHudV2PlayerTDs(playerid)
{
    // ── Wind Direction (short) ────────────────────────────────────────
    HV2_WindShort[playerid] = CreatePlayerTextDraw(playerid, 147.000, 411.000, "N");
    PlayerTextDrawLetterSize(playerid, HV2_WindShort[playerid], 0.289, 1.499);
    PlayerTextDrawAlignment(playerid, HV2_WindShort[playerid], TEXT_DRAW_ALIGN_CENTER);
    PlayerTextDrawColour(playerid, HV2_WindShort[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_WindShort[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_WindShort[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_WindShort[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_WindShort[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_WindShort[playerid], true);

    // ── Wind Direction (long) ─────────────────────────────────────────
    HV2_WindLong[playerid] = CreatePlayerTextDraw(playerid, 147.000, 428.000, "north");
    PlayerTextDrawLetterSize(playerid, HV2_WindLong[playerid], 0.179, 0.898);
    PlayerTextDrawAlignment(playerid, HV2_WindLong[playerid], TEXT_DRAW_ALIGN_CENTER);
    PlayerTextDrawColour(playerid, HV2_WindLong[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_WindLong[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_WindLong[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_WindLong[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_WindLong[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_WindLong[playerid], true);

    // ── Location ──────────────────────────────────────────────────────
    HV2_Location[playerid] = CreatePlayerTextDraw(playerid, 181.000, 429.000, "Los Santos");
    PlayerTextDrawLetterSize(playerid, HV2_Location[playerid], 0.170, 0.889);
    PlayerTextDrawAlignment(playerid, HV2_Location[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_Location[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_Location[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_Location[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_Location[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_Location[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_Location[playerid], true);

    // ── Vehicle Speedo Background ─────────────────────────────────────
    HV2_BaseSpeed[playerid] = CreatePlayerTextDraw(playerid, 539.000, 411.000, "LD_SPAC:white");
    PlayerTextDrawTextSize(playerid, HV2_BaseSpeed[playerid], 84.000, 26.000);
    PlayerTextDrawAlignment(playerid, HV2_BaseSpeed[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_BaseSpeed[playerid], 120);
    PlayerTextDrawSetShadow(playerid, HV2_BaseSpeed[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_BaseSpeed[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_BaseSpeed[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_BaseSpeed[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_BaseSpeed[playerid], true);

    // ── Ignition ON ───────────────────────────────────────────────────
    HV2_IgnOn[playerid] = CreatePlayerTextDraw(playerid, 542.000, 413.000, "mdl-1410:ignition_on");
    PlayerTextDrawTextSize(playerid, HV2_IgnOn[playerid], 22.000, 21.000);
    PlayerTextDrawAlignment(playerid, HV2_IgnOn[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_IgnOn[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_IgnOn[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_IgnOn[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_IgnOn[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_IgnOn[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_IgnOn[playerid], true);

    // ── Ignition OFF ──────────────────────────────────────────────────
    HV2_IgnOff[playerid] = CreatePlayerTextDraw(playerid, 542.000, 413.000, "mdl-1410:ignition_off");
    PlayerTextDrawTextSize(playerid, HV2_IgnOff[playerid], 22.000, 21.000);
    PlayerTextDrawAlignment(playerid, HV2_IgnOff[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_IgnOff[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_IgnOff[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_IgnOff[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_IgnOff[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_IgnOff[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_IgnOff[playerid], true);

    // ── Lock ──────────────────────────────────────────────────────────
    HV2_LockCar[playerid] = CreatePlayerTextDraw(playerid, 567.000, 415.000, "mdl-1410:lock");
    PlayerTextDrawTextSize(playerid, HV2_LockCar[playerid], 15.000, 17.000);
    PlayerTextDrawAlignment(playerid, HV2_LockCar[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_LockCar[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_LockCar[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_LockCar[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_LockCar[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_LockCar[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_LockCar[playerid], true);

    // ── Unlock ────────────────────────────────────────────────────────
    HV2_UnlockCar[playerid] = CreatePlayerTextDraw(playerid, 567.000, 415.000, "mdl-1410:unlock");
    PlayerTextDrawTextSize(playerid, HV2_UnlockCar[playerid], 15.000, 17.000);
    PlayerTextDrawAlignment(playerid, HV2_UnlockCar[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_UnlockCar[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_UnlockCar[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_UnlockCar[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_UnlockCar[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_UnlockCar[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_UnlockCar[playerid], true);

    // ── Speed ─────────────────────────────────────────────────────────
    HV2_Speed[playerid] = CreatePlayerTextDraw(playerid, 620.000, 422.000, "0 MPH");
    PlayerTextDrawLetterSize(playerid, HV2_Speed[playerid], 0.230, 1.099);
    PlayerTextDrawAlignment(playerid, HV2_Speed[playerid], TEXT_DRAW_ALIGN_RIGHT);
    PlayerTextDrawColour(playerid, HV2_Speed[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_Speed[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_Speed[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_Speed[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_Speed[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_Speed[playerid], true);

    // ── Radio Background ──────────────────────────────────────────────
    HV2_BaseRadio[playerid] = CreatePlayerTextDraw(playerid, 539.000, 377.000, "LD_SPAC:white");
    PlayerTextDrawTextSize(playerid, HV2_BaseRadio[playerid], 84.000, 26.000);
    PlayerTextDrawAlignment(playerid, HV2_BaseRadio[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_BaseRadio[playerid], 120);
    PlayerTextDrawSetShadow(playerid, HV2_BaseRadio[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_BaseRadio[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_BaseRadio[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_BaseRadio[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_BaseRadio[playerid], true);

    // ── Radio Channel ─────────────────────────────────────────────────
    HV2_RadioChan[playerid] = CreatePlayerTextDraw(playerid, 543.000, 381.000, "Radio: --");
    PlayerTextDrawLetterSize(playerid, HV2_RadioChan[playerid], 0.200, 0.899);
    PlayerTextDrawAlignment(playerid, HV2_RadioChan[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_RadioChan[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_RadioChan[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_RadioChan[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_RadioChan[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_RadioChan[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_RadioChan[playerid], true);

    // ── Radio Slot ────────────────────────────────────────────────────
    HV2_RadioSlot[playerid] = CreatePlayerTextDraw(playerid, 543.000, 391.000, "Slot: -");
    PlayerTextDrawLetterSize(playerid, HV2_RadioSlot[playerid], 0.200, 0.899);
    PlayerTextDrawAlignment(playerid, HV2_RadioSlot[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_RadioSlot[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_RadioSlot[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_RadioSlot[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_RadioSlot[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_RadioSlot[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_RadioSlot[playerid], true);
}

/* Called in OnPlayerDisconnect */
DestroyHudV2PlayerTDs(playerid)
{
    #define _DESTROY_P(%0) if(%0[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, %0[playerid]); %0[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    _DESTROY_P(HV2_WindShort)
    _DESTROY_P(HV2_WindLong)
    _DESTROY_P(HV2_Location)
    _DESTROY_P(HV2_BaseSpeed)
    _DESTROY_P(HV2_IgnOn)
    _DESTROY_P(HV2_IgnOff)
    _DESTROY_P(HV2_LockCar)
    _DESTROY_P(HV2_UnlockCar)
    _DESTROY_P(HV2_Speed)
    _DESTROY_P(HV2_BaseRadio)
    _DESTROY_P(HV2_RadioChan)
    _DESTROY_P(HV2_RadioSlot)
    #undef _DESTROY_P
}

/* ════════════════════════ SHOW / HIDE ══════════════════════════════ */

/* Show the base (always-on) HUD for a player */
ShowHudV2Base(playerid)
{
    TextDrawShowForPlayer(playerid, HV2_Logo);
    TextDrawShowForPlayer(playerid, HV2_Line);
    TextDrawShowForPlayer(playerid, HV2_Date);
    TextDrawShowForPlayer(playerid, HV2_Time);
    PlayerTextDrawShow(playerid, HV2_WindShort[playerid]);
    PlayerTextDrawShow(playerid, HV2_WindLong[playerid]);
    PlayerTextDrawShow(playerid, HV2_Location[playerid]);
}

/* Hide the base HUD */
HideHudV2Base(playerid)
{
    TextDrawHideForPlayer(playerid, HV2_Logo);
    TextDrawHideForPlayer(playerid, HV2_Line);
    TextDrawHideForPlayer(playerid, HV2_Date);
    TextDrawHideForPlayer(playerid, HV2_Time);
    PlayerTextDrawHide(playerid, HV2_WindShort[playerid]);
    PlayerTextDrawHide(playerid, HV2_WindLong[playerid]);
    PlayerTextDrawHide(playerid, HV2_Location[playerid]);
}

/* Show radio HUD */
ShowHudV2Radio(playerid)
{
    PlayerTextDrawShow(playerid, HV2_BaseRadio[playerid]);
    PlayerTextDrawShow(playerid, HV2_RadioChan[playerid]);
    PlayerTextDrawShow(playerid, HV2_RadioSlot[playerid]);
}

/* Hide radio HUD */
HideHudV2Radio(playerid)
{
    PlayerTextDrawHide(playerid, HV2_BaseRadio[playerid]);
    PlayerTextDrawHide(playerid, HV2_RadioChan[playerid]);
    PlayerTextDrawHide(playerid, HV2_RadioSlot[playerid]);
}

/* Show vehicle HUD (ignition + lock + speed) */
ShowHudV2Vehicle(playerid, vehicleid)
{
    PlayerTextDrawShow(playerid, HV2_BaseSpeed[playerid]);
    PlayerTextDrawShow(playerid, HV2_Speed[playerid]);

    // Ignition state
    if(CoreVehicles[vehicleid][vHasEngine])
    {
        PlayerTextDrawShow(playerid, HV2_IgnOn[playerid]);
        PlayerTextDrawHide(playerid, HV2_IgnOff[playerid]);
    }
    else
    {
        PlayerTextDrawHide(playerid, HV2_IgnOn[playerid]);
        PlayerTextDrawShow(playerid, HV2_IgnOff[playerid]);
    }

    // Lock state
    new eng, lights, alarm, doors, bonnet, boot, objective;
    GetVehicleParamsEx(vehicleid, eng, lights, alarm, doors, bonnet, boot, objective);
    if(doors == 1)
    {
        PlayerTextDrawShow(playerid, HV2_LockCar[playerid]);
        PlayerTextDrawHide(playerid, HV2_UnlockCar[playerid]);
    }
    else
    {
        PlayerTextDrawHide(playerid, HV2_LockCar[playerid]);
        PlayerTextDrawShow(playerid, HV2_UnlockCar[playerid]);
    }
}

/* Hide vehicle HUD */
HideHudV2Vehicle(playerid)
{
    PlayerTextDrawHide(playerid, HV2_BaseSpeed[playerid]);
    PlayerTextDrawHide(playerid, HV2_IgnOn[playerid]);
    PlayerTextDrawHide(playerid, HV2_IgnOff[playerid]);
    PlayerTextDrawHide(playerid, HV2_LockCar[playerid]);
    PlayerTextDrawHide(playerid, HV2_UnlockCar[playerid]);
    PlayerTextDrawHide(playerid, HV2_Speed[playerid]);
}

/* Full show – called after CreateHudV2PlayerTDs or /toghud on */
ShowHudV2Full(playerid)
{
    if(PlayerFlags[playerid][toggleHUD]) return;

    ShowHudV2Base(playerid);
    ShowHudV2Radio(playerid);

    new vehicleid = GetPlayerVehicleID(playerid);
    if(vehicleid) ShowHudV2Vehicle(playerid, vehicleid);
}

/* Full hide – called by /toghud off */
HideHudV2Full(playerid)
{
    HideHudV2Base(playerid);
    HideHudV2Radio(playerid);
    HideHudV2Vehicle(playerid);
}

/* ════════════════════════ UPDATE (called by timer) ═════════════════ */

/* Update global date/time strings — called from the 1-second world timer */
UpdateHudV2Time()
{
    if(HV2_Time == Text:INVALID_TEXT_DRAW) return;

    new h, m, s;
    gettime(h, m, s);

    new timeStr[12], dateStr[14];

    // Time: use server-shifted game hour if desired; here we use real time
    // ghour is the server-side game hour shift (available globally in roleplay.pwn)
    new dispH = (ghour) % 24;
    format(timeStr, sizeof(timeStr), "%02d:%02d:%02d", dispH, m, s);
    TextDrawSetString(HV2_Time, timeStr);

    // Date: use real-world date
    new year, month, day;
    getdate(year, month, day);
    format(dateStr, sizeof(dateStr), "%02d/%02d/%04d", day, month, year);
    TextDrawSetString(HV2_Date, dateStr);
}

/* Update per-player dynamic data (wind direction, location, radio, vehicle) */
UpdateHudV2Player(playerid, vehicleid)
{
    if(PlayerFlags[playerid][toggleHUD]) return;
    if(HV2_WindShort[playerid] == PlayerText:INVALID_TEXT_DRAW) return;

    // ── Wind Direction ─────────────────────────────────────────
    new Float:angle;
    GetPlayerFacingAngle(playerid, angle);
    // Convert from SA-MP facing angle (0=North, 90=West) to compass bearing
    // SA-MP: 0 = facing north, increases clockwise; textdraw needs standard bearing
    new Float:bearing = 360.0 - angle;
    if(bearing >= 360.0) bearing -= 360.0;
    if(bearing < 0.0) bearing += 360.0;

    new windS[4], windL[24];
    GetWindShort(bearing, windS, sizeof(windS));
    GetWindLong(bearing, windL, sizeof(windL));
    PlayerTextDrawSetString(playerid, HV2_WindShort[playerid], windS);
    PlayerTextDrawSetString(playerid, HV2_WindLong[playerid],  windL);

    // ── Location ───────────────────────────────────────────────
    new MapZone:zone = GetPlayerMapZone(playerid);
    new zoneName[MAX_MAP_ZONE_NAME];
    GetMapZoneName(zone, zoneName);
    PlayerTextDrawSetString(playerid, HV2_Location[playerid], zoneName);

    // ── Radio ──────────────────────────────────────────────────
    new slot = PlayerData[playerid][pMainSlot];
    new channel = (slot >= 1) ? PlayerData[playerid][pRadioChan][slot] : 0;
    if(channel == -1) { slot = 0; channel = 0; }

    new chanStr[32], slotStr[16];
    if(channel > 0)
        format(chanStr, sizeof(chanStr), "Radio: %d", channel);
    else
        chanStr = "Radio: --";
    format(slotStr, sizeof(slotStr), "Slot: %d", slot);

    PlayerTextDrawSetString(playerid, HV2_RadioChan[playerid], chanStr);
    PlayerTextDrawSetString(playerid, HV2_RadioSlot[playerid],  slotStr);

    // ── Vehicle ────────────────────────────────────────────────
    if(vehicleid)
    {
        new Float:mph = CoreVehicles[vehicleid][vSpeed] * 121.30;
        new speedStr[16];
        format(speedStr, sizeof(speedStr), "%d MPH", floatround(mph));
        PlayerTextDrawSetString(playerid, HV2_Speed[playerid], speedStr);

        // Ignition toggle
        if(CoreVehicles[vehicleid][vHasEngine])
        {
            PlayerTextDrawShow(playerid, HV2_IgnOn[playerid]);
            PlayerTextDrawHide(playerid, HV2_IgnOff[playerid]);
        }
        else
        {
            PlayerTextDrawHide(playerid, HV2_IgnOn[playerid]);
            PlayerTextDrawShow(playerid, HV2_IgnOff[playerid]);
        }

        // Lock toggle
        new eng, lights, alarm, doors, bonnet, boot, objective;
        GetVehicleParamsEx(vehicleid, eng, lights, alarm, doors, bonnet, boot, objective);
        if(doors == 1)
        {
            PlayerTextDrawShow(playerid, HV2_LockCar[playerid]);
            PlayerTextDrawHide(playerid, HV2_UnlockCar[playerid]);
        }
        else
        {
            PlayerTextDrawHide(playerid, HV2_LockCar[playerid]);
            PlayerTextDrawShow(playerid, HV2_UnlockCar[playerid]);
        }
    }
}
