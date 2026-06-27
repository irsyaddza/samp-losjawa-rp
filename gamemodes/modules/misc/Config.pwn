#define SERVER_SITE "https://ucp.ljrp.my.id"
#define SERVER_MODE "LS:RP 6.6.6"

#if IS_LOCAL_HOST == true
	#define SERVER_NAME "[0.3-DL] Los Jawa Roleplay | DOcker!"
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

/*
	#define SERVER_NAME "[0.3-DL] Los Jawa Roleplay | Development!"
	#define SQL_HOSTNAME "mysql"
	#define SQL_USERNAME "samp"
	#define SQL_DATABASE "jawa"
	#define SQL_PASSWORD "samppassword"

	#define SERVER_NAME "[0.3-DL] Los Jawa Roleplay | Sotot Everyday!"
	#define SQL_HOSTNAME "eu2.ultra-h.com"
	#define SQL_USERNAME "server_13239"
	#define SQL_DATABASE "server_13239_jawa"
	#define SQL_PASSWORD "3vmlnreiwu"
*/
