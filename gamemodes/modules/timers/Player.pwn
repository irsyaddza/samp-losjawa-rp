new PlayerDrunkLevelLast[MAX_PLAYERS];
new PlayerFPS[MAX_PLAYERS];

ptask Players[1000](i)
{
	if(!LoggedIn{i})
	{
	    if(SafeTime[i] > 0)
		{
  			if(FinishedDownloadingModels{i} == true)
			{
				SafeTime[i]--;

				if(SafeTime[i] == 1)
				{
					SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmCmd: %s was kicked by SYSTEM, Reason: You've been kicked, not logging on in 120 seconds.", ReturnName(i));

					SendClientMessage(i, COLOR_LIGHTRED, "You've been kicked, not logging on in 120 seconds."), KickEx(i);
				}
			}
		}

		return true;
	}

	if(PlayerData[i][pID] == -1) return true;

	new drunknew = GetPlayerDrunkLevel(i);
	if (drunknew < 100)
	{
		SetPlayerDrunkLevel(i, 2000);
		PlayerFPS[i] = 0;
	}
	else
	{
		new fps = PlayerDrunkLevelLast[i] - drunknew;
		if (fps >= 0 && fps < 300)
		{
			PlayerFPS[i] = fps;
		}
	}
	PlayerDrunkLevelLast[i] = GetPlayerDrunkLevel(i);

	if(PlayerData[i][pTutorialStep])
	{
		if(TutorialDelay[i] > 0)
		{
			TutorialDelay[i]--;
			if(TutorialDelay[i] <= 0)
			{
				PlayerData[i][pTutorialStep]++;
				ClearChatBox(i);
				RefreshTutorial(i);
			}
			// Silent auto-advance
		}
	}

	new playerState = GetPlayerState(i), vehicleid = GetPlayerVehicleID(i), timestamp = gettime();

	PlayerData[i][pPlayingSeconds]++;

	if(PhoneOpen{i})
	{
 		if(!ph_menuid[i] && !ph_sub_menuid[i] && !Dialog_Opened(i))
       	{
			RenderPlayerPhone(i, ph_menuid[i], ph_sub_menuid[i]);
		}
	}

	if(adTick[i]) adTick[i]--;

	if(AFKTimer[i] > 0)
	{
		AFKTimer[i]--;

		if(AFKTimer[i] <= 0)
		{
		    AFKTimer[i] = 0;
		    AFKCount[i] = 1;

            IsAFK{i} = true;
		}
		else
		{
			AFKCount[i] = 0;

			IsAFK{i} = false;
		}
	}
	else
	{
		AFKCount[i]++;
	}

	if(AFKCount[i] >= 600)
	{
		TogglePlayerControllable(i, false);

		SendAdminAlert(COLOR_LIGHTRED, JUNIOR_ADMINS, "AdmCmd: %s was kicked by SYSTEM, Reason: AFK", ReturnName(i));
		SendClientMessage(i, COLOR_LIGHTRED, "You have been kicked by SYSTEM, reason: AFK over the limit");

		new largeQuery[300];
		mysql_format(dbCon, largeQuery, sizeof(largeQuery), "INSERT INTO `logs_kick` (`IP`, `Character`, `KickedBy`, `Reason`, `character_id`, `user_id`) VALUES ('%e', '%e', 'SYSTEM', 'AFK Over the limit', %d, %d)", ReturnIP(i), ReturnName(i), PlayerData[i][pID], AccountData[i][aUserid]);
		mysql_tquery(dbCon, largeQuery);

		return Kick(i);
	}

	if(PlayerData[i][pPayDay] < 3600) PlayerData[i][pPayDay]++;

	PlayerData[i][pExpCounter]++;

	if(PlayerData[i][pExpCounter] == 3600)
	{
		PlayerData[i][pExpCounter] = 0;
		PlayerData[i][pExp]++;

		new expamount = ((PlayerData[i][pLevel]) * 4 + 4);

		if(PlayerData[i][pExp] >= expamount && (PlayerData[i][pLevel] < 2 || PlayerData[i][pDonateRank]))
		{
			PlayerData[i][pLevel]++;

			PlayerPlaySound(i, 1052, 0.0, 0.0, 0.0);
			SetPlayerScore(i, PlayerData[i][pLevel]);

			format(sgstr, sizeof(sgstr), "~g~Level Up~n~~w~You are now level %i", PlayerData[i][pLevel]);
			GameTextForPlayer(i, sgstr, 5000, 1);

			if(PlayerData[i][pDonateRank] > 0)
			{
				PlayerData[i][pExp] -= expamount;

				new total = PlayerData[i][pExp];

				if(total > 0)
				{
					PlayerData[i][pExp] = total;
				}
				else
				{
					PlayerData[i][pExp] = 0;
				}
			}
			else
			{
				PlayerData[i][pExp] = 0;
			}
		}
	}

	if(PlayerData[i][pHelpme] == 1)
	{
        PlayerData[i][pHelpmeSeconds]++;

        if(PlayerData[i][pHelpmeSeconds] == 180)
        {
            PlayerData[i][pHelpmeSeconds] = 0;

       		SendTesterAlert(TEAM_TESTER_COLOR, "[TESTER]{FFBB00} Request %d has been active for more than 3 minutes.", i);
    	}
	}

	if(RequestedToShake[i][2] > 0)
	{
		RequestedToShake[i][2]--;

		if(!RequestedToShake[i][2])
		{
		    RequestedToShake[i][0] = INVALID_PLAYER_ID;
		    RequestedToShake[i][1] = 0;
		    RequestedToShake[i][2] = 0;
		}
	}

    //death timer
	if(PlayerData[i][pInjured])
	{
		if(DeathTimer[i] <= 119)
		{
			if(!death_Pause[i])
			{
				if(playerState == PLAYER_STATE_ONFOOT)
				{
					if(GetPlayerAnimationIndex(i) != 1701)
					{
						ApplyAnimation(i, "WUZI", "CS_Dead_Guy", 4.1, 0, 0, 0, 1, 0, 1);
					}
				}
				else
				{
					if(GetPlayerAnimationIndex(i) != 1018)
					{
						ApplyAnimation(i, "ped", "CAR_dead_LHS", 4.1, 0, 0, 0, 1, 0, 1);
					}
				}
			}
			else
			{
				death_Pause[i]--;
			}
		}

    	if(!KnockedOut{i})
		{
		    if(DeathTimer[i] > 0)
		    {
    	  		DeathTimer[i]--;

				if(!DeathMode{i})
				{
					if(DeathTimer[i] <= 0)
					{
						MakePlayerDead(i);
					}
				}
				else
				{
					if(DeathTimer[i] <= 0)
					{
						SendClientMessage(i, COLOR_YELLOW, "-> Your death time is up. You can /respawnme now.");
					}
				}
			}
		}
		else
		{
		    if(DeathTimer[i] > 0)
		    {
	    	 	DeathTimer[i]--;
			}
		}
	}
	else
	{
		if(!DeathMode{i})
  		{
			if(BrokenLeg{i})
			{
				if((timestamp - BrokenLegTimer[i]) >= 120)
				{
				    BrokenLeg{i} = false;

					BrokenLegTimer[i] = 0;
				}
			}
		}
	}

	//unscrambling
	if(h_times[i] > 0)
	{
		new str[128];
		format(str, sizeof(str), "~y~/(uns)cramble ~w~<unscrambled word> ~r~to unscramble the word.~n~'~w~%s~r~'.~n~You have ~w~%d ~r~seconds left to finish.", h_word[i], h_times[i]);
        ShowPlayerFooter(i, str, 8000);

        h_times[i]--;

        if(h_times[i] <= 0)
        {
			FailUnscramble(i);
        }
	}

	//drug boost timer
	if(PlayerData[i][pDrugEffects] != -1)
	{
	    if(IsBrutallyWounded(i))
	    {
            ResetDrugBoost(i);
	    }
	    else
	    {
		    if(PlayerData[i][pDrugBoost] > 0)
		    {
		        new Float:health = PlayerData[i][pHealth];

		        PlayerData[i][pDrugTick]++;

		        if(PlayerData[i][pDrugTick] == 4)
		        {
		            PlayerData[i][pDrugTick] = 0;
		            PlayerData[i][pDrugBoost]--;

		            // Countdown duration (1 second per 4 ticks)
		            if(PlayerData[i][pDrugDuration] > 0)
		            {
		            	PlayerData[i][pDrugDuration]--;

		            	new Float:armour = PlayerData[i][pArmour];
		            	new Float:dose = PlayerData[i][pDrugAmountUsed];

		            	// === Drug-specific tick behaviors scaled by dosage (0.1, 0.2, 0.3g) ===
		            	switch(PlayerData[i][pDrugEffects])
		            	{
		            		case 1: // Marijuana: slow health regen
		            		{
		            			if(health < 150.0) SetPlayerHealthEx(i, health + 0.3);
		            		}
		            		case 4: // Heroin: armor regen scaled by dose (0.1g -> +15% max, 0.2g -> +30% max, 0.3g -> +50% max per dose)
		            		{
		            			new Float:heroCap = (dose <= 0.15) ? (15.0) : ((dose <= 0.25) ? (30.0) : (50.0));
		            			if(armour < 100.0)
		            			{
		            				new Float:newArmour = armour + (heroCap / 10.0); // gradual fill over 10 secs
		            				if(newArmour > 100.0) newArmour = 100.0;
		            				SetPlayerArmourEx(i, newArmour);
		            			}
		            		}
		            		case 5: // Ketamine: random stumble animation (1 in 10 chance per sec)
		            		{
		            			if(!IsPlayerInAnyVehicle(i) && random(10) == 0)
		            			{
		            				ApplyAnimation(i, "PED", "FLOOR_hit_f", 4.1, 0, 1, 1, 0, 0, 1);
		            				SendClientMessage(i, COLOR_LIGHTRED, "* You feel disoriented and stumble from Ketamine...");
		            			}
		            		}
		            		case 7: // Methamphetamine: armor regen scaled by dose (0.1g -> +10% max, 0.2g -> +20% max, 0.3g -> +30% max per dose, capped at 50%)
		            		{
		            			new Float:methCap = (dose <= 0.15) ? (10.0) : ((dose <= 0.25) ? (20.0) : (30.0));
		            			if(armour < 50.0)
		            			{
		            				new Float:newArmour = armour + (methCap / 10.0);
		            				if(newArmour > 50.0) newArmour = 50.0;
		            				SetPlayerArmourEx(i, newArmour);
		            			}
		            		}
		            	}
		            }

		            if(PlayerData[i][pDrugDuration] <= 0)
		            {
		            	// Post-Meth Crash (Kelelahan setelah efek Methamphetamine habis)
		            	if(PlayerData[i][pDrugEffects] == 7)
		            	{
		            		SendClientMessage(i, COLOR_LIGHTRED, "[METH CRASH] The adrenaline effect of Meth worn off. You feel exhausted...");
		            		ApplyAnimation(i, "FAT", "IDLE_tired", 4.1, 0, 0, 0, 1, 0, 1);
		            	}
		            	else
		            	{
		            		GameTextForPlayer(i, "~r~Drug effect worn off.", 3000, 3);
		            	}
		            	ResetDrugBoost(i);
		            }
		            else
		            {
		            	if(health + 1.0 < MAX_DRUG_HEALTH)
		                	SetPlayerHealthEx(i, health + 1.0);
		            }
		        }
			}
			else ResetDrugBoost(i);
		}
	}
	// Fentanyl Overdose natural recovery timer (1 second countdown per 4 ticks)
	if(PlayerData[i][pOverdosing])
	{
		TogglePlayerControllable(i, 0);
		if(GetPlayerAnimationIndex(i) != 363 && GetPlayerAnimationIndex(i) != 364 && GetPlayerAnimationIndex(i) != 362)
		{
			ApplyAnimation(i, "CRACK", "crckidle2", 4.1, 0, 0, 0, 1, 0, 1);
		}

		if(PlayerData[i][pOverdoseTimer] > 0)
		{
			PlayerData[i][pOverdoseTimer]--;
			if(PlayerData[i][pOverdoseTimer] <= 0)
			{
				PlayerData[i][pOverdosing] = 0;
				ClearAnimations(i);
				TogglePlayerControllable(i, 1);

				// Recover with 15.0 HP (weak state)
				SetPlayerHealthEx(i, 15.0);
				SendClientMessage(i, COLOR_GREEN, "[OVERDOSE RECOVERY] You slowly regained consciousness from the overdose... Your body feels weak (15 HP).");
				GameTextForPlayer(i, "~g~RECOVERED~n~~w~Weak State (15 HP)", 4000, 3);
			}
		}
	}

	// High Tolerance Drug Withdrawal (Sakaw / Tremor ringan jika toleransi >= 80)
		new maxTol = 0;
		for(new d = 0; d < 10; d++)
		{
			if(PlayerData[i][pDrugTolerance][d] > maxTol) maxTol = PlayerData[i][pDrugTolerance][d];
		}

		if(maxTol >= 80 && random(120) == 0)
		{
			SetPlayerDrunkLevel(i, 3500);
			SendClientMessage(i, COLOR_LIGHTRED, "[WITHDRAWAL] Your body is experiencing mild tremors due to high drug tolerance...");
		}

	// Hunger & Thirst Decay (Every 180s = -2% Hunger, Every 120s = -3% Thirst)
	if(PlayerData[i][pPlayingSeconds] % 180 == 0)
	{
		if(PlayerData[i][pHunger] > 0)
		{
			PlayerData[i][pHunger] -= 2;
			if(PlayerData[i][pHunger] < 0) PlayerData[i][pHunger] = 0;
		}
	}
	if(PlayerData[i][pPlayingSeconds] % 120 == 0)
	{
		if(PlayerData[i][pThirst] > 0)
		{
			PlayerData[i][pThirst] -= 3;
			if(PlayerData[i][pThirst] < 0) PlayerData[i][pThirst] = 0;
		}
	}

	// Hunger & Thirst Warnings & Starvation Penalty
	if(PlayerData[i][pHunger] <= 5 || PlayerData[i][pThirst] <= 5)
	{
		if(PlayerData[i][pPlayingSeconds] % 10 == 0)
		{
			new Float:pHP = PlayerData[i][pHealth];
			if(pHP > 10.0)
			{
				SetPlayerHealthEx(i, pHP - 2.0);
				SendClientMessage(i, COLOR_LIGHTRED, "[NEEDS] You are starving / severely dehydrated! (-2 HP)");
			}
		}
	}
	else if(PlayerData[i][pHunger] <= 20 || PlayerData[i][pThirst] <= 20)
	{
		if(PlayerData[i][pPlayingSeconds] % 120 == 0)
		{
			SendClientMessage(i, COLOR_YELLOW, "[NEEDS] You are feeling very hungry / thirsty! Find food or drink soon.");
		}
	}

	    if(PlayerData[i][pDrugStamp] != 0) //drug withdrawal effects
	    {
	        if((timestamp - PlayerData[i][pDrugStamp]) > 5400)
	        {
		        new Float:health = PlayerData[i][pHealth];

		        if(health > 150.0)
		        {
		            PlayerData[i][pDrugTick]++;

		            if(PlayerData[i][pDrugTick] == 60)
		            {
		                PlayerData[i][pDrugTick] = 0;

		            	if(health - 1.0 < 150.0)
						{
			            	PlayerData[i][pDrugStamp] = 0;

							SetPlayerHealthEx(i, 150.0);
						}
						else SetPlayerHealthEx(i, health - 1.0);
		            }
		        }
		        else
		        {
		            PlayerData[i][pDrugStamp] = 0, PlayerData[i][pDrugTick] = 0;
		        }
			}
	    }

	//phone related stuff
	if(PlayerData[i][pCellTime] > 0)
	{
		if(PlayerData[i][pCallLine] != INVALID_PLAYER_ID)
		{
			new calling = PlayerData[i][pCallLine];

			if(PlayerData[i][pCellTime] == cchargetime)
			{
				PlayerData[i][pCellTime] = 1;

				if(PlayerData[calling][pCallLine] == i && !PlayerData[i][pIncomingCall])
				{
					if(PlayerData[i][pCash] - (PlayerData[i][pCallCost] + callcost) < 0)
					{
						TakePlayerMoney(i, PlayerData[i][pCallCost]);

						format(sgstr, sizeof(sgstr), "~w~The call cost~n~~r~$%d", PlayerData[i][pCallCost]);
						GameTextForPlayer(i, sgstr, 5000, 1);

						PlayerData[i][pCallCost] = 0;

						SendClientMessage(calling,  COLOR_GRAD2, "[ ! ] They hung up.");
						CancelCall(i);
					}
					else PlayerData[i][pCallCost] = PlayerData[i][pCallCost] + callcost;
				}
			}

			PlayerData[i][pCellTime]++;

			if(PlayerData[calling][pIncomingCall] && PlayerData[i][pCellTime] % 10 == 1 && !ph_silentmode[calling])
			{
				PlayPlayerCallTone(calling);

				if(PlayerData[i][pCellTime] == 10) AnnounceMyAction(calling, "phone begins to ring.");
			}
		}
	}
	else
	{
		if(PlayerData[i][pCallCost] > 0)
		{
			TakePlayerMoney(i, PlayerData[i][pCallCost]);

			format(sgstr, sizeof(sgstr), "~w~The call cost~n~~r~$%d", PlayerData[i][pCallCost]);
			GameTextForPlayer(i, sgstr, 5000, 1);

			PlayerData[i][pCallCost] = 0;			
		}
	}

	//jail timer
	if(PlayerData[i][pJailed])
	{
	    switch(PlayerData[i][pJailed])
	    {
	        case 1:
	        {
	            if(PlayerData[i][pSentenceTime] > 0)
				{
					PlayerData[i][pSentenceTime]--;

					if(!PlayerData[i][pSentenceTime])
			        {
						PlayerData[i][pJailed] = PUNISHMENT_TYPE_NONE;
						PlayerData[i][pSentenceTime] = 0;

						SetPlayerSpawn(i);

						mysql_format(dbCon, gquery, sizeof(gquery), "UPDATE characters SET `ActiveListings` = '0', `Jailed` = '0', `SentenceTime` = '0' WHERE `ID` = '%i'", PlayerData[i][pID]);
						mysql_pquery(dbCon, gquery);
			        }
				}
    		}
		    case 2, 3:
		    {
		        if(PlayerData[i][pSentenceTime] > 0)
				{
					PlayerData[i][pSentenceTime]--;

			        if(!PlayerData[i][pSentenceTime])
			        {
						SendClientMessage(i, COLOR_YELLOW, "-> Your jail/prison time is up, use /releaseme to get released.");
			        }
				}
	        }
	    }
	}

	if(playerState == PLAYER_STATE_DRIVER)
	{
		if(CoreVehicles[vehicleid][vehicleBadlyDamage])
		{
			new Keys, ud, lr;
			GetPlayerKeys(i, Keys, ud, lr);

		  	if(Keys == 8)
			{
				if(random(100) <= 10)
				{
			  		CoreVehicles[vehicleid][vehicleBadlyDamage] = 0;
					GameTextForPlayer(i, "~g~Engine On", 2000, 4);
					SetEngineStatus(vehicleid, true);
				}
			}

			if(CoreVehicles[vehicleid][vehicleBadlyDamage] == 1)
			{
				GameTextForPlayer(i, "~r~Engine Refuse", 2000, 4);
			}

			CoreVehicles[vehicleid][vehicleBadlyDamage]--;
		}

		new carid = CoreVehicles[vehicleid][vehicleCarID], Float: vehicleSpeed = GetVehicleSpeed(vehicleid); 

		CoreVehicles[vehicleid][vSpeed] = vehicleSpeed;
		vehicleSpeed = floatround(vehicleSpeed * 195.12);		

		if(CoreVehicles[vehicleid][vHasEngine])
		{
		    if(CoreVehicles[vehicleid][vehicleEngineStatus])
		    {
		        if(CoreVehicles[vehicleid][vehFuel])
		        {
					CoreVehicles[vehicleid][vehFuel] -= GetVehicleConsumptionPerSecond(vehicleid, vehicleSpeed);
				}

				if(carid != -1)
				{
					CarData[carid][carMileage] += vehicleSpeed * 0.621371192 / 3600.0;
					CarData[carid][carEngineL] -= 0.000016;
					CarData[carid][carBatteryL] -= 0.000016;

					GetVehicleDamageStatus(vehicleid, CoreVehicles[vehicleid][vehDamage][0], CoreVehicles[vehicleid][vehDamage][1], CoreVehicles[vehicleid][vehDamage][2], CoreVehicles[vehicleid][vehDamage][3]);
				}				

				if(vehicleSpeed > 300)
				{
				    new Float: vehVelocity[3];
			        GetVehicleVelocity(vehicleid, vehVelocity[0], vehVelocity[1], vehVelocity[2]);
				    OnPlayerSpeedHack(i, 1, vehicleSpeed, vehVelocity[0], vehVelocity[1], vehVelocity[2]);
				}
			}

			//if(vehicleSpeed > 15 && !CoreVehicles[vehicleid][vehicleEngineStatus] && (timestamp - CoreVehicles[vehicleid][vehicleEngineStamp]) > 10)
		  	//{
		  	//	OnPlayerNOPEngine(i);
		  	//}
		}

		if(CoreVehicles[vehicleid][startup_delay] > 0)
		{
			if(CoreVehicles[vehicleid][startup_delay_sender] != INVALID_PLAYER_ID)
			{
				CoreVehicles[vehicleid][startup_delay] -= 5;

				if(CoreVehicles[vehicleid][startup_delay] <= 0 && i == CoreVehicles[vehicleid][startup_delay_sender])
				{
					if(random(9) < CoreVehicles[vehicleid][startup_delay_random])
					{
						GameTextForPlayer(CoreVehicles[vehicleid][startup_delay_sender], "~r~Engine Refuse", 2000, 4);
					}
					else
					{
						SetEngineStatus(vehicleid, true);
						GameTextForPlayer(CoreVehicles[vehicleid][startup_delay_sender], "~g~Engine On", 2000, 4);
					}

					CoreVehicles[vehicleid][startup_delay_sender] = INVALID_PLAYER_ID;
				}
				else if(CoreVehicles[vehicleid][startup_delay] <= 0)
				{
					CoreVehicles[vehicleid][startup_delay_sender] = INVALID_PLAYER_ID;
				}
			}
		}

		new Float: hp;

		GetVehicleHealth(vehicleid, hp);

		if(hp < CoreVehicles[vehicleid][vehCrash])
		{
			new Float: vehicle_health_loss = CoreVehicles[vehicleid][vehCrash] - hp, vdamage[4];

			if(carid != -1)
			{
	            if(CarData[carid][carArmour])
				{
		            GetVehicleDamageStatus(vehicleid, vdamage[0], vdamage[1], vdamage[2], vdamage[3]);

					for(new x = 0; x != 4; ++x)
					{
					    if(vdamage[x] > CoreVehicles[vehicleid][vehDamage][x])
					    {
					        vdamage[x] = CoreVehicles[vehicleid][vehDamage][x];

					        SetVehicleDamageStatus(vehicleid, vdamage[0], vdamage[1], vdamage[2], vdamage[3]);
					    }
					}

	                if(CarData[carid][carArmour] >= vehicle_health_loss)
                 	{
	                    CarData[carid][carArmour] -= vehicle_health_loss;
	                }
	                else
	                {
	                    CarData[carid][carArmour] = 0;
	                }
            	}

				switch(hp)
				{
					case 550..649:
					{
			    		CarData[carid][carEngineL] -= (vehicle_health_loss / 125.0);

						if(hp < 650) CarData[carid][carBatteryL] -= (vehicle_health_loss / 150.0);
					}
					case 390..549:
					{
			    		CarData[carid][carEngineL] -= (vehicle_health_loss / 100.0);

						if(hp < 650) CarData[carid][carBatteryL] -= (vehicle_health_loss / 125.0);
					}
					case 250..389:
					{
			    		CarData[carid][carEngineL] -= (vehicle_health_loss / 75.0);

						if(hp < 650) CarData[carid][carBatteryL] -= (vehicle_health_loss / 100.0);
					}
				}
			}

			if(CoreVehicles[vehicleid][vehicleEngineStatus])
			{
				if((hp >= 550 && hp <= 649) || (hp >= 325 && hp <= 389))
				{
					SetEngineStatus(vehicleid, false);

					SendClientMessage(i, COLOR_LIGHTRED, "BATTERY HAS TURNED OFF THE ENGINE: Vehicle is badly damaged.");
			  		SendClientMessage(i, COLOR_LIGHTRED, "HINT: It is recommended you have the vehicle repaired.");
					SendClientMessage(i, COLOR_LIGHTRED, "HINT: You can type /engine to start it back up.");
				}
			}

			if((timestamp - CoreVehicles[vehicleid][vHitStamp]) >= 3)
			{
				new Float: phploss = floatround((vehicle_health_loss / 100));

				if(phploss)
				{
					foreach (new x : VehicleOccupant(vehicleid))
					{
						if((timestamp - LastDamageTime[x]) >= 3)
						{
							SetPlayerHealthEx(x, (PlayerData[x][pHealth] - phploss));
						}
					}
				}
			}

			if(vehicle_health_loss > 5)
			{
				if(LessonStarted{i})
				{
					if(GetPVarInt(i, "LessonSeconds") != 0 && GetPVarInt(i, "InDriveTest"))
					{
						LessonStarted{i} = false;

						DeletePVar(i, "LessonSeconds");
						DeletePVar(i, "InDriveTest");

						SendClientMessage(i, COLOR_GREEN, "Damaged vehicle tests failed.");

						DisablePlayerCheckpoint(i);
						gPlayerCheckpointStatus[i] = CHECKPOINT_NONE;
						gPlayerCheckpointValue[i] = -1;
						SetVehicleToRespawn(vehicleid);
					}
				}
			}
		}

		CoreVehicles[vehicleid][vehCrash] = hp;

		if(LessonStarted{i})
		{
			if(GetPVarInt(i, "InDriveTest"))
			{
				new seconds = GetPVarInt(i, "LessonSeconds");

				if(seconds)
				{
					GameTextForPlayerEx(i, "~w~%d", 1200, 3, seconds);

					SetPVarInt(i, "LessonSeconds", seconds - 1);
				}
				else
				{
					LessonStarted{i} = false;

					DeletePVar(i, "LessonSeconds");
					DeletePVar(i, "InDriveTest");

					SendClientMessage(i, COLOR_GREEN, "Timeout. The test failed.");

					DisablePlayerCheckpoint(i);
					gPlayerCheckpointStatus[i] = CHECKPOINT_NONE;
					gPlayerCheckpointValue[i] = -1;
					SetVehicleToRespawn(vehicleid);
				}
			}
		}

		if(IsATaxi(vehicleid))
		{
			if(TaxiDuty{i} && TaxiStart{i})
			{
				if(CountVehiclePlayers(vehicleid) > 0)
				{
					GameTextForPlayerEx(i, "~w~$%d", 1000, 6, TaxiMade[i]);

					foreach (new p : VehicleOccupant(vehicleid))
					{
					    if(p == i) continue;

						GameTextForPlayerEx(p, "~w~$%d", 1000, 6, TaxiMoney[p]);

						if(TaxiMoney[p] + TaxiFare{i} < PlayerData[p][pCash])
						{
							TaxiMoney[p] += TaxiFare{i};

							TaxiMade[i] += TaxiFare{i};
						}
						else
						{
							RemovePlayerFromVehicle(p);

							SendClientMessageEx(i, COLOR_YELLOW, "%s did not have enough money to pay the fare.", ReturnName(p, 0));
							SendClientMessage(p, COLOR_YELLOW, "You did not have enough money to pay for a taxi.");
						}
					}
				}
			}
		}
	}

	if(!PlayerFlags[i][toggleHUD])
	{
		if(HUD_Created{i})
		{
			TextHud_Update(i, vehicleid);
		}
	}	

	//mechanic fixing
	if(RepairTime{i})
	{
	    if(!IsPlayerInAnyVehicle(i) && serviced[i])
		{
			new Float:tx, Float:ty, Float:tz;
			GetVehiclePos(CarData[ serviceTowtruck[i] ][carVehicle], tx, ty, tz);

			if(RepairTime{i} <= 1)
			{
				switch(serviced[i])
				{
					case 1:
					{
						ShowPlayerFooter(i, "~h~~p~REPAIRED VEHICLE.");
						SetVehicleHealth(CarData[serviceCustomer[i]][carVehicle], GetVehicleDataHealth(CarData[serviceCustomer[i]][carModel]));
					}
					case 2:
					{
						ShowPlayerFooter(i, "~h~~p~REPAIRED BODYWORK.");
						SetVehicleDamageStatus(CarData[serviceCustomer[i]][carVehicle], 0, 0, 0, 0);
					}
					case 3:
					{
						ShowPlayerFooter(i, "~h~~p~REPLACED THE BATTERY.");
						CarData[serviceCustomer[i]][carBatteryL] = VehicleData[CarData[serviceCustomer[i]][carModel] - 400][c_battery];
					}
					case 4:
					{
						ShowPlayerFooter(i, "~h~~p~REPLACED THE ENGINE.");
						CarData[serviceCustomer[i]][carEngineL] = VehicleData[CarData[serviceCustomer[i]][carModel] - 400][c_engine];
					}
					case 5:
					{
						ShowPlayerFooter(i, "~h~~p~SUCCESSFULLY SPRAYED.");
						CarData[serviceCustomer[i]][carColor1] = GetPVarInt(i, "color1");
						CarData[serviceCustomer[i]][carColor2] = GetPVarInt(i, "color2");
						ChangeVehicleColor(CarData[serviceCustomer[i]][carVehicle], CarData[serviceCustomer[i]][carColor1], CarData[serviceCustomer[i]][carColor2]);
						DeletePVar(i, "color1");
						DeletePVar(i, "color2");
					}
				}

				RemoveWeapon(i, 41);

				RepairTime{i} = 0;

				CarData[serviceTowtruck[i]][carComps] -= serviceComp[i];

				serviceTowtruck[i] = INVALID_VEHICLE_ID;
				serviceCustomer[i] = INVALID_VEHICLE_ID;

				serviced[i] = 0;
				serviceComp[i] = 0;
				serviceFocus[i] = 0;

				if(IsPlayerAttachedObjectSlotUsed(i, 9)) RemovePlayerAttachedObject(i, 9);
			}
			else if(IsPlayerInRangeOfPoint(i, 8, tx, ty, tz))
			{
			    if(playerState == PLAYER_STATE_ONFOOT)
				{
	                if(!IsPlayerAttachedObjectSlotUsed(i, 9)) SetPlayerAttachedObject(i, 9, 18688, 5, 0, 0.533999, -2.756, 0, 0, 0, 1.000000, 1.000000, 1.000000);

					if(HoldingKey(i, KEY_FIRE) && GetPlayerWeapon(i) == 41 || serviced[i] == 3 || serviced[i] == 4)
					{
						switch(serviced[i])
						{
							case 1:
							{
								format(sgstr, sizeof(sgstr), "~h~~p~REPAIRING VEHICLE.~n~~w~TOWTRUCK HAS ~b~%d~w~ AMOUNTS OF PRODUCT LEFT.", CarData[ serviceTowtruck[i] ][carComps] - (serviceComp[i] - RepairTime{i}) );
								ShowPlayerFooter(i, sgstr, -1);

				                RepairTime{i} --;
							}
							case 2:
							{
								format(sgstr, sizeof(sgstr), "~h~~p~REPAIRING BODYWORK.~n~~w~TOWTRUCK HAS ~b~%d~w~ AMOUNTS OF PRODUCT LEFT.", CarData[ serviceTowtruck[i] ][carComps] - (serviceComp[i] - RepairTime{i}) );
								ShowPlayerFooter(i, sgstr, -1);

				                RepairTime{i} --;
							}
							case 3:
							{
								ShowPlayerFooter(i, "~h~~p~PERFORMING MAINTENANCE...~n~~w~((USE YOUR IMAGINATION AND ROLEPLAY.))", -1);

				                RepairTime{i} -= 100;
							}
							case 4:
							{
								ShowPlayerFooter(i, "~h~~p~PERFORMING MAINTENANCE...~n~~w~((USE YOUR IMAGINATION AND ROLEPLAY.))", -1);

				                RepairTime{i} -= 100;
							}
							case 5:
							{
								format(sgstr, sizeof(sgstr), "~h~~p~PAINTING THE CAR.~n~~w~~b~%d~w~ AMOUNTS OF PRODUCT LEFT IN THE TRUCK.", CarData[ serviceTowtruck[i] ][carComps] - (serviceComp[i] - RepairTime{i}));
								ShowPlayerFooter(i, sgstr, -1);

				                RepairTime{i} --;
							}
						}

						if(!serviceFocus[i])
						{
							RemovePlayerAttachedObject(i, 9);

							serviceFocus[i] = CarData[serviceCustomer[i]][carVehicle];
						}
					}
				}
				else
				{
					if(IsPlayerAttachedObjectSlotUsed(i, 9) && serviceFocus[i])
					{
						RemovePlayerAttachedObject(i, 9);
					}
				}
			}
			else
			{
				ShowPlayerFooter(i, "~h~~p~YOU NEED TO BE NEAR YOUR TOWTRUCK.", -1);
			}
		}
	}

	if(PlayerData[i][pSpectating] != INVALID_PLAYER_ID)
	{
		if(IsPlayerConnected(PlayerData[i][pSpectating]))
		{
			if(GetPlayerVirtualWorld(i) != GetPlayerVirtualWorld(PlayerData[i][pSpectating]))
			{
				SetPlayerVirtualWorld(i, GetPlayerVirtualWorld(PlayerData[i][pSpectating]));
			}
		}
	}

	if(Unpackaging{i})
	{
		new Float:playerPos[3];
		GetPlayerPos(i, playerPos[0], playerPos[1], playerPos[2]);

		if(playerPos[0] != PlayerData[i][pPos][0] || playerPos[1] != PlayerData[i][pPos][1] || playerPos[2] != PlayerData[i][pPos][2])
		{
			KillTimer(UnpackageTimer[i]);

		    Unpackaging{i} = false;

			SendNoticeMessage(i, "You moved, therefore the operation was cancelled.");
		}
  	}

	if((timestamp - LastSpawn[i]) >= 10 && (timestamp - LastTeleport[i]) >= 3 && !PlayerData[i][pFreeze] && AFKTimer[i] > 0 && !ViewingCCTV[i] && !PlayerData[i][pTutorialStep])
	{
		new specialAction = GetPlayerSpecialAction(i);

		if(specialAction == SPECIAL_ACTION_USEJETPACK)
		{
	 		if(PlayerData[i][pAdmin] < 1)
			{
			    SetPlayerSpecialAction(i, SPECIAL_ACTION_NONE);
			}
		}

		if(specialAction != SPECIAL_ACTION_ENTER_VEHICLE && specialAction != SPECIAL_ACTION_EXIT_VEHICLE)
	  	{
	  		new Float: x, Float: y, Float: z, Float: distance;

			if(playerState == PLAYER_STATE_ONFOOT)
			{
				distance = GetPlayerDistanceFromPoint(i, s_AirbreakLastCoords[i][0], s_AirbreakLastCoords[i][1], s_AirbreakLastCoords[i][2]);

				GetPlayerPos(i, x, y, z);

				if(floatabs(distance) >= ONFOOT_DISTANCE)
				{
					if((floatabs(s_AirbreakLastCoords[i][1] - y) >= 50.0 || floatabs(s_AirbreakLastCoords[i][0] - x) >= 50.0))
					{
						OnPlayerTeleport(i, distance, timestamp - p_UpdateTick[i]);
					}
				}
			}
			else if(playerState == PLAYER_STATE_DRIVER)
			{
    			distance = GetVehicleDistanceFromPoint(vehicleid, s_AirbreakLastCoords[i][0], s_AirbreakLastCoords[i][1], s_AirbreakLastCoords[i][2]);

				GetVehiclePos(vehicleid, x, y, z);

				if(floatabs(distance) >= VEHICLE_DISTANCE)
				{
					if(!AB_IsVehicleMoving(vehicleid))
					{
						if((floatabs(s_AirbreakLastCoords[i][1] - y) >= 40.0 || floatabs(s_AirbreakLastCoords[i][0] - x) >= 40.0))
						{
							OnPlayerTeleport(i, distance, timestamp - p_UpdateTick[i]);
						}
					}
				}
			}
		}
		
		p_UpdateTick[i] = timestamp;
	}

	if(playerState == PLAYER_STATE_DRIVER)
	{
		GetVehiclePos(vehicleid, s_AirbreakLastCoords[i][0], s_AirbreakLastCoords[i][1], s_AirbreakLastCoords[i][2]);
	}
	else
	{
 		GetPlayerPos(i, s_AirbreakLastCoords[i][0], s_AirbreakLastCoords[i][1], s_AirbreakLastCoords[i][2]);
	}
	return true;
}

