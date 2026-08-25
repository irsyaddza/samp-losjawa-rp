// =============================================================================
//  MapEditor.pwn — Map Editor for Los Jawa RP
//  Ported from samp-map-editor by BabyJnL, adapted for LJRP
//  Access: Admin Level 4+
//  Storage: MySQL table `map_objects`
//  Command: /obj [subcommand]
// =============================================================================

// ── Constants ────────────────────────────────────────────────────────────────
#define MAX_MAP_OBJECTS         1000
#define MAX_OBJECT_MAT_SLOT     10

#define OBJ_MAT_NONE            0
#define OBJ_MAT_TEXTURE         1
#define OBJ_MAT_MESSAGE         2

// ── Data ─────────────────────────────────────────────────────────────────────
new
    Iterator:MapObjects<MAX_MAP_OBJECTS>,
    MapObject[MAX_MAP_OBJECTS],                             // streamer objectid
    MapObjectDbId[MAX_MAP_OBJECTS],                         // MySQL row id
    MapObjectGroup[MAX_MAP_OBJECTS],
    Text3D:MapObjectLabel[MAX_MAP_OBJECTS],
    MapObjectEditor[MAX_MAP_OBJECTS],                       // playerid editing it
    MapObjectMaterial[MAX_MAP_OBJECTS][MAX_OBJECT_MAT_SLOT] // 0=none 1=tex 2=msg
;

// ── Dialog IDs ────────────────────────────────────────────────────────────────
// Uses LJRP's Dialog: macro, so no manual ID needed.

// ── Helper macros ─────────────────────────────────────────────────────────────
#define ObjMsg(%0,%1)  SendClientMessageEx(%0, COLOR_GREEN,  "MAPEDIT: {FFFFFF}" %1)
#define ObjErr(%0,%1)  SendClientMessageEx(%0, COLOR_RED,    "MAPEDIT ERROR: {FFFFFF}" %1)
#define ObjCmd(%0,%1)  SendClientMessageEx(%0, COLOR_YELLOW, "USAGE: {FFFFFF}" %1)

// ── RGBAToHex (duplicate-safe) ────────────────────────────────────────────────
#define ME_RGBAToHex(%0,%1,%2,%3) \
    ((0x1000000*(%0))+(0x10000*(%1))+(0x100*(%2))+(%3))

// ── HexToRGBA (duplicate-safe) ────────────────────────────────────────────────
stock ME_HexToRGBA(hex, &alpha, &red, &green, &blue)
{
    alpha = (hex >> 24) & 0xFF;
    red   = (hex >> 16) & 0xFF;
    green = (hex >> 8)  & 0xFF;
    blue  =  hex        & 0xFF;
}

stock GetXYLeftOfPoint(Float:x, Float:y, &Float:x2, &Float:y2, Float:A, Float:distance)
{
    x2 = x - (distance * floatsin(-A+90.0, degrees));
    y2 = y - (distance * floatcos(-A+90.0, degrees));
}

stock GetXYRightOfPoint(Float:x, Float:y, &Float:x2, &Float:y2, Float:A, Float:distance)
{
    x2 = x - (distance * floatsin(-A-90.0, degrees));
    y2 = y - (distance * floatcos(-A-90.0, degrees));
}

stock GetXYInFrontOfPoint(Float:x, Float:y, &Float:x2, &Float:y2, Float:A, Float:distance)
{
    x2 = x + (distance * floatsin(-A, degrees));
    y2 = y + (distance * floatcos(-A, degrees));
}

stock GetXYBehindPoint(Float:x, Float:y, &Float:x2, &Float:y2, Float:A, Float:distance)
{
    x2 = x - (distance * floatsin(-A, degrees));
    y2 = y - (distance * floatcos(-A, degrees));
}


// =============================================================================
//  Database Init
// =============================================================================
stock MapEditor_Init()
{
    mysql_tquery(dbCon,
        "CREATE TABLE IF NOT EXISTS `map_objects` (\
            `id`        INT AUTO_INCREMENT PRIMARY KEY,\
            `model`     INT NOT NULL,\
            `pos_x`     FLOAT NOT NULL,\
            `pos_y`     FLOAT NOT NULL,\
            `pos_z`     FLOAT NOT NULL,\
            `rot_x`     FLOAT DEFAULT 0,\
            `rot_y`     FLOAT DEFAULT 0,\
            `rot_z`     FLOAT DEFAULT 0,\
            `interior`  INT DEFAULT 0,\
            `world`     INT DEFAULT 0,\
            `grp`       INT DEFAULT 0,\
            `created_by` VARCHAR(24) DEFAULT '')",
        "MapEditor_OnTableReady", "");
    return 1;
}

forward MapEditor_OnTableReady();
public MapEditor_OnTableReady()
{
    mysql_tquery(dbCon, "SELECT * FROM `map_objects`", "MapEditor_Load", "");
    return 1;
}

// =============================================================================
//  Load all objects from DB on startup
// =============================================================================
forward MapEditor_Load();
public MapEditor_Load()
{
    new rows;
    cache_get_row_count(rows);
    if(!rows) return 1;

    for(new i = 0; i < rows; i++)
    {
        new
            dbid, model, interior, world, grp,
            Float:px, Float:py, Float:pz,
            Float:rx, Float:ry, Float:rz
        ;
        cache_get_value_name_int(i,   "id",       dbid);
        cache_get_value_name_int(i,   "model",    model);
        cache_get_value_name_float(i, "pos_x",    px);
        cache_get_value_name_float(i, "pos_y",    py);
        cache_get_value_name_float(i, "pos_z",    pz);
        cache_get_value_name_float(i, "rot_x",    rx);
        cache_get_value_name_float(i, "rot_y",    ry);
        cache_get_value_name_float(i, "rot_z",    rz);
        cache_get_value_name_int(i,   "interior", interior);
        cache_get_value_name_int(i,   "world",    world);
        cache_get_value_name_int(i,   "grp",      grp);

        new slot = ME_CreateObject(model, px, py, pz, rx, ry, rz, grp, interior, world);
        if(slot != -1)
            MapObjectDbId[slot] = dbid;
    }

    printf("[MapEditor] Loaded %d map objects from database.", rows);
    return 1;
}

