/*
	'xObjectAttacher' XpDeviL's Attached Object Editor

*/
#include <a_samp>
#include <xoa_td>

#define OA_DIALOG 6000 // If the dialogs crosses with another dialog, it will be enough to change this ID.

new Float:offset[MAX_PLAYERS][5][3], Float:rot[MAX_PLAYERS][5][3], Float:scale[MAX_PLAYERS][5][3], obj_inf[MAX_PLAYERS][5][2];
new sec[MAX_PLAYERS];

public OnFilterScriptInit()
{
	print("\n************************************");
	print("'xObjectAttacher' - Loaded!\n");
	print("by XpDeviL\n");
	print("************************************\n");
	
	TD_Yukle();
	return 1;
}

public OnPlayerConnect(playerid) pTD_Yukle(playerid);

public OnPlayerCommandText(playerid, cmdtext[])
{
	if (strcmp("/xoa", cmdtext, true, 10) == 0)
	{
		if(GetPVarInt(playerid, "xoa_Editing") == 1) MenuDurum(playerid, 1);
		else sec[playerid] = 0, ShowPlayerDialog(playerid, OA_DIALOG, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher", "{FF8B00}Object ID\n\n{FFFFFF}Enter the ID of the object to attach:", "Next", "Cancel");
		return 1;
	}
	return 0;
}

public OnPlayerClickTextDraw(playerid, Text:clickedid)
{
	if(clickedid == ao_Text[5]) // Change ID
    {
         MenuDurum(playerid, 0);
		 ShowPlayerDialog(playerid, OA_DIALOG, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher", "{FF8B00}Object ID\n\n{FFFFFF}Enter the ID of the object to attach:", "Next", "Cancel");
    }
    
    else if(clickedid == ao_Text[7]) // Position
    {
         MenuDurum(playerid, 0);
		 EditAttachedObject(playerid, sec[playerid]);
    }
    
    else if(clickedid == ao_Text[6]) // Change Bone
    {
         MenuDurum(playerid, 0);
		 ShowPlayerDialog(playerid, OA_DIALOG+1, DIALOG_STYLE_LIST, "XpDeviL's Object Attacher - Select Bone To Attach", "Spine\nHead\nLeft upper arm\nRight upper arm\nLeft hand\nRight hand\nLeft thigh\nRight thigh\nLeft foot\nRight foot\nRight calf\nLeft calf\nLeft forearm\nRight forearm\nLeft clavicle (shoulder)\nRight clavicle (shoulder)\nNeck\nJaw", "Next", "Cancel");
    }
	
    else if(clickedid == ao_Text[8]) // Remove
    {
		MenuDurum(playerid, 0);
		ShowPlayerDialog(playerid, OA_DIALOG+4, DIALOG_STYLE_MSGBOX, "XpDeviL's Object Attacher", "{FF8B00}Are you sure you want to remove the object?", "Yes", "Cancel");
    }
	
    else if(clickedid == ao_Text[9]) // Baska Obje Ekle
    {
        MenuDurum(playerid, 0);
		SetPVarInt(playerid, "xoa_Temp", -1);
		for(new i; i<5; i++) if(obj_inf[playerid][i][0] == 0)
		{
			SetPVarInt(playerid, "xoa_Temp", i);
			break;
		}
		if(GetPVarInt(playerid, "xoa_Temp") == -1) return SendClientMessage(playerid, -1, "{FF0000}<!> {FF8B00} You can't add more objects!");
		ShowPlayerDialog(playerid, OA_DIALOG+2, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher", "{FFFFFF}Enter the ID of the new object:", "Next", "Cancel");
	}
	
    else if(clickedid == ao_Text[12]) // Object 1
    {
		sec[playerid]=0;
        MenuDurum(playerid, 0);
		MenuDurum(playerid, 1);
		SendClientMessage(playerid, -1, "Selected object: {00B400}1");
	}

    else if(clickedid == ao_Text[13]) // Object 2
    {
		sec[playerid]=1;
        MenuDurum(playerid, 0);
		MenuDurum(playerid, 1);
		SendClientMessage(playerid, -1, "Selected object: {00B400}2");
	}
	
    else if(clickedid == ao_Text[14]) // Object 3
    {
		sec[playerid]=2;
        MenuDurum(playerid, 0);
		MenuDurum(playerid, 1);
		SendClientMessage(playerid, -1, "Selected object: {00B400}3");
	}
	
    else if(clickedid == ao_Text[15]) // Object 4
    {
		sec[playerid]=3;
        MenuDurum(playerid, 0);
		MenuDurum(playerid, 1);
		SendClientMessage(playerid, -1, "Selected object: {00B400}4");
	}
	
    else if(clickedid == ao_Text[16]) // Object 5
    {
		sec[playerid]=4;
        MenuDurum(playerid, 0);
		MenuDurum(playerid, 1);
		SendClientMessage(playerid, -1, "Selected object: {00B400}5");
	}
    
    else if(clickedid == ao_Text[19]) // Save
    {
        MenuDurum(playerid, 0);
		ShowPlayerDialog(playerid, OA_DIALOG+6, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher - Save", "{FFFFFF}Write the name of the file to save:", "Save", "Back");
    }
	
    else if(clickedid == ao_Text[20]) // Remove all
    {
		MenuDurum(playerid, 0);
		ShowPlayerDialog(playerid, OA_DIALOG+5, DIALOG_STYLE_MSGBOX, "XpDeviL's Object Attacher", "{FF8B00}Are you sure you want to remove all attached objects?", "Yes", "Cancel");
    }
    
    else if(clickedid == ao_Text[24]) // Close
    {
        MenuDurum(playerid, 0);
    }
    return 1;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
	if(dialogid == OA_DIALOG)
	{
		if(response)
		{
			if(!strlen(inputtext)) return ShowPlayerDialog(playerid, OA_DIALOG, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher", "{FF0000}<!> {FF8B00} You didn't enter the ID!\n\n{FFFFFF}Enter the ID of the object to attach:", "Next", "Cancel");
			if(!isNumeric(inputtext)) return ShowPlayerDialog(playerid, OA_DIALOG, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher", "{FF0000}<!> {FF8B00} You used invalid characters.\nPlease use only numbers.\n\n{FFFFFF}Enter the ID of the object to attach:", "Next", "Cancel");
			obj_inf[playerid][sec[playerid]][0] = strval(inputtext); for(new s; s<3; s++) scale[playerid][sec[playerid]][s]=1;
			if(GetPVarInt(playerid, "xoa_Editing") == 1) ObjeYenile(playerid), MenuDurum(playerid, 1), SendClientMessage(playerid, -1, "{00B400}<!> {00FF00}Object ID has been changed!");
			else 
			{
				ShowPlayerDialog(playerid, OA_DIALOG+1, DIALOG_STYLE_LIST, "XpDeviL's Object Attacher - Select Bone To Attach", "Spine\nHead\nLeft upper arm\nRight upper arm\nLeft hand\nRight hand\nLeft thigh\nRight thigh\nLeft foot\nRight foot\nRight calf\nLeft calf\nLeft forearm\nRight forearm\nLeft clavicle (shoulder)\nRight clavicle (shoulder)\nNeck\nJaw", "Next", "Cancel");
			}
		}
	}
	
	if(dialogid == OA_DIALOG+1)
	{
		if(response)
		{
			if(GetPVarInt(playerid, "xoa_Editing") == 0) SendClientMessage(playerid, -1, "{00B400}<!> {00FF00}Object has been attached!"), SetPVarInt(playerid, "xoa_Editing", 1);
			obj_inf[playerid][sec[playerid]][1] = listitem + 1;
			ObjeYenile(playerid);
			MenuDurum(playerid, 1);
		}
	}
	
	if(dialogid == OA_DIALOG+2)
	{
		if(response)
		{
			if(!strlen(inputtext)) return ShowPlayerDialog(playerid, OA_DIALOG+2, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher", "[ERROR]: You didn't enter the ID!\n\nEnter the ID of the new object:", "Next", "Cancel");
			if(!isNumeric(inputtext)) return ShowPlayerDialog(playerid, OA_DIALOG+2, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher", "[ERROR]: You used invalid characters.\nPlease use only numbers.\n\nEnter the ID of the new object:", "Next", "Cancel");
			obj_inf[playerid][GetPVarInt(playerid, "xoa_Temp")][0] = strval(inputtext); for(new s; s<3; s++) scale[playerid][GetPVarInt(playerid, "xoa_Temp")][s]=1;
			ShowPlayerDialog(playerid, OA_DIALOG+3, DIALOG_STYLE_LIST, "XpDeviL's Object Attacher - Select Bone To Attach", "Spine\nHead\nLeft upper arm\nRight upper arm\nLeft hand\nRight hand\nLeft thigh\nRight thigh\nLeft foot\nRight foot\nRight calf\nLeft calf\nLeft forearm\nRight forearm\nLeft clavicle (shoulder)\nRight clavicle (shoulder)\nNeck\nJaw", "Next", "Cancel");
		}
	}
	
	if(dialogid == OA_DIALOG+3)
	{
		if(response)
		{
			sec[playerid] = GetPVarInt(playerid, "xoa_Temp");
			obj_inf[playerid][sec[playerid]][1] = listitem + 1;
			SendClientMessage(playerid, -1, "{00B400}<!> {00FF00}Object has been added!");
			ObjeYenile(playerid);
			MenuDurum(playerid, 1);
		}
	}
	
	if(dialogid == OA_DIALOG+4)
	{
		if(response)
		{
			ObjeSil(playerid, sec[playerid]);
			ObjeYenile(playerid);
			SendClientMessage(playerid, -1, "{FF0000}<!> {FF8B00}Object has been removed!");
			sec[playerid] = -1;
			for(new i; i<5; i++) if(obj_inf[playerid][i][0] > 0) sec[playerid] = i;
			if(sec[playerid] == -1) return SetPVarInt(playerid, "xoa_Editing", 0);
			else MenuDurum(playerid, 1);
		}
		MenuDurum(playerid, 1);
	}

	if(dialogid == OA_DIALOG+5)
	{
		if(response)
		{
			for(new i; i<5; i++) ObjeSil(playerid, i);
			ObjeYenile(playerid);
			SendClientMessage(playerid, -1, "{FF0000}<!> {FF8B00}All objects removed!");
			SetPVarInt(playerid, "xoa_Editing", 0);
		} else MenuDurum(playerid, 1);
	}

	if(dialogid == OA_DIALOG+6)
	{
		if(response)
		{
			if(!strlen(inputtext)) return ShowPlayerDialog(playerid, OA_DIALOG+6, DIALOG_STYLE_INPUT, "XpDeviL's Object Attacher - Save", "{FF0000}<!> {FF8B00} You didn't enter the file name!\n\n{FFFFFF}Write the name of the file to save:", "Save", "Back");
			ObjeleriKaydet(playerid, inputtext);
			new str[100];
			format(str, sizeof(str), "{00B400}<!> {00FF00}All objects have been saved in scriptfiles, with the name {FFA500}%s.txt", inputtext);
			SendClientMessage(playerid, -1, str);
		} else MenuDurum(playerid, 1);
	}
	return 1;
}

public OnPlayerEditAttachedObject(playerid, response, index, modelid, boneid, Float:fOffsetX, Float:fOffsetY, Float:fOffsetZ, Float:fRotX, Float:fRotY, Float:fRotZ, Float:fScaleX, Float:fScaleY, Float:fScaleZ)
{
	obj_inf[playerid][sec[playerid]][1] = boneid;
	offset[playerid][sec[playerid]][0] = fOffsetX;
	offset[playerid][sec[playerid]][1] = fOffsetY;
	offset[playerid][sec[playerid]][2] = fOffsetZ;
	rot[playerid][sec[playerid]][0] = fRotX;
	rot[playerid][sec[playerid]][1] = fRotY;
	rot[playerid][sec[playerid]][2] = fRotZ;
	scale[playerid][sec[playerid]][0] = fScaleX;
	scale[playerid][sec[playerid]][1] = fScaleY;
	scale[playerid][sec[playerid]][2] = fScaleZ;
	SendClientMessage(playerid, -1, "{00B400}<!> {00FF00}Object has been updated!");
	MenuDurum(playerid, 1);
	return 1;
}

stock isNumeric(const string[]) {
	new length=strlen(string);
	if (length==0) return false;
	for (new i = 0; i < length; i++) {
		if (
		(string[i] > '9' || string[i] < '0' && string[i]!='-' && string[i]!='+')
		|| (string[i]=='-' && i!=0)
		|| (string[i]=='+' && i!=0)
		) return false;
	}
	if (length==1 && (string[0]=='-' || string[0]=='+')) return false;
	return true;
}

stock ObjeYenile(playerid)
{
	for(new i; i<5; i++) RemovePlayerAttachedObject(playerid, i);
	for(new i; i<5; i++)
	{
		if(obj_inf[playerid][i][0] > 0) SetPlayerAttachedObject(playerid, i, obj_inf[playerid][i][0], obj_inf[playerid][i][1], offset[playerid][i][0], offset[playerid][i][1], offset[playerid][i][2], rot[playerid][i][0], rot[playerid][i][1], rot[playerid][i][2], scale[playerid][i][0], scale[playerid][i][1], scale[playerid][i][2]);
	}
	return 1; 
}

stock ObjeSil(playerid, id)
{
	obj_inf[playerid][id][0] = 0;
	obj_inf[playerid][id][1] = 0;
	offset[playerid][id][0] = 0;
	offset[playerid][id][1] = 0;
	offset[playerid][id][2] = 0;
	rot[playerid][id][0] = 0;
	rot[playerid][id][1] = 0;
	rot[playerid][id][2] = 0;
	return 1;
}

stock MenuDurum(playerid, durum)
{
	if(durum == 0)
	{
		for(new t; t<25; t++) TextDrawHideForPlayer(playerid, ao_Text[t]);
		for(new t; t<11; t++) PlayerTextDrawHide(playerid, ao_pText[playerid][t]);
		CancelSelectTextDraw(playerid);
	}
	else 
	{
		new t_str[10][64];
		format(t_str[0], 64, "Object ID: ~g~%d", obj_inf[playerid][sec[playerid]][0]);
		format(t_str[1], 64, "Object Offset X: ~g~%.4f", offset[playerid][sec[playerid]][0]);
		format(t_str[2], 64, "Object Offset Y: ~g~%.4f", offset[playerid][sec[playerid]][1]);
		format(t_str[3], 64, "Object Offset Z: ~g~%.4f", offset[playerid][sec[playerid]][2]);
		format(t_str[4], 64, "Object Rot X: ~g~%f", rot[playerid][sec[playerid]][0]);
		format(t_str[5], 64, "Object Rot Y: ~g~%f", rot[playerid][sec[playerid]][1]);
		format(t_str[6], 64, "Object Rot Z: ~g~%f", rot[playerid][sec[playerid]][2]);
		format(t_str[7], 64, "Object Scale X: ~g~%f", scale[playerid][sec[playerid]][0]);
		format(t_str[8], 64, "Object Scale Y: ~g~%f", scale[playerid][sec[playerid]][1]);
		format(t_str[9], 64, "Object Scale Z: ~g~%f", scale[playerid][sec[playerid]][2]);
		PlayerTextDrawSetString(playerid, ao_pText[playerid][1], t_str[0]);
		PlayerTextDrawSetString(playerid, ao_pText[playerid][2], t_str[1]); PlayerTextDrawSetString(playerid, ao_pText[playerid][3], t_str[2]); PlayerTextDrawSetString(playerid, ao_pText[playerid][4], t_str[3]);
		PlayerTextDrawSetString(playerid, ao_pText[playerid][5], t_str[4]); PlayerTextDrawSetString(playerid, ao_pText[playerid][6], t_str[5]); PlayerTextDrawSetString(playerid, ao_pText[playerid][7], t_str[6]);
		PlayerTextDrawSetString(playerid, ao_pText[playerid][8], t_str[7]); PlayerTextDrawSetString(playerid, ao_pText[playerid][9], t_str[8]); PlayerTextDrawSetString(playerid, ao_pText[playerid][10], t_str[9]);
		PlayerTextDrawSetPreviewModel(playerid, ao_pText[playerid][0], obj_inf[playerid][sec[playerid]][0]);
		for(new tr=12; tr<17; tr++) TextDrawColor(ao_Text[tr], -1);
		if(sec[playerid] == 0) TextDrawColor(ao_Text[12], 65535);
		else if(sec[playerid] == 1) TextDrawColor(ao_Text[13], 65535);
		else if(sec[playerid] == 2) TextDrawColor(ao_Text[14], 65535);
		else if(sec[playerid] == 3) TextDrawColor(ao_Text[15], 65535);
		else if(sec[playerid] == 4) TextDrawColor(ao_Text[16], 65535);
		for(new t; t<25; t++)
		{
			if(t == 12 && obj_inf[playerid][0][0] == 0) continue;
			else if(t == 13 && obj_inf[playerid][1][0] == 0) continue;
			else if(t == 14 && obj_inf[playerid][2][0] == 0) continue;
			else if(t == 15 && obj_inf[playerid][3][0] == 0) continue;
			else if(t == 16 && obj_inf[playerid][4][0] == 0) continue;
			else TextDrawShowForPlayer(playerid, ao_Text[t]);
		}
		for(new t; t<11; t++)
		{
		    PlayerTextDrawShow(playerid, ao_pText[playerid][t]);
		}
		SelectTextDraw(playerid, 0xFF4040AA);
	}
	return 1;
}

stock ObjeleriKaydet(playerid, dizin[])
{
	new cikti[1024], st_dz[24];
	format(cikti, sizeof(cikti), "//This code has output by 'XpDeviL's Object Attacher'\n//Put these codes to where you want to attach object to player. (OnPlayerSpawn, command etc.)\r\n");
	for(new i; i<5; i++)
	{
		if(obj_inf[playerid][i][0] != 0)
		{
			format(cikti, sizeof(cikti), "%s\nSetPlayerAttachedObject(playerid, %d, %d, %d, %f, %f, %f, %f, %f, %f, %f, %f, %f);", cikti, i, obj_inf[playerid][i][0], obj_inf[playerid][i][1], offset[playerid][i][0], offset[playerid][i][1], offset[playerid][i][2], rot[playerid][i][0], rot[playerid][i][1], rot[playerid][i][2], scale[playerid][i][0], scale[playerid][i][1], scale[playerid][i][2]);
		}
	}

	new File:f;
	format(st_dz, sizeof(st_dz), "%s.txt", dizin);
	f = fopen(st_dz,io_append);
	fwrite(f,cikti);
	fclose(f);
	
	return 1;
}
