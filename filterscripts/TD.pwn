#define FILTERSCRIPT

#include <a_samp>
#include <progress>
#include <map-zones>

#if defined FILTERSCRIPT
new Text:TextDate;
new Text:TextTime;
new Text:TDStrip;
new Text:LosJawa;
new Text:RolePlay;
new Text:TDLokasi;

public OnFilterScriptInit() 
{
	SetTimer("SetTimeDate",1000,true);
	SetTimer("updatelokasi",1000,true);
    TDLokasi = TextDrawCreate(324.000000, 30.000000, "Los Santos International");
	TextDrawFont(TDLokasi, 1);
	TextDrawLetterSize(TDLokasi, 0.291666, 1.049998);
	TextDrawTextSize(TDLokasi, 733.000000, 17.000000);
	TextDrawSetOutline(TDLokasi, 1);
	TextDrawSetShadow(TDLokasi, 0);
	TextDrawAlignment(TDLokasi, 1);
	TextDrawColor(TDLokasi, -2686721);
	TextDrawBackgroundColor(TDLokasi, 255);
	TextDrawBoxColor(TDLokasi, 50);
	TextDrawUseBox(TDLokasi, 0);
	TextDrawSetProportional(TDLokasi, 1);
	TextDrawSetSelectable(TDLokasi, 0);

	TextDate = TextDrawCreate(324.000000, 18.000000, "00.00.0000");
	TextDrawFont(TextDate, 1);
	TextDrawLetterSize(TextDate, 0.241666, 1.149999);
	TextDrawTextSize(TextDate, 400.000000, 17.000000);
	TextDrawSetOutline(TextDate, 1);
	TextDrawSetShadow(TextDate, 0);
	TextDrawAlignment(TextDate, 1);
	TextDrawColor(TextDate, -741092353);
	TextDrawBackgroundColor(TextDate, 255);
	TextDrawBoxColor(TextDate, 50);
	TextDrawUseBox(TextDate, 0);
	TextDrawSetProportional(TextDate, 1);
	TextDrawSetSelectable(TextDate, 0);

	TextTime = TextDrawCreate(324.000000, 6.000000, "00:00");
	TextDrawFont(TextTime, 1);
	TextDrawLetterSize(TextTime, 0.229158, 1.199998);
	TextDrawTextSize(TextTime, 397.500000, 14.500000);
	TextDrawSetOutline(TextTime, 1);
	TextDrawSetShadow(TextTime, 0);
	TextDrawAlignment(TextTime, 1);
	TextDrawColor(TextTime, -741092353);
	TextDrawBackgroundColor(TextTime, 255);
	TextDrawBoxColor(TextTime, 50);
	TextDrawUseBox(TextTime, 0);
	TextDrawSetProportional(TextTime, 1);
	TextDrawSetSelectable(TextTime, 0);

	TDStrip = TextDrawCreate(320.000000, -8.000000, "[");
	TextDrawFont(TDStrip, 1);
	TextDrawLetterSize(TDStrip, 0.079167, 5.850005);
	TextDrawTextSize(TDStrip, 400.000000, 17.000000);
	TextDrawSetOutline(TDStrip, 1);
	TextDrawSetShadow(TDStrip, 0);
	TextDrawAlignment(TDStrip, 1);
	TextDrawColor(TDStrip, -1);
	TextDrawBackgroundColor(TDStrip, 255);
	TextDrawBoxColor(TDStrip, 50);
	TextDrawUseBox(TDStrip, 0);
	TextDrawSetProportional(TDStrip, 1);
	TextDrawSetSelectable(TDStrip, 0);

	LosJawa = TextDrawCreate(255.000000, 5.000000, "los jawa");
	TextDrawFont(LosJawa, 3);
	TextDrawLetterSize(LosJawa, 0.362500, 2.499999);
	TextDrawTextSize(LosJawa, 400.000000, 17.000000);
	TextDrawSetOutline(LosJawa, 2);
	TextDrawSetShadow(LosJawa, 0);
	TextDrawAlignment(LosJawa, 1);
	TextDrawColor(LosJawa, -741092353);
	TextDrawBackgroundColor(LosJawa, 255);
	TextDrawBoxColor(LosJawa, 50);
	TextDrawUseBox(LosJawa, 0);
	TextDrawSetProportional(LosJawa, 1);
	TextDrawSetSelectable(LosJawa, 0);

	RolePlay = TextDrawCreate(263.000000, 19.000000, "RolePlay");
	TextDrawFont(RolePlay, 0);
	TextDrawLetterSize(RolePlay, 0.433333, 2.000000);
	TextDrawTextSize(RolePlay, 400.000000, 17.000000);
	TextDrawSetOutline(RolePlay, 2);
	TextDrawSetShadow(RolePlay, 0);
	TextDrawAlignment(RolePlay, 1);
	TextDrawColor(RolePlay, -741092353);
	TextDrawBackgroundColor(RolePlay, 255);
	TextDrawBoxColor(RolePlay, 50);
	TextDrawUseBox(RolePlay, 0);
	TextDrawSetProportional(RolePlay, 1);
	TextDrawSetSelectable(RolePlay, 0);

	print("--------------------------------------\n");
    print("Textdraw Extended");
    print("--------------------------------------\n");
    return 1;
}

public OnFilterScriptExit()
{
    return 1;
}

#else

#endif
public OnPlayerConnect(playerid)
{
    return 1;
}
public OnPlayerDisconnect(playerid, reason)
{
    TextDrawHideForPlayer(playerid,TextDate);
    TextDrawHideForPlayer(playerid,TextTime);
	TextDrawHideForPlayer(playerid,TDStrip);
    TextDrawHideForPlayer(playerid,LosJawa);
    TextDrawHideForPlayer(playerid,RolePlay);
	TextDrawHideForPlayer(playerid,TDLokasi);
    return 1;
}
forward SetTimeDate();
public SetTimeDate()
{
    // You can change the world time like GMT+2 GMT+3, etc
    new string[128],year,month,day,hours,minutes,seconds;
    getdate(year, month, day), gettime(hours, minutes, seconds);
    SetWorldTime(hours+7); //Sets the world time (for all players) to a specific hour.
    format(string, sizeof string, "%d/%s%d/%s%d", day, ((month < 10) ? ("0") : ("")), month, (year < 10) ? ("0") : (""), year);
    TextDrawSetString(TextDate, string);
    format(string, sizeof string, "%s%d:%s%d", (hours < 10) ? ("0") : (""), hours, (minutes < 10) ? ("0") : (""), minutes);
    TextDrawSetString(TextTime, string);
}
forward updatelokasi(playerid);
public updatelokasi(playerid)
{
	new MapZone:zone = GetPlayerMapZone(playerid);
    new name[MAX_MAP_ZONE_NAME];
    GetMapZoneName(zone, name);
	new string[128];
    format(string, sizeof(string), "%s", name);
	TextDrawSetString(TDLokasi, string);
}
public OnPlayerSpawn(playerid)
{
    TextDrawShowForPlayer(playerid,TextDate);
    TextDrawShowForPlayer(playerid,TextTime);
	TextDrawShowForPlayer(playerid,TDStrip);
    TextDrawShowForPlayer(playerid,LosJawa);
    TextDrawShowForPlayer(playerid,RolePlay);
	TextDrawShowForPlayer(playerid,TDLokasi);
    return 1;
}