// =============================================================================
//  Internal create / destroy helpers
// =============================================================================
stock ME_CreateObject(model, Float:x, Float:y, Float:z,
    Float:rx = 0.0, Float:ry = 0.0, Float:rz = 0.0,
    group = 0, interior = -1, world = -1)
{
    new slot = Iter_Free(MapObjects);
    if(slot == cellmin) return -1;

    MapObject[slot]        = CreateDynamicObject(model, x, y, z, rx, ry, rz, world, interior);
    MapObjectGroup[slot]   = group;
    MapObjectEditor[slot]  = INVALID_PLAYER_ID;
    MapObjectDbId[slot]    = 0;
    Iter_Add(MapObjects, slot);
    ME_CreateLabel(slot, model, x, y, z, group);
    return slot;
}

stock ME_IsValidSlot(slot)
    return Iter_Contains(MapObjects, slot);

stock ME_CreateLabel(slot, model, Float:x, Float:y, Float:z, group = 0)
{
    if(!ME_IsValidSlot(slot)) return 0;
    new lbl[128];
    format(lbl, sizeof(lbl), "{FFFF00}Slot %i{FFFFFF}\nModel {00FFFF}%i{FFFFFF}\nGroup {00FF00}%i", slot, model, group);
    MapObjectLabel[slot] = CreateDynamic3DTextLabel(lbl, 0xFFFFFFFF, x, y, z, 15.0);

    foreach(new i : Player)
    {
        if(!ME_IsAdmin(i) || GetPVarInt(i, "ME_HideLabels") == 1)
        {
            Streamer_ToggleItem(i, STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], 0);
        }
    }
    return 1;
}

stock ME_UpdateLabel(slot)
{
    if(!ME_IsValidSlot(slot)) return 0;
    new model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);
    new Float:pos[3];
    GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
    DestroyDynamic3DTextLabel(MapObjectLabel[slot]);
    ME_CreateLabel(slot, model, pos[0], pos[1], pos[2], MapObjectGroup[slot]);
    return 1;
}

stock ME_DestroyObject(slot)
{
    if(!ME_IsValidSlot(slot)) return 0;
    DestroyDynamic3DTextLabel(MapObjectLabel[slot]);
    DestroyDynamicObject(MapObject[slot]);
    for(new i = 0; i < MAX_OBJECT_MAT_SLOT; i++)
        MapObjectMaterial[slot][i] = OBJ_MAT_NONE;
    Iter_Remove(MapObjects, slot);
    return 1;
}

stock ME_DestroyAll()
{
    foreach(new slot : MapObjects)
        ME_DestroyObject(slot);
    Iter_Clear(MapObjects);
    return 1;
}

stock ME_SetMaterial(slot, index, model, const txd[], const tex[], alpha, red, green, blue)
{
    if(!ME_IsValidSlot(slot)) return 0;
    if(!model) model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);
    SetDynamicObjectMaterial(MapObject[slot], index, model, txd, tex, ME_RGBAToHex(alpha, red, green, blue));
    MapObjectMaterial[slot][index] = OBJ_MAT_TEXTURE;
    return 1;
}

stock ME_RemoveAllMaterials(slot)
{
    if(!ME_IsValidSlot(slot)) return 0;
    for(new i = 0; i < MAX_OBJECT_MAT_SLOT; i++)
        MapObjectMaterial[slot][i] = OBJ_MAT_NONE;
    return 1;
}

// Save one object to MySQL (insert or update)
stock ME_SaveObject(slot, const createdby[] = "")
{
    if(!ME_IsValidSlot(slot)) return 0;

    new Float:px, Float:py, Float:pz, Float:rx, Float:ry, Float:rz;
    new model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);
    Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_X, px);
    Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_Y, py);
    Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_Z, pz);
    Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_X, rx);
    Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_Y, ry);
    Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_Z, rz);

    new interior = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_INTERIOR_ID);
    new world    = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_WORLD_ID);

    new query[512];
    if(MapObjectDbId[slot] == 0)
    {
        // New object — INSERT
        mysql_format(dbCon, query, sizeof(query),
            "INSERT INTO `map_objects` (`model`,`pos_x`,`pos_y`,`pos_z`,`rot_x`,`rot_y`,`rot_z`,`interior`,`world`,`grp`,`created_by`) \
             VALUES (%d,%f,%f,%f,%f,%f,%f,%d,%d,%d,'%e')",
            model, px, py, pz, rx, ry, rz, interior, world, MapObjectGroup[slot], createdby);
        mysql_tquery(dbCon, query, "ME_OnObjectInserted", "d", slot);
    }
    else
    {
        // Existing — UPDATE
        mysql_format(dbCon, query, sizeof(query),
            "UPDATE `map_objects` SET `model`=%d,`pos_x`=%f,`pos_y`=%f,`pos_z`=%f,\
            `rot_x`=%f,`rot_y`=%f,`rot_z`=%f,`interior`=%d,`world`=%d,`grp`=%d WHERE `id`=%d",
            model, px, py, pz, rx, ry, rz, interior, world, MapObjectGroup[slot], MapObjectDbId[slot]);
        mysql_tquery(dbCon, query, "", "");
    }
    return 1;
}

forward ME_OnObjectInserted(slot);
public ME_OnObjectInserted(slot)
{
    MapObjectDbId[slot] = cache_insert_id();
    return 1;
}

// Delete one object from DB
stock ME_DeleteFromDb(slot)
{
    if(MapObjectDbId[slot] == 0) return 0;
    new query[64];
    mysql_format(dbCon, query, sizeof(query), "DELETE FROM `map_objects` WHERE `id`=%d", MapObjectDbId[slot]);
    mysql_tquery(dbCon, query, "", "");
    MapObjectDbId[slot] = 0;
    return 1;
}

// Helper: replace \n literal (two chars) with real newline
stock ME_UnescapeNewline(const src[], dest[], len)
{
    new j = 0;
    for(new i = 0; src[i] && j < len - 1; i++)
    {
        if(src[i] == '\\' && src[i+1] == 'n')
        {
            dest[j++] = '\n';
            i++;
        }
        else dest[j++] = src[i];
    }
    dest[j] = EOS;
}

