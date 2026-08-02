/*
 * MappingRequest.pwn — User-Submitted Property Mapping System
 * Ponytail Mode: Clean, modular, zero-boilerplate, YAGNI compliant.
 */

#if !defined DIALOG_MAPPING_LOAD
    #define DIALOG_MAPPING_LOAD 16100
#endif
#if !defined DIALOG_MAPPING_REMOVE
    #define DIALOG_MAPPING_REMOVE 16101
#endif
#if !defined DIALOG_MAPPING_SAVED
    #define DIALOG_MAPPING_SAVED 16102
#endif
#if !defined DIALOG_MAPPING_DELETE
    #define DIALOG_MAPPING_DELETE 16103
#endif

#define MAPPING_OFFSET_APPROVED 200000
#define MAPPING_OFFSET_PREVIEW 300000

// Preview objects per player (admin)
#define MAX_PREVIEW_OBJECTS 2000
new PlayerPreviewObjects[MAX_PLAYERS][MAX_PREVIEW_OBJECTS];
new PlayerPreviewCount[MAX_PLAYERS];

// Temporary storage of pending request IDs for the dialog selection
#define MAX_PENDING_LIST 128
new AdminPendingRequestID[MAX_PLAYERS][MAX_PENDING_LIST];
new AdminPendingCount[MAX_PLAYERS];

/* ── Helper Functions to Get Slots by DB ID ── */

stock Property_GetSlotByID(db_id)
{
    for(new i = 0; i < MAX_PROPERTIES; ++i)
    {
        if(PropertyData[i][hID] == db_id)
            return i;
    }
    return -1;
}

stock Business_GetSlotByID(db_id)
{
    for(new i = 0; i < MAX_BUSINESS; ++i)
    {
        if(BusinessData[i][bID] == db_id)
            return i;
    }
    return -1;
}

stock Complex_GetSlotByID(db_id)
{
    for(new i = 0; i < MAX_COMPLEXES; ++i)
    {
        if(ComplexData[i][aID] == db_id)
            return i;
    }
    return -1;
}

stock DetectMappingLocation(prop_type, prop_id, const code[], &world, &interior)
{
    if(prop_type == 4)
    {
        // Try parsing world and interior from the first CreateDynamicObject line
        new pos = 0;
        static line[256];
        if ((pos = strfind(code, "CreateDynamicObject", true, pos)) != -1)
        {
            new start_param = strfind(code, "(", true, pos);
            if (start_param != -1)
            {
                start_param += 1;
                new end_param = strfind(code, ")", true, start_param);
                if (end_param != -1)
                {
                    new len = end_param - start_param;
                    if (len > 0 && len < sizeof(line))
                    {
                        strmid(line, code, start_param, end_param, sizeof(line));
                        new modelid, Float:ox, Float:oy, Float:oz, Float:rx, Float:ry, Float:rz, w, i;
                        if (!sscanf(line, "p<,>dffffffdd", modelid, ox, oy, oz, rx, ry, rz, w, i))
                        {
                            world = w;
                            interior = i;
                            return;
                        }
                    }
                }
            }
        }
        world = 0;
        interior = 0;
        return;
    }

    // Find the first object in the code to get its coordinates
    new pos = 0;
    static line[256];
    
    if ((pos = strfind(code, "Create", true, pos)) != -1)
    {
        new bool:is_dynamic = false;
        new bool:is_neutral = false;

        if (strfind(code, "CreateDynamicObject", true, pos) == pos) is_dynamic = true;
        else if (strfind(code, "CreateObject", true, pos) == pos) is_neutral = true;

        if (is_dynamic || is_neutral)
        {
            new start_param = strfind(code, "(", true, pos);
            if (start_param != -1)
            {
                start_param += 1;
                new end_param = strfind(code, ")", true, start_param);
                if (end_param != -1)
                {
                    new len = end_param - start_param;
                    if (len > 0 && len < sizeof(line))
                    {
                        strmid(line, code, start_param, end_param, sizeof(line));
                        
                        new modelid;
                        new Float:ox, Float:oy, Float:oz;
                        new Float:rx, Float:ry, Float:rz;
                        
                        if (!sscanf(line, "p<,>dffffff", modelid, ox, oy, oz, rx, ry, rz))
                        {
                            new Float:ent_x = 0.0, Float:ent_y = 0.0, Float:ent_z = 0.0;
                            new Float:ext_x = 0.0, Float:ext_y = 0.0, Float:ext_z = 0.0;
                            new prop_world = 0, prop_interior = 0;

                            if (prop_type == 1) // House
                            {
                                new slot = Property_GetSlotByID(prop_id);
                                if (slot != -1)
                                {
                                    ent_x = PropertyData[slot][hEntranceX];
                                    ent_y = PropertyData[slot][hEntranceY];
                                    ent_z = PropertyData[slot][hEntranceZ];
                                    
                                    ext_x = PropertyData[slot][hExitX];
                                    ext_y = PropertyData[slot][hExitY];
                                    ext_z = PropertyData[slot][hExitZ];
                                    
                                    prop_world = PropertyData[slot][hWorld];
                                    prop_interior = PropertyData[slot][hInterior];
                                }
                            }
                            else if (prop_type == 2) // Business
                            {
                                new slot = Business_GetSlotByID(prop_id);
                                if (slot != -1)
                                {
                                    ent_x = BusinessData[slot][bEntranceX];
                                    ent_y = BusinessData[slot][bEntranceY];
                                    ent_z = BusinessData[slot][bEntranceZ];
                                    
                                    ext_x = BusinessData[slot][bExitX];
                                    ext_y = BusinessData[slot][bExitY];
                                    ext_z = BusinessData[slot][bExitZ];
                                    
                                    prop_world = BusinessData[slot][bWorld];
                                    prop_interior = BusinessData[slot][bInterior];
                                }
                            }
                            else if (prop_type == 3) // Apartment
                            {
                                new slot = Complex_GetSlotByID(prop_id);
                                if (slot != -1)
                                {
                                    ent_x = ComplexData[slot][aEntranceX];
                                    ent_y = ComplexData[slot][aEntranceY];
                                    ent_z = ComplexData[slot][aEntranceZ];
                                    
                                    ext_x = ComplexData[slot][aExitX];
                                    ext_y = ComplexData[slot][aExitY];
                                    ext_z = ComplexData[slot][aExitZ];
                                    
                                    prop_world = ComplexData[slot][aWorld];
                                    prop_interior = ComplexData[slot][aInterior];
                                }
                            }

                            new Float:dist_ent = floatsqroot(((ox-ent_x)*(ox-ent_x))+((oy-ent_y)*(oy-ent_y))+((oz-ent_z)*(oz-ent_z)));
                            new Float:dist_ext = floatsqroot(((ox-ext_x)*(ox-ext_x))+((oy-ext_y)*(oy-ext_y))+((oz-ext_z)*(oz-ext_z)));

                            if (dist_ent < dist_ext)
                            {
                                // Closer to entrance -> Exterior mapping (VW 0, Interior 0)
                                world = 0;
                                interior = 0;
                            }
                            else
                            {
                                // Closer to exit -> Interior mapping (VW & Interior of property)
                                world = prop_world;
                                interior = prop_interior;
                            }
                            return;
                        }
                    }
                }
            }
        }
    }
}

