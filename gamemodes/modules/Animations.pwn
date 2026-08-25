// Variables

static const g_aPreloadLibs[105][] =
{
	"AIRPORT",      /*"ATTRACTORS",*/   "BAR",          "BASEBALL",     "BD_FIRE",
	"BEACH",        "BENCHPRESS",   /*"BF_INJECTION",*/ /*"BIKE_DBZ",*/     "BIKED",
	/*"BIKEH",*/        /*"BIKELEAP",*/     "BIKES",        "BIKEV",        /*"BLOWJOBZ",*/
	"BMX",          "BOMBER",       "BOX",          "BSKTBALL",     "BUDDY",
	"BUS",          "CAMERA",       "CAR",          /*"CAR_CHAT",*/     "CARRY",
	/*"CASINO",*/       /*"CHAINSAW",*/     "CHOPPA",       "CLOTHES",      "COACH",
	"COLT45",       "COP_AMBIENT",  /*"COP_DVBYZ",*/    "CRACK",        "CRIB",
	/*"DAM_JUMP",*/     "DANCING",      "DEALER",       /*"DILDO",*/        "DODGE",
	"DOZER",        "DRIVEBYS",     "FAT",          "FIGHT_B",      "FIGHT_C",
	"FIGHT_D",      "FIGHT_E",      /*"FINALE",       "FINALE2",*/      "FLAME",
	"FLOWERS",      "FOOD",         /*"FREEWEIGHTS",*/  "GANGS",        "GFUNK",
	"GHANDS",       /*"GHETTO_DB",*/    /*"GOGGLES",*/      "GRAFFITI",     "GRAVEYARD",
	"GRENADE",      "GYMNASIUM",    "HAIRCUTS",     /*"HEIST9",*/       "INT_HOUSE",
	"INT_OFFICE",   /*"INT_SHOP",*/     "JST_BUISNESS", "KART",         "KISSING",
	"KNIFE",        "LAPDAN1",      "LAPDAN2",      /*"LAPDAN3",*/      /*"LOWRIDER",*/
	"MD_CHASE",     /*"MD_END",*/       "MEDIC",        "MISC",         "MTB",
	"MUSCULAR",     "NEVADA",       "ON_LOOKERS",   "OTB",          "PARACHUTE",
	"PARK",         /*"PAULNMAC",*/     "PED",          /*"PLAYER_DVBYS",*/ "PLAYIDLES",
	"POLICE",       "POOL",         "POOR",         "PYTHON",       "QUAD",
	"QUAD_DBZ",     "RAPPING",      "RIFLE",        "RIOT",         /*"ROB_BANK",*/
	"ROCKET",       /*"RUNNINGMAN",*/   "RUSTLER",      "RYDER",        /*"SAMP",*/
	"SCRATCHING",   /*"SEX",*/          "SHAMAL",       "SHOP",         "SHOTGUN",
	"SILENCED",     "SKATE",        "SMOKING",      "SNIPER",       "SNM",
	"SPRAYCAN",     "STRIP",        "SUNBATHE",     "SWAT",         "SWEET",
	"SWIM",         "SWORD",        "TANK",         /*"TATTOOS",*/      "TEC",
	"TRAIN",        "TRUCK",        "UZI",          "VAN",          /*"VENDING",*/
	"VORTEX",       "WAYFARER",     "WEAPONS",      "WOP",          "WUZI"
};

// Functions

PreloadAnimations(playerid)
{
	for(new i = 0; i < sizeof(g_aPreloadLibs); ++i)
	{
	    ApplyAnimation(playerid, g_aPreloadLibs[i], "null", 4.1, 0, 0, 0, 0, 0, 1);
	}
	return true;
}

AnimationCheck(playerid, bool:caranim = false)
{
	if(PlayerData[playerid][pInjured] || DeathMode{playerid} || KnockedOut{playerid} || IsTazed{playerid})
	    return true;

	if(!caranim)
	{
		if(GetPlayerState(playerid) != PLAYER_STATE_ONFOOT) 
		{
			return true;
		}
	}
	else
	{
		if(GetPlayerState(playerid) != PLAYER_STATE_DRIVER && GetPlayerState(playerid) != PLAYER_STATE_PASSENGER)
		{
			return true;
		} 
	}	

	return false;
}