// Admin check
stock ME_IsAdmin(playerid)
    return (PlayerData[playerid][pAdmin] >= 4);

// =============================================================================
//  Hooks
// =============================================================================
#include <YSI_Coding/y_hooks>

hook OnPlayerDisconnect(playerid, reason)
{
    if(GetPVarType(playerid, "ME_EditSlot") > 0)
    {
        new slot = GetPVarInt(playerid, "ME_EditSlot");
        DeletePVar(playerid, "ME_EditSlot");
        MapObjectEditor[slot] = INVALID_PLAYER_ID;
    }
    return 1;
}

hook OnPlayerSpawn(playerid)
{
    new is_admin = ME_IsAdmin(playerid);
    new hide_pref = GetPVarInt(playerid, "ME_HideLabels");

    foreach(new slot : MapObjects)
    {
        if(is_admin && hide_pref == 0)
        {
            Streamer_ToggleItem(playerid, STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], 1);
        }
        else
        {
            Streamer_ToggleItem(playerid, STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], 0);
        }
    }
    return 1;
}

hook OnDynamicObjectMoved(objectid)
{
    foreach(new slot : MapObjects)
    {
        if(MapObject[slot] != objectid) continue;
        new Float:pos[3];
        GetDynamicObjectPos(objectid, pos[0], pos[1], pos[2]);
        Streamer_SetFloatData(STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], E_STREAMER_X, pos[0]);
        Streamer_SetFloatData(STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], E_STREAMER_Y, pos[1]);
        Streamer_SetFloatData(STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], E_STREAMER_Z, pos[2]);
        break;
    }
    return 1;
}

hook OnPlayerSelectDynamicObj(playerid, objectid, modelid, Float:x, Float:y, Float:z)
{
    if(!ME_IsAdmin(playerid)) return 1;
    foreach(new slot : MapObjects)
    {
        if(MapObject[slot] != objectid) continue;
        if(MapObjectEditor[slot] != INVALID_PLAYER_ID)
        {
            new editor = MapObjectEditor[slot];
            return ObjErr(playerid, "Player %s is already editing this object!", ReturnPlayerName(editor)), 1;
        }
        MapObjectEditor[slot] = playerid;
        SetPVarInt(playerid, "ME_EditSlot", slot);
        EditDynamicObject(playerid, objectid);
        ObjMsg(playerid, "Selected object slot %d", slot);
        break;
    }
    return 1;
}

hook OnPlayerEditDynamicObj(playerid, objectid, response, Float:x, Float:y, Float:z, Float:rx, Float:ry, Float:rz)
{
    if(GetPVarType(playerid, "ME_EditSlot") == 0) return 1;

    new slot = GetPVarInt(playerid, "ME_EditSlot");

    if(response == EDIT_RESPONSE_FINAL)
    {
        DeletePVar(playerid, "ME_EditSlot");
        MapObjectEditor[slot] = INVALID_PLAYER_ID;
        SetDynamicObjectPos(objectid, x, y, z);
        SetDynamicObjectRot(objectid, rx, ry, rz);
        Streamer_SetFloatData(STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], E_STREAMER_X, x);
        Streamer_SetFloatData(STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], E_STREAMER_Y, y);
        Streamer_SetFloatData(STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], E_STREAMER_Z, z);

        // Auto-save if already in DB
        if(MapObjectDbId[slot] != 0)
            ME_SaveObject(slot);
    }
    else if(response == EDIT_RESPONSE_CANCEL)
    {
        DeletePVar(playerid, "ME_EditSlot");
        MapObjectEditor[slot] = INVALID_PLAYER_ID;
        // Restore previous position from streamer data
        new Float:cPos[3], Float:cRot[3];
        Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_X,   cPos[0]);
        Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_Y,   cPos[1]);
        Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_Z,   cPos[2]);
        Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_X, cRot[0]);
        Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_Y, cRot[1]);
        Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_Z, cRot[2]);
        SetDynamicObjectPos(objectid, cPos[0], cPos[1], cPos[2]);
        SetDynamicObjectRot(objectid, cRot[0], cRot[1], cRot[2]);
    }
    return 1;
}

hook OnPlayerShootDynamicObj(playerid, weaponid, objectid, Float:x, Float:y, Float:z)
{
    if(!ME_IsAdmin(playerid)) return 1;
    if(GetPVarType(playerid, "ME_PaintParam") != PLAYER_VARTYPE_STRING) return 1;

    foreach(new idx : MapObjects)
    {
        if(MapObject[idx] != objectid) continue;
        new var[256], index, model, txd[32], tex[32], colour;
        GetPVarString(playerid, "ME_PaintParam", var, sizeof(var));
        if(!unformat(var, "p<|>iis[32]s[32]i", index, model, txd, tex, colour))
        {
            SetDynamicObjectMaterial(MapObject[idx], index, model, txd, tex, colour);
            MapObjectMaterial[idx][index] = OBJ_MAT_TEXTURE;
        }
        break;
    }
    return 1;
}

