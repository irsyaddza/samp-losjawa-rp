#include <YSI_Coding\y_hooks>

#include "modules/system/SkinTestData.pwn"

// Player skin test states
new bool:TestingSkin[MAX_PLAYERS];
new TestingSkinIndex[MAX_PLAYERS];
new Float:SkinTestOldPos[MAX_PLAYERS][3];
new SkinTestOldWorld[MAX_PLAYERS];
new SkinTestOldInterior[MAX_PLAYERS];
new SkinTestOldSkin[MAX_PLAYERS];

// Player TextDraw handles
new PlayerText:TD_SkinTestBG[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:TD_SkinTestTitle[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:TD_SkinTestInfo[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:TD_SkinTestHelp[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

forward UpdatePlayerSkinTest(playerid);
forward SkinTest_CreateUI(playerid);
forward SkinTest_Show(playerid);
forward SkinTest_Destroy(playerid);

// Admin Command: /skintest
CMD:skintest(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 1337)
    {
        return SendErrorMessage(playerid, "You must be Admin Level 1337 to use this command.");
    }

    new option[24];
    if(sscanf(params, "s[24]", option))
    {
        return SendSyntaxMessage(playerid, "/skintest [start/stop]");
    }

    if(!strcmp(option, "start", true))
    {
        if(TestingSkin[playerid])
        {
            return SendErrorMessage(playerid, "You are already in skin test mode.");
        }

        // Save current state
        GetPlayerPos(playerid, SkinTestOldPos[playerid][0], SkinTestOldPos[playerid][1], SkinTestOldPos[playerid][2]);
        SkinTestOldWorld[playerid] = GetPlayerVirtualWorld(playerid);
        SkinTestOldInterior[playerid] = GetPlayerInterior(playerid);
        SkinTestOldSkin[playerid] = GetPlayerSkin(playerid);

        // Put player in test zone (LS Airport runway - empty world 33)
        SetPlayerVirtualWorld(playerid, 33);
        SetPlayerInterior(playerid, 0);
        SetPlayerPos(playerid, 1680.0, -2240.0, 13.5);
        SetPlayerFacingAngle(playerid, 180.0);

        // Freeze player
        TogglePlayerControllable(playerid, false);

        // Set camera angle facing the player
        SetPlayerCameraPos(playerid, 1680.0, -2244.0, 14.2);
        SetPlayerCameraLookAt(playerid, 1680.0, -2240.0, 14.0);

        // Initialize first skin
        TestingSkin[playerid] = true;
        TestingSkinIndex[playerid] = 0;
        SetPlayerSkin(playerid, CustomSkinsData[0][cSkinID]);

        // Create and show TextDraw UI
        SkinTest_CreateUI(playerid);
        UpdatePlayerSkinTest(playerid);
        SkinTest_Show(playerid);

        SendClientMessage(playerid, COLOR_GREEN, "[SKIN TEST]: Started skin testing session in World 33. Press [Y] for next skin, [N] for previous skin.");
        return 1;
    }
    else if(!strcmp(option, "stop", true))
    {
        if(!TestingSkin[playerid])
        {
            return SendErrorMessage(playerid, "You are not in skin test mode.");
        }

        // Destroy UI
        SkinTest_Destroy(playerid);

        // Restore original state
        SetPlayerVirtualWorld(playerid, SkinTestOldWorld[playerid]);
        SetPlayerInterior(playerid, SkinTestOldInterior[playerid]);
        SetPlayerPos(playerid, SkinTestOldPos[playerid][0], SkinTestOldPos[playerid][1], SkinTestOldPos[playerid][2]);
        SetPlayerSkin(playerid, SkinTestOldSkin[playerid]);

        // Unfreeze
        TogglePlayerControllable(playerid, true);
        SetCameraBehindPlayer(playerid);

        TestingSkin[playerid] = false;

        SendClientMessage(playerid, COLOR_GREEN, "[SKIN TEST]: Ended skin testing session. Restored to your original position.");
        return 1;
    }
    else
    {
        return SendSyntaxMessage(playerid, "/skintest [start/stop]");
    }
}

// Update Player Skin & UI
public UpdatePlayerSkinTest(playerid)
{
    if(!TestingSkin[playerid]) return 0;

    new idx = TestingSkinIndex[playerid];
    
    // Set custom skin ID
    SetPlayerSkin(playerid, CustomSkinsData[idx][cSkinID]);

    // Format UI text
    new str[128];
    format(str, sizeof(str), "%d/%d~n~ID: %d~n~Model: %s", idx + 1, sizeof(CustomSkinsData), CustomSkinsData[idx][cSkinID], CustomSkinsData[idx][cSkinName]);
    PlayerTextDrawSetString(playerid, TD_SkinTestInfo[playerid], str);
    return 1;
}

// Create Player UI
public SkinTest_CreateUI(playerid)
{
    // Background Box (using textdraw box)
    TD_SkinTestBG[playerid] = CreatePlayerTextDraw(playerid, 20.0, 180.0, "_");
    PlayerTextDrawLetterSize(playerid, TD_SkinTestBG[playerid], 0.0, 11.5); // height (approx 103 pixels)
    PlayerTextDrawTextSize(playerid, TD_SkinTestBG[playerid], 180.0, 0.0); // right edge (X: 180.0, width: 160 pixels)
    PlayerTextDrawAlignment(playerid, TD_SkinTestBG[playerid], 1);
    PlayerTextDrawColor(playerid, TD_SkinTestBG[playerid], -1);
    PlayerTextDrawUseBox(playerid, TD_SkinTestBG[playerid], 1);
    PlayerTextDrawBoxColor(playerid, TD_SkinTestBG[playerid], 0x000000AA); // dark semi-transparent black
    PlayerTextDrawSetShadow(playerid, TD_SkinTestBG[playerid], 0);
    PlayerTextDrawSetOutline(playerid, TD_SkinTestBG[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, TD_SkinTestBG[playerid], 255);
    PlayerTextDrawFont(playerid, TD_SkinTestBG[playerid], 1);

    // Title
    TD_SkinTestTitle[playerid] = CreatePlayerTextDraw(playerid, 100.0, 185.0, "SKIN TESTER");
    PlayerTextDrawLetterSize(playerid, TD_SkinTestTitle[playerid], 0.35, 1.4);
    PlayerTextDrawAlignment(playerid, TD_SkinTestTitle[playerid], 2); // Center alignment (at X: 100.0)
    PlayerTextDrawColor(playerid, TD_SkinTestTitle[playerid], 0xFFFF00FF); // yellow
    PlayerTextDrawSetShadow(playerid, TD_SkinTestTitle[playerid], 1);
    PlayerTextDrawSetOutline(playerid, TD_SkinTestTitle[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, TD_SkinTestTitle[playerid], 150);
    PlayerTextDrawFont(playerid, TD_SkinTestTitle[playerid], 2); // Font 2: elegant block

    // Info Text
    TD_SkinTestInfo[playerid] = CreatePlayerTextDraw(playerid, 100.0, 205.0, "_");
    PlayerTextDrawLetterSize(playerid, TD_SkinTestInfo[playerid], 0.22, 1.1);
    PlayerTextDrawAlignment(playerid, TD_SkinTestInfo[playerid], 2); // Center alignment
    PlayerTextDrawColor(playerid, TD_SkinTestInfo[playerid], -1); // white
    PlayerTextDrawSetShadow(playerid, TD_SkinTestInfo[playerid], 1);
    PlayerTextDrawSetOutline(playerid, TD_SkinTestInfo[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, TD_SkinTestInfo[playerid], 150);
    PlayerTextDrawFont(playerid, TD_SkinTestInfo[playerid], 1);

    // Help Text (controls hint)
    TD_SkinTestHelp[playerid] = CreatePlayerTextDraw(playerid, 100.0, 245.0, "~y~[Y]~w~ Next~n~~y~[N]~w~ Prev~n~~g~/skintest stop~w~ exit");
    PlayerTextDrawLetterSize(playerid, TD_SkinTestHelp[playerid], 0.18, 0.95);
    PlayerTextDrawAlignment(playerid, TD_SkinTestHelp[playerid], 2); // Center alignment
    PlayerTextDrawColor(playerid, TD_SkinTestHelp[playerid], -1);
    PlayerTextDrawSetShadow(playerid, TD_SkinTestHelp[playerid], 1);
    PlayerTextDrawSetOutline(playerid, TD_SkinTestHelp[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, TD_SkinTestHelp[playerid], 150);
    PlayerTextDrawFont(playerid, TD_SkinTestHelp[playerid], 1);
}

// Show Player UI
public SkinTest_Show(playerid)
{
    PlayerTextDrawShow(playerid, TD_SkinTestBG[playerid]);
    PlayerTextDrawShow(playerid, TD_SkinTestTitle[playerid]);
    PlayerTextDrawShow(playerid, TD_SkinTestInfo[playerid]);
    PlayerTextDrawShow(playerid, TD_SkinTestHelp[playerid]);
}

// Destroy Player UI
public SkinTest_Destroy(playerid)
{
    if(TD_SkinTestBG[playerid] != PlayerText:INVALID_TEXT_DRAW)
    {
        PlayerTextDrawDestroy(playerid, TD_SkinTestBG[playerid]);
        TD_SkinTestBG[playerid] = PlayerText:INVALID_TEXT_DRAW;
    }
    if(TD_SkinTestTitle[playerid] != PlayerText:INVALID_TEXT_DRAW)
    {
        PlayerTextDrawDestroy(playerid, TD_SkinTestTitle[playerid]);
        TD_SkinTestTitle[playerid] = PlayerText:INVALID_TEXT_DRAW;
    }
    if(TD_SkinTestInfo[playerid] != PlayerText:INVALID_TEXT_DRAW)
    {
        PlayerTextDrawDestroy(playerid, TD_SkinTestInfo[playerid]);
        TD_SkinTestInfo[playerid] = PlayerText:INVALID_TEXT_DRAW;
    }
    if(TD_SkinTestHelp[playerid] != PlayerText:INVALID_TEXT_DRAW)
    {
        PlayerTextDrawDestroy(playerid, TD_SkinTestHelp[playerid]);
        TD_SkinTestHelp[playerid] = PlayerText:INVALID_TEXT_DRAW;
    }
}

// Key Detection: Y for Next, N for Prev
hook OnPlayerKeyStateChange(playerid, newkeys, oldkeys)
{
    if(TestingSkin[playerid])
    {
        if(newkeys & KEY_YES)
        {
            TestingSkinIndex[playerid]++;
            if(TestingSkinIndex[playerid] >= sizeof(CustomSkinsData)) 
            {
                TestingSkinIndex[playerid] = 0;
            }
            UpdatePlayerSkinTest(playerid);
            PlayerPlaySoundEx(playerid, 1083); // button click sound
            return 1;
        }
        else if(newkeys & KEY_NO)
        {
            TestingSkinIndex[playerid]--;
            if(TestingSkinIndex[playerid] < 0) 
            {
                TestingSkinIndex[playerid] = sizeof(CustomSkinsData) - 1;
            }
            UpdatePlayerSkinTest(playerid);
            PlayerPlaySoundEx(playerid, 1084); // button click sound
            return 1;
        }
    }
    return 0;
}

// Clean up if user disconnects
hook OnPlayerDisconnect(playerid, reason)
{
    if(TestingSkin[playerid])
    {
        SkinTest_Destroy(playerid);
        TestingSkin[playerid] = false;
    }
    return 1;
}