/* ── Spawning and Cleanup Logic ── */

stock ClearPreviewObjects(playerid)
{
    if(PlayerPreviewCount[playerid] > 0)
    {
        for(new i = 0; i < PlayerPreviewCount[playerid]; ++i)
        {
            new obj = PlayerPreviewObjects[playerid][i];
            if(IsValidDynamicObject(obj))
            {
                DestroyDynamicObject(obj);
            }
        }
        PlayerPreviewCount[playerid] = 0;
    }
}

stock MapRequest_HexToInt(const string[])
{
    new i = 0;
    // Skip leading spaces
    while (string[i] == ' ' || string[i] == '\t') i++;

    if (string[i] == '0' && (string[i+1] == 'x' || string[i+1] == 'X'))
    {
        i += 2;
    }
    
    new val = 0;
    while (string[i] != '\0')
    {
        new c = string[i];
        new digit = 0;
        
        if (c >= '0' && c <= '9') digit = c - '0';
        else if (c >= 'a' && c <= 'f') digit = c - 'a' + 10;
        else if (c >= 'A' && c <= 'F') digit = c - 'A' + 10;
        else break; // Non-hex character
        
        val = (val * 16) + digit;
        i++;
    }
    return val;
}

stock MapRequest_ParseColor(const string[])
{
    new i = 0;
    while (string[i] == ' ' || string[i] == '\t') i++;
    
    if (string[i] == '0' && (string[i+1] == 'x' || string[i+1] == 'X'))
    {
        return MapRequest_HexToInt(string[i]);
    }
    else
    {
        return strval(string[i]);
    }
}

stock ApplyMaterialFromLine(obj, const param_string[])
{
    printf("[ApplyMaterial] Calling ApplyMaterialFromLine for obj %d, params: '%s'", obj, param_string);
    if (obj == INVALID_OBJECT_ID) {
        printf("[ApplyMaterial] Error: obj is INVALID_OBJECT_ID");
        return 0;
    }

    new first_quote = strfind(param_string, "\"", true);
    if (first_quote == -1) {
        printf("[ApplyMaterial] Error: first_quote not found");
        return 0;
    }

    static before_quote[32];
    strmid(before_quote, param_string, 0, first_quote);

    new mat_idx = 0, model_id = 0;
    new err = sscanf(before_quote, "p<,>dd", mat_idx, model_id);
    if (err) {
        printf("[ApplyMaterial] Error: sscanf before_quote '%s' failed with code %d", before_quote, err);
        return 0;
    }

    new second_quote = strfind(param_string, "\"", true, first_quote + 1);
    if (second_quote == -1) {
        printf("[ApplyMaterial] Error: second_quote not found");
        return 0;
    }

    static txd_name[64];
    strmid(txd_name, param_string, first_quote + 1, second_quote);

    new third_quote = strfind(param_string, "\"", true, second_quote + 1);
    if (third_quote == -1) {
        printf("[ApplyMaterial] Error: third_quote not found");
        return 0;
    }

    new fourth_quote = strfind(param_string, "\"", true, third_quote + 1);
    if (fourth_quote == -1) {
        printf("[ApplyMaterial] Error: fourth_quote not found");
        return 0;
    }

    static tex_name[64];
    strmid(tex_name, param_string, third_quote + 1, fourth_quote);

    new mat_color = 0;
    new last_comma = strfind(param_string, ",", true, fourth_quote + 1);
    if (last_comma != -1)
    {
        static p_color[32];
        strmid(p_color, param_string, last_comma + 1, strlen(param_string));
        mat_color = MapRequest_ParseColor(p_color);
    }

    printf("[ApplyMaterial] Success! Setting mat: idx %d, model %d, txd '%s', tex '%s', color 0x%x", mat_idx, model_id, txd_name, tex_name, mat_color);
    SetDynamicObjectMaterial(obj, mat_idx, model_id, txd_name, tex_name, mat_color);
    return 1;
}

