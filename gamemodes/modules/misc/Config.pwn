new gServerSite[128] = "https://ucp.rusdi-bot.site";
new gServerMode[64] = "LJ:RP 0.1.0";

#if IS_LOCAL_HOST == true
    #define SERVER_NAME "[open.mp] Los Jawa Roleplay | On Air!"
#else
    #define SERVER_NAME "[0.3-DL] Los Jawa Roleplay | Development!"
#endif

#include "db_credentials"   // SQL_HOSTNAME, SQL_USERNAME, SQL_DATABASE, SQL_PASSWORD

#define MAX_CHARACTERS (6)

new
	modelsURL[] = "",
	RegistrationEnabled = false,
	MySQL:dbCon
;