// =============================================================================
//  SSCANF custom type: subcommand parser
// =============================================================================
SSCANF:objcmd(string[])
{
    if(!strcmp(string, "create",       true) || !strcmp(string, "add",      true)) return 1;
    if(!strcmp(string, "delete",       true) || !strcmp(string, "remove",   true) || !strcmp(string, "destroy", true)) return 2;
    if(!strcmp(string, "clear",        true) || !strcmp(string, "reset",    true)) return 3;
    if(!strcmp(string, "copy",         true) || !strcmp(string, "clone",    true) || !strcmp(string, "duplicate", true)) return 4;
    if(!strcmp(string, "move",         true)) return 5;
    if(!strcmp(string, "rot",          true) || !strcmp(string, "rotate",   true)) return 6;
    if(!strcmp(string, "select",       true) || !strcmp(string, "control",  true)) return 7;
    if(!strcmp(string, "tele",         true) || !strcmp(string, "goto",     true)) return 8;
    if(!strcmp(string, "texture",      true) || !strcmp(string, "material", true)) return 9;
    if(!strcmp(string, "resetmaterial",true) || !strcmp(string, "clearmaterial", true)) return 10;
    if(!strcmp(string, "textprop",     true)) return 11;
    if(!strcmp(string, "paintbrush",   true)) return 12;
    if(!strcmp(string, "model",        true)) return 13;
    if(!strcmp(string, "save",         true) || !strcmp(string, "export",   true)) return 14;
    if(!strcmp(string, "saveall",      true)) return 15;
    if(!strcmp(string, "load",         true) || !strcmp(string, "import",   true)) return 16;
    if(!strcmp(string, "group",        true)) return 17;
    if(!strcmp(string, "gcopy",        true) || !strcmp(string, "gclone",   true)) return 18;
    if(!strcmp(string, "gmove",        true)) return 19;
    if(!strcmp(string, "grot",         true) || !strcmp(string, "grotate",  true)) return 20;
    if(!strcmp(string, "gdelete",      true) || !strcmp(string, "gremove",  true) || !strcmp(string, "gdestroy", true)) return 21;
    if(!strcmp(string, "colour",       true) || !strcmp(string, "color",    true)) return 22;
    if(!strcmp(string, "list",         true)) return 23;
    if(!strcmp(string, "label",        true) || !strcmp(string, "togglelabel", true)) return 24;
    return 0;
}