stock ApplyMaterialTextFromLine(obj, const param_string[])
{
    printf("[ApplyMaterialText] Calling for obj %d, params: '%s'", obj, param_string);
    if (obj == INVALID_OBJECT_ID) return 0;

    new first_quote = strfind(param_string, "\"", true);
    if (first_quote == -1) return 0;

    new second_quote = strfind(param_string, "\"", true, first_quote + 1);
    if (second_quote == -1) return 0;

    static text_val[256];
    strmid(text_val, param_string, first_quote + 1, second_quote);

    // Replace escaped \n with actual newline character
    for(new i = 0; text_val[i] != '\0'; ++i)
    {
        if(text_val[i] == '\\' && text_val[i+1] == 'n')
        {
            text_val[i] = '\n';
            // Shift rest of the string
            for(new j = i + 1; text_val[j] != '\0'; ++j)
            {
                text_val[j] = text_val[j+1];
            }
        }
    }

    new third_quote = strfind(param_string, "\"", true, second_quote + 1);
    if (third_quote == -1) return 0;

    new fourth_quote = strfind(param_string, "\"", true, third_quote + 1);
    if (fourth_quote == -1) return 0;

    static font_face[32];
    strmid(font_face, param_string, third_quote + 1, fourth_quote);

    // Parse mid parameters (between 2nd and 3rd quote): e.g. ", 0, 130, "
    static mid_params[32];
    strmid(mid_params, param_string, second_quote + 1, third_quote);
    
    new mat_idx = 0, mat_size = 0;
    new mid_comma = strfind(mid_params, ",", true);
    if (mid_comma != -1)
    {
        sscanf(mid_params[mid_comma + 1], "p<,>dd", mat_idx, mat_size);
    }

    // Parse end parameters (after 4th quote): e.g. ", 50, 1, 0xFFFFFFFF, 0x00000000, 1"
    new end_comma = strfind(param_string, ",", true, fourth_quote + 1);
    
    new font_size = 24, bold = 1, font_color = 0xFFFFFFFF, back_color = 0, align = 0;
    if (end_comma != -1)
    {
        static sub[128];
        strmid(sub, param_string, end_comma + 1, strlen(param_string));
        
        new c1 = strfind(sub, ",", true);
        if (c1 != -1)
        {
            static p_size[16]; strmid(p_size, sub, 0, c1);
            font_size = strval(p_size);
            
            new c2 = strfind(sub, ",", true, c1 + 1);
            if (c2 != -1)
            {
                static p_bold[16]; strmid(p_bold, sub, c1 + 1, c2);
                bold = strval(p_bold);
                
                new c3 = strfind(sub, ",", true, c2 + 1);
                if (c3 != -1)
                {
                    static p_fcolor[32]; strmid(p_fcolor, sub, c2 + 1, c3);
                    font_color = MapRequest_ParseColor(p_fcolor);
                    
                    new c4 = strfind(sub, ",", true, c3 + 1);
                    if (c4 != -1)
                    {
                        static p_bcolor[32]; strmid(p_bcolor, sub, c3 + 1, c4);
                        back_color = MapRequest_ParseColor(p_bcolor);
                        
                        static p_align[16]; strmid(p_align, sub, c4 + 1, strlen(sub));
                        align = strval(p_align);
                    }
                    else
                    {
                        static p_bcolor[32]; strmid(p_bcolor, sub, c3 + 1, strlen(sub));
                        back_color = MapRequest_ParseColor(p_bcolor);
                    }
                }
                else
                {
                    static p_fcolor[32]; strmid(p_fcolor, sub, c2 + 1, strlen(sub));
                    font_color = MapRequest_ParseColor(p_fcolor);
                }
            }
            else
            {
                static p_bold[16]; strmid(p_bold, sub, c1 + 1, strlen(sub));
                bold = strval(p_bold);
            }
        }
        else
        {
            font_size = strval(sub);
        }
    }

    printf("[ApplyMaterialText] Success! idx %d, text '%s', size %d, font '%s', fontsize %d, color 0x%x, back_color 0x%x, align %d", mat_idx, text_val, mat_size, font_face, font_size, font_color, back_color, align);
    SetDynamicObjectMaterialText(obj, mat_idx, text_val, mat_size, font_face, font_size, bold, font_color, back_color, align);
    return 1;
}

stock SpawnMappingObjects(const code[], worldid, interiorid, mapping_db_id = 0)
{
    new pos = 0;
    static line[256];
    new count = 0;
    new last_obj = INVALID_OBJECT_ID;

    while (pos < strlen(code))
    {
        new next_create = strfind(code, "Create", true, pos);
        new next_set = strfind(code, "Set", true, pos);
        
        new type = 0; // 0 = none, 1 = Create, 2 = Set
        new next_pos = -1;
        
        if (next_create != -1 && (next_set == -1 || next_create < next_set))
        {
            next_pos = next_create;
            type = 1;
        }
        else if (next_set != -1)
        {
            next_pos = next_set;
            type = 2;
        }
        
        if (next_pos == -1) break;
        
        pos = next_pos;

        if (type == 1) // Create
        {
            new bool:is_dynamic = false;
            new bool:is_neutral = false;

            if (strfind(code, "CreateDynamicObject", true, pos) == pos) is_dynamic = true;
            else if (strfind(code, "CreateObject", true, pos) == pos) is_neutral = true;

            if (!is_dynamic && !is_neutral)
            {
                pos += 6;
                continue;
            }

            new start_param = strfind(code, "(", true, pos);
            if (start_param == -1) {
                pos += 6;
                continue;
            }
            start_param += 1;

            new end_param = strfind(code, ")", true, start_param);
            if (end_param == -1) {
                pos += 6;
                continue;
            }

            new len = end_param - start_param;
            if (len > 0 && len < sizeof(line))
            {
                strmid(line, code, start_param, end_param, sizeof(line));
                
                new modelid;
                new Float:x, Float:y, Float:z;
                new Float:rx, Float:ry, Float:rz;
                new obj_w = worldid, obj_i = interiorid;
                
                if (!sscanf(line, "p<,>dffffffdd", modelid, x, y, z, rx, ry, rz, obj_w, obj_i))
                {
                    new obj = CreateDynamicObject(modelid, x, y, z, rx, ry, rz, obj_w, obj_i);
                    if (obj != INVALID_OBJECT_ID)
                    {
                        if (mapping_db_id > 0)
                        {
                            // Approved mapping: tag with DB ID offset
                            Streamer_SetIntData(STREAMER_TYPE_OBJECT, obj, E_STREAMER_EXTRA_ID, MAPPING_OFFSET_APPROVED + mapping_db_id);
                        }
                        last_obj = obj;
                        count++;
                    }
                }
                else if (!sscanf(line, "p<,>dffffff", modelid, x, y, z, rx, ry, rz))
                {
                    new obj = CreateDynamicObject(modelid, x, y, z, rx, ry, rz, worldid, interiorid);
                    if (obj != INVALID_OBJECT_ID)
                    {
                        if (mapping_db_id > 0)
                        {
                            // Approved mapping: tag with DB ID offset
                            Streamer_SetIntData(STREAMER_TYPE_OBJECT, obj, E_STREAMER_EXTRA_ID, MAPPING_OFFSET_APPROVED + mapping_db_id);
                        }
                        last_obj = obj;
                        count++;
                    }
                }
            }
            pos = end_param + 1;
        }
        else if (type == 2) // Set (Material or Text)
        {
            new bool:is_text = false;
            new bool:is_material = false;
            
            if (strfind(code, "SetDynamicObjectMaterialText", true, pos) == pos || strfind(code, "SetObjectMaterialText", true, pos) == pos)
            {
                is_text = true;
            }
            else if (strfind(code, "SetDynamicObjectMaterial", true, pos) == pos || strfind(code, "SetObjectMaterial", true, pos) == pos)
            {
                is_material = true;
            }

            if (!is_text && !is_material)
            {
                pos += 3;
                continue;
            }

            new start_param = strfind(code, "(", true, pos);
            if (start_param == -1) {
                pos += 3;
                continue;
            }
            start_param += 1;

            new end_param = strfind(code, ")", true, start_param);
            if (end_param == -1) {
                pos += 3;
                continue;
            }

            new len = end_param - start_param;
            if (len > 0 && len < sizeof(line))
            {
                strmid(line, code, start_param, end_param, sizeof(line));
                new first_comma = strfind(line, ",", true);
                if (first_comma != -1)
                {
                    if (is_text)
                    {
                        ApplyMaterialTextFromLine(last_obj, line[first_comma + 1]);
                    }
                    else if (is_material)
                    {
                        ApplyMaterialFromLine(last_obj, line[first_comma + 1]);
                    }
                }
            }
            pos = end_param + 1;
        }
    }
    return count;
}

