ListPlayerFines(playerid, targetid)
{
	mysql_format(dbCon, gquery, sizeof(gquery), "SELECT `id`, `date`, `price`, `reason` FROM `fines` WHERE `addressee` = '%e' AND `type` = 0", ReturnName(targetid));
	mysql_tquery(dbCon, gquery, "ShowPlayerFines", "dd", playerid, targetid);
	return true;
}

PlacePlayerFine(playerid, copid, price, const reason[])
{
	new query[500];
	mysql_format(dbCon, query, sizeof(query), "INSERT INTO `fines` (`cop`, `addressee`, `agency`, `price`, `reason`, `type`, `exp`) VALUES ('%e', '%e', '%e', '%d', '%e', 0, '%d')", ReturnName(copid), ReturnName(playerid), Faction_GetName(copid), price, reason, gettime() + 259200);
	mysql_pquery(dbCon, query);
	return true;
}

FUNX::ShowPlayerFines(playerid, targetid)
{
	new rows = cache_num_rows();
	if(rows > 0)
	{
		new
			fineID,
			fineDate[60],
			fineAmount,
			fineReason[256]
		;

		gstr[0] = EOS;
		format(gstr, sizeof(gstr), "ID\tDate & Time\tAmount\tReason\n");

		for(new i = 0; i < rows; ++i)
		{
			cache_get_value_name_int(i, "id", fineID);
			cache_get_value_name(i, "date", fineDate, sizeof(fineDate));
			cache_get_value_name_int(i, "price", fineAmount);
			cache_get_value_name(i, "reason", fineReason, sizeof(fineReason));

			format(gstr, sizeof(gstr), "%s#%d\t%s\t$%d\t%s\n", gstr, fineID, fineDate, fineAmount, fineReason);
		}

		Dialog_Show(playerid, Fines, DIALOG_STYLE_TABLIST_HEADERS, "Fine List", gstr, "Close", "");
		return true;
	}
	else
	{
		Dialog_Show(playerid, Fines, DIALOG_STYLE_MSGBOX, "Fine List", "No active fines found.", "Close", "");
	}
	return true;
}