// =============================================================================
//  Main Command /obj
// =============================================================================
CMD:obj(playerid, params[])
{
    if(!ME_IsAdmin(playerid))
        return ObjErr(playerid, "You need admin level 4+ to use this command."), 1;

    new item, subparam[128];
    sscanf(params, "K<objcmd>(0)S()[128]", item, subparam);

    switch(item)
    {
        // ── 1. Create ──────────────────────────────────────────────────────
        case 1:
        {
            if(IsNull(subparam))
                return ObjCmd(playerid, "/obj create [model id]"), 1;

            new model = strval(subparam);
            if(model == 0)
                return ObjErr(playerid, "Invalid model ID."), 1;

            new Float:pos[3];
            GetPlayerPos(playerid, pos[0], pos[1], pos[2]);
            pos[2] += 0.5;

            new slot = ME_CreateObject(model, pos[0], pos[1], pos[2]);
            if(slot == -1)
                return ObjErr(playerid, "Max object limit reached (%d).", MAX_MAP_OBJECTS), 1;

            Streamer_Update(playerid);
            ObjMsg(playerid, "Created object model %d — slot %d (total: %d). Use /obj save %d to persist.", model, slot, Iter_Count(MapObjects), slot);
        }

        // ── 2. Delete ─────────────────────────────────────────────────────
        case 2:
        {
            if(IsNull(subparam))
                return ObjCmd(playerid, "/obj delete [slot]"), 1;

            new slot = strval(subparam);
            if(!ME_IsValidSlot(slot))
                return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            ME_DeleteFromDb(slot);
            ME_DestroyObject(slot);
            ObjMsg(playerid, "Deleted slot %d (total: %d).", slot, Iter_Count(MapObjects));
        }

        // ── 3. Clear all ──────────────────────────────────────────────────
        case 3:
        {
            if(IsNull(subparam) || strcmp(subparam, "confirm", true))
                return ObjCmd(playerid, "/obj clear confirm — clears ALL objects from memory (not DB)."), 1;

            new cnt = Iter_Count(MapObjects);
            ME_DestroyAll();
            ObjMsg(playerid, "Cleared %d objects from memory.", cnt);
        }

        // ── 4. Copy / Clone ───────────────────────────────────────────────
        case 4:
        {
            if(IsNull(subparam))
                return ObjCmd(playerid, "/obj copy [slot]"), 1;

            new slot = strval(subparam);
            if(!ME_IsValidSlot(slot))
                return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            new Float:pos[3], Float:rot[3];
            GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
            GetDynamicObjectRot(MapObject[slot], rot[0], rot[1], rot[2]);
            new model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);

            new copyslot = ME_CreateObject(model, pos[0], pos[1], pos[2], rot[0], rot[1], rot[2], MapObjectGroup[slot]);
            if(copyslot == -1)
                return ObjErr(playerid, "Max object limit reached."), 1;

            // Copy materials
            for(new i = 0; i < MAX_OBJECT_MAT_SLOT; i++)
            {
                if(MapObjectMaterial[slot][i] == OBJ_MAT_TEXTURE)
                {
                    new mmodel, txd[32], tex[32], colour, alpha, red, green, blue;
                    GetDynamicObjectMaterial(MapObject[slot], i, mmodel, txd, tex, colour);
                    ME_HexToRGBA(colour, alpha, red, green, blue);
                    ME_SetMaterial(copyslot, i, mmodel, txd, tex, alpha, red, green, blue);
                }
                else if(MapObjectMaterial[slot][i] == OBJ_MAT_MESSAGE)
                {
                    new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
                    GetDynamicObjectMaterialText(MapObject[slot], i, text, size, font, fsize, bold, fcolor, bcolor, alignment);
                    SetDynamicObjectMaterialText(MapObject[copyslot], i, text, size, font, fsize, bold, fcolor, bcolor, alignment);
                    MapObjectMaterial[copyslot][i] = OBJ_MAT_MESSAGE;
                }
            }
            Streamer_Update(playerid);
            ObjMsg(playerid, "Cloned slot %d → slot %d (total: %d).", slot, copyslot, Iter_Count(MapObjects));
        }

        // ── 5. Move ───────────────────────────────────────────────────────
        case 5:
        {
            new slot, direction, Float:amount, Float:speed;
            if(sscanf(subparam, "icfF(5.0)", slot, direction, amount, speed))
                return ObjCmd(playerid, "/obj move [slot] [N/S/E/W/U/D/L/R/F/B] [amount] [opt:speed=5.0]"), 1;

            if(!ME_IsValidSlot(slot))
                return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            if(floatround(speed) <= 0)
                return ObjErr(playerid, "Speed must be > 0."), 1;

            new Float:cPos[4];
            GetDynamicObjectPos(MapObject[slot], cPos[0], cPos[1], cPos[2]);
            Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_Z, cPos[3]);

            switch(direction)
            {
                case 'N','n': cPos[1] += amount;
                case 'S','s': cPos[1] -= amount;
                case 'E','e': cPos[0] += amount;
                case 'W','w': cPos[0] -= amount;
                case 'U','u': cPos[2] += amount;
                case 'D','d': cPos[2] -= amount;
                case 'L','l': GetXYLeftOfPoint(cPos[0], cPos[1], cPos[0], cPos[1], cPos[3], amount);
                case 'R','r': GetXYRightOfPoint(cPos[0], cPos[1], cPos[0], cPos[1], cPos[3], amount);
                case 'F','f': GetXYInFrontOfPoint(cPos[0], cPos[1], cPos[0], cPos[1], cPos[3], amount);
                case 'B','b': GetXYBehindPoint(cPos[0], cPos[1], cPos[0], cPos[1], cPos[3], amount);
                default: return ObjErr(playerid, "Invalid direction! Use N/S/E/W/U/D/L/R/F/B."), 1;
            }
            if(IsDynamicObjectMoving(MapObject[slot])) StopDynamicObject(MapObject[slot]);
            MoveDynamicObject(MapObject[slot], cPos[0], cPos[1], cPos[2], speed);
        }

        // ── 6. Rotate ─────────────────────────────────────────────────────
        case 6:
        {
            new slot;
            new Float:rot[3];
            if(sscanf(subparam, "ifff", slot, rot[0], rot[1], rot[2]))
                return ObjCmd(playerid, "/obj rot [slot] [rx] [ry] [rz]"), 1;

            if(!ME_IsValidSlot(slot))
                return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            SetDynamicObjectRot(MapObject[slot], rot[0], rot[1], rot[2]);
        }

        // ── 7. Select (GTA built-in editor) ──────────────────────────────
        case 7:
        {
            if(GetPVarType(playerid, "ME_EditSlot") > 0)
                return ObjErr(playerid, "Release your current object first (press ESC in editor)."), 1;

            if(IsNull(subparam))
            {
                SelectObject(playerid);
                ObjMsg(playerid, "Click an object to select it.");
                return 1;
            }

            new slot = strval(subparam);
            if(!ME_IsValidSlot(slot))
                return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            if(MapObjectEditor[slot] != INVALID_PLAYER_ID)
                return ObjErr(playerid, "Another admin is editing this object."), 1;

            SetPVarInt(playerid, "ME_EditSlot", slot);
            MapObjectEditor[slot] = playerid;
            EditDynamicObject(playerid, MapObject[slot]);
            ObjMsg(playerid, "Editing slot %d.", slot);
        }

        // ── 8. Teleport to object ─────────────────────────────────────────
        case 8:
        {
            if(IsNull(subparam))
                return ObjCmd(playerid, "/obj tele [slot]"), 1;

            new slot = strval(subparam);
            if(!ME_IsValidSlot(slot))
                return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            new Float:pos[3];
            GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
            SetPlayerPos(playerid, pos[0], pos[1], pos[2] + 0.5);
            ObjMsg(playerid, "Teleported to slot %d.", slot);
        }

        // ── 9. Set Material (texture) ─────────────────────────────────────
        case 9:
        {
            new slot, index, model, txd[32], tex[32], color[4];
            if(sscanf(subparam, "iiis[32]s[32]I(0)I(0)I(0)I(0)", slot, index, model, txd, tex, color[0], color[1], color[2], color[3]))
                return ObjCmd(playerid, "/obj texture [slot] [idx] [model] [txd] [texture] [opt:A R G B]"), 1;

            if(!ME_IsValidSlot(slot)) return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;
            if(index < 0 || index >= MAX_OBJECT_MAT_SLOT) return ObjErr(playerid, "Index must be 0-9."), 1;

            ME_SetMaterial(slot, index, model, txd, tex, color[0], color[1], color[2], color[3]);
        }

        // ── 10. Reset Material ────────────────────────────────────────────
        case 10:
        {
            if(IsNull(subparam)) return ObjCmd(playerid, "/obj resetmaterial [slot]"), 1;

            new slot = strval(subparam);
            if(!ME_IsValidSlot(slot)) return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            ME_RemoveAllMaterials(slot);
            new model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);
            new Float:pos[3], Float:rot[3];
            GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
            GetDynamicObjectRot(MapObject[slot], rot[0], rot[1], rot[2]);
            new dbid = MapObjectDbId[slot];
            ME_DestroyObject(slot);
            new newslot = ME_CreateObject(model, pos[0], pos[1], pos[2], rot[0], rot[1], rot[2]);
            if(newslot != -1) { MapObjectDbId[newslot] = dbid; }
            Streamer_Update(playerid);
        }

        // ── 11. Text Property ─────────────────────────────────────────────
        case 11:
        {
            new slot, index;
            if(sscanf(subparam, "iI(0)", slot, index))
                return ObjCmd(playerid, "/obj textprop [slot] [opt:index=0]"), 1;

            if(!ME_IsValidSlot(slot)) return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;
            if(index < 0 || index >= MAX_OBJECT_MAT_SLOT) return ObjErr(playerid, "Index must be 0-9."), 1;

            if(MapObjectMaterial[slot][index] != OBJ_MAT_MESSAGE)
            {
                SetDynamicObjectMaterialText(MapObject[slot], index, "Text Here", OBJECT_MATERIAL_SIZE_256x128, "Arial", 24, 1, 0xFFFFFFFF, 0xFF000000);
                MapObjectMaterial[slot][index] = OBJ_MAT_MESSAGE;
            }
            SetPVarInt(playerid, "ME_EditSlot", slot);
            SetPVarInt(playerid, "ME_EditIndex", index);
            Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
                "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset",
                "Select", "Close");
        }

        // ── 12. Paintbrush ────────────────────────────────────────────────
        case 12:
        {
            new index, model, txd[32], tex[32], color[4];
            if(sscanf(subparam, "iis[32]s[32]I(0)I(0)I(0)I(0)", index, model, txd, tex, color[0], color[1], color[2], color[3]))
                return ObjCmd(playerid, "/obj paintbrush [idx] [model] [txd] [tex] [opt:A R G B]"), 1;

            new var[256];
            format(var, sizeof(var), "%d|%d|%s|%s|%x", index, model, txd, tex, ME_RGBAToHex(color[0], color[1], color[2], color[3]));
            SetPVarString(playerid, "ME_PaintParam", var);
            ObjMsg(playerid, "Paintbrush ready — shoot an object to apply texture.");
        }

        // ── 13. Change Model ──────────────────────────────────────────────
        case 13:
        {
            new slot, model;
            if(sscanf(subparam, "ii", slot, model))
                return ObjCmd(playerid, "/obj model [slot] [model id]"), 1;

            if(!ME_IsValidSlot(slot)) return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            new Float:pos[3], Float:rot[3];
            GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
            GetDynamicObjectRot(MapObject[slot], rot[0], rot[1], rot[2]);
            new dbid = MapObjectDbId[slot];
            ME_DestroyObject(slot);
            new newslot = ME_CreateObject(model, pos[0], pos[1], pos[2], rot[0], rot[1], rot[2]);
            if(newslot != -1) { MapObjectDbId[newslot] = dbid; }
            Streamer_Update(playerid);
            ObjMsg(playerid, "Changed slot model to %d.", model);
        }

        // ── 14. Save one object to MySQL ──────────────────────────────────
        case 14:
        {
            if(IsNull(subparam))
                return ObjCmd(playerid, "/obj save [slot]"), 1;

            new slot = strval(subparam);
            if(!ME_IsValidSlot(slot)) return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;

            new name[MAX_PLAYER_NAME];
            GetPlayerName(playerid, name, sizeof(name));
            ME_SaveObject(slot, name);
            ObjMsg(playerid, "Saved slot %d to database.", slot);
        }

        // ── 15. Save ALL objects to MySQL ─────────────────────────────────
        case 15:
        {
            new cnt = 0, name[MAX_PLAYER_NAME];
            GetPlayerName(playerid, name, sizeof(name));
            foreach(new slot : MapObjects)
            {
                ME_SaveObject(slot, name);
                cnt++;
            }
            ObjMsg(playerid, "Saved %d objects to database.", cnt);
        }

        // ── 16. Load / Import from .txt file ─────────────────────────────
        case 16:
        {
            if(IsNull(subparam))
                return ObjCmd(playerid, "/obj load [mapname]  — imports from scriptfiles/map/[name].txt"), 1;

            new path[96];
            format(path, sizeof(path), "map/%s.txt", subparam);
            if(!fexist(path))
                return ObjErr(playerid, "File %s not found.", path), 1;

            new
                File:f = fopen(path, io_read),
                line[512], model,
                Float:pos[3], Float:rot[3],
                count, last_slot = -1
            ;

            while(fread(f, line) > 0)
            {
                new p1 = strfind(line, "("), p2 = strfind(line, ")");
                if(p1 == -1 || p2 == -1) continue;

                if(strfind(line, "CreateObject") != -1 || strfind(line, "CreateDynamicObject") != -1)
                {
                    new args[256];
                    strmid(args, line, p1 + 1, p2);
                    if(!unformat(args, "p<,>iffffff", model, pos[0], pos[1], pos[2], rot[0], rot[1], rot[2]))
                    {
                        last_slot = ME_CreateObject(model, pos[0], pos[1], pos[2], rot[0], rot[1], rot[2]);
                        count++;
                    }
                }
                else if(strfind(line, "SetObjectMaterialText") != -1 && last_slot != -1)
                {
                    new args[256], text[128], idx, resolution, font[32], fsize, bold, fcolor, bcolor, alignment, conv[128];
                    strmid(args, line, p1 + 1, p2);
                    if(!unformat(args, "p<,>{s[32]}s[128]iis[32]I(24)I(1)X(0xFFFFFF)X(0x000000)I(1)", text, idx, resolution, font, fsize, bold, fcolor, bcolor, alignment))
                    {
                        if(idx >= 0 && idx < MAX_OBJECT_MAT_SLOT)
                        {
                            ME_UnescapeNewline(text, conv, sizeof(conv));
                            SetDynamicObjectMaterialText(MapObject[last_slot], idx, conv, resolution, font, fsize, bold, fcolor, bcolor, alignment);
                            MapObjectMaterial[last_slot][idx] = OBJ_MAT_MESSAGE;
                        }
                    }
                }
                else if((strfind(line, "SetObjectMaterial") != -1 || strfind(line, "SetDynamicObjectMaterial") != -1) && last_slot != -1)
                {
                    new args[256], idx, mmodel, txd[32], tex[32], colour;
                    strmid(args, line, p1 + 1, p2);
                    if(!unformat(args, "p<,>{s[32]}dds[32]s[32]X(0x000000)", idx, mmodel, txd, tex, colour))
                    {
                        if(idx >= 0 && idx < MAX_OBJECT_MAT_SLOT)
                        {
                            SetDynamicObjectMaterial(MapObject[last_slot], idx, mmodel, txd, tex, colour);
                            MapObjectMaterial[last_slot][idx] = OBJ_MAT_TEXTURE;
                        }
                    }
                }
            }
            fclose(f);
            ObjMsg(playerid, "Loaded %d objects from file '%s'. Use /obj saveall to persist.", count, subparam);
        }

        // ── 17. Set group ─────────────────────────────────────────────────
        case 17:
        {
            new slot, group;
            if(sscanf(subparam, "ii", slot, group))
                return ObjCmd(playerid, "/obj group [slot] [group id]"), 1;

            if(!ME_IsValidSlot(slot)) return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;
            MapObjectGroup[slot] = group;
            ME_UpdateLabel(slot);
            Streamer_Update(playerid, STREAMER_TYPE_3D_TEXT_LABEL);
        }

        // ── 18. Group Clone ───────────────────────────────────────────────
        case 18:
        {
            if(IsNull(subparam)) return ObjCmd(playerid, "/obj gcopy [group id]"), 1;

            new group = strval(subparam), cnt = 0;
            new slots[MAX_MAP_OBJECTS], nslots = 0;
            foreach(new slot : MapObjects)
                if(MapObjectGroup[slot] == group) slots[nslots++] = slot;

            for(new i = 0; i < nslots; i++)
            {
                new slot = slots[i];
                new Float:pos[3], Float:rot[3];
                GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
                GetDynamicObjectRot(MapObject[slot], rot[0], rot[1], rot[2]);
                new model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);
                new copyslot = ME_CreateObject(model, pos[0], pos[1], pos[2], rot[0], rot[1], rot[2], MapObjectGroup[slot] + 1);
                if(copyslot != -1) cnt++;
            }
            Streamer_Update(playerid);
            ObjMsg(playerid, "Cloned group %d (%d objects) → group %d.", group, cnt, group + 1);
        }

        // ── 19. Group Move ────────────────────────────────────────────────
        case 19:
        {
            new group, direction, Float:amount, Float:speed;
            if(sscanf(subparam, "icfF(5.0)", group, direction, amount, speed))
                return ObjCmd(playerid, "/obj gmove [group] [N/S/E/W/U/D] [amount] [opt:speed=5.0]"), 1;

            foreach(new slot : MapObjects)
            {
                if(MapObjectGroup[slot] != group) continue;
                new Float:cPos[4];
                GetDynamicObjectPos(MapObject[slot], cPos[0], cPos[1], cPos[2]);
                Streamer_GetFloatData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_R_Z, cPos[3]);
                switch(direction)
                {
                    case 'N','n': cPos[1] += amount;
                    case 'S','s': cPos[1] -= amount;
                    case 'E','e': cPos[0] += amount;
                    case 'W','w': cPos[0] -= amount;
                    case 'U','u': cPos[2] += amount;
                    case 'D','d': cPos[2] -= amount;
                }
                if(IsDynamicObjectMoving(MapObject[slot])) StopDynamicObject(MapObject[slot]);
                MoveDynamicObject(MapObject[slot], cPos[0], cPos[1], cPos[2], speed);
            }
        }

        // ── 20. Group Rotate ──────────────────────────────────────────────
        case 20:
        {
            new group;
            new Float:rot[3];
            if(sscanf(subparam, "ifff", group, rot[0], rot[1], rot[2]))
                return ObjCmd(playerid, "/obj grotate [group] [rx] [ry] [rz]"), 1;

            foreach(new slot : MapObjects)
            {
                if(MapObjectGroup[slot] != group) continue;
                SetDynamicObjectRot(MapObject[slot], rot[0], rot[1], rot[2]);
            }
        }

        // ── 21. Group Delete ──────────────────────────────────────────────
        case 21:
        {
            if(IsNull(subparam)) return ObjCmd(playerid, "/obj gdelete [group id]"), 1;

            new group = strval(subparam), cnt = 0;
            new slots[MAX_MAP_OBJECTS], nslots = 0;
            foreach(new slot : MapObjects)
                if(MapObjectGroup[slot] == group) slots[nslots++] = slot;

            for(new i = 0; i < nslots; i++)
            {
                ME_DeleteFromDb(slots[i]);
                ME_DestroyObject(slots[i]);
                cnt++;
            }
            ObjMsg(playerid, "Deleted %d objects from group %d.", cnt, group);
        }

        // ── 22. Set Colour ────────────────────────────────────────────────
        case 22:
        {
            new slot, index, colour[4];
            if(sscanf(subparam, "iiiiii", slot, index, colour[0], colour[1], colour[2], colour[3]))
                return ObjCmd(playerid, "/obj colour [slot] [idx] [alpha] [red] [green] [blue]"), 1;

            if(!ME_IsValidSlot(slot)) return ObjErr(playerid, "Slot %d doesn't exist.", slot), 1;
            ME_SetMaterial(slot, index, -1, "none", "none", colour[0], colour[1], colour[2], colour[3]);
        }

        // ── 23. List ──────────────────────────────────────────────────────
        case 23:
        {
            new str[512], cnt = 0;
            format(str, sizeof(str), "Total: %d objects in memory, %d in database.\n", Iter_Count(MapObjects), Iter_Count(MapObjects));
            foreach(new slot : MapObjects)
            {
                new model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);
                new Float:pos[3];
                GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
                new line[64];
                format(line, sizeof(line), "[%d] mdl:%d grp:%d db:%d\n", slot, model, MapObjectGroup[slot], MapObjectDbId[slot]);
                if(strlen(str) + strlen(line) < sizeof(str) - 1)
                    strcat(str, line);
                cnt++;
                if(cnt >= 20) { strcat(str, "... (truncated)"); break; }
            }
            Dialog_Show(playerid, ME_ListDialog, DIALOG_STYLE_MSGBOX, "Map Objects", str, "OK", "");
        }

        // ── 24. Toggle label visibility for player ────────────────────────
        case 24:
        {
            new toggle = GetPVarInt(playerid, "ME_HideLabels");
            if(toggle == 0)
            {
                SetPVarInt(playerid, "ME_HideLabels", 1);
                foreach(new slot : MapObjects)
                {
                    Streamer_ToggleItem(playerid, STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], 0);
                }
                ObjMsg(playerid, "Labels hidden successfully.");
            }
            else
            {
                SetPVarInt(playerid, "ME_HideLabels", 0);
                foreach(new slot : MapObjects)
                {
                    Streamer_ToggleItem(playerid, STREAMER_TYPE_3D_TEXT_LABEL, MapObjectLabel[slot], 1);
                }
                ObjMsg(playerid, "Labels shown successfully.");
            }
        }

        // ── Default: help ─────────────────────────────────────────────────
        default:
        {
            ObjCmd(playerid, "/obj [create|delete|clear|copy|move|rot|select|tele]");
            ObjCmd(playerid, "/obj [texture|resetmaterial|textprop|paintbrush|model|colour]");
            ObjCmd(playerid, "/obj [save|saveall|load|list|label]");
            ObjCmd(playerid, "/obj [group|gcopy|gmove|grotate|gdelete]");
        }
    }
    return 1;
}