stock SpawnPreviewObjects(playerid, const code[], worldid, interiorid)
{
    ClearPreviewObjects(playerid);

    new pos = 0;
    static line[256];
    new count = 0;
    new last_obj = INVALID_OBJECT_ID;

    while (pos < strlen(code))
    {
        if (count >= MAX_PREVIEW_OBJECTS) break;

        new next_create = strfind(code, "Create", true, pos);
        new next_set = strfind(code, "Set", true, pos);
        
        new type = 0; // 0 = none, 1 = Create, 2 = Set
        new next_pos = -1;
        
        if (next_create != -1 && (next_set == -1 || next_create < next_set))
        {
            next_pos = next_create;
            type = 1;
        }
        else if (next_set != -1)
        {
            next_pos = next_set;
            type = 2;
        }
        
        if (next_pos == -1) break;
        
        pos = next_pos;

        if (type == 1) // Create
        {
            new bool:is_dynamic = false;
            new bool:is_neutral = false;

            if (strfind(code, "CreateDynamicObject", true, pos) == pos) is_dynamic = true;
            else if (strfind(code, "CreateObject", true, pos) == pos) is_neutral = true;

            if (!is_dynamic && !is_neutral)
            {
                pos += 6;
                continue;
            }

            new start_param = strfind(code, "(", true, pos);
            if (start_param == -1) {
                pos += 6;
                continue;
            }
            start_param += 1;

            new end_param = strfind(code, ")", true, start_param);
            if (end_param == -1) {
                pos += 6;
                continue;
            }

            new len = end_param - start_param;
            if (len > 0 && len < sizeof(line))
            {
                strmid(line, code, start_param, end_param, sizeof(line));
                
                new modelid;
                new Float:x, Float:y, Float:z;
                new Float:rx, Float:ry, Float:rz;
                new obj_w = worldid, obj_i = interiorid;
                
                if (!sscanf(line, "p<,>dffffffdd", modelid, x, y, z, rx, ry, rz, obj_w, obj_i))
                {
                    new obj = CreateDynamicObject(modelid, x, y, z, rx, ry, rz, obj_w, obj_i);
                    if (obj != INVALID_OBJECT_ID)
                    {
                        Streamer_SetIntData(STREAMER_TYPE_OBJECT, obj, E_STREAMER_EXTRA_ID, MAPPING_OFFSET_PREVIEW);
                        PlayerPreviewObjects[playerid][count] = obj;
                        last_obj = obj;
                        count++;
                    }
                }
                else if (!sscanf(line, "p<,>dffffff", modelid, x, y, z, rx, ry, rz))
                {
                    new obj = CreateDynamicObject(modelid, x, y, z, rx, ry, rz, worldid, interiorid);
                    if (obj != INVALID_OBJECT_ID)
                    {
                        Streamer_SetIntData(STREAMER_TYPE_OBJECT, obj, E_STREAMER_EXTRA_ID, MAPPING_OFFSET_PREVIEW);
                        PlayerPreviewObjects[playerid][count] = obj;
                        last_obj = obj;
                        count++;
                    }
                }
            }
            pos = end_param + 1;
        }
        else if (type == 2) // Set (Material or Text)
        {
            new bool:is_text = false;
            new bool:is_material = false;
            
            if (strfind(code, "SetDynamicObjectMaterialText", true, pos) == pos || strfind(code, "SetObjectMaterialText", true, pos) == pos)
            {
                is_text = true;
            }
            else if (strfind(code, "SetDynamicObjectMaterial", true, pos) == pos || strfind(code, "SetObjectMaterial", true, pos) == pos)
            {
                is_material = true;
            }

            if (!is_text && !is_material)
            {
                pos += 3;
                continue;
            }

            new start_param = strfind(code, "(", true, pos);
            if (start_param == -1) {
                pos += 3;
                continue;
            }
            start_param += 1;

            new end_param = strfind(code, ")", true, start_param);
            if (end_param == -1) {
                pos += 3;
                continue;
            }

            new len = end_param - start_param;
            if (len > 0 && len < sizeof(line))
            {
                strmid(line, code, start_param, end_param, sizeof(line));
                new first_comma = strfind(line, ",", true);
                if (first_comma != -1)
                {
                    if (is_text)
                    {
                        ApplyMaterialTextFromLine(last_obj, line[first_comma + 1]);
                    }
                    else if (is_material)
                    {
                        ApplyMaterialFromLine(last_obj, line[first_comma + 1]);
                    }
                }
            }
            pos = end_param + 1;
        }
    }
    PlayerPreviewCount[playerid] = count;
    return count;
}

