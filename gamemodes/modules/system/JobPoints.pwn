// =============================================================================
// JobPoints.pwn - Dynamic Job Point System
// =============================================================================

#define MAX_JOB_POINTS          (50)
#define JOB_POINT_PICKUP_MODEL  (1210) // Briefcase / Job icon

enum E_JOB_POINT_DATA
{
    jpID,
    jpJob,
    Float:jpX,
    Float:jpY,
    Float:jpZ,
    jpInterior,
    jpWorld,
    jpPickup,
    Text3D:jpLabel,
    bool:jpExists
};

new JobPointData[MAX_JOB_POINTS][E_JOB_POINT_DATA];

forward OnJobPointCreated(slot);
forward OnJobPointsLoaded();

stock GetJobNameByID(jobid)
{
    new name[32];
    switch(jobid)
    {
        case JOB_FARMER:       format(name, sizeof(name), "Farmer");
        case JOB_TRUCKER:      format(name, sizeof(name), "Trucker");
        case JOB_MECHANIC:     format(name, sizeof(name), "Car Mechanic");
        case JOB_TAXI:         format(name, sizeof(name), "Taxi Driver");
        case JOB_TRAIN_DRIVER: format(name, sizeof(name), "Train Driver");
        default:               format(name, sizeof(name), "Unknown Job");
    }
    return name;
}

stock JobPoint_GetFreeSlot()
{
    for(new i = 0; i < MAX_JOB_POINTS; i++)
    {
        if(!JobPointData[i][jpExists]) return i;
    }
    return -1;
}

stock JobPoint_FindByDBID(dbid)
{
    for(new i = 0; i < MAX_JOB_POINTS; i++)
    {
        if(JobPointData[i][jpExists] && JobPointData[i][jpID] == dbid) return i;
    }
    return -1;
}

stock JobPoint_LoadAll()
{
    mysql_tquery(dbCon, "CREATE TABLE IF NOT EXISTS `job_points` (`id` INT AUTO_INCREMENT PRIMARY KEY, `jobId` INT NOT NULL, `posX` FLOAT NOT NULL, `posY` FLOAT NOT NULL, `posZ` FLOAT NOT NULL, `interior` INT NOT NULL DEFAULT 0, `world` INT NOT NULL DEFAULT 0);");
    mysql_tquery(dbCon, "SELECT * FROM `job_points`", "OnJobPointsLoaded", "");
    return 1;
}

public OnJobPointsLoaded()
{
    new rows = cache_num_rows();
    for(new i = 0; i < rows && i < MAX_JOB_POINTS; i++)
    {
        JobPointData[i][jpExists] = true;
        cache_get_value_name_int(i, "id", JobPointData[i][jpID]);
        cache_get_value_name_int(i, "jobId", JobPointData[i][jpJob]);
        cache_get_value_name_float(i, "posX", JobPointData[i][jpX]);
        cache_get_value_name_float(i, "posY", JobPointData[i][jpY]);
        cache_get_value_name_float(i, "posZ", JobPointData[i][jpZ]);
        cache_get_value_name_int(i, "interior", JobPointData[i][jpInterior]);
        cache_get_value_name_int(i, "world", JobPointData[i][jpWorld]);

        JobPoint_CreateInGame(i);
    }
    printf("[JOB POINTS] Loaded %d job points from database.", rows);
    return 1;
}

stock JobPoint_CreateInGame(slot)
{
    if(!JobPointData[slot][jpExists]) return 0;

    if(JobPointData[slot][jpPickup] != 0)
    {
        DestroyDynamicPickup(JobPointData[slot][jpPickup]);
        JobPointData[slot][jpPickup] = 0;
    }
    if(IsValidDynamic3DTextLabel(JobPointData[slot][jpLabel]))
    {
        DestroyDynamic3DTextLabel(JobPointData[slot][jpLabel]);
    }

    JobPointData[slot][jpPickup] = CreateDynamicPickup(
        JOB_POINT_PICKUP_MODEL, 23,
        JobPointData[slot][jpX], JobPointData[slot][jpY], JobPointData[slot][jpZ],
        JobPointData[slot][jpWorld], JobPointData[slot][jpInterior]
    );

    new labelText[256];
    format(labelText, sizeof(labelText),
        "{A9C4E4}[JOB POINT: %s]\n{FFFFFF}Type {FFFF00}/joinjob{FFFFFF} to take this job!\n{AAAAAA}[JPID: %d | PJOB: %d]",
        GetJobNameByID(JobPointData[slot][jpJob]),
        JobPointData[slot][jpID],
        JobPointData[slot][jpJob]
    );

    JobPointData[slot][jpLabel] = CreateDynamic3DTextLabel(
        labelText, COLOR_WHITE,
        JobPointData[slot][jpX], JobPointData[slot][jpY], JobPointData[slot][jpZ] + 0.8,
        15.0, INVALID_PLAYER_ID, INVALID_VEHICLE_ID, 0,
        JobPointData[slot][jpWorld], JobPointData[slot][jpInterior]
    );

    return 1;
}