// Alias /obj → same command
YCMD:mapedit(playerid, params[], help) = obj;

// =============================================================================
//  Material Text Dialogs
// =============================================================================
Dialog:ME_ListDialog(playerid, response, listitem, inputtext[])
{
    return 1;
}

Dialog:ME_TextMenu(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");

    if(!response)
    {
        DeletePVar(playerid, "ME_EditSlot");
        DeletePVar(playerid, "ME_EditIndex");
        return 1;
    }

    switch(listitem)
    {
        case 0: Dialog_Show(playerid, ME_TextSetMsg,   DIALOG_STYLE_INPUT, "Set Text",        "Enter text (use \\n for newline):", "Set", "Back");
        case 1: Dialog_Show(playerid, ME_TextSetRes,   DIALOG_STYLE_LIST,  "Set Resolution",  "32x32\n64x32\n64x64\n128x32\n128x64\n128x128\n256x32\n256x64\n256x128\n256x256\n512x64\n512x128\n512x256\n512x512", "Set", "Back");
        case 2:
        {
            new fonts[] = "Arial\nCalibri\nComic Sans MS\nGeorgia\nTimes New Roman\nConsolas\nCourier New\nImpact\nTahoma\nVerdana\nCustom";
            Dialog_Show(playerid, ME_TextSetFont, DIALOG_STYLE_LIST, "Set Font", fonts, "Set", "Back");
        }
        case 3: Dialog_Show(playerid, ME_TextSetFSize, DIALOG_STYLE_INPUT, "Set Font Size",   "Enter font size (1-255):", "Set", "Back");
        case 4:
        {
            // Toggle bold
            new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
            GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
            SetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold ? 0 : 1, fcolor, bcolor, alignment);
            Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
                "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
        }
        case 5: Dialog_Show(playerid, ME_TextSetFColor, DIALOG_STYLE_INPUT, "Set Font Color",  "Enter RGBA: ex {FF0000}255 0 0 255", "Set", "Back");
        case 6: Dialog_Show(playerid, ME_TextSetBColor, DIALOG_STYLE_INPUT, "Set BG Color",    "Enter RGBA: ex {000000}0 0 0 255", "Set", "Back");
        case 7: Dialog_Show(playerid, ME_TextSetAlign,  DIALOG_STYLE_LIST,  "Set Alignment",   "Left\nCenter\nRight", "Set", "Back");
        case 8:
        {
            // Reset text material
            MapObjectMaterial[slot][index] = OBJ_MAT_NONE;
            new Float:pos[3];
            GetDynamicObjectPos(MapObject[slot], pos[0], pos[1], pos[2]);
            new model = Streamer_GetIntData(STREAMER_TYPE_OBJECT, MapObject[slot], E_STREAMER_MODEL_ID);
            new dbid = MapObjectDbId[slot], grp = MapObjectGroup[slot];
            new Float:rot[3];
            GetDynamicObjectRot(MapObject[slot], rot[0], rot[1], rot[2]);
            ME_DestroyObject(slot);
            new nslot = ME_CreateObject(model, pos[0], pos[1], pos[2], rot[0], rot[1], rot[2], grp);
            if(nslot != -1) MapObjectDbId[nslot] = dbid;
            ObjMsg(playerid, "Material text reset for slot %d.", slot);
        }
    }
    return 1;
}