/* ── Commands ── */

CMD:loadmapping(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] != 1336 && PlayerData[playerid][pAdmin] != 1337)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    mysql_tquery(dbCon, "SELECT `id`, `ucp_name`, `property_type`, `property_id`, `custom_title` FROM `property_mappings` WHERE `status` = 0 ORDER BY `id` ASC LIMIT 128", "OnLoadPendingMappings", "d", playerid);
    return true;
}

CMD:removemapping(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] != 1336 && PlayerData[playerid][pAdmin] != 1337)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    mysql_tquery(dbCon, "SELECT `id`, `ucp_name`, `property_type`, `property_id`, `custom_title` FROM `property_mappings` WHERE `status` = 1 ORDER BY `id` ASC LIMIT 128", "OnLoadApprovedMappingsList", "d", playerid);
    return true;
}

CMD:clearpreview(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] != 1336 && PlayerData[playerid][pAdmin] != 1337)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    ClearPreviewObjects(playerid);
    SendNoticeMessage(playerid, "Preview mapping objects cleared.");
    return true;
}

CMD:reloadmappings(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] != 1336 && PlayerData[playerid][pAdmin] != 1337)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    new destroyed = DestroyAllApprovedMappings();
    mysql_tquery(dbCon, "SELECT `id`, `property_type`, `property_id`, `mapping_code` FROM `property_mappings` WHERE `status` = 1 ORDER BY `id` ASC", "OnLoadAllApprovedMappings");
    SendNoticeMessage(playerid, "Reloaded approved mappings: destroyed %d active objects, reloading from database...", destroyed);
    return true;
}

CMD:savedmapping(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] != 1336 && PlayerData[playerid][pAdmin] != 1337)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    mysql_tquery(dbCon, "SELECT `id`, `ucp_name`, `property_type`, `property_id`, `custom_title` FROM `property_mappings` WHERE `status` = 2 ORDER BY `id` ASC LIMIT 128", "OnLoadSavedMappingsList", "d", playerid);
    return true;
}

CMD:deletemapping(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] != 1336 && PlayerData[playerid][pAdmin] != 1337)
        return SendUnauthMessage(playerid, "You're not authorized to use this command.");

    mysql_tquery(dbCon, "SELECT `id`, `ucp_name`, `property_type`, `property_id`, `custom_title` FROM `property_mappings` WHERE `status` = 2 ORDER BY `id` ASC LIMIT 128", "OnLoadDeleteMappingsList", "d", playerid);
    return true;
}

/* ── Callbacks ── */

forward OnLoadPendingMappings(playerid);
public OnLoadPendingMappings(playerid)
{
    new rows = cache_num_rows();
    if(rows == 0)
    {
        return SendErrorMessage(playerid, "There are no pending mapping requests.");
    }

    new headers[512], item[128], db_id, prop_type, prop_id, ucp_name[32], custom_title[64];
    format(headers, sizeof(headers), "UCP Name\tProperty Type\tProperty ID / Name\n");
    
    AdminPendingCount[playerid] = 0;
    
    for(new i = 0; i < rows && i < MAX_PENDING_LIST; ++i)
    {
        cache_get_value_name_int(i, "id", db_id);
        cache_get_value_name_int(i, "property_type", prop_type);
        cache_get_value_name_int(i, "property_id", prop_id);
        cache_get_value_name(i, "ucp_name", ucp_name);
        cache_get_value_name(i, "custom_title", custom_title, sizeof(custom_title));

        AdminPendingRequestID[playerid][i] = db_id;
        AdminPendingCount[playerid]++;

        new typeStr[16];
        if(prop_type == 1) typeStr = "House";
        else if(prop_type == 2) typeStr = "Business";
        else if(prop_type == 3) typeStr = "Apartment";
        else typeStr = "Custom";

        if(prop_type == 4)
        {
            if(custom_title[0] == '\0') format(custom_title, sizeof(custom_title), "Kustom");
            format(item, sizeof(item), "%s\t%s\t%s\n", ucp_name, typeStr, custom_title);
        }
        else
        {
            format(item, sizeof(item), "%s\t%s\t%d\n", ucp_name, typeStr, prop_id);
        }
        strcat(headers, item);
    }

    ShowPlayerDialog(playerid, DIALOG_MAPPING_LOAD, DIALOG_STYLE_TABLIST_HEADERS, "Pending Mapping Requests", headers, "Load", "Close");
    return true;
}