stock JobPoint_Add(jobId, Float:x, Float:y, Float:z, interior, world)
{
    new slot = JobPoint_GetFreeSlot();
    if(slot == -1) return -1;

    JobPointData[slot][jpExists]   = true;
    JobPointData[slot][jpJob]      = jobId;
    JobPointData[slot][jpX]        = x;
    JobPointData[slot][jpY]        = y;
    JobPointData[slot][jpZ]        = z;
    JobPointData[slot][jpInterior] = interior;
    JobPointData[slot][jpWorld]    = world;

    new query[256];
    mysql_format(dbCon, query, sizeof(query),
        "INSERT INTO `job_points` (`jobId`, `posX`, `posY`, `posZ`, `interior`, `world`) VALUES (%d, %.4f, %.4f, %.4f, %d, %d)",
        jobId, x, y, z, interior, world
    );
    mysql_tquery(dbCon, query, "OnJobPointCreated", "d", slot);

    return slot;
}

public OnJobPointCreated(slot)
{
    if(!JobPointData[slot][jpExists]) return 0;

    JobPointData[slot][jpID] = cache_insert_id();
    JobPoint_CreateInGame(slot);
    return 1;
}

stock JobPoint_Remove(dbid)
{
    new slot = JobPoint_FindByDBID(dbid);
    if(slot == -1) return 0;

    new query[128];
    mysql_format(dbCon, query, sizeof(query), "DELETE FROM `job_points` WHERE `id` = %d LIMIT 1", dbid);
    mysql_tquery(dbCon, query);

    if(JobPointData[slot][jpPickup] != 0)
    {
        DestroyDynamicPickup(JobPointData[slot][jpPickup]);
        JobPointData[slot][jpPickup] = 0;
    }
    if(IsValidDynamic3DTextLabel(JobPointData[slot][jpLabel]))
    {
        DestroyDynamic3DTextLabel(JobPointData[slot][jpLabel]);
    }

    JobPointData[slot][jpExists] = false;
    return 1;
}

stock JobPoint_Nearest(playerid, Float:maxDist = 3.0)
{
    new nearest = -1;
    new Float:minDist = maxDist;
    new vw = GetPlayerVirtualWorld(playerid);
    new intVal = GetPlayerInterior(playerid);

    for(new i = 0; i < MAX_JOB_POINTS; i++)
    {
        if(!JobPointData[i][jpExists]) continue;
        if(JobPointData[i][jpWorld] != vw || JobPointData[i][jpInterior] != intVal) continue;

        new Float:dist = GetPlayerDistanceFromPoint(playerid, JobPointData[i][jpX], JobPointData[i][jpY], JobPointData[i][jpZ]);
        if(dist < minDist)
        {
            minDist = dist;
            nearest = i;
        }
    }
    return nearest;
}

