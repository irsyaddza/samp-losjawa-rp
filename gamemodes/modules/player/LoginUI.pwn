// Login Page UI and Mechanics

new PlayerText:LoginTD_Bg[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:LoginTD_Box[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:LoginTD_Username[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:LoginTD_PasswordBtn[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:LoginTD_Password[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:LoginTD_Btn[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:LoginTD_BtnTxt[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};
new PlayerText:LoginTD_Status[MAX_PLAYERS] = {PlayerText:INVALID_TEXT_DRAW, ...};

new LoginTimer[MAX_PLAYERS] = {-1, ...};
new LoginDots[MAX_PLAYERS] = 0;
new LoginPass[MAX_PLAYERS][64];
new bool:LoginPasswordEntered[MAX_PLAYERS] = {false, ...};
new bool:LoginScreenReady[MAX_PLAYERS] = {false, ...};

stock CreateLoginTDs(playerid)
{
    // Background loading
    LoginTD_Bg[playerid] = CreatePlayerTextDraw(playerid, 0.000, -2.000, "mdl-1413:loading");
    PlayerTextDrawTextSize(playerid, LoginTD_Bg[playerid], 640.000, 456.000);
    PlayerTextDrawAlignment(playerid, LoginTD_Bg[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_Bg[playerid], -1);
    PlayerTextDrawSetShadow(playerid, LoginTD_Bg[playerid], 0);
    PlayerTextDrawSetOutline(playerid, LoginTD_Bg[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_Bg[playerid], 255);
    PlayerTextDrawFont(playerid, LoginTD_Bg[playerid], 4);
    PlayerTextDrawSetProportional(playerid, LoginTD_Bg[playerid], 1);

    // Login UI
    LoginTD_Box[playerid] = CreatePlayerTextDraw(playerid, 249.000, 161.000, "mdl-1413:login");
    PlayerTextDrawTextSize(playerid, LoginTD_Box[playerid], 144.000, 47.000);
    PlayerTextDrawAlignment(playerid, LoginTD_Box[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_Box[playerid], -1);
    PlayerTextDrawSetShadow(playerid, LoginTD_Box[playerid], 0);
    PlayerTextDrawSetOutline(playerid, LoginTD_Box[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_Box[playerid], 255);
    PlayerTextDrawFont(playerid, LoginTD_Box[playerid], 4);
    PlayerTextDrawSetProportional(playerid, LoginTD_Box[playerid], 1);

    // Username Text
    new name_str[64];
    format(name_str, sizeof(name_str), "%s", ReturnName(playerid));
    LoginTD_Username[playerid] = CreatePlayerTextDraw(playerid, 275.000, 167.000, name_str);
    PlayerTextDrawLetterSize(playerid, LoginTD_Username[playerid], 0.259, 1.299);
    PlayerTextDrawAlignment(playerid, LoginTD_Username[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_Username[playerid], -1);
    PlayerTextDrawSetShadow(playerid, LoginTD_Username[playerid], 1);
    PlayerTextDrawSetOutline(playerid, LoginTD_Username[playerid], 1);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_Username[playerid], 150);
    PlayerTextDrawFont(playerid, LoginTD_Username[playerid], 3);
    PlayerTextDrawSetProportional(playerid, LoginTD_Username[playerid], 1);

    // Password Box Background blkdot (Selectable!)
    LoginTD_PasswordBtn[playerid] = CreatePlayerTextDraw(playerid, 271.000, 186.000, "LD_BUM:blkdot");
    PlayerTextDrawTextSize(playerid, LoginTD_PasswordBtn[playerid], 121.000, 17.000);
    PlayerTextDrawAlignment(playerid, LoginTD_PasswordBtn[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_PasswordBtn[playerid], -256);
    PlayerTextDrawSetShadow(playerid, LoginTD_PasswordBtn[playerid], 0);
    PlayerTextDrawSetOutline(playerid, LoginTD_PasswordBtn[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_PasswordBtn[playerid], 255);
    PlayerTextDrawFont(playerid, LoginTD_PasswordBtn[playerid], 4);
    PlayerTextDrawSetProportional(playerid, LoginTD_PasswordBtn[playerid], 1);
    PlayerTextDrawSetSelectable(playerid, LoginTD_PasswordBtn[playerid], 1);

    // Password Text
    LoginTD_Password[playerid] = CreatePlayerTextDraw(playerid, 275.000, 188.000, "Password");
    PlayerTextDrawLetterSize(playerid, LoginTD_Password[playerid], 0.259, 1.299);
    PlayerTextDrawAlignment(playerid, LoginTD_Password[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_Password[playerid], -1);
    PlayerTextDrawSetShadow(playerid, LoginTD_Password[playerid], 1);
    PlayerTextDrawSetOutline(playerid, LoginTD_Password[playerid], 1);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_Password[playerid], 150);
    PlayerTextDrawFont(playerid, LoginTD_Password[playerid], 3);
    PlayerTextDrawSetProportional(playerid, LoginTD_Password[playerid], 1);

    // Login Button blkdot (Selectable!)
    LoginTD_Btn[playerid] = CreatePlayerTextDraw(playerid, 293.000, 218.000, "LD_BUM:blkdot");
    PlayerTextDrawTextSize(playerid, LoginTD_Btn[playerid], 60.000, 14.000);
    PlayerTextDrawAlignment(playerid, LoginTD_Btn[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_Btn[playerid], -1958407169);
    PlayerTextDrawSetShadow(playerid, LoginTD_Btn[playerid], 0);
    PlayerTextDrawSetOutline(playerid, LoginTD_Btn[playerid], 0);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_Btn[playerid], 255);
    PlayerTextDrawFont(playerid, LoginTD_Btn[playerid], 4);
    PlayerTextDrawSetProportional(playerid, LoginTD_Btn[playerid], 1);
    PlayerTextDrawSetSelectable(playerid, LoginTD_Btn[playerid], 1);

    // Login Button Text
    LoginTD_BtnTxt[playerid] = CreatePlayerTextDraw(playerid, 305.000, 217.000, "LOGIN");
    PlayerTextDrawLetterSize(playerid, LoginTD_BtnTxt[playerid], 0.300, 1.500);
    PlayerTextDrawAlignment(playerid, LoginTD_BtnTxt[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_BtnTxt[playerid], -1);
    PlayerTextDrawSetShadow(playerid, LoginTD_BtnTxt[playerid], 1);
    PlayerTextDrawSetOutline(playerid, LoginTD_BtnTxt[playerid], 1);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_BtnTxt[playerid], -1958407169);
    PlayerTextDrawFont(playerid, LoginTD_BtnTxt[playerid], 2);
    PlayerTextDrawSetProportional(playerid, LoginTD_BtnTxt[playerid], 1);

    // Status Text
    LoginTD_Status[playerid] = CreatePlayerTextDraw(playerid, 12.000, 414.000, "Please wait");
    PlayerTextDrawLetterSize(playerid, LoginTD_Status[playerid], 0.578, 2.799);
    PlayerTextDrawAlignment(playerid, LoginTD_Status[playerid], 1);
    PlayerTextDrawColor(playerid, LoginTD_Status[playerid], -1);
    PlayerTextDrawSetShadow(playerid, LoginTD_Status[playerid], 1);
    PlayerTextDrawSetOutline(playerid, LoginTD_Status[playerid], 1);
    PlayerTextDrawBackgroundColor(playerid, LoginTD_Status[playerid], 150);
    PlayerTextDrawFont(playerid, LoginTD_Status[playerid], 3);
    PlayerTextDrawSetProportional(playerid, LoginTD_Status[playerid], 1);
}

stock DestroyLoginTDs(playerid)
{
    if (LoginTimer[playerid] != -1)
    {
        KillTimer(LoginTimer[playerid]);
        LoginTimer[playerid] = -1;
    }

    PlayerTextDrawDestroy(playerid, LoginTD_Bg[playerid]);
    LoginTD_Bg[playerid] = PlayerText:INVALID_TEXT_DRAW;
    PlayerTextDrawDestroy(playerid, LoginTD_Box[playerid]);
    LoginTD_Box[playerid] = PlayerText:INVALID_TEXT_DRAW;
    PlayerTextDrawDestroy(playerid, LoginTD_Username[playerid]);
    LoginTD_Username[playerid] = PlayerText:INVALID_TEXT_DRAW;
    PlayerTextDrawDestroy(playerid, LoginTD_PasswordBtn[playerid]);
    LoginTD_PasswordBtn[playerid] = PlayerText:INVALID_TEXT_DRAW;
    PlayerTextDrawDestroy(playerid, LoginTD_Password[playerid]);
    LoginTD_Password[playerid] = PlayerText:INVALID_TEXT_DRAW;
    PlayerTextDrawDestroy(playerid, LoginTD_Btn[playerid]);
    LoginTD_Btn[playerid] = PlayerText:INVALID_TEXT_DRAW;
    PlayerTextDrawDestroy(playerid, LoginTD_BtnTxt[playerid]);
    LoginTD_BtnTxt[playerid] = PlayerText:INVALID_TEXT_DRAW;
    PlayerTextDrawDestroy(playerid, LoginTD_Status[playerid]);
    LoginTD_Status[playerid] = PlayerText:INVALID_TEXT_DRAW;
}

stock ClearChatForPlayer(playerid)
{
    for(new i = 0; i < 100; i++)
    {
        SendClientMessage(playerid, -1, " ");
    }
}

stock StartLoginLoading(playerid)
{
    ClearChatForPlayer(playerid);
    LoginPass[playerid][0] = '\0';
    LoginPasswordEntered[playerid] = false;
    LoginScreenReady[playerid] = false;
    LoginDots[playerid] = 0;

    // Show loading background and status only!
    PlayerTextDrawShow(playerid, LoginTD_Bg[playerid]);
    PlayerTextDrawShow(playerid, LoginTD_Status[playerid]);

    if (LoginTimer[playerid] != -1) KillTimer(LoginTimer[playerid]);
    LoginTimer[playerid] = SetTimerEx("OnLoginLoadingTimer", 500, true, "d", playerid);
}

stock SetLoginScreenReady(playerid)
{
    ClearChatForPlayer(playerid);
    if (LoginTimer[playerid] != -1)
    {
        KillTimer(LoginTimer[playerid]);
        LoginTimer[playerid] = -1;
    }

    LoginScreenReady[playerid] = true;

    // Update status to tell player what to do
    PlayerTextDrawSetString(playerid, LoginTD_Status[playerid], "Please enter your password to login.");

    // Show the rest of the textdraws
    PlayerTextDrawShow(playerid, LoginTD_Box[playerid]);
    PlayerTextDrawShow(playerid, LoginTD_Username[playerid]);
    PlayerTextDrawShow(playerid, LoginTD_PasswordBtn[playerid]);
    PlayerTextDrawShow(playerid, LoginTD_Password[playerid]);
    PlayerTextDrawShow(playerid, LoginTD_Btn[playerid]);
    PlayerTextDrawShow(playerid, LoginTD_BtnTxt[playerid]);

    // Turn on cursor selection mode
    SelectTextDraw(playerid, 0xFFD60380);
}

stock HideLoginInputs(playerid)
{
    // Hide all input textdraws but keep the background active
    PlayerTextDrawHide(playerid, LoginTD_Box[playerid]);
    PlayerTextDrawHide(playerid, LoginTD_Username[playerid]);
    PlayerTextDrawHide(playerid, LoginTD_PasswordBtn[playerid]);
    PlayerTextDrawHide(playerid, LoginTD_Password[playerid]);
    PlayerTextDrawHide(playerid, LoginTD_Btn[playerid]);
    PlayerTextDrawHide(playerid, LoginTD_BtnTxt[playerid]);
    PlayerTextDrawHide(playerid, LoginTD_Status[playerid]);
}

forward OnLoginLoadingTimer(playerid);
public OnLoginLoadingTimer(playerid)
{
    if (!IsPlayerConnected(playerid)) return 1;

    LoginDots[playerid]++;
    if (LoginDots[playerid] > 6) LoginDots[playerid] = 0;

    new str[64];
    format(str, sizeof(str), "Please wait");
    for (new i = 0; i < LoginDots[playerid]; i++)
    {
        strcat(str, ".");
    }
    PlayerTextDrawSetString(playerid, LoginTD_Status[playerid], str);
    return 1;
}

stock OnLoginClickPlayerTD(playerid, PlayerText:playertextid)
{
    // Click on the yellow password box background (LoginTD_PasswordBtn)
    if (playertextid == LoginTD_PasswordBtn[playerid])
    {
        Dialog_Show(playerid, LoginScreenTD, DIALOG_STYLE_PASSWORD, "Enter Password", "Please enter your password:", "Submit", "Cancel");
        PlayerPlaySound(playerid, 1083, 0.0, 0.0, 0.0);
        return 1;
    }

    if (playertextid == LoginTD_Btn[playerid])
    {
        if (!LoginPasswordEntered[playerid])
        {
            PlayerTextDrawSetString(playerid, LoginTD_Status[playerid], "Error: Please enter your password first!");
            PlayerPlaySound(playerid, 1085, 0.0, 0.0, 0.0);
            return 1;
        }

        PlayerTextDrawSetString(playerid, LoginTD_Status[playerid], "Verifying password...");
        PlayerPlaySound(playerid, 1083, 0.0, 0.0, 0.0);

        // Run the authentication
        SQL_AttemptLogin(playerid, LoginPass[playerid]);
        return 1;
    }
    return 0;
}

Dialog:LoginScreenTD(playerid, response, listitem, inputtext[])
{
    if (!response) return 1;

    if (isnull(inputtext))
    {
        Dialog_Show(playerid, LoginScreenTD, DIALOG_STYLE_PASSWORD, "Enter Password", "Please enter your password:", "Submit", "Cancel");
        return 1;
    }

    format(LoginPass[playerid], 64, inputtext);
    LoginPasswordEntered[playerid] = true;

    new str[128];
    format(str, sizeof(str), "Password: ...");
    PlayerTextDrawSetString(playerid, LoginTD_Password[playerid], str);
    PlayerTextDrawShow(playerid, LoginTD_Password[playerid]);

    PlayerPlaySound(playerid, 1083, 0.0, 0.0, 0.0);
    return 1;
}

forward OnPlayerGtaVSpawnFinish(playerid);
public OnPlayerGtaVSpawnFinish(playerid)
{
    if (!IsPlayerConnected(playerid)) return 1;
    SetCameraBehindPlayer(playerid);
    TogglePlayerControllable(playerid, true);
    return 1;
}

forward OnPlayerKickTimer(playerid);
public OnPlayerKickTimer(playerid)
{
    if (IsPlayerConnected(playerid)) KickEx(playerid);
    return 1;
}