forward OnLoadApprovedMappingsList(playerid);
public OnLoadApprovedMappingsList(playerid)
{
    new rows = cache_num_rows();
    if(rows == 0)
    {
        return SendErrorMessage(playerid, "There are no approved custom mappings.");
    }

    new headers[512], item[128], db_id, prop_type, prop_id, ucp_name[32], custom_title[64];
    format(headers, sizeof(headers), "UCP Name\tProperty Type\tProperty ID / Name\n");
    
    AdminPendingCount[playerid] = 0;
    
    for(new i = 0; i < rows && i < MAX_PENDING_LIST; ++i)
    {
        cache_get_value_name_int(i, "id", db_id);
        cache_get_value_name_int(i, "property_type", prop_type);
        cache_get_value_name_int(i, "property_id", prop_id);
        cache_get_value_name(i, "ucp_name", ucp_name);
        cache_get_value_name(i, "custom_title", custom_title, sizeof(custom_title));

        AdminPendingRequestID[playerid][i] = db_id;
        AdminPendingCount[playerid]++;

        new typeStr[16];
        if(prop_type == 1) typeStr = "House";
        else if(prop_type == 2) typeStr = "Business";
        else if(prop_type == 3) typeStr = "Apartment";
        else typeStr = "Custom";

        if(prop_type == 4)
        {
            if(custom_title[0] == '\0') format(custom_title, sizeof(custom_title), "Kustom");
            format(item, sizeof(item), "%s\t%s\t%s\n", ucp_name, typeStr, custom_title);
        }
        else
        {
            format(item, sizeof(item), "%s\t%s\t%d\n", ucp_name, typeStr, prop_id);
        }
        strcat(headers, item);
    }

    ShowPlayerDialog(playerid, DIALOG_MAPPING_REMOVE, DIALOG_STYLE_TABLIST_HEADERS, "Remove Custom Mapping", headers, "Remove", "Close");
    return true;
}

forward OnLoadSavedMappingsList(playerid);
public OnLoadSavedMappingsList(playerid)
{
    new rows = cache_num_rows();
    if(rows == 0)
    {
        return SendErrorMessage(playerid, "There are no saved/removed custom mappings.");
    }

    new headers[512], item[128], db_id, prop_type, prop_id, ucp_name[32], custom_title[64];
    format(headers, sizeof(headers), "UCP Name\tProperty Type\tProperty ID / Name\n");
    
    AdminPendingCount[playerid] = 0;
    
    for(new i = 0; i < rows && i < MAX_PENDING_LIST; ++i)
    {
        cache_get_value_name_int(i, "id", db_id);
        cache_get_value_name_int(i, "property_type", prop_type);
        cache_get_value_name_int(i, "property_id", prop_id);
        cache_get_value_name(i, "ucp_name", ucp_name);
        cache_get_value_name(i, "custom_title", custom_title, sizeof(custom_title));

        AdminPendingRequestID[playerid][i] = db_id;
        AdminPendingCount[playerid]++;

        new typeStr[16];
        if(prop_type == 1) typeStr = "House";
        else if(prop_type == 2) typeStr = "Business";
        else if(prop_type == 3) typeStr = "Apartment";
        else typeStr = "Custom";

        if(prop_type == 4)
        {
            if(custom_title[0] == '\0') format(custom_title, sizeof(custom_title), "Kustom");
            format(item, sizeof(item), "%s\t%s\t%s\n", ucp_name, typeStr, custom_title);
        }
        else
        {
            format(item, sizeof(item), "%s\t%s\t%d\n", ucp_name, typeStr, prop_id);
        }
        strcat(headers, item);
    }

    ShowPlayerDialog(playerid, DIALOG_MAPPING_SAVED, DIALOG_STYLE_TABLIST_HEADERS, "Saved/Removed Mappings", headers, "Restore", "Close");
    return true;
}

forward OnRestoreSelectedMapping(playerid, db_id);
public OnRestoreSelectedMapping(playerid, db_id)
{
    new rows = cache_num_rows();
    if(rows == 0) return SendErrorMessage(playerid, "Could not fetch mapping details for restoration.");

    new prop_type, prop_id;
    static code[300000];
    cache_get_value_name_int(0, "property_type", prop_type);
    cache_get_value_name_int(0, "property_id", prop_id);
    cache_get_value_name(0, "mapping_code", code, sizeof(code));

    new world = -1, interior = -1;
    if(prop_type == 1) // House
    {
        new slot = Property_GetSlotByID(prop_id);
        if(slot != -1)
        {
            world = PropertyData[slot][hWorld];
            interior = PropertyData[slot][hInterior];
        }
    }
    else if(prop_type == 2) // Business
    {
        new slot = Business_GetSlotByID(prop_id);
        if(slot != -1)
        {
            world = BusinessData[slot][bWorld];
            interior = BusinessData[slot][bInterior];
        }
    }
    else if(prop_type == 3) // Apartment
    {
        new slot = Complex_GetSlotByID(prop_id);
        if(slot != -1)
        {
            world = ComplexData[slot][aWorld];
            interior = ComplexData[slot][aInterior];
        }
    }
    else if(prop_type == 4) // Custom / Write manually
    {
        world = 0;
        interior = 0;
    }

    if(world != -1)
    {
        DetectMappingLocation(prop_type, prop_id, code, world, interior);
        new spawned = SpawnMappingObjects(code, world, interior, db_id);
        SendNoticeMessage(playerid, "Restored mapping ID %d. Spawned %d objects.", db_id, spawned);
    }
    else
    {
        SendNoticeMessage(playerid, "Restored mapping ID %d in database, but the property is not loaded in-game.", db_id);
    }
    return true;
}

