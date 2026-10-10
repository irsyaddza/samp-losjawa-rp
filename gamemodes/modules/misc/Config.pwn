new gServerSite[128] = "https://ucp.rusdi-bot.site";
new gServerMode[64] = "LJ:RP 0.1.0";

#if IS_LOCAL_HOST == true
	#define SERVER_NAME "[open.mp] Los Jawa Roleplay | Dev Server!"
	#define SQL_HOSTNAME "mysql"
	#define SQL_USERNAME "samp"
	#define SQL_DATABASE "jawa"
	#define SQL_PASSWORD "samppassword"
#else
	#define SERVER_NAME "[0.3-DL] Los Jawa Roleplay | Development!"
	#define SQL_HOSTNAME "192.168.1.46"
	#define SQL_USERNAME "u3_B4ZiT404lI"
	#define SQL_DATABASE "s3_jawa"
	#define SQL_PASSWORD "HbWcctCG3Dy4F.qzb.BN!ldO"
#endif

#define MAX_CHARACTERS (6)

new
	modelsURL[] = "",
	RegistrationEnabled = false,
	MySQL:dbCon
;

