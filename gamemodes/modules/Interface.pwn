/*
 * Interface.pwn — Legacy stubs
 * All HUD logic has been moved to HudV2.pwn
 */

// Legacy stub: kept so existing call-sites compile without changes.
// New HUD is driven by UpdateHudV2Player() / UpdateHudV2Time() in HudV2.pwn.
TextHud_Update(playerid, vehicleid = 0)
{
    UpdateHudV2Player(playerid, vehicleid);
    return true;
}

ToggleHudTextdraw(playerid, bool:status)
{
    HudStatus{playerid} = status;
    if(status)
        ShowHudV2Full(playerid);
    else
        HideHudV2Full(playerid);
    return true;
}

// Legacy stub — new HUD is created via CreateHudV2PlayerTDs()
CreatePlayerHUD(playerid)
{
    CreateHudV2PlayerTDs(playerid);
    HUD_Created{playerid} = true;
}