forward OnLoadDeleteMappingsList(playerid);
public OnLoadDeleteMappingsList(playerid)
{
    new rows = cache_num_rows();
    if(rows == 0)
    {
        return SendErrorMessage(playerid, "There are no saved/removed custom mappings to delete.");
    }

    new headers[512], item[128], db_id, prop_type, prop_id, ucp_name[32], custom_title[64];
    format(headers, sizeof(headers), "UCP Name\tProperty Type\tProperty ID / Name\n");
    
    AdminPendingCount[playerid] = 0;
    
    for(new i = 0; i < rows && i < MAX_PENDING_LIST; ++i)
    {
        cache_get_value_name_int(i, "id", db_id);
        cache_get_value_name_int(i, "property_type", prop_type);
        cache_get_value_name_int(i, "property_id", prop_id);
        cache_get_value_name(i, "ucp_name", ucp_name);
        cache_get_value_name(i, "custom_title", custom_title, sizeof(custom_title));

        AdminPendingRequestID[playerid][i] = db_id;
        AdminPendingCount[playerid]++;

        new typeStr[16];
        if(prop_type == 1) typeStr = "House";
        else if(prop_type == 2) typeStr = "Business";
        else if(prop_type == 3) typeStr = "Apartment";
        else typeStr = "Custom";

        if(prop_type == 4)
        {
            if(custom_title[0] == '\0') format(custom_title, sizeof(custom_title), "Kustom");
            format(item, sizeof(item), "%s\t%s\t%s\n", ucp_name, typeStr, custom_title);
        }
        else
        {
            format(item, sizeof(item), "%s\t%s\t%d\n", ucp_name, typeStr, prop_id);
        }
        strcat(headers, item);
    }

    ShowPlayerDialog(playerid, DIALOG_MAPPING_DELETE, DIALOG_STYLE_TABLIST_HEADERS, "Delete Custom Mapping", headers, "Delete", "Close");
    return true;
}

forward OnPreviewSelectedMapping(playerid, db_id);
public OnPreviewSelectedMapping(playerid, db_id)
{
    new rows = cache_num_rows();
    if(rows == 0) return SendErrorMessage(playerid, "Could not fetch mapping details.");

    new prop_type, prop_id;
    static code[300000];
    cache_get_value_name_int(0, "property_type", prop_type);
    cache_get_value_name_int(0, "property_id", prop_id);
    cache_get_value_name(0, "mapping_code", code, sizeof(code));

    new world = -1, interior = -1;
    if(prop_type == 1) // House
    {
        new slot = Property_GetSlotByID(prop_id);
        if(slot != -1)
        {
            world = PropertyData[slot][hWorld];
            interior = PropertyData[slot][hInterior];
        }
    }
    else if(prop_type == 2) // Business
    {
        new slot = Business_GetSlotByID(prop_id);
        if(slot != -1)
        {
            world = BusinessData[slot][bWorld];
            interior = BusinessData[slot][bInterior];
        }
    }
    else if(prop_type == 3) // Apartment
    {
        new slot = Complex_GetSlotByID(prop_id);
        if(slot != -1)
        {
            world = ComplexData[slot][aWorld];
            interior = ComplexData[slot][aInterior];
        }
    }
    else if(prop_type == 4) // Custom / Write manually
    {
        world = 0;
        interior = 0;
    }

    if(world == -1)
    {
        return SendErrorMessage(playerid, "The target property is not loaded or does not exist.");
    }

    // Automatically override VW & interior if it is closer to the entrance (exterior)
    DetectMappingLocation(prop_type, prop_id, code, world, interior);

    new count = SpawnPreviewObjects(playerid, code, world, interior);
    SendNoticeMessage(playerid, "Preview loaded. Spawned %d objects in Property ID %d (VW: %d).", count, prop_id, world);
    SendNoticeMessage(playerid, "Use /clearpreview to destroy the preview objects.");
    return true;
}

/* ── Dialog Response Handler ── */

stock OnMappingRequestDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    #pragma unused inputtext
    if(dialogid == DIALOG_MAPPING_LOAD || dialogid == DIALOG_MAPPING_REMOVE || dialogid == DIALOG_MAPPING_SAVED || dialogid == DIALOG_MAPPING_DELETE)
    {
        if(PlayerData[playerid][pAdmin] != 1336 && PlayerData[playerid][pAdmin] != 1337)
            return SendUnauthMessage(playerid, "You're not authorized to perform this action.");
    }

    if(dialogid == DIALOG_MAPPING_LOAD)
    {
        if(!response)
        {
            ClearPreviewObjects(playerid);
            return 1;
        }

        if(listitem >= 0 && listitem < AdminPendingCount[playerid])
        {
            new db_id = AdminPendingRequestID[playerid][listitem];
            new query[128];
            mysql_format(dbCon, query, sizeof(query), "SELECT `property_type`, `property_id`, `mapping_code` FROM `property_mappings` WHERE `id` = %d LIMIT 1", db_id);
            mysql_tquery(dbCon, query, "OnPreviewSelectedMapping", "dd", playerid, db_id);
        }
        return 1;
    }

    if(dialogid == DIALOG_MAPPING_REMOVE)
    {
        if(!response) return 1;

        if(listitem >= 0 && listitem < AdminPendingCount[playerid])
        {
            new db_id = AdminPendingRequestID[playerid][listitem];
            
            // Set status to 2 (Saved/Removed) instead of DELETE
            new query[128];
            mysql_format(dbCon, query, sizeof(query), "UPDATE `property_mappings` SET `status` = 2 WHERE `id` = %d", db_id);
            mysql_tquery(dbCon, query);

            // Destroy objects in-game
            new destroyed = DestroyApprovedMappingObjects(db_id);
            SendNoticeMessage(playerid, "Removed custom mapping request ID %d and moved it to Saved Mappings list. Destroyed %d active objects.", db_id, destroyed);
        }
        return 1;
    }

    if(dialogid == DIALOG_MAPPING_SAVED)
    {
        if(!response) return 1;

        if(listitem >= 0 && listitem < AdminPendingCount[playerid])
        {
            new db_id = AdminPendingRequestID[playerid][listitem];
            
            // Set status to 1 (Approved/Active)
            new query[128];
            mysql_format(dbCon, query, sizeof(query), "UPDATE `property_mappings` SET `status` = 1 WHERE `id` = %d", db_id);
            mysql_tquery(dbCon, query);

            // Reload the restored mapping in-game
            mysql_format(dbCon, query, sizeof(query), "SELECT `id`, `property_type`, `property_id`, `mapping_code` FROM `property_mappings` WHERE `id` = %d LIMIT 1", db_id);
            mysql_tquery(dbCon, query, "OnRestoreSelectedMapping", "dd", playerid, db_id);
        }
        return 1;
    }

    if(dialogid == DIALOG_MAPPING_DELETE)
    {
        if(!response) return 1;

        if(listitem >= 0 && listitem < AdminPendingCount[playerid])
        {
            new db_id = AdminPendingRequestID[playerid][listitem];
            
            // Delete permanently from database
            new query[128];
            mysql_format(dbCon, query, sizeof(query), "DELETE FROM `property_mappings` WHERE `id` = %d", db_id);
            mysql_tquery(dbCon, query);

            SendNoticeMessage(playerid, "Permanently deleted custom mapping request ID %d from Saved Mappings.", db_id);
        }
        return 1;
    }
    return 0;
}