// Commands & Dialogs
CMD:jobpoint(playerid, params[])
{
    if(PlayerData[playerid][pAdmin] < 3)
        return SendErrorMessage(playerid, "You are not authorized to use this command.");

    new subcmd[16], param1;
    if(sscanf(params, "s[16]D(0)", subcmd, param1))
    {
        SendSyntaxMessage(playerid, "/jobpoint [add / list / remove]");
        SendClientMessage(playerid, COLOR_GRAD2, "Subcommands: add (create at pos), list (teleport), remove [id]");
        return 1;
    }

    if(!strcmp(subcmd, "add", true))
    {
        Dialog_Show(playerid, JobPointAddDialog, DIALOG_STYLE_LIST, "Create Job Point - Select Job", "Car Mechanic (PJOB: 3)\nTrucker (PJOB: 2)\nTaxi Driver (PJOB: 4)\nFarmer (PJOB: 1)", "Select", "Cancel");
        return 1;
    }
    else if(!strcmp(subcmd, "list", true))
    {
        new count = 0, listStr[1024];
        listStr[0] = EOS;

        for(new i = 0; i < MAX_JOB_POINTS; i++)
        {
            if(!JobPointData[i][jpExists]) continue;

            format(listStr, sizeof(listStr), "%s[JPID: %d] %s (PJOB: %d) - Pos: %.1f, %.1f, %.1f\n",
                listStr,
                JobPointData[i][jpID],
                GetJobNameByID(JobPointData[i][jpJob]),
                JobPointData[i][jpJob],
                JobPointData[i][jpX], JobPointData[i][jpY], JobPointData[i][jpZ]
            );
            count++;
        }

        if(count == 0)
            return SendErrorMessage(playerid, "No job points currently exist.");

        Dialog_Show(playerid, JobPointListDialog, DIALOG_STYLE_LIST, "Job Points List (Click to Teleport)", listStr, "Teleport", "Close");
        return 1;
    }
    else if(!strcmp(subcmd, "remove", true) || !strcmp(subcmd, "delete", true))
    {
        if(param1 <= 0)
            return SendSyntaxMessage(playerid, "/jobpoint remove [jobpoint id]");

        if(JobPoint_Remove(param1))
        {
            SendAdminAlert(COLOR_YELLOW, 3, "AdmWarn(3) %s has removed Job Point ID %d.", ReturnName(playerid), param1);
            SendServerMessage(playerid, "Job Point ID %d successfully removed.", param1);
        }
        else
        {
            SendErrorMessage(playerid, "Job Point ID %d not found.", param1);
        }
        return 1;
    }
    else
    {
        SendSyntaxMessage(playerid, "/jobpoint [add / list / remove]");
    }
    return 1;
}

Dialog:JobPointAddDialog(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new jobId = 0;
    switch(listitem)
    {
        case 0: jobId = JOB_MECHANIC;
        case 1: jobId = JOB_TRUCKER;
        case 2: jobId = JOB_TAXI;
        case 3: jobId = JOB_FARMER;
    }

    new Float:x, Float:y, Float:z;
    GetPlayerPos(playerid, x, y, z);
    new int = GetPlayerInterior(playerid);
    new world = GetPlayerVirtualWorld(playerid);

    new slot = JobPoint_Add(jobId, x, y, z, int, world);
    if(slot == -1)
        return SendErrorMessage(playerid, "Job Point limit reached (%d max).", MAX_JOB_POINTS);

    SendAdminAlert(COLOR_YELLOW, 3, "AdmWarn(3) %s created Job Point for %s at %.1f, %.1f, %.1f.", ReturnName(playerid), GetJobNameByID(jobId), x, y, z);
    SendServerMessage(playerid, "Job Point created for %s!", GetJobNameByID(jobId));
    return 1;
}

Dialog:JobPointListDialog(playerid, response, listitem, inputtext[])
{
    if(!response) return 1;

    new count = 0;
    for(new i = 0; i < MAX_JOB_POINTS; i++)
    {
        if(!JobPointData[i][jpExists]) continue;

        if(count == listitem)
        {
            SetPlayerInterior(playerid, JobPointData[i][jpInterior]);
            SetPlayerVirtualWorld(playerid, JobPointData[i][jpWorld]);
            SetPlayerDynamicPos(playerid, JobPointData[i][jpX], JobPointData[i][jpY], JobPointData[i][jpZ]);

            SendServerMessage(playerid, "Teleported to Job Point ID %d (%s).", JobPointData[i][jpID], GetJobNameByID(JobPointData[i][jpJob]));
            return 1;
        }
        count++;
    }
    return 1;
}

// Player /joinjob command
CMD:joinjob(playerid, params[])
{
    new slot = JobPoint_Nearest(playerid, 3.0);
    if(slot == -1)
        return SendErrorMessage(playerid, "You are not near any Job Point pickup.");

    if(PlayerData[playerid][pJob] != JOB_NONE)
    {
        return SendErrorMessage(playerid, "You already have a job (%s). Type /leavejob to leave your job first.", ReturnJobName(playerid, PlayerData[playerid][pJob]));
    }

    new jobId = JobPointData[slot][jpJob];
    PlayerData[playerid][pJob] = jobId;

    new msg[128];
    format(msg, sizeof(msg), "~r~Congratulations,~n~~w~You are now a ~y~%s.~n~~w~/jobhelp.", GetJobNameByID(jobId));
    ShowPlayerFooter(playerid, msg, 8000);

    SendServerMessage(playerid, "Congratulations! You have joined the %s job. Use /jobhelp for commands.", GetJobNameByID(jobId));

    new query[128];
    mysql_format(dbCon, query, sizeof(query), "UPDATE `accounts` SET `playerJob` = '%d' WHERE `ID` = '%d' LIMIT 1", PlayerData[playerid][pJob], AccountData[playerid][aUserid]);
    mysql_tquery(dbCon, query);

    return 1;
}