PayDay()
{
	new
		string[128],
		account, interest,
		savaccount, savings,
		ebill = 0, bool:evicted = false
	;

	foreach (new i : Player)
	{
		if(PlayerData[i][pDonateRank])
		{
		    if(gettime() >= PlayerData[i][pDonateUnix])
		    {
				PlayerData[i][pDonateRank] = 0;
			}
		}

		if(PlayerData[i][pJob] && PlayerData[i][pJob] != JOB_MECHANIC && PlayerData[i][pJob] != JOB_TAXI && PlayerData[i][pJob] != JOB_GUIDE)
		{
			if(PlayerData[i][pContractTime] < 25)
				PlayerData[i][pContractTime] ++;
		}

		if(PlayerData[i][pID] != -1 && PlayerData[i][pLevel] > 0 && PlayerData[i][pPayDay] >= 900) // 15 minutes
		{
		    new house = PlayerData[i][pHouseKey], type = GetFactionType(i);

			account = PlayerData[i][pAccount];

            new Float:tmpintrate = 0.1;

			//Checking job ranks

			if(PlayerData[i][pJob] == JOB_TRUCKER)
			{
				PlayerData[i][pCareer]++;

				if(PlayerData[i][pCareer] >= 164)
					PlayerData[i][pJobRank] = 5;
				else if(PlayerData[i][pCareer] >= 116)
					PlayerData[i][pJobRank] = 4;
				else if(PlayerData[i][pCareer] >= 64)
					PlayerData[i][pJobRank] = 3;
				else if(PlayerData[i][pCareer] >= 36)
					PlayerData[i][pJobRank] = 2;
				else if(PlayerData[i][pCareer] >= 12)
					PlayerData[i][pJobRank] = 1;
				else
					PlayerData[i][pJobRank] = 0;
			}

			Tax += TaxValue;

			PlayerData[i][pAccount] -= TaxValue;

			if(PlayerData[i][pAccount] > 20000000) tmpintrate = 0.05;

			interest = floatround((PlayerData[i][pAccount] / float(100)) * (tmpintrate), floatround_round);

			PlayerData[i][pAccount] = account + interest;

			if(PlayerData[i][pSavingsCollect])
			{
			    savaccount = PlayerData[i][pSavingsCollect];
			    savings = floatround((PlayerData[i][pSavingsCollect] / float(100)) * (0.5), floatround_round);

			    PlayerData[i][pSavingsCollect] = savaccount + savings;

			    if(PlayerData[i][pSavingsCollect] > 20000000)
			    {
			        PlayerData[i][pSavingsCollect] = 20000000;
			    }
			}

			if(house != -1)
			{
			    if(PropertyData[house][hOwnerSQLID] == PlayerData[i][pID]) // Owner
			    {
			    	ebill = floatround((float(account) / float(100)) / float(110)) * CountPlayerOwnHouse(i);

				    if(PlayerData[i][pAccount] >= ebill)
				    {
				    	PlayerData[i][pAccount] -= ebill;
					}
					else
					{
						evicted = true;

						SendClientMessage(i, COLOR_WHITE, "You have been evicted");
					}
				}
				else
				{
				    ebill = PropertyData[house][hRentprice];

				    if(PlayerData[i][pAccount] >= ebill)
				    {
				    	PlayerData[i][pAccount] -= ebill;

				    	PropertyData[house][hCash] += ebill;
					}
					else
					{
						evicted = true;

						SendClientMessage(i, COLOR_WHITE, "You have been evicted");
					}
				}

				SendClientMessageEx(i, COLOR_WHITE, "Rent paid: $%d. (Out of your bank)", ebill);

				if(evicted) SendClientMessage(i, COLOR_LIGHTRED, "$0{FFFFFF} debt paid off through your paycheck");
			}

			SendClientMessage(i, COLOR_WHITE, "|___ BANK STATEMENT ___|");

			SendClientMessageEx(i, COLOR_GRAD1, "   Balance: $%d", account);
			SendClientMessageEx(i, COLOR_GRAD3, "   Interest rate: %.2f", tmpintrate);
			SendClientMessageEx(i, COLOR_GRAD3, "   Interest Gained %s", FormatNumber(interest));
			SendClientMessageEx(i, COLOR_GRAD3, "   Taxes paid %s", FormatNumber(TaxValue));

			if(PlayerData[i][pFaction] != -1)
			{
				switch(type)
				{
				    case FACTION_POLICE:
				    {
					    PlayerData[i][pPayCheck] += 2500;

						SendClientMessageEx(i, COLOR_GRAD3, "   POLICE Pay %s", FormatNumber(2500));
				    }
				    case FACTION_MEDIC:
				    {
					    PlayerData[i][pPayCheck] += 2500;

						SendClientMessageEx(i, COLOR_GRAD3, "   MEDIC Pay %s", FormatNumber(2500));
				    }
				    case FACTION_SHERIFF:
				    {
					    PlayerData[i][pPayCheck] += 2500;

						SendClientMessageEx(i, COLOR_GRAD3, "   SHERIFF Pay %s", FormatNumber(2500));
				    }
				}
			}

			if(PlayerData[i][pSavingsCollect])
			{
				SendClientMessageEx(i, COLOR_GRAD5, "   Savings income: %s, at rate: 0.5", FormatNumber(savings));
				SendClientMessageEx(i, COLOR_GRAD5, "   Savings new balance: %s", FormatNumber(PlayerData[i][pSavingsCollect]));
			}

			SendClientMessage(i, COLOR_GRAD4, "|________________________|");

			SendClientMessageEx(i, COLOR_GRAD5, "   New Balance: %s", FormatNumber(PlayerData[i][pAccount]));
            SendClientMessageEx(i, COLOR_GRAD5, "   Rent: -$%d", ebill);

			if(house != -1 && evicted)
			{
			    if(PropertyData[house][hOwnerSQLID] != PlayerData[i][pID])
			    {
				    PlayerData[i][pSpawnPoint] = 0;
					PlayerData[i][pHouseKey] = -1;

					SendClientMessage(i, COLOR_LIGHTRED, "You have been evicted from your rented house due to lack of payment.");
				}
			}

			if(PlayerData[i][pJob] == JOB_MECHANIC)
			{
			    PlayerData[i][pPayCheck] += 1250;

                SendClientMessage(i, COLOR_GRAD5, "You have received $1,250 for your mechanic duties.");
			}

			if(PlayerData[i][pLevel] == 1)
			{
			    PlayerData[i][pPayCheck] += 2000;

				SendClientMessage(i, COLOR_GRAD5, "(( You have received $2,000 for being level 1. ))");
			}

			if(PlayerData[i][pLevel] == 2)
			{
			    PlayerData[i][pPayCheck] += 1500;

				SendClientMessage(i, COLOR_GRAD5, "(( You have received $1,500 for being level 2. ))");
			}

			if(PlayerData[i][pChequeCash])
			{
			    PlayerData[i][pPayCheck] += PlayerData[i][pChequeCash];
			    PlayerData[i][pChequeCash] = 0;
			}

			format(string, sizeof(string), "~y~Payday~n~~w~Paycheck~n~~g~$%d", PlayerData[i][pPayCheck]);
			GameTextForPlayer(i, string, 3000, 1); // 5000

			ebill = 0, evicted = false;

			PlayerData[i][pPayDay] = 0;

			// Donate
			if(PlayerData[i][pDonateRank] > 0)
			{
				PlayerData[i][pPayDayHad] += 1;

				if(PlayerData[i][pPayDayHad] >= 5)
				{
					PlayerData[i][pExp]++;

					PlayerData[i][pPayDayHad] = 0;
				}
			}
		}
		else
		{
			SendClientMessage(i, COLOR_GRAD5, "You haven't played enough so there's no Pay Day for you.");
		}
	}

	foreach (new i : sv_playercar)
	{
		if(IsCharacterOnline(CarData[i][carOwner]) == -1)
		{
		    Car_DespawnEx(i);
		}
	}
    return true;
}