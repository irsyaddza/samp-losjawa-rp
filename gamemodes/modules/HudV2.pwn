/*
 * HudV2.pwn — LJRP HUD V6.7 (open.mp)
 * Overwritten/Upgraded to HUD V6.7 using mdl-1410: assets
 * Position fixes and removed siren icons.
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
new Text:HV2_Logo = Text:INVALID_TEXT_DRAW;
new Text:HV2_Line = Text:INVALID_TEXT_DRAW;
new Text:HV2_Date = Text:INVALID_TEXT_DRAW;
new Text:HV2_Time = Text:INVALID_TEXT_DRAW;

/* ─────────────────────────── Per-Player TDs ─────────────────────── */
new PlayerText:HV2_WindShort  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_WindLong   [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Location   [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

/* Radio HUD */
new PlayerText:HV2_BaseRadio  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_RadioSlot  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_RadioChan  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

/* Vehicle HUD */
new PlayerText:HV2_BaseSpeed  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Speed      [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Mph        [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Miles      [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_FuelNorm   [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_FuelRed    [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_FuelPercent[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_LightsOff  [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_LightsOn   [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Lock       [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:HV2_Unlock     [MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};



/* ════════════════════════ CREATE / DESTROY ══════════════════════════ */

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
    TextDrawLetterSize(HV2_Line, 0.189, 4.999);
    TextDrawAlignment(HV2_Line, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(HV2_Line, -56);
    TextDrawSetShadow(HV2_Line, 1);
    TextDrawSetOutline(HV2_Line, 1);
    TextDrawBackgroundColour(HV2_Line, 150);
    TextDrawFont(HV2_Line, TEXT_DRAW_FONT_2);
    TextDrawSetProportional(HV2_Line, true);

    // ── Date ─────────────────────────────────────────────────────────
    HV2_Date = TextDrawCreate(181.000, 419.000, "01/02/2026");
    TextDrawLetterSize(HV2_Date, 0.170, 0.888);
    TextDrawAlignment(HV2_Date, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(HV2_Date, -56);
    TextDrawSetShadow(HV2_Date, 1);
    TextDrawSetOutline(HV2_Date, 1);
    TextDrawBackgroundColour(HV2_Date, 150);
    TextDrawFont(HV2_Date, TEXT_DRAW_FONT_3);
    TextDrawSetProportional(HV2_Date, true);

    // ── Time ─────────────────────────────────────────────────────────
    HV2_Time = TextDrawCreate(181.000, 410.000, "00:00:00");
    TextDrawLetterSize(HV2_Time, 0.170, 0.888);
    TextDrawAlignment(HV2_Time, TEXT_DRAW_ALIGN_LEFT);
    TextDrawColour(HV2_Time, -56);
    TextDrawSetShadow(HV2_Time, 1);
    TextDrawSetOutline(HV2_Time, 1);
    TextDrawBackgroundColour(HV2_Time, 150);
    TextDrawFont(HV2_Time, TEXT_DRAW_FONT_3);
    TextDrawSetProportional(HV2_Time, true);
}

DestroyHudV2GlobalTDs()
{
    if(HV2_Logo != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Logo);
    if(HV2_Line != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Line);
    if(HV2_Date != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Date);
    if(HV2_Time != Text:INVALID_TEXT_DRAW) TextDrawDestroy(HV2_Time);
}

CreateHudV2PlayerTDs(playerid)
{
    // ── Wind Direction (short) ────────────────────────────────────────
    HV2_WindShort[playerid] = CreatePlayerTextDraw(playerid, 147.000, 411.000, "SE");
    PlayerTextDrawLetterSize(playerid, HV2_WindShort[playerid], 0.289, 1.498);
    PlayerTextDrawAlignment(playerid, HV2_WindShort[playerid], TEXT_DRAW_ALIGN_CENTER);
    PlayerTextDrawColour(playerid, HV2_WindShort[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_WindShort[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_WindShort[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_WindShort[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_WindShort[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_WindShort[playerid], true);

    // ── Wind Direction (long) ─────────────────────────────────────────
    HV2_WindLong[playerid] = CreatePlayerTextDraw(playerid, 147.000, 428.000, "south east");
    PlayerTextDrawLetterSize(playerid, HV2_WindLong[playerid], 0.179, 0.898);
    PlayerTextDrawAlignment(playerid, HV2_WindLong[playerid], TEXT_DRAW_ALIGN_CENTER);
    PlayerTextDrawColour(playerid, HV2_WindLong[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_WindLong[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_WindLong[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_WindLong[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_WindLong[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_WindLong[playerid], true);

    // ── Location ──────────────────────────────────────────────────────
    HV2_Location[playerid] = CreatePlayerTextDraw(playerid, 181.000, 429.000, "Las Venturas");
    PlayerTextDrawLetterSize(playerid, HV2_Location[playerid], 0.170, 0.888);
    PlayerTextDrawAlignment(playerid, HV2_Location[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_Location[playerid], -56);
    PlayerTextDrawSetShadow(playerid, HV2_Location[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_Location[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_Location[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_Location[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_Location[playerid], true);

    // ── Radio Background ──────────────────────────────────────────────
    HV2_BaseRadio[playerid] = CreatePlayerTextDraw(playerid, 507.000, 100.000, "LD_SPAC:white");
    PlayerTextDrawTextSize(playerid, HV2_BaseRadio[playerid], 99.000, 34.000);
    PlayerTextDrawAlignment(playerid, HV2_BaseRadio[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_BaseRadio[playerid], 130);
    PlayerTextDrawSetShadow(playerid, HV2_BaseRadio[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_BaseRadio[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_BaseRadio[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_BaseRadio[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_BaseRadio[playerid], true);

    // ── Radio Slot ────────────────────────────────────────────────────
    HV2_RadioSlot[playerid] = CreatePlayerTextDraw(playerid, 511.000, 103.000, "Slot: 1");
    PlayerTextDrawLetterSize(playerid, HV2_RadioSlot[playerid], 0.300, 1.500);
    PlayerTextDrawAlignment(playerid, HV2_RadioSlot[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_RadioSlot[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_RadioSlot[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_RadioSlot[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_RadioSlot[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_RadioSlot[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_RadioSlot[playerid], true);

    // ── Radio Channel ─────────────────────────────────────────────────
    HV2_RadioChan[playerid] = CreatePlayerTextDraw(playerid, 511.000, 118.000, "Channel: 1045");
    PlayerTextDrawLetterSize(playerid, HV2_RadioChan[playerid], 0.300, 1.500);
    PlayerTextDrawAlignment(playerid, HV2_RadioChan[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_RadioChan[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_RadioChan[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_RadioChan[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_RadioChan[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_RadioChan[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_RadioChan[playerid], true);

    // ── Vehicle Speedo Background ─────────────────────────────────────
    HV2_BaseSpeed[playerid] = CreatePlayerTextDraw(playerid, 541.000, 349.000, "mdl-1410:base_speedo");
    PlayerTextDrawTextSize(playerid, HV2_BaseSpeed[playerid], 90.000, 98.000);
    PlayerTextDrawAlignment(playerid, HV2_BaseSpeed[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_BaseSpeed[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_BaseSpeed[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_BaseSpeed[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_BaseSpeed[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_BaseSpeed[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_BaseSpeed[playerid], true);

    // ── Speed Value ───────────────────────────────────────────────────
    HV2_Speed[playerid] = CreatePlayerTextDraw(playerid, 587.000, 370.000, "0");
    PlayerTextDrawLetterSize(playerid, HV2_Speed[playerid], 0.808, 2.798);
    PlayerTextDrawAlignment(playerid, HV2_Speed[playerid], TEXT_DRAW_ALIGN_CENTER);
    PlayerTextDrawColour(playerid, HV2_Speed[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_Speed[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_Speed[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_Speed[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_Speed[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_Speed[playerid], true);

    // ── MPH Unit Text ─────────────────────────────────────────────────
    HV2_Mph[playerid] = CreatePlayerTextDraw(playerid, 587.000, 394.000, "mph");
    PlayerTextDrawLetterSize(playerid, HV2_Mph[playerid], 0.270, 1.199);
    PlayerTextDrawAlignment(playerid, HV2_Mph[playerid], TEXT_DRAW_ALIGN_CENTER);
    PlayerTextDrawColour(playerid, HV2_Mph[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_Mph[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_Mph[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_Mph[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_Mph[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_Mph[playerid], true);

    // ── Mileage / Driven Miles ────────────────────────────────────────
    HV2_Miles[playerid] = CreatePlayerTextDraw(playerid, 587.000, 414.000, "0.0 miles");
    PlayerTextDrawLetterSize(playerid, HV2_Miles[playerid], 0.200, 0.898);
    PlayerTextDrawAlignment(playerid, HV2_Miles[playerid], TEXT_DRAW_ALIGN_CENTER);
    PlayerTextDrawColour(playerid, HV2_Miles[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_Miles[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_Miles[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_Miles[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_Miles[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_Miles[playerid], true);

    // ── Fuel Icon Normal ──────────────────────────────────────────────
    HV2_FuelNorm[playerid] = CreatePlayerTextDraw(playerid, 580.000, 417.000, "mdl-1410:bensin_norm");
    PlayerTextDrawTextSize(playerid, HV2_FuelNorm[playerid], 31.000, 37.000);
    PlayerTextDrawAlignment(playerid, HV2_FuelNorm[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_FuelNorm[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_FuelNorm[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_FuelNorm[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_FuelNorm[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_FuelNorm[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_FuelNorm[playerid], true);

    // ── Fuel Icon Red ─────────────────────────────────────────────────
    HV2_FuelRed[playerid] = CreatePlayerTextDraw(playerid, 580.000, 417.000, "mdl-1410:bensin_red");
    PlayerTextDrawTextSize(playerid, HV2_FuelRed[playerid], 31.000, 37.000);
    PlayerTextDrawAlignment(playerid, HV2_FuelRed[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_FuelRed[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_FuelRed[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_FuelRed[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_FuelRed[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_FuelRed[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_FuelRed[playerid], true);

    // ── Fuel Percent Text ─────────────────────────────────────────────
    HV2_FuelPercent[playerid] = CreatePlayerTextDraw(playerid, 588.000, 431.000, "99");
    PlayerTextDrawLetterSize(playerid, HV2_FuelPercent[playerid], 0.170, 0.898);
    PlayerTextDrawAlignment(playerid, HV2_FuelPercent[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_FuelPercent[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_FuelPercent[playerid], 1);
    PlayerTextDrawSetOutline(playerid, HV2_FuelPercent[playerid], 1);
    PlayerTextDrawBackgroundColour(playerid, HV2_FuelPercent[playerid], 150);
    PlayerTextDrawFont(playerid, HV2_FuelPercent[playerid], TEXT_DRAW_FONT_3);
    PlayerTextDrawSetProportional(playerid, HV2_FuelPercent[playerid], true);

    // ── Lights OFF Icon ───────────────────────────────────────────────
    HV2_LightsOff[playerid] = CreatePlayerTextDraw(playerid, 558.000, 413.000, "mdl-1410:lampu_off");
    PlayerTextDrawTextSize(playerid, HV2_LightsOff[playerid], 68.000, 71.000);
    PlayerTextDrawAlignment(playerid, HV2_LightsOff[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_LightsOff[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_LightsOff[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_LightsOff[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_LightsOff[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_LightsOff[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_LightsOff[playerid], true);

    // ── Lights ON Icon ────────────────────────────────────────────────
    HV2_LightsOn[playerid] = CreatePlayerTextDraw(playerid, 558.000, 413.000, "mdl-1410:lampu_on");
    PlayerTextDrawTextSize(playerid, HV2_LightsOn[playerid], 68.000, 71.000);
    PlayerTextDrawAlignment(playerid, HV2_LightsOn[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_LightsOn[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_LightsOn[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_LightsOn[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_LightsOn[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_LightsOn[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_LightsOn[playerid], true);

    // ── Lock Icon ─────────────────────────────────────────────────────
    HV2_Lock[playerid] = CreatePlayerTextDraw(playerid, 607.000, 431.000, "mdl-1410:lock");
    PlayerTextDrawTextSize(playerid, HV2_Lock[playerid], 7.000, 8.000);
    PlayerTextDrawAlignment(playerid, HV2_Lock[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_Lock[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_Lock[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_Lock[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_Lock[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_Lock[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_Lock[playerid], true);

    // ── Unlock Icon ───────────────────────────────────────────────────
    HV2_Unlock[playerid] = CreatePlayerTextDraw(playerid, 607.000, 431.000, "mdl-1410:unlock");
    PlayerTextDrawTextSize(playerid, HV2_Unlock[playerid], 7.000, 8.000);
    PlayerTextDrawAlignment(playerid, HV2_Unlock[playerid], TEXT_DRAW_ALIGN_LEFT);
    PlayerTextDrawColour(playerid, HV2_Unlock[playerid], -1);
    PlayerTextDrawSetShadow(playerid, HV2_Unlock[playerid], 0);
    PlayerTextDrawSetOutline(playerid, HV2_Unlock[playerid], 0);
    PlayerTextDrawBackgroundColour(playerid, HV2_Unlock[playerid], 255);
    PlayerTextDrawFont(playerid, HV2_Unlock[playerid], TEXT_DRAW_FONT_SPRITE_DRAW);
    PlayerTextDrawSetProportional(playerid, HV2_Unlock[playerid], true);
}

DestroyHudV2PlayerTDs(playerid)
{
    #define _DESTROY_P(%0) if(%0[playerid] != PlayerText:INVALID_TEXT_DRAW) { PlayerTextDrawDestroy(playerid, %0[playerid]); %0[playerid] = PlayerText:INVALID_TEXT_DRAW; }
    _DESTROY_P(HV2_WindShort)
    _DESTROY_P(HV2_WindLong)
    _DESTROY_P(HV2_Location)
    _DESTROY_P(HV2_BaseRadio)
    _DESTROY_P(HV2_RadioSlot)
    _DESTROY_P(HV2_RadioChan)
    _DESTROY_P(HV2_BaseSpeed)
    _DESTROY_P(HV2_Speed)
    _DESTROY_P(HV2_Mph)
    _DESTROY_P(HV2_Miles)
    _DESTROY_P(HV2_FuelNorm)
    _DESTROY_P(HV2_FuelRed)
    _DESTROY_P(HV2_FuelPercent)
    _DESTROY_P(HV2_LightsOff)
    _DESTROY_P(HV2_LightsOn)
    _DESTROY_P(HV2_Lock)
    _DESTROY_P(HV2_Unlock)
    #undef _DESTROY_P
}

/* ════════════════════════ SHOW / HIDE ══════════════════════════════ */

ShowHudV2Base(playerid)
{
    TextDrawShowForPlayer(playerid, HV2_Logo);
    TextDrawShowForPlayer(playerid, HV2_Line);
    TextDrawShowForPlayer(playerid, HV2_Date);
    TextDrawShowForPlayer(playerid, HV2_Time);
    if(HV2_WindShort[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_WindShort[playerid]);
    if(HV2_WindLong[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_WindLong[playerid]);
    if(HV2_Location[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_Location[playerid]);
    ShowHudV2Radio(playerid);
}

HideHudV2Base(playerid)
{
    TextDrawHideForPlayer(playerid, HV2_Logo);
    TextDrawHideForPlayer(playerid, HV2_Line);
    TextDrawHideForPlayer(playerid, HV2_Date);
    TextDrawHideForPlayer(playerid, HV2_Time);
    if(HV2_WindShort[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_WindShort[playerid]);
    if(HV2_WindLong[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_WindLong[playerid]);
    if(HV2_Location[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Location[playerid]);
    HideHudV2Radio(playerid);
}

ShowHudV2Radio(playerid)
{
    if(HV2_BaseRadio[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_BaseRadio[playerid]);
    if(HV2_RadioSlot[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_RadioSlot[playerid]);
    if(HV2_RadioChan[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_RadioChan[playerid]);
}

HideHudV2Radio(playerid)
{
    if(HV2_BaseRadio[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_BaseRadio[playerid]);
    if(HV2_RadioSlot[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_RadioSlot[playerid]);
    if(HV2_RadioChan[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_RadioChan[playerid]);
}

ShowHudV2Vehicle(playerid, vehicleid)
{
    if(HV2_BaseSpeed[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_BaseSpeed[playerid]);
    if(HV2_Speed[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_Speed[playerid]);
    if(HV2_Mph[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_Mph[playerid]);
    if(HV2_Miles[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_Miles[playerid]);
    if(HV2_FuelPercent[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_FuelPercent[playerid]);

    // Fuel State
    new Float:maxFuel = GetVehicleDataFuel(GetVehicleModel(vehicleid));
    new fuelPercent = (maxFuel > 0.0) ? floatround((CoreVehicles[vehicleid][vehFuel] / maxFuel) * 100.0) : 0;
    if(fuelPercent < 0) fuelPercent = 0;
    else if(fuelPercent > 100) fuelPercent = 100;

    if(fuelPercent <= 20)
    {
        if(HV2_FuelRed[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_FuelRed[playerid]);
        if(HV2_FuelNorm[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_FuelNorm[playerid]);
    }
    else
    {
        if(HV2_FuelNorm[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_FuelRed[playerid]);
        if(HV2_FuelNorm[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_FuelNorm[playerid]);
    }

    // Lights state
    new eng, lights, alarm, doors, bonnet, boot, objective;
    GetVehicleParamsEx(vehicleid, eng, lights, alarm, doors, bonnet, boot, objective);
    if(lights == 1)
    {
        if(HV2_LightsOn[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_LightsOn[playerid]);
        if(HV2_LightsOff[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_LightsOff[playerid]);
    }
    else
    {
        if(HV2_LightsOff[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_LightsOn[playerid]);
        if(HV2_LightsOff[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_LightsOff[playerid]);
    }

    // Lock state
    if(doors == 1)
    {
        if(HV2_Lock[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_Lock[playerid]);
        if(HV2_Unlock[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Unlock[playerid]);
    }
    else
    {
        if(HV2_Unlock[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Lock[playerid]);
        if(HV2_Unlock[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawShow(playerid, HV2_Unlock[playerid]);
    }
}

HideHudV2Vehicle(playerid)
{
    if(HV2_BaseSpeed[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_BaseSpeed[playerid]);
    if(HV2_Speed[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Speed[playerid]);
    if(HV2_Mph[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Mph[playerid]);
    if(HV2_Miles[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Miles[playerid]);
    if(HV2_FuelNorm[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_FuelNorm[playerid]);
    if(HV2_FuelRed[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_FuelRed[playerid]);
    if(HV2_FuelPercent[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_FuelPercent[playerid]);
    if(HV2_LightsOff[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_LightsOff[playerid]);
    if(HV2_LightsOn[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_LightsOn[playerid]);
    if(HV2_Lock[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Lock[playerid]);
    if(HV2_Unlock[playerid] != PlayerText:INVALID_TEXT_DRAW) PlayerTextDrawHide(playerid, HV2_Unlock[playerid]);
}

ShowHudV2Full(playerid)
{
    if(PlayerFlags[playerid][toggleHUD]) return;

    ShowHudV2Base(playerid);
    ShowHudV2Radio(playerid);

    new vehicleid = GetPlayerVehicleID(playerid);
    if(vehicleid) ShowHudV2Vehicle(playerid, vehicleid);
}

HideHudV2Full(playerid)
{
    HideHudV2Base(playerid);
    HideHudV2Radio(playerid);
    HideHudV2Vehicle(playerid);
}

/* ════════════════════════ UPDATE (called by timer) ═════════════════ */

UpdateHudV2Time()
{
    if(HV2_Time == Text:INVALID_TEXT_DRAW) return;

    new h, m, s;
    gettime(h, m, s);

    new timeStr[12], dateStr[14];
    new dispH = (ghour) % 24;
    format(timeStr, sizeof(timeStr), "%02d:%02d:%02d", dispH, m, s);
    TextDrawSetString(HV2_Time, timeStr);

    new year, month, day;
    getdate(year, month, day);
    format(dateStr, sizeof(dateStr), "%02d/%02d/%04d", day, month, year);
    TextDrawSetString(HV2_Date, dateStr);
}

UpdateHudV2Player(playerid, vehicleid)
{
    if(PlayerFlags[playerid][toggleHUD]) return;
    if(HV2_WindShort[playerid] == PlayerText:INVALID_TEXT_DRAW) return;

    // ── Wind Direction ─────────────────────────────────────────
    new Float:angle;
    if(vehicleid)
    {
        GetVehicleZAngle(vehicleid, angle);
    }
    else
    {
        GetPlayerFacingAngle(playerid, angle);
    }

    new Float:bearing = 360.0 - angle;
    if(bearing >= 360.0) bearing -= 360.0;
    if(bearing < 0.0) bearing += 360.0;

    new windS[16], windL[32];
    if     (bearing >= 337.5 || bearing <  22.5) format(windS, sizeof(windS), "N");
    else if(bearing >=  22.5 && bearing <  67.5) format(windS, sizeof(windS), "NE");
    else if(bearing >=  67.5 && bearing < 112.5) format(windS, sizeof(windS), "E");
    else if(bearing >= 112.5 && bearing < 157.5) format(windS, sizeof(windS), "SE");
    else if(bearing >= 157.5 && bearing < 202.5) format(windS, sizeof(windS), "S");
    else if(bearing >= 202.5 && bearing < 247.5) format(windS, sizeof(windS), "SW");
    else if(bearing >= 247.5 && bearing < 292.5) format(windS, sizeof(windS), "W");
    else                                         format(windS, sizeof(windS), "NW");

    if     (bearing >= 337.5 || bearing <  22.5) format(windL, sizeof(windL), "north");
    else if(bearing >=  22.5 && bearing <  67.5) format(windL, sizeof(windL), "north east");
    else if(bearing >=  67.5 && bearing < 112.5) format(windL, sizeof(windL), "east");
    else if(bearing >= 112.5 && bearing < 157.5) format(windL, sizeof(windL), "south east");
    else if(bearing >= 157.5 && bearing < 202.5) format(windL, sizeof(windL), "south");
    else if(bearing >= 202.5 && bearing < 247.5) format(windL, sizeof(windL), "south west");
    else if(bearing >= 247.5 && bearing < 292.5) format(windL, sizeof(windL), "west");
    else                                         format(windL, sizeof(windL), "north west");

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
    format(slotStr, sizeof(slotStr), "Slot: %d", slot);
    if(channel > 0)
        format(chanStr, sizeof(chanStr), "Channel: %d", channel);
    else
        chanStr = "Channel: --";

    PlayerTextDrawSetString(playerid, HV2_RadioSlot[playerid], slotStr);
    PlayerTextDrawSetString(playerid, HV2_RadioChan[playerid], chanStr);

    // ── Vehicle ────────────────────────────────────────────────
    if(vehicleid)
    {
        new vehModel = GetVehicleModel(vehicleid);
        if((vehModel == 538 || vehModel == 570) && GetPlayerState(playerid) == PLAYER_STATE_PASSENGER)
        {
            HideHudV2Vehicle(playerid);
            return;
        }
        else
        {
            PlayerTextDrawShow(playerid, HV2_BaseSpeed[playerid]);
            PlayerTextDrawShow(playerid, HV2_Mph[playerid]);

            new Float:mph = CoreVehicles[vehicleid][vSpeed] * 121.30;
            new speedVal = floatround(mph);
            new speedStr[32];

            if((vehModel == 538 || vehModel == 537) && PlayerOnTrainJob[playerid])
            {
                new Float:limit = PlayerTrainSpeedLimit[playerid];
                if(float(speedVal) > limit)
                {
                    format(speedStr, sizeof(speedStr), "~r~%d", speedVal);

                    PlayerOverspeedWarns[playerid]++;
                    if(PlayerOverspeedWarns[playerid] % 3 == 0)
                    {
                        PlayerTotalFines[playerid] += 50;
                        AddSalaryHistory(playerid, -50, "Train Overspeed Fine");
                        SendClientMessageEx(playerid, COLOR_LIGHTRED, "[RAILROAD PENALTY]: Overspeeding (%d / %.0f MPH)! Recorded Fine: -$50 (will be deducted on paycheck).", speedVal, limit);
                    }
                }
                else
                {
                    format(speedStr, sizeof(speedStr), "%d", speedVal);
                }
            }
            else
            {
                format(speedStr, sizeof(speedStr), "%d", speedVal);
            }

            PlayerTextDrawSetString(playerid, HV2_Speed[playerid], speedStr);
            PlayerTextDrawShow(playerid, HV2_Speed[playerid]);

            // Mileage
            new carid = CoreVehicles[vehicleid][vehicleCarID];
            new milesStr[32];
            if(carid != -1)
                format(milesStr, sizeof(milesStr), "%.1f miles", CarData[carid][carMileage]);
            else
                format(milesStr, sizeof(milesStr), "0.0 miles");
            PlayerTextDrawSetString(playerid, HV2_Miles[playerid], milesStr);
            PlayerTextDrawShow(playerid, HV2_Miles[playerid]);

            // Fuel
            new Float:maxFuel = GetVehicleDataFuel(vehModel);
            new fuelPercent = (maxFuel > 0.0) ? floatround((CoreVehicles[vehicleid][vehFuel] / maxFuel) * 100.0) : 0;
            if(fuelPercent < 0) fuelPercent = 0;
            else if(fuelPercent > 100) fuelPercent = 100;

            new fuelStr[16];
            format(fuelStr, sizeof(fuelStr), "%d", fuelPercent);
            PlayerTextDrawSetString(playerid, HV2_FuelPercent[playerid], fuelStr);
            PlayerTextDrawShow(playerid, HV2_FuelPercent[playerid]);

            if(fuelPercent <= 20)
            {
                PlayerTextDrawShow(playerid, HV2_FuelRed[playerid]);
                PlayerTextDrawHide(playerid, HV2_FuelNorm[playerid]);
            }
            else
            {
                PlayerTextDrawHide(playerid, HV2_FuelRed[playerid]);
                PlayerTextDrawShow(playerid, HV2_FuelNorm[playerid]);
            }

            // Lights
            new eng, lights, alarm, doors, bonnet, boot, objective;
            GetVehicleParamsEx(vehicleid, eng, lights, alarm, doors, bonnet, boot, objective);
            if(lights == 1)
            {
                PlayerTextDrawShow(playerid, HV2_LightsOn[playerid]);
                PlayerTextDrawHide(playerid, HV2_LightsOff[playerid]);
            }
            else
            {
                PlayerTextDrawHide(playerid, HV2_LightsOn[playerid]);
                PlayerTextDrawShow(playerid, HV2_LightsOff[playerid]);
            }

            // Lock
            if(doors == 1)
            {
                PlayerTextDrawShow(playerid, HV2_Lock[playerid]);
                PlayerTextDrawHide(playerid, HV2_Unlock[playerid]);
            }
            else
            {
                PlayerTextDrawHide(playerid, HV2_Lock[playerid]);
                PlayerTextDrawShow(playerid, HV2_Unlock[playerid]);
            }
        }
    }
    else
    {
        HideHudV2Vehicle(playerid);
    }
}