stock DestroyApprovedMappingObjects(db_id)
{
    new destroyed = 0;
    new max_objects = Streamer_GetUpperBound(STREAMER_TYPE_OBJECT);
    new target_extra_id = MAPPING_OFFSET_APPROVED + db_id;
    for(new i = 1; i <= max_objects; ++i)
    {
        if(IsValidDynamicObject(i))
        {
            if(Streamer_GetIntData(STREAMER_TYPE_OBJECT, i, E_STREAMER_EXTRA_ID) == target_extra_id)
            {
                DestroyDynamicObject(i);
                destroyed++;
            }
        }
    }
    return destroyed;
}

stock DestroyAllApprovedMappings()
{
    new destroyed = 0;
    new max_objects = Streamer_GetUpperBound(STREAMER_TYPE_OBJECT);
    for(new i = 1; i <= max_objects; ++i)
    {
        if(IsValidDynamicObject(i))
        {
            new extra = Streamer_GetIntData(STREAMER_TYPE_OBJECT, i, E_STREAMER_EXTRA_ID);
            if(extra >= MAPPING_OFFSET_APPROVED && extra < MAPPING_OFFSET_PREVIEW)
            {
                DestroyDynamicObject(i);
                destroyed++;
            }
        }
    }
    return destroyed;
}

/* ── Deferred Startup Mapping Load ── */

forward LoadAllPropertyMappings();
public LoadAllPropertyMappings()
{
    mysql_tquery(dbCon, "SELECT `id`, `property_type`, `property_id`, `mapping_code` FROM `property_mappings` WHERE `status` = 1 ORDER BY `id` ASC", "OnLoadAllApprovedMappings");
    return 1;
}

forward OnLoadAllApprovedMappings();
public OnLoadAllApprovedMappings()
{
    new rows = cache_num_rows();
    if(rows == 0)
    {
        printf("[MappingRequest] No approved property mappings to load.");
        return 1;
    }

    new count = 0;
    for(new i = 0; i < rows; ++i)
    {
        new db_id, prop_type, prop_id;
        static code[300000];
        cache_get_value_name_int(i, "id", db_id);
        cache_get_value_name_int(i, "property_type", prop_type);
        cache_get_value_name_int(i, "property_id", prop_id);
        cache_get_value_name(i, "mapping_code", code, sizeof(code));

        new world = -1, interior = -1;
        if(prop_type == 1) // House
        {
            new slot = Property_GetSlotByID(prop_id);
            if(slot != -1)
            {
                world = PropertyData[slot][hWorld];
                interior = PropertyData[slot][hInterior];
            }
        }
        else if(prop_type == 2) // Business
        {
            new slot = Business_GetSlotByID(prop_id);
            if(slot != -1)
            {
                world = BusinessData[slot][bWorld];
                interior = BusinessData[slot][bInterior];
            }
        }
        else if(prop_type == 3) // Apartment
        {
            new slot = Complex_GetSlotByID(prop_id);
            if(slot != -1)
            {
                world = ComplexData[slot][aWorld];
                interior = ComplexData[slot][aInterior];
            }
        }
        else if(prop_type == 4) // Custom / Write manually
        {
            world = 0;
            interior = 0;
        }

        if(world != -1)
        {
            DetectMappingLocation(prop_type, prop_id, code, world, interior);
            new spawned = SpawnMappingObjects(code, world, interior, db_id);
            count += spawned;
        }
    }
    printf("[MappingRequest] Loaded %d custom mappings, spawned %d objects.", rows, count);
    return 1;
}

/* ── Property Sale Cleanup Handler ── */

stock OnPropertySold(prop_type, prop_id)
{
    new query[128];
    mysql_format(dbCon, query, sizeof(query), "DELETE FROM `property_mappings` WHERE `property_type` = %d AND `property_id` = %d", prop_type, prop_id);
    mysql_tquery(dbCon, query);

    new world = -1;
    if(prop_type == 1)
    {
        new slot = Property_GetSlotByID(prop_id);
        if(slot != -1) world = PropertyData[slot][hWorld];
    }
    else if(prop_type == 2)
    {
        new slot = Business_GetSlotByID(prop_id);
        if(slot != -1) world = BusinessData[slot][bWorld];
    }
    else if(prop_type == 3)
    {
        new slot = Complex_GetSlotByID(prop_id);
        if(slot != -1) world = ComplexData[slot][aWorld];
    }

    if(world != -1)
    {
        new destroyed = 0;
        new max_objects = Streamer_GetUpperBound(STREAMER_TYPE_OBJECT);
        for(new i = 1; i <= max_objects; ++i)
        {
            if(IsValidDynamicObject(i))
            {
                new extra = Streamer_GetIntData(STREAMER_TYPE_OBJECT, i, E_STREAMER_EXTRA_ID);
                if(extra >= MAPPING_OFFSET_APPROVED && extra < MAPPING_OFFSET_PREVIEW)
                {
                    if(Streamer_GetIntData(STREAMER_TYPE_OBJECT, i, E_STREAMER_WORLD_ID) == world)
                    {
                        DestroyDynamicObject(i);
                        destroyed++;
                    }
                }
            }
        }
        if(destroyed > 0)
        {
            printf("[MappingRequest] Automatically removed %d custom mapping objects for sold property ID %d.", destroyed, prop_id);
        }
    }
}