Dialog:ME_TextSetMsg(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");
    if(response && !IsNull(inputtext))
    {
        new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment, conv[256];
        GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
        ME_UnescapeNewline(inputtext, conv, sizeof(conv));
        SetDynamicObjectMaterialText(MapObject[slot], index, conv, size, font, fsize, bold, fcolor, bcolor, alignment);
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}

Dialog:ME_TextSetRes(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");
    if(response)
    {
        new sizes[] = {32, 64, 64, 128, 128, 128, 256, 256, 256, 256, 512, 512, 512, 512};
        new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
        GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
        size = (listitem < sizeof(sizes)) ? sizes[listitem] : 256;
        SetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}

Dialog:ME_TextSetFont(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");

    new fontList[][] = {"Arial","Calibri","Comic Sans MS","Georgia","Times New Roman","Consolas","Courier New","Impact","Tahoma","Verdana"};

    if(response)
    {
        if(listitem < sizeof(fontList))
        {
            new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
            GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
            SetDynamicObjectMaterialText(MapObject[slot], index, text, size, fontList[listitem], fsize, bold, fcolor, bcolor, alignment);
        }
        else
        {
            Dialog_Show(playerid, ME_TextSetCustomFont, DIALOG_STYLE_INPUT, "Custom Font", "Enter font name:", "Set", "Back");
            return 1;
        }
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}

Dialog:ME_TextSetCustomFont(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");
    if(response && !IsNull(inputtext))
    {
        new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
        GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
        SetDynamicObjectMaterialText(MapObject[slot], index, text, size, inputtext, fsize, bold, fcolor, bcolor, alignment);
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}

Dialog:ME_TextSetFSize(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");
    if(response && !IsNull(inputtext))
    {
        new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
        GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
        SetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, strval(inputtext), bold, fcolor, bcolor, alignment);
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}

Dialog:ME_TextSetFColor(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");
    if(response)
    {
        new a, r, g, b;
        if(!sscanf(inputtext, "dddd", r, g, b, a))
        {
            new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
            GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
            SetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, ME_RGBAToHex(a, r, g, b), bcolor, alignment);
        }
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}

Dialog:ME_TextSetBColor(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");
    if(response)
    {
        new a, r, g, b;
        if(!sscanf(inputtext, "dddd", r, g, b, a))
        {
            new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
            GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
            SetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, ME_RGBAToHex(a, r, g, b), alignment);
        }
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}

Dialog:ME_TextSetAlign(playerid, response, listitem, inputtext[])
{
    new slot  = GetPVarInt(playerid, "ME_EditSlot");
    new index = GetPVarInt(playerid, "ME_EditIndex");
    if(response)
    {
        new text[256], size, font[32], fsize, bold, fcolor, bcolor, alignment;
        GetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, alignment);
        SetDynamicObjectMaterialText(MapObject[slot], index, text, size, font, fsize, bold, fcolor, bcolor, listitem);
    }
    Dialog_Show(playerid, ME_TextMenu, DIALOG_STYLE_LIST, "Material Text",
        "Set Text\nResolution\nFont\nFont Size\nToggle Bold\nFont Color\nBG Color\nAlignment\nReset", "Select", "Close");
    return 1;
}