// ---- data-driven animation commands ----
static const g_aAnimLib[102][] = {
	"PED",
	"MISC",
	"MISC",
	"PLAYIDLES",
	"PED",
	"SWEET",
	"PED",
	"PLAYIDLES",
	"PED",
	"MISC",
	"GRAVEYARD",
	"PED",
	"GRAVEYARD",
	"PED",
	"PED",
	"PED",
	"PED",
	"FAT",
	"PED",
	"PED",
	"PED",
	"PED",
	"POLICE",
	"BEACH",
	"RAPPING",
	"GANGS",
	"GANGS",
	"GANGS",
	"GANGS",
	"BENCHPRESS",
	"GANGS",
	"BD_FIRE",
	"GRAFFITI",
	"ON_LOOKERS",
	"BD_FIRE",
	"BD_FIRE",
	"FIGHT_E",
	"ON_LOOKERS",
	"ON_LOOKERS",
	"FIGHT_C",
	"BD_FIRE",
	"BAR",
	"BEACH",
	"BEACH",
	"BEACH",
	"BUDDY",
	"BUDDY",
	"BUDDY",
	"PYTHON",
	"SMOKING",
	"GANGS",
	"BUDDY",
	"BUDDY",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"GRENADE",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"BSKTBALL",
	"FIGHT_B",
	"FIGHT_C",
	"BASEBALL",
	"FIGHT_B",
	"FIGHT_B",
	"SNIPER",
	"KNIFE",
	"KNIFE",
	"FIGHT_B",
	"FIGHT_B",
	"POLICE",
	"FIGHT_C",
	"FIGHT_C",
	"FIGHT_C",
	"FIGHT_C",
	"FIGHT_C",
	"DODGE",
	"DODGE",
	"DODGE",
	"RIOT",
	"ON_LOOKERS",
	"ON_LOOKERS",
	"SWEET",
	"SWEET",
	"ROCKET",
	"GHANDS",
	"PED",
	"FIGHT_D",
	"DEALER",
	"VAN",
	"VAN",
	"PED",
	"PED",
	"INT_OFFICE",
	"INT_OFFICE"
};
static const g_aAnimName[102][] = {
	"gang_gunstand",
	"Hiker_Pose_L",
	"Hiker_Pose",
	"stretch",
	"KD_left",
	"sweet_ass_slap",
	"WALK_armed",
	"SHIFT",
	"IDLE_ARMED",
	"PLYRLEAN_LOOP",
	"MRNM_LOOP",
	"IDLESTANCE_OLD",
	"PRST_LOOPA",
	"FLOOR_HIT_F",
	"FUCKU",
	"COWER",
	"GUM_EAT",
	"IDLE_tired",
	"IDLE_TIRED",
	"SEAT_DOWN",
	"TURN_180",
	"KO_SKID_FRONT",
	"DOOR_KICK",
	"bather",
	"LAUGH_01",
	"SHAKE_CARA",
	"SHAKE_CARSH",
	"INVITE_YES",
	"DEALER_DEAL",
	"GYM_BP_CELEBRATE",
	"INVITE_NO",
	"BD_PANIC_04",
	"SPRAYCAN_FIRE",
	"PANIC_SHOUT",
	"WASH_UP",
	"WASH_UP",
	"HIT_FIGHTKICK_B",
	"SHOUT_01",
	"SHOUT_LOOP",
	"HITC_3",
	"BD_PANIC_02",
	"DNK_STNDM_LOOP",
	"PARKSIT_M_LOOP",
	"SITNWAIT_LOOP_W",
	"PARKSIT_W_LOOP",
	"BUDDY_CROUCHFIRE",
	"BUDDY_CROUCHRELOAD",
	"BUDDY_FIRE",
	"PYTHON_FIRE",
	"M_smklean_loop",
	"smkcig_prtl",
	"BUDDY_FIRE_POOR",
	"BUDDY_RELOAD",
	"BBALL_DEF_JUMP_SHOT",
	"BBALL_DEF_LOOP",
	"BBALL_DEF_STEPR",
	"BBALL_IDLE",
	"BBALL_WALK",
	"BBALL_RUN",
	"WEAPON_THROW",
	"BBALL_DNK",
	"BBALL_DNK_GLI",
	"BBALL_DNK_LND",
	"BBALL_JUMP_SHOT",
	"BBALL_PICKUP",
	"BBALL_REACT_MISS",
	"BBALL_JUMP_END",
	"HITB_1",
	"FIGHTC_M",
	"BAT_M",
	"FIGHTB_1",
	"FIGHTB_2",
	"WEAPON_SNIPER",
	"KILL_KNIFE_PED_DIE",
	"KNIFE_HIT_1",
	"FIGHTB_G",
	"HITB_2",
	"DOOR_KICK",
	"FIGHTC_1",
	"FIGHTC_2",
	"FIGHTC_3",
	"FIGHTC_BLOCK",
	"FIGHTC_G",
	"CRUSH_JUMP",
	"COVER_DIVE_01",
	"COVER_DIVE_02",
	"RIOT_PUNCHES",
	"LKAROUND_LOOP",
	"LKUP_LOOP",
	"SWEET_INJUREDLOOP",
	"LAFIN_SWEET",
	"RocketFire",
	"GSIGN5LH",
	"ROADCROSS",
	"FIGHTD_3",
	"SHOP_PAY",
	"VAN_OPEN_BACK_RHS",
	"VAN_OPEN_BACK_LHS",
	"KO_SHOT_STOM",
	"KO_SHOT_FRONT",
	"OFF_SIT_BORED_LOOP",
	"OFF_SIT_IDLE_LOOP"
};
static const Float:g_aAnimDelta[102] = {
	4.0,
	4.0,
	4.0,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1,
	4.1
};
static const g_aAnimParams[102][6] = {
	{1,0,0,0,0,1},
	{0,1,1,1,0,1},
	{0,1,1,1,0,1},
	{0,0,0,0,0,1},
	{0,1,1,1,0,1},
	{0,0,0,0,0,1},
	{1,1,1,1,1,1},
	{0,0,0,0,0,1},
	{1,0,0,0,0,1},
	{1,1,0,0,0,1},
	{1,0,0,0,0,1},
	{1,0,0,0,0,1},
	{1,0,0,0,0,1},
	{0,0,0,1,0,1},
	{0,0,0,0,0,1},
	{0,0,0,1,0,1},
	{0,0,0,0,0,1},
	{1,0,0,0,0,1},
	{1,0,0,0,0,1},
	{0,0,0,1,0,1},
	{0,0,0,0,0,1},
	{0,0,0,1,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,1,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,1,0,1},
	{0,0,0,1,0,1},
	{0,0,0,1,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{1,0,0,0,0,1},
	{0,1,1,1,1,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{1,0,0,0,0,1},
	{1,1,1,0,0,1},
	{0,0,0,0,0,1},
	{1,1,1,0,0,1},
	{1,1,1,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,1,1,1,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,0,0,1},
	{0,1,1,1,0,1},
	{0,1,1,1,0,1},
	{0,1,1,1,1,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,0,0,0,0,1},
	{0,1,1,1,0,1},
	{0,1,1,1,0,1},
	{1,0,0,0,0,1},
	{1,0,0,0,0,1}
};
stock DoAnim(playerid, slot, bool:usecd)
{
	if(AnimationCheck(playerid))
	    return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

	if(usecd && ((gettime() - AnimCooldown[playerid]) < 5))
		return SendClientMessage(playerid, COLOR_LIGHTRED, "You need to wait 5 seconds between each animation");

	PlayerData[playerid][pAnimation] = 1;

	ApplyAnimation(playerid, g_aAnimLib[slot], g_aAnimName[slot], g_aAnimDelta[slot],
	    g_aAnimParams[slot][0], g_aAnimParams[slot][1], g_aAnimParams[slot][2],
	    g_aAnimParams[slot][3], g_aAnimParams[slot][4], g_aAnimParams[slot][5]);

	if(usecd) AnimCooldown[playerid] = gettime();
	return true;
}

// ---- custom animation commands ----

// Commands

YCMD:sa(playerid, params[], help) = stopanim;

CMD:stopanim(playerid, params[])
{
	if(IsTazed{playerid} || KnockedOut{playerid})
	    return SendClientMessage(playerid, COLOR_WHITE, "Don't abuse /stopanim when tazed/knocked out");

	if(PlayerData[playerid][pInjured] || DeathMode{playerid} || KnockedOut{playerid} || IsTazed{playerid})
	    return SendClientMessage(playerid, COLOR_GRAD1, "The animation cannot be stopped at this time.");

	if(GetPlayerState(playerid) == PLAYER_STATE_PASSENGER)
	{
	    if(GetPlayerCameraMode(playerid) == 55)
		{
            RemovePlayerDriveby(playerid);
		}

        PlayerData[playerid][pAnimation] = 0;

		SendClientMessage(playerid, COLOR_WHITE, "HINT: Use key {FFFF00}H{FFFFFF} to lean in and out. /stopanim may cause you to desync.");
	    return true;
	}

    if(PlayerData[playerid][pAnimation])
    {
		if(!IsPlayerInAnyVehicle(playerid)) 
        {
            ClearAnimations(playerid, 1);

            ApplyAnimationEx(playerid, "CARRY", "crry_prtial", 4.0, 0, 0, 0, 0, 0);
        }
        else 
        {
            ApplyAnimationEx(playerid, "CAR", "TAP_HAND", 4.0, 0, 0, 0, 0, 0, 0);
        }

		PlayerData[playerid][pAnimation] = 0;
	}
	return true;
}

CMD:uncarry(playerid, params[])
{
    if(GetPlayerSpecialAction(playerid) == SPECIAL_ACTION_CARRY) SetPlayerSpecialAction(playerid, SPECIAL_ACTION_NONE);
	return true;
}

CMD:carry(playerid, params[])
{
    if(GetPlayerSpecialAction(playerid) != SPECIAL_ACTION_CARRY) SetPlayerSpecialAction(playerid, SPECIAL_ACTION_CARRY);
	return true;
}

CMD:aim(playerid, params[]) return DoAnim(playerid, 0, true); // PED.gang_gunstand


CMD:taxil(playerid, params[]) return DoAnim(playerid, 1, true); // MISC.Hiker_Pose_L


CMD:taxir(playerid, params[]) return DoAnim(playerid, 2, true); // MISC.Hiker_Pose


CMD:stretch(playerid, params[]) return DoAnim(playerid, 3, true); // PLAYIDLES.stretch


CMD:flip(playerid, params[]) return DoAnim(playerid, 4, true); // PED.KD_left


CMD:slapass(playerid, params[]) return DoAnim(playerid, 5, true); // SWEET.sweet_ass_slap


CMD:dance(playerid, params[])
{
    if(AnimationCheck(playerid))
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if((gettime() - AnimCooldown[playerid]) < 5) 
		return SendClientMessage(playerid, COLOR_LIGHTRED, "You need to wait 5 seconds between each animation");

    new animid;

   	if(sscanf(params, "d", animid)) 
        return SendClientMessage(playerid, COLOR_GREY, "USAGE: /dance [1-13]");

	switch(animid)
	{
		case 1: SetPlayerSpecialAction(playerid, 5);
	    case 2: SetPlayerSpecialAction(playerid, 6);
        case 3: SetPlayerSpecialAction(playerid, 7);
	    case 4: SetPlayerSpecialAction(playerid, 8);
	    case 5: ApplyAnimation(playerid, "DANCING", "DAN_Down_A", 4.0, 1, 0, 0, 0, 0, 1);
    	case 6: ApplyAnimation(playerid, "DANCING", "DAN_Left_A", 4.0, 1, 0, 0, 0, 0, 1);
     	case 7: ApplyAnimation(playerid, "DANCING", "DAN_Loop_A", 4.0, 1, 0, 0, 0, 0, 1);
      	case 8: ApplyAnimation(playerid, "DANCING", "DAN_Right_A", 4.0, 1, 0, 0, 0, 0, 1);
       	case 9: ApplyAnimation(playerid, "DANCING", "DAN_Up_A", 4.0, 1, 0, 0, 0, 0, 1);
        case 10: ApplyAnimation(playerid, "DANCING", "dnce_M_a", 4.0, 1, 0, 0, 0, 0, 1);
       	case 11: ApplyAnimation(playerid, "DANCING", "dnce_M_b", 4.0, 1, 0, 0, 0, 0, 1);
        case 12: ApplyAnimation(playerid, "DANCING", "dnce_M_c", 4.0, 1, 0, 0, 0, 0, 1);
        case 13: ApplyAnimation(playerid, "DANCING", "dnce_M_d", 4.0, 1, 0, 0, 0, 0, 1);
  		default: SendClientMessage(playerid, COLOR_GREY, "USAGE: /dance [style 1-13]");
	}

	if(animid >= 1 && animid <= 13) PlayerData[playerid][pAnimation] = 1;

    AnimCooldown[playerid] = gettime();
 	return true;
}

CMD:strip(playerid, params[])
{
    if(AnimationCheck(playerid))
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if((gettime() - AnimCooldown[playerid]) < 5) 
		return SendClientMessage(playerid, COLOR_LIGHTRED, "You need to wait 5 seconds between each animation");

    new animid;

   	if(sscanf(params, "d", animid)) 
        return SendClientMessage(playerid, COLOR_GREY, "USAGE: /strip [1-11]");

	switch(animid)
	{
		case 1: ApplyAnimation(playerid,"DANCING", "DAN_Loop_A", 4.1, 1, 1, 1, 1, 1, 1);
		case 2: ApplyAnimation(playerid,"DANCING", "dnce_M_a", 4.1, 1, 0, 0, 1, 1, 1);
		case 3: ApplyAnimation(playerid,"DANCING", "dnce_M_b", 4.1, 1, 1, 1, 1, 1, 1);
		case 4: ApplyAnimation(playerid,"DANCING", "dnce_M_c", 4.1, 1, 1, 1, 1, 1, 1);
		case 5: ApplyAnimation(playerid,"DANCING", "dnce_M_d", 4.1, 1, 0, 0, 1, 1, 1);
		case 6: ApplyAnimation(playerid,"DANCING", "dnce_M_e", 4.1, 1, 0, 0, 1, 1, 1);
		case 7: ApplyAnimation(playerid,"DANCING", "bd_clap1", 4.1, 1, 1, 1, 1, 1, 1);
		case 8: SetPlayerSpecialAction(playerid, SPECIAL_ACTION_DANCE1);
		case 9: SetPlayerSpecialAction(playerid, SPECIAL_ACTION_DANCE2);
		case 10: SetPlayerSpecialAction(playerid, SPECIAL_ACTION_DANCE3);
		case 11: SetPlayerSpecialAction(playerid, SPECIAL_ACTION_DANCE4);
  		default: SendClientMessage(playerid, COLOR_GREY, "USAGE: /strip [style 1-11]");
	}

	if(animid >= 1 && animid <= 11) PlayerData[playerid][pAnimation] = 1;

    AnimCooldown[playerid] = gettime();
 	return true;
}

CMD:wave(playerid, params[])
{
    if(AnimationCheck(playerid))
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if((gettime() - AnimCooldown[playerid]) < 5) 
		return SendClientMessage(playerid, COLOR_LIGHTRED, "You need to wait 5 seconds between each animation");

   	new animid;

   	if(sscanf(params,"d",animid)) return SendClientMessage(playerid, COLOR_GREY, "USAGE:/wave [1-3]");

	switch(animid)
	{
 		case 1: ApplyAnimation(playerid, "ON_LOOKERS", "wave_loop", 4.0, 1, 0, 0, 0, 0, 1);
 		case 2: ApplyAnimation(playerid, "KISSING", "gfwave2", 4.0, 0, 0, 0, 0, 0, 1);
 		case 3: ApplyAnimation(playerid, "PED", "endchat_03", 4.0, 0, 0, 0, 0, 0, 1);
 		default: SendClientMessage(playerid, COLOR_GREY, "USAGE/wave [1-3]");
 	}

 	if(animid >= 1 && animid <= 3) PlayerData[playerid][pAnimation] = 1;

 	AnimCooldown[playerid] = gettime();
 	return true;
}

CMD:handsup(playerid, params[])
{
    if(AnimationCheck(playerid))
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if((gettime() - AnimCooldown[playerid]) < 5) 
		return SendClientMessage(playerid, COLOR_LIGHTRED, "You need to wait 5 seconds between each animation");

    PlayerData[playerid][pAnimation] = 1;
    AnimCooldown[playerid] = gettime();
	SetPlayerSpecialAction(playerid, SPECIAL_ACTION_HANDSUP);
	return true;
}

CMD:rifflewalkstance(playerid, params[]) return DoAnim(playerid, 6, true); // PED.WALK_armed


CMD:rifflerunstance(playerid, params[])
{
    if(AnimationCheck(playerid))
		return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if((gettime() - AnimCooldown[playerid]) < 5) 
		return SendClientMessage(playerid, COLOR_LIGHTRED, "You need to wait 5 seconds between each animation");

    PlayerData[playerid][pAnimation] = 1;
    AnimCooldown[playerid] = gettime();

	ApplyAnimation(playerid,"PED","run_armed", 4.1, 1, 1, 1, 1, 1, 1);
	return true;
}

CMD:gsign(playerid, params[])
{
    if(AnimationCheck(playerid))
		return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if((gettime() - AnimCooldown[playerid]) < 5) 
		return SendClientMessage(playerid, COLOR_LIGHTRED, "You need to wait 5 seconds between each animation");

    new animid;

   	if(sscanf(params, "d", animid))
   		return SendClientMessage(playerid, COLOR_GREY, "USAGE: /gsign [1-10]");

	switch(animid)
	{

  		case 1: ApplyAnimation(playerid, "GHANDS", "gsign1", 4.0, false, true, true, true, 1, true);
        case 2: ApplyAnimation(playerid, "GHANDS", "gsign1LH", 4.0, false, true, true, true, 1, true);
        case 3: ApplyAnimation(playerid, "GHANDS", "gsign2", 4.0, false, true, true, true, 1, true);
        case 4: ApplyAnimation(playerid, "GHANDS", "gsign2LH", 4.0, false, true, true, true, 1, true);
        case 5: ApplyAnimation(playerid, "GHANDS", "gsign3", 4.0, false, true, true, true, 1, true);
        case 6: ApplyAnimation(playerid, "GHANDS", "gsign3LH", 4.0, false, true, true, true, 1, true);
        case 7: ApplyAnimation(playerid, "GHANDS", "gsign4", 4.0, false, true, true, true, 1, true);
        case 8: ApplyAnimation(playerid, "GHANDS", "gsign4LH", 4.0, false, true, true, true, 1, true);
        case 9: ApplyAnimation(playerid, "GHANDS", "gsign5", 4.0, false, true, true, true, 1, true);
        case 10: ApplyAnimation(playerid, "GHANDS", "gsign5LH", 4.0, false, true, true, true, 1, true);
  		default: SendClientMessage(playerid, COLOR_GREY, "USAGE: /gsign [1-10]");
   	}

   	if(animid >= 1 && animid <= 10) PlayerData[playerid][pAnimation] = 1;

   	AnimCooldown[playerid] = gettime();
   	return true;
}

CMD:dj(playerid, params[])
{
	if(AnimationCheck(playerid))
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

	new animid;

   	if(sscanf(params,"d",animid))
	   return SendClientMessage(playerid, COLOR_GREY, "USAGE:/dj [1-4]");

	switch(animid)
	{
		case 1: ApplyAnimation(playerid, "SCRATCHING", "scdldlp", 4.0, 1, 0, 0, 0, 0, 1);
    	case 2: ApplyAnimation(playerid, "SCRATCHING", "scdlulp", 4.0, 1, 0, 0, 0, 0, 1);
     	case 3: ApplyAnimation(playerid, "SCRATCHING", "scdrdlp", 4.0, 1, 0, 0, 0, 0, 1);
     	case 4: ApplyAnimation(playerid, "SCRATCHING", "scdrulp", 4.0, 1, 0, 0, 0, 0, 1);
      	default: SendClientMessage(playerid, COLOR_GREY, "USAGE:/dj [1-4]");
	}

	if(animid >= 1 && animid <= 4) PlayerData[playerid][pAnimation] = 1;

	AnimCooldown[playerid] = gettime();
	return true;
}

CMD:camera3(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CAMERA", "CAMCRCH_IDLELOOP", 4.0, 0, 0, 0, 1, 0, 1);
    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:camera2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CAMERA", "CAMSTND_CMON", 4.0, 0, 0, 0, 1, 0, 1);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:camshot1(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CAMERA", "PICCRCH_IN", 4.1, false, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:cpr(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "MEDIC", "CPR", 4.1, false, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crawl(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "PED", "CAR_CRAWLOUTRHS", 4.1, false, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:dropflag(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CAR", "FLAG_DROP", 4.1, false, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:fixcar(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if(IsPlayerInAnyVehicle(playerid)) return true;

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CAR", "FIXN_CAR_LOOP", 4.1, false, false, false, true, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:fixcarout(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    if(IsPlayerInAnyVehicle(playerid)) return true;

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CAR", "FIXN_CAR_OUT", 4.1, false, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:bat(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CRACK", "BBALBAT_IDLE_01", 4.1, true, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:bat2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CRACK", "BBALBAT_IDLE_02", 4.1, true, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:batstance(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "BASEBALL", "BAT_IDLE", 4.1, true, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:dealerstance(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "DEALER", "DEALER_IDLE", 4.1, true, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:dealerstance2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "DEALER", "DEALER_IDLE_01", 4.1, true, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:dealerstance3(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "DEALER", "DEALER_IDLE_02", 4.1, true, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:dealerstance4(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "DEALER", "DEALER_IDLE_03", 4.1, true, false, false, false, 0, false);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:lean(playerid, params[])
{
    if(AnimationCheck(playerid))
		return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "GANGS", "LEANIDLE", 4.0,0,1,1,1,0);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:cry(playerid, params[])
{
    if(AnimationCheck(playerid))
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "GRAVEYARD", "MRNF_LOOP", 4.1, true, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:seduce(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "JST_BUISNESS", "GIRL_02", 4.1, false, false, false, true, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:comeon(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "MISC", "BMX_COMEON", 4.1, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:sleep(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CRACK", "crckidle2", 4.1, true, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crack(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CRACK", "CRCKDETH2", 4.1, true, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crack2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CRACK", "CRCKIDLE1", 4.1, true, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crack3(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CRACK", "CRCKDETH3", 4.1, false, false, false, true, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crack4(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CRACK", "CRCKDETH1", 4.1, false, false, false, true, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:stretch2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "PLAYIDLES", "STRETCH", 4.1, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:rap1(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RAPPING", "RAP_A_LOOP", 4.1, true, true, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:rap2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RAPPING", "RAP_B_LOOP", 4.1, true, true, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:rap3(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RAPPING", "RAP_C_LOOP", 4.1, true, true, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:fuckyou2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RIOT", "RIOT_FUKU", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:riot2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RIOT", "RIOT_CHANT", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:riot3(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RIOT", "RIOT_PUNCHES", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:shouts(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RIOT", "RIOT_SHOUT", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

YCMD:provoke(playerid, params[], help) = what;

CMD:what(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "RIOT", "RIOT_ANGRY", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:camera1(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "CAMERA", "camcrch_cmon", 4.0, 0, 0, 0, 1, 0, 1);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:baridle(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "BAR", "BARMAN_IDLE", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:barorder(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "BAR", "BARCUSTOM_ORDER", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:servebottle(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "BAR", "BARSERVE_BOTTLE", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:serveglass(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "BAR", "BARSERVE_GLASS", 4.0, false, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:stand(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "WUZI", "WUZI_STAND_LOOP", 4.0, false, false, false, true, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:fightstance(playerid, params[])
{
    if(AnimationCheck(playerid)) return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "PED", "FIGHTIDLE", 4.1, true, false, false, false, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:idle(playerid, params[]) return DoAnim(playerid, 7, true); // PLAYIDLES.SHIFT


CMD:crossarm(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;
    
    ApplyAnimation(playerid, "COP_AMBIENT", "COPLOOK_LOOP", 4.1, false, false, false, true, 0, true);

    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crossarm3(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "COP_AMBIENT", "COPLOOK_THINK", 4.1, false, false, false, false, 0, true);
    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crossarm2(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "COP_AMBIENT", "COPLOOK_NOD", 4.1, false, false, false, false, 0, true);
    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:crosswin(playerid, params[])
{
    if(AnimationCheck(playerid)) 
        return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

    PlayerData[playerid][pAnimation] = 1;

    ApplyAnimation(playerid, "OTB", "WTCHRACE_WIN", 4.1, false, false, false, false, 0, true);
    AnimCooldown[playerid] = gettime();
    return true;
}

CMD:rifflestance(playerid, params[]) return DoAnim(playerid, 8, false); // PED.IDLE_ARMED


CMD:lean2(playerid, params[]) return DoAnim(playerid, 9, false); // MISC.PLYRLEAN_LOOP


CMD:mourn(playerid, params[]) return DoAnim(playerid, 10, false); // GRAVEYARD.MRNM_LOOP


CMD:old(playerid, params[]) return DoAnim(playerid, 11, false); // PED.IDLESTANCE_OLD


CMD:priest(playerid, params[]) return DoAnim(playerid, 12, false); // GRAVEYARD.PRST_LOOPA


CMD:frontfall(playerid, params[]) return DoAnim(playerid, 13, false); // PED.FLOOR_HIT_F


CMD:fuckyou(playerid, params[]) return DoAnim(playerid, 14, false); // PED.FUCKU


CMD:cover(playerid, params[]) return DoAnim(playerid, 15, false); // PED.COWER


CMD:eatanim(playerid, params[]) return DoAnim(playerid, 16, false); // PED.GUM_EAT


CMD:exhausted(playerid, params[]) return DoAnim(playerid, 17, false); // FAT.IDLE_tired


CMD:tired(playerid, params[]) return DoAnim(playerid, 18, false); // PED.IDLE_TIRED


CMD:seat(playerid, params[]) return DoAnim(playerid, 19, false); // PED.SEAT_DOWN


CMD:uturn(playerid, params[]) return DoAnim(playerid, 20, false); // PED.TURN_180


CMD:fallkick(playerid, params[]) return DoAnim(playerid, 21, false); // PED.KO_SKID_FRONT


CMD:kickdoor(playerid, params[]) return DoAnim(playerid, 22, false); // POLICE.DOOR_KICK


CMD:lay(playerid, params[]) return DoAnim(playerid, 23, false); // BEACH.bather


CMD:laugh(playerid, params[]) return DoAnim(playerid, 24, false); // RAPPING.LAUGH_01


CMD:downpush(playerid, params[]) return DoAnim(playerid, 25, false); // GANGS.SHAKE_CARA


CMD:lowbump(playerid, params[]) return DoAnim(playerid, 26, false); // GANGS.SHAKE_CARSH


CMD:agree(playerid, params[]) return DoAnim(playerid, 27, false); // GANGS.INVITE_YES


CMD:deal(playerid, params[]) return DoAnim(playerid, 28, false); // GANGS.DEALER_DEAL


CMD:flex(playerid, params[]) return DoAnim(playerid, 29, false); // BENCHPRESS.GYM_BP_CELEBRATE


CMD:reject(playerid, params[]) return DoAnim(playerid, 30, false); // GANGS.INVITE_NO


CMD:shouldercheck(playerid, params[]) return DoAnim(playerid, 31, false); // BD_FIRE.BD_PANIC_04


CMD:spray(playerid, params[]) return DoAnim(playerid, 32, false); // GRAFFITI.SPRAYCAN_FIRE


CMD:upshout(playerid, params[]) return DoAnim(playerid, 33, false); // ON_LOOKERS.PANIC_SHOUT


CMD:washhands(playerid, params[]) return DoAnim(playerid, 34, false); // BD_FIRE.WASH_UP


CMD:dishes(playerid, params[]) return DoAnim(playerid, 35, false); // BD_FIRE.WASH_UP


CMD:getupb(playerid, params[]) return DoAnim(playerid, 36, false); // FIGHT_E.HIT_FIGHTKICK_B


CMD:shoutat(playerid, params[]) return DoAnim(playerid, 37, false); // ON_LOOKERS.SHOUT_01


CMD:shout2(playerid, params[]) return DoAnim(playerid, 38, false); // ON_LOOKERS.SHOUT_LOOP


CMD:fallhit(playerid, params[]) return DoAnim(playerid, 39, false); // FIGHT_C.HITC_3


CMD:forwardlook(playerid, params[]) return DoAnim(playerid, 40, false); // BD_FIRE.BD_PANIC_02


CMD:sipdrink(playerid, params[]) return DoAnim(playerid, 41, false); // BAR.DNK_STNDM_LOOP


CMD:sit(playerid, params[]) return DoAnim(playerid, 42, false); // BEACH.PARKSIT_M_LOOP


CMD:sit2(playerid, params[]) return DoAnim(playerid, 43, false); // BEACH.SITNWAIT_LOOP_W


CMD:sit3(playerid, params[]) return DoAnim(playerid, 44, false); // BEACH.PARKSIT_W_LOOP


CMD:crouchshoot(playerid, params[]) return DoAnim(playerid, 45, false); // BUDDY.BUDDY_CROUCHFIRE


CMD:crouchreload(playerid, params[]) return DoAnim(playerid, 46, false); // BUDDY.BUDDY_CROUCHRELOAD


CMD:aimshoot(playerid, params[]) return DoAnim(playerid, 47, false); // BUDDY.BUDDY_FIRE


CMD:aimshoot2(playerid, params[]) return DoAnim(playerid, 48, false); // PYTHON.PYTHON_FIRE


CMD:smokelean(playerid, params[]) return DoAnim(playerid, 49, false); // SMOKING.M_smklean_loop


CMD:smoke(playerid, params[]) return DoAnim(playerid, 50, false); // GANGS.smkcig_prtl


CMD:shotgun(playerid, params[]) return DoAnim(playerid, 51, false); // BUDDY.BUDDY_FIRE_POOR


CMD:shottyreload(playerid, params[]) return DoAnim(playerid, 52, false); // BUDDY.BUDDY_RELOAD


CMD:blockshot(playerid, params[]) return DoAnim(playerid, 53, false); // BSKTBALL.BBALL_DEF_JUMP_SHOT


CMD:defense(playerid, params[]) return DoAnim(playerid, 54, false); // BSKTBALL.BBALL_DEF_LOOP


CMD:defenser(playerid, params[]) return DoAnim(playerid, 55, false); // BSKTBALL.BBALL_DEF_STEPR


CMD:dribble(playerid, params[]) return DoAnim(playerid, 56, false); // BSKTBALL.BBALL_IDLE


CMD:dribble2(playerid, params[]) return DoAnim(playerid, 57, false); // BSKTBALL.BBALL_WALK


CMD:dribble3(playerid, params[]) return DoAnim(playerid, 58, false); // BSKTBALL.BBALL_RUN


CMD:throw(playerid, params[]) return DoAnim(playerid, 59, false); // GRENADE.WEAPON_THROW


CMD:dunk(playerid, params[]) return DoAnim(playerid, 60, false); // BSKTBALL.BBALL_DNK


CMD:dunk2(playerid, params[]) return DoAnim(playerid, 61, false); // BSKTBALL.BBALL_DNK_GLI


CMD:fakeshot(playerid, params[]) return DoAnim(playerid, 62, false); // BSKTBALL.BBALL_DNK_LND


CMD:jumpshot(playerid, params[]) return DoAnim(playerid, 63, false); // BSKTBALL.BBALL_JUMP_SHOT


CMD:pickupball(playerid, params[]) return DoAnim(playerid, 64, false); // BSKTBALL.BBALL_PICKUP


CMD:angry(playerid, params[]) return DoAnim(playerid, 65, false); // BSKTBALL.BBALL_REACT_MISS


CMD:stealball(playerid, params[]) return DoAnim(playerid, 66, false); // BSKTBALL.BBALL_JUMP_END


CMD:backhit(playerid, params[]) return DoAnim(playerid, 67, false); // FIGHT_B.HITB_1


CMD:flykick(playerid, params[]) return DoAnim(playerid, 68, false); // FIGHT_C.FIGHTC_M


CMD:bitchslap(playerid, params[]) return DoAnim(playerid, 69, false); // BASEBALL.BAT_M


CMD:box1(playerid, params[]) return DoAnim(playerid, 70, false); // FIGHT_B.FIGHTB_1


CMD:box2(playerid, params[]) return DoAnim(playerid, 71, false); // FIGHT_B.FIGHTB_2


CMD:aimfast(playerid, params[]) return DoAnim(playerid, 72, false); // SNIPER.WEAPON_SNIPER


CMD:choke(playerid, params[]) return DoAnim(playerid, 73, false); // KNIFE.KILL_KNIFE_PED_DIE


CMD:dodge(playerid, params[]) return DoAnim(playerid, 74, false); // KNIFE.KNIFE_HIT_1


CMD:groundhit(playerid, params[]) return DoAnim(playerid, 75, false); // FIGHT_B.FIGHTB_G


CMD:hit(playerid, params[]) return DoAnim(playerid, 76, false); // FIGHT_B.HITB_2


CMD:kickhim(playerid, params[]) return DoAnim(playerid, 77, false); // POLICE.DOOR_KICK


CMD:kungfu1(playerid, params[]) return DoAnim(playerid, 78, false); // FIGHT_C.FIGHTC_1


CMD:kungfu2(playerid, params[]) return DoAnim(playerid, 79, false); // FIGHT_C.FIGHTC_2


CMD:kungfu3(playerid, params[]) return DoAnim(playerid, 80, false); // FIGHT_C.FIGHTC_3


CMD:kungfublock(playerid, params[]) return DoAnim(playerid, 81, false); // FIGHT_C.FIGHTC_BLOCK


CMD:kungfustomp(playerid, params[]) return DoAnim(playerid, 82, false); // FIGHT_C.FIGHTC_G


CMD:crushjump(playerid, params[]) return DoAnim(playerid, 83, false); // DODGE.CRUSH_JUMP


CMD:coverdive(playerid, params[]) return DoAnim(playerid, 84, false); // DODGE.COVER_DIVE_01


CMD:coverdive2(playerid, params[]) return DoAnim(playerid, 85, false); // DODGE.COVER_DIVE_02


CMD:punch(playerid, params[]) return DoAnim(playerid, 86, false); // RIOT.RIOT_PUNCHES


CMD:lookout(playerid, params[]) return DoAnim(playerid, 87, false); // ON_LOOKERS.LKAROUND_LOOP


CMD:lookout2(playerid, params[]) return DoAnim(playerid, 88, false); // ON_LOOKERS.LKUP_LOOP


CMD:injured(playerid, params[]) return DoAnim(playerid, 89, false); // SWEET.SWEET_INJUREDLOOP


CMD:gotshot(playerid, params[]) return DoAnim(playerid, 90, false); // SWEET.LAFIN_SWEET


CMD:compready(playerid, params[]) return DoAnim(playerid, 91, false); // ROCKET.RocketFire


CMD:animtest(playerid, params[])
{
    new lib[60], anim[60];

    if(sscanf(params, "s[60]s[60]", lib, anim)) return SendErrorMessage(playerid, "/animtest [lib] [anim]");

    ApplyAnimation(playerid, lib, anim, 4.1, false, false, false, true, 0, true);
    return true;
}

CMD:caranim(playerid, params[])
{
    if(AnimationCheck(playerid, true))
		return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");
   
    if(isnull(params))
	   	return SendSyntaxMessage(playerid, "/caranim [relax/tap]");

    if(!strcmp(params, "relax", false))
    {
        PlayerData[playerid][pAnimation] = 1;

        ApplyAnimation(playerid, "CAR", "SIT_RELAXED", 4.0, true, false, false, false, 0, true);
        return true;
    }
    else if(!strcmp(params, "tap", false))
    {
        PlayerData[playerid][pAnimation] = 1;

        ApplyAnimation(playerid, "CAR", "TAP_HAND", 4.0, true, false, false, false, 0, true);
        return true;
    }
    else
    {
        SendSyntaxMessage(playerid, "/caranim [relax/tap]");
    }
   	return true;
}

CMD:salute(playerid, params[]) return DoAnim(playerid, 92, false); // GHANDS.GSIGN5LH


CMD:roadcross(playerid, params[]) return DoAnim(playerid, 93, false); // PED.ROADCROSS


CMD:push(playerid, params[]) return DoAnim(playerid, 94, false); // FIGHT_D.FIGHTD_3


CMD:payshop(playerid, params[]) return DoAnim(playerid, 95, false); // DEALER.SHOP_PAY


CMD:openright(playerid, params[]) return DoAnim(playerid, 96, false); // VAN.VAN_OPEN_BACK_RHS


CMD:openleft(playerid, params[]) return DoAnim(playerid, 97, false); // VAN.VAN_OPEN_BACK_LHS


CMD:getshot(playerid, params[]) return DoAnim(playerid, 98, false); // PED.KO_SHOT_STOM


CMD:fallover(playerid, params[]) return DoAnim(playerid, 99, false); // PED.KO_SHOT_FRONT


CMD:deskbored(playerid, params[]) return DoAnim(playerid, 100, false); // INT_OFFICE.OFF_SIT_BORED_LOOP


CMD:desksit(playerid, params[]) return DoAnim(playerid, 101, false); // INT_OFFICE.OFF_SIT_IDLE_LOOP


CMD:chat(playerid, params[])
{
    if(AnimationCheck(playerid))
		return SendClientMessage(playerid, COLOR_GRAD1, "Cannot play animation at this time.");

	new chatstyle = PlayerData[playerid][pTalk];

	PlayerData[playerid][pAnimation] = 1;

	switch(chatstyle)
	{
		case 0: ApplyAnimation(playerid, "PED", "IDLE_CHAT", 4.0, 0, 1, 1, 0, 0, 1);
		case 1: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkA", 4.0, 0, 1, 1, 0, 0, 1);
		case 2: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkB", 4.0, 0, 1, 1, 0, 0, 1);
		case 3: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkC", 4.0, 0, 1, 1, 0, 0, 1);
		case 4: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkD", 4.0, 0, 1, 1, 0, 0, 1);
		case 5: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkE", 4.0, 0, 1, 1, 0, 0, 1);
		case 6: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkF", 4.0, 0, 1, 1, 0, 0, 1);
		case 7: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkG", 4.0, 0, 1, 1, 0, 0, 1);
		case 8: ApplyAnimation(playerid, "GANGS", "prtial_gngtlkH", 4.0, 0, 1, 1, 0, 0, 1);
	}

    return true;
}

// -----------------------------------------------------------------------------
// Animation Catalog Dialog & Command (/anims & /animlist)
// -----------------------------------------------------------------------------

YCMD:anims(playerid, params[], help)
{
	Dialog_Show(playerid, AnimCategoriesDialog, DIALOG_STYLE_LIST, 
		"Animation Catalog - Select Category", 
		"1. Animation Controls (/stopanim, /sa, /carry)\n\
		2. Dances, Music & Entertainment (/dance, /dj, /strip, /rap, /gsign)\n\
		3. Sitting, Laying & Resting (/sit, /lay, /sleep, /lean, /crack...)\n\
		4. Social, Gestures & Emotions (/wave, /salute, /laugh, /agree...)\n\
		5. Combat, Martial Arts & Action (/aim, /fightstance, /kungfu...)\n\
		6. Jobs, Items & Activities (/cpr, /crawl, /fixcar, /camera...)", 
		"Select", "Close");
	return true;
}

YCMD:animlist(playerid, params[], help) = anims;

Dialog:AnimCategoriesDialog(playerid, response, listitem, inputtext[])
{
	if(!response) return true;

	switch(listitem)
	{
		case 0: // Controls
		{
			Dialog_Show(playerid, AnimSubDialog, DIALOG_STYLE_MSGBOX,
				"Animation Controls",
				"{FFC107}/stopanim (or /sa){FFFFFF} - Stop current active animation\n\
				{FFC107}/carry{FFFFFF} - Start carrying stance\n\
				{FFC107}/uncarry{FFFFFF} - Stop carrying stance",
				"Back", "");
		}
		case 1: // Dances & Entertainment
		{
			Dialog_Show(playerid, AnimSubDialog, DIALOG_STYLE_MSGBOX,
				"Dances & Entertainment Animations",
				"{FFC107}/dance [1-13]{FFFFFF} - Perform 13 different dance styles\n\
				{FFC107}/dj{FFFFFF} - DJing on turntables\n\
				{FFC107}/strip [1-7]{FFFFFF} - Exotic dance styles\n\
				{FFC107}/rap1, /rap2, /rap3{FFFFFF} - Rapping & freestyle gestures\n\
				{FFC107}/gsign [1-10]{FFFFFF} - 10 gang hand sign variations",
				"Back", "");
		}
		case 2: // Sitting & Resting
		{
			Dialog_Show(playerid, AnimSubDialog, DIALOG_STYLE_MSGBOX,
				"Sitting & Resting Animations",
				"{FFC107}/sit, /sit2, /sit3, /seat, /desksit{FFFFFF} - Various sitting poses\n\
				{FFC107}/lay, /sleep{FFFFFF} - Lay down or sleep on the ground\n\
				{FFC107}/crack [1-4]{FFFFFF} - Injured or passed out poses\n\
				{FFC107}/lean, /lean2, /smokelean{FFFFFF} - Lean against wall\n\
				{FFC107}/stand, /baridle, /dealerstance [1-4]{FFFFFF} - Standing & dealer idle poses\n\
				{FFC107}/crossarm, /crossarm2, /crossarm3, /crosswin{FFFFFF} - Crossed arms\n\
				{FFC107}/stretch, /stretch2{FFFFFF} - Body stretching\n\
				{FFC107}/exhausted, /tired{FFFFFF} - Exhausted & panting pose\n\
				{FFC107}/deskbored{FFFFFF} - Bored at desk pose",
				"Back", "");
		}
		case 3: // Social & Gestures
		{
			Dialog_Show(playerid, AnimSubDialog, DIALOG_STYLE_MSGBOX,
				"Social & Gesture Animations",
				"{FFC107}/wave [1-3]{FFFFFF} - Wave hands\n\
				{FFC107}/handsup{FFFFFF} - Raise hands in the air\n\
				{FFC107}/salute{FFFFFF} - Military / Officer salute\n\
				{FFC107}/laugh{FFFFFF} - Laughing out loud\n\
				{FFC107}/agree{FFFFFF} - Nodding & agreeing\n\
				{FFC107}/reject{FFFFFF} - Rejecting gesture\n\
				{FFC107}/deal{FFFFFF} - Handshake / deal gesture\n\
				{FFC107}/shoutat, /shout2, /upshout, /shouts{FFFFFF} - Shouting\n\
				{FFC107}/fuckyou, /fuckyou2{FFFFFF} - Offensive middle finger\n\
				{FFC107}/provoke, /what{FFFFFF} - Provoking / questioning gesture\n\
				{FFC107}/seduce, /comeon{FFFFFF} - Seductive pose\n\
				{FFC107}/cry{FFFFFF} - Crying\n\
				{FFC107}/mourn{FFFFFF} - Grieving / mourning pose",
				"Back", "");
		}
		case 4: // Combat & Action
		{
			Dialog_Show(playerid, AnimSubDialog, DIALOG_STYLE_MSGBOX,
				"Combat & Action Animations",
				"{FFC107}/aim, /aimfast, /aimshoot, /aimshoot2{FFFFFF} - Weapon aiming stances\n\
				{FFC107}/rifflewalkstance, /rifflerunstance, /rifflestance{FFFFFF} - Rifle carrying\n\
				{FFC107}/crouchshoot, /crouchreload, /shotgun, /shottyreload{FFFFFF} - Combat & reload\n\
				{FFC107}/fightstance, /box1, /box2{FFFFFF} - Boxing & fight stance\n\
				{FFC107}/kungfu1-3, /kungfublock, /kungfustomp{FFFFFF} - Martial arts moves\n\
				{FFC107}/flykick, /fallkick, /bitchslap, /choke, /punch, /kickhim{FFFFFF} - Attacks\n\
				{FFC107}/dodge, /cover, /coverdive, /coverdive2, /blockshot, /defense{FFFFFF} - Defenses\n\
				{FFC107}/injured, /gotshot, /getshot, /fallover, /fallhit, /frontfall{FFFFFF} - Getting hit",
				"Back", "");
		}
		case 5: // Jobs & Activities
		{
			Dialog_Show(playerid, AnimSubDialog, DIALOG_STYLE_MSGBOX,
				"Jobs & Activities Animations",
				"{FFC107}/cpr{FFFFFF} - Medical CPR resuscitation\n\
				{FFC107}/crawl{FFFFFF} - Crawling on ground\n\
				{FFC107}/fixcar, /fixcarout{FFFFFF} - Vehicle engine repairing\n\
				{FFC107}/camera1, /camera2, /camera3, /camshot1{FFFFFF} - Photographer poses\n\
				{FFC107}/bat, /bat2, /batstance{FFFFFF} - Holding baseball bat\n\
				{FFC107}/eatanim, /sipdrink{FFFFFF} - Eating & drinking\n\
				{FFC107}/barorder, /servebottle, /serveglass{FFFFFF} - Bartender serving\n\
				{FFC107}/spray{FFFFFF} - Spraying graffiti / paint\n\
				{FFC107}/washhands, /dishes{FFFFFF} - Washing hands / dishes\n\
				{FFC107}/smoke{FFFFFF} - Smoking cigarette\n\
				{FFC107}/dribble [1-3], /throw, /dunk [1-2], /fakeshot, /jumpshot, /pickupball{FFFFFF} - Basketball\n\
				{FFC107}/taxil, /taxir{FFFFFF} - Hailing a taxi (left/right)\n\
				{FFC107}/dropflag, /roadcross, /payshop, /openleft, /openright{FFFFFF} - Environment",
				"Back", "");
		}
	}
	return true;
}

Dialog:AnimSubDialog(playerid, response, listitem, inputtext[])
{
	return Command_ReProcess(playerid, "anims", 0);
}
