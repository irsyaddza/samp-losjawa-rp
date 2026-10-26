#define LOCAL_GARAGE 400
#define LOCAL_BIZZ 500
#define LOCAL_HOUSE 600
#define LOCAL_APARTMENT 800

// Type Offer
#define OFFER_TYPE_NONE		0
#define OFFER_TYPE_VSELL	1
#define OFFER_TYPE_SERVICE	2
#define OFFER_TYPE_RENT	3

// Weapon Skill
#define NORMAL_SKILL	1
#define MEDIUM_SKILL	2
#define FULL_SKILL		3

#define MAX_SERVER_HEALTH (200.0)
#define DEATH_WAIT_SECONDS (60)
#define MAX_SCENES 50
#define MAX_COOLDOWNS 3
#define MAX_SIGNALTOWER 60
#define MAX_DROP_ITEMS 100
#define MAX_ADMIN_VEHICLES 20
#define MAX_SMS 30
#define MAX_CALLHISTORY 50
#define MAX_INTERIORS 100
#define MAX_MATERIAL 3
#define MAX_BUYHOUSES 4
#define MAX_INDUSTRY 31
#define MAX_TRUCKER_ITEMS 26
#define MAX_CRATE 60
#define MAX_AD_QUEUE 5
#define MAX_PLAYER_WEAPON_PACKAGE 12
#define MAX_CAR_WEAPON_PACKAGE 20
#define MAX_MOVEDOORS 100
#define MAX_GATES 100
#define MAX_ATTACH_WEAPON 17

#define COOLDOWN_CLOTHES  	0

/* Checkpoint */
#define CHECKPOINT_NONE 			0
#define CHECKPOINT_HOUSE 			1
#define CHECKPOINT_UNLOADFISHING	7
#define CHECKPOINT_GOFISHING 		8
#define CHECKPOINT_FARMER 			9
#define CHECKPOINT_FARMER2 			10
#define CHECKPOINT_COMP 			11
#define CHECKPOINT_VEH 				12
#define CHECKPOINT_NEWSPAPER 		13
#define CHECKPOINT_CAREXAM          14
#define CHECKPOINT_APARTMENT        15

/* Race Checkpoint */
#define RCHECKPOINT_TRUCKER 		1
#define RCHECKPOINT_TRUCKERJOB 		2

// Server values
#define deathcost 500
#define cchargetime 30
#define callcost 10

#define PH_LBUTTON		0
#define PH_RBUTTON		1
#define PH_SELFIE		2
#define PH_UP 			3
#define PH_DOWN     	4
#define PH_CLICKOPEN  	5

#define PH_OUTGOING 0
#define PH_INCOMING 1
#define PH_MISSED 	2

// Main configuration
#define TollCost (50) 					// How much it costs to pass the tolls
#define TollDelayCop (4) 				// The timespace in seconds between each /toll command for all cops (To avoid spam)
#define TollOpenDistance (4.0) 			// The distance in units the player can be from the icon to open the toll

// Tolls configuration
#define MAX_TOLLS (5) // Amount of tolls
#define RichmanToll (0)
#define FlintToll (1)
#define LVToll (2)
#define BlueberryTollR (3)
#define BlueberryTollL (4)

// Job defines
#define JOB_NONE			0
#define JOB_FARMER			1
#define JOB_TRUCKER         2
#define JOB_MECHANIC        3
#define JOB_TAXI        	4
#define JOB_GUIDE        	5
#define JOB_TRAIN_DRIVER	8

new bool:PlayerOnTrainJob[MAX_PLAYERS];
new Float:PlayerTrainSpeedLimit[MAX_PLAYERS];
new PlayerOverspeedWarns[MAX_PLAYERS];
new PlayerTotalFines[MAX_PLAYERS];
new PlayerHornCooldown[MAX_PLAYERS];
new PlayerTrainJobDelay[MAX_PLAYERS];

#define MAX_SALARY_HISTORY 20

enum enum_SalaryHistory
{
    shAmount,
    shSource[48],
    shTime[12]
}

new SalaryHistory[MAX_PLAYERS][MAX_SALARY_HISTORY][enum_SalaryHistory];
new SalaryHistoryCount[MAX_PLAYERS];

// Plain-Pawn validators replacing pawnregex.so calls (that plugin
// segfaults on this server build). Semantics identical to the regexes.

// Equivalent of ^[A-Za-z0-9 ]+$ within a length window.
stock IsAlnumSpace(const s[], minlen, maxlen)
{
	new len = strlen(s);
	if(len < minlen || len > maxlen) return 0;

	for(new i = 0; i < len; ++i)
	{
		new c = s[i];
		if(c != ' ' && (c < '0' || c > '9') && (c < 'A' || c > 'Z') && (c < 'a' || c > 'z'))
		    return 0;
	}
	return 1;
}

// Equivalent of ^\d{1,3}(\.\d{1,3}){3}$ — a plain dotted quad.
stock IsIPv4Like(const s[])
{
	new i = 0, groups = 0;

	while(s[i])
	{
		new dig = 0;
		while(s[i] >= '0' && s[i] <= '9') { i++; dig++; }

		if(dig < 1 || dig > 3) return 0;
		groups++;

		if(s[i] == '.') { i++; continue; }
		if(!s[i]) break;
		return 0;
	}
	return (groups == 4);
}

stock AddSalaryHistory(playerid, amount, const sourceStr[])
{
    if(!IsPlayerConnected(playerid)) return 0;

    new hour, minute, second;
    gettime(hour, minute, second);

    new slot = SalaryHistoryCount[playerid];
    if(slot >= MAX_SALARY_HISTORY)
    {
        for(new i = 0; i < MAX_SALARY_HISTORY - 1; i++)
        {
            SalaryHistory[playerid][i][shAmount] = SalaryHistory[playerid][i + 1][shAmount];
            format(SalaryHistory[playerid][i][shSource], 48, "%s", SalaryHistory[playerid][i + 1][shSource]);
            format(SalaryHistory[playerid][i][shTime], 12, "%s", SalaryHistory[playerid][i + 1][shTime]);
        }
        slot = MAX_SALARY_HISTORY - 1;
    }
    else
    {
        SalaryHistoryCount[playerid]++;
    }

    SalaryHistory[playerid][slot][shAmount] = amount;
    format(SalaryHistory[playerid][slot][shSource], 48, "%s", sourceStr);
    format(SalaryHistory[playerid][slot][shTime], 12, "[%02d:%02d:%02d]", hour, minute, second);
    return 1;
}
